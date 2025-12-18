/**
 * ============================================================================
 * VULPES CELARE - BOX OUTPUT COMPONENT
 * ============================================================================
 *
 * Elegant box drawing for CLI output. Creates beautiful bordered boxes
 * with optional titles, various styles, and color support.
 *
 * Usage:
 *   import { Box } from '../theme/output';
 *
 *   console.log(Box.create('Hello World'));
 *   console.log(Box.create('Content', { title: 'Info', style: 'rounded' }));
 *   console.log(Box.success('Operation complete!'));
 */

import { theme } from "../chalk-theme";
import { boxRounded, boxSharp, boxDouble, boxHeavy } from "../icons";
import { stripAnsi } from "../typography";
import { getTerminalWidth } from "../spacing";

// ============================================================================
// TYPES
// ============================================================================

export type BoxStyle = "rounded" | "sharp" | "double" | "heavy" | "minimal";
export type BoxAlign = "left" | "center" | "right";

export interface BoxOptions {
  /** Border style */
  style?: BoxStyle;
  /** Padding inside the box (characters) */
  padding?: number;
  /** Horizontal padding (overrides padding) */
  paddingX?: number;
  /** Vertical padding (overrides padding) */
  paddingY?: number;
  /** Box title (displayed in top border) */
  title?: string;
  /** Title alignment */
  titleAlign?: BoxAlign;
  /** Content alignment */
  align?: BoxAlign;
  /** Fixed width (auto-calculated if not set) */
  width?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Border color function */
  borderColor?: (text: string) => string;
  /** Title color function */
  titleColor?: (text: string) => string;
  /** Background dimming */
  dimContent?: boolean;
}

interface BoxChars {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
}

// ============================================================================
// BOX CHARACTER SETS
// ============================================================================

const BOX_STYLES: Record<Exclude<BoxStyle, "minimal">, BoxChars> = {
  rounded: boxRounded,
  sharp: boxSharp,
  double: boxDouble,
  heavy: boxHeavy,
};

const MINIMAL_CHARS: BoxChars = {
  topLeft: " ",
  topRight: " ",
  bottomLeft: " ",
  bottomRight: " ",
  horizontal: " ",
  vertical: " ",
};

// ============================================================================
// BOX CLASS
// ============================================================================

export class Box {
  /**
   * Create a box around content
   */
  static create(content: string | string[], options: BoxOptions = {}): string {
    const {
      style = "rounded",
      padding = 1,
      paddingX = padding,
      paddingY = Math.max(0, padding - 1),
      title,
      titleAlign = "left",
      align = "left",
      width,
      maxWidth = getTerminalWidth() - 4,
      borderColor = theme.muted,
      titleColor = theme.primary,
      dimContent = false,
    } = options;

    // Get box characters
    const chars = style === "minimal" ? MINIMAL_CHARS : BOX_STYLES[style];

    // Normalize content to lines
    const lines = Array.isArray(content) ? content : content.split("\n");

    // Calculate content width
    const contentWidths = lines.map((line) => stripAnsi(line).length);
    const maxContentWidth = Math.max(...contentWidths, 0);
    const titleWidth = title ? stripAnsi(title).length + 4 : 0; // +4 for " title "

    // Calculate box width
    let boxWidth =
      width ?? Math.min(maxWidth, Math.max(maxContentWidth, titleWidth) + paddingX * 2 + 2);
    const innerWidth = boxWidth - 2; // -2 for borders

    // Build the box
    const result: string[] = [];

    // Top border with optional title
    if (title) {
      const titleStr = ` ${title} `;
      const titleLen = stripAnsi(titleStr).length;
      const remainingWidth = innerWidth - titleLen;

      let topBorder: string;
      if (titleAlign === "center") {
        const leftPad = Math.floor(remainingWidth / 2);
        const rightPad = remainingWidth - leftPad;
        topBorder =
          chars.topLeft +
          chars.horizontal.repeat(leftPad) +
          titleColor(titleStr) +
          chars.horizontal.repeat(rightPad) +
          chars.topRight;
      } else if (titleAlign === "right") {
        topBorder =
          chars.topLeft +
          chars.horizontal.repeat(remainingWidth - 1) +
          titleColor(titleStr) +
          chars.horizontal +
          chars.topRight;
      } else {
        topBorder =
          chars.topLeft +
          chars.horizontal +
          titleColor(titleStr) +
          chars.horizontal.repeat(remainingWidth - 1) +
          chars.topRight;
      }
      result.push(borderColor(topBorder));
    } else {
      result.push(borderColor(chars.topLeft + chars.horizontal.repeat(innerWidth) + chars.topRight));
    }

    // Top padding
    for (let i = 0; i < paddingY; i++) {
      result.push(borderColor(chars.vertical) + " ".repeat(innerWidth) + borderColor(chars.vertical));
    }

    // Content lines
    for (const line of lines) {
      const lineWidth = stripAnsi(line).length;
      const availableWidth = innerWidth - paddingX * 2;
      const padChar = " ";

      let paddedLine: string;
      if (align === "center") {
        const leftPad = Math.floor((availableWidth - lineWidth) / 2);
        const rightPad = availableWidth - lineWidth - leftPad;
        paddedLine =
          padChar.repeat(paddingX + leftPad) + line + padChar.repeat(rightPad + paddingX);
      } else if (align === "right") {
        paddedLine =
          padChar.repeat(paddingX + availableWidth - lineWidth) + line + padChar.repeat(paddingX);
      } else {
        paddedLine =
          padChar.repeat(paddingX) + line + padChar.repeat(availableWidth - lineWidth + paddingX);
      }

      const displayLine = dimContent ? theme.dim(paddedLine) : paddedLine;
      result.push(borderColor(chars.vertical) + displayLine + borderColor(chars.vertical));
    }

    // Bottom padding
    for (let i = 0; i < paddingY; i++) {
      result.push(borderColor(chars.vertical) + " ".repeat(innerWidth) + borderColor(chars.vertical));
    }

    // Bottom border
    result.push(
      borderColor(chars.bottomLeft + chars.horizontal.repeat(innerWidth) + chars.bottomRight)
    );

    return result.join("\n");
  }

  /**
   * Create a success box (green border)
   */
  static success(content: string | string[], options: BoxOptions = {}): string {
    return this.create(content, {
      ...options,
      borderColor: theme.success,
      title: options.title ?? "Success",
      titleColor: theme.success,
    });
  }

  /**
   * Create an error box (red border)
   */
  static error(content: string | string[], options: BoxOptions = {}): string {
    return this.create(content, {
      ...options,
      borderColor: theme.error,
      title: options.title ?? "Error",
      titleColor: theme.error,
    });
  }

  /**
   * Create a warning box (yellow border)
   */
  static warning(content: string | string[], options: BoxOptions = {}): string {
    return this.create(content, {
      ...options,
      borderColor: theme.warning,
      title: options.title ?? "Warning",
      titleColor: theme.warning,
    });
  }

  /**
   * Create an info box (blue border)
   */
  static info(content: string | string[], options: BoxOptions = {}): string {
    return this.create(content, {
      ...options,
      borderColor: theme.info,
      title: options.title ?? "Info",
      titleColor: theme.info,
    });
  }

  /**
   * Create a branded Vulpes box (orange border)
   */
  static vulpes(content: string | string[], options: BoxOptions = {}): string {
    return this.create(content, {
      ...options,
      borderColor: theme.primary,
      titleColor: theme.primary,
      style: "rounded",
    });
  }

  /**
   * Create a simple inline box (minimal style)
   */
  static inline(content: string): string {
    return `[ ${content} ]`;
  }

  /**
   * Create a highlight box for important content
   */
  static highlight(content: string | string[], options: BoxOptions = {}): string {
    return this.create(content, {
      ...options,
      borderColor: theme.accent,
      style: "double",
    });
  }
}

export default Box;
