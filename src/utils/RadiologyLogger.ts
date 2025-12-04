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
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
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
  // ENABLED BY DEFAULT for transparency
  private static enabled = true;
  private static suppressErrors = false;
  private static logLevel: LogLevel = LogLevel.INFO;

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
  // BASIC LOGGING
  // ============================================================================

  static debug(category: string, message: string, data?: any) {
    if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
      const timestamp = this.getTimestamp();
      if (data !== undefined) {
        console.debug(`[${timestamp}] [DEBUG] [${category}] ${message}`, data);
      } else {
        console.debug(`[${timestamp}] [DEBUG] [${category}] ${message}`);
      }
    }
  }

  static info(category: string, message: string, data?: any) {
    if (this.enabled && this.logLevel <= LogLevel.INFO) {
      const timestamp = this.getTimestamp();
      if (data !== undefined) {
        console.info(`[${timestamp}] [INFO] [${category}] ${message}`, data);
      } else {
        console.info(`[${timestamp}] [INFO] [${category}] ${message}`);
      }
    }
  }

  static warn(category: string, message: string, data?: any) {
    if (this.enabled && this.logLevel <= LogLevel.WARN) {
      this.stats.warnings++;
      const timestamp = this.getTimestamp();
      if (data !== undefined) {
        console.warn(`[${timestamp}] [WARN] [${category}] ${message}`, data);
      } else {
        console.warn(`[${timestamp}] [WARN] [${category}] ${message}`);
      }
    }
  }

  static error(category: string, message: string, error?: any) {
    if (!this.suppressErrors && this.logLevel <= LogLevel.ERROR) {
      this.stats.errors++;
      const timestamp = this.getTimestamp();
      console.error(`[${timestamp}] [ERROR] [${category}] ${message}`);
      if (error) {
        if (error instanceof Error) {
          console.error(`  Stack: ${error.stack}`);
        } else {
          console.error(`  Details:`, error);
        }
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

    if (this.enabled && this.logLevel <= LogLevel.INFO) {
      const timestamp = this.getTimestamp();
      const confidenceStr = (options.confidence * 100).toFixed(1);
      const lengthStr = options.end - options.start;

      // Primary log line
      console.log(
        `[${timestamp}] [PHI-DETECTED] [${options.filterType}] ` +
          `"${this.truncateText(options.text, 50)}" ` +
          `(pos: ${options.start}-${options.end}, len: ${lengthStr}, conf: ${confidenceStr}%)`,
      );

      // Token assignment
      console.log(`[${timestamp}] [PHI-DETECTED]   -> Token: ${options.token}`);

      // Context if available
      if (options.context) {
        console.log(
          `[${timestamp}] [PHI-DETECTED]   -> Context: "${this.truncateText(options.context, 80)}"`,
        );
      }

      // Pattern if available
      if (options.pattern) {
        console.log(
          `[${timestamp}] [PHI-DETECTED]   -> Pattern: ${options.pattern}`,
        );
      }
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

      console.log(
        `[${timestamp}] [PHI-FILTERED] [${options.filterType}] ` +
          `"${this.truncateText(options.text, 50)}"${posStr}`,
      );
      console.log(
        `[${timestamp}] [PHI-FILTERED]   -> Reason: ${options.reason}`,
      );

      if (options.details) {
        console.log(
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
      console.log(
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

      console.log(
        `[${timestamp}] [FILTER-DONE] [${icon}] [${options.filterType}] ` +
          `${options.filterName}: ${options.spansDetected} spans in ${options.executionTimeMs}ms [${status}]`,
      );

      if (options.error) {
        console.error(
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
      console.log(`[${timestamp}] [PIPELINE] [${stage}] ${details}${spanStr}`);
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

      console.log(
        `[${timestamp}] [SUMMARY] ============================================================`,
      );
      console.log(`[${timestamp}] [SUMMARY] Redaction Complete`);
      console.log(
        `[${timestamp}] [SUMMARY]   Input:  ${options.inputLength} characters`,
      );
      console.log(
        `[${timestamp}] [SUMMARY]   Output: ${options.outputLength} characters`,
      );
      console.log(
        `[${timestamp}] [SUMMARY]   Filters executed: ${options.filterCount}`,
      );
      console.log(
        `[${timestamp}] [SUMMARY]   Spans detected:   ${options.totalSpansDetected}`,
      );
      console.log(
        `[${timestamp}] [SUMMARY]   After filtering:  ${options.spansAfterFiltering}`,
      );
      console.log(
        `[${timestamp}] [SUMMARY]   Tokens applied:   ${options.spansApplied}`,
      );
      console.log(
        `[${timestamp}] [SUMMARY]   Time: ${options.executionTimeMs}ms`,
      );
      console.log(
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
      console.log(
        `[${timestamp}] [DICTIONARY] Loaded ${name}: ${count.toLocaleString()} entries${timeStr}`,
      );
    }
  }

  static dictionaryError(name: string, error: string) {
    if (!this.suppressErrors) {
      const timestamp = this.getTimestamp();
      console.error(`[${timestamp}] [DICTIONARY] [ERROR] ${name}: ${error}`);
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

    console.log(
      `\n[${timestamp}] [SESSION-SUMMARY] ============================================================`,
    );
    console.log(
      `[${timestamp}] [SESSION-SUMMARY] Session Duration: ${(stats.sessionDurationMs / 1000).toFixed(2)}s`,
    );
    console.log(
      `[${timestamp}] [SESSION-SUMMARY] PHI Detected: ${stats.phiDetected}`,
    );
    console.log(
      `[${timestamp}] [SESSION-SUMMARY] False Positives Filtered: ${stats.phiFiltered}`,
    );
    console.log(`[${timestamp}] [SESSION-SUMMARY] Errors: ${stats.errors}`);
    console.log(`[${timestamp}] [SESSION-SUMMARY] Warnings: ${stats.warnings}`);
    console.log(
      `[${timestamp}] [SESSION-SUMMARY] ============================================================\n`,
    );

    // Print PHI type breakdown
    if (this.detectionHistory.length > 0) {
      const byType: Record<string, number> = {};
      for (const log of this.detectionHistory) {
        byType[log.filterType] = (byType[log.filterType] || 0) + 1;
      }

      console.log(`[${timestamp}] [SESSION-SUMMARY] PHI by Type:`);
      for (const [type, count] of Object.entries(byType).sort(
        (a, b) => b[1] - a[1],
      )) {
        console.log(`[${timestamp}] [SESSION-SUMMARY]   ${type}: ${count}`);
      }
    }
  }

  // ============================================================================
  // LEGACY COMPATIBILITY
  // ============================================================================

  static loading(message: string, ...args: any[]) {
    if (this.enabled)
      console.log(`[${this.getTimestamp()}] [LOADING]`, message, ...args);
  }

  static success(message: string, ...args: any[]) {
    if (this.enabled)
      console.log(`[${this.getTimestamp()}] [SUCCESS]`, message, ...args);
  }

  static redactionDebug(message: string, data?: any) {
    if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
      console.debug(
        `[${this.getTimestamp()}] [REDACTION-DEBUG]`,
        message,
        data || "",
      );
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
