# Vulpes Celare Documentation

## User Documentation

| Document | Description |
|----------|-------------|
| [HIPAA.md](HIPAA.md) | Quick reference guide for HIPAA Safe Harbor requirements |
| [TRUST-BUNDLE.md](TRUST-BUNDLE.md) | Trust Bundle (.RED) specification for compliance verification |
| [ROADMAP.md](ROADMAP.md) | Implementation roadmap and feature status |
| [provenance-spec.md](provenance-spec.md) | Cryptographic provenance layer specification |

For the Rust Ferrari Core (OCR + face detection) and ONNX Runtime configuration, see the main `README.md` Native Rust Core section.

## Compliance

| Document | Description |
|----------|-------------|
| [compliance/HIPAA-COMPLIANCE.md](compliance/HIPAA-COMPLIANCE.md) | Comprehensive HIPAA compliance mapping with code examples |

## Deployment

| Document | Description |
|----------|-------------|
| [deployment/AIR-GAPPED-DEPLOYMENT.md](deployment/AIR-GAPPED-DEPLOYMENT.md) | Air-gapped deployment guide for secure environments |

## Legal

| Document | Description |
|----------|-------------|
| [legal/COMMERCIAL_LICENSE.md](legal/COMMERCIAL_LICENSE.md) | Commercial licensing information |

## Internal (Development)

| Document | Description |
|----------|-------------|
| [internal/ASSESSMENT-SUMMARY.md](internal/ASSESSMENT-SUMMARY.md) | Quick system assessment summary |
| [internal/COMPREHENSIVE-ASSESSMENT.md](internal/COMPREHENSIVE-ASSESSMENT.md) | Full implementation assessment |
| [internal/IMPLEMENTATION_PLAN.md](internal/IMPLEMENTATION_PLAN.md) | Performance overhaul implementation plan |

---

## CLI System

Most interactions with Vulpes Celare happen through the CLI. See the main [README](../README.md#-vulpes-cortex--cli-system) for:

- CLI architecture and configuration (`~/.vulpes/`)
- Native chat features and commands
- Subagent orchestration
- Custom Claude agents

## Configuration

The CLI stores configuration in `~/.vulpes/`:

```
~/.vulpes/
├── config.json    # API keys, preferences, provider settings
└── vulpes.db      # SQLite: sessions, audit logs, agent memory
```

**Security**: This directory contains API keys and is excluded from git. Never commit credentials.
