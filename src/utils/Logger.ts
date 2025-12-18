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

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ============================================================================
// TYPES
// ============================================================================

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
  maxFileSize?: number; // bytes
  maxFiles?: number;
  consoleOutput?: boolean;
  minLevel?: LogLevel;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LOG_DIR = path.join(os.homedir(), ".vulpes", "logs");
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_FILES = 5;
const LOG_FILE_NAME = "vulpes-cli.log";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: "\x1b[36m", // Cyan
  INFO: "\x1b[32m", // Green
  WARN: "\x1b[33m", // Yellow
  ERROR: "\x1b[31m", // Red
};

const RESET = "\x1b[0m";

// ============================================================================
// LOGGER CLASS
// ============================================================================

class Logger {
  private config: Required<LoggerConfig>;
  private sessionId: string;
  private logFilePath: string;
  private initialized: boolean = false;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      logDir: config.logDir || DEFAULT_LOG_DIR,
      maxFileSize: config.maxFileSize || DEFAULT_MAX_FILE_SIZE,
      maxFiles: config.maxFiles || DEFAULT_MAX_FILES,
      consoleOutput: config.consoleOutput ?? false,
      minLevel: config.minLevel || "DEBUG",
    };

    // Generate unique session ID
    this.sessionId = this.generateSessionId();
    this.logFilePath = path.join(this.config.logDir, LOG_FILE_NAME);
  }

  /**
   * Initialize the logger (create directories, etc.)
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    try {
      // Create log directory if needed
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      }

      // Check if we need to rotate logs
      this.rotateLogsIfNeeded();

      this.initialized = true;
    } catch (err) {
      // If we can't write logs, just continue without them
      console.error(`[Logger] Failed to initialize: ${(err as Error).message}`);
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const random = Math.random().toString(36).substring(2, 8);
    return `${dateStr}-${random}`;
  }

  /**
   * Rotate logs if the current log file exceeds max size
   */
  private rotateLogsIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFilePath)) return;

      const stats = fs.statSync(this.logFilePath);
      if (stats.size < this.config.maxFileSize) return;

      // Rotate existing log files
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldPath = path.join(
          this.config.logDir,
          `vulpes-cli.${i}.log`
        );
        const newPath = path.join(
          this.config.logDir,
          `vulpes-cli.${i + 1}.log`
        );

        if (fs.existsSync(oldPath)) {
          if (i + 1 >= this.config.maxFiles) {
            fs.unlinkSync(oldPath);
          } else {
            fs.renameSync(oldPath, newPath);
          }
        }
      }

      // Rename current log to .1
      fs.renameSync(
        this.logFilePath,
        path.join(this.config.logDir, "vulpes-cli.1.log")
      );
    } catch (err) {
      // Ignore rotation errors
    }
  }

  /**
   * Format a log entry for file output
   */
  private formatForFile(entry: LogEntry): string {
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
    return `[${entry.timestamp}] [${entry.level}] [${entry.sessionId}] ${entry.message}${dataStr}\n`;
  }

  /**
   * Format a log entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const color = LEVEL_COLORS[entry.level];
    const time = entry.timestamp.split("T")[1].slice(0, 8);
    const dataStr = entry.data
      ? ` ${JSON.stringify(entry.data, null, 0)}`
      : "";
    return `${color}[${time}] [${entry.level}]${RESET} ${entry.message}${dataStr}`;
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.config.minLevel];
  }

  /**
   * Write a log entry
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    this.ensureInitialized();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      sessionId: this.sessionId,
    };

    // Write to file
    try {
      fs.appendFileSync(this.logFilePath, this.formatForFile(entry));
    } catch {
      // Ignore file write errors
    }

    // Write to console if enabled
    if (this.config.consoleOutput) {
      if (level === "ERROR") {
        console.error(this.formatForConsole(entry));
      } else {
        console.log(this.formatForConsole(entry));
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════════════════

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("DEBUG", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("INFO", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("WARN", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("ERROR", message, data);
  }

  /**
   * Log an error with stack trace
   */
  exception(message: string, err: Error, data?: Record<string, unknown>): void {
    this.log("ERROR", message, {
      ...data,
      error: err.message,
      stack: err.stack?.split("\n").slice(0, 10),
    });
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Enable/disable console output
   */
  setConsoleOutput(enabled: boolean): void {
    this.config.consoleOutput = enabled;
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  /**
   * Read recent log entries (for debugging)
   */
  getRecentLogs(lines: number = 50): string[] {
    try {
      if (!fs.existsSync(this.logFilePath)) return [];
      const content = fs.readFileSync(this.logFilePath, "utf-8");
      const allLines = content.trim().split("\n");
      return allLines.slice(-lines);
    } catch {
      return [];
    }
  }

  /**
   * Create a child logger with prefixed messages
   */
  child(prefix: string): ChildLogger {
    return new ChildLogger(this, prefix);
  }
}

// ============================================================================
// CHILD LOGGER (for component-specific logging)
// ============================================================================

class ChildLogger {
  constructor(
    private parent: Logger,
    private prefix: string
  ) {}

  debug(message: string, data?: Record<string, unknown>): void {
    this.parent.debug(`[${this.prefix}] ${message}`, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.parent.info(`[${this.prefix}] ${message}`, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.parent.warn(`[${this.prefix}] ${message}`, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.parent.error(`[${this.prefix}] ${message}`, data);
  }

  exception(message: string, err: Error, data?: Record<string, unknown>): void {
    this.parent.exception(`[${this.prefix}] ${message}`, err, data);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

// Create a singleton logger instance
export const logger = new Logger({
  consoleOutput: process.env.VULPES_VERBOSE === "1",
  minLevel: process.env.VULPES_DEBUG === "1" ? "DEBUG" : "INFO",
});

// Also export the class for custom instances
export { Logger, ChildLogger };
