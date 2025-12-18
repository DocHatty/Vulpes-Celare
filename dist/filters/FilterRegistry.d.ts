/**
 * Filter Registry
 *
 * Manages registration and initialization of all redaction filters:
 * - Filter registration by type
 * - Filter initialization (lazy loading)
 * - NER filter management
 * - Filter application orchestration
 *
 * @module redaction/filters
 */
import { SpanBasedFilter } from "../core/SpanBasedFilter";
/**
 * Filter Registry - manages all Span-based redaction filters for parallel execution
 */
export declare class FilterRegistry {
    private static spanFilters;
    private static isInitialized;
    /**
     * Initialize all Span-based filters for parallel execution
     */
    static initialize(): Promise<void>;
    /**
     * Get all Span-based filters for parallel execution
     */
    static getAllSpanFilters(): SpanBasedFilter[];
    /**
     * Check if initialized
     */
    static isReady(): boolean;
}
//# sourceMappingURL=FilterRegistry.d.ts.map