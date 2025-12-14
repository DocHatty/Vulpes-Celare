# Vulpes Celare Documentation

**Complete documentation for production-ready HIPAA PHI redaction**

Vulpes Celare is a Rust-accelerated, open-source PHI redaction engine designed for clinical AI systems, research facilities, and healthcare infrastructure. This documentation provides comprehensive guidance for deployment, integration, and compliance.

## Quick Navigation

### 🚀 Getting Started
- **New users?** Start with the main [README](../README.md)
- **Integration?** Jump to [LLM Integration Examples](../examples/integrations/LLM-INTEGRATIONS.md)
- **Air-gapped?** See [Air-Gapped Deployment Guide](deployment/AIR-GAPPED-DEPLOYMENT.md)

### 📚 Core Documentation

## Index

### User Docs

| Document | Description | Status |
|----------|-------------|--------|
| `ARCHITECTURE.md` | System architecture, module boundaries, and Rust integration | ✅ Production |
| `IMAGE-DICOM.md` | Image redaction (faces + OCR) and DICOM anonymization | ✅ Production |
| `CLI.md` | CLI usage and configuration | ✅ Production |
| `HIPAA.md` | HIPAA Safe Harbor quick reference | ✅ Production |
| `TRUST-BUNDLE.md` | Trust Bundle (`.RED`) format and verification | ✅ Production |
| `provenance-spec.md` | Cryptographic provenance specification | ✅ Production |
| `BENCHMARKS.md` | Performance benchmarks and competitive analysis | 📊 Synthetic data |
| `ROADMAP.md` | Product roadmap and status | 📅 Updated 2025 |
| `RUST-NATIVE.md` | Rust accelerators reference (11+ production-ready modules) | ✅ Production |

### Compliance

| Document | Description | Audience |
|----------|-------------|----------|
| `compliance/HIPAA-COMPLIANCE.md` | Comprehensive HIPAA compliance mapping with code examples | Compliance officers, legal teams |

### Deployment

| Document | Description | Audience |
|----------|-------------|----------|
| `deployment/AIR-GAPPED-DEPLOYMENT.md` | Air-gapped deployment guide for secure environments | DevOps, security teams, trauma centers |

### Legal

| Document | Description | Audience |
|----------|-------------|----------|
| `legal/COMMERCIAL_LICENSE.md` | Commercial licensing information | Enterprise customers |

### Internal (Development)

| Document | Description | Audience |
|----------|-------------|----------|
| `internal/ASSESSMENT-SUMMARY.md` | System assessment summary | Core developers |
| `internal/PROFILING.md` | Profiling and benchmark workflow | Performance engineers |
| `internal/IMPLEMENTATION_PLAN.md` | Current implementation plan | Core developers |

## Configuration

**CLI Configuration**: The CLI stores configuration in `~/.vulpes/`:

```
~/.vulpes/
  config.json    # API keys, preferences, provider settings
  vulpes.db      # SQLite: sessions, audit logs, agent memory
```

**Security note**: This directory contains API keys and is excluded from git. Never commit credentials.

## Native Addon Support

**Platform Status**:
- ✅ **Windows x64**: Production-ready with prebuilt binaries
- 🔄 **macOS**: JS-only mode (source build available)
- 🔄 **Linux**: JS-only mode (source build available)

The Rust native addon provides 10-200x performance improvements but includes TypeScript fallbacks for all platforms. Set `VULPES_REQUIRE_NATIVE=1` to hard-fail on unsupported platforms instead of falling back.

## Performance

**Typical Performance** (Windows x64, Rust accelerators enabled):
- Clinical notes (500-2000 words): <10ms
- Streaming chunks: <5ms per chunk
- Image redaction: 100-500ms (depending on resolution and OCR complexity)
- DICOM anonymization: 50-200ms per file

**Scalability**:
- Parallel processing: up to 10,000+ documents/hour per core
- Streaming: Real-time processing at dictation speed
- Air-gapped: No network latency, all local processing
