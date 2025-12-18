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
 */
export declare class NameDetectionCoordinator {
    private static instance;
    private cache;
    private documentStartTime;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): NameDetectionCoordinator;
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
    getRustLastFirst(): RustNameDetection[];
    /**
     * Get Rust "First Last" detection results (cached)
     */
    getRustFirstLast(): RustNameDetection[];
    /**
     * Get Rust "Smart" detection results (cached)
     */
    getRustSmart(): RustNameDetection[];
    /**
     * Check if Rust scanner is available
     */
    isRustAvailable(): boolean;
    /**
     * Get all Rust results at once (for filters that need multiple)
     */
    getAllRustResults(): {
        lastFirst: RustNameDetection[];
        firstLast: RustNameDetection[];
        smart: RustNameDetection[];
    };
    /**
     * Clear cache (for testing)
     */
    clearCache(): void;
}
/**
 * Singleton export for convenience
 */
export declare const nameDetectionCoordinator: NameDetectionCoordinator;
//# sourceMappingURL=NameDetectionCoordinator.d.ts.map