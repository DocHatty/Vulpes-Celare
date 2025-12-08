/**
 * ============================================================================
 * VULPES NATIVE CHAT - Universal API Chat with Streaming
 * ============================================================================
 *
 * A beautiful, native streaming chat experience supporting multiple providers:
 * - Anthropic (Claude)
 * - OpenAI (GPT)
 * - OpenRouter (100+ models)
 * - Ollama (Local)
 * - Custom endpoints
 *
 * Features:
 * - Interactive provider/model selection with auto-discovery
 * - Streaming API responses (token by token)
 * - Tool calling (files, tests, redaction)
 * - Interactive redaction mode
 * - Quick redact command
 * - System info display
 * - Full Vulpes engine integration
 */
interface ChatConfig {
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens: number;
    workingDir: string;
    mode: "dev" | "qa" | "production";
    verbose: boolean;
    subagentsEnabled?: boolean;
    subagentProvider?: string;
    subagentModel?: string;
    subagentApiKey?: string;
    maxParallelSubagents?: number;
}
export declare class NativeChat {
    private config;
    private vulpes;
    private provider;
    private orchestrator;
    private messages;
    private renderMarkdownEnabled;
    private interactiveRedactionActive;
    private subagentsEnabled;
    constructor(config: Partial<ChatConfig>);
    start(): Promise<void>;
    private initializeOrchestrator;
    private initializeConversation;
    private printBanner;
    private chatLoop;
    private streamResponse;
    private executeTool;
    private toolRedactText;
    private toolAnalyzeRedaction;
    private toolReadFile;
    private toolWriteFile;
    private toolRunCommand;
    private toolListFiles;
    private toolSearchCode;
    private toolGetSystemInfo;
    private toolRunTests;
    private handleCommand;
    private quickRedact;
    private interactiveRedaction;
    private toggleSubagents;
    private orchestrateTask;
    private changeProvider;
    private printSystemInfo;
    private printHelp;
    private renderMarkdown;
    private hasMarkdown;
}
export declare function handleNativeChat(options: any): Promise<void>;
export {};
//# sourceMappingURL=NativeChat.d.ts.map