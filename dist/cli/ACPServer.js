"use strict";
/**
 * ============================================================================
 * VULPES ACP SERVER - Agent Client Protocol Server
 * ============================================================================
 *
 * Implements an ACP-compatible JSON-RPC 2.0 server that Claude Code
 * and other ACP clients can connect to.
 *
 * Protocol: JSON-RPC 2.0 over HTTP
 * Default Port: 3000
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
exports.ACPServer = void 0;
exports.handleACPServer = handleACPServer;
const http = __importStar(require("http"));
const chalk_1 = __importDefault(require("chalk"));
const boxen_1 = __importDefault(require("boxen"));
const figures_1 = __importDefault(require("figures"));
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
};
// ============================================================================
// ACP SERVER CLASS
// ============================================================================
class ACPServer {
    constructor(config = {}) {
        this.server = null;
        this.config = {
            port: config.port || 3000,
            host: config.host || "127.0.0.1",
            verbose: config.verbose || false,
        };
        this.vulpes = new VulpesCelare_1.VulpesCelare();
    }
    async start() {
        this.printBanner();
        this.server = http.createServer((req, res) => this.handleRequest(req, res));
        return new Promise((resolve, reject) => {
            this.server.listen(this.config.port, this.config.host, () => {
                console.log(theme.success(`\n${figures_1.default.tick} ACP Server running at http://${this.config.host}:${this.config.port}`));
                console.log(theme.muted(`\nClaude Code can connect via: http://localhost:${this.config.port}`));
                console.log(theme.muted("\nPress Ctrl+C to stop the server.\n"));
                resolve();
            });
            this.server.on("error", (err) => {
                console.error(theme.error(`Server error: ${err.message}`));
                reject(err);
            });
        });
    }
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log(theme.info("\nACP Server stopped."));
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    async handleRequest(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }
        if (req.method !== "POST") {
            res.writeHead(405, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Method not allowed" }));
            return;
        }
        let body = "";
        for await (const chunk of req) {
            body += chunk;
        }
        try {
            const request = JSON.parse(body);
            if (this.config.verbose) {
                console.log(theme.muted(`\n← ${request.method}`));
            }
            const response = await this.handleJsonRpc(request);
            if (this.config.verbose && response.result) {
                console.log(theme.success(`→ OK`));
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(response));
        }
        catch (error) {
            const errorResponse = {
                jsonrpc: "2.0",
                error: {
                    code: -32700,
                    message: "Parse error",
                    data: error.message,
                },
                id: null,
            };
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify(errorResponse));
        }
    }
    async handleJsonRpc(request) {
        const { method, params, id } = request;
        try {
            let result;
            switch (method) {
                case "manifest":
                case "acp.manifest":
                case "initialize":
                    result = this.getManifest();
                    break;
                case "redact":
                case "tools/redact":
                    result = await this.handleRedact(params);
                    break;
                case "chat":
                case "acp.chat":
                    result = await this.handleChat(params);
                    break;
                case "context":
                case "acp.context":
                    result = this.getContext();
                    break;
                case "system_prompt":
                case "acp.system_prompt":
                    result = { prompt: (0, SystemPrompts_1.getSystemPrompt)("dev") };
                    break;
                case "ping":
                case "health":
                    result = { status: "ok", version: index_1.VERSION };
                    break;
                default:
                    return {
                        jsonrpc: "2.0",
                        error: {
                            code: -32601,
                            message: `Method not found: ${method}`,
                        },
                        id: id ?? null,
                    };
            }
            return { jsonrpc: "2.0", result, id: id ?? null };
        }
        catch (error) {
            return {
                jsonrpc: "2.0",
                error: {
                    code: -32603,
                    message: error.message || "Internal error",
                },
                id: id ?? null,
            };
        }
    }
    getManifest() {
        return {
            name: index_1.ENGINE_NAME,
            version: index_1.VERSION,
            description: "HIPAA PHI Redaction Engine with AI-powered detection",
            capabilities: ["redact", "chat", "context", "system_prompt"],
            tools: [
                {
                    name: "redact",
                    description: "Redact PHI (Protected Health Information) from text using 28 specialized filters",
                    parameters: {
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
    async handleRedact(params) {
        if (!params?.text) {
            throw new Error("Missing required parameter: text");
        }
        const result = await this.vulpes.process(params.text);
        return {
            redacted: result.text,
            original_length: params.text.length,
            redacted_count: result.redactionCount,
            breakdown: result.breakdown,
            execution_time_ms: result.executionTimeMs,
        };
    }
    async handleChat(params) {
        if (!params?.message) {
            throw new Error("Missing required parameter: message");
        }
        return {
            response: `I'm Vulpes Celare, a HIPAA PHI redaction engine. ` +
                `You can use the 'redact' tool to remove PHI from clinical text. ` +
                `I support 28 filter types including names, SSNs, phone numbers, MRNs, and more.`,
            tools_available: ["redact"],
        };
    }
    getContext() {
        const filters = this.vulpes.getActiveFilters();
        return {
            engine: index_1.ENGINE_NAME,
            version: index_1.VERSION,
            active_filters: filters.length,
            filter_types: filters.map((f) => f.replace("FilterSpan", "")),
            capabilities: [
                "PHI Detection",
                "HIPAA Compliance",
                "Streaming Processing",
                "Ensemble Voting",
            ],
        };
    }
    printBanner() {
        console.log((0, boxen_1.default)(`${theme.primary.bold("VULPES ACP SERVER")}\n` +
            `${theme.muted(index_1.ENGINE_NAME + " v" + index_1.VERSION)}\n\n` +
            `${theme.info("Agent Client Protocol Server")}\n` +
            `${theme.muted("JSON-RPC 2.0 over HTTP")}`, {
            padding: 1,
            margin: { top: 1, bottom: 0 },
            borderStyle: "round",
            borderColor: "#FF6B35",
            title: "ACP MODE",
            titleAlignment: "center",
        }));
    }
}
exports.ACPServer = ACPServer;
// ============================================================================
// CLI HANDLER
// ============================================================================
async function handleACPServer(options) {
    const server = new ACPServer({
        port: options.port || 3000,
        host: options.host || "127.0.0.1",
        verbose: options.verbose || false,
    });
    process.on("SIGINT", async () => {
        await server.stop();
        process.exit(0);
    });
    process.on("SIGTERM", async () => {
        await server.stop();
        process.exit(0);
    });
    await server.start();
    // Keep the process running
    await new Promise(() => { });
}
//# sourceMappingURL=ACPServer.js.map