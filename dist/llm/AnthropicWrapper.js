"use strict";
/**
 * VULPES CELARE - ANTHROPIC SDK WRAPPER
 *
 * Drop-in replacement for Anthropic SDK that automatically redacts PHI
 * before sending to the API and optionally re-identifies on response.
 *
 * @module llm/AnthropicWrapper
 *
 * @example
 * ```typescript
 * // Before (unsafe - PHI goes to Anthropic)
 * import Anthropic from '@anthropic-ai/sdk';
 * const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 *
 * // After (safe - PHI never leaves your network)
 * import { VulpesAnthropic } from 'vulpes-celare/llm';
 * const anthropic = new VulpesAnthropic({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   redaction: { enabled: true, reidentifyResponse: true }
 * });
 *
 * // Same API!
 * const response = await anthropic.messages.create({
 *   model: 'claude-3-5-sonnet-20241022',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: clinicalNote }]
 * });
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VulpesAnthropic = void 0;
const BaseLLMWrapper_1 = require("./BaseLLMWrapper");
/**
 * VulpesAnthropic - Drop-in Anthropic SDK replacement with PHI redaction
 *
 * Wraps the Anthropic API to automatically redact PHI before sending
 * and optionally re-identify PHI in responses.
 */
class VulpesAnthropic extends BaseLLMWrapper_1.BaseLLMWrapper {
    apiKey;
    baseURL;
    defaultHeaders;
    timeout;
    maxRetries;
    /** Messages API (Anthropic-compatible interface) */
    messages;
    constructor(config) {
        super(config.redaction || {});
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL || "https://api.anthropic.com";
        this.defaultHeaders = config.defaultHeaders || {};
        this.timeout = config.timeout || 60000;
        this.maxRetries = config.maxRetries || 2;
        // Initialize messages interface
        this.messages = {
            create: this.createMessage.bind(this),
        };
    }
    /**
     * Create a message with automatic PHI redaction
     *
     * @param params - Anthropic message parameters
     * @returns Message response with PHI restored (if configured)
     */
    async createMessage(params) {
        // Generate session ID for this request
        const sessionId = this.generateSessionId();
        // Redact PHI from system prompt if present
        let redactedSystem = params.system;
        if (params.system && this.config.enabled) {
            const systemMapping = await this.redactText(params.system, sessionId);
            redactedSystem = systemMapping.redactedText;
        }
        // Redact PHI from all messages
        const redactedMessages = [];
        let totalRedacted = 0;
        for (const message of params.messages) {
            if (typeof message.content === "string") {
                const mapping = await this.redactText(message.content, sessionId);
                totalRedacted += mapping.redactionCount;
                redactedMessages.push({
                    ...message,
                    content: mapping.redactedText,
                });
            }
            else if (Array.isArray(message.content)) {
                // Handle multi-modal content
                const redactedBlocks = [];
                for (const block of message.content) {
                    if (block.type === "text" && block.text) {
                        const mapping = await this.redactText(block.text, sessionId);
                        totalRedacted += mapping.redactionCount;
                        redactedBlocks.push({
                            ...block,
                            text: mapping.redactedText,
                        });
                    }
                    else {
                        // Pass through non-text blocks (images)
                        redactedBlocks.push(block);
                    }
                }
                redactedMessages.push({
                    ...message,
                    content: redactedBlocks,
                });
            }
            else {
                redactedMessages.push(message);
            }
        }
        // Get token manager for re-identification
        const tokenManager = this.sessionTokenManagers.get(sessionId);
        // Make API request with redacted content
        const response = await this.makeRequest("/v1/messages", {
            ...params,
            system: redactedSystem,
            messages: redactedMessages,
        });
        // Re-identify PHI in response if configured
        if (this.config.reidentifyResponse && totalRedacted > 0 && tokenManager) {
            for (const block of response.content) {
                if (block.type === "text" && block.text) {
                    block.text = this.reidentifyText(block.text, tokenManager);
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
     * Make HTTP request to Anthropic API with production-grade retry logic
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
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
            ...this.defaultHeaders,
        };
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
                        throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`);
                    }
                    // Retryable error - throw to enter retry loop
                    throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`);
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
     * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
     */
    calculateBackoffWithJitter(attempt) {
        const base = VulpesAnthropic.BASE_DELAY_MS;
        const cap = VulpesAnthropic.MAX_BACKOFF_MS;
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
     * @param model - Model to use (default: claude-3-5-sonnet-20241022)
     * @param maxTokens - Maximum tokens (default: 1024)
     * @returns Completion text
     */
    async complete(prompt, model = "claude-3-5-sonnet-20241022", maxTokens = 1024) {
        const response = await this.messages.create({
            model,
            max_tokens: maxTokens,
            messages: [{ role: "user", content: prompt }],
        });
        return response.content[0]?.text || "";
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
exports.VulpesAnthropic = VulpesAnthropic;
//# sourceMappingURL=AnthropicWrapper.js.map