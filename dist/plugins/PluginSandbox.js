"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginSandbox = exports.PluginExecutionError = exports.PluginTimeoutError = void 0;
exports.getPluginSandbox = getPluginSandbox;
exports.resetPluginSandbox = resetPluginSandbox;
const VulpesLogger_1 = require("../utils/VulpesLogger");
// ============================================================================
// ERROR TYPES
// ============================================================================
/**
 * Error thrown when a plugin exceeds its timeout.
 */
class PluginTimeoutError extends Error {
    pluginName;
    timeoutMs;
    hookName;
    constructor(pluginName, hookName, timeoutMs) {
        super(`Plugin '${pluginName}' hook '${hookName}' timed out after ${timeoutMs}ms`);
        this.name = "PluginTimeoutError";
        this.pluginName = pluginName;
        this.hookName = hookName;
        this.timeoutMs = timeoutMs;
    }
}
exports.PluginTimeoutError = PluginTimeoutError;
/**
 * Error thrown when a plugin execution fails.
 */
class PluginExecutionError extends Error {
    pluginName;
    hookName;
    originalError;
    constructor(pluginName, hookName, originalError) {
        super(`Plugin '${pluginName}' hook '${hookName}' failed: ${originalError.message}`);
        this.name = "PluginExecutionError";
        this.pluginName = pluginName;
        this.hookName = hookName;
        this.originalError = originalError;
    }
}
exports.PluginExecutionError = PluginExecutionError;
const DEFAULT_CONFIG = {
    defaultTimeoutMs: 5000,
    maxConsecutiveFailures: 3,
    logExecution: true,
    continueOnError: true,
};
// ============================================================================
// PLUGIN SANDBOX
// ============================================================================
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
class PluginSandbox {
    config;
    metrics = new Map();
    consecutiveFailures = new Map();
    disabledPlugins = new Set();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Execute a plugin hook with timeout and error protection.
     *
     * @param pluginName - Name of the plugin
     * @param hookName - Name of the hook being executed
     * @param fn - The async function to execute
     * @param options - Execution options
     * @returns Execution result with success status and value/error
     */
    async execute(pluginName, hookName, fn, options = {}) {
        const timeoutMs = options.timeoutMs ?? this.config.defaultTimeoutMs;
        const startTime = performance.now();
        // Check if plugin is disabled
        if (this.disabledPlugins.has(pluginName)) {
            return {
                success: false,
                error: new Error(`Plugin '${pluginName}' is disabled due to repeated failures`),
                executionTimeMs: 0,
                timedOut: false,
                pluginDisabled: true,
            };
        }
        try {
            // Execute with timeout
            const value = await this.executeWithTimeout(pluginName, hookName, fn, timeoutMs);
            const executionTimeMs = performance.now() - startTime;
            // Update metrics on success
            this.recordSuccess(pluginName, executionTimeMs);
            if (this.config.logExecution) {
                VulpesLogger_1.vulpesLogger.debug(`Plugin hook executed`, {
                    component: "PluginSandbox",
                    plugin: pluginName,
                    hook: hookName,
                    executionTimeMs: executionTimeMs.toFixed(2),
                });
            }
            return {
                success: true,
                value,
                executionTimeMs,
                timedOut: false,
                pluginDisabled: false,
            };
        }
        catch (error) {
            const executionTimeMs = performance.now() - startTime;
            const isTimeout = error instanceof PluginTimeoutError;
            // Record failure
            this.recordFailure(pluginName, error, isTimeout);
            // Check if plugin should be disabled
            const shouldDisable = this.checkAutoDisable(pluginName);
            VulpesLogger_1.vulpesLogger.warn(`Plugin hook failed`, {
                component: "PluginSandbox",
                plugin: pluginName,
                hook: hookName,
                error: error.message,
                timedOut: isTimeout,
                executionTimeMs: executionTimeMs.toFixed(2),
                autoDisabled: shouldDisable,
            });
            return {
                success: false,
                error: error,
                executionTimeMs,
                timedOut: isTimeout,
                pluginDisabled: shouldDisable,
            };
        }
    }
    /**
     * Execute with timeout using Promise.race.
     */
    async executeWithTimeout(pluginName, hookName, fn, timeoutMs) {
        return Promise.race([
            Promise.resolve(fn()),
            new Promise((_, reject) => {
                const timer = setTimeout(() => {
                    reject(new PluginTimeoutError(pluginName, hookName, timeoutMs));
                }, timeoutMs);
                // Ensure timer doesn't prevent process exit
                if (timer.unref) {
                    timer.unref();
                }
            }),
        ]);
    }
    /**
     * Record successful execution.
     */
    recordSuccess(pluginName, executionTimeMs) {
        // Reset consecutive failures on success
        this.consecutiveFailures.set(pluginName, 0);
        // Update metrics
        const metrics = this.getOrCreateMetrics(pluginName);
        metrics.invocations++;
        // Update timing stats
        if (metrics.invocations === 1) {
            metrics.minExecutionTimeMs = executionTimeMs;
            metrics.maxExecutionTimeMs = executionTimeMs;
            metrics.avgExecutionTimeMs = executionTimeMs;
        }
        else {
            metrics.minExecutionTimeMs = Math.min(metrics.minExecutionTimeMs, executionTimeMs);
            metrics.maxExecutionTimeMs = Math.max(metrics.maxExecutionTimeMs, executionTimeMs);
            // Running average
            metrics.avgExecutionTimeMs =
                (metrics.avgExecutionTimeMs * (metrics.invocations - 1) + executionTimeMs) /
                    metrics.invocations;
        }
    }
    /**
     * Record failed execution.
     */
    recordFailure(pluginName, error, isTimeout) {
        // Increment consecutive failures
        const current = this.consecutiveFailures.get(pluginName) ?? 0;
        this.consecutiveFailures.set(pluginName, current + 1);
        // Update metrics
        const metrics = this.getOrCreateMetrics(pluginName);
        metrics.invocations++;
        metrics.errors++;
        if (isTimeout) {
            metrics.timeouts++;
        }
        metrics.lastError = error.message;
        metrics.lastErrorAt = new Date().toISOString();
    }
    /**
     * Check if plugin should be auto-disabled.
     */
    checkAutoDisable(pluginName) {
        const failures = this.consecutiveFailures.get(pluginName) ?? 0;
        if (failures >= this.config.maxConsecutiveFailures) {
            this.disabledPlugins.add(pluginName);
            VulpesLogger_1.vulpesLogger.error(`Plugin auto-disabled after ${failures} consecutive failures`, {
                component: "PluginSandbox",
                plugin: pluginName,
            });
            return true;
        }
        return false;
    }
    /**
     * Get or create metrics for a plugin.
     */
    getOrCreateMetrics(pluginName) {
        let metrics = this.metrics.get(pluginName);
        if (!metrics) {
            metrics = {
                name: pluginName,
                invocations: 0,
                errors: 0,
                timeouts: 0,
                avgExecutionTimeMs: 0,
                maxExecutionTimeMs: 0,
                minExecutionTimeMs: Infinity,
                shortCircuits: 0,
            };
            this.metrics.set(pluginName, metrics);
        }
        return metrics;
    }
    /**
     * Record a short-circuit for metrics.
     */
    recordShortCircuit(pluginName) {
        const metrics = this.getOrCreateMetrics(pluginName);
        metrics.shortCircuits++;
    }
    /**
     * Get metrics for a specific plugin.
     */
    getMetrics(pluginName) {
        return this.metrics.get(pluginName);
    }
    /**
     * Get metrics for all plugins.
     */
    getAllMetrics() {
        const result = {};
        for (const [name, metrics] of this.metrics) {
            result[name] = { ...metrics };
        }
        return result;
    }
    /**
     * Check if a plugin is disabled.
     */
    isDisabled(pluginName) {
        return this.disabledPlugins.has(pluginName);
    }
    /**
     * Re-enable a disabled plugin.
     */
    enablePlugin(pluginName) {
        this.disabledPlugins.delete(pluginName);
        this.consecutiveFailures.set(pluginName, 0);
        VulpesLogger_1.vulpesLogger.info(`Plugin re-enabled`, {
            component: "PluginSandbox",
            plugin: pluginName,
        });
    }
    /**
     * Reset all metrics and state.
     */
    reset() {
        this.metrics.clear();
        this.consecutiveFailures.clear();
        this.disabledPlugins.clear();
    }
}
exports.PluginSandbox = PluginSandbox;
// ============================================================================
// SINGLETON
// ============================================================================
/**
 * Global sandbox instance.
 * Plugins share the same sandbox for consistent metrics.
 */
let globalSandbox = null;
/**
 * Get the global sandbox instance.
 */
function getPluginSandbox(config) {
    if (!globalSandbox) {
        globalSandbox = new PluginSandbox(config);
    }
    return globalSandbox;
}
/**
 * Reset the global sandbox (for testing).
 */
function resetPluginSandbox() {
    if (globalSandbox) {
        globalSandbox.reset();
    }
    globalSandbox = null;
}
//# sourceMappingURL=PluginSandbox.js.map