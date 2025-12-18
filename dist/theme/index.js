"use strict";
/**
 * ============================================================================
 * VULPES CELARE - UNIFIED THEME SYSTEM
 * ============================================================================
 *
 * Central export for all theming functionality.
 *
 * Usage:
 *   import { theme, icons, colors } from '../theme';
 *
 *   console.log(theme.success('Operation completed'));
 *   console.log(theme.primary('Vulpes Celare'));
 *   console.log(theme.phi('SSN')('[REDACTED]'));
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatNumber = exports.camelToTitle = exports.snakeToTitle = exports.sentenceCase = exports.titleCase = exports.wrapWithIndent = exports.wrapText = exports.truncateMiddle = exports.truncate = exports.centerInTerminal = exports.alignText = exports.typography = exports.drawBox = exports.createDivider = exports.minimalTableChars = exports.getTableChars = exports.getBoxChars = exports.dividerStyles = exports.boxStyles = exports.borders = exports.spacingSystem = exports.getContentWidth = exports.getTerminalWidth = exports.blankLines = exports.indentStr = exports.widths = exports.lineSpacing = exports.indent = exports.padding = exports.spacing = exports.dividers = exports.semanticIcons = exports.spinnerFrames = exports.progress = exports.boxHeavy = exports.boxDouble = exports.boxSharp = exports.boxRounded = exports.bullets = exports.arrows = exports.status = exports.ico = exports.icons = exports.terminal = exports.roles = exports.phi = exports.neutral = exports.semantic = exports.brand = exports.colors = void 0;
exports.legacyTheme = exports.Status = exports.Banner = exports.Divider = exports.spinnerFrame = exports.withSpinner = exports.spin = exports.Spinner = exports.Progress = exports.Table = exports.Box = exports.vulpesTheme = exports.supportsTrueColor = exports.phiType = exports.muted = exports.highlight = exports.subheading = exports.heading = exports.keyValue = exports.labelValue = exports.info = exports.warning = exports.error = exports.success = exports.formatStatus = exports.styledOutput = exports.createTheme = exports.theme = exports.padStart = exports.padEnd = exports.visibleLength = exports.stripAnsi = exports.formatConfidence = exports.formatDuration = exports.formatBytes = exports.formatPercent = void 0;
// ============================================================================
// CORE EXPORTS
// ============================================================================
// Colors
var colors_1 = require("./colors");
Object.defineProperty(exports, "colors", { enumerable: true, get: function () { return colors_1.colors; } });
Object.defineProperty(exports, "brand", { enumerable: true, get: function () { return colors_1.brand; } });
Object.defineProperty(exports, "semantic", { enumerable: true, get: function () { return colors_1.semantic; } });
Object.defineProperty(exports, "neutral", { enumerable: true, get: function () { return colors_1.neutral; } });
Object.defineProperty(exports, "phi", { enumerable: true, get: function () { return colors_1.phi; } });
Object.defineProperty(exports, "roles", { enumerable: true, get: function () { return colors_1.roles; } });
Object.defineProperty(exports, "terminal", { enumerable: true, get: function () { return colors_1.terminal; } });
// Icons
var icons_1 = require("./icons");
Object.defineProperty(exports, "icons", { enumerable: true, get: function () { return icons_1.icons; } });
Object.defineProperty(exports, "ico", { enumerable: true, get: function () { return icons_1.ico; } });
Object.defineProperty(exports, "status", { enumerable: true, get: function () { return icons_1.status; } });
Object.defineProperty(exports, "arrows", { enumerable: true, get: function () { return icons_1.arrows; } });
Object.defineProperty(exports, "bullets", { enumerable: true, get: function () { return icons_1.bullets; } });
Object.defineProperty(exports, "boxRounded", { enumerable: true, get: function () { return icons_1.boxRounded; } });
Object.defineProperty(exports, "boxSharp", { enumerable: true, get: function () { return icons_1.boxSharp; } });
Object.defineProperty(exports, "boxDouble", { enumerable: true, get: function () { return icons_1.boxDouble; } });
Object.defineProperty(exports, "boxHeavy", { enumerable: true, get: function () { return icons_1.boxHeavy; } });
Object.defineProperty(exports, "progress", { enumerable: true, get: function () { return icons_1.progress; } });
Object.defineProperty(exports, "spinnerFrames", { enumerable: true, get: function () { return icons_1.spinnerFrames; } });
Object.defineProperty(exports, "semanticIcons", { enumerable: true, get: function () { return icons_1.semantic; } });
Object.defineProperty(exports, "dividers", { enumerable: true, get: function () { return icons_1.dividers; } });
// Spacing
var spacing_1 = require("./spacing");
Object.defineProperty(exports, "spacing", { enumerable: true, get: function () { return spacing_1.spacing; } });
Object.defineProperty(exports, "padding", { enumerable: true, get: function () { return spacing_1.padding; } });
Object.defineProperty(exports, "indent", { enumerable: true, get: function () { return spacing_1.indent; } });
Object.defineProperty(exports, "lineSpacing", { enumerable: true, get: function () { return spacing_1.lineSpacing; } });
Object.defineProperty(exports, "widths", { enumerable: true, get: function () { return spacing_1.widths; } });
Object.defineProperty(exports, "indentStr", { enumerable: true, get: function () { return spacing_1.indentStr; } });
Object.defineProperty(exports, "blankLines", { enumerable: true, get: function () { return spacing_1.blankLines; } });
Object.defineProperty(exports, "getTerminalWidth", { enumerable: true, get: function () { return spacing_1.getTerminalWidth; } });
Object.defineProperty(exports, "getContentWidth", { enumerable: true, get: function () { return spacing_1.getContentWidth; } });
Object.defineProperty(exports, "spacingSystem", { enumerable: true, get: function () { return spacing_1.spacingSystem; } });
// Borders
var borders_1 = require("./borders");
Object.defineProperty(exports, "borders", { enumerable: true, get: function () { return borders_1.borders; } });
Object.defineProperty(exports, "boxStyles", { enumerable: true, get: function () { return borders_1.boxStyles; } });
Object.defineProperty(exports, "dividerStyles", { enumerable: true, get: function () { return borders_1.dividerStyles; } });
Object.defineProperty(exports, "getBoxChars", { enumerable: true, get: function () { return borders_1.getBoxChars; } });
Object.defineProperty(exports, "getTableChars", { enumerable: true, get: function () { return borders_1.getTableChars; } });
Object.defineProperty(exports, "minimalTableChars", { enumerable: true, get: function () { return borders_1.minimalTableChars; } });
Object.defineProperty(exports, "createDivider", { enumerable: true, get: function () { return borders_1.createDivider; } });
Object.defineProperty(exports, "drawBox", { enumerable: true, get: function () { return borders_1.drawBox; } });
// Typography
var typography_1 = require("./typography");
Object.defineProperty(exports, "typography", { enumerable: true, get: function () { return typography_1.typography; } });
Object.defineProperty(exports, "alignText", { enumerable: true, get: function () { return typography_1.alignText; } });
Object.defineProperty(exports, "centerInTerminal", { enumerable: true, get: function () { return typography_1.centerInTerminal; } });
Object.defineProperty(exports, "truncate", { enumerable: true, get: function () { return typography_1.truncate; } });
Object.defineProperty(exports, "truncateMiddle", { enumerable: true, get: function () { return typography_1.truncateMiddle; } });
Object.defineProperty(exports, "wrapText", { enumerable: true, get: function () { return typography_1.wrapText; } });
Object.defineProperty(exports, "wrapWithIndent", { enumerable: true, get: function () { return typography_1.wrapWithIndent; } });
Object.defineProperty(exports, "titleCase", { enumerable: true, get: function () { return typography_1.titleCase; } });
Object.defineProperty(exports, "sentenceCase", { enumerable: true, get: function () { return typography_1.sentenceCase; } });
Object.defineProperty(exports, "snakeToTitle", { enumerable: true, get: function () { return typography_1.snakeToTitle; } });
Object.defineProperty(exports, "camelToTitle", { enumerable: true, get: function () { return typography_1.camelToTitle; } });
Object.defineProperty(exports, "formatNumber", { enumerable: true, get: function () { return typography_1.formatNumber; } });
Object.defineProperty(exports, "formatPercent", { enumerable: true, get: function () { return typography_1.formatPercent; } });
Object.defineProperty(exports, "formatBytes", { enumerable: true, get: function () { return typography_1.formatBytes; } });
Object.defineProperty(exports, "formatDuration", { enumerable: true, get: function () { return typography_1.formatDuration; } });
Object.defineProperty(exports, "formatConfidence", { enumerable: true, get: function () { return typography_1.formatConfidence; } });
Object.defineProperty(exports, "stripAnsi", { enumerable: true, get: function () { return typography_1.stripAnsi; } });
Object.defineProperty(exports, "visibleLength", { enumerable: true, get: function () { return typography_1.visibleLength; } });
Object.defineProperty(exports, "padEnd", { enumerable: true, get: function () { return typography_1.padEnd; } });
Object.defineProperty(exports, "padStart", { enumerable: true, get: function () { return typography_1.padStart; } });
// Chalk Theme (main theme object)
var chalk_theme_1 = require("./chalk-theme");
Object.defineProperty(exports, "theme", { enumerable: true, get: function () { return chalk_theme_1.theme; } });
Object.defineProperty(exports, "createTheme", { enumerable: true, get: function () { return chalk_theme_1.createTheme; } });
Object.defineProperty(exports, "styledOutput", { enumerable: true, get: function () { return chalk_theme_1.styledOutput; } });
Object.defineProperty(exports, "formatStatus", { enumerable: true, get: function () { return chalk_theme_1.formatStatus; } });
Object.defineProperty(exports, "success", { enumerable: true, get: function () { return chalk_theme_1.success; } });
Object.defineProperty(exports, "error", { enumerable: true, get: function () { return chalk_theme_1.error; } });
Object.defineProperty(exports, "warning", { enumerable: true, get: function () { return chalk_theme_1.warning; } });
Object.defineProperty(exports, "info", { enumerable: true, get: function () { return chalk_theme_1.info; } });
Object.defineProperty(exports, "labelValue", { enumerable: true, get: function () { return chalk_theme_1.labelValue; } });
Object.defineProperty(exports, "keyValue", { enumerable: true, get: function () { return chalk_theme_1.keyValue; } });
Object.defineProperty(exports, "heading", { enumerable: true, get: function () { return chalk_theme_1.heading; } });
Object.defineProperty(exports, "subheading", { enumerable: true, get: function () { return chalk_theme_1.subheading; } });
Object.defineProperty(exports, "highlight", { enumerable: true, get: function () { return chalk_theme_1.highlight; } });
Object.defineProperty(exports, "muted", { enumerable: true, get: function () { return chalk_theme_1.muted; } });
Object.defineProperty(exports, "phiType", { enumerable: true, get: function () { return chalk_theme_1.phiType; } });
Object.defineProperty(exports, "supportsTrueColor", { enumerable: true, get: function () { return chalk_theme_1.supportsTrueColor; } });
// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================
/**
 * Quick access to the most commonly used theme elements
 */
exports.vulpesTheme = {
    // Main theme object
    theme: undefined, // Will be set below
    // Quick color access
    colors: {
        primary: "#FF6B35",
        secondary: "#4ECDC4",
        accent: "#FFE66D",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
    },
    // Quick icon access
    icons: {
        success: "\u2713",
        error: "\u2717",
        warning: "\u26A0",
        info: "\u2139",
        arrow: "\u2192",
        bullet: "\u2022",
    },
};
// ============================================================================
// OUTPUT COMPONENTS
// ============================================================================
var output_1 = require("./output");
Object.defineProperty(exports, "Box", { enumerable: true, get: function () { return output_1.Box; } });
Object.defineProperty(exports, "Table", { enumerable: true, get: function () { return output_1.Table; } });
Object.defineProperty(exports, "Progress", { enumerable: true, get: function () { return output_1.Progress; } });
Object.defineProperty(exports, "Spinner", { enumerable: true, get: function () { return output_1.Spinner; } });
Object.defineProperty(exports, "spin", { enumerable: true, get: function () { return output_1.spin; } });
Object.defineProperty(exports, "withSpinner", { enumerable: true, get: function () { return output_1.withSpinner; } });
Object.defineProperty(exports, "spinnerFrame", { enumerable: true, get: function () { return output_1.spinnerFrame; } });
Object.defineProperty(exports, "Divider", { enumerable: true, get: function () { return output_1.Divider; } });
Object.defineProperty(exports, "Banner", { enumerable: true, get: function () { return output_1.Banner; } });
Object.defineProperty(exports, "Status", { enumerable: true, get: function () { return output_1.Status; } });
// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================
/**
 * Legacy theme object for backwards compatibility.
 * New code should import { theme } directly.
 *
 * @deprecated Use `import { theme } from '../theme'` instead
 */
var chalk_theme_2 = require("./chalk-theme");
Object.defineProperty(exports, "legacyTheme", { enumerable: true, get: function () { return chalk_theme_2.theme; } });
//# sourceMappingURL=index.js.map