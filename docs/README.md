# Vulpes Celare Documentation

## Index

### User Docs

| Document | Description |
|----------|-------------|
| `ARCHITECTURE.md` | System architecture and module boundaries |
| `IMAGE-DICOM.md` | Image redaction (faces + OCR) and DICOM anonymization |
| `CLI.md` | CLI usage and configuration |
| `HIPAA.md` | HIPAA Safe Harbor quick reference |
| `TRUST-BUNDLE.md` | Trust Bundle (`.RED`) format and verification |
| `provenance-spec.md` | Cryptographic provenance specification |
| `BENCHMARKS.md` | Benchmarks and competitive analysis |
| `ROADMAP.md` | Product roadmap and status |

### Compliance

| Document | Description |
|----------|-------------|
| `compliance/HIPAA-COMPLIANCE.md` | Comprehensive HIPAA compliance mapping with code examples |

### Deployment

| Document | Description |
|----------|-------------|
| `deployment/AIR-GAPPED-DEPLOYMENT.md` | Air-gapped deployment guide for secure environments |

### Legal

| Document | Description |
|----------|-------------|
| `legal/COMMERCIAL_LICENSE.md` | Commercial licensing information |

### Internal (Development)

| Document | Description |
|----------|-------------|
| `internal/ASSESSMENT-SUMMARY.md` | Quick system assessment summary |
| `internal/PROFILING.md` | Profiling and benchmark workflow |
| `internal/IMPLEMENTATION_PLAN.md` | Current implementation plan (post-Rust vision) |

## Configuration

The CLI stores configuration in `~/.vulpes/`:

```
~/.vulpes/
  config.json    # API keys, preferences, provider settings
  vulpes.db      # SQLite: sessions, audit logs, agent memory
```

Security note: this directory contains API keys and is excluded from git. Never commit credentials.
