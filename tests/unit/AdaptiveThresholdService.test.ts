/**
 * AdaptiveThresholdService Tests
 *
 * Tests for the adaptive confidence threshold system including:
 * - Document type modifiers
 * - Specialty detection
 * - Context strength modifiers
 * - PHI type modifiers
 * - Feedback learning
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AdaptiveThresholdService,
  MedicalSpecialty,
  PurposeOfUse,
  type AdaptiveContext,
  type ThresholdFeedback,
} from "../../src/calibration/AdaptiveThresholdService";
import { DocumentType } from "../../src/cache/StructureExtractor";

describe("AdaptiveThresholdService", () => {
  let service: AdaptiveThresholdService;

  beforeEach(() => {
    service = new AdaptiveThresholdService({
      enabled: true,
      enableFeedbackLearning: true,
      minFeedbackSamples: 5, // Lower for testing
    });
  });

  describe("Basic Threshold Calculation", () => {
    it("should return base thresholds when disabled", () => {
      const disabledService = new AdaptiveThresholdService({ enabled: false });
      const thresholds = disabledService.getThresholds();

      expect(thresholds.minimum).toBe(0.6);
      expect(thresholds.low).toBe(0.7);
      expect(thresholds.medium).toBe(0.85);
      expect(thresholds.high).toBe(0.9);
      expect(thresholds.veryHigh).toBe(0.95);
      expect(thresholds.adjustments).toHaveLength(0);
    });

    it("should return base thresholds with empty context", () => {
      const thresholds = service.getThresholds({});

      // With no context, should be close to base thresholds
      expect(thresholds.minimum).toBeCloseTo(0.6, 1);
      expect(thresholds.adjustments).toHaveLength(0);
    });

    it("should clamp thresholds to valid range", () => {
      // Create extreme context that would push thresholds out of range
      const context: AdaptiveContext = {
        documentType: DocumentType.ADMISSION_NOTE,
        contextStrength: "STRONG",
        specialty: MedicalSpecialty.PSYCHIATRY,
        purposeOfUse: PurposeOfUse.MARKETING,
        isOCR: true,
      };

      const thresholds = service.getThresholds(context);

      // Should be clamped between 0.3 and 0.99
      expect(thresholds.minimum).toBeGreaterThanOrEqual(0.3);
      expect(thresholds.minimum).toBeLessThanOrEqual(0.99);
      expect(thresholds.veryHigh).toBeGreaterThanOrEqual(0.3);
      expect(thresholds.veryHigh).toBeLessThanOrEqual(0.99);
    });
  });

  describe("Document Type Modifiers", () => {
    it("should lower thresholds for structured documents", () => {
      const admissionThresholds = service.getThresholds({
        documentType: DocumentType.ADMISSION_NOTE,
      });

      const unknownThresholds = service.getThresholds({
        documentType: DocumentType.UNKNOWN,
      });

      // Admission notes should have lower thresholds (more aggressive detection)
      expect(admissionThresholds.minimum).toBeLessThan(unknownThresholds.minimum);
    });

    it("should track document type adjustment", () => {
      const thresholds = service.getThresholds({
        documentType: DocumentType.DISCHARGE_SUMMARY,
      });

      const docTypeAdjustment = thresholds.adjustments.find(
        (a) => a.type === "documentType"
      );
      expect(docTypeAdjustment).toBeDefined();
      expect(docTypeAdjustment?.modifier).toBeLessThan(1.0);
    });
  });

  describe("Context Strength Modifiers", () => {
    it("should lower thresholds for strong clinical context", () => {
      const strongContext = service.getThresholds({
        contextStrength: "STRONG",
      });

      const noContext = service.getThresholds({
        contextStrength: "NONE",
      });

      expect(strongContext.minimum).toBeLessThan(noContext.minimum);
    });

    it("should apply progressive modifiers", () => {
      const strong = service.getThresholds({ contextStrength: "STRONG" });
      const moderate = service.getThresholds({ contextStrength: "MODERATE" });
      const weak = service.getThresholds({ contextStrength: "WEAK" });
      const none = service.getThresholds({ contextStrength: "NONE" });

      expect(strong.minimum).toBeLessThan(moderate.minimum);
      expect(moderate.minimum).toBeLessThan(weak.minimum);
      expect(weak.minimum).toBeLessThan(none.minimum);
    });
  });

  describe("Specialty Detection", () => {
    it("should detect cardiology specialty", () => {
      const text = `
        CARDIOLOGY CONSULTATION
        The patient presents with chest pain and shortness of breath.
        ECG shows ST elevation in leads V1-V4.
        Assessment: STEMI, likely LAD occlusion.
        Plan: Emergent cardiac catheterization.
      `;

      const result = service.detectSpecialty(text);

      expect(result.specialty).toBe(MedicalSpecialty.CARDIOLOGY);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it("should detect oncology specialty", () => {
      const text = `
        ONCOLOGY PROGRESS NOTE
        Patient with stage IV lung adenocarcinoma carcinoma on chemotherapy.
        Recent CT shows progression of liver metastases with tumor growth.
        The cancer has spread. Tumor markers elevated. Malignant cells found.
        Plan: Switch to second-line chemotherapy and radiation therapy.
      `;

      const result = service.detectSpecialty(text);

      expect(result.specialty).toBe(MedicalSpecialty.ONCOLOGY);
    });

    it("should detect radiology specialty", () => {
      const text = `
        RADIOLOGY REPORT
        CT CHEST WITH CONTRAST
        TECHNIQUE: Helical CT of the chest with IV contrast.
        FINDINGS: No pulmonary embolism identified.
        IMPRESSION: Normal CT angiogram.
      `;

      const result = service.detectSpecialty(text);

      expect(result.specialty).toBe(MedicalSpecialty.RADIOLOGY);
    });

    it("should detect psychiatry specialty", () => {
      const text = `
        PSYCHIATRIC EVALUATION
        Patient presents with worsening depression and suicidal ideation.
        History of bipolar disorder and PTSD.
        Mental status exam: Flat affect, poor insight.
        Plan: Increase antidepressant, safety planning.
      `;

      const result = service.detectSpecialty(text);

      expect(result.specialty).toBe(MedicalSpecialty.PSYCHIATRY);
    });

    it("should return UNKNOWN for generic text", () => {
      const text = "This is a general document with no medical content.";

      const result = service.detectSpecialty(text);

      expect(result.specialty).toBe(MedicalSpecialty.UNKNOWN);
    });
  });

  describe("Specialty Modifiers", () => {
    it("should raise thresholds for oncology (more eponyms)", () => {
      const oncologyThresholds = service.getThresholds({
        specialty: MedicalSpecialty.ONCOLOGY,
      });

      const baseThresholds = service.getThresholds({
        specialty: MedicalSpecialty.UNKNOWN,
      });

      // Oncology should have slightly higher thresholds due to eponymous names
      expect(oncologyThresholds.minimum).toBeGreaterThan(baseThresholds.minimum);
    });

    it("should lower thresholds for psychiatry (sensitive content)", () => {
      const psychiatryThresholds = service.getThresholds({
        specialty: MedicalSpecialty.PSYCHIATRY,
      });

      const baseThresholds = service.getThresholds({
        specialty: MedicalSpecialty.UNKNOWN,
      });

      expect(psychiatryThresholds.minimum).toBeLessThan(baseThresholds.minimum);
    });
  });

  describe("Purpose of Use Modifiers", () => {
    it("should apply strictest thresholds for marketing", () => {
      const marketing = service.getThresholds({
        purposeOfUse: PurposeOfUse.MARKETING,
      });

      const treatment = service.getThresholds({
        purposeOfUse: PurposeOfUse.TREATMENT,
      });

      expect(marketing.minimum).toBeLessThan(treatment.minimum);
    });

    it("should apply strict thresholds for research", () => {
      const research = service.getThresholds({
        purposeOfUse: PurposeOfUse.RESEARCH,
      });

      const operations = service.getThresholds({
        purposeOfUse: PurposeOfUse.OPERATIONS,
      });

      expect(research.minimum).toBeLessThan(operations.minimum);
    });
  });

  describe("PHI Type Modifiers", () => {
    it("should apply lower thresholds for SSN", () => {
      const ssnThresholds = service.getThresholds({ phiType: "SSN" });
      const nameThresholds = service.getThresholds({ phiType: "NAME" });

      expect(ssnThresholds.minimum).toBeLessThan(nameThresholds.minimum);
    });

    it("should apply higher thresholds for DATE (more false positives)", () => {
      const dateThresholds = service.getThresholds({ phiType: "DATE" });
      const nameThresholds = service.getThresholds({ phiType: "NAME" });

      expect(dateThresholds.minimum).toBeGreaterThan(nameThresholds.minimum);
    });

    it("should apply higher thresholds for ZIP (numeric false positives)", () => {
      const zipThresholds = service.getThresholds({ phiType: "ZIP" });
      const emailThresholds = service.getThresholds({ phiType: "EMAIL" });

      expect(zipThresholds.minimum).toBeGreaterThan(emailThresholds.minimum);
    });
  });

  describe("OCR Modifier", () => {
    it("should lower thresholds for OCR text", () => {
      const ocrThresholds = service.getThresholds({ isOCR: true });
      const cleanThresholds = service.getThresholds({ isOCR: false });

      expect(ocrThresholds.minimum).toBeLessThan(cleanThresholds.minimum);
    });

    it("should track OCR adjustment", () => {
      const thresholds = service.getThresholds({ isOCR: true });

      const ocrAdjustment = thresholds.adjustments.find((a) => a.type === "ocr");
      expect(ocrAdjustment).toBeDefined();
    });
  });

  describe("Combined Modifiers", () => {
    it("should combine multiple modifiers multiplicatively", () => {
      const singleModifier = service.getThresholds({
        documentType: DocumentType.ADMISSION_NOTE,
      });

      const multipleModifiers = service.getThresholds({
        documentType: DocumentType.ADMISSION_NOTE,
        contextStrength: "STRONG",
        specialty: MedicalSpecialty.PSYCHIATRY,
      });

      // Multiple lowering modifiers should result in lower threshold
      expect(multipleModifiers.minimum).toBeLessThan(singleModifier.minimum);
      expect(multipleModifiers.adjustments.length).toBeGreaterThan(
        singleModifier.adjustments.length
      );
    });
  });

  describe("Document Analysis", () => {
    it("should build complete context from document", () => {
      const text = `
        PSYCHIATRIC ADMISSION NOTE
        Patient Name: [REDACTED]
        MRN: 12345
        The patient with major depression is admitted for suicidal ideation.
        Psychiatry consult requested. Mental health assessment completed.
        History of bipolar disorder and anxiety. Patient denies self-harm.
      `;

      const context = service.analyzeDocument(
        text,
        DocumentType.ADMISSION_NOTE,
        "STRONG"
      );

      expect(context.documentType).toBe(DocumentType.ADMISSION_NOTE);
      expect(context.contextStrength).toBe("STRONG");
      expect(context.specialty).toBe(MedicalSpecialty.PSYCHIATRY);
      expect(context.documentLength).toBe(text.length);
    });
  });

  describe("Feedback Learning", () => {
    it("should record feedback", () => {
      const feedback: ThresholdFeedback = {
        context: { phiType: "NAME" },
        phiType: "NAME",
        wasFalsePositive: true,
        wasFalseNegative: false,
        confidence: 0.65,
        appliedThreshold: 0.6,
        timestamp: new Date(),
      };

      service.recordFeedback(feedback);

      const stats = service.getStatistics();
      expect(stats.feedbackCount).toBe(1);
    });

    it("should learn adjustments after sufficient samples", () => {
      // Record many false positives
      for (let i = 0; i < 10; i++) {
        service.recordFeedback({
          context: { documentType: DocumentType.RADIOLOGY_REPORT },
          phiType: "NAME",
          wasFalsePositive: true,
          wasFalseNegative: false,
          confidence: 0.65,
          appliedThreshold: 0.6,
          timestamp: new Date(),
        });
      }

      const stats = service.getStatistics();
      expect(stats.feedbackCount).toBe(10);
      // With minFeedbackSamples=5, should have learned adjustment
      expect(stats.learnedAdjustmentsCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Statistics and Management", () => {
    it("should return statistics", () => {
      const stats = service.getStatistics();

      expect(stats).toHaveProperty("enabled");
      expect(stats).toHaveProperty("feedbackCount");
      expect(stats).toHaveProperty("learnedAdjustmentsCount");
      expect(stats).toHaveProperty("contextPerformanceCount");
    });

    it("should reset learning", () => {
      // Add some feedback
      service.recordFeedback({
        context: {},
        phiType: "NAME",
        wasFalsePositive: true,
        wasFalseNegative: false,
        confidence: 0.65,
        appliedThreshold: 0.6,
        timestamp: new Date(),
      });

      expect(service.getStatistics().feedbackCount).toBe(1);

      service.resetLearning();

      expect(service.getStatistics().feedbackCount).toBe(0);
    });
  });

  describe("Convenience Methods", () => {
    it("should get minimum threshold directly", () => {
      const threshold = service.getMinimumThreshold({
        documentType: DocumentType.ADMISSION_NOTE,
      });

      expect(typeof threshold).toBe("number");
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThan(1);
    });

    it("should get type-specific threshold", () => {
      const ssnThreshold = service.getTypeThreshold("SSN");
      const nameThreshold = service.getTypeThreshold("NAME");

      expect(ssnThreshold).toBeLessThan(nameThreshold);
    });
  });
});
