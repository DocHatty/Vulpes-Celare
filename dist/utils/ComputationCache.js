"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComputationCache = void 0;
exports.memoize = memoize;
exports.cachedStringDistance = cachedStringDistance;
const lru_cache_1 = require("lru-cache");
const ServiceContainer_1 = require("../core/ServiceContainer");
/**
 * Computation cache singleton
 */
class ComputationCache {
    // Singleton instance
    static instance = null;
    // Cache instances
    similarityCache;
    entropyCache;
    documentCache;
    patternCache;
    // Statistics
    stats = {
        similarity: { hits: 0, misses: 0 },
        entropy: { hits: 0, misses: 0 },
        document: { hits: 0, misses: 0 },
        pattern: { hits: 0, misses: 0 },
    };
    constructor() {
        // Initialize caches with appropriate sizes
        this.similarityCache = new lru_cache_1.LRUCache({
            max: 50000, // ~2MB for string pairs
            ttl: 1000 * 60 * 30, // 30 minutes
        });
        this.entropyCache = new lru_cache_1.LRUCache({
            max: 10000,
            ttl: 1000 * 60 * 30,
        });
        this.documentCache = new lru_cache_1.LRUCache({
            max: 100,
            ttl: 1000 * 60 * 5, // 5 minutes
        });
        this.patternCache = new lru_cache_1.LRUCache({
            max: 20000,
            ttl: 1000 * 60 * 30,
        });
    }
    /**
     * Get singleton instance
     */
    static getInstance() {
        // Check DI container first (enables testing/replacement)
        const fromContainer = ServiceContainer_1.container.tryResolve(ServiceContainer_1.ServiceIds.ComputationCache);
        if (fromContainer) {
            return fromContainer;
        }
        // Fall back to static instance
        if (!ComputationCache.instance) {
            ComputationCache.instance = new ComputationCache();
            ServiceContainer_1.container.registerInstance(ServiceContainer_1.ServiceIds.ComputationCache, ComputationCache.instance);
        }
        return ComputationCache.instance;
    }
    /**
     * Reset singleton (for testing)
     */
    static reset() {
        if (ComputationCache.instance) {
            ComputationCache.instance.clearAll();
            ComputationCache.instance = null;
        }
    }
    // ============ String Similarity ============
    /**
     * Generate cache key for string pair (order-independent)
     */
    getSimilarityKey(s1, s2) {
        // Ensure consistent ordering for cache hits
        return s1 < s2 ? `${s1}|${s2}` : `${s2}|${s1}`;
    }
    /**
     * Get cached Jaro-Winkler similarity
     */
    getJaroWinkler(s1, s2, compute) {
        const key = this.getSimilarityKey(s1, s2);
        const cached = this.similarityCache.get(key);
        if (cached && cached.jaroWinkler !== undefined) {
            this.stats.similarity.hits++;
            return cached.jaroWinkler;
        }
        this.stats.similarity.misses++;
        const result = compute();
        // Update or create cache entry
        const entry = cached || {
            jaroWinkler: 0,
            levenshtein: -1,
            damerauLevenshtein: -1,
        };
        entry.jaroWinkler = result;
        this.similarityCache.set(key, entry);
        return result;
    }
    /**
     * Get cached Levenshtein distance
     */
    getLevenshtein(s1, s2, compute) {
        const key = this.getSimilarityKey(s1, s2);
        const cached = this.similarityCache.get(key);
        if (cached && cached.levenshtein >= 0) {
            this.stats.similarity.hits++;
            return cached.levenshtein;
        }
        this.stats.similarity.misses++;
        const result = compute();
        const entry = cached || {
            jaroWinkler: -1,
            levenshtein: 0,
            damerauLevenshtein: -1,
        };
        entry.levenshtein = result;
        this.similarityCache.set(key, entry);
        return result;
    }
    /**
     * Get cached Damerau-Levenshtein distance
     */
    getDamerauLevenshtein(s1, s2, compute) {
        const key = this.getSimilarityKey(s1, s2);
        const cached = this.similarityCache.get(key);
        if (cached && cached.damerauLevenshtein >= 0) {
            this.stats.similarity.hits++;
            return cached.damerauLevenshtein;
        }
        this.stats.similarity.misses++;
        const result = compute();
        const entry = cached || {
            jaroWinkler: -1,
            levenshtein: -1,
            damerauLevenshtein: 0,
        };
        entry.damerauLevenshtein = result;
        this.similarityCache.set(key, entry);
        return result;
    }
    // ============ Entropy ============
    /**
     * Get cached Shannon entropy
     */
    getEntropy(key, compute) {
        const cached = this.entropyCache.get(key);
        if (cached !== undefined) {
            this.stats.entropy.hits++;
            return cached;
        }
        this.stats.entropy.misses++;
        const result = compute();
        this.entropyCache.set(key, result);
        return result;
    }
    /**
     * Generate entropy cache key from signal data
     */
    static entropyKey(positiveCount, totalCount) {
        return `${positiveCount}/${totalCount}`;
    }
    // ============ Document Analysis ============
    /**
     * Get cached document analysis
     */
    getDocumentAnalysis(documentKey, compute) {
        const cached = this.documentCache.get(documentKey);
        if (cached !== undefined) {
            this.stats.document.hits++;
            return cached;
        }
        this.stats.document.misses++;
        const result = compute();
        this.documentCache.set(documentKey, result);
        return result;
    }
    /**
     * Generate document cache key (first N chars + length)
     */
    static documentKey(text, prefixLength = 500) {
        const prefix = text.substring(0, prefixLength);
        return `${text.length}:${prefix}`;
    }
    // ============ Pattern Matching ============
    /**
     * Get cached pattern match result
     */
    getPatternMatch(patternKey, text, compute) {
        const key = `${patternKey}:${text.length}:${text.substring(0, 100)}`;
        const cached = this.patternCache.get(key);
        if (cached !== undefined) {
            this.stats.pattern.hits++;
            return cached.result;
        }
        this.stats.pattern.misses++;
        const result = compute();
        this.patternCache.set(key, { result });
        return result;
    }
    // ============ Cache Management ============
    /**
     * Clear all caches
     */
    clearAll() {
        this.similarityCache.clear();
        this.entropyCache.clear();
        this.documentCache.clear();
        this.patternCache.clear();
    }
    /**
     * Clear specific cache
     */
    clearCache(cacheName) {
        switch (cacheName) {
            case "similarity":
                this.similarityCache.clear();
                break;
            case "entropy":
                this.entropyCache.clear();
                break;
            case "document":
                this.documentCache.clear();
                break;
            case "pattern":
                this.patternCache.clear();
                break;
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const calcStats = (cache, stats) => ({
            hits: stats.hits,
            misses: stats.misses,
            size: cache.size,
            hitRate: stats.hits + stats.misses > 0
                ? stats.hits / (stats.hits + stats.misses)
                : 0,
        });
        return {
            similarity: calcStats(this.similarityCache, this.stats.similarity),
            entropy: calcStats(this.entropyCache, this.stats.entropy),
            document: calcStats(this.documentCache, this.stats.document),
            pattern: calcStats(this.patternCache, this.stats.pattern),
        };
    }
    /**
     * Get total memory estimate (rough)
     */
    getMemoryEstimate() {
        // Rough estimate: 100 bytes per similarity entry, 50 per entropy, 1KB per document
        return (this.similarityCache.size * 100 +
            this.entropyCache.size * 50 +
            this.documentCache.size * 1000 +
            this.patternCache.size * 200);
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            similarity: { hits: 0, misses: 0 },
            entropy: { hits: 0, misses: 0 },
            document: { hits: 0, misses: 0 },
            pattern: { hits: 0, misses: 0 },
        };
    }
}
exports.ComputationCache = ComputationCache;
// ============ Utility Functions ============
/**
 * Memoize a function with LRU caching
 */
function memoize(fn, options = {}) {
    const cache = new lru_cache_1.LRUCache({
        max: options.maxSize || 1000,
        ttl: options.ttl,
    });
    const keyFn = options.keyFn || ((...args) => JSON.stringify(args));
    return ((...args) => {
        const key = keyFn(...args);
        const cached = cache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    });
}
/**
 * Create a cached version of a string distance function
 */
function cachedStringDistance(distanceFn, maxSize = 10000) {
    const cache = new lru_cache_1.LRUCache({ max: maxSize });
    return (a, b) => {
        // Ensure consistent key ordering
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        const cached = cache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const result = distanceFn(a, b);
        cache.set(key, result);
        return result;
    };
}
//# sourceMappingURL=ComputationCache.js.map