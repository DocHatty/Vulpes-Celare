"use strict";
/**
 * EnvironmentConfig - Centralized Environment Variable Configuration
 *
 * All environment variables used by Vulpes Celare are documented here.
 * This provides a single source of truth for configuration options.
 *
 * USAGE:
 *   import { EnvironmentConfig } from "./config/EnvironmentConfig";
 *
 *   if (EnvironmentConfig.isBloomFilterEnabled()) {
 *     // Use bloom filter
 *   }
 *
 * @module config
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBloomFilterEnabled = isBloomFilterEnabled;
exports.isSQLiteDictionaryEnabled = isSQLiteDictionaryEnabled;
exports.isDatalogReasonerEnabled = isDatalogReasonerEnabled;
exports.isDFAScanEnabled = isDFAScanEnabled;
exports.isZigDFAAccelEnabled = isZigDFAAccelEnabled;
exports.getZigDFAMode = getZigDFAMode;
exports.isGPUBatchEnabled = isGPUBatchEnabled;
exports.getGPUFallbackThreshold = getGPUFallbackThreshold;
exports.isSupervisionEnabled = isSupervisionEnabled;
exports.isCircuitBreakerEnabled = isCircuitBreakerEnabled;
exports.isFuzzyAccelEnabled = isFuzzyAccelEnabled;
exports.isPhoneticEnabled = isPhoneticEnabled;
exports.getPhoneticThreshold = getPhoneticThreshold;
exports.isStreamKernelEnabled = isStreamKernelEnabled;
exports.isStreamDetectionsEnabled = isStreamDetectionsEnabled;
exports.isShadowRustNameEnabled = isShadowRustNameEnabled;
exports.isShadowPostFilterEnabled = isShadowPostFilterEnabled;
exports.isShadowApplySpansEnabled = isShadowApplySpansEnabled;
exports.getConfigurationSummary = getConfigurationSummary;
exports.logConfiguration = logConfiguration;
// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: BLOOM FILTER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
/**
 * VULPES_USE_BLOOM
 *
 * Enable/disable bloom filter first-pass rejection.
 * Bloom filters reject ~95% of non-matching tokens in ~50ns.
 *
 * Default: "1" (enabled)
 * Set to "0" to disable
 */
function isBloomFilterEnabled() {
    return process.env.VULPES_USE_BLOOM !== "0";
}
// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: SQLITE DICTIONARY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
/**
 * VULPES_USE_SQLITE_DICT
 *
 * Enable/disable SQLite FTS5 dictionary backend.
 * SQLite provides 96% memory reduction vs in-memory dictionaries.
 *
 * Default: "1" (enabled)
 * Set to "0" to force in-memory dictionaries
 */
function isSQLiteDictionaryEnabled() {
    return process.env.VULPES_USE_SQLITE_DICT !== "0";
}
// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3: DATALOG REASONER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
/**
 * VULPES_USE_DATALOG
 *
 * Enable/disable Datalog constraint solver.
 * Provides declarative rules with full provenance tracking.
 *
 * Default: "0" (disabled - opt-in)
 * Set to "1" to enable Datalog reasoning
 */
function isDatalogReasonerEnabled() {
    return process.env.VULPES_USE_DATALOG === "1";
}
// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4: DFA SCANNER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
/**
 * VULPES_DFA_SCAN
 *
 * Enable/disable DFA multi-pattern scanning.
 * DFA provides O(n) single-pass scanning regardless of pattern count.
 *
 * Default: "0" (disabled - opt-in)
 * Set to "1" to enable DFA scanning
 */
function isDFAScanEnabled() {
    return process.env.VULPES_DFA_SCAN === "1";
}
/**
 * VULPES_ZIG_DFA_ACCEL
 *
 * Enable/disable Zig DFA acceleration (when available).
 *
 * Default: "1" (enabled when available)
 * Set to "0" to disable Zig acceleration
 */
function isZigDFAAccelEnabled() {
    return process.env.VULPES_ZIG_DFA_ACCEL !== "0";
}
/**
 * VULPES_ZIG_DFA_MODE
 *
 * Zig DFA operation mode.
 * - "shadow": Run alongside TypeScript, compare results (default)
 * - "primary": Use Zig DFA as primary scanner
 * - "disabled": Do not use Zig DFA
 */
function getZigDFAMode() {
    const mode = process.env.VULPES_ZIG_DFA_MODE;
    if (mode === "primary")
        return "primary";
    if (mode === "disabled")
        return "disabled";
    return "shadow";
}
// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5: GPU BATCH PROCESSING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
/**
 * VULPES_GPU_BATCH
 *
 * Enable/disable WebGPU batch processing.
 *
 * Default: "1" (enabled when WebGPU available)
 * Set to "0" to disable GPU batch processing
 */
function isGPUBatchEnabled() {
    return process.env.VULPES_GPU_BATCH !== "0";
}
/**
 * VULPES_GPU_FALLBACK_THRESHOLD
 *
 * Minimum document count before using batch processing.
 * Below this threshold, sequential processing is used.
 *
 * Default: 10
 */
function getGPUFallbackThreshold() {
    const raw = process.env.VULPES_GPU_FALLBACK_THRESHOLD;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : 10;
}
// ═══════════════════════════════════════════════════════════════════════════
// PHASE 6: SUPERVISION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
/**
 * VULPES_SUPERVISION
 *
 * Enable/disable Elixir-style supervision.
 *
 * Default: "1" (enabled)
 * Set to "0" to disable supervision
 */
function isSupervisionEnabled() {
    return process.env.VULPES_SUPERVISION !== "0";
}
/**
 * VULPES_CIRCUIT_BREAKER
 *
 * Enable/disable circuit breaker pattern.
 *
 * Default: "1" (enabled)
 * Set to "0" to disable circuit breaker
 */
function isCircuitBreakerEnabled() {
    return process.env.VULPES_CIRCUIT_BREAKER !== "0";
}
// ═══════════════════════════════════════════════════════════════════════════
// RUST ACCELERATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
/**
 * VULPES_FUZZY_ACCEL
 *
 * Enable/disable Rust-accelerated fuzzy matching.
 *
 * Default: "1" (enabled when available)
 * Set to "0" to disable Rust fuzzy matching
 */
function isFuzzyAccelEnabled() {
    return process.env.VULPES_FUZZY_ACCEL !== "0";
}
/**
 * VULPES_ENABLE_PHONETIC
 *
 * Enable/disable phonetic name matching.
 *
 * Default: "1" (enabled)
 * Set to "0" to disable phonetic matching
 */
function isPhoneticEnabled() {
    return process.env.VULPES_ENABLE_PHONETIC !== "0";
}
/**
 * VULPES_PHONETIC_THRESHOLD
 *
 * Minimum confidence threshold for phonetic matches.
 *
 * Default: 0.95
 */
function getPhoneticThreshold() {
    const raw = process.env.VULPES_PHONETIC_THRESHOLD;
    const parsed = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.95;
}
// ═══════════════════════════════════════════════════════════════════════════
// STREAMING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
/**
 * VULPES_STREAM_KERNEL
 *
 * Enable/disable Rust streaming kernel.
 *
 * Default: "1" (enabled when available)
 * Set to "0" to use pure TypeScript streaming
 */
function isStreamKernelEnabled() {
    return process.env.VULPES_STREAM_KERNEL !== "0";
}
/**
 * VULPES_STREAM_DETECTIONS
 *
 * Emit native streaming detections for profiling.
 *
 * Default: "0" (disabled)
 * Set to "1" to enable detection emission
 */
function isStreamDetectionsEnabled() {
    return process.env.VULPES_STREAM_DETECTIONS === "1";
}
// ═══════════════════════════════════════════════════════════════════════════
// SHADOW MODE / DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════
/**
 * VULPES_SHADOW_RUST_NAME
 *
 * Enable shadow comparison of Rust name scanner vs TypeScript.
 *
 * Default: "0" (disabled)
 * Set to "1" to enable shadow mode
 */
function isShadowRustNameEnabled() {
    return process.env.VULPES_SHADOW_RUST_NAME === "1";
}
/**
 * VULPES_SHADOW_POSTFILTER
 *
 * Enable shadow comparison of post-filter implementations.
 *
 * Default: "0" (disabled)
 * Set to "1" to enable shadow mode
 */
function isShadowPostFilterEnabled() {
    return process.env.VULPES_SHADOW_POSTFILTER === "1";
}
/**
 * VULPES_SHADOW_APPLY_SPANS
 *
 * Enable shadow comparison of span application.
 *
 * Default: "0" (disabled)
 * Set to "1" to enable shadow mode
 */
function isShadowApplySpansEnabled() {
    return process.env.VULPES_SHADOW_APPLY_SPANS === "1";
}
/**
 * Get a summary of all configuration settings
 */
function getConfigurationSummary() {
    return {
        phase1: {
            bloomFilter: isBloomFilterEnabled(),
        },
        phase2: {
            sqliteDictionary: isSQLiteDictionaryEnabled(),
        },
        phase3: {
            datalogReasoner: isDatalogReasonerEnabled(),
        },
        phase4: {
            dfaScan: isDFAScanEnabled(),
            zigDFAAccel: isZigDFAAccelEnabled(),
            zigDFAMode: getZigDFAMode(),
        },
        phase5: {
            gpuBatch: isGPUBatchEnabled(),
            gpuFallbackThreshold: getGPUFallbackThreshold(),
        },
        phase6: {
            supervision: isSupervisionEnabled(),
            circuitBreaker: isCircuitBreakerEnabled(),
        },
        rust: {
            fuzzyAccel: isFuzzyAccelEnabled(),
            phonetic: isPhoneticEnabled(),
            phoneticThreshold: getPhoneticThreshold(),
            streamKernel: isStreamKernelEnabled(),
        },
    };
}
/**
 * Log current configuration to console
 */
function logConfiguration() {
    const config = getConfigurationSummary();
    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           VULPES CELARE CONFIGURATION SUMMARY                ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║ Phase 1 - Bloom Filter:        ${config.phase1.bloomFilter ? "ENABLED " : "DISABLED"}                     ║`);
    console.log(`║ Phase 2 - SQLite Dictionary:   ${config.phase2.sqliteDictionary ? "ENABLED " : "DISABLED"}                     ║`);
    console.log(`║ Phase 3 - Datalog Reasoner:    ${config.phase3.datalogReasoner ? "ENABLED " : "DISABLED"}                     ║`);
    console.log(`║ Phase 4 - DFA Scan:            ${config.phase4.dfaScan ? "ENABLED " : "DISABLED"}                     ║`);
    console.log(`║ Phase 5 - GPU Batch:           ${config.phase5.gpuBatch ? "ENABLED " : "DISABLED"}                     ║`);
    console.log(`║ Phase 6 - Supervision:         ${config.phase6.supervision ? "ENABLED " : "DISABLED"}                     ║`);
    console.log("╚══════════════════════════════════════════════════════════════╝");
}
//# sourceMappingURL=EnvironmentConfig.js.map