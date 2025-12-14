# Roadmap

This roadmap is a living document. It's intentionally organized around risk reduction (HIPAA safety, stability) and ROI (latency, throughput).

# Roadmap

This roadmap is a living document organized around **risk reduction** (HIPAA safety, stability) and **ROI** (latency, throughput, ease of deployment).

## Current State (Production-Ready)

✅ **Core Engine** (v1.0+)
- Text redaction engine with 28+ specialized filters (`src/filters/`)
- Streaming redaction API with incremental processing (`src/StreamingRedactor.ts`)
- Policy DSL for declarative redaction rules (`src/PolicyDSL.ts`, `examples/policy-dsl/`)
- Trust bundles and verification portal (`docs/TRUST-BUNDLE.md`, `verification-portal/`)

✅ **Vision Processing** (Production)
- Image redaction orchestrator (`src/core/images/ImageRedactor.ts`)
- Rust native vision core (NAPI):
  - OCR inference (PaddleOCR) in Rust (`src/rust/src/vision/ocr.rs`)
  - Face detection inference (UltraFace) in Rust (`src/rust/src/vision/face.rs`)
- DICOM anonymization with safe re-encoding (`docs/IMAGE-DICOM.md`)

✅ **Provenance & Security** (Production)
- Hardened trust bundles: ZIP format (`.red`) with offline verification and Merkle proof (`docs/provenance-spec.md`)
- Rust crypto helpers: SHA-256, HMAC-SHA256, Merkle root (used by trust bundles + DICOM hashing)

✅ **Rust Accelerators** (Production-Ready, Enabled by Default)
- **Text Processing**: Tokenization, span operations, text normalization (10-50x faster)
- **Name Detection**: Phonetic matching, fuzzy matching, pattern scanning (50-200x faster)
- **Identifier Scanning**: Multi-identifier scan kernel (50-100x faster)
- **Streaming**: Buffer management, incremental detection (10-50x faster)
- **Data Structures**: Interval tree, span overlap detection (10-20x faster)
- **OCR Quality**: Chaos detection for confidence scoring (5-15x faster)

✅ **Infrastructure** (Production)
- Guardrail: preflight check prevents JS ONNX runtime conflicts (`scripts/check-onnx-boundary.js`)
- Native packaging: prebuild workflow for Windows (`.github/workflows/native-prebuild.yml`)
- Install helper: `scripts/install-native.js` (downloads release bundles for published packages)
- Profiling harness: vitest benches + filter timing (`docs/internal/PROFILING.md`, `scripts/profile-filters.js`)

