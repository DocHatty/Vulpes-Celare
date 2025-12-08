/**
 * Parallel Redaction Engine
 *
 * Executes all filters in parallel on original text, then merges results.
 * This is the Phileas-style architecture for maximum performance and correctness.
 *
 * @module redaction/core
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "./SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
/**
 * Filter execution result with detailed diagnostics
 */
export interface FilterExecutionResult {
    filterName: string;
    filterType: string;
    success: boolean;
    spansDetected: number;
    executionTimeMs: number;
    error?: Error;
    enabled: boolean;
}
/**
 * Redaction execution report with per-filter diagnostics
 */
export interface RedactionExecutionReport {
    totalFilters: number;
    filtersExecuted: number;
    filtersDisabled: number;
    filtersFailed: number;
    totalSpansDetected: number;
    totalExecutionTimeMs: number;
    filterResults: FilterExecutionResult[];
    failedFilters: string[];
}
/**
 * Parallel Redaction Engine
 * Orchestrates parallel filter execution and span merging
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Pre-filters disabled filters before execution (20-40% faster)
 * - Early returns for short/empty text
 * - Parallel execution of all enabled filters
 *
 * FUTURE OPTIMIZATION: Implement regex pattern caching in individual filters
 * to avoid recompiling patterns on every request.
 */
export declare class ParallelRedactionEngine {
    private static disambiguationService;
    private static lastExecutionReport;
    /**
     * Get the last execution report for diagnostics
     */
    static getLastExecutionReport(): RedactionExecutionReport | null;
    /**
     * Execute all filters in parallel and merge results
     *
     * @param text - Original text to redact
     * @param filters - Array of Span-based filters
     * @param policy - Redaction policy
     * @param context - Redaction context
     * @returns Redacted text with all tokens applied
     */
    static redactParallel(text: string, filters: SpanBasedFilter[], policy: any, context: RedactionContext): Promise<string>;
    /**
     * Log detailed filter statistics for diagnostics
     */
    private static logFilterStatistics;
    /**
     * Apply all spans to text in a single pass
     * Processes spans in reverse order to maintain positions
     */
    private static applySpans;
    /**
     * Apply field context information to spans
     * Boosts confidence when span type matches expected field type
     * Reduces confidence when there's a type mismatch
     */
    private static applyFieldContextToSpans;
    /**
     * Get statistics from applied spans
     */
    static getStatistics(spans: Span[]): Record<string, number>;
    /**
     * Filter spans using the centralized DocumentVocabulary service
     * Removes false positives that match known non-PHI terms
     */
    private static filterUsingDocumentVocabulary;
    /**
     * Filter ALL CAPS text that appears to be document structure
     * Section headings in ALL CAPS are common in medical documents
     */
    private static filterAllCapsStructure;
}
//# sourceMappingURL=ParallelRedactionEngine.d.ts.map