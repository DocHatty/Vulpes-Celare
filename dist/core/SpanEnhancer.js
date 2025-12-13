"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.spanEnhancer = exports.SpanEnhancer = void 0;
const Span_1 = require("../models/Span");
const EnhancedPHIDetector_1 = require("./EnhancedPHIDetector");
const WeightedPHIScorer_1 = require("./WeightedPHIScorer");
const DEFAULT_CONFIG = {
    minConfidence: 0.55,
    phiTypes: [], // All types
    modifySpans: true,
    useWeightedScorer: true,
    lazyEvaluation: true,
    lazySkipThreshold: 0.92,
    lazyRejectThreshold: 0.15,
};
// HIGH-PRECISION PHI TYPES - skip ensemble for these when confidence is high
const HIGH_PRECISION_TYPES = new Set([
    Span_1.FilterType.SSN,
    Span_1.FilterType.EMAIL,
    Span_1.FilterType.PHONE,
    Span_1.FilterType.FAX,
    Span_1.FilterType.MRN,
    Span_1.FilterType.NPI,
    Span_1.FilterType.CREDIT_CARD,
    Span_1.FilterType.ACCOUNT,
    Span_1.FilterType.IP,
    Span_1.FilterType.URL,
]);
class SpanEnhancer {
    detector;
    config;
    weightedScorer;
    // OPTIMIZATION: Track lazy evaluation statistics
    stats = {
        totalSpans: 0,
        lazySkipped: 0,
        lazyRejected: 0,
        fullyEvaluated: 0,
    };
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.detector = EnhancedPHIDetector_1.enhancedDetector;
        this.detector.init();
        this.weightedScorer = WeightedPHIScorer_1.weightedScorer;
    }
    /**
     * Get lazy evaluation statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalSpans: 0,
            lazySkipped: 0,
            lazyRejected: 0,
            fullyEvaluated: 0,
        };
    }
    /**
     * OPTIMIZATION: Check if span qualifies for lazy skip (high confidence, skip ensemble)
     */
    shouldLazySkip(span) {
        if (!this.config.lazyEvaluation)
            return false;
        // High-precision pattern types with high confidence - skip ensemble
        if (HIGH_PRECISION_TYPES.has(span.filterType) && span.confidence >= 0.88) {
            return true;
        }
        // Any span with very high confidence
        if (span.confidence >= this.config.lazySkipThreshold) {
            return true;
        }
        return false;
    }
    /**
     * OPTIMIZATION: Check if span should be lazy-rejected (very low confidence)
     */
    shouldLazyReject(span) {
        if (!this.config.lazyEvaluation)
            return false;
        // Very low confidence - reject without full ensemble
        if (span.confidence <= this.config.lazyRejectThreshold) {
            return true;
        }
        return false;
    }
    /**
     * Enhance a single span with multi-signal scoring
     * OPTIMIZED: Uses lazy evaluation for high/low confidence spans
     */
    enhanceSpan(span, fullText) {
        this.stats.totalSpans++;
        // OPTIMIZATION: Lazy evaluation - skip ensemble for high-confidence spans
        if (this.shouldLazySkip(span)) {
            this.stats.lazySkipped++;
            return {
                span,
                originalConfidence: span.confidence,
                enhancedConfidence: span.confidence,
                recommendation: "REDACT",
                signals: ["[lazy-skip] High confidence, ensemble skipped"],
                wasFiltered: false,
            };
        }
        // OPTIMIZATION: Lazy reject - skip ensemble for very low confidence
        if (this.shouldLazyReject(span)) {
            this.stats.lazyRejected++;
            return {
                span,
                originalConfidence: span.confidence,
                enhancedConfidence: span.confidence,
                recommendation: "SKIP",
                signals: ["[lazy-reject] Low confidence, ensemble skipped"],
                wasFiltered: true,
            };
        }
        this.stats.fullyEvaluated++;
        // OPTIMIZATION: Use WeightedPHIScorer for scoring if enabled
        if (this.config.useWeightedScorer) {
            const contextStart = Math.max(0, span.characterStart - 100);
            const contextEnd = Math.min(fullText.length, span.characterEnd + 100);
            const context = fullText.substring(contextStart, contextEnd);
            const scoringResult = this.weightedScorer.score(span, context);
            // Map scoring recommendation to enhancement recommendation
            let recommendation;
            if (scoringResult.recommendation === "PHI") {
                recommendation = "REDACT";
            }
            else if (scoringResult.recommendation === "NOT_PHI") {
                recommendation = "SKIP";
            }
            else {
                recommendation = "UNCERTAIN";
            }
            const enhancementResult = {
                span,
                originalConfidence: span.confidence,
                enhancedConfidence: scoringResult.finalScore,
                recommendation,
                signals: scoringResult.breakdown.map((b) => `[${b.source}] ${b.reason}: ${b.value.toFixed(2)}`),
                wasFiltered: recommendation === "SKIP",
            };
            if (this.config.modifySpans) {
                span.confidence = scoringResult.finalScore;
                if (span.pattern) {
                    span.pattern = `${span.pattern} [weighted: ${recommendation}]`;
                }
            }
            return enhancementResult;
        }
        // Fallback: Use original ensemble detector
        const candidate = {
            text: span.text,
            start: span.characterStart,
            end: span.characterEnd,
            phiType: span.filterType,
            patternName: span.pattern || "unknown",
            baseConfidence: span.confidence,
        };
        // Get enhanced evaluation
        const result = this.detector.evaluate(candidate, { fullText });
        // Prepare result
        const enhancementResult = {
            span,
            originalConfidence: span.confidence,
            enhancedConfidence: result.finalConfidence,
            recommendation: result.recommendation,
            signals: result.signals.map((s) => s.reason),
            wasFiltered: result.recommendation === "SKIP",
        };
        // Update span if configured to do so
        if (this.config.modifySpans) {
            span.confidence = result.finalConfidence;
            // Add ensemble info to pattern description
            if (span.pattern) {
                span.pattern = `${span.pattern} [ensemble: ${result.recommendation}]`;
            }
        }
        return enhancementResult;
    }
    /**
     * Enhance multiple spans at once (more efficient - analyzes document once)
     * OPTIMIZED: Uses lazy evaluation and WeightedPHIScorer
     */
    enhanceSpans(spans, fullText) {
        if (spans.length === 0)
            return [];
        // Filter to applicable PHI types if specified
        const applicableSpans = this.config.phiTypes.length > 0
            ? spans.filter((s) => this.config.phiTypes.includes(s.filterType))
            : spans;
        const results = [];
        const spansNeedingFullEvaluation = [];
        const spanIndexMap = new Map(); // Track original positions
        // OPTIMIZATION: First pass - apply lazy evaluation
        for (let i = 0; i < applicableSpans.length; i++) {
            const span = applicableSpans[i];
            this.stats.totalSpans++;
            // Lazy skip high-confidence spans
            if (this.shouldLazySkip(span)) {
                this.stats.lazySkipped++;
                results[i] = {
                    span,
                    originalConfidence: span.confidence,
                    enhancedConfidence: span.confidence,
                    recommendation: "REDACT",
                    signals: ["[lazy-skip] High confidence, ensemble skipped"],
                    wasFiltered: false,
                };
                continue;
            }
            // Lazy reject low-confidence spans
            if (this.shouldLazyReject(span)) {
                this.stats.lazyRejected++;
                results[i] = {
                    span,
                    originalConfidence: span.confidence,
                    enhancedConfidence: span.confidence,
                    recommendation: "SKIP",
                    signals: ["[lazy-reject] Low confidence, ensemble skipped"],
                    wasFiltered: true,
                };
                continue;
            }
            // Needs full evaluation
            this.stats.fullyEvaluated++;
            spanIndexMap.set(span, i);
            spansNeedingFullEvaluation.push(span);
        }
        // OPTIMIZATION: Second pass - use WeightedPHIScorer for remaining spans
        if (this.config.useWeightedScorer &&
            spansNeedingFullEvaluation.length > 0) {
            const scoringResults = this.weightedScorer.scoreBatch(spansNeedingFullEvaluation, fullText);
            for (const span of spansNeedingFullEvaluation) {
                const i = spanIndexMap.get(span);
                const scoringResult = scoringResults.get(span);
                let recommendation;
                if (scoringResult.recommendation === "PHI") {
                    recommendation = "REDACT";
                }
                else if (scoringResult.recommendation === "NOT_PHI") {
                    recommendation = "SKIP";
                }
                else {
                    recommendation = "UNCERTAIN";
                }
                results[i] = {
                    span,
                    originalConfidence: span.confidence,
                    enhancedConfidence: scoringResult.finalScore,
                    recommendation,
                    signals: scoringResult.breakdown.map((b) => `[${b.source}] ${b.reason}: ${b.value.toFixed(2)}`),
                    wasFiltered: recommendation === "SKIP",
                };
                if (this.config.modifySpans) {
                    span.confidence = scoringResult.finalScore;
                    if (span.pattern) {
                        span.pattern = `${span.pattern} [weighted: ${recommendation}]`;
                    }
                }
            }
            return results;
        }
        // Fallback: Use original ensemble detector for remaining spans
        if (spansNeedingFullEvaluation.length > 0) {
            const candidates = spansNeedingFullEvaluation.map((span) => ({
                text: span.text,
                start: span.characterStart,
                end: span.characterEnd,
                phiType: span.filterType,
                patternName: span.pattern || "unknown",
                baseConfidence: span.confidence,
            }));
            const evaluations = this.detector.evaluateBatch(candidates, fullText);
            for (let j = 0; j < spansNeedingFullEvaluation.length; j++) {
                const span = spansNeedingFullEvaluation[j];
                const i = spanIndexMap.get(span);
                const evaluation = evaluations[j];
                results[i] = {
                    span,
                    originalConfidence: span.confidence,
                    enhancedConfidence: evaluation.finalConfidence,
                    recommendation: evaluation.recommendation,
                    signals: evaluation.signals.map((s) => s.reason),
                    wasFiltered: evaluation.recommendation === "SKIP",
                };
                if (this.config.modifySpans) {
                    span.confidence = evaluation.finalConfidence;
                    if (span.pattern) {
                        span.pattern = `${span.pattern} [ensemble: ${evaluation.recommendation}]`;
                    }
                }
            }
        }
        return results;
    }
    /**
     * Filter spans based on enhanced confidence
     * Returns only spans that meet the confidence threshold
     */
    filterSpans(spans, fullText) {
        const enhancements = this.enhanceSpans(spans, fullText);
        return enhancements
            .filter((e) => !e.wasFiltered && e.enhancedConfidence >= this.config.minConfidence)
            .map((e) => e.span);
    }
    /**
     * Get detailed analysis of span quality
     */
    analyzeSpans(spans, fullText) {
        const enhancements = this.enhanceSpans(spans, fullText);
        const byType = {};
        let kept = 0;
        let filtered = 0;
        let uncertain = 0;
        let totalConfidenceChange = 0;
        for (const e of enhancements) {
            const type = e.span.filterType;
            if (!byType[type]) {
                byType[type] = { kept: 0, filtered: 0 };
            }
            if (e.recommendation === "REDACT") {
                kept++;
                byType[type].kept++;
            }
            else if (e.recommendation === "SKIP") {
                filtered++;
                byType[type].filtered++;
            }
            else {
                uncertain++;
                // Count uncertain as kept (conservative)
                byType[type].kept++;
            }
            totalConfidenceChange += e.enhancedConfidence - e.originalConfidence;
        }
        return {
            total: enhancements.length,
            kept,
            filtered,
            uncertain,
            averageConfidenceChange: enhancements.length > 0
                ? totalConfidenceChange / enhancements.length
                : 0,
            byType,
        };
    }
}
exports.SpanEnhancer = SpanEnhancer;
// Export singleton for convenience
exports.spanEnhancer = new SpanEnhancer();
//# sourceMappingURL=SpanEnhancer.js.map