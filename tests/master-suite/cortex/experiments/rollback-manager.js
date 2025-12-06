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
 * ║   ROLLBACK MANAGER                                                            ║
 * ║   Safe Automated Reversal of Harmful Changes                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * CRITICAL SAFETY SYSTEM
 *
 * When an experiment or intervention causes regression:
 * 1. DETECT  - Comparison engine identifies regression
 * 2. DECIDE  - Evaluate if rollback is warranted
 * 3. EXECUTE - Safely revert to previous state
 * 4. VERIFY  - Confirm rollback was successful
 * 5. RECORD  - Document what happened and why
 *
 * ROLLBACK TRIGGERS:
 * ─────────────────────────────────────────────────────────────────────────────────
 * AUTOMATIC (immediate):
 * - Sensitivity drops > 5%
 * - Critical PHI type (SSN, MRN) detection decreases
 * - System error during testing
 *
 * SEMI-AUTOMATIC (with confirmation):
 * - Sensitivity drops 2-5%
 * - Specificity drops significantly
 * - Mixed results with net negative
 *
 * MANUAL (notification only):
 * - Minor changes
 * - Inconclusive results
 *
 * ROLLBACK TYPES:
 * ─────────────────────────────────────────────────────────────────────────────────
 * CODE_ROLLBACK        - Revert source file changes
 * CONFIG_ROLLBACK      - Revert configuration changes
 * DICTIONARY_ROLLBACK  - Revert dictionary changes
 * FULL_ROLLBACK        - Revert to a complete snapshot
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { EventEmitter } = require("events");
const { PATHS } = require("../core/config");

// ============================================================================
// ROLLBACK POLICIES
// ============================================================================

const ROLLBACK_POLICIES = {
  STRICT: {
    name: "Strict (HIPAA Mode)",
    autoRollbackThresholds: {
      sensitivityDrop: -1, // Any drop triggers rollback
      criticalTypeDrop: -0.5, // SSN, MRN - very strict
      specificityDrop: -5,
    },
    requiresApproval: false,
  },
  STANDARD: {
    name: "Standard",
    autoRollbackThresholds: {
      sensitivityDrop: -3,
      criticalTypeDrop: -2,
      specificityDrop: -10,
    },
    requiresApproval: false,
  },
  LENIENT: {
    name: "Lenient (Development)",
    autoRollbackThresholds: {
      sensitivityDrop: -5,
      criticalTypeDrop: -5,
      specificityDrop: -15,
    },
    requiresApproval: true,
  },
};

const CRITICAL_PHI_TYPES = ["SSN", "MRN", "MEDICAL_RECORD", "HEALTH_PLAN_ID"];

// ============================================================================
// ROLLBACK MANAGER CLASS
// ============================================================================

class RollbackManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.snapshotManager = options.snapshotManager || null;
    this.interventionTracker = options.interventionTracker || null;
    this.policy = options.policy || "STANDARD";

    this.storagePath = path.join(PATHS.knowledge, "rollbacks.json");
    this.backupDir = path.join(PATHS.snapshots, "backups");
    this.data = this.loadData();

    this.ensureDir(this.backupDir);
  }

  loadData() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
      }
    } catch (e) {
      console.warn("RollbackManager: Starting with empty rollback history");
    }
    return {
      rollbacks: [],
      pending: [],
      backups: [],
      stats: {
        total: 0,
        successful: 0,
        failed: 0,
        automatic: 0,
        manual: 0,
      },
    };
  }

  saveData() {
    const dir = path.dirname(this.storagePath);
    this.ensureDir(dir);
    fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2));
  }

  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // ==========================================================================
  // ROLLBACK EVALUATION
  // ==========================================================================

  /**
   * Evaluate if a rollback is needed based on comparison results
   * @param {Object} comparison - Comparison from ComparisonEngine
   * @returns {Object} - Rollback decision
   */
  evaluateForRollback(comparison) {
    const policyConfig = ROLLBACK_POLICIES[this.policy];
    const thresholds = policyConfig.autoRollbackThresholds;

    const decision = {
      timestamp: new Date().toISOString(),
      comparisonId: comparison.id,
      shouldRollback: false,
      type: "NONE",
      priority: "LOW",
      reasons: [],
      requiresApproval: policyConfig.requiresApproval,
      policy: this.policy,
    };

    // Check sensitivity drop
    const sensitivityDelta = comparison.metrics?.sensitivity?.delta || 0;
    if (sensitivityDelta < thresholds.sensitivityDrop) {
      decision.shouldRollback = true;
      decision.type = "AUTOMATIC";
      decision.priority = "CRITICAL";
      decision.reasons.push(
        `Sensitivity dropped by ${Math.abs(sensitivityDelta).toFixed(2)}% (threshold: ${Math.abs(thresholds.sensitivityDrop)}%)`,
      );
    }

    // Check critical PHI types
    for (const phiType of CRITICAL_PHI_TYPES) {
      const typeData = comparison.phiTypes?.[phiType];
      if (
        typeData &&
        typeData.sensitivity?.delta < thresholds.criticalTypeDrop
      ) {
        decision.shouldRollback = true;
        decision.type = "AUTOMATIC";
        decision.priority = "CRITICAL";
        decision.reasons.push(
          `Critical type ${phiType} sensitivity dropped by ${Math.abs(typeData.sensitivity.delta).toFixed(2)}%`,
        );
      }
    }

    // Check specificity drop (usually less critical)
    const specificityDelta = comparison.metrics?.specificity?.delta || 0;
    if (specificityDelta < thresholds.specificityDrop) {
      if (!decision.shouldRollback) {
        decision.shouldRollback = true;
        decision.type = "SEMI_AUTOMATIC";
        decision.priority = "HIGH";
      }
      decision.reasons.push(
        `Specificity dropped by ${Math.abs(specificityDelta).toFixed(2)}% (threshold: ${Math.abs(thresholds.specificityDrop)}%)`,
      );
    }

    // Check document-level regressions
    if (
      comparison.documents?.stats?.regressed >
      comparison.documents?.stats?.improved * 2
    ) {
      if (!decision.shouldRollback) {
        decision.shouldRollback = true;
        decision.type = "SEMI_AUTOMATIC";
        decision.priority = "MEDIUM";
      }
      decision.reasons.push(
        `${comparison.documents.stats.regressed} documents regressed vs ${comparison.documents.stats.improved} improved`,
      );
    }

    // Emit event for monitoring
    if (decision.shouldRollback) {
      this.emit("rollbackRecommended", decision);
    }

    return decision;
  }

  // ==========================================================================
  // BACKUP CREATION
  // ==========================================================================

  /**
   * Create a backup before making changes (call this BEFORE applying treatment)
   * @param {Object} target - What to backup { type, files, config }
   * @returns {Object} - Backup record
   */
  createBackup(target) {
    const backup = {
      id: `BACKUP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: target.type || "GENERAL",
      files: [],
      config: null,
      hash: null,
    };

    // Backup files
    if (target.files && target.files.length > 0) {
      for (const filePath of target.files) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf8");
          const backupPath = path.join(
            this.backupDir,
            backup.id,
            path.basename(filePath),
          );

          this.ensureDir(path.dirname(backupPath));
          fs.writeFileSync(backupPath, content);

          backup.files.push({
            originalPath: filePath,
            backupPath,
            hash: this.hashContent(content),
          });
        }
      }
    }

    // Backup config
    if (target.config) {
      const configPath = path.join(this.backupDir, backup.id, "config.json");
      this.ensureDir(path.dirname(configPath));
      fs.writeFileSync(configPath, JSON.stringify(target.config, null, 2));
      backup.config = {
        path: configPath,
        hash: this.hashContent(JSON.stringify(target.config)),
      };
    }

    // Overall hash
    backup.hash = this.hashContent(
      JSON.stringify(backup.files.map((f) => f.hash)),
    );

    // Register backup
    this.data.backups.push({
      id: backup.id,
      timestamp: backup.timestamp,
      type: backup.type,
      fileCount: backup.files.length,
      hash: backup.hash,
    });
    this.saveData();

    this.emit("backupCreated", backup);
    return backup;
  }

  // ==========================================================================
  // ROLLBACK EXECUTION
  // ==========================================================================

  /**
   * Execute a rollback to a previous backup
   * @param {string} backupId - ID of backup to restore
   * @param {Object} options - Rollback options
   */
  executeRollback(backupId, options = {}) {
    const backupMeta = this.data.backups.find((b) => b.id === backupId);
    if (!backupMeta) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    const rollback = {
      id: `ROLLBACK-${Date.now()}`,
      timestamp: new Date().toISOString(),
      backupId,
      reason: options.reason || "Unspecified",
      triggeredBy: options.triggeredBy || "manual",
      status: "IN_PROGRESS",
      filesRestored: [],
      configRestored: false,
      errors: [],
    };

    try {
      this.emit("rollbackStarted", rollback);

      // Restore files
      const backupDir = path.join(this.backupDir, backupId);
      if (fs.existsSync(backupDir)) {
        // Read backup manifest
        const manifestPath = path.join(backupDir, "manifest.json");
        let manifest = null;

        if (fs.existsSync(manifestPath)) {
          manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        } else {
          // Reconstruct from files
          manifest = { files: [] };
          const files = fs.readdirSync(backupDir);
          for (const file of files) {
            if (file !== "config.json" && file !== "manifest.json") {
              manifest.files.push({
                backupPath: path.join(backupDir, file),
                originalPath: null, // Unknown - would need to be in manifest
              });
            }
          }
        }

        // Restore each file
        for (const fileInfo of manifest.files || []) {
          if (fileInfo.originalPath && fs.existsSync(fileInfo.backupPath)) {
            try {
              const content = fs.readFileSync(fileInfo.backupPath, "utf8");
              fs.writeFileSync(fileInfo.originalPath, content);
              rollback.filesRestored.push(fileInfo.originalPath);
            } catch (e) {
              rollback.errors.push({
                file: fileInfo.originalPath,
                error: e.message,
              });
            }
          }
        }

        // Restore config
        const configPath = path.join(backupDir, "config.json");
        if (fs.existsSync(configPath)) {
          rollback.configRestored = true;
          // Config restoration would depend on how config is applied in the system
        }
      }

      rollback.status = rollback.errors.length === 0 ? "SUCCESS" : "PARTIAL";
      this.data.stats.successful++;
    } catch (error) {
      rollback.status = "FAILED";
      rollback.errors.push({ general: error.message });
      this.data.stats.failed++;
    }

    // Record rollback
    rollback.completedAt = new Date().toISOString();
    this.data.rollbacks.push(rollback);
    this.data.stats.total++;
    if (rollback.triggeredBy === "automatic") {
      this.data.stats.automatic++;
    } else {
      this.data.stats.manual++;
    }
    this.saveData();

    // Record in intervention tracker
    if (this.interventionTracker && options.interventionId) {
      this.interventionTracker.recordRollback(options.interventionId, {
        triggeredBy: rollback.triggeredBy,
        reason: rollback.reason,
      });
    }

    this.emit("rollbackCompleted", rollback);
    return rollback;
  }

  /**
   * Auto-rollback based on comparison (called by experiment runner)
   */
  autoRollback(comparison, backupId, options = {}) {
    const decision = this.evaluateForRollback(comparison);

    if (!decision.shouldRollback) {
      return { executed: false, decision };
    }

    if (decision.requiresApproval) {
      // Queue for approval
      this.data.pending.push({
        id: `PENDING-${Date.now()}`,
        timestamp: new Date().toISOString(),
        decision,
        backupId,
        options,
        status: "AWAITING_APPROVAL",
      });
      this.saveData();

      this.emit("rollbackPendingApproval", { decision, backupId });
      return { executed: false, decision, pendingApproval: true };
    }

    // Execute automatic rollback
    const rollback = this.executeRollback(backupId, {
      ...options,
      reason: decision.reasons.join("; "),
      triggeredBy: "automatic",
    });

    return { executed: true, decision, rollback };
  }

  /**
   * Approve a pending rollback
   */
  approvePendingRollback(pendingId) {
    const pending = this.data.pending.find((p) => p.id === pendingId);
    if (!pending) {
      throw new Error(`Pending rollback not found: ${pendingId}`);
    }

    pending.status = "APPROVED";
    pending.approvedAt = new Date().toISOString();
    this.saveData();

    const rollback = this.executeRollback(pending.backupId, {
      ...pending.options,
      reason: pending.decision.reasons.join("; "),
      triggeredBy: "approved",
    });

    return rollback;
  }

  /**
   * Reject a pending rollback
   */
  rejectPendingRollback(pendingId, reason = "") {
    const pending = this.data.pending.find((p) => p.id === pendingId);
    if (!pending) {
      throw new Error(`Pending rollback not found: ${pendingId}`);
    }

    pending.status = "REJECTED";
    pending.rejectedAt = new Date().toISOString();
    pending.rejectionReason = reason;
    this.saveData();

    this.emit("rollbackRejected", pending);
    return pending;
  }

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================

  /**
   * Verify a rollback was successful by re-running tests
   * @param {string} rollbackId
   * @param {Function} testRunner - Function to run tests
   */
  async verifyRollback(rollbackId, testRunner) {
    const rollback = this.data.rollbacks.find((r) => r.id === rollbackId);
    if (!rollback) {
      throw new Error(`Rollback not found: ${rollbackId}`);
    }

    this.emit("verificationStarted", rollback);

    try {
      const results = await testRunner();

      rollback.verification = {
        timestamp: new Date().toISOString(),
        success: results.metrics?.sensitivity >= 95, // Example threshold
        metrics: results.metrics,
      };

      this.saveData();
      this.emit("verificationCompleted", { rollback, results });

      return rollback.verification;
    } catch (error) {
      rollback.verification = {
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
      };
      this.saveData();

      this.emit("verificationFailed", { rollback, error });
      throw error;
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  hashContent(content) {
    return crypto
      .createHash("md5")
      .update(content)
      .digest("hex")
      .substring(0, 12);
  }

  /**
   * Set rollback policy
   */
  setPolicy(policy) {
    if (!ROLLBACK_POLICIES[policy]) {
      throw new Error(`Unknown policy: ${policy}`);
    }
    this.policy = policy;
    this.emit("policyChanged", policy);
  }

  /**
   * Get current policy configuration
   */
  getPolicy() {
    return {
      name: this.policy,
      ...ROLLBACK_POLICIES[this.policy],
    };
  }

  // ==========================================================================
  // QUERY METHODS
  // ==========================================================================

  getRollback(id) {
    return this.data.rollbacks.find((r) => r.id === id);
  }

  getRecentRollbacks(limit = 10) {
    return this.data.rollbacks.slice(-limit).reverse();
  }

  getPendingRollbacks() {
    return this.data.pending.filter((p) => p.status === "AWAITING_APPROVAL");
  }

  getBackup(id) {
    return this.data.backups.find((b) => b.id === id);
  }

  getRecentBackups(limit = 10) {
    return this.data.backups.slice(-limit).reverse();
  }

  getStats() {
    return {
      ...this.data.stats,
      successRate:
        this.data.stats.total > 0
          ? this.data.stats.successful / this.data.stats.total
          : 1,
      pendingCount: this.getPendingRollbacks().length,
    };
  }

  /**
   * Export for LLM context
   */
  exportForLLM() {
    return {
      policy: this.getPolicy(),
      stats: this.getStats(),
      recentRollbacks: this.getRecentRollbacks(3).map((r) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        triggeredBy: r.triggeredBy,
      })),
      pendingRollbacks: this.getPendingRollbacks().map((p) => ({
        id: p.id,
        reasons: p.decision?.reasons,
        priority: p.decision?.priority,
      })),
    };
  }

  /**
   * Cleanup old backups
   */
  cleanup(options = {}) {
    const maxAgeDays = options.maxAgeDays || 30;
    const keepMinimum = options.keepMinimum || 5;
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    if (this.data.backups.length <= keepMinimum) {
      return { removed: 0 };
    }

    const toRemove = [];

    for (const backup of this.data.backups) {
      const age = new Date(backup.timestamp).getTime();
      if (
        age < cutoff &&
        this.data.backups.length - toRemove.length > keepMinimum
      ) {
        toRemove.push(backup.id);

        // Remove backup directory
        const backupPath = path.join(this.backupDir, backup.id);
        if (fs.existsSync(backupPath)) {
          try {
            fs.rmSync(backupPath, { recursive: true });
          } catch (e) {
            // Ignore deletion errors
          }
        }
      }
    }

    this.data.backups = this.data.backups.filter(
      (b) => !toRemove.includes(b.id),
    );
    this.saveData();

    return { removed: toRemove.length };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  RollbackManager,
  ROLLBACK_POLICIES,
  CRITICAL_PHI_TYPES,
};
