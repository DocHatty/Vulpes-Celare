/**
 * ============================================================================
 * VULPES ACP SERVER - Agent Client Protocol Server
 * ============================================================================
 *
 * Implements an ACP-compatible JSON-RPC 2.0 server that Claude Code
 * and other ACP clients can connect to.
 *
 * Protocol: JSON-RPC 2.0 over HTTP
 * Default Port: 3000
 */
export interface ACPServerConfig {
    port: number;
    host: string;
    verbose: boolean;
}
export declare class ACPServer {
    private config;
    private server;
    private vulpes;
    constructor(config?: Partial<ACPServerConfig>);
    start(): Promise<void>;
    stop(): Promise<void>;
    private handleRequest;
    private handleJsonRpc;
    private getManifest;
    private handleRedact;
    private handleChat;
    private getContext;
    private printBanner;
}
export declare function handleACPServer(options: any): Promise<void>;
//# sourceMappingURL=ACPServer.d.ts.map