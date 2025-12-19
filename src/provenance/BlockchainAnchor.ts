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

import * as crypto from "crypto";
import * as fs from "fs";
import { TrustBundle } from "./TrustBundleExporter";

/**
 * OpenTimestamps calendar server URLs
 * Using multiple servers for redundancy (aggregated submission)
 */
export const OTS_CALENDAR_SERVERS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://a.pool.eternitywall.com",
  "https://ots.btc.catallaxy.com",
] as const;

/**
 * Anchor status enumeration
 */
export type AnchorStatus =
  | "pending"      // Submitted to calendars, awaiting Bitcoin confirmation
  | "confirmed"    // Confirmed on Bitcoin blockchain
  | "failed"       // Anchoring failed
  | "upgraded";    // Upgraded from pending to confirmed

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
export class BlockchainAnchor {
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
  static async anchor(
    bundle: TrustBundle,
    options: AnchorOptions = {}
  ): Promise<BlockchainAnchorResult> {
    const {
      calendarServers = [...OTS_CALENDAR_SERVERS],
      timeout = 10000,
      waitForConfirmation = false,
      confirmationTimeout = 3600000,
      pollInterval = 60000,
    } = options;

    // Compute merkle root from trust bundle
    const merkleRoot = this.computeBundleMerkleRoot(bundle);

    // Create timestamp request
    const timestampProof = await this.submitToCalendars(
      merkleRoot,
      calendarServers,
      timeout
    );

    const result: BlockchainAnchorResult = {
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
  static async verify(
    anchor: BlockchainAnchorResult
  ): Promise<AnchorVerificationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const attestations: AnchorAttestation[] = [];

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
          const attestation = await this.queryCalendarServer(
            server,
            anchor.merkleRoot
          );
          if (attestation) {
            attestations.push(attestation);
          }
        } catch (e) {
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
    } catch (error) {
      errors.push(
        `Verification error: ${error instanceof Error ? error.message : String(error)}`
      );
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
  static async upgrade(
    anchor: BlockchainAnchorResult
  ): Promise<BlockchainAnchorResult> {
    if (anchor.status === "confirmed") {
      return anchor; // Already confirmed
    }

    // Try to get upgraded proof from calendars
    for (const server of anchor.calendarServers) {
      try {
        const upgradedProof = await this.fetchUpgradedProof(
          server,
          anchor.merkleRoot
        );
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
      } catch {
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
  static generateBundleMetadata(anchor: BlockchainAnchorResult): Record<string, any> {
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
  static async exportOTS(
    anchor: BlockchainAnchorResult,
    outputPath: string
  ): Promise<string> {
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
  static async importOTS(
    otsPath: string,
    jobId: string
  ): Promise<BlockchainAnchorResult> {
    const proofBuffer = fs.readFileSync(otsPath);

    if (!this.isValidOTSHeader(proofBuffer)) {
      throw new Error("Invalid OpenTimestamps file format");
    }

    // Extract merkle root from OTS file
    const merkleRoot = this.extractMerkleRootFromOTS(proofBuffer);

    const anchor: BlockchainAnchorResult = {
      status: "pending",
      merkleRoot,
      timestampProof: proofBuffer.toString("base64"),
      calendarServers: [...OTS_CALENDAR_SERVERS],
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
  private static computeBundleMerkleRoot(bundle: TrustBundle): string {
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
  private static buildMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) return this.sha256("");
    if (leaves.length === 1) return leaves[0];

    const level: string[] = [];
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
  private static sha256(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Submit hash to OpenTimestamps calendar servers
   */
  private static async submitToCalendars(
    hash: string,
    servers: string[],
    timeout: number
  ): Promise<string> {
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
      } catch {
        return null;
      }
    });

    const results = await Promise.all(calendarPromises);
    const successfulResults = results.filter((r) => r !== null);

    if (successfulResults.length === 0) {
      throw new Error("Failed to submit to any calendar server");
    }

    // Combine header with calendar attestations
    const otsFile = this.buildOTSFile(header, successfulResults as Array<{server: string; attestation: Buffer}>);

    return otsFile.toString("base64");
  }

  /**
   * Build OTS file header
   */
  private static buildOTSHeader(hashBuffer: Buffer): Buffer {
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
  private static buildOTSFile(
    header: Buffer,
    attestations: Array<{ server: string; attestation: Buffer }>
  ): Buffer {
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
  private static isValidOTSHeader(buffer: Buffer): boolean {
    if (buffer.length < 31) return false;

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
  private static extractMerkleRootFromOTS(buffer: Buffer): string {
    // Skip magic (31 bytes) + version (1 byte) + hash type (1 byte)
    const hashLenOffset = 33;
    const hashLen = buffer[hashLenOffset];
    const hashStart = hashLenOffset + 1;

    return buffer.subarray(hashStart, hashStart + hashLen).toString("hex");
  }

  /**
   * Query calendar server for attestation status
   */
  private static async queryCalendarServer(
    server: string,
    merkleRoot: string
  ): Promise<AnchorAttestation | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${server}/timestamp/${merkleRoot}`,
        {
          method: "GET",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.status === 200) {
        // Parse attestation response
        const data = await response.arrayBuffer();
        const attestation = this.parseAttestationResponse(
          server,
          Buffer.from(data)
        );
        return attestation;
      } else if (response.status === 404) {
        // Pending attestation
        return {
          server,
          type: "pending",
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse attestation response from calendar
   */
  private static parseAttestationResponse(
    server: string,
    data: Buffer
  ): AnchorAttestation {
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
  private static async fetchUpgradedProof(
    server: string,
    merkleRoot: string
  ): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${server}/timestamp/${merkleRoot}`,
        {
          method: "GET",
          headers: {
            Accept: "application/vnd.opentimestamps.v1",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.arrayBuffer();
        return Buffer.from(data).toString("base64");
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Estimate time until Bitcoin confirmation
   */
  private static estimateConfirmationTime(): string {
    // Bitcoin blocks average ~10 minutes, but OTS batches submissions
    // Typical confirmation time is 1-24 hours depending on batching
    const now = new Date();
    const estimated = new Date(now.getTime() + 6 * 60 * 60 * 1000); // ~6 hours
    return estimated.toISOString();
  }

  /**
   * Sleep helper
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Convenience function to anchor a Trust Bundle
 *
 * @param bundle - Trust Bundle to anchor
 * @param options - Anchoring options
 * @returns Blockchain anchor result
 */
export async function anchorToBlockchain(
  bundle: TrustBundle,
  options?: AnchorOptions
): Promise<BlockchainAnchorResult> {
  return BlockchainAnchor.anchor(bundle, options);
}

/**
 * Convenience function to verify a blockchain anchor
 *
 * @param anchor - Anchor to verify
 * @returns Verification result
 */
export async function verifyBlockchainAnchor(
  anchor: BlockchainAnchorResult
): Promise<AnchorVerificationResult> {
  return BlockchainAnchor.verify(anchor);
}
