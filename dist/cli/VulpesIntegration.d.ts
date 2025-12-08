/**
 * ============================================================================
 * VULPES CELARE - DEEP CLI INTEGRATION SYSTEM
 * ============================================================================
 *
 * VULPESIFIED Integration Layer - "Bear Hug" wrapper for Claude Code & Codex
 *
 * This module provides deep integration with:
 *
 * CLAUDE CODE:
 * - Hooks (PreToolUse, PostToolUse, UserPromptSubmit, Stop, SessionStart, etc.)
 * - MCP Server (Vulpes as a tool provider)
 * - CLAUDE.md injection
 * - Slash commands (.claude/commands/)
 * - Settings integration (.claude/settings.json)
 *
 * CODEX:
 * - AGENTS.md injection
 * - config.toml MCP server registration
 * - Custom tool integration
 * - Approval policy integration
 *
 * SHARED:
 * - Interactive redaction capability
 * - Quick redact command
 * - System info command
 * - Vulpes system knowledge injection
 */
export interface IntegrationConfig {
    projectDir: string;
    homeDir: string;
    mode: "dev" | "qa" | "production";
    autoInstall: boolean;
    verbose: boolean;
    silent: boolean;
}
export interface IntegrationStatus {
    claudeCode: {
        installed: boolean;
        hooksConfigured: boolean;
        mcpRegistered: boolean;
        claudeMdExists: boolean;
        slashCommandsInstalled: boolean;
    };
    codex: {
        installed: boolean;
        agentsMdExists: boolean;
        configTomlUpdated: boolean;
        mcpRegistered: boolean;
    };
}
/**
 * Claude Code hooks configuration for Vulpes integration
 * These hooks intercept tool calls to add PHI redaction capabilities
 */
export declare const CLAUDE_CODE_HOOKS: {
    UserPromptSubmit: {
        matcher: string;
        hooks: {
            type: string;
            command: string;
            timeout: number;
        }[];
    }[];
    PostToolUse: {
        matcher: string;
        hooks: {
            type: string;
            command: string;
            timeout: number;
        }[];
    }[];
    SessionStart: {
        hooks: {
            type: string;
            command: string;
            timeout: number;
        }[];
    }[];
};
export declare const CLAUDE_MD_CONTENT = "# Vulpes Celare Integration\n\nThis project uses **Vulpes Celare** for HIPAA-compliant PHI redaction.\n\n## Quick Commands\n\n```bash\n# Redact PHI from text\nvulpes redact \"Patient John Smith SSN 123-45-6789\"\n\n# Interactive redaction mode\nvulpes interactive\n\n# Run tests\nnpm test\n```\n\n## PHI Handling Guidelines\n\n1. **NEVER** commit unredacted PHI to version control\n2. **ALWAYS** use Vulpes to sanitize clinical documents before:\n   - Sending to external APIs (including this Claude session)\n   - Logging or debugging output\n   - Sharing with team members\n3. Use `/vulpes-redact` slash command for quick inline redaction\n\n## Available Tools\n\nWhen working with this codebase, you have access to:\n\n- **redact_text**: Redact PHI from any text\n- **analyze_redaction**: See what PHI would be detected without redacting\n- **run_tests**: Execute the Vulpes test suite\n\n## Codebase Structure\n\n```\nsrc/\n\u251C\u2500\u2500 filters/          # 28 PHI detection filters\n\u251C\u2500\u2500 core/             # Engine orchestration\n\u251C\u2500\u2500 dictionaries/     # Name/location databases\n\u2514\u2500\u2500 cli/              # Command-line interface\n\ntests/\n\u251C\u2500\u2500 unit/             # Filter unit tests\n\u2514\u2500\u2500 master-suite/     # Integration tests with Cortex\n```\n\n## Target Metrics\n\n| Metric | Target | Priority |\n|--------|--------|----------|\n| Sensitivity | \u226599% | CRITICAL - Missing PHI = HIPAA violation |\n| Specificity | \u226596% | Important but secondary |\n\n## When Editing Filters\n\n1. Read the existing filter code first\n2. Make ONE change at a time\n3. Run tests: `npm run build && npm test`\n4. Check metrics before/after\n";
export declare const CLAUDE_SLASH_COMMANDS: {
    "vulpes-redact": string;
    "vulpes-analyze": string;
    "vulpes-info": string;
    "vulpes-test": string;
    "vulpes-interactive": string;
};
export declare const CODEX_AGENTS_MD = "# Vulpes Celare - PHI Redaction Agent Instructions\n\nYou are working in a codebase that includes **Vulpes Celare**, a HIPAA-compliant PHI redaction engine.\n\n## Critical Rules\n\n1. **PHI Sensitivity First**: Never miss Protected Health Information. Missing PHI = HIPAA violation.\n2. **Test After Changes**: Always run `npm run build && npm test` after code modifications.\n3. **One Change at a Time**: Make incremental changes and validate each one.\n\n## Available Capabilities\n\n### Redaction Tools\n- Use `vulpes redact \"<text>\"` to redact PHI from command line\n- The engine has 28 specialized filters covering 17/18 HIPAA Safe Harbor identifiers\n- Processing time: 2-3ms per document\n\n### Target Metrics\n| Metric | Target |\n|--------|--------|\n| Sensitivity | \u226599% |\n| Specificity | \u226596% |\n\n### Key Paths\n- Filters: `src/filters/*.ts`\n- Dictionaries: `src/dictionaries/`\n- Tests: `tests/master-suite/run.js`\n- MCP Cortex: `localhost:3100` (if running)\n\n## PHI Types Detected\n\nNames, SSN, Dates, Phone/Fax, Email, Addresses, ZIP codes, MRN, NPI,\nHealth Plan IDs, Account Numbers, License Numbers, Vehicle IDs,\nDevice IDs, URLs, IP Addresses, Biometrics, Unique Identifiers\n\n## When Working with Clinical Documents\n\n1. Assume any clinical text may contain PHI\n2. Redact before logging, sharing, or external API calls\n3. Use synthetic data for testing\n4. Never commit real PHI to version control\n\n## Quick Commands\n\n```bash\n# Build the project\nnpm run build\n\n# Run all tests\nnpm test\n\n# Interactive redaction\nvulpes interactive\n\n# Quick redact\nvulpes redact \"Patient text here\"\n```\n";
export declare const CODEX_MCP_CONFIG = "\n# Vulpes Celare MCP Server\n# Provides PHI redaction tools to Codex\n\n[mcp_servers.vulpes]\ncommand = \"node\"\nargs = [\"node_modules/vulpes-celare/dist/mcp/server.js\"]\nenv = { VULPES_MODE = \"dev\" }\nstartup_timeout_sec = 10\ntool_timeout_sec = 60\nenabled_tools = [\"redact_text\", \"analyze_redaction\", \"run_tests\", \"get_system_info\"]\n";
export declare class VulpesIntegration {
    private config;
    constructor(config?: Partial<IntegrationConfig>);
    private log;
    checkStatus(): Promise<IntegrationStatus>;
    private isClaudeCodeInstalled;
    private isCodexInstalled;
    private areClaudeHooksConfigured;
    private isClaudeMcpRegistered;
    private claudeMdExists;
    private areSlashCommandsInstalled;
    private agentsMdExists;
    private isCodexConfigUpdated;
    private isCodexMcpRegistered;
    installClaudeCodeIntegration(): Promise<void>;
    private installClaudeHooks;
    private createClaudeMd;
    private installSlashCommands;
    private registerClaudeMcp;
    installCodexIntegration(): Promise<void>;
    private createAgentsMd;
    private updateCodexConfig;
    vulpesify(): Promise<void>;
    /**
     * Silent vulpesification - runs all integrations without console output
     * Used for auto-vulpesify on startup
     */
    private silentVulpesify;
    /**
     * Silent Claude Code integration
     */
    private installClaudeCodeIntegrationSilent;
    /**
     * Silent MCP registration for Claude Code
     */
    private registerClaudeCodeMcpSilent;
    /**
     * Silent Codex integration
     */
    private installCodexIntegrationSilent;
    private createMcpServer;
}
export declare function handleVulpesify(options: any): Promise<void>;
export declare function handleIntegrationStatus(options: any): Promise<void>;
//# sourceMappingURL=VulpesIntegration.d.ts.map