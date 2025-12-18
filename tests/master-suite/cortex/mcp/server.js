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
 * ║   MCP SERVER                                                                  ║
 * ║   Gold-Standard Model Context Protocol Implementation                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This is the main MCP server that exposes Vulpes Cortex to any LLM/IDE/SDK.
 *
 * MCP SPECIFICATION COMPLIANCE:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - JSON-RPC 2.0 over stdio
 * - Tools: Executable actions the LLM can invoke
 * - Prompts: Pre-built templates for common tasks
 * - Resources: Data the LLM can read (knowledge, state)
 * - Auto-negotiation of capabilities
 *
 * TRANSPORT:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - stdio (default): For IDE integrations like Claude Code, Cursor
 * - HTTP/SSE: For remote connections (optional)
 *
 * LIFECYCLE:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 1. Initialize → Server starts, loads all modules
 * 2. Handshake  → Negotiate capabilities with client
 * 3. Serve      → Handle tool calls, prompts, resource requests
 * 4. Shutdown   → Graceful cleanup
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const http = require("http");
const fs = require("fs");

const path = require("path");

// Import Cortex modules
const { PATHS, MCP_CONFIG } = require("../core/config");
const { KnowledgeBase } = require("../core/knowledge-base");
const { MetricsEngine } = require("../core/metrics-engine");
const { CodebaseAnalyzer } = require("../core/codebase-analyzer");
const { TemporalIndex } = require("../core/temporal-index");
const { MerkleLog } = require("../core/merkle-log");
const { ProvenanceEngine } = require("../core/provenance-engine");
const { PatternRecognizer } = require("../learning/pattern-recognizer");
const { HypothesisEngine } = require("../learning/hypothesis-engine");
const { InterventionTracker } = require("../learning/intervention-tracker");
const { InsightGenerator } = require("../learning/insight-generator");
const { ExperimentRunner } = require("../experiments/experiment-runner");
const { SnapshotManager } = require("../experiments/snapshot-manager");
const { ComparisonEngine } = require("../experiments/comparison-engine");
const { RollbackManager } = require("../experiments/rollback-manager");
const { DecisionEngine } = require("../decision/decision-engine");
const { HistoryConsultant } = require("../decision/history-consultant");
const { RecommendationBuilder } = require("../decision/recommendation-builder");
const { CodebaseStateTracker } = require("../decision/codebase-state-tracker");

// Import tools and prompts definitions
const { getTools, executeTool } = require("./tools");
const { getPrompts, getPrompt } = require("./prompts");

// Import console formatter for beautiful, glitch-free output
const fmt = require("../core/console-formatter");

// Import database adapter for SQLite-backed operations
const { withDatabase, getDatabaseInstance } = require("../core/db-adapter");

// ============================================================================
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  ⚠️  MCP PROTOCOL SAFETY - READ THIS BEFORE EDITING ANY CODE! ⚠️          ║
// ╠══════════════════════════════════════════════════════════════════════════╣
// ║                                                                          ║
// ║  MCP uses JSON-RPC 2.0 over STDIO:                                       ║
// ║    • stdin  = incoming JSON-RPC requests                                 ║
// ║    • stdout = outgoing JSON-RPC responses (ONLY!)                        ║
// ║    • stderr = debug/log output (safe for any text)                       ║
// ║                                                                          ║
// ║  ANY non-JSON output to stdout BREAKS THE PROTOCOL!                      ║
// ║  This causes "Unexpected token" errors in the MCP client.                ║
// ║                                                                          ║
// ║  ❌ FORBIDDEN:                                                            ║
// ║    • console.log()           - outputs to stdout                         ║
// ║    • process.stdout.write()  - outputs to stdout                         ║
// ║                                                                          ║
// ║  ✅ SAFE ALTERNATIVES:                                                    ║
// ║    • console.error()         - outputs to stderr                         ║
// ║    • process.stderr.write()  - outputs to stderr                         ║
// ║    • log(), debug(), warn()  - helper functions below                    ║
// ║                                                                          ║
// ║  Run safety check: node scripts/check-stdout-safety.js                   ║
// ║                                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// ============================================================================

/**
 * DEBUG MODE: Set to true for verbose logging (to stderr only!)
 * When enabled, logs detailed information about every operation.
 */
const DEBUG_MODE =
  process.env.VULPES_DEBUG === "1" || process.argv.includes("--debug");

/**
 * Safe logging function - ALWAYS goes to stderr, NEVER stdout
 * Use this instead of console.log() anywhere in this file
 */
function log(...args) {
  console.error("[Cortex]", ...args);
}

function debug(...args) {
  if (DEBUG_MODE) {
    console.error("[Cortex:DEBUG]", ...args);
  }
}

function warn(...args) {
  console.error("[Cortex:WARN]", ...args);
}

function error(...args) {
  console.error("[Cortex:ERROR]", ...args);
}

/**
 * STDOUT PROTECTION: Intercept and redirect any rogue console.log calls
 * This is a safety net for any imported modules that might use console.log
 */
const originalConsoleLog = console.log;
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
let stdoutProtectionEnabled = false;

function enableStdoutProtection() {
  if (stdoutProtectionEnabled) return;
  stdoutProtectionEnabled = true;

  // Intercept console.log
  console.log = (...args) => {
    // Check if this looks like JSON-RPC (legit MCP output)
    if (args.length === 1 && typeof args[0] === "string") {
      try {
        const parsed = JSON.parse(args[0]);
        if (parsed.jsonrpc === "2.0") {
          // This is legitimate MCP output, allow it
          originalConsoleLog.apply(console, args);
          return;
        }
      } catch {
        // Not JSON, redirect to stderr
      }
    }
    // Redirect all other console.log to stderr
    console.error("[INTERCEPTED console.log]", ...args);
  };

  // CRITICAL: Also intercept process.stdout.write
  // This catches direct stdout writes that bypass console.log
  process.stdout.write = (chunk, encoding, callback) => {
    const str = typeof chunk === "string" ? chunk : chunk.toString();

    // Check if this looks like JSON-RPC (legit MCP output)
    try {
      // MCP messages are single-line JSON objects
      const trimmed = str.trim();
      if (trimmed.startsWith("{") && trimmed.includes('"jsonrpc"')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.jsonrpc === "2.0") {
          // This is legitimate MCP output, allow it
          return originalStdoutWrite(chunk, encoding, callback);
        }
      }
    } catch {
      // Not valid JSON-RPC, redirect to stderr
    }

    // Redirect non-MCP output to stderr
    process.stderr.write(`[INTERCEPTED stdout.write] ${str}`);
    if (typeof callback === "function") callback();
    return true;
  };

  debug(
    "Stdout protection ENABLED - console.log AND stdout.write redirected to stderr",
  );
}

function disableStdoutProtection() {
  console.log = originalConsoleLog;
  process.stdout.write = originalStdoutWrite;
  stdoutProtectionEnabled = false;
}

// ============================================================================
// ERROR CONTEXT TRACKING
// ============================================================================
/**
 * Tracks current operation for better error messages
 */
let currentOperation = {
  type: null,
  name: null,
  startTime: null,
  args: null,
};

function startOperation(type, name, args = {}) {
  currentOperation = {
    type,
    name,
    startTime: Date.now(),
    args: JSON.stringify(args).substring(0, 200),
  };
  debug(`Starting ${type}: ${name}`);
}

function endOperation(success = true, details = "") {
  const duration = Date.now() - (currentOperation.startTime || Date.now());
  if (success) {
    debug(
      `Completed ${currentOperation.type}: ${currentOperation.name} (${duration}ms) ${details}`,
    );
  } else {
    error(
      `Failed ${currentOperation.type}: ${currentOperation.name} (${duration}ms) ${details}`,
    );
  }
  currentOperation = { type: null, name: null, startTime: null, args: null };
}

function getOperationContext() {
  if (!currentOperation.type) return "";
  return `\n  During: ${currentOperation.type} "${currentOperation.name}"\n  Args: ${currentOperation.args}`;
}

// ============================================================================
// VULPES CORTEX MCP SERVER
// ============================================================================

class VulpesCortexServer {
  constructor() {
    this.server = null;
    this.modules = {};
    this.initialized = false;
    this.errorCount = 0;
    this.lastErrors = [];
  }

  /**
   * Initialize all Cortex modules
   */
  async initialize() {
    console.error("[Vulpes Cortex] Initializing modules...");

    try {
      // Core modules
      this.modules.knowledgeBase = new KnowledgeBase();
      this.modules.metricsEngine = new MetricsEngine();
      this.modules.codebaseAnalyzer = new CodebaseAnalyzer(
        this.modules.knowledgeBase,
      );
      this.modules.temporalIndex = new TemporalIndex(
        this.modules.knowledgeBase,
      );

      // Initialize MerkleLog (will be connected to DB via withDatabase later, but we need the instance)
      // Actually, MerkleLog needs DB in constructor. 
      // Let's get the DB instance first as we do in index.js, or trust withDatabase to inject it?
      // looking at index.js: this.modules.merkleLog = new MerkleLog(db);
      // In server.js we use withDatabase at the end. 
      // Let's grab the DB instance explicitly here to be safe and consistent with index.js
      const { getDatabase } = require("../db/database");
      const db = getDatabase();
      this.modules.merkleLog = new MerkleLog(db);
      this.modules.provenanceEngine = new ProvenanceEngine(db, this.modules.merkleLog);

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

      // Add database to modules for direct access
      this.modules = withDatabase(this.modules);
      console.error("[Vulpes Cortex] Database adapter connected");

      this.initialized = true;
      console.error("[Vulpes Cortex] All modules initialized successfully");
    } catch (error) {
      console.error(
        "[Vulpes Cortex] Module initialization failed:",
        error.message,
      );
      throw error;
    }
  }

  /**
   * Create and configure the MCP server
   */
  createServer() {
    this.server = new Server(
      {
        name: MCP_CONFIG.name,
        version: MCP_CONFIG.version,
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
          resources: {},
        },
      },
    );

    this.setupHandlers();
    return this.server;
  }

  /**
   * Setup all MCP request handlers
   */
  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: getTools() };
    });

    // Execute a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // LAZY INIT: Load modules on first tool call
      await this.ensureInitialized();

      startOperation("TOOL", name, args);
      log(`Tool call: ${name}`);
      debug(`Full args: ${JSON.stringify(args)}`);

      try {
        const result = await executeTool(name, args, this.modules);
        endOperation(
          true,
          `result keys: ${Object.keys(result || {}).join(", ")}`,
        );
        return {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        // Track error for debugging
        this.errorCount++;
        const errorInfo = {
          timestamp: new Date().toISOString(),
          tool: name,
          args: JSON.stringify(args).substring(0, 500),
          message: err.message,
          stack: err.stack?.split("\n").slice(0, 5).join("\n"),
        };
        this.lastErrors.push(errorInfo);
        if (this.lastErrors.length > 10) this.lastErrors.shift();

        error(`Tool "${name}" failed: ${err.message}`);
        error(`Stack trace (first 5 lines):\n${errorInfo.stack}`);
        error(`Args were: ${errorInfo.args}`);
        endOperation(false, err.message);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: true,
                  tool: name,
                  message: err.message,
                  hint: "Check stderr for full stack trace",
                  totalErrors: this.errorCount,
                  debugCommand: "Set VULPES_DEBUG=1 for verbose logging",
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return { prompts: getPrompts() };
    });

    // Get a specific prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      await this.ensureInitialized();
      console.error(`[Vulpes Cortex] Prompt request: ${name}`);

      try {
        const prompt = await getPrompt(name, args, this.modules);
        return prompt;
      } catch (error) {
        console.error(`[Vulpes Cortex] Prompt error:`, error.message);
        throw error;
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "cortex://knowledge/summary",
            mimeType: "application/json",
            name: "Knowledge Base Summary",
            description:
              "Summary of all learned knowledge including patterns, hypotheses, and interventions",
          },
          {
            uri: "cortex://codebase/state",
            mimeType: "application/json",
            name: "Codebase State",
            description: "Current state of filters, dictionaries, and pipeline",
          },
          {
            uri: "cortex://insights/active",
            mimeType: "application/json",
            name: "Active Insights",
            description: "Current actionable insights and recommendations",
          },
          {
            uri: "cortex://metrics/current",
            mimeType: "application/json",
            name: "Current Metrics",
            description: "Latest test metrics and trends",
          },
          {
            uri: "cortex://history/recent",
            mimeType: "application/json",
            name: "Recent History",
            description: "Recent interventions and their effects",
          },
        ],
      };
    });

    // Read a resource
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const { uri } = request.params;
        await this.ensureInitialized();
        console.error(`[Vulpes Cortex] Resource request: ${uri}`);

        try {
          const content = await this.getResource(uri);
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(content, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error(`[Vulpes Cortex] Resource error:`, error.message);
          throw error;
        }
      },
    );

    // Error handler
    this.server.onerror = (error) => {
      console.error("[Vulpes Cortex] Server error:", error);
    };
  }

  /**
   * Get resource content by URI
   */
  async getResource(uri) {
    switch (uri) {
      case "cortex://knowledge/summary":
        return {
          knowledgeBase: this.modules.knowledgeBase?.exportForLLM(),
          patterns: this.modules.patternRecognizer?.exportForLLM(),
          hypotheses: this.modules.hypothesisEngine?.exportForLLM(),
          interventions: this.modules.interventionTracker?.exportForLLM(),
        };

      case "cortex://codebase/state":
        return (
          this.modules.codebaseStateTracker?.exportForLLM() ||
          this.modules.codebaseAnalyzer?.exportForLLM()
        );

      case "cortex://insights/active":
        return this.modules.insightGenerator?.exportForLLM();

      case "cortex://metrics/current":
        return {
          engine: this.modules.metricsEngine?.exportForLLM(),
          temporal: this.modules.temporalIndex?.exportForLLM(),
        };

      case "cortex://history/recent":
        return {
          interventions:
            this.modules.interventionTracker?.getRecentInterventions(10),
          experiments: this.modules.experimentRunner?.getRecentExperiments(5),
          decisions: this.modules.decisionEngine?.getRecentDecisions(5),
        };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  /**
   * Start the MCP server
   * @param {Object} options - Start options
   * @param {boolean} options.daemon - Run as HTTP daemon (stays alive)
   * @param {number} options.port - HTTP port for daemon mode (default: 3100)
   */
  async start(options = {}) {
    log("Starting Vulpes Cortex MCP Server...");
    debug(`Options: ${JSON.stringify(options)}`);
    debug(`DEBUG_MODE: ${DEBUG_MODE}`);

    // LAZY INITIALIZATION: Don't block MCP handshake
    // Modules will be initialized on first tool call
    // This makes the server respond instantly to Claude Code

    // Create server FIRST (fast)
    this.createServer();

    if (options.daemon) {
      // DAEMON MODE: Initialize modules upfront since we're a background server
      await this.initialize();
      const port = options.port || 3100;
      await this.startDaemon(port);
    } else {
      // STDIO MODE: Connect via stdio (requires connected client)
      // CRITICAL: Enable stdout protection BEFORE connecting
      // This catches any rogue console.log calls that would break MCP
      enableStdoutProtection();
      log("Stdout protection enabled for stdio mode");

      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      console.error(
        "[Vulpes Cortex] MCP Server started successfully (stdio mode)",
      );
      console.error(
        `[Vulpes Cortex] Server: ${MCP_CONFIG.name} v${MCP_CONFIG.version}`,
      );
      console.error(
        "[Vulpes Cortex] Modules will initialize on first tool call (lazy loading)",
      );

      // Keep process alive - the SDK handles the message loop
      await new Promise(() => { }); // Never resolves
    }
  }

  /**
   * Ensure modules are initialized (lazy initialization)
   */
  async ensureInitialized() {
    if (this.initialized) return;
    await this.initialize();
  }

  /**
   * Start as HTTP daemon with health check endpoint
   * This keeps the server running and provides status verification
   */
  async startDaemon(port) {
    const statusFile = path.join(PATHS.storage, ".cortex-status.json");

    // Create HTTP server for health checks, status, AND tool execution
    this.httpServer = http.createServer(async (req, res) => {
      const timestamp = new Date().toISOString().split("T")[1].split(".")[0];

      if (req.url === "/health" || req.url === "/") {
        console.error(`[${timestamp}] GET /health`);
        const status = {
          status: "running",
          server: MCP_CONFIG.name,
          version: MCP_CONFIG.version,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          modules: Object.keys(this.modules).length,
          pid: process.pid,
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(status, null, 2));
      } else if (req.url === "/ready") {
        console.error(`[${timestamp}] GET /ready`);
        // Readiness check - are all modules loaded?
        if (this.initialized && Object.keys(this.modules).length > 0) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ready: true }));
        } else {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ready: false, reason: "Not initialized" }));
        }
      } else if (req.url.startsWith("/tool/")) {
        // TOOL EXECUTION ENDPOINT: /tool/{toolName}
        const toolName = req.url.replace("/tool/", "").split("?")[0];
        console.error(fmt.toolCallHeader(toolName, timestamp));

        // Parse args from POST body or query string
        let args = {};
        if (req.method === "POST") {
          const body = await new Promise((resolve) => {
            let data = "";
            req.on("data", (chunk) => (data += chunk));
            req.on("end", () => {
              try {
                resolve(JSON.parse(data || "{}"));
              } catch {
                resolve({});
              }
            });
          });
          args = body;
        } else {
          const url = new URL(req.url, `http://localhost:${port}`);
          for (const [key, value] of url.searchParams) {
            if (value === "true") args[key] = true;
            else if (value === "false") args[key] = false;
            else if (!isNaN(value) && value !== "") args[key] = Number(value);
            else args[key] = value;
          }
        }

        console.error(`[${timestamp}] Args: ${JSON.stringify(args)}`);

        try {
          const { executeTool } = require("./tools");
          const startTime = Date.now();
          const result = await executeTool(toolName, args, this.modules);
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);

          console.error(fmt.toolCallFooter(timestamp, true, duration));
          if (result.metrics) {
            console.error(
              `[${timestamp}] Sensitivity: ${result.metrics.sensitivity}%`,
            );
            console.error(`[${timestamp}] Grade: ${result.metrics.grade}`);
          }
          if (result.action) {
            console.error(
              `[${timestamp}] Action: ${result.action.substring(0, 60)}...`,
            );
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result, null, 2));
        } catch (err) {
          console.error(fmt.toolCallFooter(timestamp, false));
          console.error(`[${timestamp}] ERROR: ${err.message}`);
          console.error(`[${timestamp}] Stack: ${err.stack}`);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify(
              {
                success: false,
                error: err.message,
                stack: err.stack,
                action: `Fix the error: ${err.message}`,
                timestamp: new Date().toISOString(),
                hint: "Check the MCP server window for full error details",
              },
              null,
              2,
            ),
          );
        }
      } else if (req.url === "/audit/head") {
        console.error(`[${timestamp}] GET /audit/head`);
        try {
          const head = this.modules.merkleLog.getHead();
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(head || { status: "empty" }, null, 2));
        } catch (err) {
          console.error(`[${timestamp}] Error getting audit head: ${err.message}`);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      } else if (req.url.startsWith("/audit/verify/")) {
        const id = parseInt(req.url.split("/").pop());
        console.error(`[${timestamp}] GET /audit/verify/${id}`);
        try {
          const result = this.modules.merkleLog.verify(id);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result, null, 2));
        } catch (err) {
          res.end(JSON.stringify({ error: err.message }));
        }
      } else if (req.url === "/provenance/record" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });
        req.on("end", async () => {
          try {
            const timestamp = new Date().toISOString();
            console.error(`[${timestamp}] POST /provenance/record`);
            const { docId, original, redacted, manifest, actorId } = JSON.parse(body);
            if (!docId || !original || !redacted || !manifest) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing required fields" }));
              return;
            }
            const receipt = await this.modules.provenanceEngine.createJob(
              docId, original, redacted, manifest, actorId || "unknown"
            );
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify(receipt));
          } catch (err) {
            console.error(`Error recording provenance: ${err.message}`);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else if (req.url.startsWith("/provenance/verify/")) {
        const jobId = req.url.split("/provenance/verify/")[1];
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] GET /provenance/verify/${jobId}`);
        try {
          const verification = this.modules.provenanceEngine.getVerificationData(jobId);
          if (!verification) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Job not found" }));
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(verification));
        } catch (err) {
          console.error(`Error verifying provenance ${jobId}: ${err.message}`);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      } else {
        console.error(`[${timestamp}] 404: ${req.url}`);
        res.writeHead(404);
        res.end("Not found. Endpoints: /health, /ready, /tool/{toolName}, /audit/head, /audit/verify/{id}");
      }
    });

    return new Promise((resolve, reject) => {
      this.httpServer.listen(port, () => {
        // Write status file for other processes to check
        const statusData = {
          status: "running",
          pid: process.pid,
          port: port,
          startedAt: new Date().toISOString(),
          server: MCP_CONFIG.name,
          version: MCP_CONFIG.version,
        };
        fs.writeFileSync(statusFile, JSON.stringify(statusData, null, 2));

        // Display beautiful, perfectly-aligned server banner
        console.error(
          fmt.serverBanner(
            "VULPES CORTEX MCP SERVER",
            port,
            process.pid,
            `http://localhost:${port}/health`,
          ),
        );
        console.error("");

        resolve();
      });

      this.httpServer.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.error(
            `[Vulpes Cortex] Port ${port} already in use - server may already be running`,
          );
          // Check if it's actually our server
          this.checkExistingServer(port).then((existing) => {
            if (existing) {
              console.error(
                "[Vulpes Cortex] Existing Cortex server detected and healthy",
              );
              process.exit(0); // Exit gracefully - server already running
            } else {
              reject(new Error(`Port ${port} in use by another process`));
            }
          });
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Check if an existing server is running and healthy
   */
  async checkExistingServer(port) {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/health`, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const status = JSON.parse(data);
            resolve(status.server === MCP_CONFIG.name);
          } catch {
            resolve(false);
          }
        });
      });
      req.on("error", () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.error("[Vulpes Cortex] Shutting down...");

    // Close HTTP server if running
    if (this.httpServer) {
      this.httpServer.close();
    }

    // Remove status file
    const statusFile = path.join(PATHS.storage, ".cortex-status.json");
    if (fs.existsSync(statusFile)) {
      fs.unlinkSync(statusFile);
    }

    if (this.server) {
      await this.server.close();
    }

    console.error("[Vulpes Cortex] Shutdown complete");
    process.exit(0);
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
  const server = new VulpesCortexServer();

  // Handle shutdown signals
  process.on("SIGINT", () => server.shutdown());
  process.on("SIGTERM", () => server.shutdown());

  // Parse command line args
  const args = process.argv.slice(2);
  const daemon = args.includes("--daemon") || args.includes("-d");
  let port = 3100;

  const portArg = args.find((a) => a.startsWith("--port="));
  if (portArg) {
    port = parseInt(portArg.split("=")[1]) || 3100;
  }

  try {
    await server.start({ daemon, port });
  } catch (error) {
    console.error("[Vulpes Cortex] Fatal error:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  VulpesCortexServer,
  main,
};
