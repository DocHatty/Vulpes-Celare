/**
 * Vector-Based Disambiguation Service
 *
 * Resolves ambiguous span detections using vector similarity.
 * Based on Phileas's VectorBasedSpanDisambiguationService.
 *
 * MATHEMATICAL FOUNDATION:
 * 1. Cosine Similarity - Standard vector comparison metric
 *    Formula: cos(A, B) = (A · B) / (||A|| * ||B||)
 *    Reference: Salton & McGill (1983) "Introduction to Modern Information Retrieval"
 *
 * 2. L2 Normalization - Unit vector conversion for fair comparison
 *    Formula: v_norm = v / ||v|| where ||v|| = sqrt(sum(v_i^2))
 *
 * 3. TF-IDF Weighting (optional) - Term importance weighting
 *    Formula: tf-idf(t,d) = tf(t,d) * log(N / df(t))
 *    Reference: Sparck Jones (1972) "A statistical interpretation of term specificity"
 *
 * Example: "Jordan" could be NAME or ADDRESS
 * - Analyzes context window: ["Dr", "Jordan", "examined", "patient"]
 * - Creates vector from hash of context
 * - Compares to historical patterns using cosine similarity
 * - Selects most similar filter type
 *
 * @module redaction/services
 */
import { Span } from "../models/Span";
export interface VectorConfig {
    /** Vector size (default: 512) */
    vectorSize?: number;
    /** Hash algorithm (default: murmur3-like) */
    hashAlgorithm?: "murmur3" | "djb2" | "fnv1a";
    /** Remove stop words before vectorization (default: true) */
    filterStopWords?: boolean;
    /** Minimum confidence threshold for disambiguation (default: 0.3) */
    minConfidence?: number;
}
/**
 * Vector-Based Disambiguation Service
 * Uses hashing + vector similarity to resolve ambiguous spans
 */
export declare class VectorDisambiguationService {
    private config;
    private vectorCache;
    constructor(config?: VectorConfig);
    /**
     * Disambiguate all spans with ambiguous interpretations
     *
     * @param spans - All detected spans
     * @returns Disambiguated spans (ambiguous ones resolved)
     */
    disambiguate(spans: Span[]): Span[];
    /**
     * Select best span from ambiguous group using vector similarity
     */
    private selectBestSpan;
    /**
     * Calculate disambiguation score for a span
     * Higher score = more confident in this filter type
     */
    private calculateDisambiguationScore;
    /**
     * Cache span observation for future disambiguation
     */
    private cacheObservation;
    /**
     * Create vector representation of span + context
     */
    private createVector;
    /**
     * Convert text to vector using hashing
     */
    private hashToVector;
    /**
     * Hash string to integer
     */
    private hashString;
    /**
     * MurmurHash3 (32-bit)
     */
    private murmur3Hash;
    /**
     * DJB2 hash
     */
    private djb2Hash;
    /**
     * FNV-1a hash
     */
    private fnv1aHash;
    /**
     * Calculate cosine similarity between two vectors
     * Formula: cos(A, B) = (A · B) / (||A|| * ||B||)
     *
     * Edge cases handled:
     * - Zero vectors: returns 0 (no similarity can be determined)
     * - Near-zero magnitudes: uses epsilon to prevent division instability
     * - Single non-zero dimension: handled correctly
     *
     * Reference: Salton & McGill (1983)
     */
    private cosineSimilarity;
    /**
     * Calculate Euclidean (L2) distance between two vectors
     * Formula: d(A, B) = sqrt(sum((a_i - b_i)^2))
     * Useful as alternative to cosine when vector magnitudes matter
     */
    private euclideanDistance;
    /**
     * Convert Euclidean distance to similarity in [0, 1]
     * Formula: similarity = 1 / (1 + distance)
     * This is a standard transformation that maps [0, inf) -> (0, 1]
     */
    private distanceToSimilarity;
    /**
     * Make cache key from window tokens
     */
    private makeWindowKey;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        uniqueContexts: number;
        totalVectors: number;
        typeDistribution: Record<string, number>;
        avgVectorsPerContext: number;
    };
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Export cache to JSON
     */
    exportCache(): Record<string, any>;
    /**
     * Import cache from JSON
     */
    importCache(data: Record<string, any>): void;
}
//# sourceMappingURL=VectorDisambiguationService.d.ts.map