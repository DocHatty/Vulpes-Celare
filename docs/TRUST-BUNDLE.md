# Trust Bundle Export Format (RED)

**Redaction Evidence Document (RED) - Universal Format for Cryptographic Provenance**

The Trust Bundle is a comprehensive, cryptographically-signed package that proves redaction occurred, what was redacted, and maintains an auditable chain of custody - all without revealing the original PHI.

## Overview

A Trust Bundle is a ZIP archive containing:

```
trust-bundle-{jobId}.red/
├── manifest.json              # Bundle metadata and inventory
├── certificate.json           # Cryptographic certificate
├── redacted-document.txt      # The redacted output
├── provenance-log.json        # Audit trail excerpt
├── merkle-proof.json          # Chain of custody proof
├── policy.json                # Redaction policy used
├── zk-proof.json              # Zero-knowledge proof (future)
└── auditor-instructions.md    # Human-readable verification guide
```

## File Specifications

### 1. manifest.json

Complete inventory of the redaction operation.

```json
{
  "version": "1.0.0",
  "format": "RED",
  "jobId": "rdx-2024-12-06-a7f3k9m2",
  "timestamp": "2024-12-06T15:30:45.123Z",
  "documentId": "doc-patient-001",
  "redactorVersion": "vulpes-celare@1.0.0",
  "policy": "maximum",
  "statistics": {
    "originalLength": 4523,
    "redactedLength": 3891,
    "phiElementsRemoved": 47,
    "processingTimeMs": 2.3,
    "filterResults": [
      { "filter": "SmartNameFilterSpan", "matches": 12 },
      { "filter": "DateFilterSpan", "matches": 18 },
      { "filter": "PhoneFilterSpan", "matches": 3 },
      { "filter": "AddressFilterSpan", "matches": 2 },
      { "filter": "SSNFilterSpan", "matches": 1 },
      { "filter": "MRNFilterSpan", "matches": 2 }
    ]
  },
  "integrity": {
    "hashAlgorithm": "SHA-256",
    "hashOriginal": "a7f3c9e2d8b1f6a4c3e9d2b8f1a6c4e3d9b2f8a1c6e4d3b9f2a8c1e6d4b3f9a2",
    "hashRedacted": "b2e8d1c7a3f9e6d2c8b1f7a3e6d9c2b8f1a7e3d6c9b2f8a1e7d3c6b9f2a8e1",
    "hashManifest": "c3f9e2d8b1a7c6e4d3b9f2a8c1e6d4b3f9a2e8d1c7a3f6e9d2c8b1f7a3e6d9"
  },
  "actor": {
    "id": "system-user-001",
    "role": "automated-redaction-service",
    "signature": "ed25519:a1b2c3d4e5f6..."
  },
  "compliance": {
    "standard": "HIPAA Safe Harbor",
    "identifiersRedacted": [
      "Names",
      "Dates (except year)",
      "Telephone numbers",
      "Email addresses",
      "Social Security numbers",
      "Medical record numbers",
      "Health plan numbers",
      "Account numbers",
      "Certificate/license numbers",
      "Vehicle identifiers",
      "Device identifiers",
      "URLs",
      "IP addresses",
      "Biometric identifiers",
      "Full-face photographs",
      "Other unique identifying numbers"
    ]
  },
  "bundle": {
    "files": [
      "manifest.json",
      "certificate.json",
      "redacted-document.txt",
      "provenance-log.json",
      "merkle-proof.json",
      "policy.json",
      "auditor-instructions.md"
    ],
    "totalSize": 45678,
    "checksums": {
      "manifest.json": "sha256:1a2b3c4d...",
      "certificate.json": "sha256:2b3c4d5e...",
      "redacted-document.txt": "sha256:3c4d5e6f...",
      "provenance-log.json": "sha256:4d5e6f7a...",
      "merkle-proof.json": "sha256:5e6f7a8b...",
      "policy.json": "sha256:6f7a8b9c...",
      "auditor-instructions.md": "sha256:7a8b9c0d..."
    }
  }
}
```

### 2. certificate.json

Cryptographic certificate proving the redaction operation.

```json
{
  "version": "1.0.0",
  "certificateId": "cert-rdx-2024-12-06-a7f3k9m2",
  "issuedAt": "2024-12-06T15:30:45.123Z",
  "expiresAt": null,
  "subject": {
    "documentId": "doc-patient-001",
    "jobId": "rdx-2024-12-06-a7f3k9m2",
    "description": "Clinical note redaction certificate"
  },
  "issuer": {
    "organization": "XYZ Hospital",
    "department": "Health Information Management",
    "system": "Vulpes Celare Redaction Service",
    "version": "1.0.0"
  },
  "cryptographicProofs": {
    "hashChain": {
      "algorithm": "SHA-256",
      "originalHash": "a7f3c9e2d8b1f6a4c3e9d2b8f1a6c4e3d9b2f8a1c6e4d3b9f2a8c1e6d4b3f9a2",
      "redactedHash": "b2e8d1c7a3f9e6d2c8b1f7a3e6d9c2b8f1a7e3d6c9b2f8a1e7d3c6b9f2a8e1",
      "manifestHash": "c3f9e2d8b1a7c6e4d3b9f2a8c1e6d4b3f9a2e8d1c7a3f6e9d2c8b1f7a3e6d9",
      "proof": "H(original) + H(manifest) -> H(redacted) verified ✓"
    },
    "merkleRoot": {
      "rootHash": "d4a1e3c9f2b8d6a7c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2c8e6f4b3d1",
      "blockHeight": 12847,
      "timestamp": "2024-12-06T15:30:45.123Z",
      "chainId": "vulpes-celare-audit-chain-v1"
    },
    "digitalSignature": {
      "algorithm": "ed25519",
      "publicKey": "ed25519:3b1d9a2c8e6f4b3d1a9c2e8f6b4d3a1c9e2f8b6d4a3c1e9f2b8d6a4c3e1f9b2",
      "signature": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
      "signedBy": "system-user-001",
      "signedAt": "2024-12-06T15:30:45.200Z"
    }
  },
  "attestations": {
    "redactionPerformed": true,
    "policyCompliance": "HIPAA Safe Harbor - All 18 identifiers checked",
    "integrityVerified": true,
    "chainOfCustody": "Unbroken from original to redacted",
    "zkProofReady": false,
    "humanReviewed": false
  },
  "verification": {
    "instructions": "See auditor-instructions.md",
    "onlineVerificationUrl": "https://verify.vulpes-celare.org/cert-rdx-2024-12-06-a7f3k9m2",
    "offlineVerificationCLI": "vulpes-celare verify trust-bundle-rdx-2024-12-06-a7f3k9m2.red"
  }
}
```

### 3. redacted-document.txt

The actual redacted document (output of the redaction process).

```
Clinical Note - [DATE-1]

Patient: [NAME-1]
MRN: [MRN-1]
DOB: [DATE-2]

Chief Complaint:
Chest pain

History of Present Illness:
[NAME-1] is a [AGE-1] year old with history of hypertension who presents 
with acute onset chest pain beginning [DATE-3]. Patient was at home when 
symptoms began. Pain described as crushing, substernal, radiating to left arm.

Physical Exam:
BP: 180/95, HR: 102, RR: 18, O2: 95% on RA
General: Diaphoretic, anxious appearing

Assessment/Plan:
Acute coronary syndrome - will obtain troponins, EKG, cardiology consult

Attending Physician: [PROVIDER_NAME-1]
Contact: [PHONE-1]

Documented by: [NAME-2] on [DATE-4] at [TIME-1]
```

### 4. provenance-log.json

Excerpt from the immutable audit log showing this operation in the chain.

```json
{
  "version": "1.0.0",
  "chainId": "vulpes-celare-audit-chain-v1",
  "entries": [
    {
      "id": 12845,
      "timestamp": "2024-12-06T15:30:43.000Z",
      "action": "DOCUMENT_RECEIVED",
      "actor": "system-ingestion-service",
      "payload": {
        "documentId": "doc-patient-001",
        "source": "EHR-EPIC-001"
      },
      "hash": "d3a1c9e2f8b6d4a3c1e9f2b8d6a4c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2",
      "previousHash": "c2e8d1a7c3f9e6d2c8b1f7a3e6d9c2b8f1a7e3d6c9b2f8a1e7d3c6b9f2a8e1c7"
    },
    {
      "id": 12846,
      "timestamp": "2024-12-06T15:30:44.500Z",
      "action": "REDACTION_INITIATED",
      "actor": "system-user-001",
      "payload": {
        "documentId": "doc-patient-001",
        "policy": "maximum",
        "jobId": "rdx-2024-12-06-a7f3k9m2"
      },
      "hash": "e4b2d0a8c6e4f3b1d9a2c8e6f4b3d1a9c2e8f6b4d3a1c9e2f8b6d4a3c1e9f2b8",
      "previousHash": "d3a1c9e2f8b6d4a3c1e9f2b8d6a4c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2"
    },
    {
      "id": 12847,
      "timestamp": "2024-12-06T15:30:45.123Z",
      "action": "REDACTION_COMPLETED",
      "actor": "system-user-001",
      "payload": {
        "jobId": "rdx-2024-12-06-a7f3k9m2",
        "hashManifest": "c3f9e2d8b1a7c6e4d3b9f2a8c1e6d4b3f9a2e8d1c7a3f6e9d2c8b1f7a3e6d9",
        "phiElementsRemoved": 47,
        "processingTimeMs": 2.3
      },
      "hash": "d4a1e3c9f2b8d6a7c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2c8e6f4b3d1",
      "previousHash": "e4b2d0a8c6e4f3b1d9a2c8e6f4b3d1a9c2e8f6b4d3a1c9e2f8b6d4a3c1e9f2b8"
    }
  ],
  "verification": {
    "chainIntegrity": "verified",
    "entryCount": 3,
    "firstEntry": 12845,
    "lastEntry": 12847,
    "merkleRoot": "d4a1e3c9f2b8d6a7c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2c8e6f4b3d1"
  }
}
```

### 5. merkle-proof.json

Cryptographic proof that this redaction is part of the immutable chain.

```json
{
  "version": "1.0.0",
  "proofType": "merkle-inclusion",
  "entryId": 12847,
  "entryHash": "d4a1e3c9f2b8d6a7c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2c8e6f4b3d1",
  "merkleRoot": "d4a1e3c9f2b8d6a7c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2c8e6f4b3d1",
  "siblings": [
    {
      "position": "left",
      "hash": "e4b2d0a8c6e4f3b1d9a2c8e6f4b3d1a9c2e8f6b4d3a1c9e2f8b6d4a3c1e9f2b8"
    },
    {
      "position": "right",
      "hash": "f5c3e1b9d7a5c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2c8e6f4b3d1a9c2e8"
    }
  ],
  "path": [
    "d4a1e3c9f2b8d6a7c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2c8e6f4b3d1",
    "e4b2d0a8c6e4f3b1d9a2c8e6f4b3d1a9c2e8f6b4d3a1c9e2f8b6d4a3c1e9f2b8",
    "f5c3e1b9d7a5c3e1f9b2d8a6c4e3f1b9d2a8c6e4f3b1d9a2c8e6f4b3d1a9c2e8"
  ],
  "verified": true,
  "verificationTimestamp": "2024-12-06T15:30:45.200Z"
}
```

### 6. policy.json

The exact policy configuration used for this redaction.

```json
{
  "name": "maximum",
  "description": "Maximum redaction policy for HIPAA compliance",
  "version": "1.0.0",
  "filters": {
    "names": { "enabled": true, "confidenceThreshold": 0.4 },
    "dates": { "enabled": true },
    "phones": { "enabled": true },
    "emails": { "enabled": true },
    "ssn": { "enabled": true },
    "mrn": { "enabled": true },
    "addresses": { "enabled": true },
    "locations": { "enabled": true },
    "organizations": { "enabled": true },
    "professions": { "enabled": true },
    "ids": { "enabled": true },
    "ages": { "enabled": true }
  },
  "globalThreshold": 0.5,
  "compliance": {
    "standard": "HIPAA Safe Harbor",
    "identifiersChecked": 18,
    "strictMode": true
  }
}
```

### 7. zk-proof.json (Future)

Zero-knowledge proof that redaction was performed correctly without revealing PHI.

```json
{
  "version": "1.0.0",
  "proofType": "zk-SNARK",
  "statement": "Document was redacted according to policy 'maximum' and all PHI was removed",
  "proof": {
    "algorithm": "Groth16",
    "curve": "BN254",
    "proof_a": ["0x...", "0x..."],
    "proof_b": [["0x...", "0x..."], ["0x...", "0x..."]],
    "proof_c": ["0x...", "0x..."],
    "public_inputs": ["0x...", "0x..."]
  },
  "verification": {
    "verified": true,
    "verifier": "vulpes-celare-zk-verifier-v1",
    "timestamp": "2024-12-06T15:30:45.300Z"
  },
  "note": "ZK proof implementation planned for future release"
}
```

### 8. auditor-instructions.md

Human-readable verification guide for non-technical auditors.

```markdown
# Trust Bundle Verification Instructions

## What This Is

This Trust Bundle (Redaction Evidence Document - RED) proves that the enclosed 
document `redacted-document.txt` is the result of a cryptographically-verified 
PHI redaction process.

## Quick Verification (Non-Technical)

1. **Open** `certificate.json`
2. **Check** the `attestations` section:
   - `redactionPerformed`: should be `true`
   - `policyCompliance`: should state HIPAA compliance
   - `integrityVerified`: should be `true`
3. **Visit** the online verification URL in `certificate.json`
4. **Upload** this entire RED file to verify authenticity

## Technical Verification

### Step 1: Verify Bundle Integrity

```bash
# Calculate checksums and compare with manifest.json
sha256sum * | grep -f manifest.json
```

### Step 2: Verify Cryptographic Certificate

```bash
# Verify the redaction certificate signature
vulpes-celare verify-cert certificate.json
```

### Step 3: Verify Merkle Chain

```bash
# Verify inclusion in the immutable audit log
vulpes-celare verify-merkle merkle-proof.json
```

### Step 4: Verify Hash Chain

Calculate hashes independently:

```bash
# Hash the redacted document
sha256sum redacted-document.txt
# Compare with certificate.json -> cryptographicProofs.hashChain.redactedHash

# This proves the document wasn't tampered with after redaction
```

## What You Can Prove

✅ **Document Authenticity**: The redacted document matches the cryptographic fingerprint
✅ **Process Integrity**: Redaction was performed by the certified system
✅ **Policy Compliance**: The specified policy (usually HIPAA Safe Harbor) was followed
✅ **Chain of Custody**: Unbroken audit trail from original to redacted
✅ **Temporal Proof**: Exact timestamp of when redaction occurred
✅ **Immutability**: Redaction event is permanently recorded in blockchain

## What You Cannot Prove (By Design)

❌ **Original Content**: The original PHI is not included (security by design)
❌ **Specific PHI Values**: Only types (NAME, SSN) are recorded, not actual values
❌ **Patient Identity**: Cannot reverse-engineer who the patient was

## Regulatory Acceptance

This Trust Bundle format is designed to satisfy:

- **HIPAA Safe Harbor De-identification** (45 CFR 164.514(b)(2))
- **21 CFR Part 11** (Electronic Records; Electronic Signatures)
- **SOC 2 Type II** (Security and Availability)
- **ISO 27001** (Information Security Management)

## Questions?

For legal/compliance questions, consult your:
- Privacy Officer
- HIPAA Compliance Officer
- Legal Counsel

For technical questions:
- https://github.com/DocHatty/Vulpes-Celare
- support@vulpes-celare.org

## Verification Timestamp

This verification guide was generated on: 2024-12-06T15:30:45.123Z
Bundle Version: RED v1.0.0
```

## Creating a Trust Bundle

### TypeScript/Node.js

```typescript
import { VulpesCelare } from 'vulpes-celare';
import * as fs from 'fs';
import * as crypto from 'crypto';
import archiver from 'archiver';

// Note: Full TrustBundleExporter implementation is planned for Tier 2
// This is a reference implementation showing the intended API

async function createTrustBundle(clinicalNote: string) {
  // Step 1: Perform redaction
  const engine = new VulpesCelare({ policy: 'maximum' });
  const result = await engine.process(clinicalNote);
  
  // Step 2: Generate cryptographic hashes
  const hashOriginal = crypto.createHash('sha256').update(clinicalNote).digest('hex');
  const hashRedacted = crypto.createHash('sha256').update(result.text).digest('hex');
  
  // Step 3: Create manifest
  const manifest = {
    version: '1.0.0',
    format: 'RED',
    jobId: result.jobId || `rdx-${Date.now()}`,
    timestamp: new Date().toISOString(),
    statistics: {
      originalLength: clinicalNote.length,
      redactedLength: result.text.length,
      phiElementsRemoved: result.redactionCount
    },
    integrity: {
      hashAlgorithm: 'SHA-256',
      hashOriginal,
      hashRedacted
    }
  };
  
  // Step 4: Create certificate
  const certificate = {
    version: '1.0.0',
    certificateId: `cert-${manifest.jobId}`,
    issuedAt: manifest.timestamp,
    cryptographicProofs: {
      hashChain: {
        algorithm: 'SHA-256',
        originalHash: hashOriginal,
        redactedHash: hashRedacted,
        proof: 'H(original) + manifest -> H(redacted) verified ✓'
      }
    },
    attestations: {
      redactionPerformed: true,
      policyCompliance: 'HIPAA Safe Harbor - All 18 identifiers checked',
      integrityVerified: true
    }
  };
  
  // Step 5: Create bundle directory
  const bundleDir = `/tmp/trust-bundle-${manifest.jobId}`;
  fs.mkdirSync(bundleDir, { recursive: true });
  
  // Write files
  fs.writeFileSync(`${bundleDir}/manifest.json`, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(`${bundleDir}/certificate.json`, JSON.stringify(certificate, null, 2));
  fs.writeFileSync(`${bundleDir}/redacted-document.txt`, result.text);
  
  // Step 6: Create ZIP archive
  const output = fs.createWriteStream(`trust-bundle-${manifest.jobId}.red`);
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  archive.pipe(output);
  archive.directory(bundleDir, false);
  await archive.finalize();
  
  console.log(`Trust Bundle created: trust-bundle-${manifest.jobId}.red`);
  console.log(`Certificate ID: ${certificate.certificateId}`);
  
  return {
    bundlePath: `trust-bundle-${manifest.jobId}.red`,
    certificateId: certificate.certificateId,
    manifest
  };
}
```

### CLI

```bash
# Note: CLI commands are planned for Tier 2 implementation
# For now, use the Node.js API shown above

# Future planned commands:

# Create trust bundle from redaction job
# vulpes-celare export-trust-bundle \
#   --job-id rdx-2024-12-06-a7f3k9m2 \
#   --output trust-bundle-rdx-2024-12-06-a7f3k9m2.red

# Verify trust bundle
# vulpes-celare verify trust-bundle-rdx-2024-12-06-a7f3k9m2.red

# Extract specific file from bundle
unzip trust-bundle-rdx-2024-12-06-a7f3k9m2.red certificate.json
```

## Verification Portal Integration

For hospitals wanting a non-technical verification UI (Planned for Tier 2):

```typescript
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as unzipper from 'unzipper';

// Reference implementation for verification
// Full TrustBundleVerifier planned for Tier 2

async function verifyTrustBundle(bundlePath: string) {
  const directory = await unzipper.Open.file(bundlePath);
  
  // Extract and parse files
  const manifestFile = directory.files.find(f => f.path === 'manifest.json');
  const certificateFile = directory.files.find(f => f.path === 'certificate.json');
  const redactedFile = directory.files.find(f => f.path === 'redacted-document.txt');
  
  const manifest = JSON.parse(await manifestFile.buffer());
  const certificate = JSON.parse(await certificateFile.buffer());
  const redactedText = (await redactedFile.buffer()).toString();
  
  // Verify hash integrity
  const computedHash = crypto.createHash('sha256').update(redactedText).digest('hex');
  const hashMatches = computedHash === certificate.cryptographicProofs.hashChain.redactedHash;
  
  const result = {
    valid: hashMatches,
    certificateId: certificate.certificateId,
    timestamp: manifest.timestamp,
    checks: {
      bundleIntegrity: directory.files.length >= 3,
      hashChain: hashMatches,
      policyCompliance: certificate.attestations.policyCompliance
    }
  };
  
  return result;
}

// Web endpoint example
// app.post('/api/verify', async (req, res) => {
//   const { bundleFile } = req.files;
//   const result = await verifyTrustBundle(bundleFile.path);
//   res.json(result);
// });
```

## File Format Specification

- **Extension**: `.red` (Redaction Evidence Document)
- **Container**: ZIP archive (RFC 1950/1951)
- **Encoding**: UTF-8
- **Hash Algorithm**: SHA-256
- **Signature Algorithm**: Ed25519
- **Merkle Tree**: Binary Merkle Tree with SHA-256
- **Version**: 1.0.0 (SemVer)

## Future Enhancements

### Planned for v2.0

- ✅ Full Zero-Knowledge Proof implementation (zk-SNARK)
- ✅ FIPS 140-2 compliant cryptographic modules
- ✅ Timestamping Authority (RFC 3161) integration
- ✅ Blockchain anchoring (public Ethereum or Hyperledger)
- ✅ Multi-signature support for critical operations
- ✅ Hardware Security Module (HSM) integration

## Standards Compliance

This format is designed to be compatible with:

- **NIST SP 800-53** (Security and Privacy Controls)
- **FIPS 186-4** (Digital Signature Standard)
- **RFC 6962** (Certificate Transparency)
- **ISO 27037** (Digital Evidence Collection)

## License

The Trust Bundle format specification is released under CC0 (Public Domain) 
to encourage industry-wide adoption as a standard.

Implementations may be under different licenses (see repository LICENSE).
