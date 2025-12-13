# Implementation Plan (Current)

This plan tracks remaining work after the Rust vision migration (OCR + face inference) and the trust bundle/DICOM hardening pass.

## Principles

- PHI sensitivity is non-negotiable: new accelerations must not reduce coverage.
- Measure first: migrate only hotspots found via profiling.
- Keep boundaries clean: TypeScript orchestrates; Rust owns CPU-heavy inner loops.

## Status (Shipped)

- Vision inference consolidated into Rust (`src/rust/src/vision/*`), avoiding JS-side ORT bindings.
- Guardrail: preflight check prevents reintroducing JS ONNX runtime bindings (`scripts/check-onnx-boundary.js`, runs in `npm test`).
- Trust bundle exporter writes ZIP `.red` and verifier supports ZIP bundles.
- DICOM anonymization re-encodes safely via `dcmjs`.
- Rust crypto helpers (SHA-256, HMAC-SHA256, Merkle root) used by trust bundles and DICOM hashing.
- Rust-native text accelerators (feature-flagged):
  - Phonetic matcher for OCR-tolerant name matching (`VulpesPhoneticMatcher`, `VULPES_ENABLE_PHONETIC=1`)
  - Tokenization with offsets for token windows (`tokenizeWithPositions`, `VULPES_TEXT_ACCEL=1`)
  - Span overlap pruning (`dropOverlappingSpans`, `VULPES_SPAN_ACCEL=1`)
  - NAME comma-pattern scanner (`VulpesNameScanner`, `VULPES_NAME_ACCEL=1`, `VULPES_SHADOW_RUST_NAME=1`)
  - NAME First Last scanner (opt-in promote path: `VULPES_NAME_ACCEL=2`, shadow: `VULPES_SHADOW_RUST_NAME_FULL=1`)
  - Post-filter false-positive pruning (`postfilterDecisions`, `VULPES_POSTFILTER_ACCEL=1`, `VULPES_SHADOW_POSTFILTER=1`)
  - Multi-identifier scan kernel (`scanAllIdentifiers`, `VULPES_SCAN_ACCEL=1`) used by regex-heavy identifier filters
  - Streaming buffer kernel (`VulpesStreamingKernel`, `VULPES_STREAM_KERNEL=1`)
  - Native packaging scaffolding (CI prebuild + `postinstall` download helper)

## Next Work (Priority Order)

1. **Streaming/text hotspot profiling**
   - Use `docs/internal/PROFILING.md`, `npm run test:bench`, and `node scripts/profile-filters.js`.
   - Add targeted CPU profiles for large notes and long streams.

2. **Rust text inner-loop accelerations (incremental, PHI-safe)**
   - Expand Rust name scanning beyond the comma-based family once shadow diffs are clean.
   - Port additional hot passes (span heuristics/postfilters) in batch to reduce JS overhead.
   - Keep a JS fallback path until proven equivalent.

3. **Streaming kernel**
   - Move repeated rescans toward a Rust incremental scanner (rolling window tokenization + matching) once hotspots are confirmed.

4. **Packaging**
   - Make native artifacts reproducible across platforms (CI build matrix).
   - Keep ONNX Runtime ownership in a single place.
   - CI workflow: `.github/workflows/native-prebuild.yml` builds Windows-first `vulpes-native-<platform>-<arch>.tar.gz` bundles for release assets.
   - Install helper: `scripts/install-native.js` (runs in `postinstall` for published packages).
