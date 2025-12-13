#!/usr/bin/env node
/**
 * Vulpes Celare MCP Server
 * Provides PHI redaction tools to Claude Code, Codex, and other MCP clients
 *
 * IMPORTANT: VulpesCelare is initialized LAZILY on first tool call to avoid
 * blocking the MCP handshake. Dictionary loading takes 3+ seconds.
 */

import { VulpesCelare } from "../VulpesCelare";

// Lazy initialization - don't block MCP handshake
let vulpes: VulpesCelare | null = null;
let initPromise: Promise<VulpesCelare> | null = null;

async function getVulpes(): Promise<VulpesCelare> {
  if (vulpes) return vulpes;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    vulpes = new VulpesCelare();
    // Warm up by processing empty string (loads dictionaries)
    await vulpes.process("");
    return vulpes;
  })();

  return initPromise;
}

// Tool definitions
const TOOLS = {
  redact_text: {
    name: "redact_text",
    description:
      "Redact PHI (Protected Health Information) from text using Vulpes Celare. Returns the redacted text and statistics.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to redact PHI from" },
      },
      required: ["text"],
    },
  },
  analyze_redaction: {
    name: "analyze_redaction",
    description:
      "Analyze text for PHI without redacting. Shows what would be detected with confidence scores.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to analyze" },
      },
      required: ["text"],
    },
  },
  get_system_info: {
    name: "get_system_info",
    description:
      "Get Vulpes Celare system information including version, active filters, and target metrics.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  run_tests: {
    name: "run_tests",
    description: "Run the Vulpes test suite and return results.",
    inputSchema: {
      type: "object",
      properties: {
        quick: { type: "boolean", description: "Run quick test subset" },
      },
    },
  },
};

interface McpRequest {
  jsonrpc: string;
  method: string;
  params?: Record<string, unknown>;
  id?: number | string | null;
}

interface McpResponse {
  jsonrpc: string;
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

// Format MCP responses with Content-Length framing
function writeMessage(message: McpResponse): void {
  const payload = JSON.stringify(message);
  const contentLength = Buffer.byteLength(payload, "utf8");
  process.stdout.write(`Content-Length: ${contentLength}\r\n\r\n${payload}`);
}

// Handle MCP requests
async function handleRequest(request: McpRequest): Promise<McpResponse | null> {
  const { method, params = {}, id } = request;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "vulpes-celare", version: "1.0.0" },
          capabilities: { tools: {} },
        },
      };

    case "notifications/initialized":
      // Client acknowledgment - no response needed
      return null;

    case "ping":
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {},
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: { tools: Object.values(TOOLS) },
      };

    case "tools/call": {
      const { name, arguments: args } = params as {
        name: string;
        arguments: Record<string, unknown>;
      };
      let result: unknown;

      switch (name) {
        case "redact_text": {
          const v = await getVulpes();
          const redactionResult = await v.process(args.text as string);
          result = {
            redactedText: redactionResult.text,
            redactionCount: redactionResult.redactionCount,
            executionTimeMs: redactionResult.executionTimeMs,
            breakdown: redactionResult.breakdown,
          };
          break;
        }

        case "analyze_redaction": {
          const v = await getVulpes();
          const analysisResult = await v.process(args.text as string);
          result = {
            original: args.text,
            redacted: analysisResult.text,
            phiCount: analysisResult.redactionCount,
            breakdown: analysisResult.breakdown,
            executionTimeMs: analysisResult.executionTimeMs,
          };
          break;
        }

        case "get_system_info": {
          const v = await getVulpes();
          result = {
            engine: "Vulpes Celare",
            version: "1.0.0",
            activeFilters: v.getActiveFilters().length,
            targetMetrics: {
              sensitivity: ">=99%",
              specificity: ">=96%",
            },
            hipaaCompliance: "17/18 Safe Harbor identifiers",
            processingSpeed: "2-3ms per document",
          };
          break;
        }

        case "run_tests":
          result = {
            message: "Test execution not available via MCP. Run: npm test",
          };
          break;

        default:
          return {
            jsonrpc: "2.0",
            id: id ?? null,
            error: { code: -32601, message: "Unknown tool: " + name },
          };
      }

      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      };
    }

    default:
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32601, message: "Method not found: " + method },
      };
  }
}

// Buffer and parse MCP framed messages
let buffer = "";
process.stdin.setEncoding("utf8");

process.stdin.on("data", async (chunk: string) => {
  buffer += chunk;

  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;

    const headers = buffer.slice(0, headerEnd);
    const lengthMatch = headers.match(/Content-Length:\s*(\d+)/i);

    if (!lengthMatch) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }

    const messageLength = parseInt(lengthMatch[1], 10);
    const messageStart = headerEnd + 4;

    if (buffer.length < messageStart + messageLength) break;

    const message = buffer.slice(messageStart, messageStart + messageLength);
    buffer = buffer.slice(messageStart + messageLength);

    let request: McpRequest;

    try {
      request = JSON.parse(message);
    } catch (error) {
      writeMessage({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error: " + (error as Error).message,
        },
      });
      continue;
    }

    try {
      const response = await handleRequest(request);
      if (response) {
        writeMessage(response);
      }
    } catch (error) {
      writeMessage({
        jsonrpc: "2.0",
        id: request?.id ?? null,
        error: {
          code: -32000,
          message: "Internal error: " + (error as Error).message,
        },
      });
    }
  }
});

process.stdin.on("close", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
