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
export class WindowService {
  private static readonly DEFAULT_WINDOW_SIZE = 5;
  private static readonly WORD_BOUNDARY_PATTERN = /\b/;
  private static readonly TOKEN_PATTERN = /\w+|[^\w\s]/g;

  /**
   * Extract context window around a span
   *
   * @param text - Full document text
   * @param span - Span to extract window for
   * @param options - Window extraction options
   * @returns Array of tokens around the span (before + after)
   */
  static getWindow(
    text: string,
    span: Span,
    options: WindowOptions = {},
  ): string[] {
    const windowSize = options.size ?? this.DEFAULT_WINDOW_SIZE;
    const includePunctuation = options.includePunctuation ?? false;
    const toLowerCase = options.toLowerCase ?? false;

    // Tokenize the entire text
    const tokens = this.tokenize(text, includePunctuation);

    // Find which tokens overlap with the span
    let spanTokenStart = -1;
    let spanTokenEnd = -1;
    let currentPos = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const tokenStart = text.indexOf(token, currentPos);
      const tokenEnd = tokenStart + token.length;

      // Check if this token overlaps with the span
      if (
        tokenStart < span.characterEnd &&
        tokenEnd > span.characterStart
      ) {
        if (spanTokenStart === -1) {
          spanTokenStart = i;
        }
        spanTokenEnd = i;
      }

      currentPos = tokenEnd;
    }

    if (spanTokenStart === -1) {
      return []; // Span not found in tokens
    }

    // Extract window: [start-windowSize, end+windowSize]
    const windowStart = Math.max(0, spanTokenStart - windowSize);
    const windowEnd = Math.min(tokens.length, spanTokenEnd + 1 + windowSize);

    let windowTokens = tokens.slice(windowStart, windowEnd);

    if (toLowerCase) {
      windowTokens = windowTokens.map((t) => t.toLowerCase());
    }

    return windowTokens;
  }

  /**
   * Extract context window around a character position
   *
   * @param text - Full document text
   * @param start - Start position
   * @param end - End position
   * @param options - Window extraction options
   * @returns Array of tokens around the position
   */
  static getWindowAt(
    text: string,
    start: number,
    end: number,
    options: WindowOptions = {},
  ): string[] {
    const windowSize = options.size ?? this.DEFAULT_WINDOW_SIZE;
    const includePunctuation = options.includePunctuation ?? false;
    const toLowerCase = options.toLowerCase ?? false;

    // Tokenize the entire text
    const tokens = this.tokenize(text, includePunctuation);

    // Find which tokens overlap with the position
    let spanTokenStart = -1;
    let spanTokenEnd = -1;
    let currentPos = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const tokenStart = text.indexOf(token, currentPos);
      const tokenEnd = tokenStart + token.length;

      // Check if this token overlaps with the position
      if (tokenStart < end && tokenEnd > start) {
        if (spanTokenStart === -1) {
          spanTokenStart = i;
        }
        spanTokenEnd = i;
      }

      currentPos = tokenEnd;
    }

    if (spanTokenStart === -1) {
      return [];
    }

    // Extract window
    const windowStart = Math.max(0, spanTokenStart - windowSize);
    const windowEnd = Math.min(tokens.length, spanTokenEnd + 1 + windowSize);

    let windowTokens = tokens.slice(windowStart, windowEnd);

    if (toLowerCase) {
      windowTokens = windowTokens.map((t) => t.toLowerCase());
    }

    return windowTokens;
  }

  /**
   * Tokenize text into words (and optionally punctuation)
   *
   * @param text - Text to tokenize
   * @param includePunctuation - Include punctuation as separate tokens
   * @returns Array of tokens
   */
  private static tokenize(
    text: string,
    includePunctuation: boolean,
  ): string[] {
    if (includePunctuation) {
      // Match words and punctuation separately
      return Array.from(text.matchAll(this.TOKEN_PATTERN)).map((m) => m[0]);
    } else {
      // Match only words
      return Array.from(text.matchAll(/\w+/g)).map((m) => m[0]);
    }
  }

  /**
   * Check if window contains specific keywords (case-insensitive)
   *
   * @param window - Token window
   * @param keywords - Keywords to search for
   * @returns True if any keyword found
   */
  static containsKeyword(window: string[], keywords: string[]): boolean {
    const lowerWindow = window.map((t) => t.toLowerCase());
    const lowerKeywords = keywords.map((k) => k.toLowerCase());

    return lowerWindow.some((token) => lowerKeywords.includes(token));
  }

  /**
   * Check if window contains any of the patterns
   *
   * @param window - Token window
   * @param patterns - Regex patterns to match
   * @returns True if any pattern matches
   */
  static matchesPattern(window: string[], patterns: RegExp[]): boolean {
    const windowText = window.join(" ");
    return patterns.some((pattern) => pattern.test(windowText));
  }

  /**
   * Get tokens before the span
   *
   * @param text - Full document text
   * @param span - Span to get context for
   * @param count - Number of tokens before (default: 5)
   * @returns Array of tokens before span
   */
  static getTokensBefore(
    text: string,
    span: Span,
    count: number = 5,
  ): string[] {
    const tokens = this.tokenize(text, false);
    let currentPos = 0;
    let spanTokenStart = -1;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const tokenStart = text.indexOf(token, currentPos);
      const tokenEnd = tokenStart + token.length;

      if (tokenStart >= span.characterStart) {
        spanTokenStart = i;
        break;
      }

      currentPos = tokenEnd;
    }

    if (spanTokenStart === -1) {
      return [];
    }

    const start = Math.max(0, spanTokenStart - count);
    return tokens.slice(start, spanTokenStart);
  }

  /**
   * Get tokens after the span
   *
   * @param text - Full document text
   * @param span - Span to get context for
   * @param count - Number of tokens after (default: 5)
   * @returns Array of tokens after span
   */
  static getTokensAfter(text: string, span: Span, count: number = 5): string[] {
    const tokens = this.tokenize(text, false);
    let currentPos = 0;
    let spanTokenEnd = -1;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const tokenStart = text.indexOf(token, currentPos);
      const tokenEnd = tokenStart + token.length;

      if (tokenEnd > span.characterEnd) {
        spanTokenEnd = i;
        break;
      }

      currentPos = tokenEnd;
    }

    if (spanTokenEnd === -1) {
      spanTokenEnd = tokens.length;
    }

    const end = Math.min(tokens.length, spanTokenEnd + count);
    return tokens.slice(spanTokenEnd, end);
  }

  /**
   * Populate window for all spans in array
   *
   * @param text - Full document text
   * @param spans - Spans to populate windows for
   * @param options - Window extraction options
   */
  static populateWindows(
    text: string,
    spans: Span[],
    options: WindowOptions = {},
  ): void {
    for (const span of spans) {
      span.window = this.getWindow(text, span, options);
    }
  }
}
