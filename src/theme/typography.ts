/**
 * ============================================================================
 * VULPES CELARE - TYPOGRAPHY SYSTEM
 * ============================================================================
 *
 * Text formatting utilities for consistent typography across the CLI.
 * Handles truncation, alignment, and text transformation.
 */

// ============================================================================
// TEXT ALIGNMENT
// ============================================================================

export type TextAlign = "left" | "center" | "right";

/**
 * Align text within a specified width
 */
export function alignText(
  text: string,
  width: number,
  align: TextAlign = "left"
): string {
  const visibleLength = stripAnsi(text).length;

  if (visibleLength >= width) {
    return text;
  }

  const padding = width - visibleLength;

  switch (align) {
    case "center": {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return " ".repeat(leftPad) + text + " ".repeat(rightPad);
    }
    case "right":
      return " ".repeat(padding) + text;
    case "left":
    default:
      return text + " ".repeat(padding);
  }
}

/**
 * Center text within terminal width
 */
export function centerInTerminal(text: string): string {
  const width = process.stdout.columns || 80;
  return alignText(text, width, "center");
}

// ============================================================================
// TEXT TRUNCATION
// ============================================================================

/**
 * Truncate text with ellipsis
 */
export function truncate(
  text: string,
  maxLength: number,
  ellipsis = "\u2026" // …
): string {
  const visible = stripAnsi(text);

  if (visible.length <= maxLength) {
    return text;
  }

  // If text has ANSI codes, we need to be careful
  if (text !== visible) {
    // Simple approach: strip, truncate, then we lose formatting
    // Better approach would parse ANSI, but this is usually fine
    return visible.slice(0, maxLength - 1) + ellipsis;
  }

  return text.slice(0, maxLength - 1) + ellipsis;
}

/**
 * Truncate from the middle (useful for file paths)
 */
export function truncateMiddle(
  text: string,
  maxLength: number,
  separator = "\u2026"
): string {
  const visible = stripAnsi(text);

  if (visible.length <= maxLength) {
    return text;
  }

  const charsToShow = maxLength - separator.length;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return visible.slice(0, frontChars) + separator + visible.slice(-backChars);
}

// ============================================================================
// TEXT WRAPPING
// ============================================================================

/**
 * Wrap text to specified width
 */
export function wrapText(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (stripAnsi(testLine).length <= width) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Wrap and indent subsequent lines
 */
export function wrapWithIndent(
  text: string,
  width: number,
  indent: string = "  "
): string {
  const lines = wrapText(text, width - indent.length);
  return lines
    .map((line, i) => (i === 0 ? line : indent + line))
    .join("\n");
}

// ============================================================================
// TEXT TRANSFORMATION
// ============================================================================

/**
 * Convert to title case
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(?:^|\s)\w/g, (match) => match.toUpperCase());
}

/**
 * Convert to sentence case
 */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert snake_case or SCREAMING_CASE to Title Case
 */
export function snakeToTitle(text: string): string {
  return text
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(text: string): string {
  return text
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// ============================================================================
// NUMERIC FORMATTING
// ============================================================================

/**
 * Format a number with thousands separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a percentage
 */
export function formatPercent(
  value: number,
  decimals = 1,
  includeSign = true
): string {
  const formatted = (value * 100).toFixed(decimals);
  return includeSign ? `${formatted}%` : formatted;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Format confidence score
 */
export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Strip ANSI escape codes
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Get visible length of string (excluding ANSI codes)
 */
export function visibleLength(str: string): string {
  return stripAnsi(str);
}

/**
 * Pad string to width, accounting for ANSI codes
 */
export function padEnd(str: string, width: number, char = " "): string {
  const visible = stripAnsi(str).length;
  if (visible >= width) return str;
  return str + char.repeat(width - visible);
}

export function padStart(str: string, width: number, char = " "): string {
  const visible = stripAnsi(str).length;
  if (visible >= width) return str;
  return char.repeat(width - visible) + str;
}

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const typography = {
  alignText,
  centerInTerminal,
  truncate,
  truncateMiddle,
  wrapText,
  wrapWithIndent,
  titleCase,
  sentenceCase,
  snakeToTitle,
  camelToTitle,
  formatNumber,
  formatPercent,
  formatBytes,
  formatDuration,
  formatConfidence,
  stripAnsi,
  visibleLength,
  padEnd,
  padStart,
} as const;
