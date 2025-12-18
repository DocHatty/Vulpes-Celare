/**
 * ============================================================================
 * VULPES CELARE - UNIFIED API PROVIDER SYSTEM
 * ============================================================================
 *
 * Multi-provider LLM integration with automatic model discovery.
 * Supports: OpenAI, Anthropic, OpenRouter, Ollama, Azure, and custom endpoints.
 *
 * Features:
 * - Auto-detect available models via API ping
 * - Interactive provider/model selection
 * - Unified streaming interface
 * - Vulpes system prompt injection
 */
export interface ProviderConfig {
    id: string;
    name: string;
    baseUrl: string;
    authHeader: string;
    authPrefix: string;
    envKey: string;
    modelsEndpoint: string;
    chatEndpoint: string;
    modelExtractor: (response: any) => ModelInfo[];
    requestBuilder: (messages: Message[], model: string, options: RequestOptions) => any;
    responseExtractor: (chunk: any) => {
        text?: string;
        done?: boolean;
        toolUse?: ToolUseEvent;
    };
    supportsStreaming: boolean;
    supportsTools: boolean;
}
export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
    contextLength?: number;
    pricing?: {
        input: number;
        output: number;
    };
}
export interface Message {
    role: "user" | "assistant" | "system";
    content: string | ContentBlock[];
}
export interface ContentBlock {
    type: "text" | "tool_use" | "tool_result";
    text?: string;
    id?: string;
    name?: string;
    input?: any;
    tool_use_id?: string;
    content?: string;
}
export interface RequestOptions {
    maxTokens?: number;
    temperature?: number;
    tools?: Tool[];
    stream?: boolean;
}
export interface Tool {
    name: string;
    description: string;
    input_schema: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
}
export interface ToolUseEvent {
    id: string;
    name: string;
    input: any;
}
export interface StreamEvent {
    type: "text" | "tool_use_start" | "tool_use_delta" | "tool_use_end" | "done" | "error";
    text?: string;
    toolUse?: ToolUseEvent;
    error?: string;
}
export declare const PROVIDERS: Record<string, ProviderConfig>;
export declare class APIProvider {
    private config;
    private apiKey;
    private baseUrl;
    private selectedModel;
    private availableModels;
    constructor(providerId: string, apiKey?: string, customBaseUrl?: string);
    fetchAvailableModels(): Promise<ModelInfo[]>;
    validateApiKey(): Promise<boolean>;
    getAvailableModels(): ModelInfo[];
    setModel(modelId: string): void;
    getModel(): string | null;
    getProviderName(): string;
    getProviderId(): string;
    supportsTools(): boolean;
    streamChat(messages: Message[], options?: RequestOptions): AsyncGenerator<StreamEvent>;
    chat(messages: Message[], options?: RequestOptions): Promise<string>;
}
export declare function interactiveProviderSetup(): Promise<{
    provider: APIProvider;
    model: string;
} | null>;
export declare function createProviderFromOptions(options: {
    provider?: string;
    apiKey?: string;
    model?: string;
    baseUrl?: string;
}): APIProvider | null;
//# sourceMappingURL=APIProvider.d.ts.map