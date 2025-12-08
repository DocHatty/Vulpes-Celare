"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadiologyLogger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class RadiologyLogger {
    static get enabled() {
        if (this._enabled !== null)
            return this._enabled;
        return (!process.env.VULPES_QUIET &&
            !process.argv.includes("--quiet") &&
            !process.argv.includes("-q"));
    }
    static set enabled(value) {
        this._enabled = value;
    }
    static get logLevel() {
        if (this._logLevel !== null)
            return this._logLevel;
        if (process.env.VULPES_LOG_LEVEL)
            return parseInt(process.env.VULPES_LOG_LEVEL);
        if (process.env.VULPES_QUIET)
            return LogLevel.NONE;
        return LogLevel.INFO;
    }
    static set logLevel(value) {
        this._logLevel = value;
    }
    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    static enable() {
        this.enabled = true;
    }
    static disable() {
        this.enabled = false;
    }
    static isEnabled() {
        return this.enabled;
    }
    static setLogLevel(level) {
        this.logLevel = level;
    }
    static getLogLevel() {
        return this.logLevel;
    }
    /** Suppress error output (useful for tests expecting errors) */
    static suppressErrorOutput(suppress) {
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
    static debug(category, message, data) {
        if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
            const timestamp = this.getTimestamp();
            if (data !== undefined) {
                console.debug(`[${timestamp}] [DEBUG] [${category}] ${message}`, data);
            }
            else {
                console.debug(`[${timestamp}] [DEBUG] [${category}] ${message}`);
            }
        }
    }
    static info(category, message, data) {
        if (this.enabled && this.logLevel <= LogLevel.INFO) {
            const timestamp = this.getTimestamp();
            if (data !== undefined) {
                console.info(`[${timestamp}] [INFO] [${category}] ${message}`, data);
            }
            else {
                console.info(`[${timestamp}] [INFO] [${category}] ${message}`);
            }
        }
    }
    static warn(category, message, data) {
        if (this.enabled && this.logLevel <= LogLevel.WARN) {
            this.stats.warnings++;
            const timestamp = this.getTimestamp();
            if (data !== undefined) {
                console.warn(`[${timestamp}] [WARN] [${category}] ${message}`, data);
            }
            else {
                console.warn(`[${timestamp}] [WARN] [${category}] ${message}`);
            }
        }
    }
    static error(category, message, error) {
        if (!this.suppressErrors && this.logLevel <= LogLevel.ERROR) {
            this.stats.errors++;
            const timestamp = this.getTimestamp();
            console.error(`[${timestamp}] [ERROR] [${category}] ${message}`);
            if (error) {
                if (error instanceof Error) {
                    console.error(`  Stack: ${error.stack}`);
                }
                else {
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
    static phiDetected(options) {
        this.stats.phiDetected++;
        const log = {
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
            console.error(`[${timestamp}] [PHI-DETECTED] [${options.filterType}] ` +
                `"${this.truncateText(options.text, 50)}" ` +
                `(pos: ${options.start}-${options.end}, len: ${lengthStr}, conf: ${confidenceStr}%)`);
            // Token assignment
            console.error(`[${timestamp}] [PHI-DETECTED]   -> Token: ${options.token}`);
            // Context if available
            if (options.context) {
                console.error(`[${timestamp}] [PHI-DETECTED]   -> Context: "${this.truncateText(options.context, 80)}"`);
            }
            // Pattern if available
            if (options.pattern) {
                console.error(`[${timestamp}] [PHI-DETECTED]   -> Pattern: ${options.pattern}`);
            }
        }
    }
    /**
     * Log when potential PHI is filtered out (false positive prevention)
     * This is called when something looked like PHI but was determined not to be
     */
    static phiFiltered(options) {
        this.stats.phiFiltered++;
        const log = {
            filterType: options.filterType,
            originalText: options.text,
            reason: options.reason,
            characterStart: options.start,
            characterEnd: options.end,
        };
        this.filteredHistory.push(log);
        if (this.enabled && this.logLevel <= LogLevel.INFO) {
            const timestamp = this.getTimestamp();
            const posStr = options.start !== undefined
                ? ` (pos: ${options.start}-${options.end})`
                : "";
            console.error(`[${timestamp}] [PHI-FILTERED] [${options.filterType}] ` +
                `"${this.truncateText(options.text, 50)}"${posStr}`);
            console.error(`[${timestamp}] [PHI-FILTERED]   -> Reason: ${options.reason}`);
            if (options.details) {
                console.error(`[${timestamp}] [PHI-FILTERED]   -> Details: ${options.details}`);
            }
        }
    }
    // ============================================================================
    // FILTER EXECUTION LOGGING
    // ============================================================================
    /**
     * Log filter execution start
     */
    static filterStart(filterName, filterType) {
        if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
            const timestamp = this.getTimestamp();
            console.error(`[${timestamp}] [FILTER-START] [${filterType}] ${filterName} executing...`);
        }
    }
    /**
     * Log filter execution complete
     */
    static filterComplete(options) {
        if (this.enabled && this.logLevel <= LogLevel.INFO) {
            const timestamp = this.getTimestamp();
            const icon = options.success ? "✓" : "✗";
            const status = options.success ? "OK" : "FAILED";
            console.error(`[${timestamp}] [FILTER-DONE] [${icon}] [${options.filterType}] ` +
                `${options.filterName}: ${options.spansDetected} spans in ${options.executionTimeMs}ms [${status}]`);
            if (options.error) {
                console.error(`[${timestamp}] [FILTER-ERROR] [${options.filterType}] ${options.filterName}: ${options.error.message}`);
            }
        }
    }
    // ============================================================================
    // REDACTION PIPELINE LOGGING
    // ============================================================================
    /**
     * Log redaction pipeline stage
     */
    static pipelineStage(stage, details, spanCount) {
        if (this.enabled && this.logLevel <= LogLevel.INFO) {
            const timestamp = this.getTimestamp();
            const spanStr = spanCount !== undefined ? ` (${spanCount} spans)` : "";
            console.error(`[${timestamp}] [PIPELINE] [${stage}] ${details}${spanStr}`);
        }
    }
    /**
     * Log redaction summary
     */
    static redactionSummary(options) {
        if (this.enabled && this.logLevel <= LogLevel.INFO) {
            const timestamp = this.getTimestamp();
            console.error(`[${timestamp}] [SUMMARY] ============================================================`);
            console.error(`[${timestamp}] [SUMMARY] Redaction Complete`);
            console.error(`[${timestamp}] [SUMMARY]   Input:  ${options.inputLength} characters`);
            console.error(`[${timestamp}] [SUMMARY]   Output: ${options.outputLength} characters`);
            console.error(`[${timestamp}] [SUMMARY]   Filters executed: ${options.filterCount}`);
            console.error(`[${timestamp}] [SUMMARY]   Spans detected:   ${options.totalSpansDetected}`);
            console.error(`[${timestamp}] [SUMMARY]   After filtering:  ${options.spansAfterFiltering}`);
            console.error(`[${timestamp}] [SUMMARY]   Tokens applied:   ${options.spansApplied}`);
            console.error(`[${timestamp}] [SUMMARY]   Time: ${options.executionTimeMs}ms`);
            console.error(`[${timestamp}] [SUMMARY] ============================================================`);
        }
    }
    // ============================================================================
    // DICTIONARY LOGGING
    // ============================================================================
    static dictionaryLoaded(name, count, timeMs) {
        if (this.enabled && this.logLevel <= LogLevel.INFO) {
            const timestamp = this.getTimestamp();
            const timeStr = timeMs !== undefined ? ` in ${timeMs}ms` : "";
            console.error(`[${timestamp}] [DICTIONARY] Loaded ${name}: ${count.toLocaleString()} entries${timeStr}`);
        }
    }
    static dictionaryError(name, error) {
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
    static getDetectionHistory() {
        return [...this.detectionHistory];
    }
    /**
     * Get filtered history for analysis
     */
    static getFilteredHistory() {
        return [...this.filteredHistory];
    }
    /**
     * Print session summary
     */
    static printSessionSummary() {
        const stats = this.getStats();
        const timestamp = this.getTimestamp();
        console.error(`\n[${timestamp}] [SESSION-SUMMARY] ============================================================`);
        console.error(`[${timestamp}] [SESSION-SUMMARY] Session Duration: ${(stats.sessionDurationMs / 1000).toFixed(2)}s`);
        console.error(`[${timestamp}] [SESSION-SUMMARY] PHI Detected: ${stats.phiDetected}`);
        console.error(`[${timestamp}] [SESSION-SUMMARY] False Positives Filtered: ${stats.phiFiltered}`);
        console.error(`[${timestamp}] [SESSION-SUMMARY] Errors: ${stats.errors}`);
        console.error(`[${timestamp}] [SESSION-SUMMARY] Warnings: ${stats.warnings}`);
        console.error(`[${timestamp}] [SESSION-SUMMARY] ============================================================\n`);
        // Print PHI type breakdown
        if (this.detectionHistory.length > 0) {
            const byType = {};
            for (const log of this.detectionHistory) {
                byType[log.filterType] = (byType[log.filterType] || 0) + 1;
            }
            console.error(`[${timestamp}] [SESSION-SUMMARY] PHI by Type:`);
            for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
                console.error(`[${timestamp}] [SESSION-SUMMARY]   ${type}: ${count}`);
            }
        }
    }
    // ============================================================================
    // LEGACY COMPATIBILITY
    // ============================================================================
    static loading(message, ...args) {
        if (this.enabled)
            console.error(`[${this.getTimestamp()}] [LOADING]`, message, ...args);
    }
    static success(message, ...args) {
        if (this.enabled)
            console.error(`[${this.getTimestamp()}] [SUCCESS]`, message, ...args);
    }
    static redactionDebug(message, data) {
        if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
            console.debug(`[${this.getTimestamp()}] [REDACTION-DEBUG]`, message, data || "");
        }
    }
    // ============================================================================
    // UTILITIES
    // ============================================================================
    static getTimestamp() {
        const now = new Date();
        return now.toISOString().substring(11, 23); // HH:mm:ss.SSS
    }
    static truncateText(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength - 3) + "...";
    }
}
exports.RadiologyLogger = RadiologyLogger;
// These are checked at runtime via getters to support dynamic changes
RadiologyLogger._enabled = null;
RadiologyLogger._logLevel = null;
RadiologyLogger.suppressErrors = false;
// Statistics tracking
RadiologyLogger.stats = {
    phiDetected: 0,
    phiFiltered: 0,
    errors: 0,
    warnings: 0,
    sessionStart: Date.now(),
};
// Detection history for current session
RadiologyLogger.detectionHistory = [];
RadiologyLogger.filteredHistory = [];
//# sourceMappingURL=RadiologyLogger.js.map