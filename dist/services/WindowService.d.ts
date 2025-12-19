/**
 * Window Service - Extract context windows around spans
 *
 * Provides surrounding tokens (±N words) for context-aware analysis.
 * Used by confidence modifiers and disambiguation services.
 *
 * @module redaction/services
 */
import { Span } from "../models/Span";
export interface WindowOptions {
    /**
     * Number of tokens before and after (default: 5)
     */
    size?: number;
    /**
     * Include punctuation as separate tokens (default: false)
     */
    includePunctuation?: boolean;
    /**
     * Convert to lowercase (default: false)
     */
    toLowerCase?: boolean;
}
/**
 * Window Service - Extracts context windows around text spans
 */
export declare class WindowService {
    private static readonly DEFAULT_WINDOW_SIZE;
    private static readonly TOKEN_PATTERN;
    /**
     * Tokenize text with position information
     * Uses regex matchAll to get exact positions, avoiding indexOf bugs
     *
     * @param text - Text to tokenize
     * @param includePunctuation - Include punctuation as separate tokens
     * @returns Array of tokens with their positions
     */
    private static tokenizeWithPositions;
    /**
     * Extract context window around a span
     *
     * @param text - Full document text
     * @param span - Span to extract window for
     * @param options - Window extraction options
     * @returns Array of tokens around the span (before + after)
     */
    static getWindow(text: string, span: Span, options?: WindowOptions): string[];
    /**
     * Extract context window around a character position
     *
     * @param text - Full document text
     * @param start - Start position
     * @param end - End position
     * @param options - Window extraction options
     * @returns Array of tokens around the position
     */
    static getWindowAt(text: string, start: number, end: number, options?: WindowOptions): string[];
    /**
     * Check if window contains specific keywords (case-insensitive)
     *
     * @param window - Token window
     * @param keywords - Keywords to search for
     * @returns True if any keyword found
     */
    static containsKeyword(window: string[], keywords: string[]): boolean;
    /**
     * Check if window contains any of the patterns
     *
     * @param window - Token window
     * @param patterns - Regex patterns to match
     * @returns True if any pattern matches
     */
    static matchesPattern(window: string[], patterns: RegExp[]): boolean;
    /**
     * Get tokens before the span
     *
     * @param text - Full document text
     * @param span - Span to get context for
     * @param count - Number of tokens before (default: 5)
     * @returns Array of tokens before span
     */
    static getTokensBefore(text: string, span: Span, count?: number): string[];
    /**
     * Get tokens after the span
     *
     * @param text - Full document text
     * @param span - Span to get context for
     * @param count - Number of tokens after (default: 5)
     * @returns Array of tokens after span
     */
    static getTokensAfter(text: string, span: Span, count?: number): string[];
    /**
     * Populate window for all spans in array
     *
     * @param text - Full document text
     * @param spans - Spans to populate windows for
     * @param options - Window extraction options
     */
    static populateWindows(text: string, spans: Span[], options?: WindowOptions): void;
}
//# sourceMappingURL=WindowService.d.ts.map