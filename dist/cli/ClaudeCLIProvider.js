"use strict";
/**
 * ============================================================================
 * CLAUDE CLI PROVIDER - No API Key Required
 * ============================================================================
 *
 * Integrates with the Claude Code CLI to provide chat capabilities using
 * your existing Claude Max/Pro subscription - NO API KEY NEEDED.
 *
 * How it works:
 * 1. Spawns `claude` CLI as a subprocess with --output-format stream-json
 * 2. Parses streaming JSON output for real-time token display
 * 3. Uses CLI's cached OAuth authentication (run `claude /login` once)
 *
 * This is the same approach used by Roo Code and Cline VS Code extensions.
 *
 * @see https://docs.roocode.com/providers/claude-code
 * @see https://code.claude.com/docs/en/cli-reference
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
exports.ClaudeCLIProvider = void 0;
exports.handleClaudeCLI = handleClaudeCLI;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const figures_1 = __importDefault(require("figures"));
const boxen_1 = __importDefault(require("boxen"));
const VulpesCelare_1 = require("../VulpesCelare");
const index_1 = require("../index");
const SystemPrompts_1 = require("./SystemPrompts");
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
    agent: chalk_1.default.hex("#8B5CF6"),
    tool: chalk_1.default.hex("#EC4899"),
    user: chalk_1.default.hex("#10B981"),
};
// ============================================================================
// CLAUDE CLI PROVIDER
// ============================================================================
class ClaudeCLIProvider {
    constructor(config = {}) {
        this.cliProcess = null;
        this.conversationId = null;
        this.totalInputTokens = 0;
        this.totalOutputTokens = 0;
        this.config = {
            mode: config.mode || "dev",
            model: config.model,
            maxTurns: config.maxTurns || 10,
            workingDir: config.workingDir || process.cwd(),
            verbose: config.verbose || false,
            injectSystemPrompt: config.injectSystemPrompt !== false,
        };
        // Suppress Vulpes logging unless verbose
        if (!this.config.verbose) {
            process.env.VULPES_QUIET = "1";
        }
        this.vulpes = new VulpesCelare_1.VulpesCelare();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // MAIN ENTRY
    // ══════════════════════════════════════════════════════════════════════════
    async start() {
        // Check if Claude CLI is available
        const cliAvailable = await this.checkCLIAvailable();
        if (!cliAvailable) {
            console.log(theme.error(`\n${figures_1.default.cross} Claude CLI not found`));
            console.log(theme.muted("Install it from: https://code.claude.com"));
            console.log(theme.muted("Then run: claude /login"));
            process.exit(1);
        }
        this.printBanner();
        await this.chatLoop();
    }
    async checkCLIAvailable() {
        // On Windows, Claude Code requires Git Bash - set it up first
        await this.setupGitBashPath();
        return new Promise((resolve) => {
            const proc = (0, child_process_1.spawn)("claude", ["--version"], {
                shell: true,
                stdio: "pipe",
                env: process.env,
            });
            proc.on("close", (code) => {
                resolve(code === 0);
            });
            proc.on("error", () => {
                resolve(false);
            });
            // Timeout after 5 seconds
            setTimeout(() => {
                proc.kill();
                resolve(false);
            }, 5000);
        });
    }
    async setupGitBashPath() {
        if (process.platform !== "win32")
            return;
        // Already set
        if (process.env.CLAUDE_CODE_GIT_BASH_PATH) {
            console.log(theme.success(`  ${figures_1.default.tick} Git Bash: ${process.env.CLAUDE_CODE_GIT_BASH_PATH}`));
            return;
        }
        const fs = await Promise.resolve().then(() => __importStar(require("fs")));
        const pathMod = await Promise.resolve().then(() => __importStar(require("path")));
        // Common Git installation paths on Windows
        const commonPaths = [
            "H:\\Programming\\Git\\bin\\bash.exe",
            "C:\\Program Files\\Git\\bin\\bash.exe",
            "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
            "D:\\Git\\bin\\bash.exe",
            "D:\\Program Files\\Git\\bin\\bash.exe",
        ];
        // Also check PROGRAMFILES variants
        if (process.env.PROGRAMFILES) {
            commonPaths.push(pathMod.join(process.env.PROGRAMFILES, "Git", "bin", "bash.exe"));
        }
        if (process.env["PROGRAMFILES(X86)"]) {
            commonPaths.push(pathMod.join(process.env["PROGRAMFILES(X86)"], "Git", "bin", "bash.exe"));
        }
        if (process.env.LOCALAPPDATA) {
            commonPaths.push(pathMod.join(process.env.LOCALAPPDATA, "Programs", "Git", "bin", "bash.exe"));
        }
        // Try to find git in PATH and derive bash path from it
        const pathDirs = process.env.PATH?.split(";") || [];
        for (const dir of pathDirs) {
            if (fs.existsSync(pathMod.join(dir, "git.exe"))) {
                // Found git.exe, bash should be nearby
                const bashPath = pathMod.resolve(dir, "..", "bin", "bash.exe");
                commonPaths.unshift(bashPath);
                break;
            }
        }
        for (const p of commonPaths) {
            try {
                if (p && fs.existsSync(p)) {
                    // Use forward slashes - works better with Node child processes on Windows
                    const normalizedPath = p.replace(/\\/g, "/");
                    process.env.CLAUDE_CODE_GIT_BASH_PATH = normalizedPath;
                    console.log(theme.success(`  ${figures_1.default.tick} Found Git Bash: ${normalizedPath}`));
                    return;
                }
            }
            catch {
                // Skip invalid paths
            }
        }
        // Not found - show helpful message
        console.log(theme.warning(`\n  ${figures_1.default.warning} Git Bash not found.`));
        console.log(theme.muted("  Claude CLI on Windows requires Git Bash."));
        console.log(theme.muted("  Install Git from: https://git-scm.com/downloads/win"));
        console.log(theme.muted("  Or set: CLAUDE_CODE_GIT_BASH_PATH=<path to bash.exe>\n"));
    }
    printBanner() {
        console.log((0, boxen_1.default)(`${theme.primary.bold("VULPES + CLAUDE CLI")}\n` +
            `${theme.muted(index_1.ENGINE_NAME + " v" + index_1.VERSION)}\n\n` +
            `${theme.success(figures_1.default.tick)} No API key required\n` +
            `${theme.success(figures_1.default.tick)} Uses Claude Max/Pro subscription\n` +
            `${theme.success(figures_1.default.tick)} Streaming responses\n` +
            `${theme.success(figures_1.default.tick)} Full tool calling\n` +
            `${theme.muted("Mode:")} ${theme.warning(this.config.mode.toUpperCase())}`, {
            padding: 1,
            margin: { top: 1, bottom: 0 },
            borderStyle: "round",
            borderColor: "#FF6B35",
            title: "SUBSCRIPTION-BASED CHAT",
            titleAlignment: "center",
        }));
        console.log();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CHAT LOOP
    // ══════════════════════════════════════════════════════════════════════════
    async chatLoop() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        // Inject system prompt on first message if enabled
        let isFirstMessage = true;
        const prompt = () => {
            rl.question(theme.user("\nyou") + theme.muted(" > "), async (input) => {
                input = input.trim();
                if (!input) {
                    prompt();
                    return;
                }
                // Handle special commands
                if (input.startsWith("/")) {
                    await this.handleCommand(input, rl);
                    prompt();
                    return;
                }
                // Prepend system prompt to first message
                let fullPrompt = input;
                if (isFirstMessage && this.config.injectSystemPrompt) {
                    const systemPrompt = (0, SystemPrompts_1.getSystemPrompt)(this.config.mode);
                    fullPrompt = `<system>\n${systemPrompt}\n</system>\n\nUser: ${input}`;
                    isFirstMessage = false;
                }
                // Stream response from Claude CLI
                await this.streamCLIResponse(fullPrompt);
                prompt();
            });
        };
        console.log(theme.muted("Type /help for commands, or just start chatting.\n"));
        prompt();
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CLI STREAMING
    // ══════════════════════════════════════════════════════════════════════════
    async streamCLIResponse(prompt) {
        console.log();
        process.stdout.write(theme.agent("claude") + theme.muted(" > "));
        return new Promise((resolve, reject) => {
            // Build CLI arguments (prompt will be passed via stdin)
            const args = [
                "-p", // Print mode (non-interactive)
                "--output-format",
                "stream-json",
                "--verbose", // Required for stream-json output
                "--max-turns",
                String(this.config.maxTurns),
            ];
            // Add conversation continuation if we have one
            if (this.conversationId) {
                args.push("--continue", this.conversationId);
            }
            // Add model if specified
            // Add model if specified
            if (this.config.model) {
                args.push("--model", this.config.model);
            }
            // Add - to read prompt from stdin
            args.push("-");
            // Write prompt to temp file and use shell to pipe to claude
            // This completely bypasses Node.js stdin issues with shell: true
            const os = require("os");
            const tempFile = path.join(os.tmpdir(), `vulpes-prompt-${Date.now()}.txt`);
            fs.writeFileSync(tempFile, prompt, "utf8");
            // Build the shell command with proper piping
            const cmdArgs = [
                "-p", // Print mode (non-interactive)
                "--output-format",
                "stream-json",
                "--verbose", // Required for stream-json output
                "--max-turns",
                String(this.config.maxTurns),
            ];
            if (this.conversationId) {
                cmdArgs.push("--continue", this.conversationId);
            }
            if (this.config.model) {
                cmdArgs.push("--model", this.config.model);
            }
            // Shell command: type file | claude args
            const shellCmd = process.platform === "win32"
                ? `type "${tempFile}" | claude ${cmdArgs.join(" ")} -`
                : `cat "${tempFile}" | claude ${cmdArgs.join(" ")} -`;
            this.cliProcess = (0, child_process_1.spawn)(shellCmd, [], {
                cwd: this.config.workingDir,
                shell: true,
                stdio: ["ignore", "pipe", "pipe"],
                env: process.env,
            });
            // Clean up temp file when process exits
            this.cliProcess.on("exit", () => {
                try {
                    fs.unlinkSync(tempFile);
                }
                catch (e) {
                    /* ignore */
                }
            });
            let buffer = "";
            let fullResponse = "";
            let currentToolName = "";
            this.cliProcess.stdout?.on("data", (data) => {
                buffer += data.toString();
                // Parse JSON lines
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer
                for (const line of lines) {
                    if (!line.trim())
                        continue;
                    try {
                        const msg = JSON.parse(line);
                        this.handleStreamMessage(msg, (text) => {
                            process.stdout.write(text);
                            fullResponse += text;
                        }, (tool) => {
                            currentToolName = tool;
                            console.log();
                            console.log(theme.tool(`  ${figures_1.default.pointer} Using tool: ${tool}`));
                        });
                    }
                    catch (e) {
                        // Skip invalid JSON
                        if (this.config.verbose) {
                            console.error(theme.muted(`  [parse error: ${line}]`));
                        }
                    }
                }
            });
            this.cliProcess.stderr?.on("data", (data) => {
                const text = data.toString();
                if (this.config.verbose) {
                    console.error(theme.error(`\n  [stderr: ${text}]`));
                }
            });
            this.cliProcess.on("close", (code) => {
                console.log();
                if (code !== 0 && code !== null) {
                    console.log(theme.error(`\n${figures_1.default.cross} Claude CLI exited with code ${code}`));
                }
                // Show token usage if available
                if (this.totalInputTokens > 0 || this.totalOutputTokens > 0) {
                    console.log(theme.muted(`  [${this.totalInputTokens} in / ${this.totalOutputTokens} out tokens]`));
                }
                this.cliProcess = null;
                resolve();
            });
            this.cliProcess.on("error", (err) => {
                console.log(theme.error(`\n${figures_1.default.cross} Error: ${err.message}`));
                this.cliProcess = null;
                reject(err);
            });
        });
    }
    handleStreamMessage(msg, onText, onTool) {
        // Handle different message types from stream-json output
        switch (msg.type) {
            case "message_start":
                // Capture conversation ID for continuation
                if (msg.message?.id) {
                    this.conversationId = msg.message.id;
                }
                break;
            case "content_block_start":
                if (msg.content_block?.type === "tool_use" && msg.content_block.name) {
                    onTool(msg.content_block.name);
                }
                break;
            case "content_block_delta":
                if (msg.delta?.type === "text_delta" && msg.delta.text) {
                    onText(msg.delta.text);
                }
                break;
            case "message_delta":
                // Update token counts
                if (msg.usage) {
                    this.totalOutputTokens += msg.usage.output_tokens || 0;
                }
                break;
            case "message_stop":
                // Message complete
                break;
            // Handle init/result messages from Claude CLI
            case "init":
            case "result":
                if (msg.subtype === "success" && msg.message?.usage) {
                    this.totalInputTokens += msg.message.usage.input_tokens || 0;
                    this.totalOutputTokens += msg.message.usage.output_tokens || 0;
                }
                // Extract text from result
                if (msg.message?.content) {
                    for (const block of msg.message.content) {
                        if (block.type === "text" && block.text) {
                            onText(block.text);
                        }
                    }
                }
                break;
        }
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
                console.log(theme.info("\nGoodbye!\n"));
                if (this.cliProcess) {
                    this.cliProcess.kill();
                }
                rl.close();
                process.exit(0);
                break;
            case "clear":
            case "new":
                this.conversationId = null;
                this.totalInputTokens = 0;
                this.totalOutputTokens = 0;
                console.log(theme.success("Started new conversation"));
                break;
            case "tokens":
            case "usage":
                console.log(theme.info(`\nTokens used: ${this.totalInputTokens} in / ${this.totalOutputTokens} out`));
                break;
            case "test":
                if (args.length > 0) {
                    const text = args.join(" ");
                    const result = await this.vulpes.process(text);
                    console.log(`
${theme.muted("─".repeat(60))}
${theme.warning.bold("ORIGINAL:")} ${text}
${theme.success.bold("REDACTED:")} ${result.text}
${theme.muted(`(${result.redactionCount} PHI, ${result.executionTimeMs}ms)`)}
${theme.muted("─".repeat(60))}
`);
                }
                else {
                    console.log(theme.warning("Usage: /test <text to redact>"));
                }
                break;
            case "help":
                this.printHelp();
                break;
            default:
                console.log(theme.warning(`Unknown command: /${cmd}`));
                console.log(theme.muted("Type /help for available commands"));
        }
    }
    printHelp() {
        console.log(`
${theme.info.bold("COMMANDS")}
${theme.muted("─".repeat(50))}
  ${theme.secondary("/test <text>")}   Quick redaction test
  ${theme.secondary("/clear")}         Start new conversation
  ${theme.secondary("/tokens")}        Show token usage
  ${theme.secondary("/help")}          Show this help
  ${theme.secondary("/exit")}          Exit chat

${theme.info.bold("HOW IT WORKS")}
${theme.muted("─".repeat(50))}
  This uses the Claude Code CLI with your existing
  Claude Max/Pro subscription - no API key needed!

  If not logged in, run: ${theme.accent("claude /login")}
`);
    }
}
exports.ClaudeCLIProvider = ClaudeCLIProvider;
// ============================================================================
// HANDLER
// ============================================================================
async function handleClaudeCLI(options) {
    const provider = new ClaudeCLIProvider({
        mode: options.mode || "dev",
        model: options.model,
        maxTurns: parseInt(options.maxTurns) || 10,
        workingDir: process.cwd(),
        verbose: options.verbose,
        injectSystemPrompt: !options.noSystemPrompt,
    });
    await provider.start();
}
//# sourceMappingURL=ClaudeCLIProvider.js.map