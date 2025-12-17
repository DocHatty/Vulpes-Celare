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
/**
 * VULPES_USE_BLOOM
 *
 * Enable/disable bloom filter first-pass rejection.
 * Bloom filters reject ~95% of non-matching tokens in ~50ns.
 *
 * Default: "1" (enabled)
 * Set to "0" to disable
 */
export declare function isBloomFilterEnabled(): boolean;
/**
 * VULPES_USE_SQLITE_DICT
 *
 * Enable/disable SQLite FTS5 dictionary backend.
 * SQLite provides 96% memory reduction vs in-memory dictionaries.
 *
 * Default: "1" (enabled)
 * Set to "0" to force in-memory dictionaries
 */
export declare function isSQLiteDictionaryEnabled(): boolean;
/**
 * VULPES_USE_DATALOG
 *
 * Enable/disable Datalog constraint solver.
 * Provides declarative rules with full provenance tracking.
 *
 * Default: "0" (disabled - opt-in)
 * Set to "1" to enable Datalog reasoning
 */
export declare function isDatalogReasonerEnabled(): boolean;
/**
 * VULPES_DFA_SCAN
 *
 * Enable/disable DFA multi-pattern scanning.
 * DFA provides O(n) single-pass scanning regardless of pattern count.
 *
 * Default: "0" (disabled - opt-in)
 * Set to "1" to enable DFA scanning
 */
export declare function isDFAScanEnabled(): boolean;
/**
 * VULPES_ZIG_DFA_ACCEL
 *
 * Enable/disable Zig DFA acceleration (when available).
 *
 * Default: "1" (enabled when available)
 * Set to "0" to disable Zig acceleration
 */
export declare function isZigDFAAccelEnabled(): boolean;
/**
 * VULPES_ZIG_DFA_MODE
 *
 * Zig DFA operation mode.
 * - "shadow": Run alongside TypeScript, compare results (default)
 * - "primary": Use Zig DFA as primary scanner
 * - "disabled": Do not use Zig DFA
 */
export declare function getZigDFAMode(): "shadow" | "primary" | "disabled";
/**
 * VULPES_GPU_BATCH
 *
 * Enable/disable WebGPU batch processing.
 *
 * Default: "1" (enabled when WebGPU available)
 * Set to "0" to disable GPU batch processing
 */
export declare function isGPUBatchEnabled(): boolean;
/**
 * VULPES_GPU_FALLBACK_THRESHOLD
 *
 * Minimum document count before using batch processing.
 * Below this threshold, sequential processing is used.
 *
 * Default: 10
 */
export declare function getGPUFallbackThreshold(): number;
/**
 * VULPES_SUPERVISION
 *
 * Enable/disable Elixir-style supervision.
 *
 * Default: "1" (enabled)
 * Set to "0" to disable supervision
 */
export declare function isSupervisionEnabled(): boolean;
/**
 * VULPES_CIRCUIT_BREAKER
 *
 * Enable/disable circuit breaker pattern.
 *
 * Default: "1" (enabled)
 * Set to "0" to disable circuit breaker
 */
export declare function isCircuitBreakerEnabled(): boolean;
/**
 * VULPES_FUZZY_ACCEL
 *
 * Enable/disable Rust-accelerated fuzzy matching.
 *
 * Default: "1" (enabled when available)
 * Set to "0" to disable Rust fuzzy matching
 */
export declare function isFuzzyAccelEnabled(): boolean;
/**
 * VULPES_ENABLE_PHONETIC
 *
 * Enable/disable phonetic name matching.
 *
 * Default: "1" (enabled)
 * Set to "0" to disable phonetic matching
 */
export declare function isPhoneticEnabled(): boolean;
/**
 * VULPES_PHONETIC_THRESHOLD
 *
 * Minimum confidence threshold for phonetic matches.
 *
 * Default: 0.95
 */
export declare function getPhoneticThreshold(): number;
/**
 * VULPES_STREAM_KERNEL
 *
 * Enable/disable Rust streaming kernel.
 *
 * Default: "1" (enabled when available)
 * Set to "0" to use pure TypeScript streaming
 */
export declare function isStreamKernelEnabled(): boolean;
/**
 * VULPES_STREAM_DETECTIONS
 *
 * Emit native streaming detections for profiling.
 *
 * Default: "0" (disabled)
 * Set to "1" to enable detection emission
 */
export declare function isStreamDetectionsEnabled(): boolean;
/**
 * VULPES_SHADOW_RUST_NAME
 *
 * Enable shadow comparison of Rust name scanner vs TypeScript.
 *
 * Default: "0" (disabled)
 * Set to "1" to enable shadow mode
 */
export declare function isShadowRustNameEnabled(): boolean;
/**
 * VULPES_SHADOW_POSTFILTER
 *
 * Enable shadow comparison of post-filter implementations.
 *
 * Default: "0" (disabled)
 * Set to "1" to enable shadow mode
 */
export declare function isShadowPostFilterEnabled(): boolean;
/**
 * VULPES_SHADOW_APPLY_SPANS
 *
 * Enable shadow comparison of span application.
 *
 * Default: "0" (disabled)
 * Set to "1" to enable shadow mode
 */
export declare function isShadowApplySpansEnabled(): boolean;
export interface ConfigurationSummary {
    phase1: {
        bloomFilter: boolean;
    };
    phase2: {
        sqliteDictionary: boolean;
    };
    phase3: {
        datalogReasoner: boolean;
    };
    phase4: {
        dfaScan: boolean;
        zigDFAAccel: boolean;
        zigDFAMode: "shadow" | "primary" | "disabled";
    };
    phase5: {
        gpuBatch: boolean;
        gpuFallbackThreshold: number;
    };
    phase6: {
        supervision: boolean;
        circuitBreaker: boolean;
    };
    rust: {
        fuzzyAccel: boolean;
        phonetic: boolean;
        phoneticThreshold: number;
        streamKernel: boolean;
    };
}
/**
 * Get a summary of all configuration settings
 */
export declare function getConfigurationSummary(): ConfigurationSummary;
/**
 * Log current configuration to console
 */
export declare function logConfiguration(): void;
//# sourceMappingURL=EnvironmentConfig.d.ts.map