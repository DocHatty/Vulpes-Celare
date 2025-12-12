#![deny(clippy::all)]
use napi_derive::napi;
use std::sync::{Arc, Mutex};

pub mod vision;
use vision::OcrEngine;

#[napi]
pub struct VulpesEngine {
    engine: Arc<Mutex<OcrEngine>>,
}

#[napi]
impl VulpesEngine {
    #[napi(constructor)]
    pub fn new(det_path: String, rec_path: String) -> napi::Result<Self> {
        let engine = OcrEngine::new(&det_path, &rec_path)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(Self {
            engine: Arc::new(Mutex::new(engine)),
        })
    }

    #[napi]
    pub fn detect_text(
        &self,
        buffer: napi::bindgen_prelude::Buffer,
    ) -> napi::Result<Vec<vision::ocr::TextDetectionResult>> {
        let data: &[u8] = buffer.as_ref();
        let mut engine = self
            .engine
            .lock()
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let results = engine
            .detect(data)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;

        Ok(results)
    }
}

#[napi]
pub fn init_core() -> String {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .try_init();
    tracing::info!("Vulpes Ferrari Engine Initialized");
    "Vulpes Ferrari Engine Online (Rust)".to_string()
}

#[napi]
pub fn detect_faces(
    buffer: napi::bindgen_prelude::Buffer,
    model_path: String,
    confidence_threshold: Option<f64>,
    nms_threshold: Option<f64>,
) -> napi::Result<Vec<vision::face::VisualDetection>> {
    let data: &[u8] = buffer.as_ref();
    let conf = confidence_threshold.unwrap_or(0.7);
    let nms = nms_threshold.unwrap_or(0.3);

    vision::face::detect_faces(data, &model_path, conf, nms)
        .map_err(|e| napi::Error::from_reason(e.to_string()))
}
