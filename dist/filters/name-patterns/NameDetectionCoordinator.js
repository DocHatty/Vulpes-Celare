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
 */
class NameDetectionCoordinator {
    static instance = null;
    cache = null;
    documentStartTime = 0;
    constructor() { }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!NameDetectionCoordinator.instance) {
            NameDetectionCoordinator.instance = new NameDetectionCoordinator();
        }
        return NameDetectionCoordinator.instance;
    }
    /**
     * Begin processing a new document
     * Call this once at the start of document processing
     */
    beginDocument(text) {
        const textHash = hashString(text);
        // Check if we already have valid cache for this exact text
        if (this.cache && this.cache.textHash === textHash && this.cache.text.length === text.length) {
            RadiologyLogger_1.RadiologyLogger.debug("NameDetectionCoordinator", "Using cached Rust results from previous call");
            return;
        }
        // Clear old cache and start fresh
        this.cache = {
            text,
            textHash,
            lastFirst: null,
            firstLast: null,
            smart: null,
            timestamp: Date.now(),
        };
        this.documentStartTime = Date.now();
        RadiologyLogger_1.RadiologyLogger.debug("NameDetectionCoordinator", `Beginning document processing (${text.length} chars)`);
    }
    /**
     * End document processing and clear cache
     */
    endDocument() {
        if (this.cache) {
            const duration = Date.now() - this.documentStartTime;
            const calls = [
                this.cache.lastFirst !== null,
                this.cache.firstLast !== null,
                this.cache.smart !== null,
            ].filter(Boolean).length;
            RadiologyLogger_1.RadiologyLogger.debug("NameDetectionCoordinator", `Document complete: ${calls} Rust methods called in ${duration}ms`);
        }
        this.cache = null;
    }
    /**
     * Get Rust "Last, First" detection results (cached)
     */
    getRustLastFirst() {
        if (!this.cache) {
            RadiologyLogger_1.RadiologyLogger.warn("NameDetectionCoordinator", "getRustLastFirst called without beginDocument - running uncached");
            return RustNameScanner_1.RustNameScanner.detectLastFirst("");
        }
        if (this.cache.lastFirst === null) {
            const start = Date.now();
            this.cache.lastFirst = RustNameScanner_1.RustNameScanner.detectLastFirst(this.cache.text);
            RadiologyLogger_1.RadiologyLogger.debug("NameDetectionCoordinator", `Rust detectLastFirst: ${this.cache.lastFirst.length} matches in ${Date.now() - start}ms`);
        }
        return this.cache.lastFirst;
    }
    /**
     * Get Rust "First Last" detection results (cached)
     */
    getRustFirstLast() {
        if (!this.cache) {
            RadiologyLogger_1.RadiologyLogger.warn("NameDetectionCoordinator", "getRustFirstLast called without beginDocument - running uncached");
            return RustNameScanner_1.RustNameScanner.detectFirstLast("");
        }
        if (this.cache.firstLast === null) {
            const start = Date.now();
            this.cache.firstLast = RustNameScanner_1.RustNameScanner.detectFirstLast(this.cache.text);
            RadiologyLogger_1.RadiologyLogger.debug("NameDetectionCoordinator", `Rust detectFirstLast: ${this.cache.firstLast.length} matches in ${Date.now() - start}ms`);
        }
        return this.cache.firstLast;
    }
    /**
     * Get Rust "Smart" detection results (cached)
     */
    getRustSmart() {
        if (!this.cache) {
            RadiologyLogger_1.RadiologyLogger.warn("NameDetectionCoordinator", "getRustSmart called without beginDocument - running uncached");
            return RustNameScanner_1.RustNameScanner.detectSmart("");
        }
        if (this.cache.smart === null) {
            const start = Date.now();
            this.cache.smart = RustNameScanner_1.RustNameScanner.detectSmart(this.cache.text);
            RadiologyLogger_1.RadiologyLogger.debug("NameDetectionCoordinator", `Rust detectSmart: ${this.cache.smart.length} matches in ${Date.now() - start}ms`);
        }
        return this.cache.smart;
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
    getAllRustResults() {
        return {
            lastFirst: this.getRustLastFirst(),
            firstLast: this.getRustFirstLast(),
            smart: this.getRustSmart(),
        };
    }
    /**
     * Clear cache (for testing)
     */
    clearCache() {
        this.cache = null;
    }
}
exports.NameDetectionCoordinator = NameDetectionCoordinator;
/**
 * Singleton export for convenience
 */
exports.nameDetectionCoordinator = NameDetectionCoordinator.getInstance();
//# sourceMappingURL=NameDetectionCoordinator.js.map