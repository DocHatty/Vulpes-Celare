# Roadmap

This roadmap is a living document. It's intentionally organized around risk reduction (HIPAA safety, stability) and ROI (latency, throughput).

## Current State (Implemented)

- Text redaction engine with 28 filters (`src/filters/`)
- Streaming redaction API (`src/StreamingRedactor.ts`)
- Policy DSL (`src/PolicyDSL.ts`, `examples/policy-dsl/`)
- Trust bundles and verification portal (`docs/TRUST-BUNDLE.md`, `verification-portal/`)
- Image redaction orchestrator (`src/core/images/ImageRedactor.ts`)
- Rust native vision core (NAPI):
  - OCR inference (PaddleOCR) in Rust (`src/rust/src/vision/ocr.rs`)
  - Face detection inference (UltraFace) in Rust (`src/rust/src/vision/face.rs`)
- Provenance hardening: `.red` is a ZIP bundle with offline verification and Merkle proof (`docs/provenance-spec.md`)
- Rust crypto helpers: SHA-256, HMAC-SHA256, Merkle root (used by trust bundles + DICOM hashing)
- Rust text accelerators (feature-flagged, PHI-safe rollout):
  - Span overlap pruning (`dropOverlappingSpans`, `VULPES_SPAN_ACCEL=1`)
  - Tokenization with offsets (`tokenizeWithPositions`, `VULPES_TEXT_ACCEL=1`)
  - NAME comma-pattern scanning (`VulpesNameScanner`, `VULPES_NAME_ACCEL=1`, shadow: `VULPES_SHADOW_RUST_NAME=1`)
  - Post-filter false-positive pruning (`postfilterDecisions`, `VULPES_POSTFILTER_ACCEL=1`, shadow: `VULPES_SHADOW_POSTFILTER=1`)
  - Multi-identifier scan kernel (`scanAllIdentifiers`, `VULPES_SCAN_ACCEL=1`)
- Guardrail: preflight prevents reintroducing JS ONNX runtime bindings (`scripts/check-onnx-boundary.js`, runs in `npm test`)
- Native packaging scaffolding:
  - Prebuild workflow: `.github/workflows/native-prebuild.yml`
  - Install helper: `scripts/install-native.js` (downloads release bundles for published packages)
- DICOM anonymization: tag coverage expansion + safe re-encode via `dcmjs` (`docs/IMAGE-DICOM.md`)
- Profiling harness: vitest benches + filter timing script (`docs/internal/PROFILING.md`, `scripts/profile-filters.js`)

## Next (Priority-Ranked)

1. Expand Rust ownership of text hotspots (PHI-safe, measured):
   - Broaden the Rust name scanner beyond the comma-family once shadow diffs are clean.
   - Port additional post-filter/heuristic passes in batch to reduce JS overhead.
2. Make streaming “real”:
   - Replace repeated rescans with an incremental streaming kernel (rolling token window, incremental matching).
3. Cross-platform native packaging:
   - CI prebuild artifacts (Windows-first), deterministic native loading, pinned ORT distribution strategy.
4. Trust bundle UX + rigor:
   - Tighten verification rules (byte-exact canonicalization, error reporting), add CLI export/verify workflows.
5. Expand DICOM validation and pixel redaction robustness (selective Rust migration only if it becomes a correctness/throughput risk).
6. Complete i2b2 2014 validation and publish reproducible evaluation results.

## Documentation Pointers

- Architecture: `docs/ARCHITECTURE.md`
- Images + DICOM: `docs/IMAGE-DICOM.md`
- Benchmarks: `docs/BENCHMARKS.md`
