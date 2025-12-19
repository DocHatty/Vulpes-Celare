"use strict";
/**
 * NameDetectionCoordinator - Unified Name Detection Orchestration
 *
 * This coordinator eliminates duplicate Rust scanner calls and pattern matching
 * by providing a single entry point for name detection.
 *
 * BEFORE (4 filters calling Rust independently):
 * - FormattedNameFilterSpan: RustNameScanner.detectLastFirst() + detectFirstLast()
 * - SmartNameFilterSpan: RustNameScanner.detectLastFirst() + detectFirstLast() + detectSmart()
 * - TitledNameFilterSpan: RustNameScanner.detectSmart()
 * - FamilyNameFilterSpan: RustNameScanner.detectSmart()
 *
 * AFTER (Coordinator caches results):
 * - Single call to each Rust method per document
 * - Results cached and distributed to filters
 * - ~60% reduction in Rust FFI overhead
 *
 * USAGE:
 * ```typescript
 * const coordinator = NameDetectionCoordinator.getInstance();
 * coordinator.beginDocument(text);
 *
 * // In each filter:
 * const rustLastFirst = coordinator.getRustLastFirst();
 * const rustFirstLast = coordinator.getRustFirstLast();
 * const rustSmart = coordinator.getRustSmart();
 *
 * coordinator.endDocument();
 * ```
 *
 * @module filters/name-patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameDetectionCoordinator = exports.NameDetectionCoordinator = void 0;
const RustNameScanner_1 = require("../../utils/RustNameScanner");
const RadiologyLogger_1 = require("../../utils/RadiologyLogger");
const ServiceContainer_1 = require("../../core/ServiceContainer");
/**
 * Simple string hash for cache invalidation
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 1000); i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
}
/**
 * Singleton coordinator for unified name detection
 *
 * Supports both traditional singleton pattern and dependency injection:
 * - getInstance() checks the DI container first, falling back to static instance
 * - For testing, use container.replace() to inject mocks
 */
class NameDetectionCoordinator {
    static instance = null;
    cache = new Map();
    maxCacheEntries = 16;
    // Constructor is now public to support DI
    constructor() { }
    /**
     * Get singleton instance (DI-aware)
     *
     * Resolution order:
     * 1. Check DI container for registered instance
     * 2. Fall back to static singleton
     *
     * @example
     * ```typescript
     * // Normal usage
     * const coordinator = NameDetectionCoordinator.getInstance();
     *
     * // For testing, inject a mock:
     * container.replace(ServiceIds.NameDetectionCoordinator, () => mockCoordinator);
     * ```
     */
    static getInstance() {
        // Check DI container first (enables testing)
        const fromContainer = ServiceContainer_1.container.tryResolve(ServiceContainer_1.ServiceIds.NameDetectionCoordinator);
        if (fromContainer) {
            return fromContainer;
        }
        // Fall back to static singleton
        if (!NameDetectionCoordinator.instance) {
            NameDetectionCoordinator.instance = new NameDetectionCoordinator();
            // Register in container for consistency
            ServiceContainer_1.container.registerInstance(ServiceContainer_1.ServiceIds.NameDetectionCoordinator, NameDetectionCoordinator.instance);
        }
        return NameDetectionCoordinator.instance;
    }
    /**
     * Reset the singleton instance (for testing)
     */
    static resetInstance() {
        NameDetectionCoordinator.instance = null;
        ServiceContainer_1.container.unregister(ServiceContainer_1.ServiceIds.NameDetectionCoordinator);
    }
    /**
     * Begin processing a new document
     * Call this once at the start of document processing
     */
    beginDocument(text) {
        this.getOrCreateCache(text);
    }
    /**
     * End document processing and clear cache
     */
    endDocument() {
        this.pruneCache();
    }
    /**
     * Get Rust "Last, First" detection results (cached)
     */
    getRustLastFirst(text) {
        const cache = this.getOrCreateCache(text);
        if (cache.lastFirst === null) {
            const start = Date.now();
            cache.lastFirst = RustNameScanner_1.RustNameScanner.detectLastFirst(cache.text);
            RadiologyLogger_1.RadiologyLogger.debug("NameDetectionCoordinator", `Rust detectLastFirst: ${cache.lastFirst.length} matches in ${Date.now() - start}ms`);
        }
        return cache.lastFirst;
    }
    /**
     * Get Rust "First Last" detection results (cached)
     */
    getRustFirstLast(text) {
        const cache = this.getOrCreateCache(text);
        if (cache.firstLast === null) {
            const start = Date.now();
            cache.firstLast = RustNameScanner_1.RustNameScanner.detectFirstLast(cache.text);
            RadiologyLogger_1.RadiologyLogger.debug("NameDetectionCoordinator", `Rust detectFirstLast: ${cache.firstLast.length} matches in ${Date.now() - start}ms`);
        }
        return cache.firstLast;
    }
    /**
     * Get Rust "Smart" detection results (cached)
     */
    getRustSmart(text) {
        const cache = this.getOrCreateCache(text);
        if (cache.smart === null) {
            const start = Date.now();
            cache.smart = RustNameScanner_1.RustNameScanner.detectSmart(cache.text);
            RadiologyLogger_1.RadiologyLogger.debug("NameDetectionCoordinator", `Rust detectSmart: ${cache.smart.length} matches in ${Date.now() - start}ms`);
        }
        return cache.smart;
    }
    /**
     * Check if Rust scanner is available
     */
    isRustAvailable() {
        return RustNameScanner_1.RustNameScanner.isAvailable();
    }
    /**
     * Get all Rust results at once (for filters that need multiple)
     */
    getAllRustResults(text) {
        return {
            lastFirst: this.getRustLastFirst(text),
            firstLast: this.getRustFirstLast(text),
            smart: this.getRustSmart(text),
        };
    }
    /**
     * Clear cache (for testing)
     */
    clearCache() {
        this.cache.clear();
    }
    getCacheKey(text) {
        return `${text.length}:${hashString(text)}`;
    }
    getOrCreateCache(text) {
        const key = this.getCacheKey(text);
        const existing = this.cache.get(key);
        if (existing && existing.text.length === text.length) {
            existing.lastAccess = Date.now();
            return existing;
        }
        const entry = {
            text,
            textHash: hashString(text),
            lastFirst: null,
            firstLast: null,
            smart: null,
            timestamp: Date.now(),
            lastAccess: Date.now(),
        };
        this.cache.set(key, entry);
        this.pruneCache();
        return entry;
    }
    pruneCache() {
        if (this.cache.size <= this.maxCacheEntries)
            return;
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        const removeCount = this.cache.size - this.maxCacheEntries;
        for (let i = 0; i < removeCount; i++) {
            this.cache.delete(entries[i][0]);
        }
    }
}
exports.NameDetectionCoordinator = NameDetectionCoordinator;
/**
 * Singleton export for convenience
 */
exports.nameDetectionCoordinator = NameDetectionCoordinator.getInstance();
//# sourceMappingURL=NameDetectionCoordinator.js.map