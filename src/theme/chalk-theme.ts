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
import { brand, semantic, neutral, phi, roles } from "./colors";
import { status as statusIcons } from "./icons";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// COLOR MODE DETECTION
// ============================================================================

export type ColorMode = "auto" | "dark" | "light" | "none";

/**
 * Detect if colors should be disabled
 */
function shouldDisableColors(): boolean {
  return (
    process.env.NO_COLOR !== undefined ||
    process.env.VULPES_NO_COLOR === "1" ||
    process.argv.includes("--no-color")
  );
}

/**
 * Check if terminal supports true color
 */
export function supportsTrueColor(): boolean {
  return (
    process.env.COLORTERM === "truecolor" ||
    process.env.TERM?.includes("truecolor") === true ||
    process.env.TERM?.includes("24bit") === true
  );
}

// ============================================================================
// CHAINABLE COLOR FACTORY
// ============================================================================

/**
 * Create a chainable color function from a hex color.
 * The returned function can be called directly: color("text")
 * Or with modifiers: color.bold("text"), color.dim("text"), etc.
 */
function createChainableColor(hexColor: string, enabled: boolean): ChainableColor {
  if (!enabled) {
    // Return identity functions when colors are disabled
    const identity = ((text: string) => text) as ChainableColor;
    identity.bold = (text: string) => text;
    identity.dim = (text: string) => text;
    identity.italic = (text: string) => text;
    identity.underline = (text: string) => text;
    return identity;
  }

  const baseColor = chalk.hex(hexColor);

  // Create the main function
  const fn = ((text: string) => baseColor(text)) as ChainableColor;

  // Add chainable modifiers
  fn.bold = (text: string) => chalk.bold(baseColor(text));
  fn.dim = (text: string) => chalk.dim(baseColor(text));
  fn.italic = (text: string) => chalk.italic(baseColor(text));
  fn.underline = (text: string) => chalk.underline(baseColor(text));

  return fn;
}

/**
 * Create a chainable style function (like bold).
 */
function createChainableStyle(
  styleFn: (text: string) => string,
  enabled: boolean
): ChainableStyle {
  if (!enabled) {
    const identity = ((text: string) => text) as ChainableStyle;
    identity.white = (text: string) => text;
    identity.black = (text: string) => text;
    return identity;
  }

  const fn = ((text: string) => styleFn(text)) as ChainableStyle;
  fn.white = (text: string) => styleFn(chalk.white(text));
  fn.black = (text: string) => styleFn(chalk.black(text));

  return fn;
}

// ============================================================================
// THEME INTERFACE
// ============================================================================

export interface VulpesTheme {
  // Brand colors (chainable)
  primary: ChainableColor;
  secondary: ChainableColor;
  accent: ChainableColor;

  // Semantic colors (chainable)
  success: ChainableColor;
  warning: ChainableColor;
  error: ChainableColor;
  info: ChainableColor;
  debug: ChainableColor;

  // Text styles (chainable)
  bold: ChainableStyle;
  dim: (text: string) => string;
  italic: (text: string) => string;
  underline: (text: string) => string;
  strikethrough: (text: string) => string;

  // Neutral shades (chainable)
  muted: ChainableColor;
  subtle: ChainableColor;
  faint: ChainableColor;

  // Role colors (chainable)
  user: ChainableColor;
  assistant: ChainableColor;
  system: ChainableColor;
  agent: ChainableColor;
  tool: ChainableColor;
  code: ChainableColor;
  orchestrator: ChainableColor;

  // Additional role colors used in some files
  original: ChainableColor;
  redacted: ChainableColor;
  workflow: ChainableColor;
  phase: ChainableColor;
  ai: ChainableColor;
  highlight: ChainableColor;

  // Combinations (non-chainable, pre-styled)
  heading: (text: string) => string;
  subheading: (text: string) => string;
  label: (text: string) => string;
  value: (text: string) => string;

  // PHI colors (object with named colors)
  phi: PHIColors;

  // Utility
  raw: typeof chalk;
  isEnabled: boolean;
}

// ============================================================================
// THEME FACTORY
// ============================================================================

/**
 * Create a theme instance with all chainable color functions.
 */
export function createTheme(mode: ColorMode = "auto"): VulpesTheme {
  const isEnabled = mode !== "none" && !shouldDisableColors();

  // Identity function for disabled colors
  const identity = (text: string) => text;

  // Helper to create chainable hex color
  const color = (hexColor: string) => createChainableColor(hexColor, isEnabled);

  return {
    // Brand colors
    primary: color(brand.primary),
    secondary: color(brand.secondary),
    accent: color(brand.accent),

    // Semantic colors
    success: color(semantic.success),
    warning: color(semantic.warning),
    error: color(semantic.error),
    info: color(semantic.info),
    debug: color(semantic.debug),

    // Text styles
    bold: createChainableStyle(chalk.bold, isEnabled),
    dim: isEnabled ? chalk.dim : identity,
    italic: isEnabled ? chalk.italic : identity,
    underline: isEnabled ? chalk.underline : identity,
    strikethrough: isEnabled ? chalk.strikethrough : identity,

    // Neutral shades
    muted: color(neutral[500]),
    subtle: color(neutral[400]),
    faint: color(neutral[600]),

    // Role colors
    user: color(roles.user),
    assistant: color(roles.assistant),
    system: color(roles.system),
    agent: color(roles.agent),
    tool: color(roles.tool),
    code: color(roles.code),
    orchestrator: color(roles.orchestrator),

    // Additional role colors (used in some CLI files)
    original: color("#EF4444"),  // Red for original text
    redacted: color("#22C55E"),  // Green for redacted text
    workflow: color("#8B5CF6"),  // Violet for workflow
    phase: color("#F59E0B"),     // Amber for phases
    ai: color("#3B82F6"),        // Blue for AI
    highlight: color("#9B59B6"), // Purple for highlights

    // Pre-styled combinations
    heading: isEnabled
      ? (text: string) => chalk.bold(chalk.hex(brand.primary)(text))
      : identity,
    subheading: isEnabled ? chalk.hex(neutral[400]) : identity,
    label: isEnabled ? chalk.hex(neutral[500]) : identity,
    value: isEnabled ? chalk.white : identity,

    // PHI colors object
    phi: {
      name: color(phi.NAME),
      ssn: color(phi.SSN),
      phone: color(phi.PHONE),
      email: color(phi.EMAIL),
      address: color(phi.ADDRESS),
      date: color(phi.DATE),
      mrn: color(phi.MRN),
      default: color(phi.DEFAULT),
    },

    // Utility
    raw: chalk,
    isEnabled,
  };
}

// ============================================================================
// SINGLETON THEME INSTANCE
// ============================================================================

/** Default theme instance - use this throughout the application */
export const theme = createTheme();

// ============================================================================
// STYLED OUTPUT HELPERS
// ============================================================================

/**
 * Format a status message with icon
 */
export function formatStatus(
  type: "success" | "error" | "warning" | "info",
  message: string
): string {
  const icon = statusIcons[type];
  const colorFn = theme[type];
  return `${colorFn(icon)} ${message}`;
}

/**
 * Format a success message
 */
export function success(message: string): string {
  return formatStatus("success", message);
}

/**
 * Format an error message
 */
export function error(message: string): string {
  return `${theme.error(statusIcons.error)} ${theme.error(message)}`;
}

/**
 * Format a warning message
 */
export function warning(message: string): string {
  return `${theme.warning(statusIcons.warning)} ${theme.warning(message)}`;
}

/**
 * Format an info message
 */
export function info(message: string): string {
  return formatStatus("info", message);
}

/**
 * Format a label-value pair
 */
export function labelValue(label: string, value: string, width = 20): string {
  const paddedLabel = label.padEnd(width);
  return `${theme.label(paddedLabel)} ${theme.value(value)}`;
}

/**
 * Format a key-value for display
 */
export function keyValue(key: string, value: string | number): string {
  return `${theme.muted(key + ":")} ${value}`;
}

/**
 * Create a styled heading
 */
export function heading(text: string): string {
  return theme.heading(text);
}

/**
 * Create a styled subheading
 */
export function subheading(text: string): string {
  return theme.subheading(text);
}

/**
 * Highlight text with accent color
 */
export function highlight(text: string): string {
  return theme.accent(text);
}

/**
 * Dim/mute text
 */
export function muted(text: string): string {
  return theme.muted(text);
}

/**
 * Format PHI type with appropriate color
 */
export function phiType(type: string, text?: string): string {
  const upperType = type.toLowerCase() as keyof PHIColors;
  const colorFn = theme.phi[upperType] || theme.phi.default;
  return colorFn(text ?? type);
}

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const styledOutput = {
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
} as const;
