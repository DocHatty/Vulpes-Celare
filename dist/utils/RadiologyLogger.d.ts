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
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
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
export declare class RadiologyLogger {
    private static _enabled;
    private static _logLevel;
    private static suppressErrors;
    private static get enabled();
    private static set enabled(value);
    private static get logLevel();
    private static set logLevel(value);
    private static stats;
    private static detectionHistory;
    private static filteredHistory;
    static enable(): void;
    static disable(): void;
    static isEnabled(): boolean;
    static setLogLevel(level: LogLevel): void;
    static getLogLevel(): LogLevel;
    /** Suppress error output (useful for tests expecting errors) */
    static suppressErrorOutput(suppress: boolean): void;
    /** Reset statistics and history */
    static resetSession(): void;
    static debug(category: string, message: string, data?: any): void;
    static info(category: string, message: string, data?: any): void;
    static warn(category: string, message: string, data?: any): void;
    static error(category: string, message: string, error?: any): void;
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
    }): void;
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
    }): void;
    /**
     * Log filter execution start
     */
    static filterStart(filterName: string, filterType: string): void;
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
    }): void;
    /**
     * Log redaction pipeline stage
     */
    static pipelineStage(stage: string, details: string, spanCount?: number): void;
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
    }): void;
    static dictionaryLoaded(name: string, count: number, timeMs?: number): void;
    static dictionaryError(name: string, error: string): void;
    /**
     * Get current session statistics
     */
    static getStats(): {
        sessionDurationMs: number;
        detectionHistory: number;
        filteredHistory: number;
        phiDetected: number;
        phiFiltered: number;
        errors: number;
        warnings: number;
        sessionStart: number;
    };
    /**
     * Get detection history for analysis
     */
    static getDetectionHistory(): PHIDetectionLog[];
    /**
     * Get filtered history for analysis
     */
    static getFilteredHistory(): PHIFilteredLog[];
    /**
     * Print session summary
     */
    static printSessionSummary(): void;
    static loading(message: string, ...args: any[]): void;
    static success(message: string, ...args: any[]): void;
    static redactionDebug(message: string, data?: any): void;
    private static getTimestamp;
    private static truncateText;
}
//# sourceMappingURL=RadiologyLogger.d.ts.map