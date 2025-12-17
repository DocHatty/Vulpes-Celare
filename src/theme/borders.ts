/**
 * ============================================================================
 * VULPES CELARE - BORDER SYSTEM
 * ============================================================================
 *
 * Consistent border styles for boxes, tables, and dividers.
 * Provides multiple styles from minimal to decorative.
 */

import { boxRounded, boxSharp, boxDouble, boxHeavy, dividers } from "./icons";

// ============================================================================
// BORDER STYLE TYPES
// ============================================================================

export type BorderStyle = "rounded" | "sharp" | "double" | "heavy" | "none";

export interface BoxChars {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  teeRight: string;
  teeLeft: string;
  teeDown: string;
  teeUp: string;
  cross: string;
}

// ============================================================================
// BOX CHARACTER SETS
// ============================================================================

export const boxStyles: Record<Exclude<BorderStyle, "none">, BoxChars> = {
  rounded: boxRounded,
  sharp: boxSharp,
  double: boxDouble,
  heavy: boxHeavy,
};

/**
 * Get box characters for a given style
 */
export function getBoxChars(style: BorderStyle): BoxChars | null {
  if (style === "none") return null;
  return boxStyles[style];
}

// ============================================================================
// DIVIDER STYLES
// ============================================================================

export type DividerStyle = "light" | "heavy" | "double" | "dotted" | "dashed";

export const dividerStyles: Record<DividerStyle, string> = {
  light: dividers.light,
  heavy: dividers.heavy,
  double: dividers.double,
  dotted: dividers.dotted,
  dashed: dividers.dashed,
};

/**
 * Create a divider line of specified width
 */
export function createDivider(
  width: number,
  style: DividerStyle = "light"
): string {
  return dividerStyles[style].repeat(width);
}

// ============================================================================
// TABLE CHARACTERS
// ============================================================================

export interface TableChars {
  top: string;
  topMid: string;
  topLeft: string;
  topRight: string;
  bottom: string;
  bottomMid: string;
  bottomLeft: string;
  bottomRight: string;
  left: string;
  leftMid: string;
  mid: string;
  midMid: string;
  right: string;
  rightMid: string;
  middle: string;
}

/**
 * Get table characters for cli-table3 compatibility
 */
export function getTableChars(style: BorderStyle = "rounded"): TableChars {
  const chars = style === "none" ? boxRounded : boxStyles[style];

  return {
    top: chars.horizontal,
    topMid: chars.teeDown,
    topLeft: chars.topLeft,
    topRight: chars.topRight,
    bottom: chars.horizontal,
    bottomMid: chars.teeUp,
    bottomLeft: chars.bottomLeft,
    bottomRight: chars.bottomRight,
    left: chars.vertical,
    leftMid: chars.teeRight,
    mid: chars.horizontal,
    midMid: chars.cross,
    right: chars.vertical,
    rightMid: chars.teeLeft,
    middle: chars.vertical,
  };
}

/**
 * Minimal table (no borders, just separators)
 */
export const minimalTableChars: TableChars = {
  top: "",
  topMid: "",
  topLeft: "",
  topRight: "",
  bottom: "",
  bottomMid: "",
  bottomLeft: "",
  bottomRight: "",
  left: "",
  leftMid: "",
  mid: dividers.light,
  midMid: "",
  right: "",
  rightMid: "",
  middle: "  ",
};

// ============================================================================
// BOX DRAWING HELPERS
// ============================================================================

export interface BoxOptions {
  style?: BorderStyle;
  width?: number;
  padding?: number;
  title?: string;
}

/**
 * Draw a box around content
 */
export function drawBox(
  content: string[],
  options: BoxOptions = {}
): string[] {
  const { style = "rounded", width, padding = 1 } = options;

  if (style === "none") {
    return content;
  }

  const chars = boxStyles[style];
  const pad = " ".repeat(padding);

  // Calculate width from content if not specified
  const contentWidth =
    width ??
    Math.max(...content.map((line) => stripAnsi(line).length)) + padding * 2;

  const totalWidth = contentWidth + 2; // +2 for borders

  const lines: string[] = [];

  // Top border
  lines.push(
    chars.topLeft + chars.horizontal.repeat(totalWidth - 2) + chars.topRight
  );

  // Content lines
  for (const line of content) {
    const stripped = stripAnsi(line);
    const padRight = contentWidth - stripped.length - padding;
    lines.push(
      chars.vertical + pad + line + " ".repeat(Math.max(0, padRight)) + chars.vertical
    );
  }

  // Bottom border
  lines.push(
    chars.bottomLeft +
      chars.horizontal.repeat(totalWidth - 2) +
      chars.bottomRight
  );

  return lines;
}

/**
 * Strip ANSI escape codes for width calculation
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const borders = {
  boxStyles,
  dividerStyles,
  getBoxChars,
  getTableChars,
  minimalTableChars,
  createDivider,
  drawBox,
} as const;
