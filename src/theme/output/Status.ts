/**
 * ============================================================================
 * VULPES CELARE - STATUS OUTPUT COMPONENT
 * ============================================================================
 *
 * Status message formatting with icons and semantic coloring.
 * Provides consistent status display across the CLI.
 *
 * Usage:
 *   import { Status } from '../theme/output';
 *
 *   console.log(Status.success('Operation complete'));
 *   console.log(Status.error('Failed to process'));
 */

import { theme } from "../chalk-theme";
import { status as statusIcons, arrows, bullets, semantic } from "../icons";

// ============================================================================
// TYPES
// ============================================================================

export type StatusType = "success" | "error" | "warning" | "info" | "debug" | "pending";

export interface StatusOptions {
  /** Include icon */
  icon?: boolean;
  /** Custom icon */
  customIcon?: string;
  /** Bold text */
  bold?: boolean;
  /** Prefix text */
  prefix?: string;
  /** Suffix text */
  suffix?: string;
  /** Indent level */
  indent?: number;
}

// ============================================================================
// STATUS CLASS
// ============================================================================

export class Status {
  /**
   * Create a success status message
   */
  static success(message: string, options: StatusOptions = {}): string {
    return this.format("success", message, options);
  }

  /**
   * Create an error status message
   */
  static error(message: string, options: StatusOptions = {}): string {
    return this.format("error", message, options);
  }

  /**
   * Create a warning status message
   */
  static warning(message: string, options: StatusOptions = {}): string {
    return this.format("warning", message, options);
  }

  /**
   * Create an info status message
   */
  static info(message: string, options: StatusOptions = {}): string {
    return this.format("info", message, options);
  }

  /**
   * Create a debug status message
   */
  static debug(message: string, options: StatusOptions = {}): string {
    return this.format("debug", message, options);
  }

  /**
   * Create a pending status message
   */
  static pending(message: string, options: StatusOptions = {}): string {
    return this.format("pending", message, options);
  }

  /**
   * Generic status formatter
   */
  static format(type: StatusType, message: string, options: StatusOptions = {}): string {
    const {
      icon = true,
      customIcon,
      bold = false,
      prefix,
      suffix,
      indent = 0,
    } = options;

    const parts: string[] = [];

    // Add indentation
    if (indent > 0) {
      parts.push("  ".repeat(indent));
    }

    // Add prefix
    if (prefix) {
      parts.push(theme.muted(prefix));
    }

    // Get icon and color
    const iconChar = customIcon ?? this.getIcon(type);
    const colorFn = this.getColor(type);

    // Add icon
    if (icon) {
      parts.push(colorFn(iconChar));
    }

    // Add message
    const styledMessage = bold ? colorFn.bold?.(message) ?? colorFn(message) : message;
    parts.push(styledMessage);

    // Add suffix
    if (suffix) {
      parts.push(theme.muted(suffix));
    }

    return parts.join(" ");
  }

  /**
   * Get icon for status type
   */
  private static getIcon(type: StatusType): string {
    switch (type) {
      case "success": return statusIcons.success;
      case "error": return statusIcons.error;
      case "warning": return statusIcons.warning;
      case "info": return statusIcons.info;
      case "debug": return bullets.diamond;
      case "pending": return statusIcons.pending;
      default: return bullets.dot;
    }
  }

  /**
   * Get color function for status type
   */
  private static getColor(type: StatusType): typeof theme.success {
    switch (type) {
      case "success": return theme.success;
      case "error": return theme.error;
      case "warning": return theme.warning;
      case "info": return theme.info;
      case "debug": return theme.debug;
      case "pending": return theme.muted;
      default: return theme.muted;
    }
  }

  // ============================================================================
  // SPECIALIZED STATUS MESSAGES
  // ============================================================================

  /**
   * Create a "done" message
   */
  static done(message?: string): string {
    return this.success(message ?? "Done");
  }

  /**
   * Create a "failed" message
   */
  static failed(message?: string): string {
    return this.error(message ?? "Failed");
  }

  /**
   * Create a "skipped" message
   */
  static skipped(message: string): string {
    return `${theme.muted(statusIcons.skipped)} ${theme.muted(message)}`;
  }

  /**
   * Create a "processing" message
   */
  static processing(message: string): string {
    return `${theme.primary(statusIcons.progress)} ${message}`;
  }

  /**
   * Create a "waiting" message
   */
  static waiting(message: string): string {
    return `${theme.muted(statusIcons.pending)} ${theme.muted(message)}`;
  }

  // ============================================================================
  // LIST ITEMS
  // ============================================================================

  /**
   * Create a bullet point item
   */
  static bullet(message: string, options: { indent?: number; color?: (text: string) => string } = {}): string {
    const { indent = 0, color = theme.muted } = options;
    const indentStr = "  ".repeat(indent);
    return `${indentStr}${color(bullets.dot)} ${message}`;
  }

  /**
   * Create an arrow item (for sub-items)
   */
  static arrow(message: string, options: { indent?: number } = {}): string {
    const { indent = 1 } = options;
    const indentStr = "  ".repeat(indent);
    return `${indentStr}${theme.muted(arrows.right)} ${message}`;
  }

  /**
   * Create a numbered item
   */
  static numbered(index: number, message: string, options: { indent?: number; color?: (text: string) => string } = {}): string {
    const { indent = 0, color = theme.muted } = options;
    const indentStr = "  ".repeat(indent);
    return `${indentStr}${color(`${index}.`)} ${message}`;
  }

  // ============================================================================
  // CONTEXTUAL STATUS
  // ============================================================================

  /**
   * Create a PHI-related status (uses shield icon)
   */
  static phi(message: string, type: StatusType = "info"): string {
    return this.format(type, message, { customIcon: semantic.phi });
  }

  /**
   * Create a security-related status
   */
  static security(message: string, type: StatusType = "success"): string {
    return this.format(type, message, { customIcon: semantic.shield });
  }

  /**
   * Create a redaction status
   */
  static redaction(original: string, replacement: string): string {
    return `${theme.muted(original)} ${theme.muted(arrows.right)} ${theme.success(replacement)}`;
  }

  /**
   * Create a diff-style status (showing change)
   */
  static diff(before: string, after: string): string {
    return [
      `${theme.error("-")} ${theme.error(before)}`,
      `${theme.success("+")} ${theme.success(after)}`,
    ].join("\n");
  }

  // ============================================================================
  // GROUPED STATUS
  // ============================================================================

  /**
   * Create a status list from multiple items
   */
  static list(items: Array<{ type: StatusType; message: string }>): string {
    return items.map(item => this.format(item.type, item.message)).join("\n");
  }

  /**
   * Create a summary of status counts
   */
  static summary(counts: { success?: number; error?: number; warning?: number; skipped?: number }): string {
    const parts: string[] = [];

    if (counts.success !== undefined && counts.success > 0) {
      parts.push(theme.success(`${statusIcons.success} ${counts.success} passed`));
    }
    if (counts.error !== undefined && counts.error > 0) {
      parts.push(theme.error(`${statusIcons.error} ${counts.error} failed`));
    }
    if (counts.warning !== undefined && counts.warning > 0) {
      parts.push(theme.warning(`${statusIcons.warning} ${counts.warning} warnings`));
    }
    if (counts.skipped !== undefined && counts.skipped > 0) {
      parts.push(theme.muted(`${statusIcons.skipped} ${counts.skipped} skipped`));
    }

    return parts.join("  ");
  }
}

export default Status;
