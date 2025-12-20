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
export declare class UnicodeNormalizer {
    private static enabled;
    /**
     * Check if adversarial defense is enabled via environment variable
     */
    static isEnabled(): boolean;
    /**
     * Force enable/disable (useful for testing)
     */
    static setEnabled(value: boolean): void;
    /**
     * Full normalization pipeline: NFKC + strip invisibles + homoglyph replacement
     */
    static normalize(text: string): NormalizationResult;
    /**
     * Quick normalization without detailed tracking (for performance-critical paths)
     */
    static quickNormalize(text: string): string;
    /**
     * Strip only invisible/zero-width characters
     */
    static stripInvisibles(text: string): string;
    /**
     * Replace homoglyph characters with their Latin equivalents
     */
    static replaceHomoglyphs(text: string): string;
    /**
     * Check if text contains invisible characters
     */
    static hasInvisibles(text: string): boolean;
    /**
     * Check if text contains homoglyph characters
     */
    static hasHomoglyphs(text: string): boolean;
    /**
     * Detect if text appears to be an adversarial attack attempt
     */
    static detectAdversarial(text: string): {
        isAdversarial: boolean;
        score: number;
        reasons: string[];
    };
    /**
     * Check for mixed Latin/Cyrillic scripts (common evasion technique)
     */
    private static hasMixedScripts;
    /**
     * Count unusual Unicode characters (control chars, private use, etc.)
     */
    private static countUnusualChars;
    /**
     * Calculate overall suspicion score
     */
    private static calculateSuspicion;
    /**
     * Get all supported homoglyph mappings (for debugging/testing)
     */
    static getHomoglyphMappings(): ReadonlyMap<string, string>;
    /**
     * Get all invisible character code points (for debugging/testing)
     */
    static getInvisibleCodePoints(): ReadonlySet<number>;
}
export default UnicodeNormalizer;
//# sourceMappingURL=UnicodeNormalizer.d.ts.map