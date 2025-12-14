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
- Rust-native text accelerators (enabled by default when native addon is available):
  - Phonetic matcher for OCR-tolerant name matching (`VulpesPhoneticMatcher`)
  - Tokenization with offsets for token windows (`tokenizeWithPositions`)
  - Span overlap pruning (`dropOverlappingSpans`)
  - NAME pattern scanners (`VulpesNameScanner`)
  - Post-filter false-positive pruning (`postfilterDecisions`)
  - Multi-identifier scan kernel (`scanAllIdentifiers`) used by regex-heavy identifier filters
  - Fuzzy name matching (`VulpesFuzzyMatcher`)
  - OCR chaos detection (`analyzeChaos`)
  - Interval tree operations (`VulpesIntervalTree`)
  - Streaming buffer kernel (`VulpesStreamingKernel`)
  - Streaming name and identifier scanners
  - Native packaging scaffolding (CI prebuild + `postinstall` download helper)

## Next Work (Priority Order)

1. **Streaming/text hotspot profiling**
   - Use `docs/internal/PROFILING.md`, `npm run test:bench`, and `node scripts/profile-filters.js`.
   - Add targeted CPU profiles for large notes and long streams.

2. **Rust text inner-loop accelerations (available and tested)**
   - All major accelerators are implemented and active when native addon is available
   - Continue monitoring performance and accuracy metrics in production deployments
   - Consider additional optimizations based on profiling results

3. **Streaming kernel**
   - Move repeated rescans toward a Rust incremental scanner (rolling window tokenization + matching) once hotspots are confirmed.

4. **Packaging**
   - Make native artifacts reproducible across platforms (CI build matrix).
   - Keep ONNX Runtime ownership in a single place.
   - CI workflow: `.github/workflows/native-prebuild.yml` builds Windows-first `vulpes-native-<platform>-<arch>.tar.gz` bundles for release assets.
   - Install helper: `scripts/install-native.js` (runs in `postinstall` for published packages).
