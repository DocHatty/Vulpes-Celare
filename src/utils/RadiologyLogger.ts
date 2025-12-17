/**
 * RadiologyLogger - Comprehensive logging utility for Vulpes Celare
 *
 * Provides detailed, structured logging for:
 * - PHI detection events (what was found and redacted)
 * - False positive filtering (what was correctly NOT redacted)
 * - Filter execution statistics
 * - Error tracking and diagnostics
 *
 * Logging is ENABLED by default for transparency and debugging.
 *
 * NOTE: This is a specialized domain logger for radiology workflows.
 * For general logging, use VulpesLogger from './VulpesLogger'.
 */

import { vulpesLogger as vlog } from "./VulpesLogger";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export enum LogFormat {
  PRETTY = "pretty",
  JSON = "json",
}

export interface PHIDetectionLog {
  filterType: string;
  originalText: string;
  characterStart: number;
  characterEnd: number;
  confidence: number;
  token: string;
  context?: string;
  pattern?: string;
}

export interface PHIFilteredLog {
  filterType: string;
  originalText: string;
  reason: string;
  characterStart?: number;
  characterEnd?: number;
}

export class RadiologyLogger {
  // These are checked at runtime via getters to support dynamic changes
  private static _enabled: boolean | null = null;
  private static _logLevel: LogLevel | null = null;
  private static _logFormat: LogFormat | null = null;
  private static suppressErrors = false;

  private static get enabled(): boolean {
    if (this._enabled !== null) return this._enabled;
    return (
      !process.env.VULPES_QUIET &&
      !process.argv.includes("--quiet") &&
      !process.argv.includes("-q")
    );
  }

  private static set enabled(value: boolean) {
    this._enabled = value;
  }

  private static get logLevel(): LogLevel {
    if (this._logLevel !== null) return this._logLevel;
    if (process.env.VULPES_LOG_LEVEL)
      return parseInt(process.env.VULPES_LOG_LEVEL);
    if (process.env.VULPES_QUIET) return LogLevel.NONE;
    return LogLevel.INFO;
  }

  private static set logLevel(value: LogLevel) {
    this._logLevel = value;
  }

  private static get logFormat(): LogFormat {
    if (this._logFormat !== null) return this._logFormat;
    if (process.env.VULPES_LOG_FORMAT === "json") return LogFormat.JSON;
    return LogFormat.PRETTY;
  }

  private static set logFormat(value: LogFormat) {
    this._logFormat = value;
  }

  // Statistics tracking
  private static stats = {
    phiDetected: 0,
    phiFiltered: 0,
    errors: 0,
    warnings: 0,
    sessionStart: Date.now(),
  };

  // Detection history for current session
  private static detectionHistory: PHIDetectionLog[] = [];
  private static filteredHistory: PHIFilteredLog[] = [];

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  static enable() {
    this.enabled = true;
  }

  static disable() {
    this.enabled = false;
  }

  static isEnabled(): boolean {
    return this.enabled;
  }

  static setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  static getLogLevel(): LogLevel {
    return this.logLevel;
  }

  static setLogFormat(format: LogFormat) {
    this.logFormat = format;
  }

  static getLogFormat(): LogFormat {
    return this.logFormat;
  }

  /** Suppress error output (useful for tests expecting errors) */
  static suppressErrorOutput(suppress: boolean) {
    this.suppressErrors = suppress;
  }

  /** Reset statistics and history */
  static resetSession() {
    this.stats = {
      phiDetected: 0,
      phiFiltered: 0,
      errors: 0,
      warnings: 0,
      sessionStart: Date.now(),
    };
    this.detectionHistory = [];
    this.filteredHistory = [];
  }

  // ============================================================================
  // STRUCTURED JSON OUTPUT HELPER
  // ============================================================================

  private static outputLog(
    level: "debug" | "info" | "warn" | "error",
    category: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    const timestamp = new Date().toISOString();

    // Route through VulpesLogger for consistent output
    const context = { component: category, ...data };
    switch (level) {
      case "debug":
        vlog.debug(message, context);
        break;
      case "info":
        vlog.info(message, context);
        break;
      case "warn":
        vlog.warn(message, context);
        break;
      case "error":
        vlog.error(message, context);
        break;
    }
  }

  // ============================================================================
  // BASIC LOGGING
  // ============================================================================

  static debug(
    category: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
      this.outputLog("debug", category, message, data);
    }
  }

  static info(
    category: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    if (this.enabled && this.logLevel <= LogLevel.INFO) {
      this.outputLog("info", category, message, data);
    }
  }

  static warn(
    category: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    if (this.enabled && this.logLevel <= LogLevel.WARN) {
      this.stats.warnings++;
      this.outputLog("warn", category, message, data);
    }
  }

  static error(category: string, message: string, error?: unknown) {
    if (!this.suppressErrors && this.logLevel <= LogLevel.ERROR) {
      this.stats.errors++;
      if (this.logFormat === LogFormat.JSON) {
        const errorData: Record<string, unknown> = {};
        if (error instanceof Error) {
          errorData.errorMessage = error.message;
          errorData.stack = error.stack;
        } else if (error !== undefined) {
          errorData.details = error;
        }
        this.outputLog(
          "error",
          category,
          message,
          Object.keys(errorData).length > 0 ? errorData : undefined,
        );
      } else {
        // Route through VulpesLogger
        const errorData: Record<string, unknown> = { component: category };
        if (error instanceof Error) {
          errorData.error = error.message;
          errorData.stack = error.stack?.split("\n").slice(0, 5);
        } else if (error !== undefined) {
          errorData.details = error;
        }
        vlog.error(message, errorData);
      }
    }
  }

  // ============================================================================
  // PHI DETECTION LOGGING - The most important logs
  // ============================================================================

  /**
   * Log a successful PHI detection
   * This is called when PHI is found and will be redacted
   */
  static phiDetected(options: {
    filterType: string;
    text: string;
    start: number;
    end: number;
    confidence: number;
    token: string;
    context?: string;
    pattern?: string;
  }) {
    this.stats.phiDetected++;

    const log: PHIDetectionLog = {
      filterType: options.filterType,
      originalText: options.text,
      characterStart: options.start,
      characterEnd: options.end,
      confidence: options.confidence,
      token: options.token,
      context: options.context,
      pattern: options.pattern,
    };

    this.detectionHistory.push(log);

    // CRITICAL: PHI detection logs should ALWAYS show - this is the important output!
    // Using ERROR level ensures these are never suppressed
    if (this.enabled && this.logLevel <= LogLevel.ERROR) {
      const confidenceStr = (options.confidence * 100).toFixed(1);

      // Compact, important log line - what IS being redacted
      vlog.info(
        `[REDACTED] [${options.filterType}] "${this.truncateText(options.text, 50)}" -> ${options.token} (conf: ${confidenceStr}%)`,
      );
    }
  }

  /**
   * Log when potential PHI is filtered out (false positive prevention)
   * This is called when something looked like PHI but was determined not to be
   */
  static phiFiltered(options: {
    filterType: string;
    text: string;
    reason: string;
    start?: number;
    end?: number;
    details?: string;
  }) {
    this.stats.phiFiltered++;

    const log: PHIFilteredLog = {
      filterType: options.filterType,
      originalText: options.text,
      reason: options.reason,
      characterStart: options.start,
      characterEnd: options.end,
    };

    this.filteredHistory.push(log);

    if (this.enabled && this.logLevel <= LogLevel.INFO) {
      const timestamp = this.getTimestamp();
      const posStr =
        options.start !== undefined
          ? ` (pos: ${options.start}-${options.end})`
          : "";

      vlog.info(
        `[${timestamp}] [PHI-FILTERED] [${options.filterType}] ` +
          `"${this.truncateText(options.text, 50)}"${posStr}`,
      );
      vlog.info(
        `[${timestamp}] [PHI-FILTERED]   -> Reason: ${options.reason}`,
      );

      if (options.details) {
        vlog.info(
          `[${timestamp}] [PHI-FILTERED]   -> Details: ${options.details}`,
        );
      }
    }
  }

  // ============================================================================
  // FILTER EXECUTION LOGGING
  // ============================================================================

  /**
   * Log filter execution start
   */
  static filterStart(filterName: string, filterType: string) {
    if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
      const timestamp = this.getTimestamp();
      vlog.info(
        `[${timestamp}] [FILTER-START] [${filterType}] ${filterName} executing...`,
      );
    }
  }

  /**
   * Log filter execution complete
   */
  static filterComplete(options: {
    filterName: string;
    filterType: string;
    spansDetected: number;
    executionTimeMs: number;
    success: boolean;
    error?: Error;
  }) {
    if (this.enabled && this.logLevel <= LogLevel.INFO) {
      const timestamp = this.getTimestamp();
      const icon = options.success ? "✓" : "✗";
      const status = options.success ? "OK" : "FAILED";

      vlog.info(
        `[${timestamp}] [FILTER-DONE] [${icon}] [${options.filterType}] ` +
          `${options.filterName}: ${options.spansDetected} spans in ${options.executionTimeMs}ms [${status}]`,
      );

      if (options.error) {
        vlog.info(
          `[${timestamp}] [FILTER-ERROR] [${options.filterType}] ${options.filterName}: ${options.error.message}`,
        );
      }
    }
  }

  // ============================================================================
  // REDACTION PIPELINE LOGGING
  // ============================================================================

  /**
   * Log redaction pipeline stage
   */
  static pipelineStage(stage: string, details: string, spanCount?: number) {
    if (this.enabled && this.logLevel <= LogLevel.INFO) {
      const timestamp = this.getTimestamp();
      const spanStr = spanCount !== undefined ? ` (${spanCount} spans)` : "";
      vlog.info(
        `[${timestamp}] [PIPELINE] [${stage}] ${details}${spanStr}`,
      );
    }
  }

  /**
   * Log redaction summary
   */
  static redactionSummary(options: {
    inputLength: number;
    outputLength: number;
    totalSpansDetected: number;
    spansAfterFiltering: number;
    spansApplied: number;
    executionTimeMs: number;
    filterCount: number;
  }) {
    if (this.enabled && this.logLevel <= LogLevel.INFO) {
      const timestamp = this.getTimestamp();

      vlog.info(
        `[${timestamp}] [SUMMARY] ============================================================`,
      );
      vlog.info(`[${timestamp}] [SUMMARY] Redaction Complete`);
      vlog.info(
        `[${timestamp}] [SUMMARY]   Input:  ${options.inputLength} characters`,
      );
      vlog.info(
        `[${timestamp}] [SUMMARY]   Output: ${options.outputLength} characters`,
      );
      vlog.info(
        `[${timestamp}] [SUMMARY]   Filters executed: ${options.filterCount}`,
      );
      vlog.info(
        `[${timestamp}] [SUMMARY]   Spans detected:   ${options.totalSpansDetected}`,
      );
      vlog.info(
        `[${timestamp}] [SUMMARY]   After filtering:  ${options.spansAfterFiltering}`,
      );
      vlog.info(
        `[${timestamp}] [SUMMARY]   Tokens applied:   ${options.spansApplied}`,
      );
      vlog.info(
        `[${timestamp}] [SUMMARY]   Time: ${options.executionTimeMs}ms`,
      );
      vlog.info(
        `[${timestamp}] [SUMMARY] ============================================================`,
      );
    }
  }

  // ============================================================================
  // DICTIONARY LOGGING
  // ============================================================================

  static dictionaryLoaded(name: string, count: number, timeMs?: number) {
    if (this.enabled && this.logLevel <= LogLevel.INFO) {
      const timestamp = this.getTimestamp();
      const timeStr = timeMs !== undefined ? ` in ${timeMs}ms` : "";
      vlog.info(
        `[${timestamp}] [DICTIONARY] Loaded ${name}: ${count.toLocaleString()} entries${timeStr}`,
      );
    }
  }

  static dictionaryError(name: string, error: string) {
    if (!this.suppressErrors) {
      const timestamp = this.getTimestamp();
      vlog.info(`[${timestamp}] [DICTIONARY] [ERROR] ${name}: ${error}`);
    }
  }

  // ============================================================================
  // STATISTICS & HISTORY
  // ============================================================================

  /**
   * Get current session statistics
   */
  static getStats() {
    return {
      ...this.stats,
      sessionDurationMs: Date.now() - this.stats.sessionStart,
      detectionHistory: this.detectionHistory.length,
      filteredHistory: this.filteredHistory.length,
    };
  }

  /**
   * Get detection history for analysis
   */
  static getDetectionHistory(): PHIDetectionLog[] {
    return [...this.detectionHistory];
  }

  /**
   * Get filtered history for analysis
   */
  static getFilteredHistory(): PHIFilteredLog[] {
    return [...this.filteredHistory];
  }

  /**
   * Print session summary
   */
  static printSessionSummary() {
    const stats = this.getStats();
    const timestamp = this.getTimestamp();

    vlog.info(
      `\n[${timestamp}] [SESSION-SUMMARY] ============================================================`,
    );
    vlog.info(
      `[${timestamp}] [SESSION-SUMMARY] Session Duration: ${(stats.sessionDurationMs / 1000).toFixed(2)}s`,
    );
    vlog.info(
      `[${timestamp}] [SESSION-SUMMARY] PHI Detected: ${stats.phiDetected}`,
    );
    vlog.info(
      `[${timestamp}] [SESSION-SUMMARY] False Positives Filtered: ${stats.phiFiltered}`,
    );
    vlog.info(`[${timestamp}] [SESSION-SUMMARY] Errors: ${stats.errors}`);
    vlog.info(
      `[${timestamp}] [SESSION-SUMMARY] Warnings: ${stats.warnings}`,
    );
    vlog.info(
      `[${timestamp}] [SESSION-SUMMARY] ============================================================\n`,
    );

    // Print PHI type breakdown
    if (this.detectionHistory.length > 0) {
      const byType: Record<string, number> = {};
      for (const log of this.detectionHistory) {
        byType[log.filterType] = (byType[log.filterType] || 0) + 1;
      }

      vlog.info(`[${timestamp}] [SESSION-SUMMARY] PHI by Type:`);
      for (const [type, count] of Object.entries(byType).sort(
        (a, b) => b[1] - a[1],
      )) {
        vlog.info(`[${timestamp}] [SESSION-SUMMARY]   ${type}: ${count}`);
      }
    }
  }

  // ============================================================================
  // LEGACY COMPATIBILITY
  // ============================================================================

  static loading(message: string, ...args: any[]) {
    if (this.enabled)
      vlog.info(`[LOADING] ${message} ${args.join(" ")}`, { component: "RadiologyLogger" });
  }

  static success(message: string, ...args: any[]) {
    if (this.enabled)
      vlog.success(`${message} ${args.join(" ")}`, { component: "RadiologyLogger" });
  }

  static redactionDebug(message: string, data?: any) {
    if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
      vlog.debug(`[REDACTION-DEBUG] ${message}`, { component: "RadiologyLogger", data });
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private static getTimestamp(): string {
    const now = new Date();
    return now.toISOString().substring(11, 23); // HH:mm:ss.SSS
  }

  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }
}
