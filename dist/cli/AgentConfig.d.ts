/**
 * Agent Configuration - Central config for AI backend defaults
 *
 * This file defines the latest recommended models and settings for each backend.
 * The Vulpes CLI will auto-configure these when setting up integrations,
 * and will auto-update existing configs when they're outdated.
 */
export declare const AGENT_CONFIG: {
    configVersion: string;
    codex: {
        defaultModel: string;
        reasoningEffort: string;
        modelFallbacks: string[];
    };
    claude: {
        defaultModel: string;
        modelFallbacks: string[];
    };
    mcp: {
        server: string;
        daemonMode: boolean;
        startupTimeoutSec: number;
        toolTimeoutSec: number;
    };
};
export type AgentBackend = "claude" | "codex" | "copilot";
//# sourceMappingURL=AgentConfig.d.ts.map