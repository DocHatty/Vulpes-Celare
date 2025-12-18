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
import chalk from "chalk";
/**
 * A chainable color function that can be called directly or with modifiers.
 * Supports: theme.primary("text") AND theme.primary.bold("text")
 */
export interface ChainableColor {
    (text: string): string;
    bold: (text: string) => string;
    dim: (text: string) => string;
    italic: (text: string) => string;
    underline: (text: string) => string;
}
/**
 * A chainable style function (like bold) that can combine with colors.
 */
export interface ChainableStyle {
    (text: string): string;
    white: (text: string) => string;
    black: (text: string) => string;
}
/**
 * PHI colors object with named color accessors.
 */
export interface PHIColors {
    name: ChainableColor;
    ssn: ChainableColor;
    phone: ChainableColor;
    email: ChainableColor;
    address: ChainableColor;
    date: ChainableColor;
    mrn: ChainableColor;
    default: ChainableColor;
}
export type ColorMode = "auto" | "dark" | "light" | "none";
/**
 * Check if terminal supports true color
 */
export declare function supportsTrueColor(): boolean;
export interface VulpesTheme {
    primary: ChainableColor;
    secondary: ChainableColor;
    accent: ChainableColor;
    success: ChainableColor;
    warning: ChainableColor;
    error: ChainableColor;
    info: ChainableColor;
    debug: ChainableColor;
    bold: ChainableStyle;
    dim: (text: string) => string;
    italic: (text: string) => string;
    underline: (text: string) => string;
    strikethrough: (text: string) => string;
    muted: ChainableColor;
    subtle: ChainableColor;
    faint: ChainableColor;
    user: ChainableColor;
    assistant: ChainableColor;
    system: ChainableColor;
    agent: ChainableColor;
    tool: ChainableColor;
    code: ChainableColor;
    orchestrator: ChainableColor;
    original: ChainableColor;
    redacted: ChainableColor;
    workflow: ChainableColor;
    phase: ChainableColor;
    ai: ChainableColor;
    highlight: ChainableColor;
    heading: (text: string) => string;
    subheading: (text: string) => string;
    label: (text: string) => string;
    value: (text: string) => string;
    phi: PHIColors;
    raw: typeof chalk;
    isEnabled: boolean;
}
/**
 * Create a theme instance with all chainable color functions.
 */
export declare function createTheme(mode?: ColorMode): VulpesTheme;
/** Default theme instance - use this throughout the application */
export declare const theme: VulpesTheme;
/**
 * Format a status message with icon
 */
export declare function formatStatus(type: "success" | "error" | "warning" | "info", message: string): string;
/**
 * Format a success message
 */
export declare function success(message: string): string;
/**
 * Format an error message
 */
export declare function error(message: string): string;
/**
 * Format a warning message
 */
export declare function warning(message: string): string;
/**
 * Format an info message
 */
export declare function info(message: string): string;
/**
 * Format a label-value pair
 */
export declare function labelValue(label: string, value: string, width?: number): string;
/**
 * Format a key-value for display
 */
export declare function keyValue(key: string, value: string | number): string;
/**
 * Create a styled heading
 */
export declare function heading(text: string): string;
/**
 * Create a styled subheading
 */
export declare function subheading(text: string): string;
/**
 * Highlight text with accent color
 */
export declare function highlight(text: string): string;
/**
 * Dim/mute text
 */
export declare function muted(text: string): string;
/**
 * Format PHI type with appropriate color
 */
export declare function phiType(type: string, text?: string): string;
export declare const styledOutput: {
    readonly formatStatus: typeof formatStatus;
    readonly success: typeof success;
    readonly error: typeof error;
    readonly warning: typeof warning;
    readonly info: typeof info;
    readonly labelValue: typeof labelValue;
    readonly keyValue: typeof keyValue;
    readonly heading: typeof heading;
    readonly subheading: typeof subheading;
    readonly highlight: typeof highlight;
    readonly muted: typeof muted;
    readonly phiType: typeof phiType;
};
//# sourceMappingURL=chalk-theme.d.ts.map