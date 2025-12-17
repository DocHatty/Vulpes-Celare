"use strict";
/**
 * ============================================================================
 * VULPES CELARE - TYPOGRAPHY SYSTEM
 * ============================================================================
 *
 * Text formatting utilities for consistent typography across the CLI.
 * Handles truncation, alignment, and text transformation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.typography = void 0;
exports.alignText = alignText;
exports.centerInTerminal = centerInTerminal;
exports.truncate = truncate;
exports.truncateMiddle = truncateMiddle;
exports.wrapText = wrapText;
exports.wrapWithIndent = wrapWithIndent;
exports.titleCase = titleCase;
exports.sentenceCase = sentenceCase;
exports.snakeToTitle = snakeToTitle;
exports.camelToTitle = camelToTitle;
exports.formatNumber = formatNumber;
exports.formatPercent = formatPercent;
exports.formatBytes = formatBytes;
exports.formatDuration = formatDuration;
exports.formatConfidence = formatConfidence;
exports.stripAnsi = stripAnsi;
exports.visibleLength = visibleLength;
exports.padEnd = padEnd;
exports.padStart = padStart;
/**
 * Align text within a specified width
 */
function alignText(text, width, align = "left") {
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
function centerInTerminal(text) {
    const width = process.stdout.columns || 80;
    return alignText(text, width, "center");
}
// ============================================================================
// TEXT TRUNCATION
// ============================================================================
/**
 * Truncate text with ellipsis
 */
function truncate(text, maxLength, ellipsis = "\u2026" // …
) {
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
function truncateMiddle(text, maxLength, separator = "\u2026") {
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
function wrapText(text, width) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = "";
    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (stripAnsi(testLine).length <= width) {
            currentLine = testLine;
        }
        else {
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
function wrapWithIndent(text, width, indent = "  ") {
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
function titleCase(text) {
    return text
        .toLowerCase()
        .replace(/(?:^|\s)\w/g, (match) => match.toUpperCase());
}
/**
 * Convert to sentence case
 */
function sentenceCase(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
/**
 * Convert snake_case or SCREAMING_CASE to Title Case
 */
function snakeToTitle(text) {
    return text
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
/**
 * Convert camelCase to Title Case
 */
function camelToTitle(text) {
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
function formatNumber(num) {
    return num.toLocaleString();
}
/**
 * Format a percentage
 */
function formatPercent(value, decimals = 1, includeSign = true) {
    const formatted = (value * 100).toFixed(decimals);
    return includeSign ? `${formatted}%` : formatted;
}
/**
 * Format bytes to human readable
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
/**
 * Format duration in milliseconds
 */
function formatDuration(ms) {
    if (ms < 1)
        return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000)
        return `${ms.toFixed(0)}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}
/**
 * Format confidence score
 */
function formatConfidence(confidence) {
    return `${(confidence * 100).toFixed(1)}%`;
}
// ============================================================================
// UTILITY
// ============================================================================
/**
 * Strip ANSI escape codes
 */
function stripAnsi(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, "");
}
/**
 * Get visible length of string (excluding ANSI codes)
 */
function visibleLength(str) {
    return stripAnsi(str);
}
/**
 * Pad string to width, accounting for ANSI codes
 */
function padEnd(str, width, char = " ") {
    const visible = stripAnsi(str).length;
    if (visible >= width)
        return str;
    return str + char.repeat(width - visible);
}
function padStart(str, width, char = " ") {
    const visible = stripAnsi(str).length;
    if (visible >= width)
        return str;
    return char.repeat(width - visible) + str;
}
// ============================================================================
// COMBINED EXPORT
// ============================================================================
exports.typography = {
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
};
//# sourceMappingURL=typography.js.map