/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   JSON TO SQLITE MIGRATION                                                    ║
 * ║   One-time migration of existing JSON knowledge files to SQLite               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node db/migrate.js              - Run full migration
 *   node db/migrate.js --dry-run    - Preview migration without changes
 *   node db/migrate.js --stats      - Show migration statistics only
 *
 * This script migrates:
 *   - decisions.json (857KB) → decisions table
 *   - patterns.json (510KB) → patterns table
 *   - temporal-index.json (43KB) → metrics_history table
 *   - entities.json (62KB) → entities table
 *   - interventions.json (8KB) → interventions table
 *   - insights.json (4KB) → insights table
 *   - history-consultations.json (10KB) → history_consultations table
 *
 * Original JSON files are preserved as backup.
 */

const fs = require("fs");
const path = require("path");
const { CortexDatabase } = require("./database");

// ============================================================================
// CONFIGURATION
// ============================================================================

const KNOWLEDGE_DIR = path.join(__dirname, "..", "storage", "knowledge");
const BACKUP_DIR = path.join(__dirname, "..", "storage", "knowledge-backup");

const FILES_TO_MIGRATE = [
    { file: "decisions.json", table: "decisions", handler: "migrateDecisions" },
    { file: "patterns.json", table: "patterns", handler: "migratePatterns" },
    { file: "temporal-index.json", table: "metrics_history", handler: "migrateTemporalIndex" },
    { file: "entities.json", table: "entities", handler: "migrateEntities" },
    { file: "interventions.json", table: "interventions", handler: "migrateInterventions" },
    { file: "insights.json", table: "insights", handler: "migrateInsights" },
    { file: "history-consultations.json", table: "history_consultations", handler: "migrateHistoryConsultations" },
];

// ============================================================================
// MIGRATION CLASS
// ============================================================================

class CortexMigration {
    constructor(options = {}) {
        this.dryRun = options.dryRun || false;
        this.verbose = options.verbose || false;
        this.db = null;
        this.stats = {
            filesProcessed: 0,
            totalRecords: 0,
            byTable: {},
            errors: [],
            startTime: Date.now(),
        };
    }

    log(message) {
        console.error(`[Migration] ${message}`);
    }

    verbose_log(message) {
        if (this.verbose) {
            console.error(`[Migration:DEBUG] ${message}`);
        }
    }

    /**
     * Run the full migration
     */
    async run() {
        this.log("═══════════════════════════════════════════════════════════════");
        this.log("  VULPES CORTEX: JSON → SQLite Migration");
        this.log("═══════════════════════════════════════════════════════════════");
        this.log(`  Mode: ${this.dryRun ? "DRY RUN (no changes)" : "LIVE MIGRATION"}`);
        this.log(`  Knowledge Dir: ${KNOWLEDGE_DIR}`);
        this.log("═══════════════════════════════════════════════════════════════\n");

        // Check if knowledge directory exists
        if (!fs.existsSync(KNOWLEDGE_DIR)) {
            this.log("ERROR: Knowledge directory not found. Nothing to migrate.");
            return false;
        }

        // Create backup directory
        if (!this.dryRun) {
            if (!fs.existsSync(BACKUP_DIR)) {
                fs.mkdirSync(BACKUP_DIR, { recursive: true });
                this.log(`Created backup directory: ${BACKUP_DIR}`);
            }
        }

        // Initialize database
        if (!this.dryRun) {
            this.db = new CortexDatabase();
            this.log("Database initialized\n");
        }

        // Migrate each file
        for (const config of FILES_TO_MIGRATE) {
            await this.migrateFile(config);
        }

        // Print summary
        this.printSummary();

        // Cleanup
        if (this.db) {
            this.db.close();
        }

        return this.stats.errors.length === 0;
    }

    /**
     * Migrate a single JSON file
     */
    async migrateFile(config) {
        const filePath = path.join(KNOWLEDGE_DIR, config.file);

        if (!fs.existsSync(filePath)) {
            this.verbose_log(`Skipping ${config.file} (not found)`);
            return;
        }

        this.log(`Processing ${config.file}...`);

        try {
            // Read and parse JSON
            const content = fs.readFileSync(filePath, "utf-8");
            const data = JSON.parse(content);
            const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);

            // Get record count
            let records = [];
            if (Array.isArray(data)) {
                records = data;
            } else if (typeof data === "object") {
                // Handle different data structures
                records = this.extractRecords(data, config.file);
            }

            this.log(`  → Found ${records.length} records (${fileSize}KB)`);

            // Backup original file
            if (!this.dryRun) {
                const backupPath = path.join(BACKUP_DIR, config.file);
                fs.copyFileSync(filePath, backupPath);
                this.verbose_log(`  → Backed up to ${backupPath}`);
            }

            // Migrate records
            if (!this.dryRun && records.length > 0) {
                const migrated = this[config.handler](records);
                this.stats.byTable[config.table] = migrated;
                this.stats.totalRecords += migrated;
            } else {
                this.stats.byTable[config.table] = records.length;
                this.stats.totalRecords += records.length;
            }

            this.stats.filesProcessed++;
            this.log(`  ✓ Complete\n`);
        } catch (error) {
            this.log(`  ✗ ERROR: ${error.message}`);
            this.stats.errors.push({ file: config.file, error: error.message });
        }
    }

    /**
     * Extract records from different JSON structures
     */
    extractRecords(data, filename) {
        // Handle patterns.json structure: { failures: {}, successes: {} }
        if (filename === "patterns.json") {
            const records = [];
            if (data.failures) {
                for (const [phiType, categories] of Object.entries(data.failures)) {
                    for (const [category, items] of Object.entries(categories || {})) {
                        if (Array.isArray(items)) {
                            for (const item of items) {
                                records.push({ ...item, phiType, category, patternType: "failure" });
                            }
                        }
                    }
                }
            }
            if (data.successes) {
                for (const [phiType, categories] of Object.entries(data.successes)) {
                    for (const [category, items] of Object.entries(categories || {})) {
                        if (Array.isArray(items)) {
                            for (const item of items) {
                                records.push({ ...item, phiType, category, patternType: "success" });
                            }
                        }
                    }
                }
            }
            return records;
        }

        // Handle temporal-index.json structure: { metrics: [], events: [] }
        if (filename === "temporal-index.json") {
            return data.metrics || data.events || [];
        }

        // Handle entities.json structure: { Type: { id: entity } }
        if (filename === "entities.json") {
            const records = [];
            for (const [type, entities] of Object.entries(data)) {
                if (typeof entities === "object") {
                    for (const [id, entity] of Object.entries(entities)) {
                        records.push({ id, type, ...entity });
                    }
                }
            }
            return records;
        }

        // Handle decisions.json structure: array or object with indexed keys
        if (filename === "decisions.json") {
            if (Array.isArray(data)) {
                return data;
            }
            // Could be keyed object
            return Object.values(data);
        }

        // Default: try values if object, or return empty
        if (typeof data === "object" && !Array.isArray(data)) {
            return Object.values(data);
        }

        return [];
    }

    // ==========================================================================
    // SPECIFIC MIGRATION HANDLERS
    // ==========================================================================

    migrateDecisions(records) {
        const stmt = this.db.db.prepare(`
      INSERT OR IGNORE INTO decisions (id, intervention_id, decision_type, outcome, reason, 
                                       metrics_before, metrics_after, context, timestamp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        let count = 0;
        const insert = this.db.db.transaction((items) => {
            for (const record of items) {
                try {
                    stmt.run(
                        record.id || `dec-migrated-${count}`,
                        record.interventionId || record.intervention_id || null,
                        record.type || record.decisionType || record.decision_type || "migrated",
                        record.outcome || null,
                        record.reason || null,
                        JSON.stringify(record.metricsBefore || record.metrics_before || null),
                        JSON.stringify(record.metricsAfter || record.metrics_after || null),
                        JSON.stringify(record.context || null),
                        record.timestamp || record.createdAt || new Date().toISOString(),
                        record.createdAt || record.created_at || new Date().toISOString()
                    );
                    count++;
                } catch (e) {
                    this.verbose_log(`  Skip duplicate: ${record.id}`);
                }
            }
        });

        insert(records);
        return count;
    }

    migratePatterns(records) {
        const stmt = this.db.db.prepare(`
      INSERT OR IGNORE INTO patterns (id, phi_type, category, pattern_type, severity, count,
                                      confidence, description, examples, indicators, remediation,
                                      first_seen, last_seen, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        let count = 0;
        const insert = this.db.db.transaction((items) => {
            for (const record of items) {
                try {
                    const id = record.id || `pat-${record.phiType}-${record.category}-${count}`;
                    stmt.run(
                        id,
                        record.phiType || record.phi_type || "UNKNOWN",
                        record.category || "UNKNOWN",
                        record.patternType || record.pattern_type || "failure",
                        record.severity || null,
                        record.count || 1,
                        record.confidence || null,
                        record.description || null,
                        JSON.stringify(record.examples || []),
                        JSON.stringify(record.indicators || []),
                        record.remediation || null,
                        record.firstSeen || record.first_seen || new Date().toISOString(),
                        record.lastSeen || record.last_seen || new Date().toISOString(),
                        new Date().toISOString()
                    );
                    count++;
                } catch (e) {
                    this.verbose_log(`  Skip: ${e.message}`);
                }
            }
        });

        insert(records);
        return count;
    }

    migrateTemporalIndex(records) {
        const stmt = this.db.db.prepare(`
      INSERT INTO metrics_history (run_id, metric_name, value, document_count, profile, context, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        let count = 0;
        const insert = this.db.db.transaction((items) => {
            for (const record of items) {
                // Handle flattened metrics object
                if (record.metrics && typeof record.metrics === "object") {
                    for (const [name, value] of Object.entries(record.metrics)) {
                        if (typeof value === "number") {
                            stmt.run(
                                record.runId || record.run_id || `run-${count}`,
                                name,
                                value,
                                record.documentCount || record.document_count || null,
                                record.profile || null,
                                JSON.stringify(record),
                                record.timestamp || new Date().toISOString()
                            );
                            count++;
                        }
                    }
                } else if (record.metricName || record.metric_name) {
                    stmt.run(
                        record.runId || record.run_id || `run-${count}`,
                        record.metricName || record.metric_name,
                        record.value || 0,
                        record.documentCount || null,
                        record.profile || null,
                        JSON.stringify(record),
                        record.timestamp || new Date().toISOString()
                    );
                    count++;
                }
            }
        });

        insert(records);
        return count;
    }

    migrateEntities(records) {
        const stmt = this.db.db.prepare(`
      INSERT OR IGNORE INTO entities (id, type, data, valid_from, valid_until, is_valid, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        let count = 0;
        const insert = this.db.db.transaction((items) => {
            for (const record of items) {
                try {
                    stmt.run(
                        record.id || `ent-${count}`,
                        record.type || "UNKNOWN",
                        JSON.stringify(record),
                        record.validFrom || record.valid_from || new Date().toISOString(),
                        record.validUntil || record.valid_until || null,
                        record.isValid !== false ? 1 : 0,
                        record.createdAt || record.created_at || new Date().toISOString()
                    );
                    count++;
                } catch (e) {
                    this.verbose_log(`  Skip: ${e.message}`);
                }
            }
        });

        insert(records);
        return count;
    }

    migrateInterventions(records) {
        const stmt = this.db.db.prepare(`
      INSERT OR IGNORE INTO interventions (id, type, description, target, parameters, reason,
                                           status, metrics_before, metrics_after, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        let count = 0;
        const insert = this.db.db.transaction((items) => {
            for (const record of items) {
                try {
                    stmt.run(
                        record.id || `int-${count}`,
                        record.type || "UNKNOWN",
                        record.description || "",
                        record.target || null,
                        JSON.stringify(record.parameters || {}),
                        record.reason || null,
                        record.status || "MIGRATED",
                        JSON.stringify(record.metricsBefore || record.metrics_before || null),
                        JSON.stringify(record.metricsAfter || record.metrics_after || null),
                        record.createdAt || record.created_at || new Date().toISOString(),
                        record.completedAt || record.completed_at || null
                    );
                    count++;
                } catch (e) {
                    this.verbose_log(`  Skip: ${e.message}`);
                }
            }
        });

        insert(records);
        return count;
    }

    migrateInsights(records) {
        const stmt = this.db.db.prepare(`
      INSERT OR IGNORE INTO insights (id, type, content, source_run_id, confidence, actionable, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        let count = 0;
        const insert = this.db.db.transaction((items) => {
            for (const record of items) {
                try {
                    stmt.run(
                        record.id || `ins-${count}`,
                        record.type || "UNKNOWN",
                        record.content || JSON.stringify(record),
                        record.sourceRunId || record.source_run_id || null,
                        record.confidence || null,
                        record.actionable ? 1 : 0,
                        record.createdAt || record.created_at || new Date().toISOString()
                    );
                    count++;
                } catch (e) {
                    this.verbose_log(`  Skip: ${e.message}`);
                }
            }
        });

        insert(records);
        return count;
    }

    migrateHistoryConsultations(records) {
        const stmt = this.db.db.prepare(`
      INSERT OR IGNORE INTO history_consultations (id, decision_type, context, exact_matches,
                                                   similar_attempts, related_successes, related_failures,
                                                   warnings, recommendations, confidence, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        let count = 0;
        const insert = this.db.db.transaction((items) => {
            for (const record of items) {
                try {
                    stmt.run(
                        record.id || `hc-${count}`,
                        record.decisionType || record.decision_type || "UNKNOWN",
                        JSON.stringify(record.context || {}),
                        record.exactMatches || record.exact_matches || 0,
                        record.similarAttempts || record.similar_attempts || 0,
                        record.relatedSuccesses || record.related_successes || 0,
                        record.relatedFailures || record.related_failures || 0,
                        JSON.stringify(record.warnings || []),
                        JSON.stringify(record.recommendations || []),
                        record.confidence || null,
                        record.summary || null,
                        record.createdAt || record.created_at || new Date().toISOString()
                    );
                    count++;
                } catch (e) {
                    this.verbose_log(`  Skip: ${e.message}`);
                }
            }
        });

        insert(records);
        return count;
    }

    // ==========================================================================
    // SUMMARY
    // ==========================================================================

    printSummary() {
        const duration = ((Date.now() - this.stats.startTime) / 1000).toFixed(2);

        this.log("═══════════════════════════════════════════════════════════════");
        this.log("  MIGRATION SUMMARY");
        this.log("═══════════════════════════════════════════════════════════════");
        this.log(`  Files Processed: ${this.stats.filesProcessed}`);
        this.log(`  Total Records:   ${this.stats.totalRecords}`);
        this.log(`  Duration:        ${duration}s`);
        this.log("");
        this.log("  By Table:");

        for (const [table, count] of Object.entries(this.stats.byTable)) {
            this.log(`    ${table.padEnd(25)} ${count} records`);
        }

        if (this.stats.errors.length > 0) {
            this.log("");
            this.log("  ERRORS:");
            for (const err of this.stats.errors) {
                this.log(`    ${err.file}: ${err.error}`);
            }
        }

        this.log("═══════════════════════════════════════════════════════════════");

        if (this.dryRun) {
            this.log("  DRY RUN COMPLETE - No changes made");
        } else {
            this.log("  MIGRATION COMPLETE");
            this.log(`  Backup location: ${BACKUP_DIR}`);
        }

        this.log("═══════════════════════════════════════════════════════════════\n");
    }

    /**
     * Show statistics only
     */
    showStats() {
        this.log("═══════════════════════════════════════════════════════════════");
        this.log("  KNOWLEDGE FILE STATISTICS");
        this.log("═══════════════════════════════════════════════════════════════\n");

        if (!fs.existsSync(KNOWLEDGE_DIR)) {
            this.log("Knowledge directory not found.");
            return;
        }

        let totalSize = 0;
        let totalRecords = 0;

        for (const config of FILES_TO_MIGRATE) {
            const filePath = path.join(KNOWLEDGE_DIR, config.file);
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                const size = stat.size;
                totalSize += size;

                try {
                    const content = fs.readFileSync(filePath, "utf-8");
                    const data = JSON.parse(content);
                    const records = this.extractRecords(data, config.file);
                    totalRecords += records.length;

                    this.log(
                        `  ${config.file.padEnd(30)} ${(size / 1024).toFixed(1).padStart(8)}KB  ${String(records.length).padStart(6)} records`
                    );
                } catch (e) {
                    this.log(`  ${config.file.padEnd(30)} ${(size / 1024).toFixed(1).padStart(8)}KB  (parse error)`);
                }
            }
        }

        this.log("");
        this.log(`  ${"TOTAL".padEnd(30)} ${(totalSize / 1024).toFixed(1).padStart(8)}KB  ${String(totalRecords).padStart(6)} records`);
        this.log("\n═══════════════════════════════════════════════════════════════\n");
    }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
    const args = process.argv.slice(2);

    const options = {
        dryRun: args.includes("--dry-run"),
        verbose: args.includes("--verbose") || args.includes("-v"),
        statsOnly: args.includes("--stats"),
    };

    const migration = new CortexMigration(options);

    if (options.statsOnly) {
        migration.showStats();
        return;
    }

    const success = await migration.run();
    process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
    main().catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
}

module.exports = { CortexMigration };
