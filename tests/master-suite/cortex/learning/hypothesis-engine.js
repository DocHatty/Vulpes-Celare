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
 * ║   HYPOTHESIS ENGINE                                                           ║
 * ║   Forms, Tests, and Validates Improvement Hypotheses                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This is the SCIENTIFIC METHOD for PHI detection improvement:
 *
 * 1. OBSERVE  - Pattern recognizer identifies failure patterns
 * 2. FORM     - Generate hypothesis: "Adding X will fix Y"
 * 3. PREDICT  - Expected outcome: "SSN detection will improve by Z%"
 * 4. TEST     - Run experiment with change
 * 5. ANALYZE  - Compare results to prediction
 * 6. CONCLUDE - Validate or invalidate hypothesis
 *
 * HYPOTHESIS LIFECYCLE:
 * ─────────────────────────────────────────────────────────────────────────────────
 * PROPOSED    → Hypothesis created, awaiting testing
 * TESTING     → Experiment in progress
 * VALIDATED   → Results matched prediction (within tolerance)
 * INVALIDATED → Results did not match prediction
 * PARTIALLY   → Some improvement, but not as expected
 * ABANDONED   → Testing blocked or hypothesis superseded
 *
 * The engine tracks ALL hypotheses and their outcomes to build institutional
 * knowledge about what works and what doesn't for this codebase.
 */

const fs = require("fs");
const path = require("path");
const { PATHS } = require("../core/config");

// ============================================================================
// HYPOTHESIS TYPES
// ============================================================================

const HYPOTHESIS_TYPES = {
  // Pattern-based hypotheses
  ADD_PATTERN: {
    template: "Adding {pattern} to {filter} will improve {phiType} detection",
    requiredFields: ["pattern", "filter", "phiType"],
    category: "FILTER_ENHANCEMENT",
  },
  EXTEND_PATTERN: {
    template:
      "Extending {filter} pattern to handle {variant} will catch {count} more cases",
    requiredFields: ["filter", "variant", "count"],
    category: "FILTER_ENHANCEMENT",
  },

  // Dictionary-based hypotheses
  ADD_DICTIONARY_ENTRY: {
    template:
      'Adding "{entry}" to {dictionary} will catch {count} missed {phiType} cases',
    requiredFields: ["entry", "dictionary", "count", "phiType"],
    category: "DICTIONARY_ENHANCEMENT",
  },
  ENABLE_FUZZY_DICTIONARY: {
    template:
      "Enabling fuzzy matching on {dictionary} will improve {phiType} detection by {percentage}%",
    requiredFields: ["dictionary", "phiType", "percentage"],
    category: "DICTIONARY_ENHANCEMENT",
  },

  // Configuration hypotheses
  ADJUST_THRESHOLD: {
    template:
      "Adjusting {parameter} from {oldValue} to {newValue} will improve {metric} by {improvement}%",
    requiredFields: [
      "parameter",
      "oldValue",
      "newValue",
      "metric",
      "improvement",
    ],
    category: "CONFIGURATION",
  },
  ENABLE_FEATURE: {
    template: "Enabling {feature} will reduce {failureType} by {reduction}%",
    requiredFields: ["feature", "failureType", "reduction"],
    category: "CONFIGURATION",
  },

  // Context hypotheses
  ADD_CONTEXT_RULE: {
    template:
      'Adding context rule for "{context}" will improve {phiType} precision by {improvement}%',
    requiredFields: ["context", "phiType", "improvement"],
    category: "CONTEXT_ENHANCEMENT",
  },

  // OCR hypotheses
  ADD_OCR_SUBSTITUTION: {
    template:
      "Adding OCR substitution {from}→{to} will catch {count} more cases",
    requiredFields: ["from", "to", "count"],
    category: "OCR_TOLERANCE",
  },

  // General improvement
  GENERAL_IMPROVEMENT: {
    template: "{action} will improve {metric} by approximately {estimate}%",
    requiredFields: ["action", "metric", "estimate"],
    category: "GENERAL",
  },
};

// ============================================================================
// HYPOTHESIS ENGINE CLASS
// ============================================================================

class HypothesisEngine {
  constructor(knowledgeBase = null) {
    this.kb = knowledgeBase;
    this.storagePath = path.join(PATHS.knowledge, "hypotheses.json");
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      }
    } catch (e) {
      console.warn("HypothesisEngine: Starting with empty hypothesis database");
    }
    return {
      hypotheses: [],
      validated: [],
      invalidated: [],
      stats: {
        totalProposed: 0,
        totalValidated: 0,
        totalInvalidated: 0,
        accuracyRate: 0,
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
  // HYPOTHESIS CREATION
  // ==========================================================================

  /**
   * Create a new hypothesis from pattern analysis
   * @param {string} type - Hypothesis type from HYPOTHESIS_TYPES
   * @param {Object} params - Parameters for the hypothesis
   * @param {Object} evidence - Supporting evidence (patterns, metrics)
   * @returns {Object} - The created hypothesis
   */
  createHypothesis(type, params, evidence = {}) {
    const typeInfo = HYPOTHESIS_TYPES[type];
    if (!typeInfo) {
      throw new Error(`Unknown hypothesis type: ${type}`);
    }

    // Validate required fields
    for (const field of typeInfo.requiredFields) {
      if (params[field] === undefined) {
        throw new Error(
          `Missing required field: ${field} for hypothesis type ${type}`,
        );
      }
    }

    const hypothesis = {
      id: `HYP-${Date.now()}-${random().toString(36).substr(2, 9)}`,
      type,
      category: typeInfo.category,
      status: "PROPOSED",

      // Description from template
      description: this.formatTemplate(typeInfo.template, params),
      params,

      // Predictions
      predictions: {
        primaryMetric: params.metric || "sensitivity",
        expectedChange:
          params.improvement || params.estimate || params.reduction || 0,
        tolerance: 0.2, // 20% tolerance for validation
        direction: "INCREASE", // or 'DECREASE' for error rates
      },

      // Evidence and reasoning
      evidence: {
        patterns: evidence.patterns || [],
        metrics: evidence.metrics || {},
        reasoning: evidence.reasoning || "Generated from pattern analysis",
      },

      // Timeline
      timeline: {
        proposed: new Date().toISOString(),
        testStarted: null,
        completed: null,
      },

      // Results (filled in after testing)
      results: null,

      // Confidence in this hypothesis
      confidence: this.calculateInitialConfidence(type, params, evidence),
    };

    // Store in knowledge base if available
    if (this.kb) {
      this.kb.createEntity("Hypothesis", hypothesis);
    }

    // Add to local storage
    this.data.hypotheses.push(hypothesis);
    this.data.stats.totalProposed++;
    this.saveData();

    return hypothesis;
  }

  formatTemplate(template, params) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  calculateInitialConfidence(type, params, evidence) {
    let confidence = 0.5; // Base confidence

    // More evidence increases confidence
    if (evidence.patterns && evidence.patterns.length > 0) {
      confidence += 0.1 * Math.min(evidence.patterns.length / 5, 1);
    }

    // Historical success of this type increases confidence
    const typeHistory = this.getHypothesisHistory(type);
    if (typeHistory.total > 0) {
      confidence += 0.2 * typeHistory.successRate;
    }

    // Specific types have different base confidence
    const typeConfidence = {
      ADD_DICTIONARY_ENTRY: 0.7, // Usually works
      ADD_OCR_SUBSTITUTION: 0.75, // Usually works
      ADD_PATTERN: 0.6, // Moderate confidence
      ADJUST_THRESHOLD: 0.5, // Can go either way
      ENABLE_FEATURE: 0.55, // Moderate
      GENERAL_IMPROVEMENT: 0.4, // Low without specifics
    };

    if (typeConfidence[type]) {
      confidence = (confidence + typeConfidence[type]) / 2;
    }

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  // ==========================================================================
  // HYPOTHESIS GENERATION FROM PATTERNS
  // ==========================================================================

  /**
   * Automatically generate hypotheses from pattern analysis
   * @param {Object} patternAnalysis - Output from PatternRecognizer
   * @returns {Array} - Generated hypotheses
   */
  generateFromPatterns(patternAnalysis) {
    const hypotheses = [];

    // Group failure patterns by category
    const byCategory = {};
    for (const pattern of patternAnalysis.failurePatterns || []) {
      if (!byCategory[pattern.category]) {
        byCategory[pattern.category] = [];
      }
      byCategory[pattern.category].push(pattern);
    }

    // Generate hypotheses for each category
    for (const [category, patterns] of Object.entries(byCategory)) {
      const generated = this.generateForCategory(category, patterns);
      hypotheses.push(...generated);
    }

    // Limit to top hypotheses by confidence
    hypotheses.sort((a, b) => b.confidence - a.confidence);
    return hypotheses.slice(0, 10); // Top 10
  }

  generateForCategory(category, patterns) {
    const hypotheses = [];
    const uniquePhiTypes = [...new Set(patterns.map((p) => p.phiType))];

    switch (category) {
      case "OCR_CONFUSION":
        // Generate OCR substitution hypothesis
        const ocrChars = this.extractOCRCharacters(patterns);
        for (const { from, to, count } of ocrChars) {
          hypotheses.push(
            this.createHypothesis(
              "ADD_OCR_SUBSTITUTION",
              {
                from,
                to,
                count,
              },
              {
                patterns: patterns.slice(0, 5),
                reasoning: `Found ${count} cases with ${from}→${to} confusion`,
              },
            ),
          );
        }
        break;

      case "DICTIONARY_MISS":
        // Generate dictionary entry hypothesis
        const missedEntries = patterns.map((p) => p.original).filter(Boolean);
        const uniqueEntries = [...new Set(missedEntries)].slice(0, 5);

        for (const phiType of uniquePhiTypes) {
          const count = patterns.filter((p) => p.phiType === phiType).length;
          hypotheses.push(
            this.createHypothesis(
              "ADD_DICTIONARY_ENTRY",
              {
                entry: uniqueEntries.join(", "),
                dictionary: this.getDictionaryForType(phiType),
                count,
                phiType,
              },
              {
                patterns: patterns
                  .filter((p) => p.phiType === phiType)
                  .slice(0, 5),
                reasoning: `${count} ${phiType} values not found in dictionary`,
              },
            ),
          );
        }
        break;

      case "FORMAT_VARIATION":
        // Generate pattern extension hypothesis
        for (const phiType of uniquePhiTypes) {
          const typePatterns = patterns.filter((p) => p.phiType === phiType);
          const formats = typePatterns.flatMap(
            (p) => p.details?.detected_formats || [],
          );
          const uniqueFormats = [...new Set(formats)];

          hypotheses.push(
            this.createHypothesis(
              "EXTEND_PATTERN",
              {
                filter: this.getFilterForType(phiType),
                variant: uniqueFormats.join(", "),
                count: typePatterns.length,
              },
              {
                patterns: typePatterns.slice(0, 5),
                reasoning: `Found ${typePatterns.length} cases with format variations`,
              },
            ),
          );
        }
        break;

      case "CASE_VARIATION":
        // Generate case-insensitive hypothesis
        for (const phiType of uniquePhiTypes) {
          const count = patterns.filter((p) => p.phiType === phiType).length;
          hypotheses.push(
            this.createHypothesis(
              "ENABLE_FEATURE",
              {
                feature: `case-insensitive matching for ${phiType}`,
                failureType: "case variation misses",
                reduction: Math.min(count * 2, 30), // Estimate
              },
              {
                patterns: patterns
                  .filter((p) => p.phiType === phiType)
                  .slice(0, 5),
                reasoning: `${count} missed due to case variation`,
              },
            ),
          );
        }
        break;

      case "CONTEXT_DEPENDENT":
        // Generate context rule hypothesis
        for (const phiType of uniquePhiTypes) {
          const typePatterns = patterns.filter((p) => p.phiType === phiType);
          hypotheses.push(
            this.createHypothesis(
              "ADD_CONTEXT_RULE",
              {
                context: this.extractContextPattern(typePatterns),
                phiType,
                improvement: Math.min(typePatterns.length, 15),
              },
              {
                patterns: typePatterns.slice(0, 5),
                reasoning: "Values require context for identification",
              },
            ),
          );
        }
        break;

      default:
        // General improvement hypothesis
        hypotheses.push(
          this.createHypothesis(
            "GENERAL_IMPROVEMENT",
            {
              action: `Address ${category.toLowerCase().replace(/_/g, " ")} issues`,
              metric: "sensitivity",
              estimate: Math.min(patterns.length, 10),
            },
            {
              patterns: patterns.slice(0, 5),
              reasoning: `${patterns.length} failures in category ${category}`,
            },
          ),
        );
    }

    return hypotheses;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  extractOCRCharacters(patterns) {
    const counts = {};
    const ocrPairs = [
      ["0", "O"],
      ["1", "l"],
      ["1", "I"],
      ["5", "S"],
      ["8", "B"],
    ];

    for (const pattern of patterns) {
      if (pattern.details?.length > 0) {
        for (const sub of pattern.details) {
          const key = `${sub.char}→${sub.possibleOCR}`;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }

    return Object.entries(counts)
      .map(([key, count]) => {
        const [from, to] = key.split("→");
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count);
  }

  getDictionaryForType(phiType) {
    const map = {
      NAME: "first-names.txt + surnames.txt",
      FIRST_NAME: "first-names.txt",
      LAST_NAME: "surnames.txt",
      HOSPITAL: "hospitals.txt",
      CITY: "cities.txt",
      STREET: "streets.txt",
    };
    return map[phiType] || "appropriate dictionary";
  }

  getFilterForType(phiType) {
    return `${phiType.charAt(0)}${phiType.slice(1).toLowerCase()}Filter`;
  }

  extractContextPattern(patterns) {
    // Try to identify common context patterns
    const contexts = patterns
      .map((p) => p.context?.surroundingText)
      .filter(Boolean);

    if (contexts.length === 0) return "field-based context";

    // Look for common prefixes
    const prefixes = ["Patient:", "Name:", "DOB:", "MRN:", "Age:", "Phone:"];
    for (const prefix of prefixes) {
      if (contexts.some((c) => c.includes(prefix))) {
        return prefix;
      }
    }

    return "contextual patterns";
  }

  // ==========================================================================
  // HYPOTHESIS TESTING
  // ==========================================================================

  /**
   * Mark a hypothesis as being tested
   */
  startTesting(hypothesisId) {
    const hypothesis = this.getHypothesis(hypothesisId);
    if (!hypothesis) throw new Error(`Hypothesis not found: ${hypothesisId}`);

    hypothesis.status = "TESTING";
    hypothesis.timeline.testStarted = new Date().toISOString();
    this.saveData();

    return hypothesis;
  }

  /**
   * Record test results for a hypothesis
   * @param {string} hypothesisId
   * @param {Object} results - { actualChange, metrics, notes }
   */
  recordResults(hypothesisId, results) {
    const hypothesis = this.getHypothesis(hypothesisId);
    if (!hypothesis) throw new Error(`Hypothesis not found: ${hypothesisId}`);

    hypothesis.results = {
      actualChange: results.actualChange,
      metrics: results.metrics || {},
      notes: results.notes || "",
      recordedAt: new Date().toISOString(),
    };

    // Validate hypothesis
    const validation = this.validateHypothesis(hypothesis);
    hypothesis.status = validation.status;
    hypothesis.validation = validation;
    hypothesis.timeline.completed = new Date().toISOString();

    // Update statistics
    if (validation.status === "VALIDATED") {
      this.data.validated.push(hypothesis.id);
      this.data.stats.totalValidated++;
    } else if (validation.status === "INVALIDATED") {
      this.data.invalidated.push(hypothesis.id);
      this.data.stats.totalInvalidated++;
    }

    // Update accuracy rate
    const total =
      this.data.stats.totalValidated + this.data.stats.totalInvalidated;
    if (total > 0) {
      this.data.stats.accuracyRate = this.data.stats.totalValidated / total;
    }

    // Record in knowledge base
    if (this.kb && validation.status !== "TESTING") {
      const relation =
        validation.status === "VALIDATED" ? "validated" : "invalidated";
      // Create test run entity and link to hypothesis
    }

    this.saveData();
    return hypothesis;
  }

  validateHypothesis(hypothesis) {
    const predicted = hypothesis.predictions.expectedChange;
    const actual = hypothesis.results?.actualChange || 0;
    const tolerance = hypothesis.predictions.tolerance;

    const lowerBound = predicted * (1 - tolerance);
    const upperBound = predicted * (1 + tolerance);

    // Handle direction
    const improved =
      hypothesis.predictions.direction === "INCREASE" ? actual > 0 : actual < 0;

    let status;
    let explanation;

    if (actual >= lowerBound && actual <= upperBound) {
      status = "VALIDATED";
      explanation = `Results (${actual.toFixed(2)}%) within expected range (${lowerBound.toFixed(2)}-${upperBound.toFixed(2)}%)`;
    } else if (improved && Math.abs(actual) >= Math.abs(predicted) * 0.5) {
      status = "PARTIALLY_VALIDATED";
      explanation = `Improvement observed (${actual.toFixed(2)}%) but below expected (${predicted.toFixed(2)}%)`;
    } else if (!improved || actual === 0) {
      status = "INVALIDATED";
      explanation = `No improvement observed (${actual.toFixed(2)}%), expected ${predicted.toFixed(2)}%`;
    } else {
      status = "INVALIDATED";
      explanation = `Results (${actual.toFixed(2)}%) outside expected range`;
    }

    return {
      status,
      explanation,
      predicted,
      actual,
      deviation: actual - predicted,
    };
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  getHypothesis(id) {
    return this.data.hypotheses.find((h) => h.id === id);
  }

  getHypothesesByStatus(status) {
    return this.data.hypotheses.filter((h) => h.status === status);
  }

  getHypothesisByType(type) {
    return this.data.hypotheses.filter((h) => h.type === type);
  }

  getHypothesisHistory(type) {
    const ofType = this.data.hypotheses.filter((h) => h.type === type);
    const validated = ofType.filter((h) => h.status === "VALIDATED").length;
    const completed = ofType.filter((h) =>
      ["VALIDATED", "INVALIDATED", "PARTIALLY_VALIDATED"].includes(h.status),
    ).length;

    return {
      total: ofType.length,
      validated,
      completed,
      successRate: completed > 0 ? validated / completed : 0,
    };
  }

  /**
   * Get active (proposed or testing) hypotheses
   */
  getActiveHypotheses() {
    return this.data.hypotheses.filter((h) =>
      ["PROPOSED", "TESTING"].includes(h.status),
    );
  }

  /**
   * Get validated hypotheses (for applying proven fixes)
   */
  getValidatedHypotheses() {
    return this.data.hypotheses.filter((h) =>
      ["VALIDATED", "PARTIALLY_VALIDATED"].includes(h.status),
    );
  }

  /**
   * Get top hypotheses to test next
   */
  getRecommendedToTest(limit = 5) {
    return this.data.hypotheses
      .filter((h) => h.status === "PROPOSED")
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  /**
   * Export for LLM context
   */
  exportForLLM() {
    return {
      stats: this.data.stats,
      active: this.getActiveHypotheses().map((h) => ({
        id: h.id,
        description: h.description,
        status: h.status,
        confidence: h.confidence,
      })),
      recentValidated: this.getValidatedHypotheses()
        .slice(-5)
        .map((h) => ({
          description: h.description,
          actualImprovement: h.results?.actualChange,
        })),
      recommendedToTest: this.getRecommendedToTest(3).map((h) => ({
        id: h.id,
        description: h.description,
        confidence: h.confidence,
      })),
    };
  }

  /**
   * Check if a similar hypothesis already exists
   */
  hasSimilarHypothesis(type, params) {
    return this.data.hypotheses.some((h) => {
      if (h.type !== type) return false;

      // Check key parameters match
      const keys = Object.keys(params);
      const matchCount = keys.filter((k) => h.params[k] === params[k]).length;
      return matchCount >= keys.length * 0.7; // 70% match
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  HypothesisEngine,
  HYPOTHESIS_TYPES,
};
