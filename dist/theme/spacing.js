"use strict";
/**
 * ============================================================================
 * VULPES CELARE - SPACING SYSTEM
 * ============================================================================
 *
 * Consistent spacing scale for padding, margins, and gaps.
 * Based on a 4px base unit for harmonious proportions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.spacingSystem = exports.widths = exports.lineSpacing = exports.indent = exports.padding = exports.spacing = void 0;
exports.indentStr = indentStr;
exports.blankLines = blankLines;
exports.getTerminalWidth = getTerminalWidth;
exports.getContentWidth = getContentWidth;
// ============================================================================
// SPACING SCALE
// ============================================================================
/**
 * Spacing scale in terminal columns/characters.
 * For CLI, 1 unit = 1 character width.
 */
exports.spacing = {
    /** 0 - No spacing */
    none: 0,
    /** 1 character */
    xs: 1,
    /** 2 characters */
    sm: 2,
    /** 4 characters */
    md: 4,
    /** 6 characters */
    lg: 6,
    /** 8 characters */
    xl: 8,
    /** 12 characters */
    "2xl": 12,
    /** 16 characters */
    "3xl": 16,
    /** 24 characters */
    "4xl": 24,
};
// ============================================================================
// PADDING PRESETS
// ============================================================================
exports.padding = {
    /** No padding */
    none: { top: 0, right: 0, bottom: 0, left: 0 },
    /** Compact padding (1 char horizontal, 0 vertical) */
    compact: { top: 0, right: 1, bottom: 0, left: 1 },
    /** Small padding */
    sm: { top: 0, right: 2, bottom: 0, left: 2 },
    /** Medium padding */
    md: { top: 1, right: 4, bottom: 1, left: 4 },
    /** Large padding */
    lg: { top: 2, right: 6, bottom: 2, left: 6 },
};
// ============================================================================
// INDENTATION
// ============================================================================
exports.indent = {
    /** No indent */
    none: "",
    /** Single level (2 spaces) */
    single: "  ",
    /** Double level (4 spaces) */
    double: "    ",
    /** Triple level (6 spaces) */
    triple: "      ",
    /** Quad level (8 spaces) */
    quad: "        ",
};
/**
 * Generate indentation string
 */
function indentStr(level, char = " ", width = 2) {
    return char.repeat(level * width);
}
// ============================================================================
// LINE SPACING
// ============================================================================
exports.lineSpacing = {
    /** No extra lines */
    none: 0,
    /** Single blank line */
    single: 1,
    /** Double blank lines */
    double: 2,
};
/**
 * Generate blank lines
 */
function blankLines(count) {
    return "\n".repeat(count);
}
// ============================================================================
// WIDTH UTILITIES
// ============================================================================
/**
 * Get terminal width with fallback
 */
function getTerminalWidth(fallback = 80) {
    return process.stdout.columns || fallback;
}
/**
 * Calculate content width accounting for padding
 */
function getContentWidth(padding, terminalWidth) {
    const width = terminalWidth ?? getTerminalWidth();
    return Math.max(20, width - padding.left - padding.right);
}
/**
 * Common width presets
 */
exports.widths = {
    /** Narrow content (50 chars or 60% of terminal) */
    narrow: () => Math.min(50, Math.floor(getTerminalWidth() * 0.6)),
    /** Medium content (70 chars or 80% of terminal) */
    medium: () => Math.min(70, Math.floor(getTerminalWidth() * 0.8)),
    /** Wide content (90 chars or 95% of terminal) */
    wide: () => Math.min(90, Math.floor(getTerminalWidth() * 0.95)),
    /** Full terminal width */
    full: () => getTerminalWidth(),
};
// ============================================================================
// COMBINED EXPORT
// ============================================================================
exports.spacingSystem = {
    spacing: exports.spacing,
    padding: exports.padding,
    indent: exports.indent,
    lineSpacing: exports.lineSpacing,
    widths: exports.widths,
    indentStr,
    blankLines,
    getTerminalWidth,
    getContentWidth,
};
//# sourceMappingURL=spacing.js.map