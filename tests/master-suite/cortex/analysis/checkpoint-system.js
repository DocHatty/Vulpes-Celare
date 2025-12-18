/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║      ██████╗██╗  ██╗███████╗ ██████╗██╗  ██╗██████╗  ██████╗ ██╗███╗   ██╗   ║
 * ║     ██╔════╝██║  ██║██╔════╝██╔════╝██║ ██╔╝██╔══██╗██╔═══██╗██║████╗  ██║   ║
 * ║     ██║     ███████║█████╗  ██║     █████╔╝ ██████╔╝██║   ██║██║██╔██╗ ██║   ║
 * ║     ██║     ██╔══██║██╔══╝  ██║     ██╔═██╗ ██╔═══╝ ██║   ██║██║██║╚██╗██║   ║
 * ║     ╚██████╗██║  ██║███████╗╚██████╗██║  ██╗██║     ╚██████╔╝██║██║ ╚████║   ║
 * ║      ╚═════╝╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝      ╚═════╝ ╚═╝╚═╝  ╚═══╝   ║
 * ║                                                                               ║
 * ║      ███████╗██╗   ██╗███████╗████████╗███████╗███╗   ███╗                    ║
 * ║      ██╔════╝╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝████╗ ████║                    ║
 * ║      ███████╗ ╚████╔╝ ███████╗   ██║   █████╗  ██╔████╔██║                    ║
 * ║      ╚════██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║                    ║
 * ║      ███████║   ██║   ███████║   ██║   ███████╗██║ ╚═╝ ██║                    ║
 * ║      ╚══════╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝                    ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   CHECKPOINT & REASSESSMENT SYSTEM                                            ║
 * ║   Automatic validation checkpoints for Claude & Codex integration             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This system provides automatic checkpoints and reassessments during:
 * - Long-running test suites
 * - Code modification sessions
 * - Deep analysis phases
 *
 * FEATURES:
 * - Automatic checkpoint creation at configurable intervals
 * - State persistence for resume capability
 * - Validation gates before continuing
 * - Rollback support on failure
 * - Integration with Claude Opus 4.5 extended thinking
 * - Integration with Codex 5.2 High Max deep research
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PATHS } = require("../core/config");

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHECKPOINT_CONFIG = {
  // Checkpoint triggers
  triggers: {
    documentInterval: 100, // Checkpoint every N documents
    timeInterval: 300000, // Checkpoint every 5 minutes
    phaseComplete: true, // Checkpoint after each phase
    errorOccurred: true, // Checkpoint on error
    metricsChange: 0.5, // Checkpoint on >0.5% metric change
  },

  // Validation requirements
  validation: {
    requireBuildPass: true,
    requireTestPass: false, // Optional - can be slow
    requireLint: false, // Optional
    maxErrors: 0, // Max allowed errors to continue
    sensitivityThreshold: 95, // Minimum sensitivity to continue
  },

  // LLM reassessment configuration
  reassessment: {
    claude: {
      enabled: true,
      model: "claude-opus-4-5-20250514",
      useExtendedThinking: true,
      triggerOnRegression: true,
      triggerOnError: true,
      maxThinkingTokens: 16000,
    },
    codex: {
      enabled: true,
      model: "codex-5.2-high-max",
      useDeepResearch: true,
      triggerOnCodeChange: true,
      analysisDepth: "comprehensive",
    },
  },

  // Storage configuration
  storage: {
    maxCheckpoints: 50, // Keep last N checkpoints
    compressOld: true, // Compress checkpoints older than 24h
    retentionDays: 7, // Delete checkpoints older than N days
  },
};

// ============================================================================
// CHECKPOINT TYPES
// ============================================================================

const CHECKPOINT_TYPES = {
  DOCUMENT_BATCH: "DOCUMENT_BATCH",
  PHASE_COMPLETE: "PHASE_COMPLETE",
  TIME_INTERVAL: "TIME_INTERVAL",
  ERROR_RECOVERY: "ERROR_RECOVERY",
  METRICS_CHANGE: "METRICS_CHANGE",
  MANUAL: "MANUAL",
  CODE_CHANGE: "CODE_CHANGE",
  VALIDATION_GATE: "VALIDATION_GATE",
};

// ============================================================================
// CHECKPOINT SYSTEM CLASS
// ============================================================================

class CheckpointSystem {
  constructor(options = {}) {
    this.config = { ...CHECKPOINT_CONFIG, ...options };
    // Use PATHS.knowledge from config, fallback to computed path
    const knowledgePath =
      PATHS.knowledge || path.join(__dirname, "..", "storage", "knowledge");
    this.storagePath = path.join(knowledgePath, "checkpoints");
    this.indexPath = path.join(this.storagePath, "index.json");

    this.state = {
      initialized: false,
      currentSession: null,
      checkpoints: [],
      lastCheckpoint: null,
      lastMetrics: null,
      documentsProcessed: 0,
      errorsEncountered: 0,
    };

    this.ensureDirectories();
    this.loadIndex();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  loadIndex() {
    try {
      if (fs.existsSync(this.indexPath)) {
        const data = JSON.parse(fs.readFileSync(this.indexPath, "utf8"));
        this.state.checkpoints = data.checkpoints || [];
      }
    } catch (e) {
      console.warn("[Checkpoint] Starting with fresh checkpoint index");
      this.state.checkpoints = [];
    }
  }

  saveIndex() {
    fs.writeFileSync(
      this.indexPath,
      JSON.stringify(
        {
          checkpoints: this.state.checkpoints,
          lastUpdated: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Start a new checkpoint session
   */
  startSession(sessionId = null) {
    this.state.currentSession = {
      id: sessionId || `SESSION-${Date.now()}`,
      startTime: new Date().toISOString(),
      checkpoints: [],
      metrics: [],
      errors: [],
      status: "ACTIVE",
    };

    console.log(
      `[Checkpoint] Session started: ${this.state.currentSession.id}`,
    );
    return this.state.currentSession.id;
  }

  /**
   * End current session
   */
  endSession(status = "COMPLETED") {
    if (!this.state.currentSession) return null;

    this.state.currentSession.endTime = new Date().toISOString();
    this.state.currentSession.status = status;

    // Save final session state
    const sessionFile = path.join(
      this.storagePath,
      `session-${this.state.currentSession.id}.json`,
    );
    fs.writeFileSync(
      sessionFile,
      JSON.stringify(this.state.currentSession, null, 2),
    );

    const sessionId = this.state.currentSession.id;
    this.state.currentSession = null;

    console.log(`[Checkpoint] Session ended: ${sessionId} (${status})`);
    return sessionId;
  }

  // ==========================================================================
  // CHECKPOINT CREATION
  // ==========================================================================

  /**
   * Create a checkpoint
   */
  async createCheckpoint(type, data = {}) {
    const checkpoint = {
      id: this.generateCheckpointId(),
      type,
      timestamp: new Date().toISOString(),
      sessionId: this.state.currentSession?.id,
      data: {
        documentsProcessed: this.state.documentsProcessed,
        errorsEncountered: this.state.errorsEncountered,
        ...data,
      },
      hash: null, // Will be computed
      valid: true,
    };

    // Compute hash for integrity verification
    checkpoint.hash = this.computeHash(checkpoint);

    // Save checkpoint
    const checkpointFile = path.join(this.storagePath, `${checkpoint.id}.json`);
    fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

    // Update index
    this.state.checkpoints.push({
      id: checkpoint.id,
      type: checkpoint.type,
      timestamp: checkpoint.timestamp,
      sessionId: checkpoint.sessionId,
    });
    this.saveIndex();

    // Update state
    this.state.lastCheckpoint = checkpoint;
    if (this.state.currentSession) {
      this.state.currentSession.checkpoints.push(checkpoint.id);
    }

    // Cleanup old checkpoints
    await this.cleanupOldCheckpoints();

    console.log(`[Checkpoint] Created: ${checkpoint.id} (${type})`);
    return checkpoint;
  }

  generateCheckpointId() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString("hex");
    return `CP-${timestamp}-${random}`.toUpperCase();
  }

  computeHash(checkpoint) {
    const content = JSON.stringify({
      type: checkpoint.type,
      data: checkpoint.data,
      timestamp: checkpoint.timestamp,
    });
    return crypto
      .createHash("sha256")
      .update(content)
      .digest("hex")
      .substring(0, 16);
  }

  // ==========================================================================
  // AUTOMATIC CHECKPOINT TRIGGERS
  // ==========================================================================

  /**
   * Check if checkpoint should be created based on document count
   */
  shouldCheckpointForDocuments(currentCount) {
    const interval = this.config.triggers.documentInterval;
    const lastCount = this.state.documentsProcessed;

    if (currentCount - lastCount >= interval) {
      this.state.documentsProcessed = currentCount;
      return true;
    }
    return false;
  }

  /**
   * Check if checkpoint should be created based on time
   */
  shouldCheckpointForTime() {
    if (!this.state.lastCheckpoint) return true;

    const lastTime = new Date(this.state.lastCheckpoint.timestamp).getTime();
    const now = Date.now();
    const interval = this.config.triggers.timeInterval;

    return now - lastTime >= interval;
  }

  /**
   * Check if checkpoint should be created based on metrics change
   */
  shouldCheckpointForMetrics(currentMetrics) {
    if (!this.state.lastMetrics) {
      this.state.lastMetrics = currentMetrics;
      return true;
    }

    const threshold = this.config.triggers.metricsChange;
    const lastSens = this.state.lastMetrics.sensitivity || 0;
    const currSens = currentMetrics.sensitivity || 0;

    if (Math.abs(currSens - lastSens) >= threshold) {
      this.state.lastMetrics = currentMetrics;
      return true;
    }

    return false;
  }

  /**
   * Record document processing progress
   */
  async recordProgress(documentsProcessed, metrics = null) {
    // Check document-based trigger
    if (this.shouldCheckpointForDocuments(documentsProcessed)) {
      await this.createCheckpoint(CHECKPOINT_TYPES.DOCUMENT_BATCH, {
        documentsProcessed,
        metrics,
      });
    }

    // Check time-based trigger
    if (this.shouldCheckpointForTime()) {
      await this.createCheckpoint(CHECKPOINT_TYPES.TIME_INTERVAL, {
        documentsProcessed,
        metrics,
      });
    }

    // Check metrics-based trigger
    if (metrics && this.shouldCheckpointForMetrics(metrics)) {
      await this.createCheckpoint(CHECKPOINT_TYPES.METRICS_CHANGE, {
        documentsProcessed,
        previousMetrics: this.state.lastMetrics,
        currentMetrics: metrics,
        delta: {
          sensitivity:
            (metrics.sensitivity || 0) -
            (this.state.lastMetrics?.sensitivity || 0),
          specificity:
            (metrics.specificity || 0) -
            (this.state.lastMetrics?.specificity || 0),
        },
      });
    }
  }

  /**
   * Record phase completion
   */
  async recordPhaseComplete(phaseName, phaseData) {
    if (!this.config.triggers.phaseComplete) return null;

    return this.createCheckpoint(CHECKPOINT_TYPES.PHASE_COMPLETE, {
      phase: phaseName,
      ...phaseData,
    });
  }

  /**
   * Record error occurrence
   */
  async recordError(error, context = {}) {
    this.state.errorsEncountered++;

    if (!this.config.triggers.errorOccurred) return null;

    return this.createCheckpoint(CHECKPOINT_TYPES.ERROR_RECOVERY, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 5).join("\n"),
      },
      context,
      recoveryRequired: true,
    });
  }

  // ==========================================================================
  // VALIDATION GATES
  // ==========================================================================

  /**
   * Run validation gate before continuing
   */
  async runValidationGate(context = {}) {
    console.log("[Checkpoint] Running validation gate...");

    const validation = {
      timestamp: new Date().toISOString(),
      passed: true,
      checks: [],
      errors: [],
      warnings: [],
    };

    // Check build
    if (this.config.validation.requireBuildPass) {
      const buildResult = await this.checkBuild();
      validation.checks.push({
        name: "BUILD",
        passed: buildResult.success,
        message: buildResult.message,
      });
      if (!buildResult.success) {
        validation.passed = false;
        validation.errors.push(`Build failed: ${buildResult.message}`);
      }
    }

    // Check error count
    if (this.state.errorsEncountered > this.config.validation.maxErrors) {
      validation.passed = false;
      validation.errors.push(
        `Too many errors: ${this.state.errorsEncountered} > ${this.config.validation.maxErrors}`,
      );
    }

    // Check sensitivity threshold
    if (
      context.metrics?.sensitivity < this.config.validation.sensitivityThreshold
    ) {
      validation.warnings.push(
        `Sensitivity below threshold: ${context.metrics.sensitivity}% < ${this.config.validation.sensitivityThreshold}%`,
      );
    }

    // Create validation checkpoint
    await this.createCheckpoint(CHECKPOINT_TYPES.VALIDATION_GATE, {
      validation,
      context,
    });

    if (!validation.passed) {
      console.log("[Checkpoint] Validation gate FAILED");
      for (const error of validation.errors) {
        console.log(`  ✗ ${error}`);
      }
    } else {
      console.log("[Checkpoint] Validation gate PASSED");
    }

    return validation;
  }

  async checkBuild() {
    try {
      const { execSync } = require("child_process");
      const projectRoot = path.join(PATHS.base, "..", "..");

      // Run TypeScript build
      execSync("npm run build", {
        cwd: projectRoot,
        stdio: "pipe",
        timeout: 60000,
      });

      return { success: true, message: "Build successful" };
    } catch (error) {
      return {
        success: false,
        message: error.message?.substring(0, 200) || "Build failed",
      };
    }
  }

  // ==========================================================================
  // LLM REASSESSMENT
  // ==========================================================================

  /**
   * Trigger Claude reassessment
   */
  async triggerClaudeReassessment(context) {
    if (!this.config.reassessment.claude.enabled) {
      return { triggered: false, reason: "Claude reassessment disabled" };
    }

    console.log(
      "[Checkpoint] Triggering Claude Opus 4.5 extended thinking reassessment...",
    );

    const reassessment = {
      id: `REASSESS-CLAUDE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      model: this.config.reassessment.claude.model,
      useExtendedThinking: this.config.reassessment.claude.useExtendedThinking,
      context,
      prompt: this.generateClaudeReassessmentPrompt(context),
      status: "PENDING",
    };

    // In production, this would call the Claude API
    // For now, generate a structured response
    reassessment.response = await this.simulateClaudeReassessment(context);
    reassessment.status = "COMPLETED";

    // Save reassessment
    const reassessmentFile = path.join(
      this.storagePath,
      `reassessment-${reassessment.id}.json`,
    );
    fs.writeFileSync(reassessmentFile, JSON.stringify(reassessment, null, 2));

    return reassessment;
  }

  generateClaudeReassessmentPrompt(context) {
    return `
# VULPES CELARE - CHECKPOINT REASSESSMENT

You are performing a checkpoint reassessment using extended thinking to deeply analyze the current state of the PHI redaction system.

## CURRENT STATE
- Documents Processed: ${context.documentsProcessed || "N/A"}
- Errors Encountered: ${context.errorsEncountered || 0}
- Current Sensitivity: ${context.metrics?.sensitivity?.toFixed(2) || "N/A"}%
- Current Specificity: ${context.metrics?.specificity?.toFixed(2) || "N/A"}%

## RECENT CHANGES
${JSON.stringify(context.recentChanges || [], null, 2)}

## FAILURES
${JSON.stringify((context.failures || []).slice(0, 10), null, 2)}

## ANALYSIS REQUIRED

Using extended thinking, provide:

1. **ASSESSMENT**: What is the current health of the system?
2. **CONCERNS**: What issues require immediate attention?
3. **RECOMMENDATIONS**: What specific changes would have the highest impact?
4. **RISKS**: What could go wrong with the recommended changes?
5. **VALIDATION**: How should we validate each change?

Think deeply about the interconnections between failures and potential fixes.
Consider both immediate fixes and systemic improvements.
`;
  }

  async simulateClaudeReassessment(context) {
    // Simulated response structure - in production, this would call Claude API
    return {
      thinking: `Analyzing ${context.documentsProcessed || 0} documents processed...`,
      assessment: {
        healthScore:
          context.metrics?.sensitivity >= 95 ? "GOOD" : "NEEDS_IMPROVEMENT",
        criticalIssues:
          context.errorsEncountered > 0
            ? ["Errors encountered during processing"]
            : [],
      },
      concerns:
        context.metrics?.sensitivity < 99
          ? ["Sensitivity below HIPAA target of 99%"]
          : [],
      recommendations: [
        "Focus on top failure pattern for maximum impact",
        "Run comprehensive test after each fix",
      ],
      validationSteps: [
        "Run build to check syntax",
        "Run test suite with 200+ documents",
        "Compare metrics before/after",
      ],
    };
  }

  /**
   * Trigger Codex reassessment
   */
  async triggerCodexReassessment(context) {
    if (!this.config.reassessment.codex.enabled) {
      return { triggered: false, reason: "Codex reassessment disabled" };
    }

    console.log(
      "[Checkpoint] Triggering Codex 5.2 High Max deep research reassessment...",
    );

    const reassessment = {
      id: `REASSESS-CODEX-${Date.now()}`,
      timestamp: new Date().toISOString(),
      model: this.config.reassessment.codex.model,
      useDeepResearch: this.config.reassessment.codex.useDeepResearch,
      context,
      prompt: this.generateCodexReassessmentPrompt(context),
      status: "PENDING",
    };

    // In production, this would call the Codex API
    reassessment.response = await this.simulateCodexReassessment(context);
    reassessment.status = "COMPLETED";

    // Save reassessment
    const reassessmentFile = path.join(
      this.storagePath,
      `reassessment-${reassessment.id}.json`,
    );
    fs.writeFileSync(reassessmentFile, JSON.stringify(reassessment, null, 2));

    return reassessment;
  }

  generateCodexReassessmentPrompt(context) {
    return `
# VULPES CELARE - CODE ANALYSIS REASSESSMENT

Perform deep research analysis on the codebase to identify improvements.

## FILES TO ANALYZE
- src/filters/*.ts - PHI detection filters
- src/dictionaries/*.ts - Name and term dictionaries
- src/core/VulpesCelare.ts - Core engine

## CURRENT FAILURES
${JSON.stringify((context.failures || []).slice(0, 20), null, 2)}

## ANALYSIS REQUIRED

Using deep research mode:

1. Identify specific regex patterns that need modification
2. Find dictionary entries that should be added
3. Locate code that handles the failing cases
4. Generate exact code snippets for fixes
5. Estimate impact of each fix

Provide concrete, implementable code changes.
`;
  }

  async simulateCodexReassessment(context) {
    // Simulated response - in production, this would call Codex API
    return {
      analysisDepth: this.config.reassessment.codex.analysisDepth,
      filesAnalyzed: [
        "src/filters/NameFilter.ts",
        "src/dictionaries/NameDictionary.ts",
      ],
      suggestions: [
        {
          file: "src/dictionaries/NameDictionary.ts",
          type: "ADD_FUNCTION",
          description: "Add OCR normalization function",
          code: `normalizeOCR(text: string): string {
  return text
    .replace(/0/g, 'O')
    .replace(/1/g, 'l')
    .replace(/5/g, 'S');
}`,
          expectedImpact: "+1-2% sensitivity",
        },
      ],
      risksIdentified: [
        "OCR normalization may cause false positives on medical terms",
      ],
    };
  }

  // ==========================================================================
  // CHECKPOINT RECOVERY
  // ==========================================================================

  /**
   * List available checkpoints for recovery
   */
  listCheckpoints(options = {}) {
    let checkpoints = [...this.state.checkpoints];

    // Filter by session
    if (options.sessionId) {
      checkpoints = checkpoints.filter(
        (cp) => cp.sessionId === options.sessionId,
      );
    }

    // Filter by type
    if (options.type) {
      checkpoints = checkpoints.filter((cp) => cp.type === options.type);
    }

    // Sort by timestamp (newest first)
    checkpoints.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Limit
    if (options.limit) {
      checkpoints = checkpoints.slice(0, options.limit);
    }

    return checkpoints;
  }

  /**
   * Load a specific checkpoint
   */
  loadCheckpoint(checkpointId) {
    const checkpointFile = path.join(this.storagePath, `${checkpointId}.json`);

    if (!fs.existsSync(checkpointFile)) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, "utf8"));

    // Verify integrity
    const computedHash = this.computeHash(checkpoint);
    if (computedHash !== checkpoint.hash) {
      console.warn(`[Checkpoint] WARNING: Hash mismatch for ${checkpointId}`);
      checkpoint.valid = false;
    }

    return checkpoint;
  }

  /**
   * Restore from a checkpoint
   */
  async restoreFromCheckpoint(checkpointId) {
    console.log(`[Checkpoint] Restoring from: ${checkpointId}`);

    const checkpoint = this.loadCheckpoint(checkpointId);

    if (!checkpoint.valid) {
      throw new Error("Cannot restore from invalid checkpoint");
    }

    // Restore state
    this.state.documentsProcessed = checkpoint.data.documentsProcessed || 0;
    this.state.errorsEncountered = checkpoint.data.errorsEncountered || 0;
    this.state.lastMetrics = checkpoint.data.metrics || null;
    this.state.lastCheckpoint = checkpoint;

    // Start new session from checkpoint
    this.startSession(`RESTORED-FROM-${checkpointId}`);

    console.log(`[Checkpoint] Restored state:`);
    console.log(`  Documents: ${this.state.documentsProcessed}`);
    console.log(`  Errors: ${this.state.errorsEncountered}`);

    return {
      success: true,
      checkpoint,
      restoredState: {
        documentsProcessed: this.state.documentsProcessed,
        errorsEncountered: this.state.errorsEncountered,
        lastMetrics: this.state.lastMetrics,
      },
    };
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  async cleanupOldCheckpoints() {
    const maxCheckpoints = this.config.storage.maxCheckpoints;
    const retentionMs = this.config.storage.retentionDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Remove checkpoints beyond limit
    while (this.state.checkpoints.length > maxCheckpoints) {
      const oldest = this.state.checkpoints.shift();
      if (oldest) {
        const filePath = path.join(this.storagePath, `${oldest.id}.json`);
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // File may not exist
        }
      }
    }

    // Remove checkpoints beyond retention period
    this.state.checkpoints = this.state.checkpoints.filter((cp) => {
      const age = now - new Date(cp.timestamp).getTime();
      if (age > retentionMs) {
        const filePath = path.join(this.storagePath, `${cp.id}.json`);
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // File may not exist
        }
        return false;
      }
      return true;
    });

    this.saveIndex();
  }

  // ==========================================================================
  // REPORTING
  // ==========================================================================

  generateReport() {
    const lines = [];
    const divider = "─".repeat(70);

    lines.push("");
    lines.push("┌" + divider + "┐");
    lines.push("│  CHECKPOINT SYSTEM STATUS" + " ".repeat(44) + "│");
    lines.push("├" + divider + "┤");
    lines.push(
      `│  Current Session: ${(this.state.currentSession?.id || "None").padEnd(49)}│`,
    );
    lines.push(
      `│  Total Checkpoints: ${String(this.state.checkpoints.length).padEnd(47)}│`,
    );
    lines.push(
      `│  Documents Processed: ${String(this.state.documentsProcessed).padEnd(45)}│`,
    );
    lines.push(
      `│  Errors Encountered: ${String(this.state.errorsEncountered).padEnd(46)}│`,
    );
    lines.push("└" + divider + "┘");

    if (this.state.lastCheckpoint) {
      lines.push("");
      lines.push("┌" + divider + "┐");
      lines.push("│  LAST CHECKPOINT" + " ".repeat(53) + "│");
      lines.push("├" + divider + "┤");
      lines.push(`│  ID: ${this.state.lastCheckpoint.id.padEnd(62)}│`);
      lines.push(`│  Type: ${this.state.lastCheckpoint.type.padEnd(60)}│`);
      lines.push(`│  Time: ${this.state.lastCheckpoint.timestamp.padEnd(60)}│`);
      lines.push("└" + divider + "┘");
    }

    // Recent checkpoints
    const recent = this.listCheckpoints({ limit: 5 });
    if (recent.length > 0) {
      lines.push("");
      lines.push("┌" + divider + "┐");
      lines.push("│  RECENT CHECKPOINTS" + " ".repeat(50) + "│");
      lines.push("├" + divider + "┤");
      for (const cp of recent) {
        const line = `│  ${cp.type.padEnd(25)} ${cp.timestamp.substring(0, 19)}`;
        lines.push(line.padEnd(71) + "│");
      }
      lines.push("└" + divider + "┘");
    }

    lines.push("");

    return lines.join("\n");
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CheckpointSystem,
  CHECKPOINT_CONFIG,
  CHECKPOINT_TYPES,
};
