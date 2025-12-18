"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.spanJourneyTracker = exports.SpanJourneyTracker = exports.pipelineTracer = exports.PipelineTracer = void 0;
exports.createCodePathDecision = createCodePathDecision;
const RustAccelConfig_1 = require("../config/RustAccelConfig");
const binding_1 = require("../native/binding");
/**
 * PipelineTracer - Always-on pipeline state tracker
 */
class PipelineTracer {
    static instance;
    // Always-on state tracking
    cachedState = null;
    lastEnvSnapshot = {};
    // Per-request trace (only when verbose)
    verbose;
    currentTrace = null;
    stageStartTime = 0;
    lastStageSpanCount = 0;
    constructor() {
        this.verbose = process.env.VULPES_TRACE === "1";
        // Initialize state on construction
        this.refreshState();
    }
    static getInstance() {
        if (!PipelineTracer.instance) {
            PipelineTracer.instance = new PipelineTracer();
        }
        return PipelineTracer.instance;
    }
    /**
     * Check if verbose tracing is enabled (prints output)
     */
    isVerbose() {
        return this.verbose || process.env.VULPES_TRACE === "1";
    }
    /**
     * Enable verbose output
     */
    enableVerbose() {
        this.verbose = true;
    }
    /**
     * Get current pipeline state (always available, cached)
     */
    getState() {
        if (!this.cachedState || this.hasEnvChanged()) {
            this.refreshState();
        }
        return this.cachedState;
    }
    /**
     * Force refresh of pipeline state
     */
    refreshState() {
        const envSnapshot = this.captureEnvSnapshot();
        const changes = this.detectChanges(envSnapshot);
        // Check if Rust binding is available
        let rustBindingAvailable = false;
        try {
            const binding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
            rustBindingAvailable = binding !== null;
        }
        catch {
            rustBindingAvailable = false;
        }
        const accelerators = {
            spanOps: RustAccelConfig_1.RustAccelConfig.isSpanOpsEnabled(),
            intervalTree: RustAccelConfig_1.RustAccelConfig.isIntervalTreeEnabled(),
            postFilter: RustAccelConfig_1.RustAccelConfig.isPostFilterEnabled(),
            applySpans: RustAccelConfig_1.RustAccelConfig.isApplySpansEnabled(),
            nameAccelMode: RustAccelConfig_1.RustAccelConfig.getNameAccelMode(),
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
    hasEnvChanged() {
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
    detectChanges(newSnapshot) {
        const changes = [];
        for (const key of Object.keys(newSnapshot)) {
            const oldVal = this.lastEnvSnapshot[key];
            const newVal = newSnapshot[key];
            if (oldVal !== newVal) {
                changes.push(`${key}: ${oldVal ?? "(unset)"} -> ${newVal ?? "(unset)"}`);
            }
        }
        return changes;
    }
    captureEnvSnapshot() {
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
    getCodePathSummary() {
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
    printStateSummary() {
        const state = this.getState();
        const paths = this.getCodePathSummary();
        console.log("\n" + "=".repeat(60));
        console.log("PIPELINE STATE SUMMARY");
        console.log("=".repeat(60));
        console.log("\nRust Binding: " + (state.accelerators.rustBindingAvailable ? "AVAILABLE" : "NOT AVAILABLE"));
        console.log("\nAccelerators:");
        console.log("  spanOps:      " + (state.accelerators.spanOps ? "ON" : "OFF"));
        console.log("  intervalTree: " + (state.accelerators.intervalTree ? "ON" : "OFF"));
        console.log("  postFilter:   " + (state.accelerators.postFilter ? "ON" : "OFF"));
        console.log("  applySpans:   " + (state.accelerators.applySpans ? "ON" : "OFF"));
        console.log("  nameAccel:    mode " + state.accelerators.nameAccelMode);
        console.log("  workers:      " + (state.accelerators.workersEnabled ? "ENABLED" : "DISABLED"));
        console.log("\nCode Paths:");
        Object.entries(paths).forEach(([op, path]) => {
            console.log("  " + op.padEnd(20) + path);
        });
        if (state.changesSinceLastCheck.length > 0) {
            console.log("\nRecent Changes:");
            state.changesSinceLastCheck.forEach(c => console.log("  " + c));
        }
        console.log("\nLast Updated: " + new Date(state.lastUpdated).toISOString());
        console.log("=".repeat(60) + "\n");
    }
    // ============ Per-Request Tracing (verbose mode) ============
    startTrace(inputText) {
        // Always refresh state at start of trace
        this.refreshState();
        // Only create detailed trace if verbose
        if (!this.isVerbose())
            return;
        const traceId = "trace_" + Date.now();
        const displayText = inputText.length > 500 ? inputText.substring(0, 500) + "..." : inputText;
        this.currentTrace = {
            id: traceId,
            inputText: displayText,
            inputLength: inputText.length,
            startTime: Date.now(),
            stages: [],
            codePathSummary: [],
            envSnapshot: this.cachedState.envSnapshot,
        };
        this.lastStageSpanCount = 0;
    }
    startStage() {
        if (!this.isVerbose())
            return;
        this.stageStartTime = Date.now();
    }
    recordStage(stage, spans, options) {
        if (!this.isVerbose() || !this.currentTrace)
            return;
        const durationMs = this.stageStartTime > 0 ? Date.now() - this.stageStartTime : 0;
        const inputCount = this.lastStageSpanCount;
        const outputCount = spans.length;
        const stageTrace = {
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
    recordCodePath(decision) {
        if (!this.isVerbose() || !this.currentTrace)
            return;
        this.currentTrace.codePathSummary.push(decision);
    }
    endTrace(finalSpans, finalOutput) {
        if (!this.isVerbose() || !this.currentTrace)
            return null;
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
    recordError(error) {
        if (!this.isVerbose() || !this.currentTrace)
            return;
        this.currentTrace.error = error;
    }
    spanToTraced(span) {
        return {
            text: span.text,
            start: span.characterStart,
            end: span.characterEnd,
            type: span.filterType,
            confidence: Math.round(span.confidence * 1000) / 1000,
        };
    }
    printTrace(trace) {
        const sep = "=".repeat(80);
        console.log("\n" + sep);
        console.log("PIPELINE TRACE: " + trace.id);
        console.log(sep);
        console.log("\nINPUT: " + trace.inputLength + " chars");
        console.log("  " + trace.inputText);
        console.log("\nCODE PATHS USED:");
        const paths = this.getCodePathSummary();
        Object.entries(paths).forEach(([op, path]) => {
            console.log("  " + op + ": " + path);
        });
        console.log("\nSTAGES:");
        console.log("-".repeat(80));
        trace.stages.forEach((s) => {
            const delta = s.outputCount - s.inputCount;
            const sign = delta >= 0 ? "+" : "";
            console.log("  " +
                s.stage.padEnd(25) +
                String(s.inputCount).padStart(5) +
                " -> " +
                String(s.outputCount).padStart(5) +
                " (" + sign + delta + ")" +
                (s.details ? "  " + s.details : ""));
        });
        console.log("-".repeat(80));
        console.log("\nFINAL: " + (trace.finalSpans?.length || 0) + " spans");
        trace.finalSpans?.forEach((sp) => {
            console.log("  [" + sp.start + "-" + sp.end + "] " + sp.type + ' "' + sp.text + '"');
        });
        if (trace.error) {
            console.log("\nERROR: " + trace.error);
        }
        console.log("\nTIME: " + trace.totalDurationMs + "ms");
        console.log(sep + "\n");
    }
    // ============ Static Convenience Methods ============
    static getAcceleratorStatus() {
        return PipelineTracer.getInstance().getState().accelerators;
    }
    static printAcceleratorStatus() {
        PipelineTracer.getInstance().printStateSummary();
    }
}
exports.PipelineTracer = PipelineTracer;
exports.pipelineTracer = PipelineTracer.getInstance();
function createCodePathDecision(name, options, chosen, reason, envVar) {
    return {
        name,
        options,
        chosen,
        reason,
        envVar,
        envValue: envVar ? process.env[envVar] : undefined,
    };
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
class SpanJourneyTracker {
    static instance;
    journeys = new Map();
    enabled;
    constructor() {
        this.enabled = process.env.VULPES_TRACE_SPANS === "1";
    }
    static getInstance() {
        if (!SpanJourneyTracker.instance) {
            SpanJourneyTracker.instance = new SpanJourneyTracker();
        }
        return SpanJourneyTracker.instance;
    }
    /**
     * Check if span journey tracking is enabled.
     */
    isEnabled() {
        return this.enabled || process.env.VULPES_TRACE_SPANS === "1";
    }
    /**
     * Enable span journey tracking.
     */
    enable() {
        this.enabled = true;
    }
    /**
     * Disable span journey tracking.
     */
    disable() {
        this.enabled = false;
    }
    /**
     * Clear all tracked journeys (call at start of each redaction).
     */
    clear() {
        this.journeys.clear();
    }
    /**
     * Generate a unique ID for a span based on position and type.
     */
    getSpanId(span) {
        return `${span.characterStart}-${span.characterEnd}-${span.filterType}`;
    }
    /**
     * Record a span entering a pipeline stage.
     */
    enterStage(span, stage) {
        if (!this.isEnabled())
            return;
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
    modifySpan(span, stage, reason) {
        if (!this.isEnabled())
            return;
        const spanId = this.getSpanId(span);
        const journey = this.journeys.get(spanId);
        if (!journey)
            return;
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
    removeSpan(span, stage, reason) {
        if (!this.isEnabled())
            return;
        const spanId = this.getSpanId(span);
        const journey = this.journeys.get(spanId);
        if (!journey)
            return;
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
    keepSpan(span, stage) {
        if (!this.isEnabled())
            return;
        const spanId = this.getSpanId(span);
        const journey = this.journeys.get(spanId);
        if (!journey)
            return;
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
    getJourneys() {
        return Array.from(this.journeys.values());
    }
    /**
     * Get journeys for spans that were removed.
     */
    getRemovedSpanJourneys() {
        return this.getJourneys().filter((j) => j.finalStatus === "removed");
    }
    /**
     * Get journeys for spans that were kept.
     */
    getKeptSpanJourneys() {
        return this.getJourneys().filter((j) => j.finalStatus === "kept");
    }
    /**
     * Get a summary of removal reasons by stage.
     */
    getRemovalSummary() {
        const summary = {};
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
    printReport() {
        const journeys = this.getJourneys();
        const kept = journeys.filter((j) => j.finalStatus === "kept").length;
        const removed = journeys.filter((j) => j.finalStatus === "removed").length;
        console.log("\n" + "=".repeat(80));
        console.log("SPAN JOURNEY REPORT");
        console.log("=".repeat(80));
        console.log(`Total spans tracked: ${journeys.length}`);
        console.log(`Kept: ${kept}`);
        console.log(`Removed: ${removed}`);
        if (removed > 0) {
            console.log("\n--- REMOVED SPANS ---");
            const summary = this.getRemovalSummary();
            Object.entries(summary).forEach(([stage, info]) => {
                console.log(`\n[${stage}] Removed ${info.count} span(s):`);
                info.reasons.forEach((reason) => console.log(`  - ${reason}`));
            });
            console.log("\n--- REMOVED SPAN DETAILS ---");
            for (const journey of this.getRemovedSpanJourneys()) {
                console.log(`\n"${journey.originalText}" (${journey.filterType})`);
                console.log(`  Initial confidence: ${journey.initialConfidence.toFixed(3)}`);
                console.log(`  Removed at: ${journey.removalStage}`);
                console.log(`  Reason: ${journey.removalReason}`);
                console.log("  Journey:");
                journey.steps.forEach((step) => {
                    const conf = step.confidence !== undefined ? ` [conf=${step.confidence.toFixed(3)}]` : "";
                    const reason = step.reason ? ` (${step.reason})` : "";
                    console.log(`    ${step.stage}: ${step.action}${conf}${reason}`);
                });
            }
        }
        console.log("\n" + "=".repeat(80) + "\n");
    }
    /**
     * Export journeys to JSON for external analysis.
     */
    exportToJSON() {
        return JSON.stringify(this.getJourneys(), null, 2);
    }
}
exports.SpanJourneyTracker = SpanJourneyTracker;
exports.spanJourneyTracker = SpanJourneyTracker.getInstance();
//# sourceMappingURL=PipelineTracer.js.map