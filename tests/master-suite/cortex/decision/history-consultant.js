/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CORTEX - HISTORY CONSULTANT                                          ║
 * ║  The Mandatory Oracle That Knows What Was Tried Before                        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * "Those who cannot remember the past are condemned to repeat it."
 *
 * This module is the MANDATORY checkpoint before any decision is made.
 * It searches through ALL historical data to answer:
 *
 * - Has this exact thing been tried before?
 * - What similar things have been tried?
 * - What happened in each case?
 * - What patterns emerge from history?
 * - What should we learn from past attempts?
 *
 * DATA SOURCES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - InterventionTracker: All code/config changes and their effects
 * - HypothesisEngine: All hypotheses proposed, tested, validated/invalidated
 * - KnowledgeBase: Entities, relations, temporal data
 * - PatternRecognizer: Recurring failure/success patterns
 * - ExperimentRunner: Experiment outcomes
 *
 * OUTPUT:
 * ─────────────────────────────────────────────────────────────────────────────────
 * Comprehensive historical report including:
 * - Exact matches (tried this exact thing before)
 * - Similar attempts (tried something like this)
 * - Success rate for this type of intervention
 * - Warnings from past failures
 * - Recommendations based on what worked
 */

const fs = require('fs');
const path = require('path');
const { PATHS } = require('../core/config');

// ============================================================================
// HISTORY CONSULTANT CLASS
// ============================================================================

class HistoryConsultant {
  constructor(options = {}) {
    // Connect to all historical data sources
    this.knowledgeBase = options.knowledgeBase || null;
    this.interventionTracker = options.interventionTracker || null;
    this.hypothesisEngine = options.hypothesisEngine || null;
    this.patternRecognizer = options.patternRecognizer || null;
    this.experimentRunner = options.experimentRunner || null;

    this.storagePath = path.join(PATHS.knowledge, 'history-consultations.json');
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
      }
    } catch (e) {
      // Fresh start
    }
    return {
      consultations: [],
      stats: {
        total: 0,
        foundRelevantHistory: 0,
        noHistoryFound: 0
      }
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
  // MAIN CONSULTATION INTERFACE
  // ==========================================================================

  /**
   * Consult history for a decision
   * @param {string} decisionType - Type of decision being made
   * @param {Object} context - Context for the lookup
   */
  async consult(decisionType, context) {
    const consultation = {
      id: `CONSULT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      decisionType,
      context: this.sanitizeContext(context),

      // Results
      exactMatches: [],
      similarAttempts: [],
      relatedSuccesses: [],
      relatedFailures: [],
      patterns: [],
      warnings: [],
      recommendations: [],

      // Summary
      summary: '',
      confidence: 0,
      dataQuality: 'UNKNOWN'
    };

    // Search all sources
    consultation.exactMatches = this.findExactMatches(context);
    consultation.similarAttempts = this.findSimilarAttempts(context);
    consultation.relatedSuccesses = this.findRelatedSuccesses(context);
    consultation.relatedFailures = this.findRelatedFailures(context);
    consultation.patterns = this.findRelevantPatterns(context);

    // Generate warnings based on findings
    consultation.warnings = this.generateWarnings(consultation);

    // Generate recommendations
    consultation.recommendations = this.generateRecommendations(consultation);

    // Generate summary
    consultation.summary = this.generateSummary(consultation);

    // Assess data quality and confidence
    consultation.dataQuality = this.assessDataQuality(consultation);
    consultation.confidence = this.calculateConfidence(consultation);

    // Record this consultation
    this.data.consultations.push({
      id: consultation.id,
      timestamp: consultation.timestamp,
      decisionType,
      foundHistory: consultation.exactMatches.length + consultation.similarAttempts.length > 0
    });
    this.data.stats.total++;
    if (consultation.exactMatches.length + consultation.similarAttempts.length > 0) {
      this.data.stats.foundRelevantHistory++;
    } else {
      this.data.stats.noHistoryFound++;
    }
    this.saveData();

    return consultation;
  }

  sanitizeContext(context) {
    // Remove functions and circular references
    const clean = {};
    for (const [key, value] of Object.entries(context || {})) {
      if (typeof value !== 'function') {
        try {
          JSON.stringify(value);
          clean[key] = value;
        } catch (e) {
          clean[key] = String(value);
        }
      }
    }
    return clean;
  }

  // ==========================================================================
  // SEARCH METHODS
  // ==========================================================================

  findExactMatches(context) {
    const matches = [];

    // Check interventions for exact matches
    if (this.interventionTracker && context.description) {
      const interventions = this.interventionTracker.data.interventions || [];
      for (const intervention of interventions) {
        if (this.isExactMatch(intervention, context)) {
          matches.push({
            source: 'INTERVENTION',
            id: intervention.id,
            description: intervention.description,
            timestamp: intervention.timeline?.applied,
            outcome: intervention.effect?.classification || intervention.status,
            details: {
              type: intervention.type,
              effect: intervention.effect
            }
          });
        }
      }
    }

    // Check hypotheses for exact matches
    if (this.hypothesisEngine && context.hypothesisType) {
      const hypotheses = this.hypothesisEngine.data.hypotheses || [];
      for (const hypothesis of hypotheses) {
        if (hypothesis.type === context.hypothesisType &&
            this.paramsMatch(hypothesis.params, context)) {
          matches.push({
            source: 'HYPOTHESIS',
            id: hypothesis.id,
            description: hypothesis.description,
            timestamp: hypothesis.timeline?.proposed,
            outcome: hypothesis.status,
            details: {
              type: hypothesis.type,
              validation: hypothesis.validation
            }
          });
        }
      }
    }

    return matches.slice(0, 10);  // Limit results
  }

  findSimilarAttempts(context) {
    const similar = [];
    const similarity_threshold = 0.6;

    // Check interventions for similar attempts
    if (this.interventionTracker) {
      const interventions = this.interventionTracker.data.interventions || [];
      for (const intervention of interventions) {
        const similarity = this.calculateSimilarity(intervention, context);
        if (similarity >= similarity_threshold && !this.isExactMatch(intervention, context)) {
          similar.push({
            source: 'INTERVENTION',
            id: intervention.id,
            description: intervention.description,
            timestamp: intervention.timeline?.applied,
            outcome: intervention.effect?.classification || intervention.status,
            similarity,
            relevantBecause: this.explainSimilarity(intervention, context)
          });
        }
      }
    }

    // Check experiments for similar attempts
    if (this.experimentRunner) {
      const experiments = this.experimentRunner.data.experiments || [];
      for (const experiment of experiments) {
        const similarity = this.calculateExperimentSimilarity(experiment, context);
        if (similarity >= similarity_threshold) {
          similar.push({
            source: 'EXPERIMENT',
            id: experiment.id,
            description: experiment.name,
            timestamp: experiment.timeline?.created,
            outcome: experiment.conclusion?.accepted ? 'ACCEPTED' : 'REJECTED',
            similarity,
            relevantBecause: `Treatment: ${experiment.treatment?.description}`
          });
        }
      }
    }

    // Sort by similarity
    similar.sort((a, b) => b.similarity - a.similarity);
    return similar.slice(0, 15);
  }

  findRelatedSuccesses(context) {
    const successes = [];

    // Successful interventions
    if (this.interventionTracker) {
      const successful = this.interventionTracker.getSuccessfulInterventions();
      for (const intervention of successful) {
        if (this.isRelated(intervention, context)) {
          successes.push({
            source: 'INTERVENTION',
            description: intervention.description,
            improvement: intervention.effect?.overallScore,
            type: intervention.type,
            timestamp: intervention.timeline?.applied
          });
        }
      }
    }

    // Validated hypotheses
    if (this.hypothesisEngine) {
      const validated = this.hypothesisEngine.getValidatedHypotheses();
      for (const hypothesis of validated) {
        if (this.isRelated(hypothesis, context)) {
          successes.push({
            source: 'HYPOTHESIS',
            description: hypothesis.description,
            improvement: hypothesis.results?.actualChange,
            type: hypothesis.type,
            timestamp: hypothesis.timeline?.completed
          });
        }
      }
    }

    return successes.slice(0, 10);
  }

  findRelatedFailures(context) {
    const failures = [];

    // Failed/rolled back interventions
    if (this.interventionTracker) {
      const regressive = this.interventionTracker.getRegressiveInterventions();
      for (const intervention of regressive) {
        if (this.isRelated(intervention, context)) {
          failures.push({
            source: 'INTERVENTION',
            description: intervention.description,
            reason: intervention.rollbackReason || intervention.effect?.summary?.join(', '),
            type: intervention.type,
            timestamp: intervention.timeline?.applied
          });
        }
      }
    }

    // Invalidated hypotheses
    if (this.hypothesisEngine) {
      const invalidated = this.hypothesisEngine.data.hypotheses.filter(h =>
        h.status === 'INVALIDATED'
      );
      for (const hypothesis of invalidated) {
        if (this.isRelated(hypothesis, context)) {
          failures.push({
            source: 'HYPOTHESIS',
            description: hypothesis.description,
            reason: hypothesis.validation?.explanation,
            type: hypothesis.type,
            timestamp: hypothesis.timeline?.completed
          });
        }
      }
    }

    return failures.slice(0, 10);
  }

  findRelevantPatterns(context) {
    const patterns = [];

    if (this.patternRecognizer) {
      // Get patterns for specific PHI type if provided
      if (context.phiType) {
        const typePatterns = this.patternRecognizer.getPatternsByPhiType(context.phiType);
        for (const pattern of typePatterns) {
          patterns.push({
            category: pattern.category,
            phiType: pattern.phiType,
            count: pattern.count,
            trend: 'UNKNOWN'  // Would need temporal analysis
          });
        }
      }

      // Get top failure patterns
      const topFailures = this.patternRecognizer.getTopFailurePatterns(5);
      for (const pattern of topFailures) {
        if (!patterns.find(p => p.category === pattern.category)) {
          patterns.push({
            category: pattern.category,
            count: pattern.count,
            examples: pattern.examples?.slice(0, 2)
          });
        }
      }
    }

    return patterns;
  }

  // ==========================================================================
  // MATCHING AND SIMILARITY
  // ==========================================================================

  isExactMatch(item, context) {
    // Check if this is the exact same thing
    if (context.description && item.description) {
      return item.description.toLowerCase() === context.description.toLowerCase();
    }
    if (context.phiType && item.target?.component) {
      return item.target.component === context.phiType;
    }
    return false;
  }

  paramsMatch(params1, params2) {
    if (!params1 || !params2) return false;
    const keys1 = Object.keys(params1);
    const keys2 = Object.keys(params2);
    const common = keys1.filter(k => keys2.includes(k));
    if (common.length === 0) return false;

    let matches = 0;
    for (const key of common) {
      if (params1[key] === params2[key]) matches++;
    }
    return matches / common.length >= 0.7;
  }

  calculateSimilarity(item, context) {
    let score = 0;
    let factors = 0;

    // Type match
    if (context.type && item.type) {
      score += item.type === context.type ? 1 : 0;
      factors++;
    }

    // PHI type match
    if (context.phiType) {
      if (item.target?.component === context.phiType) {
        score += 1;
      } else if (item.description?.toLowerCase().includes(context.phiType.toLowerCase())) {
        score += 0.5;
      }
      factors++;
    }

    // Description similarity (simple word overlap)
    if (context.description && item.description) {
      const words1 = context.description.toLowerCase().split(/\s+/);
      const words2 = item.description.toLowerCase().split(/\s+/);
      const common = words1.filter(w => words2.includes(w)).length;
      score += common / Math.max(words1.length, words2.length);
      factors++;
    }

    // Category match
    if (context.category && item.category) {
      score += item.category === context.category ? 1 : 0;
      factors++;
    }

    return factors > 0 ? score / factors : 0;
  }

  calculateExperimentSimilarity(experiment, context) {
    let score = 0;

    if (context.description && experiment.treatment?.description) {
      const words1 = context.description.toLowerCase().split(/\s+/);
      const words2 = experiment.treatment.description.toLowerCase().split(/\s+/);
      const common = words1.filter(w => words2.includes(w)).length;
      score = common / Math.max(words1.length, words2.length);
    }

    if (context.phiType && experiment.treatment?.description?.includes(context.phiType)) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  isRelated(item, context) {
    // Check if item is related to the context
    if (context.phiType) {
      if (item.target?.component === context.phiType) return true;
      if (item.params?.phiType === context.phiType) return true;
      if (item.description?.toLowerCase().includes(context.phiType.toLowerCase())) return true;
    }

    if (context.type && item.type === context.type) return true;
    if (context.category && item.category === context.category) return true;

    return false;
  }

  explainSimilarity(item, context) {
    const reasons = [];

    if (context.phiType && item.description?.toLowerCase().includes(context.phiType.toLowerCase())) {
      reasons.push(`Also targets ${context.phiType}`);
    }
    if (context.type && item.type === context.type) {
      reasons.push(`Same intervention type: ${context.type}`);
    }

    return reasons.join('; ') || 'General similarity';
  }

  // ==========================================================================
  // ANALYSIS AND RECOMMENDATIONS
  // ==========================================================================

  generateWarnings(consultation) {
    const warnings = [];

    // Warning: Repeated failures
    if (consultation.relatedFailures.length >= 2) {
      warnings.push({
        level: 'HIGH',
        message: `${consultation.relatedFailures.length} similar attempts have failed before`,
        details: consultation.relatedFailures.slice(0, 2).map(f => f.reason)
      });
    }

    // Warning: Exact match with bad outcome
    const badExact = consultation.exactMatches.filter(m =>
      m.outcome === 'REGRESSION' || m.outcome === 'INVALIDATED' || m.outcome === 'ROLLED_BACK'
    );
    if (badExact.length > 0) {
      warnings.push({
        level: 'CRITICAL',
        message: 'This EXACT approach was tried before and failed',
        details: badExact.map(m => ({ id: m.id, outcome: m.outcome }))
      });
    }

    // Warning: Low success rate
    const total = consultation.relatedSuccesses.length + consultation.relatedFailures.length;
    if (total >= 3) {
      const successRate = consultation.relatedSuccesses.length / total;
      if (successRate < 0.4) {
        warnings.push({
          level: 'MEDIUM',
          message: `Low historical success rate: ${Math.round(successRate * 100)}%`,
          details: `${consultation.relatedSuccesses.length} successes, ${consultation.relatedFailures.length} failures`
        });
      }
    }

    // Warning: Pattern indicates known problem
    const problematicPatterns = consultation.patterns.filter(p => p.count >= 10);
    if (problematicPatterns.length > 0) {
      warnings.push({
        level: 'INFO',
        message: 'Known recurring patterns in this area',
        details: problematicPatterns.map(p => `${p.category}: ${p.count} occurrences`)
      });
    }

    return warnings;
  }

  generateRecommendations(consultation) {
    const recommendations = [];

    // Recommend based on successes
    if (consultation.relatedSuccesses.length > 0) {
      const topSuccess = consultation.relatedSuccesses[0];
      recommendations.push({
        priority: 'HIGH',
        action: `Consider approach similar to: ${topSuccess.description}`,
        reason: `Previously successful with ${topSuccess.improvement?.toFixed(2) || 'positive'} improvement`
      });
    }

    // Recommend avoiding failure patterns
    if (consultation.relatedFailures.length >= 2) {
      const commonFailure = this.findCommonPattern(consultation.relatedFailures);
      if (commonFailure) {
        recommendations.push({
          priority: 'HIGH',
          action: `Avoid ${commonFailure} - multiple failures`,
          reason: `${consultation.relatedFailures.length} similar attempts failed`
        });
      }
    }

    // Recommend based on patterns
    if (consultation.patterns.length > 0) {
      const topPattern = consultation.patterns[0];
      recommendations.push({
        priority: 'MEDIUM',
        action: `Address ${topPattern.category} pattern first`,
        reason: `${topPattern.count} occurrences identified`
      });
    }

    return recommendations;
  }

  findCommonPattern(failures) {
    const types = {};
    for (const f of failures) {
      types[f.type] = (types[f.type] || 0) + 1;
    }
    const sorted = Object.entries(types).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }

  generateSummary(consultation) {
    const parts = [];

    // Exact matches
    if (consultation.exactMatches.length > 0) {
      const outcomes = consultation.exactMatches.map(m => m.outcome);
      parts.push(`Found ${consultation.exactMatches.length} exact match(es) with outcomes: ${[...new Set(outcomes)].join(', ')}`);
    }

    // Similar attempts
    if (consultation.similarAttempts.length > 0) {
      parts.push(`Found ${consultation.similarAttempts.length} similar past attempts`);
    }

    // Success/failure ratio
    const successes = consultation.relatedSuccesses.length;
    const failures = consultation.relatedFailures.length;
    if (successes + failures > 0) {
      const rate = Math.round((successes / (successes + failures)) * 100);
      parts.push(`Historical success rate: ${rate}% (${successes} successes, ${failures} failures)`);
    }

    // Warnings count
    if (consultation.warnings.length > 0) {
      const critical = consultation.warnings.filter(w => w.level === 'CRITICAL').length;
      const high = consultation.warnings.filter(w => w.level === 'HIGH').length;
      if (critical > 0) {
        parts.push(`⚠️ ${critical} CRITICAL warning(s)`);
      } else if (high > 0) {
        parts.push(`⚠️ ${high} HIGH priority warning(s)`);
      }
    }

    if (parts.length === 0) {
      return 'No relevant historical data found for this context';
    }

    return parts.join('. ') + '.';
  }

  assessDataQuality(consultation) {
    const totalData = consultation.exactMatches.length +
                     consultation.similarAttempts.length +
                     consultation.relatedSuccesses.length +
                     consultation.relatedFailures.length;

    if (totalData >= 10) return 'HIGH';
    if (totalData >= 5) return 'MEDIUM';
    if (totalData >= 1) return 'LOW';
    return 'NONE';
  }

  calculateConfidence(consultation) {
    let confidence = 0.3;  // Base

    // More data = more confidence
    const dataQuality = consultation.dataQuality;
    if (dataQuality === 'HIGH') confidence += 0.4;
    else if (dataQuality === 'MEDIUM') confidence += 0.25;
    else if (dataQuality === 'LOW') confidence += 0.1;

    // Exact matches are very informative
    if (consultation.exactMatches.length > 0) confidence += 0.2;

    // Consistent outcomes increase confidence
    const successes = consultation.relatedSuccesses.length;
    const failures = consultation.relatedFailures.length;
    if (successes + failures >= 3) {
      const rate = successes / (successes + failures);
      if (rate >= 0.8 || rate <= 0.2) confidence += 0.1;  // Clear pattern
    }

    return Math.min(confidence, 0.95);
  }

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  exportForLLM() {
    return {
      stats: this.data.stats,
      dataSources: {
        interventions: !!this.interventionTracker,
        hypotheses: !!this.hypothesisEngine,
        patterns: !!this.patternRecognizer,
        experiments: !!this.experimentRunner,
        knowledge: !!this.knowledgeBase
      }
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  HistoryConsultant
};
