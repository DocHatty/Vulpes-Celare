/**
 * SpanEnhancer - Post-Processing Enhancement for Detected Spans
 *
 * This module applies the ensemble voting system to already-detected spans,
 * re-scoring them based on multiple signals:
 * - Original pattern confidence
 * - Dictionary match quality
 * - Document structure context
 * - Label proximity
 * - OCR chaos level
 *
 * This allows existing filters to continue working while getting
 * the benefit of multi-signal scoring.
 *
 * @module redaction/core
 */
import { Span } from "../models/Span";
import { RedactionContext } from "../context/RedactionContext";
export interface EnhancementResult {
    span: Span;
    originalConfidence: number;
    enhancedConfidence: number;
    recommendation: "REDACT" | "SKIP" | "UNCERTAIN";
    signals: string[];
    wasFiltered: boolean;
}
export interface EnhancementConfig {
    /** Minimum confidence to keep a span */
    minConfidence: number;
    /** PHI types to enhance (empty = all) */
    phiTypes: string[];
    /** Whether to modify original spans or just return recommendations */
    modifySpans: boolean;
    /** Use WeightedPHIScorer for scoring (default: true) */
    useWeightedScorer: boolean;
    /** Skip ensemble for high-confidence spans (lazy evaluation) */
    lazyEvaluation: boolean;
    /** Threshold above which to skip ensemble (for lazy evaluation) */
    lazySkipThreshold: number;
    /** Threshold below which to skip ensemble (definite non-PHI) */
    lazyRejectThreshold: number;
}
export declare class SpanEnhancer {
    private detector;
    private config;
    private weightedScorer;
    private stats;
    private static readonly CONTEXT_STATS_KEY;
    private static emptyStats;
    private getStatsRef;
    constructor(config?: Partial<EnhancementConfig>);
    /**
     * Get lazy evaluation statistics
     */
    getStats(context?: RedactionContext): typeof this.stats;
    /**
     * Reset statistics
     */
    resetStats(context?: RedactionContext): void;
    /**
     * OPTIMIZATION: Check if span qualifies for lazy skip (high confidence, skip ensemble)
     */
    private shouldLazySkip;
    /**
     * OPTIMIZATION: Check if span should be lazy-rejected (very low confidence)
     */
    private shouldLazyReject;
    /**
     * Enhance a single span with multi-signal scoring
     * OPTIMIZED: Uses lazy evaluation for high/low confidence spans
     */
    enhanceSpan(span: Span, fullText: string, context?: RedactionContext): EnhancementResult;
    /**
     * Enhance multiple spans at once (more efficient - analyzes document once)
     * OPTIMIZED: Uses lazy evaluation and WeightedPHIScorer
     */
    enhanceSpans(spans: Span[], fullText: string, context?: RedactionContext): EnhancementResult[];
    /**
     * Filter spans based on enhanced confidence
     * Returns only spans that meet the confidence threshold
     */
    filterSpans(spans: Span[], fullText: string, context?: RedactionContext): Span[];
    /**
     * Get detailed analysis of span quality
     */
    analyzeSpans(spans: Span[], fullText: string, context?: RedactionContext): {
        total: number;
        kept: number;
        filtered: number;
        uncertain: number;
        averageConfidenceChange: number;
        byType: {
            [type: string]: {
                kept: number;
                filtered: number;
            };
        };
    };
}
export declare const spanEnhancer: SpanEnhancer;
//# sourceMappingURL=SpanEnhancer.d.ts.map