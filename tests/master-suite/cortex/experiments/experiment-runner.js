/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CORTEX - EXPERIMENT RUNNER                                           ║
 * ║  Scientific A/B Testing for PHI Detection                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module enables SCIENTIFIC EXPERIMENTATION on the redaction system.
 *
 * EXPERIMENT TYPES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * A/B TEST         - Compare control (current) vs treatment (with change)
 * BEFORE/AFTER     - Run same docs before and after intervention
 * PARAMETER SWEEP  - Test multiple parameter values
 * ABLATION         - Disable components to measure their impact
 *
 * EXPERIMENT LIFECYCLE:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 1. SETUP        - Define experiment, prepare documents, baseline metrics
 * 2. BASELINE     - Run control condition, record results
 * 3. TREATMENT    - Apply change, run treatment condition
 * 4. ANALYZE      - Compare results, statistical significance
 * 5. CONCLUDE     - Accept/reject hypothesis, document findings
 *
 * SCIENTIFIC RIGOR:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - Same documents for A and B (controlled variable)
 * - Multiple runs for statistical significance
 * - Blind analysis (compare metrics, not expectations)
 * - Document everything for reproducibility
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { PATHS, EXPERIMENT_CONFIG } = require('../core/config');

// ============================================================================
// EXPERIMENT STATUS
// ============================================================================

const EXPERIMENT_STATUS = {
  CREATED: 'CREATED',
  BASELINE_RUNNING: 'BASELINE_RUNNING',
  BASELINE_COMPLETE: 'BASELINE_COMPLETE',
  TREATMENT_RUNNING: 'TREATMENT_RUNNING',
  TREATMENT_COMPLETE: 'TREATMENT_COMPLETE',
  ANALYZING: 'ANALYZING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

// ============================================================================
// EXPERIMENT RUNNER CLASS
// ============================================================================

class ExperimentRunner extends EventEmitter {
  constructor(options = {}) {
    super();

    this.kb = options.knowledgeBase || null;
    this.metricsEngine = options.metricsEngine || null;
    this.snapshotManager = options.snapshotManager || null;
    this.interventionTracker = options.interventionTracker || null;

    this.storagePath = path.join(PATHS.experiments, 'experiments.json');
    this.data = this.loadData();

    // Current running experiment
    this.currentExperiment = null;
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
      }
    } catch (e) {
      console.warn('ExperimentRunner: Starting with empty experiment log');
    }
    return {
      experiments: [],
      stats: {
        total: 0,
        completed: 0,
        successful: 0,
        failed: 0
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
  // EXPERIMENT CREATION
  // ==========================================================================

  /**
   * Create a new experiment
   * @param {Object} config
   * @param {string} config.name - Experiment name
   * @param {string} config.type - 'A/B', 'BEFORE_AFTER', 'PARAMETER_SWEEP', 'ABLATION'
   * @param {string} config.hypothesisId - Linked hypothesis (optional)
   * @param {Object} config.treatment - What change to apply
   * @param {Array} config.documentIds - Document IDs to test (or null for all)
   * @param {number} config.runs - Number of runs for statistical significance
   */
  createExperiment(config) {
    const experiment = {
      id: `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: config.name || 'Unnamed Experiment',
      type: config.type || 'BEFORE_AFTER',
      hypothesisId: config.hypothesisId || null,

      // Experiment configuration
      config: {
        documentIds: config.documentIds || null,  // null = use all test documents
        runs: config.runs || EXPERIMENT_CONFIG.minRuns,
        confidenceThreshold: config.confidenceThreshold || EXPERIMENT_CONFIG.significanceThreshold,
        rollbackOnRegression: config.rollbackOnRegression ?? true
      },

      // Treatment (what we're testing)
      treatment: {
        description: config.treatment?.description || 'Unknown treatment',
        type: config.treatment?.type || 'UNKNOWN',
        parameters: config.treatment?.parameters || {},
        apply: config.treatment?.apply || null,  // Function to apply treatment
        revert: config.treatment?.revert || null  // Function to revert treatment
      },

      // Status tracking
      status: EXPERIMENT_STATUS.CREATED,

      // Results containers
      baseline: {
        runs: [],
        aggregatedMetrics: null,
        timestamp: null
      },
      treatment: {
        runs: [],
        aggregatedMetrics: null,
        timestamp: null
      },

      // Analysis
      analysis: null,
      conclusion: null,

      // Timeline
      timeline: {
        created: new Date().toISOString(),
        baselineStarted: null,
        baselineCompleted: null,
        treatmentStarted: null,
        treatmentCompleted: null,
        analyzed: null,
        completed: null
      },

      // Errors
      errors: []
    };

    this.data.experiments.push(experiment);
    this.data.stats.total++;
    this.saveData();

    this.emit('experimentCreated', experiment);
    return experiment;
  }

  // ==========================================================================
  // EXPERIMENT EXECUTION
  // ==========================================================================

  /**
   * Run a complete experiment
   * @param {string} experimentId
   * @param {Function} testRunner - Function that runs tests and returns results
   */
  async runExperiment(experimentId, testRunner) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    this.currentExperiment = experiment;

    try {
      // Step 1: Run baseline
      this.emit('phaseStarted', { experimentId, phase: 'baseline' });
      await this.runBaseline(experiment, testRunner);

      // Step 2: Apply treatment
      this.emit('phaseStarted', { experimentId, phase: 'treatment' });
      await this.runTreatment(experiment, testRunner);

      // Step 3: Analyze results
      this.emit('phaseStarted', { experimentId, phase: 'analysis' });
      await this.analyzeResults(experiment);

      // Step 4: Draw conclusion
      await this.concludeExperiment(experiment);

      experiment.status = EXPERIMENT_STATUS.COMPLETE;
      experiment.timeline.completed = new Date().toISOString();
      this.data.stats.completed++;

      if (experiment.conclusion?.accepted) {
        this.data.stats.successful++;
      }

      this.emit('experimentComplete', experiment);

    } catch (error) {
      experiment.status = EXPERIMENT_STATUS.FAILED;
      experiment.errors.push({
        phase: this.getPhase(experiment),
        error: error.message,
        timestamp: new Date().toISOString()
      });
      this.data.stats.failed++;
      this.emit('experimentFailed', { experiment, error });

      // Attempt to revert treatment if applied
      if (experiment.treatment.revert) {
        try {
          await experiment.treatment.revert();
          this.emit('treatmentReverted', experiment);
        } catch (revertError) {
          experiment.errors.push({
            phase: 'revert',
            error: revertError.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      throw error;
    } finally {
      this.currentExperiment = null;
      this.saveData();
    }

    return experiment;
  }

  getPhase(experiment) {
    const statusToPhase = {
      [EXPERIMENT_STATUS.BASELINE_RUNNING]: 'baseline',
      [EXPERIMENT_STATUS.TREATMENT_RUNNING]: 'treatment',
      [EXPERIMENT_STATUS.ANALYZING]: 'analysis'
    };
    return statusToPhase[experiment.status] || 'unknown';
  }

  // ==========================================================================
  // BASELINE EXECUTION
  // ==========================================================================

  async runBaseline(experiment, testRunner) {
    experiment.status = EXPERIMENT_STATUS.BASELINE_RUNNING;
    experiment.timeline.baselineStarted = new Date().toISOString();
    this.saveData();

    const runs = experiment.config.runs;
    experiment.baseline.runs = [];

    for (let i = 0; i < runs; i++) {
      this.emit('runStarted', {
        experimentId: experiment.id,
        phase: 'baseline',
        run: i + 1,
        total: runs
      });

      const result = await testRunner({
        documentIds: experiment.config.documentIds,
        runNumber: i + 1,
        phase: 'baseline'
      });

      experiment.baseline.runs.push({
        runNumber: i + 1,
        timestamp: new Date().toISOString(),
        metrics: result.metrics,
        details: result.details || {}
      });

      this.emit('runCompleted', {
        experimentId: experiment.id,
        phase: 'baseline',
        run: i + 1,
        total: runs,
        metrics: result.metrics
      });
    }

    // Aggregate baseline metrics
    experiment.baseline.aggregatedMetrics = this.aggregateMetrics(experiment.baseline.runs);
    experiment.baseline.timestamp = new Date().toISOString();
    experiment.status = EXPERIMENT_STATUS.BASELINE_COMPLETE;
    experiment.timeline.baselineCompleted = new Date().toISOString();
    this.saveData();

    this.emit('baselineComplete', {
      experimentId: experiment.id,
      metrics: experiment.baseline.aggregatedMetrics
    });
  }

  // ==========================================================================
  // TREATMENT EXECUTION
  // ==========================================================================

  async runTreatment(experiment, testRunner) {
    experiment.status = EXPERIMENT_STATUS.TREATMENT_RUNNING;
    experiment.timeline.treatmentStarted = new Date().toISOString();
    this.saveData();

    // Apply treatment
    if (experiment.treatment.apply) {
      this.emit('applyingTreatment', {
        experimentId: experiment.id,
        treatment: experiment.treatment.description
      });
      await experiment.treatment.apply();
    }

    const runs = experiment.config.runs;
    experiment.treatment.runs = [];

    for (let i = 0; i < runs; i++) {
      this.emit('runStarted', {
        experimentId: experiment.id,
        phase: 'treatment',
        run: i + 1,
        total: runs
      });

      const result = await testRunner({
        documentIds: experiment.config.documentIds,
        runNumber: i + 1,
        phase: 'treatment'
      });

      experiment.treatment.runs.push({
        runNumber: i + 1,
        timestamp: new Date().toISOString(),
        metrics: result.metrics,
        details: result.details || {}
      });

      this.emit('runCompleted', {
        experimentId: experiment.id,
        phase: 'treatment',
        run: i + 1,
        total: runs,
        metrics: result.metrics
      });
    }

    // Aggregate treatment metrics
    experiment.treatment.aggregatedMetrics = this.aggregateMetrics(experiment.treatment.runs);
    experiment.treatment.timestamp = new Date().toISOString();
    experiment.status = EXPERIMENT_STATUS.TREATMENT_COMPLETE;
    experiment.timeline.treatmentCompleted = new Date().toISOString();
    this.saveData();

    this.emit('treatmentComplete', {
      experimentId: experiment.id,
      metrics: experiment.treatment.aggregatedMetrics
    });
  }

  // ==========================================================================
  // RESULTS ANALYSIS
  // ==========================================================================

  async analyzeResults(experiment) {
    experiment.status = EXPERIMENT_STATUS.ANALYZING;
    this.saveData();

    const baseline = experiment.baseline.aggregatedMetrics;
    const treatment = experiment.treatment.aggregatedMetrics;

    const analysis = {
      timestamp: new Date().toISOString(),
      metricsComparison: {},
      improvements: [],
      regressions: [],
      significant: false,
      overallEffect: 'NEUTRAL'
    };

    // Compare each metric
    const metricsToCompare = ['sensitivity', 'specificity', 'f1Score', 'mcc', 'precision', 'npv'];

    for (const metric of metricsToCompare) {
      if (baseline[metric] !== undefined && treatment[metric] !== undefined) {
        const baselineValue = baseline[metric].mean;
        const treatmentValue = treatment[metric].mean;
        const delta = treatmentValue - baselineValue;
        const percentChange = baselineValue !== 0 ? (delta / baselineValue) * 100 : 0;

        // Statistical significance test (simplified t-test approximation)
        const significant = this.isStatisticallySignificant(
          baseline[metric],
          treatment[metric],
          experiment.config.runs
        );

        analysis.metricsComparison[metric] = {
          baseline: baselineValue,
          treatment: treatmentValue,
          delta,
          percentChange,
          significant,
          direction: delta > 0 ? 'IMPROVED' : delta < 0 ? 'REGRESSED' : 'UNCHANGED'
        };

        if (significant && delta > 0.1) {
          analysis.improvements.push({
            metric,
            improvement: delta,
            percentChange
          });
        } else if (significant && delta < -0.1) {
          analysis.regressions.push({
            metric,
            regression: Math.abs(delta),
            percentChange
          });
        }
      }
    }

    // Determine overall effect
    if (analysis.improvements.length > 0 && analysis.regressions.length === 0) {
      analysis.overallEffect = 'IMPROVEMENT';
      analysis.significant = true;
    } else if (analysis.regressions.length > 0 && analysis.improvements.length === 0) {
      analysis.overallEffect = 'REGRESSION';
      analysis.significant = true;
    } else if (analysis.improvements.length > 0 && analysis.regressions.length > 0) {
      // Mixed - need to weigh
      const improvementScore = analysis.improvements.reduce((sum, i) => sum + Math.abs(i.percentChange), 0);
      const regressionScore = analysis.regressions.reduce((sum, r) => sum + Math.abs(r.percentChange), 0);

      if (improvementScore > regressionScore * 1.5) {
        analysis.overallEffect = 'NET_IMPROVEMENT';
      } else if (regressionScore > improvementScore * 1.5) {
        analysis.overallEffect = 'NET_REGRESSION';
      } else {
        analysis.overallEffect = 'MIXED';
      }
      analysis.significant = true;
    }

    experiment.analysis = analysis;
    experiment.timeline.analyzed = new Date().toISOString();
    this.saveData();

    this.emit('analysisComplete', {
      experimentId: experiment.id,
      analysis
    });

    return analysis;
  }

  isStatisticallySignificant(baselineStats, treatmentStats, n) {
    // Simplified significance test
    // For proper implementation, use a real t-test library

    if (!baselineStats.stdDev || !treatmentStats.stdDev || n < 2) {
      return false;
    }

    const meanDiff = Math.abs(treatmentStats.mean - baselineStats.mean);
    const pooledStdDev = Math.sqrt(
      (Math.pow(baselineStats.stdDev, 2) + Math.pow(treatmentStats.stdDev, 2)) / 2
    );

    // Cohen's d effect size
    const effectSize = pooledStdDev > 0 ? meanDiff / pooledStdDev : 0;

    // Consider significant if effect size > 0.2 (small effect) and mean diff > 0.5%
    return effectSize > 0.2 && meanDiff > 0.5;
  }

  // ==========================================================================
  // CONCLUSION
  // ==========================================================================

  async concludeExperiment(experiment) {
    const analysis = experiment.analysis;

    const conclusion = {
      timestamp: new Date().toISOString(),
      accepted: false,
      reason: '',
      recommendation: '',
      autoRollback: false
    };

    if (analysis.overallEffect === 'IMPROVEMENT' || analysis.overallEffect === 'NET_IMPROVEMENT') {
      conclusion.accepted = true;
      conclusion.reason = `Treatment showed ${analysis.improvements.length} improvements with no significant regressions`;
      conclusion.recommendation = 'KEEP the treatment applied';
    } else if (analysis.overallEffect === 'REGRESSION' || analysis.overallEffect === 'NET_REGRESSION') {
      conclusion.accepted = false;
      conclusion.reason = `Treatment caused ${analysis.regressions.length} regressions`;
      conclusion.recommendation = 'ROLLBACK the treatment';

      // Auto-rollback if configured
      if (experiment.config.rollbackOnRegression && experiment.treatment.revert) {
        conclusion.autoRollback = true;
        this.emit('autoRollbackTriggered', {
          experimentId: experiment.id,
          reason: conclusion.reason
        });

        await experiment.treatment.revert();

        // Record rollback
        if (this.interventionTracker) {
          this.interventionTracker.recordRollback(experiment.id, {
            triggeredBy: 'experiment',
            reason: conclusion.reason
          });
        }

        conclusion.recommendation = 'Treatment automatically rolled back due to regression';
      }
    } else if (analysis.overallEffect === 'MIXED') {
      conclusion.accepted = false;
      conclusion.reason = 'Treatment showed mixed results - improvements and regressions';
      conclusion.recommendation = 'REVIEW manually and decide based on priorities';
    } else {
      conclusion.accepted = false;
      conclusion.reason = 'No significant change detected';
      conclusion.recommendation = 'Treatment had no measurable effect - consider different approach';
    }

    experiment.conclusion = conclusion;
    this.saveData();

    this.emit('conclusionReached', {
      experimentId: experiment.id,
      conclusion
    });

    return conclusion;
  }

  // ==========================================================================
  // METRICS AGGREGATION
  // ==========================================================================

  aggregateMetrics(runs) {
    if (runs.length === 0) return {};

    const metrics = {};
    const allMetricKeys = Object.keys(runs[0].metrics || {});

    for (const key of allMetricKeys) {
      const values = runs.map(r => r.metrics[key]).filter(v => typeof v === 'number');

      if (values.length > 0) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const min = Math.min(...values);
        const max = Math.max(...values);

        metrics[key] = {
          mean,
          stdDev,
          min,
          max,
          samples: values.length
        };
      }
    }

    return metrics;
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  getExperiment(id) {
    return this.data.experiments.find(e => e.id === id);
  }

  getExperimentsByStatus(status) {
    return this.data.experiments.filter(e => e.status === status);
  }

  getExperimentsByHypothesis(hypothesisId) {
    return this.data.experiments.filter(e => e.hypothesisId === hypothesisId);
  }

  getRecentExperiments(limit = 10) {
    return this.data.experiments
      .slice(-limit)
      .reverse();
  }

  getSuccessfulExperiments() {
    return this.data.experiments.filter(e =>
      e.status === EXPERIMENT_STATUS.COMPLETE &&
      e.conclusion?.accepted
    );
  }

  getFailedExperiments() {
    return this.data.experiments.filter(e =>
      e.status === EXPERIMENT_STATUS.FAILED ||
      (e.status === EXPERIMENT_STATUS.COMPLETE && !e.conclusion?.accepted)
    );
  }

  /**
   * Cancel a running experiment
   */
  cancelExperiment(experimentId, reason = '') {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) return null;

    if (![EXPERIMENT_STATUS.COMPLETE, EXPERIMENT_STATUS.FAILED, EXPERIMENT_STATUS.CANCELLED].includes(experiment.status)) {
      experiment.status = EXPERIMENT_STATUS.CANCELLED;
      experiment.cancelReason = reason;
      experiment.timeline.completed = new Date().toISOString();

      // Try to revert if treatment was applied
      if (experiment.treatment.revert && experiment.timeline.treatmentStarted) {
        try {
          experiment.treatment.revert();
        } catch (e) {
          experiment.errors.push({
            phase: 'cancel_revert',
            error: e.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      this.saveData();
      this.emit('experimentCancelled', experiment);
    }

    return experiment;
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  getStats() {
    return {
      ...this.data.stats,
      successRate: this.data.stats.completed > 0
        ? this.data.stats.successful / this.data.stats.completed
        : 0,
      currentlyRunning: this.currentExperiment ? 1 : 0
    };
  }

  /**
   * Export for LLM context
   */
  exportForLLM() {
    return {
      stats: this.getStats(),
      recentExperiments: this.getRecentExperiments(5).map(e => ({
        id: e.id,
        name: e.name,
        status: e.status,
        conclusion: e.conclusion?.accepted ? 'ACCEPTED' : 'REJECTED',
        effect: e.analysis?.overallEffect
      })),
      successfulApproaches: this.getSuccessfulExperiments()
        .slice(-3)
        .map(e => ({
          name: e.name,
          treatment: e.treatment.description,
          improvements: e.analysis?.improvements?.length || 0
        })),
      failedApproaches: this.getFailedExperiments()
        .slice(-3)
        .map(e => ({
          name: e.name,
          treatment: e.treatment.description,
          reason: e.conclusion?.reason || e.errors?.[0]?.error
        }))
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ExperimentRunner,
  EXPERIMENT_STATUS
};
