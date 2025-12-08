"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuzzyDictionaryMatcher = void 0;
const FastFuzzyMatcher_1 = require("./FastFuzzyMatcher");
const ComputationCache_1 = require("../utils/ComputationCache");
const DEFAULT_CONFIG = {
    maxDistance: 2,
    ocrNormalize: true,
    phoneticMatch: true,
    minLengthForFuzzy: 4,
    useFastMatcher: true, // Use fast algorithm by default
};
class FuzzyDictionaryMatcher {
    constructor(terms, config = {}) {
        // Fast matcher (SymSpell-inspired)
        this.fastMatcher = null;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.terms = new Set(terms.map((t) => t.toLowerCase()));
        this.normalizedTerms = new Map();
        this.phoneticIndex = new Map();
        this.cache = ComputationCache_1.ComputationCache.getInstance();
        // Build indexes
        for (const term of terms) {
            const lower = term.toLowerCase();
            const normalized = this.ocrNormalize(lower);
            this.normalizedTerms.set(normalized, lower);
            if (this.config.phoneticMatch) {
                const phonetic = this.soundex(lower);
                if (!this.phoneticIndex.has(phonetic)) {
                    this.phoneticIndex.set(phonetic, []);
                }
                this.phoneticIndex.get(phonetic).push(lower);
            }
        }
        // Initialize fast matcher if enabled
        if (this.config.useFastMatcher) {
            this.fastMatcher = new FastFuzzyMatcher_1.FastFuzzyMatcher(terms, {
                maxEditDistance: this.config.maxDistance,
                enablePhonetic: this.config.phoneticMatch,
                minTermLength: Math.max(2, this.config.minLengthForFuzzy - 1),
                cacheSize: 10000,
            });
        }
    }
    /**
     * Look up a term with fuzzy matching
     *
     * Uses FastFuzzyMatcher for O(1) to O(k) lookup when enabled,
     * falls back to traditional O(n) algorithm otherwise.
     */
    lookup(query) {
        const lowerQuery = query.toLowerCase().trim();
        const normalizedQuery = this.ocrNormalize(lowerQuery);
        // Use fast matcher if available
        if (this.fastMatcher) {
            return this.lookupFast(query, lowerQuery, normalizedQuery);
        }
        // Fall back to original algorithm
        return this.lookupLegacy(query, lowerQuery, normalizedQuery);
    }
    /**
     * Fast lookup using SymSpell-inspired algorithm
     * O(1) for exact match, O(k) for fuzzy
     */
    lookupFast(query, lowerQuery, normalizedQuery) {
        // Check OCR normalization first (not handled by FastFuzzyMatcher)
        if (this.config.ocrNormalize && this.normalizedTerms.has(normalizedQuery)) {
            const originalTerm = this.normalizedTerms.get(normalizedQuery);
            if (originalTerm !== lowerQuery) {
                return {
                    matched: true,
                    matchedTerm: originalTerm,
                    originalQuery: query,
                    normalizedQuery,
                    matchType: "NORMALIZED",
                    distance: 0,
                    confidence: 0.95,
                };
            }
        }
        // Use fast matcher
        const result = this.fastMatcher.lookup(lowerQuery);
        if (!result.matched) {
            return {
                matched: false,
                matchedTerm: null,
                originalQuery: query,
                normalizedQuery,
                matchType: "NONE",
                distance: Infinity,
                confidence: 0,
            };
        }
        // Map FastMatchResult to FuzzyMatchResult
        return {
            matched: true,
            matchedTerm: result.term,
            originalQuery: query,
            normalizedQuery,
            matchType: this.mapMatchType(result.matchType),
            distance: result.distance,
            confidence: result.confidence,
        };
    }
    /**
     * Map FastFuzzyMatcher match types to FuzzyMatchResult types
     */
    mapMatchType(fastType) {
        switch (fastType) {
            case "EXACT":
                return "EXACT";
            case "DELETE_1":
            case "DELETE_2":
            case "FUZZY":
                return "FUZZY";
            case "PHONETIC":
                return "PHONETIC";
            default:
                return "NONE";
        }
    }
    /**
     * Legacy lookup using original O(n) algorithm
     * Kept for backward compatibility and fallback
     */
    lookupLegacy(query, lowerQuery, normalizedQuery) {
        // 1. Exact match
        if (this.terms.has(lowerQuery)) {
            return {
                matched: true,
                matchedTerm: lowerQuery,
                originalQuery: query,
                normalizedQuery,
                matchType: "EXACT",
                distance: 0,
                confidence: 1.0,
            };
        }
        // 2. Normalized match (OCR correction)
        if (this.config.ocrNormalize && this.normalizedTerms.has(normalizedQuery)) {
            return {
                matched: true,
                matchedTerm: this.normalizedTerms.get(normalizedQuery),
                originalQuery: query,
                normalizedQuery,
                matchType: "NORMALIZED",
                distance: 0,
                confidence: 0.95,
            };
        }
        // 3. Phonetic match (for names)
        if (this.config.phoneticMatch &&
            lowerQuery.length >= this.config.minLengthForFuzzy) {
            const queryPhonetic = this.soundex(lowerQuery);
            const phoneticMatches = this.phoneticIndex.get(queryPhonetic);
            if (phoneticMatches && phoneticMatches.length > 0) {
                // Find closest phonetic match
                let bestMatch = phoneticMatches[0];
                let bestDistance = this.levenshteinDistance(lowerQuery, bestMatch);
                for (const match of phoneticMatches) {
                    const dist = this.levenshteinDistance(lowerQuery, match);
                    if (dist < bestDistance) {
                        bestDistance = dist;
                        bestMatch = match;
                    }
                }
                if (bestDistance <= this.config.maxDistance) {
                    return {
                        matched: true,
                        matchedTerm: bestMatch,
                        originalQuery: query,
                        normalizedQuery,
                        matchType: "PHONETIC",
                        distance: bestDistance,
                        confidence: this.calculateConfidence(lowerQuery, bestMatch, bestDistance),
                    };
                }
            }
        }
        // 4. Fuzzy match (Levenshtein)
        if (lowerQuery.length >= this.config.minLengthForFuzzy) {
            const fuzzyResult = this.findClosestFuzzy(lowerQuery);
            if (fuzzyResult) {
                return {
                    matched: true,
                    matchedTerm: fuzzyResult.term,
                    originalQuery: query,
                    normalizedQuery,
                    matchType: "FUZZY",
                    distance: fuzzyResult.distance,
                    confidence: this.calculateConfidence(lowerQuery, fuzzyResult.term, fuzzyResult.distance),
                };
            }
        }
        // No match
        return {
            matched: false,
            matchedTerm: null,
            originalQuery: query,
            normalizedQuery,
            matchType: "NONE",
            distance: Infinity,
            confidence: 0,
        };
    }
    /**
     * Check if term exists (with fuzzy tolerance)
     */
    has(query) {
        return this.lookup(query).matched;
    }
    /**
     * Get confidence score for a query
     */
    getConfidence(query) {
        return this.lookup(query).confidence;
    }
    /**
     * Get statistics from fast matcher (if enabled)
     */
    getStats() {
        return {
            fastMatcher: this.fastMatcher?.getStats() || null,
        };
    }
    /**
     * Clear internal caches
     */
    clearCache() {
        this.fastMatcher?.clearCache();
    }
    // ============ OCR Normalization ============
    /**
     * Normalize common OCR substitutions
     */
    ocrNormalize(text) {
        return (text
            // Digit → letter substitutions
            .replace(/0/g, "o")
            .replace(/1/g, "l")
            .replace(/5/g, "s")
            .replace(/8/g, "b")
            .replace(/6/g, "g")
            .replace(/4/g, "a")
            .replace(/3/g, "e")
            .replace(/7/g, "t")
            // Special character substitutions
            .replace(/\|/g, "l")
            .replace(/\$/g, "s")
            .replace(/@/g, "a")
            .replace(/!/g, "i")
            // Normalize spacing
            .replace(/\s+/g, " ")
            .trim());
    }
    // ============ Phonetic Matching ============
    /**
     * Soundex algorithm for phonetic matching
     */
    soundex(text) {
        const s = text.toUpperCase().replace(/[^A-Z]/g, "");
        if (s.length === 0)
            return "0000";
        const codes = {
            B: "1",
            F: "1",
            P: "1",
            V: "1",
            C: "2",
            G: "2",
            J: "2",
            K: "2",
            Q: "2",
            S: "2",
            X: "2",
            Z: "2",
            D: "3",
            T: "3",
            L: "4",
            M: "5",
            N: "5",
            R: "6",
            A: "0",
            E: "0",
            I: "0",
            O: "0",
            U: "0",
            H: "0",
            W: "0",
            Y: "0",
        };
        let result = s[0];
        let prevCode = codes[s[0]] || "0";
        for (let i = 1; i < s.length && result.length < 4; i++) {
            const code = codes[s[i]] || "0";
            if (code !== "0" && code !== prevCode) {
                result += code;
            }
            prevCode = code;
        }
        return (result + "000").substring(0, 4);
    }
    // ============ Jaro-Winkler Similarity ============
    /**
     * Calculate Jaro similarity between two strings (with caching)
     */
    jaroSimilarity(s1, s2) {
        if (s1 === s2)
            return 1.0;
        if (s1.length === 0 || s2.length === 0)
            return 0.0;
        const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
        const s1Matches = new Array(s1.length).fill(false);
        const s2Matches = new Array(s2.length).fill(false);
        let matches = 0;
        let transpositions = 0;
        // Find matching characters
        for (let i = 0; i < s1.length; i++) {
            const start = Math.max(0, i - matchWindow);
            const end = Math.min(i + matchWindow + 1, s2.length);
            for (let j = start; j < end; j++) {
                if (s2Matches[j] || s1[i] !== s2[j])
                    continue;
                s1Matches[i] = true;
                s2Matches[j] = true;
                matches++;
                break;
            }
        }
        if (matches === 0)
            return 0.0;
        // Count transpositions
        let k = 0;
        for (let i = 0; i < s1.length; i++) {
            if (!s1Matches[i])
                continue;
            while (!s2Matches[k])
                k++;
            if (s1[i] !== s2[k])
                transpositions++;
            k++;
        }
        return ((matches / s1.length +
            matches / s2.length +
            (matches - transpositions / 2) / matches) /
            3);
    }
    /**
     * Calculate Jaro-Winkler similarity (with caching)
     */
    jaroWinklerSimilarity(s1, s2, prefixScale = 0.1) {
        return this.cache.getJaroWinkler(s1, s2, () => {
            const jaro = this.jaroSimilarity(s1, s2);
            // Find common prefix (max 4 characters)
            let prefixLen = 0;
            const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
            for (let i = 0; i < maxPrefix; i++) {
                if (s1[i] === s2[i]) {
                    prefixLen++;
                }
                else {
                    break;
                }
            }
            return jaro + prefixLen * prefixScale * (1 - jaro);
        });
    }
    // ============ Levenshtein Distance ============
    /**
     * Calculate Levenshtein edit distance (with caching)
     */
    levenshteinDistance(a, b) {
        return this.cache.getLevenshtein(a, b, () => {
            if (a.length === 0)
                return b.length;
            if (b.length === 0)
                return a.length;
            // Ensure a is the shorter string for space optimization
            if (a.length > b.length) {
                [a, b] = [b, a];
            }
            const m = a.length;
            const n = b.length;
            // Use single row with O(m) space instead of full matrix
            let prevRow = new Array(m + 1);
            let currRow = new Array(m + 1);
            // Initialize first row
            for (let j = 0; j <= m; j++) {
                prevRow[j] = j;
            }
            for (let i = 1; i <= n; i++) {
                currRow[0] = i;
                for (let j = 1; j <= m; j++) {
                    if (b[i - 1] === a[j - 1]) {
                        currRow[j] = prevRow[j - 1];
                    }
                    else {
                        currRow[j] =
                            1 +
                                Math.min(prevRow[j - 1], // substitution
                                prevRow[j], // deletion
                                currRow[j - 1]);
                    }
                }
                // Swap rows
                [prevRow, currRow] = [currRow, prevRow];
            }
            return prevRow[m];
        });
    }
    /**
     * Calculate normalized Levenshtein similarity in [0, 1]
     */
    normalizedLevenshteinSimilarity(s1, s2) {
        if (s1 === s2)
            return 1.0;
        const maxLen = Math.max(s1.length, s2.length);
        if (maxLen === 0)
            return 1.0;
        return 1 - this.levenshteinDistance(s1, s2) / maxLen;
    }
    /**
     * Find closest fuzzy match within distance threshold
     * Uses Jaro-Winkler as primary metric for better name matching
     */
    findClosestFuzzy(query) {
        let bestMatch = null;
        let bestDistance = this.config.maxDistance + 1;
        let bestJaroWinkler = 0;
        // For performance, only check terms of similar length
        const minLen = Math.max(1, query.length - this.config.maxDistance);
        const maxLen = query.length + this.config.maxDistance;
        for (const term of this.terms) {
            if (term.length < minLen || term.length > maxLen)
                continue;
            // Use Jaro-Winkler as primary filter (faster than Levenshtein)
            const jw = this.jaroWinklerSimilarity(query, term);
            // Only compute Levenshtein if Jaro-Winkler is promising (> 0.7)
            if (jw > 0.7 || jw > bestJaroWinkler) {
                const distance = this.levenshteinDistance(query, term);
                if (distance < bestDistance ||
                    (distance === bestDistance && jw > bestJaroWinkler)) {
                    bestDistance = distance;
                    bestJaroWinkler = jw;
                    bestMatch = term;
                }
            }
            // Early exit if exact match found
            if (bestDistance === 0)
                break;
        }
        if (bestMatch && bestDistance <= this.config.maxDistance) {
            return {
                term: bestMatch,
                distance: bestDistance,
                jaroWinkler: bestJaroWinkler,
            };
        }
        return null;
    }
    /**
     * Calculate confidence using weighted combination of similarity metrics
     */
    calculateConfidence(query, matched, distance) {
        if (distance === 0)
            return 1.0;
        // Calculate component similarities
        const jaroWinkler = this.jaroWinklerSimilarity(query, matched);
        const normalizedLev = this.normalizedLevenshteinSimilarity(query, matched);
        // Phonetic bonus: if Soundex codes match, add boost
        const phoneticBonus = this.soundex(query) === this.soundex(matched) ? 1.0 : 0.0;
        // Weighted combination (alpha=0.6, beta=0.3, gamma=0.1)
        const rawConfidence = 0.6 * jaroWinkler + 0.3 * normalizedLev + 0.1 * phoneticBonus;
        // Apply distance-based penalty
        const distancePenalty = Math.pow(0.95, distance);
        return Math.min(0.98, rawConfidence * distancePenalty);
    }
    // ============ Static factory methods ============
    /**
     * Create matcher from first names dictionary
     */
    static forFirstNames(names) {
        return new FuzzyDictionaryMatcher(names, {
            maxDistance: 2,
            ocrNormalize: true,
            phoneticMatch: true,
            minLengthForFuzzy: 3,
            useFastMatcher: true,
        });
    }
    /**
     * Create matcher from surnames dictionary
     */
    static forSurnames(names) {
        return new FuzzyDictionaryMatcher(names, {
            maxDistance: 2,
            ocrNormalize: true,
            phoneticMatch: true,
            minLengthForFuzzy: 3,
            useFastMatcher: true,
        });
    }
    /**
     * Create matcher for locations (less phonetic, more OCR)
     */
    static forLocations(locations) {
        return new FuzzyDictionaryMatcher(locations, {
            maxDistance: 2,
            ocrNormalize: true,
            phoneticMatch: false,
            minLengthForFuzzy: 4,
            useFastMatcher: true,
        });
    }
    /**
     * Create strict matcher (exact + normalized only)
     */
    static strict(terms) {
        return new FuzzyDictionaryMatcher(terms, {
            maxDistance: 0,
            ocrNormalize: true,
            phoneticMatch: false,
            minLengthForFuzzy: 100, // effectively disable fuzzy
            useFastMatcher: false, // No need for fast matcher with maxDistance=0
        });
    }
}
exports.FuzzyDictionaryMatcher = FuzzyDictionaryMatcher;
//# sourceMappingURL=FuzzyDictionaryMatcher.js.map