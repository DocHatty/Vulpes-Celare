/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
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
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   DATABASE ABSTRACTION LAYER                                                  ║
 * ║   SQLite-backed storage replacing JSON files                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module provides a database abstraction layer for Cortex, replacing the
 * JSON file-based storage with SQLite for better performance and querying.
 *
 * BENEFITS:
 * - O(log n) indexed lookups instead of O(n) file scans
 * - Transaction support for data integrity
 * - Concurrent access safety
 * - SQL querying capabilities
 * - Automatic data archival support
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_DB_PATH = path.join(__dirname, "..", "storage", "cortex.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

// ============================================================================
// DATABASE CLASS
// ============================================================================

class CortexDatabase {
    /**
     * Initialize the database connection
     * @param {string} dbPath - Path to SQLite database file
     * @param {Object} options - Database options
     */
    constructor(dbPath = DEFAULT_DB_PATH, options = {}) {
        this.dbPath = dbPath;
        this.options = {
            verbose: options.verbose || false,
            readonly: options.readonly || false,
            ...options,
        };

        // Ensure directory exists
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Initialize database connection
        this.db = new Database(this.dbPath, {
            readonly: this.options.readonly,
            verbose: this.options.verbose ? console.error : null,
        });

        // Enable WAL mode for better concurrent performance
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");

        // Initialize schema if needed
        this.initializeSchema();
    }

    /**
     * Initialize database schema from schema.sql
     */
    initializeSchema() {
        // Check if schema already exists
        const tableCheck = this.db
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
            )
            .get();

        if (!tableCheck) {
            // Run schema.sql
            const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
            this.db.exec(schema);
            console.error("[CortexDB] Schema initialized successfully");
        }
    }

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    // ==========================================================================
    // GENERIC QUERY METHODS
    // ==========================================================================

    /**
     * Execute a SQL query and return all results
     */
    query(sql, params = []) {
        return this.db.prepare(sql).all(...params);
    }

    /**
     * Execute a SQL query and return first result
     */
    queryOne(sql, params = []) {
        return this.db.prepare(sql).get(...params);
    }

    /**
     * Execute a SQL statement (INSERT, UPDATE, DELETE)
     */
    run(sql, params = []) {
        return this.db.prepare(sql).run(...params);
    }

    /**
     * Execute multiple statements in a transaction
     */
    transaction(fn) {
        return this.db.transaction(fn)();
    }

    // ==========================================================================
    // DECISION OPERATIONS
    // Replaces: decisions.json (857KB)
    // ==========================================================================

    /**
     * Record a decision
     */
    recordDecision(decision) {
        const stmt = this.db.prepare(`
      INSERT INTO decisions (id, intervention_id, decision_type, outcome, reason, 
                             metrics_before, metrics_after, context, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const id = decision.id || `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        stmt.run(
            id,
            decision.interventionId || null,
            decision.type || decision.decisionType || "unknown",
            decision.outcome || null,
            decision.reason || null,
            JSON.stringify(decision.metricsBefore || null),
            JSON.stringify(decision.metricsAfter || null),
            JSON.stringify(decision.context || null),
            decision.timestamp || new Date().toISOString()
        );

        return id;
    }

    /**
     * Query decisions with filters
     */
    queryDecisions(filters = {}, options = {}) {
        let sql = "SELECT * FROM decisions WHERE 1=1";
        const params = [];

        if (filters.interventionId) {
            sql += " AND intervention_id = ?";
            params.push(filters.interventionId);
        }
        if (filters.type) {
            sql += " AND decision_type = ?";
            params.push(filters.type);
        }
        if (filters.outcome) {
            sql += " AND outcome = ?";
            params.push(filters.outcome);
        }
        if (filters.since) {
            sql += " AND timestamp >= ?";
            params.push(filters.since);
        }
        if (filters.until) {
            sql += " AND timestamp <= ?";
            params.push(filters.until);
        }

        sql += " ORDER BY timestamp DESC";

        if (options.limit) {
            sql += " LIMIT ?";
            params.push(options.limit);
        }
        if (options.offset) {
            sql += " OFFSET ?";
            params.push(options.offset);
        }

        const results = this.query(sql, params);

        // Parse JSON fields
        return results.map((row) => ({
            ...row,
            metricsBefore: row.metrics_before ? JSON.parse(row.metrics_before) : null,
            metricsAfter: row.metrics_after ? JSON.parse(row.metrics_after) : null,
            context: row.context ? JSON.parse(row.context) : null,
        }));
    }

    /**
     * Get decision by ID
     */
    getDecision(id) {
        const row = this.queryOne("SELECT * FROM decisions WHERE id = ?", [id]);
        if (!row) return null;

        return {
            ...row,
            metricsBefore: row.metrics_before ? JSON.parse(row.metrics_before) : null,
            metricsAfter: row.metrics_after ? JSON.parse(row.metrics_after) : null,
            context: row.context ? JSON.parse(row.context) : null,
        };
    }

    // ==========================================================================
    // PATTERN OPERATIONS
    // Replaces: patterns.json (510KB)
    // ==========================================================================

    /**
     * Record or update a pattern
     */
    recordPattern(pattern) {
        const id = pattern.id || `pat-${pattern.phiType}-${pattern.category}-${Date.now()}`;

        // Check if pattern exists
        const existing = this.queryOne(
            "SELECT * FROM patterns WHERE phi_type = ? AND category = ? AND pattern_type = ?",
            [pattern.phiType, pattern.category, pattern.patternType || "failure"]
        );

        if (existing) {
            // Update existing pattern
            this.run(
                `UPDATE patterns SET 
          count = count + 1,
          last_seen = ?,
          examples = ?,
          confidence = ?
        WHERE id = ?`,
                [
                    new Date().toISOString(),
                    JSON.stringify(pattern.examples || []),
                    pattern.confidence || existing.confidence,
                    existing.id,
                ]
            );
            return existing.id;
        } else {
            // Insert new pattern
            this.run(
                `INSERT INTO patterns (id, phi_type, category, pattern_type, severity, count, 
                               confidence, description, examples, indicators, remediation, 
                               first_seen, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    pattern.phiType,
                    pattern.category,
                    pattern.patternType || "failure",
                    pattern.severity || null,
                    pattern.count || 1,
                    pattern.confidence || null,
                    pattern.description || null,
                    JSON.stringify(pattern.examples || []),
                    JSON.stringify(pattern.indicators || []),
                    pattern.remediation || null,
                    new Date().toISOString(),
                    new Date().toISOString(),
                ]
            );
            return id;
        }
    }

    /**
     * Query patterns with filters
     */
    queryPatterns(filters = {}, options = {}) {
        let sql = "SELECT * FROM patterns WHERE 1=1";
        const params = [];

        if (filters.phiType) {
            sql += " AND phi_type = ?";
            params.push(filters.phiType);
        }
        if (filters.category) {
            sql += " AND category = ?";
            params.push(filters.category);
        }
        if (filters.patternType) {
            sql += " AND pattern_type = ?";
            params.push(filters.patternType);
        }
        if (filters.severity) {
            sql += " AND severity = ?";
            params.push(filters.severity);
        }
        if (filters.since) {
            sql += " AND last_seen >= ?";
            params.push(filters.since);
        }
        if (filters.minCount) {
            sql += " AND count >= ?";
            params.push(filters.minCount);
        }

        // Sorting
        const sortField = options.sortBy || "count";
        const sortOrder = options.sortOrder || "DESC";
        sql += ` ORDER BY ${sortField} ${sortOrder}`;

        if (options.limit) {
            sql += " LIMIT ?";
            params.push(options.limit);
        }

        const results = this.query(sql, params);

        return results.map((row) => ({
            ...row,
            examples: row.examples ? JSON.parse(row.examples) : [],
            indicators: row.indicators ? JSON.parse(row.indicators) : [],
        }));
    }

    /**
     * Get patterns by PHI type
     */
    getPatternsByPhiType(phiType) {
        return this.queryPatterns({ phiType });
    }

    /**
     * Get trending patterns (highest count, recent activity)
     */
    getTrendingPatterns(limit = 20) {
        const sql = `
      SELECT * FROM patterns 
      WHERE last_seen >= datetime('now', '-7 days')
      ORDER BY count DESC, last_seen DESC
      LIMIT ?
    `;

        const results = this.query(sql, [limit]);
        return results.map((row) => ({
            ...row,
            examples: row.examples ? JSON.parse(row.examples) : [],
            indicators: row.indicators ? JSON.parse(row.indicators) : [],
        }));
    }

    // ==========================================================================
    // METRICS OPERATIONS
    // Replaces: temporal-index.json (43KB)
    // ==========================================================================

    /**
     * Record metrics from a test run
     */
    recordMetrics(runId, metrics, context = {}) {
        const stmt = this.db.prepare(`
      INSERT INTO metrics_history (run_id, metric_name, value, document_count, profile, context, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        const timestamp = new Date().toISOString();
        const insertMany = this.db.transaction((metricsObj) => {
            for (const [name, value] of Object.entries(metricsObj)) {
                if (typeof value === "number") {
                    stmt.run(
                        runId,
                        name,
                        value,
                        context.documentCount || null,
                        context.profile || null,
                        JSON.stringify(context),
                        timestamp
                    );
                }
            }
        });

        insertMany(metrics);
        return runId;
    }

    /**
     * Get metrics trend for a specific metric
     */
    getMetricsTrend(metricName, options = {}) {
        let sql = `
      SELECT metric_name, value, timestamp, document_count, profile
      FROM metrics_history
      WHERE metric_name = ?
    `;
        const params = [metricName];

        if (options.since) {
            sql += " AND timestamp >= ?";
            params.push(options.since);
        }
        if (options.until) {
            sql += " AND timestamp <= ?";
            params.push(options.until);
        }
        if (options.profile) {
            sql += " AND profile = ?";
            params.push(options.profile);
        }

        sql += " ORDER BY timestamp ASC";

        if (options.limit) {
            sql += " LIMIT ?";
            params.push(options.limit);
        }

        return this.query(sql, params);
    }

    /**
     * Get latest metrics
     */
    getLatestMetrics() {
        const sql = `
      SELECT metric_name, value, timestamp
      FROM metrics_history
      WHERE (metric_name, timestamp) IN (
        SELECT metric_name, MAX(timestamp) 
        FROM metrics_history 
        GROUP BY metric_name
      )
    `;

        const results = this.query(sql);
        const metrics = {};
        for (const row of results) {
            metrics[row.metric_name] = {
                value: row.value,
                timestamp: row.timestamp,
            };
        }
        return metrics;
    }

    /**
     * Compare metrics between two time periods
     */
    compareMetricsPeriods(period1, period2) {
        const getAvgForPeriod = (start, end) => {
            const sql = `
        SELECT metric_name, AVG(value) as avg_value, COUNT(*) as count
        FROM metrics_history
        WHERE timestamp >= ? AND timestamp <= ?
        GROUP BY metric_name
      `;
            return this.query(sql, [start, end]);
        };

        const p1Metrics = getAvgForPeriod(period1.start, period1.end);
        const p2Metrics = getAvgForPeriod(period2.start, period2.end);

        const comparison = {};
        for (const m of p1Metrics) {
            comparison[m.metric_name] = { period1: m.avg_value };
        }
        for (const m of p2Metrics) {
            if (!comparison[m.metric_name]) comparison[m.metric_name] = {};
            comparison[m.metric_name].period2 = m.avg_value;
            comparison[m.metric_name].delta =
                m.avg_value - (comparison[m.metric_name].period1 || 0);
        }

        return comparison;
    }

    // ==========================================================================
    // ENTITY OPERATIONS
    // Replaces: entities.json (62KB)
    // ==========================================================================

    /**
     * Create or update an entity
     */
    createEntity(type, data) {
        const id = data.id || `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.run(
            `INSERT OR REPLACE INTO entities (id, type, data, valid_from, is_valid, updated_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
            [
                id,
                type,
                JSON.stringify(data),
                new Date().toISOString(),
                new Date().toISOString(),
            ]
        );

        return id;
    }

    /**
     * Get entity by type and ID
     */
    getEntity(type, id) {
        const row = this.queryOne(
            "SELECT * FROM entities WHERE type = ? AND id = ? AND is_valid = 1",
            [type, id]
        );
        if (!row) return null;
        return { ...row, data: JSON.parse(row.data) };
    }

    /**
     * Query entities by type
     */
    queryEntities(type, filters = {}, options = {}) {
        let sql = "SELECT * FROM entities WHERE type = ? AND is_valid = 1";
        const params = [type];

        if (filters.validAt) {
            sql += " AND valid_from <= ? AND (valid_until IS NULL OR valid_until >= ?)";
            params.push(filters.validAt, filters.validAt);
        }

        sql += " ORDER BY created_at DESC";

        if (options.limit) {
            sql += " LIMIT ?";
            params.push(options.limit);
        }

        const results = this.query(sql, params);
        return results.map((row) => ({ ...row, data: JSON.parse(row.data) }));
    }

    /**
     * Invalidate an entity
     */
    invalidateEntity(type, id, reason = null) {
        this.run(
            `UPDATE entities SET is_valid = 0, valid_until = ?, invalidation_reason = ?, updated_at = ?
       WHERE type = ? AND id = ?`,
            [new Date().toISOString(), reason, new Date().toISOString(), type, id]
        );
    }

    // ==========================================================================
    // EXPERIMENT OPERATIONS
    // ==========================================================================

    /**
     * Create an experiment
     */
    createExperiment(config) {
        const id = config.id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.run(
            `INSERT INTO experiments (id, name, experiment_type, hypothesis, status, 
                                baseline_config, auto_rollback, created_at)
       VALUES (?, ?, ?, ?, 'CREATED', ?, ?, ?)`,
            [
                id,
                config.name,
                config.type || "A/B",
                config.hypothesis || null,
                JSON.stringify(config.baselineConfig || {}),
                config.autoRollbackOnRegression ? 1 : 0,
                new Date().toISOString(),
            ]
        );

        return id;
    }

    /**
     * Update experiment status
     */
    updateExperiment(id, updates) {
        const fields = [];
        const params = [];

        if (updates.status) {
            fields.push("status = ?");
            params.push(updates.status);
        }
        if (updates.baselineResults) {
            fields.push("baseline_results = ?");
            params.push(JSON.stringify(updates.baselineResults));
        }
        if (updates.treatmentResults) {
            fields.push("treatment_results = ?");
            params.push(JSON.stringify(updates.treatmentResults));
        }
        if (updates.analysis) {
            fields.push("analysis = ?");
            params.push(JSON.stringify(updates.analysis));
        }
        if (updates.conclusion) {
            fields.push("conclusion = ?");
            params.push(updates.conclusion);
        }
        if (updates.startedAt) {
            fields.push("started_at = ?");
            params.push(updates.startedAt);
        }
        if (updates.completedAt) {
            fields.push("completed_at = ?");
            params.push(updates.completedAt);
        }

        if (fields.length === 0) return;

        params.push(id);
        this.run(`UPDATE experiments SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    /**
     * Get experiment by ID
     */
    getExperiment(id) {
        const row = this.queryOne("SELECT * FROM experiments WHERE id = ?", [id]);
        if (!row) return null;

        return {
            ...row,
            baselineConfig: row.baseline_config ? JSON.parse(row.baseline_config) : null,
            treatmentConfig: row.treatment_config ? JSON.parse(row.treatment_config) : null,
            baselineResults: row.baseline_results ? JSON.parse(row.baseline_results) : null,
            treatmentResults: row.treatment_results ? JSON.parse(row.treatment_results) : null,
            analysis: row.analysis ? JSON.parse(row.analysis) : null,
        };
    }

    /**
     * Query experiments
     */
    queryExperiments(filters = {}, options = {}) {
        let sql = "SELECT * FROM experiments WHERE 1=1";
        const params = [];

        if (filters.status) {
            sql += " AND status = ?";
            params.push(filters.status);
        }

        sql += " ORDER BY created_at DESC";

        if (options.limit) {
            sql += " LIMIT ?";
            params.push(options.limit);
        }

        return this.query(sql, params).map((row) => ({
            ...row,
            baselineConfig: row.baseline_config ? JSON.parse(row.baseline_config) : null,
            baselineResults: row.baseline_results ? JSON.parse(row.baseline_results) : null,
            treatmentResults: row.treatment_results ? JSON.parse(row.treatment_results) : null,
            analysis: row.analysis ? JSON.parse(row.analysis) : null,
        }));
    }

    // ==========================================================================
    // TEST QUEUE OPERATIONS
    // ==========================================================================

    /**
     * Add a test to the queue
     */
    enqueueTest(config) {
        const id = config.id || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.run(
            `INSERT INTO test_queue (id, status, profile, document_count, quick, created_at)
       VALUES (?, 'pending', ?, ?, ?, ?)`,
            [
                id,
                config.profile || "HIPAA_STRICT",
                config.documentCount || 200,
                config.quick ? 1 : 0,
                new Date().toISOString(),
            ]
        );

        return id;
    }

    /**
     * Get next pending test from queue
     */
    getNextPendingTest() {
        return this.queryOne(
            "SELECT * FROM test_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
        );
    }

    /**
     * Update test progress
     */
    updateTestProgress(id, progress) {
        this.run(
            `UPDATE test_queue SET progress = ?, current_doc = ?, current_phi_type = ?, status = 'running'
       WHERE id = ?`,
            [progress.percent || 0, progress.currentDoc || 0, progress.currentPhiType || null, id]
        );
    }

    /**
     * Complete a test
     */
    completeTest(id, result, error = null) {
        this.run(
            `UPDATE test_queue SET status = ?, result = ?, error = ?, completed_at = ?
       WHERE id = ?`,
            [
                error ? "failed" : "completed",
                JSON.stringify(result),
                error,
                new Date().toISOString(),
                id,
            ]
        );
    }

    /**
     * Get test status
     */
    getTestStatus(id) {
        const row = this.queryOne("SELECT * FROM test_queue WHERE id = ?", [id]);
        if (!row) return null;
        return { ...row, result: row.result ? JSON.parse(row.result) : null };
    }

    // ==========================================================================
    // INTERVENTION OPERATIONS
    // ==========================================================================

    /**
     * Record an intervention
     */
    recordIntervention(intervention) {
        const id = intervention.id || `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.run(
            `INSERT INTO interventions (id, type, description, target, parameters, reason, 
                                  metrics_before, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                intervention.type,
                intervention.description,
                intervention.target || null,
                JSON.stringify(intervention.parameters || {}),
                intervention.reason || null,
                JSON.stringify(intervention.metricsBefore || null),
                new Date().toISOString(),
            ]
        );

        return id;
    }

    /**
     * Update intervention with results
     */
    updateIntervention(id, updates) {
        const fields = [];
        const params = [];

        if (updates.status) {
            fields.push("status = ?");
            params.push(updates.status);
        }
        if (updates.metricsAfter) {
            fields.push("metrics_after = ?");
            params.push(JSON.stringify(updates.metricsAfter));
        }
        if (updates.completedAt) {
            fields.push("completed_at = ?");
            params.push(updates.completedAt);
        }

        if (fields.length === 0) return;

        params.push(id);
        this.run(`UPDATE interventions SET ${fields.join(", ")} WHERE id = ?`, params);
    }

    /**
     * Query interventions
     */
    queryInterventions(filters = {}, options = {}) {
        let sql = "SELECT * FROM interventions WHERE 1=1";
        const params = [];

        if (filters.type) {
            sql += " AND type = ?";
            params.push(filters.type);
        }
        if (filters.status) {
            sql += " AND status = ?";
            params.push(filters.status);
        }

        sql += " ORDER BY created_at DESC";

        if (options.limit) {
            sql += " LIMIT ?";
            params.push(options.limit);
        }

        return this.query(sql, params).map((row) => ({
            ...row,
            parameters: row.parameters ? JSON.parse(row.parameters) : {},
            metricsBefore: row.metrics_before ? JSON.parse(row.metrics_before) : null,
            metricsAfter: row.metrics_after ? JSON.parse(row.metrics_after) : null,
        }));
    }

    // ==========================================================================
    // STATISTICS
    // ==========================================================================

    /**
     * Get database statistics
     */
    getStats() {
        const tables = [
            "decisions",
            "patterns",
            "metrics_history",
            "entities",
            "experiments",
            "interventions",
            "test_queue",
        ];

        const stats = {};
        for (const table of tables) {
            const result = this.queryOne(`SELECT COUNT(*) as count FROM ${table}`);
            stats[table] = result ? result.count : 0;
        }

        // Database file size
        if (fs.existsSync(this.dbPath)) {
            stats.fileSizeBytes = fs.statSync(this.dbPath).size;
            stats.fileSizeMB = (stats.fileSizeBytes / 1024 / 1024).toFixed(2);
        }

        return stats;
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance = null;

function getDatabase(dbPath, options) {
    if (!instance) {
        instance = new CortexDatabase(dbPath, options);
    }
    return instance;
}

function closeDatabase() {
    if (instance) {
        instance.close();
        instance = null;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    CortexDatabase,
    getDatabase,
    closeDatabase,
    DEFAULT_DB_PATH,
};
