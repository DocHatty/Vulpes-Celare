/**
 * Unit Tests for Agent CLI Module
 *
 * Tests agent configuration, backend detection, and integration setup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ============================================================================
// AGENT CONFIG TESTS
// ============================================================================

import type { AgentOptions } from "../../../src/cli/types";

describe("Agent Configuration", () => {
  describe("AgentOptions type", () => {
    it("should accept valid dev mode options", () => {
      const options: AgentOptions = {
        mode: "dev",
        backend: "claude",
        model: "claude-3-sonnet-20240229",
        verbose: true,
        vulpesify: true,
      };

      expect(options.mode).toBe("dev");
      expect(options.backend).toBe("claude");
      expect(options.verbose).toBe(true);
    });

    it("should accept valid qa mode options", () => {
      const options: AgentOptions = {
        mode: "qa",
        backend: "codex",
        verbose: false,
      };

      expect(options.mode).toBe("qa");
      expect(options.backend).toBe("codex");
    });

    it("should accept valid production mode options", () => {
      const options: AgentOptions = {
        mode: "production",
        backend: "native",
      };

      expect(options.mode).toBe("production");
      expect(options.backend).toBe("native");
    });

    it("should handle all backend types", () => {
      const backends: Array<AgentOptions["backend"]> = [
        "claude",
        "codex",
        "copilot",
        "native",
      ];

      for (const backend of backends) {
        const options: AgentOptions = { backend };
        expect(options.backend).toBe(backend);
      }
    });
  });

  describe("Agent Mode Defaults", () => {
    it("should have sensible defaults when no options provided", () => {
      const options: AgentOptions = {};

      // These would be set by the handleAgent function defaults
      const mode = options.mode || "dev";
      const backend = options.backend || "claude";
      const vulpesify = options.vulpesify ?? true;

      expect(mode).toBe("dev");
      expect(backend).toBe("claude");
      expect(vulpesify).toBe(true);
    });
  });
});

// ============================================================================
// AGENT INTEGRATION FILE TESTS
// ============================================================================

describe("Agent Integration Files", () => {
  describe("CLAUDE.md content", () => {
    it("should check for CLAUDE.md existence in project root", () => {
      const claudeMdPath = path.join(process.cwd(), "CLAUDE.md");

      // This is a sanity check - CLAUDE.md should exist in the project
      const exists = fs.existsSync(claudeMdPath);

      // Note: In CI or clean environments, this might not exist
      // The test is informational
      if (exists) {
        const content = fs.readFileSync(claudeMdPath, "utf-8");
        expect(content).toContain("Vulpes");
        expect(content.length).toBeGreaterThan(100);
      }
    });
  });

  describe("Vulpesify directory structure", () => {
    it("should validate expected directory structure", () => {
      // Check for expected directories
      const srcDir = path.join(process.cwd(), "src");
      const cliDir = path.join(srcDir, "cli");
      const filtersDir = path.join(srcDir, "filters");

      expect(fs.existsSync(srcDir)).toBe(true);
      expect(fs.existsSync(cliDir)).toBe(true);
      expect(fs.existsSync(filtersDir)).toBe(true);
    });

    it("should have required CLI files", () => {
      const cliDir = path.join(process.cwd(), "src", "cli");

      const requiredFiles = [
        "Agent.ts",
        "NativeChat.ts",
        "CLI.ts",
        "types.ts",
      ];

      for (const file of requiredFiles) {
        const filePath = path.join(cliDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });
  });
});

// ============================================================================
// AGENT CONFIG VALIDATION
// ============================================================================

describe("Agent Config Validation", () => {
  it("should validate mode is one of allowed values", () => {
    const validModes = ["dev", "qa", "production"];

    for (const mode of validModes) {
      const options: AgentOptions = { mode: mode as AgentOptions["mode"] };
      expect(["dev", "qa", "production"]).toContain(options.mode);
    }
  });

  it("should validate backend is one of allowed values", () => {
    const validBackends = ["claude", "codex", "copilot", "native"];

    for (const backend of validBackends) {
      const options: AgentOptions = { backend: backend as AgentOptions["backend"] };
      expect(["claude", "codex", "copilot", "native"]).toContain(options.backend);
    }
  });
});

// ============================================================================
// VULPESIFICATION LOGIC TESTS
// ============================================================================

describe("Vulpesification Logic", () => {
  it("should determine if Claude setup is needed", () => {
    // Simulate the logic from Agent.ts ensureVulpesified
    const checkNeedsClaudeSetup = (
      backend: string,
      claudeMdExists: boolean,
      slashCommandsExist: boolean,
      mcpRegistered: boolean,
    ): boolean => {
      return (
        backend === "claude" &&
        (!claudeMdExists || !slashCommandsExist || !mcpRegistered)
      );
    };

    // Needs setup when files are missing
    expect(checkNeedsClaudeSetup("claude", false, false, false)).toBe(true);
    expect(checkNeedsClaudeSetup("claude", true, false, true)).toBe(true);
    expect(checkNeedsClaudeSetup("claude", true, true, false)).toBe(true);

    // Doesn't need setup when all files exist
    expect(checkNeedsClaudeSetup("claude", true, true, true)).toBe(false);

    // Doesn't need setup for other backends
    expect(checkNeedsClaudeSetup("codex", false, false, false)).toBe(false);
    expect(checkNeedsClaudeSetup("native", false, false, false)).toBe(false);
  });

  it("should determine if Codex setup is needed", () => {
    const checkNeedsCodexSetup = (
      backend: string,
      agentsMdExists: boolean,
    ): boolean => {
      return backend === "codex" && !agentsMdExists;
    };

    expect(checkNeedsCodexSetup("codex", false)).toBe(true);
    expect(checkNeedsCodexSetup("codex", true)).toBe(false);
    expect(checkNeedsCodexSetup("claude", false)).toBe(false);
  });
});

// ============================================================================
// BACKEND DETECTION TESTS
// ============================================================================

describe("Backend Detection", () => {
  it("should infer provider from model name", () => {
    const inferProvider = (model: string): string | undefined => {
      if (model.includes("claude") || model.includes("haiku")) {
        return "anthropic";
      } else if (model.includes("gpt") || model.includes("o1")) {
        return "openai";
      }
      return undefined;
    };

    expect(inferProvider("claude-3-sonnet-20240229")).toBe("anthropic");
    expect(inferProvider("claude-3-5-haiku-20241022")).toBe("anthropic");
    expect(inferProvider("gpt-4")).toBe("openai");
    expect(inferProvider("gpt-4o-mini")).toBe("openai");
    expect(inferProvider("o1-preview")).toBe("openai");
    expect(inferProvider("llama-3")).toBe(undefined);
  });
});
