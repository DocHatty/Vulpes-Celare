/**
 * ============================================================================
 * VULPES CELARE - ENHANCED HELP SYSTEM
 * ============================================================================
 *
 * Beautiful help output with examples, categories, and tips.
 */

import { theme } from "../theme";
import { Box, Status, Divider } from "../theme/output";
import { status, bullets } from "../theme/icons";
import { VERSION, ENGINE_NAME } from "../meta";
import { out } from "../utils/VulpesOutput";

// ============================================================================
// COMMAND CATEGORIES
// ============================================================================

interface CommandHelp {
  name: string;
  alias?: string;
  desc: string;
  examples?: string[];
}

const CORE_COMMANDS: CommandHelp[] = [
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

const AI_COMMANDS: CommandHelp[] = [
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

const UTILITY_COMMANDS: CommandHelp[] = [
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

function formatCommandWithDesc(cmd: CommandHelp, maxNameLen: number): string {
  const alias = cmd.alias ? ` (${cmd.alias})` : "";
  const name = (cmd.name + alias).padEnd(maxNameLen + 4);
  return `  ${theme.primary(name)} ${theme.muted(cmd.desc)}`;
}

// ============================================================================
// HELP FUNCTIONS
// ============================================================================

export function showMainHelp(): void {
  // Calculate max name length for alignment
  const allCommands = [...CORE_COMMANDS, ...AI_COMMANDS, ...UTILITY_COMMANDS];
  const maxLen = Math.max(...allCommands.map(c => c.name.length + (c.alias ? c.alias.length + 3 : 0)));

  out.blank();
  out.print(theme.primary.bold(`  ${ENGINE_NAME}`) + theme.muted(` v${VERSION}`));
  out.print(theme.muted("  HIPAA-Compliant PHI Redaction Engine"));
  out.blank();
  out.print(Divider.line({ width: 60 }));
  out.blank();

  // Core commands
  out.print(theme.info.bold("  CORE COMMANDS"));
  out.blank();
  for (const cmd of CORE_COMMANDS) {
    out.print(formatCommandWithDesc(cmd, maxLen));
  }
  out.blank();

  // AI commands
  out.print(theme.agent.bold("  AI INTEGRATION"));
  out.blank();
  for (const cmd of AI_COMMANDS) {
    out.print(formatCommandWithDesc(cmd, maxLen));
  }
  out.blank();

  // Utility commands
  out.print(theme.muted.bold("  UTILITIES"));
  out.blank();
  for (const cmd of UTILITY_COMMANDS) {
    out.print(formatCommandWithDesc(cmd, maxLen));
  }
  out.blank();

  out.print(Divider.line({ width: 60 }));
  out.blank();
  out.print(theme.muted("  Use") + theme.secondary(" vulpes <command> --help ") + theme.muted("for command details"));
  out.print(theme.muted("  Use") + theme.secondary(" vulpes examples ") + theme.muted("for usage examples"));
  out.blank();
}

export function showExamples(): void {
  out.blank();
  out.print(Box.vulpes([
    theme.bold("Quick Examples"),
    "",
    theme.secondary("Basic redaction:"),
    theme.muted('  echo "Patient John Smith" | vulpes redact'),
    "",
    theme.secondary("Process a file:"),
    theme.muted("  vulpes redact medical-notes.txt -o cleaned.txt"),
    "",
    theme.secondary("Batch process directory:"),
    theme.muted("  vulpes batch ./records/ --ext .txt,.md"),
    "",
    theme.secondary("Interactive mode:"),
    theme.muted("  vulpes interactive"),
    "",
    theme.secondary("AI chat with PHI protection:"),
    theme.muted("  vulpes chat --provider anthropic"),
    "",
    theme.secondary("Wrap Claude Code:"),
    theme.muted("  vulpes agent --backend claude"),
  ], { title: "Examples" }));
  out.blank();
}

export function showQuickStart(): void {
  out.blank();
  out.print(Box.info([
    theme.bold("Quick Start Guide"),
    "",
    `${theme.success(status.success)} Step 1: Test redaction`,
    theme.muted('  echo "John Smith SSN 123-45-6789" | vulpes redact'),
    "",
    `${theme.success(status.success)} Step 2: Process a file`,
    theme.muted("  vulpes redact your-document.txt"),
    "",
    `${theme.success(status.success)} Step 3: Try interactive mode`,
    theme.muted("  vulpes interactive"),
    "",
    `${theme.success(status.success)} Step 4: Set up AI integration`,
    theme.muted("  vulpes chat  # or  vulpes agent"),
    "",
    theme.muted("For more: vulpes --help"),
  ], { title: "Quick Start" }));
  out.blank();
}

export function showTips(): void {
  const tips = [
    "Use --quiet (-q) to suppress banners in scripts",
    "Pipe output: vulpes redact file.txt | other-command",
    "Set ANTHROPIC_API_KEY or OPENAI_API_KEY for AI features",
    "Use vulpes completions to enable tab completion",
    "Try vulpes benchmark to test performance",
    "Use --format json for programmatic output",
    "The interactive mode supports multi-line input",
  ];

  out.blank();
  out.print(theme.info.bold("  Tips & Tricks"));
  out.blank();
  for (const tip of tips) {
    out.print(`  ${theme.primary(bullets.dot)} ${tip}`);
  }
  out.blank();
}

export function showCommandHelp(command: string): void {
  const allCommands = [...CORE_COMMANDS, ...AI_COMMANDS, ...UTILITY_COMMANDS];
  const cmd = allCommands.find(c => c.name === command || c.alias === command);

  if (!cmd) {
    out.print(Status.error(`Unknown command: ${command}`));
    out.print(theme.muted("Use 'vulpes --help' to see available commands"));
    return;
  }

  out.blank();
  out.print(theme.primary.bold(`  vulpes ${cmd.name}`));
  if (cmd.alias) {
    out.print(theme.muted(`  Alias: ${cmd.alias}`));
  }
  out.blank();
  out.print(`  ${cmd.desc}`);
  out.blank();

  if (cmd.examples && cmd.examples.length > 0) {
    out.print(theme.secondary("  Examples:"));
    out.blank();
    for (const example of cmd.examples) {
      out.print(`    ${theme.muted("$")} ${example}`);
    }
    out.blank();
  }

  out.print(theme.muted(`  For all options: vulpes ${cmd.name} --help`));
  out.blank();
}
