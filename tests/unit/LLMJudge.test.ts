/**
 * LLMJudge Test Suite
 *
 * Tests the LLM-as-Judge validation module for:
 * 1. Single detection validation
 * 2. Batch validation
 * 3. Caching behavior
 * 4. Heuristic validation logic
 *
 * @module tests/unit/LLMJudge
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LLMJudge, PHIDetection } from '../../src/validation/LLMJudge';

describe('LLMJudge', () => {
  let judge: LLMJudge;

  beforeEach(() => {
    LLMJudge.resetInstance();
    judge = LLMJudge.getInstance({ provider: 'mock' });
    judge.setEnabled(true);
  });

  afterEach(() => {
    LLMJudge.resetInstance();
  });

  describe('Single Validation', () => {
    it('should validate a valid NAME detection', async () => {
      const detection: PHIDetection = {
        text: 'John Smith',
        phiType: 'NAME',
        confidence: 0.8,
        context: 'Patient: John Smith was admitted',
      };

      const verdict = await judge.validate(detection);

      expect(verdict.isValid).toBe(true);
      expect(verdict.recommendation).toBe('REDACT');
    });

    it('should skip validation for high confidence detections', async () => {
      const detection: PHIDetection = {
        text: 'John Smith',
        phiType: 'NAME',
        confidence: 0.98, // Above skip threshold
        context: 'Patient: John Smith was admitted',
      };

      const verdict = await judge.validate(detection);

      expect(verdict.isValid).toBe(true);
      expect(verdict.reasoning).toContain('High confidence');
    });

    it('should validate SSN format', async () => {
      const detection: PHIDetection = {
        text: '123-45-6789',
        phiType: 'SSN',
        confidence: 0.85,
        context: 'SSN: 123-45-6789',
      };

      const verdict = await judge.validate(detection);

      expect(verdict.isValid).toBe(true);
    });

    it('should validate DATE format', async () => {
      const detection: PHIDetection = {
        text: '01/15/2024',
        phiType: 'DATE',
        confidence: 0.9,
        context: 'DOB: 01/15/2024',
      };

      const verdict = await judge.validate(detection);

      expect(verdict.isValid).toBe(true);
    });

    it('should validate EMAIL format', async () => {
      const detection: PHIDetection = {
        text: 'john.smith@email.com',
        phiType: 'EMAIL',
        confidence: 0.9,
        context: 'Contact: john.smith@email.com',
      };

      const verdict = await judge.validate(detection);

      expect(verdict.isValid).toBe(true);
    });

    it('should return default verdict when disabled', async () => {
      judge.setEnabled(false);

      const detection: PHIDetection = {
        text: 'John Smith',
        phiType: 'NAME',
        confidence: 0.7,
      };

      const verdict = await judge.validate(detection);

      expect(verdict.isValid).toBe(true);
      expect(verdict.reasoning).toContain('High confidence');
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple detections', async () => {
      const detections: PHIDetection[] = [
        { text: 'John Smith', phiType: 'NAME', confidence: 0.8 },
        { text: '01/15/2024', phiType: 'DATE', confidence: 0.85 },
        { text: '123-45-6789', phiType: 'SSN', confidence: 0.9 },
      ];

      const result = await judge.validateBatch(detections);

      expect(result.total).toBe(3);
      expect(result.valid).toBeGreaterThan(0);
      expect(result.verdicts.size).toBe(3);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle empty batch', async () => {
      const result = await judge.validateBatch([]);

      expect(result.total).toBe(0);
      expect(result.valid).toBe(0);
      expect(result.verdicts.size).toBe(0);
    });
  });

  describe('Caching', () => {
    it('should cache validation results', async () => {
      const detection: PHIDetection = {
        text: 'John Smith',
        phiType: 'NAME',
        confidence: 0.8,
        context: 'Patient name',
      };

      // First call
      await judge.validate(detection);

      // Check cache
      const stats = judge.getCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should clear cache', async () => {
      const detection: PHIDetection = {
        text: 'John Smith',
        phiType: 'NAME',
        confidence: 0.8,
      };

      await judge.validate(detection);
      judge.clearCache();

      const stats = judge.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('Prompt Generation', () => {
    it('should generate validation prompt', () => {
      const detection: PHIDetection = {
        text: 'John Smith',
        phiType: 'NAME',
        confidence: 0.85,
        context: 'Patient: John Smith',
      };

      const prompt = judge.getPrompt(detection);

      expect(prompt).toContain('John Smith');
      expect(prompt).toContain('NAME');
      expect(prompt).toContain('0.85');
      expect(prompt).toContain('Patient: John Smith');
    });

    it('should handle missing context', () => {
      const detection: PHIDetection = {
        text: 'John Smith',
        phiType: 'NAME',
        confidence: 0.85,
      };

      const prompt = judge.getPrompt(detection);

      expect(prompt).toContain('No context available');
    });
  });

  describe('Heuristic Validation', () => {
    it('should validate single-word names as valid', async () => {
      const detection: PHIDetection = {
        text: 'Johnson',
        phiType: 'NAME',
        confidence: 0.7,
      };

      const verdict = await judge.validate(detection);
      // Single title-case word should be valid
      expect(verdict.isValid).toBe(true);
    });

    it('should validate PHONE with 10+ digits', async () => {
      const detection: PHIDetection = {
        text: '(555) 123-4567',
        phiType: 'PHONE',
        confidence: 0.8,
      };

      const verdict = await judge.validate(detection);
      expect(verdict.isValid).toBe(true);
    });

    it('should validate ADDRESS with numbers and letters', async () => {
      const detection: PHIDetection = {
        text: '123 Main Street',
        phiType: 'ADDRESS',
        confidence: 0.8,
      };

      const verdict = await judge.validate(detection);
      expect(verdict.isValid).toBe(true);
    });
  });
});
