# VULPES CELARE

![Vulpes Celare Logo](https://github.com/user-attachments/assets/ebc320d1-ff4d-4610-b0de-7aad2a1da5cb)

**Open-source HIPAA PHI redaction engine for clinical text, images, and DICOM. Rust-accelerated, fast, inspectable, air-gapped.**

[![Rust](https://img.shields.io/badge/Rust-Core%20Engine-000000?style=for-the-badge&logo=rust&logoColor=white)](src/rust/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-Source%20Available-4B32C3?style=for-the-badge)](LICENSE)
[![HIPAA](https://img.shields.io/badge/HIPAA-18%2F18-brightgreen?style=for-the-badge)](#features)

| Metric | Score | Notes |
|:------:|:-----:|:------|
| **Sensitivity** | **98%** | [Validation details](#validation) |
| **Specificity** | **95%** | Synthetic corpus |
| **Speed** | **2–3 ms** | Per document |
| **Coverage** | **18/18** | Full HIPAA Safe Harbor |

**Status:** Validated on synthetic data only. Production use requires i2b2 2014 validation and compliance review. See [Validation](#validation).

---

## Why Vulpes Celare?

- **Inspectable** - Fully open source, every decision traceable
- **Healthcare-native** - Built for US clinical formats
- **Fast** - 2–3 ms stateless processing, scales linearly
- **Air-gapped** - Zero external calls, keeps PHI inside your network

## How It Works

```mermaid
flowchart TB
    subgraph INPUT [" "]
        direction LR
        Access["Access Point<br/>Epic • PACS • Web"]
        Data["Clinical Data<br/>+ Question"]
    end

    Access --> Data

    subgraph CORE ["VULPES CELARE"]
        direction TB
        Redact["REDACT<br/>John Smith<br/>742 Evergreen Terrace<br/>eGFR 28, Cr 2.4 (was 1.8)<br/><br/>[NAME-1]<br/>[ADDRESS-1]<br/>eGFR 28, Cr 2.4 (was 1.8)"]
        Map["STORE MAP<br/>Kept locally"]
        Redact --> Map
    end

    Data -->|"Data"| Redact
    Data -->|"Question"| LLM

    subgraph EXT ["LLM"]
        LLM["Claude / GPT-5.1 / Gemini<br/>Only sees: [NAME-1], [ADDRESS-1]<br/>eGFR 28, Cr 2.4 (was 1.8)"]
    end

    Map -->|"Clean data"| LLM

    subgraph CORE2 ["VULPES CELARE"]
        direction TB
        Restore["RESTORE<br/>[NAME-1], [ADDRESS-1]<br/>has stage 4 CKD with rapid progression.<br/>Nephrology referral recommended.<br/><br/>John Smith, 742 Evergreen Terrace<br/>has stage 4 CKD with rapid progression.<br/>Nephrology referral recommended."]
        Audit["AUDIT LOG"]
        Restore --> Audit
    end

    LLM -->|"Response"| Restore

    Result["You see real names<br/>AI never knew them"]
    Audit --> Result

    style CORE fill:#ff6b35,stroke:#d63000,color:#fff
    style CORE2 fill:#ff6b35,stroke:#d63000,color:#fff
    style EXT fill:#e8e8e8,stroke:#999
    style Result fill:#c8e6c9,stroke:#2e7d32
```

PHI never crosses the network boundary. The LLM only sees tokenized placeholders. Your data stays local.

## Quick Start

```bash
npm install vulpes-celare
```

```typescript
import { VulpesCelare } from 'vulpes-celare';

// Text redaction
const safe = await VulpesCelare.redact(clinicalNote);

// Image redaction (faces + OCR text)
const result = await VulpesCelare.redactImage(imageBuffer);

// DICOM anonymization
import { anonymizeDicomBuffer } from 'vulpes-celare';
const clean = await anonymizeDicomBuffer(dicomData);
```

More:
- `examples/integrations/LLM-INTEGRATIONS.md`
- `examples/streaming/STREAMING-API.md`
- `docs/IMAGE-DICOM.md`

## Features

### HIPAA Safe Harbor: 18/18 Identifiers

| Category | Covered |
|----------|---------|
| **Identity** | Names, SSN, MRN, Health Plan IDs, License/DEA |
| **Contact** | Phone, Fax, Email, Address, ZIP |
| **Technical** | IP, URL, Device IDs, Vehicle IDs, Biometrics |
| **Visual** | Photos/Images (face detection + OCR) |
| **Temporal** | All date elements |

### Key Capabilities

- **Context-Aware** - Distinguishes "Dr. Wilson" (person) from "Wilson's disease" (condition)
- **OCR Resilient** - Catches PHI through scanner corruption (`0O`, `1l`)
- **Rust Native Core** - High‑performance OCR + face detection in Rust via NAPI
- **Image & DICOM** - Face detection, OCR text extraction, metadata anonymization
- **Streaming** - Real-time redaction for live dictation
- **Policy DSL** - Declarative policies without code changes
- **Cryptographic Audit** - Tamper-evident Merkle-linked proof of redaction

Deep dives:
- `docs/ARCHITECTURE.md`
- `examples/policy-dsl/POLICY-DSL.md`
- `docs/TRUST-BUNDLE.md`

## Native Rust Core

Vulpes Celare uses a Rust native addon (`src/rust/`) for compute‑heavy vision tasks:

- PaddleOCR ONNX inference (text detection + recognition)
- UltraFace ONNX inference (face detection)

The TypeScript/Node.js layer provides orchestration, policies, and CLI/API surfaces. Python bindings (when used) call into the same core logic.

### ONNX Runtime

Windows builds ship with a bundled ONNX Runtime CPU DLL (`native/onnxruntime.dll`) pinned to the version required by the Rust `ort` crate.

To override the runtime (e.g., use CUDA/DirectML builds), set one of these before importing `vulpes-celare`:

```bash
set VULPES_ORT_PATH=C:\path\to\onnxruntime.dll
# or
set ORT_DYLIB_PATH=C:\path\to\onnxruntime.dll
```

## Cryptographic Audit Trail

Every redaction can generate a tamper‑proof proof:

```typescript
const bundle = await TrustBundleExporter.generate(original, result.text, result);
await TrustBundleExporter.export(bundle, 'proof.red');
```

What it proves: what was redacted, when, which policy, document integrity (SHA‑256), chain of custody (Merkle log).

See:
- `docs/TRUST-BUNDLE.md`
- `verification-portal/README.md`

## CLI

```bash
npm run install-global

vulpes              # Interactive menu
vulpes chat         # LLM chat with auto-redaction
vulpes --help       # All options
```

CLI guide: `docs/CLI.md`

## Validation

| Aspect | Status |
|--------|--------|
| **Sensitivity** | 98% (synthetic corpus, 7k+ docs) |
| **i2b2 2014** | Pending data access |
| **Production** | Seeking pilot partners |

Honest position: Speed and features are verified. Accuracy claims need i2b2 validation.

Benchmarks: `docs/BENCHMARKS.md`  
Roadmap: `docs/ROADMAP.md`

## License

**AGPL-3.0 with Commercial Exception**

Free for: individuals, researchers, non-profits, companies <$1M/year, internal use.  
Commercial license required for: companies >$1M/year, managed services.

License details: `docs/legal/COMMERCIAL_LICENSE.md`

## Contributing

Validation contributions especially valued: i2b2 testing, pilot feedback, security audits.

Contributing guide: `.github/CONTRIBUTING.md`

---

Full docs: `docs/`  
Report issues: https://github.com/DocHatty/Vulpes-Celare/issues  
Discussions: https://github.com/DocHatty/Vulpes-Celare/discussions
