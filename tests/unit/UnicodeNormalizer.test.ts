/**
 * UnicodeNormalizer Test Suite - Adversarial Defense Testing
 *
 * Tests the UnicodeNormalizer module for:
 * 1. Homoglyph attack detection and normalization
 * 2. Invisible character detection and stripping
 * 3. Mixed script detection (Latin + Cyrillic)
 * 4. Adversarial attack scoring
 *
 * @module tests/unit/UnicodeNormalizer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnicodeNormalizer } from '../../src/adversarial/UnicodeNormalizer';

describe('UnicodeNormalizer', () => {
  beforeEach(() => {
    UnicodeNormalizer.setEnabled(true);
  });

  afterEach(() => {
    UnicodeNormalizer.setEnabled(true);
  });

  describe('Basic Normalization', () => {
    it('should pass through clean ASCII text unchanged', () => {
      const input = 'John Smith';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe(input);
      expect(result.hadHomoglyphs).toBe(false);
      expect(result.hadInvisibleChars).toBe(false);
      expect(result.suspiciousScore).toBe(0);
    });

    it('should apply NFKC normalization to fullwidth characters', () => {
      // Fullwidth A is \uFF21
      const input = '\uFF21dam Smith';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('Adam Smith');
    });

    it('should return original text when disabled', () => {
      UnicodeNormalizer.setEnabled(false);
      const input = '\u0410dam'; // Cyrillic A
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe(input);
      expect(result.hadHomoglyphs).toBe(false);
    });
  });

  describe('Homoglyph Detection', () => {
    it('should detect and replace Cyrillic A with Latin A', () => {
      // \u0410 is Cyrillic А (looks like Latin A)
      const input = '\u0410dam Smith';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('Adam Smith');
      expect(result.hadHomoglyphs).toBe(true);
      expect(result.homoglyphCount).toBe(1);
    });

    it('should detect and replace Cyrillic lowercase letters', () => {
      // \u0430 is Cyrillic а (maps to 'a'), \u043E is Cyrillic о (maps to 'o')
      const input = 'J\u043Ehn Sm\u0430th';
      const result = UnicodeNormalizer.normalize(input);
      // Cyrillic а -> a and о -> o, so "Smath" stays "Smath" (a->a is identity)
      expect(result.normalized).toBe('John Smath');
      expect(result.hadHomoglyphs).toBe(true);
      expect(result.homoglyphCount).toBe(2);
    });

    it('should detect Greek lookalikes', () => {
      // \u039F is Greek Omicron (looks like O)
      const input = 'J\u039Fhn';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('JOhn');
      expect(result.hadHomoglyphs).toBe(true);
    });

    it('should handle multiple homoglyphs in a single name', () => {
      // \u0410 = Cyrillic A, \u0435 = Cyrillic e, \u0445 = Cyrillic x
      const input = '\u0410l\u0435\u0445ander';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('Alexander');
      expect(result.homoglyphCount).toBe(3);
    });

    it('should provide flagged character details', () => {
      const input = '\u0410dam';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.flaggedChars.length).toBeGreaterThan(0);
      const flagged = result.flaggedChars[0];
      expect(flagged.type).toBe('homoglyph');
      expect(flagged.codePoint).toBe(0x0410);
      expect(flagged.replacement).toBe('A');
    });
  });

  describe('Invisible Character Detection', () => {
    it('should detect and strip zero-width space', () => {
      // \u200B is Zero Width Space
      const input = 'John\u200BSmith';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('JohnSmith');
      expect(result.hadInvisibleChars).toBe(true);
      expect(result.invisibleCharCount).toBe(1);
    });

    it('should detect and strip zero-width joiner', () => {
      // \u200D is Zero Width Joiner
      const input = 'John\u200DSmith';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('JohnSmith');
      expect(result.hadInvisibleChars).toBe(true);
    });

    it('should detect and strip zero-width non-joiner', () => {
      // \u200C is Zero Width Non-Joiner
      const input = 'John\u200CSmith';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('JohnSmith');
      expect(result.hadInvisibleChars).toBe(true);
    });

    it('should detect and strip BOM / ZWNBSP', () => {
      // \uFEFF is Byte Order Mark / Zero Width No-Break Space
      const input = '\uFEFFJohn Smith';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('John Smith');
      expect(result.hadInvisibleChars).toBe(true);
    });

    it('should detect and strip soft hyphen', () => {
      // \u00AD is Soft Hyphen
      const input = 'John\u00ADSmith';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('JohnSmith');
      expect(result.hadInvisibleChars).toBe(true);
    });

    it('should handle multiple invisible characters', () => {
      const input = 'J\u200Bo\u200Ch\u200Dn';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('John');
      expect(result.invisibleCharCount).toBe(3);
    });
  });

  describe('Adversarial Attack Detection', () => {
    it('should identify adversarial text with homoglyphs', () => {
      const input = '\u0410dam \u0421mith'; // Cyrillic A and C
      const result = UnicodeNormalizer.detectAdversarial(input);
      expect(result.isAdversarial).toBe(true);
      expect(result.score).toBeGreaterThan(0.3);
    });

    it('should identify adversarial text with invisible chars', () => {
      // Use more invisible chars to trigger the threshold (score >= 0.3)
      const input = 'J\u200Bo\u200Ch\u200Dn\u200B\u200CSmith';
      const result = UnicodeNormalizer.detectAdversarial(input);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons[0]).toContain('invisible character');
    });

    it('should flag mixed Latin/Cyrillic scripts', () => {
      // Mix of Latin 'J' and Cyrillic 'о' (U+043E)
      const input = 'J\u043Ehn';
      const result = UnicodeNormalizer.detectAdversarial(input);
      expect(result.isAdversarial).toBe(true);
      expect(result.reasons).toContain('Mixed Latin and Cyrillic scripts in same text');
    });

    it('should not flag clean text as adversarial', () => {
      const input = 'John Smith';
      const result = UnicodeNormalizer.detectAdversarial(input);
      expect(result.isAdversarial).toBe(false);
      expect(result.score).toBe(0);
    });

    it('should calculate suspicion score based on character density', () => {
      // Text with high density of suspicious characters
      const input = '\u0410\u0412\u0421'; // All Cyrillic
      const result = UnicodeNormalizer.normalize(input);
      expect(result.suspiciousScore).toBeGreaterThan(0.3);
    });
  });

  describe('Quick Normalize Performance', () => {
    it('should quickly normalize homoglyphs', () => {
      const input = '\u0410dam';
      const result = UnicodeNormalizer.quickNormalize(input);
      expect(result).toBe('Adam');
    });

    it('should quickly strip invisibles', () => {
      const input = 'John\u200BSmith';
      const result = UnicodeNormalizer.quickNormalize(input);
      expect(result).toBe('JohnSmith');
    });

    it('should handle combined attacks', () => {
      const input = '\u0410d\u200Bam \u0421m\u200Cith';
      const result = UnicodeNormalizer.quickNormalize(input);
      expect(result).toBe('Adam Cmith'); // Note: \u0421 -> C
    });
  });

  describe('Helper Methods', () => {
    it('should detect invisibles with hasInvisibles', () => {
      expect(UnicodeNormalizer.hasInvisibles('John\u200BSmith')).toBe(true);
      expect(UnicodeNormalizer.hasInvisibles('John Smith')).toBe(false);
    });

    it('should detect homoglyphs with hasHomoglyphs', () => {
      expect(UnicodeNormalizer.hasHomoglyphs('\u0410dam')).toBe(true);
      expect(UnicodeNormalizer.hasHomoglyphs('Adam')).toBe(false);
    });

    it('should expose homoglyph mappings', () => {
      const mappings = UnicodeNormalizer.getHomoglyphMappings();
      expect(mappings.get('\u0410')).toBe('A');
      expect(mappings.get('\u0421')).toBe('C');
    });

    it('should expose invisible code points', () => {
      const invisibles = UnicodeNormalizer.getInvisibleCodePoints();
      expect(invisibles.has(0x200B)).toBe(true);
      expect(invisibles.has(0x200C)).toBe(true);
      expect(invisibles.has(0x200D)).toBe(true);
    });
  });

  describe('Real-World Adversarial Examples', () => {
    it('should normalize SSN with invisible char insertion', () => {
      // Adversary inserts zero-width space to evade SSN detection
      const input = '123-45\u200B-6789';
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('123-45-6789');
      expect(result.hadInvisibleChars).toBe(true);
    });

    it('should normalize name with Cyrillic substitution', () => {
      // Adversary uses Cyrillic letters that look like Latin
      const input = 'M\u0430ry J\u043Ehns\u043En'; // a, o, o
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('Mary Johnson');
    });

    it('should handle Unicode normalization edge cases', () => {
      // Combined diacritics should normalize correctly
      const input = 'Jose\u0301'; // e followed by combining acute accent
      const result = UnicodeNormalizer.normalize(input);
      // NFKC should combine these
      expect(result.normalized).toBe('José');
    });

    it('should normalize dates with homoglyphs', () => {
      // Using Cyrillic O instead of 0
      const input = '1\u043E/15/2\u043E24'; // o for 0
      const result = UnicodeNormalizer.normalize(input);
      expect(result.normalized).toBe('1o/15/2o24');
      // Note: homoglyph mapping is lowercase o -> o, uppercase O -> O
    });
  });
});
