"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.LegacyLoggerAdapter = exports.FileTransport = exports.ConsoleTransport = exports.log = exports.vulpesLogger = exports.VulpesLogger = exports.createOutput = exports.verboseOut = exports.quietOut = exports.out = exports.VulpesOutput = void 0;
// ============================================================================
// USER-FACING OUTPUT
// ============================================================================
var VulpesOutput_1 = require("./VulpesOutput");
Object.defineProperty(exports, "VulpesOutput", { enumerable: true, get: function () { return VulpesOutput_1.VulpesOutput; } });
Object.defineProperty(exports, "out", { enumerable: true, get: function () { return VulpesOutput_1.out; } });
Object.defineProperty(exports, "quietOut", { enumerable: true, get: function () { return VulpesOutput_1.quietOut; } });
Object.defineProperty(exports, "verboseOut", { enumerable: true, get: function () { return VulpesOutput_1.verboseOut; } });
Object.defineProperty(exports, "createOutput", { enumerable: true, get: function () { return VulpesOutput_1.createOutput; } });
// ============================================================================
// DIAGNOSTIC LOGGING
// ============================================================================
var VulpesLogger_1 = require("./VulpesLogger");
Object.defineProperty(exports, "VulpesLogger", { enumerable: true, get: function () { return VulpesLogger_1.VulpesLogger; } });
Object.defineProperty(exports, "vulpesLogger", { enumerable: true, get: function () { return VulpesLogger_1.vulpesLogger; } });
Object.defineProperty(exports, "log", { enumerable: true, get: function () { return VulpesLogger_1.vulpesLogger; } });
Object.defineProperty(exports, "ConsoleTransport", { enumerable: true, get: function () { return VulpesLogger_1.ConsoleTransport; } });
Object.defineProperty(exports, "FileTransport", { enumerable: true, get: function () { return VulpesLogger_1.FileTransport; } });
Object.defineProperty(exports, "LegacyLoggerAdapter", { enumerable: true, get: function () { return VulpesLogger_1.LegacyLoggerAdapter; } });
// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================
/**
 * Default instances for quick access:
 * - `out` - User-facing output (stdout, pretty)
 * - `log` - Diagnostic logging (structured, file)
 */
const VulpesOutput_2 = require("./VulpesOutput");
const VulpesLogger_2 = require("./VulpesLogger");
exports.io = {
    /** User-facing output */
    out: VulpesOutput_2.out,
    /** Diagnostic logging */
    log: VulpesLogger_2.vulpesLogger,
};
//# sourceMappingURL=io.js.map