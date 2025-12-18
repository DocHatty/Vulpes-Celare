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
 * Bidirectional OCR confusion pairs for fuzzy matching
 */
export declare const OCR_CONFUSION_PAIRS: Array<[string, string]>;
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
export declare class OcrNormalizer {
    /**
     * Normalize text by converting OCR-confused letters to digits
     * Use this for SSN, phone, date, MRN patterns
     *
     * @param text - Text to normalize
     * @returns Normalized text with letters converted to digits
     */
    static normalizeToDigits(text: string): string;
    /**
     * Normalize text by converting OCR-confused digits to letters
     * Use this for name patterns
     *
     * @param text - Text to normalize
     * @returns Normalized text with digits converted to letters
     */
    static normalizeToLetters(text: string): string;
    /**
     * Full normalization with position tracking
     * Returns both normalized text and metadata about changes
     *
     * @param text - Text to normalize
     * @param direction - 'digits' or 'letters'
     * @returns Normalization result with metadata
     */
    static normalizeWithTracking(text: string, direction?: "digits" | "letters"): OcrNormalizationResult;
    /**
     * Normalize whitespace issues common in OCR
     * - Removes spaces within digit sequences
     * - Normalizes multiple spaces to single space
     * - Handles space before/after separators
     *
     * @param text - Text to normalize
     * @returns Text with normalized whitespace
     */
    static normalizeWhitespace(text: string): string;
    /**
     * Full OCR normalization pipeline for numeric patterns (SSN, phone, date, MRN)
     * Applies: character normalization + whitespace normalization
     *
     * @param text - Text to normalize
     * @returns Fully normalized text
     */
    static normalizeNumeric(text: string): string;
    /**
     * Full OCR normalization pipeline for name patterns
     * Applies: character normalization (to letters) + whitespace normalization
     *
     * @param text - Text to normalize
     * @returns Fully normalized text
     */
    static normalizeName(text: string): string;
    /**
     * Generate all OCR variants of a string for fuzzy matching
     * Useful for dictionary lookups where we want to match despite OCR errors
     *
     * @param text - Original text
     * @param maxVariants - Maximum variants to generate (default 100)
     * @returns Array of possible OCR-corrupted variants
     */
    static generateOcrVariants(text: string, maxVariants?: number): string[];
    /**
     * Check if two strings are OCR-equivalent
     * (Would be the same after normalization)
     *
     * @param str1 - First string
     * @param str2 - Second string
     * @returns True if strings are OCR-equivalent
     */
    static areOcrEquivalent(str1: string, str2: string): boolean;
    /**
     * Extract the "canonical" form of a potentially OCR-corrupted value
     * Tries to determine the most likely intended value
     *
     * @param text - Potentially corrupted text
     * @param context - 'numeric' or 'alpha' to hint at expected content
     * @returns Best guess at canonical form
     */
    static getCanonical(text: string, context?: "numeric" | "alpha"): string;
}
/**
 * Convenience function for quick numeric normalization
 */
export declare function normalizeOcr(text: string): string;
/**
 * Convenience function for quick name normalization
 */
export declare function normalizeOcrName(text: string): string;
//# sourceMappingURL=OcrNormalizer.d.ts.map