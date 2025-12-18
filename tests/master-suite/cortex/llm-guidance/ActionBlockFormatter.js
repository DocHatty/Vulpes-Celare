/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   ACTION BLOCK FORMATTER                                                      ║
 * ║   Formats imperative "DO THIS NOW" action blocks for LLM consumption          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This formatter creates clear, actionable directives that any LLM can immediately
 * execute. Action blocks follow the pattern:
 *
 * 1. READ: file:line - what to examine
 * 2. FIX: specific action to take
 * 3. RUN: verification command
 * 4. EXPECTED: outcome prediction
 */

const path = require("path");

// ============================================================================
// CONFIGURATION
// ============================================================================

const ACTION_CONFIG = {
  maxSteps: 5,
  includeFileLineReferences: true,
  includeExpectedOutcome: true,

  // Root cause to file mapping
  rootCauseFiles: {
    OCR_CONFUSION: [
      "src/filters/SmartNameFilterSpan.ts",
      "src/filters/name-patterns/OcrTolerancePatterns.ts",
      "src/config/OcrPatterns.ts",
    ],
    FORMAT_VARIATION: [
      "src/filters/PhoneFilterSpan.ts",
      "src/filters/SSNFilterSpan.ts",
      "src/filters/DateFilterSpan.ts",
    ],
    DICTIONARY_MISS: [
      "src/dictionaries/NameDictionary.ts",
      "src/dictionaries/first-names.txt",
      "src/dictionaries/last-names.txt",
    ],
    PATTERN_EDGE_CASE: ["src/filters/"],
    CONTEXT_DEPENDENT: [
      "src/core/ParallelRedactionEngine.ts",
      "src/core/filters/PostFilterService.ts",
    ],
    PIPELINE_FILTERING: [
      "src/core/filters/PostFilterService.ts",
      "src/core/FieldLabelWhitelist.ts",
    ],
  },

  // Root cause to action mapping
  rootCauseActions: {
    OCR_CONFUSION: {
      action: "Add OCR normalization for confusable character pairs",
      details: [
        '"0" ↔ "O" (zero/letter O)',
        '"1" ↔ "l" ↔ "I" (one/lowercase L/capital I)',
        '"5" ↔ "S" (five/letter S)',
      ],
      expectedImprovement: "+1.5% to +2.5% sensitivity",
    },
    FORMAT_VARIATION: {
      action: "Extend regex patterns to handle additional formats",
      details: [
        "Check for missing delimiter patterns",
        "Add alternative separators (space, dot, slash)",
        "Handle with/without leading zeros",
      ],
      expectedImprovement: "+1% to +3% sensitivity",
    },
    DICTIONARY_MISS: {
      action: "Expand name dictionaries or enable fuzzy matching",
      details: [
        "Extract unique missed names from failure examples",
        "Validate they are real names (not false positives)",
        "Add to appropriate dictionary file",
      ],
      expectedImprovement: "+1% to +2% sensitivity",
    },
    PATTERN_EDGE_CASE: {
      action: "Add specific patterns for edge cases",
      details: [
        "Analyze failure examples for common characteristics",
        "Create targeted regex patterns",
        "Test each pattern independently",
      ],
      expectedImprovement: "+0.5% to +1% sensitivity",
    },
    CONTEXT_DEPENDENT: {
      action: "Implement context-aware detection rules",
      details: [
        "Check surrounding text for PHI indicators",
        "Add field label detection",
        "Consider document section context",
      ],
      expectedImprovement: "+1% to +3% sensitivity",
    },
    PIPELINE_FILTERING: {
      action: "Investigate why valid spans are being filtered",
      details: [
        "Enable span journey tracing: VULPES_TRACE_SPANS=1",
        "Check PostFilterService exclusion rules",
        "Review confidence thresholds",
      ],
      expectedImprovement: "+2% to +5% sensitivity",
    },
  },

  box: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
  },
};

// ============================================================================
// ACTION BLOCK FORMATTER CLASS
// ============================================================================

class ActionBlockFormatter {
  constructor(options = {}) {
    this.config = { ...ACTION_CONFIG, ...options };
  }

  /**
   * Format the primary "DO THIS NOW" action block
   */
  formatDoThisNow(testResults, calibration = {}) {
    const b = this.config.box;
    const width = 78;

    const topFailure =
      testResults.topFailure || this.extractTopFailure(testResults);
    const rootCause = topFailure?.rootCause || "PATTERN_EDGE_CASE";

    const steps = this.generateActionSteps(topFailure, rootCause, calibration);

    const lines = [];
    lines.push(b.topLeft + this.sectionHeader("DO THIS NOW", width));
    lines.push(b.vertical + " ".repeat(width) + b.vertical);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepNum = i + 1;

      // Main step line
      lines.push(
        b.vertical +
          this.padText(`  ${stepNum}. ${step.action}`, width) +
          b.vertical
      );

      // Details (indented)
      if (step.details) {
        for (const detail of step.details) {
          lines.push(
            b.vertical + this.padText(`     ${detail}`, width) + b.vertical
          );
        }
      }

      lines.push(b.vertical + " ".repeat(width) + b.vertical);
    }

    lines.push(b.bottomLeft + b.horizontal.repeat(width) + b.bottomRight);

    return lines.join("\n");
  }

  /**
   * Generate action steps based on root cause analysis
   */
  generateActionSteps(topFailure, rootCause, calibration) {
    const steps = [];

    // Step 1: READ - what file to examine
    const targetFiles = this.config.rootCauseFiles[rootCause] || [
      "src/filters/",
    ];
    const primaryFile = targetFiles[0];
    const lineRange = this.inferLineRange(rootCause, topFailure);

    steps.push({
      action: `READ: ${primaryFile}${lineRange ? `:${lineRange}` : ""}`,
      details: [`Focus on: ${this.getFocusArea(rootCause)}`],
    });

    // Step 2: FIX - what action to take
    const actionInfo = this.config.rootCauseActions[rootCause] || {
      action: "Investigate failure pattern",
      details: ["Analyze examples for common characteristics"],
    };

    steps.push({
      action: `FIX: ${actionInfo.action}`,
      details: actionInfo.details.slice(0, 3),
    });

    // Step 3: REFERENCE - additional resources if available
    if (targetFiles.length > 1) {
      steps.push({
        action: `REFERENCE: ${targetFiles.slice(1).join(", ")}`,
        details: ["Check for existing patterns that can be extended"],
      });
    }

    // Step 4: RUN - verification command
    steps.push({
      action: "RUN: npm run build && npm test",
      details: null,
    });

    // Step 5: EXPECTED - outcome prediction
    steps.push({
      action: `EXPECTED: ${actionInfo.expectedImprovement || "Improved metrics"}`,
      details: null,
    });

    return steps.slice(0, this.config.maxSteps);
  }

  /**
   * Extract top failure from results (fallback)
   */
  extractTopFailure(results) {
    const failures = results.failures || [];
    if (failures.length === 0) return null;

    const byType = {};
    for (const failure of failures) {
      const type = failure.phiType || failure.type || "UNKNOWN";
      byType[type] = byType[type] || { count: 0, examples: [] };
      byType[type].count++;
      if (byType[type].examples.length < 5) {
        byType[type].examples.push(failure);
      }
    }

    const sorted = Object.entries(byType).sort(
      (a, b) => b[1].count - a[1].count
    );
    const [type, data] = sorted[0] || ["UNKNOWN", { count: 0, examples: [] }];

    return {
      type,
      count: data.count,
      examples: data.examples,
      rootCause: this.inferRootCause(data.examples),
    };
  }

  /**
   * Infer root cause from failure examples
   */
  inferRootCause(examples) {
    if (!examples || examples.length === 0) return "PATTERN_EDGE_CASE";

    const hasOcrChars = examples.some((e) =>
      /[0O1lI5S]/.test(e.value || e.text || "")
    );
    if (hasOcrChars) return "OCR_CONFUSION";

    const hasFormatVariation = examples.some((e) =>
      /[.\-\s()\/]/.test(e.value || e.text || "")
    );
    if (hasFormatVariation) return "FORMAT_VARIATION";

    const hasHighErrorLevel = examples.some((e) =>
      ["high", "extreme"].includes(e.errorLevel)
    );
    if (hasHighErrorLevel) return "OCR_CONFUSION";

    return "PATTERN_EDGE_CASE";
  }

  /**
   * Infer line range based on root cause
   */
  inferLineRange(rootCause, topFailure) {
    const ranges = {
      OCR_CONFUSION: "450-520",
      FORMAT_VARIATION: "100-200",
      DICTIONARY_MISS: null,
      PATTERN_EDGE_CASE: null,
      CONTEXT_DEPENDENT: "300-400",
      PIPELINE_FILTERING: "200-300",
    };
    return ranges[rootCause] || null;
  }

  /**
   * Get focus area description
   */
  getFocusArea(rootCause) {
    const areas = {
      OCR_CONFUSION: "OCR tolerance patterns and character substitution logic",
      FORMAT_VARIATION: "Regex patterns and delimiter handling",
      DICTIONARY_MISS: "Dictionary entries and fuzzy matching settings",
      PATTERN_EDGE_CASE: "Edge case patterns and boundary conditions",
      CONTEXT_DEPENDENT: "Context detection and field label processing",
      PIPELINE_FILTERING: "Post-filter rules and span validation logic",
    };
    return areas[rootCause] || "Relevant detection patterns";
  }

  // ==========================================================================
  // FORMATTING HELPERS
  // ==========================================================================

  sectionHeader(title, width) {
    const b = this.config.box;
    const titlePart = ` ${title} `;
    const remaining = width - titlePart.length;
    return titlePart + b.horizontal.repeat(remaining) + b.topRight;
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
  ActionBlockFormatter,
  ACTION_CONFIG,
};
