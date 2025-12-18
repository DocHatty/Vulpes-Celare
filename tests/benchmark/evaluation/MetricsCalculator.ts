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
export class MetricsCalculator {
  private readonly hipaaThreshold: number;
  private readonly specificityThreshold: number;
  private readonly estimatedTN: number;

  constructor(options: {
    hipaaThreshold?: number;
    specificityThreshold?: number;
    estimatedTN?: number;
  } = {}) {
    this.hipaaThreshold = options.hipaaThreshold ?? 0.99;
    this.specificityThreshold = options.specificityThreshold ?? 0.96;
    // Estimated TN for specificity calculation (based on avg document size)
    this.estimatedTN = options.estimatedTN ?? 1000;
  }

  /**
   * Calculate metrics from mode results
   */
  calculateFromModeResults(results: ModeResults): ModeMetrics {
    const { tp, fp, fn, partial } = results;

    // Adjust TP for partial matches (count as 0.5)
    const effectiveTP = tp + partial * 0.5;
    const effectiveFN = fn + partial * 0.5;

    const classification: ClassificationMetrics = {
      tp,
      tn: this.estimatedTN,
      fp,
      fn,
      partial,
      totalPredictions: tp + fp + partial,
      totalGroundTruth: tp + fn + partial,
    };

    const performance = this.computePerformance(
      effectiveTP,
      this.estimatedTN,
      fp,
      effectiveFN
    );

    return { classification, performance };
  }

  /**
   * Calculate metrics for all 5 modes
   */
  calculateAllModes(results: NervaluateResults): AllModeMetrics {
    return {
      strict: this.calculateFromModeResults(results.strict),
      exact: this.calculateFromModeResults(results.exact),
      partial: this.calculateFromModeResults(results.partial),
      type: this.calculateFromModeResults(results.type),
      ent_type: this.calculateFromModeResults(results.ent_type),
    };
  }

  /**
   * Calculate per-type metrics
   */
  calculatePerType(results: PerTypeResults): PerTypeMetrics {
    const perType: PerTypeMetrics = {};

    for (const [entityType, typeResults] of Object.entries(results)) {
      perType[entityType] = this.calculateAllModes(typeResults);
    }

    return perType;
  }

  /**
   * Assess HIPAA compliance based on sensitivity
   */
  assessHIPAACompliance(metrics: AllModeMetrics): HIPAAAssessment {
    // Use strict mode for HIPAA assessment (most conservative)
    const strictMetrics = metrics.strict;
    const sensitivity = strictMetrics.performance.sensitivity;
    const missedPHI = strictMetrics.classification.fn;

    const findings: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

    if (sensitivity >= 0.99) {
      riskLevel = 'LOW';
      findings.push('Sensitivity meets HIPAA 99% threshold');
    } else if (sensitivity >= 0.97) {
      riskLevel = 'MEDIUM';
      findings.push(`Sensitivity ${(sensitivity * 100).toFixed(1)}% is close to HIPAA threshold`);
      findings.push(`${missedPHI} PHI instances missed - review recommended`);
    } else if (sensitivity >= 0.95) {
      riskLevel = 'HIGH';
      findings.push(`Sensitivity ${(sensitivity * 100).toFixed(1)}% is below HIPAA threshold`);
      findings.push(`${missedPHI} PHI instances missed - action required`);
    } else {
      riskLevel = 'CRITICAL';
      findings.push(`Sensitivity ${(sensitivity * 100).toFixed(1)}% is significantly below HIPAA threshold`);
      findings.push(`${missedPHI} PHI instances missed - immediate action required`);
    }

    // Check specificity
    if (strictMetrics.performance.specificity < this.specificityThreshold) {
      findings.push(
        `Specificity ${(strictMetrics.performance.specificity * 100).toFixed(1)}% below target - high false positive rate`
      );
    }

    return {
      meetsHIPAAStandard: sensitivity >= this.hipaaThreshold,
      sensitivity,
      sensitivityGap: this.hipaaThreshold - sensitivity,
      missedPHI,
      riskLevel,
      findings,
    };
  }

  /**
   * Compute performance metrics from classification counts
   */
  private computePerformance(
    tp: number,
    tn: number,
    fp: number,
    fn: number
  ): PerformanceMetrics {
    // Handle edge cases
    const totalPositive = tp + fn;
    const totalNegative = tn + fp;
    const totalPredPositive = tp + fp;
    const totalPredNegative = tn + fn;

    // Sensitivity (Recall) = TP / (TP + FN)
    const sensitivity = totalPositive > 0 ? tp / totalPositive : 0;

    // Specificity = TN / (TN + FP)
    const specificity = totalNegative > 0 ? tn / totalNegative : 0;

    // Precision = TP / (TP + FP)
    const precision = totalPredPositive > 0 ? tp / totalPredPositive : 0;

    // F1 Score = 2 * (P * R) / (P + R)
    const f1Score =
      precision + sensitivity > 0
        ? (2 * precision * sensitivity) / (precision + sensitivity)
        : 0;

    // F2 Score = 5 * (P * R) / (4P + R)
    const f2Score =
      4 * precision + sensitivity > 0
        ? (5 * precision * sensitivity) / (4 * precision + sensitivity)
        : 0;

    // F0.5 Score = 1.25 * (P * R) / (0.25P + R)
    const f05Score =
      0.25 * precision + sensitivity > 0
        ? (1.25 * precision * sensitivity) / (0.25 * precision + sensitivity)
        : 0;

    // Matthews Correlation Coefficient
    const mccNumerator = tp * tn - fp * fn;
    const mccDenominator = Math.sqrt(
      (tp + fp) * (tp + fn) * (tn + fp) * (tn + fn)
    );
    const mcc = mccDenominator > 0 ? mccNumerator / mccDenominator : 0;

    // Cohen's Kappa
    const total = tp + tn + fp + fn;
    const po = total > 0 ? (tp + tn) / total : 0; // Observed agreement
    const pe =
      total > 0
        ? ((tp + fp) * (tp + fn) + (tn + fn) * (tn + fp)) / (total * total)
        : 0; // Expected agreement
    const cohensKappa = pe < 1 ? (po - pe) / (1 - pe) : 0;

    // Balanced Accuracy
    const balancedAccuracy = (sensitivity + specificity) / 2;

    // Dice Coefficient = 2 * TP / (2 * TP + FP + FN)
    const diceCoefficient =
      2 * tp + fp + fn > 0 ? (2 * tp) / (2 * tp + fp + fn) : 0;

    // Jaccard Index = TP / (TP + FP + FN)
    const jaccardIndex = tp + fp + fn > 0 ? tp / (tp + fp + fn) : 0;

    return {
      sensitivity,
      specificity,
      precision,
      f1Score,
      f2Score,
      f05Score,
      mcc,
      cohensKappa,
      balancedAccuracy,
      diceCoefficient,
      jaccardIndex,
    };
  }

  /**
   * Generate a summary table
   */
  static summarize(metrics: AllModeMetrics): string {
    const lines: string[] = [];

    lines.push('┌─────────────┬───────────┬───────────┬───────────┬───────────┬───────────┐');
    lines.push('│ Mode        │ Sensitiv. │ Precision │ F1 Score  │ F2 Score  │ MCC       │');
    lines.push('├─────────────┼───────────┼───────────┼───────────┼───────────┼───────────┤');

    for (const mode of ['strict', 'exact', 'partial', 'type', 'ent_type'] as const) {
      const p = metrics[mode].performance;
      const name = mode.padEnd(11);
      const sens = (p.sensitivity * 100).toFixed(1).padStart(8) + '%';
      const prec = (p.precision * 100).toFixed(1).padStart(8) + '%';
      const f1 = p.f1Score.toFixed(3).padStart(9);
      const f2 = p.f2Score.toFixed(3).padStart(9);
      const mcc = p.mcc.toFixed(3).padStart(9);
      lines.push(`│ ${name} │${sens} │${prec} │${f1} │${f2} │${mcc} │`);
    }

    lines.push('└─────────────┴───────────┴───────────┴───────────┴───────────┴───────────┘');

    return lines.join('\n');
  }

  /**
   * Generate a per-type summary
   */
  static summarizePerType(metrics: PerTypeMetrics, mode: keyof AllModeMetrics = 'strict'): string {
    const lines: string[] = [];

    lines.push('┌─────────────────┬───────────┬───────────┬───────────┬───────┐');
    lines.push('│ Entity Type     │ Sensitiv. │ Precision │ F1 Score  │ Count │');
    lines.push('├─────────────────┼───────────┼───────────┼───────────┼───────┤');

    const sortedTypes = Object.keys(metrics).sort();

    for (const entityType of sortedTypes) {
      const m = metrics[entityType][mode];
      const c = m.classification;
      const p = m.performance;
      const name = entityType.substring(0, 15).padEnd(15);
      const sens = (p.sensitivity * 100).toFixed(1).padStart(8) + '%';
      const prec = (p.precision * 100).toFixed(1).padStart(8) + '%';
      const f1 = p.f1Score.toFixed(3).padStart(9);
      const count = c.totalGroundTruth.toString().padStart(5);
      lines.push(`│ ${name} │${sens} │${prec} │${f1} │${count} │`);
    }

    lines.push('└─────────────────┴───────────┴───────────┴───────────┴───────┘');

    return lines.join('\n');
  }

  /**
   * Generate HIPAA assessment summary
   */
  static summarizeHIPAA(assessment: HIPAAAssessment): string {
    const lines: string[] = [];

    lines.push('╔══════════════════════════════════════════════════════════════╗');
    lines.push('║                    HIPAA COMPLIANCE ASSESSMENT               ║');
    lines.push('╠══════════════════════════════════════════════════════════════╣');

    const status = assessment.meetsHIPAAStandard ? '✓ COMPLIANT' : '✗ NON-COMPLIANT';
    const riskColor =
      assessment.riskLevel === 'LOW'
        ? '🟢'
        : assessment.riskLevel === 'MEDIUM'
        ? '🟡'
        : assessment.riskLevel === 'HIGH'
        ? '🟠'
        : '🔴';

    lines.push(`║  Status: ${status.padEnd(50)} ║`);
    lines.push(`║  Risk Level: ${riskColor} ${assessment.riskLevel.padEnd(46)} ║`);
    lines.push(`║  Sensitivity: ${(assessment.sensitivity * 100).toFixed(2)}%${' '.repeat(44)} ║`);
    lines.push(`║  Missed PHI: ${assessment.missedPHI.toString().padEnd(47)} ║`);
    lines.push('╠══════════════════════════════════════════════════════════════╣');
    lines.push('║  Findings:                                                   ║');

    for (const finding of assessment.findings) {
      const truncated = finding.substring(0, 58);
      lines.push(`║    • ${truncated.padEnd(56)} ║`);
    }

    lines.push('╚══════════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }
}

/**
 * Create a metrics calculator
 */
export function createMetricsCalculator(options?: {
  hipaaThreshold?: number;
  specificityThreshold?: number;
  estimatedTN?: number;
}): MetricsCalculator {
  return new MetricsCalculator(options);
}
