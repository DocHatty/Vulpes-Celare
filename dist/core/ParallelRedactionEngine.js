"use strict";
/**
 * Parallel Redaction Engine
 *
 * Executes all filters in parallel on original text, then merges results.
 * This is the Phileas-style architecture for maximum performance and correctness.
 *
 * @module redaction/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelRedactionEngine = void 0;
const Span_1 = require("../models/Span");
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
const WindowService_1 = require("../services/WindowService");
const ConfidenceModifierService_1 = require("../services/ConfidenceModifierService");
const VectorDisambiguationService_1 = require("../services/VectorDisambiguationService");
const FieldLabelWhitelist_1 = require("./FieldLabelWhitelist");
const FieldContextDetector_1 = require("./FieldContextDetector");
const DocumentVocabulary_1 = require("../vocabulary/DocumentVocabulary");
const HospitalDictionary_1 = require("../dictionaries/HospitalDictionary");
const PostFilterService_1 = require("./filters/PostFilterService");
const SpanEnhancer_1 = require("./SpanEnhancer");
const CrossTypeReasoner_1 = require("./CrossTypeReasoner");
const ConfidenceCalibrator_1 = require("./ConfidenceCalibrator");
const NameFilterConstants_1 = require("../filters/constants/NameFilterConstants");
const RustNameScanner_1 = require("../utils/RustNameScanner");
const RustApplyKernel_1 = require("../utils/RustApplyKernel");
const RustAccelConfig_1 = require("../config/RustAccelConfig");
/**
 * Parallel Redaction Engine
 * Orchestrates parallel filter execution and span merging
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Pre-filters disabled filters before execution (20-40% faster)
 * - Early returns for short/empty text
 * - Parallel execution of all enabled filters
 *
 * FUTURE OPTIMIZATION: Implement regex pattern caching in individual filters
 * to avoid recompiling patterns on every request.
 */
class ParallelRedactionEngine {
    static disambiguationService = new VectorDisambiguationService_1.VectorDisambiguationService();
    static lastExecutionReport = null;
    /**
     * Get the last execution report for diagnostics
     */
    static getLastExecutionReport() {
        return this.lastExecutionReport;
    }
    /**
     * Execute all filters in parallel and merge results
     *
     * @param text - Original text to redact
     * @param filters - Array of Span-based filters
     * @param policy - Redaction policy
     * @param context - Redaction context
     * @returns Redacted text with all tokens applied
     */
    static async redactParallel(text, filters, policy, context) {
        const startTime = Date.now();
        const filterResults = [];
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
        if (!text || text.length < 3) {
            RadiologyLogger_1.RadiologyLogger.info("REDACTION", "Text too short for redaction, skipping");
            return text;
        }
        // STEP 1: Execute all filters in parallel using Promise.all
        // Note: This is single-threaded concurrency (event loop), not true CPU parallelism.
        // For CPU-bound work like regex matching, this still provides good performance
        // by allowing I/O operations to interleave. True parallelism would require
        // worker_threads with shared dictionary memory (future optimization).
        const executionResults = await Promise.all(enabledFilters.map(async (filter) => {
            const filterStart = Date.now();
            const filterType = filter.getType();
            const filterName = filter.constructor.name;
            const config = policy.identifiers?.[filterType];
            try {
                const spans = await Promise.resolve(filter.detect(text, config, context));
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
                RadiologyLogger_1.RadiologyLogger.error("REDACTION", `Filter ${filterName} failed: ${error}`);
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
        RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Total spans detected: ${allSpans.length} (before filtering)`);
        // STEP 1.5: Field Context Detection (PRE-PASS)
        // Detect field labels and their expected value types
        const fieldContexts = FieldContextDetector_1.FieldContextDetector.detect(text);
        RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Field context pre-pass: ${fieldContexts.length} field labels detected`);
        // STEP 1.6: Detect multi-line patient names (JOHN SMITH after PATIENT:)
        const multiLineNames = FieldContextDetector_1.FieldContextDetector.detectMultiLinePatientNames(text);
        if (multiLineNames.length > 0) {
            RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Multi-line patient names detected: ${multiLineNames.length}`);
            // Add these as NAME spans
            for (const mlName of multiLineNames) {
                const nameSpan = new Span_1.Span({
                    text: mlName.name,
                    originalValue: mlName.name,
                    characterStart: mlName.start,
                    characterEnd: mlName.end,
                    filterType: Span_1.FilterType.NAME,
                    confidence: mlName.confidence,
                    priority: 100, // High priority for context-detected names
                    context: text.substring(Math.max(0, mlName.start - 50), Math.min(text.length, mlName.end + 50)),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: "Multi-line patient name",
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                allSpans.push(nameSpan);
            }
        }
        // STEP 1.6b: Detect multi-line FILE # values (MRN in columnar layouts)
        const multiLineFileNumbers = FieldContextDetector_1.FieldContextDetector.detectMultiLineFileNumbers(text);
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
                    const mrnSpan = new Span_1.Span({
                        text: fileNum.value,
                        originalValue: fileNum.value,
                        characterStart: fileNum.start,
                        characterEnd: fileNum.end,
                        filterType: Span_1.FilterType.MRN,
                        confidence: fileNum.confidence,
                        priority: 100, // High priority for context-detected MRN
                        context: text.substring(Math.max(0, fileNum.start - 50), Math.min(text.length, fileNum.end + 50)),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: "Multi-line FILE # value",
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    allSpans.push(mrnSpan);
                }
            }
        }
        // STEP 1.7: Filter out field labels using whitelist (EARLY FILTERING)
        const beforeWhitelist = allSpans.length;
        allSpans = FieldLabelWhitelist_1.FieldLabelWhitelist.filterSpans(allSpans);
        const whitelistRemoved = beforeWhitelist - allSpans.length;
        RadiologyLogger_1.RadiologyLogger.pipelineStage("WHITELIST", `Field label whitelist removed ${whitelistRemoved} false positives`, allSpans.length);
        // STEP 1.7b: Filter spans using DocumentVocabulary (centralized non-PHI detection)
        // NOTE: Spans with priority >= 150 are protected from vocabulary filtering
        const beforeVocab = allSpans.length;
        allSpans = this.filterUsingDocumentVocabulary(allSpans);
        const vocabRemoved = beforeVocab - allSpans.length;
        RadiologyLogger_1.RadiologyLogger.pipelineStage("VOCABULARY", `DocumentVocabulary removed ${vocabRemoved} non-PHI terms`, allSpans.length);
        // STEP 1.7c: Filter ALL CAPS section headings (document structure detection)
        const beforeAllCaps = allSpans.length;
        allSpans = this.filterAllCapsStructure(allSpans, text);
        const allCapsRemoved = beforeAllCaps - allSpans.length;
        RadiologyLogger_1.RadiologyLogger.pipelineStage("ALL-CAPS", `Structure filter removed ${allCapsRemoved} section headings`, allSpans.length);
        // STEP 1.8: Apply field context to boost/suppress confidence
        this.applyFieldContextToSpans(allSpans, fieldContexts);
        RadiologyLogger_1.RadiologyLogger.pipelineStage("FIELD-CONTEXT", "Applied field context confidence modifiers", allSpans.length);
        // STEP 2: Populate context windows for all spans
        WindowService_1.WindowService.populateWindows(text, allSpans);
        RadiologyLogger_1.RadiologyLogger.pipelineStage("WINDOWS", "Context windows populated for all spans", allSpans.length);
        // STEP 2.5: Apply confidence modifiers based on context
        const confidenceModifier = new ConfidenceModifierService_1.ConfidenceModifierService();
        confidenceModifier.applyModifiersToAll(text, allSpans);
        RadiologyLogger_1.RadiologyLogger.pipelineStage("CONFIDENCE", "Confidence modifiers applied based on context", allSpans.length);
        // STEP 2.6: ENSEMBLE ENHANCEMENT - Multi-signal scoring (RESEARCH-BACKED)
        // Applies ensemble voting with dictionary, structure, label, and chaos signals
        // NOTE: Currently only ENHANCING confidence, not filtering - system needs tuning
        const beforeEnsemble = allSpans.length;
        const spanEnhancer = new SpanEnhancer_1.SpanEnhancer({
            minConfidence: 0.0,
            modifySpans: true,
        });
        const enhancementAnalysis = spanEnhancer.analyzeSpans(allSpans, text, context);
        // Log enhancement stats but DON'T filter yet - let existing filters handle it
        // Once tuned, we can enable filtering with appropriate threshold
        const ensembleRemoved = 0; // Not filtering yet
        RadiologyLogger_1.RadiologyLogger.pipelineStage("ENSEMBLE", `Multi-signal enhancement: ${ensembleRemoved} low-confidence removed, avg change: ${(enhancementAnalysis.averageConfidenceChange * 100).toFixed(1)}%`, allSpans.length);
        // STEP 2.75: Disambiguate ambiguous spans using vector similarity
        const beforeDisambiguation = allSpans.length;
        const disambiguatedSpans = this.disambiguationService.disambiguate(allSpans);
        RadiologyLogger_1.RadiologyLogger.pipelineStage("DISAMBIGUATION", `Resolved ambiguous spans: ${beforeDisambiguation} -> ${disambiguatedSpans.length}`, disambiguatedSpans.length);
        // STEP 2.8: CROSS-TYPE REASONING - Apply constraint solving across PHI types
        // Handles mutual exclusion (DATE vs AGE), mutual support (NAME + MRN), document consistency
        const beforeCrossType = disambiguatedSpans.length;
        const crossTypeResults = CrossTypeReasoner_1.crossTypeReasoner.reason(disambiguatedSpans, text);
        const crossTypeAdjusted = crossTypeResults.filter((r) => Math.abs(r.adjustedConfidence - r.originalConfidence) > 0.01).length;
        RadiologyLogger_1.RadiologyLogger.pipelineStage("CROSS-TYPE", `Cross-type reasoning: ${crossTypeAdjusted} spans adjusted, ${CrossTypeReasoner_1.crossTypeReasoner.getStatistics().totalConstraints} constraints applied`, disambiguatedSpans.length);
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
        // STEP 3: Resolve overlaps and deduplicate
        const mergedSpans = Span_1.SpanUtils.dropOverlappingSpans(disambiguatedSpans);
        RadiologyLogger_1.RadiologyLogger.pipelineStage("OVERLAP", `Resolved overlapping spans: ${disambiguatedSpans.length} -> ${mergedSpans.length}`, mergedSpans.length);
        // SHADOW MODE: compare Rust name-scanner output vs TS pipeline (no behavior change).
        let shadow = undefined;
        if (process.env.VULPES_SHADOW_RUST_NAME === "1") {
            try {
                const rust = RustNameScanner_1.RustNameScanner.detectLastFirst(text);
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
                const rust = RustNameScanner_1.RustNameScanner.detectFirstLast(text);
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
                const rust = RustNameScanner_1.RustNameScanner.detectSmart(text);
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
        const validSpans = PostFilterService_1.PostFilterService.filter(mergedSpans, text, {
            shadowReport: postfilterShadow,
        });
        RadiologyLogger_1.RadiologyLogger.pipelineStage("POST-FILTER", `Final false positive removal: ${mergedSpans.length} -> ${validSpans.length}`, validSpans.length);
        // STEP 5: Apply all spans at once
        const applyResult = this.applySpans(text, validSpans, context);
        const redactedText = applyResult.text;
        if (applyResult.shadow) {
            shadow = { ...(shadow ?? {}), applySpans: applyResult.shadow };
        }
        const totalTime = Date.now() - startTime;
        // Generate execution report
        const failedFilters = filterResults
            .filter((r) => !r.success && r.enabled)
            .map((r) => r.filterName);
        this.lastExecutionReport = {
            totalFilters: filters.length,
            filtersExecuted: filterResults.filter((r) => r.enabled).length,
            filtersDisabled: filterResults.filter((r) => !r.enabled).length,
            filtersFailed: failedFilters.length,
            totalSpansDetected: allSpans.length,
            totalExecutionTimeMs: totalTime,
            filterResults,
            failedFilters,
            ...(shadow ? { shadow } : {}),
        };
        // Log comprehensive summary
        RadiologyLogger_1.RadiologyLogger.redactionSummary({
            inputLength: text.length,
            outputLength: redactedText.length,
            totalSpansDetected: filterResults.reduce((sum, r) => sum + r.spansDetected, 0),
            spansAfterFiltering: mergedSpans.length,
            spansApplied: validSpans.length,
            executionTimeMs: totalTime,
            filterCount: enabledFilters.length,
        });
        if (failedFilters.length > 0) {
            RadiologyLogger_1.RadiologyLogger.error("REDACTION", `${failedFilters.length} filters FAILED: ${failedFilters.join(", ")}`);
        }
        // Log detailed filter statistics
        this.logFilterStatistics(filterResults);
        return redactedText;
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
    static applySpans(text, spans, context) {
        // Sort by position (reverse) so we can replace without messing up positions
        const sortedSpans = [...spans].sort((a, b) => b.characterStart - a.characterStart);
        const replacements = [];
        for (const span of sortedSpans) {
            // Create token for this span
            const token = context.createToken(span.filterType, span.text);
            replacements.push({
                characterStart: span.characterStart,
                characterEnd: span.characterEnd,
                replacement: token,
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
                token: token,
                context: contextSnippet,
                pattern: span.pattern || undefined,
            });
            span.replacement = token;
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
     * Filter spans using the centralized DocumentVocabulary service
     * Removes false positives that match known non-PHI terms
     */
    static filterUsingDocumentVocabulary(spans) {
        // Using isWhitelisted from NameFilterConstants (imported at top)
        // Person titles that indicate the text is a person reference, not a medical term
        const PERSON_TITLES = [
            "Dr",
            "Mr",
            "Mrs",
            "Ms",
            "Miss",
            "Prof",
            "Rev",
            "Hon",
            "Capt",
            "Lt",
            "Sgt",
            "Col",
            "Gen",
        ];
        // Note: Use String.raw to preserve backslash escapes for regex
        const titlePattern = new RegExp(String.raw `^(?:${PERSON_TITLES.join("|")})\.?\s`, "i");
        // Name suffixes that indicate the text is a person name
        const NAME_SUFFIXES = ["Jr", "Sr", "II", "III", "IV", "V"];
        const suffixPattern = new RegExp(String.raw `\b(?:${NAME_SUFFIXES.join("|")})\.?$`, "i");
        return spans.filter((span) => {
            const text = span.text.trim();
            // Explicit name-field extractions are high-signal and should not be dropped
            // by aggressive whitelists (e.g. single-word whitelists like "Ann").
            if (span.filterType === Span_1.FilterType.NAME &&
                span.pattern === "Labeled name field" &&
                span.confidence >= 0.95) {
                return true;
            }
            // ═══════════════════════════════════════════════════════════════════════
            // HIGH-YIELD FIX #1 & #2: Check isNonPHI() and isInsuranceTerm() FIRST
            // These are POWERFUL methods that check multiple whitelists at once.
            // They should be called BEFORE any other filtering logic.
            // This catches: MEDICATION, DIAGNOSIS, PROCEDURE, INSURANCE_COMPANY, HOSPITAL
            // ═══════════════════════════════════════════════════════════════════════
            // INSURANCE CHECK - catches Aetna, Cigna, Blue Cross, etc.
            if (DocumentVocabulary_1.DocumentVocabulary.isInsuranceTerm(text)) {
                RadiologyLogger_1.RadiologyLogger.debug("PRESERVED", `Excluding insurance company: "${text}"`);
                return false;
            }
            // HOSPITAL CHECK - catches Beth Israel, Johns Hopkins, UT Southwestern, etc.
            if (DocumentVocabulary_1.DocumentVocabulary.isHospitalName(text)) {
                RadiologyLogger_1.RadiologyLogger.debug("PRESERVED", `Excluding hospital name: "${text}"`);
                return false;
            }
            // MASTER NON-PHI CHECK - catches medical terms, geographic terms, field labels, etc.
            if (DocumentVocabulary_1.DocumentVocabulary.isNonPHI(text)) {
                RadiologyLogger_1.RadiologyLogger.debug("PRESERVED", `Excluding non-PHI term: "${text}"`);
                return false;
            }
            // Check individual words against isNonPHI (for multi-word spans)
            const words = text.split(/[\s,]+/).filter((w) => w.length > 2);
            for (const word of words) {
                if (DocumentVocabulary_1.DocumentVocabulary.isInsuranceTerm(word)) {
                    RadiologyLogger_1.RadiologyLogger.debug("PRESERVED", `Excluding span with insurance term "${word}": "${text}"`);
                    return false;
                }
                if (DocumentVocabulary_1.DocumentVocabulary.isHospitalName(word)) {
                    RadiologyLogger_1.RadiologyLogger.debug("PRESERVED", `Excluding span with hospital term "${word}": "${text}"`);
                    return false;
                }
                if (DocumentVocabulary_1.DocumentVocabulary.isNonPHI(word)) {
                    RadiologyLogger_1.RadiologyLogger.debug("PRESERVED", `Excluding span with non-PHI word "${word}": "${text}"`);
                    return false;
                }
            }
            // ═══════════════════════════════════════════════════════════════════════
            // HIGH-YIELD FIX #3: Check ALL filter types, not just NAME
            // Medical terms can be detected as DIAGNOSIS, ADDRESS, etc.
            // Only skip PATTERN_MATCHED_TYPES (SSN, PHONE, EMAIL, etc.) which are precise
            // ═══════════════════════════════════════════════════════════════════════
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
            // Skip pattern-matched types - they're precise and shouldn't be filtered here
            if (PATTERN_MATCHED_TYPES.has(span.filterType)) {
                return true;
            }
            // NOTE: Priority 150+ bypass REMOVED - whitelist must ALWAYS be checked
            // Medical terms like "Hypothyroidism", "Lamotrigine", "Aetna" were bypassing
            // the whitelist because everything had priority 150
            // CRITICAL FIX: If text starts with a person title (Dr., Mr., etc.) or ends
            // with a name suffix (Jr., III, etc.), this is EXPLICITLY a person reference.
            // Do NOT filter based on medical term matching.
            // "Dr. Wilson" is a person even though "Wilson's disease" exists.
            // "Thomas Parkinson Jr." is a person even though "Parkinson's disease" exists.
            const hasPersonTitle = titlePattern.test(text);
            const hasNameSuffix = suffixPattern.test(text);
            if (hasPersonTitle || hasNameSuffix) {
                // Only filter for obvious non-person structure terms
                const structureTerms = [
                    "protected health",
                    "social security",
                    "medical record",
                    "health plan",
                    "emergency department",
                    "intensive care",
                ];
                const lower = text.toLowerCase();
                for (const term of structureTerms) {
                    if (lower.includes(term)) {
                        RadiologyLogger_1.RadiologyLogger.debug("ParallelRedactionEngine", `Excluding titled/suffixed NAME with structure term: "${text}"`);
                        return false;
                    }
                }
                // Keep this span - it's a titled/suffixed person name
                return true;
            }
            // WIN-WIN: Check centralized whitelist (catches ALL false positives in one place)
            if ((0, NameFilterConstants_1.isWhitelisted)(text)) {
                RadiologyLogger_1.RadiologyLogger.debug("ParallelRedactionEngine", `Excluding whitelisted NAME: "${text}"`);
                return false;
            }
            // Check full text first
            if (DocumentVocabulary_1.DocumentVocabulary.isMedicalTerm(text)) {
                RadiologyLogger_1.RadiologyLogger.debug("PRESERVED", `Excluding NAME matching medical term: "${text}"`);
                return false;
            }
            // Check if this is a hospital name (from HospitalDictionary)
            if (HospitalDictionary_1.HospitalDictionary.isHospital(text) ||
                HospitalDictionary_1.HospitalDictionary.isPartOfHospitalName(text, text)) {
                RadiologyLogger_1.RadiologyLogger.debug("PRESERVED", `Excluding NAME matching hospital: "${text}"`);
                return false;
            }
            for (const word of words) {
                // Check whitelist (case-insensitive medical terms, medications, etc.)
                if ((0, NameFilterConstants_1.isWhitelisted)(word)) {
                    return false;
                }
                // Check DocumentVocabulary for medical terms
                if (DocumentVocabulary_1.DocumentVocabulary.isMedicalTerm(word)) {
                    return false;
                }
            }
            // Check if this is a known non-PHI term
            if (DocumentVocabulary_1.DocumentVocabulary.isNonPHI(text)) {
                RadiologyLogger_1.RadiologyLogger.debug("ParallelRedactionEngine", `Excluding non-PHI NAME: "${text}"`);
                return false;
            }
            // Check if text contains non-PHI indicators (multi-word phrases)
            if (DocumentVocabulary_1.DocumentVocabulary.containsNonPHIIndicator(text)) {
                RadiologyLogger_1.RadiologyLogger.debug("ParallelRedactionEngine", `Excluding NAME with non-PHI indicator: "${text}"`);
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
}
exports.ParallelRedactionEngine = ParallelRedactionEngine;
//# sourceMappingURL=ParallelRedactionEngine.js.map