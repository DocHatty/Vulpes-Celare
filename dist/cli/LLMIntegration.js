"use strict";
/**
 * ============================================================================
 * VULPES CELARE - LLM Integration
 * ============================================================================
 *
 * Seamless integration with Claude, OpenAI, and other LLM APIs.
 * Automatically redacts PHI before sending to external services.
 *
 * Features:
 * - Safe Chat: Interactive mode with auto-redaction
 * - Pipe Mode: Redact and forward to LLM in one command
 * - Instruction Injection: Auto-inject safety instructions
 * - Multi-provider support: Claude, OpenAI, Azure, local models
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
exports.LLMIntegration = exports.SafetyInstructions = void 0;
exports.handleSafeChat = handleSafeChat;
exports.handleQuery = handleQuery;
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const https = __importStar(require("https"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const boxen_1 = __importDefault(require("boxen"));
const figures_1 = __importDefault(require("figures"));
const VulpesCelare_1 = require("../VulpesCelare");
// ============================================================================
// THEME (consistent with CLI.ts)
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
    bold: chalk_1.default.bold,
    dim: chalk_1.default.dim,
    ai: chalk_1.default.hex("#8B5CF6"), // Purple for AI responses
    redacted: chalk_1.default.hex("#EF4444"), // Red for redacted content
};
// ============================================================================
// SAFETY INSTRUCTIONS
// ============================================================================
exports.SafetyInstructions = {
    STANDARD: `IMPORTANT: The text you receive has been pre-processed by a HIPAA-compliant PHI redaction system.
Any content in brackets like [NAME], [SSN], [PHONE], etc. represents redacted Protected Health Information.
Do NOT attempt to guess, infer, or reconstruct the original PHI values.
Treat all redacted tokens as placeholders and respond appropriately without revealing sensitive information.`,
    CLINICAL: `CLINICAL CONTEXT: This content has been de-identified using Vulpes Celare PHI redaction.
Redacted elements follow HIPAA Safe Harbor guidelines. When analyzing:
- Treat [NAME] tokens as "the patient" or "the provider"
- Treat [DATE] tokens as "the relevant date"
- Treat [MRN], [SSN], etc. as "the identifier"
Maintain clinical accuracy while respecting the de-identification.`,
    RESEARCH: `RESEARCH MODE: De-identified clinical data follows HIPAA Safe Harbor de-identification.
Statistical and analytical operations should treat redaction tokens as categorical variables.
Do not attempt to re-identify individuals from contextual clues.`,
    STRICT: `STRICT PRIVACY MODE: All PHI has been redacted. You must:
1. NEVER attempt to guess original values
2. NEVER ask for clarification that could reveal PHI
3. NEVER combine contextual clues to infer identity
4. Refer to individuals only by their role (patient, provider, etc.)
Violations of these rules are prohibited.`,
};
// ============================================================================
// LLM PROVIDERS
// ============================================================================
class LLMProviderBase {
    constructor(config) {
        this.config = config;
    }
}
class ClaudeProvider extends LLMProviderBase {
    getName() {
        return "Claude (Anthropic)";
    }
    getDefaultModel() {
        return "claude-sonnet-4-20250514";
    }
    async chat(messages) {
        const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error("ANTHROPIC_API_KEY not set. Set it via --api-key or environment variable.");
        }
        const model = this.config.model || this.getDefaultModel();
        // Convert messages to Claude format
        const systemMessage = messages.find((m) => m.role === "system")?.content || "";
        const conversationMessages = messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: m.role, content: m.content }));
        const requestBody = {
            model,
            max_tokens: this.config.maxTokens || 4096,
            system: systemMessage,
            messages: conversationMessages,
        };
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(requestBody);
            const options = {
                hostname: "api.anthropic.com",
                port: 443,
                path: "/v1/messages",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(postData),
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                },
            };
            const req = https.request(options, (res) => {
                // PERFORMANCE FIX: Use Buffer array instead of string concatenation
                // String concatenation is O(n²) for large responses, Buffer.concat is O(n)
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    try {
                        const data = Buffer.concat(chunks).toString("utf-8");
                        const response = JSON.parse(data);
                        if (response.error) {
                            reject(new Error(response.error.message));
                            return;
                        }
                        resolve({
                            content: response.content[0]?.text || "",
                            model: response.model,
                            usage: {
                                inputTokens: response.usage?.input_tokens || 0,
                                outputTokens: response.usage?.output_tokens || 0,
                            },
                        });
                    }
                    catch (e) {
                        const data = Buffer.concat(chunks).toString("utf-8");
                        reject(new Error(`Failed to parse response: ${data}`));
                    }
                });
            });
            req.on("error", reject);
            req.write(postData);
            req.end();
        });
    }
}
class OpenAIProvider extends LLMProviderBase {
    getName() {
        return "OpenAI";
    }
    getDefaultModel() {
        return "gpt-4o";
    }
    async chat(messages) {
        const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY not set. Set it via --api-key or environment variable.");
        }
        const model = this.config.model || this.getDefaultModel();
        const baseUrl = this.config.baseUrl || "api.openai.com";
        const requestBody = {
            model,
            max_tokens: this.config.maxTokens || 4096,
            temperature: this.config.temperature || 0.7,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
        };
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(requestBody);
            const url = new URL(`https://${baseUrl}/v1/chat/completions`);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(postData),
                    Authorization: `Bearer ${apiKey}`,
                },
            };
            const req = https.request(options, (res) => {
                // PERFORMANCE FIX: Use Buffer array instead of string concatenation
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    try {
                        const data = Buffer.concat(chunks).toString("utf-8");
                        const response = JSON.parse(data);
                        if (response.error) {
                            reject(new Error(response.error.message));
                            return;
                        }
                        resolve({
                            content: response.choices[0]?.message?.content || "",
                            model: response.model,
                            usage: {
                                inputTokens: response.usage?.prompt_tokens || 0,
                                outputTokens: response.usage?.completion_tokens || 0,
                            },
                        });
                    }
                    catch (e) {
                        const data = Buffer.concat(chunks).toString("utf-8");
                        reject(new Error(`Failed to parse response: ${data}`));
                    }
                });
            });
            req.on("error", reject);
            req.write(postData);
            req.end();
        });
    }
}
class OllamaProvider extends LLMProviderBase {
    getName() {
        return "Ollama (Local)";
    }
    getDefaultModel() {
        return "llama2";
    }
    async chat(messages) {
        const baseUrl = this.config.baseUrl || "localhost:11434";
        const model = this.config.model || this.getDefaultModel();
        const requestBody = {
            model,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            stream: false,
        };
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(requestBody);
            const url = new URL(`http://${baseUrl}/api/chat`);
            const http = require("http");
            const options = {
                hostname: url.hostname,
                port: url.port || 11434,
                path: url.pathname,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(postData),
                },
            };
            const req = http.request(options, (res) => {
                // PERFORMANCE FIX: Use Buffer array instead of string concatenation
                const chunks = [];
                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });
                res.on("end", () => {
                    try {
                        const data = Buffer.concat(chunks).toString("utf-8");
                        const response = JSON.parse(data);
                        resolve({
                            content: response.message?.content || "",
                            model: response.model,
                        });
                    }
                    catch (e) {
                        const data = Buffer.concat(chunks).toString("utf-8");
                        reject(new Error(`Failed to parse response: ${data}`));
                    }
                });
            });
            req.on("error", reject);
            req.write(postData);
            req.end();
        });
    }
}
// ============================================================================
// PROVIDER FACTORY
// ============================================================================
function createProvider(config) {
    switch (config.provider) {
        case "claude":
            return new ClaudeProvider(config);
        case "openai":
        case "azure":
            return new OpenAIProvider(config);
        case "ollama":
            return new OllamaProvider(config);
        default:
            throw new Error(`Unknown provider: ${config.provider}`);
    }
}
// ============================================================================
// MAIN LLM INTEGRATION CLASS
// ============================================================================
class LLMIntegration {
    constructor(llmConfig, vulpesConfig) {
        this.conversationHistory = [];
        this.stats = {
            messagesProcessed: 0,
            phiRedacted: 0,
            tokensUsed: { input: 0, output: 0 },
        };
        this.config = llmConfig;
        this.vulpes = new VulpesCelare_1.VulpesCelare(vulpesConfig);
        this.provider = createProvider(llmConfig);
        // Initialize with system prompt
        if (llmConfig.injectSafetyInstructions !== false) {
            const safetyPrompt = llmConfig.systemPrompt || exports.SafetyInstructions.STANDARD;
            this.conversationHistory.push({
                role: "system",
                content: safetyPrompt,
            });
        }
    }
    /**
     * Send a message with automatic PHI redaction
     */
    async sendMessage(userMessage) {
        // Redact PHI from user message
        const redactionResult = await this.vulpes.process(userMessage);
        const redactedMessage = redactionResult.text;
        const phiCount = redactionResult.redactionCount;
        this.stats.messagesProcessed++;
        this.stats.phiRedacted += phiCount;
        // Add to conversation
        this.conversationHistory.push({
            role: "user",
            content: redactedMessage,
        });
        // Get LLM response
        const llmResponse = await this.provider.chat(this.conversationHistory);
        // Add response to history
        this.conversationHistory.push({
            role: "assistant",
            content: llmResponse.content,
        });
        // Update stats
        if (llmResponse.usage) {
            this.stats.tokensUsed.input += llmResponse.usage.inputTokens;
            this.stats.tokensUsed.output += llmResponse.usage.outputTokens;
        }
        return {
            response: llmResponse.content,
            redactedInput: redactedMessage,
            phiCount,
            usage: llmResponse.usage,
        };
    }
    /**
     * Process a file and send to LLM
     */
    async processFile(filePath, prompt) {
        const content = fs.readFileSync(filePath, "utf-8");
        const fullPrompt = prompt ? `${prompt}\n\n---\n\n${content}` : content;
        const result = await this.sendMessage(fullPrompt);
        return result.response;
    }
    /**
     * Interactive safe chat mode
     */
    async interactiveChat() {
        console.log((0, boxen_1.default)(`${theme.bold("Safe Chat Mode")}\n\n` +
            `${theme.muted("Provider:")} ${theme.secondary(this.provider.getName())}\n` +
            `${theme.muted("Model:")} ${theme.secondary(this.config.model || this.provider.getDefaultModel())}\n\n` +
            `${theme.success(figures_1.default.tick)} All messages are automatically redacted before sending\n` +
            `${theme.success(figures_1.default.tick)} PHI is replaced with safe tokens\n` +
            `${theme.success(figures_1.default.tick)} Safety instructions are auto-injected\n\n` +
            `${theme.muted("Commands:")}\n` +
            `  ${theme.secondary(".stats")}    Show session statistics\n` +
            `  ${theme.secondary(".clear")}    Clear conversation history\n` +
            `  ${theme.secondary(".system")}   Update system prompt\n` +
            `  ${theme.secondary(".exit")}     Exit safe chat`, {
            padding: 1,
            borderStyle: "round",
            borderColor: "#8B5CF6",
            title: "VULPES SAFE CHAT",
            titleAlignment: "center",
        }));
        console.log();
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const prompt = () => {
            rl.question(theme.primary("you") + theme.muted(" > "), async (input) => {
                input = input.trim();
                if (!input) {
                    prompt();
                    return;
                }
                // Handle commands
                if (input.startsWith(".")) {
                    const cmd = input.slice(1).split(" ")[0].toLowerCase();
                    switch (cmd) {
                        case "exit":
                        case "quit":
                        case "q":
                            this.printStats();
                            console.log(theme.info(`\n${figures_1.default.info} Goodbye! Your conversation was privacy-protected.`));
                            rl.close();
                            process.exit(0);
                            break;
                        case "stats":
                            this.printStats();
                            break;
                        case "clear":
                            this.conversationHistory = this.conversationHistory.slice(0, 1); // Keep system prompt
                            console.log(theme.success(`${figures_1.default.tick} Conversation cleared`));
                            break;
                        case "system":
                            const newPrompt = input.slice(8).trim();
                            if (newPrompt) {
                                this.conversationHistory[0] = {
                                    role: "system",
                                    content: newPrompt,
                                };
                                console.log(theme.success(`${figures_1.default.tick} System prompt updated`));
                            }
                            else {
                                console.log(theme.muted("Current system prompt:"));
                                console.log(this.conversationHistory[0]?.content || "None");
                            }
                            break;
                        default:
                            console.log(theme.warning(`Unknown command: .${cmd}`));
                    }
                    console.log();
                    prompt();
                    return;
                }
                // Process message
                const spinner = (0, ora_1.default)({
                    text: "Redacting PHI...",
                    spinner: "dots12",
                    color: "yellow",
                }).start();
                try {
                    // First show redaction
                    const redactionResult = await this.vulpes.process(input);
                    if (redactionResult.redactionCount > 0) {
                        spinner.text = `${theme.redacted(redactionResult.redactionCount.toString())} PHI redacted. Sending to ${this.provider.getName()}...`;
                    }
                    else {
                        spinner.text = `Sending to ${this.provider.getName()}...`;
                    }
                    const result = await this.sendMessage(input);
                    spinner.stop();
                    // Show what was sent (if PHI was redacted)
                    if (result.phiCount > 0) {
                        console.log(theme.muted("  [Sent: ") +
                            theme.redacted(this.truncate(result.redactedInput, 80)) +
                            theme.muted("]"));
                    }
                    // Show response
                    console.log();
                    console.log(theme.ai("assistant") + theme.muted(" > "));
                    console.log(this.formatResponse(result.response));
                    // Show token usage
                    if (result.usage) {
                        console.log(theme.dim(`  [${result.usage.inputTokens} in / ${result.usage.outputTokens} out tokens]`));
                    }
                }
                catch (error) {
                    spinner.fail(theme.error("Error: " + error.message));
                }
                console.log();
                prompt();
            });
        };
        prompt();
    }
    /**
     * One-shot query with redaction
     */
    async query(text) {
        return this.sendMessage(text);
    }
    getStats() {
        return { ...this.stats };
    }
    printStats() {
        console.log();
        console.log(theme.bold("Session Statistics:"));
        console.log(`  ${theme.muted("Messages processed:")} ${this.stats.messagesProcessed}`);
        console.log(`  ${theme.muted("PHI instances redacted:")} ${theme.redacted(this.stats.phiRedacted.toString())}`);
        console.log(`  ${theme.muted("Tokens used:")} ${this.stats.tokensUsed.input} in / ${this.stats.tokensUsed.output} out`);
        console.log(`  ${theme.muted("Conversation length:")} ${this.conversationHistory.length - 1} messages`);
    }
    truncate(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength - 3) + "...";
    }
    formatResponse(text) {
        // Add some basic formatting
        return text
            .split("\n")
            .map((line) => "  " + line)
            .join("\n");
    }
}
exports.LLMIntegration = LLMIntegration;
// ============================================================================
// CLI COMMAND HANDLERS
// ============================================================================
async function handleSafeChat(options) {
    const config = {
        provider: options.provider || "claude",
        apiKey: options.apiKey,
        model: options.model,
        baseUrl: options.baseUrl,
        maxTokens: parseInt(options.maxTokens) || 4096,
        temperature: parseFloat(options.temperature) || 0.7,
        systemPrompt: options.system
            ? exports.SafetyInstructions[options.system.toUpperCase()]
            : undefined,
        injectSafetyInstructions: !options.noSafetyInstructions,
    };
    const integration = new LLMIntegration(config);
    await integration.interactiveChat();
}
async function handleQuery(text, options) {
    const config = {
        provider: options.provider || "claude",
        apiKey: options.apiKey,
        model: options.model,
        maxTokens: parseInt(options.maxTokens) || 4096,
        injectSafetyInstructions: !options.noSafetyInstructions,
    };
    const spinner = (0, ora_1.default)({
        text: "Processing...",
        spinner: "dots12",
        color: "yellow",
    }).start();
    try {
        const integration = new LLMIntegration(config);
        // Read from file if it's a path
        let input = text;
        if (fs.existsSync(text)) {
            input = fs.readFileSync(text, "utf-8");
        }
        spinner.text = "Redacting PHI...";
        const result = await integration.query(input);
        spinner.succeed(`Redacted ${result.phiCount} PHI instances`);
        if (options.showRedacted) {
            console.log(theme.muted("\nRedacted input:"));
            console.log(theme.dim(result.redactedInput));
            console.log();
        }
        console.log(theme.bold("\nResponse:"));
        console.log(result.response);
    }
    catch (error) {
        spinner.fail(theme.error("Error: " + error.message));
        process.exit(1);
    }
}
//# sourceMappingURL=LLMIntegration.js.map