/**
 * ============================================================================
 * VULPES CELARE - SUBAGENT ORCHESTRATION SYSTEM
 * ============================================================================
 *
 * A multi-agent architecture specifically designed for PHI redaction workflows.
 * The main orchestrator LLM delegates to specialized subagents that run in
 * parallel for maximum efficiency.
 *
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        ORCHESTRATOR (Main LLM)                          │
 * │  Your chosen model - Full Vulpes system prompt                          │
 * │  Analyzes requests, delegates tasks, synthesizes results                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *                                    │
 *      ┌──────────────┬──────────────┼──────────────┬──────────────┐
 *      ▼              ▼              ▼              ▼              ▼
 * ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
 * │  PHI     │  │  FILTER  │  │  TEST    │  │  DICT    │  │  AUDIT   │
 * │  SCANNER │  │  ENGINEER│  │  RUNNER  │  │  CURATOR │  │  AGENT   │
 * │          │  │          │  │          │  │          │  │          │
 * │ Analyze  │  │ Fix/tune │  │ Run &    │  │ Manage   │  │ Check    │
 * │ documents│  │ filters  │  │ validate │  │ entries  │  │ quality  │
 * └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
 *      │              │              │              │              │
 *      └──────────────┴──────────────┴──────────────┴──────────────┘
 *                                    ▼
 *                         ┌────────────────────┐
 *                         │  SYNTHESIZED RESULT│
 *                         │  Back to User      │
 *                         └────────────────────┘
 *
 * VULPES SUBAGENT ROLES:
 *
 * 1. PHI_SCANNER - Scans documents for PHI patterns
 *    - Fast parallel document analysis
 *    - Identifies what PHI types are present
 *    - Spots potential issues (false positives/negatives)
 *    - Batch processing for multiple files
 *
 * 2. FILTER_ENGINEER - Analyzes and fixes filter code
 *    - Reads filter implementations
 *    - Identifies regex/logic issues
 *    - Writes specific code fixes
 *    - Can modify filters to fix leaks
 *
 * 3. TEST_RUNNER - Executes tests and validates changes
 *    - Runs test suites
 *    - Compares before/after metrics
 *    - Identifies regressions
 *    - Validates fixes work
 *
 * 4. DICT_CURATOR - Manages dictionary entries
 *    - Searches dictionaries
 *    - Adds missing names/locations
 *    - Removes false positive triggers
 *    - Cross-references databases
 *
 * 5. AUDIT_AGENT - Quality and compliance checking
 *    - Reviews redaction completeness
 *    - Checks HIPAA compliance
 *    - Assesses risk levels
 *    - Generates reports
 */
import { APIProvider, Message, Tool } from "./APIProvider";
export type SubagentRole = "phi_scanner" | "filter_engineer" | "test_runner" | "dict_curator" | "audit_agent";
export interface SubagentTask {
    id: string;
    role: SubagentRole;
    prompt: string;
    context?: Record<string, any>;
    priority?: "high" | "normal" | "low";
    timeout?: number;
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
}
declare const SUBAGENT_PROMPTS: Record<SubagentRole, string>;
declare const SUBAGENT_TOOLS: Record<SubagentRole, Tool[]>;
export declare class SubagentOrchestrator {
    private config;
    private mainProvider;
    private subagents;
    private vulpes;
    constructor(config: OrchestratorConfig, mainProvider: APIProvider);
    /**
     * Initialize a subagent for a specific role
     */
    initializeSubagent(role: SubagentRole, provider: APIProvider): void;
    /**
     * Delegate a single task to a subagent
     */
    delegateTask(task: SubagentTask): Promise<SubagentResult>;
    /**
     * Delegate multiple tasks in parallel (respecting maxParallel limit)
     */
    delegateParallel(tasks: SubagentTask[]): Promise<SubagentResult[]>;
    /**
     * Main orchestration - let the main LLM decide how to handle a request
     */
    orchestrate(userMessage: string, conversationHistory: Message[]): Promise<{
        response: string;
        subagentResults?: SubagentResult[];
    }>;
    /**
     * Get available subagent roles
     */
    getAvailableRoles(): SubagentRole[];
    /**
     * Get the main provider
     */
    getMainProvider(): APIProvider;
}
export declare function createOrchestrator(config: OrchestratorConfig): SubagentOrchestrator;
export { SUBAGENT_PROMPTS, SUBAGENT_TOOLS };
//# sourceMappingURL=SubagentOrchestrator.d.ts.map