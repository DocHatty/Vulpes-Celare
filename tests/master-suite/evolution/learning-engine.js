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
 * ║      ██████╗███████╗██╗      █████╗ ██████╗ ███████╗                          ║
 * ║     ██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝                          ║
 * ║     ██║     █████╗  ██║     ███████║██████╔╝█████╗                            ║
 * ║     ██║     ██╔══╝  ██║     ██╔══██║██╔══██╗██╔══╝                            ║
 * ║     ╚██████╗███████╗███████╗██║  ██║██║  ██║███████╗                          ║
 * ║      ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝                          ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   EVOLUTIONARY LEARNING ENGINE                                                ║
 * ║   Self-Improving Test Intelligence System                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * PHILOSOPHY:
 * This isn't just a test runner - it's a learning system that:
 * 1. Remembers everything that happened before
 * 2. Understands WHY things failed, not just THAT they failed
 * 3. Tracks what changes were made and their effects
 * 4. Builds hypotheses about what might help
 * 5. Learns which interventions actually worked
 * 6. Provides rich context for LLM-assisted improvement
 *
 * CORE CONCEPTS:
 * - Knowledge Base: Persistent memory of all learnings
 * - Failure Patterns: Recognized categories of problems
 * - Interventions: Changes made to fix issues
 * - Hypotheses: Predictions about what might help
 * - Evolution: Tracking improvement/regression over time
 */

const fs = require("fs");
const path = require("path");
const { random } = require("../generators/seeded-random");

// ============================================================================
// KNOWLEDGE BASE - The System's Memory
// ============================================================================

class KnowledgeBase {
  constructor(basePath) {
    this.basePath = basePath;
    this.knowledgePath = path.join(basePath, "knowledge");
    this.ensureDirectories();

    // Core knowledge stores
    this.history = this.loadOrCreate("history.json", { runs: [], summary: {} });
    this.patterns = this.loadOrCreate("patterns.json", {
      recognized: [],
      emerging: [],
    });
    this.interventions = this.loadOrCreate("interventions.json", {
      log: [],
      effectiveness: {},
    });
    this.hypotheses = this.loadOrCreate("hypotheses.json", {
      active: [],
      validated: [],
      invalidated: [],
    });
    this.insights = this.loadOrCreate("insights.json", {
      learnings: [],
      recommendations: [],
    });
  }

  ensureDirectories() {
    if (!fs.existsSync(this.knowledgePath)) {
      fs.mkdirSync(this.knowledgePath, { recursive: true });
    }
  }

  loadOrCreate(filename, defaultValue) {
    const filePath = path.join(this.knowledgePath, filename);
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
      }
    } catch (e) {
      console.warn(`  Warning: Could not load ${filename}, starting fresh`);
    }
    return defaultValue;
  }

  save(filename, data) {
    const filePath = path.join(this.knowledgePath, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  saveAll() {
    this.save("history.json", this.history);
    this.save("patterns.json", this.patterns);
    this.save("interventions.json", this.interventions);
    this.save("hypotheses.json", this.hypotheses);
    this.save("insights.json", this.insights);
  }
}

// ============================================================================
// FAILURE PATTERN RECOGNITION
// ============================================================================

class PatternRecognizer {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;

    // Known failure archetypes - these grow over time
    this.archetypes = {
      OCR_CONFUSION: {
        name: "OCR Character Confusion",
        description:
          "Characters that look similar when scanned (0/O, 1/l/I, 5/S, 8/B)",
        indicators: [/[0O]/, /[1lI|]/, /[5S]/, /[8B]/, /[6G]/],
        severity: "HIGH",
        knownFixes: [
          "Add character substitution patterns",
          "Implement fuzzy matching",
        ],
      },
      CASE_VARIATION: {
        name: "Case Sensitivity Issues",
        description: "Mixed case or unusual casing not recognized",
        indicators: [/[A-Z][a-z]+[A-Z]/, /[a-z][A-Z]/],
        severity: "MEDIUM",
        knownFixes: [
          "Add case-insensitive matching",
          "Normalize before matching",
        ],
      },
      FORMAT_VARIATION: {
        name: "Format Not Recognized",
        description: "Valid data in unexpected format",
        indicators: [],
        severity: "HIGH",
        knownFixes: ["Add format patterns", "Use more flexible regex"],
      },
      SPACING_ISSUES: {
        name: "Whitespace/Spacing Problems",
        description: "Extra spaces, missing spaces, or unusual spacing",
        indicators: [/\s{2,}/, /\s+[-\/]\s+/],
        severity: "MEDIUM",
        knownFixes: [
          "Normalize whitespace",
          "Allow flexible spacing in patterns",
        ],
      },
      TRUNCATION: {
        name: "Truncated Values",
        description: "PHI cut off or incomplete",
        indicators: [],
        severity: "HIGH",
        knownFixes: ["Detect partial matches", "Use prefix/suffix matching"],
      },
      CONTEXT_BLINDNESS: {
        name: "Missing Context Recognition",
        description: "Failed to use surrounding context to identify PHI",
        indicators: [],
        severity: "CRITICAL",
        knownFixes: ["Add field label detection", "Implement context windows"],
      },
      NOVEL_FORMAT: {
        name: "Previously Unseen Format",
        description: "A format not encountered in training/development",
        indicators: [],
        severity: "HIGH",
        knownFixes: ["Add to test cases", "Generalize pattern matching"],
      },
    };
  }

  /**
   * Analyze a failure and identify which patterns it matches
   */
  analyzeFailure(failure) {
    const patterns = [];
    const value = failure.value || "";

    // Check for OCR confusion
    if (/[0O1lI|5S8BG6]/.test(value)) {
      // Look for likely OCR substitutions
      const ocrScore = this.calculateOCRScore(value, failure);
      if (ocrScore > 0.3) {
        patterns.push({
          type: "OCR_CONFUSION",
          confidence: ocrScore,
          evidence: this.findOCREvidence(value),
        });
      }
    }

    // Check for case variation
    if (
      failure.phiType === "NAME" &&
      /[A-Z][a-z]+[A-Z]|[a-z][A-Z]/.test(value)
    ) {
      patterns.push({
        type: "CASE_VARIATION",
        confidence: 0.8,
        evidence: `Mixed case pattern: "${value}"`,
      });
    }

    // Check for spacing issues
    if (/\s{2,}|\s+[-\/]\s+/.test(value)) {
      patterns.push({
        type: "SPACING_ISSUES",
        confidence: 0.9,
        evidence: `Unusual spacing in: "${value}"`,
      });
    }

    // Type-specific pattern detection
    patterns.push(...this.detectTypeSpecificPatterns(failure));

    return patterns;
  }

  calculateOCRScore(value, failure) {
    let score = 0;
    const ocrPairs = [
      ["0", "O"],
      ["1", "l"],
      ["1", "I"],
      ["1", "|"],
      ["5", "S"],
      ["8", "B"],
      ["6", "G"],
      ["2", "Z"],
    ];

    // Check if value contains characters that commonly get OCR-confused
    for (const [a, b] of ocrPairs) {
      if (value.includes(a) || value.includes(b)) {
        score += 0.15;
      }
    }

    // Higher score if error level was high/extreme
    if (failure.errorLevel === "high" || failure.errorLevel === "extreme") {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  findOCREvidence(value) {
    const evidence = [];
    if (/[0O]/.test(value)) evidence.push("0↔O confusion possible");
    if (/[1lI|]/.test(value)) evidence.push("1↔l↔I confusion possible");
    if (/[5S]/.test(value)) evidence.push("5↔S confusion possible");
    if (/[8B]/.test(value)) evidence.push("8↔B confusion possible");
    if (/[2Z]/.test(value)) evidence.push("2↔Z confusion possible");
    return evidence.join("; ");
  }

  detectTypeSpecificPatterns(failure) {
    const patterns = [];
    const value = failure.value || "";

    switch (failure.phiType) {
      case "DATE":
        // Check for unusual date formats
        if (/\d{1,2}\/\s*\d{1,2}\/\d{2,4}/.test(value)) {
          patterns.push({
            type: "SPACING_ISSUES",
            confidence: 0.9,
            evidence: `Date with spaces: "${value}"`,
          });
        }
        if (/[A-Za-z]/.test(value.replace(/[ap]m/gi, ""))) {
          patterns.push({
            type: "OCR_CONFUSION",
            confidence: 0.85,
            evidence: `Date with letter corruption: "${value}"`,
          });
        }
        break;

      case "SSN":
        if (value.replace(/[-\s]/g, "").length !== 9) {
          patterns.push({
            type: "TRUNCATION",
            confidence: 0.7,
            evidence: `SSN not 9 digits: "${value}"`,
          });
        }
        break;

      case "NAME":
        if (value.split(/\s+/).length > 3) {
          patterns.push({
            type: "FORMAT_VARIATION",
            confidence: 0.6,
            evidence: `Multi-part name: "${value}"`,
          });
        }
        break;
    }

    return patterns;
  }

  /**
   * Cluster failures into pattern groups for analysis
   */
  clusterFailures(failures) {
    const clusters = {};

    for (const failure of failures) {
      const patterns = this.analyzeFailure(failure);

      for (const pattern of patterns) {
        if (!clusters[pattern.type]) {
          clusters[pattern.type] = {
            archetype: this.archetypes[pattern.type] || { name: pattern.type },
            failures: [],
            totalConfidence: 0,
          };
        }
        clusters[pattern.type].failures.push({
          ...failure,
          patternConfidence: pattern.confidence,
          evidence: pattern.evidence,
        });
        clusters[pattern.type].totalConfidence += pattern.confidence;
      }
    }

    // Calculate average confidence per cluster
    for (const type of Object.keys(clusters)) {
      const cluster = clusters[type];
      cluster.avgConfidence = cluster.totalConfidence / cluster.failures.length;
      cluster.count = cluster.failures.length;
    }

    return clusters;
  }
}

// ============================================================================
// INTERVENTION TRACKER - What changes were made and their effects
// ============================================================================

class InterventionTracker {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
  }

  /**
   * Log an intervention (code change made to improve detection)
   */
  logIntervention(intervention) {
    const entry = {
      id: `INT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...intervention,
      status: "pending_validation",
      beforeMetrics: null,
      afterMetrics: null,
      effectiveness: null,
    };

    this.kb.interventions.log.push(entry);
    this.kb.save("interventions.json", this.kb.interventions);

    return entry.id;
  }

  /**
   * Record the "before" state for an intervention
   */
  recordBefore(interventionId, metrics) {
    const intervention = this.kb.interventions.log.find(
      (i) => i.id === interventionId,
    );
    if (intervention) {
      intervention.beforeMetrics = metrics;
      intervention.status = "in_progress";
      this.kb.save("interventions.json", this.kb.interventions);
    }
  }

  /**
   * Record the "after" state and calculate effectiveness
   */
  recordAfter(interventionId, metrics) {
    const intervention = this.kb.interventions.log.find(
      (i) => i.id === interventionId,
    );
    if (intervention && intervention.beforeMetrics) {
      intervention.afterMetrics = metrics;
      intervention.effectiveness = this.calculateEffectiveness(
        intervention.beforeMetrics,
        metrics,
        intervention.targetedPatterns || [],
      );
      intervention.status = intervention.effectiveness.improved
        ? "validated"
        : "ineffective";

      // Update pattern effectiveness tracking
      this.updatePatternEffectiveness(intervention);

      this.kb.save("interventions.json", this.kb.interventions);
    }
  }

  calculateEffectiveness(before, after, targetedPatterns) {
    const sensitivityDelta = after.sensitivity - before.sensitivity;
    const specificityDelta = after.specificity - before.specificity;
    const f1Delta = after.f1Score - before.f1Score;

    // Check improvements in targeted areas
    const targetedImprovements = {};
    for (const pattern of targetedPatterns) {
      if (before.byPHIType?.[pattern] && after.byPHIType?.[pattern]) {
        const beforeRate =
          before.byPHIType[pattern].tp / before.byPHIType[pattern].total;
        const afterRate =
          after.byPHIType[pattern].tp / after.byPHIType[pattern].total;
        targetedImprovements[pattern] = {
          before: beforeRate,
          after: afterRate,
          delta: afterRate - beforeRate,
        };
      }
    }

    return {
      improved: sensitivityDelta > 0 || f1Delta > 0,
      sensitivityDelta,
      specificityDelta,
      f1Delta,
      targetedImprovements,
      overallScore:
        sensitivityDelta * 0.7 + specificityDelta * 0.2 + f1Delta * 0.1,
      assessment: this.assessEffectiveness(
        sensitivityDelta,
        specificityDelta,
        targetedImprovements,
      ),
    };
  }

  assessEffectiveness(sensDelta, specDelta, targeted) {
    if (sensDelta > 2) return "HIGHLY_EFFECTIVE";
    if (sensDelta > 0.5) return "EFFECTIVE";
    if (sensDelta > 0 && specDelta >= 0) return "MARGINALLY_EFFECTIVE";
    if (sensDelta >= 0 && specDelta < -2) return "TRADEOFF";
    if (sensDelta < 0) return "REGRESSION";
    return "NO_CHANGE";
  }

  updatePatternEffectiveness(intervention) {
    const eff = this.kb.interventions.effectiveness;

    for (const pattern of intervention.targetedPatterns || []) {
      if (!eff[pattern]) {
        eff[pattern] = { attempts: [], successfulFixes: [], failedFixes: [] };
      }

      const attempt = {
        interventionId: intervention.id,
        description: intervention.description,
        effectiveness: intervention.effectiveness,
      };

      eff[pattern].attempts.push(attempt);

      if (intervention.effectiveness?.improved) {
        eff[pattern].successfulFixes.push(intervention.description);
      } else {
        eff[pattern].failedFixes.push(intervention.description);
      }
    }
  }

  /**
   * Get history of what worked and didn't work for a pattern type
   */
  getPatternHistory(patternType) {
    return (
      this.kb.interventions.effectiveness[patternType] || {
        attempts: [],
        successfulFixes: [],
        failedFixes: [],
      }
    );
  }
}

// ============================================================================
// HYPOTHESIS ENGINE - Predictions about what might help
// ============================================================================

class HypothesisEngine {
  constructor(knowledgeBase, patternRecognizer, interventionTracker) {
    this.kb = knowledgeBase;
    this.patterns = patternRecognizer;
    this.interventions = interventionTracker;
  }

  /**
   * Generate hypotheses based on current failures
   */
  generateHypotheses(failures, clusters) {
    const hypotheses = [];

    for (const [patternType, cluster] of Object.entries(clusters)) {
      const archetype = this.patterns.archetypes[patternType];
      const history = this.interventions.getPatternHistory(patternType);

      // Get known fixes that haven't been tried or were effective
      const suggestedFixes = archetype?.knownFixes || [];
      const triedFixes = history.attempts.map((a) => a.description);
      const successfulFixes = history.successfulFixes;
      const failedFixes = history.failedFixes;

      for (const fix of suggestedFixes) {
        // Skip fixes that have already failed
        if (failedFixes.includes(fix)) continue;

        // Prioritize fixes that worked before
        const wasSuccessful = successfulFixes.includes(fix);
        const wasTried = triedFixes.some((t) =>
          t.toLowerCase().includes(fix.toLowerCase()),
        );

        hypotheses.push({
          id: `HYP-${Date.now()}-${random().toString(36).substr(2, 9)}`,
          pattern: patternType,
          affectedCount: cluster.count,
          hypothesis: fix,
          confidence: this.calculateHypothesisConfidence(
            cluster,
            wasSuccessful,
            wasTried,
          ),
          reasoning: this.buildReasoning(patternType, cluster, history),
          priority: this.calculatePriority(cluster, archetype),
          previouslySuccessful: wasSuccessful,
          samples: cluster.failures.slice(0, 3).map((f) => ({
            value: f.value,
            type: f.phiType,
            evidence: f.evidence,
          })),
        });
      }

      // Generate novel hypotheses based on failure analysis
      hypotheses.push(
        ...this.generateNovelHypotheses(patternType, cluster, history),
      );
    }

    // Sort by priority and confidence
    hypotheses.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const pDiff =
        (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
      if (pDiff !== 0) return pDiff;
      return b.confidence - a.confidence;
    });

    return hypotheses;
  }

  calculateHypothesisConfidence(cluster, wasSuccessful, wasTried) {
    let confidence = cluster.avgConfidence * 0.5;

    if (wasSuccessful) confidence += 0.3;
    if (!wasTried) confidence += 0.1;
    if (cluster.count > 10) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  buildReasoning(patternType, cluster, history) {
    const parts = [];

    parts.push(
      `Identified ${cluster.count} failures matching ${patternType} pattern.`,
    );

    if (history.attempts.length > 0) {
      parts.push(
        `Previously attempted ${history.attempts.length} interventions for this pattern.`,
      );
      if (history.successfulFixes.length > 0) {
        parts.push(
          `Successful approaches: ${history.successfulFixes.slice(0, 2).join(", ")}.`,
        );
      }
      if (history.failedFixes.length > 0) {
        parts.push(
          `Ineffective approaches to avoid: ${history.failedFixes.slice(0, 2).join(", ")}.`,
        );
      }
    }

    return parts.join(" ");
  }

  calculatePriority(cluster, archetype) {
    if (archetype?.severity === "CRITICAL") return "CRITICAL";
    if (cluster.count > 20) return "HIGH";
    if (archetype?.severity === "HIGH") return "HIGH";
    if (cluster.count > 5) return "MEDIUM";
    return "LOW";
  }

  generateNovelHypotheses(patternType, cluster, history) {
    const hypotheses = [];

    // Analyze failure values to generate specific hypotheses
    const values = cluster.failures.map((f) => f.value);

    // Look for common substrings or patterns
    const commonPatterns = this.findCommonPatterns(values);

    for (const pattern of commonPatterns) {
      hypotheses.push({
        id: `HYP-${Date.now()}-${random().toString(36).substr(2, 9)}`,
        pattern: patternType,
        affectedCount: pattern.count,
        hypothesis: `Add specific pattern for: ${pattern.description}`,
        confidence: pattern.confidence,
        reasoning: `Detected recurring pattern in ${pattern.count} failures: "${pattern.example}"`,
        priority: pattern.count > 5 ? "HIGH" : "MEDIUM",
        isNovel: true,
        samples: pattern.samples,
      });
    }

    return hypotheses;
  }

  findCommonPatterns(values) {
    const patterns = [];

    // Look for common prefixes/suffixes
    // Look for common character sequences
    // This is a simplified version - could be much more sophisticated

    const charFreq = {};
    for (const value of values) {
      for (const char of value) {
        charFreq[char] = (charFreq[char] || 0) + 1;
      }
    }

    // If certain characters appear very frequently, note them
    const totalChars = values.join("").length;
    for (const [char, count] of Object.entries(charFreq)) {
      if (count / totalChars > 0.1 && /[^a-zA-Z0-9]/.test(char)) {
        patterns.push({
          description: `Special character "${char}" appears frequently`,
          count: count,
          confidence: 0.6,
          example: values.find((v) => v.includes(char)),
          samples: values.filter((v) => v.includes(char)).slice(0, 3),
        });
      }
    }

    return patterns;
  }

  /**
   * Validate a hypothesis after an intervention
   */
  validateHypothesis(hypothesisId, wasEffective) {
    const hypothesis = this.kb.hypotheses.active.find(
      (h) => h.id === hypothesisId,
    );

    if (hypothesis) {
      // Remove from active
      this.kb.hypotheses.active = this.kb.hypotheses.active.filter(
        (h) => h.id !== hypothesisId,
      );

      // Add to validated or invalidated
      hypothesis.validatedAt = new Date().toISOString();
      hypothesis.wasEffective = wasEffective;

      if (wasEffective) {
        this.kb.hypotheses.validated.push(hypothesis);
      } else {
        this.kb.hypotheses.invalidated.push(hypothesis);
      }

      this.kb.save("hypotheses.json", this.kb.hypotheses);
    }
  }
}

// ============================================================================
// EVOLUTION TRACKER - Understanding progress over time
// ============================================================================

class EvolutionTracker {
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
  }

  /**
   * Record a test run in history
   */
  recordRun(runData) {
    const run = {
      id: `RUN-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...runData,
      comparisonToPrevious: null,
    };

    // Compare to previous run
    const previousRuns = this.kb.history.runs;
    if (previousRuns.length > 0) {
      const previous = previousRuns[previousRuns.length - 1];
      run.comparisonToPrevious = this.compareRuns(previous, run);
    }

    this.kb.history.runs.push(run);
    this.updateSummary();
    this.kb.save("history.json", this.kb.history);

    return run;
  }

  compareRuns(previous, current) {
    const comparison = {
      sensitivityDelta:
        current.metrics.sensitivity - previous.metrics.sensitivity,
      specificityDelta:
        current.metrics.specificity - previous.metrics.specificity,
      f1Delta: current.metrics.f1Score - previous.metrics.f1Score,
      failureCountDelta: current.failureCount - previous.failureCount,
      trend: "STABLE",
    };

    if (comparison.sensitivityDelta > 0.5) {
      comparison.trend = "IMPROVING";
    } else if (comparison.sensitivityDelta < -0.5) {
      comparison.trend = "REGRESSING";
    }

    // Identify what got better and worse
    comparison.improved = [];
    comparison.regressed = [];

    for (const type of Object.keys(current.metrics.byPHIType || {})) {
      const currRate =
        current.metrics.byPHIType[type]?.tp /
          current.metrics.byPHIType[type]?.total || 0;
      const prevRate =
        previous.metrics.byPHIType?.[type]?.tp /
          previous.metrics.byPHIType?.[type]?.total || 0;

      if (currRate > prevRate + 0.01) {
        comparison.improved.push({ type, delta: currRate - prevRate });
      } else if (currRate < prevRate - 0.01) {
        comparison.regressed.push({ type, delta: currRate - prevRate });
      }
    }

    return comparison;
  }

  updateSummary() {
    const runs = this.kb.history.runs;
    if (runs.length === 0) return;

    const recent = runs.slice(-10);
    const oldest = runs[0];
    const latest = runs[runs.length - 1];

    this.kb.history.summary = {
      totalRuns: runs.length,
      firstRun: oldest.timestamp,
      latestRun: latest.timestamp,

      // Current state
      currentSensitivity: latest.metrics.sensitivity,
      currentSpecificity: latest.metrics.specificity,
      currentF1: latest.metrics.f1Score,
      currentGrade: latest.metrics.grade,

      // Progress from beginning
      totalSensitivityGain:
        latest.metrics.sensitivity - oldest.metrics.sensitivity,
      totalSpecificityGain:
        latest.metrics.specificity - oldest.metrics.specificity,

      // Recent trend (last 10 runs)
      recentTrend: this.calculateTrend(recent),

      // Best ever achieved
      bestSensitivity: Math.max(...runs.map((r) => r.metrics.sensitivity)),
      bestSpecificity: Math.max(...runs.map((r) => r.metrics.specificity)),
      bestF1: Math.max(...runs.map((r) => r.metrics.f1Score)),

      // Persistent problem areas
      persistentIssues: this.identifyPersistentIssues(runs),
    };
  }

  calculateTrend(recentRuns) {
    if (recentRuns.length < 2) return "INSUFFICIENT_DATA";

    const sensitivities = recentRuns.map((r) => r.metrics.sensitivity);
    const first = sensitivities[0];
    const last = sensitivities[sensitivities.length - 1];
    const avg = sensitivities.reduce((a, b) => a + b, 0) / sensitivities.length;

    // Simple linear regression
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    const n = sensitivities.length;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += sensitivities[i];
      sumXY += i * sensitivities[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.1) return "STRONGLY_IMPROVING";
    if (slope > 0.02) return "IMPROVING";
    if (slope > -0.02) return "STABLE";
    if (slope > -0.1) return "DECLINING";
    return "STRONGLY_DECLINING";
  }

  identifyPersistentIssues(runs) {
    const recentRuns = runs.slice(-5);
    const issues = {};

    for (const run of recentRuns) {
      for (const failure of run.failures || []) {
        const key = `${failure.phiType}:${failure.source || "unknown"}`;
        issues[key] = (issues[key] || 0) + 1;
      }
    }

    // Issues that appear in multiple recent runs
    return Object.entries(issues)
      .filter(([_, count]) => count >= 3)
      .map(([key, count]) => {
        const [type, source] = key.split(":");
        return {
          type,
          source,
          occurrences: count,
          persistenceRate: count / recentRuns.length,
        };
      })
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Get evolution report for LLM context
   */
  getEvolutionReport() {
    const summary = this.kb.history.summary;
    const runs = this.kb.history.runs;

    if (runs.length === 0) {
      return {
        status: "NO_HISTORY",
        message: "No previous test runs recorded. This is the first run.",
      };
    }

    return {
      status: "HAS_HISTORY",
      summary,
      recentRuns: runs.slice(-5).map((r) => ({
        timestamp: r.timestamp,
        sensitivity: r.metrics.sensitivity,
        specificity: r.metrics.specificity,
        failureCount: r.failureCount,
        trend: r.comparisonToPrevious?.trend,
      })),
      insights: this.generateInsights(),
    };
  }

  generateInsights() {
    const summary = this.kb.history.summary;
    const insights = [];

    if (summary.totalSensitivityGain > 5) {
      insights.push({
        type: "PROGRESS",
        message: `Sensitivity has improved by ${summary.totalSensitivityGain.toFixed(1)}% since first run.`,
      });
    }

    if (summary.persistentIssues?.length > 0) {
      insights.push({
        type: "PERSISTENT_PROBLEM",
        message: `${summary.persistentIssues[0].type} detection remains problematic (appeared in ${summary.persistentIssues[0].occurrences}/5 recent runs).`,
      });
    }

    if (summary.recentTrend === "STRONGLY_IMPROVING") {
      insights.push({
        type: "POSITIVE_TREND",
        message:
          "Strong upward trend in recent runs. Current approach is working.",
      });
    } else if (
      summary.recentTrend === "DECLINING" ||
      summary.recentTrend === "STRONGLY_DECLINING"
    ) {
      insights.push({
        type: "REGRESSION_WARNING",
        message:
          "Recent changes may have introduced regressions. Review recent interventions.",
      });
    }

    return insights;
  }
}

// ============================================================================
// INSIGHT GENERATOR - Learning from patterns
// ============================================================================

class InsightGenerator {
  constructor(knowledgeBase, patternRecognizer, evolutionTracker) {
    this.kb = knowledgeBase;
    this.patterns = patternRecognizer;
    this.evolution = evolutionTracker;
  }

  /**
   * Generate learnings from current run
   */
  generateLearnings(currentRun, failures, clusters) {
    const learnings = [];

    // Learning from failure patterns
    for (const [patternType, cluster] of Object.entries(clusters)) {
      if (cluster.count > 3) {
        learnings.push({
          type: "PATTERN_IDENTIFIED",
          pattern: patternType,
          count: cluster.count,
          learning:
            `${patternType} pattern accounts for ${cluster.count} failures. ` +
            `${this.patterns.archetypes[patternType]?.description || ""}`,
        });
      }
    }

    // Learning from evolution
    const evolutionReport = this.evolution.getEvolutionReport();
    if (evolutionReport.status === "HAS_HISTORY") {
      const comparison = currentRun.comparisonToPrevious;

      if (comparison?.improved?.length > 0) {
        learnings.push({
          type: "IMPROVEMENT",
          learning: `Improved detection for: ${comparison.improved.map((i) => i.type).join(", ")}`,
        });
      }

      if (comparison?.regressed?.length > 0) {
        learnings.push({
          type: "REGRESSION",
          learning:
            `Regression detected for: ${comparison.regressed.map((r) => r.type).join(", ")}. ` +
            `Review recent changes.`,
        });
      }
    }

    // Store learnings
    this.kb.insights.learnings.push({
      runId: currentRun.id,
      timestamp: new Date().toISOString(),
      learnings,
    });

    // Keep only recent learnings (last 20 runs)
    if (this.kb.insights.learnings.length > 20) {
      this.kb.insights.learnings = this.kb.insights.learnings.slice(-20);
    }

    this.kb.save("insights.json", this.kb.insights);

    return learnings;
  }

  /**
   * Generate recommendations based on all available knowledge
   */
  generateRecommendations(currentRun, hypotheses) {
    const recommendations = [];
    const evolutionReport = this.evolution.getEvolutionReport();

    // Priority recommendations from hypotheses
    const topHypotheses = hypotheses.slice(0, 5);
    for (const hyp of topHypotheses) {
      recommendations.push({
        priority: hyp.priority,
        action: hyp.hypothesis,
        reasoning: hyp.reasoning,
        expectedImpact: `Could fix ${hyp.affectedCount} failures`,
        confidence: hyp.confidence,
        previouslyWorked: hyp.previouslySuccessful || false,
      });
    }

    // Add recommendations based on persistent issues
    if (evolutionReport.summary?.persistentIssues) {
      for (const issue of evolutionReport.summary.persistentIssues.slice(
        0,
        3,
      )) {
        const existing = recommendations.find((r) =>
          r.action.includes(issue.type),
        );
        if (!existing) {
          recommendations.push({
            priority: "HIGH",
            action: `Focus on ${issue.type} detection - persistent issue`,
            reasoning: `${issue.type} has failed in ${issue.occurrences} of last 5 runs`,
            expectedImpact: "Address recurring problem",
            confidence: 0.8,
            isPersistent: true,
          });
        }
      }
    }

    // Store recommendations
    this.kb.insights.recommendations = recommendations;
    this.kb.save("insights.json", this.kb.insights);

    return recommendations;
  }
}

// ============================================================================
// MAIN LEARNING ENGINE - Orchestrates everything
// ============================================================================

class LearningEngine {
  constructor(basePath) {
    this.basePath = basePath || path.join(__dirname, "..", "..", "results");

    // Initialize components
    this.kb = new KnowledgeBase(this.basePath);
    this.patternRecognizer = new PatternRecognizer(this.kb);
    this.interventionTracker = new InterventionTracker(this.kb);
    this.hypothesisEngine = new HypothesisEngine(
      this.kb,
      this.patternRecognizer,
      this.interventionTracker,
    );
    this.evolutionTracker = new EvolutionTracker(this.kb);
    this.insightGenerator = new InsightGenerator(
      this.kb,
      this.patternRecognizer,
      this.evolutionTracker,
    );
  }

  /**
   * Process a completed test run
   */
  processRun(runData) {
    console.error(
      "\n╔═══════════════════════════════════════════════════════════════════════════╗",
    );
    console.error(
      "║  LEARNING ENGINE - Processing Run                                          ║",
    );
    console.error(
      "╚═══════════════════════════════════════════════════════════════════════════╝\n",
    );

    // 1. Record the run in history
    const run = this.evolutionTracker.recordRun(runData);
    console.error(`  ✓ Recorded run ${run.id}`);

    // 2. Cluster failures by pattern
    const clusters = this.patternRecognizer.clusterFailures(
      runData.failures || [],
    );
    console.error(
      `  ✓ Identified ${Object.keys(clusters).length} failure patterns`,
    );

    // 3. Generate hypotheses
    const hypotheses = this.hypothesisEngine.generateHypotheses(
      runData.failures || [],
      clusters,
    );
    this.kb.hypotheses.active = hypotheses;
    this.kb.save("hypotheses.json", this.kb.hypotheses);
    console.error(`  ✓ Generated ${hypotheses.length} hypotheses`);

    // 4. Generate learnings
    const learnings = this.insightGenerator.generateLearnings(
      run,
      runData.failures || [],
      clusters,
    );
    console.error(`  ✓ Extracted ${learnings.length} learnings`);

    // 5. Generate recommendations
    const recommendations = this.insightGenerator.generateRecommendations(
      run,
      hypotheses,
    );
    console.error(`  ✓ Created ${recommendations.length} recommendations`);

    // Save all knowledge
    this.kb.saveAll();

    return {
      run,
      clusters,
      hypotheses,
      learnings,
      recommendations,
      evolution: this.evolutionTracker.getEvolutionReport(),
    };
  }

  /**
   * Log an intervention (when code changes are made)
   */
  logIntervention(description, targetedPatterns, details = {}) {
    return this.interventionTracker.logIntervention({
      description,
      targetedPatterns,
      ...details,
    });
  }

  /**
   * Get context for LLM-assisted improvement
   */
  getLLMContext() {
    const evolution = this.evolutionTracker.getEvolutionReport();
    const hypotheses = this.kb.hypotheses.active.slice(0, 10);
    const recommendations = this.kb.insights.recommendations.slice(0, 10);
    const recentLearnings = this.kb.insights.learnings.slice(-3);

    // What worked before
    const successfulInterventions = this.kb.interventions.log
      .filter((i) => i.status === "validated")
      .slice(-5);

    // What didn't work
    const failedInterventions = this.kb.interventions.log
      .filter((i) => i.status === "ineffective")
      .slice(-5);

    return {
      // Current state
      currentState: {
        sensitivity: evolution.summary?.currentSensitivity,
        specificity: evolution.summary?.currentSpecificity,
        grade: evolution.summary?.currentGrade,
        trend: evolution.summary?.recentTrend,
      },

      // Historical context
      history: {
        totalRuns: evolution.summary?.totalRuns,
        totalProgress: evolution.summary?.totalSensitivityGain,
        bestEverSensitivity: evolution.summary?.bestSensitivity,
        persistentIssues: evolution.summary?.persistentIssues,
      },

      // What the system has learned
      learnings: recentLearnings.flatMap((l) => l.learnings),

      // What might help
      hypotheses: hypotheses.map((h) => ({
        action: h.hypothesis,
        pattern: h.pattern,
        affectedCount: h.affectedCount,
        confidence: h.confidence,
        reasoning: h.reasoning,
        previouslyWorked: h.previouslySuccessful,
      })),

      // Prioritized recommendations
      recommendations,

      // What worked before (do more of this)
      successfulApproaches: successfulInterventions.map((i) => ({
        description: i.description,
        improvement: i.effectiveness?.sensitivityDelta,
      })),

      // What didn't work (avoid this)
      failedApproaches: failedInterventions.map((i) => ({
        description: i.description,
        patterns: i.targetedPatterns,
      })),

      // Specific guidance
      guidance: this.generateGuidance(evolution, hypotheses),
    };
  }

  generateGuidance(evolution, hypotheses) {
    const guidance = [];

    // Based on trend
    if (evolution.summary?.recentTrend === "DECLINING") {
      guidance.push(
        "CAUTION: Recent changes have caused regressions. Consider reverting recent changes.",
      );
    }

    // Based on persistent issues
    if (evolution.summary?.persistentIssues?.length > 0) {
      const top = evolution.summary.persistentIssues[0];
      guidance.push(
        `FOCUS: ${top.type} detection is a persistent problem. Prioritize this area.`,
      );
    }

    // Based on hypotheses
    if (hypotheses.length > 0 && hypotheses[0].previouslySuccessful) {
      guidance.push(
        `RECOMMENDED: "${hypotheses[0].hypothesis}" worked before. Try this approach again.`,
      );
    }

    // Based on what's close to perfect
    if (evolution.summary?.bestSensitivity > 98) {
      guidance.push(
        "CLOSE: Best sensitivity was over 98%. The solution is within reach.",
      );
    }

    return guidance;
  }

  /**
   * Generate a human-readable evolution report
   */
  generateReport() {
    const evolution = this.evolutionTracker.getEvolutionReport();
    const context = this.getLLMContext();

    let report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                    EVOLUTIONARY LEARNING REPORT                               ║
╚══════════════════════════════════════════════════════════════════════════════╝

CURRENT STATE
────────────────────────────────────────────────────────────────────────────────
  Sensitivity:    ${context.currentState.sensitivity?.toFixed(2) || "N/A"}%
  Specificity:    ${context.currentState.specificity?.toFixed(2) || "N/A"}%
  Grade:          ${context.currentState.grade || "N/A"}
  Recent Trend:   ${context.currentState.trend || "N/A"}

HISTORICAL CONTEXT
────────────────────────────────────────────────────────────────────────────────
  Total Runs:           ${context.history.totalRuns || 0}
  Total Progress:       ${context.history.totalProgress?.toFixed(2) || 0}% sensitivity gain
  Best Ever:            ${context.history.bestEverSensitivity?.toFixed(2) || "N/A"}% sensitivity

PERSISTENT ISSUES
────────────────────────────────────────────────────────────────────────────────
`;

    if (context.history.persistentIssues?.length > 0) {
      for (const issue of context.history.persistentIssues.slice(0, 5)) {
        report += `  • ${issue.type} (${issue.source}): Failed in ${issue.occurrences}/5 recent runs\n`;
      }
    } else {
      report += "  No persistent issues identified.\n";
    }

    report += `
RECENT LEARNINGS
────────────────────────────────────────────────────────────────────────────────
`;

    for (const learning of context.learnings.slice(0, 5)) {
      report += `  • [${learning.type}] ${learning.learning}\n`;
    }

    report += `
TOP RECOMMENDATIONS
────────────────────────────────────────────────────────────────────────────────
`;

    for (const rec of context.recommendations.slice(0, 5)) {
      report += `  [${rec.priority}] ${rec.action}\n`;
      report += `          Reasoning: ${rec.reasoning}\n`;
      report += `          Expected: ${rec.expectedImpact}\n\n`;
    }

    report += `
WHAT WORKED BEFORE
────────────────────────────────────────────────────────────────────────────────
`;

    if (context.successfulApproaches.length > 0) {
      for (const approach of context.successfulApproaches) {
        report += `  ✓ ${approach.description} (+${approach.improvement?.toFixed(2) || "?"}% sensitivity)\n`;
      }
    } else {
      report += "  No validated successful interventions yet.\n";
    }

    report += `
WHAT DIDN'T WORK
────────────────────────────────────────────────────────────────────────────────
`;

    if (context.failedApproaches.length > 0) {
      for (const approach of context.failedApproaches) {
        report += `  ✗ ${approach.description} (targeting: ${approach.patterns?.join(", ") || "unknown"})\n`;
      }
    } else {
      report += "  No recorded failed interventions.\n";
    }

    report += `
GUIDANCE
────────────────────────────────────────────────────────────────────────────────
`;

    for (const g of context.guidance) {
      report += `  → ${g}\n`;
    }

    report += `
══════════════════════════════════════════════════════════════════════════════
`;

    return report;
  }
}

module.exports = {
  LearningEngine,
  KnowledgeBase,
  PatternRecognizer,
  InterventionTracker,
  HypothesisEngine,
  EvolutionTracker,
  InsightGenerator,
};
