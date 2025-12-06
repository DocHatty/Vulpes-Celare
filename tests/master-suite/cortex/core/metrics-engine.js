/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ║                                                                               ║
 * ║      ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗                        ║
 * ║     ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝                        ║
 * ║     ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝                         ║
 * ║     ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗                         ║
 * ║     ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗                        ║
 * ║      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝                        ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   METRICS ENGINE                                                              ║
 * ║   Industry-Standard Metrics for PHI Redaction Evaluation                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * GOLD STANDARD METRICS for Binary Classification:
 *
 * PRIMARY (Safety-Critical for PHI):
 * - Sensitivity (Recall/TPR): TP / (TP + FN) - Did we catch all PHI?
 * - Specificity (TNR): TN / (TN + FP) - Did we preserve non-PHI?
 * - F1 Score: Harmonic mean of precision and recall
 * - MCC: Matthews Correlation Coefficient - Best for imbalanced data
 *
 * SECONDARY (Detailed Analysis):
 * - Precision (PPV): TP / (TP + FP) - How accurate are redactions?
 * - NPV: TN / (TN + FN) - How reliable are preservations?
 * - Balanced Accuracy: (Sensitivity + Specificity) / 2
 * - FPR/FNR: Error rates
 *
 * DERIVED:
 * - Cohen's Kappa: Agreement accounting for chance
 * - Informedness (Youden's J): Sensitivity + Specificity - 1
 * - Markedness: Precision + NPV - 1
 */

const { METRICS_CONFIG } = require("./config");

// ============================================================================
// METRICS CALCULATOR
// ============================================================================

class MetricsEngine {
  constructor() {
    this.config = METRICS_CONFIG;
  }

  /**
   * Calculate all metrics from a confusion matrix
   * @param {Object} cm - Confusion matrix {tp, tn, fp, fn}
   * @returns {Object} Complete metrics object
   */
  calculateAll(cm) {
    // Validate input
    if (!this.validateConfusionMatrix(cm)) {
      throw new Error("Invalid confusion matrix");
    }

    const { tp, tn, fp, fn } = cm;
    const total = tp + tn + fp + fn;
    const actualPositive = tp + fn; // All actual PHI
    const actualNegative = tn + fp; // All actual non-PHI
    const predictedPositive = tp + fp; // All redacted
    const predictedNegative = tn + fn; // All preserved

    // Primary metrics
    const sensitivity = actualPositive > 0 ? tp / actualPositive : 0;
    const specificity = actualNegative > 0 ? tn / actualNegative : 0;
    const precision = predictedPositive > 0 ? tp / predictedPositive : 0;
    const npv = predictedNegative > 0 ? tn / predictedNegative : 0;

    const f1Score =
      precision + sensitivity > 0
        ? (2 * (precision * sensitivity)) / (precision + sensitivity)
        : 0;

    const mcc = this.calculateMCC(tp, tn, fp, fn);

    // Secondary metrics
    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const balancedAccuracy = (sensitivity + specificity) / 2;
    const fpr = actualNegative > 0 ? fp / actualNegative : 0; // False Positive Rate
    const fnr = actualPositive > 0 ? fn / actualPositive : 0; // False Negative Rate (PHI leakage!)

    // Derived metrics
    const informedness = sensitivity + specificity - 1; // Youden's J
    const markedness = precision + npv - 1;
    const prevalence = total > 0 ? actualPositive / total : 0;
    const cohensKappa = this.calculateCohensKappa(tp, tn, fp, fn);

    // Diagnostic odds ratio (how much more likely to redact PHI than non-PHI)
    const dor = fn === 0 || fp === 0 ? Infinity : (tp * tn) / (fp * fn);

    return {
      // Confusion matrix (for reference)
      confusionMatrix: {
        tp,
        tn,
        fp,
        fn,
        total,
        actualPositive,
        actualNegative,
      },

      // Primary metrics (percentages for readability)
      primary: {
        sensitivity: this.toPercent(sensitivity),
        specificity: this.toPercent(specificity),
        precision: this.toPercent(precision),
        f1Score: this.toPercent(f1Score),
        mcc: this.round(mcc, 4), // MCC is -1 to 1, not percentage
      },

      // Secondary metrics
      secondary: {
        npv: this.toPercent(npv),
        accuracy: this.toPercent(accuracy),
        balancedAccuracy: this.toPercent(balancedAccuracy),
        fpr: this.toPercent(fpr),
        fnr: this.toPercent(fnr), // THIS IS CRITICAL - PHI leakage rate
        informedness: this.round(informedness, 4),
        markedness: this.round(markedness, 4),
        cohensKappa: this.round(cohensKappa, 4),
        diagnosticOddsRatio: this.round(dor, 2),
        prevalence: this.toPercent(prevalence),
      },

      // Interpretation
      interpretation: this.interpret({
        sensitivity,
        specificity,
        precision,
        f1Score,
        mcc,
        fnr,
      }),

      // Timestamp
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Matthews Correlation Coefficient
   * Best single metric for imbalanced binary classification
   * Range: -1 (total disagreement) to +1 (perfect prediction)
   */
  calculateMCC(tp, tn, fp, fn) {
    const numerator = tp * tn - fp * fn;
    const denominator = Math.sqrt(
      (tp + fp) * (tp + fn) * (tn + fp) * (tn + fn),
    );

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Cohen's Kappa - Agreement accounting for chance
   * Range: -1 to +1 (1 = perfect agreement, 0 = chance, <0 = worse than chance)
   */
  calculateCohensKappa(tp, tn, fp, fn) {
    const total = tp + tn + fp + fn;
    if (total === 0) return 0;

    const po = (tp + tn) / total; // Observed agreement

    // Expected agreement by chance
    const pYes = ((tp + fp) / total) * ((tp + fn) / total);
    const pNo = ((tn + fn) / total) * ((tn + fp) / total);
    const pe = pYes + pNo;

    if (pe === 1) return 1; // Perfect agreement
    return (po - pe) / (1 - pe);
  }

  /**
   * Validate confusion matrix has required fields
   */
  validateConfusionMatrix(cm) {
    return (
      cm &&
      typeof cm.tp === "number" &&
      typeof cm.tn === "number" &&
      typeof cm.fp === "number" &&
      typeof cm.fn === "number" &&
      cm.tp >= 0 &&
      cm.tn >= 0 &&
      cm.fp >= 0 &&
      cm.fn >= 0
    );
  }

  toPercent(value) {
    return this.round(value * 100, 4);
  }

  round(value, decimals) {
    if (!isFinite(value)) return value;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Interpret metrics for PHI redaction context
   */
  interpret(metrics) {
    const issues = [];
    const strengths = [];
    const recommendations = [];

    // Sensitivity interpretation (MOST CRITICAL)
    if (metrics.sensitivity < 0.9) {
      issues.push({
        severity: "CRITICAL",
        metric: "sensitivity",
        message: `Sensitivity ${(metrics.sensitivity * 100).toFixed(1)}% is DANGEROUSLY LOW. PHI is being leaked.`,
        threshold: "90%",
      });
      recommendations.push(
        "STOP: Do not use in production. Major PHI detection improvements needed.",
      );
    } else if (metrics.sensitivity < 0.95) {
      issues.push({
        severity: "HIGH",
        metric: "sensitivity",
        message: `Sensitivity ${(metrics.sensitivity * 100).toFixed(1)}% is below acceptable threshold.`,
        threshold: "95%",
      });
      recommendations.push("Improve PHI detection before production use.");
    } else if (metrics.sensitivity < 0.98) {
      issues.push({
        severity: "MEDIUM",
        metric: "sensitivity",
        message: `Sensitivity ${(metrics.sensitivity * 100).toFixed(1)}% is good but could be improved.`,
        threshold: "98%",
      });
    } else if (metrics.sensitivity >= 0.99) {
      strengths.push({
        metric: "sensitivity",
        message: `Excellent sensitivity ${(metrics.sensitivity * 100).toFixed(1)}% - strong PHI detection.`,
      });
    }

    // FNR interpretation (PHI leakage - inverse of sensitivity)
    if (metrics.fnr > 0.05) {
      issues.push({
        severity: "CRITICAL",
        metric: "fnr",
        message: `False Negative Rate ${(metrics.fnr * 100).toFixed(1)}% means ${(metrics.fnr * 100).toFixed(1)}% of PHI is LEAKED.`,
        threshold: "<5%",
      });
    }

    // Specificity interpretation
    if (metrics.specificity < 0.85) {
      issues.push({
        severity: "MEDIUM",
        metric: "specificity",
        message: `Specificity ${(metrics.specificity * 100).toFixed(1)}% is low - excessive over-redaction.`,
        threshold: "85%",
      });
      recommendations.push("Reduce false positives to improve usability.");
    } else if (metrics.specificity >= 0.95) {
      strengths.push({
        metric: "specificity",
        message: `Good specificity ${(metrics.specificity * 100).toFixed(1)}% - minimal over-redaction.`,
      });
    }

    // MCC interpretation
    if (metrics.mcc < 0.7) {
      issues.push({
        severity: "HIGH",
        metric: "mcc",
        message: `MCC ${metrics.mcc.toFixed(3)} indicates poor overall classification quality.`,
        threshold: ">0.7",
      });
    } else if (metrics.mcc >= 0.9) {
      strengths.push({
        metric: "mcc",
        message: `Excellent MCC ${metrics.mcc.toFixed(3)} - strong overall performance.`,
      });
    }

    // F1 interpretation
    if (metrics.f1Score >= 0.95) {
      strengths.push({
        metric: "f1Score",
        message: `Strong F1 Score ${(metrics.f1Score * 100).toFixed(1)}%.`,
      });
    }

    // Overall assessment
    let overallGrade;
    if (metrics.sensitivity >= 0.99 && metrics.mcc >= 0.9) {
      overallGrade = "EXCELLENT";
    } else if (metrics.sensitivity >= 0.98 && metrics.mcc >= 0.8) {
      overallGrade = "GOOD";
    } else if (metrics.sensitivity >= 0.95 && metrics.mcc >= 0.7) {
      overallGrade = "ACCEPTABLE";
    } else if (metrics.sensitivity >= 0.9) {
      overallGrade = "NEEDS_IMPROVEMENT";
    } else {
      overallGrade = "UNACCEPTABLE";
    }

    return {
      overallGrade,
      issues,
      strengths,
      recommendations,
      summary: this.generateSummary(overallGrade, issues, strengths),
    };
  }

  generateSummary(grade, issues, strengths) {
    const criticalCount = issues.filter(
      (i) => i.severity === "CRITICAL",
    ).length;
    const highCount = issues.filter((i) => i.severity === "HIGH").length;

    if (grade === "EXCELLENT") {
      return "System is performing at clinical-grade level. Safe for production use.";
    } else if (grade === "GOOD") {
      return "System is performing well. Minor improvements possible.";
    } else if (grade === "ACCEPTABLE") {
      return "System meets minimum requirements. Improvements recommended before production.";
    } else if (grade === "NEEDS_IMPROVEMENT") {
      return `System has ${highCount} high-severity issues. Not recommended for production.`;
    } else {
      return `CRITICAL: System has ${criticalCount} critical issues. DO NOT USE for PHI.`;
    }
  }

  // ==========================================================================
  // COMPARISON METHODS
  // ==========================================================================

  /**
   * Compare two metric sets and determine improvement/regression
   */
  compare(before, after) {
    const comparison = {
      timestamp: new Date().toISOString(),
      before: before.primary,
      after: after.primary,
      deltas: {},
      significantChanges: [],
      verdict: "NO_CHANGE",
    };

    // Calculate deltas for primary metrics
    for (const metric of [
      "sensitivity",
      "specificity",
      "precision",
      "f1Score",
    ]) {
      const delta = after.primary[metric] - before.primary[metric];
      comparison.deltas[metric] = this.round(delta, 4);

      // Track significant changes
      if (Math.abs(delta) >= 0.5) {
        // 0.5% threshold
        comparison.significantChanges.push({
          metric,
          delta,
          direction: delta > 0 ? "IMPROVED" : "REGRESSED",
          significance: Math.abs(delta) >= 2 ? "MAJOR" : "MINOR",
        });
      }
    }

    // MCC delta (not percentage)
    const mccDelta = after.primary.mcc - before.primary.mcc;
    comparison.deltas.mcc = this.round(mccDelta, 4);
    if (Math.abs(mccDelta) >= 0.02) {
      comparison.significantChanges.push({
        metric: "mcc",
        delta: mccDelta,
        direction: mccDelta > 0 ? "IMPROVED" : "REGRESSED",
        significance: Math.abs(mccDelta) >= 0.05 ? "MAJOR" : "MINOR",
      });
    }

    // Determine overall verdict
    const sensImproved = comparison.deltas.sensitivity > 0.3;
    const sensRegressed = comparison.deltas.sensitivity < -0.3;
    const mccImproved = mccDelta > 0.02;
    const mccRegressed = mccDelta < -0.02;

    if (sensRegressed || mccRegressed) {
      comparison.verdict =
        sensRegressed && comparison.deltas.sensitivity < -1
          ? "MAJOR_REGRESSION"
          : "REGRESSION";
    } else if (sensImproved || mccImproved) {
      comparison.verdict =
        sensImproved && comparison.deltas.sensitivity > 2
          ? "MAJOR_IMPROVEMENT"
          : "IMPROVEMENT";
    } else {
      comparison.verdict = "STABLE";
    }

    // Add recommendation
    comparison.recommendation = this.getComparisonRecommendation(comparison);

    return comparison;
  }

  getComparisonRecommendation(comparison) {
    switch (comparison.verdict) {
      case "MAJOR_REGRESSION":
        return "ROLLBACK RECOMMENDED: Significant regression detected. Revert recent changes.";
      case "REGRESSION":
        return "CAUTION: Regression detected. Review recent changes before proceeding.";
      case "MAJOR_IMPROVEMENT":
        return "EXCELLENT: Major improvement achieved. Keep these changes.";
      case "IMPROVEMENT":
        return "GOOD: Improvement detected. Changes are beneficial.";
      case "STABLE":
        return "No significant change. Consider if changes achieved intended goal.";
      default:
        return "Unable to determine recommendation.";
    }
  }

  // ==========================================================================
  // SCORING METHODS
  // ==========================================================================

  /**
   * Calculate a weighted composite score
   * @param {Object} metrics - Metrics object from calculateAll()
   * @param {string} profile - Grading profile (HIPAA_STRICT, DEVELOPMENT, etc.)
   */
  calculateScore(metrics, profile = "DEVELOPMENT") {
    const weights = this.config.primary;

    // Normalize metrics to 0-1 scale
    const sens = metrics.primary.sensitivity / 100;
    const spec = metrics.primary.specificity / 100;
    const f1 = metrics.primary.f1Score / 100;
    const mcc = (metrics.primary.mcc + 1) / 2; // MCC is -1 to 1, normalize to 0-1

    // Weighted sum
    const rawScore =
      (sens * weights.sensitivity.weight +
        spec * weights.specificity.weight +
        f1 * weights.f1Score.weight +
        mcc * weights.mcc.weight) *
      100;

    return {
      rawScore: this.round(rawScore, 2),
      components: {
        sensitivity: {
          value: sens,
          weight: weights.sensitivity.weight,
          contribution: sens * weights.sensitivity.weight * 100,
        },
        specificity: {
          value: spec,
          weight: weights.specificity.weight,
          contribution: spec * weights.specificity.weight * 100,
        },
        f1Score: {
          value: f1,
          weight: weights.f1Score.weight,
          contribution: f1 * weights.f1Score.weight * 100,
        },
        mcc: {
          value: mcc,
          weight: weights.mcc.weight,
          contribution: mcc * weights.mcc.weight * 100,
        },
      },
    };
  }

  /**
   * Determine letter grade based on metrics
   */
  getGrade(metrics) {
    const sens = metrics.primary.sensitivity;
    const mcc = metrics.primary.mcc;

    // Hard thresholds based on sensitivity (safety-critical)
    if (sens < 85)
      return { grade: "F", description: "Critical Failure - Unsafe for PHI" };
    if (sens < 90)
      return { grade: "D", description: "Failing - Major PHI leakage risk" };
    if (sens < 95)
      return {
        grade: "C",
        description: "Below Standard - Significant improvement needed",
      };
    if (sens < 98) {
      if (mcc >= 0.85)
        return {
          grade: "B+",
          description: "Good - Minor improvements recommended",
        };
      return {
        grade: "B",
        description: "Acceptable - Improvements recommended",
      };
    }
    if (sens < 99) {
      if (mcc >= 0.9)
        return {
          grade: "A-",
          description: "Very Good - Production ready with monitoring",
        };
      return { grade: "B+", description: "Good - Close to production ready" };
    }
    if (mcc >= 0.95)
      return { grade: "A+", description: "Excellent - Clinical grade" };
    if (mcc >= 0.9)
      return { grade: "A", description: "Excellent - Production ready" };
    return { grade: "A-", description: "Very Good - Production ready" };
  }

  /**
   * Export LLM-friendly summary of the metrics engine capabilities
   */
  exportForLLM() {
    return {
      name: "MetricsEngine",
      description:
        "Industry-standard metrics calculator for PHI redaction evaluation",
      primaryMetrics: [
        "sensitivity",
        "specificity",
        "precision",
        "f1Score",
        "mcc",
      ],
      secondaryMetrics: [
        "npv",
        "accuracy",
        "balancedAccuracy",
        "fpr",
        "fnr",
        "cohensKappa",
      ],
      gradeScale: {
        "A+": "Excellent - Clinical grade (sens >= 99%, mcc >= 0.95)",
        A: "Excellent - Production ready (sens >= 99%, mcc >= 0.9)",
        "A-": "Very Good - Production ready with monitoring",
        "B+": "Good - Minor improvements recommended",
        B: "Acceptable - Improvements recommended",
        C: "Below Standard - Significant improvement needed",
        D: "Failing - Major PHI leakage risk",
        F: "Critical Failure - Unsafe for PHI",
      },
      capabilities: [
        "Calculate all standard binary classification metrics",
        "Matthews Correlation Coefficient (best for imbalanced data)",
        "Compare before/after metric sets with significance detection",
        "Grade performance on clinical safety scale",
        "Generate metric interpretations and recommendations",
      ],
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  MetricsEngine,
};
