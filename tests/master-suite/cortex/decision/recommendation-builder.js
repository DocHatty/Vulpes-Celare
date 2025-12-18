const { random } = require("../../generators/seeded-random");

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
 * ║   RECOMMENDATION BUILDER                                                      ║
 * ║   Constructs Actionable, Evidence-Based Recommendations                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module takes synthesized information and builds SPECIFIC, ACTIONABLE
 * recommendations that can be presented to users or executed automatically.
 *
 * RECOMMENDATION PROPERTIES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - Action: What specifically should be done
 * - Target: What file/filter/component to modify
 * - Rationale: Why this is recommended
 * - Evidence: Historical data supporting this
 * - Risk: What could go wrong
 * - Confidence: How sure are we
 * - Priority: How urgently should this be done
 * - Prerequisites: What needs to happen first
 * - Expected Impact: What we think will happen
 *
 * OUTPUT FORMATS:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - Human-readable summary
 * - LLM-consumable structured data
 * - Actionable JSON for automation
 * - Detailed report for review
 */

const fs = require("fs");
const path = require("path");
const { PATHS } = require("../core/config");

// ============================================================================
// RECOMMENDATION TEMPLATES
// ============================================================================

const RECOMMENDATION_TEMPLATES = {
  ADD_DICTIONARY_ENTRIES: {
    actionTemplate: "Add {count} entries to {dictionary}",
    targetType: "DICTIONARY",
    riskLevel: "LOW",
    expectedImpact: "Improved {phiType} detection",
    prerequisites: ["Backup dictionary", "Identify false negative patterns"],
    autoApplicable: true,
  },
  EXTEND_PATTERN: {
    actionTemplate: "Extend {filter} pattern to handle {variant}",
    targetType: "FILTER",
    riskLevel: "MEDIUM",
    expectedImpact: "Catch {count} additional cases",
    prerequisites: ["Review existing patterns", "Test in isolation"],
    autoApplicable: false,
  },
  ENABLE_FUZZY_MATCHING: {
    actionTemplate: "Enable fuzzy matching for {filter}",
    targetType: "FILTER_CONFIG",
    riskLevel: "MEDIUM",
    expectedImpact: "Better OCR tolerance for {phiType}",
    prerequisites: ["Assess false positive risk", "Configure threshold"],
    autoApplicable: true,
  },
  ADD_OCR_SUBSTITUTION: {
    actionTemplate: "Add OCR substitution rule: {from} → {to}",
    targetType: "SYSTEM_CONFIG",
    riskLevel: "LOW",
    expectedImpact: "Handle {count} OCR confusion cases",
    prerequisites: ["Verify substitution is valid"],
    autoApplicable: true,
  },
  ADJUST_THRESHOLD: {
    actionTemplate: "Adjust {parameter} from {oldValue} to {newValue}",
    targetType: "CONFIG",
    riskLevel: "MEDIUM",
    expectedImpact: "Balance between sensitivity and specificity",
    prerequisites: ["Run baseline metrics", "Prepare rollback"],
    autoApplicable: true,
  },
  ADD_CONTEXT_RULE: {
    actionTemplate: "Add context rule for {pattern}",
    targetType: "FILTER",
    riskLevel: "MEDIUM",
    expectedImpact: "Improved precision for {phiType}",
    prerequisites: ["Identify context patterns", "Test boundary cases"],
    autoApplicable: false,
  },
  ADD_EXCLUSION_RULE: {
    actionTemplate: "Add exclusion rule for {pattern}",
    targetType: "FILTER",
    riskLevel: "LOW",
    expectedImpact: "Reduce false positives",
    prerequisites: ["Verify exclusion is safe", "Check for PHI edge cases"],
    autoApplicable: true,
  },
  ROLLBACK_CHANGE: {
    actionTemplate: "Rollback to backup {backupId}",
    targetType: "SYSTEM",
    riskLevel: "LOW",
    expectedImpact: "Restore previous state",
    prerequisites: ["Verify backup exists", "Prepare for re-test"],
    autoApplicable: true,
  },
};

// ============================================================================
// RECOMMENDATION BUILDER CLASS
// ============================================================================

class RecommendationBuilder {
  constructor(options = {}) {
    this.codebaseAnalyzer = options.codebaseAnalyzer || null;
    this.patternRecognizer = options.patternRecognizer || null;
    this.historyConsultant = options.historyConsultant || null;

    this.storagePath = path.join(PATHS.knowledge, "recommendations.json");
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      }
    } catch (e) {
      // Fresh start
    }
    return {
      recommendations: [],
      stats: {
        total: 0,
        implemented: 0,
        skipped: 0,
        byType: {},
      },
    };
  }

  saveData() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
  }

  // ==========================================================================
  // BUILD RECOMMENDATION
  // ==========================================================================

  /**
   * Build a recommendation from a hypothesis or insight
   * @param {string} type - Recommendation type from RECOMMENDATION_TEMPLATES
   * @param {Object} params - Parameters for the recommendation
   * @param {Object} evidence - Supporting evidence
   */
  build(type, params, evidence = {}) {
    const template = RECOMMENDATION_TEMPLATES[type];
    if (!template) {
      throw new Error(`Unknown recommendation type: ${type}`);
    }

    const recommendation = {
      id: `REC-${Date.now()}-${random().toString(36).substr(2, 6)}`,
      type,
      timestamp: new Date().toISOString(),

      // Core recommendation
      action: this.formatTemplate(template.actionTemplate, params),
      target: {
        type: template.targetType,
        file: params.targetFile || this.inferTargetFile(type, params),
        component: params.component || params.filter || params.dictionary,
        parameter: params.parameter,
      },

      // Details
      params,
      rationale:
        params.rationale || this.generateRationale(type, params, evidence),
      evidence: this.formatEvidence(evidence),

      // Assessment
      risk: this.assessRisk(type, params, evidence),
      confidence: this.calculateConfidence(type, params, evidence),
      priority: this.calculatePriority(type, params, evidence),

      // Execution
      prerequisites: template.prerequisites,
      autoApplicable: template.autoApplicable,
      expectedImpact: this.formatTemplate(template.expectedImpact, params),

      // Status
      status: "PENDING", // PENDING, APPROVED, IMPLEMENTED, SKIPPED, FAILED
    };

    // Store recommendation
    this.data.recommendations.push(recommendation);
    this.data.stats.total++;
    this.data.stats.byType[type] = (this.data.stats.byType[type] || 0) + 1;
    this.saveData();

    return recommendation;
  }

  formatTemplate(template, params) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  inferTargetFile(type, params) {
    // Try to infer the target file from context
    if (params.filter) {
      return `src/filters/${params.filter}.ts`;
    }
    if (params.dictionary) {
      return `src/dictionaries/${params.dictionary}`;
    }
    if (params.phiType && this.codebaseAnalyzer) {
      const state = this.codebaseAnalyzer.getCurrentState();
      const filters = state.filters?.byType?.[params.phiType];
      if (filters && filters.length > 0) {
        return `src/filters/${filters[0]}.ts`;
      }
    }
    return null;
  }

  // ==========================================================================
  // RATIONALE GENERATION
  // ==========================================================================

  generateRationale(type, params, evidence) {
    const parts = [];

    // Historical basis
    if (evidence.previousSuccesses?.length > 0) {
      parts.push(
        `Similar approach succeeded ${evidence.previousSuccesses.length} time(s) before`,
      );
    }

    // Pattern basis
    if (evidence.patterns?.length > 0) {
      parts.push(
        `Addresses ${evidence.patterns.length} identified failure pattern(s)`,
      );
    }

    // Metric basis
    if (evidence.metricGap) {
      parts.push(
        `Current ${evidence.metricGap.metric} (${evidence.metricGap.current}%) below target (${evidence.metricGap.target}%)`,
      );
    }

    // Type-specific rationale
    switch (type) {
      case "ADD_DICTIONARY_ENTRIES":
        parts.push("Expanding vocabulary coverage for missed cases");
        break;
      case "EXTEND_PATTERN":
        parts.push("Current pattern does not cover observed format variations");
        break;
      case "ENABLE_FUZZY_MATCHING":
        parts.push("OCR-induced variations are causing false negatives");
        break;
      case "ADD_EXCLUSION_RULE":
        parts.push("Common false positive pattern identified");
        break;
    }

    return parts.join(". ") + ".";
  }

  formatEvidence(evidence) {
    return {
      patterns: evidence.patterns || [],
      previousSuccesses: evidence.previousSuccesses || [],
      previousFailures: evidence.previousFailures || [],
      metrics: evidence.metrics || {},
      historyConsulted: !!evidence.historyConsulted,
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // RISK ASSESSMENT
  // ==========================================================================

  assessRisk(type, params, evidence) {
    const template = RECOMMENDATION_TEMPLATES[type];
    const baseRisk = template?.riskLevel || "MEDIUM";

    const risk = {
      level: baseRisk,
      factors: [],
      mitigations: [],
    };

    // Increase risk if previous failures
    if (evidence.previousFailures?.length >= 2) {
      risk.level = this.increaseRiskLevel(risk.level);
      risk.factors.push("Multiple similar attempts have failed");
      risk.mitigations.push(
        "Review why previous attempts failed before proceeding",
      );
    }

    // Increase risk for filter modifications
    if (template?.targetType === "FILTER") {
      risk.factors.push("Filter changes can affect detection accuracy");
      risk.mitigations.push("Run comprehensive test suite after change");
    }

    // Decrease risk if high historical success rate
    if (
      evidence.previousSuccesses?.length >= 3 &&
      evidence.previousFailures?.length === 0
    ) {
      risk.level = this.decreaseRiskLevel(risk.level);
      risk.factors.push("Historically reliable approach");
    }

    // Add standard mitigations
    risk.mitigations.push("Create backup before applying");
    risk.mitigations.push("Run A/B test to measure impact");
    risk.mitigations.push("Have rollback plan ready");

    return risk;
  }

  increaseRiskLevel(level) {
    const levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const index = levels.indexOf(level);
    return levels[Math.min(index + 1, levels.length - 1)];
  }

  decreaseRiskLevel(level) {
    const levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const index = levels.indexOf(level);
    return levels[Math.max(index - 1, 0)];
  }

  // ==========================================================================
  // CONFIDENCE AND PRIORITY
  // ==========================================================================

  calculateConfidence(type, params, evidence) {
    let confidence = 0.5; // Base confidence

    // Evidence-based adjustments
    if (evidence.patterns?.length >= 5) confidence += 0.15;
    if (evidence.previousSuccesses?.length >= 2) confidence += 0.2;
    if (evidence.previousFailures?.length >= 2) confidence -= 0.15;
    if (evidence.historyConsulted) confidence += 0.1;

    // Type-based adjustments (some types are more reliable)
    const typeConfidence = {
      ADD_DICTIONARY_ENTRIES: 0.75,
      ADD_OCR_SUBSTITUTION: 0.7,
      ADD_EXCLUSION_RULE: 0.7,
      EXTEND_PATTERN: 0.55,
      ENABLE_FUZZY_MATCHING: 0.6,
      ADJUST_THRESHOLD: 0.5,
    };

    if (typeConfidence[type]) {
      confidence = (confidence + typeConfidence[type]) / 2;
    }

    return Math.max(0.1, Math.min(confidence, 0.95));
  }

  calculatePriority(type, params, evidence) {
    // Start with count/impact
    let score = 0;

    if (params.count) {
      score += Math.min(params.count / 10, 5); // Up to 5 points for count
    }

    // Pattern frequency
    if (evidence.patterns?.length > 0) {
      const totalCount = evidence.patterns.reduce(
        (sum, p) => sum + (p.count || 1),
        0,
      );
      score += Math.min(totalCount / 20, 5); // Up to 5 points for pattern count
    }

    // Critical PHI types get priority
    const criticalTypes = ["SSN", "MRN", "MEDICAL_RECORD", "HEALTH_PLAN_ID"];
    if (criticalTypes.includes(params.phiType)) {
      score += 3;
    }

    // Historical success increases priority
    if (evidence.previousSuccesses?.length >= 2) {
      score += 2;
    }

    // Determine priority level
    if (score >= 10) return "CRITICAL";
    if (score >= 6) return "HIGH";
    if (score >= 3) return "MEDIUM";
    return "LOW";
  }

  // ==========================================================================
  // BATCH RECOMMENDATIONS
  // ==========================================================================

  /**
   * Generate recommendations from pattern analysis
   */
  generateFromPatterns(patternAnalysis) {
    const recommendations = [];

    for (const pattern of patternAnalysis.failurePatterns || []) {
      let recType = null;
      let params = {
        phiType: pattern.phiType,
        count: 1,
      };

      switch (pattern.category) {
        case "OCR_CONFUSION":
          if (pattern.details?.length > 0) {
            const sub = pattern.details[0];
            recType = "ADD_OCR_SUBSTITUTION";
            params.from = sub.char;
            params.to = sub.possibleOCR;
          }
          break;

        case "DICTIONARY_MISS":
          recType = "ADD_DICTIONARY_ENTRIES";
          params.dictionary = this.inferDictionary(pattern.phiType);
          params.entries = [pattern.original];
          params.count = 1;
          break;

        case "FORMAT_VARIATION":
          recType = "EXTEND_PATTERN";
          params.filter = this.inferFilter(pattern.phiType);
          params.variant =
            pattern.details?.detected_formats?.join(", ") || "new format";
          break;

        case "CASE_VARIATION":
          recType = "ENABLE_FUZZY_MATCHING";
          params.filter = this.inferFilter(pattern.phiType);
          break;

        case "FALSE_POSITIVE":
          recType = "ADD_EXCLUSION_RULE";
          params.filter = this.inferFilter(pattern.phiType);
          params.pattern = pattern.detected;
          break;
      }

      if (recType) {
        const rec = this.build(recType, params, {
          patterns: [pattern],
        });
        recommendations.push(rec);
      }
    }

    return recommendations;
  }

  /**
   * Generate recommendations from insights
   */
  generateFromInsights(insights) {
    const recommendations = [];

    for (const insight of insights) {
      if (!insight.action) continue;

      // Try to map insight to recommendation type
      const recType = this.inferTypeFromInsight(insight);
      if (recType) {
        const params = {
          ...insight.details,
          rationale: `From insight: ${insight.title}`,
        };
        const rec = this.build(recType, params, {
          insights: [insight],
        });
        recommendations.push(rec);
      }
    }

    return recommendations;
  }

  inferTypeFromInsight(insight) {
    const title = insight.title?.toLowerCase() || "";
    const action = insight.action?.toLowerCase() || "";

    if (title.includes("dictionary") || action.includes("dictionary")) {
      return "ADD_DICTIONARY_ENTRIES";
    }
    if (title.includes("ocr") || action.includes("ocr")) {
      return "ADD_OCR_SUBSTITUTION";
    }
    if (title.includes("pattern") || action.includes("extend")) {
      return "EXTEND_PATTERN";
    }
    if (title.includes("fuzzy") || action.includes("fuzzy")) {
      return "ENABLE_FUZZY_MATCHING";
    }
    if (title.includes("false positive") || action.includes("exclusion")) {
      return "ADD_EXCLUSION_RULE";
    }

    return null;
  }

  inferDictionary(phiType) {
    const map = {
      NAME: "first-names.txt",
      FIRST_NAME: "first-names.txt",
      LAST_NAME: "surnames.txt",
      HOSPITAL: "hospitals.txt",
      CITY: "cities.txt",
    };
    return map[phiType] || "custom-dictionary.txt";
  }

  inferFilter(phiType) {
    return `${phiType.charAt(0)}${phiType.slice(1).toLowerCase().replace(/_/g, "")}Filter`;
  }

  // ==========================================================================
  // STATUS MANAGEMENT
  // ==========================================================================

  markImplemented(recommendationId, result = {}) {
    const rec = this.data.recommendations.find(
      (r) => r.id === recommendationId,
    );
    if (rec) {
      rec.status = "IMPLEMENTED";
      rec.implementedAt = new Date().toISOString();
      rec.result = result;
      this.data.stats.implemented++;
      this.saveData();
    }
    return rec;
  }

  markSkipped(recommendationId, reason = "") {
    const rec = this.data.recommendations.find(
      (r) => r.id === recommendationId,
    );
    if (rec) {
      rec.status = "SKIPPED";
      rec.skippedAt = new Date().toISOString();
      rec.skipReason = reason;
      this.data.stats.skipped++;
      this.saveData();
    }
    return rec;
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  getRecommendation(id) {
    return this.data.recommendations.find((r) => r.id === id);
  }

  getPendingRecommendations() {
    return this.data.recommendations.filter((r) => r.status === "PENDING");
  }

  getRecommendationsByPriority(priority) {
    return this.data.recommendations.filter(
      (r) => r.priority === priority && r.status === "PENDING",
    );
  }

  getTopRecommendations(limit = 10) {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    return this.getPendingRecommendations()
      .sort((a, b) => {
        const priorDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorDiff !== 0) return priorDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, limit);
  }

  getAutoApplicable() {
    return this.data.recommendations.filter(
      (r) => r.status === "PENDING" && r.autoApplicable,
    );
  }

  /**
   * Export for LLM context
   */
  exportForLLM() {
    return {
      stats: this.data.stats,
      pending: this.getPendingRecommendations().length,
      topRecommendations: this.getTopRecommendations(5).map((r) => ({
        id: r.id,
        action: r.action,
        priority: r.priority,
        confidence: r.confidence,
        risk: r.risk?.level,
      })),
    };
  }

  /**
   * Generate human-readable report
   */
  generateReport() {
    const pending = this.getTopRecommendations(10);

    let report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  VULPES CORTEX - RECOMMENDATIONS REPORT                                      ║
║  Generated: ${new Date().toISOString()}
╚══════════════════════════════════════════════════════════════════════════════╝

SUMMARY
───────────────────────────────────────────────────────────────────────────────
Total Recommendations: ${this.data.stats.total}
Implemented: ${this.data.stats.implemented}
Skipped: ${this.data.stats.skipped}
Pending: ${pending.length}

TOP PENDING RECOMMENDATIONS
───────────────────────────────────────────────────────────────────────────────
`;

    for (const rec of pending) {
      report += `
[${rec.priority}] ${rec.action}
  ID: ${rec.id}
  Target: ${rec.target?.component || rec.target?.file || "N/A"}
  Confidence: ${Math.round(rec.confidence * 100)}%
  Risk: ${rec.risk?.level || "UNKNOWN"}
  Rationale: ${rec.rationale}
`;
    }

    return report;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  RecommendationBuilder,
  RECOMMENDATION_TEMPLATES,
};
