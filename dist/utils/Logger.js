"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChildLogger = exports.Logger = exports.logger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// ============================================================================
// CONSTANTS
// ============================================================================
const DEFAULT_LOG_DIR = path.join(os.homedir(), ".vulpes", "logs");
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_FILES = 5;
const LOG_FILE_NAME = "vulpes-cli.log";
const LEVEL_PRIORITY = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
};
const LEVEL_COLORS = {
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
    config;
    sessionId;
    logFilePath;
    initialized = false;
    constructor(config = {}) {
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
    ensureInitialized() {
        if (this.initialized)
            return;
        try {
            // Create log directory if needed
            if (!fs.existsSync(this.config.logDir)) {
                fs.mkdirSync(this.config.logDir, { recursive: true });
            }
            // Check if we need to rotate logs
            this.rotateLogsIfNeeded();
            this.initialized = true;
        }
        catch (err) {
            // If we can't write logs, just continue without them
            console.error(`[Logger] Failed to initialize: ${err.message}`);
        }
    }
    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const random = Math.random().toString(36).substring(2, 8);
        return `${dateStr}-${random}`;
    }
    /**
     * Rotate logs if the current log file exceeds max size
     */
    rotateLogsIfNeeded() {
        try {
            if (!fs.existsSync(this.logFilePath))
                return;
            const stats = fs.statSync(this.logFilePath);
            if (stats.size < this.config.maxFileSize)
                return;
            // Rotate existing log files
            for (let i = this.config.maxFiles - 1; i >= 1; i--) {
                const oldPath = path.join(this.config.logDir, `vulpes-cli.${i}.log`);
                const newPath = path.join(this.config.logDir, `vulpes-cli.${i + 1}.log`);
                if (fs.existsSync(oldPath)) {
                    if (i + 1 >= this.config.maxFiles) {
                        fs.unlinkSync(oldPath);
                    }
                    else {
                        fs.renameSync(oldPath, newPath);
                    }
                }
            }
            // Rename current log to .1
            fs.renameSync(this.logFilePath, path.join(this.config.logDir, "vulpes-cli.1.log"));
        }
        catch (err) {
            // Ignore rotation errors
        }
    }
    /**
     * Format a log entry for file output
     */
    formatForFile(entry) {
        const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
        return `[${entry.timestamp}] [${entry.level}] [${entry.sessionId}] ${entry.message}${dataStr}\n`;
    }
    /**
     * Format a log entry for console output
     */
    formatForConsole(entry) {
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
    shouldLog(level) {
        return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.config.minLevel];
    }
    /**
     * Write a log entry
     */
    log(level, message, data) {
        if (!this.shouldLog(level))
            return;
        this.ensureInitialized();
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            sessionId: this.sessionId,
        };
        // Write to file
        try {
            fs.appendFileSync(this.logFilePath, this.formatForFile(entry));
        }
        catch {
            // Ignore file write errors
        }
        // Write to console if enabled
        if (this.config.consoleOutput) {
            if (level === "ERROR") {
                console.error(this.formatForConsole(entry));
            }
            else {
                console.log(this.formatForConsole(entry));
            }
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════════════════════════════════
    debug(message, data) {
        this.log("DEBUG", message, data);
    }
    info(message, data) {
        this.log("INFO", message, data);
    }
    warn(message, data) {
        this.log("WARN", message, data);
    }
    error(message, data) {
        this.log("ERROR", message, data);
    }
    /**
     * Log an error with stack trace
     */
    exception(message, err, data) {
        this.log("ERROR", message, {
            ...data,
            error: err.message,
            stack: err.stack?.split("\n").slice(0, 10),
        });
    }
    /**
     * Get the current session ID
     */
    getSessionId() {
        return this.sessionId;
    }
    /**
     * Get the log file path
     */
    getLogFilePath() {
        return this.logFilePath;
    }
    /**
     * Enable/disable console output
     */
    setConsoleOutput(enabled) {
        this.config.consoleOutput = enabled;
    }
    /**
     * Set minimum log level
     */
    setMinLevel(level) {
        this.config.minLevel = level;
    }
    /**
     * Read recent log entries (for debugging)
     */
    getRecentLogs(lines = 50) {
        try {
            if (!fs.existsSync(this.logFilePath))
                return [];
            const content = fs.readFileSync(this.logFilePath, "utf-8");
            const allLines = content.trim().split("\n");
            return allLines.slice(-lines);
        }
        catch {
            return [];
        }
    }
    /**
     * Create a child logger with prefixed messages
     */
    child(prefix) {
        return new ChildLogger(this, prefix);
    }
}
exports.Logger = Logger;
// ============================================================================
// CHILD LOGGER (for component-specific logging)
// ============================================================================
class ChildLogger {
    parent;
    prefix;
    constructor(parent, prefix) {
        this.parent = parent;
        this.prefix = prefix;
    }
    debug(message, data) {
        this.parent.debug(`[${this.prefix}] ${message}`, data);
    }
    info(message, data) {
        this.parent.info(`[${this.prefix}] ${message}`, data);
    }
    warn(message, data) {
        this.parent.warn(`[${this.prefix}] ${message}`, data);
    }
    error(message, data) {
        this.parent.error(`[${this.prefix}] ${message}`, data);
    }
    exception(message, err, data) {
        this.parent.exception(`[${this.prefix}] ${message}`, err, data);
    }
}
exports.ChildLogger = ChildLogger;
// ============================================================================
// SINGLETON EXPORT
// ============================================================================
// Create a singleton logger instance
exports.logger = new Logger({
    consoleOutput: process.env.VULPES_VERBOSE === "1",
    minLevel: process.env.VULPES_DEBUG === "1" ? "DEBUG" : "INFO",
});
//# sourceMappingURL=Logger.js.map