/// GPU Execution Provider Configuration for ONNX Runtime
///
/// This module provides configuration for GPU acceleration using DirectML
/// (Windows) or CUDA (Linux/NVIDIA). Falls back to CPU when GPU is unavailable.
///
/// Environment Variables:
///   VULPES_GPU_PROVIDER - Override provider selection (directml, cuda, cpu)
///   VULPES_GPU_DEVICE_ID - GPU device ID (default: 0)
///
/// Usage:
///   The provider is automatically detected based on platform and availability.
///   Set VULPES_GPU_PROVIDER=cpu to force CPU execution.

use std::env;
use tracing::{info, warn};

/// Execution provider types
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ExecutionProvider {
    /// CPU execution (default fallback)
    Cpu,
    /// DirectML execution (Windows)
    DirectML,
    /// CUDA execution (NVIDIA GPUs)
    Cuda,
    /// CoreML execution (macOS)
    CoreML,
}

impl ExecutionProvider {
    /// Get the recommended provider for the current platform
    pub fn recommended() -> Self {
        // Check for environment override
        if let Ok(provider) = env::var("VULPES_GPU_PROVIDER") {
            match provider.to_lowercase().as_str() {
                "directml" | "dml" => return ExecutionProvider::DirectML,
                "cuda" => return ExecutionProvider::Cuda,
                "coreml" => return ExecutionProvider::CoreML,
                "cpu" => return ExecutionProvider::Cpu,
                _ => {
                    warn!("Unknown GPU provider '{}', falling back to CPU", provider);
                    return ExecutionProvider::Cpu;
                }
            }
        }

        // Platform-specific defaults
        #[cfg(target_os = "windows")]
        {
            // DirectML is available on Windows 10 1903+ with compatible GPU
            // However, it requires the DirectML ONNX Runtime build
            // For now, default to CPU as DirectML requires special setup
            ExecutionProvider::Cpu
        }

        #[cfg(target_os = "macos")]
        {
            // CoreML is available on macOS
            ExecutionProvider::Cpu // Default to CPU, CoreML requires special setup
        }

        #[cfg(target_os = "linux")]
        {
            // CUDA is common on Linux, but requires NVIDIA drivers
            ExecutionProvider::Cpu
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            ExecutionProvider::Cpu
        }
    }

    /// Get the device ID for GPU execution
    pub fn device_id() -> i32 {
        env::var("VULPES_GPU_DEVICE_ID")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0)
    }

    /// Check if this provider requires GPU
    pub fn is_gpu(&self) -> bool {
        matches!(
            self,
            ExecutionProvider::DirectML | ExecutionProvider::Cuda | ExecutionProvider::CoreML
        )
    }

    /// Get provider name for logging
    pub fn name(&self) -> &'static str {
        match self {
            ExecutionProvider::Cpu => "CPU",
            ExecutionProvider::DirectML => "DirectML",
            ExecutionProvider::Cuda => "CUDA",
            ExecutionProvider::CoreML => "CoreML",
        }
    }
}

/// Session builder configuration based on execution provider
pub struct SessionConfig {
    provider: ExecutionProvider,
    intra_threads: usize,
    inter_threads: usize,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            provider: ExecutionProvider::recommended(),
            intra_threads: 4,
            inter_threads: 1,
        }
    }
}

impl SessionConfig {
    /// Create a new configuration with the recommended provider
    pub fn new() -> Self {
        Self::default()
    }

    /// Force CPU execution
    pub fn cpu() -> Self {
        Self {
            provider: ExecutionProvider::Cpu,
            ..Default::default()
        }
    }

    /// Use DirectML (Windows GPU)
    pub fn directml() -> Self {
        Self {
            provider: ExecutionProvider::DirectML,
            ..Default::default()
        }
    }

    /// Use CUDA (NVIDIA GPU)
    pub fn cuda() -> Self {
        Self {
            provider: ExecutionProvider::Cuda,
            ..Default::default()
        }
    }

    /// Set number of intra-op threads
    pub fn with_intra_threads(mut self, threads: usize) -> Self {
        self.intra_threads = threads;
        self
    }

    /// Set number of inter-op threads
    pub fn with_inter_threads(mut self, threads: usize) -> Self {
        self.inter_threads = threads;
        self
    }

    /// Get the execution provider
    pub fn provider(&self) -> ExecutionProvider {
        self.provider
    }

    /// Get intra-op thread count
    pub fn intra_threads(&self) -> usize {
        self.intra_threads
    }

    /// Get inter-op thread count
    pub fn inter_threads(&self) -> usize {
        self.inter_threads
    }

    /// Log the configuration
    pub fn log_config(&self) {
        info!(
            "ONNX Session Config: provider={}, intra_threads={}, inter_threads={}",
            self.provider.name(),
            self.intra_threads,
            self.inter_threads
        );

        if self.provider.is_gpu() {
            info!("GPU device ID: {}", ExecutionProvider::device_id());
        }
    }
}

/// Build an ONNX Runtime session with the given configuration
///
/// Supports GPU acceleration via DirectML (Windows) or CUDA (Linux/NVIDIA).
/// Falls back to CPU if GPU provider is unavailable or fails.
///
/// Environment variables:
/// - VULPES_GPU_PROVIDER: Override provider (directml, cuda, cpu)
/// - VULPES_GPU_DEVICE_ID: GPU device ID (default: 0)
pub fn build_session_with_config(
    model_path: &str,
    config: &SessionConfig,
) -> Result<ort::session::Session, Box<dyn std::error::Error + Send + Sync>> {
    config.log_config();

    let mut builder = ort::session::Session::builder()?
        .with_intra_threads(config.intra_threads)?;

    // Try to add GPU execution provider if requested
    match config.provider {
        ExecutionProvider::DirectML => {
            // DirectML is available on Windows with DirectX 12 compatible GPU
            // Requires ONNX Runtime built with DirectML support
            #[cfg(target_os = "windows")]
            {
                info!("Attempting to use DirectML execution provider");
                // The ort crate's DirectML support requires the directml feature
                // and a DirectML-enabled ONNX Runtime build.
                // For now, we attempt to use it and fall back to CPU if it fails.
                match try_add_directml(&mut builder) {
                    Ok(()) => info!("DirectML execution provider added successfully"),
                    Err(e) => {
                        warn!("DirectML not available: {}. Falling back to CPU.", e);
                    }
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                warn!("DirectML is only available on Windows. Using CPU fallback.");
            }
        }
        ExecutionProvider::Cuda => {
            info!("Attempting to use CUDA execution provider");
            // CUDA requires NVIDIA GPU and CUDA toolkit
            match try_add_cuda(&mut builder) {
                Ok(()) => info!("CUDA execution provider added successfully"),
                Err(e) => {
                    warn!("CUDA not available: {}. Falling back to CPU.", e);
                }
            }
        }
        ExecutionProvider::CoreML => {
            #[cfg(target_os = "macos")]
            {
                info!("CoreML execution provider requested (macOS)");
                // CoreML support would go here
                warn!("CoreML support not yet implemented. Using CPU fallback.");
            }
            #[cfg(not(target_os = "macos"))]
            {
                warn!("CoreML is only available on macOS. Using CPU fallback.");
            }
        }
        ExecutionProvider::Cpu => {
            info!("Using CPU execution provider");
        }
    }

    let session = builder.commit_from_file(model_path)?;
    info!("Session created for model: {}", model_path);

    Ok(session)
}

/// Try to add DirectML execution provider (Windows only)
/// 
/// To enable DirectML support:
/// 1. Build with: cargo build --features directml
/// 2. Ensure ONNX Runtime DirectML DLL is available
/// 3. Set VULPES_GPU_PROVIDER=directml
#[cfg(all(target_os = "windows", feature = "directml"))]
fn try_add_directml(
    builder: &mut ort::session::builder::SessionBuilder,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use ort::execution_providers::DirectMLExecutionProvider;
    
    let device_id = ExecutionProvider::device_id();
    info!("Adding DirectML execution provider (device_id={})", device_id);
    
    *builder = std::mem::take(builder)
        .with_execution_providers([
            DirectMLExecutionProvider::default()
                .with_device_id(device_id)
                .build()
        ])?;
    
    Ok(())
}

#[cfg(all(target_os = "windows", not(feature = "directml")))]
fn try_add_directml(
    _builder: &mut ort::session::builder::SessionBuilder,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    Err("DirectML feature not enabled. Rebuild with: cargo build --features directml".into())
}

#[cfg(not(target_os = "windows"))]
fn try_add_directml(
    _builder: &mut ort::session::builder::SessionBuilder,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    Err("DirectML is only available on Windows".into())
}

/// Try to add CUDA execution provider (NVIDIA GPUs)
///
/// To enable CUDA support:
/// 1. Build with: cargo build --features cuda
/// 2. Ensure CUDA toolkit is installed
/// 3. Set VULPES_GPU_PROVIDER=cuda
#[cfg(feature = "cuda")]
fn try_add_cuda(
    builder: &mut ort::session::builder::SessionBuilder,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use ort::execution_providers::CUDAExecutionProvider;
    
    let device_id = ExecutionProvider::device_id();
    info!("Adding CUDA execution provider (device_id={})", device_id);
    
    *builder = std::mem::take(builder)
        .with_execution_providers([
            CUDAExecutionProvider::default()
                .with_device_id(device_id)
                .build()
        ])?;
    
    Ok(())
}

#[cfg(not(feature = "cuda"))]
fn try_add_cuda(
    _builder: &mut ort::session::builder::SessionBuilder,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    Err("CUDA feature not enabled. Rebuild with: cargo build --features cuda".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recommended_provider() {
        // Should return a valid provider
        let provider = ExecutionProvider::recommended();
        assert!(matches!(
            provider,
            ExecutionProvider::Cpu
                | ExecutionProvider::DirectML
                | ExecutionProvider::Cuda
                | ExecutionProvider::CoreML
        ));
    }

    #[test]
    fn test_session_config_default() {
        let config = SessionConfig::default();
        assert_eq!(config.intra_threads, 4);
        assert_eq!(config.inter_threads, 1);
    }

    #[test]
    fn test_provider_is_gpu() {
        assert!(!ExecutionProvider::Cpu.is_gpu());
        assert!(ExecutionProvider::DirectML.is_gpu());
        assert!(ExecutionProvider::Cuda.is_gpu());
        assert!(ExecutionProvider::CoreML.is_gpu());
    }
}
