"use strict";
/**
 * ============================================================================
 * VULPES CELARE - ENHANCED HELP SYSTEM
 * ============================================================================
 *
 * Beautiful help output with examples, categories, and tips.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.showMainHelp = showMainHelp;
exports.showExamples = showExamples;
exports.showQuickStart = showQuickStart;
exports.showTips = showTips;
exports.showCommandHelp = showCommandHelp;
const theme_1 = require("../theme");
const output_1 = require("../theme/output");
const icons_1 = require("../theme/icons");
const meta_1 = require("../meta");
const VulpesOutput_1 = require("../utils/VulpesOutput");
const CORE_COMMANDS = [
    {
        name: "redact",
        desc: "Redact PHI from a file or stdin",
        examples: [
            "vulpes redact document.txt",
            "vulpes redact document.txt -o clean.txt",
            'echo "John Smith SSN 123-45-6789" | vulpes redact',
            "vulpes redact notes.txt --format json",
        ],
    },
    {
        name: "batch",
        desc: "Batch process files in a directory",
        examples: [
            "vulpes batch ./medical-records/",
            "vulpes batch ./data/ -o ./cleaned/ --ext .txt,.md",
            "vulpes batch ./docs/ --dry-run",
        ],
    },
    {
        name: "analyze",
        desc: "Analyze a document for PHI without redacting",
        examples: [
            "vulpes analyze document.txt",
            "vulpes analyze report.pdf --format json",
        ],
    },
    {
        name: "interactive",
        alias: "i",
        desc: "Start interactive REPL mode",
        examples: ["vulpes interactive", "vulpes i"],
    },
    {
        name: "stream",
        desc: "Stream redaction from stdin (real-time)",
        examples: [
            "tail -f /var/log/medical.log | vulpes stream",
            "vulpes stream --mode immediate",
        ],
    },
];
const AI_COMMANDS = [
    {
        name: "chat",
        alias: "c",
        desc: "Native streaming chat with any LLM provider",
        examples: [
            "vulpes chat",
            "vulpes chat --provider anthropic",
            "vulpes chat --provider openai --model gpt-4o",
            "vulpes chat --subagents",
        ],
    },
    {
        name: "agent",
        alias: "a",
        desc: "Wrap external AI CLIs with PHI protection",
        examples: [
            "vulpes agent --backend claude",
            "vulpes agent --backend codex",
            "vulpes agent --backend copilot",
        ],
    },
    {
        name: "safe-chat",
        alias: "sc",
        desc: "Interactive chat with auto-redaction",
        examples: [
            "vulpes safe-chat",
            "vulpes safe-chat --provider openai",
        ],
    },
];
const UTILITY_COMMANDS = [
    {
        name: "info",
        desc: "Display system and engine information",
        examples: ["vulpes info", "vulpes info --json"],
    },
    {
        name: "filters",
        desc: "List all available PHI filters",
        examples: ["vulpes filters", "vulpes filters --format json"],
    },
    {
        name: "benchmark",
        desc: "Run performance benchmarks",
        examples: [
            "vulpes benchmark",
            "vulpes benchmark --iterations 500",
            "vulpes benchmark --size large",
        ],
    },
    {
        name: "policy",
        desc: "Policy management (list, show, compile, validate)",
        examples: [
            "vulpes policy list",
            "vulpes policy show HIPAA_STRICT",
            "vulpes policy compile custom.dsl",
        ],
    },
    {
        name: "completions",
        desc: "Generate shell completion scripts",
        examples: [
            "vulpes completions bash >> ~/.bashrc",
            "vulpes completions zsh > ~/.zfunc/_vulpes",
        ],
    },
];
// ============================================================================
// HELP FORMATTERS
// ============================================================================
function formatCommandWithDesc(cmd, maxNameLen) {
    const alias = cmd.alias ? ` (${cmd.alias})` : "";
    const name = (cmd.name + alias).padEnd(maxNameLen + 4);
    return `  ${theme_1.theme.primary(name)} ${theme_1.theme.muted(cmd.desc)}`;
}
// ============================================================================
// HELP FUNCTIONS
// ============================================================================
function showMainHelp() {
    // Calculate max name length for alignment
    const allCommands = [...CORE_COMMANDS, ...AI_COMMANDS, ...UTILITY_COMMANDS];
    const maxLen = Math.max(...allCommands.map(c => c.name.length + (c.alias ? c.alias.length + 3 : 0)));
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print(theme_1.theme.primary.bold(`  ${meta_1.ENGINE_NAME}`) + theme_1.theme.muted(` v${meta_1.VERSION}`));
    VulpesOutput_1.out.print(theme_1.theme.muted("  HIPAA-Compliant PHI Redaction Engine"));
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print(output_1.Divider.line({ width: 60 }));
    VulpesOutput_1.out.blank();
    // Core commands
    VulpesOutput_1.out.print(theme_1.theme.info.bold("  CORE COMMANDS"));
    VulpesOutput_1.out.blank();
    for (const cmd of CORE_COMMANDS) {
        VulpesOutput_1.out.print(formatCommandWithDesc(cmd, maxLen));
    }
    VulpesOutput_1.out.blank();
    // AI commands
    VulpesOutput_1.out.print(theme_1.theme.agent.bold("  AI INTEGRATION"));
    VulpesOutput_1.out.blank();
    for (const cmd of AI_COMMANDS) {
        VulpesOutput_1.out.print(formatCommandWithDesc(cmd, maxLen));
    }
    VulpesOutput_1.out.blank();
    // Utility commands
    VulpesOutput_1.out.print(theme_1.theme.muted.bold("  UTILITIES"));
    VulpesOutput_1.out.blank();
    for (const cmd of UTILITY_COMMANDS) {
        VulpesOutput_1.out.print(formatCommandWithDesc(cmd, maxLen));
    }
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print(output_1.Divider.line({ width: 60 }));
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print(theme_1.theme.muted("  Use") + theme_1.theme.secondary(" vulpes <command> --help ") + theme_1.theme.muted("for command details"));
    VulpesOutput_1.out.print(theme_1.theme.muted("  Use") + theme_1.theme.secondary(" vulpes examples ") + theme_1.theme.muted("for usage examples"));
    VulpesOutput_1.out.blank();
}
function showExamples() {
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print(output_1.Box.vulpes([
        theme_1.theme.bold("Quick Examples"),
        "",
        theme_1.theme.secondary("Basic redaction:"),
        theme_1.theme.muted('  echo "Patient John Smith" | vulpes redact'),
        "",
        theme_1.theme.secondary("Process a file:"),
        theme_1.theme.muted("  vulpes redact medical-notes.txt -o cleaned.txt"),
        "",
        theme_1.theme.secondary("Batch process directory:"),
        theme_1.theme.muted("  vulpes batch ./records/ --ext .txt,.md"),
        "",
        theme_1.theme.secondary("Interactive mode:"),
        theme_1.theme.muted("  vulpes interactive"),
        "",
        theme_1.theme.secondary("AI chat with PHI protection:"),
        theme_1.theme.muted("  vulpes chat --provider anthropic"),
        "",
        theme_1.theme.secondary("Wrap Claude Code:"),
        theme_1.theme.muted("  vulpes agent --backend claude"),
    ], { title: "Examples" }));
    VulpesOutput_1.out.blank();
}
function showQuickStart() {
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print(output_1.Box.info([
        theme_1.theme.bold("Quick Start Guide"),
        "",
        `${theme_1.theme.success(icons_1.status.success)} Step 1: Test redaction`,
        theme_1.theme.muted('  echo "John Smith SSN 123-45-6789" | vulpes redact'),
        "",
        `${theme_1.theme.success(icons_1.status.success)} Step 2: Process a file`,
        theme_1.theme.muted("  vulpes redact your-document.txt"),
        "",
        `${theme_1.theme.success(icons_1.status.success)} Step 3: Try interactive mode`,
        theme_1.theme.muted("  vulpes interactive"),
        "",
        `${theme_1.theme.success(icons_1.status.success)} Step 4: Set up AI integration`,
        theme_1.theme.muted("  vulpes chat  # or  vulpes agent"),
        "",
        theme_1.theme.muted("For more: vulpes --help"),
    ], { title: "Quick Start" }));
    VulpesOutput_1.out.blank();
}
function showTips() {
    const tips = [
        "Use --quiet (-q) to suppress banners in scripts",
        "Pipe output: vulpes redact file.txt | other-command",
        "Set ANTHROPIC_API_KEY or OPENAI_API_KEY for AI features",
        "Use vulpes completions to enable tab completion",
        "Try vulpes benchmark to test performance",
        "Use --format json for programmatic output",
        "The interactive mode supports multi-line input",
    ];
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print(theme_1.theme.info.bold("  Tips & Tricks"));
    VulpesOutput_1.out.blank();
    for (const tip of tips) {
        VulpesOutput_1.out.print(`  ${theme_1.theme.primary(icons_1.bullets.dot)} ${tip}`);
    }
    VulpesOutput_1.out.blank();
}
function showCommandHelp(command) {
    const allCommands = [...CORE_COMMANDS, ...AI_COMMANDS, ...UTILITY_COMMANDS];
    const cmd = allCommands.find(c => c.name === command || c.alias === command);
    if (!cmd) {
        VulpesOutput_1.out.print(output_1.Status.error(`Unknown command: ${command}`));
        VulpesOutput_1.out.print(theme_1.theme.muted("Use 'vulpes --help' to see available commands"));
        return;
    }
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print(theme_1.theme.primary.bold(`  vulpes ${cmd.name}`));
    if (cmd.alias) {
        VulpesOutput_1.out.print(theme_1.theme.muted(`  Alias: ${cmd.alias}`));
    }
    VulpesOutput_1.out.blank();
    VulpesOutput_1.out.print(`  ${cmd.desc}`);
    VulpesOutput_1.out.blank();
    if (cmd.examples && cmd.examples.length > 0) {
        VulpesOutput_1.out.print(theme_1.theme.secondary("  Examples:"));
        VulpesOutput_1.out.blank();
        for (const example of cmd.examples) {
            VulpesOutput_1.out.print(`    ${theme_1.theme.muted("$")} ${example}`);
        }
        VulpesOutput_1.out.blank();
    }
    VulpesOutput_1.out.print(theme_1.theme.muted(`  For all options: vulpes ${cmd.name} --help`));
    VulpesOutput_1.out.blank();
}
//# sourceMappingURL=help.js.map