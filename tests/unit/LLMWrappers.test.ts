/**
 * Tests for LLM SDK Wrappers
 *
 * Note: These tests mock the actual API calls to avoid network dependencies.
 * Integration tests with real APIs should be run separately.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  VulpesOpenAI,
  VulpesAnthropic,
  BaseLLMWrapper,
} from "../../src/llm";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("LLM Wrappers", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("VulpesOpenAI", () => {
    it("should initialize with API key", () => {
      const client = new VulpesOpenAI({
        apiKey: "test-key",
      });

      expect(client).toBeDefined();
      expect(client.chat).toBeDefined();
      expect(client.chat.completions).toBeDefined();
    });

    it("should redact PHI from messages before API call", async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "chatcmpl-123",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-4",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "The patient information has been recorded.",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 10,
            total_tokens: 20,
          },
        }),
      });

      const client = new VulpesOpenAI({
        apiKey: "test-key",
        redaction: { enabled: true },
      });

      const response = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: "Patient John Smith has SSN 123-45-6789",
          },
        ],
      });

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Get the request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      // The message content should have been redacted (no raw SSN)
      expect(requestBody.messages[0].content).not.toContain("123-45-6789");

      // Response should be returned
      expect(response.choices[0].message.content).toBeDefined();
    });

    it("should pass through when redaction is disabled", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "chatcmpl-123",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-4",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Response",
              },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const client = new VulpesOpenAI({
        apiKey: "test-key",
        redaction: { enabled: false },
      });

      await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: "Patient John Smith has SSN 123-45-6789",
          },
        ],
      });

      // Get the request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      // With redaction disabled, content should be unchanged
      expect(requestBody.messages[0].content).toContain("123-45-6789");
    });

    it("should track redaction statistics", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "chatcmpl-123",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-4",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Done" },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const client = new VulpesOpenAI({
        apiKey: "test-key",
        redaction: { enabled: true, logRedactions: true },
      });

      await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "user",
            content: "SSN: 123-45-6789",
          },
        ],
      });

      const stats = client.getRedactionStats();
      expect(stats.enabled).toBe(true);
      expect(stats.totalRedactions).toBeGreaterThan(0);
    });

    it("should use correct headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "chatcmpl-123",
          object: "chat.completion",
          created: Date.now(),
          model: "gpt-4",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Done" },
              finish_reason: "stop",
            },
          ],
        }),
      });

      const client = new VulpesOpenAI({
        apiKey: "test-api-key",
        organization: "test-org",
      });

      await client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello" }],
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["Authorization"]).toBe("Bearer test-api-key");
      expect(headers["OpenAI-Organization"]).toBe("test-org");
    });
  });

  describe("VulpesAnthropic", () => {
    it("should initialize with API key", () => {
      const client = new VulpesAnthropic({
        apiKey: "test-key",
      });

      expect(client).toBeDefined();
      expect(client.messages).toBeDefined();
    });

    it("should redact PHI from messages before API call", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "msg_123",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "The information has been noted.",
            },
          ],
          model: "claude-3-5-sonnet-20241022",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: {
            input_tokens: 10,
            output_tokens: 10,
          },
        }),
      });

      const client = new VulpesAnthropic({
        apiKey: "test-key",
        redaction: { enabled: true },
      });

      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: "Patient email: john.smith@hospital.com",
          },
        ],
      });

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Get the request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      // The message content should have been redacted (no raw email)
      expect(requestBody.messages[0].content).not.toContain(
        "john.smith@hospital.com"
      );

      // Response should be returned
      expect(response.content[0].text).toBeDefined();
    });

    it("should redact PHI from system prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "msg_123",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "Response" }],
          model: "claude-3-5-sonnet-20241022",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      });

      const client = new VulpesAnthropic({
        apiKey: "test-key",
        redaction: { enabled: true },
      });

      await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: "The patient SSN is 987-65-4321. Keep this confidential.",
        messages: [{ role: "user", content: "What is the SSN?" }],
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      // System prompt should be redacted
      expect(requestBody.system).not.toContain("987-65-4321");
    });

    it("should use correct headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "msg_123",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "Done" }],
          model: "claude-3-5-sonnet-20241022",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 10, output_tokens: 10 },
        }),
      });

      const client = new VulpesAnthropic({
        apiKey: "test-anthropic-key",
      });

      await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Hello" }],
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["x-api-key"]).toBe("test-anthropic-key");
      expect(headers["anthropic-version"]).toBe("2023-06-01");
    });
  });

  describe("BaseLLMWrapper", () => {
    it("should generate unique session IDs", () => {
      // Create a concrete implementation for testing
      class TestWrapper extends BaseLLMWrapper {
        getSessionId(): string {
          return this["generateSessionId"]();
        }
      }

      const wrapper = new TestWrapper();
      const id1 = wrapper.getSessionId();
      const id2 = wrapper.getSessionId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^llm-\d+-\w+$/);
    });

    it("should manage audit log", () => {
      class TestWrapper extends BaseLLMWrapper {
        addAuditEntry() {
          this["auditLog"].push({
            timestamp: new Date().toISOString(),
            operation: "redact",
            phiCount: 5,
            executionTimeMs: 10,
          });
        }
      }

      const wrapper = new TestWrapper();
      expect(wrapper.getAuditLog()).toHaveLength(0);

      wrapper.addAuditEntry();
      expect(wrapper.getAuditLog()).toHaveLength(1);

      wrapper.clearAuditLog();
      expect(wrapper.getAuditLog()).toHaveLength(0);
    });
  });
});
