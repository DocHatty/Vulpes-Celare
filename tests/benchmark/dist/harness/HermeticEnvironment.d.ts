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
/**
 * Environment snapshot for restoration
 */
export interface EnvironmentSnapshot {
    /** Timestamp when snapshot was taken */
    timestamp: Date;
    /** Environment variables */
    env: Record<string, string | undefined>;
    /** Module cache keys that were cleared */
    clearedModules: string[];
    /** Snapshot hash for verification */
    hash: string;
}
/**
 * Hermetic environment manager for isolated benchmark runs
 */
export declare class HermeticEnvironment {
    private snapshot;
    private isIsolated;
    private projectRoot;
    constructor(projectRoot?: string);
    /**
     * Take a snapshot of the current environment
     */
    takeSnapshot(): EnvironmentSnapshot;
    /**
     * Enter isolated mode with specific environment configuration
     *
     * @param envOverrides - Environment variables to set
     * @returns Snapshot of the original environment
     */
    enterIsolation(envOverrides: Record<string, string>): Promise<EnvironmentSnapshot>;
    /**
     * Exit isolation and restore original environment
     */
    exitIsolation(): Promise<void>;
    /**
     * Run a function in isolated environment
     *
     * @param envOverrides - Environment variables for this run
     * @param fn - Function to execute
     * @returns Result of the function
     */
    runIsolated<T>(envOverrides: Record<string, string>, fn: () => Promise<T>): Promise<T>;
    /**
     * Clear module caches for cacheable modules
     * This forces them to re-read environment variables
     */
    private clearModuleCaches;
    /**
     * Verify environment matches a snapshot
     */
    verifyEnvironment(expected: EnvironmentSnapshot): boolean;
    /**
     * Get environment configuration for a specific detection mode
     *
     * This sets ALL relevant environment variables to ensure consistent,
     * hermetic benchmark runs. All acceleration features are enabled by default
     * for maximum performance testing.
     */
    static getEnvironmentForMode(mode: 'rules' | 'hybrid' | 'gliner'): Record<string, string>;
    /**
     * Check if currently in isolation mode
     */
    isInIsolation(): boolean;
    /**
     * Get the current snapshot (if in isolation)
     */
    getCurrentSnapshot(): EnvironmentSnapshot | null;
    /**
     * Serialize environment for logging/debugging
     */
    serializeEnvironment(): string;
}
/**
 * Get the default hermetic environment instance
 */
export declare function getHermeticEnvironment(): HermeticEnvironment;
/**
 * Convenience function to run in isolation
 */
export declare function runInIsolation<T>(mode: 'rules' | 'hybrid' | 'gliner', fn: () => Promise<T>): Promise<T>;
