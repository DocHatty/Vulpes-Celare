# VULPES CELARE

![Vulpes Celare Logo](https://github.com/user-attachments/assets/ebc320d1-ff4d-4610-b0de-7aad2a1da5cb)

Open-source HIPAA PHI redaction engine for clinical text, images, and DICOM. Rust-accelerated, fast, inspectable, air-gapped.

| Metric | Score | Notes |
|:------:|:-----:|:------|
| Sensitivity | 99%+ | Synthetic corpus, see `docs/BENCHMARKS.md` |
| Specificity | 96%+ | Synthetic corpus, see `docs/BENCHMARKS.md` |
| Speed | varies | Depends on enabled filters and input size; see `docs/BENCHMARKS.md` |
| Coverage | 18/18 | HIPAA Safe Harbor identifiers |

Status: validated on synthetic data only. Production use requires i2b2 2014 validation and compliance review.

## Quick Start

```bash
npm install vulpes-celare
```

```ts
import { VulpesCelare, anonymizeDicomBuffer } from "vulpes-celare";

// Text redaction
const safeText = await VulpesCelare.redact(clinicalNote);

// Image redaction (faces + OCR text)
const redactedImage = await VulpesCelare.redactImage(imageBuffer);

// DICOM anonymization
const cleanDicom = await anonymizeDicomBuffer(dicomData);
```

## Documentation

- Start here: `docs/README.md`
- Architecture: `docs/ARCHITECTURE.md`
- Images + DICOM: `docs/IMAGE-DICOM.md`
- CLI: `docs/CLI.md`
- Trust bundles: `docs/TRUST-BUNDLE.md` and `verification-portal/README.md`
- Streaming: `examples/streaming/STREAMING-API.md`
- Policy DSL: `examples/policy-dsl/POLICY-DSL.md`
- LLM integrations: `examples/integrations/LLM-INTEGRATIONS.md`

## Native Rust Core (Vision)

Vulpes Celare ships a Rust native addon (`src/rust/`) for compute-heavy vision tasks:

- PaddleOCR ONNX inference (text detection + recognition)
- UltraFace ONNX inference (face detection)

TypeScript orchestrates policies and workflows; Rust owns ONNX inference and vision post-processing.

The same native addon also provides **crypto/provenance helpers** (SHA-256, HMAC-SHA256, Merkle root) used by trust bundles and DICOM hashing.

### Optional Rust Text Accelerators

Additional Rust accelerators exist for text hotspots (tokenization, span overlap + span application, name scanning, post-filter pruning, and a multi-identifier scan kernel for regex-heavy filters). They are feature-flagged until fully validated; see `docs/internal/PROFILING.md`.

### ONNX Runtime (Windows)

Windows builds ship with a bundled ONNX Runtime CPU DLL at `native/onnxruntime.dll` pinned to the version required by the Rust `ort` crate (1.22.x).

To override the runtime (e.g., CUDA/DirectML), set one of these before importing `vulpes-celare`:

```bat
set VULPES_ORT_PATH=C:\path\to\onnxruntime.dll
REM or
set ORT_DYLIB_PATH=C:\path\to\onnxruntime.dll
```

### ONNX Runtime (macOS/Linux)

macOS/Linux native packaging is currently Windows-first. The engine still runs in JS-only mode on other platforms, but the native addon + pinned ORT bundle may require a source build until prebuilds are published.

If you build the native core on macOS/Linux, it expects a pinned ORT shared library at:

- macOS: `native/libonnxruntime.dylib`
- Linux: `native/libonnxruntime.so`

If it’s missing, you can fetch the pinned CPU build with `npm run native:ort:download`, or override with `VULPES_ORT_PATH`/`ORT_DYLIB_PATH`.

## CLI

```bash
npm run install-global

vulpes              # Interactive menu
vulpes chat         # LLM chat with auto-redaction
vulpes --help       # All options
```

## Build & Test (Repo)

```bash
npm run native:install
npm run native:build
npm run build
npm test
```

Strict gating (exits non-zero if thresholds/misses fail):

```bash
npm run test:strict
```

Native sanity check (loads the `.node` addon): `node scripts/test_simple.js`

## License

AGPL-3.0-only with a commercial license option. See `docs/legal/COMMERCIAL_LICENSE.md`.

## Contributing

Validation contributions are especially valuable: i2b2 testing, pilot feedback, and security audits.
