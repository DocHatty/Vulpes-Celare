/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██████╗ ██████╗  ██████╗ ███╗   ███╗██████╗ ████████╗                     ║
 * ║     ██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝                     ║
 * ║     ██████╔╝██████╔╝██║   ██║██╔████╔██║██████╔╝   ██║                        ║
 * ║     ██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██╔═══╝    ██║                        ║
 * ║     ██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║        ██║                        ║
 * ║     ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝                        ║
 * ║                                                                               ║
 * ║     ██╗███╗   ██╗     ██╗███████╗ ██████╗████████╗ ██████╗ ██████╗            ║
 * ║     ██║████╗  ██║     ██║██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗           ║
 * ║     ██║██╔██╗ ██║     ██║█████╗  ██║        ██║   ██║   ██║██████╔╝           ║
 * ║     ██║██║╚██╗██║██   ██║██╔══╝  ██║        ██║   ██║   ██║██╔══██╗           ║
 * ║     ██║██║ ╚████║╚█████╔╝███████╗╚██████╗   ██║   ╚██████╔╝██║  ██║           ║
 * ║     ╚═╝╚═╝  ╚═══╝ ╚════╝ ╚══════╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝           ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   PROMPT INJECTOR                                                             ║
 * ║   Elite-tier LLM Guidance for Maximum Analysis Potential                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module injects precision-calibrated guidance directly into test output,
 * enabling any LLM (Claude, Codex, GPT, Gemini) to immediately understand:
 *
 * 1. WHAT failed and WHY (root cause analysis)
 * 2. WHAT TO DO NOW (imperative action blocks)
 * 3. WHAT WORKED BEFORE (historical context)
 * 4. WHAT TO AVOID (anti-patterns from failures)
 *
 * The injection is calibrated per-model for optimal token efficiency and
 * comprehension based on each LLM's documented strengths.
 */

const { ActionBlockFormatter } = require("./ActionBlockFormatter");
const { ModelCalibrator } = require("./ModelCalibrator");
const { HistoryContextBuilder } = require("./HistoryContextBuilder");

// ============================================================================
// CONFIGURATION
// ============================================================================

const INJECTOR_CONFIG = {
  // Enable/disable injection globally
  enabled: process.env.VULPES_LLM_GUIDANCE !== "0",

  // Verbosity levels
  verbosity: {
    MINIMAL: 1, // Just DO THIS NOW
    STANDARD: 2, // + History context
    COMPREHENSIVE: 3, // + Deep analysis triggers
    DEBUG: 4, // + All available context
  },

  // Priority thresholds
  thresholds: {
    CRITICAL_SENSITIVITY: 98.0, // Below this = CRITICAL priority
    WARNING_SENSITIVITY: 99.0, // Below this = WARNING
    FAILURE_COUNT_DEEP_ANALYSIS: 50, // Triggers deep analysis
    DECLINING_TREND_THRESHOLD: -0.5, // Percentage points per run
  },

  // Box drawing characters for formatting
  box: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
    headerLeft: "╔",
    headerRight: "╗",
    headerBottom: "╠",
    footerLeft: "╚",
    footerRight: "╝",
    headerHorizontal: "═",
  },
};

// ============================================================================
// PROMPT INJECTOR CLASS
// ============================================================================

class PromptInjector {
  constructor(options = {}) {
    this.config = { ...INJECTOR_CONFIG, ...options };
    this.actionFormatter = new ActionBlockFormatter();
    this.modelCalibrator = new ModelCalibrator();
    this.historyBuilder = new HistoryContextBuilder();
    this.verbosity =
      options.verbosity || this.config.verbosity.STANDARD;
  }

  /**
   * Inject LLM guidance into test results
   * @param {Object} testResults - Raw test results from assessment
   * @param {Object} options - Injection options
   * @returns {string} Formatted output with embedded guidance
   */
  inject(testResults, options = {}) {
    if (!this.config.enabled) {
      return this.formatBasicResults(testResults);
    }

    const model = this.modelCalibrator.detectModel();
    const calibration = this.modelCalibrator.getCalibration(model);

    const sections = [];

    // 1. Header with model info
    sections.push(this.formatHeader(model, calibration, testResults));

    // 2. Metrics summary
    sections.push(this.formatMetrics(testResults));

    // 3. Top failure analysis
    if (testResults.topFailure || testResults.failures?.length > 0) {
      sections.push(this.formatTopFailure(testResults, calibration));
    }

    // 4. DO THIS NOW - Primary action block
    sections.push(
      this.actionFormatter.formatDoThisNow(testResults, calibration)
    );

    // 5. History context (if verbosity >= STANDARD)
    if (this.verbosity >= this.config.verbosity.STANDARD) {
      const history = this.historyBuilder.build(testResults);
      if (history) {
        sections.push(this.formatHistoryContext(history));
      }
    }

    // 6. Deep analysis trigger (if conditions met)
    if (this.shouldTriggerDeepAnalysis(testResults)) {
      sections.push(this.formatDeepAnalysisTrigger(testResults));
    }

    // 7. Avoid this - Anti-patterns
    if (this.verbosity >= this.config.verbosity.STANDARD) {
      sections.push(this.formatAvoidThis(testResults, calibration));
    }

    return sections.filter(Boolean).join("\n\n");
  }

  // ==========================================================================
  // SECTION FORMATTERS
  // ==========================================================================

  formatHeader(model, calibration, results) {
    const b = this.config.box;
    const width = 78;

    const modelDisplay = model.name || "Unknown Model";
    const modeDisplay = calibration.recommendedMode || "Standard";
    const priorityDisplay = this.getPriorityLevel(results);

    const lines = [];
    lines.push(
      b.headerLeft + b.headerHorizontal.repeat(width) + b.headerRight
    );
    lines.push(
      b.vertical +
        this.centerText("VULPES CELARE TEST RESULTS - LLM GUIDANCE ENABLED", width) +
        b.vertical
    );
    lines.push(
      b.headerBottom + b.headerHorizontal.repeat(width) + b.headerRight
    );
    lines.push(
      b.vertical +
        this.padText(`  Model Detected: ${modelDisplay}`, width) +
        b.vertical
    );
    lines.push(
      b.vertical +
        this.padText(`  Guidance Mode: ${modeDisplay}`, width) +
        b.vertical
    );
    lines.push(
      b.vertical +
        this.padText(`  Priority: ${priorityDisplay}`, width) +
        b.vertical
    );
    lines.push(
      b.footerLeft + b.headerHorizontal.repeat(width) + b.footerRight
    );

    return lines.join("\n");
  }

  formatMetrics(results) {
    const b = this.config.box;
    const width = 78;
    const metrics = results.metrics || {};

    const sensitivity = metrics.sensitivity?.toFixed(2) || "N/A";
    const specificity = metrics.specificity?.toFixed(2) || "N/A";
    const grade = results.grade || metrics.grade || "N/A";
    const trend = this.getTrendIndicator(metrics);

    const sensDelta = metrics.sensitivityDelta
      ? ` (${metrics.sensitivityDelta > 0 ? "+" : ""}${metrics.sensitivityDelta.toFixed(2)}%)`
      : "";
    const specDelta = metrics.specificityDelta
      ? ` (${metrics.specificityDelta > 0 ? "+" : ""}${metrics.specificityDelta.toFixed(2)}%)`
      : "";

    const lines = [];
    lines.push(b.topLeft + this.sectionHeader("METRICS", width));
    lines.push(
      b.vertical +
        this.padText(
          `  Sensitivity: ${sensitivity}%${sensDelta}  │  Specificity: ${specificity}%${specDelta}`,
          width
        ) +
        b.vertical
    );
    lines.push(
      b.vertical +
        this.padText(`  Grade: ${grade}  │  Trend: ${trend}`, width) +
        b.vertical
    );
    lines.push(b.bottomLeft + b.horizontal.repeat(width) + b.bottomRight);

    return lines.join("\n");
  }

  formatTopFailure(results, calibration) {
    const b = this.config.box;
    const width = 78;

    const topFailure = results.topFailure || this.extractTopFailure(results);
    if (!topFailure) return null;

    const lines = [];
    lines.push(b.topLeft + this.sectionHeader("TOP FAILURE", width));
    lines.push(
      b.vertical +
        this.padText(`  Type: ${topFailure.type || "UNKNOWN"}`, width) +
        b.vertical
    );
    lines.push(
      b.vertical +
        this.padText(
          `  Count: ${topFailure.count || 0} failures (${topFailure.percentage || "N/A"}% of total)`,
          width
        ) +
        b.vertical
    );
    lines.push(
      b.vertical +
        this.padText(
          `  Root Cause: ${topFailure.rootCause || "UNKNOWN"}`,
          width
        ) +
        b.vertical
    );
    lines.push(
      b.vertical +
        this.padText(
          `  Confidence: ${topFailure.confidence || "MEDIUM"}`,
          width
        ) +
        b.vertical
    );
    lines.push(b.bottomLeft + b.horizontal.repeat(width) + b.bottomRight);

    return lines.join("\n");
  }

  formatHistoryContext(history) {
    const b = this.config.box;
    const width = 78;

    if (!history || (!history.similar && !history.avoid)) {
      return null;
    }

    const lines = [];
    lines.push(b.topLeft + this.sectionHeader("HISTORY CONTEXT", width));
    lines.push(b.vertical + " ".repeat(width) + b.vertical);

    // Similar successful fix
    if (history.similar) {
      lines.push(
        b.vertical +
          this.padText(
            `  SIMILAR SUCCESSFUL FIX (${history.similar.date || "recent"}):`,
            width
          ) +
          b.vertical
      );
      lines.push(
        b.vertical +
          this.padText(`  • ${history.similar.description || "N/A"}`, width) +
          b.vertical
      );
      lines.push(
        b.vertical +
          this.padText(
            `  • Result: ${history.similar.result || "Unknown"}`,
            width
          ) +
          b.vertical
      );
      if (history.similar.commit) {
        lines.push(
          b.vertical +
            this.padText(
              `  • Commit: ${history.similar.commit}`,
              width
            ) +
            b.vertical
        );
      }
      lines.push(b.vertical + " ".repeat(width) + b.vertical);
    }

    // Avoid this
    if (history.avoid) {
      lines.push(
        b.vertical +
          this.padText(
            `  AVOID THIS (${history.avoid.date || "recent"}):`,
            width
          ) +
          b.vertical
      );
      lines.push(
        b.vertical +
          this.padText(`  • ${history.avoid.description || "N/A"}`, width) +
          b.vertical
      );
      lines.push(
        b.vertical +
          this.padText(`  • Lesson: ${history.avoid.lesson || "Unknown"}`, width) +
          b.vertical
      );
      lines.push(b.vertical + " ".repeat(width) + b.vertical);
    }

    // Risk level
    lines.push(
      b.vertical +
        this.padText(`  RISK LEVEL: ${history.riskLevel || "MEDIUM"}`, width) +
        b.vertical
    );
    lines.push(b.vertical + " ".repeat(width) + b.vertical);
    lines.push(b.bottomLeft + b.horizontal.repeat(width) + b.bottomRight);

    return lines.join("\n");
  }

  formatDeepAnalysisTrigger(results) {
    const b = this.config.box;
    const width = 78;

    const reason = this.getDeepAnalysisReason(results);

    const lines = [];
    lines.push(b.topLeft + this.sectionHeader("DEEP ANALYSIS TRIGGER", width));
    lines.push(b.vertical + " ".repeat(width) + b.vertical);
    lines.push(
      b.vertical +
        this.padText(`  ⚠ ${reason}`, width) +
        b.vertical
    );
    lines.push(b.vertical + " ".repeat(width) + b.vertical);
    lines.push(
      b.vertical +
        this.padText("  Consider using extended thinking to investigate:", width) +
        b.vertical
    );
    lines.push(
      b.vertical +
        this.padText("  • Why did recent changes cause regression?", width) +
        b.vertical
    );
    lines.push(
      b.vertical +
        this.padText("  • Is this a pattern issue or pipeline issue?", width) +
        b.vertical
    );
    lines.push(
      b.vertical +
        this.padText("  • Should we rollback recent commits?", width) +
        b.vertical
    );
    lines.push(b.vertical + " ".repeat(width) + b.vertical);
    lines.push(
      b.vertical +
        this.padText(
          "  Run: /deep-analysis to trigger comprehensive investigation",
          width
        ) +
        b.vertical
    );
    lines.push(b.vertical + " ".repeat(width) + b.vertical);
    lines.push(b.bottomLeft + b.horizontal.repeat(width) + b.bottomRight);

    return lines.join("\n");
  }

  formatAvoidThis(results, calibration) {
    const b = this.config.box;
    const width = 78;

    const antiPatterns = this.getAntiPatterns(results, calibration);
    if (antiPatterns.length === 0) return null;

    const lines = [];
    lines.push(b.topLeft + this.sectionHeader("AVOID THIS", width));
    lines.push(b.vertical + " ".repeat(width) + b.vertical);

    for (const pattern of antiPatterns) {
      lines.push(
        b.vertical + this.padText(`  ❌ ${pattern}`, width) + b.vertical
      );
    }

    lines.push(b.vertical + " ".repeat(width) + b.vertical);
    lines.push(b.bottomLeft + b.horizontal.repeat(width) + b.bottomRight);

    return lines.join("\n");
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  formatBasicResults(results) {
    // Fallback when injection is disabled
    return JSON.stringify(results, null, 2);
  }

  getPriorityLevel(results) {
    const sensitivity = results.metrics?.sensitivity || 0;

    if (sensitivity < this.config.thresholds.CRITICAL_SENSITIVITY) {
      return "CRITICAL - SENSITIVITY BELOW HIPAA THRESHOLD";
    }
    if (sensitivity < this.config.thresholds.WARNING_SENSITIVITY) {
      return "HIGH - SENSITIVITY NEEDS IMPROVEMENT";
    }
    return "STANDARD - MAINTAIN CURRENT METRICS";
  }

  getTrendIndicator(metrics) {
    const delta = metrics.sensitivityDelta || 0;

    if (delta > 0.5) return "IMPROVING ↑";
    if (delta > 0) return "SLIGHTLY IMPROVING ↗";
    if (delta > -0.5) return "STABLE →";
    if (delta > -1) return "DECLINING ↘";
    return "STRONGLY DECLINING ↓";
  }

  extractTopFailure(results) {
    const failures = results.failures || [];
    if (failures.length === 0) return null;

    // Group by type
    const byType = {};
    for (const failure of failures) {
      const type = failure.phiType || failure.type || "UNKNOWN";
      byType[type] = byType[type] || { count: 0, examples: [] };
      byType[type].count++;
      if (byType[type].examples.length < 5) {
        byType[type].examples.push(failure);
      }
    }

    // Find top
    const sorted = Object.entries(byType).sort((a, b) => b[1].count - a[1].count);
    const [type, data] = sorted[0] || ["UNKNOWN", { count: 0, examples: [] }];

    return {
      type,
      count: data.count,
      percentage: ((data.count / failures.length) * 100).toFixed(1),
      examples: data.examples,
      rootCause: this.inferRootCause(data.examples),
      confidence: data.count > 10 ? "HIGH" : data.count > 5 ? "MEDIUM" : "LOW",
    };
  }

  inferRootCause(examples) {
    if (!examples || examples.length === 0) return "UNKNOWN";

    // Check for OCR patterns
    const hasOcrChars = examples.some((e) =>
      /[0O1lI5S]/.test(e.value || e.text || "")
    );
    if (hasOcrChars) return "OCR_CONFUSION";

    // Check for format variations
    const hasFormatVariation = examples.some((e) =>
      /[.\-\s()\/]/.test(e.value || e.text || "")
    );
    if (hasFormatVariation) return "FORMAT_VARIATION";

    // Check for error levels indicating OCR
    const hasHighErrorLevel = examples.some((e) =>
      ["high", "extreme"].includes(e.errorLevel)
    );
    if (hasHighErrorLevel) return "OCR_DEGRADATION";

    return "PATTERN_EDGE_CASE";
  }

  shouldTriggerDeepAnalysis(results) {
    const sensitivity = results.metrics?.sensitivity || 100;
    const failureCount = results.failures?.length || 0;
    const trend = results.metrics?.sensitivityDelta || 0;

    return (
      sensitivity < this.config.thresholds.CRITICAL_SENSITIVITY ||
      failureCount > this.config.thresholds.FAILURE_COUNT_DEEP_ANALYSIS ||
      trend < this.config.thresholds.DECLINING_TREND_THRESHOLD
    );
  }

  getDeepAnalysisReason(results) {
    const sensitivity = results.metrics?.sensitivity || 100;
    const failureCount = results.failures?.length || 0;
    const trend = results.metrics?.sensitivityDelta || 0;

    if (sensitivity < this.config.thresholds.CRITICAL_SENSITIVITY) {
      return `CRITICAL: Sensitivity (${sensitivity.toFixed(2)}%) below HIPAA threshold`;
    }
    if (failureCount > this.config.thresholds.FAILURE_COUNT_DEEP_ANALYSIS) {
      return `HIGH FAILURE COUNT: ${failureCount} failures detected`;
    }
    if (trend < this.config.thresholds.DECLINING_TREND_THRESHOLD) {
      return `DECLINING TREND: ${trend.toFixed(2)}% per run`;
    }
    return "DEEP ANALYSIS RECOMMENDED";
  }

  getAntiPatterns(results, calibration) {
    const patterns = [
      "Don't add patterns without dictionary validation",
      "Don't modify PostFilterService without checking side effects",
      "Don't commit without running full test suite",
    ];

    // Add context-specific anti-patterns
    const topFailure = results.topFailure || this.extractTopFailure(results);
    if (topFailure?.rootCause === "OCR_CONFUSION") {
      patterns.push(
        "Don't apply OCR normalization to raw regex - only dictionary lookups"
      );
    }

    return patterns;
  }

  // ==========================================================================
  // TEXT FORMATTING HELPERS
  // ==========================================================================

  sectionHeader(title, width) {
    const b = this.config.box;
    const titlePart = ` ${title} `;
    const remaining = width - titlePart.length;
    return titlePart + b.horizontal.repeat(remaining) + b.topRight;
  }

  centerText(text, width) {
    const padding = Math.max(0, width - text.length);
    const left = Math.floor(padding / 2);
    const right = padding - left;
    return " ".repeat(left) + text + " ".repeat(right);
  }

  padText(text, width) {
    if (text.length >= width) return text.substring(0, width);
    return text + " ".repeat(width - text.length);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  PromptInjector,
  INJECTOR_CONFIG,
};
