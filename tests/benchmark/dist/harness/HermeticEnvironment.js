"use strict";
/**
 * ============================================================================
 * HERMETIC ENVIRONMENT
 * ============================================================================
 *
 * Google-style test isolation for benchmark runs.
 * Ensures each backend evaluation runs in a clean, reproducible environment
 * with no state leakage between runs.
 *
 * Key features:
 * - Environment variable snapshot/restore
 * - Module cache clearing for config modules
 * - State isolation between backend evaluations
 * - Reproducibility via environment serialization
 *
 * References:
 * - Google Testing Blog on Hermetic Testing
 * - Vulpes Celare FeatureToggles pattern
 *
 * @module benchmark/harness/HermeticEnvironment
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HermeticEnvironment = void 0;
exports.getHermeticEnvironment = getHermeticEnvironment;
exports.runInIsolation = runInIsolation;
/**
 * Modules that need cache clearing between backend runs
 * These cache environment values on first access
 */
const CACHEABLE_MODULES = [
    // Config modules that read env vars once
    'dist/config/FeatureToggles.js',
    'dist/config/EnvironmentConfig.js',
    // Filter registry caches filter instances
    'dist/filters/FilterRegistry.js',
    // Native binding caches Rust module
    'dist/native/binding.js',
];
/**
 * Environment variables that affect detection behavior
 *
 * IMPORTANT: This list must be kept in sync with EnvironmentConfig.ts and FeatureToggles.ts
 * Any new environment variable added to those files must be added here.
 */
const DETECTION_ENV_VARS = [
    // ===== DETECTION MODE =====
    'VULPES_NAME_DETECTION_MODE',
    'VULPES_USE_GLINER',
    // ===== ML FEATURES =====
    'VULPES_USE_ML_CONFIDENCE',
    'VULPES_USE_ML_FP_FILTER',
    'VULPES_ML_DEVICE',
    'VULPES_ML_GPU_DEVICE_ID',
    'VULPES_GLINER_MODEL_PATH',
    'VULPES_TINYBERT_MODEL_PATH',
    'VULPES_FP_MODEL_PATH',
    'VULPES_FP_CLASSIFIER_PATH',
    'VULPES_MODELS_DIR',
    // ===== PHASE 1: BLOOM FILTER =====
    'VULPES_USE_BLOOM',
    // ===== PHASE 2: SQLITE DICTIONARY =====
    'VULPES_USE_SQLITE_DICT',
    // ===== PHASE 3: DATALOG REASONER =====
    'VULPES_USE_DATALOG',
    // ===== PHASE 4: DFA SCANNER =====
    'VULPES_DFA_SCAN',
    'VULPES_ZIG_DFA_ACCEL',
    'VULPES_ZIG_DFA_MODE',
    // ===== PHASE 5: GPU BATCH PROCESSING =====
    'VULPES_GPU_BATCH',
    'VULPES_GPU_FALLBACK_THRESHOLD',
    'VULPES_GPU_PROVIDER',
    // ===== PHASE 6: SUPERVISION =====
    'VULPES_SUPERVISION',
    'VULPES_CIRCUIT_BREAKER',
    // ===== RUST ACCELERATION =====
    'VULPES_RUST_ACCEL',
    'VULPES_FUZZY_ACCEL',
    'VULPES_ENABLE_PHONETIC',
    'VULPES_PHONETIC_THRESHOLD',
    'VULPES_SCORER_ACCEL',
    'VULPES_SPAN_ACCEL',
    'VULPES_POSTFILTER_ACCEL',
    // ===== STREAMING =====
    'VULPES_STREAM_KERNEL',
    'VULPES_STREAM_DETECTIONS',
    // ===== CONTEXT/PIPELINE =====
    'VULPES_CONTEXT_MODIFIER',
    'VULPES_CONTEXT_FILTERS',
    // ===== DEBUG/SHADOW MODE =====
    'VULPES_SHADOW_RUST_NAME',
    'VULPES_SHADOW_RUST_NAME_FULL',
    'VULPES_SHADOW_RUST_NAME_SMART',
    'VULPES_SHADOW_POSTFILTER',
    'VULPES_SHADOW_APPLY_SPANS',
    // ===== OPTIMIZATIONS =====
    'VULPES_USE_OPTIMIZED_WEIGHTS',
    // ===== CORTEX (Python ML) =====
    'VULPES_USE_CORTEX',
];
/**
 * Compute simple hash for verification
 */
function computeHash(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}
/**
 * Hermetic environment manager for isolated benchmark runs
 */
class HermeticEnvironment {
    snapshot = null;
    isIsolated = false;
    projectRoot;
    constructor(projectRoot) {
        // Default to finding project root from current location
        this.projectRoot = projectRoot || process.cwd();
    }
    /**
     * Take a snapshot of the current environment
     */
    takeSnapshot() {
        const env = {};
        // Capture all detection-related env vars
        for (const key of DETECTION_ENV_VARS) {
            env[key] = process.env[key];
        }
        const snapshot = {
            timestamp: new Date(),
            env,
            clearedModules: [],
            hash: computeHash(env),
        };
        return snapshot;
    }
    /**
     * Enter isolated mode with specific environment configuration
     *
     * @param envOverrides - Environment variables to set
     * @returns Snapshot of the original environment
     */
    async enterIsolation(envOverrides) {
        if (this.isIsolated) {
            throw new Error('Already in isolation mode. Call exitIsolation() first.');
        }
        // Take snapshot of current state
        this.snapshot = this.takeSnapshot();
        // Clear relevant module caches
        const clearedModules = this.clearModuleCaches();
        this.snapshot.clearedModules = clearedModules;
        // Apply environment overrides
        for (const [key, value] of Object.entries(envOverrides)) {
            process.env[key] = value;
        }
        this.isIsolated = true;
        return this.snapshot;
    }
    /**
     * Exit isolation and restore original environment
     */
    async exitIsolation() {
        if (!this.isIsolated || !this.snapshot) {
            throw new Error('Not in isolation mode. Call enterIsolation() first.');
        }
        // Restore original environment
        for (const [key, value] of Object.entries(this.snapshot.env)) {
            if (value === undefined) {
                delete process.env[key];
            }
            else {
                process.env[key] = value;
            }
        }
        // Clear module caches again to pick up restored values
        this.clearModuleCaches();
        this.isIsolated = false;
        this.snapshot = null;
    }
    /**
     * Run a function in isolated environment
     *
     * @param envOverrides - Environment variables for this run
     * @param fn - Function to execute
     * @returns Result of the function
     */
    async runIsolated(envOverrides, fn) {
        await this.enterIsolation(envOverrides);
        try {
            return await fn();
        }
        finally {
            await this.exitIsolation();
        }
    }
    /**
     * Clear module caches for cacheable modules
     * This forces them to re-read environment variables
     */
    clearModuleCaches() {
        const cleared = [];
        for (const modulePath of CACHEABLE_MODULES) {
            // Try multiple resolution paths
            const possiblePaths = [
                require.resolve(`${this.projectRoot}/${modulePath}`).replace(/\\/g, '/'),
                require.resolve(`../../${modulePath}`).replace(/\\/g, '/'),
            ];
            for (const resolvedPath of possiblePaths) {
                try {
                    const normalizedPath = resolvedPath.replace(/\\/g, '/');
                    // Find and delete matching cache entries
                    for (const key of Object.keys(require.cache)) {
                        const normalizedKey = key.replace(/\\/g, '/');
                        if (normalizedKey.includes(modulePath.replace('dist/', ''))) {
                            delete require.cache[key];
                            cleared.push(key);
                        }
                    }
                }
                catch {
                    // Module not loaded, skip
                }
            }
        }
        return cleared;
    }
    /**
     * Verify environment matches a snapshot
     */
    verifyEnvironment(expected) {
        const current = this.takeSnapshot();
        return current.hash === expected.hash;
    }
    /**
     * Get environment configuration for a specific detection mode
     *
     * This sets ALL relevant environment variables to ensure consistent,
     * hermetic benchmark runs. All acceleration features are enabled by default
     * for maximum performance testing.
     */
    static getEnvironmentForMode(mode) {
        // Base configuration with all optimizations enabled
        const base = {
            // Phase 1: Bloom filter (enabled)
            VULPES_USE_BLOOM: '1',
            // Phase 2: SQLite dictionary (enabled)
            VULPES_USE_SQLITE_DICT: '1',
            // Phase 3: Datalog reasoner (enabled)
            VULPES_USE_DATALOG: '1',
            // Phase 4: DFA scanning (enabled for benchmarks)
            VULPES_DFA_SCAN: '1',
            VULPES_ZIG_DFA_ACCEL: '1',
            // Phase 5: GPU batch (auto-detect)
            VULPES_GPU_BATCH: '1',
            // Phase 6: Supervision (enabled)
            VULPES_SUPERVISION: '1',
            VULPES_CIRCUIT_BREAKER: '1',
            // Rust acceleration (all enabled)
            VULPES_RUST_ACCEL: '1',
            VULPES_FUZZY_ACCEL: '1',
            VULPES_ENABLE_PHONETIC: '1',
            VULPES_SCORER_ACCEL: '1',
            VULPES_SPAN_ACCEL: '1',
            // Context/Pipeline (enabled)
            VULPES_CONTEXT_MODIFIER: '1',
            VULPES_CONTEXT_FILTERS: '0', // Off by default (may increase FPs)
            // Optimizations
            VULPES_USE_OPTIMIZED_WEIGHTS: '0', // Use default weights for consistency
            // Debug/Shadow modes (disabled for benchmarks)
            VULPES_SHADOW_RUST_NAME: '0',
            VULPES_SHADOW_POSTFILTER: '0',
        };
        switch (mode) {
            case 'rules':
                return {
                    ...base,
                    VULPES_NAME_DETECTION_MODE: 'rules',
                    VULPES_USE_GLINER: '0',
                    VULPES_USE_ML_CONFIDENCE: '0',
                    VULPES_USE_ML_FP_FILTER: '0',
                    VULPES_USE_CORTEX: '0',
                };
            case 'hybrid':
                return {
                    ...base,
                    VULPES_NAME_DETECTION_MODE: 'hybrid',
                    VULPES_USE_GLINER: '1',
                    VULPES_USE_ML_CONFIDENCE: '0', // Optional, leave off by default
                    VULPES_USE_ML_FP_FILTER: '0',
                    VULPES_USE_CORTEX: '0',
                };
            case 'gliner':
                return {
                    ...base,
                    VULPES_NAME_DETECTION_MODE: 'gliner',
                    VULPES_USE_GLINER: '1',
                    VULPES_USE_ML_CONFIDENCE: '0',
                    VULPES_USE_ML_FP_FILTER: '0',
                    VULPES_USE_CORTEX: '0',
                };
            default:
                throw new Error(`Unknown detection mode: ${mode}`);
        }
    }
    /**
     * Check if currently in isolation mode
     */
    isInIsolation() {
        return this.isIsolated;
    }
    /**
     * Get the current snapshot (if in isolation)
     */
    getCurrentSnapshot() {
        return this.snapshot;
    }
    /**
     * Serialize environment for logging/debugging
     */
    serializeEnvironment() {
        const snapshot = this.takeSnapshot();
        return JSON.stringify(snapshot, null, 2);
    }
}
exports.HermeticEnvironment = HermeticEnvironment;
/**
 * Singleton instance for convenience
 */
let defaultEnvironment = null;
/**
 * Get the default hermetic environment instance
 */
function getHermeticEnvironment() {
    if (!defaultEnvironment) {
        defaultEnvironment = new HermeticEnvironment();
    }
    return defaultEnvironment;
}
/**
 * Convenience function to run in isolation
 */
async function runInIsolation(mode, fn) {
    const env = getHermeticEnvironment();
    const config = HermeticEnvironment.getEnvironmentForMode(mode);
    return env.runIsolated(config, fn);
}
//# sourceMappingURL=HermeticEnvironment.js.map