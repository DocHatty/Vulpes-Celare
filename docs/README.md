# Vulpes Celare Documentation

Complete documentation for the Vulpes Celare PHI redaction engine.

## Quick Navigation

| If you want to... | See... |
|-------------------|--------|
| Understand how validation works | [VALIDATION-METHODOLOGY.md](VALIDATION-METHODOLOGY.md) |
| See benchmark results | [BENCHMARKS.md](BENCHMARKS.md) |
| Check HIPAA identifier coverage | [compliance/HIPAA-SAFE-HARBOR-COVERAGE.md](compliance/HIPAA-SAFE-HARBOR-COVERAGE.md) |
| Deploy in air-gapped environment | [deployment/AIR-GAPPED-DEPLOYMENT.md](deployment/AIR-GAPPED-DEPLOYMENT.md) |
| Integrate with LLMs | [examples/integrations/LLM-INTEGRATIONS.md](../examples/integrations/LLM-INTEGRATIONS.md) |

## Document Index

### Validation & Benchmarks

| Document | Description |
|----------|-------------|
| [VALIDATION-METHODOLOGY.md](VALIDATION-METHODOLOGY.md) | How accuracy metrics are generated, corpus construction, reproducibility |
| [BENCHMARKS.md](BENCHMARKS.md) | Performance data, Presidio comparison, clinical utility metrics |

### Compliance

| Document | Description |
|----------|-------------|
| [compliance/HIPAA-SAFE-HARBOR-COVERAGE.md](compliance/HIPAA-SAFE-HARBOR-COVERAGE.md) | Explicit mapping: HIPAA identifiers → Vulpes filters → test coverage |
| [compliance/HIPAA-COMPLIANCE.md](compliance/HIPAA-COMPLIANCE.md) | Comprehensive HIPAA compliance mapping with code examples |
| [HIPAA.md](HIPAA.md) | HIPAA Safe Harbor quick reference |

### Architecture & Implementation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, module boundaries, Rust integration |
| [RUST-NATIVE.md](RUST-NATIVE.md) | Rust accelerators reference (11+ modules) |
| [provenance-spec.md](provenance-spec.md) | Cryptographic provenance specification |
| [TRUST-BUNDLE.md](TRUST-BUNDLE.md) | Trust Bundle (`.RED`) format and verification |

### Features

| Document | Description |
|----------|-------------|
| [IMAGE-DICOM.md](IMAGE-DICOM.md) | Image redaction (faces + OCR) and DICOM anonymization |
| [CLI.md](CLI.md) | Command-line interface usage |
| MCP Server | Model Context Protocol server (`npx vulpes-mcp`) for AI agent integration |

### Deployment

| Document | Description |
|----------|-------------|
| [deployment/AIR-GAPPED-DEPLOYMENT.md](deployment/AIR-GAPPED-DEPLOYMENT.md) | Air-gapped deployment for secure environments |

### Planning

| Document | Description |
|----------|-------------|
| [ROADMAP.md](ROADMAP.md) | Development roadmap |

### Internal (Development)

| Document | Description |
|----------|-------------|
| [internal/ASSESSMENT-SUMMARY.md](internal/ASSESSMENT-SUMMARY.md) | System assessment summary |
| [internal/PROFILING.md](internal/PROFILING.md) | Profiling and benchmark workflow |
| [internal/IMPLEMENTATION_PLAN.md](internal/IMPLEMENTATION_PLAN.md) | Implementation plan |

## Configuration

CLI configuration stored in `~/.vulpes/`:

```
~/.vulpes/
  config.json    # API keys, preferences, provider settings
  vulpes.db      # SQLite: sessions, audit logs
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Windows x64 | Production | Prebuilt binaries, full Rust acceleration |
| macOS | JS-only | Source build available for native |
| Linux | JS-only | Source build available for native |

All platforms have TypeScript fallbacks. Set `VULPES_REQUIRE_NATIVE=1` to require native bindings.

## Advanced Capabilities

| Capability | Description |
|------------|-------------|
| Auto-Calibration | Automatic confidence threshold tuning from test data |
| Clinical Context Detection | Context-aware processing for medical documentation |
| DFA Multi-Pattern Scanning | O(n) single-pass detection of 50+ identifier patterns |
| WebGPU Batch Processing | GPU-accelerated batch redaction with CPU fallback |
| Supervision & Circuit Breakers | Erlang-style fault tolerance for production |
| Datalog Reasoning | Declarative constraint solving for span disambiguation |

## Performance

Typical performance (Windows x64, Rust accelerators enabled):

| Operation | Time |
|-----------|------|
| Clinical note (500-2000 words) | <10ms |
| Streaming chunk | <5ms |
| Image redaction | 100-500ms |
| DICOM anonymization | 50-200ms |
| Batch processing (WebGPU) | ~1000+ docs/sec |
