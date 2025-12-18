/**
 * ============================================================================
 * VULPES CELARE - TYPOGRAPHY SYSTEM
 * ============================================================================
 *
 * Text formatting utilities for consistent typography across the CLI.
 * Handles truncation, alignment, and text transformation.
 */
export type TextAlign = "left" | "center" | "right";
/**
 * Align text within a specified width
 */
export declare function alignText(text: string, width: number, align?: TextAlign): string;
/**
 * Center text within terminal width
 */
export declare function centerInTerminal(text: string): string;
/**
 * Truncate text with ellipsis
 */
export declare function truncate(text: string, maxLength: number, ellipsis?: string): string;
/**
 * Truncate from the middle (useful for file paths)
 */
export declare function truncateMiddle(text: string, maxLength: number, separator?: string): string;
/**
 * Wrap text to specified width
 */
export declare function wrapText(text: string, width: number): string[];
/**
 * Wrap and indent subsequent lines
 */
export declare function wrapWithIndent(text: string, width: number, indent?: string): string;
/**
 * Convert to title case
 */
export declare function titleCase(text: string): string;
/**
 * Convert to sentence case
 */
export declare function sentenceCase(text: string): string;
/**
 * Convert snake_case or SCREAMING_CASE to Title Case
 */
export declare function snakeToTitle(text: string): string;
/**
 * Convert camelCase to Title Case
 */
export declare function camelToTitle(text: string): string;
/**
 * Format a number with thousands separators
 */
export declare function formatNumber(num: number): string;
/**
 * Format a percentage
 */
export declare function formatPercent(value: number, decimals?: number, includeSign?: boolean): string;
/**
 * Format bytes to human readable
 */
export declare function formatBytes(bytes: number, decimals?: number): string;
/**
 * Format duration in milliseconds
 */
export declare function formatDuration(ms: number): string;
/**
 * Format confidence score
 */
export declare function formatConfidence(confidence: number): string;
/**
 * Strip ANSI escape codes
 */
export declare function stripAnsi(str: string): string;
/**
 * Get visible length of string (excluding ANSI codes)
 */
export declare function visibleLength(str: string): string;
/**
 * Pad string to width, accounting for ANSI codes
 */
export declare function padEnd(str: string, width: number, char?: string): string;
export declare function padStart(str: string, width: number, char?: string): string;
export declare const typography: {
    readonly alignText: typeof alignText;
    readonly centerInTerminal: typeof centerInTerminal;
    readonly truncate: typeof truncate;
    readonly truncateMiddle: typeof truncateMiddle;
    readonly wrapText: typeof wrapText;
    readonly wrapWithIndent: typeof wrapWithIndent;
    readonly titleCase: typeof titleCase;
    readonly sentenceCase: typeof sentenceCase;
    readonly snakeToTitle: typeof snakeToTitle;
    readonly camelToTitle: typeof camelToTitle;
    readonly formatNumber: typeof formatNumber;
    readonly formatPercent: typeof formatPercent;
    readonly formatBytes: typeof formatBytes;
    readonly formatDuration: typeof formatDuration;
    readonly formatConfidence: typeof formatConfidence;
    readonly stripAnsi: typeof stripAnsi;
    readonly visibleLength: typeof visibleLength;
    readonly padEnd: typeof padEnd;
    readonly padStart: typeof padStart;
};
//# sourceMappingURL=typography.d.ts.map