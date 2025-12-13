# Implementation Plan (Current)

This plan tracks remaining work after the Rust vision migration (OCR + face inference) and the trust bundle/DICOM hardening pass.

## Principles

- PHI sensitivity is non-negotiable: new accelerations must not reduce coverage.
- Measure first: migrate only hotspots found via profiling.
- Keep boundaries clean: TypeScript orchestrates; Rust owns CPU-heavy inner loops.

## Status (Shipped)

- Vision inference consolidated into Rust (`src/rust/src/vision/*`), avoiding JS-side ORT bindings.
- Trust bundle exporter writes ZIP `.red` and verifier supports ZIP bundles.
- DICOM anonymization re-encodes safely via `dcmjs`.
- Rust crypto helpers (SHA-256, HMAC-SHA256, Merkle root) used by trust bundles and DICOM hashing.
- Rust-native phonetic matcher available for OCR-tolerant name matching (`VulpesPhoneticMatcher`).

## Next Work (Priority Order)

1. **Streaming/text hotspot profiling**
   - Use `docs/internal/PROFILING.md`, `npm run test:bench`, and `node scripts/profile-filters.js`.
   - Add targeted CPU profiles for large notes and long streams.

2. **Rust text inner-loop accelerations (incremental)**
   - Migrate tight loops that dominate runtime (name detection/scanning, matching, normalization).
   - Keep a JS fallback path until proven equivalent.

3. **Packaging**
   - Make native artifacts reproducible across platforms (CI build matrix).
   - Keep ONNX Runtime ownership in a single place.
