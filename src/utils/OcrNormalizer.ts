/**
 * OcrNormalizer - Centralized OCR Error Correction
 *
 * This module provides a single-pass OCR normalization that should be applied
 * BEFORE pattern matching, rather than encoding OCR errors into 60+ regex patterns.
 *
 * Common OCR substitutions:
 * - 0 ↔ O, o
 * - 1 ↔ l, I, |, !
 * - 2 ↔ Z
 * - 5 ↔ S, s
 * - 6 ↔ G, b
 * - 8 ↔ B
 * - 9 ↔ g, q
 *
 * @module utils
 */

/**
 * OCR character mapping for digits to letters (for normalizing TO digits)
 */
const OCR_TO_DIGIT: Record<string, string> = {
  O: "0",
  o: "0",
  I: "1",
  l: "1",
  "|": "1",
  "!": "1",
  Z: "2",
  z: "2",
  S: "5",
  s: "5",
  G: "6",
  b: "6",
  B: "8",
  g: "9",
  q: "9",
};

/**
 * OCR character mapping for letters to digits (for normalizing TO letters)
 */
const OCR_TO_LETTER: Record<string, string> = {
  "0": "o",
  "1": "l",
  "2": "z",
  "5": "s",
  "6": "g",
  "8": "b",
  "9": "g",
};

/**
 * Bidirectional OCR confusion pairs for fuzzy matching
 */
export const OCR_CONFUSION_PAIRS: Array<[string, string]> = [
  ["0", "O"],
  ["0", "o"],
  ["1", "l"],
  ["1", "I"],
  ["1", "|"],
  ["1", "!"],
  ["2", "Z"],
  ["2", "z"],
  ["5", "S"],
  ["5", "s"],
  ["6", "G"],
  ["6", "b"],
  ["8", "B"],
  ["9", "g"],
  ["9", "q"],
];

/**
 * Results from OCR normalization
 */
export interface OcrNormalizationResult {
  /** The normalized text */
  normalized: string;
  /** Whether any normalization was applied */
  wasNormalized: boolean;
  /** Character positions that were changed */
  changedPositions: number[];
  /** Original characters that were replaced */
  originalChars: string[];
}

/**
 * OcrNormalizer class providing various normalization strategies
 */
export class OcrNormalizer {
  /**
   * Normalize text by converting OCR-confused letters to digits
   * Use this for SSN, phone, date, MRN patterns
   *
   * @param text - Text to normalize
   * @returns Normalized text with letters converted to digits
   */
  static normalizeToDigits(text: string): string {
    let result = "";
    for (const char of text) {
      result += OCR_TO_DIGIT[char] ?? char;
    }
    return result;
  }

  /**
   * Normalize text by converting OCR-confused digits to letters
   * Use this for name patterns
   *
   * @param text - Text to normalize
   * @returns Normalized text with digits converted to letters
   */
  static normalizeToLetters(text: string): string {
    let result = "";
    for (const char of text) {
      result += OCR_TO_LETTER[char] ?? char;
    }
    return result;
  }

  /**
   * Full normalization with position tracking
   * Returns both normalized text and metadata about changes
   *
   * @param text - Text to normalize
   * @param direction - 'digits' or 'letters'
   * @returns Normalization result with metadata
   */
  static normalizeWithTracking(
    text: string,
    direction: "digits" | "letters" = "digits"
  ): OcrNormalizationResult {
    const mapping = direction === "digits" ? OCR_TO_DIGIT : OCR_TO_LETTER;
    const changedPositions: number[] = [];
    const originalChars: string[] = [];
    let normalized = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const replacement = mapping[char];
      if (replacement) {
        normalized += replacement;
        changedPositions.push(i);
        originalChars.push(char);
      } else {
        normalized += char;
      }
    }

    return {
      normalized,
      wasNormalized: changedPositions.length > 0,
      changedPositions,
      originalChars,
    };
  }

  /**
   * Normalize whitespace issues common in OCR
   * - Removes spaces within digit sequences
   * - Normalizes multiple spaces to single space
   * - Handles space before/after separators
   *
   * @param text - Text to normalize
   * @returns Text with normalized whitespace
   */
  static normalizeWhitespace(text: string): string {
    return (
      text
        // Remove spaces between digits: "123 456" -> "123456"
        .replace(/(\d)\s+(\d)/g, "$1$2")
        // Normalize spaces around date/phone separators: "01 / 02" -> "01/02"
        .replace(/\s*([/-])\s*/g, "$1")
        // Multiple spaces to single
        .replace(/\s{2,}/g, " ")
        // Trim
        .trim()
    );
  }

  /**
   * Full OCR normalization pipeline for numeric patterns (SSN, phone, date, MRN)
   * Applies: character normalization + whitespace normalization
   *
   * @param text - Text to normalize
   * @returns Fully normalized text
   */
  static normalizeNumeric(text: string): string {
    const charNormalized = this.normalizeToDigits(text);
    return this.normalizeWhitespace(charNormalized);
  }

  /**
   * Full OCR normalization pipeline for name patterns
   * Applies: character normalization (to letters) + whitespace normalization
   *
   * @param text - Text to normalize
   * @returns Fully normalized text
   */
  static normalizeName(text: string): string {
    const charNormalized = this.normalizeToLetters(text);
    return this.normalizeWhitespace(charNormalized);
  }

  /**
   * Generate all OCR variants of a string for fuzzy matching
   * Useful for dictionary lookups where we want to match despite OCR errors
   *
   * @param text - Original text
   * @param maxVariants - Maximum variants to generate (default 100)
   * @returns Array of possible OCR-corrupted variants
   */
  static generateOcrVariants(text: string, maxVariants: number = 100): string[] {
    const variants = new Set<string>([text]);

    // For each confusion pair, generate variants
    for (const [char1, char2] of OCR_CONFUSION_PAIRS) {
      const currentVariants = Array.from(variants);
      for (const variant of currentVariants) {
        if (variants.size >= maxVariants) break;

        // Replace char1 with char2
        if (variant.includes(char1)) {
          variants.add(variant.replace(new RegExp(char1.replace(/[|!]/g, "\\$&"), "g"), char2));
        }
        // Replace char2 with char1
        if (variant.includes(char2)) {
          variants.add(variant.replace(new RegExp(char2.replace(/[|!]/g, "\\$&"), "g"), char1));
        }
      }
    }

    return Array.from(variants);
  }

  /**
   * Check if two strings are OCR-equivalent
   * (Would be the same after normalization)
   *
   * @param str1 - First string
   * @param str2 - Second string
   * @returns True if strings are OCR-equivalent
   */
  static areOcrEquivalent(str1: string, str2: string): boolean {
    return this.normalizeNumeric(str1) === this.normalizeNumeric(str2);
  }

  /**
   * Extract the "canonical" form of a potentially OCR-corrupted value
   * Tries to determine the most likely intended value
   *
   * @param text - Potentially corrupted text
   * @param context - 'numeric' or 'alpha' to hint at expected content
   * @returns Best guess at canonical form
   */
  static getCanonical(text: string, context: "numeric" | "alpha" = "numeric"): string {
    if (context === "numeric") {
      return this.normalizeNumeric(text);
    } else {
      return this.normalizeName(text);
    }
  }
}

/**
 * Convenience function for quick numeric normalization
 */
export function normalizeOcr(text: string): string {
  return OcrNormalizer.normalizeNumeric(text);
}

/**
 * Convenience function for quick name normalization
 */
export function normalizeOcrName(text: string): string {
  return OcrNormalizer.normalizeName(text);
}
