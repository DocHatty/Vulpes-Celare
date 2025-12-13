/**
 * Window Service - Extract context windows around spans
 *
 * Provides surrounding tokens (±N words) for context-aware analysis.
 * Used by confidence modifiers and disambiguation services.
 *
 * @module redaction/services
 */

import { Span } from "../models/Span";
import { loadNativeBinding } from "../native/binding";

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
 * Token with position information
 */
interface TokenWithPosition {
  text: string;
  start: number;
  end: number;
}

let cachedNativeTokenizer:
  | ((text: string, includePunctuation: boolean) => TokenWithPosition[])
  | null
  | undefined = undefined;

function getNativeTokenizer():
  | ((text: string, includePunctuation: boolean) => TokenWithPosition[])
  | null {
  if (cachedNativeTokenizer !== undefined) return cachedNativeTokenizer ?? null;
  try {
    const binding = loadNativeBinding({ configureOrt: false });
    cachedNativeTokenizer =
      typeof binding.tokenizeWithPositions === "function"
        ? (binding.tokenizeWithPositions as any)
        : null;
  } catch {
    cachedNativeTokenizer = null;
  }
  return cachedNativeTokenizer ?? null;
}

/**
 * Window Service - Extracts context windows around text spans
 */
export class WindowService {
  private static readonly DEFAULT_WINDOW_SIZE = 5;
  private static readonly WORD_BOUNDARY_PATTERN = /\b/;
  private static readonly TOKEN_PATTERN = /\w+|[^\w\s]/g;

  /**
   * Tokenize text with position information
   * Uses regex matchAll to get exact positions, avoiding indexOf bugs
   *
   * @param text - Text to tokenize
   * @param includePunctuation - Include punctuation as separate tokens
   * @returns Array of tokens with their positions
   */
  private static tokenizeWithPositions(
    text: string,
    includePunctuation: boolean,
  ): TokenWithPosition[] {
    // Optional Rust accelerator (shares the `VULPES_TEXT_ACCEL=1` gate with other text helpers).
    if (process.env.VULPES_TEXT_ACCEL === "1") {
      const nativeTokenizer = getNativeTokenizer();
      if (nativeTokenizer) {
        try {
          return nativeTokenizer(text, includePunctuation);
        } catch {
          // Fall through to JS tokenizer.
        }
      }
    }

    const pattern = includePunctuation ? this.TOKEN_PATTERN : /\w+/g;
    const tokens: TokenWithPosition[] = [];

    for (const match of text.matchAll(pattern)) {
      tokens.push({
        text: match[0],
        start: match.index!,
        end: match.index! + match[0].length,
      });
    }

    return tokens;
  }

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

    // Tokenize with positions to avoid indexOf bugs
    const tokensWithPos = this.tokenizeWithPositions(text, includePunctuation);

    // Find which tokens overlap with the span using exact positions
    let spanTokenStart = -1;
    let spanTokenEnd = -1;

    for (let i = 0; i < tokensWithPos.length; i++) {
      const token = tokensWithPos[i];

      // Check if this token overlaps with the span
      if (token.start < span.characterEnd && token.end > span.characterStart) {
        if (spanTokenStart === -1) {
          spanTokenStart = i;
        }
        spanTokenEnd = i;
      }
    }

    if (spanTokenStart === -1) {
      return []; // Span not found in tokens
    }

    // Extract window: [start-windowSize, end+windowSize]
    const windowStart = Math.max(0, spanTokenStart - windowSize);
    const windowEnd = Math.min(
      tokensWithPos.length,
      spanTokenEnd + 1 + windowSize,
    );

    let windowTokens = tokensWithPos
      .slice(windowStart, windowEnd)
      .map((t) => t.text);

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

    // Tokenize with positions to avoid indexOf bugs
    const tokensWithPos = this.tokenizeWithPositions(text, includePunctuation);

    // Find which tokens overlap with the position using exact positions
    let spanTokenStart = -1;
    let spanTokenEnd = -1;

    for (let i = 0; i < tokensWithPos.length; i++) {
      const token = tokensWithPos[i];

      // Check if this token overlaps with the position
      if (token.start < end && token.end > start) {
        if (spanTokenStart === -1) {
          spanTokenStart = i;
        }
        spanTokenEnd = i;
      }
    }

    if (spanTokenStart === -1) {
      return [];
    }

    // Extract window
    const windowStart = Math.max(0, spanTokenStart - windowSize);
    const windowEnd = Math.min(
      tokensWithPos.length,
      spanTokenEnd + 1 + windowSize,
    );

    let windowTokens = tokensWithPos
      .slice(windowStart, windowEnd)
      .map((t) => t.text);

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
  private static tokenize(text: string, includePunctuation: boolean): string[] {
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
    const tokensWithPos = this.tokenizeWithPositions(text, false);
    let spanTokenStart = -1;

    for (let i = 0; i < tokensWithPos.length; i++) {
      const token = tokensWithPos[i];

      if (token.start >= span.characterStart) {
        spanTokenStart = i;
        break;
      }
    }

    if (spanTokenStart === -1) {
      return [];
    }

    const start = Math.max(0, spanTokenStart - count);
    return tokensWithPos.slice(start, spanTokenStart).map((t) => t.text);
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
    const tokensWithPos = this.tokenizeWithPositions(text, false);
    let spanTokenEnd = -1;

    for (let i = 0; i < tokensWithPos.length; i++) {
      const token = tokensWithPos[i];

      if (token.end > span.characterEnd) {
        spanTokenEnd = i;
        break;
      }
    }

    if (spanTokenEnd === -1) {
      spanTokenEnd = tokensWithPos.length;
    }

    const end = Math.min(tokensWithPos.length, spanTokenEnd + count);
    return tokensWithPos.slice(spanTokenEnd, end).map((t) => t.text);
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
