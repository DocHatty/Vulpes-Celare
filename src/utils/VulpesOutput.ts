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

import { theme } from "../theme";
import { status as statusIcons } from "../theme/icons";
import { Box, Divider, Status } from "../theme/output";

// ============================================================================
// TYPES
// ============================================================================

export type OutputLevel = "normal" | "quiet" | "verbose";

export interface OutputConfig {
  /** Output level - quiet suppresses non-essential output */
  level?: OutputLevel;
  /** Stream to write to (default: stdout) */
  stream?: NodeJS.WriteStream;
  /** Enable colors (auto-detected) */
  colors?: boolean;
}

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
export class VulpesOutput {
  private level: OutputLevel;
  private stream: NodeJS.WriteStream;
  private colors: boolean;

  constructor(config: OutputConfig = {}) {
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
  print(text: string): void {
    this.stream.write(text + "\n");
  }

  /**
   * Print without newline
   */
  write(text: string): void {
    this.stream.write(text);
  }

  /**
   * Print blank line
   */
  blank(count: number = 1): void {
    this.stream.write("\n".repeat(count));
  }

  /**
   * Clear current line (for progress updates)
   */
  clearLine(): void {
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
  success(message: string): void {
    const icon = this.colors ? theme.success(statusIcons.success) : statusIcons.success;
    this.print(`${icon} ${message}`);
  }

  /**
   * Error message (red X) - still goes to stdout for user visibility
   */
  error(message: string): void {
    const icon = this.colors ? theme.error(statusIcons.error) : statusIcons.error;
    const text = this.colors ? theme.error(message) : message;
    this.print(`${icon} ${text}`);
  }

  /**
   * Warning message (yellow warning sign)
   */
  warning(message: string): void {
    const icon = this.colors ? theme.warning(statusIcons.warning) : statusIcons.warning;
    const text = this.colors ? theme.warning(message) : message;
    this.print(`${icon} ${text}`);
  }

  /**
   * Info message (blue info icon)
   */
  info(message: string): void {
    const icon = this.colors ? theme.info(statusIcons.info) : statusIcons.info;
    this.print(`${icon} ${message}`);
  }

  /**
   * Muted/secondary text
   */
  muted(message: string): void {
    this.print(this.colors ? theme.muted(message) : message);
  }

  /**
   * Highlighted/emphasized text
   */
  highlight(message: string): void {
    this.print(this.colors ? theme.primary.bold(message) : message);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VERBOSE OUTPUT (only shown in verbose mode)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Verbose output - only shown when level is 'verbose'
   */
  verbose(message: string): void {
    if (this.level === "verbose") {
      this.muted(`  ${message}`);
    }
  }

  /**
   * Debug output - only shown when level is 'verbose'
   */
  debug(message: string): void {
    if (this.level === "verbose") {
      const prefix = this.colors ? theme.muted("[debug]") : "[debug]";
      this.print(`${prefix} ${message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STRUCTURED OUTPUT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Heading (bold, primary color)
   */
  heading(text: string): void {
    this.blank();
    this.print(this.colors ? theme.primary.bold(text) : text.toUpperCase());
  }

  /**
   * Subheading (secondary color)
   */
  subheading(text: string): void {
    this.print(this.colors ? theme.secondary(text) : text);
  }

  /**
   * Key-value pair
   */
  keyValue(key: string, value: string | number, keyWidth: number = 20): void {
    const paddedKey = key.padEnd(keyWidth);
    const keyStr = this.colors ? theme.muted(paddedKey) : paddedKey;
    this.print(`  ${keyStr} ${value}`);
  }

  /**
   * Bullet point
   */
  bullet(text: string, indent: number = 2): void {
    const bullet = this.colors ? theme.muted("•") : "-";
    this.print(" ".repeat(indent) + `${bullet} ${text}`);
  }

  /**
   * Numbered item
   */
  numbered(num: number, text: string, indent: number = 2): void {
    const numStr = this.colors ? theme.secondary(`${num}.`) : `${num}.`;
    this.print(" ".repeat(indent) + `${numStr} ${text}`);
  }

  /**
   * Divider line
   */
  divider(width: number = 60): void {
    this.print(Divider.line({ width }));
  }

  /**
   * Box with content
   */
  box(content: string | string[], title?: string): void {
    const lines = Array.isArray(content) ? content : [content];
    this.print(Box.vulpes(lines, { title }));
  }

  /**
   * Status indicator
   */
  status(type: "success" | "error" | "warning" | "info", message: string): void {
    this.print(Status[type](message));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REDACTION-SPECIFIC OUTPUT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Display a redaction result
   */
  redactionResult(original: string, redacted: string, count: number): void {
    this.blank();
    this.divider();
    this.print(this.colors 
      ? `${theme.error.bold("ORIGINAL:")} ${original}`
      : `ORIGINAL: ${original}`
    );
    this.print(this.colors
      ? `${theme.success.bold("REDACTED:")} ${redacted}`
      : `REDACTED: ${redacted}`
    );
    this.print(this.colors
      ? theme.muted(`  ${count} PHI instance${count !== 1 ? "s" : ""} redacted`)
      : `  ${count} PHI instance${count !== 1 ? "s" : ""} redacted`
    );
    this.divider();
  }

  /**
   * PHI detection summary
   */
  phiSummary(breakdown: Record<string, number>): void {
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
  setLevel(level: OutputLevel): void {
    this.level = level;
  }

  /**
   * Check if we're in quiet mode
   */
  isQuiet(): boolean {
    return this.level === "quiet";
  }

  /**
   * Check if we're in verbose mode
   */
  isVerbose(): boolean {
    return this.level === "verbose";
  }
}

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
export const out = new VulpesOutput();

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Create a new output instance with custom config
 */
export function createOutput(config: OutputConfig): VulpesOutput {
  return new VulpesOutput(config);
}

/**
 * Quiet output (suppresses non-essential messages)
 */
export const quietOut = new VulpesOutput({ level: "quiet" });

/**
 * Verbose output (shows extra debug info)
 */
export const verboseOut = new VulpesOutput({ level: "verbose" });
