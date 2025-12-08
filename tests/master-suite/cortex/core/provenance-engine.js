const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const KEY_DIR = path.join(__dirname, "..", "storage");
const PRIVATE_KEY_PATH = path.join(KEY_DIR, "ed25519-private.pem");
const PUBLIC_KEY_PATH = path.join(KEY_DIR, "ed25519-public.pem");

function ensureKeypair() {
    if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
        return {
            privateKey: fs.readFileSync(PRIVATE_KEY_PATH, "utf8"),
            publicKey: fs.readFileSync(PUBLIC_KEY_PATH, "utf8"),
        };
    }

    if (!fs.existsSync(KEY_DIR)) {
        fs.mkdirSync(KEY_DIR, { recursive: true });
    }

    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519", {
        privateKeyEncoding: { format: "pem", type: "pkcs8" },
        publicKeyEncoding: { format: "pem", type: "spki" },
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);

    return { privateKey, publicKey };
}

function signFingerprint(payload) {
    const { privateKey } = ensureKeypair();
    return crypto.sign(null, Buffer.from(payload, "utf8"), privateKey).toString("base64");
}

function verifySignature(payload, signature) {
    const { publicKey } = ensureKeypair();
    return crypto.verify(null, Buffer.from(payload, "utf8"), publicKey, Buffer.from(signature, "base64"));
}

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
        const fingerprint = `${hashOriginal}|${hashRedacted}|${hashManifest}`;
        const signature = signFingerprint(fingerprint);

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
            signature
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
            merkleRoot: auditEntry.hash,
            signature
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
        const payload = `${job.hash_original}|${job.hash_redacted}|${job.hash_manifest}`;
        const signatureValid = job.signature
            ? verifySignature(payload, job.signature)
            : false;

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
            zkProof: job.zk_proof,
            signatureValid
        };
    }

    sha256(data) {
        return crypto.createHash("sha256").update(data).digest("hex");
    }
}

module.exports = { ProvenanceEngine };
