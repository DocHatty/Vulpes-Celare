/**
 * ============================================================================
 * BENCHMARK GRADER
 * ============================================================================
 *
 * Extends the existing SmartGrader with new evaluation metrics:
 * - NervaluateAligner (SemEval'13 5-mode span alignment)
 * - MetricsCalculator (comprehensive performance metrics)
 * - HIPAA compliance assessment
 *
 * This is an adapter that integrates with existing SmartGrader while
 * providing benchmark-specific grading capabilities.
 *
 * @module benchmark/evaluation/BenchmarkGrader
 */
import type { DetectedSpan, GroundTruthSpan, DetectionResult } from '../backends/DetectionBackend';
import { type NervaluateResults, type PerTypeResults as NervaluatePerTypeResults } from './NervaluateAligner';
import { type AllModeMetrics, type PerTypeMetrics, type HIPAAAssessment } from './MetricsCalculator';
/**
 * Benchmark grading result
 */
export interface BenchmarkGradeResult {
    /** Experiment identifier */
    experimentId: string;
    /** Backend being evaluated */
    backendId: string;
    /** Timestamp */
    timestamp: Date;
    /** Nervaluate results (5-mode alignment) */
    nervaluate: NervaluateResults;
    /** Per-type nervaluate results */
    nervaluateByType: NervaluatePerTypeResults;
    /** All-mode performance metrics */
    metrics: AllModeMetrics;
    /** Per-type metrics */
    metricsByType: PerTypeMetrics;
    /** HIPAA compliance assessment */
    hipaaAssessment: HIPAAAssessment;
    /** Grade from existing SmartGrader (if available) */
    smartGraderGrade?: SmartGraderResult;
    /** Overall summary */
    summary: BenchmarkSummary;
}
/**
 * Result from existing SmartGrader
 */
export interface SmartGraderResult {
    profile: string;
    grade: string;
    finalScore: number;
    gradeDescription: string;
}
/**
 * Overall benchmark summary
 */
export interface BenchmarkSummary {
    /** Primary metric: strict sensitivity */
    sensitivity: number;
    /** Primary metric: strict precision */
    precision: number;
    /** Primary metric: strict F1 */
    f1Score: number;
    /** Primary metric: strict F2 (recall-weighted) */
    f2Score: number;
    /** Primary metric: MCC */
    mcc: number;
    /** HIPAA compliant? */
    hipaaCompliant: boolean;
    /** Risk level */
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    /** Total documents processed */
    totalDocuments: number;
    /** Total spans detected */
    totalSpansDetected: number;
    /** Total ground truth spans */
    totalGroundTruth: number;
    /** Total missed */
    totalMissed: number;
    /** Total spurious */
    totalSpurious: number;
}
/**
 * BenchmarkGrader - Comprehensive evaluation with SmartGrader integration
 */
export declare class BenchmarkGrader {
    private aligner;
    private calculator;
    private smartGrader;
    constructor(options?: {
        overlapThreshold?: number;
        typeMapping?: Record<string, string>;
        hipaaThreshold?: number;
        smartGraderProfile?: string;
    });
    /**
     * Attempt to load existing SmartGrader
     */
    private loadSmartGrader;
    /**
     * Grade a single document
     */
    gradeDocument(predictions: DetectedSpan[], groundTruth: GroundTruthSpan[]): {
        nervaluate: NervaluateResults;
        nervaluateByType: NervaluatePerTypeResults;
        metrics: AllModeMetrics;
        metricsByType: PerTypeMetrics;
    };
    /**
     * Grade multiple detection results against ground truth
     */
    grade(detectionResults: DetectionResult[], groundTruthMap: Map<string, GroundTruthSpan[]>, experimentId: string, backendId: string): BenchmarkGradeResult;
    /**
     * Compare two benchmark results
     */
    compare(resultA: BenchmarkGradeResult, resultB: BenchmarkGradeResult): BenchmarkComparison;
    /**
     * Generate a detailed report
     */
    static generateReport(result: BenchmarkGradeResult): string;
}
/**
 * Comparison between two benchmark results
 */
export interface BenchmarkComparison {
    backendA: string;
    backendB: string;
    sensitivityDelta: number;
    precisionDelta: number;
    f1Delta: number;
    f2Delta: number;
    mccDelta: number;
    winner: string;
    winnerReason: string;
}
/**
 * Create a benchmark grader
 */
export declare function createBenchmarkGrader(options?: {
    overlapThreshold?: number;
    typeMapping?: Record<string, string>;
    hipaaThreshold?: number;
    smartGraderProfile?: string;
}): BenchmarkGrader;
