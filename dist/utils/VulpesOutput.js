"use strict";
/**
 * ============================================================================
 * VULPES CELARE - USER-FACING OUTPUT SYSTEM
 * ============================================================================
 *
 * IMPORTANT DISTINCTION:
 * ----------------------
 * - VulpesOutput: User-facing terminal output (menus, prompts, results, help)
 * - VulpesLogger: Diagnostic/debug logging (errors, warnings, trace info)
 *
 * USE VulpesOutput WHEN:
 * - Displaying information TO the user
 * - Showing command results, help text, menus
 * - Interactive prompts and responses
 * - Progress indicators the user should see
 *
 * USE VulpesLogger WHEN:
 * - Recording diagnostic information
 * - Logging errors for debugging
 * - Trace/debug output for developers
 * - Machine-parseable structured logs
 *
 * This separation ensures:
 * 1. User output can be themed and pretty
 * 2. Diagnostic logs can be structured/JSON
 * 3. Clear intent in code reviews
 * 4. Easy to redirect logs vs output separately
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verboseOut = exports.quietOut = exports.out = exports.VulpesOutput = void 0;
exports.createOutput = createOutput;
const theme_1 = require("../theme");
const icons_1 = require("../theme/icons");
const output_1 = require("../theme/output");
// ============================================================================
// OUTPUT CLASS
// ============================================================================
/**
 * VulpesOutput - User-facing terminal output
 *
 * Use this for ALL user-facing output. Do NOT use console.log directly.
 *
 * @example
 * ```typescript
 * import { out } from '../utils/VulpesOutput';
 *
 * out.info('Processing document...');
 * out.success('Redaction complete!');
 * out.error('Failed to load file');
 * out.print('Raw output without formatting');
 * ```
 */
class VulpesOutput {
    level;
    stream;
    colors;
    constructor(config = {}) {
        this.level = config.level ?? "normal";
        this.stream = config.stream ?? process.stdout;
        this.colors = config.colors ?? (process.stdout.isTTY && !process.env.NO_COLOR);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // BASIC OUTPUT
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Print raw text (no formatting)
     */
    print(text) {
        this.stream.write(text + "\n");
    }
    /**
     * Print without newline
     */
    write(text) {
        this.stream.write(text);
    }
    /**
     * Print blank line
     */
    blank(count = 1) {
        this.stream.write("\n".repeat(count));
    }
    /**
     * Clear current line (for progress updates)
     */
    clearLine() {
        if (this.stream.isTTY) {
            this.stream.write("\r\x1b[K");
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // SEMANTIC OUTPUT (with icons and colors)
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Success message (green checkmark)
     */
    success(message) {
        const icon = this.colors ? theme_1.theme.success(icons_1.status.success) : icons_1.status.success;
        this.print(`${icon} ${message}`);
    }
    /**
     * Error message (red X) - still goes to stdout for user visibility
     */
    error(message) {
        const icon = this.colors ? theme_1.theme.error(icons_1.status.error) : icons_1.status.error;
        const text = this.colors ? theme_1.theme.error(message) : message;
        this.print(`${icon} ${text}`);
    }
    /**
     * Warning message (yellow warning sign)
     */
    warning(message) {
        const icon = this.colors ? theme_1.theme.warning(icons_1.status.warning) : icons_1.status.warning;
        const text = this.colors ? theme_1.theme.warning(message) : message;
        this.print(`${icon} ${text}`);
    }
    /**
     * Info message (blue info icon)
     */
    info(message) {
        const icon = this.colors ? theme_1.theme.info(icons_1.status.info) : icons_1.status.info;
        this.print(`${icon} ${message}`);
    }
    /**
     * Muted/secondary text
     */
    muted(message) {
        this.print(this.colors ? theme_1.theme.muted(message) : message);
    }
    /**
     * Highlighted/emphasized text
     */
    highlight(message) {
        this.print(this.colors ? theme_1.theme.primary.bold(message) : message);
    }
    // ══════════════════════════════════════════════════════════════════════════
    // VERBOSE OUTPUT (only shown in verbose mode)
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Verbose output - only shown when level is 'verbose'
     */
    verbose(message) {
        if (this.level === "verbose") {
            this.muted(`  ${message}`);
        }
    }
    /**
     * Debug output - only shown when level is 'verbose'
     */
    debug(message) {
        if (this.level === "verbose") {
            const prefix = this.colors ? theme_1.theme.muted("[debug]") : "[debug]";
            this.print(`${prefix} ${message}`);
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // STRUCTURED OUTPUT
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Heading (bold, primary color)
     */
    heading(text) {
        this.blank();
        this.print(this.colors ? theme_1.theme.primary.bold(text) : text.toUpperCase());
    }
    /**
     * Subheading (secondary color)
     */
    subheading(text) {
        this.print(this.colors ? theme_1.theme.secondary(text) : text);
    }
    /**
     * Key-value pair
     */
    keyValue(key, value, keyWidth = 20) {
        const paddedKey = key.padEnd(keyWidth);
        const keyStr = this.colors ? theme_1.theme.muted(paddedKey) : paddedKey;
        this.print(`  ${keyStr} ${value}`);
    }
    /**
     * Bullet point
     */
    bullet(text, indent = 2) {
        const bullet = this.colors ? theme_1.theme.muted("•") : "-";
        this.print(" ".repeat(indent) + `${bullet} ${text}`);
    }
    /**
     * Numbered item
     */
    numbered(num, text, indent = 2) {
        const numStr = this.colors ? theme_1.theme.secondary(`${num}.`) : `${num}.`;
        this.print(" ".repeat(indent) + `${numStr} ${text}`);
    }
    /**
     * Divider line
     */
    divider(width = 60) {
        this.print(output_1.Divider.line({ width }));
    }
    /**
     * Box with content
     */
    box(content, title) {
        const lines = Array.isArray(content) ? content : [content];
        this.print(output_1.Box.vulpes(lines, { title }));
    }
    /**
     * Status indicator
     */
    status(type, message) {
        this.print(output_1.Status[type](message));
    }
    // ══════════════════════════════════════════════════════════════════════════
    // REDACTION-SPECIFIC OUTPUT
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Display a redaction result
     */
    redactionResult(original, redacted, count) {
        this.blank();
        this.divider();
        this.print(this.colors
            ? `${theme_1.theme.error.bold("ORIGINAL:")} ${original}`
            : `ORIGINAL: ${original}`);
        this.print(this.colors
            ? `${theme_1.theme.success.bold("REDACTED:")} ${redacted}`
            : `REDACTED: ${redacted}`);
        this.print(this.colors
            ? theme_1.theme.muted(`  ${count} PHI instance${count !== 1 ? "s" : ""} redacted`)
            : `  ${count} PHI instance${count !== 1 ? "s" : ""} redacted`);
        this.divider();
    }
    /**
     * PHI detection summary
     */
    phiSummary(breakdown) {
        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
        this.subheading(`PHI Detected: ${total}`);
        for (const [type, count] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
            this.bullet(`${type}: ${count}`);
        }
    }
    // ══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ══════════════════════════════════════════════════════════════════════════
    /**
     * Set output level
     */
    setLevel(level) {
        this.level = level;
    }
    /**
     * Check if we're in quiet mode
     */
    isQuiet() {
        return this.level === "quiet";
    }
    /**
     * Check if we're in verbose mode
     */
    isVerbose() {
        return this.level === "verbose";
    }
}
exports.VulpesOutput = VulpesOutput;
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
/**
 * Default output instance - use this throughout the CLI
 *
 * @example
 * ```typescript
 * import { out } from '../utils/VulpesOutput';
 *
 * out.success('Done!');
 * out.error('Failed!');
 * out.keyValue('Files processed', 42);
 * ```
 */
exports.out = new VulpesOutput();
// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================
/**
 * Create a new output instance with custom config
 */
function createOutput(config) {
    return new VulpesOutput(config);
}
/**
 * Quiet output (suppresses non-essential messages)
 */
exports.quietOut = new VulpesOutput({ level: "quiet" });
/**
 * Verbose output (shows extra debug info)
 */
exports.verboseOut = new VulpesOutput({ level: "verbose" });
//# sourceMappingURL=VulpesOutput.js.map