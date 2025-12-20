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
/**
 * Console transport with format detection
 */
declare class ConsoleTransport implements Transport {
    name: string;
    private format;
    private colors;
    constructor(format?: OutputFormat, colors?: boolean);
    write(entry: LogEntry): void;
}
/**
 * File transport with rotation
 */
declare class FileTransport implements Transport {
    name: string;
    private filePath;
    private maxSize;
    private maxFiles;
    private buffer;
    private flushTimeout;
    constructor(filePath: string, options?: {
        maxSize?: number;
        maxFiles?: number;
    });
    write(entry: LogEntry): void;
    flush(): void;
    private rotateIfNeeded;
    close(): void;
}
export declare class VulpesLogger {
    private level;
    private format;
    private context;
    private transports;
    private sessionId;
    private colors;
    private timestamps;
    constructor(config?: VulpesLoggerConfig);
    trace(message: string, context?: LogContext): void;
    debug(message: string, context?: LogContext): void;
    info(message: string, context?: LogContext): void;
    success(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
    fatal(message: string, context?: LogContext): void;
    /**
     * Log a filter result
     */
    filter(filterName: string, spans: number, durationMs: number, status?: "ok" | "error"): void;
    /**
     * Log a PHI detection
     */
    phi(phiType: string, text: string, confidence: number, context?: LogContext): void;
    /**
     * Log a redaction
     */
    redaction(original: string, redacted: string, phiType: string): void;
    /**
     * Log with timing
     */
    timed<T>(label: string, fn: () => T, context?: LogContext): T;
    /**
     * Log with async timing
     */
    timedAsync<T>(label: string, fn: () => Promise<T>, context?: LogContext): Promise<T>;
    /**
     * Create a child logger with inherited context
     */
    child(context: LogContext): VulpesLogger;
    /**
     * Create a child logger for a component
     */
    forComponent(name: string): VulpesLogger;
    /**
     * Create a child logger for a filter
     */
    forFilter(filterName: string): VulpesLogger;
    /**
     * Create a child logger for a document
     */
    forDocument(documentId: string): VulpesLogger;
    setLevel(level: LogLevel): void;
    setFormat(format: OutputFormat): void;
    addTransport(transport: Transport): void;
    getSessionId(): string;
    private log;
    /**
     * Flush all transports
     */
    flush(): void;
    /**
     * Close all transports
     */
    close(): void;
}
export declare const vulpesLogger: VulpesLogger;
export { ConsoleTransport, FileTransport };
/**
 * Drop-in replacement for the old logger
 * Maps old API to new VulpesLogger API
 */
export declare class LegacyLoggerAdapter {
    private logger;
    constructor(logger?: VulpesLogger);
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    exception(message: string, err: Error, data?: Record<string, unknown>): void;
    getSessionId(): string;
    setConsoleOutput(_enabled: boolean): void;
    setMinLevel(level: "DEBUG" | "INFO" | "WARN" | "ERROR"): void;
    child(prefix: string): LegacyLoggerAdapter;
}
//# sourceMappingURL=VulpesLogger.d.ts.map