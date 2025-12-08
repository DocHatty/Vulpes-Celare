#!/usr/bin/env node
/**
 * ============================================================================
 * VULPES ACP AGENT - Agent Client Protocol Implementation
 * ============================================================================
 *
 * Implements an ACP-compatible agent that communicates via stdin/stdout
 * using JSON-RPC 2.0 (newline-delimited JSON).
 *
 * Usage: vulpes acp
 * Then configure your editor (Zed, Avante, etc.) to spawn this command.
 */
export declare class ACPAgent {
    private vulpes;
    private sessions;
    private rl;
    constructor();
    start(): Promise<void>;
    private send;
    private sendError;
    private sendNotification;
    private handleRequest;
    private handleInitialize;
    private handleSessionNew;
    private handleSessionPrompt;
    private handleSessionCancel;
    private handleToolsList;
    private handleToolsCall;
}
export declare function handleACPAgent(): Promise<void>;
//# sourceMappingURL=ACPAgent.d.ts.map