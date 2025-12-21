#!/usr/bin/env node
/**
 * ============================================================================
 * VULPES CELARE CLI
 * ============================================================================
 *
 * A beautiful, production-grade command-line interface for the
 * Vulpes Celare HIPAA PHI redaction engine.
 *
 * Usage:
 *   vulpes <command> [options]
 *   vulpes redact <file>
 *   vulpes batch <directory>
 *   vulpes interactive
 *
 * @module CLI
 * @version 1.0.0
 */

import { Command } from "commander";
import { out } from "../utils/VulpesOutput";
import { CLI } from "./CLI";
import { handleSafeChat, handleQuery } from "./LLMIntegration";
import { handleAgent } from "./Agent";
import { handleNativeChat } from "./NativeChat";
import { handleVulpesify } from "./VulpesIntegration";
import { generateCompletions, showCompletionHelp } from "./completions";
import { showExamples, showTips, showQuickStart } from "./help";
import { VERSION, ENGINE_NAME, VARIANT } from "../meta";
import { registerShutdownHandlers } from "../shutdown";

// Register graceful shutdown handlers for SIGTERM/SIGINT
// This ensures VulpesLogger and VulpesTracer are flushed before exit
registerShutdownHandlers();

const program = new Command();

program
  .name("vulpes")
  .description(`${ENGINE_NAME} - ${VARIANT}\nHIPAA PHI Redaction Engine`)
  .version(VERSION, "-v, --version", "Display version number")
  .addHelpText("beforeAll", CLI.getBanner())
  .configureHelp({
    sortSubcommands: true,
    sortOptions: true,
  });

// ============================================================================
// REDACT COMMAND - Single file or stdin
// ============================================================================
program
  .command("redact")
  .description("Redact PHI from a file or stdin")
  .argument("[file]", "Input file path (omit for stdin)")
  .option("-o, --output <file>", "Output file path (default: stdout)")
  .option(
    "-f, --format <format>",
    "Output format: text, json, csv, report",
    "text",
  )
  .option("-p, --policy <file>", "Policy file path (.json or .dsl)")
  .option(
    "-s, --style <style>",
    "Replacement style: brackets, asterisks, empty",
    "brackets",
  )
  .option("--enable <types>", "Comma-separated PHI types to enable")
  .option("--disable <types>", "Comma-separated PHI types to disable")
  .option("--show-spans", "Show detailed span information")
  .option("--no-color", "Disable colored output")
  .option("-q, --quiet", "Suppress banner and progress indicators")
  .action(async (file, options) => {
    await CLI.redact(file, options);
  });

// ============================================================================
// BATCH COMMAND - Process directory recursively
// ============================================================================
program
  .command("batch")
  .description("Batch process files in a directory")
  .argument("<directory>", "Directory to process")
  .option("-o, --output <dir>", "Output directory (default: <input>_redacted)")
  .option(
    "-f, --format <format>",
    "Output format: text, json, csv, report",
    "text",
  )
  .option("-p, --policy <file>", "Policy file path")
  .option(
    "-s, --style <style>",
    "Replacement style: brackets, asterisks, empty",
    "brackets",
  )
  .option("--enable <types>", "Comma-separated PHI types to enable")
  .option("--disable <types>", "Comma-separated PHI types to disable")
  .option("-t, --threads <n>", "Number of concurrent workers", "4")
  .option(
    "-e, --ext <extensions>",
    "File extensions to process (comma-separated)",
    ".txt,.md,.json,.xml,.html",
  )
  .option("--max-depth <n>", "Maximum directory depth", "10")
  .option("--dry-run", "Show what would be processed without making changes")
  .option("--no-color", "Disable colored output")
  .option("-q, --quiet", "Suppress banner and progress indicators")
  .option("--summary", "Show summary report after processing")
  .action(async (directory, options) => {
    await CLI.batch(directory, options);
  });

// ============================================================================
// INTERACTIVE COMMAND - REPL mode
// ============================================================================
program
  .command("interactive")
  .alias("i")
  .description("Start interactive REPL mode")
  .option("-p, --policy <file>", "Policy file to use")
  .option(
    "-s, --style <style>",
    "Replacement style: brackets, asterisks, empty",
    "brackets",
  )
  .option("--enable <types>", "Comma-separated PHI types to enable")
  .option("--disable <types>", "Comma-separated PHI types to disable")
  .action(async (options) => {
    await CLI.interactive(options);
  });

// ============================================================================
// ANALYZE COMMAND - Analyze without redacting
// ============================================================================
program
  .command("analyze")
  .description("Analyze a document for PHI without redacting")
  .argument("<file>", "Input file path")
  .option("-f, --format <format>", "Output format: table, json, csv", "table")
  .option("--no-color", "Disable colored output")
  .option("-q, --quiet", "Suppress banner")
  .action(async (file, options) => {
    await CLI.analyze(file, options);
  });

// ============================================================================
// POLICY COMMAND - Policy management
// ============================================================================
const policyCmd = program
  .command("policy")
  .description("Policy management commands");

policyCmd
  .command("list")
  .description("List available policy templates")
  .action(async () => {
    await CLI.policyList();
  });

policyCmd
  .command("show <name>")
  .description("Show details of a policy template")
  .action(async (name) => {
    await CLI.policyShow(name);
  });

policyCmd
  .command("compile <file>")
  .description("Compile a .dsl policy file to JSON")
  .option("-o, --output <file>", "Output file path")
  .action(async (file, options) => {
    await CLI.policyCompile(file, options);
  });

policyCmd
  .command("validate <file>")
  .description("Validate a policy file")
  .action(async (file) => {
    await CLI.policyValidate(file);
  });

// ============================================================================
// INFO COMMAND - System information
// ============================================================================
program
  .command("info")
  .description("Display system and engine information")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    await CLI.info(options);
  });

// ============================================================================
// FILTERS COMMAND - List available filters
// ============================================================================
program
  .command("filters")
  .description("List all available PHI filters")
  .option("-f, --format <format>", "Output format: table, json", "table")
  .option("--no-color", "Disable colored output")
  .action(async (options) => {
    await CLI.filters(options);
  });

// ============================================================================
// BENCHMARK COMMAND - Performance testing
// ============================================================================
program
  .command("benchmark")
  .description("Run performance benchmarks")
  .option("-n, --iterations <n>", "Number of iterations", "100")
  .option("--size <size>", "Document size: small, medium, large", "medium")
  .option("-q, --quiet", "Only show final results")
  .action(async (options) => {
    await CLI.benchmark(options);
  });

// ============================================================================
// STREAMING COMMAND - Real-time streaming redaction
// ============================================================================
program
  .command("stream")
  .description("Stream redaction from stdin (real-time)")
  .option("-m, --mode <mode>", "Stream mode: immediate, sentence", "sentence")
  .option("-p, --policy <file>", "Policy file path")
  .option(
    "-s, --style <style>",
    "Replacement style: brackets, asterisks, empty",
    "brackets",
  )
  .action(async (options) => {
    await CLI.stream(options);
  });

// ============================================================================
// SAFE-CHAT COMMAND - LLM Integration with auto-redaction
// ============================================================================
program
  .command("safe-chat")
  .alias("sc")
  .description(
    "Interactive chat with LLM (Claude/OpenAI) with automatic PHI redaction",
  )
  .option(
    "--provider <provider>",
    "LLM provider: claude, openai, ollama",
    "claude",
  )
  .option(
    "--api-key <key>",
    "API key (or use ANTHROPIC_API_KEY/OPENAI_API_KEY env var)",
  )
  .option(
    "--model <model>",
    "Model to use (e.g., claude-sonnet-4-20250514, gpt-4o)",
  )
  .option("--base-url <url>", "Custom API base URL")
  .option("--max-tokens <n>", "Maximum response tokens", "4096")
  .option("--temperature <n>", "Temperature for responses", "0.7")
  .option(
    "--system <preset>",
    "Safety instruction preset: standard, clinical, research, strict",
    "standard",
  )
  .option(
    "--no-safety-instructions",
    "Disable automatic safety instruction injection",
  )
  .action(async (options) => {
    await handleSafeChat(options);
  });

// ============================================================================
// QUERY COMMAND - One-shot LLM query with redaction
// ============================================================================
program
  .command("query")
  .description("Send a one-shot query to LLM with automatic PHI redaction")
  .argument("<text>", "Text to send (or file path)")
  .option(
    "--provider <provider>",
    "LLM provider: claude, openai, ollama",
    "claude",
  )
  .option(
    "--api-key <key>",
    "API key (or use ANTHROPIC_API_KEY/OPENAI_API_KEY env var)",
  )
  .option("--model <model>", "Model to use")
  .option("--max-tokens <n>", "Maximum response tokens", "4096")
  .option("--show-redacted", "Show the redacted input that was sent")
  .option(
    "--no-safety-instructions",
    "Disable automatic safety instruction injection",
  )
  .action(async (text, options) => {
    await handleQuery(text, options);
  });

// ============================================================================
// NATIVE CHAT COMMAND - Full Streaming Chat Experience (requires API key)
// ============================================================================
program
  .command("chat")
  .alias("c")
  .description(
    "Native streaming chat with tool calling (like Claude Code/Gemini CLI)",
  )
  .option(
    "--provider <provider>",
    "API provider: anthropic, openai, openrouter, ollama, custom",
  )
  .option("--model <model>", "Model to use (auto-discovered if not specified)")
  .option(
    "--api-key <key>",
    "API key (or use ANTHROPIC_API_KEY/OPENAI_API_KEY env)",
  )
  .option("--base-url <url>", "Custom API base URL")
  .option("--max-tokens <n>", "Maximum response tokens", "8192")
  .option(
    "--mode <mode>",
    "Mode: dev (full access), qa (read-only), production",
    "dev",
  )
  .option("-v, --verbose", "Verbose output (show all logs)")
  .option("--subagents", "Enable subagent orchestration mode")
  .option("--subagent-model <model>", "Model for subagents (default: haiku)")
  .option("--subagent-provider <provider>", "Provider for subagents")
  .option("--subagent-api-key <key>", "API key for subagents (if different)")
  .option("--parallel <n>", "Max parallel subagents", "3")
  .action(async (options) => {
    await handleNativeChat(options);
  });

// ============================================================================
// AGENT COMMAND - AI-Powered Redaction Development (wraps external CLIs)
// ============================================================================
program
  .command("agent")
  .alias("a")
  .description(
    "AI-powered redaction development agent (integrates with Claude Code, Codex, Copilot)",
  )
  .option(
    "--mode <mode>",
    "Agent mode: dev (full access), qa (read-only), production (redacted only)",
    "dev",
  )
  .option(
    "--backend <backend>",
    "LLM backend: claude (Claude Code), codex, copilot, openai",
    "claude",
  )
  .option("--model <model>", "Model to use (e.g., sonnet, opus, o3)")
  .option("--api-key <key>", "API key (for direct API backends)")
  .option("-v, --verbose", "Verbose output (show redaction logs)")
  .action(async (options) => {
    await handleAgent(options);
  });

// ============================================================================
// WRAP COMMAND - Wrap existing CLI with redaction
// ============================================================================
program
  .command("wrap")
  .description("Wrap Codex/Copilot with automatic PHI redaction")
  .argument("<command>", "Command to wrap: codex, copilot")
  .argument("[args...]", "Arguments to pass to the wrapped command")
  .option("--mode <mode>", "Redaction mode: dev, qa, production", "dev")
  .option("--bidirectional", "Redact both input and file reads", true)
.action(async (command, _args, options) => {
    // Import dynamically to avoid circular deps
    const { handleAgent } = await import("./Agent");
    await handleAgent({
      ...options,
      backend: command,
    });
  });

// ============================================================================
// VULPESIFY COMMAND - Deep CLI Integration
// ============================================================================
program
  .command("vulpesify")
  .description("Install deep integrations with Claude Code, Codex, and Copilot")
  .option("--mode <mode>", "Mode: dev, qa, production", "dev")
  .option("-v, --verbose", "Verbose output")
  .action(async (options) => {
    await handleVulpesify(options);
  });

// ============================================================================
// CC COMMAND - Quick Claude Code wrapper (no API key needed)
// ============================================================================
program
  .command("cc")
  .description(
    "Quick launch Claude Code with Vulpes context (no API key needed)",
  )
  .option("--mode <mode>", "Mode: dev, qa, production", "dev")
  .option("--model <model>", "Claude model to use")
  .action(async (options) => {
    await handleAgent({ ...options, backend: "claude" });
  });

// ============================================================================
// DEEP-ANALYZE COMMAND - Deep Analysis with Self-Correction (500+ docs)
// ============================================================================
program
  .command("deep-analyze")
  .alias("da")
  .description(
    "Deep analysis with Opus 4.5/Codex 5.2 High Max after 500+ documents tested",
  )
  .option("--threshold <n>", "Minimum documents for analysis", "500")
  .option("--force", "Force analysis even below threshold")
  .option("--deep", "Enable extended thinking analysis")
  .option("--enhanced", "Enhanced confidence mode (1000+ docs)")
  .option("--production", "Production-grade analysis (2000+ docs)")
  .option("--self-correct", "Enable automatic self-correction", true)
  .option("--no-self-correct", "Disable automatic self-correction")
  .option("--checkpoints", "Enable checkpoint system", true)
  .option("--no-checkpoints", "Disable checkpoints")
  .option("--report", "Generate detailed report only")
  .option("--json", "Output as JSON")
  .option("-v, --verbose", "Verbose output")
  .action(async (options) => {
    await CLI.deepAnalyze(options);
  });

// ============================================================================
// TEST COMMAND - Run test suite with self-correction
// ============================================================================
program
  .command("test")
  .description("Run PHI detection test suite with optional self-correction")
  .option("--count <n>", "Number of documents to test", "200")
  .option(
    "--profile <profile>",
    "Grading profile: HIPAA_STRICT, DEVELOPMENT",
    "HIPAA_STRICT",
  )
  .option("--self-correct", "Enable automatic self-correction on errors")
  .option("--checkpoints", "Enable progress checkpoints")
  .option("--quick", "Quick test (50 documents)")
  .option("--thorough", "Thorough test (500 documents)")
  .option("--log-file", "Write detailed log to file")
  .option("-v, --verbose", "Verbose output")
  .action(async (options) => {
    await CLI.runTests(options);
  });

// ============================================================================
// COMPLETIONS COMMAND - Shell completion scripts
// ============================================================================
program
  .command("completions")
  .description("Generate shell completion scripts")
  .argument("[shell]", "Shell type: bash, zsh, fish, powershell")
  .action((shell) => {
    if (!shell) {
      showCompletionHelp();
    } else {
      generateCompletions(shell);
    }
  });

// ============================================================================
// EXAMPLES COMMAND - Show usage examples
// ============================================================================
program
  .command("examples")
  .description("Show usage examples for common tasks")
  .action(() => {
    showExamples();
  });

// ============================================================================
// TIPS COMMAND - Show tips and tricks
// ============================================================================
program
  .command("tips")
  .description("Show tips and tricks for power users")
  .action(() => {
    showTips();
  });

// ============================================================================
// QUICKSTART COMMAND - Getting started guide
// ============================================================================
program
  .command("quickstart")
  .alias("qs")
  .description("Show quick start guide for new users")
  .action(() => {
    showQuickStart();
  });

// ============================================================================
// DIAGNOSE COMMAND - Pipeline state and diagnostics
// ============================================================================
program
  .command("diagnose")
  .alias("diag")
  .description("Show pipeline state, code paths, and diagnostic information")
  .option("--json", "Output as JSON")
  .option("--verbose", "Show detailed diagnostic hints")
  .action(async (options) => {
    await CLI.diagnose(options);
  });

// ============================================================================
// DEFAULT BEHAVIOR - Show help or run interactive
// ============================================================================
program.action(async () => {
  // If no command specified, show help with the beautiful banner
  out.print(CLI.getBanner());
  program.help();
});

// Parse and execute
program.parseAsync(process.argv).catch((err) => {
  CLI.error(err.message);
  process.exit(1);
});

export { program };
