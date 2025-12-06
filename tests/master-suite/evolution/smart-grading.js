/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CELARE - SMART GRADING SYSTEM                                        ║
 * ║  Context-Aware, Configurable, Evolution-Informed Scoring                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * RELATIONSHIP TO ASSESSMENT.JS:
 * This module provides ADDITIONAL multi-perspective grading on TOP of the core
 * assessment engine. The assessment.js handles primary metrics and basic grading,
 * while SmartGrader provides:
 *   - Multiple simultaneous grade perspectives (compare HIPAA_STRICT vs DEVELOPMENT)
 *   - OCR-tolerant scoring for high-error document testing
 *   - Evolution tracking (compare to previous runs)
 *   - Context-aware recommendations
 *
 * USAGE:
 *   // In run.js, after assessment.calculateMetrics():
 *   const grader = new SmartGrader({ profile: 'DEVELOPMENT' });
 *   const results = grader.grade(assessment.results.metrics, assessment.results.failures);
 *
 * PHILOSOPHY:
 * The old grading system was too punitive - missing 89 names resulted in -712 points,
 * completely obscuring the fact that the engine had 96%+ sensitivity.
 *
 * This new system:
 * 1. Uses configurable weights and profiles
 * 2. Applies diminishing penalties (not linear)
 * 3. Considers context (OCR errors vs clean data)
 * 4. Tracks progress and rewards improvement
 * 5. Provides multiple grade perspectives (raw, adjusted, contextual)
 * 6. Separates "production readiness" from "development progress"
 */

const fs = require("fs");
const path = require("path");

// ============================================================================
// GRADING PROFILES - Different perspectives on the same data
// ============================================================================

const GRADING_PROFILES = {
  /**
   * HIPAA_STRICT: Original strict grading for production readiness
   * Use when: Evaluating if system is ready for real HIPAA data
   */
  HIPAA_STRICT: {
    name: "HIPAA Strict",
    description: "Production-readiness evaluation with strict penalties",
    weights: {
      sensitivity: 0.7,
      specificity: 0.2,
      precision: 0.1,
    },
    penalties: {
      perMissedSSN: 10,
      perMissedName: 8,
      perMissedDOB: 5,
      perMissedAddress: 3,
      perMissedPhone: 2,
      perMissedOther: 1,
    },
    penaltyMode: "LINEAR", // Full penalty for each miss
    hardCaps: {
      // Below these thresholds, grade is capped
      sensitivity_90: "F",
      sensitivity_95: "C",
      sensitivity_98: "B",
    },
    grades: {
      "A+": 97,
      A: 93,
      "A-": 90,
      "B+": 87,
      B: 83,
      "B-": 80,
      "C+": 77,
      C: 73,
      "C-": 70,
      D: 60,
      F: 0,
    },
  },

  /**
   * DEVELOPMENT: Balanced grading for development progress
   * Use when: Tracking improvement during development
   */
  DEVELOPMENT: {
    name: "Development Progress",
    description: "Balanced scoring that rewards progress while noting issues",
    weights: {
      sensitivity: 0.6,
      specificity: 0.25,
      precision: 0.15,
    },
    penalties: {
      perMissedSSN: 2,
      perMissedName: 1,
      perMissedDOB: 1,
      perMissedAddress: 0.5,
      perMissedPhone: 0.5,
      perMissedOther: 0.25,
    },
    penaltyMode: "DIMINISHING", // Penalties decrease per additional miss
    bonuses: {
      perfectSSN: 5,
      perfectNames: 5,
      perfectDates: 3,
      above95Sensitivity: 5,
      above99Sensitivity: 10,
      noRegressions: 3,
      improvement: 5, // Bonus for improving over previous run
    },
    hardCaps: null, // No hard caps in dev mode
    grades: {
      "A+": 95,
      A: 90,
      "A-": 85,
      "B+": 80,
      B: 75,
      "B-": 70,
      "C+": 65,
      C: 60,
      "C-": 55,
      D: 45,
      F: 0,
    },
  },

  /**
   * RESEARCH: Focus on understanding, minimal penalties
   * Use when: Exploring failure patterns, not judging quality
   */
  RESEARCH: {
    name: "Research & Analysis",
    description: "Minimal penalties, focus on metric clarity",
    weights: {
      sensitivity: 0.5,
      specificity: 0.3,
      precision: 0.2,
    },
    penalties: {
      perMissedSSN: 0.5,
      perMissedName: 0.25,
      perMissedDOB: 0.25,
      perMissedAddress: 0.1,
      perMissedPhone: 0.1,
      perMissedOther: 0.05,
    },
    penaltyMode: "CAPPED", // Total penalties capped at 20 points
    penaltyCap: 20,
    hardCaps: null,
    grades: {
      "A+": 95,
      A: 90,
      "A-": 85,
      "B+": 80,
      B: 75,
      "B-": 70,
      "C+": 65,
      C: 60,
      "C-": 55,
      D: 45,
      F: 0,
    },
  },

  /**
   * OCR_TOLERANT: Adjusts for OCR difficulty
   * Use when: Testing with high OCR error rates
   */
  OCR_TOLERANT: {
    name: "OCR-Tolerant",
    description: "Reduced penalties for OCR-related failures",
    weights: {
      sensitivity: 0.55,
      specificity: 0.25,
      precision: 0.2,
    },
    penalties: {
      perMissedSSN: 5,
      perMissedName: 2,
      perMissedDOB: 2,
      perMissedAddress: 1,
      perMissedPhone: 1,
      perMissedOther: 0.5,
    },
    penaltyMode: "OCR_WEIGHTED", // Penalties reduced based on error level
    ocrDiscounts: {
      none: 1.0, // Full penalty
      low: 0.8, // 20% discount
      medium: 0.5, // 50% discount
      high: 0.25, // 75% discount
      extreme: 0.1, // 90% discount
    },
    hardCaps: null,
    grades: {
      "A+": 93,
      A: 88,
      "A-": 83,
      "B+": 78,
      B: 73,
      "B-": 68,
      "C+": 63,
      C: 58,
      "C-": 53,
      D: 43,
      F: 0,
    },
  },
};

// ============================================================================
// SMART GRADER CLASS
// ============================================================================

class SmartGrader {
  constructor(options = {}) {
    this.profile = options.profile || "DEVELOPMENT";
    this.config =
      GRADING_PROFILES[this.profile] || GRADING_PROFILES.DEVELOPMENT;
    this.previousRun = options.previousRun || null;
    this.evolutionContext = options.evolutionContext || null;
  }

  /**
   * Calculate comprehensive grade with multiple perspectives
   */
  grade(metrics, failures = [], context = {}) {
    const results = {
      profile: this.profile,
      profileDescription: this.config.description,
      timestamp: new Date().toISOString(),

      // Raw metrics (no adjustments)
      rawMetrics: {
        sensitivity: metrics.sensitivity,
        specificity: metrics.specificity,
        precision: metrics.precision,
        f1Score: metrics.f1Score,
      },

      // Calculated scores
      scores: {},

      // All profile results for comparison
      allProfiles: {},

      // Context-aware analysis
      contextAnalysis: {},

      // Evolution-aware analysis
      evolutionAnalysis: {},
    };

    // Calculate for current profile
    results.scores = this.calculateScore(metrics, failures, context);

    // Calculate for all profiles for comparison
    for (const [profileName, profileConfig] of Object.entries(
      GRADING_PROFILES,
    )) {
      const grader = new SmartGrader({ profile: profileName });
      results.allProfiles[profileName] = grader.calculateScore(
        metrics,
        failures,
        context,
      );
    }

    // Context analysis
    results.contextAnalysis = this.analyzeContext(failures, context);

    // Evolution analysis
    if (this.previousRun || this.evolutionContext) {
      results.evolutionAnalysis = this.analyzeEvolution(metrics);
    }

    return results;
  }

  /**
   * Calculate score for a specific profile
   */
  calculateScore(metrics, failures, context = {}) {
    const config = this.config;

    // 1. Calculate base score from weighted metrics
    const baseScore =
      metrics.sensitivity * config.weights.sensitivity +
      metrics.specificity * config.weights.specificity +
      metrics.precision * config.weights.precision;

    // 2. Calculate penalties
    const penaltyDetails = this.calculatePenalties(failures, context);

    // 3. Calculate bonuses (if applicable)
    const bonusDetails = this.calculateBonuses(metrics, failures, context);

    // 4. Calculate final score
    let finalScore = baseScore + bonusDetails.total - penaltyDetails.total;

    // 5. Apply hard caps if configured
    if (config.hardCaps) {
      finalScore = this.applyHardCaps(finalScore, metrics);
    }

    // 6. Clamp to 0-100
    finalScore = Math.max(0, Math.min(100, finalScore));

    // 7. Determine grade
    const grade = this.determineGrade(finalScore);

    return {
      baseScore: parseFloat(baseScore.toFixed(2)),
      penalties: penaltyDetails,
      bonuses: bonusDetails,
      finalScore: parseFloat(finalScore.toFixed(2)),
      grade: grade.letter,
      gradeDescription: grade.description,
      breakdown: this.getBreakdown(
        baseScore,
        penaltyDetails,
        bonusDetails,
        finalScore,
      ),
    };
  }

  /**
   * Calculate penalties based on profile's penalty mode
   */
  calculatePenalties(failures, context) {
    const config = this.config;
    const details = {
      byCriticality: {
        ssn: { count: 0, penalty: 0 },
        name: { count: 0, penalty: 0 },
        dob: { count: 0, penalty: 0 },
        address: { count: 0, penalty: 0 },
        phone: { count: 0, penalty: 0 },
        other: { count: 0, penalty: 0 },
      },
      byErrorLevel: {},
      total: 0,
      mode: config.penaltyMode,
    };

    // Categorize failures
    for (const failure of failures) {
      const category = this.categorizeFailure(failure);
      details.byCriticality[category].count++;

      // Track by error level
      const errorLevel = failure.errorLevel || "unknown";
      if (!details.byErrorLevel[errorLevel]) {
        details.byErrorLevel[errorLevel] = { count: 0, penalty: 0 };
      }
      details.byErrorLevel[errorLevel].count++;
    }

    // Calculate penalties based on mode
    switch (config.penaltyMode) {
      case "LINEAR":
        details.total = this.calculateLinearPenalties(
          details.byCriticality,
          config.penalties,
        );
        break;

      case "DIMINISHING":
        details.total = this.calculateDiminishingPenalties(
          details.byCriticality,
          config.penalties,
        );
        break;

      case "CAPPED":
        details.total = Math.min(
          this.calculateLinearPenalties(
            details.byCriticality,
            config.penalties,
          ),
          config.penaltyCap,
        );
        break;

      case "OCR_WEIGHTED":
        details.total = this.calculateOCRWeightedPenalties(failures, config);
        break;

      default:
        details.total = this.calculateLinearPenalties(
          details.byCriticality,
          config.penalties,
        );
    }

    return details;
  }

  categorizeFailure(failure) {
    const type = failure.phiType?.toUpperCase();

    if (type === "SSN") return "ssn";
    if (type === "NAME") return "name";
    if (type === "DATE" && failure.source?.includes("dob")) return "dob";
    if (type === "ADDRESS") return "address";
    if (type === "PHONE") return "phone";
    return "other";
  }

  calculateLinearPenalties(byCriticality, penalties) {
    return (
      byCriticality.ssn.count * penalties.perMissedSSN +
      byCriticality.name.count * penalties.perMissedName +
      byCriticality.dob.count * penalties.perMissedDOB +
      byCriticality.address.count * penalties.perMissedAddress +
      byCriticality.phone.count * penalties.perMissedPhone +
      byCriticality.other.count * penalties.perMissedOther
    );
  }

  calculateDiminishingPenalties(byCriticality, penalties) {
    // Each additional miss of the same type has less penalty
    // Formula: sum of penalty * (1 / sqrt(n)) for n = 1 to count
    let total = 0;

    for (const [category, data] of Object.entries(byCriticality)) {
      const basePenalty =
        penalties[`perMissed${this.capitalizeCategory(category)}`] || 0;
      let categoryPenalty = 0;

      for (let i = 1; i <= data.count; i++) {
        // Diminishing factor: first miss is full, subsequent are reduced
        categoryPenalty += basePenalty / Math.sqrt(i);
      }

      data.penalty = parseFloat(categoryPenalty.toFixed(2));
      total += categoryPenalty;
    }

    return parseFloat(total.toFixed(2));
  }

  calculateOCRWeightedPenalties(failures, config) {
    let total = 0;
    const discounts = config.ocrDiscounts;

    for (const failure of failures) {
      const category = this.categorizeFailure(failure);
      const basePenalty =
        config.penalties[`perMissed${this.capitalizeCategory(category)}`] || 0;
      const errorLevel = failure.errorLevel || "none";
      const discount = discounts[errorLevel] || 1.0;

      total += basePenalty * discount;
    }

    return parseFloat(total.toFixed(2));
  }

  capitalizeCategory(category) {
    const map = {
      ssn: "SSN",
      name: "Name",
      dob: "DOB",
      address: "Address",
      phone: "Phone",
      other: "Other",
    };
    return map[category] || category;
  }

  /**
   * Calculate bonuses
   */
  calculateBonuses(metrics, failures, context) {
    const config = this.config;
    const bonuses = config.bonuses || {};
    const details = {
      items: [],
      total: 0,
    };

    // Perfect category bonuses
    const missedTypes = new Set(failures.map((f) => f.phiType));

    if (!missedTypes.has("SSN") && bonuses.perfectSSN) {
      details.items.push({
        reason: "Perfect SSN detection",
        points: bonuses.perfectSSN,
      });
      details.total += bonuses.perfectSSN;
    }

    if (!missedTypes.has("NAME") && bonuses.perfectNames) {
      details.items.push({
        reason: "Perfect name detection",
        points: bonuses.perfectNames,
      });
      details.total += bonuses.perfectNames;
    }

    if (!missedTypes.has("DATE") && bonuses.perfectDates) {
      details.items.push({
        reason: "Perfect date detection",
        points: bonuses.perfectDates,
      });
      details.total += bonuses.perfectDates;
    }

    // Sensitivity threshold bonuses
    if (metrics.sensitivity >= 99 && bonuses.above99Sensitivity) {
      details.items.push({
        reason: "Sensitivity above 99%",
        points: bonuses.above99Sensitivity,
      });
      details.total += bonuses.above99Sensitivity;
    } else if (metrics.sensitivity >= 95 && bonuses.above95Sensitivity) {
      details.items.push({
        reason: "Sensitivity above 95%",
        points: bonuses.above95Sensitivity,
      });
      details.total += bonuses.above95Sensitivity;
    }

    // Improvement bonus
    if (this.previousRun && bonuses.improvement) {
      const improvement =
        metrics.sensitivity - (this.previousRun.sensitivity || 0);
      if (improvement > 0.5) {
        details.items.push({
          reason: `Improved by ${improvement.toFixed(2)}%`,
          points: bonuses.improvement,
        });
        details.total += bonuses.improvement;
      }
    }

    // No regression bonus
    if (this.previousRun && bonuses.noRegressions) {
      const prevSens = this.previousRun.sensitivity || 0;
      if (metrics.sensitivity >= prevSens - 0.1) {
        details.items.push({
          reason: "No sensitivity regression",
          points: bonuses.noRegressions,
        });
        details.total += bonuses.noRegressions;
      }
    }

    return details;
  }

  /**
   * Apply hard caps based on sensitivity thresholds
   */
  applyHardCaps(score, metrics) {
    const caps = this.config.hardCaps;
    if (!caps) return score;

    if (metrics.sensitivity < 90 && caps.sensitivity_90) {
      const maxScore = this.getMaxScoreForGrade(caps.sensitivity_90);
      return Math.min(score, maxScore);
    }

    if (metrics.sensitivity < 95 && caps.sensitivity_95) {
      const maxScore = this.getMaxScoreForGrade(caps.sensitivity_95);
      return Math.min(score, maxScore);
    }

    if (metrics.sensitivity < 98 && caps.sensitivity_98) {
      const maxScore = this.getMaxScoreForGrade(caps.sensitivity_98);
      return Math.min(score, maxScore);
    }

    return score;
  }

  getMaxScoreForGrade(targetGrade) {
    const grades = this.config.grades;
    // Return the threshold of the next grade up minus 0.1
    const gradeOrder = [
      "F",
      "D",
      "C-",
      "C",
      "C+",
      "B-",
      "B",
      "B+",
      "A-",
      "A",
      "A+",
    ];
    const targetIndex = gradeOrder.indexOf(targetGrade);

    if (targetIndex >= 0 && targetIndex < gradeOrder.length - 1) {
      const nextGrade = gradeOrder[targetIndex + 1];
      return (grades[nextGrade] || 0) - 0.1;
    }

    return grades[targetGrade] || 0;
  }

  /**
   * Determine letter grade from score
   */
  determineGrade(score) {
    const grades = this.config.grades;
    const descriptions = {
      "A+": "Excellent - Exceeds clinical standards",
      A: "Very Good - Meets clinical standards",
      "A-": "Good - Acceptable with monitoring",
      "B+": "Above Average - Minor improvements needed",
      B: "Average - Improvements recommended",
      "B-": "Below Average - Improvements required",
      "C+": "Marginal - Significant work needed",
      C: "Poor - Major improvements required",
      "C-": "Very Poor - Critical issues present",
      D: "Failing - Not suitable for use",
      F: "Critical Failure - Unsafe",
    };

    for (const [letter, threshold] of Object.entries(grades)) {
      if (score >= threshold) {
        return { letter, description: descriptions[letter] || letter };
      }
    }

    return { letter: "F", description: descriptions["F"] };
  }

  /**
   * Analyze context to provide insights
   */
  analyzeContext(failures, context) {
    const analysis = {
      errorLevelDistribution: {},
      typeDistribution: {},
      ocrImpact: { estimated: 0, explanation: "" },
      recommendations: [],
    };

    // Error level distribution
    for (const failure of failures) {
      const level = failure.errorLevel || "unknown";
      analysis.errorLevelDistribution[level] =
        (analysis.errorLevelDistribution[level] || 0) + 1;
    }

    // Type distribution
    for (const failure of failures) {
      const type = failure.phiType || "unknown";
      analysis.typeDistribution[type] =
        (analysis.typeDistribution[type] || 0) + 1;
    }

    // Estimate OCR impact
    const highErrorFailures =
      (analysis.errorLevelDistribution["high"] || 0) +
      (analysis.errorLevelDistribution["extreme"] || 0);
    const totalFailures = failures.length;

    if (totalFailures > 0) {
      const ocrRatio = highErrorFailures / totalFailures;
      analysis.ocrImpact.estimated = parseFloat((ocrRatio * 100).toFixed(1));

      if (ocrRatio > 0.5) {
        analysis.ocrImpact.explanation =
          "Majority of failures are in high-error documents. OCR tolerance is the main issue.";
        analysis.recommendations.push("Focus on OCR-tolerant pattern matching");
      } else if (ocrRatio > 0.25) {
        analysis.ocrImpact.explanation =
          "Significant portion of failures are OCR-related.";
        analysis.recommendations.push(
          "Add fuzzy matching for common OCR substitutions",
        );
      } else {
        analysis.ocrImpact.explanation =
          "Most failures occur even in clean or low-error documents.";
        analysis.recommendations.push(
          "Review pattern matching logic for edge cases",
        );
      }
    }

    // Type-specific recommendations
    const sortedTypes = Object.entries(analysis.typeDistribution).sort(
      (a, b) => b[1] - a[1],
    );

    if (sortedTypes.length > 0) {
      const [topType, count] = sortedTypes[0];
      if (count > 10) {
        analysis.recommendations.push(
          `Prioritize ${topType} detection (${count} failures)`,
        );
      }
    }

    return analysis;
  }

  /**
   * Analyze evolution compared to previous runs
   */
  analyzeEvolution(metrics) {
    const analysis = {
      trend: "UNKNOWN",
      comparison: null,
      insight: "",
    };

    if (this.previousRun) {
      const prevSens = this.previousRun.sensitivity || 0;
      const currSens = metrics.sensitivity;
      const delta = currSens - prevSens;

      analysis.comparison = {
        previousSensitivity: prevSens,
        currentSensitivity: currSens,
        delta: parseFloat(delta.toFixed(2)),
      };

      if (delta > 1) {
        analysis.trend = "IMPROVING";
        analysis.insight = `Sensitivity improved by ${delta.toFixed(2)}%. Keep up the good work!`;
      } else if (delta > 0) {
        analysis.trend = "STABLE_IMPROVING";
        analysis.insight = `Slight improvement of ${delta.toFixed(2)}%. Moving in right direction.`;
      } else if (delta > -0.5) {
        analysis.trend = "STABLE";
        analysis.insight =
          "Performance is stable. Consider new approaches for further improvement.";
      } else {
        analysis.trend = "REGRESSING";
        analysis.insight = `Regression of ${Math.abs(delta).toFixed(2)}%. Review recent changes.`;
      }
    }

    if (this.evolutionContext) {
      analysis.historicalBest = this.evolutionContext.bestSensitivity;
      analysis.totalProgress = this.evolutionContext.totalProgress;
      analysis.persistentIssues = this.evolutionContext.persistentIssues;
    }

    return analysis;
  }

  /**
   * Get formatted breakdown for display
   */
  getBreakdown(baseScore, penalties, bonuses, finalScore) {
    const lines = [`Base Score (weighted metrics):  ${baseScore.toFixed(2)}`];

    if (penalties.total > 0) {
      lines.push(
        `Penalties (${penalties.mode}):      -${penalties.total.toFixed(2)}`,
      );
      for (const [category, data] of Object.entries(penalties.byCriticality)) {
        if (data.count > 0) {
          lines.push(`  - ${category}: ${data.count} missed`);
        }
      }
    }

    if (bonuses.total > 0) {
      lines.push(`Bonuses:                       +${bonuses.total.toFixed(2)}`);
      for (const item of bonuses.items) {
        lines.push(`  + ${item.reason}: +${item.points}`);
      }
    }

    lines.push(`────────────────────────────────────`);
    lines.push(`Final Score:                    ${finalScore.toFixed(2)}`);

    return lines.join("\n");
  }
}

// ============================================================================
// GRADING REPORT GENERATOR
// ============================================================================

function generateGradingReport(gradeResults) {
  const r = gradeResults;
  const s = r.scores;

  let report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                       SMART GRADING REPORT                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

PROFILE: ${r.profile} - ${r.profileDescription}

RAW METRICS
────────────────────────────────────────────────────────────────────────────────
  Sensitivity:    ${r.rawMetrics.sensitivity.toFixed(2)}%
  Specificity:    ${r.rawMetrics.specificity.toFixed(2)}%
  Precision:      ${r.rawMetrics.precision.toFixed(2)}%
  F1 Score:       ${r.rawMetrics.f1Score.toFixed(2)}

SCORE CALCULATION
────────────────────────────────────────────────────────────────────────────────
${s.breakdown}

                         ╔═══════════════╗
                         ║    ${s.grade.padStart(3)}        ║
                         ║   ${s.finalScore}/100     ║
                         ╚═══════════════╝

  ${s.gradeDescription}

COMPARISON ACROSS PROFILES
────────────────────────────────────────────────────────────────────────────────
`;

  for (const [profile, scores] of Object.entries(r.allProfiles)) {
    const marker = profile === r.profile ? "→" : " ";
    report += `${marker} ${profile.padEnd(15)} ${scores.grade.padEnd(3)} (${scores.finalScore}/100)\n`;
  }

  report += `
CONTEXT ANALYSIS
────────────────────────────────────────────────────────────────────────────────
  OCR Impact:     ${r.contextAnalysis.ocrImpact.estimated}% of failures in high-error docs
                  ${r.contextAnalysis.ocrImpact.explanation}

  Failures by Type:
`;

  const sortedTypes = Object.entries(r.contextAnalysis.typeDistribution).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [type, count] of sortedTypes.slice(0, 5)) {
    report += `    ${type.padEnd(15)} ${count}\n`;
  }

  if (r.evolutionAnalysis.trend && r.evolutionAnalysis.trend !== "UNKNOWN") {
    report += `
EVOLUTION
────────────────────────────────────────────────────────────────────────────────
  Trend:          ${r.evolutionAnalysis.trend}
  ${r.evolutionAnalysis.insight}
`;
    if (r.evolutionAnalysis.comparison) {
      const c = r.evolutionAnalysis.comparison;
      report += `
  Previous:       ${c.previousSensitivity.toFixed(2)}%
  Current:        ${c.currentSensitivity.toFixed(2)}%
  Delta:          ${c.delta >= 0 ? "+" : ""}${c.delta.toFixed(2)}%
`;
    }
  }

  if (r.contextAnalysis.recommendations.length > 0) {
    report += `
RECOMMENDATIONS
────────────────────────────────────────────────────────────────────────────────
`;
    for (const rec of r.contextAnalysis.recommendations) {
      report += `  → ${rec}\n`;
    }
  }

  report += `
══════════════════════════════════════════════════════════════════════════════
`;

  return report;
}

module.exports = {
  SmartGrader,
  GRADING_PROFILES,
  generateGradingReport,
};
