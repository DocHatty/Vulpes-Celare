/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   DATABASE ADAPTER                                                            ║
 * ║   Provides database access to existing Cortex modules                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This adapter allows existing modules (KnowledgeBase, PatternRecognizer, etc.)
 * to use the SQLite database while maintaining backwards compatibility.
 *
 * Usage:
 *   const { withDatabase } = require('./core/db-adapter');
 *   const modules = withDatabase(existingModules);
 *   // Now modules.db is available for direct database access
 */

const { getDatabase, closeDatabase } = require("../db/database");

// ============================================================================
// DATABASE ADAPTER
// ============================================================================

/**
 * Wraps existing modules with database access
 * @param {Object} modules - Existing Cortex modules
 * @returns {Object} - Modules with db property added
 */
function withDatabase(modules) {
    const db = getDatabase();

    return {
        ...modules,
        db,

        // Convenience methods that delegate to database
        queryPatterns: (filters, options) => db.queryPatterns(filters, options),
        recordPattern: (pattern) => db.recordPattern(pattern),
        getPatternsByPhiType: (phiType) => db.getPatternsByPhiType(phiType),
        getTrendingPatterns: (limit) => db.getTrendingPatterns(limit),

        queryDecisions: (filters, options) => db.queryDecisions(filters, options),
        recordDecision: (decision) => db.recordDecision(decision),
        getDecision: (id) => db.getDecision(id),

        recordMetrics: (runId, metrics, context) => db.recordMetrics(runId, metrics, context),
        getMetricsTrend: (metricName, options) => db.getMetricsTrend(metricName, options),
        getLatestMetrics: () => db.getLatestMetrics(),

        queryExperiments: (filters, options) => db.queryExperiments(filters, options),
        createExperiment: (config) => db.createExperiment(config),
        getExperiment: (id) => db.getExperiment(id),
        updateExperiment: (id, updates) => db.updateExperiment(id, updates),

        recordIntervention: (intervention) => db.recordIntervention(intervention),
        queryInterventions: (filters, options) => db.queryInterventions(filters, options),
        updateIntervention: (id, updates) => db.updateIntervention(id, updates),

        enqueueTest: (config) => db.enqueueTest(config),
        getTestStatus: (id) => db.getTestStatus(id),
        updateTestProgress: (id, progress) => db.updateTestProgress(id, progress),
        completeTest: (id, result, error) => db.completeTest(id, result, error),

        getStats: () => db.getStats(),
    };
}

/**
 * Get shared database instance
 */
function getDatabaseInstance() {
    return getDatabase();
}

/**
 * Close database connection
 */
function closeDatabaseConnection() {
    closeDatabase();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    withDatabase,
    getDatabaseInstance,
    closeDatabaseConnection,
};
