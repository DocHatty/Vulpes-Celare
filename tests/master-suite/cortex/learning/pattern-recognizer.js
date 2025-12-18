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
 * ║   PATTERN RECOGNIZER                                                          ║
 * ║   Identifies WHY Things Fail or Succeed                                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module answers the CRITICAL question: "WHY did this happen?"
 *
 * FAILURE PATTERN CATEGORIES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * OCR_CONFUSION      - Character substitutions (0/O, 1/l/I, 5/S)
 * CASE_VARIATION     - Case differences (JOHN vs john vs John)
 * FORMAT_VARIATION   - Different formats (555-1234 vs 5551234 vs 555.1234)
 * CONTEXT_DEPENDENT  - Needs surrounding context to identify
 * DICTIONARY_MISS    - Name/term not in dictionary
 * PATTERN_EDGE_CASE  - Regex doesn't cover this variant
 * OVERLAP_CONFLICT   - Multiple PHI types competing for same span
 * FALSE_POSITIVE     - Incorrectly flagged as PHI
 * BOUNDARY_ERROR     - Partial match (caught "John" but missed "John Smith")
 *
 * SUCCESS PATTERN CATEGORIES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * EXACT_MATCH        - Direct pattern/dictionary hit
 * FUZZY_MATCH        - Matched despite minor variations
 * CONTEXT_BOOST      - Context helped identify
 * ENSEMBLE_AGREE     - Multiple filters agreed
 *
 * The system learns from both failures AND successes to build a model of
 * what works and what doesn't for this specific codebase.
 */

const fs = require("fs");
const path = require("path");
const { PATHS, PATTERN_ARCHETYPES } = require("../core/config");

// ============================================================================
// PATTERN CATEGORIES
// ============================================================================

const FAILURE_PATTERNS = {
  OCR_CONFUSION: {
    name: "OCR Character Confusion",
    description: "Characters that commonly get confused in OCR output",
    examples: ["0 vs O", "1 vs l vs I", "5 vs S", "8 vs B"],
    indicators: ["similar_char_diff", "ocr_substitution"],
    remediation: "Add OCR-tolerant patterns or fuzzy matching",
  },
  CASE_VARIATION: {
    name: "Case Variation",
    description: "Same text in different cases",
    examples: ["SMITH vs Smith vs smith"],
    indicators: ["case_diff_only"],
    remediation: "Enable case-insensitive matching",
  },
  FORMAT_VARIATION: {
    name: "Format Variation",
    description: "Same data in different formats",
    examples: ["555-123-4567 vs (555) 123-4567 vs 5551234567"],
    indicators: ["same_digits_diff_format", "punctuation_diff"],
    remediation: "Normalize input or add format variants to patterns",
  },
  CONTEXT_DEPENDENT: {
    name: "Context Dependent",
    description: "Requires surrounding text to identify",
    examples: ["Age: 45", "Patient John arrived", "MRN: 12345"],
    indicators: ["common_word", "ambiguous_without_context"],
    remediation: "Add context-aware rules or field detection",
  },
  DICTIONARY_MISS: {
    name: "Dictionary Miss",
    description: "Term not present in lookup dictionaries",
    examples: ['Unusual name "Zephyr"', 'New hospital "MedCenter Plus"'],
    indicators: ["not_in_dictionary", "rare_term"],
    remediation: "Add to dictionary or use fuzzy dictionary matching",
  },
  PATTERN_EDGE_CASE: {
    name: "Pattern Edge Case",
    description: "Valid PHI format not covered by regex patterns",
    examples: ["International phone format", "Unusual SSN format"],
    indicators: ["valid_format_not_matched", "pattern_too_strict"],
    remediation: "Extend regex patterns to cover edge cases",
  },
  OVERLAP_CONFLICT: {
    name: "Overlap Conflict",
    description: "Multiple filters claiming same text span",
    examples: ["123-45-6789 matched as SSN and phone"],
    indicators: ["multiple_matches_same_span", "type_confusion"],
    remediation: "Improve disambiguation rules or confidence scoring",
  },
  FALSE_POSITIVE: {
    name: "False Positive",
    description: "Incorrectly identified as PHI",
    examples: ['Word "Main" matched as name', 'Code "12345" matched as MRN'],
    indicators: ["common_word_flagged", "over_matching"],
    remediation: "Add exclusion rules or improve specificity",
  },
  BOUNDARY_ERROR: {
    name: "Boundary Error",
    description: "Captured partial or extended text",
    examples: ['Matched "John" but missed "John Smith Jr."'],
    indicators: ["partial_match", "extended_match"],
    remediation: "Improve boundary detection or add compound patterns",
  },
  WHITESPACE_ARTIFACT: {
    name: "Whitespace Artifact",
    description: "Issues with spacing or line breaks",
    examples: ["J o h n", "John\\nSmith"],
    indicators: ["split_by_whitespace", "unexpected_newline"],
    remediation: "Normalize whitespace before matching",
  },
};

const SUCCESS_PATTERNS = {
  EXACT_MATCH: {
    name: "Exact Match",
    description: "Direct hit from pattern or dictionary",
    value: "High confidence, reliable",
  },
  FUZZY_MATCH: {
    name: "Fuzzy Match",
    description: "Matched despite minor variations",
    value: "Robust to OCR/typos",
  },
  CONTEXT_BOOST: {
    name: "Context Boost",
    description: "Context helped confirm identification",
    value: "Reduces false positives",
  },
  ENSEMBLE_AGREE: {
    name: "Ensemble Agreement",
    description: "Multiple detection methods agreed",
    value: "High confidence",
  },
};

// ============================================================================
// PATTERN RECOGNIZER CLASS
// ============================================================================

class PatternRecognizer {
  constructor(knowledgeBase = null) {
    this.kb = knowledgeBase;
    this.storagePath = path.join(PATHS.knowledge, "patterns.json");
    this.patterns = this.loadPatterns();

    // Statistics
    this.stats = {
      analyzed: 0,
      patternsIdentified: 0,
      byCategory: {},
    };
  }

  loadPatterns() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      }
    } catch (e) {
      console.warn("PatternRecognizer: Starting with empty pattern database");
    }
    return {
      failures: [],
      successes: [],
      aggregated: {},
      lastUpdated: null,
    };
  }

  savePatterns() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.patterns.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.storagePath, JSON.stringify(this.patterns, null, 2));
  }

  // ==========================================================================
  // MAIN ANALYSIS ENTRY POINT
  // ==========================================================================

  /**
   * Analyze a test result to identify patterns
   * @param {Object} testResult - Result from a test run
   * @returns {Object} - Identified patterns
   */
  analyzeTestResult(testResult) {
    const analysis = {
      timestamp: new Date().toISOString(),
      testId: testResult.id || `TEST-${Date.now()}`,
      failurePatterns: [],
      successPatterns: [],
      recommendations: [],
    };

    // Analyze false negatives (missed PHI)
    if (testResult.falseNegatives && testResult.falseNegatives.length > 0) {
      for (const fn of testResult.falseNegatives) {
        const pattern = this.classifyFalseNegative(fn, testResult);
        if (pattern) {
          analysis.failurePatterns.push(pattern);
          this.recordPattern("failure", pattern);
        }
      }
    }

    // Analyze false positives (over-detection)
    if (testResult.falsePositives && testResult.falsePositives.length > 0) {
      for (const fp of testResult.falsePositives) {
        const pattern = this.classifyFalsePositive(fp, testResult);
        if (pattern) {
          analysis.failurePatterns.push(pattern);
          this.recordPattern("failure", pattern);
        }
      }
    }

    // Analyze true positives for success patterns
    if (testResult.truePositives && testResult.truePositives.length > 0) {
      for (const tp of testResult.truePositives) {
        const pattern = this.classifyTruePositive(tp, testResult);
        if (pattern) {
          analysis.successPatterns.push(pattern);
          this.recordPattern("success", pattern);
        }
      }
    }

    // Generate recommendations based on patterns
    analysis.recommendations = this.generateRecommendations(analysis);

    // Update stats
    this.stats.analyzed++;
    this.stats.patternsIdentified +=
      analysis.failurePatterns.length + analysis.successPatterns.length;

    this.savePatterns();

    return analysis;
  }

  // ==========================================================================
  // FALSE NEGATIVE CLASSIFICATION (Missed PHI)
  // ==========================================================================

  classifyFalseNegative(missedPhi, context) {
    const pattern = {
      type: "FALSE_NEGATIVE",
      category: "UNKNOWN",
      phiType: missedPhi.type || missedPhi.phiType || "UNKNOWN",
      original: missedPhi.original || missedPhi.text,
      expected: missedPhi.expected,
      context: this.extractContext(missedPhi, context),
      indicators: [],
      confidence: 0.5,
      timestamp: new Date().toISOString(),
    };

    // Check for OCR confusion patterns
    if (this.hasOCRConfusion(pattern.original)) {
      pattern.category = "OCR_CONFUSION";
      pattern.indicators.push("ocr_character_confusion");
      pattern.confidence = 0.85;
      pattern.details = this.identifyOCRSubstitutions(pattern.original);
    }
    // Check for case variation
    else if (this.hasCaseVariation(pattern.original, pattern.expected)) {
      pattern.category = "CASE_VARIATION";
      pattern.indicators.push("case_mismatch");
      pattern.confidence = 0.9;
    }
    // Check for format variation
    else if (this.hasFormatVariation(pattern.original, pattern.expected)) {
      pattern.category = "FORMAT_VARIATION";
      pattern.indicators.push("format_difference");
      pattern.confidence = 0.85;
      pattern.details = {
        detected_formats: this.identifyFormats(pattern.original),
      };
    }
    // Check for whitespace issues
    else if (this.hasWhitespaceIssue(pattern.original)) {
      pattern.category = "WHITESPACE_ARTIFACT";
      pattern.indicators.push("whitespace_anomaly");
      pattern.confidence = 0.8;
    }
    // Check for boundary errors
    else if (this.hasBoundaryIssue(pattern.original, context)) {
      pattern.category = "BOUNDARY_ERROR";
      pattern.indicators.push("boundary_mismatch");
      pattern.confidence = 0.75;
    }
    // Check for dictionary miss (names)
    else if (
      ["NAME", "FIRST_NAME", "LAST_NAME", "FULL_NAME"].includes(pattern.phiType)
    ) {
      if (!this.isInDictionary(pattern.original)) {
        pattern.category = "DICTIONARY_MISS";
        pattern.indicators.push("not_in_dictionary");
        pattern.confidence = 0.7;
      } else {
        pattern.category = "PATTERN_EDGE_CASE";
        pattern.indicators.push("dictionary_present_but_not_matched");
        pattern.confidence = 0.6;
      }
    }
    // Check for context-dependent patterns
    else if (this.isContextDependent(pattern.phiType, pattern.original)) {
      pattern.category = "CONTEXT_DEPENDENT";
      pattern.indicators.push("needs_context");
      pattern.confidence = 0.7;
    }
    // Default to pattern edge case
    else {
      pattern.category = "PATTERN_EDGE_CASE";
      pattern.indicators.push("unmatched_pattern");
      pattern.confidence = 0.5;
    }

    // Add remediation suggestion
    pattern.remediation =
      FAILURE_PATTERNS[pattern.category]?.remediation ||
      "Review pattern coverage";

    return pattern;
  }

  // ==========================================================================
  // FALSE POSITIVE CLASSIFICATION (Over-detection)
  // ==========================================================================

  classifyFalsePositive(falseHit, context) {
    const pattern = {
      type: "FALSE_POSITIVE",
      category: "FALSE_POSITIVE",
      phiType: falseHit.type || falseHit.phiType || "UNKNOWN",
      detected: falseHit.detected || falseHit.text,
      context: this.extractContext(falseHit, context),
      indicators: [],
      confidence: 0.7,
      timestamp: new Date().toISOString(),
    };

    // Analyze why this was incorrectly flagged
    const text = pattern.detected;

    // Common word flagged as name
    if (this.isCommonWord(text)) {
      pattern.indicators.push("common_word");
      pattern.details = { reason: "Text is a common English word" };
    }

    // Number pattern too broad
    if (/^\d+$/.test(text) && text.length < 6) {
      pattern.indicators.push("short_number_pattern");
      pattern.details = { reason: "Short numeric string is ambiguous" };
    }

    // Overlap with code or identifier
    if (this.looksLikeCode(text)) {
      pattern.indicators.push("code_like_pattern");
      pattern.details = { reason: "Appears to be a code or identifier" };
    }

    pattern.remediation =
      "Add to exclusion list or improve pattern specificity";

    return pattern;
  }

  // ==========================================================================
  // TRUE POSITIVE CLASSIFICATION (Successful Detection)
  // ==========================================================================

  classifyTruePositive(hit, context) {
    const pattern = {
      type: "TRUE_POSITIVE",
      category: "EXACT_MATCH",
      phiType: hit.type || hit.phiType || "UNKNOWN",
      detected: hit.detected || hit.text,
      confidence: hit.confidence || 0.9,
      indicators: [],
      timestamp: new Date().toISOString(),
    };

    // Determine success category
    if (hit.matchType === "fuzzy" || hit.fuzzyMatch) {
      pattern.category = "FUZZY_MATCH";
      pattern.indicators.push("fuzzy_matching_used");
    } else if (hit.contextBoost || hit.contextUsed) {
      pattern.category = "CONTEXT_BOOST";
      pattern.indicators.push("context_enhanced");
    } else if (hit.multipleFilters || hit.ensembleMatch) {
      pattern.category = "ENSEMBLE_AGREE";
      pattern.indicators.push("multiple_filters_agreed");
    } else {
      pattern.category = "EXACT_MATCH";
      pattern.indicators.push("direct_pattern_hit");
    }

    return pattern;
  }

  // ==========================================================================
  // PATTERN DETECTION HELPERS
  // ==========================================================================

  hasOCRConfusion(text) {
    if (!text || typeof text !== "string") return false;

    // Common OCR confusion pairs
    const confusionPairs = [
      ["0", "O"],
      ["1", "l"],
      ["1", "I"],
      ["5", "S"],
      ["8", "B"],
      ["2", "Z"],
      ["6", "G"],
      ["9", "g"],
      ["m", "rn"],
      ["cl", "d"],
    ];

    for (const [a, b] of confusionPairs) {
      if (text.includes(a) || text.includes(b)) {
        // Would need expected value to confirm, but presence indicates possibility
        return true;
      }
    }
    return false;
  }

  identifyOCRSubstitutions(text) {
    if (!text || typeof text !== "string") return [];

    const substitutions = [];
    const ocrMap = {
      0: "O",
      O: "0",
      1: "l/I",
      l: "1/I",
      I: "1/l",
      5: "S",
      S: "5",
      8: "B",
      B: "8",
    };

    for (const char of text) {
      if (ocrMap[char]) {
        substitutions.push({ char, possibleOCR: ocrMap[char] });
      }
    }
    return substitutions;
  }

  hasCaseVariation(original, expected) {
    if (
      !original ||
      !expected ||
      typeof original !== "string" ||
      typeof expected !== "string"
    )
      return false;
    return (
      original.toLowerCase() === expected.toLowerCase() && original !== expected
    );
  }

  hasFormatVariation(original, expected) {
    if (
      !original ||
      !expected ||
      typeof original !== "string" ||
      typeof expected !== "string"
    )
      return false;
    // Remove non-alphanumeric and compare
    const normalizeForCompare = (s) => s.replace(/[^a-zA-Z0-9]/g, "");
    return (
      normalizeForCompare(original) === normalizeForCompare(expected) &&
      original !== expected
    );
  }

  identifyFormats(text) {
    if (!text || typeof text !== "string") return [];

    const formats = [];
    if (/\d{3}-\d{3}-\d{4}/.test(text)) formats.push("XXX-XXX-XXXX");
    if (/\(\d{3}\)\s*\d{3}-\d{4}/.test(text)) formats.push("(XXX) XXX-XXXX");
    if (/\d{10}/.test(text)) formats.push("XXXXXXXXXX");
    if (/\d{3}\.\d{3}\.\d{4}/.test(text)) formats.push("XXX.XXX.XXXX");
    if (/\d{3}\s+\d{3}\s+\d{4}/.test(text)) formats.push("XXX XXX XXXX");
    return formats;
  }

  hasWhitespaceIssue(text) {
    if (!text || typeof text !== "string") return false;

    // Check for unusual whitespace
    return (
      /\s{2,}/.test(text) || // Multiple spaces
      /\n/.test(text) || // Newlines
      /^\s|\s$/.test(text) || // Leading/trailing
      /\w\s\w\s\w/.test(text)
    ); // Spaced out characters
  }

  hasBoundaryIssue(text, context) {
    if (!text || typeof text !== "string") return false;

    // Check if text appears to be partial
    if (
      context &&
      context.surroundingText &&
      typeof context.surroundingText === "string"
    ) {
      const surrounding = context.surroundingText.toLowerCase();
      const textLower = text.toLowerCase();

      // Check if there's more text adjacent
      const index = surrounding.indexOf(textLower);
      if (index !== -1) {
        const before = surrounding.charAt(index - 1);
        const after = surrounding.charAt(index + text.length);
        if (/\w/.test(before) || /\w/.test(after)) {
          return true;
        }
      }
    }
    return false;
  }

  isInDictionary(text) {
    if (!text || typeof text !== "string") return false;

    if (!this._dictionaryCache) {
      this._dictionaryCache = new Map();
    }

    const normalized = text.trim().toLowerCase();
    if (this._dictionaryCache.has(normalized)) {
      return this._dictionaryCache.get(normalized);
    }

    let NameDictionary;
    try {
      // Use compiled dictionaries to avoid TS transpilation at runtime
      ({ NameDictionary } = require("../../../../dist/dictionaries/NameDictionary"));
    } catch (e) {
      // Fall back gracefully if dist isn't built
      this._dictionaryCache.set(normalized, false);
      return false;
    }

    // Attempt to short-circuit with phrase-level confidence
    const words = normalized.split(/\s+/).filter(Boolean);
    let inDict = false;

    if (words.length >= 2) {
      const phrase = words.join(" ");
      try {
        inDict = NameDictionary.isLikelyRealName(phrase);
      } catch {
        inDict = false;
      }
    } else if (words.length === 1) {
      const candidate = words[0];
      try {
        inDict =
          NameDictionary.isFirstName(candidate) ||
          NameDictionary.isSurname(candidate) ||
          (NameDictionary.getNameConfidence(candidate) ?? 0) >= 0.8;
      } catch {
        inDict = false;
      }
    }

    // Cache result (keep cache small)
    if (this._dictionaryCache.size > 500) {
      const firstKey = this._dictionaryCache.keys().next().value;
      this._dictionaryCache.delete(firstKey);
    }
    this._dictionaryCache.set(normalized, inDict);
    return inDict;
  }

  isContextDependent(phiType, text) {
    if (!text || typeof text !== "string") return false;

    // These types usually need context
    const contextTypes = ["AGE", "DATE", "MRN", "ACCOUNT_NUMBER"];
    if (contextTypes.includes(phiType)) return true;

    // Short numbers are context-dependent
    if (/^\d{1,5}$/.test(text)) return true;

    return false;
  }

  isCommonWord(text) {
    if (!text || typeof text !== "string") return false;
    const commonWords = [
      "the",
      "be",
      "to",
      "of",
      "and",
      "a",
      "in",
      "that",
      "have",
      "it",
      "for",
      "not",
      "on",
      "with",
      "he",
      "as",
      "you",
      "do",
      "at",
      "this",
      "may",
      "will",
      "can",
      "said",
      "main",
      "first",
      "last",
      "new",
      "old",
    ];
    return commonWords.includes(text.toLowerCase());
  }

  looksLikeCode(text) {
    if (!text || typeof text !== "string") return false;

    // Check if it looks like a code identifier
    return (
      /^[A-Z]{2,3}\d{3,}$/.test(text) || // ABC123
      /^[A-Z]+_[A-Z]+$/.test(text) || // CODE_TYPE
      /^\d+\.\d+\.\d+$/.test(text)
    ); // Version numbers
  }

  extractContext(item, fullContext) {
    return {
      surroundingText: item.context || fullContext.documentExcerpt || "",
      documentType: fullContext.documentType || "unknown",
      position: item.position || item.span || null,
    };
  }

  // ==========================================================================
  // PATTERN RECORDING AND AGGREGATION
  // ==========================================================================

  recordPattern(type, pattern) {
    const list =
      type === "failure" ? this.patterns.failures : this.patterns.successes;
    list.push(pattern);

    // Keep only last 1000 patterns
    if (list.length > 1000) {
      if (type === "failure") {
        this.patterns.failures = list.slice(-1000);
      } else {
        this.patterns.successes = list.slice(-1000);
      }
    }

    // Update aggregation
    this.updateAggregation(type, pattern);
  }

  updateAggregation(type, pattern) {
    const key = `${type}:${pattern.category}:${pattern.phiType}`;

    if (!this.patterns.aggregated[key]) {
      this.patterns.aggregated[key] = {
        type,
        category: pattern.category,
        phiType: pattern.phiType,
        count: 0,
        examples: [],
        firstSeen: pattern.timestamp,
        lastSeen: pattern.timestamp,
      };
    }

    const agg = this.patterns.aggregated[key];
    agg.count++;
    agg.lastSeen = pattern.timestamp;

    // Keep a few examples
    if (agg.examples.length < 5) {
      agg.examples.push(pattern.original || pattern.detected || "unknown");
    }

    // Update stats
    this.stats.byCategory[pattern.category] =
      (this.stats.byCategory[pattern.category] || 0) + 1;
  }

  // ==========================================================================
  // RECOMMENDATION GENERATION
  // ==========================================================================

  generateRecommendations(analysis) {
    const recommendations = [];
    const patternCounts = {};

    // Count failure patterns by category
    for (const pattern of analysis.failurePatterns) {
      patternCounts[pattern.category] =
        (patternCounts[pattern.category] || 0) + 1;
    }

    // Generate targeted recommendations
    for (const [category, count] of Object.entries(patternCounts)) {
      if (count >= 2) {
        // At least 2 occurrences to recommend
        const info = FAILURE_PATTERNS[category];
        if (info) {
          recommendations.push({
            priority: count >= 5 ? "HIGH" : count >= 3 ? "MEDIUM" : "LOW",
            category,
            occurrences: count,
            issue: info.description,
            action: info.remediation,
            confidence: 0.7 + count * 0.05, // Higher confidence with more occurrences
          });
        }
      }
    }

    // Sort by priority
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );

    return recommendations;
  }

  // ==========================================================================
  // ANALYSIS QUERIES
  // ==========================================================================

  /**
   * Get pattern statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalFailurePatterns: this.patterns.failures.length,
      totalSuccessPatterns: this.patterns.successes.length,
      uniquePatternTypes: Object.keys(this.patterns.aggregated).length,
    };
  }

  /**
   * Get most common failure patterns
   */
  getTopFailurePatterns(limit = 10) {
    const failures = Object.entries(this.patterns.aggregated)
      .filter(([key]) => key.startsWith("failure:"))
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return failures;
  }

  /**
   * Get patterns by PHI type
   */
  getPatternsByPhiType(phiType) {
    return Object.entries(this.patterns.aggregated)
      .filter(([key]) => key.includes(`:${phiType}`))
      .map(([key, data]) => ({ key, ...data }));
  }

  /**
   * Get trending patterns (increasing over time)
   */
  getTrendingPatterns() {
    // Analyze recent vs historical patterns
    const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // Last 7 days

    const recent = this.patterns.failures.filter(
      (p) => new Date(p.timestamp).getTime() > recentCutoff,
    );

    const older = this.patterns.failures.filter(
      (p) => new Date(p.timestamp).getTime() <= recentCutoff,
    );

    // Count by category for each period
    const recentCounts = {};
    const olderCounts = {};

    for (const p of recent) {
      recentCounts[p.category] = (recentCounts[p.category] || 0) + 1;
    }
    for (const p of older) {
      olderCounts[p.category] = (olderCounts[p.category] || 0) + 1;
    }

    // Find increasing patterns
    const trending = [];
    for (const category of Object.keys(recentCounts)) {
      const recentRate = recentCounts[category] / (recent.length || 1);
      const olderRate = (olderCounts[category] || 0) / (older.length || 1);

      if (recentRate > olderRate * 1.5) {
        // 50% increase
        trending.push({
          category,
          trend: "INCREASING",
          recentCount: recentCounts[category],
          change: `+${Math.round((recentRate / (olderRate || 0.01) - 1) * 100)}%`,
        });
      }
    }

    return trending;
  }

  /**
   * Export patterns for LLM context
   */
  exportForLLM() {
    return {
      summary: {
        totalAnalyzed: this.stats.analyzed,
        failurePatterns: this.patterns.failures.length,
        successPatterns: this.patterns.successes.length,
      },
      topFailures: this.getTopFailurePatterns(5),
      trending: this.getTrendingPatterns(),
      recommendations: this.generateRecommendations({
        failurePatterns: this.patterns.failures.slice(-100), // Last 100
      }),
    };
  }

  /**
   * Clear all patterns (for fresh start)
   */
  reset() {
    this.patterns = {
      failures: [],
      successes: [],
      aggregated: {},
      lastUpdated: new Date().toISOString(),
    };
    this.stats = {
      analyzed: 0,
      patternsIdentified: 0,
      byCategory: {},
    };
    this.savePatterns();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  PatternRecognizer,
  FAILURE_PATTERNS,
  SUCCESS_PATTERNS,
};
