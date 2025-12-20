/**
 * Vulpes Celare - Plugin Sandbox
 *
 * Provides timeout protection and error isolation for plugin execution.
 *
 * Gold Standard patterns from:
 * - VSCode Extension Host (process isolation)
 * - Wasmtime (capability-based security)
 * - Extism (timeout and resource limits)
 *
 * Current implementation: Promise.race timeout (single-threaded)
 * Future: Worker Thread isolation for true process separation
 *
 * @module plugins/PluginSandbox
 */
import type { PluginMetrics } from "./types";
/**
 * Error thrown when a plugin exceeds its timeout.
 */
export declare class PluginTimeoutError extends Error {
    readonly pluginName: string;
    readonly timeoutMs: number;
    readonly hookName: string;
    constructor(pluginName: string, hookName: string, timeoutMs: number);
}
/**
 * Error thrown when a plugin execution fails.
 */
export declare class PluginExecutionError extends Error {
    readonly pluginName: string;
    readonly hookName: string;
    readonly originalError: Error;
    constructor(pluginName: string, hookName: string, originalError: Error);
}
/**
 * Configuration for sandbox execution.
 */
export interface SandboxConfig {
    /** Default timeout for hooks (ms) */
    defaultTimeoutMs: number;
    /** Maximum consecutive failures before auto-disable */
    maxConsecutiveFailures: number;
    /** Whether to log hook execution */
    logExecution: boolean;
    /** Whether to continue on plugin error (graceful degradation) */
    continueOnError: boolean;
}
/**
 * Sandbox for safe plugin execution with timeout and error isolation.
 *
 * Features:
 * - Timeout protection using Promise.race
 * - Error isolation (plugin errors don't crash pipeline)
 * - Per-plugin metrics tracking
 * - Automatic disable after repeated failures
 * - Execution timing for observability
 *
 * @example
 * ```typescript
 * const sandbox = new PluginSandbox();
 *
 * const result = await sandbox.execute(
 *   'my-plugin',
 *   'postDetection',
 *   async () => plugin.hooks.postDetection(spans, doc),
 *   { timeoutMs: 3000 }
 * );
 *
 * if (result.success) {
 *   spans = result.value;
 * }
 * ```
 */
export declare class PluginSandbox {
    private config;
    private metrics;
    private consecutiveFailures;
    private disabledPlugins;
    constructor(config?: Partial<SandboxConfig>);
    /**
     * Execute a plugin hook with timeout and error protection.
     *
     * @param pluginName - Name of the plugin
     * @param hookName - Name of the hook being executed
     * @param fn - The async function to execute
     * @param options - Execution options
     * @returns Execution result with success status and value/error
     */
    execute<T>(pluginName: string, hookName: string, fn: () => Promise<T> | T, options?: {
        timeoutMs?: number;
    }): Promise<SandboxResult<T>>;
    /**
     * Execute with timeout using Promise.race.
     */
    private executeWithTimeout;
    /**
     * Record successful execution.
     */
    private recordSuccess;
    /**
     * Record failed execution.
     */
    private recordFailure;
    /**
     * Check if plugin should be auto-disabled.
     */
    private checkAutoDisable;
    /**
     * Get or create metrics for a plugin.
     */
    private getOrCreateMetrics;
    /**
     * Record a short-circuit for metrics.
     */
    recordShortCircuit(pluginName: string): void;
    /**
     * Get metrics for a specific plugin.
     */
    getMetrics(pluginName: string): PluginMetrics | undefined;
    /**
     * Get metrics for all plugins.
     */
    getAllMetrics(): Record<string, PluginMetrics>;
    /**
     * Check if a plugin is disabled.
     */
    isDisabled(pluginName: string): boolean;
    /**
     * Re-enable a disabled plugin.
     */
    enablePlugin(pluginName: string): void;
    /**
     * Reset all metrics and state.
     */
    reset(): void;
}
/**
 * Result of a sandboxed execution.
 */
export interface SandboxResult<T> {
    /** Whether execution succeeded */
    success: boolean;
    /** The return value (if success) */
    value?: T;
    /** The error (if failure) */
    error?: Error;
    /** Execution time in milliseconds */
    executionTimeMs: number;
    /** Whether execution timed out */
    timedOut: boolean;
    /** Whether plugin was auto-disabled */
    pluginDisabled: boolean;
}
/**
 * Get the global sandbox instance.
 */
export declare function getPluginSandbox(config?: Partial<SandboxConfig>): PluginSandbox;
/**
 * Reset the global sandbox (for testing).
 */
export declare function resetPluginSandbox(): void;
//# sourceMappingURL=PluginSandbox.d.ts.map