const crypto = require("crypto");

/**
 * REDACTION PROVENANCE ENGINE
 * Handles the cryptographic heavy lifting for proving redaction off-chain.
 */
class ProvenanceEngine {
    constructor(db, merkleLog) {
        this.db = db;
        this.merkleLog = merkleLog;
    }

    /**
     * Create a new redaction job record.
     * Calculates hashes, generates manifest hash, and logs to blockchain.
     * 
     * @param {string} docId - ID of the document being redacted
     * @param {string} originalContent - Raw partial or full content (will be hashed, not stored)
     * @param {string} redactedContent - Content after redaction (will be hashed, not stored)
     * @param {Object} manifest - The redaction manifest JSON
     * @param {string} actorId - Who performed the action
     * @returns {Object} Job receipt with proofs
     */
    async createJob(docId, originalContent, redactedContent, manifest, actorId) {
        // 1. Calculate Cryptographic Fingerprints
        const hashOriginal = this.sha256(originalContent);
        const hashRedacted = this.sha256(redactedContent);
        const hashManifest = this.sha256(JSON.stringify(manifest));

        // 2. Log to Audit Chain (Tier 1)
        // We log the fact that a redaction job occurred, linking the manifest hash
        const auditPayload = {
            action: "REDACTION_JOB",
            docId: docId,
            hashManifest: hashManifest
        };

        const auditEntry = this.merkleLog.append(
            "REDACTION_JOB",
            actorId,
            auditPayload
        );

        // 3. Create Provenance Record (Tier 2)
        const jobId = `rdx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // ZK Proof stub (in future this would be a real zk-SNARK)
        const zkProofStub = `mock_zk_proof_for_${jobId}`;

        const stmt = this.db.db.prepare(`
            INSERT INTO redaction_jobs (
                job_id, document_id, hash_original, hash_redacted, 
                hash_manifest, zk_proof, audit_log_id, signature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            jobId,
            docId,
            hashOriginal,
            hashRedacted,
            hashManifest,
            zkProofStub,
            auditEntry.id,
            "mock_signature" // In real world, signed by a private key
        );

        return {
            jobId,
            docId,
            timestamp: new Date().toISOString(),
            hashes: {
                original: hashOriginal,
                redacted: hashRedacted,
                manifest: hashManifest
            },
            auditLogId: auditEntry.id,
            merkleRoot: auditEntry.hash
        };
    }

    /**
     * Verify a specific redaction job.
     * Returns the cryptographic proof data.
     */
    getVerificationData(jobId) {
        const job = this.db.queryOne("SELECT * FROM redaction_jobs WHERE job_id = ?", [jobId]);
        if (!job) return null;

        // Get the linked audit log entry to prove chain inclusion
        const auditEntry = this.merkleLog.verify(job.audit_log_id);

        return {
            valid: !!auditEntry.valid,
            job: {
                id: job.job_id,
                docId: job.document_id,
                timestamp: job.timestamp
            },
            fingerprints: {
                hashOriginal: job.hash_original,
                hashRedacted: job.hash_redacted,
                hashManifest: job.hash_manifest
            },
            chainProof: {
                auditLogId: job.audit_log_id,
                merkleRoot: auditEntry.merkle_root,
                onChainHash: auditEntry.hash
            },
            zkProof: job.zk_proof
        };
    }

    sha256(data) {
        return crypto.createHash("sha256").update(data).digest("hex");
    }
}

module.exports = { ProvenanceEngine };
