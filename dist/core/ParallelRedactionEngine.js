"use strict";
/**
 * Parallel Redaction Engine
 *
 * Executes all filters in parallel on original text, then merges results.
 * This is the Phileas-style architecture for maximum performance and correctness.
 *
 * @module redaction/core
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelRedactionEngine = void 0;
const Span_1 = require("../models/Span");
const SpanFactory_1 = require("./SpanFactory");
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
const WindowService_1 = require("../services/WindowService");
const ConfidenceModifierService_1 = require("../services/ConfidenceModifierService");
const VectorDisambiguationService_1 = require("../services/VectorDisambiguationService");
const FieldContextDetector_1 = require("./FieldContextDetector");
const UnifiedMedicalWhitelist_1 = require("../utils/UnifiedMedicalWhitelist");
const HospitalDictionary_1 = require("../dictionaries/HospitalDictionary");
const PostFilterService_1 = require("./filters/PostFilterService");
const SpanEnhancer_1 = require("./SpanEnhancer");
// crossTypeReasoner imported but only datalogReasoner is used in the pipeline
const DatalogReasoner_1 = require("./DatalogReasoner");
const ConfidenceCalibrator_1 = require("./ConfidenceCalibrator");
const UnifiedMedicalWhitelist_2 = require("../utils/UnifiedMedicalWhitelist");
const RustNameScanner_1 = require("../utils/RustNameScanner");
const RustApplyKernel_1 = require("../utils/RustApplyKernel");
const RustAccelConfig_1 = require("../config/RustAccelConfig");
const FilterWorkerPool_1 = require("./FilterWorkerPool");
const ContextualConfidenceModifier_1 = require("./ContextualConfidenceModifier");
const MultiPatternScanner_1 = require("../dfa/MultiPatternScanner");
const PipelineTracer_1 = require("../diagnostics/PipelineTracer");
const NameDetectionCoordinator_1 = require("../filters/name-patterns/NameDetectionCoordinator");
const SemanticRedactionCache_1 = require("../cache/SemanticRedactionCache");
const crypto_1 = require("crypto");
const plugins_1 = require("../plugins");
/**
 * Check if Cortex ML enhancement is enabled via environment variable
 */
function isCortexEnabled() {
    return process.env.VULPES_USE_CORTEX === "1";
}
/**
 * Check if semantic caching is enabled via environment variable
 */
function isSemanticCacheEnabled() {
    return process.env.VULPES_SEMANTIC_CACHE !== "0"; // Enabled by default
}
/**
 * Compute policy hash for cache key
 */
function computePolicyHash(policy) {
    const policyStr = JSON.stringify(policy || {});
    return (0, crypto_1.createHash)("sha256").update(policyStr).digest("hex").substring(0, 16);
}
/**
 * Parallel Redaction Engine
 * Orchestrates parallel filter execution and span merging
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Pre-filters disabled filters before execution (20-40% faster)
 * - Early returns for short/empty text
 * - Parallel execution of all enabled filters
 *
 * THREAD SAFETY: This engine is stateless per-request. All results are returned
 * directly rather than stored in static properties, making it safe for concurrent use.
 *
 * FUTURE OPTIMIZATION: Implement regex pattern caching in individual filters
 * to avoid recompiling patterns on every request.
 */
class ParallelRedactionEngine {
    static disambiguationService = new VectorDisambiguationService_1.VectorDisambiguationService();
    // Legacy static state - maintained for backwards compatibility
    // New code should use the return value from redactParallelV2 instead
    static lastExecutionReport = null;
    static lastAppliedSpans = [];
    /**
     * Get the last execution report for diagnostics
     * @deprecated Use the report from redactParallelV2 result instead for thread-safety
     */
    static getLastExecutionReport() {
        return this.lastExecutionReport;
    }
    /**
     * Get the spans that were applied in the last redaction operation.
     * Useful for generating explanations via ExplanationGenerator.
     * @deprecated Use appliedSpans from redactParallelV2 result instead for thread-safety
     */
    static getLastAppliedSpans() {
        return [...this.lastAppliedSpans];
    }
    /**
     * Execute all filters in parallel and merge results (Thread-Safe Version)
     *
     * This method returns all results directly, avoiding shared static state.
     * Use this for concurrent/production environments.
     *
     * @param text - Original text to redact
     * @param filters - Array of Span-based filters
     * @param policy - Redaction policy
     * @param context - Redaction context
     * @returns Complete redaction result including text, spans, and report
     */
    static async redactParallelV2(text, filters, policy, context) {
        // Call the main implementation and return full result
        const result = await this.redactParallelInternal(text, filters, policy, context);
        // Do NOT update legacy static state - that's only for the legacy API
        return result;
    }
    /**
     * Execute all filters in parallel and merge results (Legacy API)
     *
     * Note: This method updates shared static state (lastExecutionReport, lastAppliedSpans)
     * which is NOT thread-safe. For concurrent environments, use redactParallelV2 instead.
     *
     * @param text - Original text to redact
     * @param filters - Array of Span-based filters
     * @param policy - Redaction policy
     * @param context - Redaction context
     * @returns Redacted text with all tokens applied
     */
    static async redactParallel(text, filters, policy, context) {
        const result = await this.redactParallelInternal(text, filters, policy, context);
        // Update legacy static state for backwards compatibility
        this.lastExecutionReport = result.report;
        this.lastAppliedSpans = result.appliedSpans;
        return result.text;
    }
    /**
     * Internal implementation of parallel redaction
     * @internal
     */
    static async redactParallelInternal(text, filters, policy, context) {
        const startTime = Date.now();
        const filterResults = [];
        let pluginTimeMs = 0;
        // PLUGIN PRE-PROCESS HOOK: Allow plugins to modify text before processing
        const pluginsEnabled = plugins_1.pluginManager.isEnabled() && plugins_1.pluginManager.hasPlugins();
        let processedText = text;
        if (pluginsEnabled) {
            const preProcessStart = performance.now();
            const docContext = {
                text,
                sessionId: context.getSessionId(),
                metadata: {},
            };
            // Execute preProcess hooks
            const processedDoc = await plugins_1.pluginManager.executePreProcess(docContext);
            processedText = processedDoc.text;
            // Check for plugin short-circuit (e.g., cache plugin returning pre-computed result)
            const shortCircuit = await plugins_1.pluginManager.executeShortCircuit(processedDoc);
            if (shortCircuit) {
                const scTimeMs = performance.now() - preProcessStart;
                RadiologyLogger_1.RadiologyLogger.pipelineStage("PLUGIN-SHORTCIRCUIT", `Plugin '${shortCircuit.pluginName}' short-circuited: ${shortCircuit.result.reason}`, shortCircuit.result.spans.length);
                // Apply short-circuit spans and return
                const scSpans = shortCircuit.result.spans.map((s) => SpanFactory_1.SpanFactory.fromPosition(text, s.characterStart, s.characterEnd, s.filterType, {
                    confidence: s.confidence,
                    priority: s.priority ?? 50,
                    pattern: s.pattern,
                }));
                const scResult = this.applySpans(text, scSpans, context, policy);
                return {
                    text: scResult.text,
                    appliedSpans: scSpans,
                    report: {
                        totalFilters: filters.length,
                        filtersExecuted: 0,
                        filtersDisabled: 0,
                        filtersFailed: 0,
                        totalSpansDetected: shortCircuit.result.spans.length,
                        totalExecutionTimeMs: Date.now() - startTime,
                        filterResults: [],
                        failedFilters: [],
                        plugins: {
                            enabled: true,
                            count: plugins_1.pluginManager.getHookEntries().length,
                            shortCircuited: true,
                            shortCircuitPlugin: shortCircuit.pluginName,
                            totalPluginTimeMs: scTimeMs,
                        },
                    },
                };
            }
            pluginTimeMs += performance.now() - preProcessStart;
        }
        // Use processed text from here on
        const workingText = processedText;
        // CACHE CHECK: Try semantic cache before running full pipeline
        if (isSemanticCacheEnabled() && workingText.length >= 50) {
            const cache = (0, SemanticRedactionCache_1.getSemanticCache)();
            const policyHash = computePolicyHash(policy);
            const cacheLookup = cache.lookup(text, policyHash);
            if (cacheLookup.hit && cacheLookup.spans && cacheLookup.spans.length > 0) {
                // CACHE HIT - apply cached spans and return
                const cachedResult = this.applyCachedSpans(text, cacheLookup.spans, context, policy, filters.length, cacheLookup, startTime);
                RadiologyLogger_1.RadiologyLogger.info("CACHE", `Cache ${cacheLookup.hitType.toUpperCase()} hit: ${cacheLookup.spans.length} spans in ${cacheLookup.lookupTimeMs}ms (confidence: ${(cacheLookup.confidence * 100).toFixed(1)}%)`);
                return cachedResult;
            }
        }
        // Start pipeline trace (enabled via VULPES_TRACE=1)
        PipelineTracer_1.pipelineTracer.startTrace(workingText);
        // STEP 0: Initialize name detection coordinator (caches Rust results)
        // This eliminates duplicate Rust scanner calls across name filters
        NameDetectionCoordinator_1.nameDetectionCoordinator.beginDocument(workingText);
        // OPTIMIZATION: Pre-filter disabled filters before execution
        const enabledFilters = filters.filter((filter) => {
            const filterType = filter.getType();
            const config = policy.identifiers?.[filterType];
            if (config && typeof config === "object" && config.enabled === false) {
                // Log as disabled, don't execute
                filterResults.push({
                    filterName: filter.constructor.name,
                    filterType,
                    success: true,
                    spansDetected: 0,
                    executionTimeMs: 0,
                    enabled: false,
                });
                return false; // Skip this filter
            }
            return true; // Include in execution
        });
        RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Executing ${enabledFilters.length}/${filters.length} filters in parallel (${filters.length - enabledFilters.length} disabled)`);
        // OPTIMIZATION: Early return for empty or very short text
        if (!workingText || workingText.length < 3) {
            RadiologyLogger_1.RadiologyLogger.info("REDACTION", "Text too short for redaction, skipping");
            return {
                text: workingText,
                appliedSpans: [],
                report: {
                    totalFilters: filters.length,
                    filtersExecuted: 0,
                    filtersDisabled: 0,
                    filtersFailed: 0,
                    totalSpansDetected: 0,
                    totalExecutionTimeMs: 0,
                    filterResults: [],
                    failedFilters: [],
                },
            };
        }
        // STEP 0.5: DFA PRE-SCAN (optional, enabled via VULPES_DFA_SCAN=1)
        // Fast multi-pattern scanning to identify candidate regions before filter execution
        let dfaSpans = [];
        if ((0, MultiPatternScanner_1.isDFAScanningEnabled)()) {
            const dfaStart = Date.now();
            const dfaResult = (0, MultiPatternScanner_1.scanWithDFA)(workingText);
            const dfaTimeMs = Date.now() - dfaStart;
            // Convert DFA matches to Spans
            dfaSpans = this.dfaMatchesToSpans(dfaResult.matches, workingText);
            RadiologyLogger_1.RadiologyLogger.pipelineStage("DFA-PRESCAN", `DFA pre-scan: ${dfaResult.stats.matchesFound} matches in ${dfaTimeMs}ms (${dfaResult.stats.patternsChecked} patterns)`, dfaSpans.length);
        }
        // STEP 1: Execute all filters in parallel using Worker Threads
        // This offloads CPU-intensive operations to separate threads
        const workerPool = FilterWorkerPool_1.FilterWorkerPool.getInstance();
        const executionResults = await Promise.all(enabledFilters.map(async (filter) => {
            const filterStart = Date.now();
            const filterType = filter.getType();
            const filterName = filter.constructor.name;
            const config = policy.identifiers?.[filterType];
            try {
                // Use worker pool for execution
                const spans = await workerPool.execute(filterName, workingText, config);
                const executionTimeMs = Date.now() - filterStart;
                // Log completion
                RadiologyLogger_1.RadiologyLogger.filterComplete({
                    filterName,
                    filterType,
                    spansDetected: spans.length,
                    executionTimeMs,
                    success: true,
                });
                // Add to execution report
                filterResults.push({
                    filterName,
                    filterType,
                    success: true,
                    spansDetected: spans.length,
                    executionTimeMs,
                    enabled: true,
                });
                return { filter, spans, executionTimeMs };
            }
            catch (error) {
                const executionTimeMs = Date.now() - filterStart;
                RadiologyLogger_1.RadiologyLogger.error("REDACTION", `Filter ${filterName} failed (Worker): ${error}`);
                // FALLBACK: Try local execution if worker fails?
                // For now, log error and proceed.
                filterResults.push({
                    filterName,
                    filterType,
                    success: false,
                    spansDetected: 0,
                    executionTimeMs,
                    error: error instanceof Error ? error : new Error(String(error)),
                    enabled: true,
                });
                return { filter, spans: [], executionTimeMs };
            }
        }));
        let allSpans = executionResults.flatMap((r) => r.spans);
        // Merge DFA pre-scan spans with filter-detected spans
        // DFA spans have lower priority so filter spans will win on overlap
        if (dfaSpans.length > 0) {
            allSpans = [...allSpans, ...dfaSpans];
            RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Merged ${dfaSpans.length} DFA spans with ${allSpans.length - dfaSpans.length} filter spans`);
        }
        RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Total spans detected: ${allSpans.length} (before filtering)`);
        // Record filter execution stage
        PipelineTracer_1.pipelineTracer.startStage();
        PipelineTracer_1.pipelineTracer.recordStage("FILTER_EXECUTION", allSpans, {
            details: `${enabledFilters.length} filters executed`,
        });
        // PLUGIN POST-DETECTION HOOK: Allow plugins to modify detected spans
        if (pluginsEnabled) {
            const postDetectionStart = performance.now();
            const docContext = {
                text: workingText,
                sessionId: context.getSessionId(),
                metadata: {},
            };
            // Convert Span[] to SpanLike[] for plugin interface
            const spanLikes = allSpans.map((s) => ({
                text: s.text,
                characterStart: s.characterStart,
                characterEnd: s.characterEnd,
                filterType: s.filterType,
                confidence: s.confidence,
                priority: s.priority,
                pattern: s.pattern ?? undefined,
                windowBefore: s.windowBefore,
                windowAfter: s.windowAfter,
            }));
            const modifiedSpans = await plugins_1.pluginManager.executePostDetection(spanLikes, docContext);
            // If plugins modified spans, rebuild allSpans array
            if (modifiedSpans !== spanLikes && modifiedSpans.length !== allSpans.length) {
                // Release old spans back to pool
                SpanFactory_1.SpanFactory.releaseMany(allSpans);
                // Create new spans from plugin output
                allSpans = modifiedSpans.map((s) => SpanFactory_1.SpanFactory.fromPosition(workingText, s.characterStart, s.characterEnd, s.filterType, {
                    confidence: s.confidence,
                    priority: s.priority ?? 50,
                    pattern: s.pattern,
                }));
                RadiologyLogger_1.RadiologyLogger.pipelineStage("PLUGIN-POSTDETECTION", `Plugin modified spans: ${spanLikes.length} -> ${allSpans.length}`, allSpans.length);
            }
            pluginTimeMs += performance.now() - postDetectionStart;
        }
        // STEP 1.5: Field Context Detection (PRE-PASS)
        // Detect field labels and their expected value types
        const fieldContexts = FieldContextDetector_1.FieldContextDetector.detect(workingText);
        RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Field context pre-pass: ${fieldContexts.length} field labels detected`);
        // STEP 1.6: Detect multi-line patient names (JOHN SMITH after PATIENT:)
        const multiLineNames = FieldContextDetector_1.FieldContextDetector.detectMultiLinePatientNames(workingText);
        if (multiLineNames.length > 0) {
            RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Multi-line patient names detected: ${multiLineNames.length}`);
            // Add these as NAME spans (using pooled SpanFactory)
            for (const mlName of multiLineNames) {
                const nameSpan = SpanFactory_1.SpanFactory.fromPosition(workingText, mlName.start, mlName.end, Span_1.FilterType.NAME, {
                    confidence: mlName.confidence,
                    priority: 100, // High priority for context-detected names
                    pattern: "Multi-line patient name",
                });
                allSpans.push(nameSpan);
            }
        }
        // STEP 1.6b: Detect multi-line FILE # values (MRN in columnar layouts)
        const multiLineFileNumbers = FieldContextDetector_1.FieldContextDetector.detectMultiLineFileNumbers(workingText);
        if (multiLineFileNumbers.length > 0) {
            RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Multi-line FILE # values detected: ${multiLineFileNumbers.length}`);
            // Add these as MRN spans with HIGH priority to win over ZIPCODE
            for (const fileNum of multiLineFileNumbers) {
                // Check if this position already has an MRN span
                const alreadyHasMRN = allSpans.some((s) => s.filterType === Span_1.FilterType.MRN &&
                    s.characterStart === fileNum.start &&
                    s.characterEnd === fileNum.end);
                if (!alreadyHasMRN) {
                    // Remove any ZIPCODE span at this position (MRN takes priority in FILE # context)
                    allSpans = allSpans.filter((s) => !(s.filterType === Span_1.FilterType.ZIPCODE &&
                        s.characterStart === fileNum.start &&
                        s.characterEnd === fileNum.end));
                    // Create MRN span using pooled SpanFactory
                    const mrnSpan = SpanFactory_1.SpanFactory.fromPosition(workingText, fileNum.start, fileNum.end, Span_1.FilterType.MRN, {
                        confidence: fileNum.confidence,
                        priority: 100, // High priority for context-detected MRN
                        pattern: "Multi-line FILE # value",
                    });
                    allSpans.push(mrnSpan);
                }
            }
        }
        // STEP 1.7: Filter out non-PHI terms using UnifiedMedicalWhitelist (EARLY FILTERING)
        // Track removed spans for pool release
        const beforeWhitelist = [...allSpans];
        allSpans = this.filterUsingUnifiedWhitelist(allSpans);
        const whitelistRemoved = beforeWhitelist.length - allSpans.length;
        // Release spans filtered out by whitelist back to pool
        if (whitelistRemoved > 0) {
            const keptSet = new Set(allSpans);
            const removedByWhitelist = beforeWhitelist.filter(s => !keptSet.has(s));
            SpanFactory_1.SpanFactory.releaseMany(removedByWhitelist);
        }
        RadiologyLogger_1.RadiologyLogger.pipelineStage("WHITELIST", `UnifiedMedicalWhitelist removed ${whitelistRemoved} false positives`, allSpans.length);
        // STEP 1.7c: Filter ALL CAPS section headings (document structure detection)
        const beforeAllCaps = [...allSpans];
        allSpans = this.filterAllCapsStructure(allSpans, workingText);
        const allCapsRemoved = beforeAllCaps.length - allSpans.length;
        // Release spans filtered out by allCaps back to pool
        if (allCapsRemoved > 0) {
            const keptSet = new Set(allSpans);
            const removedByAllCaps = beforeAllCaps.filter(s => !keptSet.has(s));
            SpanFactory_1.SpanFactory.releaseMany(removedByAllCaps);
        }
        RadiologyLogger_1.RadiologyLogger.pipelineStage("ALL-CAPS", `Structure filter removed ${allCapsRemoved} section headings`, allSpans.length);
        // STEP 1.8: Apply field context to boost/suppress confidence
        this.applyFieldContextToSpans(allSpans, fieldContexts);
        RadiologyLogger_1.RadiologyLogger.pipelineStage("FIELD-CONTEXT", "Applied field context confidence modifiers", allSpans.length);
        // STEP 2: Populate context windows for all spans
        WindowService_1.WindowService.populateWindows(workingText, allSpans);
        RadiologyLogger_1.RadiologyLogger.pipelineStage("WINDOWS", "Context windows populated for all spans", allSpans.length);
        // STEP 2.5: Apply confidence modifiers based on context
        const confidenceModifier = new ConfidenceModifierService_1.ConfidenceModifierService();
        confidenceModifier.applyModifiersToAll(workingText, allSpans);
        RadiologyLogger_1.RadiologyLogger.pipelineStage("CONFIDENCE", "Confidence modifiers applied based on context", allSpans.length);
        // STEP 2.6: ENSEMBLE ENHANCEMENT - Multi-signal scoring (RESEARCH-BACKED)
        // Applies ensemble voting with dictionary, structure, label, and chaos signals
        // NOTE: Currently only ENHANCING confidence, not filtering - system needs tuning
        const spanEnhancer = new SpanEnhancer_1.SpanEnhancer({
            minConfidence: 0.0,
            modifySpans: true,
        });
        const enhancementAnalysis = spanEnhancer.analyzeSpans(allSpans, workingText, context);
        // Log enhancement stats but DON'T filter yet - let existing filters handle it
        // Once tuned, we can enable filtering with appropriate threshold
        const ensembleRemoved = 0; // Not filtering yet
        RadiologyLogger_1.RadiologyLogger.pipelineStage("ENSEMBLE", `Multi-signal enhancement: ${ensembleRemoved} low-confidence removed, avg change: ${(enhancementAnalysis.averageConfidenceChange * 100).toFixed(1)}%`, allSpans.length);
        // STEP 2.75: Disambiguate ambiguous spans using vector similarity
        const beforeDisambiguation = allSpans.length;
        const disambiguatedSpans = this.disambiguationService.disambiguate(allSpans);
        RadiologyLogger_1.RadiologyLogger.pipelineStage("DISAMBIGUATION", `Resolved ambiguous spans: ${beforeDisambiguation} -> ${disambiguatedSpans.length}`, disambiguatedSpans.length);
        // STEP 2.8: CROSS-TYPE REASONING - Apply constraint solving across PHI types
        // Uses DatalogReasoner by default (with CrossTypeReasoner fallback)
        // Handles mutual exclusion (DATE vs AGE), mutual support (NAME + MRN), document consistency
        const crossTypeResults = DatalogReasoner_1.datalogReasoner.reason(disambiguatedSpans, workingText);
        const crossTypeAdjusted = crossTypeResults.filter((r) => Math.abs(r.adjustedConfidence - r.originalConfidence) > 0.01).length;
        const datalogStats = DatalogReasoner_1.datalogReasoner.getStatistics();
        RadiologyLogger_1.RadiologyLogger.pipelineStage("CROSS-TYPE", `Cross-type reasoning: ${crossTypeAdjusted} spans adjusted, ${datalogStats.totalRules} rules (Datalog: ${datalogStats.isDatalogEnabled ? "ON" : "OFF"})`, disambiguatedSpans.length);
        // STEP 2.85: CLINICAL CONTEXT MODIFICATION - Universal context-based confidence adjustment
        // WIN-WIN: Boosts confidence in clinical context (sensitivity++), penalizes without (specificity++)
        if ((0, ContextualConfidenceModifier_1.isContextModifierEnabled)()) {
            const contextResults = ContextualConfidenceModifier_1.contextualConfidenceModifier.modifyAll(disambiguatedSpans, workingText);
            const summary = ContextualConfidenceModifier_1.ContextualConfidenceModifier.summarize(contextResults);
            RadiologyLogger_1.RadiologyLogger.pipelineStage("CONTEXT", `Clinical context: ${summary.boosted} boosted (+${(summary.avgBoost * 100).toFixed(1)}%), ${summary.penalized} penalized (-${(summary.avgPenalty * 100).toFixed(1)}%)`, disambiguatedSpans.length);
        }
        else {
            RadiologyLogger_1.RadiologyLogger.pipelineStage("CONTEXT", "Context modification disabled", disambiguatedSpans.length);
        }
        // STEP 2.9: CONFIDENCE CALIBRATION - Transform raw scores to calibrated probabilities
        // Uses isotonic regression for monotonic calibration (Zadrozny & Elkan, 2002)
        if (ConfidenceCalibrator_1.confidenceCalibrator.isFittedStatus()) {
            const calibrationResults = ConfidenceCalibrator_1.confidenceCalibrator.calibrateSpans(disambiguatedSpans);
            const avgCalibrationChange = calibrationResults.reduce((sum, r) => sum + Math.abs(r.calibratedConfidence - r.rawConfidence), 0) / calibrationResults.length;
            RadiologyLogger_1.RadiologyLogger.pipelineStage("CALIBRATION", `Confidence calibration applied: avg change ${(avgCalibrationChange * 100).toFixed(1)}%`, disambiguatedSpans.length);
        }
        else {
            RadiologyLogger_1.RadiologyLogger.pipelineStage("CALIBRATION", "Calibrator not fitted - using raw confidence scores", disambiguatedSpans.length);
        }
        // STEP 2.95: CORTEX ML ENHANCEMENT (optional, enabled via VULPES_USE_CORTEX=1)
        // Uses Python ML models for advanced entity recognition
        if (isCortexEnabled()) {
            try {
                // Dynamic import to avoid loading Cortex when not needed
                const { CortexPythonBridge } = await Promise.resolve().then(() => __importStar(require("./cortex/python/CortexPythonBridge")));
                const cortex = new CortexPythonBridge();
                if (await cortex.checkPythonAvailable()) {
                    RadiologyLogger_1.RadiologyLogger.pipelineStage("CORTEX", "Cortex ML enhancement available but not yet integrated into pipeline", disambiguatedSpans.length);
                    // Future: Send text to Cortex for ML-based enhancement
                    // const cortexResult = await cortex.executeTask({
                    //   task: 'CUSTOM',
                    //   input: { text, spans: disambiguatedSpans.map(s => s.toJSON()) }
                    // });
                }
                else {
                    RadiologyLogger_1.RadiologyLogger.pipelineStage("CORTEX", "Cortex enabled but Python not available - skipping", disambiguatedSpans.length);
                }
            }
            catch (error) {
                RadiologyLogger_1.RadiologyLogger.pipelineStage("CORTEX", `Cortex enhancement failed: ${error}`, disambiguatedSpans.length);
            }
        }
        // STEP 3: Resolve overlaps and deduplicate
        PipelineTracer_1.pipelineTracer.startStage();
        const mergedSpans = Span_1.SpanUtils.dropOverlappingSpans(disambiguatedSpans);
        PipelineTracer_1.pipelineTracer.recordStage("OVERLAP_RESOLUTION", mergedSpans, {
            details: `${disambiguatedSpans.length} -> ${mergedSpans.length}`,
        });
        // Release spans dropped during overlap resolution back to pool
        if (mergedSpans.length < disambiguatedSpans.length) {
            const mergedSet = new Set(mergedSpans);
            const droppedInOverlap = disambiguatedSpans.filter(s => !mergedSet.has(s));
            SpanFactory_1.SpanFactory.releaseMany(droppedInOverlap);
        }
        RadiologyLogger_1.RadiologyLogger.pipelineStage("OVERLAP", `Resolved overlapping spans: ${disambiguatedSpans.length} -> ${mergedSpans.length}`, mergedSpans.length);
        // SHADOW MODE: compare Rust name-scanner output vs TS pipeline (no behavior change).
        let shadow = undefined;
        if (process.env.VULPES_SHADOW_RUST_NAME === "1") {
            try {
                const rust = RustNameScanner_1.RustNameScanner.detectLastFirst(workingText);
                const ts = mergedSpans
                    .filter((s) => s.filterType === Span_1.FilterType.NAME)
                    .filter((s) => s.text.includes(","));
                const rustKeys = new Set(rust.map((r) => `${r.characterStart}-${r.characterEnd}`));
                const tsKeys = new Set(ts.map((s) => `${s.characterStart}-${s.characterEnd}`));
                let missingInRust = 0;
                for (const k of tsKeys)
                    if (!rustKeys.has(k))
                        missingInRust++;
                let extraInRust = 0;
                for (const k of rustKeys)
                    if (!tsKeys.has(k))
                        extraInRust++;
                shadow = {
                    rustNameLastFirst: {
                        enabled: true,
                        rustCount: rust.length,
                        tsCount: ts.length,
                        missingInRust,
                        extraInRust,
                    },
                };
            }
            catch {
                shadow = {
                    rustNameLastFirst: {
                        enabled: false,
                        rustCount: 0,
                        tsCount: 0,
                        missingInRust: 0,
                        extraInRust: 0,
                    },
                };
            }
        }
        if (process.env.VULPES_SHADOW_RUST_NAME_FULL === "1") {
            const baseShadow = shadow ?? {};
            try {
                const rust = RustNameScanner_1.RustNameScanner.detectFirstLast(workingText);
                const ts = mergedSpans.filter((s) => {
                    if (s.filterType !== "NAME")
                        return false;
                    const t = s.text;
                    if (t.includes(","))
                        return false;
                    const parts = t.trim().split(/\s+/);
                    if (parts.length !== 2 && parts.length !== 3)
                        return false;
                    return parts.every((p) => /^[A-Z][A-Za-z'`.-]{1,30}$/.test(p));
                });
                const rustKeys = new Set(rust.map((s) => `${s.characterStart}-${s.characterEnd}`));
                const tsKeys = new Set(ts.map((s) => `${s.characterStart}-${s.characterEnd}`));
                let missingInRust = 0;
                for (const k of tsKeys)
                    if (!rustKeys.has(k))
                        missingInRust++;
                let extraInRust = 0;
                for (const k of rustKeys)
                    if (!tsKeys.has(k))
                        extraInRust++;
                shadow = {
                    ...baseShadow,
                    rustNameFirstLast: {
                        enabled: true,
                        rustCount: rust.length,
                        tsCount: ts.length,
                        missingInRust,
                        extraInRust,
                    },
                };
            }
            catch {
                shadow = {
                    ...baseShadow,
                    rustNameFirstLast: {
                        enabled: false,
                        rustCount: 0,
                        tsCount: 0,
                        missingInRust: 0,
                        extraInRust: 0,
                    },
                };
            }
        }
        if (RustAccelConfig_1.RustAccelConfig.isShadowRustNameSmartEnabled()) {
            const baseShadow = shadow ?? {};
            try {
                const rust = RustNameScanner_1.RustNameScanner.detectSmart(workingText);
                const ts = mergedSpans.filter((s) => s.filterType === Span_1.FilterType.NAME);
                const rustKeys = new Set(rust.map((s) => `${s.characterStart}-${s.characterEnd}`));
                const tsKeys = new Set(ts.map((s) => `${s.characterStart}-${s.characterEnd}`));
                let missingInRust = 0;
                for (const k of tsKeys)
                    if (!rustKeys.has(k))
                        missingInRust++;
                let extraInRust = 0;
                for (const k of rustKeys)
                    if (!tsKeys.has(k))
                        extraInRust++;
                shadow = {
                    ...baseShadow,
                    rustNameSmart: {
                        enabled: true,
                        rustCount: rust.length,
                        tsCount: ts.length,
                        missingInRust,
                        extraInRust,
                    },
                };
            }
            catch {
                shadow = {
                    ...baseShadow,
                    rustNameSmart: {
                        enabled: false,
                        rustCount: 0,
                        tsCount: 0,
                        missingInRust: 0,
                        extraInRust: 0,
                    },
                };
            }
        }
        const postfilterShadow = process.env.VULPES_SHADOW_POSTFILTER === "1"
            ? {
                enabled: true,
                rustAvailable: false,
                rustEnabled: false,
                inputSpans: mergedSpans.length,
                tsKept: 0,
                rustKept: 0,
                missingInRust: 0,
                extraInRust: 0,
            }
            : undefined;
        if (postfilterShadow) {
            shadow = { ...(shadow ?? {}), postfilter: postfilterShadow };
        }
        // STEP 4: Post-filter to remove false positives (using PostFilterService)
        PipelineTracer_1.pipelineTracer.startStage();
        const validSpans = PostFilterService_1.PostFilterService.filter(mergedSpans, workingText, {
            shadowReport: postfilterShadow,
        });
        PipelineTracer_1.pipelineTracer.recordStage("POST_FILTER", validSpans, {
            details: `${mergedSpans.length} -> ${validSpans.length}`,
        });
        // Release spans dropped during post-filter back to pool
        if (validSpans.length < mergedSpans.length) {
            const validSet = new Set(validSpans);
            const droppedInPostFilter = mergedSpans.filter(s => !validSet.has(s));
            SpanFactory_1.SpanFactory.releaseMany(droppedInPostFilter);
        }
        RadiologyLogger_1.RadiologyLogger.pipelineStage("POST-FILTER", `Final false positive removal: ${mergedSpans.length} -> ${validSpans.length}`, validSpans.length);
        // PLUGIN PRE-REDACTION HOOK: Last chance to modify spans before token application
        let finalSpans = validSpans;
        if (pluginsEnabled) {
            const preRedactionStart = performance.now();
            const docContext = {
                text: workingText,
                sessionId: context.getSessionId(),
                metadata: {},
            };
            // Convert to SpanLike for plugin interface
            const spanLikes = validSpans.map((s) => ({
                text: s.text,
                characterStart: s.characterStart,
                characterEnd: s.characterEnd,
                filterType: s.filterType,
                confidence: s.confidence,
                priority: s.priority,
                pattern: s.pattern ?? undefined,
                replacement: s.replacement ?? undefined,
            }));
            const modifiedSpans = await plugins_1.pluginManager.executePreRedaction(spanLikes, docContext);
            // If plugins modified spans, rebuild finalSpans
            if (modifiedSpans !== spanLikes) {
                finalSpans = modifiedSpans.map((s) => SpanFactory_1.SpanFactory.fromPosition(workingText, s.characterStart, s.characterEnd, s.filterType, {
                    confidence: s.confidence,
                    priority: s.priority ?? 50,
                    pattern: s.pattern,
                    replacement: s.replacement,
                }));
                if (finalSpans.length !== validSpans.length) {
                    RadiologyLogger_1.RadiologyLogger.pipelineStage("PLUGIN-PREREDACTION", `Plugin modified final spans: ${validSpans.length} -> ${finalSpans.length}`, finalSpans.length);
                }
            }
            pluginTimeMs += performance.now() - preRedactionStart;
        }
        // STEP 5: Apply all spans at once
        const applyResult = this.applySpans(workingText, finalSpans, context, policy);
        let redactedText = applyResult.text;
        if (applyResult.shadow) {
            shadow = { ...(shadow ?? {}), applySpans: applyResult.shadow };
        }
        // PLUGIN POST-REDACTION HOOK: Allow plugins to modify final result
        if (pluginsEnabled) {
            const postRedactionStart = performance.now();
            const resultLike = {
                text: redactedText,
                appliedSpans: finalSpans.map((s) => ({
                    text: s.text,
                    characterStart: s.characterStart,
                    characterEnd: s.characterEnd,
                    filterType: s.filterType,
                    confidence: s.confidence,
                    priority: s.priority,
                    replacement: s.replacement ?? undefined,
                })),
                report: {
                    totalFilters: filters.length,
                    filtersExecuted: filterResults.filter((r) => r.enabled).length,
                    totalSpansDetected: allSpans.length,
                    totalExecutionTimeMs: Date.now() - startTime,
                },
            };
            const modifiedResult = await plugins_1.pluginManager.executePostRedaction(resultLike);
            // Apply plugin modifications
            if (modifiedResult !== resultLike) {
                redactedText = modifiedResult.text;
                // Note: We don't rebuild Span objects here as we're at the end of pipeline
                // Plugins can modify the result text directly (e.g., add headers/footers)
            }
            pluginTimeMs += performance.now() - postRedactionStart;
        }
        const totalTime = Date.now() - startTime;
        // Generate execution report
        const failedFilters = filterResults
            .filter((r) => !r.success && r.enabled)
            .map((r) => r.filterName);
        const report = {
            totalFilters: filters.length,
            filtersExecuted: filterResults.filter((r) => r.enabled).length,
            filtersDisabled: filterResults.filter((r) => !r.enabled).length,
            filtersFailed: failedFilters.length,
            totalSpansDetected: allSpans.length,
            totalExecutionTimeMs: totalTime,
            filterResults,
            failedFilters,
            ...(pluginsEnabled
                ? {
                    plugins: {
                        enabled: true,
                        count: plugins_1.pluginManager.getHookEntries().length,
                        shortCircuited: false,
                        totalPluginTimeMs: pluginTimeMs,
                    },
                }
                : {}),
            ...(shadow ? { shadow } : {}),
        };
        // End pipeline trace (if enabled)
        PipelineTracer_1.pipelineTracer.endTrace(finalSpans, redactedText);
        // End name detection coordinator (clears cache)
        NameDetectionCoordinator_1.nameDetectionCoordinator.endDocument();
        // Log comprehensive summary
        RadiologyLogger_1.RadiologyLogger.redactionSummary({
            inputLength: workingText.length,
            outputLength: redactedText.length,
            totalSpansDetected: filterResults.reduce((sum, r) => sum + r.spansDetected, 0),
            spansAfterFiltering: mergedSpans.length,
            spansApplied: finalSpans.length,
            executionTimeMs: totalTime,
            filterCount: enabledFilters.length,
        });
        if (failedFilters.length > 0) {
            RadiologyLogger_1.RadiologyLogger.error("REDACTION", `${failedFilters.length} filters FAILED: ${failedFilters.join(", ")}`);
        }
        // Log detailed filter statistics
        this.logFilterStatistics(filterResults);
        // CACHE STORE: Store result in semantic cache for future hits
        if (isSemanticCacheEnabled() && workingText.length >= 50 && finalSpans.length > 0) {
            try {
                const cache = (0, SemanticRedactionCache_1.getSemanticCache)();
                const policyHash = computePolicyHash(policy);
                // Extract structure (or reuse from cache lookup if available)
                const { StructureExtractor } = require("../cache/StructureExtractor");
                const extractor = new StructureExtractor();
                const structure = extractor.extract(workingText);
                cache.store(workingText, finalSpans, structure, policyHash);
            }
            catch (cacheError) {
                // Cache store failure is non-critical - log and continue
                RadiologyLogger_1.RadiologyLogger.debug("CACHE", `Cache store failed: ${cacheError}`);
            }
        }
        // Return complete result (thread-safe - no shared state mutation)
        return {
            text: redactedText,
            appliedSpans: [...finalSpans],
            report,
        };
    }
    /**
     * Log detailed filter statistics for diagnostics
     */
    static logFilterStatistics(results) {
        const enabledResults = results.filter((r) => r.enabled);
        if (enabledResults.length === 0)
            return;
        RadiologyLogger_1.RadiologyLogger.info("REDACTION", "=".repeat(60));
        RadiologyLogger_1.RadiologyLogger.info("REDACTION", "Filter Execution Statistics:");
        // Sort by execution time (slowest first)
        const sorted = [...enabledResults].sort((a, b) => b.executionTimeMs - a.executionTimeMs);
        for (const result of sorted) {
            const icon = result.success ? "[OK]" : "[X]";
            const status = result.success ? "OK" : "FAILED";
            RadiologyLogger_1.RadiologyLogger.info("REDACTION", `  ${icon} ${result.filterType.padEnd(15)} | ${result.filterName.padEnd(30)} | ${result.spansDetected.toString().padStart(3)} spans | ${result.executionTimeMs.toString().padStart(4)}ms | ${status}`);
            if (result.error) {
                RadiologyLogger_1.RadiologyLogger.error("REDACTION", `      Error: ${result.error.message}`);
            }
        }
        RadiologyLogger_1.RadiologyLogger.info("REDACTION", "=".repeat(60));
    }
    // postFilterSpans method moved to PostFilterService (src/core/filters/PostFilterService.ts)
    /**
     * Apply all spans to text in a single pass
     * Processes spans in reverse order to maintain positions
     */
    static applySpans(text, spans, context, policy) {
        // Sort by position (reverse) so we can replace without messing up positions
        const sortedSpans = [...spans].sort((a, b) => b.characterStart - a.characterStart);
        const replacements = [];
        for (const span of sortedSpans) {
            const replacement = span.replacement ??
                policy?.identifiers?.[span.filterType]?.replacement ??
                context.createToken(span.filterType, span.text);
            replacements.push({
                characterStart: span.characterStart,
                characterEnd: span.characterEnd,
                replacement,
            });
            // Log PHI detection with full details
            const contextStart = Math.max(0, span.characterStart - 30);
            const contextEnd = Math.min(text.length, span.characterEnd + 30);
            const contextSnippet = text.substring(contextStart, contextEnd);
            RadiologyLogger_1.RadiologyLogger.phiDetected({
                filterType: span.filterType,
                text: span.text,
                start: span.characterStart,
                end: span.characterEnd,
                confidence: span.confidence,
                token: replacement,
                context: contextSnippet,
                pattern: span.pattern || undefined,
            });
            span.replacement = replacement;
            span.applied = true;
        }
        const applyShadowEnabled = process.env.VULPES_SHADOW_APPLY_SPANS === "1";
        const rustAvailable = RustApplyKernel_1.RustApplyKernel.isAvailable();
        const rustEnabled = RustAccelConfig_1.RustAccelConfig.isApplySpansEnabled();
        const applyInTs = (input, reps) => {
            const sorted = [...reps].sort((a, b) => b.characterStart - a.characterStart);
            let out = input;
            for (const r of sorted) {
                out =
                    out.substring(0, r.characterStart) +
                        r.replacement +
                        out.substring(r.characterEnd);
            }
            return out;
        };
        const rustOutput = RustApplyKernel_1.RustApplyKernel.apply(text, replacements);
        const usedRust = rustOutput !== null;
        const chosen = usedRust ? rustOutput : applyInTs(text, replacements);
        let shadow = undefined;
        if (applyShadowEnabled) {
            const tsOutput = applyInTs(text, replacements);
            const rustShadowOutput = rustOutput ?? RustApplyKernel_1.RustApplyKernel.applyUnsafe(text, replacements);
            const outputsEqual = rustShadowOutput !== null ? tsOutput === rustShadowOutput : true;
            let firstDiffAt = undefined;
            if (!outputsEqual && rustShadowOutput) {
                const max = Math.min(tsOutput.length, rustShadowOutput.length);
                for (let i = 0; i < max; i++) {
                    if (tsOutput[i] !== rustShadowOutput[i]) {
                        firstDiffAt = i;
                        break;
                    }
                }
                if (firstDiffAt === undefined &&
                    tsOutput.length !== rustShadowOutput.length) {
                    firstDiffAt = max;
                }
            }
            shadow = {
                enabled: true,
                rustAvailable,
                rustEnabled,
                spans: spans.length,
                outputsEqual,
                ...(firstDiffAt !== undefined ? { firstDiffAt } : {}),
            };
        }
        return { text: chosen, ...(shadow ? { shadow } : {}) };
    }
    /**
     * Apply field context information to spans
     * Boosts confidence when span type matches expected field type
     * Reduces confidence when there's a type mismatch
     */
    static applyFieldContextToSpans(spans, fieldContexts) {
        for (const span of spans) {
            const result = FieldContextDetector_1.FieldContextDetector.matchesExpectedType(fieldContexts, span.characterStart, span.characterEnd, span.filterType);
            if (result.matches) {
                // Boost confidence for matching types
                span.confidence = Math.min(1.0, span.confidence * 1.15);
                // Boost priority significantly for context-matched spans
                span.priority = Math.max(span.priority, 90);
            }
            else if (result.confidence < 0.7) {
                // Reduce confidence for mismatched types (but don't remove)
                span.confidence = span.confidence * 0.8;
            }
        }
    }
    /**
     * Get statistics from applied spans
     */
    static getStatistics(spans) {
        const stats = {};
        for (const span of spans) {
            if (span.applied) {
                const type = span.filterType;
                stats[type] = (stats[type] || 0) + 1;
            }
        }
        return stats;
    }
    /**
     * Filter spans using the UnifiedMedicalWhitelist
     * Single source of truth for all non-PHI term detection
     */
    static filterUsingUnifiedWhitelist(spans) {
        // Pattern-matched types that should NOT be filtered by whitelist
        // These have precise regex patterns and shouldn't be second-guessed
        const PATTERN_MATCHED_TYPES = new Set([
            Span_1.FilterType.SSN,
            Span_1.FilterType.PHONE,
            Span_1.FilterType.EMAIL,
            Span_1.FilterType.IP,
            Span_1.FilterType.URL,
            Span_1.FilterType.FAX,
            Span_1.FilterType.MRN,
            Span_1.FilterType.ACCOUNT,
            Span_1.FilterType.LICENSE,
            Span_1.FilterType.CREDIT_CARD,
            Span_1.FilterType.HEALTH_PLAN,
            Span_1.FilterType.DEVICE,
            Span_1.FilterType.BIOMETRIC,
        ]);
        return spans.filter((span) => {
            const text = span.text.trim();
            // Skip pattern-matched types - they're precise and shouldn't be filtered
            if (PATTERN_MATCHED_TYPES.has(span.filterType)) {
                return true;
            }
            // Explicit name-field extractions are high-signal and should not be dropped
            if (span.filterType === Span_1.FilterType.NAME &&
                span.pattern === "Labeled name field" &&
                span.confidence >= 0.95) {
                return true;
            }
            // CRITICAL: Check for person indicators FIRST
            // "Dr. Wilson" is a person even though "Wilson's disease" exists
            // hasPersonIndicators returns true if text has titles/suffixes
            if (UnifiedMedicalWhitelist_1.UnifiedMedicalWhitelist.hasPersonIndicators(text)) {
                // Still filter obvious document structure terms
                if (UnifiedMedicalWhitelist_1.UnifiedMedicalWhitelist.isDocumentStructure(text)) {
                    RadiologyLogger_1.RadiologyLogger.debug("WHITELIST", `Excluding titled text with structure term: "${text}"`);
                    return false;
                }
                // Keep this span - it's a titled/suffixed person name
                return true;
            }
            // Use the unified whitelist for ALL whitelist decisions
            if ((0, UnifiedMedicalWhitelist_2.shouldWhitelist)(text, span.filterType)) {
                RadiologyLogger_1.RadiologyLogger.debug("WHITELIST", `Excluding whitelisted term: "${text}"`);
                return false;
            }
            // Check individual words in multi-word spans
            const words = text.split(/[\s,]+/).filter((w) => w.length > 2);
            for (const word of words) {
                if ((0, UnifiedMedicalWhitelist_2.shouldWhitelist)(word, span.filterType)) {
                    RadiologyLogger_1.RadiologyLogger.debug("WHITELIST", `Excluding span with whitelisted word "${word}": "${text}"`);
                    return false;
                }
            }
            // Check HospitalDictionary (separate from whitelist for comprehensive hospital coverage)
            if (HospitalDictionary_1.HospitalDictionary.isHospital(text) ||
                HospitalDictionary_1.HospitalDictionary.isPartOfHospitalName(text, text)) {
                RadiologyLogger_1.RadiologyLogger.debug("WHITELIST", `Excluding hospital name: "${text}"`);
                return false;
            }
            return true;
        });
    }
    /**
     * Filter ALL CAPS text that appears to be document structure
     * Section headings in ALL CAPS are common in medical documents
     */
    static filterAllCapsStructure(spans, text) {
        // Build a set of line start/end positions for ALL CAPS lines
        const allCapsLines = new Set();
        const lines = text.split("\n");
        let currentPos = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            // Check if line is ALL CAPS (at least 2 letters, all uppercase)
            if (trimmed.length >= 2 &&
                /^[A-Z][A-Z\s\-:\/\d]+$/.test(trimmed) &&
                /[A-Z]{2,}/.test(trimmed)) {
                // This line is ALL CAPS - add trimmed version to set
                allCapsLines.add(trimmed);
            }
            currentPos += line.length + 1; // +1 for newline
        }
        return spans.filter((span) => {
            // Only filter NAME type
            if (span.filterType !== Span_1.FilterType.NAME) {
                return true;
            }
            const spanText = span.text.trim().toUpperCase();
            // Check if this span text appears in an ALL CAPS line
            for (const capsLine of allCapsLines) {
                if (capsLine.includes(spanText) || spanText === capsLine) {
                    // Verify this looks like a heading (contains common heading words)
                    const headingIndicators = [
                        "INFORMATION",
                        "DATA",
                        "SECTION",
                        "PATIENT",
                        "MEDICAL",
                        "HEALTH",
                        "CLINICAL",
                        "DIAGNOSIS",
                        "TREATMENT",
                        "HISTORY",
                        "NOTES",
                        "SUMMARY",
                        "REPORT",
                        "ASSESSMENT",
                        "PLAN",
                        "RESULTS",
                        "FINDINGS",
                        "PROCEDURE",
                        "DISCHARGE",
                        "ADMISSION",
                        "VITAL",
                        "SIGNS",
                        "MEDICATIONS",
                        "ALLERGIES",
                        "INSURANCE",
                        "BILLING",
                        "CONTACT",
                        "EMERGENCY",
                        "IDENTIFIER",
                        "HIPAA",
                        "PRIVACY",
                        "PROTECTED",
                        "GEOGRAPHIC",
                        "DEMOGRAPHIC",
                        "BIOMETRIC",
                        "HARBOR",
                    ];
                    // Only filter if the SPAN TEXT ITSELF contains a heading indicator
                    // NOT if the surrounding line has a field label like "PATIENT:"
                    // Example: "PATIENT: JOHN SMITH" - "PATIENT" is a label, "JOHN SMITH" is PHI
                    const spanContainsHeadingIndicator = headingIndicators.some((indicator) => spanText.includes(indicator));
                    // Also check if the line is PURELY a heading (no colon separator indicating field:value)
                    const isPureHeading = !capsLine.includes(":") || capsLine.endsWith(":");
                    const lineContainsHeadingIndicator = headingIndicators.some((indicator) => capsLine.includes(indicator));
                    if (spanContainsHeadingIndicator ||
                        (isPureHeading && lineContainsHeadingIndicator)) {
                        RadiologyLogger_1.RadiologyLogger.debug("ParallelRedactionEngine", `Excluding NAME in ALL CAPS heading: "${span.text}" (line: "${capsLine}")`);
                        return false;
                    }
                }
            }
            return true;
        });
    }
    /**
     * Convert DFA scan matches to Span objects (using pooled SpanFactory)
     * DFA matches are fast pre-scan results that get merged with filter outputs
     */
    static dfaMatchesToSpans(matches, text) {
        return matches.map((match) => {
            return SpanFactory_1.SpanFactory.fromPosition(text, match.start, match.end, match.filterType, {
                confidence: match.confidence,
                priority: 50, // Lower priority than filter-detected spans (filters have more context)
                pattern: `DFA:${match.patternId}`,
            });
        });
    }
    /**
     * Apply cached spans to produce redaction result (fast path for cache hits)
     */
    static applyCachedSpans(text, spans, context, policy, totalFilters, cacheLookup, startTime) {
        // Sort spans by position (reverse) for safe replacement
        const sortedSpans = [...spans].sort((a, b) => b.characterStart - a.characterStart);
        let redactedText = text;
        for (const span of sortedSpans) {
            const replacement = span.replacement ??
                policy?.identifiers?.[span.filterType]?.replacement ??
                context.createToken(span.filterType, span.text);
            redactedText =
                redactedText.substring(0, span.characterStart) +
                    replacement +
                    redactedText.substring(span.characterEnd);
            span.replacement = replacement;
            span.applied = true;
        }
        const totalTime = Date.now() - startTime;
        // Build report for cached result
        const report = {
            totalFilters,
            filtersExecuted: 0, // No filters executed - used cache
            filtersDisabled: 0,
            filtersFailed: 0,
            totalSpansDetected: spans.length,
            totalExecutionTimeMs: totalTime,
            filterResults: [],
            failedFilters: [],
            cache: {
                hit: true,
                hitType: cacheLookup.hitType,
                confidence: cacheLookup.confidence,
                lookupTimeMs: cacheLookup.lookupTimeMs,
            },
        };
        return {
            text: redactedText,
            appliedSpans: [...spans],
            report,
        };
    }
    /**
     * Get cache statistics
     */
    static getCacheStats() {
        if (!isSemanticCacheEnabled()) {
            return null;
        }
        return (0, SemanticRedactionCache_1.getSemanticCache)().getStats();
    }
    /**
     * Clear the semantic cache
     */
    static clearCache() {
        if (isSemanticCacheEnabled()) {
            (0, SemanticRedactionCache_1.getSemanticCache)().clear();
        }
    }
}
exports.ParallelRedactionEngine = ParallelRedactionEngine;
//# sourceMappingURL=ParallelRedactionEngine.js.map