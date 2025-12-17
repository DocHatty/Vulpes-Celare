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

// ============================================================================
// CORE EXPORTS
// ============================================================================

// Colors
export {
  colors,
  brand,
  semantic,
  neutral,
  phi,
  roles,
  terminal,
} from "./colors";
export type {
  ColorKey,
  BrandColor,
  SemanticColor,
  NeutralShade,
  PHIType,
  RoleColor,
} from "./colors";

// Icons
export {
  icons,
  ico,
  status,
  arrows,
  bullets,
  boxRounded,
  boxSharp,
  boxDouble,
  boxHeavy,
  progress,
  spinnerFrames,
  semantic as semanticIcons,
  dividers,
} from "./icons";

// Spacing
export {
  spacing,
  padding,
  indent,
  lineSpacing,
  widths,
  indentStr,
  blankLines,
  getTerminalWidth,
  getContentWidth,
  spacingSystem,
} from "./spacing";

// Borders
export {
  borders,
  boxStyles,
  dividerStyles,
  getBoxChars,
  getTableChars,
  minimalTableChars,
  createDivider,
  drawBox,
} from "./borders";
export type {
  BorderStyle,
  BoxChars,
  DividerStyle,
  TableChars,
  BoxOptions,
} from "./borders";

// Typography
export {
  typography,
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
} from "./typography";
export type { TextAlign } from "./typography";

// Chalk Theme (main theme object)
export {
  theme,
  createTheme,
  styledOutput,
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
  supportsTrueColor,
} from "./chalk-theme";
export type {
  VulpesTheme,
  ColorMode,
  ChainableColor,
  ChainableStyle,
  PHIColors,
} from "./chalk-theme";

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

/**
 * Quick access to the most commonly used theme elements
 */
export const vulpesTheme = {
  // Main theme object
  theme: undefined as unknown, // Will be set below

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
} as const;

// ============================================================================
// OUTPUT COMPONENTS
// ============================================================================

export {
  Box,
  Table,
  Progress,
  Spinner,
  spin,
  withSpinner,
  spinnerFrame,
  Divider,
  Banner,
  Status,
} from "./output";
export type {
  BoxStyle as OutputBoxStyle,
  BoxAlign as OutputBoxAlign,
  BoxOptions as OutputBoxOptions,
  TableStyle as OutputTableStyle,
  TableAlign as OutputTableAlign,
  TableOptions as OutputTableOptions,
  ProgressStyle,
  ProgressBarOptions,
  StageOptions,
  SpinnerStyle,
  SpinnerOptions,
  DividerStyle as OutputDividerStyle,
  DividerAlign,
  DividerOptions as OutputDividerOptions,
  TitledDividerOptions,
  BannerOptions,
  StatusType,
  StatusOptions,
} from "./output";

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy theme object for backwards compatibility.
 * New code should import { theme } directly.
 *
 * @deprecated Use `import { theme } from '../theme'` instead
 */
export { theme as legacyTheme } from "./chalk-theme";
