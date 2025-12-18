/**
 * Centralized OCR Error Patterns and Character Substitutions
 *
 * This module consolidates OCR-related patterns that were previously
 * scattered across multiple filter files.
 *
 * This addresses:
 * - M2: Hardcoded OCR suffix patterns in AddressFilterSpan.ts
 * - M3: No centralized OCR error mapping across multiple filters
 *
 * OCR (Optical Character Recognition) errors occur when scanning printed
 * documents. Common errors include:
 * - 0/O confusion (zero vs letter O)
 * - 1/l/I confusion (one vs lowercase L vs uppercase I)
 * - 5/S confusion (five vs letter S)
 * - rn/m confusion (adjacent r+n looks like m)
 *
 * @module config/OcrPatterns
 */
/**
 * Common OCR character substitutions.
 *
 * Key: original character
 * Value: array of characters it might be misread as
 *
 * @example
 * // Check if 'O' might be a misread '0'
 * if (OcrCharacterSubstitutions['0'].includes('O')) { ... }
 */
export declare const OcrCharacterSubstitutions: Record<string, string[]>;
/**
 * Generate an OCR-tolerant regex pattern from a string.
 *
 * Replaces each character with a character class that includes
 * common OCR misreads.
 *
 * @param text - The string to make OCR-tolerant
 * @param options - Configuration options
 * @returns A RegExp that matches the text and common OCR errors
 *
 * @example
 * const pattern = generateOcrTolerantPattern("Smith");
 * // Matches: Smith, 5mith, Smlth, 5m1th, etc.
 */
export declare function generateOcrTolerantPattern(text: string, options?: {
    caseInsensitive?: boolean;
    includeMultiChar?: boolean;
}): RegExp;
/**
 * OCR-tolerant patterns for street type suffixes.
 * These are the patterns previously hardcoded in AddressFilterSpan.ts.
 *
 * Each entry has:
 * - pattern: The OCR-tolerant regex
 * - confidence: Base confidence for matches
 * - canonical: The clean form of the street type
 */
export declare const OcrAddressSuffixPatterns: {
    pattern: RegExp;
    confidence: number;
    canonical: string;
}[];
/**
 * OCR-tolerant patterns for US state abbreviations.
 * Used for address detection with OCR errors.
 */
export declare const OcrStatePatterns: {
    pattern: RegExp;
    canonical: string;
}[];
/**
 * Apply OCR substitutions to normalize a string.
 *
 * Attempts to convert OCR-corrupted text back to its canonical form.
 *
 * @param text - The potentially OCR-corrupted text
 * @returns The normalized text
 *
 * @example
 * normalizeOcrText("5mith") // Returns "Smith"
 * normalizeOcrText("J0hn")  // Returns "John"
 */
export declare function normalizeOcrText(text: string): string;
/**
 * Check if two strings are equivalent considering OCR errors.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if the strings match allowing for OCR substitutions
 *
 * @example
 * isOcrEquivalent("Smith", "5mith") // Returns true
 * isOcrEquivalent("John", "J0hn")   // Returns true
 * isOcrEquivalent("Smith", "Jones") // Returns false
 */
export declare function isOcrEquivalent(a: string, b: string): boolean;
/**
 * Calculate OCR similarity score between two strings.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Score from 0 to 1 (1 = identical, 0 = completely different)
 */
export declare function ocrSimilarity(a: string, b: string): number;
/**
 * Unified OcrPatterns export for convenient importing.
 *
 * @example
 * import { OcrPatterns } from '../config/OcrPatterns';
 * const pattern = OcrPatterns.generateTolerantPattern("Smith");
 */
export declare const OcrPatterns: {
    readonly CharacterSubstitutions: Record<string, string[]>;
    readonly AddressSuffixes: {
        pattern: RegExp;
        confidence: number;
        canonical: string;
    }[];
    readonly StateAbbreviations: {
        pattern: RegExp;
        canonical: string;
    }[];
    readonly generateTolerantPattern: typeof generateOcrTolerantPattern;
    readonly normalize: typeof normalizeOcrText;
    readonly isEquivalent: typeof isOcrEquivalent;
    readonly similarity: typeof ocrSimilarity;
};
//# sourceMappingURL=OcrPatterns.d.ts.map