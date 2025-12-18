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
import { TrustBundle } from "./TrustBundleExporter";
/**
 * OpenTimestamps calendar server URLs
 * Using multiple servers for redundancy (aggregated submission)
 */
export declare const OTS_CALENDAR_SERVERS: readonly ["https://a.pool.opentimestamps.org", "https://b.pool.opentimestamps.org", "https://a.pool.eternitywall.com", "https://ots.btc.catallaxy.com"];
/**
 * Anchor status enumeration
 */
export type AnchorStatus = "pending" | "confirmed" | "failed" | "upgraded";
/**
 * Blockchain anchor result
 */
export interface BlockchainAnchorResult {
    /** Status of the anchor */
    status: AnchorStatus;
    /** SHA-256 hash of the anchored data (merkle root of trust bundle) */
    merkleRoot: string;
    /** OpenTimestamps proof (base64 encoded .ots file contents) */
    timestampProof: string;
    /** Calendar servers used for submission */
    calendarServers: string[];
    /** ISO timestamp when anchor was created */
    anchoredAt: string;
    /** Job ID from the trust bundle */
    jobId: string;
    /** Bitcoin block height (if confirmed) */
    blockHeight?: number;
    /** Bitcoin block hash (if confirmed) */
    blockHash?: string;
    /** Bitcoin transaction ID (if confirmed) */
    txId?: string;
    /** ISO timestamp of Bitcoin block (if confirmed) */
    confirmedAt?: string;
    /** Estimated time until confirmation (if pending) */
    estimatedConfirmationTime?: string;
}
/**
 * Verification result for blockchain anchor
 */
export interface AnchorVerificationResult {
    /** Whether the anchor is valid and verified */
    valid: boolean;
    /** Current status */
    status: AnchorStatus;
    /** The merkle root that was anchored */
    merkleRoot: string;
    /** Bitcoin block height (if confirmed) */
    blockHeight?: number;
    /** Bitcoin block hash (if confirmed) */
    blockHash?: string;
    /** ISO timestamp of Bitcoin block (if confirmed) */
    confirmedAt?: string;
    /** Any errors encountered */
    errors: string[];
    /** Warnings (e.g., pending status) */
    warnings: string[];
    /** Attestation details */
    attestations: AnchorAttestation[];
}
/**
 * Individual attestation from calendar server
 */
export interface AnchorAttestation {
    /** Calendar server URL */
    server: string;
    /** Attestation type */
    type: "pending" | "bitcoin" | "litecoin" | "ethereum";
    /** Block height (for blockchain attestations) */
    blockHeight?: number;
    /** Timestamp */
    timestamp?: string;
}
/**
 * Options for anchoring
 */
export interface AnchorOptions {
    /** Calendar servers to use (defaults to OTS_CALENDAR_SERVERS) */
    calendarServers?: string[];
    /** Timeout for calendar requests in ms (default: 10000) */
    timeout?: number;
    /** Whether to wait for confirmation (default: false, returns immediately with pending status) */
    waitForConfirmation?: boolean;
    /** Maximum time to wait for confirmation in ms (default: 3600000 = 1 hour) */
    confirmationTimeout?: number;
    /** Poll interval for confirmation check in ms (default: 60000 = 1 minute) */
    pollInterval?: number;
}
/**
 * BlockchainAnchor - OpenTimestamps integration for Trust Bundles
 *
 * Provides immutable blockchain timestamping using the OpenTimestamps protocol,
 * which aggregates timestamps and anchors them to the Bitcoin blockchain.
 */
export declare class BlockchainAnchor {
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
    static anchor(bundle: TrustBundle, options?: AnchorOptions): Promise<BlockchainAnchorResult>;
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
    static verify(anchor: BlockchainAnchorResult): Promise<AnchorVerificationResult>;
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
    static upgrade(anchor: BlockchainAnchorResult): Promise<BlockchainAnchorResult>;
    /**
     * Generate anchor metadata for inclusion in Trust Bundle
     *
     * @param anchor - Blockchain anchor result
     * @returns Metadata object for Trust Bundle
     */
    static generateBundleMetadata(anchor: BlockchainAnchorResult): Record<string, any>;
    /**
     * Export anchor to standalone .ots file
     *
     * @param anchor - Blockchain anchor result
     * @param outputPath - Path to save .ots file
     * @returns Path to created file
     */
    static exportOTS(anchor: BlockchainAnchorResult, outputPath: string): Promise<string>;
    /**
     * Import anchor from .ots file
     *
     * @param otsPath - Path to .ots file
     * @param jobId - Job ID to associate with anchor
     * @returns Blockchain anchor result
     */
    static importOTS(otsPath: string, jobId: string): Promise<BlockchainAnchorResult>;
    /**
     * Compute merkle root from Trust Bundle
     */
    private static computeBundleMerkleRoot;
    /**
     * Build merkle root from leaf hashes
     */
    private static buildMerkleRoot;
    /**
     * SHA-256 hash
     */
    private static sha256;
    /**
     * Submit hash to OpenTimestamps calendar servers
     */
    private static submitToCalendars;
    /**
     * Build OTS file header
     */
    private static buildOTSHeader;
    /**
     * Build complete OTS file with attestations
     */
    private static buildOTSFile;
    /**
     * Check if buffer has valid OTS header
     */
    private static isValidOTSHeader;
    /**
     * Extract merkle root from OTS file
     */
    private static extractMerkleRootFromOTS;
    /**
     * Query calendar server for attestation status
     */
    private static queryCalendarServer;
    /**
     * Parse attestation response from calendar
     */
    private static parseAttestationResponse;
    /**
     * Fetch upgraded proof from calendar server
     */
    private static fetchUpgradedProof;
    /**
     * Estimate time until Bitcoin confirmation
     */
    private static estimateConfirmationTime;
    /**
     * Sleep helper
     */
    private static sleep;
}
/**
 * Convenience function to anchor a Trust Bundle
 *
 * @param bundle - Trust Bundle to anchor
 * @param options - Anchoring options
 * @returns Blockchain anchor result
 */
export declare function anchorToBlockchain(bundle: TrustBundle, options?: AnchorOptions): Promise<BlockchainAnchorResult>;
/**
 * Convenience function to verify a blockchain anchor
 *
 * @param anchor - Anchor to verify
 * @returns Verification result
 */
export declare function verifyBlockchainAnchor(anchor: BlockchainAnchorResult): Promise<AnchorVerificationResult>;
//# sourceMappingURL=BlockchainAnchor.d.ts.map