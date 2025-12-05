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
   */
  async start() {
    // Initialize modules first
    await this.initialize();

    // Create server
    this.createServer();

    // Connect via stdio
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("[Vulpes Cortex] MCP Server started successfully");
    console.error(
      `[Vulpes Cortex] Server: ${MCP_CONFIG.name} v${MCP_CONFIG.version}`,
    );
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.error("[Vulpes Cortex] Shutting down...");

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

  try {
    await server.start();
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
