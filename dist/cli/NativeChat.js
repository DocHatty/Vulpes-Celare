"use strict";
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
exports.NativeChat = void 0;
exports.handleNativeChat = handleNativeChat;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const SecurityUtils_1 = require("../utils/SecurityUtils");
const ora_1 = __importDefault(require("ora"));
const figures_1 = __importDefault(require("figures"));
const marked_1 = require("marked");
const marked_terminal_1 = require("marked-terminal");
const VulpesCelare_1 = require("../VulpesCelare");
const meta_1 = require("../meta");
const SystemPrompts_1 = require("./SystemPrompts");
const APIProvider_1 = require("./APIProvider");
const SubagentOrchestrator_1 = require("./SubagentOrchestrator");
// Import unified theme system
const theme_1 = require("../theme");
const output_1 = require("../theme/output");
const VulpesOutput_1 = require("../utils/VulpesOutput");
// Initialize marked with terminal renderer using theme colors
const marked = new marked_1.Marked((0, marked_terminal_1.markedTerminal)({
    code: chalk_1.default.hex(theme_1.terminal.codeBg).inverse,
    blockquote: chalk_1.default.hex("#95A5A6").italic,
    heading: chalk_1.default.hex(theme_1.brand.primary).bold,
    firstHeading: chalk_1.default.hex(theme_1.brand.primary).bold,
    hr: chalk_1.default.hex(theme_1.brand.secondary),
    listitem: chalk_1.default.hex("#FFFFFF"),
    paragraph: chalk_1.default.hex("#FFFFFF"),
    strong: chalk_1.default.hex(theme_1.brand.accent).bold,
    em: chalk_1.default.italic,
    codespan: chalk_1.default.hex("#60A5FA").bgHex(theme_1.terminal.codeBg),
    link: chalk_1.default.hex(theme_1.brand.secondary).underline,
    reflowText: true,
    width: 100,
    tab: 2,
}));
// Theme imported from unified theme system (../theme)
// ============================================================================
// TOOLS DEFINITION
// ============================================================================
const VULPES_TOOLS = [
    {
        name: "redact_text",
        description: "Redact PHI from text using Vulpes Celare. Returns redacted text and breakdown.",
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
        description: "Analyze text for PHI without redacting. Shows what would be detected.",
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
class NativeChat {
    config;
    vulpes;
    provider = null;
    orchestrator = null;
    messages = [];
    renderMarkdownEnabled = true;
    interactiveRedactionActive = false;
    subagentsEnabled = false;
    constructor(config) {
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
        this.vulpes = new VulpesCelare_1.VulpesCelare();
        this.subagentsEnabled = this.config.subagentsEnabled || false;
    }
    // ══════════════════════════════════════════════════════════════════════════
    // MAIN ENTRY
    // ══════════════════════════════════════════════════════════════════════════
    async start() {
        // Try to create provider from options
        this.provider = (0, APIProvider_1.createProviderFromOptions)({
            provider: this.config.provider,
            apiKey: this.config.apiKey,
            model: this.config.model,
            baseUrl: this.config.baseUrl,
        });
        // If no provider (missing API key), do interactive setup
        if (!this.provider) {
            VulpesOutput_1.out.print(theme_1.theme.info.bold("\n  No API key configured. Let's set up a provider.\n"));
            const result = await (0, APIProvider_1.interactiveProviderSetup)();
            if (!result) {
                VulpesOutput_1.out.print(theme_1.theme.error("\n  Setup cancelled.\n"));
                process.exit(1);
            }
            this.provider = result.provider;
        }
        else if (!this.provider.getModel()) {
            // Have provider but no model - fetch and select
            const spinner = (0, ora_1.default)("Fetching models...").start();
            try {
                const models = await this.provider.fetchAvailableModels();
                spinner.succeed(`Found ${models.length} models`);
                if (models.length > 0) {
                    // Default to first model or a sensible default
                    const defaultModel = models[0].id;
                    this.provider.setModel(defaultModel);
                    VulpesOutput_1.out.print(theme_1.theme.success(`  Using model: ${defaultModel}`));
                }
            }
            catch (e) {
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
        // Skip banner if launched from unified launcher (which already shows banner)
        if (!this.config.skipBanner) {
            this.printBanner();
        }
        await this.chatLoop();
    }
    initializeOrchestrator() {
        this.orchestrator = (0, SubagentOrchestrator_1.createOrchestrator)({
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
    initializeConversation() {
        const systemPrompt = (0, SystemPrompts_1.getSystemPrompt)(this.config.mode);
        this.messages = [{ role: "system", content: systemPrompt }];
    }
    printBanner() {
        const providerName = this.provider?.getProviderName() || "Unknown";
        const modelName = this.provider?.getModel() || "Unknown";
        const subagentStatus = this.subagentsEnabled
            ? output_1.Status.success(`Subagents: ${this.config.subagentModel || "haiku"} (${this.config.maxParallelSubagents}x parallel)`)
            : output_1.Status.pending("Subagents: OFF (/subagents to enable)");
        const content = [
            theme_1.theme.primary.bold("VULPES NATIVE CHAT"),
            theme_1.theme.muted(meta_1.ENGINE_NAME + " v" + meta_1.VERSION),
            "",
            `${theme_1.theme.muted("Provider:")} ${theme_1.theme.secondary(providerName)}`,
            `${theme_1.theme.muted("Model:")} ${theme_1.theme.secondary(modelName)}`,
            `${theme_1.theme.muted("Mode:")} ${theme_1.theme.warning(this.config.mode.toUpperCase())}`,
            "",
            output_1.Status.success("Streaming responses"),
            output_1.Status.success("Tool calling (redaction, files, tests)"),
            subagentStatus,
            output_1.Status.success("Quick redact: /redact <text>"),
        ];
        const title = this.subagentsEnabled ? "VULPESIFIED ORCHESTRATOR" : "VULPESIFIED CHAT";
        VulpesOutput_1.out.print("\n" + output_1.Box.vulpes(content, { title }));
        VulpesOutput_1.out.blank();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CHAT LOOP
    // ══════════════════════════════════════════════════════════════════════════
    async chatLoop() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        VulpesOutput_1.out.print(theme_1.theme.muted("  Commands: /help, /redact, /interactive, /info, /provider, /subagents, /orchestrate, /exit\n"));
        const prompt = () => {
            rl.question(theme_1.theme.user("\nyou") + theme_1.theme.muted(" > "), async (input) => {
                input = input.trim();
                if (!input) {
                    prompt();
                    return;
                }
                // Handle commands
                if (input.startsWith("/")) {
                    const shouldContinue = await this.handleCommand(input, rl);
                    if (shouldContinue)
                        prompt();
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
    async streamResponse() {
        if (!this.provider) {
            VulpesOutput_1.out.print(theme_1.theme.error("  No provider configured."));
            return;
        }
        VulpesOutput_1.out.blank();
        process.stdout.write(theme_1.theme.agent("assistant") + theme_1.theme.muted(" > "));
        let fullResponse = "";
        let toolUses = [];
        let currentToolUse = null;
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
                            VulpesOutput_1.out.blank();
                            VulpesOutput_1.out.print(theme_1.theme.tool(`  ${figures_1.default.pointer} Using tool: ${event.toolUse.name}`));
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
                            }
                            catch (e) {
                                // Skip invalid JSON
                            }
                            currentToolUse = null;
                        }
                        break;
                    case "done":
                        break;
                    case "error":
                        VulpesOutput_1.out.print(theme_1.theme.error(`\n  Error: ${event.error}`));
                        break;
                }
            }
            VulpesOutput_1.out.blank();
            // Re-render with markdown if enabled
            if (this.renderMarkdownEnabled &&
                fullResponse &&
                this.hasMarkdown(fullResponse)) {
                // Clear and re-render
                VulpesOutput_1.out.print(this.renderMarkdown(fullResponse));
            }
            // Execute tools if any
            if (toolUses.length > 0) {
                const contentBlocks = [];
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
                const toolResults = [];
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
            }
            else if (fullResponse) {
                this.messages.push({ role: "assistant", content: fullResponse });
            }
        }
        catch (error) {
            VulpesOutput_1.out.blank();
            VulpesOutput_1.out.print(theme_1.theme.error(`\n  ${figures_1.default.cross} Error: ${error.message}`));
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // TOOL EXECUTION
    // ══════════════════════════════════════════════════════════════════════════
    async executeTool(name, input) {
        VulpesOutput_1.out.print(theme_1.theme.muted(`    Executing ${name}...`));
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
        }
        catch (error) {
            return `Error executing ${name}: ${error.message}`;
        }
    }
    async toolRedactText(text) {
        const result = await this.vulpes.process(text);
        let output = `REDACTED TEXT:\n${result.text}\n\n`;
        output += `STATISTICS:\n- PHI found: ${result.redactionCount}\n- Time: ${result.executionTimeMs}ms\n`;
        if (Object.keys(result.breakdown).length > 0) {
            output += `\nBREAKDOWN:\n`;
            for (const [type, count] of Object.entries(result.breakdown)) {
                output += `- ${type}: ${count}\n`;
            }
        }
        VulpesOutput_1.out.print(theme_1.theme.success(`    ${figures_1.default.tick} Redacted ${result.redactionCount} PHI`));
        return output;
    }
    async toolAnalyzeRedaction(text) {
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
    async toolReadFile(filePath) {
        try {
            const fullPath = (0, SecurityUtils_1.validatePath)(this.config.workingDir, filePath);
            if (!fs.existsSync(fullPath))
                return `File not found: ${filePath}`;
            const content = fs.readFileSync(fullPath, "utf-8");
            VulpesOutput_1.out.print(theme_1.theme.success(`    ${figures_1.default.tick} Read ${content.length} bytes`));
            return content;
        }
        catch (error) {
            return `Security error: ${error.message}`;
        }
    }
    async toolWriteFile(filePath, content) {
        if (this.config.mode !== "dev")
            return "File writing only allowed in dev mode";
        try {
            const fullPath = (0, SecurityUtils_1.validatePath)(this.config.workingDir, filePath);
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            fs.writeFileSync(fullPath, content);
            VulpesOutput_1.out.print(theme_1.theme.success(`    ${figures_1.default.tick} Wrote ${content.length} bytes`));
            return `Wrote ${content.length} bytes to ${filePath}`;
        }
        catch (error) {
            return `Security error: ${error.message}`;
        }
    }
    async toolRunCommand(command) {
        return new Promise((resolve) => {
            // Use exec for shell command strings to avoid deprecation warning
            const proc = (0, child_process_1.spawn)(command, {
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
                VulpesOutput_1.out.print(`    ${code === 0 ? theme_1.theme.success(figures_1.default.tick) : theme_1.theme.error(figures_1.default.cross)} Exit code ${code}`);
                resolve(output || `Exit code ${code}`);
            });
        });
    }
    async toolListFiles(directory, pattern) {
        const fullPath = path.resolve(this.config.workingDir, directory);
        if (!fs.existsSync(fullPath))
            return `Directory not found: ${directory}`;
        let files = fs
            .readdirSync(fullPath, { withFileTypes: true })
            .map((e) => (e.isDirectory() ? e.name + "/" : e.name));
        if (pattern) {
            const regex = new RegExp(pattern.replace(/\*/g, ".*"));
            files = files.filter((f) => regex.test(f));
        }
        return files.join("\n");
    }
    async toolSearchCode(pattern, searchPath) {
        try {
            const targetPath = searchPath
                ? (0, SecurityUtils_1.validatePath)(this.config.workingDir, searchPath)
                : this.config.workingDir;
            return await (0, SecurityUtils_1.safeGrep)(pattern, targetPath, {
                recursive: true,
                maxResults: 50,
                cwd: this.config.workingDir,
            });
        }
        catch (error) {
            return `Search error: ${error.message}`;
        }
    }
    async toolGetSystemInfo() {
        const filters = this.vulpes.getActiveFilters();
        return JSON.stringify({
            engine: meta_1.ENGINE_NAME,
            version: meta_1.VERSION,
            mode: this.config.mode,
            provider: this.provider?.getProviderName(),
            model: this.provider?.getModel(),
            activeFilters: filters.length,
            hipaaCompliance: "17/18 Safe Harbor",
            targetMetrics: { sensitivity: "≥99%", specificity: "≥96%" },
        }, null, 2);
    }
    async toolRunTests(filter) {
        let cmd = "npm test";
        if (filter)
            cmd += ` -- --filter="${filter}"`;
        return this.toolRunCommand(cmd);
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
                VulpesOutput_1.out.print("\n  " + output_1.Status.info("Goodbye!") + "\n");
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
                }
                else {
                    VulpesOutput_1.out.print("  " + output_1.Status.warning("Usage: /redact <text>"));
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
                VulpesOutput_1.out.print(theme_1.theme.success("  Conversation cleared."));
                break;
            case "model":
            case "m":
                if (args.length > 0) {
                    this.provider?.setModel(args[0]);
                    VulpesOutput_1.out.print(theme_1.theme.success(`  Model changed to: ${args[0]}`));
                }
                else {
                    VulpesOutput_1.out.print(theme_1.theme.info(`  Current model: ${this.provider?.getModel()}`));
                }
                break;
            case "markdown":
            case "md":
                this.renderMarkdownEnabled = !this.renderMarkdownEnabled;
                VulpesOutput_1.out.print(theme_1.theme.success(`  Markdown rendering: ${this.renderMarkdownEnabled ? "ON" : "OFF"}`));
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
                }
                else {
                    VulpesOutput_1.out.print("  " + output_1.Status.warning("Usage: /orchestrate <task description>"));
                }
                break;
            default:
                VulpesOutput_1.out.print("  " + output_1.Status.warning(`Unknown command: /${cmd}`));
                VulpesOutput_1.out.print(theme_1.theme.muted("  Type /help for commands"));
        }
        return true;
    }
    // ══════════════════════════════════════════════════════════════════════════
    // QUICK REDACT
    // ══════════════════════════════════════════════════════════════════════════
    async quickRedact(text) {
        const result = await this.vulpes.process(text);
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(output_1.Divider.line({ width: 60 }));
        VulpesOutput_1.out.print(theme_1.theme.warning.bold("  ORIGINAL: ") + text);
        VulpesOutput_1.out.print(theme_1.theme.success.bold("  REDACTED: ") + result.text);
        VulpesOutput_1.out.print(theme_1.theme.muted(`  (${result.redactionCount} PHI, ${result.executionTimeMs}ms)`));
        VulpesOutput_1.out.print(output_1.Divider.line({ width: 60 }));
    }
    // ══════════════════════════════════════════════════════════════════════════
    // INTERACTIVE REDACTION
    // ══════════════════════════════════════════════════════════════════════════
    async interactiveRedaction(rl) {
        VulpesOutput_1.out.print(theme_1.theme.info.bold("\n  INTERACTIVE REDACTION MODE"));
        VulpesOutput_1.out.print(theme_1.theme.muted("  Paste text to redact. Empty line to exit.\n"));
        let stats = { docs: 0, phi: 0, time: 0 };
        const interactivePrompt = () => {
            return new Promise((resolve) => {
                rl.question(theme_1.theme.accent("  redact > "), async (line) => {
                    if (!line.trim()) {
                        VulpesOutput_1.out.print(theme_1.theme.info(`\n  Session: ${stats.docs} docs, ${stats.phi} PHI, ${stats.time}ms\n`));
                        resolve();
                        return;
                    }
                    const result = await this.vulpes.process(line);
                    VulpesOutput_1.out.print(theme_1.theme.success("  → ") + result.text);
                    VulpesOutput_1.out.print(theme_1.theme.muted(`    (${result.redactionCount} PHI, ${result.executionTimeMs}ms)\n`));
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
    async toggleSubagents(rl) {
        if (this.subagentsEnabled) {
            // Disable subagents
            this.subagentsEnabled = false;
            this.orchestrator = null;
            VulpesOutput_1.out.print(theme_1.theme.warning(`\n  ${figures_1.default.cross} Subagents DISABLED\n`));
            return;
        }
        // Enable subagents - configure
        VulpesOutput_1.out.print(theme_1.theme.info.bold("\n  SUBAGENT CONFIGURATION"));
        VulpesOutput_1.out.print(theme_1.theme.muted("  " + "─".repeat(50)));
        // Ask for subagent model
        const modelQuestion = () => {
            return new Promise((resolve) => {
                VulpesOutput_1.out.print(theme_1.theme.muted("\n  Subagent model options:"));
                VulpesOutput_1.out.print("    1. claude-3-5-haiku-20241022 (fast, cheap)");
                VulpesOutput_1.out.print("    2. gpt-4o-mini (fast, cheap)");
                VulpesOutput_1.out.print("    3. Same as main model");
                VulpesOutput_1.out.print("    4. Custom model ID");
                rl.question(theme_1.theme.accent("  Select [1-4]: "), async (choice) => {
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
                            rl.question(theme_1.theme.accent("  Model ID: "), (id) => {
                                resolve(id.trim() || "claude-3-5-haiku-20241022");
                            });
                            return;
                        default:
                            resolve("claude-3-5-haiku-20241022");
                    }
                });
            });
        };
        const parallelQuestion = () => {
            return new Promise((resolve) => {
                rl.question(theme_1.theme.accent("  Max parallel subagents [3]: "), (answer) => {
                    const num = parseInt(answer.trim()) || 3;
                    resolve(Math.min(Math.max(num, 1), 10));
                });
            });
        };
        const subagentModel = await modelQuestion();
        const maxParallel = await parallelQuestion();
        // Determine subagent provider based on model
        let subagentProvider = this.config.provider;
        if (subagentModel.includes("claude") || subagentModel.includes("haiku")) {
            subagentProvider = "anthropic";
        }
        else if (subagentModel.includes("gpt") || subagentModel.includes("o1")) {
            subagentProvider = "openai";
        }
        // Update config
        this.config.subagentModel = subagentModel;
        this.config.subagentProvider = subagentProvider;
        this.config.maxParallelSubagents = maxParallel;
        // Initialize orchestrator
        this.initializeOrchestrator();
        this.subagentsEnabled = true;
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(theme_1.theme.success(`  ${figures_1.default.tick} Subagents ENABLED`));
        VulpesOutput_1.out.print(theme_1.theme.muted(`    Model: ${subagentModel}`));
        VulpesOutput_1.out.print(theme_1.theme.muted(`    Provider: ${subagentProvider}`));
        VulpesOutput_1.out.print(theme_1.theme.muted(`    Parallel: ${maxParallel}x`));
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(theme_1.theme.info("  Available subagent roles:"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    • redaction_analyst  - PHI detection & analysis"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    • code_analyst       - Code review & debugging"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    • validation_agent   - Test & verify changes"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    • dictionary_agent   - Expand dictionaries"));
        VulpesOutput_1.out.print(theme_1.theme.muted("    • research_agent     - Look up patterns"));
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(theme_1.theme.info("  Use /orchestrate <task> to delegate to subagents"));
        VulpesOutput_1.out.blank();
    }
    async orchestrateTask(task) {
        if (!this.subagentsEnabled || !this.orchestrator) {
            VulpesOutput_1.out.print(theme_1.theme.warning(`\n  ${figures_1.default.warning} Subagents not enabled. Use /subagents first.\n`));
            return;
        }
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(theme_1.theme.agent.bold(`  ${figures_1.default.pointer} Orchestrating: `) +
            theme_1.theme.muted(task));
        VulpesOutput_1.out.print(theme_1.theme.muted("  " + "─".repeat(50)));
        const spinner = (0, ora_1.default)({
            text: "Analyzing task and delegating to subagents...",
            color: "magenta",
        }).start();
        try {
            // Pass the current conversation history to orchestrator
            const result = await this.orchestrator.orchestrate(task, this.messages);
            spinner.succeed("Orchestration complete");
            VulpesOutput_1.out.blank();
            // Display subagent results if any
            if (result.results && result.results.length > 0) {
                VulpesOutput_1.out.print(theme_1.theme.info.bold("  SUBAGENT RESULTS"));
                VulpesOutput_1.out.print(theme_1.theme.muted("  " + "─".repeat(50)));
                let totalTime = 0;
                for (const subResult of result.results) {
                    const statusIcon = subResult.success
                        ? theme_1.theme.success(figures_1.default.tick)
                        : theme_1.theme.error(figures_1.default.cross);
                    VulpesOutput_1.out.print(`\n  ${statusIcon} ${theme_1.theme.secondary(subResult.role)} (${subResult.executionTimeMs}ms)`);
                    if (subResult.result) {
                        // Truncate long results
                        const output = subResult.result.length > 500
                            ? subResult.result.slice(0, 500) + "..."
                            : subResult.result;
                        VulpesOutput_1.out.print(theme_1.theme.muted("    " + output.replace(/\n/g, "\n    ")));
                    }
                    if (subResult.error) {
                        VulpesOutput_1.out.print(theme_1.theme.error(`    Error: ${subResult.error}`));
                    }
                    totalTime += subResult.executionTimeMs;
                }
                VulpesOutput_1.out.blank();
                VulpesOutput_1.out.print(theme_1.theme.muted(`  Total subagent time: ${totalTime}ms | Tasks: ${result.results.length}`));
            }
            // Display the orchestrator's synthesized response
            VulpesOutput_1.out.blank();
            VulpesOutput_1.out.print(theme_1.theme.info.bold("  ORCHESTRATOR RESPONSE"));
            VulpesOutput_1.out.print(theme_1.theme.muted("  " + "─".repeat(50)));
            VulpesOutput_1.out.print("  " + result.response.replace(/\n/g, "\n  "));
            VulpesOutput_1.out.blank();
            // Add the orchestration as part of the conversation
            this.messages.push({ role: "user", content: `[ORCHESTRATE] ${task}` });
            this.messages.push({ role: "assistant", content: result.response });
        }
        catch (error) {
            spinner.fail(`Orchestration failed: ${error.message}`);
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CHANGE PROVIDER
    // ══════════════════════════════════════════════════════════════════════════
    async changeProvider() {
        const result = await (0, APIProvider_1.interactiveProviderSetup)();
        if (result) {
            this.provider = result.provider;
            this.initializeConversation();
            VulpesOutput_1.out.print(theme_1.theme.success(`\n  ${figures_1.default.tick} Switched to ${result.provider.getProviderName()} / ${result.model}\n`));
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // SYSTEM INFO
    // ══════════════════════════════════════════════════════════════════════════
    async printSystemInfo() {
        const filters = this.vulpes.getActiveFilters();
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(theme_1.theme.info.bold("  VULPES CELARE SYSTEM INFO"));
        VulpesOutput_1.out.print(theme_1.theme.muted("  " + "─".repeat(50)));
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Engine:")}     ${meta_1.ENGINE_NAME}`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Version:")}    ${meta_1.VERSION}`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Provider:")}   ${this.provider?.getProviderName() || "None"}`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Model:")}      ${this.provider?.getModel() || "None"}`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Mode:")}       ${this.config.mode.toUpperCase()}`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("Filters:")}    ${filters.length} active`);
        VulpesOutput_1.out.print(`  ${theme_1.theme.muted("HIPAA:")}      17/18 Safe Harbor identifiers`);
        VulpesOutput_1.out.blank();
        VulpesOutput_1.out.print(theme_1.theme.muted("  Target Metrics:"));
        VulpesOutput_1.out.print(`    ${theme_1.theme.success("Sensitivity:")} ≥99%`);
        VulpesOutput_1.out.print(`    ${theme_1.theme.info("Specificity:")} ≥96%`);
        VulpesOutput_1.out.print(`    ${theme_1.theme.secondary("Speed:")}       2-3ms/doc`);
        VulpesOutput_1.out.blank();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // HELP
    // ══════════════════════════════════════════════════════════════════════════
    printHelp() {
        VulpesOutput_1.out.print(`
${theme_1.theme.info.bold("  COMMANDS")}
${theme_1.theme.muted("  " + "─".repeat(50))}
  ${theme_1.theme.secondary("/redact <text>")}       Quick redact text
  ${theme_1.theme.secondary("/interactive")}         Enter interactive redaction mode
  ${theme_1.theme.secondary("/info")}                Show system information
  ${theme_1.theme.secondary("/provider")}            Change API provider
  ${theme_1.theme.secondary("/model <id>")}          Change model
  ${theme_1.theme.secondary("/clear")}               Clear conversation
  ${theme_1.theme.secondary("/markdown")}            Toggle markdown rendering
  ${theme_1.theme.secondary("/help")}                Show this help
  ${theme_1.theme.secondary("/exit")}                Exit

${theme_1.theme.agent.bold("  SUBAGENT COMMANDS")}
${theme_1.theme.muted("  " + "─".repeat(50))}
  ${theme_1.theme.secondary("/subagents")}           Toggle & configure subagent mode
  ${theme_1.theme.secondary("/orchestrate <task>")}  Delegate task to subagents

${theme_1.theme.muted("  Just type to chat, or paste clinical documents!")}
${this.subagentsEnabled ? theme_1.theme.agent("  Subagents: ENABLED - orchestrator will delegate complex tasks") : ""}
`);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // MARKDOWN
    // ══════════════════════════════════════════════════════════════════════════
    renderMarkdown(text) {
        try {
            return marked.parse(text).trim();
        }
        catch {
            return text;
        }
    }
    hasMarkdown(text) {
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
exports.NativeChat = NativeChat;
// ============================================================================
// HANDLER
// ============================================================================
async function handleNativeChat(options) {
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
        // UI options
        skipBanner: options.skipBanner || false,
    });
    await chat.start();
}
//# sourceMappingURL=NativeChat.js.map