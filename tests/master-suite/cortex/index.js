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
 * ║   MAIN ENTRY POINT                                                            ║
 * ║   Self-Learning PHI Detection Test Intelligence System                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This is the main entry point for Vulpes Cortex. It provides:
 *
 * 1. PROGRAMMATIC API - Use Cortex from your test scripts
 * 2. MCP SERVER - Connect via Model Context Protocol
 * 3. CLI - Command-line interface for manual use
 *
 * USAGE:
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 * // As a module
 * const cortex = require('./cortex');
 * const analysis = await cortex.analyzeResults(testResults);
 * const recommendation = await cortex.getRecommendation('WHAT_TO_IMPROVE');
 *
 * // Start MCP server
 * cortex.startServer();
 *
 * // CLI
 * node cortex --server         # Start MCP server
 * node cortex --status         # Show current status
 * node cortex --analyze file   # Analyze test results file
 */

const path = require("path");

// Import console formatter for beautiful, glitch-free output
const fmt = require("./core/console-formatter");

// ============================================================================
// CORE MODULES
// ============================================================================

const { PATHS, MCP_CONFIG, ensureDirectories } = require("./core/config");
const { getDatabase } = require("./db/database");
const { KnowledgeBase } = require("./core/knowledge-base");
const { MetricsEngine } = require("./core/metrics-engine");
const { CodebaseAnalyzer } = require("./core/codebase-analyzer");
const { TemporalIndex } = require("./core/temporal-index");
const { MerkleLog } = require("./core/merkle-log");

// ============================================================================
// LEARNING MODULES
// ============================================================================

const { PatternRecognizer } = require("./learning/pattern-recognizer");
const { HypothesisEngine } = require("./learning/hypothesis-engine");
const { InterventionTracker } = require("./learning/intervention-tracker");
const { InsightGenerator } = require("./learning/insight-generator");

// ============================================================================
// EXPERIMENT MODULES
// ============================================================================

const { ExperimentRunner } = require("./experiments/experiment-runner");
const { SnapshotManager } = require("./experiments/snapshot-manager");
const { ComparisonEngine } = require("./experiments/comparison-engine");
const { RollbackManager } = require("./experiments/rollback-manager");

// ============================================================================
// DECISION MODULES
// ============================================================================

const { DecisionEngine } = require("./decision/decision-engine");
const { HistoryConsultant } = require("./decision/history-consultant");
const { RecommendationBuilder } = require("./decision/recommendation-builder");
const { CodebaseStateTracker } = require("./decision/codebase-state-tracker");

// ============================================================================
// MCP SERVER
// ============================================================================

const { VulpesCortexServer, main: startMcpServer } = require("./mcp/server");

// ============================================================================
// VULPES CORTEX CLASS
// ============================================================================

class VulpesCortex {
  constructor() {
    this.initialized = false;
    this.modules = {};
  }

  /**
   * Initialize all modules
   */
  async initialize() {
    if (this.initialized) return this;

    console.error("[Vulpes Cortex] Initializing...");

    // Ensure storage directories exist
    ensureDirectories();

    // Core modules
    const db = getDatabase();
    this.modules.merkleLog = new MerkleLog(db);
    this.modules.knowledgeBase = new KnowledgeBase();
    this.modules.metricsEngine = new MetricsEngine();
    this.modules.codebaseAnalyzer = new CodebaseAnalyzer(
      this.modules.knowledgeBase,
    );
    this.modules.temporalIndex = new TemporalIndex(this.modules.knowledgeBase);

    // Learning modules
    this.modules.patternRecognizer = new PatternRecognizer(
      this.modules.knowledgeBase,
    );
    this.modules.hypothesisEngine = new HypothesisEngine(
      this.modules.knowledgeBase,
    );
    this.modules.interventionTracker = new InterventionTracker(
      this.modules.knowledgeBase,
    );
    this.modules.insightGenerator = new InsightGenerator({
      knowledgeBase: this.modules.knowledgeBase,
      patternRecognizer: this.modules.patternRecognizer,
      hypothesisEngine: this.modules.hypothesisEngine,
      interventionTracker: this.modules.interventionTracker,
      metricsEngine: this.modules.metricsEngine,
      temporalIndex: this.modules.temporalIndex,
    });

    // Experiment modules
    this.modules.snapshotManager = new SnapshotManager({
      codebaseAnalyzer: this.modules.codebaseAnalyzer,
    });
    this.modules.comparisonEngine = new ComparisonEngine({
      metricsEngine: this.modules.metricsEngine,
    });
    this.modules.rollbackManager = new RollbackManager({
      snapshotManager: this.modules.snapshotManager,
      interventionTracker: this.modules.interventionTracker,
    });
    this.modules.experimentRunner = new ExperimentRunner({
      knowledgeBase: this.modules.knowledgeBase,
      metricsEngine: this.modules.metricsEngine,
      snapshotManager: this.modules.snapshotManager,
      interventionTracker: this.modules.interventionTracker,
    });

    // Decision modules
    this.modules.historyConsultant = new HistoryConsultant({
      knowledgeBase: this.modules.knowledgeBase,
      interventionTracker: this.modules.interventionTracker,
      hypothesisEngine: this.modules.hypothesisEngine,
      patternRecognizer: this.modules.patternRecognizer,
      experimentRunner: this.modules.experimentRunner,
    });
    this.modules.recommendationBuilder = new RecommendationBuilder({
      codebaseAnalyzer: this.modules.codebaseAnalyzer,
      patternRecognizer: this.modules.patternRecognizer,
      historyConsultant: this.modules.historyConsultant,
    });
    this.modules.codebaseStateTracker = new CodebaseStateTracker({
      codebaseAnalyzer: this.modules.codebaseAnalyzer,
      metricsEngine: this.modules.metricsEngine,
      temporalIndex: this.modules.temporalIndex,
    });
    this.modules.decisionEngine = new DecisionEngine({
      knowledgeBase: this.modules.knowledgeBase,
      historyConsultant: this.modules.historyConsultant,
      codebaseAnalyzer: this.modules.codebaseAnalyzer,
      patternRecognizer: this.modules.patternRecognizer,
      hypothesisEngine: this.modules.hypothesisEngine,
      interventionTracker: this.modules.interventionTracker,
      insightGenerator: this.modules.insightGenerator,
      metricsEngine: this.modules.metricsEngine,
    });

    this.initialized = true;
    console.error("[Vulpes Cortex] Initialized successfully");

    return this;
  }

  // ==========================================================================
  // HIGH-LEVEL API
  // ==========================================================================

  /**
   * Log an event to the immutable audit blockchain
   */
  async logAudit(eventType, actorId, data) {
    await this.ensureInitialized();
    return this.modules.merkleLog.append(eventType, actorId, data);
  }

  /**
   * Verify an audit record
   */
  async verifyAudit(id) {
    await this.ensureInitialized();
    return this.modules.merkleLog.verify(id);
  }

  /**
   * Analyze test results
   * @param {Object} results - Test results from run.js containing metrics, documents, etc.
   * @param {Object} options - Analysis options
   */
  async analyzeResults(results, options = {}) {
    await this.ensureInitialized();

    // Extract confusion matrix - handle both formats:
    // 1. Direct {tp, tn, fp, fn} format
    // 2. From results.metrics.confusionMatrix with full names
    const confusionMatrix = this.extractConfusionMatrix(results);

    const analysis = {
      timestamp: new Date().toISOString(),
      metrics: null,
      grade: null,
      patterns: null,
      insights: null,
      inputMetrics: results.metrics || null, // Preserve original metrics
    };

    // Calculate metrics using extracted confusion matrix
    if (confusionMatrix) {
      analysis.metrics =
        this.modules.metricsEngine.calculateAll(confusionMatrix);

      // Get grade
      analysis.grade = this.modules.metricsEngine.getGrade(
        analysis.metrics,
        options.profile || "STANDARD",
      );

      // Record metrics for temporal tracking
      this.modules.temporalIndex.recordMetrics(analysis.metrics);
    } else {
      // Use pre-calculated metrics if confusion matrix unavailable
      analysis.metrics = results.metrics;
      console.warn(
        "[Vulpes Cortex] Warning: Could not extract confusion matrix, using pre-calculated metrics",
      );
    }

    // Analyze patterns
    if (options.analyzePatterns !== false) {
      analysis.patterns =
        this.modules.patternRecognizer.analyzeTestResult(results);
    }

    // Generate insights
    if (options.generateInsights) {
      analysis.insights = this.modules.insightGenerator.generateInsights();
    }

    return analysis;
  }

  /**
   * Extract confusion matrix from various input formats
   */
  extractConfusionMatrix(results) {
    // Direct format: {tp, tn, fp, fn}
    if (typeof results.tp === "number" && typeof results.tn === "number") {
      return {
        tp: results.tp,
        tn: results.tn,
        fp: results.fp,
        fn: results.fn,
      };
    }

    // From metrics.confusionMatrix with full names
    if (results.metrics && results.metrics.confusionMatrix) {
      const cm = results.metrics.confusionMatrix;
      return {
        tp: cm.truePositives ?? cm.tp ?? 0,
        tn: cm.trueNegatives ?? cm.tn ?? 0,
        fp: cm.falsePositives ?? cm.fp ?? 0,
        fn: cm.falseNegatives ?? cm.fn ?? 0,
      };
    }

    // From direct confusionMatrix property
    if (results.confusionMatrix) {
      const cm = results.confusionMatrix;
      return {
        tp: cm.truePositives ?? cm.tp ?? 0,
        tn: cm.trueNegatives ?? cm.tn ?? 0,
        fp: cm.falsePositives ?? cm.fp ?? 0,
        fn: cm.falseNegatives ?? cm.fn ?? 0,
      };
    }

    // Try to derive from arrays if provided
    if (
      results.truePositives !== undefined ||
      results.falseNegatives !== undefined
    ) {
      return {
        tp: Array.isArray(results.truePositives)
          ? results.truePositives.length
          : results.truePositives || 0,
        tn: Array.isArray(results.trueNegatives)
          ? results.trueNegatives.length
          : results.trueNegatives || 0,
        fp: Array.isArray(results.falsePositives)
          ? results.falsePositives.length
          : results.falsePositives || 0,
        fn: Array.isArray(results.falseNegatives)
          ? results.falseNegatives.length
          : results.falseNegatives || 0,
      };
    }

    return null;
  }

  /**
   * Get recommendation (ALWAYS consults history)
   */
  async getRecommendation(type, context = {}) {
    await this.ensureInitialized();
    return await this.modules.decisionEngine.makeDecision(type, context);
  }

  /**
   * Consult history before making a change
   */
  async consultHistory(query, context = {}) {
    await this.ensureInitialized();
    return await this.modules.historyConsultant.consult(
      context.type || "GENERAL",
      { description: query, ...context },
    );
  }

  /**
   * Get active insights
   */
  async getInsights(options = {}) {
    await this.ensureInitialized();

    let insights = this.modules.insightGenerator.getActiveInsights();

    if (options.priority) {
      insights = insights.filter((i) => i.priority === options.priority);
    }

    if (options.type) {
      insights = insights.filter((i) => i.type === options.type);
    }

    return {
      count: insights.length,
      insights: insights.slice(0, options.limit || 20),
      summary: this.modules.insightGenerator.getSummary(),
    };
  }

  /**
   * Record an intervention
   */
  async recordIntervention(intervention) {
    await this.ensureInitialized();
    return this.modules.interventionTracker.recordIntervention(intervention);
  }

  /**
   * Record effect of an intervention
   */
  async recordEffect(interventionId, metricsAfter) {
    await this.ensureInitialized();
    return this.modules.interventionTracker.recordEffect(
      interventionId,
      metricsAfter,
    );
  }

  /**
   * Compare before/after results
   */
  async compare(before, after) {
    await this.ensureInitialized();
    return this.modules.comparisonEngine.compare(before, after);
  }

  /**
   * Create a backup
   */
  async createBackup(target) {
    await this.ensureInitialized();
    return this.modules.rollbackManager.createBackup(target);
  }

  /**
   * Rollback to a backup
   */
  async rollback(backupId, options = {}) {
    await this.ensureInitialized();
    return this.modules.rollbackManager.executeRollback(backupId, options);
  }

  /**
   * Get current codebase state
   */
  async getCodebaseState() {
    await this.ensureInitialized();
    return this.modules.codebaseStateTracker.getCurrentState();
  }

  /**
   * Get full summary for LLM context
   */
  async getSummary() {
    await this.ensureInitialized();

    return {
      timestamp: new Date().toISOString(),
      codebase: this.modules.codebaseStateTracker.exportForLLM(),
      patterns: this.modules.patternRecognizer.exportForLLM(),
      insights: this.modules.insightGenerator.getSummary(),
      interventions: this.modules.interventionTracker.getStats(),
      experiments: this.modules.experimentRunner.getStats(),
      decisions: this.modules.decisionEngine.exportForLLM(),
    };
  }

  /**
   * Generate a report
   */
  async generateReport(type = "FULL") {
    await this.ensureInitialized();

    switch (type) {
      case "INSIGHTS":
        return this.modules.insightGenerator.generateReport();
      case "RECOMMENDATIONS":
        return this.modules.recommendationBuilder.generateReport();
      case "CODEBASE":
        return this.modules.codebaseStateTracker.generateReport();
      case "FULL":
      default:
        return this.generateFullReport();
    }
  }

  generateFullReport() {
    const divider = fmt.divider(fmt.BOX.SH);
    return `
${fmt.cortexBanner("F U L L   S T A T U S   R E P O R T")}

Generated: ${new Date().toISOString()}

${this.modules.codebaseStateTracker.generateReport()}

${this.modules.insightGenerator.generateReport()}

${this.modules.recommendationBuilder.generateReport()}

INTERVENTION STATISTICS
${divider}
${JSON.stringify(this.modules.interventionTracker.getStats(), null, 2)}

EXPERIMENT STATISTICS
${divider}
${JSON.stringify(this.modules.experimentRunner.getStats(), null, 2)}
`;
  }

  // ==========================================================================
  // SERVER MANAGEMENT
  // ==========================================================================

  /**
   * Start MCP server
   */
  async startServer() {
    await startMcpServer();
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get module directly (for advanced use)
   */
  getModule(name) {
    return this.modules[name];
  }

  /**
   * Shutdown Cortex and close all resources
   * CRITICAL: Call this when done to prevent hanging processes!
   */
  shutdown() {
    if (!this.initialized) return;
    
    console.error("[Vulpes Cortex] Shutting down...");
    
    // Close database connection
    const { closeDatabase } = require("./db/database");
    closeDatabase();
    
    this.initialized = false;
    console.error("[Vulpes Cortex] Shutdown complete");
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const cortex = new VulpesCortex();

// ============================================================================
// CLI HANDLING
// ============================================================================

async function runCLI() {
  // CRITICAL: Catch ALL uncaught errors to prevent silent crashes
  process.on("uncaughtException", (error) => {
    console.error("[Vulpes Cortex] UNCAUGHT EXCEPTION:", error);
    console.error("[Vulpes Cortex] Stack:", error.stack);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("[Vulpes Cortex] UNHANDLED REJECTION at:", promise);
    console.error("[Vulpes Cortex] Reason:", reason);
    process.exit(1);
  });

  const args = process.argv.slice(2);

  if (args.includes("--server-window") || args.includes("-w")) {
    // Launch server in a NEW VISIBLE WINDOW so user can see activity
    const { spawn } = require("child_process");
    const path = require("path");

    let port = 3100;
    const portArg = args.find((a) => a.startsWith("--port="));
    if (portArg) {
      port = parseInt(portArg.split("=")[1]) || 3100;
    }

    const scriptPath = path.join(__dirname, "index.js");

    // Windows: use 'start' with quoted title to open new cmd window
    // The title MUST be in quotes for 'start' command
    const { exec } = require("child_process");
    exec(
      `start "VULPES CORTEX MCP" cmd /k node "${scriptPath}" --server --port=${port}`,
    );

    console.error(
      fmt.statusBox("VULPES CORTEX - LAUNCHING IN NEW WINDOW", [
        "A new CMD window should open showing the MCP server activity.",
        { key: "Port", value: String(port) },
        "",
        "If it doesn't open, run manually:",
        "  node tests/master-suite/cortex --server",
      ]),
    );

    // Wait then verify it started
    await new Promise((r) => setTimeout(r, 2000));

    const http = require("http");
    const req = http.get(`http://localhost:${port}/health`, () => {
      console.error(
        "\n  ✓ Server is running! You can see activity in the new window.\n",
      );
      process.exit(0);
    });
    req.on("error", () => {
      console.error(
        "\n  ✗ Server may not have started. Check the new window for errors.\n",
      );
      process.exit(1);
    });
    req.setTimeout(3000, () => {
      req.destroy();
      console.error("\n  ✗ Server startup timed out.\n");
      process.exit(1);
    });
    return;
  }

  if (args.includes("--server") || args.includes("-s")) {
    // Start MCP server
    const { VulpesCortexServer } = require("./mcp/server");
    const server = new VulpesCortexServer();

    // Handle shutdown signals
    process.on("SIGINT", () => server.shutdown());
    process.on("SIGTERM", () => server.shutdown());

    // Parse port
    let port = 3100;
    const portArg = args.find((a) => a.startsWith("--port="));
    if (portArg) {
      port = parseInt(portArg.split("=")[1]) || 3100;
    }

    // Check if we should run in daemon (HTTP) mode or stdio mode
    // - Use daemon mode if --daemon flag passed OR --port specified
    // - Use stdio mode by default (this is what Claude Desktop expects)
    const useDaemon =
      args.includes("--daemon") || args.includes("-d") || portArg;

    await server.start({ daemon: useDaemon, port });
    // Server will stay alive until shutdown signal or client disconnect
  } else if (args.includes("--check") || args.includes("-c")) {
    // Check if server is running
    const http = require("http");
    let port = 3100;
    const portArg = args.find((a) => a.startsWith("--port="));
    if (portArg) {
      port = parseInt(portArg.split("=")[1]) || 3100;
    }

    const req = http.get(`http://localhost:${port}/health`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const status = JSON.parse(data);
          console.error(
            fmt.statusBox("VULPES CORTEX - SERVER STATUS", [
              { key: "Status", value: "[OK] RUNNING" },
              { key: "Server", value: status.server },
              { key: "Version", value: status.version },
              { key: "Uptime", value: status.uptime.toFixed(1) + " seconds" },
              { key: "Modules", value: status.modules + " loaded" },
              { key: "PID", value: String(status.pid) },
            ]),
          );
          process.exit(0);
        } catch (e) {
          console.error("Server responded but returned invalid data");
          process.exit(1);
        }
      });
    });

    req.on("error", () => {
      console.error(
        fmt.statusBox("VULPES CORTEX - SERVER STATUS", [
          { key: "Status", value: "[X] NOT RUNNING" },
          "",
          "Start with: node tests/master-suite/cortex --server",
        ]),
      );
      process.exit(1);
    });

    req.setTimeout(2000, () => {
      req.destroy();
      console.error("Server check timed out - server not responding");
      process.exit(1);
    });
  } else if (args.includes("--status")) {
    // Show status
    await cortex.initialize();
    console.error(await cortex.generateReport("FULL"));
  } else if (args.includes("--help") || args.includes("-h")) {
    console.error(`
Vulpes Cortex - Self-Learning PHI Detection Test Intelligence

USAGE:
  node index.js [options]

OPTIONS:
  --server, -s    Start MCP server (stdio mode for Claude Desktop)
  --daemon, -d    Start as HTTP daemon (for manual/debugging use)
  --check, -c     Check if HTTP daemon is running
  --port=N        Set port for daemon (default: 3100, implies --daemon)
  --status        Show current system status
  --help, -h      Show this help message

MCP (CLAUDE DESKTOP):
  Just restart Claude Desktop - it auto-launches in stdio mode.
  Config file: %APPDATA%\Claude\claude_desktop_config.json

MANUAL/DEBUG MODE:
  1. Start daemon: node tests/master-suite/cortex --server --daemon
  2. Verify:       node tests/master-suite/cortex --check
  3. Run tests:    node tests/master-suite/run.js --log-file --profile=HIPAA_STRICT

PROGRAMMATIC USAGE:
  const cortex = require('./cortex');
  await cortex.initialize();
  const analysis = await cortex.analyzeResults(testResults);
  const recommendation = await cortex.getRecommendation('WHAT_TO_IMPROVE');
`);
  } else {
    console.error("Use --help for usage information");
  }
}

// Run CLI if executed directly
if (require.main === module) {
  runCLI().catch(console.error);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = cortex;

// Also export class and modules for advanced use
module.exports.VulpesCortex = VulpesCortex;
module.exports.startServer = startMcpServer;

// Export individual modules
module.exports.KnowledgeBase = KnowledgeBase;
module.exports.MetricsEngine = MetricsEngine;
module.exports.CodebaseAnalyzer = CodebaseAnalyzer;
module.exports.TemporalIndex = TemporalIndex;
module.exports.PatternRecognizer = PatternRecognizer;
module.exports.HypothesisEngine = HypothesisEngine;
module.exports.InterventionTracker = InterventionTracker;
module.exports.InsightGenerator = InsightGenerator;
module.exports.ExperimentRunner = ExperimentRunner;
module.exports.SnapshotManager = SnapshotManager;
module.exports.ComparisonEngine = ComparisonEngine;
module.exports.RollbackManager = RollbackManager;
module.exports.DecisionEngine = DecisionEngine;
module.exports.HistoryConsultant = HistoryConsultant;
module.exports.RecommendationBuilder = RecommendationBuilder;
module.exports.CodebaseStateTracker = CodebaseStateTracker;
