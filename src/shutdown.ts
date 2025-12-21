/**
 * ============================================================================
 * VULPES CELARE - GRACEFUL SHUTDOWN HANDLER
 * ============================================================================
 *
 * Provides coordinated graceful shutdown for the Vulpes Celare application.
 * Ensures all resources are properly cleaned up before exit:
 * - Flushes VulpesLogger (file and console transports)
 * - Flushes VulpesTracer (OpenTelemetry spans)
 * - Allows in-flight operations to complete
 * - Closes database connections
 *
 * Usage:
 *   import { registerShutdownHandlers } from './shutdown';
 *   registerShutdownHandlers();
 *
 * Gold Standard Pattern:
 * - Handle SIGTERM (container orchestration)
 * - Handle SIGINT (Ctrl+C)
 * - Timeout-based forced shutdown
 * - Idempotent (can be called multiple times safely)
 */

import { vulpesLogger } from "./utils/VulpesLogger";

// Lazy imports to avoid circular dependencies
let tracerShutdown: (() => Promise<void>) | null = null;

/**
 * Get the VulpesTracer shutdown function lazily
 */
async function getTracerShutdown(): Promise<(() => Promise<void>) | null> {
  if (tracerShutdown === null) {
    try {
      const { vulpesTracer } = await import("./observability/VulpesTracer");
      tracerShutdown = () => vulpesTracer.shutdown();
    } catch {
      // Tracer not available
      tracerShutdown = undefined as unknown as null;
    }
  }
  return tracerShutdown || null;
}

/** Shutdown state */
let isShuttingDown = false;
let shutdownPromise: Promise<void> | null = null;

/** Configuration */
export interface ShutdownConfig {
  /** Timeout in ms before forced exit (default: 30000) */
  timeout?: number;
  /** Additional cleanup functions to run */
  cleanupFns?: Array<() => Promise<void> | void>;
  /** Exit code on successful shutdown (default: 0) */
  exitCode?: number;
  /** Exit code on forced/failed shutdown (default: 1) */
  forceExitCode?: number;
  /** Whether to actually call process.exit (default: true, set false for testing) */
  exitProcess?: boolean;
}

const defaultConfig: Required<ShutdownConfig> = {
  timeout: 30000,
  cleanupFns: [],
  exitCode: 0,
  forceExitCode: 1,
  exitProcess: true,
};

/**
 * Perform graceful shutdown
 *
 * @param signal - The signal that triggered shutdown (e.g., 'SIGTERM', 'SIGINT')
 * @param config - Shutdown configuration
 * @returns Promise that resolves when shutdown is complete
 */
export async function gracefulShutdown(
  signal: string,
  config: ShutdownConfig = {}
): Promise<void> {
  // Merge with defaults
  const cfg: Required<ShutdownConfig> = { ...defaultConfig, ...config };

  // Idempotent: if already shutting down, return existing promise
  if (isShuttingDown && shutdownPromise) {
    return shutdownPromise;
  }

  isShuttingDown = true;
  vulpesLogger.info(`Received ${signal}, starting graceful shutdown...`, {
    component: "Shutdown",
  });

  // Create timeout for forced shutdown
  const forceTimeout = setTimeout(() => {
    vulpesLogger.warn("Shutdown timeout exceeded, forcing exit", {
      component: "Shutdown",
      timeoutMs: cfg.timeout,
    });
    if (cfg.exitProcess) {
      process.exit(cfg.forceExitCode);
    }
  }, cfg.timeout);

  // Don't keep the process alive just for this timeout
  forceTimeout.unref();

  shutdownPromise = (async () => {
    try {
      // 1. Run custom cleanup functions
      if (cfg.cleanupFns.length > 0) {
        vulpesLogger.debug(`Running ${cfg.cleanupFns.length} cleanup functions`, {
          component: "Shutdown",
        });
        for (const fn of cfg.cleanupFns) {
          try {
            await fn();
          } catch (error) {
            vulpesLogger.warn("Cleanup function failed", {
              component: "Shutdown",
              error: String(error),
            });
          }
        }
      }

      // 2. Flush VulpesTracer
      const shutdown = await getTracerShutdown();
      if (shutdown) {
        vulpesLogger.debug("Flushing VulpesTracer", { component: "Shutdown" });
        try {
          await shutdown();
        } catch (error) {
          vulpesLogger.warn("Tracer shutdown failed", {
            component: "Shutdown",
            error: String(error),
          });
        }
      }

      // 3. Flush VulpesLogger (do this last)
      vulpesLogger.info("Graceful shutdown complete", { component: "Shutdown" });
      vulpesLogger.flush();

      // 4. Clear timeout and exit
      clearTimeout(forceTimeout);
      if (cfg.exitProcess) {
        process.exit(cfg.exitCode);
      }
    } catch (error) {
      vulpesLogger.error("Shutdown error", {
        component: "Shutdown",
        error: String(error),
      });
      clearTimeout(forceTimeout);
      if (cfg.exitProcess) {
        process.exit(cfg.forceExitCode);
      }
    }
  })();

  return shutdownPromise;
}

/**
 * Register shutdown handlers for SIGTERM and SIGINT
 *
 * @param config - Shutdown configuration
 */
export function registerShutdownHandlers(config: ShutdownConfig = {}): void {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM", config));
  process.on("SIGINT", () => gracefulShutdown("SIGINT", config));

  vulpesLogger.debug("Shutdown handlers registered", {
    component: "Shutdown",
    signals: ["SIGTERM", "SIGINT"],
    timeoutMs: config.timeout ?? defaultConfig.timeout,
  });
}

/**
 * Check if shutdown is in progress
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

/**
 * Reset shutdown state (for testing only)
 */
export function resetShutdownState(): void {
  isShuttingDown = false;
  shutdownPromise = null;
}
