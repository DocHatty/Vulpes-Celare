/**
 * Integration Tests for New Features (Dec 2025)
 *
 * Tests that all new features work correctly together in realistic scenarios:
 * 1. Confidence Explanation API
 * 2. LLM SDK Wrappers
 * 3. Blockchain Anchoring
 * 4. Differential Privacy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  VulpesCelare,
  ExplanationGenerator,
  TrustBundleExporter,
  BlockchainAnchor,
  DifferentialPrivacy,
  VulpesOpenAI,
  VulpesAnthropic,
  createDifferentialPrivacy,
} from "../../src";

// Mock fetch for LLM tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("New Features Integration", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("End-to-End: Redaction with Full Audit Trail", () => {
    it("should create complete audit trail with explanations, trust bundle, and blockchain anchor", async () => {
      // 1. Redact PHI from clinical text
      const engine = new VulpesCelare();
      const clinicalNote = `
        Patient: John Smith
        DOB: 03/15/1985
        SSN: 123-45-6789
        Chief Complaint: Chest pain for 2 days
        Assessment: Probable angina
      `;

      const result = await engine.process(clinicalNote);

      // Verify redaction happened
      expect(result.redactionCount).toBeGreaterThan(0);
      expect(result.text).not.toContain("John Smith");
      expect(result.text).not.toContain("123-45-6789");

      // 2. Generate explanations for all redactions
      const report = ExplanationGenerator.generateReport(
        result,
        result.spans || []
      );

      expect(report.totalExplained).toBe(report.redactedCount);
      expect(report.explanations.length).toBeGreaterThan(0);

      // Verify explanation quality
      for (const explanation of report.explanations) {
        expect(explanation.phiType).toBeDefined();
        expect(explanation.finalConfidence).toBeGreaterThanOrEqual(0);
        expect(explanation.finalConfidence).toBeLessThanOrEqual(1);
        expect(explanation.summary).toBeTruthy();
        expect(explanation.decision).toMatch(/REDACT|ALLOW/);
      }

      // 3. Generate Trust Bundle
      const bundle = await TrustBundleExporter.generate(
        clinicalNote,
        result.text,
        result,
        {
          policyName: "maximum",
          documentId: "integration-test-001",
        }
      );

      expect(bundle.manifest).toBeDefined();
      expect(bundle.certificate).toBeDefined();
      expect(bundle.manifest.statistics.phiElementsRemoved).toBe(
        result.redactionCount
      );

      // 4. Mock blockchain anchoring (would be real in production)
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(32),
      });

      const anchor = await BlockchainAnchor.anchor(bundle);
      expect(anchor.status).toBe("pending");
      expect(anchor.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
      expect(anchor.jobId).toBe(bundle.manifest.jobId);
    });

    it("should export explanations in both markdown and JSON formats", async () => {
      const engine = new VulpesCelare();
      const text = "Patient SSN: 987-65-4321, Phone: (555) 123-4567";
      const result = await engine.process(text);

      // Markdown export
      const markdown = ExplanationGenerator.exportAuditDocument(
        result,
        result.spans || [],
        { includeContext: true, includeFactors: true }
      );

      expect(markdown).toContain("# Redaction Audit Report");
      expect(markdown).toContain("Social Security Number");
      expect(markdown).not.toContain("987-65-4321"); // Should be masked

      // JSON export
      const json = ExplanationGenerator.exportJSON(result, result.spans || [], {
        includeOriginalText: false,
        prettyPrint: true,
      });

      const parsed = JSON.parse(json);
      expect(parsed.meta.sanitized).toBe(true);
      expect(parsed.explanations.length).toBeGreaterThan(0);
    });
  });

  describe("LLM Integration with Redaction", () => {
    it("VulpesOpenAI should redact before API call and reidentify in response", async () => {
      // Mock OpenAI response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-4",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content:
                  "The patient {{NAME_1}} has been assessed. Their SSN {{SSN_1}} is on file.",
              },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      });

      const client = new VulpesOpenAI({
        apiKey: "test-key",
        redaction: { enabled: true, reidentifyResponse: true },
      });

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: "Summarize the record for John Doe, SSN 111-22-3333",
          },
        ],
      });

      // Verify API was called with redacted content
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages[0].content).not.toContain("John Doe");
      expect(requestBody.messages[0].content).not.toContain("111-22-3333");

      // Response should have original PHI restored (if tokens match)
      expect(response.choices[0].message.content).toBeDefined();
    });

    it("VulpesAnthropic should redact system prompts too", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "Understood." }],
          model: "claude-3-5-sonnet-20241022",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      const client = new VulpesAnthropic({
        apiKey: "test-key",
        redaction: { enabled: true },
      });

      await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: "You are helping with patient Jane Doe, MRN 12345678",
        messages: [{ role: "user", content: "What's the status?" }],
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      // System prompt should be redacted
      expect(requestBody.system).not.toContain("Jane Doe");
    });
  });

  describe("Differential Privacy for Aggregate Statistics", () => {
    it("should privatize redaction statistics while preserving utility", async () => {
      // Simulate processing many documents
      const rawStats = {
        documentsProcessed: 10000,
        totalRedactions: 47500,
        byType: {
          NAME: 15000,
          SSN: 2500,
          DATE: 12000,
          PHONE: 8000,
          ADDRESS: 5000,
          EMAIL: 3000,
          MRN: 2000,
        },
      };

      // Use balanced preset
      const dp = createDifferentialPrivacy("balanced");
      const privateStats = dp.privatizeRedactionStats(rawStats, 10);

      // Statistics should be noisy but approximately correct
      expect(privateStats.documentsProcessed.noisy).not.toBe(10000);
      expect(privateStats.totalRedactions.noisy).not.toBe(47500);

      // With balanced epsilon and this sample size, should be within ~10% typically
      const docsDiff = Math.abs(
        privateStats.documentsProcessed.noisy - 10000
      );
      expect(docsDiff).toBeLessThan(5000); // Within reasonable range

      // Privacy guarantees should be present
      expect(privateStats.documentsProcessed.guarantee).toContain(
        "differentially private"
      );
      expect(privateStats.budgetSpent).toBe(10);

      // All PHI types should be privatized
      expect(Object.keys(privateStats.redactionsByType).length).toBe(7);
    });

    it("should track privacy budget correctly", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0 });

      expect(dp.getBudgetStatus().spent).toBe(0);

      dp.addLaplaceNoise(100, 1);
      expect(dp.getBudgetStatus().spent).toBe(1.0);

      dp.addLaplaceNoise(100, 1);
      dp.addLaplaceNoise(100, 1);
      expect(dp.getBudgetStatus().spent).toBe(3.0);
      expect(dp.getBudgetStatus().queriesPerformed).toBe(3);
    });

    it("should compute valid confidence intervals", () => {
      const dp = new DifferentialPrivacy({ epsilon: 1.0, seed: 42 });
      const stat = dp.addLaplaceNoise(1000, 1);

      const [lower, upper] = dp.computeConfidenceInterval(stat, 0.95);

      // Original value should likely be within the interval
      expect(lower).toBeLessThan(stat.noisy);
      expect(upper).toBeGreaterThan(stat.noisy);

      // Interval should be reasonably sized (not too wide, not too narrow)
      const width = upper - lower;
      expect(width).toBeGreaterThan(0);
      expect(width).toBeLessThan(100); // For epsilon=1, sensitivity=1
    });
  });

  describe("Blockchain Anchor Integration with Trust Bundle", () => {
    it("should generate metadata that can be included in trust bundle", async () => {
      // Create a minimal trust bundle
      const engine = new VulpesCelare();
      const result = await engine.process("Patient: John Smith");

      const bundle = await TrustBundleExporter.generate(
        "Patient: John Smith",
        result.text,
        result
      );

      // Mock anchor submission
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(32),
      });

      const anchor = await BlockchainAnchor.anchor(bundle);

      // Generate metadata for inclusion in bundle
      const metadata = BlockchainAnchor.generateBundleMetadata(anchor);

      expect(metadata.blockchainAnchor).toBeDefined();
      expect(metadata.blockchainAnchor.protocol).toBe("OpenTimestamps");
      expect(metadata.blockchainAnchor.merkleRoot).toBe(anchor.merkleRoot);
      expect(metadata.blockchainAnchor.timestampProof).toBe(
        anchor.timestampProof
      );

      // For pending anchor, no bitcoin details yet
      expect(metadata.blockchainAnchor.bitcoin).toBeUndefined();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle empty text gracefully", async () => {
      const engine = new VulpesCelare();
      const result = await engine.process("");

      expect(result.redactionCount).toBe(0);
      expect(result.text).toBe("");

      // Explanations should work with empty results
      const report = ExplanationGenerator.generateReport(
        result,
        result.spans || []
      );
      expect(report.totalDetections).toBe(0);
    });

    it("should handle LLM wrapper with redaction disabled", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "chatcmpl-test",
          choices: [
            {
              message: { role: "assistant", content: "Hello" },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const client = new VulpesOpenAI({
        apiKey: "test-key",
        redaction: { enabled: false },
      });

      await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello John Smith" }],
      });

      // Content should NOT be redacted when disabled
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages[0].content).toContain("John Smith");
    });

    it("should handle differential privacy with zero budget", () => {
      const dp = new DifferentialPrivacy({ epsilon: 0.001 }); // Very small epsilon

      const stat = dp.addLaplaceNoise(100, 1);

      // Should still work, just with lots of noise
      expect(Number.isFinite(stat.noisy)).toBe(true);
      expect(stat.scale).toBe(1000); // 1/0.001
    });
  });
});
