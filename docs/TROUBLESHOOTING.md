# Troubleshooting Guide

Common issues and solutions for Vulpes Celare.

## Table of Contents

- [Installation Issues](#installation-issues)
- [ONNX Runtime Issues](#onnx-runtime-issues)
- [Native Addon Issues](#native-addon-issues)
- [Memory Issues](#memory-issues)
- [Performance Tuning](#performance-tuning)
- [Detection Issues](#detection-issues)
- [Getting Help](#getting-help)

---

## Installation Issues

### `Cannot find module 'better-sqlite3'`

**Cause:** Native module needs to be rebuilt for your Node.js version.

**Solution:**
```bash
npm rebuild better-sqlite3
```

If that fails, try a full reinstall:
```bash
rm -rf node_modules
npm install
```

### `sharp` installation failed

**Cause:** Platform-specific binary not available or build tools missing.

**Windows:**
```bash
npm install --platform=win32 --arch=x64 sharp
```

**macOS (Apple Silicon):**
```bash
npm install --platform=darwin --arch=arm64 sharp
```

**Linux:**
Ensure build essentials are installed:
```bash
sudo apt-get install build-essential libvips-dev
npm rebuild sharp
```

### `npm ERR! gyp ERR! find Python`

**Cause:** Python not found for native module compilation.

**Solution:**
```bash
# Windows (with chocolatey)
choco install python

# macOS
brew install python

# Linux
sudo apt-get install python3
```

---

## ONNX Runtime Issues

### `ONNX Runtime not found` or `Cannot load onnxruntime`

**Cause:** The ONNX Runtime shared library is not in the expected location.

**Solution (Windows):**
The runtime should be bundled at `native/onnxruntime.dll`. If missing:
```bash
npm run native:ort:download
```

**Solution (macOS/Linux):**
ONNX Runtime is not bundled for these platforms. Download manually:
```bash
npm run native:ort:download
```

Or set the path to your existing installation:
```bash
export VULPES_ORT_PATH=/path/to/libonnxruntime.so
# or
export ORT_DYLIB_PATH=/path/to/libonnxruntime.dylib
```

### `DLL load failed` (Windows)

**Cause:** Missing Visual C++ Redistributable.

**Solution:**
Download and install [Visual C++ Redistributable 2019+](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### `Error: CUDA driver version is insufficient`

**Cause:** Attempting GPU acceleration without proper CUDA installation.

**Solution:**
Either install CUDA 11.8+ or fall back to CPU:
```bash
export VULPES_ML_DEVICE=cpu
```

---

## Native Addon Issues

### `Native addon not loaded, using TypeScript fallback`

**This is informational, not an error.** Vulpes Celare includes TypeScript fallbacks for all Rust accelerators. Performance may be reduced but functionality is complete.

To enable native acceleration:

**Windows:** Prebuilt binaries are included. If not working:
```bash
npm run native:build
```

**macOS/Linux:** Build from source:
```bash
# Install Rust first: https://rustup.rs
npm run native:install
npm run native:build
```

### Build fails with `cargo not found`

**Cause:** Rust toolchain not installed.

**Solution:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### Build fails on Windows with `LINK : fatal error`

**Cause:** Missing Visual Studio Build Tools.

**Solution:**
Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with "Desktop development with C++" workload.

---

## Memory Issues

### `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`

**Cause:** Large documents or batch processing exceeding default heap size.

**Solution:**
```bash
# Increase heap size (e.g., 8GB)
export NODE_OPTIONS="--max-old-space-size=8192"

# Or inline
NODE_OPTIONS="--max-old-space-size=8192" node your-script.js
```

### High memory usage during image processing

**Cause:** Sharp keeps decoded images in memory.

**Solutions:**
1. Process images sequentially rather than in parallel
2. Use streaming API for large batches:
```typescript
import { StreamingRedactor } from "vulpes-celare";

const stream = new StreamingRedactor();
// Process chunks instead of loading full documents
```

### Memory not being released

**Cause:** Potential span pool accumulation.

**Solution:** The span pool is bounded and self-manages. If you're seeing sustained high memory:
```typescript
// Force garbage collection (if running with --expose-gc)
if (global.gc) global.gc();
```

---

## Performance Tuning

### Environment Variables

Full reference in `src/config/EnvironmentConfig.ts` and `src/config/RustAccelConfig.ts`.

**Key variables:**

| Variable | Default | Description |
|:--|:-:|:--|
| `VULPES_RUST_ACCEL` | `1` | Global Rust acceleration (0=off, 1=basic, 2=full) |
| `VULPES_ML_DEVICE` | `cpu` | ML device: `cpu`, `cuda`, `directml` |
| `VULPES_USE_GLINER` | `0` | Enable GLiNER neural NER (requires model download) |
| `VULPES_SEMANTIC_CACHE` | `1` | Document caching for repeated templates |
| `VULPES_SUPERVISION` | `1` | Erlang-style supervision for fault tolerance |

### Disable specific accelerators

If a specific accelerator causes issues:
```bash
VULPES_NAME_ACCEL=0      # Disable name scanner acceleration
VULPES_SCAN_ACCEL=0      # Disable identifier scanner
VULPES_TEXT_ACCEL=0      # Disable text processing acceleration
```

### GPU Acceleration

For NVIDIA GPUs:
```bash
export VULPES_ML_DEVICE=cuda
export VULPES_ML_GPU_DEVICE_ID=0  # If multiple GPUs
```

For Windows with DirectML:
```bash
export VULPES_GPU_PROVIDER=directml
```

---

## Detection Issues

### Over-redaction (too many false positives)

**Symptoms:** Medical terms, drug names, or common words being redacted.

**Solutions:**

1. **Check the medical allowlist** - Common medical terms are allowlisted by default. If you're seeing specific terms redacted:
```typescript
// Custom allowlist addition (via policy DSL)
const policy = PolicyCompiler.compile(`
  policy CUSTOM extends HIPAA_STRICT {
    allow "metformin"
    allow "lisinopril"
  }
`);
```

2. **Adjust confidence thresholds** - Higher thresholds = fewer detections:
```bash
# Via environment (affects all filters)
export VULPES_CONFIDENCE_MINIMUM=0.7  # Default is lower
```

3. **Use policy DSL** to fine-tune:
```typescript
const policy = PolicyCompiler.compile(`
  policy RESEARCH extends HIPAA_STRICT {
    keep dates      // Preserve dates for temporal analysis
    keep ages       // Keep ages for demographic research
  }
`);
```

### Under-detection (missed PHI)

**Symptoms:** Names, dates, or identifiers not being redacted.

**Solutions:**

1. **Enable context-aware filters:**
```bash
export VULPES_CONTEXT_FILTERS=1
```

2. **Enable GLiNER neural detection** (requires model):
```bash
npm run models:download:gliner
export VULPES_USE_GLINER=1
```

3. **Lower confidence thresholds** (may increase false positives):
```bash
export VULPES_CONFIDENCE_MINIMUM=0.4
```

4. **Check document format** - Ensure text is properly extracted from PDFs/images before processing.

### Inconsistent results across runs

**Cause:** Usually related to ML model randomness or cache state.

**Solution:** Use fixed seed for reproducible testing:
```bash
npm test -- --seed=1337
```

---

## Getting Help

### Enable Debug Logging

```bash
export VULPES_LOG_LEVEL=debug
```

This provides detailed output on:
- Filter execution times
- Span detection details
- Confidence calculations
- Cache hit/miss rates

### Collect Diagnostic Information

```bash
# Run with diagnostics
node -e "const v = require('vulpes-celare'); console.log(JSON.stringify(v.getDiagnostics(), null, 2))"
```

### GitHub Issues

If you can't resolve the issue:

1. Search [existing issues](https://github.com/DocHatty/Vulpes-Celare/issues)
2. Open a new issue with:
   - Node.js version (`node --version`)
   - Operating system
   - Vulpes Celare version
   - Error message and stack trace
   - Minimal reproduction steps

**Do not include PHI in issue reports.** Use synthetic data that demonstrates the problem.

### Security Issues

For security vulnerabilities, **do not** open a public issue. See [SECURITY.md](../SECURITY.md) for responsible disclosure.

---

*For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md). For deployment guidance, see [deployment/AIR-GAPPED-DEPLOYMENT.md](deployment/AIR-GAPPED-DEPLOYMENT.md).*
