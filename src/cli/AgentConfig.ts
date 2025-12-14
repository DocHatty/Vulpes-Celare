/**
 * Agent Configuration - Central config for AI backend defaults
 *
 * This file defines the latest recommended models and settings for each backend.
 * The Vulpes CLI will auto-configure these when setting up integrations,
 * and will auto-update existing configs when they're outdated.
 */

export const AGENT_CONFIG = {
    // Version - bump this when changing defaults to trigger auto-update
    configVersion: "1.0.0",

    // Codex (OpenAI)
    codex: {
        defaultModel: "gpt-5.2",
        reasoningEffort: "medium",
        // Models in preference order (fallback if primary unavailable)
        modelFallbacks: ["gpt-5.1", "gpt-4.1", "o3"],
    },

    // Claude Code (Anthropic)
    claude: {
        // Claude Code auto-selects the best model, but we can set preferences
        defaultModel: "claude-sonnet-4-20250514",
        modelFallbacks: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
    },

    // MCP Server settings
    mcp: {
        server: "tests/master-suite/cortex/mcp/server.js",
        daemonMode: true,
        startupTimeoutSec: 30,
        toolTimeoutSec: 120,
    },
};

export type AgentBackend = "claude" | "codex" | "copilot";
