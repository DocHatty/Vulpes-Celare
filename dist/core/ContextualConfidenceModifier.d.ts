/**
 * ContextualConfidenceModifier - Universal Clinical Context Signal
 *
 * WIN-WIN ARCHITECTURE:
 * This module integrates clinical context as a UNIVERSAL signal that affects
 * ALL PHI types, not just specific patterns. It works by:
 *
 * 1. BOOSTING confidence for detections IN clinical context
 *    → Catches borderline PHI that would otherwise be missed (sensitivity++)
 *
 * 2. NO PENALTY for detections without context (HIPAA priority)
 *    → Missing PHI is a violation, false positives are acceptable
 *
 * CRITICAL DESIGN DECISION:
 * Context is evaluated at DOCUMENT LEVEL, not per-span position.
 * This prevents overlapping spans from getting different boosts based on
 * quirks of their context window positions, which would corrupt the
 * relative rankings during overlap resolution.
 *
 * INTEGRATION POINT: Called after initial detection, before final thresholding.
 *
 * @module core
 */
import { Span, FilterType } from "../models/Span";
import { ContextStrength } from "../context/ClinicalContextDetector";
/**
 * Configuration for context-based confidence modification
 */
export interface ContextModifierConfig {
    /** Enable context-based modification (default: true) */
    enabled: boolean;
    /** Boost applied when STRONG clinical context present */
    strongContextBoost: number;
    /** Boost applied when MODERATE clinical context present */
    moderateContextBoost: number;
    /** Boost applied when WEAK clinical context present */
    weakContextBoost: number;
    /** Penalty applied when NO clinical context present (for ambiguous types) */
    noContextPenalty: number;
    /** PHI types that are ALWAYS PHI regardless of context (no penalty) */
    contextIndependentTypes: Set<FilterType>;
    /** PHI types that are HIGHLY context-dependent (larger penalty without context) */
    highlyContextDependentTypes: Set<FilterType>;
    /** Minimum confidence threshold after penalty */
    minimumConfidence: number;
    /** Maximum confidence after boost */
    maximumConfidence: number;
}
/**
 * Result of context-based confidence modification
 */
export interface ContextModificationResult {
    span: Span;
    originalConfidence: number;
    modifiedConfidence: number;
    contextStrength: ContextStrength;
    modification: "BOOSTED" | "PENALIZED" | "UNCHANGED";
    reason: string;
}
/**
 * ContextualConfidenceModifier applies clinical context as a universal signal
 */
export declare class ContextualConfidenceModifier {
    private config;
    constructor(config?: Partial<ContextModifierConfig>);
    /**
     * Modify confidence for all spans based on clinical context
     *
     * CRITICAL: Uses DOCUMENT-LEVEL context to ensure ALL spans get the same
     * context boost. This prevents overlapping spans from getting different
     * boosts based on position, which would corrupt relative rankings.
     */
    modifyAll(spans: Span[], text: string): ContextModificationResult[];
    /**
     * Analyze document-level clinical context
     * Samples multiple positions to get a robust overall assessment
     */
    private analyzeDocumentContext;
    /**
     * Modify a span using pre-computed document context
     */
    private modifySpanWithDocContext;
    /**
     * Modify confidence for a single span based on clinical context
     */
    modifySpan(span: Span, text: string): ContextModificationResult;
    /**
     * Get summary statistics for a batch of modifications
     */
    static summarize(results: ContextModificationResult[]): {
        totalSpans: number;
        boosted: number;
        penalized: number;
        unchanged: number;
        avgBoost: number;
        avgPenalty: number;
        byContextStrength: Record<ContextStrength, number>;
    };
    /**
     * Check if context modification is enabled
     */
    isEnabled(): boolean;
    /**
     * Enable or disable context modification
     */
    setEnabled(enabled: boolean): void;
    /**
     * Get current configuration
     */
    getConfig(): Readonly<ContextModifierConfig>;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<ContextModifierConfig>): void;
}
/**
 * Singleton instance with default configuration
 */
export declare const contextualConfidenceModifier: ContextualConfidenceModifier;
/**
 * Environment variable to enable/disable context modification
 * DISABLED BY DEFAULT: Set VULPES_CONTEXT_MODIFIER=1 to enable
 *
 * STATUS: EXPERIMENTAL - Does not improve metrics on current test suite.
 *
 * LESSONS LEARNED (do not repeat these mistakes):
 * 1. Position-dependent context gave different boosts to overlapping spans,
 *    corrupting relative rankings in overlap resolution.
 * 2. Document-level context with uniform boost still hurt metrics because
 *    it boosted FALSE POSITIVES equally, which then beat TRUE POSITIVES.
 * 3. Selective borderline-only boost was neutral (no improvement, no harm).
 *
 * WHEN THIS MIGHT HELP:
 * - Mixed corpus with clinical AND non-clinical documents
 * - Currently all test documents are clinical, so context doesn't differentiate
 *
 * To validate: need test corpus with non-clinical text that contains
 * ambiguous patterns (names, dates) that SHOULD NOT be redacted.
 */
export declare function isContextModifierEnabled(): boolean;
//# sourceMappingURL=ContextualConfidenceModifier.d.ts.map