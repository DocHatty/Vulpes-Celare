# Architecture Deep Dive

## Overview

Vulpes Celare is split into two execution domains:

1. **TypeScript/Node.js orchestration**: policies, streaming, filter execution, token mapping, CLI, trust bundles.
2. **Rust native core**: ONNX inference + selected inner-loop accelerators (vision, crypto, and opt-in text hotspots).

This boundary is intentional: TypeScript stays readable and policy-driven, while Rust owns the performance-critical inference stack.

## Module Map

- Text core: `src/VulpesCelare.ts`, `src/core/`
- Filters: `src/filters/` (28 specialized filters)
- Dictionaries: `src/dictionaries/`
- Streaming: `src/StreamingRedactor.ts`
- Provenance / trust bundles: `src/provenance/`
- Images (orchestration): `src/core/images/`
- DICOM: `src/core/dicom/`
- Native core (Rust): `src/rust/`
- Native binaries: `native/`

## Text Redaction Pipeline

High-level flow:

1. `VulpesCelare.process()` orchestrates redaction.
2. `ParallelRedactionEngine.redactParallel()` executes enabled filters in parallel.
3. Spans are merged/resolved and mapped to stable replacement tokens.
4. The output text is returned with an optional execution report (counts, timings, filter breakdown).

Streaming redaction uses the same underlying logic but keeps context across chunks:

- `StreamingRedactor` buffers text and yields safe chunks for real-time applications.
- Examples: `examples/streaming/STREAMING-API.md`

## Image Redaction Pipeline (Faces + OCR)

Image redaction is coordinated by `ImageRedactor`:

- Orchestrator: `src/core/images/ImageRedactor.ts`
- OCR service (Rust): `src/core/images/OCRService.ts` via `src/VulpesNative.ts`
- Face detection (Rust): `src/VulpesNative.ts` (`detectFaces`)
- Pixel edits: `sharp` (rectangle overlays)

Default flow:

1. Load image and compute dimensions via `sharp`.
2. Run OCR (Rust) to extract text boxes.
3. Run face detection (Rust) to extract face boxes.
4. Optionally classify OCR text as PHI using the text engine and heuristics.
5. Apply redaction rectangles to the image buffer.

More: `docs/IMAGE-DICOM.md`

## Native Rust Core (Vision)

### What Rust Owns

The native addon (`src/rust/`) owns:

- PaddleOCR ONNX inference (text detection + recognition)
- UltraFace ONNX inference (face detection)
- Image preprocessing and post-processing for these models
- Crypto/provenance primitives used by trust bundles and DICOM hashing (SHA-256, HMAC-SHA256, Merkle root)
- Text inner-loop accelerators (feature-flagged until fully validated):
  - Phonetic matcher (`VulpesPhoneticMatcher`, `VULPES_ENABLE_PHONETIC=1`)
  - Tokenization with offsets (`tokenizeWithPositions`, `VULPES_TEXT_ACCEL=1`)
  - Span overlap pruning (`dropOverlappingSpans`, `VULPES_SPAN_ACCEL=1`)
  - NAME comma-pattern scanner (`VulpesNameScanner`, `VULPES_NAME_ACCEL=1`, shadow: `VULPES_SHADOW_RUST_NAME=1`)
  - Post-filter false-positive pruning (`postfilterDecisions`, `VULPES_POSTFILTER_ACCEL=1`, shadow: `VULPES_SHADOW_POSTFILTER=1`)
  - Multi-identifier scan kernel (`scanAllIdentifiers`, `VULPES_SCAN_ACCEL=1`)

The Node layer should not load a second ONNX Runtime binding into the same process.
`npm test` enforces this boundary via `scripts/check-onnx-boundary.js`.

### How Node Loads the Addon

`src/VulpesNative.ts` loads the platform-specific `.node` file from `native/`:

- Windows x64: `native/vulpes_core.win32-x64-msvc.node`

It also sets `ORT_DYLIB_PATH` (unless already set) so the `ort` crate can load a compatible ONNX Runtime DLL.

### ONNX Runtime (Windows)

Windows builds ship with `native/onnxruntime.dll` pinned to the ORT version required by `ort` (1.22.x).

To override the runtime (e.g., CUDA/DirectML builds), set one of these before importing `vulpes-celare`:

```bat
set VULPES_ORT_PATH=C:\path\to\onnxruntime.dll
REM or
set ORT_DYLIB_PATH=C:\path\to\onnxruntime.dll
```

### ONNX Runtime (macOS/Linux)

macOS/Linux native packaging is currently Windows-first. If you build the native core on macOS/Linux, the same mechanism is used, with these default filenames under `native/`:

- macOS: `libonnxruntime.dylib`
- Linux: `libonnxruntime.so`

## Trust Bundles / Provenance

Trust bundles provide tamper-evident proof of redaction and are designed for audit workflows:

- Spec: `docs/TRUST-BUNDLE.md`
- Verification UI: `verification-portal/README.md`

## DICOM Processing

DICOM anonymization is implemented in Node today:

- `src/core/dicom/DicomStreamTransformer.ts`
- Convenience export: `anonymizeDicomBuffer`

See `docs/IMAGE-DICOM.md` for usage and hashing/UID behavior (HMAC-SHA256 hashing prefers the Rust crypto helper when available).

## Build & Test

```bash
npm run build
npm test
```

Strict gating:

```bash
npm run test:strict
```

Native sanity check:

```bash
node scripts/test_simple.js
```
