/**
 * ============================================================================
 * METRICS CALCULATOR
 * ============================================================================
 *
 * Computes comprehensive evaluation metrics for PHI detection:
 * - Sensitivity (Recall) - CRITICAL for HIPAA compliance
 * - Specificity (TNR)
 * - Precision (PPV)
 * - F1 Score (harmonic mean of precision and recall)
 * - F2 Score (weighted toward recall - preferred for PHI detection)
 * - Matthews Correlation Coefficient (MCC) - Best single metric
 * - Cohen's Kappa - Inter-rater agreement
 * - Dice Coefficient - Token overlap
 *
 * Reference: Stubbs & Uzuner (2015) "Annotating longitudinal clinical narratives"
 *
 * @module benchmark/evaluation/MetricsCalculator
 */
import type { ModeResults, NervaluateResults, PerTypeResults } from './NervaluateAligner';
/**
 * Core classification metrics
 */
export interface ClassificationMetrics {
    /** True Positives */
    tp: number;
    /** True Negatives */
    tn: number;
    /** False Positives */
    fp: number;
    /** False Negatives */
    fn: number;
    /** Partial matches (counted as 0.5 TP) */
    partial: number;
    /** Total predictions */
    totalPredictions: number;
    /** Total ground truth */
    totalGroundTruth: number;
}
/**
 * Derived performance metrics
 */
export interface PerformanceMetrics {
    /** Sensitivity (Recall) = TP / (TP + FN) */
    sensitivity: number;
    /** Specificity = TN / (TN + FP) */
    specificity: number;
    /** Precision (PPV) = TP / (TP + FP) */
    precision: number;
    /** F1 Score = 2 * (P * R) / (P + R) */
    f1Score: number;
    /** F2 Score = 5 * (P * R) / (4P + R) - Recall-weighted */
    f2Score: number;
    /** F0.5 Score = 1.25 * (P * R) / (0.25P + R) - Precision-weighted */
    f05Score: number;
    /** Matthews Correlation Coefficient */
    mcc: number;
    /** Cohen's Kappa */
    cohensKappa: number;
    /** Balanced Accuracy = (Sensitivity + Specificity) / 2 */
    balancedAccuracy: number;
    /** Dice Coefficient = 2 * |A ∩ B| / (|A| + |B|) */
    diceCoefficient: number;
    /** Jaccard Index = |A ∩ B| / |A ∪ B| */
    jaccardIndex: number;
}
/**
 * Complete metrics for a single evaluation mode
 */
export interface ModeMetrics {
    classification: ClassificationMetrics;
    performance: PerformanceMetrics;
}
/**
 * Metrics across all 5 nervaluate modes
 */
export interface AllModeMetrics {
    strict: ModeMetrics;
    exact: ModeMetrics;
    partial: ModeMetrics;
    type: ModeMetrics;
    ent_type: ModeMetrics;
}
/**
 * Per-type metrics breakdown
 */
export interface PerTypeMetrics {
    [entityType: string]: AllModeMetrics;
}
/**
 * HIPAA compliance assessment
 */
export interface HIPAAAssessment {
    /** Whether sensitivity meets HIPAA requirements (≥99%) */
    meetsHIPAAStandard: boolean;
    /** Sensitivity value */
    sensitivity: number;
    /** Gap to 99% target (negative = excess, positive = shortfall) */
    sensitivityGap: number;
    /** Number of missed PHI instances */
    missedPHI: number;
    /** Risk level: LOW, MEDIUM, HIGH, CRITICAL */
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    /** Detailed findings */
    findings: string[];
}
/**
 * MetricsCalculator - Comprehensive evaluation metrics
 */
export declare class MetricsCalculator {
    private readonly hipaaThreshold;
    private readonly specificityThreshold;
    private readonly estimatedTN;
    constructor(options?: {
        hipaaThreshold?: number;
        specificityThreshold?: number;
        estimatedTN?: number;
    });
    /**
     * Calculate metrics from mode results
     */
    calculateFromModeResults(results: ModeResults): ModeMetrics;
    /**
     * Calculate metrics for all 5 modes
     */
    calculateAllModes(results: NervaluateResults): AllModeMetrics;
    /**
     * Calculate per-type metrics
     */
    calculatePerType(results: PerTypeResults): PerTypeMetrics;
    /**
     * Assess HIPAA compliance based on sensitivity
     */
    assessHIPAACompliance(metrics: AllModeMetrics): HIPAAAssessment;
    /**
     * Compute performance metrics from classification counts
     */
    private computePerformance;
    /**
     * Generate a summary table
     */
    static summarize(metrics: AllModeMetrics): string;
    /**
     * Generate a per-type summary
     */
    static summarizePerType(metrics: PerTypeMetrics, mode?: keyof AllModeMetrics): string;
    /**
     * Generate HIPAA assessment summary
     */
    static summarizeHIPAA(assessment: HIPAAAssessment): string;
}
/**
 * Create a metrics calculator
 */
export declare function createMetricsCalculator(options?: {
    hipaaThreshold?: number;
    specificityThreshold?: number;
    estimatedTN?: number;
}): MetricsCalculator;
