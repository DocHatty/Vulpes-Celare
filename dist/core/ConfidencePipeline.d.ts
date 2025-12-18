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
    minImpactThreshold?: number;
}
/**
 * A single stage in the confidence pipeline
 */
export interface PipelineStage {
    name: string;
    config: PipelineStageConfig;
    execute: (spans: Span[], text: string, context: RedactionContext) => Promise<Span[]> | Span[];
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
 * Confidence Pipeline - orchestrates all confidence modification stages
 */
export declare class ConfidencePipeline {
    private stages;
    private lastSummary;
    constructor(customConfigs?: Partial<Record<string, PipelineStageConfig>>);
    /**
     * Register the default pipeline stages
     */
    private registerDefaultStages;
    /**
     * Register a custom pipeline stage
     */
    registerStage(stage: PipelineStage): void;
    /**
     * Enable or disable a stage by name
     */
    setStageEnabled(stageName: string, enabled: boolean): void;
    /**
     * Execute the full pipeline
     */
    execute(spans: Span[], text: string, context: RedactionContext): Promise<Span[]>;
    /**
     * Get the last execution summary
     */
    getLastSummary(): PipelineExecutionSummary | null;
    /**
     * Stage 1: Basic context modifiers
     * Applies simple context-based confidence adjustments
     */
    private applyBasicContextModifiers;
    /**
     * Stage 2: Span enhancement
     * Applies multi-signal ensemble scoring
     */
    private applySpanEnhancement;
    /**
     * Stage 3.5: ML Confidence Re-ranking (TinyBERT)
     * Uses TinyBERT to predict calibrated confidence for borderline spans
     */
    private applyMLConfidenceRanking;
    /**
     * Stage 3: Vector disambiguation
     * Resolves ambiguous spans using semantic similarity
     */
    private applyVectorDisambiguation;
    /**
     * Stage 4: Cross-type reasoning
     * Applies constraint-based reasoning across PHI types
     */
    private applyCrossTypeReasoning;
    /**
     * Stage 5: Contextual confidence (experimental)
     * Universal context-based adjustment
     */
    private applyContextualConfidence;
    /**
     * Stage 6: Calibration
     * Transforms raw scores to calibrated probabilities
     */
    private applyCalibration;
}
export declare const confidencePipeline: ConfidencePipeline;
//# sourceMappingURL=ConfidencePipeline.d.ts.map