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
- DICOM anonymization: tag coverage expansion + safe re-encode via `dcmjs` (`docs/IMAGE-DICOM.md`)
- Profiling harness: vitest benches + filter timing script (`docs/internal/PROFILING.md`, `scripts/profile-filters.js`)

## Next (Priority-Ranked)

1. Profile streaming/text hotspots and migrate tight loops to Rust where it improves latency/throughput (name detection/scanning dominates runtime today).
2. Trust bundle UX + rigor: add CLI export/verify flows and tighten verification rules (canonicalization, error reporting).
3. Cross-platform native packaging: publish consistent prebuilt artifacts (Windows/macOS/Linux) and ORT distribution strategy.
4. Expand DICOM validation and pixel redaction robustness (selective Rust migration only if it becomes a correctness/throughput risk).
5. Complete i2b2 2014 validation and publish reproducible evaluation results.

## Documentation Pointers

- Architecture: `docs/ARCHITECTURE.md`
- Images + DICOM: `docs/IMAGE-DICOM.md`
- Benchmarks: `docs/BENCHMARKS.md`
