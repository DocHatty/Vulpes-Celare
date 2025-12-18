"use strict";
/**
 * ============================================================================
 * VULPES CELARE - CHALK THEME WRAPPER
 * ============================================================================
 *
 * Theme-aware chalk wrapper providing consistent styled output.
 * This is the primary interface for all CLI coloring.
 *
 * Features:
 * - Semantic color methods
 * - PHI type coloring
 * - Chainable styles (e.g., theme.primary.bold("text"))
 * - NO_COLOR environment support
 * - Dark/light mode detection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.styledOutput = exports.theme = void 0;
exports.supportsTrueColor = supportsTrueColor;
exports.createTheme = createTheme;
exports.formatStatus = formatStatus;
exports.success = success;
exports.error = error;
exports.warning = warning;
exports.info = info;
exports.labelValue = labelValue;
exports.keyValue = keyValue;
exports.heading = heading;
exports.subheading = subheading;
exports.highlight = highlight;
exports.muted = muted;
exports.phiType = phiType;
const chalk_1 = __importDefault(require("chalk"));
const colors_1 = require("./colors");
const icons_1 = require("./icons");
/**
 * Detect if colors should be disabled
 */
function shouldDisableColors() {
    return (process.env.NO_COLOR !== undefined ||
        process.env.VULPES_NO_COLOR === "1" ||
        process.argv.includes("--no-color"));
}
/**
 * Check if terminal supports true color
 */
function supportsTrueColor() {
    return (process.env.COLORTERM === "truecolor" ||
        process.env.TERM?.includes("truecolor") === true ||
        process.env.TERM?.includes("24bit") === true);
}
// ============================================================================
// CHAINABLE COLOR FACTORY
// ============================================================================
/**
 * Create a chainable color function from a hex color.
 * The returned function can be called directly: color("text")
 * Or with modifiers: color.bold("text"), color.dim("text"), etc.
 */
function createChainableColor(hexColor, enabled) {
    if (!enabled) {
        // Return identity functions when colors are disabled
        const identity = ((text) => text);
        identity.bold = (text) => text;
        identity.dim = (text) => text;
        identity.italic = (text) => text;
        identity.underline = (text) => text;
        return identity;
    }
    const baseColor = chalk_1.default.hex(hexColor);
    // Create the main function
    const fn = ((text) => baseColor(text));
    // Add chainable modifiers
    fn.bold = (text) => chalk_1.default.bold(baseColor(text));
    fn.dim = (text) => chalk_1.default.dim(baseColor(text));
    fn.italic = (text) => chalk_1.default.italic(baseColor(text));
    fn.underline = (text) => chalk_1.default.underline(baseColor(text));
    return fn;
}
/**
 * Create a chainable style function (like bold).
 */
function createChainableStyle(styleFn, enabled) {
    if (!enabled) {
        const identity = ((text) => text);
        identity.white = (text) => text;
        identity.black = (text) => text;
        return identity;
    }
    const fn = ((text) => styleFn(text));
    fn.white = (text) => styleFn(chalk_1.default.white(text));
    fn.black = (text) => styleFn(chalk_1.default.black(text));
    return fn;
}
// ============================================================================
// THEME FACTORY
// ============================================================================
/**
 * Create a theme instance with all chainable color functions.
 */
function createTheme(mode = "auto") {
    const isEnabled = mode !== "none" && !shouldDisableColors();
    // Identity function for disabled colors
    const identity = (text) => text;
    // Helper to create chainable hex color
    const color = (hexColor) => createChainableColor(hexColor, isEnabled);
    return {
        // Brand colors
        primary: color(colors_1.brand.primary),
        secondary: color(colors_1.brand.secondary),
        accent: color(colors_1.brand.accent),
        // Semantic colors
        success: color(colors_1.semantic.success),
        warning: color(colors_1.semantic.warning),
        error: color(colors_1.semantic.error),
        info: color(colors_1.semantic.info),
        debug: color(colors_1.semantic.debug),
        // Text styles
        bold: createChainableStyle(chalk_1.default.bold, isEnabled),
        dim: isEnabled ? chalk_1.default.dim : identity,
        italic: isEnabled ? chalk_1.default.italic : identity,
        underline: isEnabled ? chalk_1.default.underline : identity,
        strikethrough: isEnabled ? chalk_1.default.strikethrough : identity,
        // Neutral shades
        muted: color(colors_1.neutral[500]),
        subtle: color(colors_1.neutral[400]),
        faint: color(colors_1.neutral[600]),
        // Role colors
        user: color(colors_1.roles.user),
        assistant: color(colors_1.roles.assistant),
        system: color(colors_1.roles.system),
        agent: color(colors_1.roles.agent),
        tool: color(colors_1.roles.tool),
        code: color(colors_1.roles.code),
        orchestrator: color(colors_1.roles.orchestrator),
        // Additional role colors (used in some CLI files)
        original: color("#EF4444"), // Red for original text
        redacted: color("#22C55E"), // Green for redacted text
        workflow: color("#8B5CF6"), // Violet for workflow
        phase: color("#F59E0B"), // Amber for phases
        ai: color("#3B82F6"), // Blue for AI
        highlight: color("#9B59B6"), // Purple for highlights
        // Pre-styled combinations
        heading: isEnabled
            ? (text) => chalk_1.default.bold(chalk_1.default.hex(colors_1.brand.primary)(text))
            : identity,
        subheading: isEnabled ? chalk_1.default.hex(colors_1.neutral[400]) : identity,
        label: isEnabled ? chalk_1.default.hex(colors_1.neutral[500]) : identity,
        value: isEnabled ? chalk_1.default.white : identity,
        // PHI colors object
        phi: {
            name: color(colors_1.phi.NAME),
            ssn: color(colors_1.phi.SSN),
            phone: color(colors_1.phi.PHONE),
            email: color(colors_1.phi.EMAIL),
            address: color(colors_1.phi.ADDRESS),
            date: color(colors_1.phi.DATE),
            mrn: color(colors_1.phi.MRN),
            default: color(colors_1.phi.DEFAULT),
        },
        // Utility
        raw: chalk_1.default,
        isEnabled,
    };
}
// ============================================================================
// SINGLETON THEME INSTANCE
// ============================================================================
/** Default theme instance - use this throughout the application */
exports.theme = createTheme();
// ============================================================================
// STYLED OUTPUT HELPERS
// ============================================================================
/**
 * Format a status message with icon
 */
function formatStatus(type, message) {
    const icon = icons_1.status[type];
    const colorFn = exports.theme[type];
    return `${colorFn(icon)} ${message}`;
}
/**
 * Format a success message
 */
function success(message) {
    return formatStatus("success", message);
}
/**
 * Format an error message
 */
function error(message) {
    return `${exports.theme.error(icons_1.status.error)} ${exports.theme.error(message)}`;
}
/**
 * Format a warning message
 */
function warning(message) {
    return `${exports.theme.warning(icons_1.status.warning)} ${exports.theme.warning(message)}`;
}
/**
 * Format an info message
 */
function info(message) {
    return formatStatus("info", message);
}
/**
 * Format a label-value pair
 */
function labelValue(label, value, width = 20) {
    const paddedLabel = label.padEnd(width);
    return `${exports.theme.label(paddedLabel)} ${exports.theme.value(value)}`;
}
/**
 * Format a key-value for display
 */
function keyValue(key, value) {
    return `${exports.theme.muted(key + ":")} ${value}`;
}
/**
 * Create a styled heading
 */
function heading(text) {
    return exports.theme.heading(text);
}
/**
 * Create a styled subheading
 */
function subheading(text) {
    return exports.theme.subheading(text);
}
/**
 * Highlight text with accent color
 */
function highlight(text) {
    return exports.theme.accent(text);
}
/**
 * Dim/mute text
 */
function muted(text) {
    return exports.theme.muted(text);
}
/**
 * Format PHI type with appropriate color
 */
function phiType(type, text) {
    const upperType = type.toLowerCase();
    const colorFn = exports.theme.phi[upperType] || exports.theme.phi.default;
    return colorFn(text ?? type);
}
// ============================================================================
// COMBINED EXPORT
// ============================================================================
exports.styledOutput = {
    formatStatus,
    success,
    error,
    warning,
    info,
    labelValue,
    keyValue,
    heading,
    subheading,
    highlight,
    muted,
    phiType,
};
//# sourceMappingURL=chalk-theme.js.map