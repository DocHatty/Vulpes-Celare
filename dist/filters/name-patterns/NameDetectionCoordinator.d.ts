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
import { type RustNameDetection } from "../../utils/RustNameScanner";
/**
 * Singleton coordinator for unified name detection
 *
 * Supports both traditional singleton pattern and dependency injection:
 * - getInstance() checks the DI container first, falling back to static instance
 * - For testing, use container.replace() to inject mocks
 */
export declare class NameDetectionCoordinator {
    private static instance;
    private cache;
    private readonly maxCacheEntries;
    constructor();
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
    static getInstance(): NameDetectionCoordinator;
    /**
     * Reset the singleton instance (for testing)
     */
    static resetInstance(): void;
    /**
     * Begin processing a new document
     * Call this once at the start of document processing
     */
    beginDocument(text: string): void;
    /**
     * End document processing and clear cache
     */
    endDocument(): void;
    /**
     * Get Rust "Last, First" detection results (cached)
     */
    getRustLastFirst(text: string): RustNameDetection[];
    /**
     * Get Rust "First Last" detection results (cached)
     */
    getRustFirstLast(text: string): RustNameDetection[];
    /**
     * Get Rust "Smart" detection results (cached)
     */
    getRustSmart(text: string): RustNameDetection[];
    /**
     * Check if Rust scanner is available
     */
    isRustAvailable(): boolean;
    /**
     * Get all Rust results at once (for filters that need multiple)
     */
    getAllRustResults(text: string): {
        lastFirst: RustNameDetection[];
        firstLast: RustNameDetection[];
        smart: RustNameDetection[];
    };
    /**
     * Clear cache (for testing)
     */
    clearCache(): void;
    private getCacheKey;
    private getOrCreateCache;
    private pruneCache;
}
/**
 * Singleton export for convenience
 */
export declare const nameDetectionCoordinator: NameDetectionCoordinator;
//# sourceMappingURL=NameDetectionCoordinator.d.ts.map