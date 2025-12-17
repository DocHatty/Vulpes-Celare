"use strict";
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
exports.VulpesAgent = void 0;
exports.handleAgent = handleAgent;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const readline = __importStar(require("readline"));
const child_process_1 = require("child_process");
const SecurityUtils_1 = require("../utils/SecurityUtils");
const ora_1 = __importDefault(require("ora"));
const figures_1 = __importDefault(require("figures"));
const VulpesCelare_1 = require("../VulpesCelare");
const meta_1 = require("../meta");
const Logger_1 = require("../utils/Logger");
const SystemPrompts_1 = require("./SystemPrompts");
const child_process_2 = require("child_process");
const VulpesIntegration_1 = require("./VulpesIntegration");
// Import unified theme system
const theme_1 = require("../theme");
const output_1 = require("../theme/output");
const VulpesOutput_1 = require("../utils/VulpesOutput");
// Theme imported from unified theme system (../theme)
// ============================================================================
// ENHANCED SYSTEM PROMPT FOR WRAPPED AGENTS
// ============================================================================
const VULPES_INJECTION_PROMPT = `
═══════════════════════════════════════════════════════════════════════════════
                         VULPES CELARE INTEGRATION
═══════════════════════════════════════════════════════════════════════════════

You are running inside the Vulpes Celare environment - a HIPAA-compliant PHI
redaction engine. You have special capabilities and responsibilities.

## AVAILABLE VULPES COMMANDS

These work in your current session:

| Command | Description |
|---------|-------------|
| \`vulpes redact "<text>"\` | Redact PHI from text |
| \`vulpes analyze "<text>"\` | Analyze text for PHI without redacting |
| \`vulpes info\` | Show system info and active filters |
| \`vulpes test\` | Run the test suite |
| \`vulpes interactive\` | Enter interactive redaction mode |

## MCP TOOLS (if MCP server is running)

- \`redact_text\` - Redact PHI from any text
- \`analyze_redaction\` - Show what PHI would be detected
- \`get_system_info\` - Get Vulpes configuration
- \`run_tests\` - Execute test suite

## CRITICAL RULES

1. **SENSITIVITY FIRST**: Never miss PHI. Target ≥99% sensitivity.
2. **TEST AFTER CHANGES**: Always run \`npm run build && npm test\`
3. **ONE CHANGE AT A TIME**: Make incremental changes, validate each
4. **PHI AWARENESS**: Assume clinical documents contain PHI

## CODEBASE PATHS

| What | Path |
|------|------|
| Filters | src/filters/*.ts |
| Dictionaries | src/dictionaries/ |
| Engine | src/VulpesCelare.ts |
| Tests | tests/master-suite/ |
| MCP Cortex | localhost:3100 |

## PHI TYPES DETECTED (28 filters, 17/18 HIPAA Safe Harbor)

Names, SSN, Dates, Phone, Fax, Email, Address, ZIP, MRN, NPI,
Health Plan IDs, Account Numbers, License Numbers, DEA Numbers,
Vehicle IDs, Device IDs, URLs, IP Addresses, Biometrics, Passport Numbers

## QUICK TEST

To test redaction right now, run:
\`\`\`bash
echo "Patient John Smith SSN 123-45-6789" | vulpes redact -
\`\`\`

Or in Node:
\`\`\`javascript
const { VulpesCelare } = require('vulpes-celare');
const v = new VulpesCelare();
const result = await v.process("Patient John Smith SSN 123-45-6789");
out.print(result.text); // Patient [NAME] SSN [SSN]
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
`;
// ============================================================================
// AGENT CLASS
// ============================================================================
class VulpesAgent {
    config;
    _vulpes = null;
    spinner = null;
    subprocess = null;
    lastComparison = null;
    // Lazy getter for VulpesCelare - only instantiate when actually needed
    get vulpes() {
        if (!this._vulpes) {
            this._vulpes = new VulpesCelare_1.VulpesCelare();
        }
        return this._vulpes;
    }
    constructor(config = {}) {
        this.config = {
            mode: config.mode || "dev",
            backend: config.backend || "claude",
            model: config.model,
            apiKey: config.apiKey,
            workingDir: config.workingDir || process.cwd(),
            allowEdits: config.mode === "dev",
            allowTests: config.mode !== "production",
            verbose: config.verbose || false,
            autoVulpesify: config.autoVulpesify ?? true,
        };
        if (!config.verbose) {
            process.env.VULPES_QUIET = "1";
        }
        // VulpesCelare is now lazy - not created until first use
    }
    // ══════════════════════════════════════════════════════════════════════════
    // MAIN ENTRY POINT
    // ══════════════════════════════════════════════════════════════════════════
    async start() {
        Logger_1.logger.info("VulpesAgent.start()", {
            backend: this.config.backend,
            mode: this.config.mode,
            workingDir: this.config.workingDir,
            autoVulpesify: this.config.autoVulpesify,
        });
        // Banner is now printed by launcher, don't duplicate
        // this.printBanner();
        // Auto-vulpesify if enabled
        if (this.config.autoVulpesify) {
            Logger_1.logger.debug("Running ensureVulpesified");
            await this.ensureVulpesified();
        }
        // MANAGED UPDATE CHECK
        // Update checking inside the child process causes crashes on Windows.
        // We check here, update if needed (in a detached way), then launch.
        if (this.config.backend === "codex") {
            await this.managePackageUpdate("@openai/codex");
        }
        else if (this.config.backend === "claude") {
            await this.managePackageUpdate("@anthropic-ai/claude-code");
        }
        else if (this.config.backend === "copilot") {
            // Copilot CLI is often updated via gh extension, less standard npm
            // skipping for now or handle specifically if needed
        }
        Logger_1.logger.info(`Starting backend: ${this.config.backend}`);
        switch (this.config.backend) {
            case "claude":
                await this.startClaudeCode();
                break;
            case "codex":
                await this.startCodex();
                break;
            case "copilot":
                await this.startCopilot();
                break;
            case "native":
            default:
                await this.startNativeAgent();
                break;
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // ENSURE VULPESIFICATION
    // ══════════════════════════════════════════════════════════════════════════
    async ensureVulpesified() {
        const integration = new VulpesIntegration_1.VulpesIntegration({
            projectDir: this.config.workingDir,
            mode: this.config.mode,
            verbose: this.config.verbose,
        });
        // Fast path: just check if files exist, skip slow CLI version checks
        const claudeMdExists = require("fs").existsSync(require("path").join(this.config.workingDir, "CLAUDE.md"));
        const slashCommandsExist = require("fs").existsSync(require("path").join(this.config.workingDir, ".claude", "commands", "vulpes-redact.md"));
        const agentsMdExists = require("fs").existsSync(require("path").join(this.config.workingDir, "AGENTS.md"));
        // Also check if MCP is already registered
        const mcpSettingsPath = require("path").join(this.config.workingDir, ".claude", "settings.json");
        let mcpRegistered = false;
        if (require("fs").existsSync(mcpSettingsPath)) {
            try {
                const settings = JSON.parse(require("fs").readFileSync(mcpSettingsPath, "utf-8"));
                mcpRegistered = settings.mcpServers?.vulpes !== undefined;
            }
            catch {
                // Ignore parse errors
            }
        }
        // Check if we need to install integrations
        const needsClaudeSetup = this.config.backend === "claude" &&
            (!claudeMdExists || !slashCommandsExist || !mcpRegistered);
        const needsCodexSetup = this.config.backend === "codex" && !agentsMdExists;
        if (needsClaudeSetup || needsCodexSetup) {
            VulpesOutput_1.out.print("\n  " + output_1.Status.info("Setting up Vulpes integration...") + "\n");
            if (needsClaudeSetup) {
                await integration.installClaudeCodeIntegration();
            }
            if (needsCodexSetup) {
                await integration.installCodexIntegration();
            }
            VulpesOutput_1.out.print("  " + output_1.Status.success("Integration ready!") + "\n");
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CLAUDE CODE - FULL INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════
    async startClaudeCode() {
        Logger_1.logger.info("startClaudeCode called");
        const args = [];
        // Model selection
        if (this.config.model) {
            args.push("--model", this.config.model);
            Logger_1.logger.debug("Using model", { model: this.config.model });
        }
        // CLAUDE.md already provides full Vulpes context, so we skip --append-system-prompt
        // This also avoids Windows shell quoting issues when shell:true is used
        // DEEP INTEGRATION: Set environment for hooks
        const env = {
            ...process.env,
            VULPES_AGENT_MODE: this.config.mode,
            VULPES_WORKING_DIR: this.config.workingDir,
            VULPES_VERSION: meta_1.VERSION,
            // Git bash for Windows
            CLAUDE_CODE_GIT_BASH_PATH: process.env.CLAUDE_CODE_GIT_BASH_PATH ||
                "C:\\Program Files\\Git\\bin\\bash.exe",
            // Suppress internal update notifiers to prevent crash
            NO_UPDATE_NOTIFIER: "1",
            CI: "true",
        };
        Logger_1.logger.debug("Claude Code environment", {
            VULPES_AGENT_MODE: env.VULPES_AGENT_MODE,
            VULPES_WORKING_DIR: env.VULPES_WORKING_DIR,
            args: args,
        });
        VulpesOutput_1.out.print("\n  " + output_1.Status.info("Starting Claude Code with Vulpes integration...") + "\n");
        VulpesOutput_1.out.print(output_1.Status.bullet("Vulpes context injected", { indent: 1 }));
        VulpesOutput_1.out.print(output_1.Status.bullet("CLAUDE.md provides full context", { indent: 1 }));
        VulpesOutput_1.out.print(output_1.Status.bullet("Slash commands: /vulpes-redact, /vulpes-analyze, /vulpes-info", { indent: 1 }) + "\n");
        await this.spawnAgent("claude", args, env);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CODEX - FULL INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════
    async startCodex() {
        const args = [];
        // Model selection
        args.push("--model", this.config.model || "gpt-5.2");
        // DEEP INTEGRATION: Codex reads AGENTS.md automatically
        // We ensure it exists in ensureVulpesified()
        // DEEP INTEGRATION: Enable full auto mode for dev
        if (this.config.mode === "dev") {
            // Allow workspace writes
            args.push("--sandbox", "workspace-write");
        }
        // Environment variables for Codex
        const env = {
            ...process.env,
            VULPES_AGENT_MODE: this.config.mode,
            VULPES_WORKING_DIR: this.config.workingDir,
            VULPES_VERSION: meta_1.VERSION,
            // Suppress internal update notifiers to prevent crash
            NO_UPDATE_NOTIFIER: "1",
            CI: "true",
        };
        VulpesOutput_1.out.print("\n  " + output_1.Status.info("Starting Codex with Vulpes integration...") + "\n");
        VulpesOutput_1.out.print(output_1.Status.bullet("AGENTS.md loaded with Vulpes instructions", { indent: 1 }));
        VulpesOutput_1.out.print(output_1.Status.bullet(`Model: ${this.config.model || "gpt-5.2"}`, { indent: 1 }));
        VulpesOutput_1.out.print(output_1.Status.bullet("MCP server: vulpes (if configured)", { indent: 1 }) + "\n");
        await this.spawnAgent("codex", args, env);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // COPILOT - INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Check if GitHub Copilot CLI is installed
     * The new @github/copilot package provides the 'copilot' command
     */
    isCopilotInstalled() {
        try {
            (0, SecurityUtils_1.safeExecSync)("copilot", ["--version"], {
                timeout: 5000,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async startCopilot() {
        // Check if copilot CLI is installed
        if (!this.isCopilotInstalled()) {
            VulpesOutput_1.out.print("\n" + output_1.Box.error([
                "GitHub Copilot CLI is not installed.",
                "",
                "To install (same pattern as Claude & Codex):",
                "",
                theme_1.theme.accent("  npm install -g @github/copilot"),
                "",
                "Then authenticate on first run:",
                "",
                theme_1.theme.accent("  copilot"),
                theme_1.theme.muted("  # Type: /login"),
                "",
                theme_1.theme.muted("Requires an active GitHub Copilot subscription."),
                theme_1.theme.muted("(Copilot Pro, Pro+, Business, or Enterprise)"),
            ], { title: "Not Installed" }) + "\n");
            process.exit(1);
        }
        const args = [];
        // Model selection - Copilot CLI defaults to Claude Sonnet 4.5
        // Use /model command inside to switch models
        if (this.config.model) {
            args.push("--model", this.config.model);
        }
        const env = {
            ...process.env,
            VULPES_AGENT_MODE: this.config.mode,
            VULPES_WORKING_DIR: this.config.workingDir,
            VULPES_VERSION: meta_1.VERSION,
            // Suppress internal update notifiers to prevent crash
            NO_UPDATE_NOTIFIER: "1",
            CI: "true",
        };
        VulpesOutput_1.out.print("\n  " + output_1.Status.info("Starting GitHub Copilot CLI with Vulpes integration...") + "\n");
        VulpesOutput_1.out.print(output_1.Status.bullet("Copilot CLI detected", { indent: 1 }));
        VulpesOutput_1.out.print(output_1.Status.bullet("Vulpes context available", { indent: 1 }));
        VulpesOutput_1.out.print(output_1.Status.bullet("Use 'vulpes' CLI for PHI redaction", { indent: 1 }));
        VulpesOutput_1.out.print(output_1.Status.bullet("Type /login if not authenticated", { indent: 1 }) + "\n");
        await this.spawnAgent("copilot", args, env);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // NATIVE AGENT - BUILT-IN REPL
    // ══════════════════════════════════════════════════════════════════════════
    async startNativeAgent() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        VulpesOutput_1.out.print(theme_1.theme.muted("\n  Native Vulpes Agent - No external CLI required\n"));
        VulpesOutput_1.out.print(theme_1.theme.muted("  Commands:"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    .test <text>     Test redaction"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    .file <path>     Redact a file"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    .interactive     Enter interactive mode"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    .info            System information"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    .filters         List active filters"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    .help            Show all commands"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    .exit            Exit\n"));
        const prompt = () => {
            rl.question(theme_1.theme.primary("vulpes") + theme_1.theme.muted(" > "), async (input) => {
                input = input.trim();
                if (!input) {
                    prompt();
                    return;
                }
                if (input.startsWith(".")) {
                    await this.handleCommand(input, rl);
                }
                else if (this.looksLikeDocument(input)) {
                    await this.testDocument(input);
                }
                else {
                    // Treat as text to redact
                    await this.testDocument(input);
                }
                prompt();
            });
        };
        prompt();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // SPAWN EXTERNAL AGENT
    // ══════════════════════════════════════════════════════════════════════════
    async spawnAgent(cmd, args, env) {
        // On Windows, npm-installed CLI tools are .cmd/.bat scripts that need shell
        const needsShell = process.platform === "win32" &&
            ["claude", "codex", "copilot"].includes(cmd);
        const spawnOptions = {
            cwd: this.config.workingDir,
            stdio: "inherit",
            env,
            shell: needsShell,
        };
        Logger_1.logger.info(`Spawning agent: ${cmd}`, {
            cmd,
            args,
            cwd: this.config.workingDir,
            needsShell,
            platform: process.platform,
        });
        this.subprocess = (0, child_process_1.spawn)(cmd, args, spawnOptions);
        Logger_1.logger.debug(`Subprocess spawned`, { pid: this.subprocess.pid });
        this.subprocess.on("error", (err) => {
            Logger_1.logger.error(`Failed to spawn ${cmd}`, {
                error: err.message,
                code: err.code,
                path: err.path,
            });
            VulpesOutput_1.out.print(theme_1.theme.error(`\n  Failed to start ${cmd}: ${err.message}`));
            VulpesOutput_1.out.print(theme_1.theme.muted(`  Make sure ${cmd} is installed and in your PATH\n`));
            VulpesOutput_1.out.print(theme_1.theme.muted(`  Log file: ${Logger_1.logger.getLogFilePath()}\n`));
            if (cmd === "claude") {
                VulpesOutput_1.out.print(theme_1.theme.muted("  Install: npm install -g @anthropic-ai/claude-code"));
            }
            else if (cmd === "codex") {
                VulpesOutput_1.out.print(theme_1.theme.muted("  Install: npm install -g @openai/codex"));
            }
            else if (cmd === "copilot") {
                VulpesOutput_1.out.print(theme_1.theme.muted("  Install: npm install -g @githubnext/github-copilot-cli"));
                VulpesOutput_1.out.print(theme_1.theme.muted("  Or use: gh extension install github/gh-copilot"));
            }
            process.exit(1);
        });
        this.subprocess.on("exit", (code, signal) => {
            Logger_1.logger.info(`Agent ${cmd} exited`, { code, signal });
            VulpesOutput_1.out.print(theme_1.theme.muted(`\n  ${cmd} exited with code ${code}`));
            process.exit(code || 0);
        });
        // Log any unexpected close
        this.subprocess.on("close", (code, signal) => {
            if (code !== 0) {
                Logger_1.logger.warn(`Agent ${cmd} closed unexpectedly`, { code, signal });
            }
        });
    }
    // ══════════════════════════════════════════════════════════════════════════
    // BUILD SYSTEM PROMPT
    // ══════════════════════════════════════════════════════════════════════════
    buildFullSystemPrompt() {
        // Get the comprehensive system prompt from SystemPrompts.ts
        const basePrompt = (0, SystemPrompts_1.getSystemPrompt)(this.config.mode);
        // Add the Vulpes injection prompt with quick reference
        return `${basePrompt}\n\n${VULPES_INJECTION_PROMPT}`;
    }
    /**
     * Write system prompt to a temp file to avoid command line length limits
     * Returns the path to the temp file
     */
    writePromptToFile() {
        const promptContent = this.buildFullSystemPrompt();
        const promptFile = path.join(os.tmpdir(), `vulpes-prompt-${Date.now()}.md`);
        fs.writeFileSync(promptFile, promptContent, "utf-8");
        return promptFile;
    }
    // ══════════════════════════════════════════════════════════════════════════
    // DOCUMENT TESTING
    // ══════════════════════════════════════════════════════════════════════════
    async testDocument(text) {
        this.startSpinner("Running redaction...");
        const result = await this.vulpes.process(text);
        this.stopSpinner();
        const comparison = {
            original: text,
            redacted: result.text,
            result,
            issues: [],
        };
        this.lastComparison = comparison;
        this.printComparison(comparison);
        return comparison;
    }
    printComparison(comparison) {
        const { original, redacted, result } = comparison;
        VulpesOutput_1.out.print("\n" + theme_1.theme.muted("═".repeat(70)));
        if (this.config.mode !== "production") {
            VulpesOutput_1.out.print(theme_1.theme.original.bold(" ORIGINAL:"));
            VulpesOutput_1.out.print(theme_1.theme.muted("─".repeat(70)));
            VulpesOutput_1.out.print(this.formatDocument(original, "original"));
            VulpesOutput_1.out.blank();
        }
        VulpesOutput_1.out.print(theme_1.theme.redacted.bold(" REDACTED:"));
        VulpesOutput_1.out.print(theme_1.theme.muted("─".repeat(70)));
        VulpesOutput_1.out.print(this.formatDocument(redacted, "redacted"));
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(theme_1.theme.info.bold(" STATS:"));
        VulpesOutput_1.out.print(theme_1.theme.muted("─".repeat(70)));
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Time:")} ${result.executionTimeMs}ms`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("PHI Found:")} ${result.redactionCount}`);
        if (Object.keys(result.breakdown).length > 0) {
            VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Breakdown:")}`);
            for (const [type, count] of Object.entries(result.breakdown).sort((a, b) => b[1] - a[1])) {
                VulpesOutput_1.out.print(`    ${theme_1.theme.code(type)}: ${count}`);
            }
        }
        VulpesOutput_1.out.print(theme_1.theme.muted("═".repeat(70)) + "\n");
    }
    formatDocument(text, type) {
        const lines = text.split("\n");
        const maxWidth = 68;
        return lines
            .map((line) => {
            if (type === "redacted") {
                line = line.replace(/\{\{[^}]+\}\}/g, (match) => theme_1.theme.warning(match));
                line = line.replace(/\[[A-Z_-]+\]/g, (match) => theme_1.theme.warning(match));
            }
            if (line.length > maxWidth) {
                return "  " + line.substring(0, maxWidth - 3) + "...";
            }
            return "  " + line;
        })
            .join("\n");
    }
    // ══════════════════════════════════════════════════════════════════════════
    // SAFE UPDATE MANAGEMENT
    // ══════════════════════════════════════════════════════════════════════════
    async managePackageUpdate(packageName) {
        try {
            const currentVersion = this.getInstalledVersion(packageName);
            if (!currentVersion)
                return; // Not installed, let normal flow handle or error
            const latestVersion = this.getLatestVersion(packageName);
            if (!latestVersion)
                return;
            if (currentVersion !== latestVersion) {
                VulpesOutput_1.out.print(theme_1.theme.info(`\n  Update available for ${packageName}: ${theme_1.theme.muted(currentVersion)} → ${theme_1.theme.success(latestVersion)}`));
                // In interactive mode, we could ask. For now, we auto-update if strictly needed or just notify 
                // effectively without crashing. The user complaint was "shuts system down".
                // Providing a safe way to update:
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                const answer = await new Promise(resolve => {
                    rl.question(theme_1.theme.accent(`  Do you want to update now? (y/N) `), resolve);
                });
                rl.close();
                if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                    VulpesOutput_1.out.print(theme_1.theme.muted(`  Updating ${packageName}...`));
                    try {
                        // Use synchronous exec to ensure it finishes before we move on
                        (0, child_process_2.execSync)(`npm install -g ${packageName}`, { stdio: 'inherit' });
                        VulpesOutput_1.out.print(theme_1.theme.success(`  Update complete! Starting agent...\n`));
                    }
                    catch (e) {
                        VulpesOutput_1.out.print(theme_1.theme.error(`  Update failed: ${e.message}`));
                        VulpesOutput_1.out.print(theme_1.theme.muted(`  Continuing with current version...\n`));
                    }
                }
                else {
                    VulpesOutput_1.out.print(theme_1.theme.muted(`  Skipping update. Starting agent...\n`));
                }
            }
        }
        catch (e) {
            // Ignore update check errors, just proceed
            Logger_1.logger.warn(`Update check failed for ${packageName}`, { error: e });
        }
    }
    getInstalledVersion(packageName) {
        try {
            // npm list -g --depth=0 --json usually works but can be slow. 
            // Faster check might be specific package info
            const output = (0, child_process_2.execSync)(`npm list -g ${packageName} --depth=0 --json`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
            const json = JSON.parse(output);
            return json.dependencies?.[packageName]?.version || null;
        }
        catch {
            return null;
        }
    }
    getLatestVersion(packageName) {
        try {
            const output = (0, child_process_2.execSync)(`npm view ${packageName} version`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
            return output.trim();
        }
        catch {
            return null;
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // COMMANDS
    // ══════════════════════════════════════════════════════════════════════════
    async handleCommand(input, rl) {
        const [cmd, ...args] = input.slice(1).split(" ");
        switch (cmd.toLowerCase()) {
            case "exit":
            case "quit":
            case "q":
                VulpesOutput_1.out.print("\n  " + output_1.Status.info("Goodbye!") + "\n");
                rl.close();
                process.exit(0);
                break;
            case "test":
            case "t":
            case "redact":
                if (args.length > 0) {
                    await this.testDocument(args.join(" "));
                }
                else {
                    VulpesOutput_1.out.print("  " + output_1.Status.warning("Usage: .test <text to redact>"));
                }
                break;
            case "file":
            case "f":
                if (args.length > 0) {
                    const filePath = args.join(" ");
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, "utf-8");
                        await this.testDocument(content);
                    }
                    else {
                        VulpesOutput_1.out.print("  " + output_1.Status.error(`File not found: ${filePath}`));
                    }
                }
                else {
                    VulpesOutput_1.out.print("  " + output_1.Status.warning("Usage: .file <path>"));
                }
                break;
            case "interactive":
            case "i":
                await this.interactiveRedaction(rl);
                break;
            case "info":
            case "status":
                await this.printSystemInfo();
                break;
            case "filters":
                VulpesOutput_1.out.print(this.getFilterInfo());
                break;
            case "vulpesify":
                const integration = new VulpesIntegration_1.VulpesIntegration({
                    projectDir: this.config.workingDir,
                    mode: this.config.mode,
                });
                await integration.vulpesify();
                break;
            case "help":
            case "h":
            case "?":
                VulpesOutput_1.out.print(this.getHelpText());
                break;
            default:
                VulpesOutput_1.out.print("  " + output_1.Status.warning(`Unknown command: .${cmd}`));
                VulpesOutput_1.out.print(theme_1.theme.muted("  Type .help for available commands"));
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // INTERACTIVE REDACTION
    // ══════════════════════════════════════════════════════════════════════════
    async interactiveRedaction(rl) {
        VulpesOutput_1.out.print(theme_1.theme.info.bold("\n  INTERACTIVE REDACTION MODE"));
        VulpesOutput_1.out.print(theme_1.theme.muted("  Type text to redact. Empty line to finish.\n"));
        let sessionStats = { documents: 0, phiFound: 0, totalTime: 0 };
        let buffer = "";
        const processBuffer = async () => {
            if (buffer.trim()) {
                const result = await this.vulpes.process(buffer);
                VulpesOutput_1.out.print(theme_1.theme.redacted("\n  → ") + result.text);
                VulpesOutput_1.out.print(theme_1.theme.muted(`    (${result.redactionCount} PHI, ${result.executionTimeMs}ms)\n`));
                sessionStats.documents++;
                sessionStats.phiFound += result.redactionCount;
                sessionStats.totalTime += result.executionTimeMs;
            }
            buffer = "";
        };
        const interactivePrompt = () => {
            rl.question(theme_1.theme.accent("  > "), async (line) => {
                if (line === "") {
                    await processBuffer();
                    VulpesOutput_1.out.print(theme_1.theme.info(`\n  Session: ${sessionStats.documents} docs, ${sessionStats.phiFound} PHI, ${sessionStats.totalTime}ms total\n`));
                    return; // Exit interactive mode
                }
                buffer += line + "\n";
                // Auto-process on single line (no continuation)
                if (!line.endsWith("\\")) {
                    await processBuffer();
                }
                interactivePrompt();
            });
        };
        interactivePrompt();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // SYSTEM INFO
    // ══════════════════════════════════════════════════════════════════════════
    async printSystemInfo() {
        const filters = this.vulpes.getActiveFilters();
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(theme_1.theme.info.bold("  VULPES CELARE SYSTEM INFO"));
        VulpesOutput_1.out.print(theme_1.theme.muted("  " + "─".repeat(50)));
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Engine:")}     ${meta_1.ENGINE_NAME}`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Version:")}    ${meta_1.VERSION}`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Mode:")}       ${this.getModeDisplay()}`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Backend:")}    ${this.config.backend}`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Filters:")}    ${filters.length} active`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("HIPAA:")}      17/18 Safe Harbor identifiers`);
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(theme_1.theme.muted("  Target Metrics:"));
        VulpesOutput_1.out.print(`    ${theme_1.theme.success("Sensitivity:")} ≥99% (CRITICAL)`);
        VulpesOutput_1.out.print(`    ${theme_1.theme.info("Specificity:")} ≥96%`);
        VulpesOutput_1.out.print(`    ${theme_1.theme.secondary("Speed:")}       2-3ms per document`);
        if (this.lastComparison) {
            VulpesOutput_1.out.blank();
            VulpesOutput_1.out.print(theme_1.theme.muted("  Last Test:"));
            VulpesOutput_1.out.print(`    ${this.lastComparison.result.redactionCount} PHI in ${this.lastComparison.result.executionTimeMs}ms`);
        }
        VulpesOutput_1.out.blank();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════════
    looksLikeDocument(text) {
        const patterns = [
            /patient/i,
            /\b\d{3}-\d{2}-\d{4}\b/,
            /\b\d{3}[-.)]\s?\d{3}[-.)]\s?\d{4}\b/,
            /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/,
            /DOB|MRN|NPI|SSN/i,
            /diagnosis|treatment|medication/i,
        ];
        return patterns.some((p) => p.test(text)) || text.includes("\n");
    }
    getModeDisplay() {
        switch (this.config.mode) {
            case "dev":
                return theme_1.theme.warning("DEVELOPMENT (full access)");
            case "qa":
                return theme_1.theme.info("QA (read-only)");
            case "production":
                return theme_1.theme.success("PRODUCTION (redacted only)");
        }
    }
    getFilterInfo() {
        const filters = this.vulpes.getActiveFilters();
        const categories = {
            Identity: filters.filter((f) => f.includes("Name")),
            Government: filters.filter((f) => /SSN|Passport|License|DEA/.test(f)),
            Contact: filters.filter((f) => /Phone|Fax|Email|Address|Zip/.test(f)),
            Medical: filters.filter((f) => /MRN|NPI|Health|Age|Date/.test(f)),
            Financial: filters.filter((f) => /Credit|Account/.test(f)),
            Technical: filters.filter((f) => /IP|URL|Device|Vehicle|Biometric|Unique/.test(f)),
        };
        let output = "\n" + theme_1.theme.info.bold("  ACTIVE FILTERS") + "\n";
        output += theme_1.theme.muted("  " + "─".repeat(50)) + "\n";
        for (const [category, catFilters] of Object.entries(categories)) {
            if (catFilters.length > 0) {
                output += `  ${theme_1.theme.primary(category)}:\n`;
                for (const f of catFilters) {
                    output += `    ${theme_1.theme.success(figures_1.default.tick)} ${f.replace("FilterSpan", "")}\n`;
                }
            }
        }
        output += theme_1.theme.muted("  " + "─".repeat(50)) + "\n";
        output += `  ${theme_1.theme.muted("Total:")} ${filters.length} filters\n`;
        return output;
    }
    getHelpText() {
        return `
${theme_1.theme.info.bold("  VULPES AGENT COMMANDS")}
${theme_1.theme.muted("  " + "─".repeat(50))}
  ${theme_1.theme.secondary(".test <text>")}      Redact PHI from text
  ${theme_1.theme.secondary(".file <path>")}      Redact PHI from a file
  ${theme_1.theme.secondary(".interactive")}      Enter interactive redaction mode
  ${theme_1.theme.secondary(".info")}             Show system information
  ${theme_1.theme.secondary(".filters")}          List all active filters
  ${theme_1.theme.secondary(".vulpesify")}        Install full CLI integrations
  ${theme_1.theme.secondary(".help")}             Show this help
  ${theme_1.theme.secondary(".exit")}             Exit

${theme_1.theme.muted("  Or just paste text to redact it!")}
`;
    }
    printBanner() {
        const content = [
            theme_1.theme.primary.bold("VULPES AGENT"),
            theme_1.theme.muted(meta_1.ENGINE_NAME + " v" + meta_1.VERSION),
            "",
            `${theme_1.theme.muted("Mode:")} ${this.getModeDisplay()}`,
            `${theme_1.theme.muted("Backend:")} ${theme_1.theme.secondary(this.config.backend)}`,
            "",
        ];
        if (this.config.mode === "dev") {
            content.push(output_1.Status.warning("Full codebase access enabled"));
            content.push(output_1.Status.warning("Only use with synthetic/test data"));
        }
        else if (this.config.mode === "qa") {
            content.push(output_1.Status.info("Can compare original vs redacted"));
            content.push(output_1.Status.info("Read-only codebase access"));
        }
        else {
            content.push(output_1.Status.success("Production mode - original text hidden"));
            content.push(output_1.Status.success("Safe for real patient data"));
        }
        const boxType = this.config.mode === "dev" ? output_1.Box.warning
            : this.config.mode === "qa" ? output_1.Box.info
                : output_1.Box.success;
        VulpesOutput_1.out.print("\n" + boxType(content, { title: "VULPESIFIED AI AGENT" }));
    }
    // ══════════════════════════════════════════════════════════════════════════
    // SPINNER
    // ══════════════════════════════════════════════════════════════════════════
    startSpinner(text) {
        this.spinner = (0, ora_1.default)({
            text,
            spinner: "dots12",
            color: "yellow",
        }).start();
    }
    stopSpinner() {
        if (this.spinner) {
            this.spinner.stop();
            this.spinner = null;
        }
    }
}
exports.VulpesAgent = VulpesAgent;
// ============================================================================
// CLI HANDLER
// ============================================================================
async function handleAgent(options) {
    const config = {
        mode: options.mode || "dev",
        backend: options.backend || "claude",
        model: options.model,
        apiKey: options.apiKey,
        workingDir: process.cwd(),
        verbose: options.verbose,
        autoVulpesify: options.vulpesify ?? true,
    };
    const agent = new VulpesAgent(config);
    await agent.start();
}
//# sourceMappingURL=Agent.js.map