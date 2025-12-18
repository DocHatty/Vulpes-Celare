"use strict";
/**
 * ============================================================================
 * VULPES CELARE - DIAGNOSTIC LOGGING SYSTEM
 * ============================================================================
 *
 * IMPORTANT DISTINCTION:
 * ----------------------
 * - VulpesLogger: Diagnostic/debug logging (errors, warnings, trace info)
 * - VulpesOutput: User-facing terminal output (menus, prompts, results)
 *
 * USE VulpesLogger WHEN:
 * - Recording diagnostic information for debugging
 * - Logging errors, warnings, exceptions
 * - Trace/debug output for developers
 * - Machine-parseable structured logs
 * - Performance metrics and timing
 * - Filter execution results
 *
 * USE VulpesOutput (from './VulpesOutput') WHEN:
 * - Displaying information TO the user
 * - Showing command results, help text, menus
 * - Interactive prompts and responses
 * - Progress indicators the user should see
 *
 * Features:
 * - Dual-mode: Human (rich TUI) / Machine (JSON/logfmt)
 * - PHI-type semantic coloring
 * - Context propagation with child loggers
 * - Performance timing built-in
 * - Non-blocking file transport
 * - Auto-detect TTY vs pipe
 * - NO_COLOR / FORCE_COLOR support
 * - Correlation IDs for tracing
 *
 * Inspired by: Pino, Charm Log, Ink
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
exports.LegacyLoggerAdapter = exports.FileTransport = exports.ConsoleTransport = exports.vulpesLogger = exports.VulpesLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const theme_1 = require("../theme");
const icons_1 = require("../theme/icons");
// ============================================================================
// CONSTANTS
// ============================================================================
const LEVEL_PRIORITY = {
    trace: 0,
    debug: 10,
    info: 20,
    success: 25,
    warn: 30,
    error: 40,
    fatal: 50,
};
const LEVEL_ICONS = {
    trace: "·",
    debug: "○",
    info: icons_1.status.info || "●",
    success: icons_1.status.success || "✓",
    warn: icons_1.status.warning || "⚠",
    error: icons_1.status.error || "✗",
    fatal: "☠",
};
const LEVEL_LABELS = {
    trace: "TRACE",
    debug: "DEBUG",
    info: "INFO",
    success: "SUCCESS",
    warn: "WARN",
    error: "ERROR",
    fatal: "FATAL",
};
// PHI type colors for semantic highlighting
const PHI_TYPE_STYLES = {
    NAME: (t) => theme_1.theme.phi?.name?.(t) ?? theme_1.theme.warning(t),
    SSN: (t) => theme_1.theme.phi?.ssn?.(t) ?? theme_1.theme.error(t),
    DATE: (t) => theme_1.theme.phi?.date?.(t) ?? theme_1.theme.info(t),
    PHONE: (t) => theme_1.theme.phi?.phone?.(t) ?? theme_1.theme.secondary(t),
    EMAIL: (t) => theme_1.theme.phi?.email?.(t) ?? theme_1.theme.primary(t),
    ADDRESS: (t) => theme_1.theme.phi?.address?.(t) ?? theme_1.theme.muted(t),
    MRN: (t) => theme_1.theme.phi?.mrn?.(t) ?? theme_1.theme.accent(t),
    DEFAULT: (t) => theme_1.theme.muted(t),
};
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function generateSessionId() {
    const now = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${now.toString(36)}-${random}`;
}
function detectColorSupport() {
    // Respect NO_COLOR standard
    if (process.env.NO_COLOR !== undefined)
        return false;
    // Respect FORCE_COLOR
    if (process.env.FORCE_COLOR !== undefined)
        return true;
    // Check if stdout is TTY
    return process.stdout.isTTY === true;
}
function detectOutputFormat() {
    // If piped, use JSON for machine parsing
    if (!process.stdout.isTTY)
        return "json";
    // If VULPES_FORMAT is set, use it
    if (process.env.VULPES_FORMAT) {
        return process.env.VULPES_FORMAT;
    }
    return "human";
}
function formatDuration(ms) {
    if (ms < 1)
        return `${(ms * 1000).toFixed(0)}µs`;
    if (ms < 1000)
        return `${ms.toFixed(0)}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
}
function formatTimestamp(ts, colors) {
    const date = new Date(ts);
    const time = date.toISOString().slice(11, 23); // HH:mm:ss.sss
    return colors ? theme_1.theme.muted(time) : time;
}
// ============================================================================
// FORMATTERS
// ============================================================================
/**
 * Human-readable format with colors and icons
 */
function formatHuman(entry, colors) {
    const { level, message, timestamp, context } = entry;
    const parts = [];
    // Timestamp
    parts.push(formatTimestamp(timestamp, colors));
    // Level with icon
    const icon = LEVEL_ICONS[level];
    const levelStr = `${icon} ${LEVEL_LABELS[level].padEnd(7)}`;
    if (colors) {
        const colorFn = getLevelColorFn(level);
        parts.push(colorFn(levelStr));
    }
    else {
        parts.push(levelStr);
    }
    // Component prefix
    if (context.component) {
        const comp = `[${context.component}]`;
        parts.push(colors ? theme_1.theme.secondary(comp) : comp);
    }
    // Message
    parts.push(message);
    // Context fields
    const contextFields = formatContextFields(context, colors);
    if (contextFields) {
        parts.push(contextFields);
    }
    // Duration (special treatment)
    if (context.durationMs !== undefined) {
        const dur = formatDuration(context.durationMs);
        parts.push(colors ? theme_1.theme.muted(`(${dur})`) : `(${dur})`);
    }
    return parts.join(" ");
}
/**
 * JSON format for machine parsing (like Pino)
 */
function formatJSON(entry) {
    return JSON.stringify({
        level: LEVEL_PRIORITY[entry.level],
        levelName: entry.level,
        time: entry.timestamp,
        msg: entry.message,
        sessionId: entry.sessionId,
        ...entry.context,
    });
}
/**
 * Logfmt format for structured logging
 */
function formatLogfmt(entry) {
    const parts = [
        `time=${new Date(entry.timestamp).toISOString()}`,
        `level=${entry.level}`,
        `msg="${escapeLogfmt(entry.message)}"`,
        `session=${entry.sessionId}`,
    ];
    for (const [key, value] of Object.entries(entry.context)) {
        if (value !== undefined) {
            const strValue = typeof value === "string" ? `"${escapeLogfmt(value)}"` : String(value);
            parts.push(`${key}=${strValue}`);
        }
    }
    return parts.join(" ");
}
/**
 * Minimal format - just message and level indicator
 */
function formatMinimal(entry, colors) {
    const icon = LEVEL_ICONS[entry.level];
    if (colors) {
        return `${getLevelColorFn(entry.level)(icon)} ${entry.message}`;
    }
    return `${icon} ${entry.message}`;
}
function escapeLogfmt(str) {
    return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
function getLevelColorFn(level) {
    switch (level) {
        case "trace":
            return theme_1.theme.muted;
        case "debug":
            return theme_1.theme.muted;
        case "info":
            return theme_1.theme.info;
        case "success":
            return theme_1.theme.success;
        case "warn":
            return theme_1.theme.warning;
        case "error":
            return theme_1.theme.error;
        case "fatal":
            return (t) => theme_1.theme.error.bold(t);
        default:
            return theme_1.theme.muted;
    }
}
function formatContextFields(context, colors) {
    const skipKeys = new Set(["correlationId", "component", "durationMs", "sessionId"]);
    const fields = [];
    for (const [key, value] of Object.entries(context)) {
        if (skipKeys.has(key) || value === undefined)
            continue;
        let formattedValue;
        if (typeof value === "object") {
            formattedValue = JSON.stringify(value);
        }
        else {
            formattedValue = String(value);
        }
        // PHI type gets special coloring
        if (key === "phiType" && colors) {
            const styleFn = PHI_TYPE_STYLES[formattedValue] || PHI_TYPE_STYLES.DEFAULT;
            fields.push(`${theme_1.theme.muted(key + "=")}${styleFn(formattedValue)}`);
        }
        else if (colors) {
            fields.push(`${theme_1.theme.muted(key + "=")}${theme_1.theme.secondary(formattedValue)}`);
        }
        else {
            fields.push(`${key}=${formattedValue}`);
        }
    }
    return fields.join(" ");
}
// ============================================================================
// TRANSPORTS
// ============================================================================
/**
 * Console transport with format detection
 */
class ConsoleTransport {
    name = "console";
    format;
    colors;
    constructor(format, colors) {
        this.format = format ?? detectOutputFormat();
        this.colors = colors ?? detectColorSupport();
    }
    write(entry) {
        let output;
        switch (this.format) {
            case "json":
                output = formatJSON(entry);
                break;
            case "logfmt":
                output = formatLogfmt(entry);
                break;
            case "minimal":
                output = formatMinimal(entry, this.colors);
                break;
            case "human":
            default:
                output = formatHuman(entry, this.colors);
        }
        if (entry.level === "error" || entry.level === "fatal") {
            process.stderr.write(output + "\n");
        }
        else {
            process.stdout.write(output + "\n");
        }
    }
}
exports.ConsoleTransport = ConsoleTransport;
/**
 * File transport with rotation
 */
class FileTransport {
    name = "file";
    filePath;
    maxSize;
    maxFiles;
    buffer = [];
    flushTimeout = null;
    constructor(filePath, options = {}) {
        this.filePath = filePath;
        this.maxSize = options.maxSize ?? 5 * 1024 * 1024; // 5MB
        this.maxFiles = options.maxFiles ?? 5;
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    write(entry) {
        const line = formatJSON(entry);
        this.buffer.push(line);
        // Debounced flush for performance
        if (!this.flushTimeout) {
            this.flushTimeout = setTimeout(() => this.flush(), 100);
        }
    }
    flush() {
        if (this.buffer.length === 0)
            return;
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = null;
        }
        try {
            // Check rotation
            this.rotateIfNeeded();
            // Write buffered entries
            const content = this.buffer.join("\n") + "\n";
            fs.appendFileSync(this.filePath, content);
            this.buffer = [];
        }
        catch (err) {
            // Silently fail - logging shouldn't crash the app
        }
    }
    rotateIfNeeded() {
        if (!fs.existsSync(this.filePath))
            return;
        const stats = fs.statSync(this.filePath);
        if (stats.size < this.maxSize)
            return;
        // Rotate files
        for (let i = this.maxFiles - 1; i >= 1; i--) {
            const oldPath = this.filePath.replace(".log", `.${i}.log`);
            const newPath = this.filePath.replace(".log", `.${i + 1}.log`);
            if (fs.existsSync(oldPath)) {
                if (i + 1 >= this.maxFiles) {
                    fs.unlinkSync(oldPath);
                }
                else {
                    fs.renameSync(oldPath, newPath);
                }
            }
        }
        fs.renameSync(this.filePath, this.filePath.replace(".log", ".1.log"));
    }
    close() {
        this.flush();
    }
}
exports.FileTransport = FileTransport;
// ============================================================================
// VULPES LOGGER CLASS
// ============================================================================
class VulpesLogger {
    level;
    format;
    context;
    transports;
    sessionId;
    colors;
    timestamps;
    constructor(config = {}) {
        this.level = config.level ?? "info";
        this.format = config.format ?? detectOutputFormat();
        this.context = config.context ?? {};
        this.sessionId = config.sessionId ?? generateSessionId();
        this.colors = config.colors ?? detectColorSupport();
        this.timestamps = config.timestamps ?? true;
        // Default transports
        this.transports = config.transports ?? [
            new ConsoleTransport(this.format, this.colors),
        ];
    }
    // ══════════════════════════════════════════════════════════════════════════
    // LOGGING METHODS
    // ══════════════════════════════════════════════════════════════════════════
    trace(message, context) {
        this.log("trace", message, context);
    }
    debug(message, context) {
        this.log("debug", message, context);
    }
    info(message, context) {
        this.log("info", message, context);
    }
    success(message, context) {
        this.log("success", message, context);
    }
    warn(message, context) {
        this.log("warn", message, context);
    }
    error(message, context) {
        this.log("error", message, context);
    }
    fatal(message, context) {
        this.log("fatal", message, context);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // SPECIALIZED LOGGING
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Log a filter result
     */
    filter(filterName, spans, durationMs, status = "ok") {
        const icon = status === "ok" ? icons_1.status.success : icons_1.status.error;
        const level = status === "ok" ? "debug" : "warn";
        this.log(level, `${icon} [${filterName}] ${spans} spans`, {
            filter: filterName,
            spans,
            durationMs,
            status,
        });
    }
    /**
     * Log a PHI detection
     */
    phi(phiType, text, confidence, context) {
        const styleFn = PHI_TYPE_STYLES[phiType] || PHI_TYPE_STYLES.DEFAULT;
        const confStr = `${(confidence * 100).toFixed(0)}%`;
        this.log("debug", `Detected ${styleFn(phiType)}: "${text}" (${confStr})`, {
            ...context,
            phiType,
            confidence,
        });
    }
    /**
     * Log a redaction
     */
    redaction(original, redacted, phiType) {
        const arrow = this.colors ? theme_1.theme.muted(icons_1.arrows.right) : "->";
        this.log("debug", `${original} ${arrow} ${redacted}`, {
            phiType,
            originalLength: original.length,
        });
    }
    /**
     * Log with timing
     */
    timed(label, fn, context) {
        const start = performance.now();
        try {
            const result = fn();
            const durationMs = performance.now() - start;
            this.log("debug", label, { ...context, durationMs });
            return result;
        }
        catch (err) {
            const durationMs = performance.now() - start;
            this.log("error", `${label} failed`, {
                ...context,
                durationMs,
                error: err.message,
            });
            throw err;
        }
    }
    /**
     * Log with async timing
     */
    async timedAsync(label, fn, context) {
        const start = performance.now();
        try {
            const result = await fn();
            const durationMs = performance.now() - start;
            this.log("debug", label, { ...context, durationMs });
            return result;
        }
        catch (err) {
            const durationMs = performance.now() - start;
            this.log("error", `${label} failed`, {
                ...context,
                durationMs,
                error: err.message,
            });
            throw err;
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CHILD LOGGERS
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Create a child logger with inherited context
     */
    child(context) {
        const child = new VulpesLogger({
            level: this.level,
            format: this.format,
            context: { ...this.context, ...context },
            sessionId: this.sessionId,
            colors: this.colors,
            timestamps: this.timestamps,
            transports: this.transports,
        });
        return child;
    }
    /**
     * Create a child logger for a component
     */
    forComponent(name) {
        return this.child({ component: name });
    }
    /**
     * Create a child logger for a filter
     */
    forFilter(filterName) {
        return this.child({ component: "FILTER", filter: filterName });
    }
    /**
     * Create a child logger for a document
     */
    forDocument(documentId) {
        return this.child({ documentId });
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ══════════════════════════════════════════════════════════════════════════
    setLevel(level) {
        this.level = level;
    }
    setFormat(format) {
        this.format = format;
        // Update console transport
        for (const transport of this.transports) {
            if (transport instanceof ConsoleTransport) {
                this.transports = this.transports.filter((t) => t !== transport);
                this.transports.push(new ConsoleTransport(format, this.colors));
                break;
            }
        }
    }
    addTransport(transport) {
        this.transports.push(transport);
    }
    getSessionId() {
        return this.sessionId;
    }
    // ══════════════════════════════════════════════════════════════════════════
    // INTERNAL
    // ══════════════════════════════════════════════════════════════════════════
    log(level, message, context) {
        if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level])
            return;
        const entry = {
            level,
            message,
            timestamp: Date.now(),
            context: { ...this.context, ...context },
            sessionId: this.sessionId,
        };
        for (const transport of this.transports) {
            try {
                transport.write(entry);
            }
            catch {
                // Never let logging crash the app
            }
        }
    }
    /**
     * Flush all transports
     */
    flush() {
        for (const transport of this.transports) {
            transport.flush?.();
        }
    }
    /**
     * Close all transports
     */
    close() {
        for (const transport of this.transports) {
            transport.close?.();
        }
    }
}
exports.VulpesLogger = VulpesLogger;
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
const DEFAULT_LOG_DIR = path.join(os.homedir(), ".vulpes", "logs");
const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, "vulpes.log");
// Create the default logger with console + file transports
exports.vulpesLogger = new VulpesLogger({
    level: process.env.VULPES_LOG_LEVEL ?? "info",
    transports: [
        new ConsoleTransport(),
        new FileTransport(DEFAULT_LOG_FILE),
    ],
});
// ============================================================================
// COMPATIBILITY LAYER (for gradual migration)
// ============================================================================
/**
 * Drop-in replacement for the old logger
 * Maps old API to new VulpesLogger API
 */
class LegacyLoggerAdapter {
    logger;
    constructor(logger = exports.vulpesLogger) {
        this.logger = logger;
    }
    debug(message, data) {
        this.logger.debug(message, data);
    }
    info(message, data) {
        this.logger.info(message, data);
    }
    warn(message, data) {
        this.logger.warn(message, data);
    }
    error(message, data) {
        this.logger.error(message, data);
    }
    exception(message, err, data) {
        this.logger.error(message, {
            ...data,
            error: err.message,
            stack: err.stack?.split("\n").slice(0, 10),
        });
    }
    getSessionId() {
        return this.logger.getSessionId();
    }
    setConsoleOutput(_enabled) {
        // No-op, console is always enabled in new logger
    }
    setMinLevel(level) {
        this.logger.setLevel(level.toLowerCase());
    }
    child(prefix) {
        return new LegacyLoggerAdapter(this.logger.forComponent(prefix));
    }
}
exports.LegacyLoggerAdapter = LegacyLoggerAdapter;
//# sourceMappingURL=VulpesLogger.js.map