#!/usr/bin/env node
"use strict";
/**
 * Vulpes Celare MCP Server
 * ========================
 * Ultra-fast embedded MCP server for PHI redaction.
 *
 * CRITICAL: Server must respond to MCP handshake within milliseconds.
 * All heavy initialization (dictionaries, filters) happens AFTER handshake.
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
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
// CRITICAL: Import VERSION directly, don't import VulpesCelare yet
const VERSION = "1.0.0";
// ============================================================================
// ULTRA-LAZY INITIALIZATION
// ============================================================================
// VulpesCelare is NOT imported at module load time - only when first tool runs
let vulpes = null;
async function getVulpes() {
    if (vulpes)
        return vulpes;
    // Dynamic import - only loads VulpesCelare when actually needed
    const { VulpesCelare } = await Promise.resolve().then(() => __importStar(require("../VulpesCelare")));
    vulpes = new VulpesCelare();
    return vulpes;
}
// ============================================================================
// MCP SERVER - INSTANT STARTUP
// ============================================================================
const server = new index_js_1.Server({
    name: "vulpes-celare",
    version: VERSION,
}, {
    capabilities: {
        tools: {},
    },
});
// ============================================================================
// TOOL DEFINITIONS - No initialization needed
// ============================================================================
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "redact_text",
                description: "Redact PHI (Protected Health Information) from text using Vulpes Celare. Returns the redacted text and statistics.",
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
            {
                name: "analyze_redaction",
                description: "Analyze text for PHI without redacting. Shows what would be detected.",
                inputSchema: {
                    type: "object",
                    properties: {
                        text: { type: "string", description: "The text to analyze" },
                    },
                    required: ["text"],
                },
            },
            {
                name: "get_system_info",
                description: "Get Vulpes Celare system information including version, active filters, and target metrics.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});
// ============================================================================
// TOOL EXECUTION - Lazy loads VulpesCelare on first call
// ============================================================================
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "redact_text": {
                const v = await getVulpes();
                const result = await v.process(args.text);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                redactedText: result.text,
                                redactionCount: result.redactionCount,
                                executionTimeMs: result.executionTimeMs,
                                breakdown: result.breakdown,
                            }, null, 2),
                        },
                    ],
                };
            }
            case "analyze_redaction": {
                const v = await getVulpes();
                const result = await v.process(args.text);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                original: args.text,
                                redacted: result.text,
                                phiCount: result.redactionCount,
                                breakdown: result.breakdown,
                                executionTimeMs: result.executionTimeMs,
                            }, null, 2),
                        },
                    ],
                };
            }
            case "get_system_info": {
                const v = await getVulpes();
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                engine: "Vulpes Celare",
                                version: VERSION,
                                activeFilters: v.getActiveFilters().length,
                                filterNames: v.getActiveFilters(),
                                targetMetrics: {
                                    sensitivity: ">=99%",
                                    specificity: ">=96%",
                                },
                                hipaaCompliance: "17/18 Safe Harbor identifiers",
                                processingSpeed: "2-3ms per document",
                            }, null, 2),
                        },
                    ],
                };
            }
            default:
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: `Unknown tool: ${name}` }),
                        },
                    ],
                    isError: true,
                };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: error.message,
                        tool: name,
                    }),
                },
            ],
            isError: true,
        };
    }
});
// ============================================================================
// INSTANT STARTUP - No waiting, no initialization
// ============================================================================
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport).catch((error) => {
    console.error("[Vulpes MCP] Fatal:", error.message);
    process.exit(1);
});
//# sourceMappingURL=server.js.map