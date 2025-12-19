/**
 * PhoneticMatcher - Double Metaphone based name matching for OCR-corrupted text
 *
 * This module provides phonetic matching capabilities to detect names even when
 * they contain OCR errors like digit-for-letter substitutions (0→O, 1→L, 8→U).
 *
 * Key insight: Phonetic algorithms encode by SOUND, not spelling, so:
 * - "PENELOPE" and "PENEL0PE" encode to the same phonetic code
 * - "LAURENT" and "LA8RENT" encode similarly
 *
 * @module utils
 */
/**
 * Match result with confidence scoring
 */
export interface PhoneticMatch {
    original: string;
    matched: string;
    confidence: number;
    matchType: "exact" | "phonetic_primary" | "phonetic_secondary" | "levenshtein";
}
export declare class PhoneticMatcher {
    private firstNameIndex;
    private surnameIndex;
    private initialized;
    private nativeInstance;
    private readonly MAX_LEVENSHTEIN_DISTANCE;
    private readonly MIN_NAME_LENGTH;
    constructor();
    /**
     * Create an empty phonetic index
     */
    private createEmptyIndex;
    /**
     * Initialize the matcher with name dictionaries
     * Call this once at startup with your name lists
     */
    initialize(firstNames: string[], surnames: string[]): void;
    /**
     * Build a phonetic index from a list of names
     */
    private buildIndex;
    /**
     * Normalize OCR-corrupted text by replacing common substitutions
     */
    normalizeOcr(text: string): string;
    /**
     * Check if a string looks like a first name (with phonetic matching)
     * Returns match info if found, null otherwise
     */
    matchFirstName(input: string): PhoneticMatch | null;
    /**
     * Check if a string looks like a surname (with phonetic matching)
     * Returns match info if found, null otherwise
     */
    matchSurname(input: string): PhoneticMatch | null;
    /**
     * Check if a string is likely a name (first OR surname)
     * Returns the best match found
     */
    matchAnyName(input: string): PhoneticMatch | null;
    /**
     * Match input against a phonetic index
     */
    private matchAgainstIndex;
    /**
     * Find the closest matching name from candidates using Levenshtein distance
     */
    private findClosestMatch;
    /**
     * Find a Levenshtein match in the full name set
     * Only used for short names as fallback
     */
    private findLevenshteinMatch;
    /**
     * Check if initialized
     */
    isInitialized(): boolean;
    /**
     * Get index statistics
     */
    getStats(): {
        firstNames: number;
        surnames: number;
        primaryCodes: number;
        secondaryCodes: number;
    };
}
/**
 * Get or create the global PhoneticMatcher instance
 */
export declare function getPhoneticMatcher(): PhoneticMatcher;
/**
 * Initialize the global matcher with name dictionaries
 * Should be called once at application startup
 */
export declare function initializePhoneticMatcher(firstNames: string[], surnames: string[]): void;
/**
 * Quick check if a word looks like a name using phonetic matching
 * Convenience function that uses the global matcher
 */
export declare function isLikelyName(word: string): boolean;
/**
 * Get the best name match for an OCR-corrupted string
 * Convenience function that uses the global matcher
 */
export declare function findNameMatch(word: string): PhoneticMatch | null;
//# sourceMappingURL=PhoneticMatcher.d.ts.map