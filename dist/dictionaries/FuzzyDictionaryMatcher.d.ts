/**
 * FuzzyDictionaryMatcher - OCR-Tolerant Dictionary Lookup
 *
 * PERFORMANCE UPGRADE (v2.0):
 * Now uses FastFuzzyMatcher internally for 100-1000x speedup.
 * - SymSpell-inspired deletion neighborhood algorithm
 * - O(1) exact match, O(k) fuzzy where k = small constant
 * - LRU caching for repeated queries
 *
 * RESEARCH BASIS: Gazetteers/dictionaries improve PHI detection by 5-10%,
 * especially for names and locations. However, OCR errors break exact matching.
 *
 * MATHEMATICAL FOUNDATION:
 * 1. Jaro-Winkler Similarity - Gold standard for name matching
 *    Formula: JW(s1, s2) = Jaro(s1, s2) + (l * p * (1 - Jaro(s1, s2)))
 *    where l = common prefix length (max 4), p = 0.1 scaling factor
 *    Reference: Winkler (1990) "String Comparator Metrics and Enhanced Decision Rules"
 *
 * 2. Levenshtein Distance - Edit distance for OCR error tolerance
 *    Formula: min insertions + deletions + substitutions to transform s1 -> s2
 *    Reference: Levenshtein (1966) "Binary codes capable of correcting deletions"
 *
 * 3. Soundex - Phonetic encoding for pronunciation-based matching
 *    Reference: Russell & Odell (1918) US Patent 1,261,167
 *
 * 4. SymSpell Algorithm - O(1) candidate retrieval
 *    Reference: Wolf Garbe (2012) https://github.com/wolfgarbe/SymSpell
 *
 * @module redaction/dictionaries
 */
import { FastFuzzyMatcher } from "./FastFuzzyMatcher";
export interface FuzzyMatchResult {
    matched: boolean;
    matchedTerm: string | null;
    originalQuery: string;
    normalizedQuery: string;
    matchType: "EXACT" | "NORMALIZED" | "FUZZY" | "PHONETIC" | "NONE";
    distance: number;
    confidence: number;
}
export interface FuzzyMatchConfig {
    /** Maximum Levenshtein distance for fuzzy match */
    maxDistance: number;
    /** Enable OCR normalization before matching */
    ocrNormalize: boolean;
    /** Enable phonetic matching for names */
    phoneticMatch: boolean;
    /** Minimum term length for fuzzy matching */
    minLengthForFuzzy: number;
    /** Use fast matcher (SymSpell algorithm) - default true */
    useFastMatcher: boolean;
}
export declare class FuzzyDictionaryMatcher {
    private terms;
    private normalizedTerms;
    private phoneticIndex;
    private config;
    private fastMatcher;
    private cache;
    constructor(terms: string[], config?: Partial<FuzzyMatchConfig>);
    /**
     * Look up a term with fuzzy matching
     *
     * Uses FastFuzzyMatcher for O(1) to O(k) lookup when enabled,
     * falls back to traditional O(n) algorithm otherwise.
     */
    lookup(query: string): FuzzyMatchResult;
    /**
     * Fast lookup using SymSpell-inspired algorithm
     * O(1) for exact match, O(k) for fuzzy
     */
    private lookupFast;
    /**
     * Map FastFuzzyMatcher match types to FuzzyMatchResult types
     */
    private mapMatchType;
    /**
     * Legacy lookup using original O(n) algorithm
     * Kept for backward compatibility and fallback
     */
    private lookupLegacy;
    /**
     * Check if term exists (with fuzzy tolerance)
     */
    has(query: string): boolean;
    /**
     * Get confidence score for a query
     */
    getConfidence(query: string): number;
    /**
     * Get statistics from fast matcher (if enabled)
     */
    getStats(): {
        fastMatcher: ReturnType<FastFuzzyMatcher["getStats"]> | null;
    };
    /**
     * Clear internal caches
     */
    clearCache(): void;
    /**
     * Normalize common OCR substitutions
     */
    private ocrNormalize;
    /**
     * Soundex algorithm for phonetic matching
     */
    private soundex;
    /**
     * Calculate Jaro similarity between two strings (with caching)
     */
    private jaroSimilarity;
    /**
     * Calculate Jaro-Winkler similarity (with caching)
     */
    private jaroWinklerSimilarity;
    /**
     * Calculate Levenshtein edit distance (with caching)
     */
    private levenshteinDistance;
    /**
     * Calculate normalized Levenshtein similarity in [0, 1]
     */
    private normalizedLevenshteinSimilarity;
    /**
     * Find closest fuzzy match within distance threshold
     * Uses Jaro-Winkler as primary metric for better name matching
     */
    private findClosestFuzzy;
    /**
     * Calculate confidence using weighted combination of similarity metrics
     */
    private calculateConfidence;
    /**
     * Create matcher from first names dictionary
     */
    static forFirstNames(names: string[]): FuzzyDictionaryMatcher;
    /**
     * Create matcher from surnames dictionary
     */
    static forSurnames(names: string[]): FuzzyDictionaryMatcher;
    /**
     * Create matcher for locations (less phonetic, more OCR)
     */
    static forLocations(locations: string[]): FuzzyDictionaryMatcher;
    /**
     * Create strict matcher (exact + normalized only)
     */
    static strict(terms: string[]): FuzzyDictionaryMatcher;
}
//# sourceMappingURL=FuzzyDictionaryMatcher.d.ts.map