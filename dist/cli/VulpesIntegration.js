"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VulpesIntegration = exports.CODEX_MCP_CONFIG = exports.CODEX_AGENTS_MD = exports.CLAUDE_SLASH_COMMANDS = exports.CLAUDE_MD_CONTENT = exports.CLAUDE_CODE_HOOKS = void 0;
exports.handleVulpesify = handleVulpesify;
exports.handleIntegrationStatus = handleIntegrationStatus;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const chalk_1 = __importDefault(require("chalk"));
const figures_1 = __importDefault(require("figures"));
const index_1 = require("../index");
// ============================================================================
// THEME
// ============================================================================
const theme = {
    primary: chalk_1.default.hex("#FF6B35"),
    secondary: chalk_1.default.hex("#4ECDC4"),
    accent: chalk_1.default.hex("#FFE66D"),
    success: chalk_1.default.hex("#2ECC71"),
    warning: chalk_1.default.hex("#F39C12"),
    error: chalk_1.default.hex("#E74C3C"),
    info: chalk_1.default.hex("#3498DB"),
    muted: chalk_1.default.hex("#95A5A6"),
};
// ============================================================================
// CLAUDE CODE HOOK DEFINITIONS
// ============================================================================
/**
 * Claude Code hooks configuration for Vulpes integration
 * These hooks intercept tool calls to add PHI redaction capabilities
 */
exports.CLAUDE_CODE_HOOKS = {
    // Intercept user prompts to offer redaction
    UserPromptSubmit: [
        {
            matcher: "*",
            hooks: [
                {
                    type: "command",
                    command: "node -e \"const v=require('vulpes-celare');process.stdin.on('data',async d=>{const j=JSON.parse(d);if(/patient|ssn|mrn|dob|phi/i.test(j.prompt)){console.log(JSON.stringify({systemMessage:'[Vulpes] PHI patterns detected. Use /vulpes-redact to sanitize.'}))}})\"",
                    timeout: 5,
                },
            ],
        },
    ],
    // After file reads, check for PHI
    PostToolUse: [
        {
            matcher: "Read",
            hooks: [
                {
                    type: "command",
                    command: "node -e \"const v=require('vulpes-celare');process.stdin.on('data',async d=>{const j=JSON.parse(d);const r=j.tool_result||'';if(/\\\\b\\\\d{3}-\\\\d{2}-\\\\d{4}\\\\b|\\\\bMRN\\\\b|patient.*name/i.test(r)){console.log(JSON.stringify({additionalContext:'[Vulpes Warning] This file may contain PHI. Consider redacting before sharing.'}))}})\"",
                    timeout: 5,
                },
            ],
        },
    ],
    // Session start - inject Vulpes context
    SessionStart: [
        {
            hooks: [
                {
                    type: "command",
                    command: 'echo \'{"additionalContext":"[Vulpes Celare Active] PHI redaction engine ready. Use /vulpes-redact <text> or /vulpes-info for system status."}\'',
                    timeout: 2,
                },
            ],
        },
    ],
};
// ============================================================================
// CLAUDE.MD CONTENT
// ============================================================================
exports.CLAUDE_MD_CONTENT = `# Vulpes Celare Integration

This project uses **Vulpes Celare** for HIPAA-compliant PHI redaction.

## Quick Commands

\`\`\`bash
# Redact PHI from text
vulpes redact "Patient John Smith SSN 123-45-6789"

# Interactive redaction mode
vulpes interactive

# Run tests
npm test
\`\`\`

## PHI Handling Guidelines

1. **NEVER** commit unredacted PHI to version control
2. **ALWAYS** use Vulpes to sanitize clinical documents before:
   - Sending to external APIs (including this Claude session)
   - Logging or debugging output
   - Sharing with team members
3. Use \`/vulpes-redact\` slash command for quick inline redaction

## Available Tools

When working with this codebase, you have access to:

- **redact_text**: Redact PHI from any text
- **analyze_redaction**: See what PHI would be detected without redacting
- **run_tests**: Execute the Vulpes test suite

## Codebase Structure

\`\`\`
src/
├── filters/          # 28 PHI detection filters
├── core/             # Engine orchestration
├── dictionaries/     # Name/location databases
└── cli/              # Command-line interface

tests/
├── unit/             # Filter unit tests
└── master-suite/     # Integration tests with Cortex
\`\`\`

## Target Metrics

| Metric | Target | Priority |
|--------|--------|----------|
| Sensitivity | ≥99% | CRITICAL - Missing PHI = HIPAA violation |
| Specificity | ≥96% | Important but secondary |

## When Editing Filters

1. Read the existing filter code first
2. Make ONE change at a time
3. Run tests: \`npm run build && npm test\`
4. Check metrics before/after
`;
// ============================================================================
// SLASH COMMANDS FOR CLAUDE CODE
// ============================================================================
exports.CLAUDE_SLASH_COMMANDS = {
    "vulpes-redact": `# Vulpes PHI Redaction

Redact PHI from the provided text using Vulpes Celare.

## Usage
\`/vulpes-redact <text to redact>\`

## Instructions
1. Take the text provided in $ARGUMENTS
2. Use the redact_text tool to process it
3. Show the redacted output with a summary of what was found
4. If no arguments provided, ask the user to paste text

## Example
Input: "Patient John Smith DOB 01/15/1990 SSN 123-45-6789"
Output: "Patient [NAME] DOB [DATE] SSN [SSN]"
`,
    "vulpes-analyze": `# Vulpes PHI Analysis

Analyze text for PHI without redacting - shows what would be detected.

## Usage
\`/vulpes-analyze <text to analyze>\`

## Instructions
1. Take the text from $ARGUMENTS
2. Use the analyze_redaction tool
3. Show a breakdown of detected PHI types and locations
4. Provide confidence scores if available
`,
    "vulpes-info": `# Vulpes System Information

Display current Vulpes Celare configuration and capabilities.

## Instructions
1. Show the current Vulpes version and mode
2. List active filters (28 total)
3. Display target metrics (≥99% sensitivity, ≥96% specificity)
4. Show HIPAA Safe Harbor coverage (17/18 identifiers)
5. Mention the MCP Cortex integration if available
`,
    "vulpes-test": `# Run Vulpes Tests

Execute the Vulpes test suite and report results.

## Usage
\`/vulpes-test [filter-name]\`

## Instructions
1. If $ARGUMENTS contains a filter name, run tests for that filter only
2. Otherwise, run the full test suite
3. Report sensitivity/specificity metrics
4. Highlight any failures or regressions
`,
    "vulpes-interactive": `# Interactive Redaction Mode

Start an interactive session for continuous PHI redaction.

## Instructions
1. Inform the user they're entering interactive mode
2. Accept text input and redact it
3. Show before/after comparison
4. Continue until user types "exit" or "quit"
5. Show session statistics at the end
`,
};
// ============================================================================
// CODEX AGENTS.MD CONTENT
// ============================================================================
exports.CODEX_AGENTS_MD = `# Vulpes Celare - PHI Redaction Agent Instructions

You are working in a codebase that includes **Vulpes Celare**, a HIPAA-compliant PHI redaction engine.

## Critical Rules

1. **PHI Sensitivity First**: Never miss Protected Health Information. Missing PHI = HIPAA violation.
2. **Test After Changes**: Always run \`npm run build && npm test\` after code modifications.
3. **One Change at a Time**: Make incremental changes and validate each one.

## Available Capabilities

### Redaction Tools
- Use \`vulpes redact "<text>"\` to redact PHI from command line
- The engine has 28 specialized filters covering 17/18 HIPAA Safe Harbor identifiers
- Processing time: 2-3ms per document

### Target Metrics
| Metric | Target |
|--------|--------|
| Sensitivity | ≥99% |
| Specificity | ≥96% |

### Key Paths
- Filters: \`src/filters/*.ts\`
- Dictionaries: \`src/dictionaries/\`
- Tests: \`tests/master-suite/run.js\`
- MCP Cortex: \`localhost:3100\` (if running)

## PHI Types Detected

Names, SSN, Dates, Phone/Fax, Email, Addresses, ZIP codes, MRN, NPI,
Health Plan IDs, Account Numbers, License Numbers, Vehicle IDs,
Device IDs, URLs, IP Addresses, Biometrics, Unique Identifiers

## When Working with Clinical Documents

1. Assume any clinical text may contain PHI
2. Redact before logging, sharing, or external API calls
3. Use synthetic data for testing
4. Never commit real PHI to version control

## Quick Commands

\`\`\`bash
# Build the project
npm run build

# Run all tests
npm test

# Interactive redaction
vulpes interactive

# Quick redact
vulpes redact "Patient text here"
\`\`\`
`;
// ============================================================================
// CODEX CONFIG.TOML MCP SECTION
// ============================================================================
exports.CODEX_MCP_CONFIG = `
# Vulpes Celare MCP Server
# Provides PHI redaction tools to Codex

[mcp_servers.vulpes]
command = "node"
args = ["node_modules/vulpes-celare/dist/mcp/server.js"]
env = { VULPES_MODE = "dev" }
startup_timeout_sec = 10
tool_timeout_sec = 60
enabled_tools = ["redact_text", "analyze_redaction", "run_tests", "get_system_info"]
`;
// ============================================================================
// INTEGRATION CLASS
// ============================================================================
class VulpesIntegration {
    constructor(config = {}) {
        this.config = {
            projectDir: config.projectDir || process.cwd(),
            homeDir: config.homeDir || os.homedir(),
            mode: config.mode || "dev",
            autoInstall: config.autoInstall ?? true,
            verbose: config.verbose || false,
            silent: config.silent || false,
        };
    }
    log(message) {
        if (!this.config.silent) {
            console.log(message);
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // STATUS CHECK
    // ══════════════════════════════════════════════════════════════════════════
    async checkStatus() {
        return {
            claudeCode: {
                installed: this.isClaudeCodeInstalled(),
                hooksConfigured: this.areClaudeHooksConfigured(),
                mcpRegistered: this.isClaudeMcpRegistered(),
                claudeMdExists: this.claudeMdExists(),
                slashCommandsInstalled: this.areSlashCommandsInstalled(),
            },
            codex: {
                installed: this.isCodexInstalled(),
                agentsMdExists: this.agentsMdExists(),
                configTomlUpdated: this.isCodexConfigUpdated(),
                mcpRegistered: this.isCodexMcpRegistered(),
            },
        };
    }
    isClaudeCodeInstalled() {
        try {
            const result = require("child_process").execSync("claude --version 2>&1", { encoding: "utf-8" });
            return result.includes("claude");
        }
        catch {
            return false;
        }
    }
    isCodexInstalled() {
        try {
            const result = require("child_process").execSync("codex --version 2>&1", {
                encoding: "utf-8",
            });
            return true;
        }
        catch {
            return false;
        }
    }
    areClaudeHooksConfigured() {
        const settingsPath = path.join(this.config.projectDir, ".claude", "settings.json");
        if (!fs.existsSync(settingsPath))
            return false;
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
            return settings.hooks?.SessionStart || settings.hooks?.UserPromptSubmit;
        }
        catch {
            return false;
        }
    }
    isClaudeMcpRegistered() {
        const globalSettings = path.join(this.config.homeDir, ".claude.json");
        if (!fs.existsSync(globalSettings))
            return false;
        try {
            const settings = JSON.parse(fs.readFileSync(globalSettings, "utf-8"));
            return settings.mcpServers?.vulpes !== undefined;
        }
        catch {
            return false;
        }
    }
    claudeMdExists() {
        return fs.existsSync(path.join(this.config.projectDir, "CLAUDE.md"));
    }
    areSlashCommandsInstalled() {
        const commandsDir = path.join(this.config.projectDir, ".claude", "commands");
        return fs.existsSync(path.join(commandsDir, "vulpes-redact.md"));
    }
    agentsMdExists() {
        return fs.existsSync(path.join(this.config.projectDir, "AGENTS.md"));
    }
    isCodexConfigUpdated() {
        const configPath = path.join(this.config.homeDir, ".codex", "config.toml");
        if (!fs.existsSync(configPath))
            return false;
        try {
            const config = fs.readFileSync(configPath, "utf-8");
            return config.includes("[mcp_servers.vulpes]");
        }
        catch {
            return false;
        }
    }
    isCodexMcpRegistered() {
        return this.isCodexConfigUpdated();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CLAUDE CODE INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════
    async installClaudeCodeIntegration() {
        console.log(theme.info.bold("\n  Installing Claude Code Integration...\n"));
        // 1. Create .claude directory
        const claudeDir = path.join(this.config.projectDir, ".claude");
        if (!fs.existsSync(claudeDir)) {
            fs.mkdirSync(claudeDir, { recursive: true });
            console.log(theme.success(`  ${figures_1.default.tick} Created .claude/ directory`));
        }
        // 2. Install hooks in settings.json
        await this.installClaudeHooks();
        // 3. Create CLAUDE.md
        await this.createClaudeMd();
        // 4. Install slash commands
        await this.installSlashCommands();
        // 5. Register MCP server
        await this.registerClaudeMcp();
        console.log(theme.success.bold("\n  Claude Code integration complete!\n"));
    }
    async installClaudeHooks() {
        const settingsPath = path.join(this.config.projectDir, ".claude", "settings.json");
        let settings = {};
        if (fs.existsSync(settingsPath)) {
            try {
                settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
            }
            catch {
                settings = {};
            }
        }
        // Merge Vulpes hooks with existing hooks
        settings.hooks = settings.hooks || {};
        // Add SessionStart hook
        settings.hooks.SessionStart = settings.hooks.SessionStart || [];
        const vulpesSessionHook = {
            hooks: [
                {
                    type: "command",
                    command: `node -e "console.log(JSON.stringify({additionalContext:'[Vulpes Celare v${index_1.VERSION}] PHI redaction ready. Commands: /vulpes-redact, /vulpes-analyze, /vulpes-info'}))"`,
                    timeout: 2,
                },
            ],
        };
        // Check if already installed
        const hasVulpesSession = settings.hooks.SessionStart.some((h) => h.hooks?.[0]?.command?.includes("Vulpes"));
        if (!hasVulpesSession) {
            settings.hooks.SessionStart.push(vulpesSessionHook);
        }
        // Add allowed tools
        settings.allowedTools = settings.allowedTools || [];
        const vulpesTools = [
            "mcp__vulpes__redact_text",
            "mcp__vulpes__analyze_redaction",
            "mcp__vulpes__run_tests",
            "mcp__vulpes__get_system_info",
        ];
        for (const tool of vulpesTools) {
            if (!settings.allowedTools.includes(tool)) {
                settings.allowedTools.push(tool);
            }
        }
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        console.log(theme.success(`  ${figures_1.default.tick} Installed Claude Code hooks`));
    }
    async createClaudeMd() {
        const claudeMdPath = path.join(this.config.projectDir, "CLAUDE.md");
        if (fs.existsSync(claudeMdPath)) {
            // Append Vulpes section if not already present
            const existing = fs.readFileSync(claudeMdPath, "utf-8");
            if (!existing.includes("Vulpes Celare")) {
                fs.appendFileSync(claudeMdPath, "\n\n" + exports.CLAUDE_MD_CONTENT);
                console.log(theme.success(`  ${figures_1.default.tick} Appended Vulpes section to CLAUDE.md`));
            }
            else {
                console.log(theme.muted(`  ${figures_1.default.info} CLAUDE.md already has Vulpes section`));
            }
        }
        else {
            fs.writeFileSync(claudeMdPath, exports.CLAUDE_MD_CONTENT);
            console.log(theme.success(`  ${figures_1.default.tick} Created CLAUDE.md`));
        }
    }
    async installSlashCommands() {
        const commandsDir = path.join(this.config.projectDir, ".claude", "commands");
        if (!fs.existsSync(commandsDir)) {
            fs.mkdirSync(commandsDir, { recursive: true });
        }
        for (const [name, content] of Object.entries(exports.CLAUDE_SLASH_COMMANDS)) {
            const cmdPath = path.join(commandsDir, `${name}.md`);
            fs.writeFileSync(cmdPath, content);
        }
        console.log(theme.success(`  ${figures_1.default.tick} Installed ${Object.keys(exports.CLAUDE_SLASH_COMMANDS).length} slash commands`));
    }
    async registerClaudeMcp() {
        const globalSettingsPath = path.join(this.config.homeDir, ".claude.json");
        let settings = {};
        if (fs.existsSync(globalSettingsPath)) {
            try {
                settings = JSON.parse(fs.readFileSync(globalSettingsPath, "utf-8"));
            }
            catch {
                settings = {};
            }
        }
        settings.mcpServers = settings.mcpServers || {};
        settings.mcpServers.vulpes = {
            command: "node",
            args: [path.join(this.config.projectDir, "dist", "mcp", "server.js")],
            env: {
                VULPES_MODE: this.config.mode,
                VULPES_PROJECT_DIR: this.config.projectDir,
            },
        };
        fs.writeFileSync(globalSettingsPath, JSON.stringify(settings, null, 2));
        console.log(theme.success(`  ${figures_1.default.tick} Registered Vulpes MCP server`));
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CODEX INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════
    async installCodexIntegration() {
        console.log(theme.info.bold("\n  Installing Codex Integration...\n"));
        // 1. Create AGENTS.md
        await this.createAgentsMd();
        // 2. Update config.toml with MCP server
        await this.updateCodexConfig();
        console.log(theme.success.bold("\n  Codex integration complete!\n"));
    }
    async createAgentsMd() {
        const agentsMdPath = path.join(this.config.projectDir, "AGENTS.md");
        if (fs.existsSync(agentsMdPath)) {
            const existing = fs.readFileSync(agentsMdPath, "utf-8");
            if (!existing.includes("Vulpes Celare")) {
                fs.appendFileSync(agentsMdPath, "\n\n" + exports.CODEX_AGENTS_MD);
                console.log(theme.success(`  ${figures_1.default.tick} Appended Vulpes section to AGENTS.md`));
            }
            else {
                console.log(theme.muted(`  ${figures_1.default.info} AGENTS.md already has Vulpes section`));
            }
        }
        else {
            fs.writeFileSync(agentsMdPath, exports.CODEX_AGENTS_MD);
            console.log(theme.success(`  ${figures_1.default.tick} Created AGENTS.md`));
        }
    }
    async updateCodexConfig() {
        const codexDir = path.join(this.config.homeDir, ".codex");
        if (!fs.existsSync(codexDir)) {
            fs.mkdirSync(codexDir, { recursive: true });
        }
        const configPath = path.join(codexDir, "config.toml");
        let config = "";
        if (fs.existsSync(configPath)) {
            config = fs.readFileSync(configPath, "utf-8");
        }
        if (!config.includes("[mcp_servers.vulpes]")) {
            // Append Vulpes MCP configuration
            const vulpesConfig = `
# ============================================================================
# VULPES CELARE MCP SERVER
# ============================================================================
# Provides HIPAA-compliant PHI redaction tools

[mcp_servers.vulpes]
command = "node"
args = ["${path.join(this.config.projectDir, "dist", "mcp", "server.js").replace(/\\/g, "/")}"]
env = { VULPES_MODE = "${this.config.mode}", VULPES_PROJECT_DIR = "${this.config.projectDir.replace(/\\/g, "/")}" }
startup_timeout_sec = 10
tool_timeout_sec = 60
`;
            config += vulpesConfig;
            fs.writeFileSync(configPath, config);
            console.log(theme.success(`  ${figures_1.default.tick} Added Vulpes MCP to config.toml`));
        }
        else {
            console.log(theme.muted(`  ${figures_1.default.info} config.toml already has Vulpes MCP`));
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // FULL VULPESIFICATION
    // ══════════════════════════════════════════════════════════════════════════
    async vulpesify() {
        // Silent mode - just do the work without output
        if (this.config.silent) {
            await this.silentVulpesify();
            return;
        }
        console.log(theme.primary.bold(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗██╗███████╗██╗   ██╗  ║
║   ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝██║██╔════╝╚██╗ ██╔╝  ║
║   ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗██║█████╗   ╚████╔╝   ║
║   ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║██║██╔══╝    ╚██╔╝    ║
║    ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║██║██║        ██║     ║
║     ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝╚═╝╚═╝        ╚═╝     ║
║                                                                           ║
║                    Deep CLI Integration System                            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`));
        const status = await this.checkStatus();
        console.log(theme.info.bold("  Current Integration Status:\n"));
        // Claude Code Status
        console.log(theme.secondary("  Claude Code:"));
        console.log(`    ${status.claudeCode.installed ? theme.success(figures_1.default.tick) : theme.error(figures_1.default.cross)} CLI Installed`);
        console.log(`    ${status.claudeCode.hooksConfigured ? theme.success(figures_1.default.tick) : theme.warning(figures_1.default.circle)} Hooks Configured`);
        console.log(`    ${status.claudeCode.mcpRegistered ? theme.success(figures_1.default.tick) : theme.warning(figures_1.default.circle)} MCP Registered`);
        console.log(`    ${status.claudeCode.claudeMdExists ? theme.success(figures_1.default.tick) : theme.warning(figures_1.default.circle)} CLAUDE.md Exists`);
        console.log(`    ${status.claudeCode.slashCommandsInstalled ? theme.success(figures_1.default.tick) : theme.warning(figures_1.default.circle)} Slash Commands`);
        console.log();
        // Codex Status
        console.log(theme.secondary("  Codex:"));
        console.log(`    ${status.codex.installed ? theme.success(figures_1.default.tick) : theme.error(figures_1.default.cross)} CLI Installed`);
        console.log(`    ${status.codex.agentsMdExists ? theme.success(figures_1.default.tick) : theme.warning(figures_1.default.circle)} AGENTS.md Exists`);
        console.log(`    ${status.codex.configTomlUpdated ? theme.success(figures_1.default.tick) : theme.warning(figures_1.default.circle)} config.toml Updated`);
        console.log(`    ${status.codex.mcpRegistered ? theme.success(figures_1.default.tick) : theme.warning(figures_1.default.circle)} MCP Registered`);
        console.log(theme.muted("\n  " + "─".repeat(60) + "\n"));
        // Install integrations
        if (status.claudeCode.installed) {
            await this.installClaudeCodeIntegration();
        }
        else {
            console.log(theme.warning("  Claude Code not found. Skipping Claude integration."));
            console.log(theme.muted("  Install with: npm install -g @anthropic-ai/claude-code\n"));
        }
        if (status.codex.installed) {
            await this.installCodexIntegration();
        }
        else {
            console.log(theme.warning("  Codex not found. Skipping Codex integration."));
            console.log(theme.muted("  Install with: npm install -g @openai/codex\n"));
        }
        // Create MCP server
        await this.createMcpServer();
        console.log(theme.success.bold(`
  ═══════════════════════════════════════════════════════════════════════════

    ${figures_1.default.tick} VULPESIFICATION COMPLETE!

    Your CLI agents now have access to:

    ${theme.secondary("Claude Code:")}
      • /vulpes-redact   - Redact PHI from text
      • /vulpes-analyze  - Analyze text for PHI
      • /vulpes-info     - Show system info
      • /vulpes-test     - Run test suite
      • Session hooks    - Auto-inject Vulpes context

    ${theme.secondary("Codex:")}
      • AGENTS.md        - Vulpes instructions loaded
      • MCP Tools        - redact_text, analyze_redaction, etc.

    ${theme.secondary("Both:")}
      • MCP Server       - Vulpes tools available as MCP provider
      • System prompts   - Full Vulpes knowledge injected

  ═══════════════════════════════════════════════════════════════════════════
`));
    }
    /**
     * Silent vulpesification - runs all integrations without console output
     * Used for auto-vulpesify on startup
     */
    async silentVulpesify() {
        const status = await this.checkStatus();
        // Silently install Claude Code integration
        if (status.claudeCode.installed) {
            try {
                await this.installClaudeCodeIntegrationSilent();
            }
            catch {
                // Ignore errors in silent mode
            }
        }
        // Silently install Codex integration
        if (status.codex.installed) {
            try {
                await this.installCodexIntegrationSilent();
            }
            catch {
                // Ignore errors in silent mode
            }
        }
        // Create MCP server silently
        try {
            await this.createMcpServer();
        }
        catch {
            // Ignore errors in silent mode
        }
    }
    /**
     * Silent Claude Code integration
     */
    async installClaudeCodeIntegrationSilent() {
        // Create CLAUDE.md
        const claudeMdPath = path.join(this.config.projectDir, "CLAUDE.md");
        if (!fs.existsSync(claudeMdPath)) {
            fs.writeFileSync(claudeMdPath, exports.CLAUDE_MD_CONTENT);
        }
        else {
            const existing = fs.readFileSync(claudeMdPath, "utf-8");
            if (!existing.includes("Vulpes Celare")) {
                fs.appendFileSync(claudeMdPath, "\n\n" + exports.CLAUDE_MD_CONTENT);
            }
        }
        // Install slash commands
        const claudeDir = path.join(this.config.projectDir, ".claude", "commands");
        if (!fs.existsSync(claudeDir)) {
            fs.mkdirSync(claudeDir, { recursive: true });
        }
        for (const [name, content] of Object.entries(exports.CLAUDE_SLASH_COMMANDS)) {
            const cmdPath = path.join(claudeDir, `${name}.md`);
            if (!fs.existsSync(cmdPath)) {
                fs.writeFileSync(cmdPath, content);
            }
        }
        // Register MCP server
        await this.registerClaudeCodeMcpSilent();
    }
    /**
     * Silent MCP registration for Claude Code
     */
    async registerClaudeCodeMcpSilent() {
        const claudeConfigPath = path.join(this.config.homeDir, ".claude.json");
        let claudeConfig = {};
        if (fs.existsSync(claudeConfigPath)) {
            try {
                claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, "utf-8"));
            }
            catch {
                claudeConfig = {};
            }
        }
        if (!claudeConfig.mcpServers) {
            claudeConfig.mcpServers = {};
        }
        if (!claudeConfig.mcpServers.vulpes) {
            claudeConfig.mcpServers.vulpes = {
                command: "node",
                args: [path.join(this.config.projectDir, "dist", "mcp", "server.js")],
                env: {
                    VULPES_MODE: this.config.mode,
                    VULPES_PROJECT_DIR: this.config.projectDir,
                },
            };
            fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
        }
    }
    /**
     * Silent Codex integration
     */
    async installCodexIntegrationSilent() {
        // Create AGENTS.md
        const agentsMdPath = path.join(this.config.projectDir, "AGENTS.md");
        if (!fs.existsSync(agentsMdPath)) {
            fs.writeFileSync(agentsMdPath, exports.CODEX_AGENTS_MD);
        }
        // Update Codex config.toml
        const codexDir = path.join(this.config.homeDir, ".codex");
        if (!fs.existsSync(codexDir)) {
            fs.mkdirSync(codexDir, { recursive: true });
        }
        const configPath = path.join(codexDir, "config.toml");
        let config = "";
        if (fs.existsSync(configPath)) {
            config = fs.readFileSync(configPath, "utf-8");
        }
        if (!config.includes("[mcp_servers.vulpes]")) {
            const vulpesConfig = `
[mcp_servers.vulpes]
command = "node"
args = ["${path.join(this.config.projectDir, "dist", "mcp", "server.js").replace(/\\/g, "/")}"]
env = { VULPES_MODE = "${this.config.mode}", VULPES_PROJECT_DIR = "${this.config.projectDir.replace(/\\/g, "/")}" }
`;
            config += vulpesConfig;
            fs.writeFileSync(configPath, config);
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // MCP SERVER CREATION
    // ══════════════════════════════════════════════════════════════════════════
    async createMcpServer() {
        const mcpDir = path.join(this.config.projectDir, "dist", "mcp");
        if (!fs.existsSync(mcpDir)) {
            fs.mkdirSync(mcpDir, { recursive: true });
        }
        const serverCode = `#!/usr/bin/env node
/**
 * Vulpes Celare MCP Server
 * Provides PHI redaction tools to Claude Code, Codex, and other MCP clients
 */

const { VulpesCelare } = require('../VulpesCelare');
const readline = require('readline');

const vulpes = new VulpesCelare();

// Tool definitions
const TOOLS = {
  redact_text: {
    name: "redact_text",
    description: "Redact PHI (Protected Health Information) from text using Vulpes Celare. Returns the redacted text and statistics.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to redact PHI from" }
      },
      required: ["text"]
    }
  },
  analyze_redaction: {
    name: "analyze_redaction",
    description: "Analyze text for PHI without redacting. Shows what would be detected with confidence scores.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to analyze" }
      },
      required: ["text"]
    }
  },
  get_system_info: {
    name: "get_system_info",
    description: "Get Vulpes Celare system information including version, active filters, and target metrics.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  run_tests: {
    name: "run_tests",
    description: "Run the Vulpes test suite and return results.",
    inputSchema: {
      type: "object",
      properties: {
        quick: { type: "boolean", description: "Run quick test subset" }
      }
    }
  }
};

// Handle MCP protocol
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

async function handleRequest(request) {
  const { method, params, id } = request;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "vulpes-celare", version: "${index_1.VERSION}" },
          capabilities: { tools: {} }
        }
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: Object.values(TOOLS) }
      };

    case "tools/call":
      const { name, arguments: args } = params;
      let result;

      switch (name) {
        case "redact_text":
          const redactionResult = await vulpes.process(args.text);
          result = {
            redactedText: redactionResult.text,
            redactionCount: redactionResult.redactionCount,
            executionTimeMs: redactionResult.executionTimeMs,
            breakdown: redactionResult.breakdown
          };
          break;

        case "analyze_redaction":
          const analysisResult = await vulpes.process(args.text);
          result = {
            original: args.text,
            redacted: analysisResult.text,
            phiCount: analysisResult.redactionCount,
            breakdown: analysisResult.breakdown,
            executionTimeMs: analysisResult.executionTimeMs
          };
          break;

        case "get_system_info":
          result = {
            engine: "Vulpes Celare",
            version: "${index_1.VERSION}",
            activeFilters: vulpes.getActiveFilters().length,
            targetMetrics: {
              sensitivity: "≥99%",
              specificity: "≥96%"
            },
            hipaaCompliance: "17/18 Safe Harbor identifiers",
            processingSpeed: "2-3ms per document"
          };
          break;

        case "run_tests":
          result = { message: "Test execution not available via MCP. Run: npm test" };
          break;

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: "Unknown tool: " + name }
          };
      }

      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
      };

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found: " + method }
      };
  }
}

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);
    console.log(JSON.stringify(response));
  } catch (e) {
    console.log(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32700, message: "Parse error: " + e.message }
    }));
  }
});

// Handle notifications (no response needed)
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
`;
        fs.writeFileSync(path.join(mcpDir, "server.js"), serverCode);
        console.log(theme.success(`  ${figures_1.default.tick} Created MCP server at dist/mcp/server.js`));
    }
}
exports.VulpesIntegration = VulpesIntegration;
// ============================================================================
// CLI HANDLER
// ============================================================================
async function handleVulpesify(options) {
    const integration = new VulpesIntegration({
        projectDir: process.cwd(),
        mode: options.mode || "dev",
        verbose: options.verbose,
        silent: options.silent || false,
    });
    await integration.vulpesify();
}
async function handleIntegrationStatus(options) {
    const integration = new VulpesIntegration({
        projectDir: process.cwd(),
    });
    const status = await integration.checkStatus();
    console.log(JSON.stringify(status, null, 2));
}
//# sourceMappingURL=VulpesIntegration.js.map