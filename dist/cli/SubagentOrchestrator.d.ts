/**
 * ============================================================================
 * VULPES CELARE - INTELLIGENT SUBAGENT ORCHESTRATION SYSTEM
 * ============================================================================
 *
 * A workflow-aware multi-agent architecture with DYNAMIC parallel/serial
 * execution based on task dependencies and intelligent routing.
 *
 * KEY INNOVATION: The orchestrator understands Vulpes workflows and
 * automatically determines optimal execution strategy.
 *
 * WORKFLOW PATTERNS (Auto-detected):
 *
 * 1. PHI LEAK FIX WORKFLOW (Serial - dependency chain)
 *    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
 *    │ SCOUT   │ → │ ANALYST │ → │ ENGINEER│ → │ TESTER  │ → │ AUDITOR │
 *    │(scan)   │   │(diagnose│   │(fix)    │   │(verify) │   │(certify)│
 *    └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
 *
 * 2. BATCH DOCUMENT SCAN (Parallel - independent)
 *    ┌─────────┐
 *    │ SCOUT-1 │──┐
 *    └─────────┘  │   ┌─────────────┐
 *    ┌─────────┐  ├──→│ AGGREGATOR  │
 *    │ SCOUT-2 │──┤   │ (combine)   │
 *    └─────────┘  │   └─────────────┘
 *    ┌─────────┐  │
 *    │ SCOUT-N │──┘
 *    └─────────┘
 *
 * 3. REGRESSION HUNT (Hybrid - parallel scan, serial fix)
 *    ┌──────────────────────────┐
 *    │    PARALLEL PHASE        │
 *    │  ┌───────┐ ┌───────┐    │    ┌─────────┐   ┌─────────┐
 *    │  │SCOUT  │ │ANALYST│    │ →  │ENGINEER │ → │ TESTER  │
 *    │  └───────┘ └───────┘    │    │(fix)    │   │(verify) │
 *    └──────────────────────────┘    └─────────┘   └─────────┘
 *
 * SUBAGENT ROLES (Redesigned for Vulpes workflows):
 *
 * 1. SCOUT - Fast reconnaissance
 *    - Quick document scanning
 *    - PHI detection
 *    - Pattern identification
 *    - Returns structured findings
 *
 * 2. ANALYST - Deep investigation
 *    - Root cause analysis
 *    - Filter behavior analysis
 *    - Dictionary coverage gaps
 *    - Detailed diagnostics
 *
 * 3. ENGINEER - Code modifications
 *    - Filter fixes
 *    - Regex improvements
 *    - Dictionary updates
 *    - Returns precise diffs
 *
 * 4. TESTER - Validation
 *    - Run test suites
 *    - Metric comparison
 *    - Regression detection
 *    - Pass/fail verdicts
 *
 * 5. AUDITOR - Compliance & quality
 *    - HIPAA compliance check
 *    - Risk assessment
 *    - Quality certification
 *    - Final sign-off
 *
 * 6. SETUP - Environment preparation
 *    - MCP server status
 *    - API connectivity
 *    - Cortex initialization
 *    - Returns readiness report
 */
import { APIProvider, Message, Tool } from "./APIProvider";
export type SubagentRole = "scout" | "analyst" | "engineer" | "tester" | "auditor" | "setup";
export type WorkflowType = "phi_leak_fix" | "batch_scan" | "regression_hunt" | "compliance_audit" | "dictionary_update" | "quick_scan" | "system_check" | "custom";
export type ExecutionMode = "parallel" | "serial" | "hybrid";
export interface SubagentTask {
    id: string;
    role: SubagentRole;
    prompt: string;
    context?: Record<string, any>;
    priority?: "critical" | "high" | "normal" | "low";
    timeout?: number;
    dependsOn?: string[];
    phase?: number;
}
export interface SubagentResult {
    taskId: string;
    role: SubagentRole;
    success: boolean;
    result?: string;
    error?: string;
    executionTimeMs: number;
    tokensUsed?: {
        input: number;
        output: number;
    };
    findings?: any;
}
export interface WorkflowPlan {
    type: WorkflowType;
    mode: ExecutionMode;
    phases: SubagentTask[][];
    estimatedTime?: string;
    description: string;
}
export interface OrchestratorConfig {
    mainProvider?: string;
    mainModel?: string;
    mainApiKey?: string;
    subagentProvider?: string;
    subagentModel?: string;
    subagentApiKey?: string;
    maxParallel?: number;
    workingDir?: string;
    mode?: "dev" | "qa" | "production";
    verbose?: boolean;
    autoRoute?: boolean;
}
declare function detectWorkflow(userMessage: string): WorkflowType;
declare const WORKFLOW_TEMPLATES: Record<WorkflowType, (context: any) => Partial<WorkflowPlan>>;
declare const SUBAGENT_PROMPTS: Record<SubagentRole, string>;
declare const SUBAGENT_TOOLS: Record<SubagentRole, Tool[]>;
export declare class SubagentOrchestrator {
    private config;
    private mainProvider;
    private subagentProvider;
    private taskQueue;
    constructor(config: OrchestratorConfig, mainProvider: APIProvider);
    setSubagentProvider(provider: APIProvider): void;
    /**
     * Analyze user request and create optimal workflow plan
     */
    planWorkflow(userMessage: string, context?: any): WorkflowPlan;
    /**
     * Execute a workflow plan with intelligent parallel/serial handling
     * Uses p-queue for rate limiting and records results to agent memory
     */
    executeWorkflow(plan: WorkflowPlan): Promise<{
        results: SubagentResult[];
        summary: string;
    }>;
    private logResult;
    /**
     * Main orchestration entry point - auto-routes to optimal workflow
     */
    orchestrate(userMessage: string, conversationHistory: Message[]): Promise<{
        response: string;
        workflow?: WorkflowPlan;
        results?: SubagentResult[];
    }>;
    /**
     * Quick scan shortcut - runs scout only
     */
    quickScan(text: string): Promise<SubagentResult>;
    /**
     * Full audit shortcut - runs compliance workflow
     */
    fullAudit(text: string): Promise<{
        results: SubagentResult[];
        summary: string;
    }>;
    getMainProvider(): APIProvider;
}
export declare function createOrchestrator(config: OrchestratorConfig): SubagentOrchestrator;
export { SUBAGENT_PROMPTS, SUBAGENT_TOOLS, WORKFLOW_TEMPLATES, detectWorkflow };
//# sourceMappingURL=SubagentOrchestrator.d.ts.map