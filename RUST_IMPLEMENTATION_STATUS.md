# Vulpes Celare - Rust Integration Status

**Last Updated:** 2025-12-12  
**Status:** Vision inference in Rust; crypto + text accelerators in Rust

## Executive Summary

Vulpes Celare uses a Rust native core (NAPI-RS) for performance- and correctness-critical paths. **OCR + face detection inference run in Rust via `ort`**, and the native addon is the single ONNX Runtime owner inside the Node process.

In addition to vision, the same native addon now provides **cryptographic and text inner-loop helpers** (SHA-256, HMAC-SHA256, Merkle root, phonetic matching).

## Implemented (Done)

**Native crate**

- Rust crate: `src/rust/` (`cdylib` NAPI addon)
- Windows native artifacts:
  - Addon: `native/vulpes_core.win32-x64-msvc.node`
  - ORT DLL: `native/onnxruntime.dll`

**Vision inference (Rust via `ort`)**

- OCR: `src/rust/src/vision/ocr.rs` exposed as `VulpesEngine(detModelPath, recModelPath).detectText(buffer)`
- Face detection: `src/rust/src/vision/face.rs` exposed as `detectFaces(buffer, modelPath, confidenceThreshold?, nmsThreshold?)`
- Wiring: `src/VulpesNative.ts`, `src/core/images/ImageRedactor.ts`

**Provenance + crypto (Rust)**

- SHA-256 helpers: `sha256Hex(buffer)`, `sha256HexString(text)`
- HMAC-SHA256 helper: `hmacSha256Hex(key, message)`
- Merkle root helper: `merkleRootSha256Hex(leafHashesHex)`
- Wiring:
  - Trust bundles: `src/provenance/TrustBundleExporter.ts` (prefers native, falls back to Node crypto)
  - DICOM hashing: `src/core/dicom/DicomStreamTransformer.ts` (prefers native, falls back to Node crypto)

**Text hotspot acceleration (Rust)**

- Native phonetic matcher: `VulpesPhoneticMatcher` (double-metaphone + bounded edit distance)
- Wiring: `src/utils/PhoneticMatcher.ts` (prefers native, falls back to JS)
- Opt-in usage in name validation: set `VULPES_ENABLE_PHONETIC=1` (optional `VULPES_PHONETIC_THRESHOLD=0.95`)

## Resolved: ONNX Runtime DLL Conflicts

Face detection and OCR inference are consolidated into the Rust addon, so the Node process does not need to load a second ONNX Runtime binding (reduces native DLL conflicts and preprocessing drift).

## Build & Test

```bash
npm run native:build
npm run build
npm test
```

Strict gating (exits non-zero if thresholds/misses fail):

```bash
npm run test:strict
```

Native sanity check:

```bash
node scripts/test_simple.js
```

## Next Steps (Remaining Work)

1. Migrate the biggest text hot loops to Rust based on measurement (name detection/scanning dominates runtime today; see `docs/internal/PROFILING.md`).
2. Cross-platform native packaging: reproducible Windows/macOS/Linux artifacts and a consistent ORT distribution strategy.
3. Expand DICOM validation and pixel redaction robustness (Rust migration only where it reduces correctness/throughput risk).
