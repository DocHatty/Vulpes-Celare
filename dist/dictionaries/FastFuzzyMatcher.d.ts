/**
 * FastFuzzyMatcher - SymSpell-Inspired High-Performance Fuzzy Matching
 *
 * PERFORMANCE: 100-1000x faster than traditional approaches
 *
 * BLOOM FILTER FIRST-PASS:
 * Before any fuzzy matching, a bloom filter rejects ~95% of non-matching
 * tokens in ~50 nanoseconds. This provides massive speedup for the common
 * case where most tokens are not in the dictionary.
 *
 * RUST ACCELERATION:
 * When VULPES_FUZZY_ACCEL is enabled (default), uses Rust native implementation
 * for 10-50x additional speedup. Set VULPES_FUZZY_ACCEL=0 to disable.
 *
 * ALGORITHM:
 * Based on SymSpell's Symmetric Delete algorithm by Wolf Garbe (2012):
 * - Pre-compute deletion neighborhood for dictionary terms
 * - Store deletions in hash map for O(1) lookup
 * - On query: generate deletions, check hash map, verify candidates
 *
 * KEY INSIGHT:
 * Instead of computing edit distance for ALL dictionary terms,
 * we only compute it for terms that share deletions with the query.
 * This reduces candidates from N (dictionary size) to ~10-50.
 *
 * COMPLEXITY:
 * - Dictionary build: O(n * w * d^maxEdit) where w=avg word length, d=alphabet size
 * - Bloom filter check: O(k) where k = number of hash functions (~3)
 * - Exact lookup: O(1)
 * - Fuzzy lookup: O(k * m) where k=candidates (small), m=word length
 *
 * Reference: https://github.com/wolfgarbe/SymSpell
 *
 * @module redaction/dictionaries
 */
export interface FastMatchResult {
    matched: boolean;
    term: string | null;
    distance: number;
    confidence: number;
    matchType: "EXACT" | "DELETE_1" | "DELETE_2" | "FUZZY" | "PHONETIC" | "NONE";
}
export interface FastMatcherConfig {
    /** Maximum edit distance for fuzzy matching (1 or 2 recommended) */
    maxEditDistance: number;
    /** Enable phonetic (Soundex) matching as fallback */
    enablePhonetic: boolean;
    /** Minimum term length for fuzzy matching */
    minTermLength: number;
    /** Cache size for repeated queries */
    cacheSize: number;
}
export declare class FastFuzzyMatcher {
    private readonly config;
    private readonly exactTerms;
    private readonly deletionIndex;
    private readonly phoneticIndex;
    private bloomFilter;
    private static readonly BLOOM_FP_RATE;
    private readonly queryCache;
    private readonly rustMatcher;
    private readonly useRust;
    private stats;
    constructor(terms: string[], config?: Partial<FastMatcherConfig>);
    /**
     * Build the deletion index (SymSpell core algorithm)
     *
     * For each term, generate all possible deletions up to maxEditDistance
     * and store in hash map for O(1) candidate retrieval.
     */
    private buildIndex;
    /**
     * Generate all deletions of a term up to maxDistance
     *
     * Example: "test" with maxDistance=1 generates:
     * ["est", "tst", "tet", "tes"]
     */
    private generateDeletions;
    /**
     * Look up a query with fuzzy matching
     *
     * Algorithm:
     * 1. Check exact match (O(1))
     * 2. Generate query deletions and look up candidates
     * 3. For each candidate, compute actual edit distance
     * 4. Return best match
     */
    lookup(query: string): FastMatchResult;
    /**
     * Get candidates from deletion index
     *
     * For the query, generate its deletions and look up in index.
     * Also check if query itself is a deletion of any dictionary term.
     */
    private getCandidates;
    /**
     * Damerau-Levenshtein distance (allows transpositions)
     *
     * More accurate than plain Levenshtein for typos:
     * - Insertion, deletion, substitution: cost 1
     * - Transposition (ab -> ba): cost 1 (vs 2 in plain Levenshtein)
     */
    private damerauLevenshtein;
    /**
     * Calculate confidence score based on match quality
     */
    private calculateConfidence;
    /**
     * Soundex phonetic encoding
     */
    private soundex;
    /**
     * Check if term exists (with fuzzy tolerance)
     */
    has(query: string): boolean;
    /**
     * Get confidence score for a query
     */
    getConfidence(query: string): number;
    /**
     * Get matching statistics
     */
    getStats(): typeof this.stats;
    /**
     * Clear the query cache
     */
    clearCache(): void;
    /**
     * Get dictionary size
     */
    get size(): number;
    /**
     * Get deletion index size (for debugging)
     */
    get indexSize(): number;
    /**
     * Create matcher optimized for first names
     */
    static forFirstNames(names: string[]): FastFuzzyMatcher;
    /**
     * Create matcher optimized for surnames
     */
    static forSurnames(names: string[]): FastFuzzyMatcher;
    /**
     * Create matcher for locations (less phonetic tolerance)
     */
    static forLocations(locations: string[]): FastFuzzyMatcher;
    /**
     * Create strict matcher (exact only)
     */
    static strict(terms: string[]): FastFuzzyMatcher;
}
//# sourceMappingURL=FastFuzzyMatcher.d.ts.map