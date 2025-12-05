const { random } = require("../../generators/seeded-random");

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CORTEX - INTERVENTION TRACKER                                        ║
 * ║  Records Every Change and Its Effects                                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * FUNDAMENTAL PRINCIPLE: No change should ever be forgotten.
 *
 * This module maintains an immutable log of:
 *
 * 1. WHAT changed (filter, dictionary, config, code)
 * 2. WHEN it changed (bi-temporal tracking)
 * 3. WHY it changed (linked hypothesis, manual fix, etc.)
 * 4. WHAT HAPPENED after (metrics before/after)
 * 5. WHO/WHAT triggered it (automated, manual, LLM suggestion)
 *
 * INTERVENTION TYPES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * FILTER_MODIFICATION   - Changed filter code or config
 * DICTIONARY_UPDATE     - Added/removed dictionary entries
 * PATTERN_ADDITION      - Added new regex pattern
 * CONFIG_CHANGE         - Modified system configuration
 * THRESHOLD_ADJUSTMENT  - Changed confidence thresholds
 * FEATURE_TOGGLE        - Enabled/disabled a feature
 * ROLLBACK              - Reverted a previous change
 * HOTFIX                - Emergency fix for critical issue
 *
 * CAUSAL CHAIN TRACKING:
 * ─────────────────────────────────────────────────────────────────────────────────
 * Pattern → Hypothesis → Intervention → Effect → Validation
 *
 * We can always trace: "This intervention happened because of this hypothesis,
 * which was formed because of this pattern, and it had this effect."
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PATHS } = require("../core/config");

// ============================================================================
// INTERVENTION TYPES
// ============================================================================

const INTERVENTION_TYPES = {
  FILTER_MODIFICATION: {
    name: "Filter Modification",
    description: "Changes to filter code, patterns, or configuration",
    riskLevel: "MEDIUM",
    requiresRetest: true,
  },
  DICTIONARY_UPDATE: {
    name: "Dictionary Update",
    description: "Adding or removing entries from dictionaries",
    riskLevel: "LOW",
    requiresRetest: true,
  },
  PATTERN_ADDITION: {
    name: "Pattern Addition",
    description: "Adding new regex patterns to filters",
    riskLevel: "MEDIUM",
    requiresRetest: true,
  },
  CONFIG_CHANGE: {
    name: "Configuration Change",
    description: "System configuration modifications",
    riskLevel: "MEDIUM",
    requiresRetest: true,
  },
  THRESHOLD_ADJUSTMENT: {
    name: "Threshold Adjustment",
    description: "Changing confidence or sensitivity thresholds",
    riskLevel: "HIGH",
    requiresRetest: true,
  },
  FEATURE_TOGGLE: {
    name: "Feature Toggle",
    description: "Enabling or disabling features",
    riskLevel: "HIGH",
    requiresRetest: true,
  },
  ROLLBACK: {
    name: "Rollback",
    description: "Reverting to a previous state",
    riskLevel: "LOW",
    requiresRetest: true,
  },
  HOTFIX: {
    name: "Hotfix",
    description: "Emergency fix for critical issues",
    riskLevel: "HIGH",
    requiresRetest: true,
  },
};

// ============================================================================
// INTERVENTION TRACKER CLASS
// ============================================================================

class InterventionTracker {
  constructor(knowledgeBase = null) {
    this.kb = knowledgeBase;
    this.storagePath = path.join(PATHS.knowledge, "interventions.json");
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      }
    } catch (e) {
      console.warn("InterventionTracker: Starting with empty intervention log");
    }
    return {
      interventions: [],
      effects: [],
      causalChains: [],
      stats: {
        totalInterventions: 0,
        successful: 0,
        neutral: 0,
        regressive: 0,
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
  // INTERVENTION RECORDING
  // ==========================================================================

  /**
   * Record a new intervention
   * @param {Object} options
   * @param {string} options.type - Type from INTERVENTION_TYPES
   * @param {string} options.description - Human-readable description
   * @param {Object} options.target - What was changed { file, component, parameter }
   * @param {Object} options.change - The actual change { before, after }
   * @param {string} options.hypothesisId - Linked hypothesis (if any)
   * @param {Object} options.metricsBefore - Metrics before change
   * @param {string} options.triggeredBy - What triggered this: 'automated', 'manual', 'llm'
   */
  recordIntervention(options) {
    const typeInfo = INTERVENTION_TYPES[options.type];
    if (!typeInfo) {
      throw new Error(`Unknown intervention type: ${options.type}`);
    }

    const intervention = {
      id: `INT-${Date.now()}-${random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(), // Required by KB entity schema
      type: options.type,
      typeInfo: {
        name: typeInfo.name,
        riskLevel: typeInfo.riskLevel,
      },
      description: options.description,
      targetedPatterns: options.targetedPatterns || [], // Required by KB entity schema

      // What was changed
      target: {
        file: options.target?.file || null,
        component: options.target?.component || null,
        parameter: options.target?.parameter || null,
        scope: options.target?.scope || "unknown",
      },

      // The actual change
      change: {
        before: options.change?.before || null,
        after: options.change?.after || null,
        diff: this.computeDiff(options.change?.before, options.change?.after),
        hash: this.hashChange(options.change),
      },

      // Links
      hypothesisId: options.hypothesisId || null,
      parentInterventionId: options.parentInterventionId || null,

      // Context
      triggeredBy: options.triggeredBy || "unknown",
      reason: options.reason || "No reason provided",

      // Metrics snapshot
      metricsBefore: options.metricsBefore || null,
      metricsAfter: null, // Filled in later

      // Status tracking
      status: "APPLIED", // APPLIED, TESTED, VALIDATED, REGRESSED, ROLLED_BACK
      requiresRetest: typeInfo.requiresRetest,

      // Timestamps (bi-temporal)
      timeline: {
        applied: new Date().toISOString(),
        tested: null,
        validated: null,
        rolledBack: null,
      },

      // Effect tracking
      effect: null, // Filled in after testing
    };

    // Store in knowledge base if available
    if (this.kb) {
      this.kb.createEntity("Intervention", intervention);

      // Link to hypothesis if present
      if (intervention.hypothesisId) {
        this.kb.createRelation(
          intervention.hypothesisId,
          intervention.id,
          "caused",
        );
      }
    }

    // Add to local storage
    this.data.interventions.push(intervention);
    this.data.stats.totalInterventions++;
    this.saveData();

    return intervention;
  }

  computeDiff(before, after) {
    if (before === null && after === null) return null;
    if (before === null) return { type: "addition", value: after };
    if (after === null) return { type: "removal", value: before };

    if (typeof before === "string" && typeof after === "string") {
      return {
        type: "modification",
        beforeLength: before.length,
        afterLength: after.length,
        sizeDelta: after.length - before.length,
      };
    }

    if (Array.isArray(before) && Array.isArray(after)) {
      const added = after.filter((x) => !before.includes(x));
      const removed = before.filter((x) => !after.includes(x));
      return {
        type: "array_modification",
        added: added.length,
        removed: removed.length,
        delta: added.length - removed.length,
      };
    }

    return {
      type: "value_change",
      beforeType: typeof before,
      afterType: typeof after,
    };
  }

  hashChange(change) {
    const str = JSON.stringify(change || {});
    return crypto.createHash("md5").update(str).digest("hex").substring(0, 12);
  }

  // ==========================================================================
  // EFFECT TRACKING
  // ==========================================================================

  /**
   * Record the effect of an intervention after testing
   * @param {string} interventionId
   * @param {Object} metricsAfter - Metrics after the change
   */
  recordEffect(interventionId, metricsAfter) {
    const intervention = this.getIntervention(interventionId);
    if (!intervention) {
      throw new Error(`Intervention not found: ${interventionId}`);
    }

    // Calculate effect
    const effect = this.calculateEffect(
      intervention.metricsBefore,
      metricsAfter,
    );

    intervention.metricsAfter = metricsAfter;
    intervention.effect = effect;
    intervention.status = "TESTED";
    intervention.timeline.tested = new Date().toISOString();

    // Store effect separately for analysis
    this.data.effects.push({
      interventionId,
      timestamp: new Date().toISOString(),
      ...effect,
    });

    // Update stats
    if (effect.classification === "IMPROVEMENT") {
      this.data.stats.successful++;
    } else if (effect.classification === "REGRESSION") {
      this.data.stats.regressive++;
    } else {
      this.data.stats.neutral++;
    }

    this.saveData();
    return effect;
  }

  calculateEffect(before, after) {
    if (!before || !after) {
      return {
        classification: "UNKNOWN",
        reason: "Missing metrics for comparison",
      };
    }

    const effect = {
      deltas: {},
      summary: [],
      classification: "NEUTRAL",
      overallScore: 0,
    };

    // Calculate deltas for each metric
    const metricsToCompare = [
      { key: "sensitivity", weight: 0.4, higherBetter: true },
      { key: "specificity", weight: 0.2, higherBetter: true },
      { key: "f1Score", weight: 0.15, higherBetter: true },
      { key: "mcc", weight: 0.15, higherBetter: true },
      { key: "falsePositiveRate", weight: 0.05, higherBetter: false },
      { key: "falseNegativeRate", weight: 0.05, higherBetter: false },
    ];

    for (const metric of metricsToCompare) {
      const beforeVal = before[metric.key];
      const afterVal = after[metric.key];

      if (beforeVal !== undefined && afterVal !== undefined) {
        const delta = afterVal - beforeVal;
        const percentChange = beforeVal !== 0 ? (delta / beforeVal) * 100 : 0;

        effect.deltas[metric.key] = {
          before: beforeVal,
          after: afterVal,
          delta,
          percentChange,
        };

        // Score contribution
        const improvement = metric.higherBetter ? delta : -delta;
        effect.overallScore += improvement * metric.weight;

        // Summary
        if (Math.abs(delta) > 0.1) {
          const direction = delta > 0 ? "increased" : "decreased";
          const goodBad =
            delta > 0 === metric.higherBetter ? "improved" : "worsened";
          effect.summary.push(
            `${metric.key} ${direction} by ${Math.abs(delta).toFixed(2)} (${goodBad})`,
          );
        }
      }
    }

    // Classify overall effect
    if (effect.overallScore > 0.5) {
      effect.classification = "SIGNIFICANT_IMPROVEMENT";
    } else if (effect.overallScore > 0.1) {
      effect.classification = "IMPROVEMENT";
    } else if (effect.overallScore < -0.5) {
      effect.classification = "SIGNIFICANT_REGRESSION";
    } else if (effect.overallScore < -0.1) {
      effect.classification = "REGRESSION";
    } else {
      effect.classification = "NEUTRAL";
    }

    return effect;
  }

  // ==========================================================================
  // VALIDATION AND ROLLBACK
  // ==========================================================================

  /**
   * Mark an intervention as validated (confirmed good)
   */
  validateIntervention(interventionId) {
    const intervention = this.getIntervention(interventionId);
    if (!intervention)
      throw new Error(`Intervention not found: ${interventionId}`);

    intervention.status = "VALIDATED";
    intervention.timeline.validated = new Date().toISOString();

    this.saveData();
    return intervention;
  }

  /**
   * Mark an intervention as needing rollback
   */
  markForRollback(interventionId, reason) {
    const intervention = this.getIntervention(interventionId);
    if (!intervention)
      throw new Error(`Intervention not found: ${interventionId}`);

    intervention.status = "NEEDS_ROLLBACK";
    intervention.rollbackReason = reason;

    this.saveData();
    return intervention;
  }

  /**
   * Record a rollback
   */
  recordRollback(interventionId, rollbackDetails) {
    const original = this.getIntervention(interventionId);
    if (!original) throw new Error(`Intervention not found: ${interventionId}`);

    // Record the rollback as a new intervention
    const rollback = this.recordIntervention({
      type: "ROLLBACK",
      description: `Rollback of ${original.description}`,
      target: original.target,
      change: {
        before: original.change.after,
        after: original.change.before,
      },
      parentInterventionId: interventionId,
      triggeredBy: rollbackDetails.triggeredBy || "automated",
      reason: rollbackDetails.reason || "Performance regression",
    });

    // Update original intervention
    original.status = "ROLLED_BACK";
    original.timeline.rolledBack = new Date().toISOString();
    original.rollbackId = rollback.id;

    this.saveData();

    return { original, rollback };
  }

  // ==========================================================================
  // CAUSAL CHAIN TRACKING
  // ==========================================================================

  /**
   * Record a causal chain: Pattern → Hypothesis → Intervention → Effect
   */
  recordCausalChain(chain) {
    const causalChain = {
      id: `CHAIN-${Date.now()}`,
      timestamp: new Date().toISOString(),
      patternId: chain.patternId || null,
      hypothesisId: chain.hypothesisId || null,
      interventionId: chain.interventionId || null,
      effectId: chain.effectId || null,
      outcome: chain.outcome || "PENDING", // SUCCESS, FAILURE, PARTIAL
      notes: chain.notes || "",
    };

    this.data.causalChains.push(causalChain);
    this.saveData();

    // Also record in knowledge base
    if (this.kb && chain.hypothesisId && chain.interventionId) {
      this.kb.createRelation(
        chain.hypothesisId,
        chain.interventionId,
        "caused",
      );

      if (chain.effectId) {
        if (chain.outcome === "SUCCESS") {
          this.kb.createRelation(
            chain.interventionId,
            chain.effectId,
            "improved",
          );
        } else if (chain.outcome === "FAILURE") {
          this.kb.createRelation(
            chain.interventionId,
            chain.effectId,
            "regressed",
          );
        }
      }
    }

    return causalChain;
  }

  /**
   * Get the full causal chain for an intervention
   */
  getCausalChain(interventionId) {
    const intervention = this.getIntervention(interventionId);
    if (!intervention) return null;

    const chain = {
      intervention,
      hypothesis: null,
      patterns: [],
      effects: [],
      children: [],
    };

    // Find linked hypothesis
    if (intervention.hypothesisId && this.kb) {
      chain.hypothesis = this.kb.getEntity(intervention.hypothesisId);
    }

    // Find effects
    chain.effects = this.data.effects.filter(
      (e) => e.interventionId === interventionId,
    );

    // Find child interventions (rollbacks, follow-ups)
    chain.children = this.data.interventions.filter(
      (i) => i.parentInterventionId === interventionId,
    );

    return chain;
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  getIntervention(id) {
    return this.data.interventions.find((i) => i.id === id);
  }

  getInterventionsByType(type) {
    return this.data.interventions.filter((i) => i.type === type);
  }

  getInterventionsByStatus(status) {
    return this.data.interventions.filter((i) => i.status === status);
  }

  getInterventionsByTarget(target) {
    return this.data.interventions.filter((i) => {
      if (target.file && i.target.file !== target.file) return false;
      if (target.component && i.target.component !== target.component)
        return false;
      return true;
    });
  }

  /**
   * Get recent interventions
   */
  getRecentInterventions(limit = 10) {
    return this.data.interventions.slice(-limit).reverse();
  }

  /**
   * Get interventions that caused regressions
   */
  getRegressiveInterventions() {
    return this.data.interventions.filter(
      (i) =>
        i.effect?.classification === "REGRESSION" ||
        i.effect?.classification === "SIGNIFICANT_REGRESSION" ||
        i.status === "ROLLED_BACK",
    );
  }

  /**
   * Get successful interventions (for learning)
   */
  getSuccessfulInterventions() {
    return this.data.interventions.filter(
      (i) =>
        i.effect?.classification === "IMPROVEMENT" ||
        i.effect?.classification === "SIGNIFICANT_IMPROVEMENT" ||
        i.status === "VALIDATED",
    );
  }

  /**
   * Get interventions pending testing
   */
  getPendingTesting() {
    return this.data.interventions.filter(
      (i) => i.status === "APPLIED" && i.requiresRetest,
    );
  }

  /**
   * Get intervention history for a specific component
   */
  getComponentHistory(component) {
    return this.data.interventions
      .filter((i) => i.target.component === component)
      .sort(
        (a, b) => new Date(a.timeline.applied) - new Date(b.timeline.applied),
      );
  }

  /**
   * Check if we've seen similar intervention before and what happened
   */
  findSimilarInterventions(type, target) {
    return this.data.interventions
      .filter((i) => {
        if (i.type !== type) return false;
        if (target.component && i.target.component !== target.component)
          return false;
        return true;
      })
      .map((i) => ({
        id: i.id,
        description: i.description,
        effect: i.effect?.classification || "UNKNOWN",
        timestamp: i.timeline.applied,
      }));
  }

  // ==========================================================================
  // ANALYSIS METHODS
  // ==========================================================================

  /**
   * Get statistics about interventions
   */
  getStats() {
    return {
      ...this.data.stats,
      successRate:
        this.data.stats.totalInterventions > 0
          ? this.data.stats.successful / this.data.stats.totalInterventions
          : 0,
      regressionRate:
        this.data.stats.totalInterventions > 0
          ? this.data.stats.regressive / this.data.stats.totalInterventions
          : 0,
      pendingTesting: this.getPendingTesting().length,
    };
  }

  /**
   * Get intervention trends over time
   */
  getInterventionTrends(days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recent = this.data.interventions.filter(
      (i) => new Date(i.timeline.applied).getTime() > cutoff,
    );

    // Group by day
    const byDay = {};
    for (const intervention of recent) {
      const day = intervention.timeline.applied.split("T")[0];
      if (!byDay[day]) {
        byDay[day] = { total: 0, successful: 0, regressive: 0 };
      }
      byDay[day].total++;
      if (intervention.effect?.classification?.includes("IMPROVEMENT")) {
        byDay[day].successful++;
      } else if (intervention.effect?.classification?.includes("REGRESSION")) {
        byDay[day].regressive++;
      }
    }

    return {
      days: Object.keys(byDay).sort(),
      data: byDay,
      totalInPeriod: recent.length,
    };
  }

  /**
   * Export for LLM context
   */
  exportForLLM() {
    return {
      stats: this.getStats(),
      recentInterventions: this.getRecentInterventions(5).map((i) => ({
        id: i.id,
        type: i.type,
        description: i.description,
        effect: i.effect?.classification || "PENDING",
        status: i.status,
      })),
      successfulApproaches: this.getSuccessfulInterventions()
        .slice(-5)
        .map((i) => ({
          type: i.type,
          description: i.description,
          improvement: i.effect?.overallScore,
        })),
      failedApproaches: this.getRegressiveInterventions()
        .slice(-5)
        .map((i) => ({
          type: i.type,
          description: i.description,
          reason: i.rollbackReason || i.effect?.summary?.join(", "),
        })),
      pendingTesting: this.getPendingTesting().length,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  InterventionTracker,
  INTERVENTION_TYPES,
};
