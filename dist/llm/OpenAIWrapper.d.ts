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
export declare class VulpesOpenAI extends BaseLLMWrapper {
    private apiKey;
    private baseURL;
    private organization?;
    private defaultHeaders;
    private timeout;
    private maxRetries;
    /** Chat completions API (OpenAI-compatible interface) */
    chat: {
        completions: {
            create: (params: OpenAIChatCompletionParams) => Promise<OpenAIChatCompletionResponse>;
        };
    };
    constructor(config: VulpesOpenAIConfig);
    /**
     * Create a chat completion with automatic PHI redaction
     *
     * @param params - OpenAI chat completion parameters
     * @returns Chat completion response with PHI restored (if configured)
     */
    private createChatCompletion;
    /** Maximum backoff delay in ms (30 seconds cap per AWS best practices) */
    private static readonly MAX_BACKOFF_MS;
    /** Base delay for exponential backoff in ms */
    private static readonly BASE_DELAY_MS;
    /**
     * Make HTTP request to OpenAI API with production-grade retry logic
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
     * Formula: min(cap, random_between(base, previousDelay * 3))
     * On first attempt: random_between(base, base * 2)
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
     * @param model - Model to use (default: gpt-4o-mini)
     * @returns Completion text
     */
    complete(prompt: string, model?: string): Promise<string>;
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
//# sourceMappingURL=OpenAIWrapper.d.ts.map