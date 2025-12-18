/**
 * Tests for Blockchain Anchoring (OpenTimestamps)
 *
 * Note: These tests mock the actual API calls to avoid network dependencies.
 * Integration tests with real OpenTimestamps servers should be run separately.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  BlockchainAnchor,
  BlockchainAnchorResult,
  OTS_CALENDAR_SERVERS,
  anchorToBlockchain,
  verifyBlockchainAnchor,
} from "../../src/provenance/BlockchainAnchor";
import { TrustBundle } from "../../src/provenance/TrustBundleExporter";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Trust Bundle for testing
const createMockTrustBundle = (): TrustBundle => ({
  manifest: {
    version: "1.0.0",
    format: "RED",
    jobId: "test-job-123",
    timestamp: new Date().toISOString(),
    redactorVersion: "vulpes-celare@1.0.0",
    policy: "maximum",
    statistics: {
      originalLength: 1000,
      redactedLength: 800,
      phiElementsRemoved: 5,
      processingTimeMs: 100,
    },
    integrity: {
      hashAlgorithm: "SHA-256",
      hashOriginal: "abc123def456",
      hashRedacted: "def456ghi789",
      hashManifest: "ghi789jkl012",
    },
    compliance: {
      standard: "HIPAA Safe Harbor",
      identifiersRedacted: ["Names", "SSN", "Dates"],
    },
    bundle: {
      files: ["manifest.json", "certificate.json", "redacted-document.txt"],
      totalSize: 5000,
      checksums: {},
    },
  },
  certificate: {
    version: "1.0.0",
    certificateId: "cert-test-job-123",
    issuedAt: new Date().toISOString(),
    expiresAt: null,
    subject: {
      jobId: "test-job-123",
      description: "Test redaction certificate",
    },
    issuer: {
      system: "Vulpes Celare Redaction Service",
      version: "1.0.0",
    },
    cryptographicProofs: {
      hashChain: {
        algorithm: "SHA-256",
        originalHash: "abc123def456",
        redactedHash: "def456ghi789",
        manifestHash: "ghi789jkl012",
        proof: "verified",
      },
    },
    attestations: {
      redactionPerformed: true,
      policyCompliance: "HIPAA Safe Harbor",
      integrityVerified: true,
      chainOfCustody: "Unbroken",
    },
  },
  redactedDocument: "This is a redacted document with {{NAME_1}} removed.",
  policy: {
    name: "maximum",
    version: "1.0.0",
    filters: {},
  },
  auditorInstructions: "# Verification Instructions\n\nFollow these steps...",
});

describe("BlockchainAnchor", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("anchor", () => {
    it("should create anchor with merkle root from trust bundle", async () => {
      // Mock successful calendar submission
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(32),
      });

      const bundle = createMockTrustBundle();
      const result = await BlockchainAnchor.anchor(bundle);

      expect(result).toBeDefined();
      expect(result.merkleRoot).toBeDefined();
      expect(result.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
      expect(result.status).toBe("pending");
      expect(result.jobId).toBe("test-job-123");
    });

    it("should include timestamp proof as base64", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(32),
      });

      const bundle = createMockTrustBundle();
      const result = await BlockchainAnchor.anchor(bundle);

      expect(result.timestampProof).toBeDefined();
      // Should be valid base64
      expect(() => Buffer.from(result.timestampProof, "base64")).not.toThrow();
    });

    it("should submit to multiple calendar servers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(32),
      });

      const bundle = createMockTrustBundle();
      await BlockchainAnchor.anchor(bundle);

      // Should have attempted to submit to all default servers
      expect(mockFetch).toHaveBeenCalledTimes(OTS_CALENDAR_SERVERS.length);
    });

    it("should handle partial calendar failures gracefully", async () => {
      // First server fails, rest succeed
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(32),
        });

      const bundle = createMockTrustBundle();
      const result = await BlockchainAnchor.anchor(bundle);

      // Should still succeed with remaining servers
      expect(result.status).toBe("pending");
    });

    it("should throw if all calendar servers fail", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const bundle = createMockTrustBundle();

      await expect(BlockchainAnchor.anchor(bundle)).rejects.toThrow(
        "Failed to submit to any calendar server"
      );
    });

    it("should accept custom timeout option", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(32),
      });

      const bundle = createMockTrustBundle();
      const result = await BlockchainAnchor.anchor(bundle, { timeout: 5000 });

      // Verify anchor was created with custom options
      expect(result.status).toBe("pending");
      expect(result.merkleRoot).toBeDefined();
    });

    it("should include estimated confirmation time", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(32),
      });

      const bundle = createMockTrustBundle();
      const result = await BlockchainAnchor.anchor(bundle);

      expect(result.estimatedConfirmationTime).toBeDefined();
      // Should be a valid ISO timestamp
      expect(() => new Date(result.estimatedConfirmationTime!)).not.toThrow();
    });
  });

  describe("verify", () => {
    it("should verify valid anchor as pending", async () => {
      // Mock calendar returning 404 (pending)
      mockFetch.mockResolvedValue({
        status: 404,
        ok: false,
      });

      const anchor: BlockchainAnchorResult = {
        status: "pending",
        merkleRoot: "a".repeat(64),
        timestampProof: createValidOTSProof(),
        calendarServers: ["https://a.pool.opentimestamps.org"],
        anchoredAt: new Date().toISOString(),
        jobId: "test-job",
      };

      const result = await BlockchainAnchor.verify(anchor);

      expect(result.status).toBe("pending");
      expect(result.valid).toBe(true);
    });

    it("should detect invalid OTS proof format", async () => {
      const anchor: BlockchainAnchorResult = {
        status: "pending",
        merkleRoot: "a".repeat(64),
        timestampProof: Buffer.from("invalid data").toString("base64"),
        calendarServers: ["https://a.pool.opentimestamps.org"],
        anchoredAt: new Date().toISOString(),
        jobId: "test-job",
      };

      const result = await BlockchainAnchor.verify(anchor);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid OpenTimestamps proof format");
    });

    it("should collect attestations from multiple servers", async () => {
      mockFetch.mockResolvedValue({
        status: 404,
        ok: false,
      });

      const anchor: BlockchainAnchorResult = {
        status: "pending",
        merkleRoot: "a".repeat(64),
        timestampProof: createValidOTSProof(),
        calendarServers: OTS_CALENDAR_SERVERS.slice(0, 2),
        anchoredAt: new Date().toISOString(),
        jobId: "test-job",
      };

      const result = await BlockchainAnchor.verify(anchor);

      expect(result.attestations.length).toBeGreaterThan(0);
    });
  });

  describe("upgrade", () => {
    it("should return same anchor if already confirmed", async () => {
      const anchor: BlockchainAnchorResult = {
        status: "confirmed",
        merkleRoot: "a".repeat(64),
        timestampProof: createValidOTSProof(),
        calendarServers: ["https://a.pool.opentimestamps.org"],
        anchoredAt: new Date().toISOString(),
        jobId: "test-job",
        blockHeight: 800000,
      };

      const result = await BlockchainAnchor.upgrade(anchor);

      expect(result).toEqual(anchor);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should attempt to fetch upgraded proof for pending anchor", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const anchor: BlockchainAnchorResult = {
        status: "pending",
        merkleRoot: "a".repeat(64),
        timestampProof: createValidOTSProof(),
        calendarServers: ["https://a.pool.opentimestamps.org"],
        anchoredAt: new Date().toISOString(),
        jobId: "test-job",
      };

      await BlockchainAnchor.upgrade(anchor);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("generateBundleMetadata", () => {
    it("should generate metadata for pending anchor", () => {
      const anchor: BlockchainAnchorResult = {
        status: "pending",
        merkleRoot: "abc123",
        timestampProof: "base64proof",
        calendarServers: ["https://server.com"],
        anchoredAt: "2024-01-01T00:00:00Z",
        jobId: "test-job",
      };

      const metadata = BlockchainAnchor.generateBundleMetadata(anchor);

      expect(metadata.blockchainAnchor).toBeDefined();
      expect(metadata.blockchainAnchor.protocol).toBe("OpenTimestamps");
      expect(metadata.blockchainAnchor.status).toBe("pending");
      expect(metadata.blockchainAnchor.merkleRoot).toBe("abc123");
    });

    it("should include bitcoin details for confirmed anchor", () => {
      const anchor: BlockchainAnchorResult = {
        status: "confirmed",
        merkleRoot: "abc123",
        timestampProof: "base64proof",
        calendarServers: ["https://server.com"],
        anchoredAt: "2024-01-01T00:00:00Z",
        jobId: "test-job",
        blockHeight: 800000,
        blockHash: "0000000000000000000abc",
        confirmedAt: "2024-01-02T00:00:00Z",
      };

      const metadata = BlockchainAnchor.generateBundleMetadata(anchor);

      expect(metadata.blockchainAnchor.bitcoin).toBeDefined();
      expect(metadata.blockchainAnchor.bitcoin.blockHeight).toBe(800000);
    });
  });

  describe("convenience functions", () => {
    it("anchorToBlockchain should delegate to BlockchainAnchor.anchor", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(32),
      });

      const bundle = createMockTrustBundle();
      const result = await anchorToBlockchain(bundle);

      expect(result.status).toBe("pending");
    });

    it("verifyBlockchainAnchor should delegate to BlockchainAnchor.verify", async () => {
      mockFetch.mockResolvedValue({
        status: 404,
        ok: false,
      });

      const anchor: BlockchainAnchorResult = {
        status: "pending",
        merkleRoot: "a".repeat(64),
        timestampProof: createValidOTSProof(),
        calendarServers: ["https://a.pool.opentimestamps.org"],
        anchoredAt: new Date().toISOString(),
        jobId: "test-job",
      };

      const result = await verifyBlockchainAnchor(anchor);

      expect(result).toBeDefined();
      expect(result.merkleRoot).toBe(anchor.merkleRoot);
    });
  });
});

/**
 * Create a valid OTS proof header for testing
 */
function createValidOTSProof(): string {
  // OpenTimestamps magic bytes
  const magic = Buffer.from([
    0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61,
    0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf,
    0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
  ]);

  // Version byte
  const version = Buffer.from([0x01]);

  // Hash type (SHA256)
  const hashType = Buffer.from([0x08]);

  // Hash length and dummy hash
  const hashLen = Buffer.from([0x20]); // 32 bytes
  const hash = Buffer.alloc(32, 0xaa);

  return Buffer.concat([magic, version, hashType, hashLen, hash]).toString(
    "base64"
  );
}
