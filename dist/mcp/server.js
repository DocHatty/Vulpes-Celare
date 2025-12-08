#!/usr/bin/env node
/**
 * Vulpes Celare MCP Server
 * Provides PHI redaction tools to Claude Code, Codex, and other MCP clients
 */

const { VulpesCelare } = require('../VulpesCelare');
const readline = require('readline');

const vulpes = new VulpesCelare();

// Tool definitions
const TOOLS = {
  redact_text: {
    name: "redact_text",
    description: "Redact PHI (Protected Health Information) from text using Vulpes Celare. Returns the redacted text and statistics.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to redact PHI from" }
      },
      required: ["text"]
    }
  },
  analyze_redaction: {
    name: "analyze_redaction",
    description: "Analyze text for PHI without redacting. Shows what would be detected with confidence scores.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The text to analyze" }
      },
      required: ["text"]
    }
  },
  get_system_info: {
    name: "get_system_info",
    description: "Get Vulpes Celare system information including version, active filters, and target metrics.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  run_tests: {
    name: "run_tests",
    description: "Run the Vulpes test suite and return results.",
    inputSchema: {
      type: "object",
      properties: {
        quick: { type: "boolean", description: "Run quick test subset" }
      }
    }
  }
};

// Handle MCP protocol
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

async function handleRequest(request) {
  const { method, params, id } = request;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "vulpes-celare", version: "1.0.0" },
          capabilities: { tools: {} }
        }
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: Object.values(TOOLS) }
      };

    case "tools/call":
      const { name, arguments: args } = params;
      let result;

      switch (name) {
        case "redact_text":
          const redactionResult = await vulpes.process(args.text);
          result = {
            redactedText: redactionResult.text,
            redactionCount: redactionResult.redactionCount,
            executionTimeMs: redactionResult.executionTimeMs,
            breakdown: redactionResult.breakdown
          };
          break;

        case "analyze_redaction":
          const analysisResult = await vulpes.process(args.text);
          result = {
            original: args.text,
            redacted: analysisResult.text,
            phiCount: analysisResult.redactionCount,
            breakdown: analysisResult.breakdown,
            executionTimeMs: analysisResult.executionTimeMs
          };
          break;

        case "get_system_info":
          result = {
            engine: "Vulpes Celare",
            version: "1.0.0",
            activeFilters: vulpes.getActiveFilters().length,
            targetMetrics: {
              sensitivity: "≥99%",
              specificity: "≥96%"
            },
            hipaaCompliance: "17/18 Safe Harbor identifiers",
            processingSpeed: "2-3ms per document"
          };
          break;

        case "run_tests":
          result = { message: "Test execution not available via MCP. Run: npm test" };
          break;

        default:
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: "Unknown tool: " + name }
          };
      }

      return {
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
      };

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: "Method not found: " + method }
      };
  }
}

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);
    console.log(JSON.stringify(response));
  } catch (e) {
    console.log(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32700, message: "Parse error: " + e.message }
    }));
  }
});

// Handle notifications (no response needed)
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
