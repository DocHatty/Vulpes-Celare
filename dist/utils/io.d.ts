/**
 * ============================================================================
 * VULPES CELARE - I/O UTILITIES
 * ============================================================================
 *
 * Central export for all input/output utilities.
 *
 * QUICK REFERENCE:
 * ----------------
 * - `out.*`    → User-facing output (what the user sees)
 * - `log.*`    → Diagnostic logging (for debugging/monitoring)
 *
 * EXAMPLES:
 * ---------
 * ```typescript
 * import { out, log } from '../utils/io';
 *
 * // User sees this
 * out.success('Redaction complete!');
 * out.keyValue('Files processed', 42);
 *
 * // Goes to log file / debug output
 * log.info('Processing started', { documentId: 'doc-123' });
 * log.error('Filter failed', { filter: 'SSN', error: err.message });
 * ```
 *
 * WHEN TO USE WHAT:
 * -----------------
 *
 * | Scenario                          | Use      |
 * |-----------------------------------|----------|
 * | Show result to user               | out.*    |
 * | Display help text                 | out.*    |
 * | Show progress bar                 | out.*    |
 * | Print error message user sees     | out.error|
 * | Log error for debugging           | log.error|
 * | Record performance timing         | log.*    |
 * | Filter execution trace            | log.*    |
 * | Debug information                 | log.debug|
 * | PHI detection details             | log.phi  |
 */
export { VulpesOutput, out, quietOut, verboseOut, createOutput, } from "./VulpesOutput";
export type { OutputLevel, OutputConfig } from "./VulpesOutput";
export { VulpesLogger, vulpesLogger, vulpesLogger as log, // Convenient alias
ConsoleTransport, FileTransport, LegacyLoggerAdapter, } from "./VulpesLogger";
export type { LogLevel, OutputFormat, LogContext, LogEntry, Transport, VulpesLoggerConfig, } from "./VulpesLogger";
export declare const io: {
    /** User-facing output */
    readonly out: import("./VulpesOutput").VulpesOutput;
    /** Diagnostic logging */
    readonly log: import("./VulpesLogger").VulpesLogger;
};
//# sourceMappingURL=io.d.ts.map