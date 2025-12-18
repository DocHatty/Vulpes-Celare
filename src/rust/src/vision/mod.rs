pub mod gpu_provider;
pub use gpu_provider::{ExecutionProvider, SessionConfig, build_session_with_config};

pub mod ocr;
pub use ocr::OcrEngine;

pub mod face;
pub use face::{VisualBox, VisualDetection, detect_faces};
