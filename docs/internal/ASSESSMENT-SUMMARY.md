# Vulpes Celare - Internal Assessment Summary

**Last Updated:** 2025-12-13  
**Scope:** documentation and feature status alignment

## Snapshot

- Text redaction engine: 28 filters (`src/filters/`)
- Streaming redaction: implemented (`src/StreamingRedactor.ts`)
- Policy DSL: implemented (`src/PolicyDSL.ts`)
- Trust bundles + verification portal: implemented (`docs/TRUST-BUNDLE.md`, `verification-portal/`)
- Provenance crypto: SHA-256, HMAC-SHA256, Merkle root (native Rust helpers used where available)
- Image redaction orchestrator: implemented (`src/core/images/ImageRedactor.ts`)
- Rust native vision core: implemented (`src/rust/`)
  - OCR inference (PaddleOCR ONNX)
  - Face detection inference (UltraFace ONNX)
- Rust text accelerators: implemented and feature-flagged (tokenization, span overlap, name scanning, post-filter pruning)
- Guardrail: JS-side ONNX bindings are blocked in `npm test` (`scripts/check-onnx-boundary.js`)

## Documentation Index

Primary entrypoint: `docs/README.md`

Key pages:

- `docs/ARCHITECTURE.md`
- `docs/IMAGE-DICOM.md`
- `docs/CLI.md`
- `docs/BENCHMARKS.md`
- `docs/ROADMAP.md`

## Notes

- Public accuracy claims should stay scoped to synthetic validation until i2b2 2014 evaluation is completed.
- Avoid reintroducing JS-side ONNX inference bindings inside the Node process; Rust should remain the single owner of ONNX Runtime.
