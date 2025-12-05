/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CORTEX - INSIGHT GENERATOR                                           ║
 * ║  Synthesizes Knowledge into Actionable Intelligence                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * This is the "wisdom" layer that sits above raw data and patterns.
 *
 * It answers questions like:
 * - "What should we focus on to improve the most?"
 * - "What patterns keep repeating that we should address?"
 * - "What worked before in similar situations?"
 * - "What's the current health of the system?"
 * - "Where are we trending - better or worse?"
 *
 * INSIGHT CATEGORIES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * OPPORTUNITY      - "You could improve X by doing Y"
 * WARNING          - "X is getting worse, consider Y"
 * SUCCESS          - "X worked well, consider expanding to Y"
 * CORRELATION      - "When X happens, Y usually follows"
 * TREND            - "X has been increasing/decreasing over time"
 * RECOMMENDATION   - "Based on history, we recommend X"
 *
 * INSIGHT PRIORITY:
 * ─────────────────────────────────────────────────────────────────────────────────
 * CRITICAL   - Immediate attention required (regressions, failures)
 * HIGH       - Should address soon (significant opportunities)
 * MEDIUM     - Worth considering (moderate improvements)
 * LOW        - Nice to have (minor optimizations)
 * INFO       - Informational only (trends, stats)
 */

const fs = require('fs');
const path = require('path');
const { PATHS } = require('../core/config');

// ============================================================================
// INSIGHT TYPES
// ============================================================================

const INSIGHT_TYPES = {
  OPPORTUNITY: {
    name: 'Improvement Opportunity',
    icon: '💡',
    actionable: true
  },
  WARNING: {
    name: 'Warning',
    icon: '⚠️',
    actionable: true
  },
  SUCCESS: {
    name: 'Success Pattern',
    icon: '✅',
    actionable: false
  },
  CORRELATION: {
    name: 'Correlation Found',
    icon: '🔗',
    actionable: false
  },
  TREND: {
    name: 'Trend Detected',
    icon: '📈',
    actionable: false
  },
  RECOMMENDATION: {
    name: 'Recommendation',
    icon: '🎯',
    actionable: true
  },
  ANOMALY: {
    name: 'Anomaly Detected',
    icon: '🔍',
    actionable: true
  }
};

// ============================================================================
// INSIGHT GENERATOR CLASS
// ============================================================================

class InsightGenerator {
  constructor(options = {}) {
    this.kb = options.knowledgeBase || null;
    this.patternRecognizer = options.patternRecognizer || null;
    this.hypothesisEngine = options.hypothesisEngine || null;
    this.interventionTracker = options.interventionTracker || null;
    this.metricsEngine = options.metricsEngine || null;
    this.temporalIndex = options.temporalIndex || null;

    this.storagePath = path.join(PATHS.knowledge, 'insights.json');
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
      }
    } catch (e) {
      console.warn('InsightGenerator: Starting with empty insight database');
    }
    return {
      insights: [],
      dismissed: [],
      acted: [],
      stats: {
        generated: 0,
        acted: 0,
        dismissed: 0
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
  // INSIGHT GENERATION
  // ==========================================================================

  /**
   * Generate all insights from current system state
   * This is the main entry point
   */
  generateInsights() {
    const insights = [];
    const timestamp = new Date().toISOString();

    // 1. Analyze patterns for opportunities
    if (this.patternRecognizer) {
      insights.push(...this.generatePatternInsights());
    }

    // 2. Analyze hypothesis history for success patterns
    if (this.hypothesisEngine) {
      insights.push(...this.generateHypothesisInsights());
    }

    // 3. Analyze intervention history for warnings and correlations
    if (this.interventionTracker) {
      insights.push(...this.generateInterventionInsights());
    }

    // 4. Analyze metrics for trends
    if (this.temporalIndex) {
      insights.push(...this.generateTrendInsights());
    }

    // 5. Generate recommendations based on all data
    insights.push(...this.generateRecommendations());

    // Deduplicate and rank
    const ranked = this.rankInsights(insights);

    // Store new insights
    for (const insight of ranked) {
      if (!this.isDuplicate(insight)) {
        insight.id = `INS-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        insight.timestamp = timestamp;
        insight.status = 'NEW';
        this.data.insights.push(insight);
        this.data.stats.generated++;
      }
    }

    this.saveData();

    // Return active (non-dismissed) insights
    return this.getActiveInsights();
  }

  // ==========================================================================
  // PATTERN-BASED INSIGHTS
  // ==========================================================================

  generatePatternInsights() {
    const insights = [];

    try {
      const topFailures = this.patternRecognizer.getTopFailurePatterns(10);
      const trending = this.patternRecognizer.getTrendingPatterns();

      // Generate insights from top failure patterns
      for (const failure of topFailures) {
        if (failure.count >= 5) {
          insights.push({
            type: 'OPPORTUNITY',
            priority: failure.count >= 20 ? 'HIGH' : 'MEDIUM',
            title: `Recurring ${failure.category} Issues`,
            description: `${failure.count} failures due to ${failure.category.toLowerCase().replace(/_/g, ' ')} in ${failure.phiType} detection`,
            details: {
              category: failure.category,
              phiType: failure.phiType,
              count: failure.count,
              examples: failure.examples
            },
            action: this.getActionForPattern(failure.category),
            confidence: Math.min(0.5 + (failure.count * 0.02), 0.95)
          });
        }
      }

      // Generate insights from trending patterns
      for (const trend of trending) {
        insights.push({
          type: 'WARNING',
          priority: 'HIGH',
          title: `Increasing ${trend.category} Failures`,
          description: `${trend.category} failures have increased ${trend.change} recently`,
          details: {
            category: trend.category,
            recentCount: trend.recentCount,
            trend: trend.trend
          },
          action: `Investigate and address ${trend.category.toLowerCase().replace(/_/g, ' ')} issues immediately`,
          confidence: 0.8
        });
      }
    } catch (e) {
      // Pattern recognizer not fully initialized
    }

    return insights;
  }

  getActionForPattern(category) {
    const actions = {
      OCR_CONFUSION: 'Add OCR-tolerant patterns or character substitution rules',
      CASE_VARIATION: 'Enable case-insensitive matching for affected filters',
      FORMAT_VARIATION: 'Extend regex patterns to handle additional formats',
      DICTIONARY_MISS: 'Expand dictionaries with missing entries or enable fuzzy matching',
      CONTEXT_DEPENDENT: 'Add context-aware rules for better identification',
      BOUNDARY_ERROR: 'Improve boundary detection in regex patterns',
      FALSE_POSITIVE: 'Add exclusion rules to reduce over-matching'
    };
    return actions[category] || 'Review and address pattern coverage';
  }

  // ==========================================================================
  // HYPOTHESIS-BASED INSIGHTS
  // ==========================================================================

  generateHypothesisInsights() {
    const insights = [];

    try {
      const stats = this.hypothesisEngine.data.stats;
      const validated = this.hypothesisEngine.getValidatedHypotheses();
      const proposed = this.hypothesisEngine.getRecommendedToTest(5);

      // Success patterns from validated hypotheses
      if (validated.length >= 3) {
        const types = {};
        for (const h of validated) {
          types[h.type] = (types[h.type] || 0) + 1;
        }

        const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
        if (topType && topType[1] >= 2) {
          insights.push({
            type: 'SUCCESS',
            priority: 'INFO',
            title: `${topType[0]} Hypotheses Work Well`,
            description: `${topType[1]} out of ${validated.length} validated improvements were ${topType[0].replace(/_/g, ' ').toLowerCase()}`,
            details: {
              type: topType[0],
              count: topType[1],
              total: validated.length
            },
            action: `Consider more ${topType[0].replace(/_/g, ' ').toLowerCase()} improvements`,
            confidence: 0.75
          });
        }
      }

      // Pending hypotheses to test
      if (proposed.length > 0) {
        const topProposed = proposed[0];
        insights.push({
          type: 'RECOMMENDATION',
          priority: 'MEDIUM',
          title: 'Hypothesis Ready for Testing',
          description: topProposed.description,
          details: {
            hypothesisId: topProposed.id,
            confidence: topProposed.confidence,
            totalPending: proposed.length
          },
          action: `Test hypothesis: ${topProposed.description}`,
          confidence: topProposed.confidence
        });
      }

      // Low accuracy rate warning
      if (stats.accuracyRate < 0.5 && stats.totalProposed >= 5) {
        insights.push({
          type: 'WARNING',
          priority: 'MEDIUM',
          title: 'Low Hypothesis Success Rate',
          description: `Only ${Math.round(stats.accuracyRate * 100)}% of hypotheses are validated`,
          details: {
            accuracyRate: stats.accuracyRate,
            validated: stats.totalValidated,
            invalidated: stats.totalInvalidated
          },
          action: 'Review hypothesis generation criteria and evidence requirements',
          confidence: 0.7
        });
      }
    } catch (e) {
      // Hypothesis engine not fully initialized
    }

    return insights;
  }

  // ==========================================================================
  // INTERVENTION-BASED INSIGHTS
  // ==========================================================================

  generateInterventionInsights() {
    const insights = [];

    try {
      const stats = this.interventionTracker.getStats();
      const regressive = this.interventionTracker.getRegressiveInterventions();
      const successful = this.interventionTracker.getSuccessfulInterventions();
      const pending = this.interventionTracker.getPendingTesting();

      // High regression rate warning
      if (stats.regressionRate > 0.2 && stats.totalInterventions >= 5) {
        insights.push({
          type: 'WARNING',
          priority: 'CRITICAL',
          title: 'High Intervention Regression Rate',
          description: `${Math.round(stats.regressionRate * 100)}% of changes have caused regressions`,
          details: {
            regressionRate: stats.regressionRate,
            regressive: stats.regressive,
            total: stats.totalInterventions
          },
          action: 'Slow down changes, increase testing coverage, review change process',
          confidence: 0.9
        });
      }

      // Pending tests warning
      if (pending.length >= 3) {
        insights.push({
          type: 'WARNING',
          priority: 'HIGH',
          title: 'Untested Interventions',
          description: `${pending.length} interventions are waiting to be tested`,
          details: {
            count: pending.length,
            interventions: pending.map(i => i.description).slice(0, 3)
          },
          action: 'Run test suite to validate recent changes',
          confidence: 0.95
        });
      }

      // Successful patterns
      if (successful.length >= 3) {
        const types = {};
        for (const s of successful) {
          types[s.type] = (types[s.type] || 0) + 1;
        }

        const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
        if (topType && topType[1] >= 2) {
          insights.push({
            type: 'SUCCESS',
            priority: 'INFO',
            title: `${topType[0]} Interventions Effective`,
            description: `${topType[1]} successful improvements from ${topType[0].replace(/_/g, ' ').toLowerCase()}`,
            details: {
              type: topType[0],
              count: topType[1],
              avgImprovement: this.calculateAvgImprovement(successful.filter(s => s.type === topType[0]))
            },
            confidence: 0.8
          });
        }
      }

      // Correlation: specific intervention types and outcomes
      const correlations = this.findInterventionCorrelations();
      for (const correlation of correlations) {
        insights.push({
          type: 'CORRELATION',
          priority: 'INFO',
          title: correlation.title,
          description: correlation.description,
          details: correlation.details,
          confidence: correlation.confidence
        });
      }
    } catch (e) {
      // Intervention tracker not fully initialized
    }

    return insights;
  }

  calculateAvgImprovement(interventions) {
    const scores = interventions
      .map(i => i.effect?.overallScore)
      .filter(s => s !== undefined);

    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  findInterventionCorrelations() {
    const correlations = [];

    try {
      const interventions = this.interventionTracker.data.interventions;

      // Look for type → outcome correlations
      const typeOutcomes = {};
      for (const i of interventions) {
        if (!i.effect) continue;
        if (!typeOutcomes[i.type]) {
          typeOutcomes[i.type] = { success: 0, failure: 0 };
        }
        if (i.effect.classification?.includes('IMPROVEMENT')) {
          typeOutcomes[i.type].success++;
        } else if (i.effect.classification?.includes('REGRESSION')) {
          typeOutcomes[i.type].failure++;
        }
      }

      // Report strong correlations
      for (const [type, outcomes] of Object.entries(typeOutcomes)) {
        const total = outcomes.success + outcomes.failure;
        if (total >= 3) {
          const successRate = outcomes.success / total;
          if (successRate >= 0.7) {
            correlations.push({
              title: `${type} Changes Usually Succeed`,
              description: `${Math.round(successRate * 100)}% of ${type.replace(/_/g, ' ').toLowerCase()} changes have been successful`,
              details: { type, successRate, total },
              confidence: 0.7 + (total * 0.02)
            });
          } else if (successRate <= 0.3) {
            correlations.push({
              title: `${type} Changes Often Fail`,
              description: `Only ${Math.round(successRate * 100)}% of ${type.replace(/_/g, ' ').toLowerCase()} changes succeeded`,
              details: { type, successRate, total },
              confidence: 0.7 + (total * 0.02)
            });
          }
        }
      }
    } catch (e) {
      // Error finding correlations
    }

    return correlations;
  }

  // ==========================================================================
  // TREND-BASED INSIGHTS
  // ==========================================================================

  generateTrendInsights() {
    const insights = [];

    try {
      // Analyze metric trends
      const metrics = ['sensitivity', 'specificity', 'f1Score', 'mcc'];

      for (const metric of metrics) {
        const trend = this.temporalIndex.analyzeTrend(metric);

        if (trend.direction === 'STRONGLY_IMPROVING') {
          insights.push({
            type: 'TREND',
            priority: 'INFO',
            title: `${metric} Strongly Improving`,
            description: `${metric} has been steadily increasing over the analysis period`,
            details: {
              metric,
              slope: trend.slope,
              dataPoints: trend.dataPoints
            },
            confidence: Math.abs(trend.correlation) || 0.7
          });
        } else if (trend.direction === 'STRONGLY_DECLINING') {
          insights.push({
            type: 'WARNING',
            priority: 'HIGH',
            title: `${metric} Declining`,
            description: `${metric} has been decreasing - investigate cause`,
            details: {
              metric,
              slope: trend.slope,
              dataPoints: trend.dataPoints
            },
            action: `Investigate ${metric} decline and consider rollback if recent changes are the cause`,
            confidence: Math.abs(trend.correlation) || 0.7
          });
        }
      }

      // Check for anomalies
      const anomalies = this.temporalIndex.detectAnomalies('sensitivity');
      for (const anomaly of anomalies.slice(0, 2)) {
        insights.push({
          type: 'ANOMALY',
          priority: 'MEDIUM',
          title: 'Metric Anomaly Detected',
          description: `Unusual ${anomaly.type} in sensitivity: ${anomaly.value.toFixed(2)} vs expected ${anomaly.expected.toFixed(2)}`,
          details: anomaly,
          action: 'Investigate what caused this unusual reading',
          confidence: 0.75
        });
      }
    } catch (e) {
      // Temporal index not fully initialized
    }

    return insights;
  }

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================

  generateRecommendations() {
    const insights = [];

    // Collect all actionable insights and prioritize
    const opportunities = this.data.insights
      .filter(i => i.type === 'OPPORTUNITY' && i.status !== 'ACTED' && i.status !== 'DISMISSED')
      .sort((a, b) => b.confidence - a.confidence);

    if (opportunities.length >= 3) {
      // Generate meta-recommendation
      const topCategories = {};
      for (const opp of opportunities) {
        const cat = opp.details?.category || 'GENERAL';
        topCategories[cat] = (topCategories[cat] || 0) + 1;
      }

      const topCategory = Object.entries(topCategories).sort((a, b) => b[1] - a[1])[0];
      if (topCategory) {
        insights.push({
          type: 'RECOMMENDATION',
          priority: 'HIGH',
          title: 'Focus Area Identified',
          description: `Most improvement opportunities are in ${topCategory[0].toLowerCase().replace(/_/g, ' ')} (${topCategory[1]} items)`,
          details: {
            category: topCategory[0],
            count: topCategory[1],
            totalOpportunities: opportunities.length
          },
          action: `Focus on addressing ${topCategory[0].toLowerCase().replace(/_/g, ' ')} issues for maximum impact`,
          confidence: 0.85
        });
      }
    }

    return insights;
  }

  // ==========================================================================
  // INSIGHT MANAGEMENT
  // ==========================================================================

  rankInsights(insights) {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

    return insights.sort((a, b) => {
      // First by priority
      const priorDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorDiff !== 0) return priorDiff;

      // Then by confidence
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  isDuplicate(insight) {
    // Check for similar recent insights
    const recentCutoff = Date.now() - (24 * 60 * 60 * 1000);  // Last 24 hours

    return this.data.insights.some(existing => {
      if (new Date(existing.timestamp).getTime() < recentCutoff) return false;
      if (existing.type !== insight.type) return false;
      if (existing.title !== insight.title) return false;
      return true;
    });
  }

  getActiveInsights() {
    return this.data.insights
      .filter(i => i.status !== 'DISMISSED' && i.status !== 'ACTED')
      .sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  dismissInsight(insightId, reason = '') {
    const insight = this.data.insights.find(i => i.id === insightId);
    if (insight) {
      insight.status = 'DISMISSED';
      insight.dismissedAt = new Date().toISOString();
      insight.dismissReason = reason;
      this.data.dismissed.push(insightId);
      this.data.stats.dismissed++;
      this.saveData();
    }
    return insight;
  }

  markActedUpon(insightId, action = '') {
    const insight = this.data.insights.find(i => i.id === insightId);
    if (insight) {
      insight.status = 'ACTED';
      insight.actedAt = new Date().toISOString();
      insight.actionTaken = action;
      this.data.acted.push(insightId);
      this.data.stats.acted++;
      this.saveData();
    }
    return insight;
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  getInsightsByType(type) {
    return this.data.insights.filter(i => i.type === type);
  }

  getInsightsByPriority(priority) {
    return this.data.insights.filter(i => i.priority === priority);
  }

  getActionableInsights() {
    return this.data.insights.filter(i =>
      i.status !== 'DISMISSED' &&
      i.status !== 'ACTED' &&
      INSIGHT_TYPES[i.type]?.actionable
    );
  }

  getCriticalInsights() {
    return this.data.insights.filter(i =>
      i.priority === 'CRITICAL' &&
      i.status !== 'DISMISSED' &&
      i.status !== 'ACTED'
    );
  }

  /**
   * Get a summary suitable for dashboard display
   */
  getSummary() {
    const active = this.getActiveInsights();

    return {
      total: active.length,
      byCriticality: {
        critical: active.filter(i => i.priority === 'CRITICAL').length,
        high: active.filter(i => i.priority === 'HIGH').length,
        medium: active.filter(i => i.priority === 'MEDIUM').length,
        low: active.filter(i => i.priority === 'LOW').length,
        info: active.filter(i => i.priority === 'INFO').length
      },
      byType: {
        opportunities: active.filter(i => i.type === 'OPPORTUNITY').length,
        warnings: active.filter(i => i.type === 'WARNING').length,
        recommendations: active.filter(i => i.type === 'RECOMMENDATION').length
      },
      topInsights: active.slice(0, 5).map(i => ({
        type: i.type,
        priority: i.priority,
        title: i.title
      })),
      stats: this.data.stats
    };
  }

  /**
   * Export for LLM context
   */
  exportForLLM() {
    const active = this.getActiveInsights();
    const actionable = this.getActionableInsights();

    return {
      summary: this.getSummary(),
      criticalIssues: this.getCriticalInsights().map(i => ({
        title: i.title,
        description: i.description,
        action: i.action
      })),
      topOpportunities: actionable
        .filter(i => i.type === 'OPPORTUNITY')
        .slice(0, 3)
        .map(i => ({
          title: i.title,
          description: i.description,
          action: i.action,
          confidence: i.confidence
        })),
      recommendations: actionable
        .filter(i => i.type === 'RECOMMENDATION')
        .slice(0, 3)
        .map(i => ({
          title: i.title,
          description: i.description,
          action: i.action
        }))
    };
  }

  /**
   * Generate a human-readable report
   */
  generateReport() {
    const summary = this.getSummary();
    const active = this.getActiveInsights();

    let report = `
╔══════════════════════════════════════════════════════════════════════════════╗
║  VULPES CORTEX - INSIGHT REPORT                                              ║
║  Generated: ${new Date().toISOString()}                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

SUMMARY
───────────────────────────────────────────────────────────────────────────────
Total Active Insights: ${summary.total}
  Critical: ${summary.byCriticality.critical}
  High:     ${summary.byCriticality.high}
  Medium:   ${summary.byCriticality.medium}
  Low:      ${summary.byCriticality.low}
  Info:     ${summary.byCriticality.info}

`;

    // Critical issues first
    const critical = active.filter(i => i.priority === 'CRITICAL');
    if (critical.length > 0) {
      report += `
CRITICAL ISSUES (${critical.length})
───────────────────────────────────────────────────────────────────────────────
`;
      for (const insight of critical) {
        report += `
⚠️ ${insight.title}
   ${insight.description}
   Action: ${insight.action}
`;
      }
    }

    // Top recommendations
    const recommendations = active.filter(i => i.type === 'RECOMMENDATION').slice(0, 5);
    if (recommendations.length > 0) {
      report += `

TOP RECOMMENDATIONS (${recommendations.length})
───────────────────────────────────────────────────────────────────────────────
`;
      for (const insight of recommendations) {
        report += `
🎯 ${insight.title}
   ${insight.description}
   Action: ${insight.action}
`;
      }
    }

    // Opportunities
    const opportunities = active.filter(i => i.type === 'OPPORTUNITY').slice(0, 5);
    if (opportunities.length > 0) {
      report += `

IMPROVEMENT OPPORTUNITIES (${opportunities.length})
───────────────────────────────────────────────────────────────────────────────
`;
      for (const insight of opportunities) {
        report += `
💡 ${insight.title}
   ${insight.description}
   Action: ${insight.action}
`;
      }
    }

    return report;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  InsightGenerator,
  INSIGHT_TYPES
};
