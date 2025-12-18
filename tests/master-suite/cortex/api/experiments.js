/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   EXPERIMENT SERVICE                                                          ║
 * ║   Stateful A/B Experiment Workflow Management                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Manages complete experiment lifecycle:
 * 1. Create experiment with hypothesis
 * 2. Run baseline tests
 * 3. Apply treatment (code change)
 * 4. Run treatment tests
 * 5. Analyze results
 * 6. Auto-rollback if regression detected
 */

const { EventEmitter } = require("events");
const { getDatabase } = require("../db/database");
const { getJobQueue } = require("./queue");

// ============================================================================
// EXPERIMENT STATES
// ============================================================================

const ExperimentState = {
    CREATED: "CREATED",
    BASELINE_PENDING: "BASELINE_PENDING",
    BASELINE_RUNNING: "BASELINE_RUNNING",
    BASELINE_COMPLETE: "BASELINE_COMPLETE",
    TREATMENT_PENDING: "TREATMENT_PENDING",
    TREATMENT_RUNNING: "TREATMENT_RUNNING",
    TREATMENT_COMPLETE: "TREATMENT_COMPLETE",
    ANALYZING: "ANALYZING",
    COMPLETED: "COMPLETED",
    ROLLED_BACK: "ROLLED_BACK",
    FAILED: "FAILED",
};

// ============================================================================
// EXPERIMENT SERVICE CLASS
// ============================================================================

class ExperimentService extends EventEmitter {
    constructor(options = {}) {
        super();
        this.db = options.database || getDatabase();
        this.queue = options.queue || getJobQueue();
        this.activeExperiments = new Map(); // experimentId -> state
    }

    /**
     * Create a new experiment
     */
    createExperiment(config) {
        const experiment = {
            id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: config.name,
            type: config.type || "A/B",
            hypothesis: config.hypothesis,
            status: ExperimentState.CREATED,
            baselineConfig: config.baselineConfig || { documentCount: 200, profile: "HIPAA_STRICT" },
            treatmentConfig: config.treatmentConfig || {},
            autoRollback: config.autoRollbackOnRegression !== false,
            createdAt: new Date().toISOString(),
        };

        // Save to database
        this.db.createExperiment(experiment);
        this.activeExperiments.set(experiment.id, experiment);

        console.error(`[ExperimentService] Created experiment: ${experiment.id}`);
        this.emit("created", experiment);

        return experiment;
    }

    /**
     * Start experiment baseline phase
     */
    async startBaseline(experimentId) {
        const experiment = this.db.getExperiment(experimentId);
        if (!experiment) throw new Error(`Experiment not found: ${experimentId}`);

        // Update status
        this.updateStatus(experimentId, ExperimentState.BASELINE_PENDING);

        // Enqueue baseline test
        const testId = this.queue.enqueue({
            profile: experiment.baselineConfig?.profile || "HIPAA_STRICT",
            documentCount: experiment.baselineConfig?.documentCount || 200,
            experimentId,
            phase: "baseline",
        });

        // Store test reference
        this.db.updateExperiment(experimentId, {
            baselineTestId: testId,
            status: ExperimentState.BASELINE_RUNNING,
            startedAt: new Date().toISOString(),
        });

        this.emit("baselineStarted", { experimentId, testId });
        return testId;
    }

    /**
     * Record baseline results
     */
    recordBaselineResults(experimentId, results) {
        this.db.updateExperiment(experimentId, {
            baselineResults: results,
            status: ExperimentState.BASELINE_COMPLETE,
        });

        this.emit("baselineComplete", { experimentId, results });
    }

    /**
     * Start experiment treatment phase
     */
    async startTreatment(experimentId) {
        const experiment = this.db.getExperiment(experimentId);
        if (!experiment) throw new Error(`Experiment not found: ${experimentId}`);

        // Update status
        this.updateStatus(experimentId, ExperimentState.TREATMENT_PENDING);

        // Enqueue treatment test
        const testId = this.queue.enqueue({
            profile: experiment.baselineConfig?.profile || "HIPAA_STRICT",
            documentCount: experiment.baselineConfig?.documentCount || 200,
            experimentId,
            phase: "treatment",
        });

        this.db.updateExperiment(experimentId, {
            treatmentTestId: testId,
            status: ExperimentState.TREATMENT_RUNNING,
        });

        this.emit("treatmentStarted", { experimentId, testId });
        return testId;
    }

    /**
     * Record treatment results and analyze
     */
    recordTreatmentResults(experimentId, results) {
        this.db.updateExperiment(experimentId, {
            treatmentResults: results,
            status: ExperimentState.TREATMENT_COMPLETE,
        });

        // Auto-analyze
        const analysis = this.analyzeResults(experimentId);

        this.emit("treatmentComplete", { experimentId, results, analysis });
        return analysis;
    }

    /**
     * Analyze experiment results
     */
    analyzeResults(experimentId) {
        const experiment = this.db.getExperiment(experimentId);
        if (!experiment) throw new Error(`Experiment not found: ${experimentId}`);

        this.updateStatus(experimentId, ExperimentState.ANALYZING);

        const baseline = experiment.baselineResults;
        const treatment = experiment.treatmentResults;

        if (!baseline || !treatment) {
            return { error: "Missing baseline or treatment results" };
        }

        // Compare key metrics
        const analysis = {
            experimentId,
            timestamp: new Date().toISOString(),
            metrics: {},
            overallImprovement: 0,
            isRegression: false,
            recommendation: "NEUTRAL",
        };

        // Key metrics to compare
        const keyMetrics = ["sensitivity", "specificity", "f1Score", "accuracy"];
        let improvementSum = 0;
        let regressionCount = 0;

        for (const metric of keyMetrics) {
            const baselineVal = baseline.metrics?.[metric] || baseline[metric];
            const treatmentVal = treatment.metrics?.[metric] || treatment[metric];

            if (typeof baselineVal === "number" && typeof treatmentVal === "number") {
                const delta = treatmentVal - baselineVal;
                const percentChange = baselineVal > 0 ? (delta / baselineVal) * 100 : 0;

                analysis.metrics[metric] = {
                    baseline: baselineVal,
                    treatment: treatmentVal,
                    delta,
                    percentChange: percentChange.toFixed(2) + "%",
                    improved: delta > 0,
                };

                improvementSum += delta;
                if (delta < -0.01) regressionCount++; // More than 1% regression
            }
        }

        analysis.overallImprovement = improvementSum;
        analysis.isRegression = regressionCount >= 2; // Regression in 2+ metrics

        // Generate recommendation
        if (analysis.isRegression) {
            analysis.recommendation = "REJECT";
            analysis.reason = "Significant regression detected in multiple metrics";
        } else if (improvementSum > 0.05) {
            analysis.recommendation = "ACCEPT";
            analysis.reason = "Measurable improvement with no significant regression";
        } else {
            analysis.recommendation = "NEUTRAL";
            analysis.reason = "No significant change detected";
        }

        // Save analysis
        this.db.updateExperiment(experimentId, {
            analysis,
            status: ExperimentState.COMPLETED,
            completedAt: new Date().toISOString(),
        });

        // Auto-rollback if configured and regression detected
        if (experiment.autoRollback && analysis.isRegression) {
            this.triggerRollback(experimentId, analysis.reason);
        }

        this.emit("analyzed", { experimentId, analysis });
        return analysis;
    }

    /**
     * Trigger rollback
     */
    triggerRollback(experimentId, reason) {
        console.error(`[ExperimentService] Triggering rollback for ${experimentId}: ${reason}`);

        this.db.updateExperiment(experimentId, {
            status: ExperimentState.ROLLED_BACK,
            rollbackReason: reason,
            rolledBackAt: new Date().toISOString(),
        });

        this.emit("rolledBack", { experimentId, reason });
    }

    /**
     * Update experiment status
     */
    updateStatus(experimentId, status) {
        this.db.updateExperiment(experimentId, { status });
        this.emit("statusChanged", { experimentId, status });
    }

    /**
     * Get experiment with full details
     */
    getExperiment(experimentId) {
        return this.db.getExperiment(experimentId);
    }

    /**
     * List experiments
     */
    listExperiments(filters = {}, options = {}) {
        return this.db.queryExperiments(filters, options);
    }

    /**
     * Get experiment summary for LLM
     */
    getSummaryForLLM(experimentId) {
        const exp = this.db.getExperiment(experimentId);
        if (!exp) return null;

        return {
            id: exp.id,
            name: exp.name,
            status: exp.status,
            hypothesis: exp.hypothesis,
            baselineSensitivity: exp.baselineResults?.metrics?.sensitivity,
            treatmentSensitivity: exp.treatmentResults?.metrics?.sensitivity,
            recommendation: exp.analysis?.recommendation,
            reason: exp.analysis?.reason,
        };
    }
}

// ============================================================================
// SINGLETON
// ============================================================================

let serviceInstance = null;

function getExperimentService(options) {
    if (!serviceInstance) {
        serviceInstance = new ExperimentService(options);
    }
    return serviceInstance;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    ExperimentService,
    ExperimentState,
    getExperimentService,
};
