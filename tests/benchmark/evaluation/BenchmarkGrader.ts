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
import {
  NervaluateAligner,
  type NervaluateResults,
  type PerTypeResults as NervaluatePerTypeResults,
} from './NervaluateAligner';
import {
  MetricsCalculator,
  type AllModeMetrics,
  type PerTypeMetrics,
  type HIPAAAssessment,
} from './MetricsCalculator';

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
export class BenchmarkGrader {
  private aligner: NervaluateAligner;
  private calculator: MetricsCalculator;
  private smartGrader: any | null = null;

  constructor(options: {
    overlapThreshold?: number;
    typeMapping?: Record<string, string>;
    hipaaThreshold?: number;
    smartGraderProfile?: string;
  } = {}) {
    this.aligner = new NervaluateAligner({
      overlapThreshold: options.overlapThreshold,
      typeMapping: options.typeMapping,
    });

    this.calculator = new MetricsCalculator({
      hipaaThreshold: options.hipaaThreshold,
    });

    // Try to load SmartGrader
    this.loadSmartGrader(options.smartGraderProfile);
  }

  /**
   * Attempt to load existing SmartGrader
   */
  private loadSmartGrader(profile?: string): void {
    try {
      const smartGradingPath = require.resolve(
        '../../master-suite/evolution/smart-grading.js'
      );
      const { SmartGrader } = require(smartGradingPath);
      this.smartGrader = new SmartGrader({ profile: profile || 'DEVELOPMENT' });
    } catch {
      // SmartGrader not available, continue without it
      this.smartGrader = null;
    }
  }

  /**
   * Grade a single document
   */
  gradeDocument(
    predictions: DetectedSpan[],
    groundTruth: GroundTruthSpan[]
  ): {
    nervaluate: NervaluateResults;
    nervaluateByType: NervaluatePerTypeResults;
    metrics: AllModeMetrics;
    metricsByType: PerTypeMetrics;
  } {
    // Run nervaluate alignment
    const nervaluate = this.aligner.align(predictions, groundTruth);
    const nervaluateByType = this.aligner.alignByType(predictions, groundTruth);

    // Calculate metrics
    const metrics = this.calculator.calculateAllModes(nervaluate);
    const metricsByType = this.calculator.calculatePerType(nervaluateByType);

    return {
      nervaluate,
      nervaluateByType,
      metrics,
      metricsByType,
    };
  }

  /**
   * Grade multiple detection results against ground truth
   */
  grade(
    detectionResults: DetectionResult[],
    groundTruthMap: Map<string, GroundTruthSpan[]>,
    experimentId: string,
    backendId: string
  ): BenchmarkGradeResult {
    // Collect all predictions and ground truth
    const allPredictions: DetectedSpan[] = [];
    const allGroundTruth: GroundTruthSpan[] = [];

    for (const result of detectionResults) {
      allPredictions.push(...result.spans);

      const gt = groundTruthMap.get(result.documentId);
      if (gt) {
        allGroundTruth.push(...gt);
      }
    }

    // Run evaluation
    const nervaluate = this.aligner.align(allPredictions, allGroundTruth);
    const nervaluateByType = this.aligner.alignByType(allPredictions, allGroundTruth);
    const metrics = this.calculator.calculateAllModes(nervaluate);
    const metricsByType = this.calculator.calculatePerType(nervaluateByType);
    const hipaaAssessment = this.calculator.assessHIPAACompliance(metrics);

    // Get SmartGrader grade if available
    let smartGraderGrade: SmartGraderResult | undefined;
    if (this.smartGrader) {
      try {
        // Convert metrics to format SmartGrader expects
        const smartMetrics = {
          sensitivity: metrics.strict.performance.sensitivity * 100,
          specificity: metrics.strict.performance.specificity * 100,
          precision: metrics.strict.performance.precision * 100,
          f1Score: metrics.strict.performance.f1Score,
        };

        // Convert alignments to failures
        const failures = nervaluate.alignments
          .filter(a => a.matchType === 'missing')
          .map(a => ({
            phiType: a.groundTruth?.type || 'UNKNOWN',
            errorLevel: 'none',
          }));

        const gradeResult = this.smartGrader.grade(smartMetrics, failures);
        smartGraderGrade = {
          profile: gradeResult.profile,
          grade: gradeResult.scores.grade,
          finalScore: gradeResult.scores.finalScore,
          gradeDescription: gradeResult.scores.gradeDescription,
        };
      } catch {
        // SmartGrader failed, continue without it
      }
    }

    // Generate summary
    const summary: BenchmarkSummary = {
      sensitivity: metrics.strict.performance.sensitivity,
      precision: metrics.strict.performance.precision,
      f1Score: metrics.strict.performance.f1Score,
      f2Score: metrics.strict.performance.f2Score,
      mcc: metrics.strict.performance.mcc,
      hipaaCompliant: hipaaAssessment.meetsHIPAAStandard,
      riskLevel: hipaaAssessment.riskLevel,
      totalDocuments: detectionResults.length,
      totalSpansDetected: allPredictions.length,
      totalGroundTruth: allGroundTruth.length,
      totalMissed: nervaluate.strict.fn,
      totalSpurious: nervaluate.strict.fp,
    };

    return {
      experimentId,
      backendId,
      timestamp: new Date(),
      nervaluate,
      nervaluateByType,
      metrics,
      metricsByType,
      hipaaAssessment,
      smartGraderGrade,
      summary,
    };
  }

  /**
   * Compare two benchmark results
   */
  compare(
    resultA: BenchmarkGradeResult,
    resultB: BenchmarkGradeResult
  ): BenchmarkComparison {
    const comparison: BenchmarkComparison = {
      backendA: resultA.backendId,
      backendB: resultB.backendId,
      sensitivityDelta: resultB.summary.sensitivity - resultA.summary.sensitivity,
      precisionDelta: resultB.summary.precision - resultA.summary.precision,
      f1Delta: resultB.summary.f1Score - resultA.summary.f1Score,
      f2Delta: resultB.summary.f2Score - resultA.summary.f2Score,
      mccDelta: resultB.summary.mcc - resultA.summary.mcc,
      winner: 'TIE',
      winnerReason: '',
    };

    // Determine winner based on sensitivity (primary metric for HIPAA)
    if (comparison.sensitivityDelta > 0.01) {
      comparison.winner = resultB.backendId;
      comparison.winnerReason = `Higher sensitivity (${(comparison.sensitivityDelta * 100).toFixed(2)}%)`;
    } else if (comparison.sensitivityDelta < -0.01) {
      comparison.winner = resultA.backendId;
      comparison.winnerReason = `Higher sensitivity (${(-comparison.sensitivityDelta * 100).toFixed(2)}%)`;
    } else if (comparison.f2Delta > 0.01) {
      comparison.winner = resultB.backendId;
      comparison.winnerReason = `Higher F2 score (${comparison.f2Delta.toFixed(3)})`;
    } else if (comparison.f2Delta < -0.01) {
      comparison.winner = resultA.backendId;
      comparison.winnerReason = `Higher F2 score (${(-comparison.f2Delta).toFixed(3)})`;
    }

    return comparison;
  }

  /**
   * Generate a detailed report
   */
  static generateReport(result: BenchmarkGradeResult): string {
    const lines: string[] = [];

    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║               BENCHMARK EVALUATION REPORT                     ║');
    lines.push('╠══════════════════════════════════════════════════════════════╣');
    lines.push(`║  Experiment: ${result.experimentId.padEnd(46)} ║`);
    lines.push(`║  Backend:    ${result.backendId.padEnd(46)} ║`);
    lines.push(`║  Time:       ${result.timestamp.toISOString().padEnd(46)} ║`);
    lines.push('╚══════════════════════════════════════════════════════════════╝');
    lines.push('');

    // Summary section
    lines.push('SUMMARY');
    lines.push('═'.repeat(60));
    lines.push(`  Documents:        ${result.summary.totalDocuments}`);
    lines.push(`  Ground Truth:     ${result.summary.totalGroundTruth} spans`);
    lines.push(`  Detected:         ${result.summary.totalSpansDetected} spans`);
    lines.push(`  Missed:           ${result.summary.totalMissed} spans`);
    lines.push(`  Spurious:         ${result.summary.totalSpurious} spans`);
    lines.push('');

    // Key metrics
    lines.push('KEY METRICS (Strict Mode)');
    lines.push('─'.repeat(60));
    const s = result.summary;
    lines.push(`  Sensitivity:      ${(s.sensitivity * 100).toFixed(2)}%`);
    lines.push(`  Precision:        ${(s.precision * 100).toFixed(2)}%`);
    lines.push(`  F1 Score:         ${s.f1Score.toFixed(4)}`);
    lines.push(`  F2 Score:         ${s.f2Score.toFixed(4)}`);
    lines.push(`  MCC:              ${s.mcc.toFixed(4)}`);
    lines.push('');

    // Nervaluate modes
    lines.push(NervaluateAligner.summarize(result.nervaluate));
    lines.push('');

    // Metrics across modes
    lines.push(MetricsCalculator.summarize(result.metrics));
    lines.push('');

    // HIPAA assessment
    lines.push(MetricsCalculator.summarizeHIPAA(result.hipaaAssessment));
    lines.push('');

    // SmartGrader grade if available
    if (result.smartGraderGrade) {
      const g = result.smartGraderGrade;
      lines.push('SMART GRADER');
      lines.push('─'.repeat(60));
      lines.push(`  Profile:          ${g.profile}`);
      lines.push(`  Grade:            ${g.grade} (${g.finalScore}/100)`);
      lines.push(`  Description:      ${g.gradeDescription}`);
      lines.push('');
    }

    // Per-type breakdown
    if (Object.keys(result.metricsByType).length > 0) {
      lines.push('PER-TYPE METRICS (Strict Mode)');
      lines.push(MetricsCalculator.summarizePerType(result.metricsByType, 'strict'));
    }

    return lines.join('\n');
  }
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
export function createBenchmarkGrader(options?: {
  overlapThreshold?: number;
  typeMapping?: Record<string, string>;
  hipaaThreshold?: number;
  smartGraderProfile?: string;
}): BenchmarkGrader {
  return new BenchmarkGrader(options);
}
