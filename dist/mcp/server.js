#!/usr/bin/env node
"use strict";
/**
 * Vulpes Celare MCP Server
 * ========================
 * Provides PHI redaction tools to Claude Code, Codex, and other MCP clients.
 *
 * Uses the official @modelcontextprotocol/sdk for proper protocol compliance.
 * VulpesCelare is initialized LAZILY on first tool call to avoid blocking startup.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const VulpesCelare_1 = require("../VulpesCelare");
const index_1 = require("../index");
// ============================================================================
// LAZY INITIALIZATION
// ============================================================================
// Don't block MCP handshake - VulpesCelare loads dictionaries on first use
let vulpes = null;
let initPromise = null;
async function getVulpes() {
    if (vulpes)
        return vulpes;
    if (initPromise)
        return initPromise;
    initPromise = (async () => {
        vulpes = new VulpesCelare_1.VulpesCelare();
        // Warm up by processing empty string (loads dictionaries)
        await vulpes.process("");
        return vulpes;
    })();
    return initPromise;
}
// ============================================================================
// MCP SERVER SETUP
// ============================================================================
const server = new index_js_1.Server({
    name: "vulpes-celare",
    version: index_1.VERSION,
}, {
    capabilities: {
        tools: {},
    },
});
// ============================================================================
// TOOL HANDLERS
// ============================================================================
// List available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "redact_text",
                description: "Redact PHI (Protected Health Information) from text using Vulpes Celare. Returns the redacted text and statistics.",
                inputSchema: {
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
// Execute tools
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
                                version: index_1.VERSION,
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
// SERVER STARTUP
// ============================================================================
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    // Log to stderr (not stdout - that's for MCP protocol)
    console.error(`[Vulpes MCP] Server started (v${index_1.VERSION})`);
}
main().catch((error) => {
    console.error("[Vulpes MCP] Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map