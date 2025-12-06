# Redaction Provenance Layer (RPL) Specification

## 1. Executive Summary

The Redaction Provenance Layer (RPL) is a cryptographic audit spine designed to provide comprehensive, immutable proof of PHI redaction without ever exposing the original PHI. It serves as the compliance backbone for Vulpes-Celare, ensuring that every exported document has a verifiable chain of custody and proof of correct redaction.

## 2. Core Principles

1. **Zero PHI on Chain**: The blockchain/audit log never sees original text or redacted segments. It only stores cryptographic hashes and proofs.
2. **Immutable History**: Every redaction event is cryptographically linked to the previous one (Merkle Chain).
3. **Verifiable Correctness**: Validators can mathematically prove that `Hash(Original) + Manifest == Hash(Redacted)` without seeing the content (via ZK Proofs or authorized audit of hashes).

## 3. Data Architecture

### 3.1. Off-Chain (Secure Environment)

The following data remains strictly within the secure HIPAA boundary:

- **Original Document ($D_{orig}$)**: The raw input with PHI.
- **Redacted Document ($D_{red}$)**: The secure output.
- **Redaction Manifest ($M$)**: A JSON object describing exactly *what* was removed (types and positions), but not *the content* itself.

    ```json
    {
      "job_id": "RDX-2025-12-06-001",
      "timestamp": "2025-12-06T16:30:00Z",
      "redactor_version": "v1.2.0",
      "fields_removed": [
        { "type": "NAME", "start": 0, "end": 10, "method": "NER" },
        { "type": "SSN", "start": 45, "end": 56, "method": "PATTERN" }
      ]
    }
    ```

### 3.2. On-Chain (Blockchain / Merkle Log)

The `audit_log` or `provenance_contract` stores only:

- **$H_{orig}$**: SHA-256 hash of the original document.
- **$H_{red}$**: SHA-256 hash of the redacted document.
- **$H_{man}$**: SHA-256 hash of the redaction manifest.
- **$\pi$ (ZK Proof)**: (Optional/Future) A zero-knowledge proof attesting that $D_{red}$ assumes $D_{orig}$ is valid and $M$ was applied correctly.
- **Metadata**: Timestamp, Actor ID, Job ID.

## 4. Implementation Design

### 4.1. Database Schema

We will enhance the existing `audit_log` (or create a specialized `redaction_jobs` table linked to it) to support this schema.

```sql
CREATE TABLE redaction_jobs (
    job_id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Cryptographic Fingerprints
    hash_original TEXT NOT NULL,  -- H(D_orig)
    hash_redacted TEXT NOT NULL,  -- H(D_red)
    hash_manifest TEXT NOT NULL,  -- H(M)
    
    -- Proofs
    zk_proof TEXT,                -- Serialized ZK Proof (future)
    signature TEXT,               -- Actor's signature
    
    -- Linkage
    audit_log_id INTEGER,         -- Link to main linear chain
    FOREIGN KEY(audit_log_id) REFERENCES audit_log(id)
);
```

### 4.2. `ProvenanceEngine` Module

A new core module `cortex/core/provenance-engine.js` will handle the hashing logic.

**API:**

- `createJob(originalContent, redactedContent, metadata)`
  - Generates Manifest $M$.
  - Calculates $H_{orig}, H_{red}, H_{man}$.
  - (Stub) Generates ZK Proof $\pi$.
  - Commits to `MerkleLog` (The Blockchain).
  - Returns `Receipt` { job_id, hashes... }.

### 4.3. API Endpoints

New endpoints in `server.js` to facilitate "proof of redaction" checks:

- `POST /provenance/record`: Internal endpoint to register a job.
- `GET /provenance/verify/:jobId`: Public endpoint to get the hashes and proof for a job. Output suitable for a "Certificate of Redaction".

## 5. Verification Flow

1. **Auditor** receives a Redacted Document and a "Certificate of Redaction" (containing $JobId, H_{orig}, H_{red}, H_{man}$).
2. Auditor calculates Hash of the file they have. Matches it to $H_{red}$ in the Certificate.
3. Auditor queries the Blockchain (API `/provenance/verify/:jobId`) to ensure $H_{red}$ is authentically recorded.
4. Auditor sees that $H_{red}$ is derived from $H_{orig}$ via $M$.
5. **Result**: Mathematical certainty that the document is the result of a specific logged process, without needing the Original Document.
