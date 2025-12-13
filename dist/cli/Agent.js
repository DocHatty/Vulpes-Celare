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
const chalk_1 = __importDefault(require("chalk"));
const SecurityUtils_1 = require("../utils/SecurityUtils");
const ora_1 = __importDefault(require("ora"));
const boxen_1 = __importDefault(require("boxen"));
const figures_1 = __importDefault(require("figures"));
const VulpesCelare_1 = require("../VulpesCelare");
const index_1 = require("../index");
const SystemPrompts_1 = require("./SystemPrompts");
const VulpesIntegration_1 = require("./VulpesIntegration");
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
    agent: chalk_1.default.hex("#8B5CF6"),
    original: chalk_1.default.hex("#EF4444"),
    redacted: chalk_1.default.hex("#22C55E"),
    code: chalk_1.default.hex("#60A5FA"),
};
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
console.log(result.text); // Patient [NAME] SSN [SSN]
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
`;
// ============================================================================
// AGENT CLASS
// ============================================================================
class VulpesAgent {
    config;
    vulpes;
    spinner = null;
    subprocess = null;
    lastComparison = null;
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
        this.vulpes = new VulpesCelare_1.VulpesCelare();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // MAIN ENTRY POINT
    // ══════════════════════════════════════════════════════════════════════════
    async start() {
        // Banner is now printed by launcher, don't duplicate
        // this.printBanner();
        // Auto-vulpesify if enabled
        if (this.config.autoVulpesify) {
            await this.ensureVulpesified();
        }
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
        const status = await integration.checkStatus();
        // Check if we need to install integrations
        const needsClaudeSetup = this.config.backend === "claude" &&
            (!status.claudeCode.claudeMdExists ||
                !status.claudeCode.slashCommandsInstalled);
        const needsCodexSetup = this.config.backend === "codex" && !status.codex.agentsMdExists;
        if (needsClaudeSetup || needsCodexSetup) {
            console.log(theme.info("\n  Setting up Vulpes integration...\n"));
            if (needsClaudeSetup) {
                await integration.installClaudeCodeIntegration();
            }
            if (needsCodexSetup) {
                await integration.installCodexIntegration();
            }
            console.log(theme.success("  Integration ready!\n"));
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CLAUDE CODE - FULL INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════
    async startClaudeCode() {
        const args = [];
        // Model selection
        if (this.config.model) {
            args.push("--model", this.config.model);
        }
        // DEEP INTEGRATION: Use short append-system-prompt (CLAUDE.md has full context)
        // Note: --system-prompt-file only works in print mode, not interactive
        args.push("--append-system-prompt", "You are VULPESIFIED. This project uses Vulpes Celare for HIPAA PHI redaction. See CLAUDE.md for full capabilities. Commands: /vulpes-redact, /vulpes-analyze, /vulpes-info");
        // DEEP INTEGRATION: Set environment for hooks
        const env = {
            ...process.env,
            VULPES_AGENT_MODE: this.config.mode,
            VULPES_WORKING_DIR: this.config.workingDir,
            VULPES_VERSION: index_1.VERSION,
            // Git bash for Windows
            CLAUDE_CODE_GIT_BASH_PATH: process.env.CLAUDE_CODE_GIT_BASH_PATH ||
                "C:\\Program Files\\Git\\bin\\bash.exe",
        };
        console.log(theme.info(`\n  Starting Claude Code with Vulpes integration...\n`));
        console.log(theme.muted(`  ${figures_1.default.tick} Vulpes context injected`));
        console.log(theme.muted(`  ${figures_1.default.tick} CLAUDE.md provides full context`));
        console.log(theme.muted(`  ${figures_1.default.tick} Slash commands: /vulpes-redact, /vulpes-analyze, /vulpes-info\n`));
        await this.spawnAgent("claude", args, env);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CODEX - FULL INTEGRATION
    // ══════════════════════════════════════════════════════════════════════════
    async startCodex() {
        const args = [];
        // Model selection
        args.push("--model", this.config.model || "o3");
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
            VULPES_VERSION: index_1.VERSION,
        };
        console.log(theme.info(`\n  Starting Codex with Vulpes integration...\n`));
        console.log(theme.muted(`  ${figures_1.default.tick} AGENTS.md loaded with Vulpes instructions`));
        console.log(theme.muted(`  ${figures_1.default.tick} Model: ${this.config.model || "o3"}`));
        console.log(theme.muted(`  ${figures_1.default.tick} MCP server: vulpes (if configured)\n`));
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
            console.log(theme.error("\n  GitHub Copilot CLI is not installed.\n"));
            console.log(theme.info("  To install (same pattern as Claude & Codex):"));
            console.log(theme.muted("  ─".repeat(28)));
            console.log();
            console.log(theme.accent("    npm install -g @github/copilot"));
            console.log();
            console.log(theme.muted("  ─".repeat(28)));
            console.log(theme.info("\n  Then authenticate on first run:"));
            console.log(theme.muted("  ─".repeat(28)));
            console.log();
            console.log(theme.accent("    copilot"));
            console.log(theme.muted("    # Type: /login"));
            console.log();
            console.log(theme.muted("  ─".repeat(28)));
            console.log(theme.muted("\n  Requires an active GitHub Copilot subscription."));
            console.log(theme.muted("  (Copilot Pro, Pro+, Business, or Enterprise)\n"));
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
            VULPES_VERSION: index_1.VERSION,
        };
        console.log(theme.info(`\n  Starting GitHub Copilot CLI with Vulpes integration...\n`));
        console.log(theme.muted(`  ${figures_1.default.tick} Copilot CLI detected`));
        console.log(theme.muted(`  ${figures_1.default.tick} Vulpes context available`));
        console.log(theme.muted(`  ${figures_1.default.tick} Use 'vulpes' CLI for PHI redaction`));
        console.log(theme.muted(`  ${figures_1.default.tick} Type /login if not authenticated\n`));
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
        console.log(theme.muted("\n  Native Vulpes Agent - No external CLI required\n"));
        console.log(theme.muted("  Commands:"));
        console.log(theme.muted("    .test <text>     Test redaction"));
        console.log(theme.muted("    .file <path>     Redact a file"));
        console.log(theme.muted("    .interactive     Enter interactive mode"));
        console.log(theme.muted("    .info            System information"));
        console.log(theme.muted("    .filters         List active filters"));
        console.log(theme.muted("    .help            Show all commands"));
        console.log(theme.muted("    .exit            Exit\n"));
        const prompt = () => {
            rl.question(theme.primary("vulpes") + theme.muted(" > "), async (input) => {
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
        // SECURITY FIX: Spawn without shell to prevent command injection
        // The command and args are passed separately, not interpolated into a shell string
        const spawnOptions = {
            cwd: this.config.workingDir,
            stdio: "inherit",
            shell: false, // SECURITY: Disable shell to prevent injection
            env,
            // On Windows, we need to find the actual executable
            ...(process.platform === "win32" && {
                // Windows needs shell:true for .cmd/.bat scripts from npm
                // But we validate the command is a known safe value
                shell: ["claude", "codex", "copilot"].includes(cmd),
            }),
        };
        // Spawn with command and args array (no shell interpolation)
        this.subprocess = (0, child_process_1.spawn)(cmd, args, spawnOptions);
        this.subprocess.on("error", (err) => {
            console.error(theme.error(`\n  Failed to start ${cmd}: ${err.message}`));
            console.log(theme.muted(`  Make sure ${cmd} is installed and in your PATH\n`));
            if (cmd === "claude") {
                console.log(theme.muted("  Install: npm install -g @anthropic-ai/claude-code"));
            }
            else if (cmd === "codex") {
                console.log(theme.muted("  Install: npm install -g @openai/codex"));
            }
            else if (cmd === "copilot") {
                console.log(theme.muted("  Install: npm install -g @githubnext/github-copilot-cli"));
                console.log(theme.muted("  Or use: gh extension install github/gh-copilot"));
            }
            process.exit(1);
        });
        this.subprocess.on("exit", (code) => {
            console.log(theme.muted(`\n  ${cmd} exited with code ${code}`));
            process.exit(code || 0);
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
        console.log("\n" + theme.muted("═".repeat(70)));
        if (this.config.mode !== "production") {
            console.log(theme.original.bold(" ORIGINAL:"));
            console.log(theme.muted("─".repeat(70)));
            console.log(this.formatDocument(original, "original"));
            console.log();
        }
        console.log(theme.redacted.bold(" REDACTED:"));
        console.log(theme.muted("─".repeat(70)));
        console.log(this.formatDocument(redacted, "redacted"));
        console.log();
        console.log(theme.info.bold(" STATS:"));
        console.log(theme.muted("─".repeat(70)));
        console.log(`  ${theme.muted("Time:")} ${result.executionTimeMs}ms`);
        console.log(`  ${theme.muted("PHI Found:")} ${result.redactionCount}`);
        if (Object.keys(result.breakdown).length > 0) {
            console.log(`  ${theme.muted("Breakdown:")}`);
            for (const [type, count] of Object.entries(result.breakdown).sort((a, b) => b[1] - a[1])) {
                console.log(`    ${theme.code(type)}: ${count}`);
            }
        }
        console.log(theme.muted("═".repeat(70)) + "\n");
    }
    formatDocument(text, type) {
        const lines = text.split("\n");
        const maxWidth = 68;
        return lines
            .map((line) => {
            if (type === "redacted") {
                line = line.replace(/\{\{[^}]+\}\}/g, (match) => theme.warning(match));
                line = line.replace(/\[[A-Z_-]+\]/g, (match) => theme.warning(match));
            }
            if (line.length > maxWidth) {
                return "  " + line.substring(0, maxWidth - 3) + "...";
            }
            return "  " + line;
        })
            .join("\n");
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
                console.log(theme.info("\n  Goodbye!\n"));
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
                    console.log(theme.warning("  Usage: .test <text to redact>"));
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
                        console.log(theme.error(`  File not found: ${filePath}`));
                    }
                }
                else {
                    console.log(theme.warning("  Usage: .file <path>"));
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
                console.log(this.getFilterInfo());
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
                console.log(this.getHelpText());
                break;
            default:
                console.log(theme.warning(`  Unknown command: .${cmd}`));
                console.log(theme.muted("  Type .help for available commands"));
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // INTERACTIVE REDACTION
    // ══════════════════════════════════════════════════════════════════════════
    async interactiveRedaction(rl) {
        console.log(theme.info.bold("\n  INTERACTIVE REDACTION MODE"));
        console.log(theme.muted("  Type text to redact. Empty line to finish.\n"));
        let sessionStats = { documents: 0, phiFound: 0, totalTime: 0 };
        let buffer = "";
        const processBuffer = async () => {
            if (buffer.trim()) {
                const result = await this.vulpes.process(buffer);
                console.log(theme.redacted("\n  → ") + result.text);
                console.log(theme.muted(`    (${result.redactionCount} PHI, ${result.executionTimeMs}ms)\n`));
                sessionStats.documents++;
                sessionStats.phiFound += result.redactionCount;
                sessionStats.totalTime += result.executionTimeMs;
            }
            buffer = "";
        };
        const interactivePrompt = () => {
            rl.question(theme.accent("  > "), async (line) => {
                if (line === "") {
                    await processBuffer();
                    console.log(theme.info(`\n  Session: ${sessionStats.documents} docs, ${sessionStats.phiFound} PHI, ${sessionStats.totalTime}ms total\n`));
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
        console.log();
        console.log(theme.info.bold("  VULPES CELARE SYSTEM INFO"));
        console.log(theme.muted("  " + "─".repeat(50)));
        console.log(`  ${theme.muted("Engine:")}     ${index_1.ENGINE_NAME}`);
        console.log(`  ${theme.muted("Version:")}    ${index_1.VERSION}`);
        console.log(`  ${theme.muted("Mode:")}       ${this.getModeDisplay()}`);
        console.log(`  ${theme.muted("Backend:")}    ${this.config.backend}`);
        console.log(`  ${theme.muted("Filters:")}    ${filters.length} active`);
        console.log(`  ${theme.muted("HIPAA:")}      17/18 Safe Harbor identifiers`);
        console.log();
        console.log(theme.muted("  Target Metrics:"));
        console.log(`    ${theme.success("Sensitivity:")} ≥99% (CRITICAL)`);
        console.log(`    ${theme.info("Specificity:")} ≥96%`);
        console.log(`    ${theme.secondary("Speed:")}       2-3ms per document`);
        if (this.lastComparison) {
            console.log();
            console.log(theme.muted("  Last Test:"));
            console.log(`    ${this.lastComparison.result.redactionCount} PHI in ${this.lastComparison.result.executionTimeMs}ms`);
        }
        console.log();
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
                return theme.warning("DEVELOPMENT (full access)");
            case "qa":
                return theme.info("QA (read-only)");
            case "production":
                return theme.success("PRODUCTION (redacted only)");
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
        let output = "\n" + theme.info.bold("  ACTIVE FILTERS") + "\n";
        output += theme.muted("  " + "─".repeat(50)) + "\n";
        for (const [category, catFilters] of Object.entries(categories)) {
            if (catFilters.length > 0) {
                output += `  ${theme.primary(category)}:\n`;
                for (const f of catFilters) {
                    output += `    ${theme.success(figures_1.default.tick)} ${f.replace("FilterSpan", "")}\n`;
                }
            }
        }
        output += theme.muted("  " + "─".repeat(50)) + "\n";
        output += `  ${theme.muted("Total:")} ${filters.length} filters\n`;
        return output;
    }
    getHelpText() {
        return `
${theme.info.bold("  VULPES AGENT COMMANDS")}
${theme.muted("  " + "─".repeat(50))}
  ${theme.secondary(".test <text>")}      Redact PHI from text
  ${theme.secondary(".file <path>")}      Redact PHI from a file
  ${theme.secondary(".interactive")}      Enter interactive redaction mode
  ${theme.secondary(".info")}             Show system information
  ${theme.secondary(".filters")}          List all active filters
  ${theme.secondary(".vulpesify")}        Install full CLI integrations
  ${theme.secondary(".help")}             Show this help
  ${theme.secondary(".exit")}             Exit

${theme.muted("  Or just paste text to redact it!")}
`;
    }
    printBanner() {
        const modeColor = this.config.mode === "dev"
            ? "yellow"
            : this.config.mode === "qa"
                ? "cyan"
                : "green";
        console.log((0, boxen_1.default)(`${theme.primary.bold("VULPES AGENT")}\n` +
            `${theme.muted(index_1.ENGINE_NAME + " v" + index_1.VERSION)}\n\n` +
            `${theme.muted("Mode:")} ${this.getModeDisplay()}\n` +
            `${theme.muted("Backend:")} ${theme.secondary(this.config.backend)}\n\n` +
            (this.config.mode === "dev"
                ? `${theme.warning(figures_1.default.warning)} ${theme.warning("Full codebase access enabled")}\n` +
                    `${theme.warning(figures_1.default.warning)} ${theme.warning("Only use with synthetic/test data")}`
                : this.config.mode === "qa"
                    ? `${theme.info(figures_1.default.info)} Can compare original vs redacted\n` +
                        `${theme.info(figures_1.default.info)} Read-only codebase access`
                    : `${theme.success(figures_1.default.tick)} Production mode - original text hidden\n` +
                        `${theme.success(figures_1.default.tick)} Safe for real patient data`), {
            padding: 1,
            margin: { top: 1, bottom: 0 },
            borderStyle: "round",
            borderColor: modeColor,
            title: "VULPESIFIED AI AGENT",
            titleAlignment: "center",
        }));
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