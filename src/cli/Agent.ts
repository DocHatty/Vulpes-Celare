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
import * as readline from "readline";
import { spawn, ChildProcess, SpawnOptions } from "child_process";
import { safeExecSync } from "../utils/SecurityUtils";
import ora, { Ora } from "ora";
import figures from "figures";

import { VulpesCelare, RedactionResult } from "../VulpesCelare";
import { VERSION, ENGINE_NAME } from "../meta";
import { logger } from "../utils/Logger";
import { execSync } from "child_process";
import { VulpesIntegration } from "./VulpesIntegration";
import { AgentOptions } from "./types";

// Import unified theme system
import { theme } from "../theme";
import { Status, Box } from "../theme/output";
import { out } from "../utils/VulpesOutput";

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

// Theme imported from unified theme system (../theme)

// ============================================================================
// AGENT CLASS
// ============================================================================

export class VulpesAgent {
  private config: AgentConfig;
  private _vulpes: VulpesCelare | null = null;
  private spinner: Ora | null = null;
  private subprocess: ChildProcess | null = null;
  private lastComparison: RedactionComparison | null = null;

  // Lazy getter for VulpesCelare - only instantiate when actually needed
  private get vulpes(): VulpesCelare {
    if (!this._vulpes) {
      this._vulpes = new VulpesCelare();
    }
    return this._vulpes;
  }

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
    // VulpesCelare is now lazy - not created until first use
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT
  // ══════════════════════════════════════════════════════════════════════════

  async start(): Promise<void> {
    logger.info("VulpesAgent.start()", {
      backend: this.config.backend,
      mode: this.config.mode,
      workingDir: this.config.workingDir,
      autoVulpesify: this.config.autoVulpesify,
    });

    // Banner is now printed by launcher, don't duplicate
    // this.printBanner();

    // Auto-vulpesify if enabled
    if (this.config.autoVulpesify) {
      logger.debug("Running ensureVulpesified");
      await this.ensureVulpesified();
    }

    // MANAGED UPDATE CHECK
    // Update checking inside the child process causes crashes on Windows.
    // We check here, update if needed (in a detached way), then launch.
    if (this.config.backend === "codex") {
      await this.managePackageUpdate("@openai/codex");
    } else if (this.config.backend === "claude") {
      await this.managePackageUpdate("@anthropic-ai/claude-code");
    } else if (this.config.backend === "copilot") {
      // Copilot CLI is often updated via gh extension, less standard npm
      // skipping for now or handle specifically if needed
    }

    logger.info(`Starting backend: ${this.config.backend}`);

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

    // Fast path: just check if files exist, skip slow CLI version checks
    const claudeMdExists = require("fs").existsSync(
      require("path").join(this.config.workingDir, "CLAUDE.md"),
    );
    const slashCommandsExist = require("fs").existsSync(
      require("path").join(
        this.config.workingDir,
        ".claude",
        "commands",
        "vulpes-redact.md",
      ),
    );
    const agentsMdExists = require("fs").existsSync(
      require("path").join(this.config.workingDir, "AGENTS.md"),
    );

    // Also check if MCP is already registered
    const mcpSettingsPath = require("path").join(
      this.config.workingDir,
      ".claude",
      "settings.json",
    );
    let mcpRegistered = false;
    if (require("fs").existsSync(mcpSettingsPath)) {
      try {
        const settings = JSON.parse(
          require("fs").readFileSync(mcpSettingsPath, "utf-8"),
        );
        mcpRegistered = settings.mcpServers?.vulpes !== undefined;
      } catch {
        // Ignore parse errors
      }
    }

    // Check if we need to install integrations
    const needsClaudeSetup =
      this.config.backend === "claude" &&
      (!claudeMdExists || !slashCommandsExist || !mcpRegistered);

    const needsCodexSetup = this.config.backend === "codex" && !agentsMdExists;

    if (needsClaudeSetup || needsCodexSetup) {
      out.print("\n  " + Status.info("Setting up Vulpes integration...") + "\n");

      if (needsClaudeSetup) {
        await integration.installClaudeCodeIntegration();
      }
      if (needsCodexSetup) {
        await integration.installCodexIntegration();
      }

      out.print("  " + Status.success("Integration ready!") + "\n");
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLAUDE CODE - FULL INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  private async startClaudeCode(): Promise<void> {
    logger.info("startClaudeCode called");
    const args: string[] = [];

    // Model selection
    if (this.config.model) {
      args.push("--model", this.config.model);
      logger.debug("Using model", { model: this.config.model });
    }

    // CLAUDE.md already provides full Vulpes context, so we skip --append-system-prompt
    // This also avoids Windows shell quoting issues when shell:true is used

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
      // Suppress internal update notifiers to prevent crash
      NO_UPDATE_NOTIFIER: "1",
      CI: "true",
    };

    logger.debug("Claude Code environment", {
      VULPES_AGENT_MODE: env.VULPES_AGENT_MODE,
      VULPES_WORKING_DIR: env.VULPES_WORKING_DIR,
      args: args,
    });

    out.print("\n  " + Status.info("Starting Claude Code with Vulpes integration...") + "\n");
    out.print(Status.bullet("Vulpes context injected", { indent: 1 }));
    out.print(Status.bullet("CLAUDE.md provides full context", { indent: 1 }));
    out.print(Status.bullet("Slash commands: /vulpes-redact, /vulpes-analyze, /vulpes-info", { indent: 1 }) + "\n");

    await this.spawnAgent("claude", args, env);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CODEX - FULL INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  private async startCodex(): Promise<void> {
    const args: string[] = [];

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
      VULPES_VERSION: VERSION,
      // Suppress internal update notifiers to prevent crash
      NO_UPDATE_NOTIFIER: "1",
      CI: "true",
    };

    out.print("\n  " + Status.info("Starting Codex with Vulpes integration...") + "\n");
    out.print(Status.bullet("AGENTS.md loaded with Vulpes instructions", { indent: 1 }));
    out.print(Status.bullet(`Model: ${this.config.model || "gpt-5.2"}`, { indent: 1 }));
    out.print(Status.bullet("MCP server: vulpes (if configured)", { indent: 1 }) + "\n");

    await this.spawnAgent("codex", args, env);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COPILOT - INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Check if GitHub Copilot CLI is installed
   * The new @github/copilot package provides the 'copilot' command
   */
  private isCopilotInstalled(): boolean {
    try {
      safeExecSync("copilot", ["--version"], {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private async startCopilot(): Promise<void> {
    // Check if copilot CLI is installed
    if (!this.isCopilotInstalled()) {
      out.print("\n" + Box.error([
        "GitHub Copilot CLI is not installed.",
        "",
        "To install (same pattern as Claude & Codex):",
        "",
        theme.accent("  npm install -g @github/copilot"),
        "",
        "Then authenticate on first run:",
        "",
        theme.accent("  copilot"),
        theme.muted("  # Type: /login"),
        "",
        theme.muted("Requires an active GitHub Copilot subscription."),
        theme.muted("(Copilot Pro, Pro+, Business, or Enterprise)"),
      ], { title: "Not Installed" }) + "\n");
      process.exit(1);
    }

    const args: string[] = [];

    // Model selection - Copilot CLI defaults to Claude Sonnet 4.5
    // Use /model command inside to switch models
    if (this.config.model) {
      args.push("--model", this.config.model);
    }

    const env = {
      ...process.env,
      VULPES_AGENT_MODE: this.config.mode,
      VULPES_WORKING_DIR: this.config.workingDir,
      VULPES_VERSION: VERSION,
      // Suppress internal update notifiers to prevent crash
      NO_UPDATE_NOTIFIER: "1",
      CI: "true",
    };

    out.print("\n  " + Status.info("Starting GitHub Copilot CLI with Vulpes integration...") + "\n");
    out.print(Status.bullet("Copilot CLI detected", { indent: 1 }));
    out.print(Status.bullet("Vulpes context available", { indent: 1 }));
    out.print(Status.bullet("Use 'vulpes' CLI for PHI redaction", { indent: 1 }));
    out.print(Status.bullet("Type /login if not authenticated", { indent: 1 }) + "\n");

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

    out.print(
      theme.muted("\n  Native Vulpes Agent - No external CLI required\n"),
    );
    out.print(theme.muted("  Commands:"));
    out.print(theme.muted("    .test <text>     Test redaction"));
    out.print(theme.muted("    .file <path>     Redact a file"));
    out.print(theme.muted("    .interactive     Enter interactive mode"));
    out.print(theme.muted("    .info            System information"));
    out.print(theme.muted("    .filters         List active filters"));
    out.print(theme.muted("    .help            Show all commands"));
    out.print(theme.muted("    .exit            Exit\n"));

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
    // On Windows, npm-installed CLI tools are .cmd/.bat scripts that need shell
    const needsShell =
      process.platform === "win32" &&
      ["claude", "codex", "copilot"].includes(cmd);

    const spawnOptions: SpawnOptions = {
      cwd: this.config.workingDir,
      stdio: "inherit",
      env,
      shell: needsShell,
    };

    logger.info(`Spawning agent: ${cmd}`, {
      cmd,
      args,
      cwd: this.config.workingDir,
      needsShell,
      platform: process.platform,
    });

    this.subprocess = spawn(cmd, args, spawnOptions);
    logger.debug(`Subprocess spawned`, { pid: this.subprocess.pid });

    this.subprocess.on("error", (err) => {
      logger.error(`Failed to spawn ${cmd}`, {
        error: err.message,
        code: (err as NodeJS.ErrnoException).code,
        path: (err as NodeJS.ErrnoException).path,
      });

      out.print(theme.error(`\n  Failed to start ${cmd}: ${err.message}`));
      out.print(
        theme.muted(`  Make sure ${cmd} is installed and in your PATH\n`),
      );
      out.print(theme.muted(`  Log file: ${logger.getLogFilePath()}\n`));

      if (cmd === "claude") {
        out.print(
          theme.muted("  Install: npm install -g @anthropic-ai/claude-code"),
        );
      } else if (cmd === "codex") {
        out.print(theme.muted("  Install: npm install -g @openai/codex"));
      } else if (cmd === "copilot") {
        out.print(
          theme.muted(
            "  Install: npm install -g @githubnext/github-copilot-cli",
          ),
        );
        out.print(
          theme.muted("  Or use: gh extension install github/gh-copilot"),
        );
      }

      process.exit(1);
    });

    this.subprocess.on("exit", (code, signal) => {
      logger.info(`Agent ${cmd} exited`, { code, signal });
      out.print(theme.muted(`\n  ${cmd} exited with code ${code}`));
      process.exit(code || 0);
    });

    // Log any unexpected close
    this.subprocess.on("close", (code, signal) => {
      if (code !== 0) {
        logger.warn(`Agent ${cmd} closed unexpectedly`, { code, signal });
      }
    });
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

    out.print("\n" + theme.muted("═".repeat(70)));

    if (this.config.mode !== "production") {
      out.print(theme.original.bold(" ORIGINAL:"));
      out.print(theme.muted("─".repeat(70)));
      out.print(this.formatDocument(original, "original"));
      out.blank();
    }

    out.print(theme.redacted.bold(" REDACTED:"));
    out.print(theme.muted("─".repeat(70)));
    out.print(this.formatDocument(redacted, "redacted"));
    out.blank();

    out.print(theme.info.bold(" STATS:"));
    out.print(theme.muted("─".repeat(70)));
    out.print(`  ${theme.muted("Time:")} ${result.executionTimeMs}ms`);
    out.print(`  ${theme.muted("PHI Found:")} ${result.redactionCount}`);

    if (Object.keys(result.breakdown).length > 0) {
      out.print(`  ${theme.muted("Breakdown:")}`);
      for (const [type, count] of Object.entries(result.breakdown).sort(
        (a, b) => b[1] - a[1],
      )) {
        out.print(`    ${theme.code(type)}: ${count}`);
      }
    }

    out.print(theme.muted("═".repeat(70)) + "\n");
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
  // SAFE UPDATE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  private async managePackageUpdate(packageName: string): Promise<void> {
    try {
      const currentVersion = this.getInstalledVersion(packageName);
      if (!currentVersion) return; // Not installed, let normal flow handle or error

      const latestVersion = this.getLatestVersion(packageName);
      if (!latestVersion) return;

      if (currentVersion !== latestVersion) {
        out.print(
          theme.info(
            `\n  Update available for ${packageName}: ${theme.muted(currentVersion)} → ${theme.success(latestVersion)}`,
          ),
        );

        // In interactive mode, we could ask. For now, we auto-update if strictly needed or just notify 
        // effectively without crashing. The user complaint was "shuts system down".
        // Providing a safe way to update:

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise<string>(resolve => {
          rl.question(theme.accent(`  Do you want to update now? (y/N) `), resolve);
        });
        rl.close();

        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          out.print(theme.muted(`  Updating ${packageName}...`));
          try {
            // Use synchronous exec to ensure it finishes before we move on
            execSync(`npm install -g ${packageName}`, { stdio: 'inherit' });
            out.print(theme.success(`  Update complete! Starting agent...\n`));
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            out.print(theme.error(`  Update failed: ${message}`));
            out.print(theme.muted(`  Continuing with current version...\n`));
          }
        } else {
          out.print(theme.muted(`  Skipping update. Starting agent...\n`));
        }
      }
    } catch (e) {
      // Ignore update check errors, just proceed
      logger.warn(`Update check failed for ${packageName}`, { error: e });
    }
  }

  private getInstalledVersion(packageName: string): string | null {
    try {
      // npm list -g --depth=0 --json usually works but can be slow. 
      // Faster check might be specific package info
      const output = execSync(`npm list -g ${packageName} --depth=0 --json`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      const json = JSON.parse(output);
      return json.dependencies?.[packageName]?.version || null;
    } catch {
      return null;
    }
  }

  private getLatestVersion(packageName: string): string | null {
    try {
      const output = execSync(`npm view ${packageName} version`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      return output.trim();
    } catch {
      return null;
    }
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
        out.print("\n  " + Status.info("Goodbye!") + "\n");
        rl.close();
        process.exit(0);
        break;

      case "test":
      case "t":
      case "redact":
        if (args.length > 0) {
          await this.testDocument(args.join(" "));
        } else {
          out.print("  " + Status.warning("Usage: .test <text to redact>"));
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
            out.print("  " + Status.error(`File not found: ${filePath}`));
          }
        } else {
          out.print("  " + Status.warning("Usage: .file <path>"));
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
        out.print(this.getFilterInfo());
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
        out.print(this.getHelpText());
        break;

      default:
        out.print("  " + Status.warning(`Unknown command: .${cmd}`));
        out.print(theme.muted("  Type .help for available commands"));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INTERACTIVE REDACTION
  // ══════════════════════════════════════════════════════════════════════════

  private async interactiveRedaction(rl: readline.Interface): Promise<void> {
    out.print(theme.info.bold("\n  INTERACTIVE REDACTION MODE"));
    out.print(theme.muted("  Type text to redact. Empty line to finish.\n"));

    let sessionStats = { documents: 0, phiFound: 0, totalTime: 0 };
    let buffer = "";

    const processBuffer = async () => {
      if (buffer.trim()) {
        const result = await this.vulpes.process(buffer);
        out.print(theme.redacted("\n  → ") + result.text);
        out.print(
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
          out.print(
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

    out.blank();
    out.print(theme.info.bold("  VULPES CELARE SYSTEM INFO"));
    out.print(theme.muted("  " + "─".repeat(50)));
    out.print(`  ${theme.muted("Engine:")}     ${ENGINE_NAME}`);
    out.print(`  ${theme.muted("Version:")}    ${VERSION}`);
    out.print(`  ${theme.muted("Mode:")}       ${this.getModeDisplay()}`);
    out.print(`  ${theme.muted("Backend:")}    ${this.config.backend}`);
    out.print(`  ${theme.muted("Filters:")}    ${filters.length} active`);
    out.print(
      `  ${theme.muted("HIPAA:")}      17/18 Safe Harbor identifiers`,
    );
    out.blank();
    out.print(theme.muted("  Target Metrics:"));
    out.print(`    ${theme.success("Sensitivity:")} ≥99% (CRITICAL)`);
    out.print(`    ${theme.info("Specificity:")} ≥96%`);
    out.print(`    ${theme.secondary("Speed:")}       2-3ms per document`);

    if (this.lastComparison) {
      out.blank();
      out.print(theme.muted("  Last Test:"));
      out.print(
        `    ${this.lastComparison.result.redactionCount} PHI in ${this.lastComparison.result.executionTimeMs}ms`,
      );
    }
    out.blank();
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
      /      DOB|MRN|SSN/i,
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
      Government: filters.filter((f) => /SSN|Passport|License/.test(f)),
      Contact: filters.filter((f) => /Phone|Fax|Email|Address|Zip/.test(f)),
      Medical: filters.filter((f) => /MRN|Health|Age|Date/.test(f)),
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

export async function handleAgent(options: AgentOptions): Promise<void> {
  // Validate and cast backend to AgentBackend type
  const backendValue = options.backend || "claude";
  const validBackends: AgentBackend[] = ["claude", "codex", "copilot", "native"];
  const backend: AgentBackend = validBackends.includes(backendValue as AgentBackend)
    ? (backendValue as AgentBackend)
    : "claude";

  const config: Partial<AgentConfig> = {
    mode: options.mode || "dev",
    backend,
    model: options.model,
    apiKey: options.apiKey,
    workingDir: process.cwd(),
    verbose: options.verbose,
    autoVulpesify: options.vulpesify ?? true,
  };

  const agent = new VulpesAgent(config);
  await agent.start();
}
