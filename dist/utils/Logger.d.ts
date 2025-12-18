/**
 * ============================================================================
 * VULPES CELARE - CLI LOGGER
 * ============================================================================
 *
 * Centralized logging for the Vulpes CLI. Writes to:
 *   ~/.vulpes/logs/vulpes-cli.log  (rolling, keeps last 5 files)
 *
 * Features:
 * - Automatic log rotation (max 5MB per file, 5 files max)
 * - Timestamps with ISO format
 * - Log levels: DEBUG, INFO, WARN, ERROR
 * - Pretty console output in verbose mode
 * - Session tracking
 *
 * Usage:
 *   import { logger } from '../utils/Logger';
 *   logger.info('Starting CLI', { backend: 'claude' });
 *   logger.error('MCP failed', { error: err.message });
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: Record<string, unknown>;
    sessionId: string;
}
export interface LoggerConfig {
    logDir?: string;
    maxFileSize?: number;
    maxFiles?: number;
    consoleOutput?: boolean;
    minLevel?: LogLevel;
}
declare class Logger {
    private config;
    private sessionId;
    private logFilePath;
    private initialized;
    constructor(config?: LoggerConfig);
    /**
     * Initialize the logger (create directories, etc.)
     */
    private ensureInitialized;
    /**
     * Generate a unique session ID
     */
    private generateSessionId;
    /**
     * Rotate logs if the current log file exceeds max size
     */
    private rotateLogsIfNeeded;
    /**
     * Format a log entry for file output
     */
    private formatForFile;
    /**
     * Format a log entry for console output
     */
    private formatForConsole;
    /**
     * Check if a log level should be output
     */
    private shouldLog;
    /**
     * Write a log entry
     */
    private log;
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    /**
     * Log an error with stack trace
     */
    exception(message: string, err: Error, data?: Record<string, unknown>): void;
    /**
     * Get the current session ID
     */
    getSessionId(): string;
    /**
     * Get the log file path
     */
    getLogFilePath(): string;
    /**
     * Enable/disable console output
     */
    setConsoleOutput(enabled: boolean): void;
    /**
     * Set minimum log level
     */
    setMinLevel(level: LogLevel): void;
    /**
     * Read recent log entries (for debugging)
     */
    getRecentLogs(lines?: number): string[];
    /**
     * Create a child logger with prefixed messages
     */
    child(prefix: string): ChildLogger;
}
declare class ChildLogger {
    private parent;
    private prefix;
    constructor(parent: Logger, prefix: string);
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    exception(message: string, err: Error, data?: Record<string, unknown>): void;
}
export declare const logger: Logger;
export { Logger, ChildLogger };
//# sourceMappingURL=Logger.d.ts.map