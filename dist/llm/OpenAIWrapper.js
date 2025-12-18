"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VulpesOpenAI = void 0;
const BaseLLMWrapper_1 = require("./BaseLLMWrapper");
/**
 * VulpesOpenAI - Drop-in OpenAI SDK replacement with PHI redaction
 *
 * Wraps the OpenAI API to automatically redact PHI before sending
 * and optionally re-identify PHI in responses.
 */
class VulpesOpenAI extends BaseLLMWrapper_1.BaseLLMWrapper {
    apiKey;
    baseURL;
    organization;
    defaultHeaders;
    timeout;
    maxRetries;
    /** Chat completions API (OpenAI-compatible interface) */
    chat;
    constructor(config) {
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
    async createChatCompletion(params) {
        // Generate session ID for this request
        const sessionId = this.generateSessionId();
        // Redact PHI from all messages
        const { messages: redactedMessages, tokenManager, totalRedacted } = await this.redactMessages(params.messages.map((m) => ({
            ...m,
            content: m.content || "",
        })), sessionId);
        // Restore null content where appropriate
        const finalMessages = redactedMessages.map((m, i) => ({
            ...m,
            content: params.messages[i].content === null ? null : m.content,
        }));
        // Make API request with redacted content
        const response = await this.makeRequest("/chat/completions", {
            ...params,
            messages: finalMessages,
        });
        // Re-identify PHI in response if configured
        if (this.config.reidentifyResponse && totalRedacted > 0) {
            for (const choice of response.choices) {
                if (choice.message.content) {
                    choice.message.content = this.reidentifyText(choice.message.content, tokenManager);
                }
            }
        }
        // Clean up session
        this.clearSession(sessionId);
        return response;
    }
    /** Maximum backoff delay in ms (30 seconds cap per AWS best practices) */
    static MAX_BACKOFF_MS = 30000;
    /** Base delay for exponential backoff in ms */
    static BASE_DELAY_MS = 1000;
    /**
     * Make HTTP request to OpenAI API with production-grade retry logic
     *
     * Implements exponential backoff with decorrelated jitter following
     * AWS best practices to prevent thundering herd problems.
     *
     * @see https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
     */
    async makeRequest(endpoint, body) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            ...this.defaultHeaders,
        };
        if (this.organization) {
            headers["OpenAI-Organization"] = this.organization;
        }
        let lastError = null;
        let lastStatus = null;
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
                        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
                    }
                    // Retryable error - throw to enter retry loop
                    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorBody}`);
                }
                return (await response.json());
            }
            catch (error) {
                lastError = error;
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
    isRetryableStatus(status) {
        // 429 Too Many Requests - retryable (rate limiting)
        if (status === 429)
            return true;
        // 5xx server errors - retryable
        if (status >= 500 && status < 600)
            return true;
        // 4xx client errors (except 429) - not retryable
        if (status >= 400 && status < 500)
            return false;
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
    calculateBackoffWithJitter(attempt) {
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
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Simple text completion (convenience method)
     *
     * @param prompt - Text prompt
     * @param model - Model to use (default: gpt-4o-mini)
     * @returns Completion text
     */
    async complete(prompt, model = "gpt-4o-mini") {
        const response = await this.chat.completions.create({
            model,
            messages: [{ role: "user", content: prompt }],
        });
        return response.choices[0]?.message?.content || "";
    }
    /**
     * Get redaction statistics for this wrapper instance
     */
    getRedactionStats() {
        const stats = this.getStats();
        return {
            enabled: this.config.enabled,
            reidentifyEnabled: this.config.reidentifyResponse,
            ...stats,
        };
    }
}
exports.VulpesOpenAI = VulpesOpenAI;
//# sourceMappingURL=OpenAIWrapper.js.map