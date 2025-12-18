# Images & DICOM

This page covers Vulpes Celare's **image redaction** (faces + OCR text) and **DICOM anonymization** features.

## Image Redaction (Faces + OCR)

Image redaction is orchestrated in TypeScript and runs vision inference in the Rust native core:

- Orchestrator: `src/core/images/ImageRedactor.ts`
- OCR wrapper: `src/core/images/OCRService.ts` (Rust OCR engine)
- Face detection: `src/VulpesNative.ts` (`detectFaces`) (Rust UltraFace inference)

### Quick Example

```ts
import { VulpesCelare } from "vulpes-celare";
import fs from "fs";

const imageBuffer = fs.readFileSync("scan.png");

const result = await VulpesCelare.redactImage(imageBuffer, {
  policy: {
    redactFaces: true,
    faceConfidenceThreshold: 0.7,
    redactTextPHI: true,
    textConfidenceThreshold: 0.5,
    redactionStyle: "BLACK_BOX",
    redactionPadding: 5,
  },
  knownIdentifiers: ["John Smith", "MRN-12345"],
});

fs.writeFileSync("scan.redacted.png", result.buffer);
```

### Native ONNX Runtime (Windows)

The Rust vision core uses the `ort` crate and requires ONNX Runtime **1.22.x**. On Windows, a compatible CPU runtime is bundled at `native/onnxruntime.dll`.

To override the runtime (e.g., CUDA/DirectML), set one of these **before importing** `vulpes-celare`:

```bat
set VULPES_ORT_PATH=C:\path\to\onnxruntime.dll
REM or
set ORT_DYLIB_PATH=C:\path\to\onnxruntime.dll
```

## DICOM Anonymization

DICOM processing lives under `src/core/dicom/` and provides a convenience helper. Metadata anonymization is implemented by parsing and re-encoding the dataset (avoids unsafe in-place byte patching and supports valid UID remapping).

```ts
import { anonymizeDicomBuffer } from "vulpes-celare";
import fs from "fs";

const dicomData = fs.readFileSync("study.dcm");
const clean = await anonymizeDicomBuffer(dicomData);
fs.writeFileSync("study.anonymized.dcm", clean);
```

Exports:

- `anonymizeDicomBuffer` (convenience function)
- `DicomStreamTransformer` (stream/batch workflows)
- `HIPAA_DICOM_TAGS` (tag list used for Safe Harbor-style anonymization)

### Notes on UID and Hashing

- UID fields are deterministically remapped to `2.25.<decimal>` (valid UID form).
- String fields are replaced with deterministic pseudonyms derived from an HMAC-SHA256 salt (configurable via `hashSalt`); hashing prefers the Rust native crypto helper when available.

## Safety Notes

- Treat any image/DICOM as PHI-bearing until proven otherwise.
- Avoid logging raw OCR output or extracted tags in production.
