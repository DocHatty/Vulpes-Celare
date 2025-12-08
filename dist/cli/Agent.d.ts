/**
 * ============================================================================
 * VULPES AGENT - VULPESIFIED AI-Powered Redaction Development System
 * ============================================================================
 *
 * Deep integration with Claude Code, Codex, and Copilot CLIs.
 * Uses ALL available hooks, MCP, AGENTS.md, CLAUDE.md, and slash commands.
 *
 * CLAUDE CODE INTEGRATION:
 * - --append-system-prompt: Inject full Vulpes knowledge
 * - --allowedTools: Enable all Vulpes MCP tools
 * - Hooks: SessionStart, UserPromptSubmit, PostToolUse
 * - CLAUDE.md: Auto-loaded project context
 * - Slash commands: /vulpes-redact, /vulpes-analyze, /vulpes-info
 *
 * CODEX INTEGRATION:
 * - AGENTS.md: Auto-loaded instructions
 * - config.toml: MCP server registration
 * - Full tool access via MCP
 *
 * SHARED CAPABILITIES:
 * - Interactive redaction mode
 * - Quick redact command
 * - System info display
 * - Full Vulpes engine access
 */
import { RedactionResult } from "../VulpesCelare";
export type AgentMode = "dev" | "qa" | "production";
export type AgentBackend = "codex" | "copilot" | "claude" | "native";
export interface AgentConfig {
    mode: AgentMode;
    backend: AgentBackend;
    model?: string;
    apiKey?: string;
    workingDir: string;
    allowEdits: boolean;
    allowTests: boolean;
    verbose: boolean;
    autoVulpesify: boolean;
}
interface RedactionComparison {
    original: string;
    redacted: string;
    result: RedactionResult;
    issues: RedactionIssue[];
}
interface RedactionIssue {
    type: "leak" | "false_positive" | "policy_violation";
    description: string;
    original: string;
    suggestion?: string;
}
export declare class VulpesAgent {
    private config;
    private vulpes;
    private spinner;
    private subprocess;
    private lastComparison;
    constructor(config?: Partial<AgentConfig>);
    start(): Promise<void>;
    private ensureVulpesified;
    private startClaudeCode;
    private startCodex;
    private startCopilot;
    private startNativeAgent;
    private spawnAgent;
    private buildFullSystemPrompt;
    /**
     * Write system prompt to a temp file to avoid command line length limits
     * Returns the path to the temp file
     */
    private writePromptToFile;
    testDocument(text: string): Promise<RedactionComparison>;
    private printComparison;
    private formatDocument;
    private handleCommand;
    private interactiveRedaction;
    private printSystemInfo;
    private looksLikeDocument;
    private getModeDisplay;
    private getFilterInfo;
    private getHelpText;
    private printBanner;
    private startSpinner;
    private stopSpinner;
}
export declare function handleAgent(options: any): Promise<void>;
export {};
//# sourceMappingURL=Agent.d.ts.map