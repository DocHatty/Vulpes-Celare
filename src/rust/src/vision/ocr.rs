use image::{imageops, DynamicImage, GenericImageView, GrayImage, Luma};
use napi_derive::napi;
use ndarray::{Array2, Array4};
use ort::{session::Session, value::Value};
use std::error::Error;
use tracing::{info, instrument, warn};

type Result<T> = std::result::Result<T, Box<dyn Error + Send + Sync>>;

/// Text detection result from the OCR engine.
#[napi(object)]
#[derive(Clone, Debug)]
pub struct TextDetectionResult {
    pub text: String,
    pub confidence: f64,
    pub box_points: Vec<Vec<i32>>,
}

/// High-performance OCR Engine using PaddleOCR ONNX models.
pub struct OcrEngine {
    det_session: Session,
    rec_session: Session,
    rec_chars: Vec<char>,
}

// PaddleOCR v4 character set (simplified - full set has 6000+ chars)
const DEFAULT_CHAR_SET: &str = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

impl OcrEngine {
    #[instrument(skip(det_path, rec_path))]
    pub fn new(det_path: &str, rec_path: &str) -> Result<Self> {
        info!("Initializing OcrEngine: det={}, rec={}", det_path, rec_path);

        let det_session = Session::builder()?
            .with_intra_threads(4)?
            .commit_from_file(det_path)?;

        let rec_session = Session::builder()?
            .with_intra_threads(4)?
            .commit_from_file(rec_path)?;

        let rec_chars: Vec<char> = DEFAULT_CHAR_SET.chars().collect();

        info!("OcrEngine initialized successfully");
        Ok(Self {
            det_session,
            rec_session,
            rec_chars,
        })
    }

    #[instrument(skip(self, image_data))]
    pub fn detect(&mut self, image_data: &[u8]) -> Result<Vec<TextDetectionResult>> {
        info!("Processing image buffer: {} bytes", image_data.len());

        // 1. Load Image
        let img = image::load_from_memory(image_data)?;
        let (orig_width, orig_height) = img.dimensions();
        info!("Image dimensions: {}x{}", orig_width, orig_height);

        // 2. Run Detection
        let (det_output, scale_w, scale_h) = self.run_detection(&img)?;

        // 3. Post-process: Extract boxes using DB algorithm
        let boxes = self.db_postprocess(&det_output, orig_width, orig_height, scale_w, scale_h)?;
        info!("Detected {} text regions", boxes.len());

        if boxes.is_empty() {
            return Ok(vec![]);
        }

        // 4. Run Recognition on each detected box
        let mut results = Vec::with_capacity(boxes.len());
        for (i, box_pts) in boxes.iter().enumerate() {
            let crop = self.crop_text_region(&img, box_pts)?;
            let (text, confidence) = self.run_recognition(&crop)?;

            if !text.is_empty() {
                info!("Box {}: '{}' (conf: {:.2})", i, text, confidence);
                results.push(TextDetectionResult {
                    text,
                    confidence,
                    box_points: box_pts.clone(),
                });
            }
        }

        Ok(results)
    }

    /// Run the detection model and return the probability map.
    fn run_detection(&mut self, img: &DynamicImage) -> Result<(Array2<f32>, f32, f32)> {
        let (width, height) = img.dimensions();

        // Resize: limit long side to 960, ensure multiple of 32
        let max_side = 960u32;
        let scale = (max_side as f32 / width.max(height) as f32).min(1.0);
        let new_w = (((width as f32 * scale) as u32 + 31) / 32) * 32;
        let new_h = (((height as f32 * scale) as u32 + 31) / 32) * 32;

        let resized = img.resize_exact(new_w, new_h, imageops::FilterType::Triangle);

        // Normalize to NCHW tensor
        let mut input = Array4::<f32>::zeros((1, 3, new_h as usize, new_w as usize));
        for (x, y, pixel) in resized.pixels() {
            let [r, g, b, _] = pixel.0;
            input[[0, 0, y as usize, x as usize]] = (r as f32 / 255.0 - 0.485) / 0.229;
            input[[0, 1, y as usize, x as usize]] = (g as f32 / 255.0 - 0.456) / 0.224;
            input[[0, 2, y as usize, x as usize]] = (b as f32 / 255.0 - 0.406) / 0.225;
        }

        // Run inference
        let input_value = Value::from_array(input)?;
        let inputs = ort::inputs!["x" => input_value];
        let outputs = self.det_session.run(inputs)?;

        // Extract probability map (shape: [1, 1, H, W])
        // ORT v2 try_extract_tensor returns (&Shape, &[f32]) - Shape derefs to &[i64]
        let (shape, data) = outputs[0].try_extract_tensor::<f32>()?;
        let h = shape[2] as usize;
        let w = shape[3] as usize;

        // Copy data to owned Array2 for processing
        let prob_map = Array2::from_shape_vec((h, w), data.to_vec())?;

        let scale_w = width as f32 / new_w as f32;
        let scale_h = height as f32 / new_h as f32;

        Ok((prob_map, scale_w, scale_h))
    }

    /// DB (Differentiable Binarization) post-processing to extract text boxes.
    fn db_postprocess(
        &self,
        prob_map: &Array2<f32>,
        orig_w: u32,
        orig_h: u32,
        scale_w: f32,
        scale_h: f32,
    ) -> Result<Vec<Vec<Vec<i32>>>> {
        let (h, w) = prob_map.dim();
        let threshold = 0.3f32;
        let min_area = 100i32;

        // 1. Binarize the probability map
        let mut binary = GrayImage::new(w as u32, h as u32);
        for y in 0..h {
            for x in 0..w {
                let v = prob_map[[y, x]];
                binary.put_pixel(
                    x as u32,
                    y as u32,
                    Luma([if v > threshold { 255 } else { 0 }]),
                );
            }
        }

        // 2. Find contours using simple connected component analysis
        let boxes = self.find_contours(&binary, scale_w, scale_h, orig_w, orig_h, min_area)?;

        Ok(boxes)
    }

    /// Simple contour finding using flood-fill based connected components.
    fn find_contours(
        &self,
        binary: &GrayImage,
        scale_w: f32,
        scale_h: f32,
        orig_w: u32,
        orig_h: u32,
        min_area: i32,
    ) -> Result<Vec<Vec<Vec<i32>>>> {
        let (w, h) = binary.dimensions();
        let mut visited = vec![vec![false; w as usize]; h as usize];
        let mut boxes = Vec::new();

        for y in 0..h {
            for x in 0..w {
                if binary.get_pixel(x, y).0[0] == 255 && !visited[y as usize][x as usize] {
                    // Flood fill to find component bounds
                    let mut min_x = x as i32;
                    let mut max_x = x as i32;
                    let mut min_y = y as i32;
                    let mut max_y = y as i32;
                    let mut area = 0i32;

                    let mut stack = vec![(x as i32, y as i32)];
                    while let Some((cx, cy)) = stack.pop() {
                        if cx < 0 || cy < 0 || cx >= w as i32 || cy >= h as i32 {
                            continue;
                        }
                        if visited[cy as usize][cx as usize] {
                            continue;
                        }
                        if binary.get_pixel(cx as u32, cy as u32).0[0] != 255 {
                            continue;
                        }

                        visited[cy as usize][cx as usize] = true;
                        area += 1;
                        min_x = min_x.min(cx);
                        max_x = max_x.max(cx);
                        min_y = min_y.min(cy);
                        max_y = max_y.max(cy);

                        stack.push((cx + 1, cy));
                        stack.push((cx - 1, cy));
                        stack.push((cx, cy + 1));
                        stack.push((cx, cy - 1));
                    }

                    if area >= min_area {
                        // Scale back to original image coordinates
                        let x1 = ((min_x as f32 * scale_w) as i32).max(0);
                        let y1 = ((min_y as f32 * scale_h) as i32).max(0);
                        let x2 = ((max_x as f32 * scale_w) as i32).min(orig_w as i32 - 1);
                        let y2 = ((max_y as f32 * scale_h) as i32).min(orig_h as i32 - 1);

                        boxes.push(vec![vec![x1, y1], vec![x2, y1], vec![x2, y2], vec![x1, y2]]);
                    }
                }
            }
        }

        Ok(boxes)
    }

    /// Crop the text region from the original image.
    fn crop_text_region(&self, img: &DynamicImage, box_pts: &[Vec<i32>]) -> Result<DynamicImage> {
        // box_pts: [[x1,y1], [x2,y1], [x2,y2], [x1,y2]]
        let x1 = box_pts[0][0] as u32;
        let y1 = box_pts[0][1] as u32;
        let x2 = box_pts[1][0] as u32;
        let y2 = box_pts[2][1] as u32;

        let width = x2.saturating_sub(x1).max(1);
        let height = y2.saturating_sub(y1).max(1);

        Ok(img.crop_imm(x1, y1, width, height))
    }

    /// Run the recognition model on a cropped text region.
    fn run_recognition(&mut self, crop: &DynamicImage) -> Result<(String, f64)> {
        // Resize to fixed height, variable width (standard: 48 height for PP-OCRv4)
        let target_h = 48u32;
        let (w, h) = crop.dimensions();
        let ratio = target_h as f32 / h as f32;
        let target_w = ((w as f32 * ratio) as u32).max(1);
        let target_w = ((target_w + 31) / 32) * 32; // Ensure multiple of 32

        let resized = crop.resize_exact(target_w, target_h, imageops::FilterType::Triangle);

        // Normalize to NCHW
        let mut input = Array4::<f32>::zeros((1, 3, target_h as usize, target_w as usize));
        for (x, y, pixel) in resized.pixels() {
            let [r, g, b, _] = pixel.0;
            input[[0, 0, y as usize, x as usize]] = (r as f32 / 255.0 - 0.5) / 0.5;
            input[[0, 1, y as usize, x as usize]] = (g as f32 / 255.0 - 0.5) / 0.5;
            input[[0, 2, y as usize, x as usize]] = (b as f32 / 255.0 - 0.5) / 0.5;
        }

        // Run inference
        let input_value = Value::from_array(input)?;
        let inputs = ort::inputs!["x" => input_value];
        let outputs = self.rec_session.run(inputs)?;

        // CTC Greedy Decode
        // ORT v2 try_extract_tensor returns (&Shape, &[f32]) - Shape derefs to &[i64]
        let (shape, data) = outputs[0].try_extract_tensor::<f32>()?;
        let seq_len = shape[1] as usize;
        let vocab_size = shape[2] as usize;

        // Clone data to release the borrow on outputs before calling self method
        let data_owned: Vec<f32> = data.to_vec();
        drop(outputs); // Explicitly drop to release borrow

        let (text, confidence) = self.ctc_greedy_decode(&data_owned, seq_len, vocab_size)?;

        Ok((text, confidence))
    }

    /// CTC Greedy Decoding: Select highest probability character at each timestep.
    fn ctc_greedy_decode(
        &self,
        logits: &[f32],
        seq_len: usize,
        vocab_size: usize,
    ) -> Result<(String, f64)> {
        let mut text = String::new();
        let mut prev_idx = 0usize;
        let mut total_conf = 0.0f64;
        let mut char_count = 0;

        for t in 0..seq_len {
            // Find argmax for this timestep
            let mut max_idx = 0;
            let mut max_val = f32::NEG_INFINITY;

            for c in 0..vocab_size {
                // Index into flat buffer: [batch=0][timestep=t][char=c]
                let idx = t * vocab_size + c;
                let val = logits.get(idx).copied().unwrap_or(f32::NEG_INFINITY);
                if val > max_val {
                    max_val = val;
                    max_idx = c;
                }
            }

            // CTC blank token is usually index 0
            if max_idx != 0 && max_idx != prev_idx {
                if let Some(&ch) = self.rec_chars.get(max_idx.saturating_sub(1)) {
                    text.push(ch);
                    // Convert logit to probability for confidence
                    let prob = 1.0 / (1.0 + (-max_val as f64).exp()); // Sigmoid approximation
                    total_conf += prob;
                    char_count += 1;
                }
            }
            prev_idx = max_idx;
        }

        let avg_conf = if char_count > 0 {
            total_conf / char_count as f64
        } else {
            0.0
        };
        Ok((text, avg_conf))
    }
}
