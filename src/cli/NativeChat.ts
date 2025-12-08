/**
 * ============================================================================
 * VULPES NATIVE CHAT - Universal API Chat with Streaming
 * ============================================================================
 *
 * A beautiful, native streaming chat experience supporting multiple providers:
 * - Anthropic (Claude)
 * - OpenAI (GPT)
 * - OpenRouter (100+ models)
 * - Ollama (Local)
 * - Custom endpoints
 *
 * Features:
 * - Interactive provider/model selection with auto-discovery
 * - Streaming API responses (token by token)
 * - Tool calling (files, tests, redaction)
 * - Interactive redaction mode
 * - Quick redact command
 * - System info display
 * - Full Vulpes engine integration
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { spawn } from "child_process";
import chalk from "chalk";
import ora, { Ora } from "ora";
import boxen from "boxen";
import figures from "figures";
import { Marked } from "marked";
import { markedTerminal } from "marked-terminal";

import { VulpesCelare, RedactionResult } from "../VulpesCelare";
import { VERSION, ENGINE_NAME } from "../index";
import { getSystemPrompt } from "./SystemPrompts";
import {
  APIProvider,
  PROVIDERS,
  interactiveProviderSetup,
  createProviderFromOptions,
  Message,
  ContentBlock,
  Tool,
  StreamEvent,
} from "./APIProvider";
import {
  SubagentOrchestrator,
  createOrchestrator,
  SubagentResult,
} from "./SubagentOrchestrator";

// Initialize marked with terminal renderer
const marked = new Marked(
  markedTerminal({
    code: chalk.hex("#60A5FA"),
    blockquote: chalk.hex("#95A5A6").italic,
    heading: chalk.hex("#FF6B35").bold,
    firstHeading: chalk.hex("#FF6B35").bold,
    hr: chalk.hex("#4ECDC4"),
    listitem: chalk.hex("#FFFFFF"),
    paragraph: chalk.hex("#FFFFFF"),
    strong: chalk.hex("#FFE66D").bold,
    em: chalk.italic,
    codespan: chalk.hex("#60A5FA").bgHex("#1a1a2e"),
    link: chalk.hex("#4ECDC4").underline,
    reflowText: true,
    width: 100,
    tab: 2,
  }),
);

// ============================================================================
// TYPES
// ============================================================================

interface ChatConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens: number;
  workingDir: string;
  mode: "dev" | "qa" | "production";
  verbose: boolean;
  // Subagent configuration
  subagentsEnabled?: boolean;
  subagentProvider?: string;
  subagentModel?: string;
  subagentApiKey?: string;
  maxParallelSubagents?: number;
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
  tool: chalk.hex("#EC4899"),
  code: chalk.hex("#60A5FA"),
  user: chalk.hex("#10B981"),
};

// ============================================================================
// TOOLS DEFINITION
// ============================================================================

const VULPES_TOOLS: Tool[] = [
  {
    name: "redact_text",
    description:
      "Redact PHI from text using Vulpes Celare. Returns redacted text and breakdown.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to redact PHI from" },
      },
      required: ["text"],
    },
  },
  {
    name: "analyze_redaction",
    description:
      "Analyze text for PHI without redacting. Shows what would be detected.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to analyze" },
      },
      required: ["text"],
    },
  },
  {
    name: "read_file",
    description: "Read the contents of a file.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file" },
        content: { type: "string", description: "Content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "run_command",
    description: "Run a shell command and return output.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Command to run" },
      },
      required: ["command"],
    },
  },
  {
    name: "list_files",
    description: "List files in a directory.",
    input_schema: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Directory to list" },
        pattern: { type: "string", description: "Optional glob pattern" },
      },
      required: ["directory"],
    },
  },
  {
    name: "search_code",
    description: "Search for a pattern in the codebase.",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex pattern to search" },
        path: { type: "string", description: "Path to search in" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "get_system_info",
    description: "Get Vulpes system information and configuration.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "run_tests",
    description: "Run the Vulpes test suite.",
    input_schema: {
      type: "object",
      properties: {
        filter: { type: "string", description: "Optional test filter" },
      },
    },
  },
];

// ============================================================================
// NATIVE CHAT CLASS
// ============================================================================

export class NativeChat {
  private config: ChatConfig;
  private vulpes: VulpesCelare;
  private provider: APIProvider | null = null;
  private orchestrator: SubagentOrchestrator | null = null;
  private messages: Message[] = [];
  private renderMarkdownEnabled: boolean = true;
  private interactiveRedactionActive: boolean = false;
  private subagentsEnabled: boolean = false;

  constructor(config: Partial<ChatConfig>) {
    this.config = {
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      maxTokens: config.maxTokens || 8192,
      workingDir: config.workingDir || process.cwd(),
      mode: config.mode || "dev",
      verbose: config.verbose || false,
      subagentsEnabled: config.subagentsEnabled || false,
      subagentProvider: config.subagentProvider,
      subagentModel: config.subagentModel,
      subagentApiKey: config.subagentApiKey,
      maxParallelSubagents: config.maxParallelSubagents || 3,
    };

    if (!this.config.verbose) {
      process.env.VULPES_QUIET = "1";
    }

    this.vulpes = new VulpesCelare();
    this.subagentsEnabled = this.config.subagentsEnabled || false;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY
  // ══════════════════════════════════════════════════════════════════════════

  async start(): Promise<void> {
    // Try to create provider from options
    this.provider = createProviderFromOptions({
      provider: this.config.provider,
      apiKey: this.config.apiKey,
      model: this.config.model,
      baseUrl: this.config.baseUrl,
    });

    // If no provider (missing API key), do interactive setup
    if (!this.provider) {
      console.log(
        theme.info.bold(
          "\n  No API key configured. Let's set up a provider.\n",
        ),
      );

      const result = await interactiveProviderSetup();
      if (!result) {
        console.log(theme.error("\n  Setup cancelled.\n"));
        process.exit(1);
      }

      this.provider = result.provider;
    } else if (!this.provider.getModel()) {
      // Have provider but no model - fetch and select
      const spinner = ora("Fetching models...").start();
      try {
        const models = await this.provider.fetchAvailableModels();
        spinner.succeed(`Found ${models.length} models`);

        if (models.length > 0) {
          // Default to first model or a sensible default
          const defaultModel = models[0].id;
          this.provider.setModel(defaultModel);
          console.log(theme.success(`  Using model: ${defaultModel}`));
        }
      } catch (e: any) {
        spinner.fail(`Failed to fetch models: ${e.message}`);
        process.exit(1);
      }
    }

    // Initialize subagent orchestrator if enabled
    if (this.subagentsEnabled && this.provider) {
      this.initializeOrchestrator();
    }

    // Initialize conversation with system prompt
    this.initializeConversation();

    this.printBanner();
    await this.chatLoop();
  }

  private initializeOrchestrator(): void {
    this.orchestrator = createOrchestrator({
      mainProvider: this.config.provider,
      mainModel: this.config.model,
      mainApiKey: this.config.apiKey,
      subagentProvider: this.config.subagentProvider || this.config.provider,
      subagentModel: this.config.subagentModel || "claude-3-5-haiku-20241022",
      subagentApiKey: this.config.subagentApiKey || this.config.apiKey,
      maxParallel: this.config.maxParallelSubagents,
      mode: this.config.mode,
      verbose: this.config.verbose,
    });
  }

  private initializeConversation(): void {
    const systemPrompt = getSystemPrompt(this.config.mode);

    this.messages = [{ role: "system", content: systemPrompt }];
  }

  private printBanner(): void {
    const providerName = this.provider?.getProviderName() || "Unknown";
    const modelName = this.provider?.getModel() || "Unknown";
    const subagentStatus = this.subagentsEnabled
      ? `${theme.success(figures.tick)} Subagents: ${this.config.subagentModel || "haiku"} (${this.config.maxParallelSubagents}x parallel)`
      : `${theme.muted(figures.circle)} Subagents: OFF (/subagents to enable)`;

    console.log(
      boxen(
        `${theme.primary.bold("VULPES NATIVE CHAT")}\n` +
          `${theme.muted(ENGINE_NAME + " v" + VERSION)}\n\n` +
          `${theme.muted("Provider:")} ${theme.secondary(providerName)}\n` +
          `${theme.muted("Model:")} ${theme.secondary(modelName)}\n` +
          `${theme.muted("Mode:")} ${theme.warning(this.config.mode.toUpperCase())}\n\n` +
          `${theme.success(figures.tick)} Streaming responses\n` +
          `${theme.success(figures.tick)} Tool calling (redaction, files, tests)\n` +
          `${subagentStatus}\n` +
          `${theme.success(figures.tick)} Quick redact: /redact <text>`,
        {
          padding: 1,
          margin: { top: 1, bottom: 0 },
          borderStyle: "round",
          borderColor: "#FF6B35",
          title: this.subagentsEnabled
            ? "VULPESIFIED ORCHESTRATOR"
            : "VULPESIFIED CHAT",
          titleAlignment: "center",
        },
      ),
    );
    console.log();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHAT LOOP
  // ══════════════════════════════════════════════════════════════════════════

  private async chatLoop(): Promise<void> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log(
      theme.muted(
        "  Commands: /help, /redact, /interactive, /info, /provider, /subagents, /orchestrate, /exit\n",
      ),
    );

    const prompt = () => {
      rl.question(theme.user("\nyou") + theme.muted(" > "), async (input) => {
        input = input.trim();

        if (!input) {
          prompt();
          return;
        }

        // Handle commands
        if (input.startsWith("/")) {
          const shouldContinue = await this.handleCommand(input, rl);
          if (shouldContinue) prompt();
          return;
        }

        // Add user message and stream response
        this.messages.push({ role: "user", content: input });
        await this.streamResponse();

        prompt();
      });
    };

    prompt();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STREAMING RESPONSE
  // ══════════════════════════════════════════════════════════════════════════

  private async streamResponse(): Promise<void> {
    if (!this.provider) {
      console.log(theme.error("  No provider configured."));
      return;
    }

    console.log();
    process.stdout.write(theme.agent("assistant") + theme.muted(" > "));

    let fullResponse = "";
    let toolUses: Array<{ id: string; name: string; input: any }> = [];
    let currentToolUse: { id: string; name: string; input: string } | null =
      null;

    try {
      const tools = this.provider.supportsTools() ? VULPES_TOOLS : undefined;

      for await (const event of this.provider.streamChat(this.messages, {
        maxTokens: this.config.maxTokens,
        tools,
      })) {
        switch (event.type) {
          case "text":
            if (event.text) {
              process.stdout.write(event.text);
              fullResponse += event.text;
            }
            break;

          case "tool_use_start":
            if (event.toolUse) {
              currentToolUse = {
                id: event.toolUse.id,
                name: event.toolUse.name,
                input: "",
              };
              console.log();
              console.log(
                theme.tool(
                  `  ${figures.pointer} Using tool: ${event.toolUse.name}`,
                ),
              );
            }
            break;

          case "tool_use_delta":
            // Handle streaming tool input if needed
            break;

          case "tool_use_end":
            if (currentToolUse) {
              try {
                const input = JSON.parse(currentToolUse.input || "{}");
                toolUses.push({
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input,
                });
              } catch (e) {
                // Skip invalid JSON
              }
              currentToolUse = null;
            }
            break;

          case "done":
            break;

          case "error":
            console.log(theme.error(`\n  Error: ${event.error}`));
            break;
        }
      }

      console.log();

      // Re-render with markdown if enabled
      if (
        this.renderMarkdownEnabled &&
        fullResponse &&
        this.hasMarkdown(fullResponse)
      ) {
        // Clear and re-render
        console.log(this.renderMarkdown(fullResponse));
      }

      // Execute tools if any
      if (toolUses.length > 0) {
        const contentBlocks: ContentBlock[] = [];
        if (fullResponse) {
          contentBlocks.push({ type: "text", text: fullResponse });
        }
        for (const tool of toolUses) {
          contentBlocks.push({
            type: "tool_use",
            id: tool.id,
            name: tool.name,
            input: tool.input,
          });
        }
        this.messages.push({ role: "assistant", content: contentBlocks });

        // Execute tools
        const toolResults: ContentBlock[] = [];
        for (const tool of toolUses) {
          const result = await this.executeTool(tool.name, tool.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tool.id,
            content: result,
          });
        }
        this.messages.push({ role: "user", content: toolResults });

        // Continue conversation
        await this.streamResponse();
      } else if (fullResponse) {
        this.messages.push({ role: "assistant", content: fullResponse });
      }
    } catch (error: any) {
      console.log();
      console.log(theme.error(`\n  ${figures.cross} Error: ${error.message}`));
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TOOL EXECUTION
  // ══════════════════════════════════════════════════════════════════════════

  private async executeTool(name: string, input: any): Promise<string> {
    console.log(theme.muted(`    Executing ${name}...`));

    try {
      switch (name) {
        case "redact_text":
          return await this.toolRedactText(input.text);
        case "analyze_redaction":
          return await this.toolAnalyzeRedaction(input.text);
        case "read_file":
          return await this.toolReadFile(input.path);
        case "write_file":
          return await this.toolWriteFile(input.path, input.content);
        case "run_command":
          return await this.toolRunCommand(input.command);
        case "list_files":
          return await this.toolListFiles(input.directory, input.pattern);
        case "search_code":
          return await this.toolSearchCode(input.pattern, input.path);
        case "get_system_info":
          return await this.toolGetSystemInfo();
        case "run_tests":
          return await this.toolRunTests(input.filter);
        default:
          return `Unknown tool: ${name}`;
      }
    } catch (error: any) {
      return `Error executing ${name}: ${error.message}`;
    }
  }

  private async toolRedactText(text: string): Promise<string> {
    const result = await this.vulpes.process(text);
    let output = `REDACTED TEXT:\n${result.text}\n\n`;
    output += `STATISTICS:\n- PHI found: ${result.redactionCount}\n- Time: ${result.executionTimeMs}ms\n`;
    if (Object.keys(result.breakdown).length > 0) {
      output += `\nBREAKDOWN:\n`;
      for (const [type, count] of Object.entries(result.breakdown)) {
        output += `- ${type}: ${count}\n`;
      }
    }
    console.log(
      theme.success(
        `    ${figures.tick} Redacted ${result.redactionCount} PHI`,
      ),
    );
    return output;
  }

  private async toolAnalyzeRedaction(text: string): Promise<string> {
    const result = await this.vulpes.process(text);
    let output = `ANALYSIS:\nOriginal: ${text.length} chars\nPHI found: ${result.redactionCount}\n\n`;
    output += `ORIGINAL:\n${text}\n\nREDACTED:\n${result.text}\n`;
    if (Object.keys(result.breakdown).length > 0) {
      output += `\nBREAKDOWN:\n`;
      for (const [type, count] of Object.entries(result.breakdown)) {
        output += `- ${type}: ${count}\n`;
      }
    }
    return output;
  }

  private async toolReadFile(filePath: string): Promise<string> {
    const fullPath = path.resolve(this.config.workingDir, filePath);
    if (!fs.existsSync(fullPath)) return `File not found: ${filePath}`;
    const content = fs.readFileSync(fullPath, "utf-8");
    console.log(
      theme.success(`    ${figures.tick} Read ${content.length} bytes`),
    );
    return content;
  }

  private async toolWriteFile(
    filePath: string,
    content: string,
  ): Promise<string> {
    if (this.config.mode !== "dev")
      return "File writing only allowed in dev mode";
    const fullPath = path.resolve(this.config.workingDir, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    console.log(
      theme.success(`    ${figures.tick} Wrote ${content.length} bytes`),
    );
    return `Wrote ${content.length} bytes to ${filePath}`;
  }

  private async toolRunCommand(command: string): Promise<string> {
    return new Promise((resolve) => {
      const proc = spawn(command, [], {
        cwd: this.config.workingDir,
        shell: true,
        stdio: "pipe",
      });
      let output = "";
      proc.stdout?.on("data", (d) => {
        output += d.toString();
      });
      proc.stderr?.on("data", (d) => {
        output += d.toString();
      });
      proc.on("close", (code) => {
        console.log(
          `    ${code === 0 ? theme.success(figures.tick) : theme.error(figures.cross)} Exit code ${code}`,
        );
        resolve(output || `Exit code ${code}`);
      });
    });
  }

  private async toolListFiles(
    directory: string,
    pattern?: string,
  ): Promise<string> {
    const fullPath = path.resolve(this.config.workingDir, directory);
    if (!fs.existsSync(fullPath)) return `Directory not found: ${directory}`;
    let files = fs
      .readdirSync(fullPath, { withFileTypes: true })
      .map((e) => (e.isDirectory() ? e.name + "/" : e.name));
    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      files = files.filter((f) => regex.test(f));
    }
    return files.join("\n");
  }

  private async toolSearchCode(
    pattern: string,
    searchPath?: string,
  ): Promise<string> {
    const targetPath = searchPath || this.config.workingDir;
    const cmd = `grep -r "${pattern}" "${targetPath}" -n --color=never 2>/dev/null | head -50`;
    return this.toolRunCommand(cmd);
  }

  private async toolGetSystemInfo(): Promise<string> {
    const filters = this.vulpes.getActiveFilters();
    return JSON.stringify(
      {
        engine: ENGINE_NAME,
        version: VERSION,
        mode: this.config.mode,
        provider: this.provider?.getProviderName(),
        model: this.provider?.getModel(),
        activeFilters: filters.length,
        hipaaCompliance: "17/18 Safe Harbor",
        targetMetrics: { sensitivity: "≥99%", specificity: "≥96%" },
      },
      null,
      2,
    );
  }

  private async toolRunTests(filter?: string): Promise<string> {
    let cmd = "npm test";
    if (filter) cmd += ` -- --filter="${filter}"`;
    return this.toolRunCommand(cmd);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMMANDS
  // ══════════════════════════════════════════════════════════════════════════

  private async handleCommand(
    input: string,
    rl: readline.Interface,
  ): Promise<boolean> {
    const [cmd, ...args] = input.slice(1).split(" ");

    switch (cmd.toLowerCase()) {
      case "exit":
      case "quit":
      case "q":
        console.log(theme.info("\n  Goodbye!\n"));
        rl.close();
        process.exit(0);
        return false;

      case "help":
      case "h":
        this.printHelp();
        break;

      case "redact":
      case "r":
        if (args.length > 0) {
          await this.quickRedact(args.join(" "));
        } else {
          console.log(theme.warning("  Usage: /redact <text>"));
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

      case "provider":
      case "p":
        await this.changeProvider();
        break;

      case "clear":
        this.initializeConversation();
        console.log(theme.success("  Conversation cleared."));
        break;

      case "model":
      case "m":
        if (args.length > 0) {
          this.provider?.setModel(args[0]);
          console.log(theme.success(`  Model changed to: ${args[0]}`));
        } else {
          console.log(
            theme.info(`  Current model: ${this.provider?.getModel()}`),
          );
        }
        break;

      case "markdown":
      case "md":
        this.renderMarkdownEnabled = !this.renderMarkdownEnabled;
        console.log(
          theme.success(
            `  Markdown rendering: ${this.renderMarkdownEnabled ? "ON" : "OFF"}`,
          ),
        );
        break;

      case "subagents":
      case "sub":
      case "s":
        await this.toggleSubagents(rl);
        break;

      case "orchestrate":
      case "o":
        if (args.length > 0) {
          await this.orchestrateTask(args.join(" "));
        } else {
          console.log(
            theme.warning("  Usage: /orchestrate <task description>"),
          );
        }
        break;

      default:
        console.log(theme.warning(`  Unknown command: /${cmd}`));
        console.log(theme.muted("  Type /help for commands"));
    }

    return true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUICK REDACT
  // ══════════════════════════════════════════════════════════════════════════

  private async quickRedact(text: string): Promise<void> {
    const result = await this.vulpes.process(text);

    console.log();
    console.log(theme.muted("  " + "─".repeat(60)));
    console.log(theme.warning.bold("  ORIGINAL: ") + text);
    console.log(theme.success.bold("  REDACTED: ") + result.text);
    console.log(
      theme.muted(
        `  (${result.redactionCount} PHI, ${result.executionTimeMs}ms)`,
      ),
    );
    console.log(theme.muted("  " + "─".repeat(60)));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INTERACTIVE REDACTION
  // ══════════════════════════════════════════════════════════════════════════

  private async interactiveRedaction(rl: readline.Interface): Promise<void> {
    console.log(theme.info.bold("\n  INTERACTIVE REDACTION MODE"));
    console.log(theme.muted("  Paste text to redact. Empty line to exit.\n"));

    let stats = { docs: 0, phi: 0, time: 0 };

    const interactivePrompt = (): Promise<void> => {
      return new Promise((resolve) => {
        rl.question(theme.accent("  redact > "), async (line) => {
          if (!line.trim()) {
            console.log(
              theme.info(
                `\n  Session: ${stats.docs} docs, ${stats.phi} PHI, ${stats.time}ms\n`,
              ),
            );
            resolve();
            return;
          }

          const result = await this.vulpes.process(line);
          console.log(theme.success("  → ") + result.text);
          console.log(
            theme.muted(
              `    (${result.redactionCount} PHI, ${result.executionTimeMs}ms)\n`,
            ),
          );

          stats.docs++;
          stats.phi += result.redactionCount;
          stats.time += result.executionTimeMs;

          interactivePrompt().then(resolve);
        });
      });
    };

    await interactivePrompt();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SUBAGENT CONTROL
  // ══════════════════════════════════════════════════════════════════════════

  private async toggleSubagents(rl: readline.Interface): Promise<void> {
    if (this.subagentsEnabled) {
      // Disable subagents
      this.subagentsEnabled = false;
      this.orchestrator = null;
      console.log(theme.warning(`\n  ${figures.cross} Subagents DISABLED\n`));
      return;
    }

    // Enable subagents - configure
    console.log(theme.info.bold("\n  SUBAGENT CONFIGURATION"));
    console.log(theme.muted("  " + "─".repeat(50)));

    // Ask for subagent model
    const modelQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        console.log(theme.muted("\n  Subagent model options:"));
        console.log("    1. claude-3-5-haiku-20241022 (fast, cheap)");
        console.log("    2. gpt-4o-mini (fast, cheap)");
        console.log("    3. Same as main model");
        console.log("    4. Custom model ID");

        rl.question(theme.accent("  Select [1-4]: "), async (choice) => {
          switch (choice.trim()) {
            case "1":
              resolve("claude-3-5-haiku-20241022");
              break;
            case "2":
              resolve("gpt-4o-mini");
              break;
            case "3":
              resolve(this.provider?.getModel() || "claude-3-5-haiku-20241022");
              break;
            case "4":
              rl.question(theme.accent("  Model ID: "), (id) => {
                resolve(id.trim() || "claude-3-5-haiku-20241022");
              });
              return;
            default:
              resolve("claude-3-5-haiku-20241022");
          }
        });
      });
    };

    const parallelQuestion = (): Promise<number> => {
      return new Promise((resolve) => {
        rl.question(
          theme.accent("  Max parallel subagents [3]: "),
          (answer) => {
            const num = parseInt(answer.trim()) || 3;
            resolve(Math.min(Math.max(num, 1), 10));
          },
        );
      });
    };

    const subagentModel = await modelQuestion();
    const maxParallel = await parallelQuestion();

    // Determine subagent provider based on model
    let subagentProvider = this.config.provider;
    if (subagentModel.includes("claude") || subagentModel.includes("haiku")) {
      subagentProvider = "anthropic";
    } else if (subagentModel.includes("gpt") || subagentModel.includes("o1")) {
      subagentProvider = "openai";
    }

    // Update config
    this.config.subagentModel = subagentModel;
    this.config.subagentProvider = subagentProvider;
    this.config.maxParallelSubagents = maxParallel;

    // Initialize orchestrator
    this.initializeOrchestrator();
    this.subagentsEnabled = true;

    console.log();
    console.log(theme.success(`  ${figures.tick} Subagents ENABLED`));
    console.log(theme.muted(`    Model: ${subagentModel}`));
    console.log(theme.muted(`    Provider: ${subagentProvider}`));
    console.log(theme.muted(`    Parallel: ${maxParallel}x`));
    console.log();
    console.log(theme.info("  Available subagent roles:"));
    console.log(
      theme.muted("    • redaction_analyst  - PHI detection & analysis"),
    );
    console.log(
      theme.muted("    • code_analyst       - Code review & debugging"),
    );
    console.log(
      theme.muted("    • validation_agent   - Test & verify changes"),
    );
    console.log(theme.muted("    • dictionary_agent   - Expand dictionaries"));
    console.log(theme.muted("    • research_agent     - Look up patterns"));
    console.log();
    console.log(
      theme.info("  Use /orchestrate <task> to delegate to subagents"),
    );
    console.log();
  }

  private async orchestrateTask(task: string): Promise<void> {
    if (!this.subagentsEnabled || !this.orchestrator) {
      console.log(
        theme.warning(
          `\n  ${figures.warning} Subagents not enabled. Use /subagents first.\n`,
        ),
      );
      return;
    }

    console.log();
    console.log(
      theme.agent.bold(`  ${figures.pointer} Orchestrating: `) +
        theme.muted(task),
    );
    console.log(theme.muted("  " + "─".repeat(50)));

    const spinner = ora({
      text: "Analyzing task and delegating to subagents...",
      color: "magenta",
    }).start();

    try {
      // Pass the current conversation history to orchestrator
      const result = await this.orchestrator.orchestrate(task, this.messages);

      spinner.succeed("Orchestration complete");
      console.log();

      // Display subagent results if any
      if (result.results && result.results.length > 0) {
        console.log(theme.info.bold("  SUBAGENT RESULTS"));
        console.log(theme.muted("  " + "─".repeat(50)));

        let totalTime = 0;
        for (const subResult of result.results) {
          const statusIcon = subResult.success
            ? theme.success(figures.tick)
            : theme.error(figures.cross);

          console.log(
            `\n  ${statusIcon} ${theme.secondary(subResult.role)} (${subResult.executionTimeMs}ms)`,
          );

          if (subResult.result) {
            // Truncate long results
            const output =
              subResult.result.length > 500
                ? subResult.result.slice(0, 500) + "..."
                : subResult.result;
            console.log(theme.muted("    " + output.replace(/\n/g, "\n    ")));
          }

          if (subResult.error) {
            console.log(theme.error(`    Error: ${subResult.error}`));
          }

          totalTime += subResult.executionTimeMs;
        }

        console.log();
        console.log(
          theme.muted(
            `  Total subagent time: ${totalTime}ms | Tasks: ${result.results.length}`,
          ),
        );
      }

      // Display the orchestrator's synthesized response
      console.log();
      console.log(theme.info.bold("  ORCHESTRATOR RESPONSE"));
      console.log(theme.muted("  " + "─".repeat(50)));
      console.log("  " + result.response.replace(/\n/g, "\n  "));
      console.log();

      // Add the orchestration as part of the conversation
      this.messages.push({ role: "user", content: `[ORCHESTRATE] ${task}` });
      this.messages.push({ role: "assistant", content: result.response });
    } catch (error: any) {
      spinner.fail(`Orchestration failed: ${error.message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CHANGE PROVIDER
  // ══════════════════════════════════════════════════════════════════════════

  private async changeProvider(): Promise<void> {
    const result = await interactiveProviderSetup();
    if (result) {
      this.provider = result.provider;
      this.initializeConversation();
      console.log(
        theme.success(
          `\n  ${figures.tick} Switched to ${result.provider.getProviderName()} / ${result.model}\n`,
        ),
      );
    }
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
    console.log(
      `  ${theme.muted("Provider:")}   ${this.provider?.getProviderName() || "None"}`,
    );
    console.log(
      `  ${theme.muted("Model:")}      ${this.provider?.getModel() || "None"}`,
    );
    console.log(
      `  ${theme.muted("Mode:")}       ${this.config.mode.toUpperCase()}`,
    );
    console.log(`  ${theme.muted("Filters:")}    ${filters.length} active`);
    console.log(
      `  ${theme.muted("HIPAA:")}      17/18 Safe Harbor identifiers`,
    );
    console.log();
    console.log(theme.muted("  Target Metrics:"));
    console.log(`    ${theme.success("Sensitivity:")} ≥99%`);
    console.log(`    ${theme.info("Specificity:")} ≥96%`);
    console.log(`    ${theme.secondary("Speed:")}       2-3ms/doc`);
    console.log();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELP
  // ══════════════════════════════════════════════════════════════════════════

  private printHelp(): void {
    console.log(`
${theme.info.bold("  COMMANDS")}
${theme.muted("  " + "─".repeat(50))}
  ${theme.secondary("/redact <text>")}       Quick redact text
  ${theme.secondary("/interactive")}         Enter interactive redaction mode
  ${theme.secondary("/info")}                Show system information
  ${theme.secondary("/provider")}            Change API provider
  ${theme.secondary("/model <id>")}          Change model
  ${theme.secondary("/clear")}               Clear conversation
  ${theme.secondary("/markdown")}            Toggle markdown rendering
  ${theme.secondary("/help")}                Show this help
  ${theme.secondary("/exit")}                Exit

${theme.agent.bold("  SUBAGENT COMMANDS")}
${theme.muted("  " + "─".repeat(50))}
  ${theme.secondary("/subagents")}           Toggle & configure subagent mode
  ${theme.secondary("/orchestrate <task>")}  Delegate task to subagents

${theme.muted("  Just type to chat, or paste clinical documents!")}
${this.subagentsEnabled ? theme.agent("  Subagents: ENABLED - orchestrator will delegate complex tasks") : ""}
`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MARKDOWN
  // ══════════════════════════════════════════════════════════════════════════

  private renderMarkdown(text: string): string {
    try {
      return (marked.parse(text) as string).trim();
    } catch {
      return text;
    }
  }

  private hasMarkdown(text: string): boolean {
    const patterns = [
      /```/,
      /`[^`]+`/,
      /\*\*[^*]+\*\*/,
      /^#+\s/m,
      /^\s*[-*]\s/m,
    ];
    return patterns.some((p) => p.test(text));
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export async function handleNativeChat(options: any): Promise<void> {
  const chat = new NativeChat({
    provider: options.provider,
    model: options.model,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    maxTokens: parseInt(options.maxTokens) || 8192,
    workingDir: process.cwd(),
    mode: options.mode || "dev",
    verbose: options.verbose,
    // Subagent options
    subagentsEnabled: options.subagents || false,
    subagentProvider: options.subagentProvider,
    subagentModel: options.subagentModel,
    subagentApiKey: options.subagentApiKey,
    maxParallelSubagents: parseInt(options.parallel) || 3,
  });

  await chat.start();
}
