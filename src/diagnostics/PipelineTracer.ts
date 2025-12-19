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
import { RustAccelConfig } from "../config/RustAccelConfig";
import { loadNativeBinding } from "../native/binding";
import { RadiologyLogger } from "../utils/RadiologyLogger";
import { container, ServiceIds } from "../core/ServiceContainer";

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
export class PipelineTracer {
  private static instance: PipelineTracer;

  // Always-on state tracking
  private cachedState: PipelineState | null = null;
  private lastEnvSnapshot: Record<string, string | undefined> = {};

  // Per-request trace (only when verbose)
  private verbose: boolean;
  private currentTrace: PipelineTrace | null = null;
  private stageStartTime: number = 0;
  private lastStageSpanCount: number = 0;

  private constructor() {
    this.verbose = process.env.VULPES_TRACE === "1";
    // Initialize state on construction
    this.refreshState();
  }

  static getInstance(): PipelineTracer {
    // Check DI container first (enables testing/replacement)
    const fromContainer = container.tryResolve<PipelineTracer>(ServiceIds.PipelineTracer);
    if (fromContainer) {
      return fromContainer;
    }
    // Fall back to static instance
    if (!PipelineTracer.instance) {
      PipelineTracer.instance = new PipelineTracer();
      container.registerInstance(ServiceIds.PipelineTracer, PipelineTracer.instance);
    }
    return PipelineTracer.instance;
  }

  /**
   * Check if verbose tracing is enabled (prints output)
   */
  isVerbose(): boolean {
    return this.verbose || process.env.VULPES_TRACE === "1";
  }

  /**
   * Enable verbose output
   */
  enableVerbose(): void {
    this.verbose = true;
  }

  /**
   * Get current pipeline state (always available, cached)
   */
  getState(): PipelineState {
    if (!this.cachedState || this.hasEnvChanged()) {
      this.refreshState();
    }
    return this.cachedState!;
  }

  /**
   * Force refresh of pipeline state
   */
  refreshState(): PipelineState {
    const envSnapshot = this.captureEnvSnapshot();
    const changes = this.detectChanges(envSnapshot);

    // Check if Rust binding is available
    let rustBindingAvailable = false;
    try {
      const binding = loadNativeBinding({ configureOrt: false });
      rustBindingAvailable = binding !== null;
    } catch {
      rustBindingAvailable = false;
    }

    const accelerators: AcceleratorStatus = {
      spanOps: RustAccelConfig.isSpanOpsEnabled(),
      intervalTree: RustAccelConfig.isIntervalTreeEnabled(),
      postFilter: RustAccelConfig.isPostFilterEnabled(),
      applySpans: RustAccelConfig.isApplySpansEnabled(),
      nameAccelMode: RustAccelConfig.getNameAccelMode(),
      workersEnabled: process.env.VULPES_WORKERS === "1",
      rustBindingAvailable,
    };

    this.cachedState = {
      accelerators,
      envSnapshot,
      lastUpdated: Date.now(),
      changesSinceLastCheck: changes,
    };

    this.lastEnvSnapshot = envSnapshot;
    return this.cachedState;
  }

  /**
   * Check if any relevant env vars have changed
   */
  private hasEnvChanged(): boolean {
    const current = this.captureEnvSnapshot();
    for (const key of Object.keys(current)) {
      if (current[key] !== this.lastEnvSnapshot[key]) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detect what changed between snapshots
   */
  private detectChanges(newSnapshot: Record<string, string | undefined>): string[] {
    const changes: string[] = [];
    for (const key of Object.keys(newSnapshot)) {
      const oldVal = this.lastEnvSnapshot[key];
      const newVal = newSnapshot[key];
      if (oldVal !== newVal) {
        changes.push(`${key}: ${oldVal ?? "(unset)"} -> ${newVal ?? "(unset)"}`);
      }
    }
    return changes;
  }

  private captureEnvSnapshot(): Record<string, string | undefined> {
    return {
      VULPES_RUST_ACCEL: process.env.VULPES_RUST_ACCEL,
      VULPES_SPAN_ACCEL: process.env.VULPES_SPAN_ACCEL,
      VULPES_INTERVAL_ACCEL: process.env.VULPES_INTERVAL_ACCEL,
      VULPES_POSTFILTER_ACCEL: process.env.VULPES_POSTFILTER_ACCEL,
      VULPES_NAME_ACCEL: process.env.VULPES_NAME_ACCEL,
      VULPES_WORKERS: process.env.VULPES_WORKERS,
      VULPES_NO_WORKERS: process.env.VULPES_NO_WORKERS,
      VULPES_TRACE: process.env.VULPES_TRACE,
    };
  }

  /**
   * Get summary of which code paths will be used
   */
  getCodePathSummary(): Record<string, string> {
    const state = this.getState();
    const rust = state.accelerators.rustBindingAvailable;

    return {
      overlapResolution: rust && state.accelerators.spanOps
        ? "Rust (span.rs)"
        : rust && state.accelerators.intervalTree
          ? "Rust (interval.rs)"
          : "TypeScript (IntervalTreeSpanIndex)",
      postFilter: rust && state.accelerators.postFilter
        ? "Rust"
        : "TypeScript",
      applySpans: rust && state.accelerators.applySpans
        ? "Rust"
        : "TypeScript",
      filterExecution: state.accelerators.workersEnabled
        ? "Worker Threads (parallel)"
        : "Synchronous (main thread)",
      nameScanning: `Mode ${state.accelerators.nameAccelMode}`,
    };
  }

  /**
   * Print current state summary
   */
  printStateSummary(): void {
    const state = this.getState();
    const paths = this.getCodePathSummary();

    const lines: string[] = [];
    lines.push("=".repeat(60));
    lines.push("PIPELINE STATE SUMMARY");
    lines.push("=".repeat(60));

    lines.push("Rust Binding: " + (state.accelerators.rustBindingAvailable ? "AVAILABLE" : "NOT AVAILABLE"));

    lines.push("Accelerators:");
    lines.push("  spanOps:      " + (state.accelerators.spanOps ? "ON" : "OFF"));
    lines.push("  intervalTree: " + (state.accelerators.intervalTree ? "ON" : "OFF"));
    lines.push("  postFilter:   " + (state.accelerators.postFilter ? "ON" : "OFF"));
    lines.push("  applySpans:   " + (state.accelerators.applySpans ? "ON" : "OFF"));
    lines.push("  nameAccel:    mode " + state.accelerators.nameAccelMode);
    lines.push("  workers:      " + (state.accelerators.workersEnabled ? "ENABLED" : "DISABLED"));

    lines.push("Code Paths:");
    Object.entries(paths).forEach(([op, path]) => {
      lines.push("  " + op.padEnd(20) + path);
    });

    if (state.changesSinceLastCheck.length > 0) {
      lines.push("Recent Changes:");
      state.changesSinceLastCheck.forEach(c => lines.push("  " + c));
    }

    lines.push("Last Updated: " + new Date(state.lastUpdated).toISOString());
    lines.push("=".repeat(60));

    RadiologyLogger.info("PipelineTracer", lines.join("\n"));
  }

  // ============ Per-Request Tracing (verbose mode) ============

  startTrace(inputText: string): void {
    // Always refresh state at start of trace
    this.refreshState();

    // Only create detailed trace if verbose
    if (!this.isVerbose()) return;

    const traceId = "trace_" + Date.now();
    const displayText = inputText.length > 500 ? inputText.substring(0, 500) + "..." : inputText;
    this.currentTrace = {
      id: traceId,
      inputText: displayText,
      inputLength: inputText.length,
      startTime: Date.now(),
      stages: [],
      codePathSummary: [],
      envSnapshot: this.cachedState!.envSnapshot,
    };
    this.lastStageSpanCount = 0;
  }

  startStage(): void {
    if (!this.isVerbose()) return;
    this.stageStartTime = Date.now();
  }

  recordStage(
    stage: string,
    spans: Span[],
    options?: { codePath?: CodePathDecision; details?: string }
  ): void {
    if (!this.isVerbose() || !this.currentTrace) return;

    const durationMs = this.stageStartTime > 0 ? Date.now() - this.stageStartTime : 0;
    const inputCount = this.lastStageSpanCount;
    const outputCount = spans.length;

    const stageTrace: PipelineStageTrace = {
      stage,
      timestamp: Date.now(),
      durationMs,
      inputCount,
      outputCount,
      removed: Math.max(0, inputCount - outputCount),
      added: Math.max(0, outputCount - inputCount),
      codePath: options?.codePath,
      details: options?.details,
    };

    if (process.env.VULPES_TRACE_VERBOSE === "1") {
      stageTrace.spans = spans.map((s) => this.spanToTraced(s));
    }

    this.currentTrace.stages.push(stageTrace);
    if (options?.codePath) {
      this.currentTrace.codePathSummary.push(options.codePath);
    }
    this.lastStageSpanCount = outputCount;
    this.stageStartTime = 0;
  }

  recordCodePath(decision: CodePathDecision): void {
    if (!this.isVerbose() || !this.currentTrace) return;
    this.currentTrace.codePathSummary.push(decision);
  }

  endTrace(finalSpans: Span[], finalOutput: string): PipelineTrace | null {
    if (!this.isVerbose() || !this.currentTrace) return null;

    this.currentTrace.endTime = Date.now();
    this.currentTrace.totalDurationMs =
      this.currentTrace.endTime - this.currentTrace.startTime;
    this.currentTrace.finalSpans = finalSpans.map((s) => this.spanToTraced(s));
    this.currentTrace.finalOutput =
      finalOutput.length > 500 ? finalOutput.substring(0, 500) + "..." : finalOutput;

    const trace = this.currentTrace;
    this.currentTrace = null;

    this.printTrace(trace);
    return trace;
  }

  recordError(error: string): void {
    if (!this.isVerbose() || !this.currentTrace) return;
    this.currentTrace.error = error;
  }

  private spanToTraced(span: Span): TracedSpan {
    return {
      text: span.text,
      start: span.characterStart,
      end: span.characterEnd,
      type: span.filterType,
      confidence: Math.round(span.confidence * 1000) / 1000,
    };
  }

  printTrace(trace: PipelineTrace): void {
    const sep = "=".repeat(80);
    const lines: string[] = [];
    lines.push(sep);
    lines.push("PIPELINE TRACE: " + trace.id);
    lines.push(sep);

    lines.push("INPUT: " + trace.inputLength + " chars");
    lines.push("  " + trace.inputText);

    lines.push("CODE PATHS USED:");
    const paths = this.getCodePathSummary();
    Object.entries(paths).forEach(([op, path]) => {
      lines.push("  " + op + ": " + path);
    });

    lines.push("STAGES:");
    lines.push("-".repeat(80));
    trace.stages.forEach((s) => {
      const delta = s.outputCount - s.inputCount;
      const sign = delta >= 0 ? "+" : "";
      lines.push(
        "  " +
          s.stage.padEnd(25) +
          String(s.inputCount).padStart(5) +
          " -> " +
          String(s.outputCount).padStart(5) +
          " (" + sign + delta + ")" +
          (s.details ? "  " + s.details : ""),
      );
    });
    lines.push("-".repeat(80));

    lines.push("FINAL: " + (trace.finalSpans?.length || 0) + " spans");
    trace.finalSpans?.forEach((sp) => {
      lines.push("  [" + sp.start + "-" + sp.end + "] " + sp.type + ' "' + sp.text + '"');
    });

    if (trace.error) {
      lines.push("ERROR: " + trace.error);
    }

    lines.push("TIME: " + trace.totalDurationMs + "ms");
    lines.push(sep);

    RadiologyLogger.info("PipelineTracer", lines.join("\n"));
  }

  // ============ Static Convenience Methods ============

  static getAcceleratorStatus(): AcceleratorStatus {
    return PipelineTracer.getInstance().getState().accelerators;
  }

  static printAcceleratorStatus(): void {
    PipelineTracer.getInstance().printStateSummary();
  }
}

export const pipelineTracer = PipelineTracer.getInstance();

export function createCodePathDecision(
  name: string,
  options: string[],
  chosen: string,
  reason: string,
  envVar?: string,
): CodePathDecision {
  return {
    name,
    options,
    chosen,
    reason,
    envVar,
    envValue: envVar ? process.env[envVar] : undefined,
  };
}

// =============================================================================
// SPAN JOURNEY TRACKING (L1 Enhancement)
// =============================================================================

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
export class SpanJourneyTracker {
  private static instance: SpanJourneyTracker;
  private journeys: Map<string, SpanJourney> = new Map();
  private enabled: boolean;

  private constructor() {
    this.enabled = process.env.VULPES_TRACE_SPANS === "1";
  }

  static getInstance(): SpanJourneyTracker {
    if (!SpanJourneyTracker.instance) {
      SpanJourneyTracker.instance = new SpanJourneyTracker();
    }
    return SpanJourneyTracker.instance;
  }

  /**
   * Check if span journey tracking is enabled.
   */
  isEnabled(): boolean {
    return this.enabled || process.env.VULPES_TRACE_SPANS === "1";
  }

  /**
   * Enable span journey tracking.
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable span journey tracking.
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Clear all tracked journeys (call at start of each redaction).
   */
  clear(): void {
    this.journeys.clear();
  }

  /**
   * Generate a unique ID for a span based on position and type.
   */
  private getSpanId(span: Span): string {
    return `${span.characterStart}-${span.characterEnd}-${span.filterType}`;
  }

  /**
   * Record a span entering a pipeline stage.
   */
  enterStage(span: Span, stage: string): void {
    if (!this.isEnabled()) return;

    const spanId = this.getSpanId(span);
    let journey = this.journeys.get(spanId);

    if (!journey) {
      journey = {
        spanId,
        originalText: span.text,
        filterType: span.filterType,
        initialConfidence: span.confidence,
        steps: [],
        finalStatus: "kept",
      };
      this.journeys.set(spanId, journey);
    }

    journey.steps.push({
      stage,
      action: "enter",
      confidence: span.confidence,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a span being modified at a pipeline stage.
   */
  modifySpan(span: Span, stage: string, reason: string): void {
    if (!this.isEnabled()) return;

    const spanId = this.getSpanId(span);
    const journey = this.journeys.get(spanId);
    if (!journey) return;

    journey.steps.push({
      stage,
      action: "modify",
      reason,
      confidence: span.confidence,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a span being removed at a pipeline stage.
   */
  removeSpan(span: Span, stage: string, reason: string): void {
    if (!this.isEnabled()) return;

    const spanId = this.getSpanId(span);
    const journey = this.journeys.get(spanId);
    if (!journey) return;

    journey.steps.push({
      stage,
      action: "remove",
      reason,
      confidence: span.confidence,
      timestamp: Date.now(),
    });

    journey.finalStatus = "removed";
    journey.removalStage = stage;
    journey.removalReason = reason;
  }

  /**
   * Record a span being kept (passed through) a pipeline stage.
   */
  keepSpan(span: Span, stage: string): void {
    if (!this.isEnabled()) return;

    const spanId = this.getSpanId(span);
    const journey = this.journeys.get(spanId);
    if (!journey) return;

    journey.steps.push({
      stage,
      action: "keep",
      confidence: span.confidence,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all tracked journeys.
   */
  getJourneys(): SpanJourney[] {
    return Array.from(this.journeys.values());
  }

  /**
   * Get journeys for spans that were removed.
   */
  getRemovedSpanJourneys(): SpanJourney[] {
    return this.getJourneys().filter((j) => j.finalStatus === "removed");
  }

  /**
   * Get journeys for spans that were kept.
   */
  getKeptSpanJourneys(): SpanJourney[] {
    return this.getJourneys().filter((j) => j.finalStatus === "kept");
  }

  /**
   * Get a summary of removal reasons by stage.
   */
  getRemovalSummary(): Record<string, { count: number; reasons: string[] }> {
    const summary: Record<string, { count: number; reasons: string[] }> = {};

    for (const journey of this.getRemovedSpanJourneys()) {
      const stage = journey.removalStage || "unknown";
      if (!summary[stage]) {
        summary[stage] = { count: 0, reasons: [] };
      }
      summary[stage].count++;
      if (journey.removalReason && !summary[stage].reasons.includes(journey.removalReason)) {
        summary[stage].reasons.push(journey.removalReason);
      }
    }

    return summary;
  }

  /**
   * Print a detailed report of span journeys.
   */
  printReport(): void {
    const journeys = this.getJourneys();
    const kept = journeys.filter((j) => j.finalStatus === "kept").length;
    const removed = journeys.filter((j) => j.finalStatus === "removed").length;

    const lines: string[] = [];
    lines.push("=".repeat(80));
    lines.push("SPAN JOURNEY REPORT");
    lines.push("=".repeat(80));
    lines.push(`Total spans tracked: ${journeys.length}`);
    lines.push(`Kept: ${kept}`);
    lines.push(`Removed: ${removed}`);

    if (removed > 0) {
      lines.push("--- REMOVED SPANS ---");
      const summary = this.getRemovalSummary();
      Object.entries(summary).forEach(([stage, info]) => {
        lines.push(`[${stage}] Removed ${info.count} span(s):`);
        info.reasons.forEach((reason) => lines.push(`  - ${reason}`));
      });

      lines.push("--- REMOVED SPAN DETAILS ---");
      for (const journey of this.getRemovedSpanJourneys()) {
        lines.push(`"${journey.originalText}" (${journey.filterType})`);
        lines.push(`  Initial confidence: ${journey.initialConfidence.toFixed(3)}`);
        lines.push(`  Removed at: ${journey.removalStage}`);
        lines.push(`  Reason: ${journey.removalReason}`);
        lines.push("  Journey:");
        journey.steps.forEach((step) => {
          const conf = step.confidence !== undefined ? ` [conf=${step.confidence.toFixed(3)}]` : "";
          const reason = step.reason ? ` (${step.reason})` : "";
          lines.push(`    ${step.stage}: ${step.action}${conf}${reason}`);
        });
      }
    }

    lines.push("=".repeat(80));

    RadiologyLogger.info("SpanJourneyTracker", lines.join("\n"));
  }

  /**
   * Export journeys to JSON for external analysis.
   */
  exportToJSON(): string {
    return JSON.stringify(this.getJourneys(), null, 2);
  }
}

export const spanJourneyTracker = SpanJourneyTracker.getInstance();
