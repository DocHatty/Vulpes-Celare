/**
 * SpanPool - High-Performance Object Pool for Span Instances
 *
 * Eliminates GC pressure by reusing Span objects instead of allocating new ones.
 * Based on Bifrost's sync.Pool pattern adapted for TypeScript.
 *
 * SECURITY CRITICAL:
 * - All PHI-containing fields are cryptographically cleared before pool return
 * - Pool is bounded to prevent unbounded memory growth
 * - Debug mode tracks active spans to detect double-release bugs
 *
 * PERFORMANCE:
 * - Pre-warming eliminates cold-start allocation latency
 * - Pool access is O(1) with array pop/push
 * - Statistics tracking for monitoring pool efficiency
 *
 * USAGE:
 *   // Acquire a span from pool (or create new if empty)
 *   const span = SpanPool.acquire({ text: 'John', ... });
 *
 *   // When done with span, release back to pool
 *   SpanPool.release(span);
 *
 *   // Or release many at once
 *   SpanPool.releaseMany(spans);
 *
 * @module redaction/core
 */
import { Span, SpanMetadata } from "../models/Span";
/**
 * Pool statistics for monitoring
 */
export interface SpanPoolStats {
    /** Total spans acquired from pool */
    acquired: number;
    /** Total spans released back to pool */
    released: number;
    /** Total new spans created (pool was empty) */
    created: number;
    /** Current pool size */
    poolSize: number;
    /** Pool reuse rate (higher = better) */
    reuseRate: number;
    /** Peak pool size reached */
    peakPoolSize: number;
    /** Spans dropped due to pool full */
    dropped: number;
}
/**
 * Configuration for SpanPool behavior
 */
export interface SpanPoolConfig {
    /** Maximum pool size (default: 10000) */
    maxSize?: number;
    /** Initial prewarm count (default: 500) */
    prewarmCount?: number;
    /** Enable debug mode with active span tracking (default: false in production) */
    debugMode?: boolean;
}
/**
 * SpanPool - Static object pool for Span instances
 *
 * Thread-safe design (JavaScript is single-threaded but async-safe)
 * All methods are static for global pool access
 */
export declare class SpanPool {
    /** The object pool - LIFO stack for cache locality */
    private static pool;
    /** Maximum pool size to prevent unbounded memory growth */
    private static maxPoolSize;
    /** Debug mode: track spans to detect double-release */
    private static debugMode;
    /** Spans acquired from pool - tracked to detect double-release (only in debug mode) */
    private static acquiredSpans;
    /** Spans already released - tracked to detect double-release (only in debug mode) */
    private static releasedSpans;
    /** Statistics counters */
    private static stats;
    /** Pool initialization flag */
    private static initialized;
    /** Last shrink check timestamp */
    private static lastShrinkCheck;
    /** Shrink interval in milliseconds (default: 60 seconds) */
    private static shrinkIntervalMs;
    /** Target pool utilization ratio for shrinking (default: 0.5) */
    private static shrinkThreshold;
    /**
     * Configure pool settings
     * Call before first use or prewarm for custom settings
     */
    static configure(config: SpanPoolConfig): void;
    /**
     * Pre-warm the pool with empty span objects
     * Call at application startup to avoid allocation during first requests
     *
     * @param count - Number of spans to pre-allocate (default: 500)
     */
    static prewarm(count?: number): void;
    /**
     * Acquire a Span from the pool or create a new one
     *
     * @param init - Initial values for the span (partial SpanMetadata)
     * @returns Span instance initialized with provided values
     */
    static acquire(init: Partial<SpanMetadata>): Span;
    /**
     * Initialize a pooled span with new values
     */
    private static initializeSpan;
    /**
     * Release a Span back to the pool
     *
     * SECURITY: Clears all PHI-containing fields before returning to pool
     *
     * Accepts spans created outside the pool (via new Span()) - they will be
     * added to the pool for future reuse. This allows gradual migration of
     * filters to use SpanFactory.
     *
     * @param span - Span to release
     */
    static release(span: Span): void;
    /**
     * Release multiple spans back to the pool
     *
     * @param spans - Array of spans to release
     */
    static releaseMany(spans: Span[]): void;
    /**
     * Clear all PHI-containing fields from a span
     *
     * SECURITY CRITICAL: This method ensures no PHI leaks between documents
     * All string fields are set to empty string (not null) to avoid type issues
     * All arrays are cleared to empty arrays
     * Positions are set to -1 to make any accidental reuse obvious
     *
     * AUDIT (2025-12-19): Verified all PHI-containing fields are cleared
     * Note: originalValue is only in SpanMetadata interface (for construction),
     * not stored as a Span class property. The 'text' field contains the actual PHI.
     */
    private static clearSpan;
    /**
     * Get pool statistics for monitoring
     */
    static getStats(): SpanPoolStats;
    /**
     * Clear the pool and reset statistics
     * Use for testing or when shutting down
     */
    static clear(): void;
    /**
     * Check if pool has been initialized (prewarmed)
     */
    static isInitialized(): boolean;
    /**
     * Get current pool size
     */
    static size(): number;
    /**
     * Check if pool is empty
     */
    static isEmpty(): boolean;
    /**
     * Enable or disable debug mode
     * Debug mode tracks active spans to detect double-release bugs
     */
    static setDebugMode(enabled: boolean): void;
    /**
     * Shrink pool if utilization is low (sync.Pool best practice)
     *
     * Called periodically during release operations to prevent memory bloat
     * when load decreases. Similar to how Go's sync.Pool can be GC'd.
     */
    private static maybeShrink;
    /**
     * Force shrink pool to target size
     * Use for manual memory management or shutdown
     */
    static shrinkTo(targetSize: number): number;
    /**
     * Get shrink statistics
     */
    static getShrinkCount(): number;
}
//# sourceMappingURL=SpanPool.d.ts.map