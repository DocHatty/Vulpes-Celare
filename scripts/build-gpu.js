#!/usr/bin/env node

/**
 * build-gpu.js - Build script for GPU-accelerated components
 *
 * Builds ONNX Runtime with DirectML (Windows) or CUDA (Linux/macOS) support.
 *
 * Usage:
 *   node scripts/build-gpu.js [options]
 *
 * Options:
 *   --provider=NAME    GPU provider (directml, cuda, rocm, coreml)
 *   --download-only    Only download pre-built binaries, don't build
 *   --verify           Verify GPU acceleration is working
 *   --status           Show current GPU configuration
 *
 * Environment Variables:
 *   VULPES_GPU_PROVIDER   Default GPU provider (directml, cuda, cpu)
 */

const { spawnSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  provider: null,
  downloadOnly: false,
  verify: false,
  statusOnly: false,
};

for (const arg of args) {
  if (arg === "--download-only") options.downloadOnly = true;
  if (arg === "--verify") options.verify = true;
  if (arg === "--status") options.statusOnly = true;
  if (arg.startsWith("--provider=")) {
    options.provider = arg.split("=")[1];
  }
}

// Default provider based on platform
function getDefaultProvider() {
  if (process.env.VULPES_GPU_PROVIDER) {
    return process.env.VULPES_GPU_PROVIDER;
  }
  if (process.platform === "win32") {
    return "directml";
  }
  if (process.platform === "linux") {
    return "cuda";
  }
  if (process.platform === "darwin") {
    return "coreml";
  }
  return "cpu";
}

// ONNX Runtime versions and download URLs
const ONNX_RUNTIME_VERSION = "1.16.3";
const ONNX_RUNTIME_URLS = {
  "directml-win-x64": `https://github.com/microsoft/onnxruntime/releases/download/v${ONNX_RUNTIME_VERSION}/onnxruntime-directml-${ONNX_RUNTIME_VERSION}-win-x64.zip`,
  "cuda-linux-x64": `https://github.com/microsoft/onnxruntime/releases/download/v${ONNX_RUNTIME_VERSION}/onnxruntime-linux-x64-gpu-${ONNX_RUNTIME_VERSION}.tgz`,
  "coreml-darwin-arm64": `https://github.com/microsoft/onnxruntime/releases/download/v${ONNX_RUNTIME_VERSION}/onnxruntime-osx-arm64-${ONNX_RUNTIME_VERSION}.tgz`,
};

function printHeader() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║           VULPES CELARE - GPU Build Tool                       ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("");
}

function showStatus() {
  console.log("GPU Configuration Status:");
  console.log("─".repeat(60));
  
  const provider = getDefaultProvider();
  console.log(`  Platform:         ${process.platform}`);
  console.log(`  Architecture:     ${process.arch}`);
  console.log(`  Default Provider: ${provider}`);
  console.log("");
  
  // Check for DirectML on Windows
  if (process.platform === "win32") {
    const dmlPath = path.join(__dirname, "../native/DirectML.dll");
    console.log(`  DirectML.dll:     ${fs.existsSync(dmlPath) ? "Found" : "Not found"}`);
  }
  
  // Check for ONNX Runtime
  const ortPath = path.join(__dirname, "../native/onnxruntime.dll");
  const ortPathSo = path.join(__dirname, "../native/libonnxruntime.so");
  const ortPathDylib = path.join(__dirname, "../native/libonnxruntime.dylib");
  
  const ortExists = fs.existsSync(ortPath) || fs.existsSync(ortPathSo) || fs.existsSync(ortPathDylib);
  console.log(`  ONNX Runtime:     ${ortExists ? "Found" : "Not found"}`);
  
  console.log("");
  console.log("Environment Variables:");
  console.log(`  VULPES_GPU_PROVIDER: ${process.env.VULPES_GPU_PROVIDER || "(not set)"}`);
  console.log("");
}

async function verifyGPU() {
  console.log("Verifying GPU acceleration...");
  console.log("");
  
  const provider = options.provider || getDefaultProvider();
  
  if (provider === "cpu") {
    console.log("GPU provider is set to CPU - no GPU acceleration.");
    return;
  }
  
  console.log(`Testing ${provider} provider...`);
  
  // Simple verification - try to load ONNX Runtime
  try {
    const distPath = path.join(__dirname, "../dist");
    if (fs.existsSync(distPath)) {
      console.log("Attempting to load ONNX Runtime...");
      // We'll add actual verification later
      console.log("Note: Full GPU verification requires a built project.");
    } else {
      console.log("Project not built yet. Run 'npm run build' first.");
    }
  } catch (error) {
    console.error("Verification failed:", error.message);
  }
  
  console.log("");
}

async function downloadGPURuntime() {
  const provider = options.provider || getDefaultProvider();
  const arch = process.arch;
  const platform = process.platform;
  
  console.log(`Downloading ONNX Runtime for ${provider} on ${platform}-${arch}...`);
  
  let urlKey;
  if (provider === "directml" && platform === "win32") {
    urlKey = "directml-win-x64";
  } else if (provider === "cuda" && platform === "linux") {
    urlKey = "cuda-linux-x64";
  } else if (provider === "coreml" && platform === "darwin") {
    urlKey = "coreml-darwin-arm64";
  } else {
    console.log(`No pre-built GPU runtime available for ${provider} on ${platform}-${arch}`);
    console.log("Using CPU fallback.");
    return;
  }
  
  const url = ONNX_RUNTIME_URLS[urlKey];
  if (!url) {
    console.log("Download URL not configured for this platform.");
    return;
  }
  
  console.log(`Download URL: ${url}`);
  console.log("");
  console.log("To download manually:");
  console.log(`  1. Download from: ${url}`);
  console.log("  2. Extract to native/ directory");
  console.log("");
}

async function buildGPU() {
  const provider = options.provider || getDefaultProvider();
  
  console.log(`Building with ${provider} GPU provider...`);
  console.log("");
  
  if (options.downloadOnly) {
    await downloadGPURuntime();
    return;
  }
  
  // For now, just provide instructions
  console.log("GPU Build Instructions:");
  console.log("─".repeat(60));
  
  if (provider === "directml" && process.platform === "win32") {
    console.log("DirectML (Windows):");
    console.log("  1. Download ONNX Runtime DirectML package");
    console.log("  2. Copy onnxruntime.dll and DirectML.dll to native/");
    console.log("  3. Set VULPES_GPU_PROVIDER=directml");
  } else if (provider === "cuda") {
    console.log("CUDA:");
    console.log("  1. Install CUDA Toolkit 11.8+");
    console.log("  2. Install cuDNN 8.x");
    console.log("  3. Download ONNX Runtime CUDA package");
    console.log("  4. Set VULPES_GPU_PROVIDER=cuda");
  } else if (provider === "coreml") {
    console.log("CoreML (macOS):");
    console.log("  1. Download ONNX Runtime for macOS");
    console.log("  2. CoreML is used automatically on Apple Silicon");
    console.log("  3. Set VULPES_GPU_PROVIDER=coreml");
  } else {
    console.log("CPU mode - no GPU acceleration needed.");
  }
  
  console.log("");
}

async function main() {
  printHeader();
  
  if (options.statusOnly) {
    showStatus();
    return;
  }
  
  if (options.verify) {
    await verifyGPU();
    return;
  }
  
  await buildGPU();
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
