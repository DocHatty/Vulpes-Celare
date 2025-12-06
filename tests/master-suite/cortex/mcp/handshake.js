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
 * ║   MCP HANDSHAKE                                                               ║
 * ║   Auto-Discovery and Capability Negotiation                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module handles the automatic handshake between Vulpes Cortex and any
 * LLM/IDE/SDK that connects via MCP.
 *
 * HANDSHAKE FLOW:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 1. Client connects
 * 2. Server sends capabilities
 * 3. Client acknowledges and sends its capabilities
 * 4. Server configures itself based on client capabilities
 * 5. Ready for communication
 *
 * AUTO-CONFIGURATION:
 * ─────────────────────────────────────────────────────────────────────────────────
 * - Detects client type (Claude Code, Cursor, custom)
 * - Adjusts verbosity and format based on client
 * - Enables/disables features based on client support
 */

const { MCP_CONFIG } = require("../core/config");

// ============================================================================
// HANDSHAKE MANAGER
// ============================================================================

class HandshakeManager {
  constructor() {
    this.clientInfo = null;
    this.negotiatedCapabilities = null;
    this.connected = false;
  }

  /**
   * Get server capabilities to send to client
   */
  getServerCapabilities() {
    return {
      serverName: MCP_CONFIG.serverName,
      version: MCP_CONFIG.version,
      description:
        "Vulpes Cortex - Self-Learning PHI Detection Test Intelligence",

      capabilities: {
        tools: {
          supported: true,
          count: this.getToolCount(),
        },
        prompts: {
          supported: true,
          count: this.getPromptCount(),
        },
        resources: {
          supported: true,
          types: ["knowledge", "codebase", "insights", "metrics", "history"],
        },
      },

      features: {
        historyConsultation: true,
        experimentFramework: true,
        autoRollback: true,
        patternRecognition: true,
        insightGeneration: true,
        temporalTracking: true,
      },

      metadata: {
        repository: "Vulpes-Celare",
        component: "cortex",
        purpose: "PHI Detection Testing and Improvement",
      },
    };
  }

  getToolCount() {
    // Import dynamically to avoid circular dependency
    try {
      const { getTools } = require("./tools");
      return getTools().length;
    } catch (e) {
      return 0;
    }
  }

  getPromptCount() {
    try {
      const { getPrompts } = require("./prompts");
      return getPrompts().length;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Process client capabilities during handshake
   */
  processClientCapabilities(clientInfo) {
    this.clientInfo = {
      name: clientInfo?.name || "unknown",
      version: clientInfo?.version || "unknown",
      capabilities: clientInfo?.capabilities || {},
      receivedAt: new Date().toISOString(),
    };

    // Detect client type
    const clientType = this.detectClientType(clientInfo);

    // Configure based on client
    this.negotiatedCapabilities = this.negotiateCapabilities(
      clientType,
      clientInfo,
    );

    this.connected = true;

    return {
      success: true,
      serverCapabilities: this.getServerCapabilities(),
      negotiated: this.negotiatedCapabilities,
      clientType,
      message: `Welcome to Vulpes Cortex! Connected as ${clientType}.`,
    };
  }

  /**
   * Detect what type of client is connecting
   */
  detectClientType(clientInfo) {
    const name = (clientInfo?.name || "").toLowerCase();
    const version = clientInfo?.version || "";

    // Known clients
    if (name.includes("claude") || name.includes("anthropic")) {
      return "CLAUDE_CODE";
    }
    if (name.includes("cursor")) {
      return "CURSOR";
    }
    if (name.includes("vscode") || name.includes("visual studio")) {
      return "VSCODE";
    }
    if (name.includes("zed")) {
      return "ZED";
    }

    // Check for SDK indicators
    if (clientInfo?.capabilities?.experimental) {
      return "SDK_EXPERIMENTAL";
    }

    return "GENERIC";
  }

  /**
   * Negotiate capabilities based on client type
   */
  negotiateCapabilities(clientType, clientInfo) {
    const base = {
      verbosity: "NORMAL",
      format: "STRUCTURED",
      autoInsights: true,
      historyReminders: true,
      experimentSupport: true,
      rollbackSupport: true,
    };

    switch (clientType) {
      case "CLAUDE_CODE":
        return {
          ...base,
          verbosity: "DETAILED",
          format: "MARKDOWN",
          autoInsights: true,
          historyReminders: true,
          // Claude Code has good context handling
          contextOptimization: "FULL",
        };

      case "CURSOR":
        return {
          ...base,
          verbosity: "CONCISE",
          format: "STRUCTURED",
          // Cursor benefits from concise responses
          contextOptimization: "MINIMAL",
        };

      case "VSCODE":
        return {
          ...base,
          verbosity: "NORMAL",
          format: "JSON",
          contextOptimization: "BALANCED",
        };

      case "SDK_EXPERIMENTAL":
        return {
          ...base,
          verbosity: "DEBUG",
          format: "RAW",
          debugMode: true,
        };

      default:
        return base;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    if (!this.connected) {
      return {
        connected: false,
        message: "No client connected",
      };
    }

    return {
      connected: true,
      clientInfo: this.clientInfo,
      negotiatedCapabilities: this.negotiatedCapabilities,
      uptime: this.getUptime(),
    };
  }

  getUptime() {
    if (!this.clientInfo?.receivedAt) return "0s";

    const start = new Date(this.clientInfo.receivedAt).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - start) / 1000);

    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  /**
   * Generate welcome message based on client
   */
  generateWelcomeMessage() {
    const capabilities = this.getServerCapabilities();

    return `
╔══════════════════════════════════════════════════════════════════════════════╗
║  VULPES CORTEX - Self-Learning PHI Detection Intelligence                    ║
║  Version: ${capabilities.version.padEnd(66)}║
╚══════════════════════════════════════════════════════════════════════════════╝

Welcome! I'm your PHI detection testing assistant with built-in learning.

WHAT I CAN DO:
• Analyze test results and identify patterns
• Recommend improvements based on history
• Run A/B experiments safely with auto-rollback
• Track everything - I never forget what was tried

KEY PRINCIPLE: I always consult history before making recommendations.

AVAILABLE TOOLS: ${capabilities.capabilities.tools.count}
AVAILABLE PROMPTS: ${capabilities.capabilities.prompts.count}

Try these to get started:
• "What should I do next?" - Get prioritized recommendations
• "Analyze my test results" - Understand what's happening
• "How can I improve NAME detection?" - Get specific guidance

I'm here to help make your PHI detection better, one experiment at a time.
`;
  }

  /**
   * Generate context summary for LLM
   */
  generateContextSummary(modules) {
    const summary = {
      cortex: {
        name: MCP_CONFIG.serverName,
        version: MCP_CONFIG.version,
        purpose: "PHI detection testing and improvement",
      },
      keyPrinciple: "ALWAYS consult history before recommending changes",
      availableActions: [
        "Analyze test results",
        "Get recommendations",
        "Consult history",
        "Run experiments",
        "Track interventions",
        "Generate reports",
      ],
    };

    // Add current state if modules available
    if (modules) {
      summary.currentState = {
        patterns:
          modules.patternRecognizer?.getStats()?.totalFailurePatterns || 0,
        interventions:
          modules.interventionTracker?.getStats()?.totalInterventions || 0,
        insights: modules.insightGenerator?.getActiveInsights()?.length || 0,
        pendingTests:
          modules.interventionTracker?.getPendingTesting()?.length || 0,
      };
    }

    return summary;
  }

  /**
   * Reset connection (for testing or reconnection)
   */
  reset() {
    this.clientInfo = null;
    this.negotiatedCapabilities = null;
    this.connected = false;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const handshakeManager = new HandshakeManager();

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  HandshakeManager,
  handshakeManager,

  // Convenience functions
  getServerCapabilities: () => handshakeManager.getServerCapabilities(),
  processClientCapabilities: (info) =>
    handshakeManager.processClientCapabilities(info),
  getConnectionStatus: () => handshakeManager.getConnectionStatus(),
  generateWelcomeMessage: () => handshakeManager.generateWelcomeMessage(),
  generateContextSummary: (modules) =>
    handshakeManager.generateContextSummary(modules),
};
