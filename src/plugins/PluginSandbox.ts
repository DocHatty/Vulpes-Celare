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

import { vulpesLogger as log } from "../utils/VulpesLogger";
import type { PluginMetrics } from "./types";

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error thrown when a plugin exceeds its timeout.
 */
export class PluginTimeoutError extends Error {
  public readonly pluginName: string;
  public readonly timeoutMs: number;
  public readonly hookName: string;

  constructor(pluginName: string, hookName: string, timeoutMs: number) {
    super(
      `Plugin '${pluginName}' hook '${hookName}' timed out after ${timeoutMs}ms`
    );
    this.name = "PluginTimeoutError";
    this.pluginName = pluginName;
    this.hookName = hookName;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Error thrown when a plugin execution fails.
 */
export class PluginExecutionError extends Error {
  public readonly pluginName: string;
  public readonly hookName: string;
  public readonly originalError: Error;

  constructor(pluginName: string, hookName: string, originalError: Error) {
    super(
      `Plugin '${pluginName}' hook '${hookName}' failed: ${originalError.message}`
    );
    this.name = "PluginExecutionError";
    this.pluginName = pluginName;
    this.hookName = hookName;
    this.originalError = originalError;
  }
}

// ============================================================================
// SANDBOX CONFIGURATION
// ============================================================================

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

const DEFAULT_CONFIG: SandboxConfig = {
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
export class PluginSandbox {
  private config: SandboxConfig;
  private metrics: Map<string, PluginMetrics> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();
  private disabledPlugins: Set<string> = new Set();

  constructor(config: Partial<SandboxConfig> = {}) {
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
  async execute<T>(
    pluginName: string,
    hookName: string,
    fn: () => Promise<T> | T,
    options: { timeoutMs?: number } = {}
  ): Promise<SandboxResult<T>> {
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
      const value = await this.executeWithTimeout(
        pluginName,
        hookName,
        fn,
        timeoutMs
      );

      const executionTimeMs = performance.now() - startTime;

      // Update metrics on success
      this.recordSuccess(pluginName, executionTimeMs);

      if (this.config.logExecution) {
        log.debug(`Plugin hook executed`, {
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
    } catch (error) {
      const executionTimeMs = performance.now() - startTime;
      const isTimeout = error instanceof PluginTimeoutError;

      // Record failure
      this.recordFailure(pluginName, error as Error, isTimeout);

      // Check if plugin should be disabled
      const shouldDisable = this.checkAutoDisable(pluginName);

      log.warn(`Plugin hook failed`, {
        component: "PluginSandbox",
        plugin: pluginName,
        hook: hookName,
        error: (error as Error).message,
        timedOut: isTimeout,
        executionTimeMs: executionTimeMs.toFixed(2),
        autoDisabled: shouldDisable,
      });

      return {
        success: false,
        error: error as Error,
        executionTimeMs,
        timedOut: isTimeout,
        pluginDisabled: shouldDisable,
      };
    }
  }

  /**
   * Execute with timeout using Promise.race.
   */
  private async executeWithTimeout<T>(
    pluginName: string,
    hookName: string,
    fn: () => Promise<T> | T,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      Promise.resolve(fn()),
      new Promise<never>((_, reject) => {
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
  private recordSuccess(pluginName: string, executionTimeMs: number): void {
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
    } else {
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
  private recordFailure(
    pluginName: string,
    error: Error,
    isTimeout: boolean
  ): void {
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
  private checkAutoDisable(pluginName: string): boolean {
    const failures = this.consecutiveFailures.get(pluginName) ?? 0;
    if (failures >= this.config.maxConsecutiveFailures) {
      this.disabledPlugins.add(pluginName);
      log.error(`Plugin auto-disabled after ${failures} consecutive failures`, {
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
  private getOrCreateMetrics(pluginName: string): PluginMetrics {
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
  recordShortCircuit(pluginName: string): void {
    const metrics = this.getOrCreateMetrics(pluginName);
    metrics.shortCircuits++;
  }

  /**
   * Get metrics for a specific plugin.
   */
  getMetrics(pluginName: string): PluginMetrics | undefined {
    return this.metrics.get(pluginName);
  }

  /**
   * Get metrics for all plugins.
   */
  getAllMetrics(): Record<string, PluginMetrics> {
    const result: Record<string, PluginMetrics> = {};
    for (const [name, metrics] of this.metrics) {
      result[name] = { ...metrics };
    }
    return result;
  }

  /**
   * Check if a plugin is disabled.
   */
  isDisabled(pluginName: string): boolean {
    return this.disabledPlugins.has(pluginName);
  }

  /**
   * Re-enable a disabled plugin.
   */
  enablePlugin(pluginName: string): void {
    this.disabledPlugins.delete(pluginName);
    this.consecutiveFailures.set(pluginName, 0);
    log.info(`Plugin re-enabled`, {
      component: "PluginSandbox",
      plugin: pluginName,
    });
  }

  /**
   * Reset all metrics and state.
   */
  reset(): void {
    this.metrics.clear();
    this.consecutiveFailures.clear();
    this.disabledPlugins.clear();
  }
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

// ============================================================================
// SINGLETON
// ============================================================================

/**
 * Global sandbox instance.
 * Plugins share the same sandbox for consistent metrics.
 */
let globalSandbox: PluginSandbox | null = null;

/**
 * Get the global sandbox instance.
 */
export function getPluginSandbox(config?: Partial<SandboxConfig>): PluginSandbox {
  if (!globalSandbox) {
    globalSandbox = new PluginSandbox(config);
  }
  return globalSandbox;
}

/**
 * Reset the global sandbox (for testing).
 */
export function resetPluginSandbox(): void {
  if (globalSandbox) {
    globalSandbox.reset();
  }
  globalSandbox = null;
}
