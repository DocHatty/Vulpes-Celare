#!/usr/bin/env node
"use strict";
/**
 * ============================================================================
 * VULPES ACP AGENT - Agent Client Protocol Implementation
 * ============================================================================
 *
 * Implements an ACP-compatible agent that communicates via stdin/stdout
 * using JSON-RPC 2.0 (newline-delimited JSON).
 *
 * Usage: vulpes acp
 * Then configure your editor (Zed, Avante, etc.) to spawn this command.
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
exports.ACPAgent = void 0;
exports.handleACPAgent = handleACPAgent;
const readline = __importStar(require("readline"));
const VulpesCelare_1 = require("../VulpesCelare");
const index_1 = require("../index");
const SystemPrompts_1 = require("./SystemPrompts");
// ============================================================================
// ACP AGENT
// ============================================================================
class ACPAgent {
    constructor() {
        this.sessions = new Map();
        this.vulpes = new VulpesCelare_1.VulpesCelare();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false,
        });
    }
    async start() {
        // Read JSON-RPC messages from stdin (newline-delimited)
        this.rl.on("line", async (line) => {
            if (!line.trim())
                return;
            try {
                const request = JSON.parse(line);
                const response = await this.handleRequest(request);
                if (response && request.id !== undefined) {
                    this.send(response);
                }
            }
            catch (error) {
                this.sendError(null, -32700, "Parse error", error.message);
            }
        });
        this.rl.on("close", () => {
            process.exit(0);
        });
    }
    send(message) {
        process.stdout.write(JSON.stringify(message) + "\n");
    }
    sendError(id, code, message, data) {
        this.send({
            jsonrpc: "2.0",
            error: { code, message, data },
            id,
        });
    }
    sendNotification(method, params) {
        this.send({
            jsonrpc: "2.0",
            method,
            params,
        });
    }
    // ══════════════════════════════════════════════════════════════════════════
    // REQUEST HANDLERS
    // ══════════════════════════════════════════════════════════════════════════
    async handleRequest(request) {
        const { method, params, id } = request;
        try {
            let result;
            switch (method) {
                // ────────────────────────────────────────────────────────────────────
                // INITIALIZATION
                // ────────────────────────────────────────────────────────────────────
                case "initialize":
                    result = this.handleInitialize(params);
                    break;
                // ────────────────────────────────────────────────────────────────────
                // SESSION MANAGEMENT
                // ────────────────────────────────────────────────────────────────────
                case "session/new":
                    result = this.handleSessionNew(params);
                    break;
                case "session/prompt":
                    result = await this.handleSessionPrompt(params);
                    break;
                case "session/cancel":
                    result = this.handleSessionCancel(params);
                    break;
                // ────────────────────────────────────────────────────────────────────
                // TOOLS
                // ────────────────────────────────────────────────────────────────────
                case "tools/list":
                    result = this.handleToolsList();
                    break;
                case "tools/call":
                    result = await this.handleToolsCall(params);
                    break;
                // ────────────────────────────────────────────────────────────────────
                // NOTIFICATIONS (no response needed)
                // ────────────────────────────────────────────────────────────────────
                case "notifications/initialized":
                case "$/cancelRequest":
                    return null; // Notifications don't get responses
                default:
                    return {
                        jsonrpc: "2.0",
                        error: { code: -32601, message: `Method not found: ${method}` },
                        id: id ?? null,
                    };
            }
            return { jsonrpc: "2.0", result, id: id ?? null };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: { code: -32603, message: error.message || "Internal error" },
                id: id ?? null,
            };
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // METHOD IMPLEMENTATIONS
    // ══════════════════════════════════════════════════════════════════════════
    handleInitialize(params) {
        return {
            protocolVersion: "2024-11-05",
            capabilities: {
                tools: {},
                prompts: {},
            },
            serverInfo: {
                name: index_1.ENGINE_NAME,
                version: index_1.VERSION,
            },
            instructions: (0, SystemPrompts_1.getSystemPrompt)("dev"),
        };
    }
    handleSessionNew(params) {
        const sessionId = `session-${Date.now()}`;
        this.sessions.set(sessionId, { messages: [] });
        return {
            sessionId,
            capabilities: ["chat", "redact"],
        };
    }
    async handleSessionPrompt(params) {
        const { sessionId, messages } = params || {};
        // Get the latest user message
        const userMessage = messages?.find((m) => m.role === "user");
        const content = userMessage?.content?.[0]?.text || userMessage?.content || "";
        // Check if this is a redaction request
        if (content.toLowerCase().includes("redact") ||
            content.toLowerCase().includes("phi")) {
            // Extract text to redact (everything after "redact" keyword)
            const textToRedact = content.replace(/^.*?redact\s*/i, "");
            if (textToRedact.trim()) {
                const result = await this.vulpes.process(textToRedact);
                // Send streaming update notification
                this.sendNotification("session/update", {
                    sessionId,
                    type: "text",
                    content: `**Redacted Output:**\n\n${result.text}\n\n---\n*${result.redactionCount} PHI items redacted in ${result.executionTimeMs}ms*`,
                });
                return {
                    role: "assistant",
                    content: [
                        {
                            type: "text",
                            text: `Redacted ${result.redactionCount} PHI items:\n\n${result.text}`,
                        },
                    ],
                    stopReason: "end_turn",
                };
            }
        }
        // Default response for chat
        const responseText = `I'm Vulpes Celare, a HIPAA PHI redaction engine (v${index_1.VERSION}).\n\n` +
            `**Available Commands:**\n` +
            `- Say "redact [text]" to redact PHI from text\n` +
            `- Ask me about PHI types I can detect\n\n` +
            `**Supported PHI Types:** Names, SSN, Phone, Email, Address, MRN, NPI, Dates, and 20+ more.`;
        return {
            role: "assistant",
            content: [{ type: "text", text: responseText }],
            stopReason: "end_turn",
        };
    }
    handleSessionCancel(params) {
        return { cancelled: true };
    }
    handleToolsList() {
        return {
            tools: [
                {
                    name: "redact_phi",
                    description: "Redact Protected Health Information (PHI) from text using HIPAA-compliant filters",
                    inputSchema: {
                        type: "object",
                        properties: {
                            text: {
                                type: "string",
                                description: "The text to redact PHI from",
                            },
                        },
                        required: ["text"],
                    },
                },
            ],
        };
    }
    async handleToolsCall(params) {
        const { name, arguments: args } = params || {};
        if (name === "redact_phi") {
            const text = args?.text || "";
            const result = await this.vulpes.process(text);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            redacted: result.text,
                            count: result.redactionCount,
                            breakdown: result.breakdown,
                            executionTimeMs: result.executionTimeMs,
                        }),
                    },
                ],
                isError: false,
            };
        }
        return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
        };
    }
}
exports.ACPAgent = ACPAgent;
// ============================================================================
// CLI HANDLER
// ============================================================================
async function handleACPAgent() {
    const agent = new ACPAgent();
    await agent.start();
}
// ============================================================================
// DIRECT EXECUTION
// ============================================================================
if (require.main === module) {
    handleACPAgent().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
//# sourceMappingURL=ACPAgent.js.map