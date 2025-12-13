# Benchmarks & Competitive Analysis

## Scope

This document compares Vulpes Celare to other PHI redaction tools. Any published scores below are:

- **synthetic** for Vulpes (until i2b2 2014 validation is completed)
- **vendor/paper-reported** for other tools (see their sources)

## Quick Comparison (High Level)

| Tool | Typical Approach | Validation | Air-Gapped | Streaming |
|------|------------------|------------|------------|-----------|
| Vulpes Celare | Rules + dictionaries + context scoring | Synthetic corpus (current) | Yes | Yes |
| Presidio | NER (Python) + pattern rules | Multiple (varies) | Yes | No |
| Philter | Hybrid rules/ML (Python) | i2b2 + production reports | Yes | No |
| CliniDeID | ML + rules (Python) | i2b2 | Yes | No |
| NLM Scrubber | Rules (Java) | i2b2-era studies | Yes | No |
| AWS Comprehend Medical | Cloud service | Proprietary | No | N/A |

## Vulpes Celare (Current)

Claims that are validated today:

- 18/18 HIPAA Safe Harbor identifier coverage (engine + documentation mapping)
- Streaming API for real-time redaction
- Trust bundles for tamper-evident provenance
- Offline / air-gapped operation by default

Vision acceleration:

- OCR and face detection run in Rust via NAPI (`src/rust/`) using ONNX Runtime through the `ort` crate.

## i2b2 2014 Status

The i2b2 2014 De-identification Challenge dataset is the most-cited benchmark for clinical de-identification.

Current status:

- Vulpes Celare is validated on synthetic data only.
- i2b2 2014 evaluation is pending data access and compliance review.

## Performance Notes

Text redaction is designed to be low-latency and streaming-friendly. Typical throughput depends heavily on:

- enabled filters and policy settings
- dictionary sizes and caching
- input length and formatting

For local benchmarking harnesses, see:

- `tests/performance-benchmark.js`
- `tests/benchmarks/performance.bench.ts`

