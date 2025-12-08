#!/usr/bin/env node
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const commander_1 = require("commander");
const CLI_1 = require("./CLI");
const LLMIntegration_1 = require("./LLMIntegration");
const Agent_1 = require("./Agent");
const NativeChat_1 = require("./NativeChat");
const VulpesIntegration_1 = require("./VulpesIntegration");
const index_1 = require("../index");
const program = new commander_1.Command();
exports.program = program;
program
    .name("vulpes")
    .description(`${index_1.ENGINE_NAME} - ${index_1.VARIANT}\nHIPAA PHI Redaction Engine`)
    .version(index_1.VERSION, "-v, --version", "Display version number")
    .addHelpText("beforeAll", CLI_1.CLI.getBanner())
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
    .option("-f, --format <format>", "Output format: text, json, csv, report", "text")
    .option("-p, --policy <file>", "Policy file path (.json or .dsl)")
    .option("-s, --style <style>", "Replacement style: brackets, asterisks, empty", "brackets")
    .option("--enable <types>", "Comma-separated PHI types to enable")
    .option("--disable <types>", "Comma-separated PHI types to disable")
    .option("--show-spans", "Show detailed span information")
    .option("--no-color", "Disable colored output")
    .option("-q, --quiet", "Suppress banner and progress indicators")
    .action(async (file, options) => {
    await CLI_1.CLI.redact(file, options);
});
// ============================================================================
// BATCH COMMAND - Process directory recursively
// ============================================================================
program
    .command("batch")
    .description("Batch process files in a directory")
    .argument("<directory>", "Directory to process")
    .option("-o, --output <dir>", "Output directory (default: <input>_redacted)")
    .option("-f, --format <format>", "Output format: text, json, csv, report", "text")
    .option("-p, --policy <file>", "Policy file path")
    .option("-s, --style <style>", "Replacement style: brackets, asterisks, empty", "brackets")
    .option("--enable <types>", "Comma-separated PHI types to enable")
    .option("--disable <types>", "Comma-separated PHI types to disable")
    .option("-t, --threads <n>", "Number of concurrent workers", "4")
    .option("-e, --ext <extensions>", "File extensions to process (comma-separated)", ".txt,.md,.json,.xml,.html")
    .option("--max-depth <n>", "Maximum directory depth", "10")
    .option("--dry-run", "Show what would be processed without making changes")
    .option("--no-color", "Disable colored output")
    .option("-q, --quiet", "Suppress banner and progress indicators")
    .option("--summary", "Show summary report after processing")
    .action(async (directory, options) => {
    await CLI_1.CLI.batch(directory, options);
});
// ============================================================================
// INTERACTIVE COMMAND - REPL mode
// ============================================================================
program
    .command("interactive")
    .alias("i")
    .description("Start interactive REPL mode")
    .option("-p, --policy <file>", "Policy file to use")
    .option("-s, --style <style>", "Replacement style: brackets, asterisks, empty", "brackets")
    .option("--enable <types>", "Comma-separated PHI types to enable")
    .option("--disable <types>", "Comma-separated PHI types to disable")
    .action(async (options) => {
    await CLI_1.CLI.interactive(options);
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
    await CLI_1.CLI.analyze(file, options);
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
    await CLI_1.CLI.policyList();
});
policyCmd
    .command("show <name>")
    .description("Show details of a policy template")
    .action(async (name) => {
    await CLI_1.CLI.policyShow(name);
});
policyCmd
    .command("compile <file>")
    .description("Compile a .dsl policy file to JSON")
    .option("-o, --output <file>", "Output file path")
    .action(async (file, options) => {
    await CLI_1.CLI.policyCompile(file, options);
});
policyCmd
    .command("validate <file>")
    .description("Validate a policy file")
    .action(async (file) => {
    await CLI_1.CLI.policyValidate(file);
});
// ============================================================================
// INFO COMMAND - System information
// ============================================================================
program
    .command("info")
    .description("Display system and engine information")
    .option("--json", "Output as JSON")
    .action(async (options) => {
    await CLI_1.CLI.info(options);
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
    await CLI_1.CLI.filters(options);
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
    await CLI_1.CLI.benchmark(options);
});
// ============================================================================
// STREAMING COMMAND - Real-time streaming redaction
// ============================================================================
program
    .command("stream")
    .description("Stream redaction from stdin (real-time)")
    .option("-m, --mode <mode>", "Stream mode: immediate, sentence", "sentence")
    .option("-p, --policy <file>", "Policy file path")
    .option("-s, --style <style>", "Replacement style: brackets, asterisks, empty", "brackets")
    .action(async (options) => {
    await CLI_1.CLI.stream(options);
});
// ============================================================================
// SAFE-CHAT COMMAND - LLM Integration with auto-redaction
// ============================================================================
program
    .command("safe-chat")
    .alias("sc")
    .description("Interactive chat with LLM (Claude/OpenAI) with automatic PHI redaction")
    .option("--provider <provider>", "LLM provider: claude, openai, ollama", "claude")
    .option("--api-key <key>", "API key (or use ANTHROPIC_API_KEY/OPENAI_API_KEY env var)")
    .option("--model <model>", "Model to use (e.g., claude-sonnet-4-20250514, gpt-4o)")
    .option("--base-url <url>", "Custom API base URL")
    .option("--max-tokens <n>", "Maximum response tokens", "4096")
    .option("--temperature <n>", "Temperature for responses", "0.7")
    .option("--system <preset>", "Safety instruction preset: standard, clinical, research, strict", "standard")
    .option("--no-safety-instructions", "Disable automatic safety instruction injection")
    .action(async (options) => {
    await (0, LLMIntegration_1.handleSafeChat)(options);
});
// ============================================================================
// QUERY COMMAND - One-shot LLM query with redaction
// ============================================================================
program
    .command("query")
    .description("Send a one-shot query to LLM with automatic PHI redaction")
    .argument("<text>", "Text to send (or file path)")
    .option("--provider <provider>", "LLM provider: claude, openai, ollama", "claude")
    .option("--api-key <key>", "API key (or use ANTHROPIC_API_KEY/OPENAI_API_KEY env var)")
    .option("--model <model>", "Model to use")
    .option("--max-tokens <n>", "Maximum response tokens", "4096")
    .option("--show-redacted", "Show the redacted input that was sent")
    .option("--no-safety-instructions", "Disable automatic safety instruction injection")
    .action(async (text, options) => {
    await (0, LLMIntegration_1.handleQuery)(text, options);
});
// ============================================================================
// NATIVE CHAT COMMAND - Full Streaming Chat Experience (requires API key)
// ============================================================================
program
    .command("chat")
    .alias("c")
    .description("Native streaming chat with tool calling (like Claude Code/Gemini CLI)")
    .option("--provider <provider>", "API provider: anthropic, openai, openrouter, ollama, custom")
    .option("--model <model>", "Model to use (auto-discovered if not specified)")
    .option("--api-key <key>", "API key (or use ANTHROPIC_API_KEY/OPENAI_API_KEY env)")
    .option("--base-url <url>", "Custom API base URL")
    .option("--max-tokens <n>", "Maximum response tokens", "8192")
    .option("--mode <mode>", "Mode: dev (full access), qa (read-only), production", "dev")
    .option("-v, --verbose", "Verbose output (show all logs)")
    .option("--subagents", "Enable subagent orchestration mode")
    .option("--subagent-model <model>", "Model for subagents (default: haiku)")
    .option("--subagent-provider <provider>", "Provider for subagents")
    .option("--subagent-api-key <key>", "API key for subagents (if different)")
    .option("--parallel <n>", "Max parallel subagents", "3")
    .action(async (options) => {
    await (0, NativeChat_1.handleNativeChat)(options);
});
// ============================================================================
// AGENT COMMAND - AI-Powered Redaction Development (wraps external CLIs)
// ============================================================================
program
    .command("agent")
    .alias("a")
    .description("AI-powered redaction development agent (integrates with Claude Code, Codex, Copilot)")
    .option("--mode <mode>", "Agent mode: dev (full access), qa (read-only), production (redacted only)", "dev")
    .option("--backend <backend>", "LLM backend: claude (Claude Code), codex, copilot, openai", "claude")
    .option("--model <model>", "Model to use (e.g., sonnet, opus, o3)")
    .option("--api-key <key>", "API key (for direct API backends)")
    .option("-v, --verbose", "Verbose output (show redaction logs)")
    .action(async (options) => {
    await (0, Agent_1.handleAgent)(options);
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
    .action(async (command, args, options) => {
    // Import dynamically to avoid circular deps
    const { handleAgent } = await Promise.resolve().then(() => __importStar(require("./Agent")));
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
    await (0, VulpesIntegration_1.handleVulpesify)(options);
});
// ============================================================================
// CC COMMAND - Quick Claude Code wrapper (no API key needed)
// ============================================================================
program
    .command("cc")
    .description("Quick launch Claude Code with Vulpes context (no API key needed)")
    .option("--mode <mode>", "Mode: dev, qa, production", "dev")
    .option("--model <model>", "Claude model to use")
    .action(async (options) => {
    await (0, Agent_1.handleAgent)({ ...options, backend: "claude" });
});
// ============================================================================
// DEFAULT BEHAVIOR - Show help or run interactive
// ============================================================================
program.action(async () => {
    // If no command specified, show help with the beautiful banner
    console.log(CLI_1.CLI.getBanner());
    program.help();
});
// Parse and execute
program.parseAsync(process.argv).catch((err) => {
    CLI_1.CLI.error(err.message);
    process.exit(1);
});
//# sourceMappingURL=index.js.map