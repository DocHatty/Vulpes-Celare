#!/usr/bin/env node
"use strict";
/**
 * ============================================================================
 * VULPES CELARE - UNIFIED INTERACTIVE LAUNCHER
 * ============================================================================
 *
 * Just type `vulpes` and get a beautiful interactive menu to choose your mode.
 * All capabilities are integrated - no separate options needed.
 *
 * Features automatically available in all modes:
 * - Interactive redaction (/redact, /interactive)
 * - Quick redact (/r <text>)
 * - System info (/info)
 * - Subagent orchestration (/subagents, /orchestrate)
 * - Auto-vulpesification on agent startup
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
const readline = __importStar(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const boxen_1 = __importDefault(require("boxen"));
const figures_1 = __importDefault(require("figures"));
const index_1 = require("../index");
const NativeChat_1 = require("./NativeChat");
const Agent_1 = require("./Agent");
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
    highlight: chalk_1.default.hex("#9B59B6"),
};
const MENU_OPTIONS = [
    {
        key: "1",
        label: "Native API Chat",
        description: [
            "Full-featured streaming chat with any LLM provider",
            "Supports: Anthropic, OpenAI, OpenRouter, Ollama, Custom",
            "Auto-discovers models • Tool calling • Subagent orchestration",
            "Built-in: /redact, /interactive, /info, /subagents",
        ],
        action: async () => {
            // Note: Vulpesify runs on Agent mode only (creates CLAUDE.md etc)
            await (0, NativeChat_1.handleNativeChat)({ mode: "dev", verbose: false });
        },
    },
    {
        key: "2",
        label: "Agent Mode",
        description: [
            "Wrap external AI CLIs with Vulpes PHI protection",
            "Supports: Claude Code, Codex, GitHub Copilot",
            "Auto-injects CLAUDE.md, AGENTS.md, hooks, MCP tools",
            "Full bidirectional redaction • All capabilities integrated",
        ],
        action: async () => {
            await showAgentSubmenu();
        },
    },
];
// ============================================================================
// BANNER
// ============================================================================
function printBanner() {
    console.clear();
    const title = theme.primary.bold(`
 ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗
 ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝
 ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗
 ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║
  ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║
   ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝`);
    console.log((0, boxen_1.default)(`${title}\n\n` +
        `  ${theme.muted(index_1.ENGINE_NAME)} ${theme.muted("v" + index_1.VERSION)}\n` +
        `  ${theme.secondary("HIPAA PHI Redaction Engine")}\n\n` +
        `  ${theme.success(figures_1.default.tick)} 17/18 Safe Harbor identifiers\n` +
        `  ${theme.success(figures_1.default.tick)} ≥99% sensitivity, ≥96% specificity\n` +
        `  ${theme.success(figures_1.default.tick)} 2-3ms per document`, {
        padding: { top: 0, bottom: 1, left: 1, right: 1 },
        margin: { top: 1, bottom: 0 },
        borderStyle: "round",
        borderColor: "#FF6B35",
    }));
}
// ============================================================================
// MAIN MENU
// ============================================================================
async function showMainMenu() {
    printBanner();
    console.log(theme.info.bold("\n  CHOOSE YOUR MODE:\n"));
    for (const option of MENU_OPTIONS) {
        const keyStyle = theme.accent.bold(`[${option.key}]`);
        const labelStyle = theme.primary.bold(option.label);
        console.log(`  ${keyStyle} ${labelStyle}`);
        for (const line of option.description) {
            console.log(`      ${theme.muted(line)}`);
        }
        console.log();
    }
    // Show integrated capabilities reminder
    console.log(theme.muted("  " + "─".repeat(56)));
    console.log(theme.info("\n  All modes include:"));
    console.log(theme.muted("  • /redact <text>     - Quick PHI redaction"));
    console.log(theme.muted("  • /interactive       - Bulk redaction REPL"));
    console.log(theme.muted("  • /info              - System info & metrics"));
    console.log(theme.muted("  • /subagents         - Enable parallel AI workers"));
    console.log(theme.muted("  • /orchestrate       - Delegate complex tasks\n"));
    console.log(theme.muted("  [q] Quit\n"));
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question(theme.secondary("  Your choice: "), async (answer) => {
        rl.close();
        const choice = answer.trim().toLowerCase();
        if (choice === "q" || choice === "quit" || choice === "exit") {
            console.log(theme.info("\n  Goodbye!\n"));
            process.exit(0);
        }
        const option = MENU_OPTIONS.find((o) => o.key === choice);
        if (option) {
            console.log();
            await option.action();
        }
        else {
            console.log(theme.error(`\n  Invalid choice: ${choice}`));
            await pressEnterToContinue();
            await showMainMenu();
        }
    });
}
// ============================================================================
// AGENT SUBMENU
// ============================================================================
async function showAgentSubmenu() {
    console.clear();
    printBanner();
    console.log(theme.info.bold("\n  SELECT AI BACKEND:\n"));
    const backends = [
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
    for (const b of backends) {
        console.log(`  ${theme.accent.bold(`[${b.key}]`)} ${theme.primary.bold(b.label)}`);
        for (const line of b.desc) {
            console.log(`      ${theme.muted(line)}`);
        }
        console.log();
    }
    console.log(theme.muted("  [b] Back to main menu\n"));
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question(theme.secondary("  Your choice: "), async (answer) => {
        rl.close();
        const choice = answer.trim().toLowerCase();
        if (choice === "b" || choice === "back") {
            await showMainMenu();
            return;
        }
        const backend = backends.find((b) => b.key === choice);
        if (backend) {
            // Auto-vulpesify before launching agent
            await silentVulpesify();
            await (0, Agent_1.handleAgent)({ mode: "dev", backend: backend.name, verbose: false });
        }
        else {
            console.log(theme.error(`\n  Invalid choice: ${choice}`));
            await pressEnterToContinue();
            await showAgentSubmenu();
        }
    });
}
// ============================================================================
// AUTO-VULPESIFY (SILENT)
// ============================================================================
async function silentVulpesify() {
    try {
        // Suppress output during auto-vulpesify
        const originalLog = console.log;
        console.log = () => { };
        await (0, VulpesIntegration_1.handleVulpesify)({ mode: "dev", silent: true });
        console.log = originalLog;
    }
    catch {
        // Silently continue if vulpesify fails
    }
}
// ============================================================================
// UTILITIES
// ============================================================================
function pressEnterToContinue() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question(theme.muted("\n  Press Enter to continue..."), () => {
            rl.close();
            resolve();
        });
    });
}
// ============================================================================
// ENTRY POINT
// ============================================================================
async function main() {
    // Suppress logging
    process.env.VULPES_QUIET = "1";
    // Check for direct command shortcuts
    const args = process.argv.slice(2);
    if (args.length > 0) {
        const cmd = args[0].toLowerCase();
        // Quick shortcuts - skip menu
        switch (cmd) {
            case "chat":
            case "c":
                await silentVulpesify();
                await (0, NativeChat_1.handleNativeChat)({ mode: "dev", verbose: args.includes("-v") });
                return;
            case "agent":
            case "a":
                await silentVulpesify();
                await (0, Agent_1.handleAgent)({
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
                // Fall through to menu if unknown command
                break;
        }
    }
    // No args or unknown - show interactive menu
    await showMainMenu();
}
function printUsage() {
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
// Run
main().catch((err) => {
    console.error(theme.error(`\nError: ${err.message}`));
    process.exit(1);
});
//# sourceMappingURL=launcher.js.map