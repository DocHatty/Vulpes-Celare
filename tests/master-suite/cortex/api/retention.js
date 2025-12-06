/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   DATA RETENTION SERVICE                                                      ║
 * ║   Archive and Cleanup Policies for Knowledge Data                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Manages data lifecycle:
 * - Archive old decisions, patterns, metrics
 * - Purge data beyond retention window
 * - Compact database periodically
 */

const { getDatabase } = require("../db/database");

// ============================================================================
// DEFAULT RETENTION POLICIES
// ============================================================================

const DEFAULT_POLICIES = {
    decisions: {
        retainDays: 90,       // Keep decisions for 90 days
        archiveTable: true,   // Move to archive table before delete
    },
    patterns: {
        retainDays: 180,      // Keep patterns for 180 days
        minCount: 5,          // Keep if count >= 5 regardless of age
    },
    metrics_history: {
        retainDays: 30,       // Keep detailed metrics for 30 days
        aggregateOlder: true, // Aggregate older data to daily summaries
    },
    test_queue: {
        retainDays: 7,        // Keep completed tests for 7 days
        keepFailed: true,     // Always keep failed tests
    },
    history_consultations: {
        retainDays: 30,
    },
};

// ============================================================================
// RETENTION SERVICE CLASS
// ============================================================================

class RetentionService {
    constructor(options = {}) {
        this.db = options.database || getDatabase();
        this.policies = { ...DEFAULT_POLICIES, ...options.policies };
    }

    /**
     * Run all retention policies
     */
    runAll(dryRun = false) {
        console.error(`[Retention] Running retention policies (dryRun: ${dryRun})`);

        const results = {
            timestamp: new Date().toISOString(),
            dryRun,
            tables: {},
        };

        results.tables.decisions = this.cleanDecisions(dryRun);
        results.tables.patterns = this.cleanPatterns(dryRun);
        results.tables.metrics_history = this.cleanMetrics(dryRun);
        results.tables.test_queue = this.cleanTestQueue(dryRun);
        results.tables.history_consultations = this.cleanHistoryConsultations(dryRun);

        // Compact database
        if (!dryRun) {
            this.compactDatabase();
        }

        console.error(`[Retention] Complete. Results:`, JSON.stringify(results, null, 2));
        return results;
    }

    /**
     * Clean old decisions
     */
    cleanDecisions(dryRun = false) {
        const policy = this.policies.decisions;
        const cutoff = this.getCutoffDate(policy.retainDays);

        // Count records to delete
        const count = this.db.queryOne(
            "SELECT COUNT(*) as count FROM decisions WHERE timestamp < ?",
            [cutoff]
        ).count;

        if (!dryRun && count > 0) {
            if (policy.archiveTable) {
                // Create archive table if not exists
                this.db.run(`
          CREATE TABLE IF NOT EXISTS decisions_archive AS 
          SELECT * FROM decisions WHERE 1=0
        `);

                // Move to archive
                this.db.run(
                    "INSERT INTO decisions_archive SELECT * FROM decisions WHERE timestamp < ?",
                    [cutoff]
                );
            }

            // Delete
            this.db.run("DELETE FROM decisions WHERE timestamp < ?", [cutoff]);
        }

        return { policy, cutoff, recordsAffected: count };
    }

    /**
     * Clean old patterns
     */
    cleanPatterns(dryRun = false) {
        const policy = this.policies.patterns;
        const cutoff = this.getCutoffDate(policy.retainDays);

        // Count records to delete (old AND low count)
        const count = this.db.queryOne(
            "SELECT COUNT(*) as count FROM patterns WHERE last_seen < ? AND count < ?",
            [cutoff, policy.minCount]
        ).count;

        if (!dryRun && count > 0) {
            this.db.run(
                "DELETE FROM patterns WHERE last_seen < ? AND count < ?",
                [cutoff, policy.minCount]
            );
        }

        return { policy, cutoff, recordsAffected: count };
    }

    /**
     * Clean old metrics with aggregation
     */
    cleanMetrics(dryRun = false) {
        const policy = this.policies.metrics_history;
        const cutoff = this.getCutoffDate(policy.retainDays);

        // Count records to aggregate/delete
        const count = this.db.queryOne(
            "SELECT COUNT(*) as count FROM metrics_history WHERE timestamp < ?",
            [cutoff]
        ).count;

        if (!dryRun && count > 0 && policy.aggregateOlder) {
            // Create daily aggregates before deletion
            this.db.run(`
        CREATE TABLE IF NOT EXISTS metrics_daily AS
        SELECT 
          metric_name,
          DATE(timestamp) as date,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          COUNT(*) as sample_count
        FROM metrics_history
        WHERE 1=0
        GROUP BY metric_name, DATE(timestamp)
      `);

            // Insert aggregates for data we're about to delete
            this.db.run(`
        INSERT OR REPLACE INTO metrics_daily
        SELECT 
          metric_name,
          DATE(timestamp) as date,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          COUNT(*) as sample_count
        FROM metrics_history
        WHERE timestamp < ?
        GROUP BY metric_name, DATE(timestamp)
      `, [cutoff]);

            // Delete detailed records
            this.db.run("DELETE FROM metrics_history WHERE timestamp < ?", [cutoff]);
        }

        return { policy, cutoff, recordsAffected: count };
    }

    /**
     * Clean old test queue entries
     */
    cleanTestQueue(dryRun = false) {
        const policy = this.policies.test_queue;
        const cutoff = this.getCutoffDate(policy.retainDays);

        // Count records to delete (completed only, keep failed if configured)
        let sql = "SELECT COUNT(*) as count FROM test_queue WHERE completed_at < ?";
        const params = [cutoff];

        if (policy.keepFailed) {
            sql += " AND status = 'completed'";
        }

        const count = this.db.queryOne(sql, params).count;

        if (!dryRun && count > 0) {
            let deleteSql = "DELETE FROM test_queue WHERE completed_at < ?";
            if (policy.keepFailed) {
                deleteSql += " AND status = 'completed'";
            }
            this.db.run(deleteSql, params);
        }

        return { policy, cutoff, recordsAffected: count };
    }

    /**
     * Clean old history consultations
     */
    cleanHistoryConsultations(dryRun = false) {
        const policy = this.policies.history_consultations;
        const cutoff = this.getCutoffDate(policy.retainDays);

        const count = this.db.queryOne(
            "SELECT COUNT(*) as count FROM history_consultations WHERE created_at < ?",
            [cutoff]
        ).count;

        if (!dryRun && count > 0) {
            this.db.run("DELETE FROM history_consultations WHERE created_at < ?", [cutoff]);
        }

        return { policy, cutoff, recordsAffected: count };
    }

    /**
     * Compact the database (VACUUM)
     */
    compactDatabase() {
        console.error("[Retention] Compacting database...");
        this.db.run("VACUUM");
        console.error("[Retention] Database compacted");
    }

    /**
     * Get cutoff date
     */
    getCutoffDate(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString();
    }

    /**
     * Get retention statistics
     */
    getStats() {
        const stats = {
            policies: this.policies,
            currentSizes: {},
            oldRecords: {},
        };

        // Check each table
        for (const table of Object.keys(this.policies)) {
            const policy = this.policies[table];
            const cutoff = this.getCutoffDate(policy.retainDays);

            try {
                const total = this.db.queryOne(`SELECT COUNT(*) as count FROM ${table}`);
                stats.currentSizes[table] = total ? total.count : 0;

                // Get count of old records
                const timestampCol = table === "test_queue" ? "completed_at" :
                    table === "patterns" ? "last_seen" :
                        table === "history_consultations" ? "created_at" : "timestamp";

                const old = this.db.queryOne(
                    `SELECT COUNT(*) as count FROM ${table} WHERE ${timestampCol} < ?`,
                    [cutoff]
                );
                stats.oldRecords[table] = old ? old.count : 0;
            } catch {
                stats.currentSizes[table] = "error";
            }
        }

        return stats;
    }
}

// ============================================================================
// SINGLETON
// ============================================================================

let serviceInstance = null;

function getRetentionService(options) {
    if (!serviceInstance) {
        serviceInstance = new RetentionService(options);
    }
    return serviceInstance;
}

// ============================================================================
// CLI
// ============================================================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run");
    const stats = args.includes("--stats");

    const service = new RetentionService();

    if (stats) {
        console.log(JSON.stringify(service.getStats(), null, 2));
    } else {
        const results = service.runAll(dryRun);
        console.log(JSON.stringify(results, null, 2));
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    RetentionService,
    getRetentionService,
    DEFAULT_POLICIES,
};
