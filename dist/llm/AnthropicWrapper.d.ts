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
import { BaseLLMWrapper, LLMRedactionConfig } from "./BaseLLMWrapper";
/**
 * Anthropic message format
 */
export interface AnthropicMessage {
    role: "user" | "assistant";
    content: string | AnthropicContentBlock[];
}
/**
 * Anthropic content block (for multi-modal)
 */
export interface AnthropicContentBlock {
    type: "text" | "image";
    text?: string;
    source?: {
        type: "base64";
        media_type: string;
        data: string;
    };
}
/**
 * Anthropic message create parameters
 */
export interface AnthropicMessageParams {
    model: string;
    max_tokens: number;
    messages: AnthropicMessage[];
    system?: string;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stop_sequences?: string[];
    stream?: boolean;
    metadata?: {
        user_id?: string;
    };
}
/**
 * Anthropic message response
 */
export interface AnthropicMessageResponse {
    id: string;
    type: "message";
    role: "assistant";
    content: Array<{
        type: "text";
        text: string;
    }>;
    model: string;
    stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | null;
    stop_sequence: string | null;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}
/**
 * Configuration for VulpesAnthropic
 */
export interface VulpesAnthropicConfig {
    /** Anthropic API key */
    apiKey: string;
    /** Anthropic base URL (for proxies/custom endpoints) */
    baseURL?: string;
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
 * VulpesAnthropic - Drop-in Anthropic SDK replacement with PHI redaction
 *
 * Wraps the Anthropic API to automatically redact PHI before sending
 * and optionally re-identify PHI in responses.
 */
export declare class VulpesAnthropic extends BaseLLMWrapper {
    private apiKey;
    private baseURL;
    private defaultHeaders;
    private timeout;
    private maxRetries;
    /** Messages API (Anthropic-compatible interface) */
    messages: {
        create: (params: AnthropicMessageParams) => Promise<AnthropicMessageResponse>;
    };
    constructor(config: VulpesAnthropicConfig);
    /**
     * Create a message with automatic PHI redaction
     *
     * @param params - Anthropic message parameters
     * @returns Message response with PHI restored (if configured)
     */
    private createMessage;
    /** Maximum backoff delay in ms (30 seconds cap per AWS best practices) */
    private static readonly MAX_BACKOFF_MS;
    /** Base delay for exponential backoff in ms */
    private static readonly BASE_DELAY_MS;
    /**
     * Make HTTP request to Anthropic API with production-grade retry logic
     *
     * Implements exponential backoff with decorrelated jitter following
     * AWS best practices to prevent thundering herd problems.
     *
     * @see https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
     */
    private makeRequest;
    /**
     * Determine if an HTTP status code is retryable
     *
     * Retryable: 429 (rate limit), 500, 502, 503, 504 (server errors)
     * Not retryable: 4xx client errors (except 429)
     */
    private isRetryableStatus;
    /**
     * Calculate backoff delay with decorrelated jitter
     *
     * Uses "decorrelated jitter" algorithm which provides better spread
     * than simple full jitter while maintaining bounded delays.
     *
     * @see https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
     */
    private calculateBackoffWithJitter;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Simple text completion (convenience method)
     *
     * @param prompt - Text prompt
     * @param model - Model to use (default: claude-3-5-sonnet-20241022)
     * @param maxTokens - Maximum tokens (default: 1024)
     * @returns Completion text
     */
    complete(prompt: string, model?: string, maxTokens?: number): Promise<string>;
    /**
     * Get redaction statistics for this wrapper instance
     */
    getRedactionStats(): {
        enabled: boolean;
        reidentifyEnabled: boolean;
        totalRedactions: number;
        totalReidentifications: number;
    };
}
//# sourceMappingURL=AnthropicWrapper.d.ts.map