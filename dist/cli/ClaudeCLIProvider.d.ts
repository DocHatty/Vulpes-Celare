/**
 * ============================================================================
 * CLAUDE CLI PROVIDER - No API Key Required
 * ============================================================================
 *
 * Integrates with the Claude Code CLI to provide chat capabilities using
 * your existing Claude Max/Pro subscription - NO API KEY NEEDED.
 *
 * How it works:
 * 1. Spawns `claude` CLI as a subprocess with --output-format stream-json
 * 2. Parses streaming JSON output for real-time token display
 * 3. Uses CLI's cached OAuth authentication (run `claude /login` once)
 *
 * This is the same approach used by Roo Code and Cline VS Code extensions.
 *
 * @see https://docs.roocode.com/providers/claude-code
 * @see https://code.claude.com/docs/en/cli-reference
 */
interface CLIConfig {
    mode: "dev" | "qa" | "production";
    model?: string;
    maxTurns?: number;
    workingDir: string;
    verbose: boolean;
    injectSystemPrompt: boolean;
}
export declare class ClaudeCLIProvider {
    private config;
    private vulpes;
    private cliProcess;
    private conversationId;
    private totalInputTokens;
    private totalOutputTokens;
    constructor(config?: Partial<CLIConfig>);
    start(): Promise<void>;
    private checkCLIAvailable;
    private setupGitBashPath;
    private printBanner;
    private chatLoop;
    private streamCLIResponse;
    private handleStreamMessage;
    private handleCommand;
    private printHelp;
}
export declare function handleClaudeCLI(options: any): Promise<void>;
export {};
//# sourceMappingURL=ClaudeCLIProvider.d.ts.map