"use strict";
/**
 * ============================================================================
 * VULPES CELARE - BORDER SYSTEM
 * ============================================================================
 *
 * Consistent border styles for boxes, tables, and dividers.
 * Provides multiple styles from minimal to decorative.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.borders = exports.minimalTableChars = exports.dividerStyles = exports.boxStyles = void 0;
exports.getBoxChars = getBoxChars;
exports.createDivider = createDivider;
exports.getTableChars = getTableChars;
exports.drawBox = drawBox;
const icons_1 = require("./icons");
// ============================================================================
// BOX CHARACTER SETS
// ============================================================================
exports.boxStyles = {
    rounded: icons_1.boxRounded,
    sharp: icons_1.boxSharp,
    double: icons_1.boxDouble,
    heavy: icons_1.boxHeavy,
};
/**
 * Get box characters for a given style
 */
function getBoxChars(style) {
    if (style === "none")
        return null;
    return exports.boxStyles[style];
}
exports.dividerStyles = {
    light: icons_1.dividers.light,
    heavy: icons_1.dividers.heavy,
    double: icons_1.dividers.double,
    dotted: icons_1.dividers.dotted,
    dashed: icons_1.dividers.dashed,
};
/**
 * Create a divider line of specified width
 */
function createDivider(width, style = "light") {
    return exports.dividerStyles[style].repeat(width);
}
/**
 * Get table characters for cli-table3 compatibility
 */
function getTableChars(style = "rounded") {
    const chars = style === "none" ? icons_1.boxRounded : exports.boxStyles[style];
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
exports.minimalTableChars = {
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
    mid: icons_1.dividers.light,
    midMid: "",
    right: "",
    rightMid: "",
    middle: "  ",
};
/**
 * Draw a box around content
 */
function drawBox(content, options = {}) {
    const { style = "rounded", width, padding = 1 } = options;
    if (style === "none") {
        return content;
    }
    const chars = exports.boxStyles[style];
    const pad = " ".repeat(padding);
    // Calculate width from content if not specified
    const contentWidth = width ??
        Math.max(...content.map((line) => stripAnsi(line).length)) + padding * 2;
    const totalWidth = contentWidth + 2; // +2 for borders
    const lines = [];
    // Top border
    lines.push(chars.topLeft + chars.horizontal.repeat(totalWidth - 2) + chars.topRight);
    // Content lines
    for (const line of content) {
        const stripped = stripAnsi(line);
        const padRight = contentWidth - stripped.length - padding;
        lines.push(chars.vertical + pad + line + " ".repeat(Math.max(0, padRight)) + chars.vertical);
    }
    // Bottom border
    lines.push(chars.bottomLeft +
        chars.horizontal.repeat(totalWidth - 2) +
        chars.bottomRight);
    return lines;
}
/**
 * Strip ANSI escape codes for width calculation
 */
function stripAnsi(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, "");
}
// ============================================================================
// COMBINED EXPORT
// ============================================================================
exports.borders = {
    boxStyles: exports.boxStyles,
    dividerStyles: exports.dividerStyles,
    getBoxChars,
    getTableChars,
    minimalTableChars: exports.minimalTableChars,
    createDivider,
    drawBox,
};
//# sourceMappingURL=borders.js.map