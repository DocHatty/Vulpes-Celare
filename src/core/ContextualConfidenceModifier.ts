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
import {
  ClinicalContextDetector,
  ContextStrength,
} from "../context/ClinicalContextDetector";

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
 * Default configuration optimized for HIPAA compliance
 * Favors sensitivity (catching PHI) over specificity (avoiding false positives)
 */
const DEFAULT_CONFIG: ContextModifierConfig = {
  enabled: true,

  // Boosts are strong - context confirms detection and increases sensitivity
  strongContextBoost: 0.15,
  moderateContextBoost: 0.1,
  weakContextBoost: 0.05,

  // Penalty is MINIMAL - we strongly prefer false positives over missed PHI (HIPAA priority)
  // Only penalize when there's truly NO clinical context AND the detection is weak
  noContextPenalty: 0.05,

  // SSN, MRN are ALWAYS PHI - structural patterns are definitive
  contextIndependentTypes: new Set([
    FilterType.SSN,
    FilterType.MRN,
    FilterType.EMAIL,
    FilterType.CREDIT_CARD,
    FilterType.IP,
    FilterType.URL,
    FilterType.DEVICE,
    FilterType.VEHICLE,
    FilterType.LICENSE,
    FilterType.HEALTH_PLAN,
  ]),

  // Names and dates are HIGHLY ambiguous without context
  highlyContextDependentTypes: new Set([
    FilterType.NAME,
    FilterType.DATE,
    FilterType.AGE,
    FilterType.ADDRESS,
  ]),

  minimumConfidence: 0.3,
  maximumConfidence: 0.99,
};

/**
 * ContextualConfidenceModifier applies clinical context as a universal signal
 */
export class ContextualConfidenceModifier {
  private config: ContextModifierConfig;

  constructor(config: Partial<ContextModifierConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Modify confidence for all spans based on clinical context
   *
   * CRITICAL: Uses DOCUMENT-LEVEL context to ensure ALL spans get the same
   * context boost. This prevents overlapping spans from getting different
   * boosts based on position, which would corrupt relative rankings.
   */
  modifyAll(spans: Span[], text: string): ContextModificationResult[] {
    if (!this.config.enabled) {
      return spans.map((span) => ({
        span,
        originalConfidence: span.confidence,
        modifiedConfidence: span.confidence,
        contextStrength: "NONE" as ContextStrength,
        modification: "UNCHANGED" as const,
        reason: "Context modification disabled",
      }));
    }

    // DOCUMENT-LEVEL CONTEXT: Analyze the ENTIRE document once
    // This ensures all spans get the same context strength
    const docContext = this.analyzeDocumentContext(text);

    return spans.map((span) => this.modifySpanWithDocContext(span, docContext));
  }

  /**
   * Analyze document-level clinical context
   * Samples multiple positions to get a robust overall assessment
   */
  private analyzeDocumentContext(text: string): ContextStrength {
    // Sample context at multiple positions throughout the document
    const samplePositions = [
      0, // Beginning
      Math.floor(text.length / 4), // Quarter
      Math.floor(text.length / 2), // Middle
      Math.floor((text.length * 3) / 4), // Three-quarters
      text.length - 1, // End
    ].filter((pos) => pos >= 0 && pos < text.length);

    let strongCount = 0;
    let moderateCount = 0;
    let weakCount = 0;

    for (const pos of samplePositions) {
      const context = ClinicalContextDetector.analyzeContext(text, pos, 100);
      switch (context.strength) {
        case "STRONG":
          strongCount++;
          break;
        case "MODERATE":
          moderateCount++;
          break;
        case "WEAK":
          weakCount++;
          break;
      }
    }

    // Document is clinical if ANY sample shows strong context
    // or if MAJORITY shows moderate+ context
    if (strongCount >= 1) return "STRONG";
    if (moderateCount >= 2) return "MODERATE";
    if (moderateCount >= 1 || weakCount >= 2) return "WEAK";
    return "NONE";
  }

  /**
   * Modify a span using pre-computed document context
   */
  private modifySpanWithDocContext(
    span: Span,
    docContext: ContextStrength,
  ): ContextModificationResult {
    const originalConfidence = span.confidence;

    // Context-independent types: minimal boost (they're already definitive)
    if (this.config.contextIndependentTypes.has(span.filterType)) {
      if (docContext === "STRONG" || docContext === "MODERATE") {
        const boost =
          docContext === "STRONG"
            ? this.config.strongContextBoost * 0.3
            : this.config.moderateContextBoost * 0.3;

        span.confidence = Math.min(
          this.config.maximumConfidence,
          originalConfidence + boost,
        );

        return {
          span,
          originalConfidence,
          modifiedConfidence: span.confidence,
          contextStrength: docContext,
          modification: "BOOSTED",
          reason: `Context-independent type in ${docContext} clinical document`,
        };
      }

      return {
        span,
        originalConfidence,
        modifiedConfidence: span.confidence,
        contextStrength: docContext,
        modification: "UNCHANGED",
        reason: "Context-independent type, document not clinical enough",
      };
    }

    // Context-dependent types: SELECTIVE boost based on document context
    // CRITICAL: Only boost BORDERLINE detections (confidence 0.5-0.75)
    // High-confidence spans don't need boosting and could disrupt overlap resolution
    // Very low confidence spans are likely false positives
    let modification: "BOOSTED" | "PENALIZED" | "UNCHANGED" = "UNCHANGED";
    let reason = "";

    const isBorderline = originalConfidence >= 0.5 && originalConfidence < 0.75;

    if (!isBorderline) {
      // Don't boost non-borderline spans
      modification = "UNCHANGED";
      reason =
        originalConfidence >= 0.75
          ? "High confidence - no boost needed"
          : "Low confidence - boost would promote likely FP";
    } else {
      // Apply reduced boost only to borderline detections
      switch (docContext) {
        case "STRONG":
          span.confidence = Math.min(
            this.config.maximumConfidence,
            originalConfidence + this.config.strongContextBoost * 0.5, // Reduced
          );
          modification = "BOOSTED";
          reason = "Borderline detection in STRONG clinical document";
          break;

        case "MODERATE":
          span.confidence = Math.min(
            this.config.maximumConfidence,
            originalConfidence + this.config.moderateContextBoost * 0.5, // Reduced
          );
          modification = "BOOSTED";
          reason = "Borderline detection in MODERATE clinical document";
          break;

        case "WEAK":
          span.confidence = Math.min(
            this.config.maximumConfidence,
            originalConfidence + this.config.weakContextBoost * 0.5, // Reduced
          );
          modification = "BOOSTED";
          reason = "Borderline detection in WEAK clinical document";
          break;

        case "NONE":
          // HIPAA-FIRST: NEVER penalize
          modification = "UNCHANGED";
          reason = "Non-clinical document - no penalty (HIPAA priority)";
          break;
      }
    }

    return {
      span,
      originalConfidence,
      modifiedConfidence: span.confidence,
      contextStrength: docContext,
      modification,
      reason,
    };
  }

  /**
   * Modify confidence for a single span based on clinical context
   */
  modifySpan(span: Span, text: string): ContextModificationResult {
    const originalConfidence = span.confidence;

    // Analyze clinical context around this span
    const context = ClinicalContextDetector.analyzeContext(
      text,
      span.characterStart,
      span.characterEnd - span.characterStart,
    );

    // Check if this type is context-independent (always PHI)
    if (this.config.contextIndependentTypes.has(span.filterType)) {
      // Only apply boost, never penalty
      if (context.strength === "STRONG" || context.strength === "MODERATE") {
        const boost =
          context.strength === "STRONG"
            ? this.config.strongContextBoost * 0.5 // Reduced boost for already-confident types
            : this.config.moderateContextBoost * 0.5;

        span.confidence = Math.min(
          this.config.maximumConfidence,
          originalConfidence + boost,
        );

        return {
          span,
          originalConfidence,
          modifiedConfidence: span.confidence,
          contextStrength: context.strength,
          modification: "BOOSTED",
          reason: `Context-independent type with ${context.strength} context`,
        };
      }

      return {
        span,
        originalConfidence,
        modifiedConfidence: span.confidence,
        contextStrength: context.strength,
        modification: "UNCHANGED",
        reason: "Context-independent type, no context boost applicable",
      };
    }

    // Apply context-based modification for context-dependent types
    let modification: "BOOSTED" | "PENALIZED" | "UNCHANGED" = "UNCHANGED";
    let reason = "";

    switch (context.strength) {
      case "STRONG":
        span.confidence = Math.min(
          this.config.maximumConfidence,
          originalConfidence + this.config.strongContextBoost,
        );
        modification = "BOOSTED";
        reason = `Strong clinical context (${context.indicators.length} indicators)`;
        break;

      case "MODERATE":
        span.confidence = Math.min(
          this.config.maximumConfidence,
          originalConfidence + this.config.moderateContextBoost,
        );
        modification = "BOOSTED";
        reason = `Moderate clinical context (${context.indicators.length} indicators)`;
        break;

      case "WEAK":
        span.confidence = Math.min(
          this.config.maximumConfidence,
          originalConfidence + this.config.weakContextBoost,
        );
        modification = "BOOSTED";
        reason = `Weak clinical context`;
        break;

      case "NONE":
        // HIPAA-FIRST: NEVER penalize detections without context
        // Missing PHI is a HIPAA violation - false positives are acceptable
        // Only boost when context IS present, never penalize when it's absent
        // This is the TRUE WIN-WIN: boost sensitivity without hurting it
        modification = "UNCHANGED";
        reason = "No clinical context - no penalty applied (HIPAA priority)";
        break;
    }

    return {
      span,
      originalConfidence,
      modifiedConfidence: span.confidence,
      contextStrength: context.strength,
      modification,
      reason,
    };
  }

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
  } {
    const boosted = results.filter((r) => r.modification === "BOOSTED");
    const penalized = results.filter((r) => r.modification === "PENALIZED");
    const unchanged = results.filter((r) => r.modification === "UNCHANGED");

    const avgBoost =
      boosted.length > 0
        ? boosted.reduce(
            (sum, r) => sum + (r.modifiedConfidence - r.originalConfidence),
            0,
          ) / boosted.length
        : 0;

    const avgPenalty =
      penalized.length > 0
        ? penalized.reduce(
            (sum, r) => sum + (r.originalConfidence - r.modifiedConfidence),
            0,
          ) / penalized.length
        : 0;

    const byContextStrength: Record<ContextStrength, number> = {
      STRONG: 0,
      MODERATE: 0,
      WEAK: 0,
      NONE: 0,
    };

    for (const r of results) {
      byContextStrength[r.contextStrength]++;
    }

    return {
      totalSpans: results.length,
      boosted: boosted.length,
      penalized: penalized.length,
      unchanged: unchanged.length,
      avgBoost,
      avgPenalty,
      byContextStrength,
    };
  }

  /**
   * Check if context modification is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Enable or disable context modification
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<ContextModifierConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ContextModifierConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Singleton instance with default configuration
 */
export const contextualConfidenceModifier = new ContextualConfidenceModifier();

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
export function isContextModifierEnabled(): boolean {
  return process.env.VULPES_CONTEXT_MODIFIER === "1";
}
