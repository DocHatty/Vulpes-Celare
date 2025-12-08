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

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import { spawn, ChildProcess, SpawnOptions, execSync } from "child_process";
import chalk from "chalk";
import ora, { Ora } from "ora";
import boxen from "boxen";
import figures from "figures";

import { VulpesCelare, RedactionResult } from "../VulpesCelare";
import { VERSION, ENGINE_NAME } from "../index";
import {
  getSystemPrompt,
  SYSTEM_PROMPT_COMPACT,
  SYSTEM_PROMPT_DEV,
} from "./SystemPrompts";
import {
  VulpesIntegration,
  CLAUDE_MD_CONTENT,
  CODEX_AGENTS_MD,
} from "./VulpesIntegration";

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// THEME
// ============================================================================

const theme = {
  primary: chalk.hex("#FF6B35"),
  secondary: chalk.hex("#4ECDC4"),
  accent: chalk.hex("#FFE66D"),
  success: chalk.hex("#2ECC71"),
  warning: chalk.hex("#F39C12"),
  error: chalk.hex("#E74C3C"),
  info: chalk.hex("#3498DB"),
  muted: chalk.hex("#95A5A6"),
  agent: chalk.hex("#8B5CF6"),
  original: chalk.hex("#EF4444"),
  redacted: chalk.hex("#22C55E"),
  code: chalk.hex("#60A5FA"),
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

export class VulpesAgent {
  private config: AgentConfig;
  private vulpes: VulpesCelare;
  private spinner: Ora | null = null;
  private subprocess: ChildProcess | null = null;
  private lastComparison: RedactionComparison | null = null;

  constructor(config: Partial<AgentConfig> = {}) {
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

    this.vulpes = new VulpesCelare();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT
  // ══════════════════════════════════════════════════════════════════════════

  async start(): Promise<void> {
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

  private async ensureVulpesified(): Promise<void> {
    const integration = new VulpesIntegration({
      projectDir: this.config.workingDir,
      mode: this.config.mode,
      verbose: this.config.verbose,
    });

    const status = await integration.checkStatus();

    // Check if we need to install integrations
    const needsClaudeSetup =
      this.config.backend === "claude" &&
      (!status.claudeCode.claudeMdExists ||
        !status.claudeCode.slashCommandsInstalled);

    const needsCodexSetup =
      this.config.backend === "codex" && !status.codex.agentsMdExists;

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

  private async startClaudeCode(): Promise<void> {
    const args: string[] = [];

    // Model selection
    if (this.config.model) {
      args.push("--model", this.config.model);
    }

    // DEEP INTEGRATION: Use short append-system-prompt (CLAUDE.md has full context)
    // Note: --system-prompt-file only works in print mode, not interactive
    args.push(
      "--append-system-prompt",
      "You are VULPESIFIED. This project uses Vulpes Celare for HIPAA PHI redaction. See CLAUDE.md for full capabilities. Commands: /vulpes-redact, /vulpes-analyze, /vulpes-info",
    );

    // DEEP INTEGRATION: Set environment for hooks
    const env = {
      ...process.env,
      VULPES_AGENT_MODE: this.config.mode,
      VULPES_WORKING_DIR: this.config.workingDir,
      VULPES_VERSION: VERSION,
      // Git bash for Windows
      CLAUDE_CODE_GIT_BASH_PATH:
        process.env.CLAUDE_CODE_GIT_BASH_PATH ||
        "C:\\Program Files\\Git\\bin\\bash.exe",
    };

    console.log(
      theme.info(`\n  Starting Claude Code with Vulpes integration...\n`),
    );
    console.log(theme.muted(`  ${figures.tick} Vulpes context injected`));
    console.log(
      theme.muted(`  ${figures.tick} CLAUDE.md provides full context`),
    );
    console.log(
      theme.muted(
        `  ${figures.tick} Slash commands: /vulpes-redact, /vulpes-analyze, /vulpes-info\n`,
      ),
    );

    await this.spawnAgent("claude", args, env);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CODEX - FULL INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  private async startCodex(): Promise<void> {
    const args: string[] = [];

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
      VULPES_VERSION: VERSION,
    };

    console.log(theme.info(`\n  Starting Codex with Vulpes integration...\n`));
    console.log(
      theme.muted(
        `  ${figures.tick} AGENTS.md loaded with Vulpes instructions`,
      ),
    );
    console.log(
      theme.muted(`  ${figures.tick} Model: ${this.config.model || "o3"}`),
    );
    console.log(
      theme.muted(`  ${figures.tick} MCP server: vulpes (if configured)\n`),
    );

    await this.spawnAgent("codex", args, env);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COPILOT - INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  private async startCopilot(): Promise<void> {
    const args: string[] = [];

    // Model selection
    args.push("--model", this.config.model || "claude-sonnet-4");

    // DEEP INTEGRATION: Use file-based prompt to avoid command line length limits
    // Copilot doesn't have --system-prompt-file, so we use a short inline prompt
    // and rely on CLAUDE.md/project context for details
    args.push(
      "-p",
      "You are VULPESIFIED - a PHI redaction assistant. Use 'vulpes' CLI commands for redaction. See project CLAUDE.md for full capabilities.",
    );

    const env = {
      ...process.env,
      VULPES_AGENT_MODE: this.config.mode,
      VULPES_WORKING_DIR: this.config.workingDir,
    };

    console.log(
      theme.info(`\n  Starting GitHub Copilot with Vulpes context...\n`),
    );
    console.log(theme.muted(`  ${figures.tick} Vulpes context injected`));
    console.log(
      theme.muted(`  ${figures.tick} Use 'vulpes' CLI for redaction\n`),
    );

    await this.spawnAgent("copilot", args, env);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NATIVE AGENT - BUILT-IN REPL
  // ══════════════════════════════════════════════════════════════════════════

  private async startNativeAgent(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(
      theme.muted("\n  Native Vulpes Agent - No external CLI required\n"),
    );
    console.log(theme.muted("  Commands:"));
    console.log(theme.muted("    .test <text>     Test redaction"));
    console.log(theme.muted("    .file <path>     Redact a file"));
    console.log(theme.muted("    .interactive     Enter interactive mode"));
    console.log(theme.muted("    .info            System information"));
    console.log(theme.muted("    .filters         List active filters"));
    console.log(theme.muted("    .help            Show all commands"));
    console.log(theme.muted("    .exit            Exit\n"));

    const prompt = () => {
      rl.question(
        theme.primary("vulpes") + theme.muted(" > "),
        async (input) => {
          input = input.trim();

          if (!input) {
            prompt();
            return;
          }

          if (input.startsWith(".")) {
            await this.handleCommand(input, rl);
          } else if (this.looksLikeDocument(input)) {
            await this.testDocument(input);
          } else {
            // Treat as text to redact
            await this.testDocument(input);
          }

          prompt();
        },
      );
    };

    prompt();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPAWN EXTERNAL AGENT
  // ══════════════════════════════════════════════════════════════════════════

  private async spawnAgent(
    cmd: string,
    args: string[],
    env: NodeJS.ProcessEnv,
  ): Promise<void> {
    // Build command string to avoid DEP0190 deprecation warning
    // (passing args with shell: true triggers the warning)
    const escapedArgs = args.map((arg) => {
      // Escape quotes and wrap in quotes if contains spaces
      if (arg.includes(" ") || arg.includes('"')) {
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    });
    const fullCommand = `${cmd} ${escapedArgs.join(" ")}`;

    const spawnOptions: SpawnOptions = {
      cwd: this.config.workingDir,
      stdio: "inherit",
      shell: true,
      env,
    };

    // Use command string instead of args array to avoid deprecation
    this.subprocess = spawn(fullCommand, [], spawnOptions);

    this.subprocess.on("error", (err) => {
      console.error(theme.error(`\n  Failed to start ${cmd}: ${err.message}`));
      console.log(
        theme.muted(`  Make sure ${cmd} is installed and in your PATH\n`),
      );

      if (cmd === "claude") {
        console.log(
          theme.muted("  Install: npm install -g @anthropic-ai/claude-code"),
        );
      } else if (cmd === "codex") {
        console.log(theme.muted("  Install: npm install -g @openai/codex"));
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

  private buildFullSystemPrompt(): string {
    // Get the comprehensive system prompt from SystemPrompts.ts
    const basePrompt = getSystemPrompt(this.config.mode);

    // Add the Vulpes injection prompt with quick reference
    return `${basePrompt}\n\n${VULPES_INJECTION_PROMPT}`;
  }

  /**
   * Write system prompt to a temp file to avoid command line length limits
   * Returns the path to the temp file
   */
  private writePromptToFile(): string {
    const promptContent = this.buildFullSystemPrompt();
    const promptFile = path.join(os.tmpdir(), `vulpes-prompt-${Date.now()}.md`);
    fs.writeFileSync(promptFile, promptContent, "utf-8");
    return promptFile;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENT TESTING
  // ══════════════════════════════════════════════════════════════════════════

  async testDocument(text: string): Promise<RedactionComparison> {
    this.startSpinner("Running redaction...");

    const result = await this.vulpes.process(text);

    this.stopSpinner();

    const comparison: RedactionComparison = {
      original: text,
      redacted: result.text,
      result,
      issues: [],
    };

    this.lastComparison = comparison;
    this.printComparison(comparison);

    return comparison;
  }

  private printComparison(comparison: RedactionComparison): void {
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
      for (const [type, count] of Object.entries(result.breakdown).sort(
        (a, b) => b[1] - a[1],
      )) {
        console.log(`    ${theme.code(type)}: ${count}`);
      }
    }

    console.log(theme.muted("═".repeat(70)) + "\n");
  }

  private formatDocument(text: string, type: "original" | "redacted"): string {
    const lines = text.split("\n");
    const maxWidth = 68;

    return lines
      .map((line) => {
        if (type === "redacted") {
          line = line.replace(/\{\{[^}]+\}\}/g, (match) =>
            theme.warning(match),
          );
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

  private async handleCommand(
    input: string,
    rl: readline.Interface,
  ): Promise<void> {
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
        } else {
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
          } else {
            console.log(theme.error(`  File not found: ${filePath}`));
          }
        } else {
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
        const integration = new VulpesIntegration({
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

  private async interactiveRedaction(rl: readline.Interface): Promise<void> {
    console.log(theme.info.bold("\n  INTERACTIVE REDACTION MODE"));
    console.log(theme.muted("  Type text to redact. Empty line to finish.\n"));

    let sessionStats = { documents: 0, phiFound: 0, totalTime: 0 };
    let buffer = "";

    const processBuffer = async () => {
      if (buffer.trim()) {
        const result = await this.vulpes.process(buffer);
        console.log(theme.redacted("\n  → ") + result.text);
        console.log(
          theme.muted(
            `    (${result.redactionCount} PHI, ${result.executionTimeMs}ms)\n`,
          ),
        );
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
          console.log(
            theme.info(
              `\n  Session: ${sessionStats.documents} docs, ${sessionStats.phiFound} PHI, ${sessionStats.totalTime}ms total\n`,
            ),
          );
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

  private async printSystemInfo(): Promise<void> {
    const filters = this.vulpes.getActiveFilters();

    console.log();
    console.log(theme.info.bold("  VULPES CELARE SYSTEM INFO"));
    console.log(theme.muted("  " + "─".repeat(50)));
    console.log(`  ${theme.muted("Engine:")}     ${ENGINE_NAME}`);
    console.log(`  ${theme.muted("Version:")}    ${VERSION}`);
    console.log(`  ${theme.muted("Mode:")}       ${this.getModeDisplay()}`);
    console.log(`  ${theme.muted("Backend:")}    ${this.config.backend}`);
    console.log(`  ${theme.muted("Filters:")}    ${filters.length} active`);
    console.log(
      `  ${theme.muted("HIPAA:")}      17/18 Safe Harbor identifiers`,
    );
    console.log();
    console.log(theme.muted("  Target Metrics:"));
    console.log(`    ${theme.success("Sensitivity:")} ≥99% (CRITICAL)`);
    console.log(`    ${theme.info("Specificity:")} ≥96%`);
    console.log(`    ${theme.secondary("Speed:")}       2-3ms per document`);

    if (this.lastComparison) {
      console.log();
      console.log(theme.muted("  Last Test:"));
      console.log(
        `    ${this.lastComparison.result.redactionCount} PHI in ${this.lastComparison.result.executionTimeMs}ms`,
      );
    }
    console.log();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  private looksLikeDocument(text: string): boolean {
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

  private getModeDisplay(): string {
    switch (this.config.mode) {
      case "dev":
        return theme.warning("DEVELOPMENT (full access)");
      case "qa":
        return theme.info("QA (read-only)");
      case "production":
        return theme.success("PRODUCTION (redacted only)");
    }
  }

  private getFilterInfo(): string {
    const filters = this.vulpes.getActiveFilters();
    const categories: Record<string, string[]> = {
      Identity: filters.filter((f) => f.includes("Name")),
      Government: filters.filter((f) => /SSN|Passport|License|DEA/.test(f)),
      Contact: filters.filter((f) => /Phone|Fax|Email|Address|Zip/.test(f)),
      Medical: filters.filter((f) => /MRN|NPI|Health|Age|Date/.test(f)),
      Financial: filters.filter((f) => /Credit|Account/.test(f)),
      Technical: filters.filter((f) =>
        /IP|URL|Device|Vehicle|Biometric|Unique/.test(f),
      ),
    };

    let output = "\n" + theme.info.bold("  ACTIVE FILTERS") + "\n";
    output += theme.muted("  " + "─".repeat(50)) + "\n";

    for (const [category, catFilters] of Object.entries(categories)) {
      if (catFilters.length > 0) {
        output += `  ${theme.primary(category)}:\n`;
        for (const f of catFilters) {
          output += `    ${theme.success(figures.tick)} ${f.replace("FilterSpan", "")}\n`;
        }
      }
    }

    output += theme.muted("  " + "─".repeat(50)) + "\n";
    output += `  ${theme.muted("Total:")} ${filters.length} filters\n`;

    return output;
  }

  private getHelpText(): string {
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

  private printBanner(): void {
    const modeColor =
      this.config.mode === "dev"
        ? "yellow"
        : this.config.mode === "qa"
          ? "cyan"
          : "green";

    console.log(
      boxen(
        `${theme.primary.bold("VULPES AGENT")}\n` +
          `${theme.muted(ENGINE_NAME + " v" + VERSION)}\n\n` +
          `${theme.muted("Mode:")} ${this.getModeDisplay()}\n` +
          `${theme.muted("Backend:")} ${theme.secondary(this.config.backend)}\n\n` +
          (this.config.mode === "dev"
            ? `${theme.warning(figures.warning)} ${theme.warning("Full codebase access enabled")}\n` +
              `${theme.warning(figures.warning)} ${theme.warning("Only use with synthetic/test data")}`
            : this.config.mode === "qa"
              ? `${theme.info(figures.info)} Can compare original vs redacted\n` +
                `${theme.info(figures.info)} Read-only codebase access`
              : `${theme.success(figures.tick)} Production mode - original text hidden\n` +
                `${theme.success(figures.tick)} Safe for real patient data`),
        {
          padding: 1,
          margin: { top: 1, bottom: 0 },
          borderStyle: "round",
          borderColor: modeColor,
          title: "VULPESIFIED AI AGENT",
          titleAlignment: "center",
        },
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPINNER
  // ══════════════════════════════════════════════════════════════════════════

  private startSpinner(text: string): void {
    this.spinner = ora({
      text,
      spinner: "dots12",
      color: "yellow",
    }).start();
  }

  private stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}

// ============================================================================
// CLI HANDLER
// ============================================================================

export async function handleAgent(options: any): Promise<void> {
  const config: Partial<AgentConfig> = {
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
