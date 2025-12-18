/**
 * VULPES CELARE - OPENAI SDK WRAPPER
 *
 * Drop-in replacement for OpenAI SDK that automatically redacts PHI
 * before sending to the API and optionally re-identifies on response.
 *
 * @module llm/OpenAIWrapper
 *
 * @example
 * ```typescript
 * // Before (unsafe - PHI goes to OpenAI)
 * import OpenAI from 'openai';
 * const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *
 * // After (safe - PHI never leaves your network)
 * import { VulpesOpenAI } from 'vulpes-celare/llm';
 * const openai = new VulpesOpenAI({
 *   apiKey: process.env.OPENAI_API_KEY,
 *   redaction: { enabled: true, reidentifyResponse: true }
 * });
 *
 * // Same API!
 * const response = await openai.chat.completions.create({
 *   model: 'gpt-4',
 *   messages: [{ role: 'user', content: clinicalNote }]
 * });
 * ```
 */

import { BaseLLMWrapper, LLMRedactionConfig } from "./BaseLLMWrapper";

/**
 * OpenAI-compatible message format
 */
export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "function" | "tool";
  content: string | null;
  name?: string;
  function_call?: unknown;
  tool_calls?: unknown[];
}

/**
 * OpenAI chat completion request parameters (subset)
 */
export interface OpenAIChatCompletionParams {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  functions?: unknown[];
  function_call?: unknown;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
  seed?: number;
}

/**
 * OpenAI chat completion response (subset)
 */
export interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      function_call?: unknown;
      tool_calls?: unknown[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Configuration for VulpesOpenAI
 */
export interface VulpesOpenAIConfig {
  /** OpenAI API key */
  apiKey: string;

  /** OpenAI base URL (for proxies/custom endpoints) */
  baseURL?: string;

  /** Organization ID */
  organization?: string;

  /** Default headers */
  defaultHeaders?: Record<string, string>;

  /** Request timeout in ms */
  timeout?: number;

  /** Maximum retries */
  maxRetries?: number;

  /** Redaction configuration */
  redaction?: LLMRedactionConfig;
}

/**
 * VulpesOpenAI - Drop-in OpenAI SDK replacement with PHI redaction
 *
 * Wraps the OpenAI API to automatically redact PHI before sending
 * and optionally re-identify PHI in responses.
 */
export class VulpesOpenAI extends BaseLLMWrapper {
  private apiKey: string;
  private baseURL: string;
  private organization?: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private maxRetries: number;

  /** Chat completions API (OpenAI-compatible interface) */
  public chat: {
    completions: {
      create: (
        params: OpenAIChatCompletionParams
      ) => Promise<OpenAIChatCompletionResponse>;
    };
  };

  constructor(config: VulpesOpenAIConfig) {
    super(config.redaction || {});

    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || "https://api.openai.com/v1";
    this.organization = config.organization;
    this.defaultHeaders = config.defaultHeaders || {};
    this.timeout = config.timeout || 60000;
    this.maxRetries = config.maxRetries || 2;

    // Initialize chat.completions interface
    this.chat = {
      completions: {
        create: this.createChatCompletion.bind(this),
      },
    };
  }

  /**
   * Create a chat completion with automatic PHI redaction
   *
   * @param params - OpenAI chat completion parameters
   * @returns Chat completion response with PHI restored (if configured)
   */
  private async createChatCompletion(
    params: OpenAIChatCompletionParams
  ): Promise<OpenAIChatCompletionResponse> {
    // Generate session ID for this request
    const sessionId = this.generateSessionId();

    // Redact PHI from all messages
    const { messages: redactedMessages, tokenManager, totalRedacted } =
      await this.redactMessages(
        params.messages.map((m) => ({
          ...m,
          content: m.content || "",
        })),
        sessionId
      );

    // Restore null content where appropriate
    const finalMessages = redactedMessages.map((m, i) => ({
      ...m,
      content: params.messages[i].content === null ? null : m.content,
    }));

    // Make API request with redacted content
    const response = await this.makeRequest<OpenAIChatCompletionResponse>(
      "/chat/completions",
      {
        ...params,
        messages: finalMessages,
      }
    );

    // Re-identify PHI in response if configured
    if (this.config.reidentifyResponse && totalRedacted > 0) {
      for (const choice of response.choices) {
        if (choice.message.content) {
          choice.message.content = this.reidentifyText(
            choice.message.content,
            tokenManager
          );
        }
      }
    }

    // Clean up session
    this.clearSession(sessionId);

    return response;
  }

  /** Maximum backoff delay in ms (30 seconds cap per AWS best practices) */
  private static readonly MAX_BACKOFF_MS = 30000;

  /** Base delay for exponential backoff in ms */
  private static readonly BASE_DELAY_MS = 1000;

  /**
   * Make HTTP request to OpenAI API with production-grade retry logic
   *
   * Implements exponential backoff with decorrelated jitter following
   * AWS best practices to prevent thundering herd problems.
   *
   * @see https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
   */
  private async makeRequest<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...this.defaultHeaders,
    };

    if (this.organization) {
      headers["OpenAI-Organization"] = this.organization;
    }

    let lastError: Error | null = null;
    let lastStatus: number | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          lastStatus = response.status;
          const errorBody = await response.text();

          // Check if this is a retryable error BEFORE throwing
          if (!this.isRetryableStatus(response.status)) {
            throw new Error(
              `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`
            );
          }

          // Retryable error - throw to enter retry loop
          throw new Error(
            `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`
          );
        }

        return (await response.json()) as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors
        if (lastStatus !== null && !this.isRetryableStatus(lastStatus)) {
          throw error;
        }

        // Check if it's a timeout/abort error (retryable)
        const isTimeoutError = error instanceof Error &&
          (error.name === "AbortError" || error.message.includes("abort"));

        // Only retry on retryable conditions
        if (!isTimeoutError && lastStatus === null) {
          // Network error - retryable
        }

        // Wait before retrying with exponential backoff + decorrelated jitter
        if (attempt < this.maxRetries) {
          const delay = this.calculateBackoffWithJitter(attempt);
          await this.sleep(delay);
        }

        // Reset status for next attempt
        lastStatus = null;
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  /**
   * Determine if an HTTP status code is retryable
   *
   * Retryable: 429 (rate limit), 500, 502, 503, 504 (server errors)
   * Not retryable: 4xx client errors (except 429)
   */
  private isRetryableStatus(status: number): boolean {
    // 429 Too Many Requests - retryable (rate limiting)
    if (status === 429) return true;

    // 5xx server errors - retryable
    if (status >= 500 && status < 600) return true;

    // 4xx client errors (except 429) - not retryable
    if (status >= 400 && status < 500) return false;

    // Default: not retryable
    return false;
  }

  /**
   * Calculate backoff delay with decorrelated jitter
   *
   * Uses "decorrelated jitter" algorithm which provides better spread
   * than simple full jitter while maintaining bounded delays.
   *
   * Formula: min(cap, random_between(base, previousDelay * 3))
   * On first attempt: random_between(base, base * 2)
   *
   * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
   */
  private calculateBackoffWithJitter(attempt: number): number {
    const base = VulpesOpenAI.BASE_DELAY_MS;
    const cap = VulpesOpenAI.MAX_BACKOFF_MS;

    // Exponential component: 2^attempt * base
    const exponentialDelay = Math.pow(2, attempt) * base;

    // Add decorrelated jitter: random value between 0 and exponentialDelay
    // This spreads retries in time to prevent thundering herd
    const jitter = Math.random() * exponentialDelay;

    // Final delay with jitter, capped at maximum
    const delay = Math.min(cap, exponentialDelay + jitter);

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simple text completion (convenience method)
   *
   * @param prompt - Text prompt
   * @param model - Model to use (default: gpt-4o-mini)
   * @returns Completion text
   */
  async complete(prompt: string, model: string = "gpt-4o-mini"): Promise<string> {
    const response = await this.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0]?.message?.content || "";
  }

  /**
   * Get redaction statistics for this wrapper instance
   */
  getRedactionStats(): {
    enabled: boolean;
    reidentifyEnabled: boolean;
    totalRedactions: number;
    totalReidentifications: number;
  } {
    const stats = this.getStats();
    return {
      enabled: this.config.enabled,
      reidentifyEnabled: this.config.reidentifyResponse,
      ...stats,
    };
  }
}
