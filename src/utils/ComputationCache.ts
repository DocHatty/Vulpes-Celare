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

import { LRUCache } from "lru-cache";
import { container, ServiceIds } from "../core/ServiceContainer";

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
 * String similarity cache entry
 */
interface SimilarityEntry {
  jaroWinkler: number;
  levenshtein: number;
  damerauLevenshtein: number;
}

/**
 * Wrapper for pattern match results (allows caching null results)
 */
interface PatternMatchEntry {
  result: RegExpMatchArray | null;
}

/**
 * Computation cache singleton
 */
export class ComputationCache {
  // Singleton instance
  private static instance: ComputationCache | null = null;

  // Cache instances
  private readonly similarityCache: LRUCache<string, SimilarityEntry>;
  private readonly entropyCache: LRUCache<string, number>;
  private readonly documentCache: LRUCache<string, any>;
  private readonly patternCache: LRUCache<string, PatternMatchEntry>;

  // Statistics
  private stats = {
    similarity: { hits: 0, misses: 0 },
    entropy: { hits: 0, misses: 0 },
    document: { hits: 0, misses: 0 },
    pattern: { hits: 0, misses: 0 },
  };

  private constructor() {
    // Initialize caches with appropriate sizes
    this.similarityCache = new LRUCache<string, SimilarityEntry>({
      max: 50000, // ~2MB for string pairs
      ttl: 1000 * 60 * 30, // 30 minutes
    });

    this.entropyCache = new LRUCache<string, number>({
      max: 10000,
      ttl: 1000 * 60 * 30,
    });

    this.documentCache = new LRUCache<string, any>({
      max: 100,
      ttl: 1000 * 60 * 5, // 5 minutes
    });

    this.patternCache = new LRUCache<string, PatternMatchEntry>({
      max: 20000,
      ttl: 1000 * 60 * 30,
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ComputationCache {
    // Check DI container first (enables testing/replacement)
    const fromContainer = container.tryResolve<ComputationCache>(ServiceIds.ComputationCache);
    if (fromContainer) {
      return fromContainer;
    }
    // Fall back to static instance
    if (!ComputationCache.instance) {
      ComputationCache.instance = new ComputationCache();
      container.registerInstance(ServiceIds.ComputationCache, ComputationCache.instance);
    }
    return ComputationCache.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (ComputationCache.instance) {
      ComputationCache.instance.clearAll();
      ComputationCache.instance = null;
    }
  }

  // ============ String Similarity ============

  /**
   * Generate cache key for string pair (order-independent)
   */
  private getSimilarityKey(s1: string, s2: string): string {
    // Ensure consistent ordering for cache hits
    return s1 < s2 ? `${s1}|${s2}` : `${s2}|${s1}`;
  }

  /**
   * Get cached Jaro-Winkler similarity
   */
  getJaroWinkler(s1: string, s2: string, compute: () => number): number {
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
  getLevenshtein(s1: string, s2: string, compute: () => number): number {
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
  getDamerauLevenshtein(s1: string, s2: string, compute: () => number): number {
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
  getEntropy(key: string, compute: () => number): number {
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
  static entropyKey(positiveCount: number, totalCount: number): string {
    return `${positiveCount}/${totalCount}`;
  }

  // ============ Document Analysis ============

  /**
   * Get cached document analysis
   */
  getDocumentAnalysis<T>(documentKey: string, compute: () => T): T {
    const cached = this.documentCache.get(documentKey);

    if (cached !== undefined) {
      this.stats.document.hits++;
      return cached as T;
    }

    this.stats.document.misses++;
    const result = compute();
    this.documentCache.set(documentKey, result);
    return result;
  }

  /**
   * Generate document cache key (first N chars + length)
   */
  static documentKey(text: string, prefixLength: number = 500): string {
    const prefix = text.substring(0, prefixLength);
    return `${text.length}:${prefix}`;
  }

  // ============ Pattern Matching ============

  /**
   * Get cached pattern match result
   */
  getPatternMatch(
    patternKey: string,
    text: string,
    compute: () => RegExpMatchArray | null,
  ): RegExpMatchArray | null {
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
  clearAll(): void {
    this.similarityCache.clear();
    this.entropyCache.clear();
    this.documentCache.clear();
    this.patternCache.clear();
  }

  /**
   * Clear specific cache
   */
  clearCache(
    cacheName: "similarity" | "entropy" | "document" | "pattern",
  ): void {
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
  getStats(): Record<string, CacheStats> {
    const calcStats = (
      cache: LRUCache<any, any>,
      stats: { hits: number; misses: number },
    ): CacheStats => ({
      hits: stats.hits,
      misses: stats.misses,
      size: cache.size,
      hitRate:
        stats.hits + stats.misses > 0
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
  getMemoryEstimate(): number {
    // Rough estimate: 100 bytes per similarity entry, 50 per entropy, 1KB per document
    return (
      this.similarityCache.size * 100 +
      this.entropyCache.size * 50 +
      this.documentCache.size * 1000 +
      this.patternCache.size * 200
    );
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      similarity: { hits: 0, misses: 0 },
      entropy: { hits: 0, misses: 0 },
      document: { hits: 0, misses: 0 },
      pattern: { hits: 0, misses: 0 },
    };
  }
}

// ============ Utility Functions ============

/**
 * Memoize a function with LRU caching
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    maxSize?: number;
    ttl?: number;
    keyFn?: (...args: Parameters<T>) => string;
  } = {},
): T {
  const cache = new LRUCache<string, ReturnType<T>>({
    max: options.maxSize || 1000,
    ttl: options.ttl,
  });

  const keyFn = options.keyFn || ((...args) => JSON.stringify(args));

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Create a cached version of a string distance function
 */
export function cachedStringDistance(
  distanceFn: (a: string, b: string) => number,
  maxSize: number = 10000,
): (a: string, b: string) => number {
  const cache = new LRUCache<string, number>({ max: maxSize });

  return (a: string, b: string): number => {
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
