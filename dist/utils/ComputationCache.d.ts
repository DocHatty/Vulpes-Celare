/**
 * ComputationCache - LRU Caching for Expensive Computations
 *
 * PERFORMANCE: Eliminates redundant calculations in hot paths
 *
 * Provides specialized caches for:
 * - String similarity computations (Jaro-Winkler, Levenshtein)
 * - Document analysis results
 * - Entropy calculations
 * - Pattern matching results
 *
 * Uses lru-cache for automatic eviction and memory management.
 *
 * @module redaction/utils
 */
/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
}
/**
 * Computation cache singleton
 */
export declare class ComputationCache {
    private static instance;
    private readonly similarityCache;
    private readonly entropyCache;
    private readonly documentCache;
    private readonly patternCache;
    private stats;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): ComputationCache;
    /**
     * Reset singleton (for testing)
     */
    static reset(): void;
    /**
     * Generate cache key for string pair (order-independent)
     */
    private getSimilarityKey;
    /**
     * Get cached Jaro-Winkler similarity
     */
    getJaroWinkler(s1: string, s2: string, compute: () => number): number;
    /**
     * Get cached Levenshtein distance
     */
    getLevenshtein(s1: string, s2: string, compute: () => number): number;
    /**
     * Get cached Damerau-Levenshtein distance
     */
    getDamerauLevenshtein(s1: string, s2: string, compute: () => number): number;
    /**
     * Get cached Shannon entropy
     */
    getEntropy(key: string, compute: () => number): number;
    /**
     * Generate entropy cache key from signal data
     */
    static entropyKey(positiveCount: number, totalCount: number): string;
    /**
     * Get cached document analysis
     */
    getDocumentAnalysis<T>(documentKey: string, compute: () => T): T;
    /**
     * Generate document cache key (first N chars + length)
     */
    static documentKey(text: string, prefixLength?: number): string;
    /**
     * Get cached pattern match result
     */
    getPatternMatch(patternKey: string, text: string, compute: () => RegExpMatchArray | null): RegExpMatchArray | null;
    /**
     * Clear all caches
     */
    clearAll(): void;
    /**
     * Clear specific cache
     */
    clearCache(cacheName: "similarity" | "entropy" | "document" | "pattern"): void;
    /**
     * Get cache statistics
     */
    getStats(): Record<string, CacheStats>;
    /**
     * Get total memory estimate (rough)
     */
    getMemoryEstimate(): number;
    /**
     * Reset statistics
     */
    resetStats(): void;
}
/**
 * Memoize a function with LRU caching
 */
export declare function memoize<T extends (...args: any[]) => any>(fn: T, options?: {
    maxSize?: number;
    ttl?: number;
    keyFn?: (...args: Parameters<T>) => string;
}): T;
/**
 * Create a cached version of a string distance function
 */
export declare function cachedStringDistance(distanceFn: (a: string, b: string) => number, maxSize?: number): (a: string, b: string) => number;
//# sourceMappingURL=ComputationCache.d.ts.map