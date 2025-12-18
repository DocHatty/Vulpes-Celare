/**
 * PipelineAudit - System State & Analysis Context
 *
 * PURPOSE:
 * Provides factual system state and optional methodology guidance.
 *
 * DESIGN PRINCIPLES:
 * 1. FACTUAL DATA - Raw observations, not interpretations
 * 2. NEUTRAL PRESENTATION - No embedded conclusions
 * 3. METHODOLOGY AS SUGGESTION - Framework to use, not rules to follow
 * 4. EMPOWER INVESTIGATION - Support deep analysis, don't constrain it
 *
 * The methodology section offers an analysis approach. It's a tool
 * available for use, not a requirement. The analyst may:
 * - Use it as-is
 * - Adapt it to the situation
 * - Ignore it entirely and use their own approach
 */
/**
 * Information about a code path - factual only
 */
export interface CodePathInfo {
    name: string;
    implementation: "rust" | "typescript";
    file: string;
    acceleratorEnvVar?: string;
    isActive: boolean;
}
/**
 * System state snapshot - factual only
 */
export interface SystemState {
    timestamp: number;
    rustBinding: {
        available: boolean;
        path: string | null;
    };
    codePaths: {
        overlapResolution: CodePathInfo;
        postFiltering: CodePathInfo;
        spanApplication: CodePathInfo;
        nameScanning: CodePathInfo;
    };
    environment: {
        variables: Record<string, string | undefined>;
    };
    fileLocations: {
        filters: Record<string, string[]>;
        core: string[];
        dictionaries: string[];
    };
    pipelineStages: string[];
}
/**
 * Raw failure record - no interpretation
 */
export interface FailureRecord {
    phiType: string;
    value: string;
    context: string;
    contextBefore: string;
    contextAfter: string;
}
/**
 * Pattern observation - factual description only
 */
export interface PatternObservation {
    pattern: string;
    count: number;
    examples: string[];
    observation: string;
}
/**
 * Context for a PHI type - raw data only
 */
export interface PHITypeContext {
    phiType: string;
    totalFailures: number;
    failures: FailureRecord[];
    patterns: PatternObservation[];
    relatedFiles: string[];
    relatedCodePaths: string[];
}
/**
 * Complete analysis context - structured data for reference
 */
export interface AnalysisContext {
    timestamp: number;
    systemState: SystemState;
    failureSummary: {
        total: number;
        byType: Record<string, number>;
    };
    phiContexts: PHITypeContext[];
}
export declare class PipelineAudit {
    private static cached;
    /**
     * Gather current system state - factual only
     */
    static getSystemState(): SystemState;
    /**
     * Get cached state or refresh
     */
    static getAudit(): SystemState;
    /**
     * Alias for backward compatibility
     */
    static run(): SystemState;
    /**
     * Print system state to console - factual only
     */
    static printSummary(): void;
    private static getCodePath;
}
/**
 * Analyze failures and produce structured context
 *
 * This function:
 * - Extracts raw failure data
 * - Identifies factual patterns (not interpretations)
 * - Links to relevant files
 *
 * It does NOT:
 * - Diagnose causes
 * - Suggest fixes
 * - Rank priorities
 */
export declare function buildAnalysisContext(failures: Array<{
    type: string;
    expected: string;
    context?: string;
}>): AnalysisContext;
/**
 * Format analysis context for display - structured output only
 */
export declare function formatAnalysisContext(context: AnalysisContext): string;
export interface PipelineAuditResult extends SystemState {
    failureCorrelations: never[];
    diagnosticHints: never[];
    architecture: {
        pipelineStages: string[];
        overlapResolutionLogic: string;
        postFilterLogic: string;
    };
}
export interface FailureDiagnosis {
    phiType: string;
    failureCount: number;
    examples: string[];
    diagnosis: {
        likelyCause: string;
        codePathInvolved: string;
        checkFirst: string;
        suggestedFix: string;
        fileToEdit: string;
    };
    confidence: "high" | "medium" | "low";
}
export interface DiagnosticReport {
    timestamp: number;
    pipelineState: SystemState;
    failureDiagnoses: FailureDiagnosis[];
    topPriorityFix: null;
    summaryForLLM: string;
}
/**
 * Legacy function - now returns neutral analysis context
 */
export declare function diagnoseFailures(failures: Array<{
    type: string;
    expected: string;
    context?: string;
}>, _audit?: SystemState): DiagnosticReport;
/**
 * New recommended function - returns structured analysis context
 */
export declare function analyzeFailuresForInvestigation(failures: Array<{
    type: string;
    expected: string;
    context?: string;
}>, _audit?: SystemState): AnalysisContext;
export declare function runPipelineAudit(): SystemState;
export declare function printPipelineAudit(): void;
export type { SystemState as PipelineAuditResultNew };
export type { AnalysisContext as InvestigationReport };
/**
 * Generate methodology guidance text
 *
 * This is OPTIONAL guidance - a framework that may help structure analysis.
 * The analyst is free to use their own approach.
 */
export declare function getMethodologyGuidance(): string;
/**
 * Format complete analysis output with optional methodology
 */
export declare function formatCompleteAnalysis(context: AnalysisContext, includeMethodology?: boolean): string;
//# sourceMappingURL=PipelineAudit.d.ts.map