/**
 * PipelineTracer - Always-On Pipeline State Awareness
 *
 * Maintains current knowledge of pipeline configuration and code paths.
 * ALWAYS tracks state internally for diagnostics and change detection.
 * Only prints verbose output when VULPES_TRACE=1.
 *
 * Key features:
 * - Always-on lightweight state tracking
 * - Cached accelerator status with change detection
 * - Code path decision recording
 * - Verbose trace output (opt-in via VULPES_TRACE=1)
 */
import { Span } from "../models/Span";
export interface TracedSpan {
    text: string;
    start: number;
    end: number;
    type: string;
    confidence: number;
}
export interface CodePathDecision {
    name: string;
    options: string[];
    chosen: string;
    reason: string;
    envVar?: string;
    envValue?: string;
}
export interface PipelineStageTrace {
    stage: string;
    timestamp: number;
    durationMs: number;
    inputCount: number;
    outputCount: number;
    removed: number;
    added: number;
    codePath?: CodePathDecision;
    details?: string;
    spans?: TracedSpan[];
}
export interface PipelineTrace {
    id: string;
    inputText: string;
    inputLength: number;
    startTime: number;
    endTime?: number;
    totalDurationMs?: number;
    stages: PipelineStageTrace[];
    codePathSummary: CodePathDecision[];
    envSnapshot: Record<string, string | undefined>;
    finalSpans?: TracedSpan[];
    finalOutput?: string;
    error?: string;
}
export interface AcceleratorStatus {
    spanOps: boolean;
    intervalTree: boolean;
    postFilter: boolean;
    applySpans: boolean;
    nameAccelMode: number;
    workersEnabled: boolean;
    rustBindingAvailable: boolean;
}
export interface PipelineState {
    accelerators: AcceleratorStatus;
    envSnapshot: Record<string, string | undefined>;
    lastUpdated: number;
    changesSinceLastCheck: string[];
}
/**
 * PipelineTracer - Always-on pipeline state tracker
 */
export declare class PipelineTracer {
    private static instance;
    private cachedState;
    private lastEnvSnapshot;
    private verbose;
    private currentTrace;
    private stageStartTime;
    private lastStageSpanCount;
    private constructor();
    static getInstance(): PipelineTracer;
    /**
     * Check if verbose tracing is enabled (prints output)
     */
    isVerbose(): boolean;
    /**
     * Enable verbose output
     */
    enableVerbose(): void;
    /**
     * Get current pipeline state (always available, cached)
     */
    getState(): PipelineState;
    /**
     * Force refresh of pipeline state
     */
    refreshState(): PipelineState;
    /**
     * Check if any relevant env vars have changed
     */
    private hasEnvChanged;
    /**
     * Detect what changed between snapshots
     */
    private detectChanges;
    private captureEnvSnapshot;
    /**
     * Get summary of which code paths will be used
     */
    getCodePathSummary(): Record<string, string>;
    /**
     * Print current state summary
     */
    printStateSummary(): void;
    startTrace(inputText: string): void;
    startStage(): void;
    recordStage(stage: string, spans: Span[], options?: {
        codePath?: CodePathDecision;
        details?: string;
    }): void;
    recordCodePath(decision: CodePathDecision): void;
    endTrace(finalSpans: Span[], finalOutput: string): PipelineTrace | null;
    recordError(error: string): void;
    private spanToTraced;
    printTrace(trace: PipelineTrace): void;
    static getAcceleratorStatus(): AcceleratorStatus;
    static printAcceleratorStatus(): void;
}
export declare const pipelineTracer: PipelineTracer;
export declare function createCodePathDecision(name: string, options: string[], chosen: string, reason: string, envVar?: string): CodePathDecision;
/**
 * A single step in a span's journey through the pipeline.
 */
export interface SpanJourneyStep {
    stage: string;
    action: "enter" | "modify" | "remove" | "keep";
    reason?: string;
    confidence?: number;
    timestamp: number;
}
/**
 * Complete journey of a span through the pipeline.
 */
export interface SpanJourney {
    spanId: string;
    originalText: string;
    filterType: string;
    initialConfidence: number;
    steps: SpanJourneyStep[];
    finalStatus: "kept" | "removed";
    removalStage?: string;
    removalReason?: string;
}
/**
 * SpanJourneyTracker - Tracks individual spans through the pipeline.
 *
 * This addresses L1: No pipeline stage visualization for debugging.
 *
 * Enabled via VULPES_TRACE_SPANS=1
 *
 * @example
 * // Enable span journey tracking
 * process.env.VULPES_TRACE_SPANS = "1";
 *
 * // After redaction, get span journeys
 * const journeys = spanJourneyTracker.getJourneys();
 * const removedSpans = journeys.filter(j => j.finalStatus === "removed");
 * removedSpans.forEach(j => {
 *   console.log(`"${j.originalText}" removed at ${j.removalStage}: ${j.removalReason}`);
 * });
 */
export declare class SpanJourneyTracker {
    private static instance;
    private journeys;
    private enabled;
    private constructor();
    static getInstance(): SpanJourneyTracker;
    /**
     * Check if span journey tracking is enabled.
     */
    isEnabled(): boolean;
    /**
     * Enable span journey tracking.
     */
    enable(): void;
    /**
     * Disable span journey tracking.
     */
    disable(): void;
    /**
     * Clear all tracked journeys (call at start of each redaction).
     */
    clear(): void;
    /**
     * Generate a unique ID for a span based on position and type.
     */
    private getSpanId;
    /**
     * Record a span entering a pipeline stage.
     */
    enterStage(span: Span, stage: string): void;
    /**
     * Record a span being modified at a pipeline stage.
     */
    modifySpan(span: Span, stage: string, reason: string): void;
    /**
     * Record a span being removed at a pipeline stage.
     */
    removeSpan(span: Span, stage: string, reason: string): void;
    /**
     * Record a span being kept (passed through) a pipeline stage.
     */
    keepSpan(span: Span, stage: string): void;
    /**
     * Get all tracked journeys.
     */
    getJourneys(): SpanJourney[];
    /**
     * Get journeys for spans that were removed.
     */
    getRemovedSpanJourneys(): SpanJourney[];
    /**
     * Get journeys for spans that were kept.
     */
    getKeptSpanJourneys(): SpanJourney[];
    /**
     * Get a summary of removal reasons by stage.
     */
    getRemovalSummary(): Record<string, {
        count: number;
        reasons: string[];
    }>;
    /**
     * Print a detailed report of span journeys.
     */
    printReport(): void;
    /**
     * Export journeys to JSON for external analysis.
     */
    exportToJSON(): string;
}
export declare const spanJourneyTracker: SpanJourneyTracker;
//# sourceMappingURL=PipelineTracer.d.ts.map