/**
 * Vulpes Celare - AI Debugging Agent
 *
 * Intelligent debugging and analysis for PHI detection failures.
 * Provides root cause analysis, fix suggestions, and pattern recommendations.
 */
export type FailureType = "false_negative" | "false_positive" | "wrong_type" | "wrong_boundaries" | "low_confidence" | "filter_conflict" | "post_filter_removal" | "unknown";
export type RootCauseCategory = "pattern_gap" | "dictionary_missing" | "context_sensitivity" | "ocr_corruption" | "filter_priority" | "threshold_too_high" | "threshold_too_low" | "normalization_issue" | "unicode_issue" | "architectural" | "unknown";
export interface TestFailure {
    id: string;
    text: string;
    expectedPHI?: string;
    expectedType?: string;
    actualPHI?: string;
    actualType?: string;
    expectedStart?: number;
    expectedEnd?: number;
    actualStart?: number;
    actualEnd?: number;
    confidence?: number;
    errorLevel?: "none" | "low" | "medium" | "high" | "extreme";
    filter?: string;
    stage?: string;
}
export interface RootCause {
    category: RootCauseCategory;
    description: string;
    confidence: number;
    evidence: string[];
    affectedFilters: string[];
    relatedFailures: string[];
}
export interface FixSuggestion {
    type: "pattern" | "dictionary" | "threshold" | "config" | "code";
    priority: "critical" | "high" | "medium" | "low";
    description: string;
    implementation: string;
    filePath?: string;
    lineNumber?: number;
    estimatedImpact: string;
    riskLevel: "none" | "low" | "medium" | "high";
    testCommand?: string;
}
export interface PatternSuggestion {
    pattern: string;
    description: string;
    matchesProvided: number;
    falsePositiveRisk: "low" | "medium" | "high";
    examples: {
        input: string;
        matches: string[];
    }[];
}
export interface Analysis {
    summary: string;
    totalFailures: number;
    byType: Record<FailureType, number>;
    byCategory: Record<RootCauseCategory, number>;
    rootCauses: RootCause[];
    suggestions: FixSuggestion[];
    patterns: PatternSuggestion[];
    systemicIssues: string[];
    recommendations: string[];
}
export interface DebugSession {
    id: string;
    startedAt: string;
    failures: TestFailure[];
    analysis?: Analysis;
    status: "collecting" | "analyzing" | "complete" | "error";
    error?: string;
}
export declare class VulpesAIDebugger {
    private static instance;
    private sessions;
    private currentSession;
    private constructor();
    static getInstance(): VulpesAIDebugger;
    startSession(): DebugSession;
    addFailure(failure: TestFailure): void;
    addFailures(failures: TestFailure[]): void;
    getCurrentSession(): DebugSession | null;
    getSession(id: string): DebugSession | undefined;
    private generateSessionId;
    analyzeFailures(failures?: TestFailure[]): Promise<Analysis>;
    private createEmptyAnalysis;
    private classifyFailure;
    private findRootCauses;
    private analyzePatternGaps;
    private analyzeOCRCorruption;
    private analyzeThresholdIssues;
    private analyzeContextSensitivity;
    private analyzeUnicodeIssues;
    private generateFixSuggestions;
    suggestPatterns(failures: TestFailure[]): PatternSuggestion[];
    private inferPattern;
    private identifySystemicIssues;
    private generateRecommendations;
    private generateSummary;
    formatAnalysis(analysis: Analysis, useColor?: boolean): string;
    private getPriorityIcon;
    private getColors;
    private getNoColors;
}
export declare const vulpesAIDebugger: VulpesAIDebugger;
//# sourceMappingURL=VulpesAIDebugger.d.ts.map