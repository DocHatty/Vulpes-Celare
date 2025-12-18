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
 * ║   DECISION ENGINE                                                             ║
 * ║   The Brain That MUST Consult History Before Acting                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * FUNDAMENTAL PRINCIPLE: NEVER make a recommendation without checking history.
 *
 * This is the central decision-making component that:
 * 1. RECEIVES questions/requests about what to do
 * 2. CONSULTS history to see what was tried before
 * 3. ANALYZES current codebase state
 * 4. SYNTHESIZES insights from all systems
 * 5. BUILDS recommendations with full context
 *
 * MANDATORY HISTORY CONSULTATION:
 * ─────────────────────────────────────────────────────────────────────────────────
 * Before ANY recommendation, the engine MUST check:
 * - Has this been tried before?
 * - What happened when it was tried?
 * - Are conditions different now?
 * - What worked in similar situations?
 *
 * DECISION TYPES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * WHAT_TO_IMPROVE     - "What should we focus on improving?"
 * HOW_TO_FIX          - "How should we fix this specific issue?"
 * SHOULD_WE_TRY       - "Should we try this intervention?"
 * VALIDATE_HYPOTHESIS - "Is this hypothesis worth testing?"
 * INTERPRET_RESULTS   - "What do these test results mean?"
 *
 * OUTPUT INCLUDES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - Recommendation
 * - Confidence level
 * - Historical evidence (what we tried before)
 * - Current state context
 * - Risk assessment
 * - Alternative approaches
 */

const fs = require("fs");
const path = require("path");
const { PATHS, DECISION_CONFIG } = require("../core/config");

// ============================================================================
// DECISION ENGINE CLASS
// ============================================================================

class DecisionEngine {
  constructor(options = {}) {
    // Connected systems (ALL required for full functionality)
    this.knowledgeBase = options.knowledgeBase || null;
    this.historyConsultant = options.historyConsultant || null;
    this.codebaseAnalyzer = options.codebaseAnalyzer || null;
    this.patternRecognizer = options.patternRecognizer || null;
    this.hypothesisEngine = options.hypothesisEngine || null;
    this.interventionTracker = options.interventionTracker || null;
    this.insightGenerator = options.insightGenerator || null;
    this.metricsEngine = options.metricsEngine || null;

    this.storagePath = path.join(PATHS.knowledge, "decisions.json");
    this.data = this.loadData();

    // Decision log for audit trail
    this.decisionLog = [];
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      }
    } catch (e) {
      console.warn("DecisionEngine: Starting with empty decision history");
    }
    return {
      decisions: [],
      stats: {
        total: 0,
        byType: {},
        followed: 0,
        ignored: 0,
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
  // MAIN DECISION INTERFACE
  // ==========================================================================

  /**
   * Make a decision - THE MAIN ENTRY POINT
   * @param {string} type - Decision type (WHAT_TO_IMPROVE, HOW_TO_FIX, etc.)
   * @param {Object} context - Context for the decision
   */
  async makeDecision(type, context = {}) {
    const decision = {
      id: `DEC-${Date.now()}-${random().toString(36).substr(2, 6)}`,
      type,
      timestamp: new Date().toISOString(),
      context,
      historyConsulted: false,
      codebaseStateChecked: false,

      // Will be filled in
      historyAnalysis: null,
      codebaseState: null,
      synthesis: null,
      recommendation: null,
      alternatives: [],
      confidence: 0,
      risks: [],
    };

    // STEP 1: MANDATORY HISTORY CONSULTATION
    decision.historyAnalysis = await this.consultHistory(type, context);
    decision.historyConsulted = true;

    // STEP 2: CHECK CURRENT CODEBASE STATE
    decision.codebaseState = this.checkCodebaseState(context);
    decision.codebaseStateChecked = true;

    // STEP 3: SYNTHESIZE ALL AVAILABLE INFORMATION
    decision.synthesis = this.synthesizeInformation(type, context, decision);

    // STEP 4: BUILD RECOMMENDATION
    const result = this.buildRecommendation(type, context, decision);
    decision.recommendation = result.recommendation;
    decision.alternatives = result.alternatives;
    decision.confidence = result.confidence;
    decision.risks = result.risks;

    // Record decision
    this.data.decisions.push(decision);
    this.data.stats.total++;
    this.data.stats.byType[type] = (this.data.stats.byType[type] || 0) + 1;
    this.saveData();

    return decision;
  }

  // ==========================================================================
  // STEP 1: MANDATORY HISTORY CONSULTATION
  // ==========================================================================

  async consultHistory(type, context) {
    const analysis = {
      consulted: true,
      timestamp: new Date().toISOString(),
      previousAttempts: [],
      relatedSuccesses: [],
      relatedFailures: [],
      warnings: [],
      summary: "",
    };

    if (this.historyConsultant) {
      // Use dedicated history consultant
      const historyReport = await this.historyConsultant.consult(type, context);
      return historyReport;
    }

    // Manual history lookup
    if (this.interventionTracker) {
      // Check for previous similar interventions
      if (context.phiType) {
        const similar = this.interventionTracker.getInterventionsByTarget({
          component: context.phiType,
        });

        analysis.previousAttempts = similar.slice(-10).map((i) => ({
          id: i.id,
          description: i.description,
          effect: i.effect?.classification || "UNKNOWN",
          when: i.timeline.applied,
        }));

        // Find successes and failures
        analysis.relatedSuccesses = similar
          .filter((i) => i.effect?.classification?.includes("IMPROVEMENT"))
          .slice(-5)
          .map((i) => ({
            description: i.description,
            improvement: i.effect?.overallScore,
          }));

        analysis.relatedFailures = similar
          .filter(
            (i) =>
              i.effect?.classification?.includes("REGRESSION") ||
              i.status === "ROLLED_BACK",
          )
          .slice(-5)
          .map((i) => ({
            description: i.description,
            reason: i.rollbackReason || i.effect?.summary?.join(", "),
          }));
      }

      // Check for related hypothesis outcomes
      if (this.hypothesisEngine && context.hypothesisType) {
        const history = this.hypothesisEngine.getHypothesisHistory(
          context.hypothesisType,
        );
        analysis.hypothesisHistory = history;
      }
    }

    // Generate warnings based on history
    if (analysis.relatedFailures.length >= 2) {
      analysis.warnings.push({
        level: "HIGH",
        message: `Similar approaches have failed ${analysis.relatedFailures.length} times before`,
      });
    }

    if (analysis.previousAttempts.length === 0) {
      analysis.warnings.push({
        level: "INFO",
        message: "No previous attempts found for this type of intervention",
      });
    }

    // Generate summary
    if (analysis.relatedSuccesses.length > analysis.relatedFailures.length) {
      analysis.summary = `Historical evidence suggests this type of change often succeeds (${analysis.relatedSuccesses.length} successes vs ${analysis.relatedFailures.length} failures)`;
    } else if (
      analysis.relatedFailures.length > analysis.relatedSuccesses.length
    ) {
      analysis.summary = `Historical evidence suggests caution - similar changes have often failed (${analysis.relatedFailures.length} failures vs ${analysis.relatedSuccesses.length} successes)`;
    } else {
      analysis.summary =
        "Mixed historical results - proceed with careful testing";
    }

    return analysis;
  }

  // ==========================================================================
  // STEP 2: CODEBASE STATE CHECK
  // ==========================================================================

  checkCodebaseState(context) {
    const state = {
      checked: true,
      timestamp: new Date().toISOString(),
      currentState: null,
      relevantFilters: [],
      relevantDictionaries: [],
      capabilities: [],
      gaps: [],
    };

    if (this.codebaseAnalyzer) {
      const fullState = this.codebaseAnalyzer.getCurrentState();

      state.currentState = {
        filterCount: fullState.filters?.count || 0,
        dictionaryCount: fullState.dictionaries?.count || 0,
        hash: fullState.summary?.codebaseHash,
      };

      // Find relevant filters for context
      if (context.phiType && fullState.filters?.byType) {
        state.relevantFilters = fullState.filters.byType[context.phiType] || [];
      }

      // Check capabilities
      state.capabilities = fullState.filters?.capabilities || [];

      // Check gaps
      state.gaps = fullState.filters?.gaps || [];
    }

    return state;
  }

  // ==========================================================================
  // STEP 3: SYNTHESIZE INFORMATION
  // ==========================================================================

  synthesizeInformation(type, context, decision) {
    const synthesis = {
      timestamp: new Date().toISOString(),
      inputs: {},
      factors: [],
      overallAssessment: "",
    };

    // Gather inputs from all systems
    synthesis.inputs = {
      history: decision.historyAnalysis?.summary || "No history available",
      codebase: decision.codebaseState?.currentState || {},
      patterns: null,
      insights: null,
      metrics: null,
    };

    // Get pattern information
    if (this.patternRecognizer && context.phiType) {
      const patterns = this.patternRecognizer.getPatternsByPhiType(
        context.phiType,
      );
      synthesis.inputs.patterns = {
        total: patterns.length,
        topFailure:
          patterns.find((p) => p.key.startsWith("failure:"))?.category ||
          "NONE",
      };
    }

    // Get current insights
    if (this.insightGenerator) {
      const insights = this.insightGenerator
        .getActiveInsights()
        .filter(
          (i) => !context.phiType || i.details?.phiType === context.phiType,
        )
        .slice(0, 3);

      synthesis.inputs.insights = insights.map((i) => ({
        type: i.type,
        title: i.title,
        priority: i.priority,
      }));
    }

    // Get current metrics
    if (context.currentMetrics) {
      synthesis.inputs.metrics = context.currentMetrics;
    }

    // Build factors list
    synthesis.factors = this.buildFactors(
      type,
      context,
      synthesis.inputs,
      decision,
    );

    // Generate overall assessment
    const positiveFactors = synthesis.factors.filter(
      (f) => f.direction === "POSITIVE",
    ).length;
    const negativeFactors = synthesis.factors.filter(
      (f) => f.direction === "NEGATIVE",
    ).length;

    if (positiveFactors > negativeFactors + 1) {
      synthesis.overallAssessment =
        "FAVORABLE - Multiple factors support proceeding";
    } else if (negativeFactors > positiveFactors + 1) {
      synthesis.overallAssessment = "CAUTIOUS - Several factors suggest risk";
    } else {
      synthesis.overallAssessment =
        "NEUTRAL - Mixed signals, careful testing recommended";
    }

    return synthesis;
  }

  buildFactors(type, context, inputs, decision) {
    const factors = [];

    // Factor: Historical success rate
    if (decision.historyAnalysis) {
      const successes = decision.historyAnalysis.relatedSuccesses?.length || 0;
      const failures = decision.historyAnalysis.relatedFailures?.length || 0;
      const total = successes + failures;

      if (total > 0) {
        const successRate = successes / total;
        factors.push({
          name: "Historical Success Rate",
          value: `${Math.round(successRate * 100)}%`,
          direction:
            successRate > 0.6
              ? "POSITIVE"
              : successRate < 0.4
                ? "NEGATIVE"
                : "NEUTRAL",
          weight: 0.3,
          explanation: `${successes} successes out of ${total} similar attempts`,
        });
      }
    }

    // Factor: Filter capability coverage
    if (decision.codebaseState) {
      const hasRelevantFilter =
        decision.codebaseState.relevantFilters?.length > 0;
      factors.push({
        name: "Filter Coverage",
        value: hasRelevantFilter ? "EXISTS" : "MISSING",
        direction: hasRelevantFilter ? "POSITIVE" : "NEGATIVE",
        weight: 0.2,
        explanation: hasRelevantFilter
          ? `Filter exists for ${context.phiType}`
          : `No dedicated filter for ${context.phiType}`,
      });
    }

    // Factor: Pattern prevalence
    if (inputs.patterns) {
      const patternCount = inputs.patterns.total;
      factors.push({
        name: "Known Pattern Count",
        value: patternCount,
        direction:
          patternCount > 10
            ? "POSITIVE"
            : patternCount > 3
              ? "NEUTRAL"
              : "NEGATIVE",
        weight: 0.15,
        explanation:
          patternCount > 10
            ? "Many patterns identified - good data for improvement"
            : patternCount > 3
              ? "Some patterns identified"
              : "Few patterns - may need more data",
      });
    }

    // Factor: Active insights
    if (inputs.insights && inputs.insights.length > 0) {
      const hasHighPriority = inputs.insights.some(
        (i) => i.priority === "HIGH" || i.priority === "CRITICAL",
      );
      factors.push({
        name: "Active Insights",
        value: inputs.insights.length,
        direction: hasHighPriority ? "POSITIVE" : "NEUTRAL",
        weight: 0.15,
        explanation: `${inputs.insights.length} relevant insights${hasHighPriority ? " including high priority" : ""}`,
      });
    }

    // Factor: Current performance
    if (inputs.metrics?.sensitivity !== undefined) {
      const sensitivity = inputs.metrics.sensitivity;
      factors.push({
        name: "Current Sensitivity",
        value: `${sensitivity.toFixed(1)}%`,
        direction:
          sensitivity < 95
            ? "NEGATIVE"
            : sensitivity < 98
              ? "NEUTRAL"
              : "POSITIVE",
        weight: 0.2,
        explanation:
          sensitivity < 95
            ? "Below target - improvement needed"
            : sensitivity < 98
              ? "Good but room for improvement"
              : "Excellent - maintain carefully",
      });
    }

    return factors;
  }

  // ==========================================================================
  // STEP 4: BUILD RECOMMENDATION
  // ==========================================================================

  buildRecommendation(type, context, decision) {
    const result = {
      recommendation: null,
      alternatives: [],
      confidence: 0,
      risks: [],
    };

    switch (type) {
      case "WHAT_TO_IMPROVE":
        result.recommendation = this.recommendWhatToImprove(context, decision);
        break;

      case "HOW_TO_FIX":
        result.recommendation = this.recommendHowToFix(context, decision);
        break;

      case "SHOULD_WE_TRY":
        result.recommendation = this.recommendShouldWeTry(context, decision);
        break;

      case "VALIDATE_HYPOTHESIS":
        result.recommendation = this.recommendValidateHypothesis(
          context,
          decision,
        );
        break;

      case "INTERPRET_RESULTS":
        result.recommendation = this.recommendInterpretResults(
          context,
          decision,
        );
        break;

      default:
        result.recommendation = this.buildGenericRecommendation(
          context,
          decision,
        );
    }

    // Calculate confidence
    result.confidence = this.calculateConfidence(decision);

    // Identify risks
    result.risks = this.identifyRisks(context, decision);

    // Build alternatives
    result.alternatives = this.buildAlternatives(type, context, decision);

    return result;
  }

  recommendWhatToImprove(context, decision) {
    const recommendation = {
      type: "FOCUS_AREA",
      summary: "",
      details: [],
      priority: "MEDIUM",
    };

    // Analyze what needs the most improvement
    const insights = this.insightGenerator?.getActiveInsights() || [];
    const critical = insights.filter((i) => i.priority === "CRITICAL");
    const high = insights.filter((i) => i.priority === "HIGH");

    if (critical.length > 0) {
      recommendation.summary = `CRITICAL: Address ${critical[0].title} immediately`;
      recommendation.details = critical.map((i) => i.title);
      recommendation.priority = "CRITICAL";
    } else if (high.length > 0) {
      recommendation.summary = `HIGH PRIORITY: Focus on ${high[0].title}`;
      recommendation.details = high.slice(0, 3).map((i) => i.title);
      recommendation.priority = "HIGH";
    } else {
      // Look at patterns for guidance
      const topPatterns =
        this.patternRecognizer?.getTopFailurePatterns(3) || [];
      if (topPatterns.length > 0) {
        recommendation.summary = `Focus on ${topPatterns[0].category} issues (${topPatterns[0].count} occurrences)`;
        recommendation.details = topPatterns.map(
          (p) => `${p.category}: ${p.count} cases`,
        );
      } else {
        recommendation.summary =
          "No critical issues - consider expanding test coverage";
      }
    }

    return recommendation;
  }

  recommendHowToFix(context, decision) {
    const recommendation = {
      type: "FIX_APPROACH",
      summary: "",
      steps: [],
      estimatedImpact: "UNKNOWN",
      historyNote: "",
    };

    // Check what worked before
    const successes = decision.historyAnalysis?.relatedSuccesses || [];
    if (successes.length > 0) {
      recommendation.historyNote = `Similar approaches that worked: ${successes.map((s) => s.description).join("; ")}`;
    }

    // Build steps based on issue type
    if (context.issueType === "OCR_CONFUSION") {
      recommendation.summary = "Add OCR-tolerant matching";
      recommendation.steps = [
        "Identify common OCR substitution patterns",
        "Add character substitution rules to affected filter",
        "Run A/B test to measure impact",
        "Validate with edge cases",
      ];
      recommendation.estimatedImpact = "MEDIUM";
    } else if (context.issueType === "DICTIONARY_MISS") {
      recommendation.summary = "Expand dictionary coverage";
      recommendation.steps = [
        "Identify missed entries from false negatives",
        "Add entries to appropriate dictionary",
        "Consider enabling fuzzy matching if not already",
        "Run tests to verify improvement",
      ];
      recommendation.estimatedImpact = "HIGH";
    } else {
      recommendation.summary = "General improvement approach";
      recommendation.steps = [
        "Analyze specific failure patterns",
        "Form hypothesis for fix",
        "Create minimal change to test hypothesis",
        "Run A/B experiment",
        "Validate results before committing",
      ];
    }

    return recommendation;
  }

  recommendShouldWeTry(context, decision) {
    const recommendation = {
      type: "GO_NO_GO",
      verdict: "UNKNOWN",
      reasoning: [],
      conditions: [],
    };

    // Check history
    const failures = decision.historyAnalysis?.relatedFailures || [];
    const successes = decision.historyAnalysis?.relatedSuccesses || [];

    if (failures.length > successes.length * 2) {
      recommendation.verdict = "NO";
      recommendation.reasoning.push(
        `Historical data shows ${failures.length} failures vs ${successes.length} successes for similar attempts`,
      );
      recommendation.conditions.push(
        "Would reconsider if: Different approach is taken",
      );
    } else if (decision.synthesis?.overallAssessment?.includes("FAVORABLE")) {
      recommendation.verdict = "YES";
      recommendation.reasoning.push(
        "Multiple positive factors support proceeding",
      );
      recommendation.conditions.push(
        "With proper A/B testing and rollback capability",
      );
    } else {
      recommendation.verdict = "MAYBE";
      recommendation.reasoning.push(
        "Mixed signals - worth testing with caution",
      );
      recommendation.conditions.push("Recommend small-scale test first");
    }

    return recommendation;
  }

  recommendValidateHypothesis(context, decision) {
    const recommendation = {
      type: "HYPOTHESIS_ASSESSMENT",
      worthTesting: false,
      priority: "LOW",
      concerns: [],
      suggestions: [],
    };

    const hypothesis = context.hypothesis;
    if (!hypothesis) {
      recommendation.concerns.push("No hypothesis provided");
      return recommendation;
    }

    // Check if similar hypothesis was tried
    if (
      this.hypothesisEngine?.hasSimilarHypothesis(
        hypothesis.type,
        hypothesis.params,
      )
    ) {
      recommendation.concerns.push(
        "Similar hypothesis already exists or was tested",
      );
    }

    // Check hypothesis history for this type
    const history = this.hypothesisEngine?.getHypothesisHistory(
      hypothesis.type,
    );
    if (history && history.successRate > 0.6) {
      recommendation.worthTesting = true;
      recommendation.priority = "HIGH";
      recommendation.suggestions.push(
        `This type of hypothesis has ${Math.round(history.successRate * 100)}% success rate`,
      );
    } else if (history && history.successRate < 0.3) {
      recommendation.concerns.push(
        `Low historical success rate: ${Math.round(history.successRate * 100)}%`,
      );
      recommendation.suggestions.push("Consider alternative approach");
    } else {
      recommendation.worthTesting = true;
      recommendation.priority = "MEDIUM";
    }

    return recommendation;
  }

  recommendInterpretResults(context, decision) {
    const recommendation = {
      type: "RESULT_INTERPRETATION",
      interpretation: "",
      keyFindings: [],
      nextSteps: [],
    };

    const results = context.results;
    if (!results) {
      recommendation.interpretation = "No results provided";
      return recommendation;
    }

    // Interpret based on metrics
    const sensitivity = results.metrics?.sensitivity || results.sensitivity;
    const specificity = results.metrics?.specificity || results.specificity;

    if (sensitivity >= 99) {
      recommendation.keyFindings.push(
        "Excellent sensitivity - near-perfect PHI detection",
      );
    } else if (sensitivity >= 95) {
      recommendation.keyFindings.push("Good sensitivity - meets HIPAA targets");
    } else if (sensitivity >= 90) {
      recommendation.keyFindings.push(
        "Moderate sensitivity - improvement needed",
      );
      recommendation.nextSteps.push("Analyze false negatives for patterns");
    } else {
      recommendation.keyFindings.push(
        "Low sensitivity - significant PHI being missed",
      );
      recommendation.nextSteps.push(
        "URGENT: Review false negatives immediately",
      );
    }

    // Build interpretation
    recommendation.interpretation = `Results show ${sensitivity?.toFixed(1)}% sensitivity and ${specificity?.toFixed(1)}% specificity. ${recommendation.keyFindings.join(". ")}.`;

    return recommendation;
  }

  buildGenericRecommendation(context, decision) {
    return {
      type: "GENERIC",
      summary: "Consult specific decision type for targeted advice",
      note: "History consultation completed - see historyAnalysis for past attempts",
    };
  }

  calculateConfidence(decision) {
    let confidence = 0.5; // Base confidence

    // History consultation adds confidence
    if (decision.historyConsulted) {
      confidence += 0.15;
    }

    // Codebase state check adds confidence
    if (decision.codebaseStateChecked) {
      confidence += 0.1;
    }

    // Good historical data adds confidence
    const totalHistory =
      (decision.historyAnalysis?.relatedSuccesses?.length || 0) +
      (decision.historyAnalysis?.relatedFailures?.length || 0);
    if (totalHistory >= 5) {
      confidence += 0.1;
    }

    // Strong synthesis assessment adds confidence
    if (
      decision.synthesis?.overallAssessment?.includes("FAVORABLE") ||
      decision.synthesis?.overallAssessment?.includes("CAUTIOUS")
    ) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  identifyRisks(context, decision) {
    const risks = [];

    // Risk: Repeated failures
    const failures = decision.historyAnalysis?.relatedFailures || [];
    if (failures.length >= 2) {
      risks.push({
        level: "MEDIUM",
        description: "Similar approaches have failed before",
        mitigation: "Review why previous attempts failed",
      });
    }

    // Risk: Low historical success rate
    const successes = decision.historyAnalysis?.relatedSuccesses?.length || 0;
    const total = successes + failures.length;
    if (total >= 3 && successes / total < 0.4) {
      risks.push({
        level: "HIGH",
        description: "Historical success rate is low",
        mitigation: "Consider alternative approaches",
      });
    }

    // Risk: Missing codebase capability
    if (context.requiredCapability && decision.codebaseState?.capabilities) {
      if (
        !decision.codebaseState.capabilities.includes(
          context.requiredCapability,
        )
      ) {
        risks.push({
          level: "MEDIUM",
          description: `Required capability ${context.requiredCapability} not present`,
          mitigation: "May need to add capability first",
        });
      }
    }

    return risks;
  }

  buildAlternatives(type, context, decision) {
    const alternatives = [];

    // Suggest alternatives based on history
    const successes = decision.historyAnalysis?.relatedSuccesses || [];
    for (const success of successes.slice(0, 2)) {
      alternatives.push({
        description: success.description,
        reason: "Previously successful approach",
        confidence: 0.7,
      });
    }

    // Type-specific alternatives
    if (type === "HOW_TO_FIX") {
      if (context.issueType !== "DICTIONARY_MISS") {
        alternatives.push({
          description: "Expand dictionary instead of modifying patterns",
          reason: "Often simpler and less risky",
          confidence: 0.6,
        });
      }
      if (context.issueType !== "ADJUST_THRESHOLD") {
        alternatives.push({
          description: "Adjust confidence thresholds",
          reason: "May solve issue without code changes",
          confidence: 0.5,
        });
      }
    }

    return alternatives;
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  getDecision(id) {
    return this.data.decisions.find((d) => d.id === id);
  }

  getRecentDecisions(limit = 10) {
    return this.data.decisions.slice(-limit).reverse();
  }

  getDecisionsByType(type) {
    return this.data.decisions.filter((d) => d.type === type);
  }

  /**
   * Mark whether a recommendation was followed
   */
  recordOutcome(decisionId, outcome) {
    const decision = this.getDecision(decisionId);
    if (decision) {
      decision.outcome = {
        followed: outcome.followed,
        result: outcome.result,
        timestamp: new Date().toISOString(),
      };

      if (outcome.followed) {
        this.data.stats.followed++;
      } else {
        this.data.stats.ignored++;
      }

      this.saveData();
    }
    return decision;
  }

  /**
   * Export for LLM context
   */
  exportForLLM() {
    return {
      stats: this.data.stats,
      recentDecisions: this.getRecentDecisions(3).map((d) => ({
        id: d.id,
        type: d.type,
        summary: d.recommendation?.summary,
        confidence: d.confidence,
        outcome: d.outcome?.result,
      })),
      capabilities: {
        historyConsultation:
          !!this.historyConsultant || !!this.interventionTracker,
        codebaseAnalysis: !!this.codebaseAnalyzer,
        patternRecognition: !!this.patternRecognizer,
        insightGeneration: !!this.insightGenerator,
      },
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  DecisionEngine,
};
