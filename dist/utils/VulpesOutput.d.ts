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
export type OutputLevel = "normal" | "quiet" | "verbose";
export interface OutputConfig {
    /** Output level - quiet suppresses non-essential output */
    level?: OutputLevel;
    /** Stream to write to (default: stdout) */
    stream?: NodeJS.WriteStream;
    /** Enable colors (auto-detected) */
    colors?: boolean;
}
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
export declare class VulpesOutput {
    private level;
    private stream;
    private colors;
    constructor(config?: OutputConfig);
    /**
     * Print raw text (no formatting)
     */
    print(text: string): void;
    /**
     * Print without newline
     */
    write(text: string): void;
    /**
     * Print blank line
     */
    blank(count?: number): void;
    /**
     * Clear current line (for progress updates)
     */
    clearLine(): void;
    /**
     * Success message (green checkmark)
     */
    success(message: string): void;
    /**
     * Error message (red X) - still goes to stdout for user visibility
     */
    error(message: string): void;
    /**
     * Warning message (yellow warning sign)
     */
    warning(message: string): void;
    /**
     * Info message (blue info icon)
     */
    info(message: string): void;
    /**
     * Muted/secondary text
     */
    muted(message: string): void;
    /**
     * Highlighted/emphasized text
     */
    highlight(message: string): void;
    /**
     * Verbose output - only shown when level is 'verbose'
     */
    verbose(message: string): void;
    /**
     * Debug output - only shown when level is 'verbose'
     */
    debug(message: string): void;
    /**
     * Heading (bold, primary color)
     */
    heading(text: string): void;
    /**
     * Subheading (secondary color)
     */
    subheading(text: string): void;
    /**
     * Key-value pair
     */
    keyValue(key: string, value: string | number, keyWidth?: number): void;
    /**
     * Bullet point
     */
    bullet(text: string, indent?: number): void;
    /**
     * Numbered item
     */
    numbered(num: number, text: string, indent?: number): void;
    /**
     * Divider line
     */
    divider(width?: number): void;
    /**
     * Box with content
     */
    box(content: string | string[], title?: string): void;
    /**
     * Status indicator
     */
    status(type: "success" | "error" | "warning" | "info", message: string): void;
    /**
     * Display a redaction result
     */
    redactionResult(original: string, redacted: string, count: number): void;
    /**
     * PHI detection summary
     */
    phiSummary(breakdown: Record<string, number>): void;
    /**
     * Set output level
     */
    setLevel(level: OutputLevel): void;
    /**
     * Check if we're in quiet mode
     */
    isQuiet(): boolean;
    /**
     * Check if we're in verbose mode
     */
    isVerbose(): boolean;
}
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
export declare const out: VulpesOutput;
/**
 * Create a new output instance with custom config
 */
export declare function createOutput(config: OutputConfig): VulpesOutput;
/**
 * Quiet output (suppresses non-essential messages)
 */
export declare const quietOut: VulpesOutput;
/**
 * Verbose output (shows extra debug info)
 */
export declare const verboseOut: VulpesOutput;
//# sourceMappingURL=VulpesOutput.d.ts.map