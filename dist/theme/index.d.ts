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
export { colors, brand, semantic, neutral, phi, roles, terminal, } from "./colors";
export type { ColorKey, BrandColor, SemanticColor, NeutralShade, PHIType, RoleColor, } from "./colors";
export { icons, ico, status, arrows, bullets, boxRounded, boxSharp, boxDouble, boxHeavy, progress, spinnerFrames, semantic as semanticIcons, dividers, } from "./icons";
export { spacing, padding, indent, lineSpacing, widths, indentStr, blankLines, getTerminalWidth, getContentWidth, spacingSystem, } from "./spacing";
export { borders, boxStyles, dividerStyles, getBoxChars, getTableChars, minimalTableChars, createDivider, drawBox, } from "./borders";
export type { BorderStyle, BoxChars, DividerStyle, TableChars, BoxOptions, } from "./borders";
export { typography, alignText, centerInTerminal, truncate, truncateMiddle, wrapText, wrapWithIndent, titleCase, sentenceCase, snakeToTitle, camelToTitle, formatNumber, formatPercent, formatBytes, formatDuration, formatConfidence, stripAnsi, visibleLength, padEnd, padStart, } from "./typography";
export type { TextAlign } from "./typography";
export { theme, createTheme, styledOutput, formatStatus, success, error, warning, info, labelValue, keyValue, heading, subheading, highlight, muted, phiType, supportsTrueColor, } from "./chalk-theme";
export type { VulpesTheme, ColorMode, ChainableColor, ChainableStyle, PHIColors, } from "./chalk-theme";
/**
 * Quick access to the most commonly used theme elements
 */
export declare const vulpesTheme: {
    readonly theme: unknown;
    readonly colors: {
        readonly primary: "#FF6B35";
        readonly secondary: "#4ECDC4";
        readonly accent: "#FFE66D";
        readonly success: "#10B981";
        readonly warning: "#F59E0B";
        readonly error: "#EF4444";
        readonly info: "#3B82F6";
    };
    readonly icons: {
        readonly success: "✓";
        readonly error: "✗";
        readonly warning: "⚠";
        readonly info: "ℹ";
        readonly arrow: "→";
        readonly bullet: "•";
    };
};
export { Box, Table, Progress, Spinner, spin, withSpinner, spinnerFrame, Divider, Banner, Status, } from "./output";
export type { BoxStyle as OutputBoxStyle, BoxAlign as OutputBoxAlign, BoxOptions as OutputBoxOptions, TableStyle as OutputTableStyle, TableAlign as OutputTableAlign, TableOptions as OutputTableOptions, ProgressStyle, ProgressBarOptions, StageOptions, SpinnerStyle, SpinnerOptions, DividerStyle as OutputDividerStyle, DividerAlign, DividerOptions as OutputDividerOptions, TitledDividerOptions, BannerOptions, StatusType, StatusOptions, } from "./output";
/**
 * Legacy theme object for backwards compatibility.
 * New code should import { theme } directly.
 *
 * @deprecated Use `import { theme } from '../theme'` instead
 */
export { theme as legacyTheme } from "./chalk-theme";
//# sourceMappingURL=index.d.ts.map