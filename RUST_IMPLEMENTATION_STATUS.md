# Vulpes Celare - Rust Integration Status

**Last Updated:** 2025-12-13  
**Status:** Vision inference in Rust; crypto + multiple text hotspots in Rust (feature-flagged)

## Executive Summary

Vulpes Celare uses a Rust native core (NAPI-RS) for performance- and correctness-critical paths. **OCR + face detection inference run in Rust via `ort`**, and the native addon is the single ONNX Runtime owner inside the Node process (no JS-side ONNX bindings).

In addition to vision, the same native addon provides **cryptographic and text inner-loop helpers** (SHA-256, HMAC-SHA256, Merkle root, phonetic matching, tokenization, span overlap pruning, name scanning, post-filter pruning).

## Implemented (Done)

**Native crate**

- Rust crate: `src/rust/` (`cdylib` NAPI addon)
- Windows native artifacts:
  - Addon: `native/vulpes_core.win32-x64-msvc.node`
  - ORT DLL: `native/onnxruntime.dll`
- One-command rebuild: `npm run native:build` (compiles Rust + copies `.node`)
- Packaging note: native prebuild distribution is currently Windows-first; set `VULPES_REQUIRE_NATIVE=1` to hard-fail installs on unsupported platforms.

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
  - Opt-in usage: `VULPES_ENABLE_PHONETIC=1` (optional `VULPES_PHONETIC_THRESHOLD=0.95`)
- Tokenization with offsets: `tokenizeWithPositions(text, includePunctuation)`
  - Wiring: `src/services/WindowService.ts` (opt-in `VULPES_TEXT_ACCEL=1`)
- Span overlap pruning: `dropOverlappingSpans(spans) -> keptIndices`
  - Wiring: `src/models/Span.ts` (opt-in `VULPES_SPAN_ACCEL=1`)
- Span-apply kernel: `applyReplacements(text, replacements) -> string`
  - Wiring: `src/core/ParallelRedactionEngine.ts` (opt-in `VULPES_APPLY_SPANS_ACCEL=1`, shadow: `VULPES_SHADOW_APPLY_SPANS=1`)
- NAME comma-pattern scanner: `VulpesNameScanner.detectLastFirst(text) -> spans`
  - Additional pattern: `VulpesNameScanner.detectFirstLast(text) -> spans` (shadow-first rollout; `VULPES_SHADOW_RUST_NAME_FULL=1`)
  - Additional pattern: `VulpesNameScanner.detectSmart(text) -> spans` (ports `SmartNameFilterSpan` pattern families; shadow-first rollout; `VULPES_SHADOW_RUST_NAME_SMART=1`)
  - Wiring: `src/filters/SmartNameFilterSpan.ts` (opt-in `VULPES_NAME_ACCEL=1` for comma; `VULPES_NAME_ACCEL=2` enables First Last; `VULPES_NAME_ACCEL=3` promotes SmartName)
- Shadow diff: `VULPES_SHADOW_RUST_NAME=1` (records summary in execution report)
- Shadow diff: `VULPES_SHADOW_RUST_NAME_SMART=1` (records summary in execution report)
- Post-filter pruning decisions: `postfilterDecisions(spans) -> keep/remove`
  - Wiring: `src/core/filters/PostFilterService.ts` (opt-in `VULPES_POSTFILTER_ACCEL=1`)
  - Shadow diff: `VULPES_SHADOW_POSTFILTER=1` (records summary in execution report)
- Multi-identifier scan kernel: `scanAllIdentifiers(text) -> detections[]`
  - Wiring: `src/utils/RustScanKernel.ts` + filters:
    - `src/filters/EmailFilterSpan.ts`, `src/filters/URLFilterSpan.ts`, `src/filters/IPAddressFilterSpan.ts`, `src/filters/PhoneFilterSpan.ts`, `src/filters/SSNFilterSpan.ts`
    - `src/filters/DateFilterSpan.ts`, `src/filters/MRNFilterSpan.ts`, `src/filters/DEAFilterSpan.ts`, `src/filters/CreditCardFilterSpan.ts`, `src/filters/AccountNumberFilterSpan.ts`
    - `src/filters/LicenseNumberFilterSpan.ts`, `src/filters/PassportNumberFilterSpan.ts`, `src/filters/HealthPlanNumberFilterSpan.ts`, `src/filters/FaxNumberFilterSpan.ts`, `src/filters/ZipCodeFilterSpan.ts`, `src/filters/NPIFilterSpan.ts`
    - `src/filters/AddressFilterSpan.ts`
    - `src/filters/VehicleIdentifierFilterSpan.ts`, `src/filters/DeviceIdentifierFilterSpan.ts`, `src/filters/UniqueIdentifierFilterSpan.ts`
  - Opt-in: `VULPES_SCAN_ACCEL=1`
- Streaming kernel: `VulpesStreamingKernel`
  - Wiring: `src/StreamingRedactor.ts` (opt-in `VULPES_STREAM_KERNEL=1`)
- Streaming detections (rolling window, stateful):
  - NAME: `VulpesStreamingNameScanner` (used by `src/utils/RustStreamingNameScanner.ts`)
  - Identifiers: `VulpesStreamingIdentifierScanner` (used by `src/utils/RustStreamingIdentifierScanner.ts`)
  - Streaming API attachment: `src/StreamingRedactor.ts` (opt-in `VULPES_STREAM_DETECTIONS=1` or `emitDetections: true`; does not change redaction output)

## Resolved: ONNX Runtime DLL Conflicts

Face detection and OCR inference are consolidated into the Rust addon, so the Node process does not need to load a second ONNX Runtime binding (reduces native DLL conflicts and preprocessing drift).
`npm test` enforces this boundary via `scripts/check-onnx-boundary.js`.

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

1. Promote Rust accelerators from opt-in to default once shadow diffs are clean (PHI-sensitivity-first).
2. Burn down master-suite misses (current misses include `NAME` and `AGE_90_PLUS`) and enable strict gating (`npm run test:strict`) for CI.
3. Expand native prebuild publishing beyond Windows (macOS/Linux) and keep deterministic ORT distribution pinned to `ort`.
4. Expand DICOM anonymization validation and pixel redaction robustness (selective Rust migration only where it reduces correctness/throughput risk).
