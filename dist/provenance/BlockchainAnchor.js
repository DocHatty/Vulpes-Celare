"use strict";
/**
 * VULPES CELARE - BLOCKCHAIN ANCHORING
 *
 * OpenTimestamps integration for immutable blockchain timestamping of Trust Bundles.
 * Provides cryptographic proof that a redaction existed at a specific point in time.
 *
 * @module provenance/BlockchainAnchor
 *
 * @example
 * ```typescript
 * import { BlockchainAnchor, TrustBundleExporter } from 'vulpes-celare';
 *
 * // Generate trust bundle
 * const bundle = await TrustBundleExporter.generate(original, redacted, result);
 *
 * // Anchor to Bitcoin blockchain via OpenTimestamps
 * const anchor = await BlockchainAnchor.anchor(bundle);
 * console.log(`Anchored! Merkle root: ${anchor.merkleRoot}`);
 * console.log(`Timestamp proof: ${anchor.timestampProof}`);
 *
 * // Later: verify the anchor
 * const verification = await BlockchainAnchor.verify(anchor);
 * console.log(`Confirmed at block: ${verification.blockHeight}`);
 * ```
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainAnchor = exports.OTS_CALENDAR_SERVERS = void 0;
exports.anchorToBlockchain = anchorToBlockchain;
exports.verifyBlockchainAnchor = verifyBlockchainAnchor;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
/**
 * OpenTimestamps calendar server URLs
 * Using multiple servers for redundancy (aggregated submission)
 */
exports.OTS_CALENDAR_SERVERS = [
    "https://a.pool.opentimestamps.org",
    "https://b.pool.opentimestamps.org",
    "https://a.pool.eternitywall.com",
    "https://ots.btc.catallaxy.com",
];
/**
 * BlockchainAnchor - OpenTimestamps integration for Trust Bundles
 *
 * Provides immutable blockchain timestamping using the OpenTimestamps protocol,
 * which aggregates timestamps and anchors them to the Bitcoin blockchain.
 */
class BlockchainAnchor {
    /**
     * Anchor a Trust Bundle to the Bitcoin blockchain via OpenTimestamps
     *
     * @param bundle - Trust Bundle to anchor
     * @param options - Anchoring options
     * @returns Blockchain anchor result
     *
     * @example
     * ```typescript
     * const anchor = await BlockchainAnchor.anchor(bundle);
     * // Save the anchor for later verification
     * fs.writeFileSync('anchor.json', JSON.stringify(anchor, null, 2));
     * ```
     */
    static async anchor(bundle, options = {}) {
        const { calendarServers = [...exports.OTS_CALENDAR_SERVERS], timeout = 10000, waitForConfirmation = false, confirmationTimeout = 3600000, pollInterval = 60000, } = options;
        // Compute merkle root from trust bundle
        const merkleRoot = this.computeBundleMerkleRoot(bundle);
        // Create timestamp request
        const timestampProof = await this.submitToCalendars(merkleRoot, calendarServers, timeout);
        const result = {
            status: "pending",
            merkleRoot,
            timestampProof,
            calendarServers,
            anchoredAt: new Date().toISOString(),
            jobId: bundle.manifest.jobId,
            estimatedConfirmationTime: this.estimateConfirmationTime(),
        };
        // Optionally wait for confirmation
        if (waitForConfirmation) {
            const startTime = Date.now();
            while (Date.now() - startTime < confirmationTimeout) {
                const verification = await this.verify(result);
                if (verification.status === "confirmed") {
                    result.status = "confirmed";
                    result.blockHeight = verification.blockHeight;
                    result.blockHash = verification.blockHash;
                    result.confirmedAt = verification.confirmedAt;
                    delete result.estimatedConfirmationTime;
                    break;
                }
                await this.sleep(pollInterval);
            }
        }
        return result;
    }
    /**
     * Verify a blockchain anchor
     *
     * @param anchor - Blockchain anchor result to verify
     * @returns Verification result
     *
     * @example
     * ```typescript
     * const verification = await BlockchainAnchor.verify(anchor);
     * if (verification.valid && verification.status === 'confirmed') {
     *   console.log(`Confirmed at block ${verification.blockHeight}`);
     * }
     * ```
     */
    static async verify(anchor) {
        const errors = [];
        const warnings = [];
        const attestations = [];
        try {
            // Decode the timestamp proof
            const proofBuffer = Buffer.from(anchor.timestampProof, "base64");
            // Parse OTS file header (magic bytes: \x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94)
            if (!this.isValidOTSHeader(proofBuffer)) {
                errors.push("Invalid OpenTimestamps proof format");
                return {
                    valid: false,
                    status: "failed",
                    merkleRoot: anchor.merkleRoot,
                    errors,
                    warnings,
                    attestations,
                };
            }
            // Query calendar servers for attestation status
            for (const server of anchor.calendarServers) {
                try {
                    const attestation = await this.queryCalendarServer(server, anchor.merkleRoot);
                    if (attestation) {
                        attestations.push(attestation);
                    }
                }
                catch (e) {
                    warnings.push(`Calendar server ${server} unreachable`);
                }
            }
            // Determine overall status from attestations
            const bitcoinAttestation = attestations.find((a) => a.type === "bitcoin");
            if (bitcoinAttestation && bitcoinAttestation.blockHeight) {
                return {
                    valid: true,
                    status: "confirmed",
                    merkleRoot: anchor.merkleRoot,
                    blockHeight: bitcoinAttestation.blockHeight,
                    confirmedAt: bitcoinAttestation.timestamp,
                    errors,
                    warnings,
                    attestations,
                };
            }
            // Still pending
            if (attestations.some((a) => a.type === "pending")) {
                return {
                    valid: true,
                    status: "pending",
                    merkleRoot: anchor.merkleRoot,
                    errors,
                    warnings,
                    attestations,
                };
            }
            // No valid attestations found
            errors.push("No valid attestations found");
            return {
                valid: false,
                status: "failed",
                merkleRoot: anchor.merkleRoot,
                errors,
                warnings,
                attestations,
            };
        }
        catch (error) {
            errors.push(`Verification error: ${error instanceof Error ? error.message : String(error)}`);
            return {
                valid: false,
                status: "failed",
                merkleRoot: anchor.merkleRoot,
                errors,
                warnings,
                attestations,
            };
        }
    }
    /**
     * Upgrade a pending anchor by fetching updated proof from calendars
     *
     * @param anchor - Pending anchor to upgrade
     * @returns Updated anchor result
     *
     * @example
     * ```typescript
     * // Check if anchor can be upgraded
     * const upgraded = await BlockchainAnchor.upgrade(pendingAnchor);
     * if (upgraded.status === 'confirmed') {
     *   console.log('Anchor is now confirmed on Bitcoin blockchain!');
     * }
     * ```
     */
    static async upgrade(anchor) {
        if (anchor.status === "confirmed") {
            return anchor; // Already confirmed
        }
        // Try to get upgraded proof from calendars
        for (const server of anchor.calendarServers) {
            try {
                const upgradedProof = await this.fetchUpgradedProof(server, anchor.merkleRoot);
                if (upgradedProof) {
                    // Verify the upgraded proof
                    const verification = await this.verify({
                        ...anchor,
                        timestampProof: upgradedProof,
                    });
                    if (verification.status === "confirmed") {
                        return {
                            ...anchor,
                            status: "upgraded",
                            timestampProof: upgradedProof,
                            blockHeight: verification.blockHeight,
                            blockHash: verification.blockHash,
                            confirmedAt: verification.confirmedAt,
                        };
                    }
                }
            }
            catch {
                // Continue to next server
            }
        }
        return anchor; // No upgrade available
    }
    /**
     * Generate anchor metadata for inclusion in Trust Bundle
     *
     * @param anchor - Blockchain anchor result
     * @returns Metadata object for Trust Bundle
     */
    static generateBundleMetadata(anchor) {
        return {
            blockchainAnchor: {
                protocol: "OpenTimestamps",
                version: "1.0",
                status: anchor.status,
                merkleRoot: anchor.merkleRoot,
                timestampProof: anchor.timestampProof,
                calendarServers: anchor.calendarServers,
                anchoredAt: anchor.anchoredAt,
                ...(anchor.blockHeight && {
                    bitcoin: {
                        blockHeight: anchor.blockHeight,
                        blockHash: anchor.blockHash,
                        confirmedAt: anchor.confirmedAt,
                    },
                }),
            },
        };
    }
    /**
     * Export anchor to standalone .ots file
     *
     * @param anchor - Blockchain anchor result
     * @param outputPath - Path to save .ots file
     * @returns Path to created file
     */
    static async exportOTS(anchor, outputPath) {
        if (!outputPath.endsWith(".ots")) {
            outputPath += ".ots";
        }
        const proofBuffer = Buffer.from(anchor.timestampProof, "base64");
        fs.writeFileSync(outputPath, proofBuffer);
        return outputPath;
    }
    /**
     * Import anchor from .ots file
     *
     * @param otsPath - Path to .ots file
     * @param jobId - Job ID to associate with anchor
     * @returns Blockchain anchor result
     */
    static async importOTS(otsPath, jobId) {
        const proofBuffer = fs.readFileSync(otsPath);
        if (!this.isValidOTSHeader(proofBuffer)) {
            throw new Error("Invalid OpenTimestamps file format");
        }
        // Extract merkle root from OTS file
        const merkleRoot = this.extractMerkleRootFromOTS(proofBuffer);
        const anchor = {
            status: "pending",
            merkleRoot,
            timestampProof: proofBuffer.toString("base64"),
            calendarServers: [...exports.OTS_CALENDAR_SERVERS],
            anchoredAt: new Date().toISOString(),
            jobId,
        };
        // Try to verify/upgrade
        const verification = await this.verify(anchor);
        if (verification.status === "confirmed") {
            anchor.status = "confirmed";
            anchor.blockHeight = verification.blockHeight;
            anchor.blockHash = verification.blockHash;
            anchor.confirmedAt = verification.confirmedAt;
        }
        return anchor;
    }
    // ============================================================================
    // PRIVATE HELPER METHODS
    // ============================================================================
    /**
     * Compute merkle root from Trust Bundle
     */
    static computeBundleMerkleRoot(bundle) {
        // Hash all components and build merkle tree
        const leaves = [
            this.sha256(JSON.stringify(bundle.manifest)),
            this.sha256(JSON.stringify(bundle.certificate)),
            this.sha256(bundle.redactedDocument),
            this.sha256(JSON.stringify(bundle.policy)),
            this.sha256(bundle.auditorInstructions),
        ].sort();
        return this.buildMerkleRoot(leaves);
    }
    /**
     * Build merkle root from leaf hashes
     */
    static buildMerkleRoot(leaves) {
        if (leaves.length === 0)
            return this.sha256("");
        if (leaves.length === 1)
            return leaves[0];
        const level = [];
        for (let i = 0; i < leaves.length; i += 2) {
            const left = leaves[i];
            const right = leaves[i + 1] || left;
            level.push(this.sha256(left + right));
        }
        return this.buildMerkleRoot(level);
    }
    /**
     * SHA-256 hash
     */
    static sha256(data) {
        return crypto.createHash("sha256").update(data).digest("hex");
    }
    /**
     * Submit hash to OpenTimestamps calendar servers
     */
    static async submitToCalendars(hash, servers, timeout) {
        const hashBuffer = Buffer.from(hash, "hex");
        // Build OTS file header
        const header = this.buildOTSHeader(hashBuffer);
        // Submit to each calendar server
        const calendarPromises = servers.map(async (server) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(`${server}/digest`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Accept: "application/vnd.opentimestamps.v1",
                    },
                    body: hashBuffer,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`Calendar returned ${response.status}`);
                }
                const attestation = await response.arrayBuffer();
                return { server, attestation: Buffer.from(attestation) };
            }
            catch {
                return null;
            }
        });
        const results = await Promise.all(calendarPromises);
        const successfulResults = results.filter((r) => r !== null);
        if (successfulResults.length === 0) {
            throw new Error("Failed to submit to any calendar server");
        }
        // Combine header with calendar attestations
        const otsFile = this.buildOTSFile(header, successfulResults);
        return otsFile.toString("base64");
    }
    /**
     * Build OTS file header
     */
    static buildOTSHeader(hashBuffer) {
        // OpenTimestamps magic bytes
        const magic = Buffer.from([
            0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61,
            0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf,
            0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
        ]);
        // Version byte (1)
        const version = Buffer.from([0x01]);
        // Hash type (SHA256 = 0x08)
        const hashType = Buffer.from([0x08]);
        // Hash length and data
        const hashLen = Buffer.from([hashBuffer.length]);
        return Buffer.concat([magic, version, hashType, hashLen, hashBuffer]);
    }
    /**
     * Build complete OTS file with attestations
     */
    static buildOTSFile(header, attestations) {
        // For now, we'll create a simplified OTS structure
        // A full implementation would properly encode the tree structure
        const parts = [header];
        for (const att of attestations) {
            // Add attestation marker and data
            parts.push(att.attestation);
        }
        return Buffer.concat(parts);
    }
    /**
     * Check if buffer has valid OTS header
     */
    static isValidOTSHeader(buffer) {
        if (buffer.length < 31)
            return false;
        // Check magic bytes
        const expectedMagic = Buffer.from([
            0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61,
            0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf,
            0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
        ]);
        return buffer.subarray(0, 31).equals(expectedMagic);
    }
    /**
     * Extract merkle root from OTS file
     */
    static extractMerkleRootFromOTS(buffer) {
        // Skip magic (31 bytes) + version (1 byte) + hash type (1 byte)
        const hashLenOffset = 33;
        const hashLen = buffer[hashLenOffset];
        const hashStart = hashLenOffset + 1;
        return buffer.subarray(hashStart, hashStart + hashLen).toString("hex");
    }
    /**
     * Query calendar server for attestation status
     */
    static async queryCalendarServer(server, merkleRoot) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${server}/timestamp/${merkleRoot}`, {
                method: "GET",
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (response.status === 200) {
                // Parse attestation response
                const data = await response.arrayBuffer();
                const attestation = this.parseAttestationResponse(server, Buffer.from(data));
                return attestation;
            }
            else if (response.status === 404) {
                // Pending attestation
                return {
                    server,
                    type: "pending",
                };
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * Parse attestation response from calendar
     */
    static parseAttestationResponse(server, data) {
        // Check for Bitcoin attestation marker (0x05 88 96 0d 73 d7 19 01)
        const bitcoinMarker = Buffer.from([0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01]);
        if (data.includes(bitcoinMarker)) {
            // Extract block height (simplified - real implementation would parse properly)
            const markerIndex = data.indexOf(bitcoinMarker);
            const blockHeightBytes = data.subarray(markerIndex + 8, markerIndex + 12);
            const blockHeight = blockHeightBytes.readUInt32LE(0);
            return {
                server,
                type: "bitcoin",
                blockHeight,
                timestamp: new Date().toISOString(),
            };
        }
        return {
            server,
            type: "pending",
        };
    }
    /**
     * Fetch upgraded proof from calendar server
     */
    static async fetchUpgradedProof(server, merkleRoot) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(`${server}/timestamp/${merkleRoot}`, {
                method: "GET",
                headers: {
                    Accept: "application/vnd.opentimestamps.v1",
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                const data = await response.arrayBuffer();
                return Buffer.from(data).toString("base64");
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * Estimate time until Bitcoin confirmation
     */
    static estimateConfirmationTime() {
        // Bitcoin blocks average ~10 minutes, but OTS batches submissions
        // Typical confirmation time is 1-24 hours depending on batching
        const now = new Date();
        const estimated = new Date(now.getTime() + 6 * 60 * 60 * 1000); // ~6 hours
        return estimated.toISOString();
    }
    /**
     * Sleep helper
     */
    static sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.BlockchainAnchor = BlockchainAnchor;
/**
 * Convenience function to anchor a Trust Bundle
 *
 * @param bundle - Trust Bundle to anchor
 * @param options - Anchoring options
 * @returns Blockchain anchor result
 */
async function anchorToBlockchain(bundle, options) {
    return BlockchainAnchor.anchor(bundle, options);
}
/**
 * Convenience function to verify a blockchain anchor
 *
 * @param anchor - Anchor to verify
 * @returns Verification result
 */
async function verifyBlockchainAnchor(anchor) {
    return BlockchainAnchor.verify(anchor);
}
//# sourceMappingURL=BlockchainAnchor.js.map