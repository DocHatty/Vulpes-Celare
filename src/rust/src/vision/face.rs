use image::{imageops, DynamicImage, GenericImageView};
use napi_derive::napi;
use ndarray::Array4;
use once_cell::sync::OnceCell;
use ort::{session::Session, value::Value};
use std::{error::Error, io, path::Path, sync::Mutex};
use tracing::{info, instrument, warn};

type Result<T> = std::result::Result<T, Box<dyn Error + Send + Sync>>;

/// Bounding box for visual detections.
#[napi(object)]
#[derive(Clone, Debug)]
pub struct VisualBox {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Result of visual PHI detection.
#[napi(object)]
#[derive(Clone, Debug)]
pub struct VisualDetection {
    pub r#type: String,
    pub r#box: VisualBox,
    pub confidence: f64,
}

// UltraFace input dimensions.
const INPUT_WIDTH: u32 = 640;
const INPUT_HEIGHT: u32 = 480;

static FACE_SESSION: OnceCell<Mutex<Session>> = OnceCell::new();
static FACE_MODEL_PATH: OnceCell<String> = OnceCell::new();

fn other_error(message: impl Into<String>) -> Box<dyn Error + Send + Sync> {
    Box::new(io::Error::new(io::ErrorKind::Other, message.into()))
}

fn get_face_session(model_path: &str) -> Result<&'static Mutex<Session>> {
    if let Some(existing) = FACE_MODEL_PATH.get() {
        if existing != model_path {
            warn!(
                "Face model already initialized with '{}', ignoring new path '{}'",
                existing, model_path
            );
        }
        return FACE_SESSION
            .get()
            .ok_or_else(|| other_error("Face session not initialized"));
    }

    if !Path::new(model_path).exists() {
        return Err(other_error(format!("Face model not found: {}", model_path)));
    }

    let session = Session::builder()?
        .with_intra_threads(4)?
        .commit_from_file(model_path)?;

    let _ = FACE_MODEL_PATH.set(model_path.to_string());
    let _ = FACE_SESSION.set(Mutex::new(session));

    FACE_SESSION
        .get()
        .ok_or_else(|| other_error("Face session initialization failed"))
}

#[derive(Clone, Debug)]
struct Candidate {
    bbox: VisualBox,
    confidence: f64,
}

fn calculate_iou(a: &VisualBox, b: &VisualBox) -> f64 {
    let x1 = a.x.max(b.x);
    let y1 = a.y.max(b.y);
    let x2 = (a.x + a.width).min(b.x + b.width);
    let y2 = (a.y + a.height).min(b.y + b.height);

    if x2 <= x1 || y2 <= y1 {
        return 0.0;
    }

    let intersection = (x2 - x1) * (y2 - y1);
    let area_a = a.width * a.height;
    let area_b = b.width * b.height;
    let union = area_a + area_b - intersection;

    if union <= 0.0 {
        0.0
    } else {
        intersection / union
    }
}

fn nms(mut candidates: Vec<Candidate>, nms_threshold: f64) -> Vec<Candidate> {
    if candidates.is_empty() {
        return vec![];
    }

    candidates.sort_by(|a, b| {
        b.confidence
            .partial_cmp(&a.confidence)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let mut kept: Vec<Candidate> = Vec::new();
    let mut suppressed = vec![false; candidates.len()];

    for i in 0..candidates.len() {
        if suppressed[i] {
            continue;
        }

        kept.push(candidates[i].clone());

        for j in (i + 1)..candidates.len() {
            if suppressed[j] {
                continue;
            }

            let iou = calculate_iou(&candidates[i].bbox, &candidates[j].bbox);
            if iou > nms_threshold {
                suppressed[j] = true;
            }
        }
    }

    kept
}

fn preprocess(img: &DynamicImage) -> Array4<f32> {
    let resized = img.resize_exact(INPUT_WIDTH, INPUT_HEIGHT, imageops::FilterType::Triangle);
    let mut input = Array4::<f32>::zeros((1, 3, INPUT_HEIGHT as usize, INPUT_WIDTH as usize));

    for (x, y, pixel) in resized.pixels() {
        let [r, g, b, _] = pixel.0;
        let xi = x as usize;
        let yi = y as usize;
        input[[0, 0, yi, xi]] = r as f32 / 255.0;
        input[[0, 1, yi, xi]] = g as f32 / 255.0;
        input[[0, 2, yi, xi]] = b as f32 / 255.0;
    }

    input
}

/// Detect faces in an image buffer using UltraFace.
#[instrument(skip(image_data, model_path))]
pub fn detect_faces(
    image_data: &[u8],
    model_path: &str,
    confidence_threshold: f64,
    nms_threshold: f64,
) -> Result<Vec<VisualDetection>> {
    if image_data.is_empty() {
        return Ok(vec![]);
    }

    let img = image::load_from_memory(image_data)?;
    let (orig_w, orig_h) = img.dimensions();
    info!("UltraFace input image: {}x{}", orig_w, orig_h);

    let input = preprocess(&img);
    let session = get_face_session(model_path)?;
    let mut session = session
        .lock()
        .map_err(|e| other_error(format!("Face session lock poisoned: {}", e)))?;

    let input_value = Value::from_array(input)?;
    let outputs = session.run(ort::inputs![input_value])?;

    let mut scores: Option<Vec<f32>> = None;
    let mut boxes: Option<Vec<f32>> = None;
    let mut num_det: usize = 0;

    for (_, output) in outputs.iter() {
        let (shape, data) = output.try_extract_tensor::<f32>()?;
        if shape.len() == 3 && shape[2] == 2 {
            num_det = shape[1] as usize;
            scores = Some(data.to_vec());
        } else if shape.len() == 3 && shape[2] == 4 {
            boxes = Some(data.to_vec());
        }
    }

    let scores = match scores {
        Some(v) => v,
        None => return Ok(vec![]),
    };
    let boxes = match boxes {
        Some(v) => v,
        None => return Ok(vec![]),
    };

    let scale_x = orig_w as f64 / INPUT_WIDTH as f64;
    let scale_y = orig_h as f64 / INPUT_HEIGHT as f64;

    let mut candidates: Vec<Candidate> = Vec::new();

    for i in 0..num_det {
        let conf = scores.get(i * 2 + 1).copied().unwrap_or(0.0) as f64;

        if conf >= confidence_threshold {
            let x1 = boxes.get(i * 4).copied().unwrap_or(0.0) as f64 * INPUT_WIDTH as f64 * scale_x;
            let y1 =
                boxes.get(i * 4 + 1).copied().unwrap_or(0.0) as f64 * INPUT_HEIGHT as f64 * scale_y;
            let x2 =
                boxes.get(i * 4 + 2).copied().unwrap_or(0.0) as f64 * INPUT_WIDTH as f64 * scale_x;
            let y2 =
                boxes.get(i * 4 + 3).copied().unwrap_or(0.0) as f64 * INPUT_HEIGHT as f64 * scale_y;

            let x = x1.max(0.0);
            let y = y1.max(0.0);
            let width = (x2 - x1).max(1.0);
            let height = (y2 - y1).max(1.0);

            candidates.push(Candidate {
                bbox: VisualBox {
                    x,
                    y,
                    width,
                    height,
                },
                confidence: conf,
            });
        }
    }

    let kept = nms(candidates, nms_threshold);

    Ok(kept
        .into_iter()
        .map(|c| VisualDetection {
            r#type: "FACE".to_string(),
            r#box: c.bbox,
            confidence: c.confidence,
        })
        .collect())
}
