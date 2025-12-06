/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   VULPES CORTEX - MERKLE LOG (BLOCKCHAIN TIER 1)                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module provides the "Fast Path" for immutable audit logging.
 * It implements a Linear Hash Chain (Blockchain) where every entry is cryptographically
 * linked to the previous one.
 *
 * PROPERTIES:
 * - Append-Only: Operations can only add to the end
 * - Tamper-Evident: Modification of any past record invalidates all future hashes
 * - Verifiable: The "Head Hash" (Merkle Root) proves the integrity of the entire history
 */

const crypto = require('crypto');

class MerkleLog {
    /**
     * @param {Object} db - CortexDatabase instance
     */
    constructor(db) {
        this.db = db;
    }

    /**
     * Append a new entry to the immutable log
     * @param {string} eventType - Type of event (e.g., "ACCESS", "REDACTION")
     * @param {string} actorId - ID of user/system performing action
     * @param {Object} data - Payload data (will be stringified)
     * @returns {Object} The created log entry with hashes
     */
    append(eventType, actorId, data) {
        // 1. Get the last entry's hash (The Link)
        const lastEntry = this.db.queryOne(
            "SELECT data_hash, merkle_root FROM audit_log ORDER BY id DESC LIMIT 1"
        );

        const prevHash = lastEntry ? lastEntry.data_hash : "0000000000000000000000000000000000000000000000000000000000000000";

        // 2. Prepare payload
        const payloadStr = JSON.stringify(data || {});
        const timestamp = new Date().toISOString();

        // 3. Calculate "Block Hash" (Data Hash)
        // Hash(PrevHash + EventType + Actor + Timestamp + Payload)
        const blockContent = `${prevHash}|${eventType}|${actorId}|${timestamp}|${payloadStr}`;
        const dataHash = this.sha256(blockContent);

        // 4. Calculate "Merkle Root" (Chain Head)
        // In this Linear Chain implementation, the Root IS the DataHash of the tip.
        const merkleRoot = dataHash;

        // 5. Insert into DB
        const result = this.db.run(`
      INSERT INTO audit_log (
        event_type, actor_id, data_hash, prev_hash, merkle_root, payload, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            eventType,
            actorId,
            dataHash,
            prevHash,
            merkleRoot,
            payloadStr,
            timestamp
        ]);

        return {
            id: result.lastInsertRowid, // CortexDatabase .run returns prepare().run() result
            hash: dataHash,
            prevHash: prevHash,
            timestamp
        };
    }

    /**
     * Verify the integrity of a specific record against the chain
     * @param {number} id - Record ID to verify
     * @returns {Object} Verification result
     */
    verify(id) {
        const record = this.db.queryOne("SELECT * FROM audit_log WHERE id = ?", [id]);
        if (!record) return { valid: false, error: "Record not found" };

        // Reconstruct hash
        const blockContent = `${record.prev_hash}|${record.event_type}|${record.actor_id}|${record.timestamp}|${record.payload}`;
        const calculatedHash = this.sha256(blockContent);

        if (calculatedHash !== record.data_hash) {
            return {
                valid: false,
                error: "Hash mismatch! Record has been tampered with.",
                expected: calculatedHash,
                actual: record.data_hash
            };
        }

        // Verify link to next record (if exists)
        const nextRecord = this.db.queryOne("SELECT * FROM audit_log WHERE id = ?", [record.id + 1]);
        if (nextRecord) {
            if (nextRecord.prev_hash !== record.data_hash) {
                return {
                    valid: false,
                    error: "Chain broken! Next record does not point to this record.",
                    nextPrevHash: nextRecord.prev_hash,
                    thisHash: record.data_hash
                };
            }
        }

        return { valid: true, hash: record.data_hash };
    }

    /**
     * Get the current HEAD of the chain (The Anchor)
     */
    getHead() {
        return this.db.queryOne(
            "SELECT * FROM audit_log ORDER BY id DESC LIMIT 1"
        );
    }

    sha256(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}

module.exports = { MerkleLog };
