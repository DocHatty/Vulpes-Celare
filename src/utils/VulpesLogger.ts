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

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { theme } from "../theme";
import { status as statusIcons, arrows } from "../theme/icons";

// Lazy import to avoid circular dependency
let tracerInstance: { getLogContext(): { traceId: string; spanId: string } | null } | null = null;

/**
 * Get the VulpesTracer instance lazily to avoid circular dependency
 */
function getTracer(): { getLogContext(): { traceId: string; spanId: string } | null } | null {
  if (tracerInstance === null) {
    try {
      // Dynamic require to break circular dependency
      const { vulpesTracer } = require("../observability/VulpesTracer");
      tracerInstance = vulpesTracer;
    } catch {
      // Tracer not available (e.g., during early initialization)
      tracerInstance = undefined as any;
    }
  }
  return tracerInstance || null;
}

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = "trace" | "debug" | "info" | "success" | "warn" | "error" | "fatal";

export type OutputFormat = "human" | "json" | "logfmt" | "minimal";

export interface LogContext {
  [key: string]: unknown;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** OpenTelemetry trace ID (auto-injected from VulpesTracer) */
  traceId?: string;
  /** OpenTelemetry span ID (auto-injected from VulpesTracer) */
  spanId?: string;
  /** Component/module name */
  component?: string;
  /** PHI type being processed */
  phiType?: string;
  /** Document ID */
  documentId?: string;
  /** Filter name */
  filter?: string;
  /** Duration in ms */
  durationMs?: number;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context: LogContext;
  sessionId: string;
}

export interface Transport {
  name: string;
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

export interface VulpesLoggerConfig {
  /** Minimum log level */
  level?: LogLevel;
  /** Output format: human (pretty), json, logfmt, minimal */
  format?: OutputFormat;
  /** Base context added to all logs */
  context?: LogContext;
  /** Enable timestamps */
  timestamps?: boolean;
  /** Enable colors (auto-detected) */
  colors?: boolean;
  /** Custom transports */
  transports?: Transport[];
  /** Session ID (auto-generated if not provided) */
  sessionId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 10,
  info: 20,
  success: 25,
  warn: 30,
  error: 40,
  fatal: 50,
};

const LEVEL_ICONS: Record<LogLevel, string> = {
  trace: "·",
  debug: "○",
  info: statusIcons.info || "●",
  success: statusIcons.success || "✓",
  warn: statusIcons.warning || "⚠",
  error: statusIcons.error || "✗",
  fatal: "☠",
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  trace: "TRACE",
  debug: "DEBUG",
  info: "INFO",
  success: "SUCCESS",
  warn: "WARN",
  error: "ERROR",
  fatal: "FATAL",
};

// PHI type colors for semantic highlighting
const PHI_TYPE_STYLES: Record<string, (text: string) => string> = {
  NAME: (t) => theme.phi?.name?.(t) ?? theme.warning(t),
  SSN: (t) => theme.phi?.ssn?.(t) ?? theme.error(t),
  DATE: (t) => theme.phi?.date?.(t) ?? theme.info(t),
  PHONE: (t) => theme.phi?.phone?.(t) ?? theme.secondary(t),
  EMAIL: (t) => theme.phi?.email?.(t) ?? theme.primary(t),
  ADDRESS: (t) => theme.phi?.address?.(t) ?? theme.muted(t),
  MRN: (t) => theme.phi?.mrn?.(t) ?? theme.accent(t),
  DEFAULT: (t) => theme.muted(t),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateSessionId(): string {
  const now = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${now.toString(36)}-${random}`;
}

function detectColorSupport(): boolean {
  // Respect NO_COLOR standard
  if (process.env.NO_COLOR !== undefined) return false;
  // Respect FORCE_COLOR
  if (process.env.FORCE_COLOR !== undefined) return true;
  // Check if stdout is TTY
  return process.stdout.isTTY === true;
}

function detectOutputFormat(): OutputFormat {
  // If piped, use JSON for machine parsing
  if (!process.stdout.isTTY) return "json";
  // If VULPES_FORMAT is set, use it
  if (process.env.VULPES_FORMAT) {
    return process.env.VULPES_FORMAT as OutputFormat;
  }
  return "human";
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

function formatTimestamp(ts: number, colors: boolean): string {
  const date = new Date(ts);
  const time = date.toISOString().slice(11, 23); // HH:mm:ss.sss
  return colors ? theme.muted(time) : time;
}

// ============================================================================
// FORMATTERS
// ============================================================================

/**
 * Human-readable format with colors and icons
 */
function formatHuman(entry: LogEntry, colors: boolean): string {
  const { level, message, timestamp, context } = entry;
  const parts: string[] = [];

  // Timestamp
  parts.push(formatTimestamp(timestamp, colors));

  // Level with icon
  const icon = LEVEL_ICONS[level];
  const levelStr = `${icon} ${LEVEL_LABELS[level].padEnd(7)}`;
  if (colors) {
    const colorFn = getLevelColorFn(level);
    parts.push(colorFn(levelStr));
  } else {
    parts.push(levelStr);
  }

  // Component prefix
  if (context.component) {
    const comp = `[${context.component}]`;
    parts.push(colors ? theme.secondary(comp) : comp);
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
    parts.push(colors ? theme.muted(`(${dur})`) : `(${dur})`);
  }

  return parts.join(" ");
}

/**
 * JSON format for machine parsing (like Pino)
 */
function formatJSON(entry: LogEntry): string {
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
function formatLogfmt(entry: LogEntry): string {
  const parts: string[] = [
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
function formatMinimal(entry: LogEntry, colors: boolean): string {
  const icon = LEVEL_ICONS[entry.level];
  if (colors) {
    return `${getLevelColorFn(entry.level)(icon)} ${entry.message}`;
  }
  return `${icon} ${entry.message}`;
}

function escapeLogfmt(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function getLevelColorFn(level: LogLevel): (text: string) => string {
  switch (level) {
    case "trace":
      return theme.muted;
    case "debug":
      return theme.muted;
    case "info":
      return theme.info;
    case "success":
      return theme.success;
    case "warn":
      return theme.warning;
    case "error":
      return theme.error;
    case "fatal":
      return (t) => theme.error.bold(t);
    default:
      return theme.muted;
  }
}

function formatContextFields(context: LogContext, colors: boolean): string {
  const skipKeys = new Set(["correlationId", "component", "durationMs", "sessionId"]);
  const fields: string[] = [];

  for (const [key, value] of Object.entries(context)) {
    if (skipKeys.has(key) || value === undefined) continue;

    let formattedValue: string;
    if (typeof value === "object") {
      formattedValue = JSON.stringify(value);
    } else {
      formattedValue = String(value);
    }

    // PHI type gets special coloring
    if (key === "phiType" && colors) {
      const styleFn = PHI_TYPE_STYLES[formattedValue] || PHI_TYPE_STYLES.DEFAULT;
      fields.push(`${theme.muted(key + "=")}${styleFn(formattedValue)}`);
    } else if (colors) {
      fields.push(`${theme.muted(key + "=")}${theme.secondary(formattedValue)}`);
    } else {
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
class ConsoleTransport implements Transport {
  name = "console";
  private format: OutputFormat;
  private colors: boolean;

  constructor(format?: OutputFormat, colors?: boolean) {
    this.format = format ?? detectOutputFormat();
    this.colors = colors ?? detectColorSupport();
  }

  write(entry: LogEntry): void {
    let output: string;
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
    } else {
      process.stdout.write(output + "\n");
    }
  }
}

/**
 * File transport with rotation
 */
class FileTransport implements Transport {
  name = "file";
  private filePath: string;
  private maxSize: number;
  private maxFiles: number;
  private buffer: string[] = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  constructor(
    filePath: string,
    options: { maxSize?: number; maxFiles?: number } = {}
  ) {
    this.filePath = filePath;
    this.maxSize = options.maxSize ?? 5 * 1024 * 1024; // 5MB
    this.maxFiles = options.maxFiles ?? 5;

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  write(entry: LogEntry): void {
    const line = formatJSON(entry);
    this.buffer.push(line);

    // Debounced flush for performance
    if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flush(), 100);
    }
  }

  flush(): void {
    if (this.buffer.length === 0) return;
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
    } catch (err) {
      // Silently fail - logging shouldn't crash the app
    }
  }

  private rotateIfNeeded(): void {
    if (!fs.existsSync(this.filePath)) return;

    const stats = fs.statSync(this.filePath);
    if (stats.size < this.maxSize) return;

    // Rotate files
    for (let i = this.maxFiles - 1; i >= 1; i--) {
      const oldPath = this.filePath.replace(".log", `.${i}.log`);
      const newPath = this.filePath.replace(".log", `.${i + 1}.log`);

      if (fs.existsSync(oldPath)) {
        if (i + 1 >= this.maxFiles) {
          fs.unlinkSync(oldPath);
        } else {
          fs.renameSync(oldPath, newPath);
        }
      }
    }

    fs.renameSync(this.filePath, this.filePath.replace(".log", ".1.log"));
  }

  close(): void {
    this.flush();
  }
}

// ============================================================================
// VULPES LOGGER CLASS
// ============================================================================

export class VulpesLogger {
  private level: LogLevel;
  private format: OutputFormat;
  private context: LogContext;
  private transports: Transport[];
  private sessionId: string;
  private colors: boolean;
  private timestamps: boolean;

  constructor(config: VulpesLoggerConfig = {}) {
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

  trace(message: string, context?: LogContext): void {
    this.log("trace", message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  success(message: string, context?: LogContext): void {
    this.log("success", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  fatal(message: string, context?: LogContext): void {
    this.log("fatal", message, context);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SPECIALIZED LOGGING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Log a filter result
   */
  filter(filterName: string, spans: number, durationMs: number, status: "ok" | "error" = "ok"): void {
    const icon = status === "ok" ? statusIcons.success : statusIcons.error;
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
  phi(phiType: string, text: string, confidence: number, context?: LogContext): void {
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
  redaction(original: string, redacted: string, phiType: string): void {
    const arrow = this.colors ? theme.muted(arrows.right) : "->";
    this.log("debug", `${original} ${arrow} ${redacted}`, {
      phiType,
      originalLength: original.length,
    });
  }

  /**
   * Log with timing
   */
  timed<T>(label: string, fn: () => T, context?: LogContext): T {
    const start = performance.now();
    try {
      const result = fn();
      const durationMs = performance.now() - start;
      this.log("debug", label, { ...context, durationMs });
      return result;
    } catch (err) {
      const durationMs = performance.now() - start;
      this.log("error", `${label} failed`, {
        ...context,
        durationMs,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  /**
   * Log with async timing
   */
  async timedAsync<T>(label: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = performance.now() - start;
      this.log("debug", label, { ...context, durationMs });
      return result;
    } catch (err) {
      const durationMs = performance.now() - start;
      this.log("error", `${label} failed`, {
        ...context,
        durationMs,
        error: (err as Error).message,
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
  child(context: LogContext): VulpesLogger {
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
  forComponent(name: string): VulpesLogger {
    return this.child({ component: name });
  }

  /**
   * Create a child logger for a filter
   */
  forFilter(filterName: string): VulpesLogger {
    return this.child({ component: "FILTER", filter: filterName });
  }

  /**
   * Create a child logger for a document
   */
  forDocument(documentId: string): VulpesLogger {
    return this.child({ documentId });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ══════════════════════════════════════════════════════════════════════════

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setFormat(format: OutputFormat): void {
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

  addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INTERNAL
  // ══════════════════════════════════════════════════════════════════════════

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level]) return;

    // Automatically inject trace context for log-trace correlation
    let traceContext: { traceId?: string; spanId?: string } = {};
    const tracer = getTracer();
    if (tracer) {
      const logContext = tracer.getLogContext();
      if (logContext) {
        traceContext = {
          traceId: logContext.traceId,
          spanId: logContext.spanId,
        };
      }
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context: { ...this.context, ...traceContext, ...context },
      sessionId: this.sessionId,
    };

    for (const transport of this.transports) {
      try {
        transport.write(entry);
      } catch {
        // Never let logging crash the app
      }
    }
  }

  /**
   * Flush all transports
   */
  flush(): void {
    for (const transport of this.transports) {
      transport.flush?.();
    }
  }

  /**
   * Close all transports
   */
  close(): void {
    for (const transport of this.transports) {
      transport.close?.();
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const DEFAULT_LOG_DIR = path.join(os.homedir(), ".vulpes", "logs");
const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, "vulpes.log");

// Create the default logger with console + file transports
export const vulpesLogger = new VulpesLogger({
  level: (process.env.VULPES_LOG_LEVEL as LogLevel) ?? "info",
  transports: [
    new ConsoleTransport(),
    new FileTransport(DEFAULT_LOG_FILE),
  ],
});

// Export transports for custom use
export { ConsoleTransport, FileTransport };

// ============================================================================
// COMPATIBILITY LAYER (for gradual migration)
// ============================================================================

/**
 * Drop-in replacement for the old logger
 * Maps old API to new VulpesLogger API
 */
export class LegacyLoggerAdapter {
  private logger: VulpesLogger;

  constructor(logger: VulpesLogger = vulpesLogger) {
    this.logger = logger;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.logger.error(message, data);
  }

  exception(message: string, err: Error, data?: Record<string, unknown>): void {
    this.logger.error(message, {
      ...data,
      error: err.message,
      stack: err.stack?.split("\n").slice(0, 10),
    });
  }

  getSessionId(): string {
    return this.logger.getSessionId();
  }

  setConsoleOutput(_enabled: boolean): void {
    // No-op, console is always enabled in new logger
  }

  setMinLevel(level: "DEBUG" | "INFO" | "WARN" | "ERROR"): void {
    this.logger.setLevel(level.toLowerCase() as LogLevel);
  }

  child(prefix: string): LegacyLoggerAdapter {
    return new LegacyLoggerAdapter(this.logger.forComponent(prefix));
  }
}
