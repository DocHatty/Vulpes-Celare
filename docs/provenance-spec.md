# Provenance Specification (Current Implementation)

This document describes what Vulpes Celare implements today for cryptographic provenance and audit exports.

## Goals

- prove the redacted output has not been modified since export
- provide an auditor-friendly package (`.red`) that can be verified offline
- avoid embedding original PHI in the provenance artifact

## Trust Bundle (`.red`)

The current provenance artifact is a **ZIP archive** with a `.red` extension. See `docs/TRUST-BUNDLE.md`.

Verification ensures:

- required files exist
- SHA-256 hashes match across `manifest.json`, `certificate.json`, and `redacted-document.txt`
- optional `merkle-proof.json` is internally consistent (Merkle root over file hashes)

## Non-Goals (Not Implemented)

These are intentionally not implemented in the current codebase:

- zero-knowledge proofs (zk-SNARKs)
- external timestamping authority integration (RFC 3161)
- blockchain anchoring
- HSM-backed signing and key management

Those items can be planned in `docs/ROADMAP.md`, but should not be assumed present.

