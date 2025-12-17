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
 *
 * NOTE: This is a specialized domain logger for radiology workflows.
 * For general logging, use VulpesLogger from './VulpesLogger'.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadiologyLogger = exports.LogFormat = exports.LogLevel = void 0;
const VulpesLogger_1 = require("./VulpesLogger");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["NONE"] = 4] = "NONE";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var LogFormat;
(function (LogFormat) {
    LogFormat["PRETTY"] = "pretty";
    LogFormat["JSON"] = "json";
})(LogFormat || (exports.LogFormat = LogFormat = {}));
class RadiologyLogger {
    // These are checked at runtime via getters to support dynamic changes
    static _enabled = null;
    static _logLevel = null;
    static _logFormat = null;
    static suppressErrors = false;
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
    static get logFormat() {
        if (this._logFormat !== null)
            return this._logFormat;
        if (process.env.VULPES_LOG_FORMAT === "json")
            return LogFormat.JSON;
        return LogFormat.PRETTY;
    }
    static set logFormat(value) {
        this._logFormat = value;
    }
    // Statistics tracking
    static stats = {
        phiDetected: 0,
        phiFiltered: 0,
        errors: 0,
        warnings: 0,
        sessionStart: Date.now(),
    };
    // Detection history for current session
    static detectionHistory = [];
    static filteredHistory = [];
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
    static setLogFormat(format) {
        this.logFormat = format;
    }
    static getLogFormat() {
        return this.logFormat;
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
    // STRUCTURED JSON OUTPUT HELPER
    // ============================================================================
    static outputLog(level, category, message, data) {
        const timestamp = new Date().toISOString();
        // Route through VulpesLogger for consistent output
        const context = { component: category, ...data };
        switch (level) {
            case "debug":
                VulpesLogger_1.vulpesLogger.debug(message, context);
                break;
            case "info":
                VulpesLogger_1.vulpesLogger.info(message, context);
                break;
            case "warn":
                VulpesLogger_1.vulpesLogger.warn(message, context);
                break;
            case "error":
                VulpesLogger_1.vulpesLogger.error(message, context);
                break;
        }
    }
    // ============================================================================
    // BASIC LOGGING
    // ============================================================================
    static debug(category, message, data) {
        if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
            this.outputLog("debug", category, message, data);
        }
    }
    static info(category, message, data) {
        if (this.enabled && this.logLevel <= LogLevel.INFO) {
            this.outputLog("info", category, message, data);
        }
    }
    static warn(category, message, data) {
        if (this.enabled && this.logLevel <= LogLevel.WARN) {
            this.stats.warnings++;
            this.outputLog("warn", category, message, data);
        }
    }
    static error(category, message, error) {
        if (!this.suppressErrors && this.logLevel <= LogLevel.ERROR) {
            this.stats.errors++;
            if (this.logFormat === LogFormat.JSON) {
                const errorData = {};
                if (error instanceof Error) {
                    errorData.errorMessage = error.message;
                    errorData.stack = error.stack;
                }
                else if (error !== undefined) {
                    errorData.details = error;
                }
                this.outputLog("error", category, message, Object.keys(errorData).length > 0 ? errorData : undefined);
            }
            else {
                // Route through VulpesLogger
                const errorData = { component: category };
                if (error instanceof Error) {
                    errorData.error = error.message;
                    errorData.stack = error.stack?.split("\n").slice(0, 5);
                }
                else if (error !== undefined) {
                    errorData.details = error;
                }
                VulpesLogger_1.vulpesLogger.error(message, errorData);
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
        // CRITICAL: PHI detection logs should ALWAYS show - this is the important output!
        // Using ERROR level ensures these are never suppressed
        if (this.enabled && this.logLevel <= LogLevel.ERROR) {
            const confidenceStr = (options.confidence * 100).toFixed(1);
            // Compact, important log line - what IS being redacted
            VulpesLogger_1.vulpesLogger.info(`[REDACTED] [${options.filterType}] "${this.truncateText(options.text, 50)}" -> ${options.token} (conf: ${confidenceStr}%)`);
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
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [PHI-FILTERED] [${options.filterType}] ` +
                `"${this.truncateText(options.text, 50)}"${posStr}`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [PHI-FILTERED]   -> Reason: ${options.reason}`);
            if (options.details) {
                VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [PHI-FILTERED]   -> Details: ${options.details}`);
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
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [FILTER-START] [${filterType}] ${filterName} executing...`);
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
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [FILTER-DONE] [${icon}] [${options.filterType}] ` +
                `${options.filterName}: ${options.spansDetected} spans in ${options.executionTimeMs}ms [${status}]`);
            if (options.error) {
                VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [FILTER-ERROR] [${options.filterType}] ${options.filterName}: ${options.error.message}`);
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
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [PIPELINE] [${stage}] ${details}${spanStr}`);
        }
    }
    /**
     * Log redaction summary
     */
    static redactionSummary(options) {
        if (this.enabled && this.logLevel <= LogLevel.INFO) {
            const timestamp = this.getTimestamp();
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY] ============================================================`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY] Redaction Complete`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY]   Input:  ${options.inputLength} characters`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY]   Output: ${options.outputLength} characters`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY]   Filters executed: ${options.filterCount}`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY]   Spans detected:   ${options.totalSpansDetected}`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY]   After filtering:  ${options.spansAfterFiltering}`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY]   Tokens applied:   ${options.spansApplied}`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY]   Time: ${options.executionTimeMs}ms`);
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SUMMARY] ============================================================`);
        }
    }
    // ============================================================================
    // DICTIONARY LOGGING
    // ============================================================================
    static dictionaryLoaded(name, count, timeMs) {
        if (this.enabled && this.logLevel <= LogLevel.INFO) {
            const timestamp = this.getTimestamp();
            const timeStr = timeMs !== undefined ? ` in ${timeMs}ms` : "";
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [DICTIONARY] Loaded ${name}: ${count.toLocaleString()} entries${timeStr}`);
        }
    }
    static dictionaryError(name, error) {
        if (!this.suppressErrors) {
            const timestamp = this.getTimestamp();
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [DICTIONARY] [ERROR] ${name}: ${error}`);
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
        VulpesLogger_1.vulpesLogger.info(`\n[${timestamp}] [SESSION-SUMMARY] ============================================================`);
        VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SESSION-SUMMARY] Session Duration: ${(stats.sessionDurationMs / 1000).toFixed(2)}s`);
        VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SESSION-SUMMARY] PHI Detected: ${stats.phiDetected}`);
        VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SESSION-SUMMARY] False Positives Filtered: ${stats.phiFiltered}`);
        VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SESSION-SUMMARY] Errors: ${stats.errors}`);
        VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SESSION-SUMMARY] Warnings: ${stats.warnings}`);
        VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SESSION-SUMMARY] ============================================================\n`);
        // Print PHI type breakdown
        if (this.detectionHistory.length > 0) {
            const byType = {};
            for (const log of this.detectionHistory) {
                byType[log.filterType] = (byType[log.filterType] || 0) + 1;
            }
            VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SESSION-SUMMARY] PHI by Type:`);
            for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
                VulpesLogger_1.vulpesLogger.info(`[${timestamp}] [SESSION-SUMMARY]   ${type}: ${count}`);
            }
        }
    }
    // ============================================================================
    // LEGACY COMPATIBILITY
    // ============================================================================
    static loading(message, ...args) {
        if (this.enabled)
            VulpesLogger_1.vulpesLogger.info(`[LOADING] ${message} ${args.join(" ")}`, { component: "RadiologyLogger" });
    }
    static success(message, ...args) {
        if (this.enabled)
            VulpesLogger_1.vulpesLogger.success(`${message} ${args.join(" ")}`, { component: "RadiologyLogger" });
    }
    static redactionDebug(message, data) {
        if (this.enabled && this.logLevel <= LogLevel.DEBUG) {
            VulpesLogger_1.vulpesLogger.debug(`[REDACTION-DEBUG] ${message}`, { component: "RadiologyLogger", data });
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
//# sourceMappingURL=RadiologyLogger.js.map