/**
 * Tests for ExplanationGenerator
 */

import { describe, it, expect } from "vitest";
import {
  ExplanationGenerator,
  RedactionExplanation,
} from "../../src/explanations";
import { Span, FilterType } from "../../src/models/Span";

describe("ExplanationGenerator", () => {
  // Helper to create a test span
  function createTestSpan(overrides: Partial<Span> = {}): Span {
    return new Span({
      text: "John Smith",
      originalValue: "John Smith",
      characterStart: 0,
      characterEnd: 10,
      filterType: FilterType.NAME,
      confidence: 0.85,
      priority: 80,
      context: "test",
      window: ["patient", "name", ":", "John", "Smith"],
      replacement: "[NAME]",
      salt: null,
      pattern: null,
      applied: false,
      ignored: false,
      ambiguousWith: [],
      disambiguationScore: null,
      ...overrides,
    });
  }

  describe("explain()", () => {
    it("should generate explanation for a NAME span", () => {
      const span = createTestSpan();
      const explanation = ExplanationGenerator.explain(span);

      expect(explanation.detectedValue).toBe("John Smith");
      expect(explanation.phiType).toBe(FilterType.NAME);
      expect(explanation.finalConfidence).toBe(0.85);
      expect(explanation.decision).toBe("REDACT");
      expect(explanation.position.start).toBe(0);
      expect(explanation.position.end).toBe(10);
    });

    it("should detect context indicators from window", () => {
      const span = createTestSpan({
        window: ["patient", "name", ":", "John", "Smith"],
      });
      const explanation = ExplanationGenerator.explain(span);

      expect(explanation.contextIndicators).toContain("preceded by 'patient'");
      expect(explanation.contextIndicators).toContain("near 'name' keyword");
    });

    it("should mark as ALLOW when below threshold", () => {
      const span = createTestSpan({ confidence: 0.4 });
      const explanation = ExplanationGenerator.explain(span, 0.6);

      expect(explanation.decision).toBe("ALLOW");
      expect(explanation.summary).toContain("Allowed");
    });

    it("should include alternative types in explanation", () => {
      const span = createTestSpan({
        ambiguousWith: [FilterType.PROVIDER_NAME],
      });
      const explanation = ExplanationGenerator.explain(span);

      expect(explanation.alternativeTypes).toContain(FilterType.PROVIDER_NAME);
    });

    it("should identify pattern-based detection", () => {
      const span = createTestSpan({
        filterType: FilterType.SSN,
        text: "123-45-6789",
        pattern: "\\d{3}-\\d{2}-\\d{4}",
      });
      const explanation = ExplanationGenerator.explain(span);

      expect(explanation.patternMatched).toBe("\\d{3}-\\d{2}-\\d{4}");
      expect(explanation.matchedBy).toContain("regex pattern");
    });

    it("should identify dictionary-based detection for NAME", () => {
      const span = createTestSpan();
      const explanation = ExplanationGenerator.explain(span);

      expect(explanation.dictionaryHit).toBe(true);
      expect(explanation.matchedBy).toContain("dictionary");
    });

    it("should generate confidence factors", () => {
      const span = createTestSpan();
      const explanation = ExplanationGenerator.explain(span);

      expect(explanation.confidenceFactors.length).toBeGreaterThan(0);
      expect(explanation.confidenceFactors[0]).toHaveProperty("factor");
      expect(explanation.confidenceFactors[0]).toHaveProperty("impact");
      expect(explanation.confidenceFactors[0]).toHaveProperty("reason");
    });

    it("should generate readable summary", () => {
      const span = createTestSpan();
      const explanation = ExplanationGenerator.explain(span);

      expect(explanation.summary).toContain("Person Name");
      expect(explanation.summary).toContain("confidence");
      expect(explanation.summary).toContain("%");
    });
  });

  describe("generateReport()", () => {
    it("should generate complete report for multiple spans", () => {
      const spans = [
        createTestSpan({ text: "John Smith", filterType: FilterType.NAME }),
        createTestSpan({
          text: "123-45-6789",
          filterType: FilterType.SSN,
          characterStart: 20,
          characterEnd: 31,
        }),
        createTestSpan({
          text: "john@example.com",
          filterType: FilterType.EMAIL,
          characterStart: 40,
          characterEnd: 56,
        }),
      ];

      const result = {
        text: "redacted",
        redactionCount: 3,
        breakdown: { NAME: 1, SSN: 1, EMAIL: 1 },
        executionTimeMs: 5,
      };

      const report = ExplanationGenerator.generateReport(result, spans);

      expect(report.totalDetections).toBe(3);
      expect(report.redactedCount).toBe(3);
      expect(report.allowedCount).toBe(0);
      expect(report.explanations.length).toBe(3);
      expect(report.byType["NAME"]).toBe(1);
      expect(report.byType["SSN"]).toBe(1);
      expect(report.byType["EMAIL"]).toBe(1);
    });

    it("should count allowed and redacted separately", () => {
      const spans = [
        createTestSpan({ confidence: 0.9 }),
        createTestSpan({ confidence: 0.3 }),
      ];

      const result = {
        text: "redacted",
        redactionCount: 1,
        breakdown: { NAME: 2 },
        executionTimeMs: 5,
      };

      const report = ExplanationGenerator.generateReport(result, spans);

      expect(report.redactedCount).toBe(1);
      expect(report.allowedCount).toBe(1);
    });
  });

  describe("exportAuditDocument()", () => {
    it("should generate markdown document", () => {
      const spans = [
        createTestSpan({ text: "John Smith", filterType: FilterType.NAME }),
      ];

      const result = {
        text: "redacted",
        redactionCount: 1,
        breakdown: { NAME: 1 },
        executionTimeMs: 5,
      };

      const doc = ExplanationGenerator.exportAuditDocument(result, spans);

      expect(doc).toContain("# Redaction Audit Report");
      expect(doc).toContain("## Summary");
      expect(doc).toContain("## Detailed Explanations");
      expect(doc).toContain("Person Name");
      expect(doc).toContain("Generated by Vulpes Celare");
    });

    it("should mask sensitive values in document", () => {
      const spans = [
        createTestSpan({
          text: "123-45-6789",
          filterType: FilterType.SSN,
        }),
      ];

      const result = {
        text: "redacted",
        redactionCount: 1,
        breakdown: { SSN: 1 },
        executionTimeMs: 5,
      };

      const doc = ExplanationGenerator.exportAuditDocument(result, spans);

      // Should not contain full SSN
      expect(doc).not.toContain("123-45-6789");
      // Should contain masked version
      expect(doc).toContain("*");
    });

    it("should include context when requested", () => {
      const spans = [
        createTestSpan({
          window: ["patient", "name", ":", "John", "Smith"],
        }),
      ];

      const result = {
        text: "redacted",
        redactionCount: 1,
        breakdown: { NAME: 1 },
        executionTimeMs: 5,
      };

      const doc = ExplanationGenerator.exportAuditDocument(result, spans, {
        includeContext: true,
      });

      expect(doc).toContain("Context Indicators");
    });

    it("should include confidence factors when requested", () => {
      const spans = [createTestSpan()];

      const result = {
        text: "redacted",
        redactionCount: 1,
        breakdown: { NAME: 1 },
        executionTimeMs: 5,
      };

      const doc = ExplanationGenerator.exportAuditDocument(result, spans, {
        includeFactors: true,
      });

      expect(doc).toContain("Confidence Factors");
    });
  });
});
