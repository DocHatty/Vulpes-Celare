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
import { type PostFilterShadowReport } from "./filters/PostFilterService";
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
    shadow?: {
        rustNameLastFirst?: {
            enabled: boolean;
            rustCount: number;
            tsCount: number;
            missingInRust: number;
            extraInRust: number;
        };
        rustNameFirstLast?: {
            enabled: boolean;
            rustCount: number;
            tsCount: number;
            missingInRust: number;
            extraInRust: number;
        };
        rustNameSmart?: {
            enabled: boolean;
            rustCount: number;
            tsCount: number;
            missingInRust: number;
            extraInRust: number;
        };
        postfilter?: PostFilterShadowReport;
        applySpans?: {
            enabled: boolean;
            rustAvailable: boolean;
            rustEnabled: boolean;
            spans: number;
            outputsEqual: boolean;
            firstDiffAt?: number;
        };
    };
}
/**
 * Result of a parallel redaction operation.
 * Includes all data needed for downstream processing without shared state.
 */
export interface ParallelRedactionResult {
    /** The redacted text */
    text: string;
    /** Spans that were applied (for ExplanationGenerator) */
    appliedSpans: Span[];
    /** Execution report with diagnostics */
    report: RedactionExecutionReport;
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
 * THREAD SAFETY: This engine is stateless per-request. All results are returned
 * directly rather than stored in static properties, making it safe for concurrent use.
 *
 * FUTURE OPTIMIZATION: Implement regex pattern caching in individual filters
 * to avoid recompiling patterns on every request.
 */
export declare class ParallelRedactionEngine {
    private static disambiguationService;
    private static lastExecutionReport;
    private static lastAppliedSpans;
    /**
     * Get the last execution report for diagnostics
     * @deprecated Use the report from redactParallelV2 result instead for thread-safety
     */
    static getLastExecutionReport(): RedactionExecutionReport | null;
    /**
     * Get the spans that were applied in the last redaction operation.
     * Useful for generating explanations via ExplanationGenerator.
     * @deprecated Use appliedSpans from redactParallelV2 result instead for thread-safety
     */
    static getLastAppliedSpans(): Span[];
    /**
     * Execute all filters in parallel and merge results (Thread-Safe Version)
     *
     * This method returns all results directly, avoiding shared static state.
     * Use this for concurrent/production environments.
     *
     * @param text - Original text to redact
     * @param filters - Array of Span-based filters
     * @param policy - Redaction policy
     * @param context - Redaction context
     * @returns Complete redaction result including text, spans, and report
     */
    static redactParallelV2(text: string, filters: SpanBasedFilter[], policy: any, context: RedactionContext): Promise<ParallelRedactionResult>;
    /**
     * Execute all filters in parallel and merge results (Legacy API)
     *
     * Note: This method updates shared static state (lastExecutionReport, lastAppliedSpans)
     * which is NOT thread-safe. For concurrent environments, use redactParallelV2 instead.
     *
     * @param text - Original text to redact
     * @param filters - Array of Span-based filters
     * @param policy - Redaction policy
     * @param context - Redaction context
     * @returns Redacted text with all tokens applied
     */
    static redactParallel(text: string, filters: SpanBasedFilter[], policy: any, context: RedactionContext): Promise<string>;
    /**
     * Internal implementation of parallel redaction
     * @internal
     */
    private static redactParallelInternal;
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
     * Filter spans using the UnifiedMedicalWhitelist
     * Single source of truth for all non-PHI term detection
     */
    private static filterUsingUnifiedWhitelist;
    /**
     * Filter ALL CAPS text that appears to be document structure
     * Section headings in ALL CAPS are common in medical documents
     */
    private static filterAllCapsStructure;
    /**
     * Convert DFA scan matches to Span objects
     * DFA matches are fast pre-scan results that get merged with filter outputs
     */
    private static dfaMatchesToSpans;
}
//# sourceMappingURL=ParallelRedactionEngine.d.ts.map