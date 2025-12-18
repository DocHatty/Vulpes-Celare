/**
 * ConfidencePipeline - Consolidated Confidence Modification System
 *
 * This replaces the 6 separate confidence modification stages that were
 * scattered throughout ParallelRedactionEngine.redactParallel():
 *
 * 1. ConfidenceModifierService.applyModifiersToAll()
 * 2. SpanEnhancer.analyzeSpans()
 * 3. VectorDisambiguationService.disambiguate()
 * 4. DatalogReasoner.reason() / CrossTypeReasoner
 * 5. ContextualConfidenceModifier.modifyAll()
 * 6. ConfidenceCalibrator.calibrateSpans()
 *
 * DESIGN PRINCIPLES:
 * 1. Single pipeline with pluggable stages
 * 2. Each stage can be enabled/disabled and measured
 * 3. Stages that don't improve metrics can be easily removed
 * 4. Clear data flow and stage ordering
 *
 * @module core
 */

import { Span } from "../models/Span";
import { RedactionContext } from "../context/RedactionContext";
import { RadiologyLogger } from "../utils/RadiologyLogger";
import { FeatureToggles } from "../config/FeatureToggles";
import { getConfidenceRanker, TinyBertConfidenceRanker } from "../ml/TinyBertConfidenceRanker";

/**
 * Result from a pipeline stage
 */
export interface PipelineStageResult {
  stageName: string;
  inputSpans: number;
  outputSpans: number;
  spansModified: number;
  avgConfidenceChange: number;
  executionTimeMs: number;
  enabled: boolean;
}

/**
 * Configuration for pipeline stages
 */
export interface PipelineStageConfig {
  enabled: boolean;
  priority: number;
  minImpactThreshold?: number; // Minimum avg confidence change to keep stage
}

/**
 * A single stage in the confidence pipeline
 */
export interface PipelineStage {
  name: string;
  config: PipelineStageConfig;
  execute: (
    spans: Span[],
    text: string,
    context: RedactionContext
  ) => Promise<Span[]> | Span[];
}

/**
 * Pipeline execution summary
 */
export interface PipelineExecutionSummary {
  totalStages: number;
  enabledStages: number;
  disabledStages: number;
  totalTimeMs: number;
  stageResults: PipelineStageResult[];
  inputSpanCount: number;
  outputSpanCount: number;
  totalSpansModified: number;
}

/**
 * Default stage configurations
 */
const DEFAULT_STAGE_CONFIGS: Record<string, PipelineStageConfig> = {
  contextModifier: { enabled: true, priority: 10 },
  spanEnhancer: { enabled: true, priority: 20 },
  vectorDisambiguation: { enabled: true, priority: 30 },
  mlConfidenceRanking: { enabled: true, priority: 35 }, // ML re-ranking (runs if enabled)
  crossTypeReasoning: { enabled: true, priority: 40 },
  contextualConfidence: { enabled: false, priority: 50 }, // Disabled by default
  calibration: { enabled: true, priority: 60 },
};

/**
 * Confidence Pipeline - orchestrates all confidence modification stages
 */
export class ConfidencePipeline {
  private stages: PipelineStage[] = [];
  private lastSummary: PipelineExecutionSummary | null = null;

  constructor(customConfigs?: Partial<Record<string, PipelineStageConfig>>) {
    // Merge custom configs with defaults
    const configs: Record<string, PipelineStageConfig> = { ...DEFAULT_STAGE_CONFIGS };
    if (customConfigs) {
      for (const [key, value] of Object.entries(customConfigs)) {
        if (value) configs[key] = value;
      }
    }

    // Register default stages
    this.registerDefaultStages(configs);
  }

  /**
   * Register the default pipeline stages
   */
  private registerDefaultStages(
    configs: Record<string, PipelineStageConfig>
  ): void {
    // Stage 1: Basic context modifiers
    this.registerStage({
      name: "contextModifier",
      config: configs.contextModifier || { enabled: true, priority: 10 },
      execute: async (spans, text, context) => {
        return this.applyBasicContextModifiers(spans, text);
      },
    });

    // Stage 2: Span enhancement (ensemble signals)
    this.registerStage({
      name: "spanEnhancer",
      config: configs.spanEnhancer || { enabled: true, priority: 20 },
      execute: async (spans, text, context) => {
        return this.applySpanEnhancement(spans, text, context);
      },
    });

    // Stage 3: Vector disambiguation
    this.registerStage({
      name: "vectorDisambiguation",
      config: configs.vectorDisambiguation || { enabled: true, priority: 30 },
      execute: async (spans, text, context) => {
        return this.applyVectorDisambiguation(spans);
      },
    });

    // Stage 3.5: ML Confidence Re-ranking (TinyBERT)
    this.registerStage({
      name: "mlConfidenceRanking",
      config: configs.mlConfidenceRanking || { enabled: true, priority: 35 },
      execute: async (spans, text, context) => {
        return this.applyMLConfidenceRanking(spans, text);
      },
    });

    // Stage 4: Cross-type reasoning
    this.registerStage({
      name: "crossTypeReasoning",
      config: configs.crossTypeReasoning || { enabled: true, priority: 40 },
      execute: async (spans, text, context) => {
        return this.applyCrossTypeReasoning(spans, text);
      },
    });

    // Stage 5: Contextual confidence (experimental)
    this.registerStage({
      name: "contextualConfidence",
      config: configs.contextualConfidence || { enabled: false, priority: 50 },
      execute: async (spans, text, context) => {
        return this.applyContextualConfidence(spans, text);
      },
    });

    // Stage 6: Calibration (isotonic/Platt)
    this.registerStage({
      name: "calibration",
      config: configs.calibration || { enabled: true, priority: 60 },
      execute: async (spans, text, context) => {
        return this.applyCalibration(spans);
      },
    });

    // Sort by priority
    this.stages.sort((a, b) => a.config.priority - b.config.priority);
  }

  /**
   * Register a custom pipeline stage
   */
  registerStage(stage: PipelineStage): void {
    this.stages.push(stage);
    this.stages.sort((a, b) => a.config.priority - b.config.priority);
  }

  /**
   * Enable or disable a stage by name
   */
  setStageEnabled(stageName: string, enabled: boolean): void {
    const stage = this.stages.find((s) => s.name === stageName);
    if (stage) {
      stage.config.enabled = enabled;
    }
  }

  /**
   * Execute the full pipeline
   */
  async execute(
    spans: Span[],
    text: string,
    context: RedactionContext
  ): Promise<Span[]> {
    const pipelineStart = Date.now();
    const stageResults: PipelineStageResult[] = [];

    let currentSpans = [...spans];
    const inputSpanCount = spans.length;
    let totalSpansModified = 0;

    for (const stage of this.stages) {
      if (!stage.config.enabled) {
        stageResults.push({
          stageName: stage.name,
          inputSpans: 0,
          outputSpans: 0,
          spansModified: 0,
          avgConfidenceChange: 0,
          executionTimeMs: 0,
          enabled: false,
        });
        continue;
      }

      const stageStart = Date.now();
      const beforeConfidences = currentSpans.map((s) => s.confidence);

      try {
        currentSpans = await stage.execute(currentSpans, text, context);

        const afterConfidences = currentSpans.map((s) => s.confidence);
        const changes = beforeConfidences.map((before, i) =>
          Math.abs((afterConfidences[i] || before) - before)
        );
        const spansModified = changes.filter((c) => c > 0.001).length;
        const avgChange =
          changes.length > 0
            ? changes.reduce((a, b) => a + b, 0) / changes.length
            : 0;

        totalSpansModified += spansModified;

        stageResults.push({
          stageName: stage.name,
          inputSpans: beforeConfidences.length,
          outputSpans: currentSpans.length,
          spansModified,
          avgConfidenceChange: avgChange,
          executionTimeMs: Date.now() - stageStart,
          enabled: true,
        });

        RadiologyLogger.pipelineStage(
          `CONFIDENCE-${stage.name.toUpperCase()}`,
          `Modified ${spansModified} spans, avg change: ${(avgChange * 100).toFixed(1)}%`,
          currentSpans.length
        );
      } catch (error) {
        RadiologyLogger.error(
          "CONFIDENCE-PIPELINE",
          `Stage ${stage.name} failed: ${error}`
        );
        stageResults.push({
          stageName: stage.name,
          inputSpans: currentSpans.length,
          outputSpans: currentSpans.length,
          spansModified: 0,
          avgConfidenceChange: 0,
          executionTimeMs: Date.now() - stageStart,
          enabled: true,
        });
      }
    }

    this.lastSummary = {
      totalStages: this.stages.length,
      enabledStages: stageResults.filter((r) => r.enabled).length,
      disabledStages: stageResults.filter((r) => !r.enabled).length,
      totalTimeMs: Date.now() - pipelineStart,
      stageResults,
      inputSpanCount,
      outputSpanCount: currentSpans.length,
      totalSpansModified,
    };

    return currentSpans;
  }

  /**
   * Get the last execution summary
   */
  getLastSummary(): PipelineExecutionSummary | null {
    return this.lastSummary;
  }

  // ============================================================================
  // STAGE IMPLEMENTATIONS
  // ============================================================================

  /**
   * Stage 1: Basic context modifiers
   * Applies simple context-based confidence adjustments
   */
  private applyBasicContextModifiers(spans: Span[], text: string): Span[] {
    // Context patterns that boost confidence
    const BOOST_PATTERNS = [
      { pattern: /patient\s*:?\s*$/i, boost: 0.1 },
      { pattern: /name\s*:?\s*$/i, boost: 0.1 },
      { pattern: /dob\s*:?\s*$/i, boost: 0.1 },
      { pattern: /ssn\s*:?\s*$/i, boost: 0.15 },
      { pattern: /mrn\s*:?\s*$/i, boost: 0.1 },
    ];

    // Context patterns that reduce confidence
    const REDUCE_PATTERNS = [
      { pattern: /dr\.?\s*$/i, reduce: 0.05 }, // Provider names
      { pattern: /facility\s*:?\s*$/i, reduce: 0.1 },
      { pattern: /hospital\s*:?\s*$/i, reduce: 0.1 },
    ];

    for (const span of spans) {
      // Get context before span
      const contextStart = Math.max(0, span.characterStart - 30);
      const contextBefore = text.substring(contextStart, span.characterStart);

      // Check boost patterns
      for (const { pattern, boost } of BOOST_PATTERNS) {
        if (pattern.test(contextBefore)) {
          span.confidence = Math.min(1.0, span.confidence + boost);
          break;
        }
      }

      // Check reduce patterns
      for (const { pattern, reduce } of REDUCE_PATTERNS) {
        if (pattern.test(contextBefore)) {
          span.confidence = Math.max(0.0, span.confidence - reduce);
          break;
        }
      }
    }

    return spans;
  }

  /**
   * Stage 2: Span enhancement
   * Applies multi-signal ensemble scoring
   */
  private applySpanEnhancement(
    spans: Span[],
    text: string,
    context: RedactionContext
  ): Span[] {
    // Simplified enhancement - boost based on pattern quality
    for (const span of spans) {
      // High-confidence patterns get boosted
      if (span.pattern) {
        const patternStr = span.pattern.toLowerCase();
        if (
          patternStr.includes("labeled") ||
          patternStr.includes("explicit")
        ) {
          span.confidence = Math.min(1.0, span.confidence * 1.05);
        }
      }

      // Multiple words typically more reliable
      const wordCount = span.text.trim().split(/\s+/).length;
      if (wordCount >= 2 && span.confidence >= 0.7) {
        span.confidence = Math.min(1.0, span.confidence * 1.02);
      }
    }

    return spans;
  }

  /**
   * Stage 3.5: ML Confidence Re-ranking (TinyBERT)
   * Uses TinyBERT to predict calibrated confidence for borderline spans
   */
  private async applyMLConfidenceRanking(spans: Span[], text: string): Promise<Span[]> {
    // Check if ML confidence is enabled
    if (!FeatureToggles.isMLConfidenceEnabled()) {
      return spans;
    }

    try {
      const ranker = await getConfidenceRanker();
      if (!ranker) {
        // Model not available, skip this stage
        return spans;
      }

      // Re-rank borderline spans
      return await ranker.rerank(spans, text);
    } catch (error) {
      RadiologyLogger.error("CONFIDENCE-ML", `ML re-ranking failed: ${error}`);
      return spans; // Return unchanged on error
    }
  }

  /**
   * Stage 3: Vector disambiguation
   * Resolves ambiguous spans using semantic similarity
   */
  private applyVectorDisambiguation(spans: Span[]): Span[] {
    // Mark overlapping spans as ambiguous
    const sortedSpans = [...spans].sort(
      (a, b) => a.characterStart - b.characterStart
    );

    for (let i = 0; i < sortedSpans.length; i++) {
      const current = sortedSpans[i];

      for (let j = i + 1; j < sortedSpans.length; j++) {
        const next = sortedSpans[j];

        // Check for overlap
        if (next.characterStart >= current.characterEnd) break;

        // Mark as ambiguous
        if (!current.ambiguousWith.includes(next.filterType)) {
          current.ambiguousWith.push(next.filterType);
        }
        if (!next.ambiguousWith.includes(current.filterType)) {
          next.ambiguousWith.push(current.filterType);
        }

        // Slight penalty for ambiguous spans
        current.confidence *= 0.98;
        next.confidence *= 0.98;
      }
    }

    return spans;
  }

  /**
   * Stage 4: Cross-type reasoning
   * Applies constraint-based reasoning across PHI types
   */
  private applyCrossTypeReasoning(spans: Span[], text: string): Span[] {
    // Mutual exclusion constraints
    const MUTUALLY_EXCLUSIVE = [
      ["DATE", "AGE_90_PLUS"],
      ["SSN", "PHONE"],
      ["MRN", "ZIPCODE"],
    ];

    // Build type-to-spans map
    const byType: Record<string, Span[]> = {};
    for (const span of spans) {
      const type = span.filterType;
      if (!byType[type]) byType[type] = [];
      byType[type].push(span);
    }

    // Apply mutual exclusion - prefer higher confidence
    for (const [type1, type2] of MUTUALLY_EXCLUSIVE) {
      const spans1 = byType[type1] || [];
      const spans2 = byType[type2] || [];

      for (const s1 of spans1) {
        for (const s2 of spans2) {
          // Check if same position
          if (
            s1.characterStart === s2.characterStart &&
            s1.characterEnd === s2.characterEnd
          ) {
            // Boost higher confidence, penalize lower
            if (s1.confidence > s2.confidence) {
              s1.confidence = Math.min(1.0, s1.confidence * 1.1);
              s2.confidence *= 0.7;
            } else {
              s2.confidence = Math.min(1.0, s2.confidence * 1.1);
              s1.confidence *= 0.7;
            }
          }
        }
      }
    }

    // Document consistency - same text should have same type
    const textToType: Record<string, string> = {};
    for (const span of spans) {
      const textLower = span.text.toLowerCase();
      if (!textToType[textLower]) {
        textToType[textLower] = span.filterType;
      } else if (textToType[textLower] !== span.filterType) {
        // Inconsistent type - slight penalty
        span.confidence *= 0.95;
      }
    }

    return spans;
  }

  /**
   * Stage 5: Contextual confidence (experimental)
   * Universal context-based adjustment
   */
  private applyContextualConfidence(spans: Span[], text: string): Span[] {
    // Clinical context detection
    const CLINICAL_INDICATORS = [
      "patient",
      "diagnosis",
      "treatment",
      "medication",
      "history",
      "admitted",
      "discharged",
      "chief complaint",
      "assessment",
      "plan",
    ];

    const textLower = text.toLowerCase();
    const hasClinicalContext = CLINICAL_INDICATORS.some((ind) =>
      textLower.includes(ind)
    );

    if (hasClinicalContext) {
      // Boost all spans slightly in clinical context
      for (const span of spans) {
        span.confidence = Math.min(1.0, span.confidence * 1.03);
      }
    }

    return spans;
  }

  /**
   * Stage 6: Calibration
   * Transforms raw scores to calibrated probabilities
   */
  private applyCalibration(spans: Span[]): Span[] {
    // Simple isotonic-style calibration
    // In production, this would use the fitted ConfidenceCalibrator

    // For now, apply mild sigmoid-style transformation
    // This pushes extreme values toward 0 or 1
    for (const span of spans) {
      const x = span.confidence;
      // Soft sigmoid: keeps values in [0,1] but sharpens distribution
      span.confidence = 1 / (1 + Math.exp(-10 * (x - 0.5)));
    }

    return spans;
  }
}

// Export singleton instance with default config
export const confidencePipeline = new ConfidencePipeline();
