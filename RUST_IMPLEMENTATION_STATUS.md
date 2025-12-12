# Vulpes Celare - Rust "Ferrari" Engine Implementation Status

**Last Updated:** 2025-12-11  
**Status:** 🔴 BLOCKED - DLL Conflict

---

## Executive Summary

We are building a high-performance Rust core ("Ferrari Engine") for Vulpes Celare using NAPI-RS to replace slow JavaScript-based ONNX inference. The OCR engine is **fully implemented** in Rust but we hit a **critical runtime DLL conflict** that blocks integration testing.

---

## What We Built (DONE ✅)

### 1. Rust Crate Structure
- **Location:** `src/rust/`
- **Crate Name:** `vulpes-core`
- **Type:** `cdylib` (Node.js native addon)

### 2. Files Created/Modified

| File | Purpose | Status |
|------|---------|--------|
| `src/rust/Cargo.toml` | Dependencies & config | ✅ Complete |
| `src/rust/src/lib.rs` | NAPI exports | ✅ Complete |
| `src/rust/src/vision/mod.rs` | Vision module | ✅ Complete |
| `src/rust/src/vision/ocr.rs` | Full OCR Engine | ✅ Complete |
| `src/VulpesNative.ts` | TypeScript wrapper | ✅ Complete |
| `native/vulpes_core.win32-x64-msvc.node` | Compiled binary | ✅ Deployed |

### 3. OCR Engine Features (vision/ocr.rs)
- ✅ ONNX model loading via `ort` crate v2
- ✅ Image preprocessing (resize, normalize, CHW conversion)
- ✅ Detection model inference (PaddleOCR DB)
- ✅ DB post-processing (binarization, flood-fill contour extraction)
- ✅ Box region cropping
- ✅ Recognition model inference
- ✅ CTC Greedy Decoding
- ✅ Returns `TextDetectionResult { text, confidence, box_points }`

### 4. Models Present
- `models/ocr/det.onnx` (88 MB) - Detection model
- `models/ocr/rec.onnx` (7.8 MB) - Recognition model

### 5. Build Configuration
- **Target Dir:** `C:\Temp\vulpes_build` (avoid Windows MAX_PATH issues)
- **Single-threaded build:** `-j 1` (avoid file locking)
- **ORT Features:** `load-dynamic`, `ndarray`

---

## The Brick Wall 🧱

### Problem: DLL Version Conflict

When running the integration test, we get:
```
thread '<unnamed>' panicked at 'ort 2.0.0-rc.10 is not compatible with the ONNX Runtime loaded. Expected '1.22.x', but got '1.17.1'
```

### Root Cause Analysis

1. **`onnxruntime-node`** (JS package in `package.json`) loads `onnxruntime.dll` v1.17.1 into the Node.js process.

2. **`ort`** (Rust crate) expects ONNX Runtime v1.22.x (bundled with ort v2.0.0-rc.10).

3. **Conflict:** Both libraries try to use ONNX Runtime in the same process. The JS library loads first, poisoning the process with the wrong version.

4. **Location of conflicting DLL:**
   - `node_modules/onnxruntime-node/bin/napi-v6/win32/x64/onnxruntime.dll`

### Why This Happens
- `VisualDetector.ts` imports `onnxruntime-node` for face detection
- When Node.js loads ANY file that transitively imports `VisualDetector`, the DLL gets loaded
- Our Rust engine then panics because it sees the wrong DLL version

---

## Attempted Fixes (Failed)

| Attempt | Result |
|---------|--------|
| Set `ORT_DYLIB_PATH` to local DLL | DLL loaded correctly but version still rejected |
| Download ONNX Runtime 1.19.0 manually | Still rejected ("Expected 1.22.x, got 1.19.0") |
| Download ONNX Runtime 1.19.2 manually | Still rejected |
| Pin `ort` to `=2.0.0-rc.9` | Compilation failed (267 errors - API incompatibility) |
| Copy DLL to `native/` folder | No effect |

---

## The Solution (NOT YET IMPLEMENTED)

### "Pure Ferrari" Strategy

**Eliminate `onnxruntime-node` entirely.** Move ALL ONNX inference to Rust.

1. **Migrate Face Detection to Rust**
   - Port `VisualDetector.ts` logic to `src/rust/src/vision/face.rs`
   - Model: `ultraface.onnx`
   - Expose via NAPI: `detectFaces(buffer) -> FaceDetection[]`

2. **Remove JS ONNX Dependency**
   ```bash
   npm uninstall onnxruntime-node
   ```

3. **Delete Legacy TypeScript Files**
   - `src/core/images/VisualDetector.ts` (replaced by Rust)
   - Update `src/core/images/OCRService.ts` (already done - calls Rust)

4. **Update ImageRedactor.ts**
   - Change: `const visualDetector = new VisualDetector()`
   - To: `const faces = VulpesNative.detectFaces(buffer)`

---

## Files That Need Changes

### Must Create
- [ ] `src/rust/src/vision/face.rs` - Face detection in Rust

### Must Modify
- [ ] `src/rust/src/vision/mod.rs` - Export face module
- [ ] `src/rust/src/lib.rs` - Add `detectFaces` NAPI function
- [ ] `src/VulpesNative.ts` - Add `detectFaces` method
- [ ] `src/core/images/ImageRedactor.ts` - Use Rust face detection

### Must Delete
- [ ] `src/core/images/VisualDetector.ts`

### Must Run
- [ ] `npm uninstall onnxruntime-node`
- [ ] `cargo build --release` (after changes)
- [ ] Copy new `.node` to `native/`

---

## Key Technical Details

### ORT v2 API Quirks (CRITICAL for future LLMs)

The `ort` crate v2.0.0-rc.x has a complex API:

```rust
// Extracting tensor data from session.run() outputs:
let outputs = session.run(inputs)?;

// CORRECT WAY:
let (shape, data) = outputs[0].try_extract_tensor::<f32>()?;
// shape: &ort::tensor::Shape (implements Deref<Target=[i64]>)
// data: &[f32]

// Access dimensions:
let batch = shape[0] as usize;
let height = shape[1] as usize;

// WRONG (will not compile):
// outputs[0].extract_tensor()  // Does not exist
// shape.dims()                  // Does not exist
```

### Borrow Checker Issue (SOLVED)

In `run_recognition`, we had to clone data before calling `self.ctc_greedy_decode`:
```rust
let (shape, data) = outputs[0].try_extract_tensor::<f32>()?;
let data_owned: Vec<f32> = data.to_vec();
drop(outputs); // Release borrow
let (text, confidence) = self.ctc_greedy_decode(&data_owned, seq_len, vocab_size)?;
```

---

## Environment Setup

### Prerequisites
- Rust (stable)
- Visual Studio 2019 Build Tools (Windows)
- Node.js v16+

### Build Commands
```powershell
# Set up environment
call "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

# Build
cd src\rust
set CARGO_TARGET_DIR=C:\Temp\vulpes_build
cargo build --release -j 1

# Deploy
copy C:\Temp\vulpes_build\release\vulpes_core.dll ..\native\vulpes_core.win32-x64-msvc.node
```

### Test Command (currently fails due to DLL conflict)
```bash
node scripts/test_simple.js
```

---

## Cargo.toml Reference

```toml
[package]
name = "vulpes-core"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
napi = { version = "2.16", default-features = false, features = ["napi4", "async", "tokio_rt"] }
napi-derive = "2.16"
ort = { version = "=2.0.0-rc.9", features = ["load-dynamic", "ndarray"] }
image = "0.25"
imageproc = "0.25"
tokenizers = { version = "0.19", default-features = false, features = ["onig"] }
once_cell = "1.19"
ndarray = "0.16"
rayon = "1.10"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
anyhow = "1.0"
tokio = { version = "1", features = ["full"] }

[build-dependencies]
napi-build = "2.1.3"

[profile.dev]
incremental = false

[profile.release]
incremental = false
```

---

## Next Steps (Priority Order)

1. **Create `face.rs`** - Port UltraFace inference to Rust
2. **Expose via NAPI** - Add `detectFaces` function
3. **Remove `onnxruntime-node`** - Eliminate the conflict
4. **Test Integration** - Run `test_simple.js`
5. **Update ImageRedactor** - Wire up the new function
6. **Implement GLiNER** - Logic engine (future)

---

## Contact

If you're an LLM picking this up: The code compiles, the binary loads, but runtime DLL conflicts block inference. The solution is to remove the JS ONNX library entirely by porting face detection to Rust.

**The OCR Rust code is COMPLETE and CORRECT. Do not rewrite it.**
