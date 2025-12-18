/**
 * ============================================================================
 * VULPES CELARE - DIVIDER OUTPUT COMPONENT
 * ============================================================================
 *
 * Elegant horizontal dividers for CLI output.
 * Provides visual separation between sections.
 *
 * Usage:
 *   import { Divider } from '../theme/output';
 *
 *   console.log(Divider.line());
 *   console.log(Divider.titled('Section'));
 */

import { theme } from "../chalk-theme";
import { dividers } from "../icons";
import { getTerminalWidth } from "../spacing";
import { stripAnsi } from "../typography";

// ============================================================================
// TYPES
// ============================================================================

export type DividerStyle = "light" | "heavy" | "double" | "dotted" | "dashed" | "space";
export type DividerAlign = "left" | "center" | "right";

export interface DividerOptions {
  /** Divider line style */
  style?: DividerStyle;
  /** Width of the divider */
  width?: number;
  /** Color function */
  color?: (text: string) => string;
  /** Padding (blank lines) above */
  paddingTop?: number;
  /** Padding (blank lines) below */
  paddingBottom?: number;
}

export interface TitledDividerOptions extends DividerOptions {
  /** Title alignment */
  align?: DividerAlign;
  /** Title color function */
  titleColor?: (text: string) => string;
  /** Spacing around title */
  titlePadding?: number;
}

// ============================================================================
// DIVIDER CLASS
// ============================================================================

export class Divider {
  /**
   * Create a simple horizontal line
   */
  static line(options: DividerOptions = {}): string {
    const {
      style = "light",
      width = getTerminalWidth() - 2,
      color = theme.muted,
      paddingTop = 0,
      paddingBottom = 0,
    } = options;

    const char = style === "space" ? " " : dividers[style];
    const line = color(char.repeat(width));

    const parts: string[] = [];

    if (paddingTop > 0) {
      parts.push("\n".repeat(paddingTop));
    }

    parts.push(line);

    if (paddingBottom > 0) {
      parts.push("\n".repeat(paddingBottom));
    }

    return parts.join("");
  }

  /**
   * Create a divider with a title
   */
  static titled(title: string, options: TitledDividerOptions = {}): string {
    const {
      style = "light",
      width = getTerminalWidth() - 2,
      color = theme.muted,
      align = "center",
      titleColor = theme.primary,
      titlePadding = 2,
      paddingTop = 0,
      paddingBottom = 0,
    } = options;

    const char = style === "space" ? " " : dividers[style];
    const titleStr = ` ${title} `;
    const titleLen = stripAnsi(titleStr).length;
    const lineSpace = width - titleLen - (titlePadding * 2);

    if (lineSpace < 4) {
      // Not enough space for line, just return centered title
      return titleColor(title);
    }

    let line: string;

    if (align === "left") {
      const leftLen = titlePadding;
      const rightLen = lineSpace + titlePadding;
      line = color(char.repeat(leftLen)) + titleColor(titleStr) + color(char.repeat(rightLen));
    } else if (align === "right") {
      const leftLen = lineSpace + titlePadding;
      const rightLen = titlePadding;
      line = color(char.repeat(leftLen)) + titleColor(titleStr) + color(char.repeat(rightLen));
    } else {
      const leftLen = Math.floor(lineSpace / 2) + titlePadding;
      const rightLen = Math.ceil(lineSpace / 2) + titlePadding;
      line = color(char.repeat(leftLen)) + titleColor(titleStr) + color(char.repeat(rightLen));
    }

    const parts: string[] = [];

    if (paddingTop > 0) {
      parts.push("\n".repeat(paddingTop));
    }

    parts.push(line);

    if (paddingBottom > 0) {
      parts.push("\n".repeat(paddingBottom));
    }

    return parts.join("");
  }

  /**
   * Create a section divider (heavier, more prominent)
   */
  static section(title?: string, options: TitledDividerOptions = {}): string {
    const opts: TitledDividerOptions = {
      ...options,
      style: options.style ?? "heavy",
      titleColor: options.titleColor ?? theme.primary.bold,
      paddingTop: options.paddingTop ?? 1,
      paddingBottom: options.paddingBottom ?? 1,
    };

    return title ? this.titled(title, opts) : this.line(opts);
  }

  /**
   * Create a subtle divider (lighter, less prominent)
   */
  static subtle(options: DividerOptions = {}): string {
    return this.line({
      ...options,
      style: options.style ?? "dotted",
      color: options.color ?? theme.faint,
    });
  }

  /**
   * Create blank space (empty lines)
   */
  static space(lines = 1): string {
    return "\n".repeat(lines);
  }

  /**
   * Create a branded Vulpes divider
   */
  static vulpes(title?: string, options: TitledDividerOptions = {}): string {
    const opts: TitledDividerOptions = {
      ...options,
      color: theme.primary,
      titleColor: theme.primary.bold,
    };

    return title ? this.titled(title, opts) : this.line(opts);
  }

  /**
   * Convenience presets
   */
  static get light(): string { return this.line({ style: "light" }); }
  static get heavy(): string { return this.line({ style: "heavy" }); }
  static get double(): string { return this.line({ style: "double" }); }
  static get dotted(): string { return this.line({ style: "dotted" }); }
  static get dashed(): string { return this.line({ style: "dashed" }); }
}

export default Divider;
