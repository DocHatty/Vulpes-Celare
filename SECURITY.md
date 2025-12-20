# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously, especially given that Vulpes Celare handles Protected Health Information (PHI).

### How to Report

**Primary Channel:** Email [security@vulpescelare.com](mailto:security@vulpescelare.com)

**Alternative:** [GitHub Security Advisories](https://github.com/DocHatty/Vulpes-Celare/security/advisories/new) (private reporting)

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any proof-of-concept code (if applicable)
- Your contact information for follow-up

### What NOT to Do

- **Do not** disclose the vulnerability publicly before we've had a chance to address it
- **Do not** access or modify data belonging to others while researching
- **Do not** perform testing that could degrade service for other users

## Response Timeline

| Stage | Timeline |
|:--|:--|
| Acknowledgment | 48-72 hours |
| Initial triage | 7 days |
| Critical vulnerabilities | 30-day fix target |
| High severity | 60-day fix target |
| Medium/Low severity | 90-day fix target |

We will keep you informed of our progress throughout the process.

## Disclosure Policy

We follow a **coordinated 90-day disclosure** policy:

1. You report the vulnerability privately
2. We acknowledge and begin investigation
3. We develop and test a fix
4. We release the fix and publish a security advisory
5. After 90 days (or upon fix release, whichever is first), public disclosure is appropriate

### Credit

We believe in recognizing security researchers. With your permission, we will credit you in:
- The security advisory
- The CHANGELOG
- A dedicated acknowledgments section (if desired)

## Security Measures Already Implemented

Vulpes Celare incorporates defense-in-depth measures for PHI protection:

| Feature | Implementation | Purpose |
|:--|:--|:--|
| **Constant-Time Crypto** | `sha2` crate | Prevents timing side-channel attacks on HMAC operations |
| **Memory Zeroization** | `zeroize` crate | Securely overwrites PHI in memory after processing |
| **No PHI in Logs** | Redacted before logging | Prevents accidental PHI exposure in error logs |
| **Air-Gapped Support** | Zero cloud dependencies | All processing runs locally with no external calls |
| **Cryptographic Auditability** | SHA-256 trust bundles | Tamper-evident proof of redaction operations |

See [docs/deployment/AIR-GAPPED-DEPLOYMENT.md](docs/deployment/AIR-GAPPED-DEPLOYMENT.md) for secure deployment guidance.

## Scope

### In Scope

- Core redaction engine (`src/`)
- Native Rust addon (`src/rust/`)
- Trust bundle generation and verification
- ONNX model inference pipeline
- CLI and MCP server
- Configuration and policy DSL

### Out of Scope

- Third-party dependencies (please report to upstream maintainers)
- Intentional misuse or social engineering
- Physical security of deployment environments
- Issues in example code or documentation

## Security Considerations for Users

### Environment Variables

Sensitive configuration should use environment variables rather than config files:

```bash
# API keys for LLM integration (if used)
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# DICOM hashing key for consistent UID anonymization
DICOM_HASH_KEY=...
```

### Trust Bundle Verification

Always verify trust bundles before relying on their attestations:

```typescript
import { TrustBundleExporter } from "vulpes-celare";

const verification = await TrustBundleExporter.verify("redaction.red");
if (!verification.valid) {
  throw new Error("Trust bundle verification failed");
}
```

### Production Hardening

For production deployments, especially in clinical environments:

1. Run with minimal privileges
2. Enable audit logging
3. Use the supervision system (`VULPES_SUPERVISION=1`)
4. Review [docs/compliance/HIPAA-COMPLIANCE.md](docs/compliance/HIPAA-COMPLIANCE.md)

---

*This security policy follows the [Google OSS Vulnerability Guide](https://github.com/google/oss-vulnerability-guide) recommendations.*
