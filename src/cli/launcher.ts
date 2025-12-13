#!/usr/bin/env node
/**
 * ============================================================================
 * VULPES CELARE - UNIFIED INTERACTIVE LAUNCHER
 * ============================================================================
 *
 * Optimized for fast startup and responsive terminal display.
 */

import * as readline from "readline";
import chalk from "chalk";
import figures from "figures";

import { VERSION, ENGINE_NAME } from "../index";

// Lazy load heavy modules only when needed
let handleNativeChat: typeof import("./NativeChat").handleNativeChat;
let handleAgent: typeof import("./Agent").handleAgent;
let handleVulpesify: typeof import("./VulpesIntegration").handleVulpesify;
let validateVulpesEnvironment: typeof import("../utils/SecurityUtils").validateVulpesEnvironment;

async function loadModules() {
  if (!handleNativeChat) {
    const [nativeChat, agent, vulpesInt, security] = await Promise.all([
      import("./NativeChat"),
      import("./Agent"),
      import("./VulpesIntegration"),
      import("../utils/SecurityUtils"),
    ]);
    handleNativeChat = nativeChat.handleNativeChat;
    handleAgent = agent.handleAgent;
    handleVulpesify = vulpesInt.handleVulpesify;
    validateVulpesEnvironment = security.validateVulpesEnvironment;
  }
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
  highlight: chalk.hex("#9B59B6"),
};

// ============================================================================
// RESPONSIVE BANNER
// ============================================================================

function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

function centerText(text: string, width: number): string {
  const visibleLength = text.replace(/\x1b\[[0-9;]*m/g, "").length;
  const padding = Math.max(0, Math.floor((width - visibleLength) / 2));
  return " ".repeat(padding) + text;
}

function printBanner(
  showStats: boolean = true,
  clearScreen: boolean = true,
): void {
  if (clearScreen) {
    // Use ANSI escape codes for more reliable clearing on Windows
    // \x1b[2J clears entire screen, \x1b[0f moves cursor to top-left
    process.stdout.write("\x1b[2J\x1b[0f");
  }
  const width = getTerminalWidth();
  const boxWidth = Math.min(width - 4, 60);
  const innerWidth = boxWidth - 4;

  // ASCII art scales based on terminal width
  const logo =
    width >= 70
      ? `
  ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗
  ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝
  ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗
  ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║
   ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║
    ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝`
      : width >= 50
        ? `
 ╦  ╦╦ ╦╦  ╔═╗╔═╗╔═╗
 ╚╗╔╝║ ║║  ╠═╝║╣ ╚═╗
  ╚╝ ╚═╝╩═╝╩  ╚═╝╚═╝`
        : `
 VULPES`;

  const border = theme.primary("╭" + "─".repeat(boxWidth - 2) + "╮");
  const bottom = theme.primary("╰" + "─".repeat(boxWidth - 2) + "╯");
  const side = theme.primary("│");

  const pad = (s: string) => {
    const visible = s.replace(/\x1b\[[0-9;]*m/g, "").length;
    const right = Math.max(0, innerWidth - visible);
    return `${side} ${s}${" ".repeat(right)} ${side}`;
  };

  const empty = pad("");

  console.log("\n" + border);

  // Logo lines
  const logoLines = logo.trim().split("\n");
  for (const line of logoLines) {
    console.log(pad(theme.primary.bold(line)));
  }

  console.log(empty);
  console.log(pad(`  ${ENGINE_NAME} v${VERSION}`));
  console.log(pad(`  ${theme.secondary("HIPAA PHI Redaction Engine")}`));

  if (showStats) {
    console.log(empty);
    console.log(
      pad(`  ${theme.success(figures.tick)} 17/18 Safe Harbor identifiers`),
    );
    console.log(
      pad(
        `  ${theme.success(figures.tick)} ≥99% sensitivity, ≥96% specificity`,
      ),
    );
    console.log(pad(`  ${theme.success(figures.tick)} 2-3ms per document`));
  }

  console.log(empty);
  console.log(bottom);
}

// ============================================================================
// MENU DISPLAY
// ============================================================================

function printMenu(
  title: string,
  options: Array<{ key: string; label: string; desc: string[] }>,
  showBack: boolean = false,
): void {
  const width = getTerminalWidth();

  console.log(theme.info.bold(`\n  ${title}\n`));

  for (const opt of options) {
    const keyStyle = theme.accent.bold(`[${opt.key}]`);
    const labelStyle = theme.primary.bold(opt.label);
    console.log(`  ${keyStyle} ${labelStyle}`);

    for (const line of opt.desc) {
      // Truncate description lines if terminal is narrow
      const maxLen = width - 8;
      const truncated =
        line.length > maxLen ? line.slice(0, maxLen - 3) + "..." : line;
      console.log(`      ${theme.muted(truncated)}`);
    }
    console.log();
  }

  if (showBack) {
    console.log(theme.muted("  [b] Back to main menu\n"));
  } else {
    console.log(theme.muted("  [q] Quit\n"));
  }
}

async function prompt(message: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ============================================================================
// MAIN MENU
// ============================================================================

const MAIN_OPTIONS = [
  {
    key: "1",
    label: "Native API Chat",
    desc: [
      "Full-featured streaming chat with any LLM provider",
      "Supports: Anthropic, OpenAI, OpenRouter, Ollama, Custom",
      "Auto-discovers models • Tool calling • Subagent orchestration",
    ],
  },
  {
    key: "2",
    label: "Agent Mode",
    desc: [
      "Wrap external AI CLIs with Vulpes PHI protection",
      "Supports: Claude Code, Codex, GitHub Copilot",
      "Auto-injects CLAUDE.md, AGENTS.md, hooks, MCP tools",
    ],
  },
];

async function showMainMenu(): Promise<void> {
  printBanner(true);
  printMenu("CHOOSE YOUR MODE:", MAIN_OPTIONS, false);

  const choice = await prompt(theme.secondary("  Your choice: "));

  if (choice === "q" || choice === "quit" || choice === "exit") {
    console.log(theme.info("\n  Goodbye!\n"));
    process.exit(0);
  }

  await loadModules();

  if (choice === "1") {
    await handleNativeChat({ mode: "dev", verbose: false, skipBanner: true });
  } else if (choice === "2") {
    await showAgentSubmenu();
  } else {
    console.log(theme.error(`\n  Invalid choice: ${choice}`));
    await showMainMenu();
  }
}

// ============================================================================
// AGENT SUBMENU
// ============================================================================

const AGENT_OPTIONS = [
  {
    key: "1",
    name: "claude",
    label: "Claude Code",
    desc: [
      "Anthropic's agentic coding assistant",
      "Best for: Complex refactoring, multi-file changes",
      "Auto-injects: CLAUDE.md, slash commands, MCP tools",
    ],
  },
  {
    key: "2",
    name: "codex",
    label: "OpenAI Codex",
    desc: [
      "OpenAI's code-focused CLI",
      "Best for: Quick code generation, explanations",
      "Auto-injects: CLAUDE.md, config.toml MCP",
    ],
  },
  {
    key: "3",
    name: "copilot",
    label: "GitHub Copilot CLI",
    desc: [
      "GitHub's AI pair programmer",
      "Best for: Shell commands, Git operations",
      "Wrapped with PHI-safe I/O redaction",
    ],
  },
];

async function showAgentSubmenu(): Promise<void> {
  // Clear and print compact banner (no double clear)
  printBanner(false, true); // Compact banner without stats, with clear
  printMenu("SELECT AI BACKEND:", AGENT_OPTIONS, true);

  const choice = await prompt(theme.secondary("  Your choice: "));

  if (choice === "b" || choice === "back") {
    await showMainMenu();
    return;
  }

  const backend = AGENT_OPTIONS.find((b) => b.key === choice);
  if (backend) {
    // Don't call silentVulpesify here - handleAgent already does ensureVulpesified
    await handleAgent({
      mode: "dev",
      backend: backend.name,
      verbose: false,
    });
  } else {
    console.log(theme.error(`\n  Invalid choice: ${choice}`));
    await showAgentSubmenu();
  }
}

// ============================================================================
// AUTO-VULPESIFY (SILENT)
// ============================================================================

async function silentVulpesify(): Promise<void> {
  try {
    const originalLog = console.log;
    console.log = () => {};
    await handleVulpesify({ mode: "dev", silent: true });
    console.log = originalLog;
  } catch {
    // Silently continue
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

async function main(): Promise<void> {
  // Suppress Node.js deprecation warnings during development
  // DEP0190: shell + args warning - we validate commands are safe
  process.removeAllListeners("warning");
  process.env.VULPES_QUIET = "1";

  const args = process.argv.slice(2);

  if (args.length > 0) {
    const cmd = args[0].toLowerCase();

    // Quick shortcuts - skip menu, load modules lazily
    switch (cmd) {
      case "chat":
      case "c":
        await loadModules();
        await silentVulpesify();
        await handleNativeChat({ mode: "dev", verbose: args.includes("-v") });
        return;

      case "agent":
      case "a":
        await loadModules();
        await silentVulpesify();
        await handleAgent({
          mode: "dev",
          backend: args[1] || "claude",
          verbose: args.includes("-v"),
        });
        return;

      case "-h":
      case "--help":
      case "help":
        printUsage();
        return;

      default:
        break;
    }
  }

  await showMainMenu();
}

function printUsage(): void {
  const width = getTerminalWidth();

  console.log(`
${theme.primary.bold("VULPES CELARE")} - HIPAA PHI Redaction Engine

${theme.info.bold("USAGE:")}
  vulpes              Interactive menu (recommended)
  vulpes chat         Native API chat with any provider
  vulpes agent        Wrap external AI CLIs (Claude Code, Codex, Copilot)
  vulpes --help       Show this help

${theme.info.bold("SHORTCUTS:")}
  vulpes              ${theme.muted("→")} Interactive menu
  vulpes c            ${theme.muted("→")} Native API chat
  vulpes a [backend]  ${theme.muted("→")} Agent mode (claude/codex/copilot)

${theme.info.bold("IN-CHAT COMMANDS:")} ${theme.muted("(available in all modes)")}
  /redact <text>      ${theme.muted("→")} Quick redact text
  /interactive        ${theme.muted("→")} Bulk redaction REPL
  /info               ${theme.muted("→")} System info & metrics
  /subagents          ${theme.muted("→")} Enable parallel AI workers
  /orchestrate <task> ${theme.muted("→")} Delegate to subagents
  /help               ${theme.muted("→")} Show all commands

${theme.muted("For full CLI options: vulpes <command> --help")}
`);
}

main().catch((err) => {
  console.error(theme.error(`\nError: ${err.message}`));
  process.exit(1);
});
