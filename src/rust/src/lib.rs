#![deny(clippy::all)]
use napi_derive::napi;
use std::sync::{Arc, Mutex};

pub mod apply;
pub mod chaos;
pub mod crypto;
pub mod fuzzy;
pub mod interval;
pub mod name;
pub mod name_stream;
pub mod phonetic;
pub mod postfilter;
pub mod scan;
pub mod scan_stream;
pub mod scorer;
pub mod span;
pub mod streaming;
pub mod tokenize;
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

#[napi]
pub fn normalize_ocr(text: String) -> String {
    let mut out = String::with_capacity(text.len());

    for ch in text.chars() {
        let mapped = match ch {
            'O' | 'o' => '0',
            'l' | 'I' | '|' => '1',
            'B' => '8',
            'b' => '6',
            'S' | 's' => '5',
            'Z' | 'z' => '2',
            'G' => '6',
            'g' | 'q' => '9',
            _ => ch,
        };
        out.push(mapped);
    }

    out
}

#[napi]
pub fn extract_digits(text: String) -> String {
    let mut out = String::with_capacity(text.len());
    for ch in text.chars() {
        if ch.is_ascii_digit() {
            out.push(ch);
        }
    }
    out
}

#[napi]
pub fn extract_digits_with_ocr(text: String) -> String {
    let mut out = String::with_capacity(text.len());

    for ch in text.chars() {
        let mapped = match ch {
            'O' | 'o' => '0',
            'l' | 'I' | '|' => '1',
            'B' => '8',
            'b' => '6',
            'S' | 's' => '5',
            'Z' | 'z' => '2',
            'G' => '6',
            'g' | 'q' => '9',
            _ => ch,
        };

        if mapped.is_ascii_digit() {
            out.push(mapped);
        }
    }

    out
}

#[napi]
pub fn extract_alphanumeric(text: String, preserve_case: Option<bool>) -> String {
    let preserve_case = preserve_case.unwrap_or(true);

    let mut out = String::with_capacity(text.len());
    for ch in text.chars() {
        if ch.is_ascii_alphanumeric() {
            if preserve_case {
                out.push(ch);
            } else {
                out.push(ch.to_ascii_uppercase());
            }
        }
    }
    out
}

#[napi]
pub fn passes_luhn(number: String) -> bool {
    let digits: Vec<u32> = number
        .chars()
        .filter(|c| c.is_ascii_digit())
        .filter_map(|c| c.to_digit(10))
        .collect();

    if digits.is_empty() {
        return false;
    }

    let mut sum: u32 = 0;
    let mut is_even = false;

    for d in digits.iter().rev() {
        let mut digit = *d;
        if is_even {
            digit *= 2;
            if digit > 9 {
                digit -= 9;
            }
        }
        sum += digit;
        is_even = !is_even;
    }

    sum % 10 == 0
}
