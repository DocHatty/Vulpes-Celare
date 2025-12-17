#!/usr/bin/env node
/**
 * Vulpes Celare MCP Server
 * ========================
 * Ultra-fast embedded MCP server for PHI redaction.
 *
 * CRITICAL: Server must respond to MCP handshake within milliseconds.
 * All heavy initialization (dictionaries, filters) happens AFTER handshake.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// CRITICAL: Import VERSION directly, don't import VulpesCelare yet
import { VERSION } from "../meta";
import { vulpesLogger as log } from "../utils/VulpesLogger";

// ============================================================================
// ULTRA-LAZY INITIALIZATION
// ============================================================================
// VulpesCelare is NOT imported at module load time - only when first tool runs

let vulpes: any = null;

async function getVulpes(): Promise<any> {
  if (vulpes) return vulpes;

  // Dynamic import - only loads VulpesCelare when actually needed
  const { VulpesCelare } = await import("../VulpesCelare");
  vulpes = new VulpesCelare();
  return vulpes;
}

// ============================================================================
// MCP SERVER - INSTANT STARTUP
// ============================================================================

const server = new Server(
  {
    name: "vulpes-celare",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ============================================================================
// TOOL DEFINITIONS - No initialization needed
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "redact_text",
        description:
          "Redact PHI (Protected Health Information) from text using Vulpes Celare. Returns the redacted text and statistics.",
        inputSchema: {
          type: "object" as const,
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
        description:
          "Analyze text for PHI without redacting. Shows what would be detected.",
        inputSchema: {
          type: "object" as const,
          properties: {
            text: { type: "string", description: "The text to analyze" },
          },
          required: ["text"],
        },
      },
      {
        name: "get_system_info",
        description:
          "Get Vulpes Celare system information including version, active filters, and target metrics.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
    ],
  };
});

// ============================================================================
// TOOL EXECUTION - Lazy loads VulpesCelare on first call
// ============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "redact_text": {
        const v = await getVulpes();
        const result = await v.process((args as { text: string }).text);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  redactedText: result.text,
                  redactionCount: result.redactionCount,
                  executionTimeMs: result.executionTimeMs,
                  breakdown: result.breakdown,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "analyze_redaction": {
        const v = await getVulpes();
        const result = await v.process((args as { text: string }).text);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  original: (args as { text: string }).text,
                  redacted: result.text,
                  phiCount: result.redactionCount,
                  breakdown: result.breakdown,
                  executionTimeMs: result.executionTimeMs,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_system_info": {
        const v = await getVulpes();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
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
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: (error as Error).message,
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

const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  log.fatal("MCP server connection failed", { component: "Vulpes MCP", error: error.message });
  process.exit(1);
});
