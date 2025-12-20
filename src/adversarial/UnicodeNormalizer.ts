/**
 * UnicodeNormalizer - Adversarial Defense & Sensitivity Enhancement Module
 *
 * This module provides Unicode normalization to:
 * 1. Improve sensitivity by normalizing variant representations
 * 2. Defend against adversarial attacks (homoglyphs, invisible chars)
 *
 * Feature-flagged via VULPES_ADVERSARIAL_DEFENSE environment variable.
 *
 * @module adversarial/UnicodeNormalizer
 */

export interface NormalizationResult {
  /** The normalized text (NFKC normalized, invisibles stripped) */
  normalized: string;
  /** Original text before normalization */
  original: string;
  /** Whether invisible characters were detected */
  hadInvisibleChars: boolean;
  /** Whether homoglyph characters were detected */
  hadHomoglyphs: boolean;
  /** Count of invisible characters removed */
  invisibleCharCount: number;
  /** Count of homoglyph substitutions made */
  homoglyphCount: number;
  /** Suspicion score 0-1 (higher = more likely adversarial) */
  suspiciousScore: number;
  /** Specific characters that were flagged */
  flaggedChars: FlaggedChar[];
}

export interface FlaggedChar {
  char: string;
  codePoint: number;
  position: number;
  type: 'invisible' | 'homoglyph' | 'unusual';
  replacement?: string;
}

// Homoglyph mappings: Cyrillic/Greek lookalikes -> Latin equivalents
const HOMOGLYPH_MAP: Map<string, string> = new Map([
  // Cyrillic lookalikes
  ['\u0410', 'A'],  // Cyrillic A
  ['\u0412', 'B'],  // Cyrillic VE
  ['\u0421', 'C'],  // Cyrillic ES
  ['\u0415', 'E'],  // Cyrillic IE
  ['\u041D', 'H'],  // Cyrillic EN
  ['\u0406', 'I'],  // Cyrillic I
  ['\u0408', 'J'],  // Cyrillic JE
  ['\u041A', 'K'],  // Cyrillic KA
  ['\u041C', 'M'],  // Cyrillic EM
  ['\u041E', 'O'],  // Cyrillic O
  ['\u0420', 'P'],  // Cyrillic ER
  ['\u0422', 'T'],  // Cyrillic TE
  ['\u0425', 'X'],  // Cyrillic HA
  ['\u0423', 'Y'],  // Cyrillic U (looks like Y)
  // Cyrillic lowercase
  ['\u0430', 'a'],  // Cyrillic a
  ['\u0435', 'e'],  // Cyrillic ie
  ['\u043E', 'o'],  // Cyrillic o
  ['\u0440', 'p'],  // Cyrillic er
  ['\u0441', 'c'],  // Cyrillic es
  ['\u0443', 'y'],  // Cyrillic u
  ['\u0445', 'x'],  // Cyrillic ha
  ['\u0456', 'i'],  // Cyrillic i
  // Greek lookalikes
  ['\u0391', 'A'],  // Greek Alpha
  ['\u0392', 'B'],  // Greek Beta
  ['\u0395', 'E'],  // Greek Epsilon
  ['\u0397', 'H'],  // Greek Eta
  ['\u0399', 'I'],  // Greek Iota
  ['\u039A', 'K'],  // Greek Kappa
  ['\u039C', 'M'],  // Greek Mu
  ['\u039D', 'N'],  // Greek Nu
  ['\u039F', 'O'],  // Greek Omicron
  ['\u03A1', 'P'],  // Greek Rho
  ['\u03A4', 'T'],  // Greek Tau
  ['\u03A7', 'X'],  // Greek Chi
  ['\u03A5', 'Y'],  // Greek Upsilon
  ['\u0396', 'Z'],  // Greek Zeta
  // Greek lowercase
  ['\u03B1', 'a'],  // Greek alpha (similar to a)
  ['\u03BF', 'o'],  // Greek omicron
  ['\u03C1', 'p'],  // Greek rho
  // Mathematical symbols that look like letters
  ['\u2212', '-'],  // Minus sign -> hyphen
  ['\uFF0D', '-'],  // Fullwidth hyphen
  ['\u2010', '-'],  // Hyphen
  ['\u2011', '-'],  // Non-breaking hyphen
  ['\u2013', '-'],  // En dash
  ['\u2014', '-'],  // Em dash
  // Fullwidth Latin (often used to evade)
  ['\uFF21', 'A'],  // Fullwidth A
  ['\uFF22', 'B'],  // Fullwidth B
  ['\uFF23', 'C'],  // Fullwidth C
  // ... continues for full alphabet
]);

// Invisible/zero-width characters to strip
const INVISIBLE_CHARS: Set<number> = new Set([
  0x200B, // Zero Width Space
  0x200C, // Zero Width Non-Joiner
  0x200D, // Zero Width Joiner
  0xFEFF, // Byte Order Mark / Zero Width No-Break Space
  0x00AD, // Soft Hyphen
  0x200E, // Left-to-Right Mark
  0x200F, // Right-to-Left Mark
  0x2060, // Word Joiner
  0x2061, // Function Application
  0x2062, // Invisible Times
  0x2063, // Invisible Separator
  0x2064, // Invisible Plus
  0x180E, // Mongolian Vowel Separator
  0x034F, // Combining Grapheme Joiner
]);

// Build a regex pattern for invisible chars
const INVISIBLE_REGEX = new RegExp(
  '[' + Array.from(INVISIBLE_CHARS).map(cp =>
    '\\u' + cp.toString(16).padStart(4, '0')
  ).join('') + ']',
  'g'
);

// Build homoglyph regex for detection
const HOMOGLYPH_REGEX = new RegExp(
  '[' + Array.from(HOMOGLYPH_MAP.keys()).map(char => {
    const cp = char.codePointAt(0)!;
    return '\\u' + cp.toString(16).padStart(4, '0');
  }).join('') + ']',
  'g'
);

export class UnicodeNormalizer {
  private static enabled: boolean | null = null;

  /**
   * Check if adversarial defense is enabled via environment variable
   */
  static isEnabled(): boolean {
    if (this.enabled === null) {
      const envValue = process.env.VULPES_ADVERSARIAL_DEFENSE;
      this.enabled = envValue === '1' || envValue === 'true' || envValue === undefined;
      // Default to enabled (undefined = enabled)
    }
    return this.enabled;
  }

  /**
   * Force enable/disable (useful for testing)
   */
  static setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /**
   * Full normalization pipeline: NFKC + strip invisibles + homoglyph replacement
   */
  static normalize(text: string): NormalizationResult {
    if (!this.isEnabled()) {
      return {
        normalized: text,
        original: text,
        hadInvisibleChars: false,
        hadHomoglyphs: false,
        invisibleCharCount: 0,
        homoglyphCount: 0,
        suspiciousScore: 0,
        flaggedChars: [],
      };
    }

    const flaggedChars: FlaggedChar[] = [];
    let invisibleCharCount = 0;
    let homoglyphCount = 0;

    // Step 1: Detect invisible characters
    for (let i = 0; i < text.length; i++) {
      const codePoint = text.codePointAt(i)!;
      if (INVISIBLE_CHARS.has(codePoint)) {
        flaggedChars.push({
          char: text[i],
          codePoint,
          position: i,
          type: 'invisible',
        });
        invisibleCharCount++;
      }
    }

    // Step 2: Strip invisible characters
    let normalized = text.replace(INVISIBLE_REGEX, '');

    // Step 3: Apply NFKC normalization (handles fullwidth, compatibility chars)
    normalized = normalized.normalize('NFKC');

    // Step 4: Detect and replace homoglyphs
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      const replacement = HOMOGLYPH_MAP.get(char);
      if (replacement) {
        flaggedChars.push({
          char,
          codePoint: char.codePointAt(0)!,
          position: i,
          type: 'homoglyph',
          replacement,
        });
        homoglyphCount++;
      }
    }

    // Step 5: Replace homoglyphs
    normalized = this.replaceHomoglyphs(normalized);

    // Step 6: Calculate suspicion score
    const suspiciousScore = this.calculateSuspicion(
      text,
      invisibleCharCount,
      homoglyphCount
    );

    return {
      normalized,
      original: text,
      hadInvisibleChars: invisibleCharCount > 0,
      hadHomoglyphs: homoglyphCount > 0,
      invisibleCharCount,
      homoglyphCount,
      suspiciousScore,
      flaggedChars,
    };
  }

  /**
   * Quick normalization without detailed tracking (for performance-critical paths)
   */
  static quickNormalize(text: string): string {
    if (!this.isEnabled()) {
      return text;
    }

    // Strip invisibles, NFKC normalize, replace homoglyphs
    let result = text.replace(INVISIBLE_REGEX, '');
    result = result.normalize('NFKC');
    result = this.replaceHomoglyphs(result);
    return result;
  }

  /**
   * Strip only invisible/zero-width characters
   */
  static stripInvisibles(text: string): string {
    return text.replace(INVISIBLE_REGEX, '');
  }

  /**
   * Replace homoglyph characters with their Latin equivalents
   */
  static replaceHomoglyphs(text: string): string {
    let result = '';
    for (const char of text) {
      result += HOMOGLYPH_MAP.get(char) ?? char;
    }
    return result;
  }

  /**
   * Check if text contains invisible characters
   */
  static hasInvisibles(text: string): boolean {
    return INVISIBLE_REGEX.test(text);
  }

  /**
   * Check if text contains homoglyph characters
   */
  static hasHomoglyphs(text: string): boolean {
    HOMOGLYPH_REGEX.lastIndex = 0; // Reset regex state
    return HOMOGLYPH_REGEX.test(text);
  }

  /**
   * Detect if text appears to be an adversarial attack attempt
   */
  static detectAdversarial(text: string): {
    isAdversarial: boolean;
    score: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let score = 0;

    // Check for invisible characters
    const invisibleMatch = text.match(INVISIBLE_REGEX);
    if (invisibleMatch) {
      score += 0.3 * Math.min(invisibleMatch.length / 5, 1);
      reasons.push(`Contains ${invisibleMatch.length} invisible character(s)`);
    }

    // Check for homoglyphs
    HOMOGLYPH_REGEX.lastIndex = 0;
    const homoglyphMatch = text.match(HOMOGLYPH_REGEX);
    if (homoglyphMatch) {
      score += 0.4 * Math.min(homoglyphMatch.length / 3, 1);
      reasons.push(`Contains ${homoglyphMatch.length} homoglyph character(s)`);
    }

    // Check for mixed scripts (Latin + Cyrillic in same word)
    if (this.hasMixedScripts(text)) {
      score += 0.5;
      reasons.push('Mixed Latin and Cyrillic scripts in same text');
    }

    // Check for unusual Unicode categories
    const unusualCount = this.countUnusualChars(text);
    if (unusualCount > 0) {
      score += 0.2 * Math.min(unusualCount / 5, 1);
      reasons.push(`Contains ${unusualCount} unusual Unicode character(s)`);
    }

    return {
      isAdversarial: score >= 0.3,
      score: Math.min(score, 1),
      reasons,
    };
  }

  /**
   * Check for mixed Latin/Cyrillic scripts (common evasion technique)
   */
  private static hasMixedScripts(text: string): boolean {
    const latinRegex = /[a-zA-Z]/;
    const cyrillicRegex = /[\u0400-\u04FF]/;
    return latinRegex.test(text) && cyrillicRegex.test(text);
  }

  /**
   * Count unusual Unicode characters (control chars, private use, etc.)
   */
  private static countUnusualChars(text: string): number {
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      const cp = text.codePointAt(i)!;
      // Control characters (except common whitespace)
      if ((cp < 0x20 && cp !== 0x09 && cp !== 0x0A && cp !== 0x0D) ||
          (cp >= 0x7F && cp <= 0x9F) ||
          // Private Use Area
          (cp >= 0xE000 && cp <= 0xF8FF) ||
          // Supplementary Private Use
          (cp >= 0xF0000)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Calculate overall suspicion score
   */
  private static calculateSuspicion(
    text: string,
    invisibleCount: number,
    homoglyphCount: number
  ): number {
    if (text.length === 0) return 0;

    let score = 0;

    // Weight by density of suspicious characters
    const invisibleDensity = invisibleCount / text.length;
    const homoglyphDensity = homoglyphCount / text.length;

    score += invisibleDensity * 0.4;
    score += homoglyphDensity * 0.4;

    // Mixed scripts is highly suspicious
    if (this.hasMixedScripts(text)) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  /**
   * Get all supported homoglyph mappings (for debugging/testing)
   */
  static getHomoglyphMappings(): ReadonlyMap<string, string> {
    return HOMOGLYPH_MAP;
  }

  /**
   * Get all invisible character code points (for debugging/testing)
   */
  static getInvisibleCodePoints(): ReadonlySet<number> {
    return INVISIBLE_CHARS;
  }
}

// Default export for convenience
export default UnicodeNormalizer;
