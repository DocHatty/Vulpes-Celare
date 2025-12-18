/**
 * ============================================================================
 * VULPES CELARE - LLM Integration
 * ============================================================================
 *
 * Seamless integration with Claude, OpenAI, and other LLM APIs.
 * Automatically redacts PHI before sending to external services.
 *
 * Features:
 * - Safe Chat: Interactive mode with auto-redaction
 * - Pipe Mode: Redact and forward to LLM in one command
 * - Instruction Injection: Auto-inject safety instructions
 * - Multi-provider support: Claude, OpenAI, Azure, local models
 */
import { VulpesCelareConfig } from "../VulpesCelare";
export type LLMProvider = "claude" | "openai" | "azure" | "ollama" | "custom";
export interface LLMConfig {
    provider: LLMProvider;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
    injectSafetyInstructions?: boolean;
}
export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}
export interface LLMResponse {
    content: string;
    model: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}
export declare const SafetyInstructions: {
    STANDARD: string;
    CLINICAL: string;
    RESEARCH: string;
    STRICT: string;
};
export declare class LLMIntegration {
    private vulpes;
    private provider;
    private config;
    private conversationHistory;
    private stats;
    constructor(llmConfig: LLMConfig, vulpesConfig?: VulpesCelareConfig);
    /**
     * Send a message with automatic PHI redaction
     */
    sendMessage(userMessage: string): Promise<{
        response: string;
        redactedInput: string;
        phiCount: number;
        usage?: {
            inputTokens: number;
            outputTokens: number;
        };
    }>;
    /**
     * Process a file and send to LLM
     */
    processFile(filePath: string, prompt?: string): Promise<string>;
    /**
     * Interactive safe chat mode
     */
    interactiveChat(): Promise<void>;
    /**
     * One-shot query with redaction
     */
    query(text: string): Promise<{
        response: string;
        redactedInput: string;
        phiCount: number;
    }>;
    getStats(): {
        messagesProcessed: number;
        phiRedacted: number;
        tokensUsed: {
            input: number;
            output: number;
        };
    };
    private printStats;
    private truncate;
    private formatResponse;
}
export declare function handleSafeChat(options: any): Promise<void>;
export declare function handleQuery(text: string, options: any): Promise<void>;
//# sourceMappingURL=LLMIntegration.d.ts.map