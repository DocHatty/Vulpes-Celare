/**
 * ============================================================================
 * NERVALUATE ALIGNER
 * ============================================================================
 *
 * Implements SemEval'13 5-mode span alignment for NER evaluation.
 * This is the gold standard for comparing detected spans to ground truth.
 *
 * Based on: nervaluate library (https://github.com/MantisAI/nervaluate)
 * Reference: SemEval-2013 Task 9
 *
 * 5 Evaluation Modes:
 * 1. strict  - Exact boundary AND exact entity type match
 * 2. exact   - Exact boundary match (ignores entity type)
 * 3. partial - Any overlap is considered a match
 * 4. type    - Entity type match (ignores boundaries)
 * 5. ent_type - Entity type match with some boundary overlap
 *
 * @module benchmark/evaluation/NervaluateAligner
 */
import type { DetectedSpan, GroundTruthSpan } from '../backends/DetectionBackend';
/**
 * Alignment result for a single span
 */
export interface SpanAlignment {
    /** Prediction span (null if missing) */
    prediction: DetectedSpan | null;
    /** Ground truth span (null if spurious) */
    groundTruth: GroundTruthSpan | null;
    /** Type of match */
    matchType: 'exact' | 'partial' | 'missing' | 'spurious' | 'type_mismatch';
    /** Character overlap amount */
    overlapChars: number;
    /** Overlap ratio (intersection / union) */
    overlapRatio: number;
    /** Whether types match */
    typeMatches: boolean;
}
/**
 * Per-mode evaluation results for a single document
 */
export interface ModeResults {
    /** True positives */
    tp: number;
    /** False positives */
    fp: number;
    /** False negatives */
    fn: number;
    /** Partial matches (counted as 0.5 TP) */
    partial: number;
}
/**
 * Complete evaluation results across all 5 modes
 */
export interface NervaluateResults {
    /** Mode: exact boundary + exact type */
    strict: ModeResults;
    /** Mode: exact boundary only */
    exact: ModeResults;
    /** Mode: any overlap */
    partial: ModeResults;
    /** Mode: type match only */
    type: ModeResults;
    /** Mode: type match with overlap */
    ent_type: ModeResults;
    /** Detailed alignments for inspection */
    alignments: SpanAlignment[];
}
/**
 * Aggregated results per entity type
 */
export interface PerTypeResults {
    [entityType: string]: NervaluateResults;
}
/**
 * NervaluateAligner - SemEval'13 5-mode span alignment
 */
export declare class NervaluateAligner {
    private readonly overlapThreshold;
    private readonly typeMapping;
    constructor(options?: {
        overlapThreshold?: number;
        typeMapping?: Record<string, string>;
    });
    /**
     * Align predictions with ground truth and compute all 5 modes
     */
    align(predictions: DetectedSpan[], groundTruth: GroundTruthSpan[]): NervaluateResults;
    /**
     * Align predictions grouped by entity type
     */
    alignByType(predictions: DetectedSpan[], groundTruth: GroundTruthSpan[]): PerTypeResults;
    /**
     * Aggregate multiple document results
     */
    aggregate(documentResults: NervaluateResults[]): NervaluateResults;
    /**
     * Compute overlap between prediction and ground truth
     */
    private computeOverlap;
    /**
     * Check if boundaries match exactly
     */
    private isExactBoundary;
    /**
     * Check if PHI types match (with optional mapping)
     */
    private typesMatch;
    /**
     * Normalize PHI type (apply mapping if configured)
     */
    private normalizeType;
    /**
     * Update mode counters based on alignment
     */
    private updateModeCounters;
    /**
     * Generate a human-readable summary
     */
    static summarize(results: NervaluateResults): string;
}
/**
 * Create a default aligner
 */
export declare function createAligner(options?: {
    overlapThreshold?: number;
    typeMapping?: Record<string, string>;
}): NervaluateAligner;
/**
 * Default type mapping for common PHI aliases
 */
export declare const DEFAULT_TYPE_MAPPING: Record<string, string>;
