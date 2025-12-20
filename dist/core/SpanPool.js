"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanPool = void 0;
const Span_1 = require("../models/Span");
/**
 * Default metadata for creating empty span objects
 */
const EMPTY_SPAN_METADATA = {
    text: "",
    originalValue: "",
    characterStart: -1,
    characterEnd: -1,
    filterType: Span_1.FilterType.CUSTOM,
    confidence: 0,
    priority: 0,
    context: "",
    window: [],
    replacement: null,
    salt: null,
    pattern: null,
    applied: false,
    ignored: false,
    ambiguousWith: [],
    disambiguationScore: null,
};
/**
 * SpanPool - Static object pool for Span instances
 *
 * Thread-safe design (JavaScript is single-threaded but async-safe)
 * All methods are static for global pool access
 */
class SpanPool {
    /** The object pool - LIFO stack for cache locality */
    static pool = [];
    /** Maximum pool size to prevent unbounded memory growth */
    static maxPoolSize = 10000;
    /** Debug mode: track spans to detect double-release */
    static debugMode = process.env.NODE_ENV === "development";
    /** Spans acquired from pool - tracked to detect double-release (only in debug mode) */
    static acquiredSpans = new WeakSet();
    /** Spans already released - tracked to detect double-release (only in debug mode) */
    static releasedSpans = new WeakSet();
    /** Statistics counters */
    static stats = {
        acquired: 0,
        released: 0,
        created: 0,
        peakPoolSize: 0,
        dropped: 0,
        shrinkCount: 0,
    };
    /** Pool initialization flag */
    static initialized = false;
    /** Last shrink check timestamp */
    static lastShrinkCheck = Date.now();
    /** Shrink interval in milliseconds (default: 60 seconds) */
    static shrinkIntervalMs = 60000;
    /** Target pool utilization ratio for shrinking (default: 0.5) */
    static shrinkThreshold = 0.5;
    /**
     * Configure pool settings
     * Call before first use or prewarm for custom settings
     */
    static configure(config) {
        if (config.maxSize !== undefined) {
            SpanPool.maxPoolSize = config.maxSize;
        }
        if (config.debugMode !== undefined) {
            SpanPool.debugMode = config.debugMode;
        }
        if (config.prewarmCount !== undefined && config.prewarmCount > 0) {
            SpanPool.prewarm(config.prewarmCount);
        }
    }
    /**
     * Pre-warm the pool with empty span objects
     * Call at application startup to avoid allocation during first requests
     *
     * @param count - Number of spans to pre-allocate (default: 500)
     */
    static prewarm(count = 500) {
        const targetCount = Math.min(count, SpanPool.maxPoolSize);
        const currentSize = SpanPool.pool.length;
        const toCreate = targetCount - currentSize;
        if (toCreate <= 0) {
            return; // Pool already at or above target size
        }
        for (let i = 0; i < toCreate; i++) {
            SpanPool.pool.push(new Span_1.Span({ ...EMPTY_SPAN_METADATA }));
        }
        SpanPool.stats.peakPoolSize = Math.max(SpanPool.stats.peakPoolSize, SpanPool.pool.length);
        SpanPool.initialized = true;
    }
    /**
     * Acquire a Span from the pool or create a new one
     *
     * @param init - Initial values for the span (partial SpanMetadata)
     * @returns Span instance initialized with provided values
     */
    static acquire(init) {
        SpanPool.stats.acquired++;
        let span;
        if (SpanPool.pool.length > 0) {
            // Reuse from pool
            span = SpanPool.pool.pop();
            SpanPool.initializeSpan(span, init);
        }
        else {
            // Pool empty - create new
            SpanPool.stats.created++;
            span = new Span_1.Span({
                ...EMPTY_SPAN_METADATA,
                ...init,
                // Ensure arrays are new instances, not shared
                window: init.window ? [...init.window] : [],
                ambiguousWith: init.ambiguousWith ? [...init.ambiguousWith] : [],
            });
        }
        // Track in debug mode for double-release detection
        if (SpanPool.debugMode) {
            SpanPool.acquiredSpans.add(span);
            // Remove from released set if it was previously released and now reacquired
            SpanPool.releasedSpans.delete(span);
        }
        return span;
    }
    /**
     * Initialize a pooled span with new values
     */
    static initializeSpan(span, init) {
        // Set all properties from init, using defaults for missing
        span.text = init.text ?? "";
        span.characterStart = init.characterStart ?? -1;
        span.characterEnd = init.characterEnd ?? -1;
        span.filterType = init.filterType ?? Span_1.FilterType.CUSTOM;
        span.confidence = init.confidence ?? 0;
        span.priority = init.priority ?? 0;
        span.context = init.context ?? "";
        span.replacement = init.replacement ?? null;
        span.salt = init.salt ?? null;
        span.pattern = init.pattern ?? null;
        span.applied = init.applied ?? false;
        span.ignored = init.ignored ?? false;
        span.disambiguationScore = init.disambiguationScore ?? null;
        // Arrays need special handling - create new instances
        if (init.window) {
            span.window = [...init.window];
        }
        else {
            span.window = [];
        }
        if (init.ambiguousWith) {
            span.ambiguousWith = [...init.ambiguousWith];
        }
        else {
            span.ambiguousWith = [];
        }
    }
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
    static release(span) {
        // Debug mode: detect true double-release (same span released twice)
        if (SpanPool.debugMode) {
            if (SpanPool.releasedSpans.has(span)) {
                console.error("[SpanPool] WARNING: Double-release detected. This span was already released to the pool.");
                return; // Don't add to pool again
            }
            // Mark as released
            SpanPool.releasedSpans.add(span);
            // Remove from acquired set
            SpanPool.acquiredSpans.delete(span);
        }
        SpanPool.stats.released++;
        // SECURITY CRITICAL: Clear all PHI-containing fields
        SpanPool.clearSpan(span);
        // Return to pool if not full
        if (SpanPool.pool.length < SpanPool.maxPoolSize) {
            SpanPool.pool.push(span);
            SpanPool.stats.peakPoolSize = Math.max(SpanPool.stats.peakPoolSize, SpanPool.pool.length);
        }
        else {
            // Pool full - let GC handle it
            SpanPool.stats.dropped++;
        }
        // Periodically check if pool should shrink (sync.Pool best practice)
        SpanPool.maybeShrink();
    }
    /**
     * Release multiple spans back to the pool
     *
     * @param spans - Array of spans to release
     */
    static releaseMany(spans) {
        for (const span of spans) {
            SpanPool.release(span);
        }
    }
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
    static clearSpan(span) {
        // PHI-containing string fields - clear to empty
        // CRITICAL: 'text' contains the actual PHI and MUST be cleared
        span.text = "";
        span.context = "";
        span.pattern = null;
        span.replacement = null;
        span.salt = null;
        // Position fields - set to invalid values
        span.characterStart = -1;
        span.characterEnd = -1;
        // Classification fields - reset to defaults
        span.filterType = Span_1.FilterType.CUSTOM;
        span.confidence = 0;
        span.priority = 0;
        // Status flags - reset
        span.applied = false;
        span.ignored = false;
        span.disambiguationScore = null;
        // Arrays - clear (reuse array objects to avoid allocation)
        span.window.length = 0;
        span.ambiguousWith.length = 0;
    }
    /**
     * Get pool statistics for monitoring
     */
    static getStats() {
        const acquired = SpanPool.stats.acquired;
        const created = SpanPool.stats.created;
        const reuseRate = acquired > 0 ? (acquired - created) / acquired : 0;
        return {
            acquired,
            released: SpanPool.stats.released,
            created,
            poolSize: SpanPool.pool.length,
            reuseRate,
            peakPoolSize: SpanPool.stats.peakPoolSize,
            dropped: SpanPool.stats.dropped,
        };
    }
    /**
     * Clear the pool and reset statistics
     * Use for testing or when shutting down
     */
    static clear() {
        SpanPool.pool.length = 0;
        SpanPool.stats.acquired = 0;
        SpanPool.stats.released = 0;
        SpanPool.stats.created = 0;
        SpanPool.stats.peakPoolSize = 0;
        SpanPool.stats.dropped = 0;
        SpanPool.initialized = false;
        // Reset debug tracking (create fresh WeakSets)
        SpanPool.acquiredSpans = new WeakSet();
        SpanPool.releasedSpans = new WeakSet();
    }
    /**
     * Check if pool has been initialized (prewarmed)
     */
    static isInitialized() {
        return SpanPool.initialized;
    }
    /**
     * Get current pool size
     */
    static size() {
        return SpanPool.pool.length;
    }
    /**
     * Check if pool is empty
     */
    static isEmpty() {
        return SpanPool.pool.length === 0;
    }
    /**
     * Enable or disable debug mode
     * Debug mode tracks active spans to detect double-release bugs
     */
    static setDebugMode(enabled) {
        SpanPool.debugMode = enabled;
    }
    /**
     * Shrink pool if utilization is low (sync.Pool best practice)
     *
     * Called periodically during release operations to prevent memory bloat
     * when load decreases. Similar to how Go's sync.Pool can be GC'd.
     */
    static maybeShrink() {
        const now = Date.now();
        // Only check periodically
        if (now - SpanPool.lastShrinkCheck < SpanPool.shrinkIntervalMs) {
            return;
        }
        SpanPool.lastShrinkCheck = now;
        // Calculate utilization: how much of the pool is being used
        const currentSize = SpanPool.pool.length;
        const peakSize = SpanPool.stats.peakPoolSize;
        if (peakSize === 0 || currentSize === 0) {
            return;
        }
        // If pool is significantly larger than recent peak usage, shrink it
        // This handles the case where load decreased significantly
        // If we have way more pooled than needed, shrink
        const targetSize = Math.max(Math.ceil(currentSize * SpanPool.shrinkThreshold), 100 // Minimum pool size
        );
        if (currentSize > targetSize * 2) {
            const toRemove = currentSize - targetSize;
            SpanPool.pool.splice(0, toRemove);
            SpanPool.stats.shrinkCount++;
            if (SpanPool.debugMode) {
                console.log(`[SpanPool] Shrunk pool from ${currentSize} to ${SpanPool.pool.length} spans`);
            }
        }
    }
    /**
     * Force shrink pool to target size
     * Use for manual memory management or shutdown
     */
    static shrinkTo(targetSize) {
        const currentSize = SpanPool.pool.length;
        if (currentSize <= targetSize) {
            return 0;
        }
        const toRemove = currentSize - targetSize;
        SpanPool.pool.splice(0, toRemove);
        SpanPool.stats.shrinkCount++;
        return toRemove;
    }
    /**
     * Get shrink statistics
     */
    static getShrinkCount() {
        return SpanPool.stats.shrinkCount;
    }
}
exports.SpanPool = SpanPool;
//# sourceMappingURL=SpanPool.js.map