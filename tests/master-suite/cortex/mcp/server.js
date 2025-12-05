/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  VULPES CORTEX - MCP SERVER                                                  ║
 * ║  Gold-Standard Model Context Protocol Implementation                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
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

// ============================================================================
// VULPES CORTEX MCP SERVER
// ============================================================================

class VulpesCortexServer {
  constructor() {
    this.server = null;
    this.modules = {};
    this.initialized = false;
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
        name: MCP_CONFIG.serverName,
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
      console.error(`[Vulpes Cortex] Tool call: ${name}`);

      try {
        const result = await executeTool(name, args, this.modules);
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
      } catch (error) {
        console.error(`[Vulpes Cortex] Tool error:`, error.message);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
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
    // Initialize modules first
    await this.initialize();

    // Create server
    this.createServer();

    if (options.daemon) {
      // DAEMON MODE: Start HTTP health server that keeps process alive
      const port = options.port || 3100;
      await this.startDaemon(port);
    } else {
      // STDIO MODE: Connect via stdio (requires connected client)
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      console.error(
        "[Vulpes Cortex] MCP Server started successfully (stdio mode)",
      );
      console.error(
        `[Vulpes Cortex] Server: ${MCP_CONFIG.name} v${MCP_CONFIG.version}`,
      );
    }
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
        console.error(
          `[${timestamp}] ════════════════════════════════════════`,
        );
        console.error(`[${timestamp}] TOOL CALL: ${toolName}`);

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

          console.error(`[${timestamp}] ✓ COMPLETED in ${duration}s`);
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
          console.error(
            `[${timestamp}] ════════════════════════════════════════`,
          );

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result, null, 2));
        } catch (err) {
          console.error(`[${timestamp}] ✗ ERROR: ${err.message}`);
          console.error(`[${timestamp}] Stack: ${err.stack}`);
          console.error(
            `[${timestamp}] ════════════════════════════════════════`,
          );
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: false,
            error: err.message,
            stack: err.stack,
            action: `Fix the error: ${err.message}`,
            timestamp: new Date().toISOString(),
            hint: "Check the MCP server window for full error details"
          }, null, 2));
        }
      } else {
        console.error(`[${timestamp}] 404: ${req.url}`);
        res.writeHead(404);
        res.end("Not found. Endpoints: /health, /ready, /tool/{toolName}");
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

        console.error(
          "╔══════════════════════════════════════════════════════════════════════════════╗",
        );
        console.error(
          "║  VULPES CORTEX MCP SERVER - RUNNING                                          ║",
        );
        console.error(
          "╠══════════════════════════════════════════════════════════════════════════════╣",
        );
        console.error(
          `║  Status:      ACTIVE                                                         ║`,
        );
        console.error(`║  Port:        ${String(port).padEnd(65)}║`);
        console.error(`║  PID:         ${String(process.pid).padEnd(65)}║`);
        console.error(
          `║  Health:      http://localhost:${port}/health${" ".repeat(43 - String(port).length)}║`,
        );
        console.error(
          "╠══════════════════════════════════════════════════════════════════════════════╣",
        );
        console.error(
          "║  Server will stay running until manually stopped (Ctrl+C)                    ║",
        );
        console.error(
          "╚══════════════════════════════════════════════════════════════════════════════╝",
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
