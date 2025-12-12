pub mod ocr;
pub use ocr::OcrEngine;

pub mod face;
pub use face::{VisualBox, VisualDetection, detect_faces};
