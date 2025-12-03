/**
 * SpanFactory - Centralized Span Creation Utilities
 *
 * Provides convenience methods for creating Spans with sensible defaults.
 * Eliminates boilerplate code across filter implementations.
 *
 * Usage:
 *   // From regex match
 *   const span = SpanFactory.fromMatch(text, match, FilterType.SSN, { confidence: 0.95 });
 *
 *   // From position
 *   const span = SpanFactory.fromPosition(text, 10, 20, FilterType.NAME);
 *
 *   // From text substring
 *   const span = SpanFactory.fromText(document, "John Smith", FilterType.NAME);
 *
 * @module redaction/core
 */

import { Span, SpanMetadata, FilterType } from "../models/Span";
import { FilterPriority } from "./SpanBasedFilter";

/**
 * Options for Span creation - all optional with sensible defaults
 */
export interface SpanCreateOptions {
  /** Detection confidence (0.0 to 1.0). Default: 0.9 */
  confidence?: number;

  /** Priority for overlap resolution. Default: based on FilterType */
  priority?: number;

  /** Surrounding context. Default: extracted from text */
  context?: string;

  /** Context window tokens. Default: [] */
  window?: string[];

  /** Pre-computed replacement. Default: null */
  replacement?: string | null;

  /** Salt for hashing strategies. Default: null */
  salt?: string | null;

  /** Pattern that matched (for debugging). Default: null */
  pattern?: string | null;

  /** Other possible interpretations. Default: [] */
  ambiguousWith?: FilterType[];

  /** Disambiguation score. Default: null */
  disambiguationScore?: number | null;
}

/**
 * SpanFactory - Static utility class for creating Spans
 */
export class SpanFactory {
  /** Default context extraction size (characters before/after match) */
  private static readonly CONTEXT_SIZE = 50;

  /**
   * Get default priority for a filter type
   */
  static getDefaultPriority(filterType: FilterType): number {
    const priorityMap: Partial<Record<FilterType, number>> = {
      [FilterType.SSN]: FilterPriority.SSN,
      [FilterType.CREDIT_CARD]: FilterPriority.CREDITCARD,
      [FilterType.MRN]: FilterPriority.MRN,
      [FilterType.NPI]: FilterPriority.NPI,
      [FilterType.DEA]: FilterPriority.MRN,
      [FilterType.DEVICE]: FilterPriority.DEVICE,
      [FilterType.ACCOUNT]: FilterPriority.ACCOUNT,
      [FilterType.LICENSE]: FilterPriority.LICENSE,
      [FilterType.PASSPORT]: FilterPriority.LICENSE,
      [FilterType.HEALTH_PLAN]: FilterPriority.HEALTHPLAN,
      [FilterType.DATE]: FilterPriority.DATE,
      [FilterType.AGE]: FilterPriority.DATE,
      [FilterType.PHONE]: FilterPriority.PHONE,
      [FilterType.FAX]: FilterPriority.FAX,
      [FilterType.EMAIL]: FilterPriority.EMAIL,
      [FilterType.NAME]: FilterPriority.NAME,
      [FilterType.PROVIDER_NAME]: FilterPriority.NAME,
      [FilterType.ADDRESS]: FilterPriority.ADDRESS,
      [FilterType.ZIPCODE]: FilterPriority.ZIPCODE,
      [FilterType.VEHICLE]: FilterPriority.VEHICLE,
      [FilterType.BIOMETRIC]: FilterPriority.BIOMETRIC,
      [FilterType.URL]: FilterPriority.URL,
      [FilterType.IP]: FilterPriority.IP,
    };

    return priorityMap[filterType] ?? 5;
  }

  /**
   * Extract context around a position in text
   */
  static extractContext(
    text: string,
    start: number,
    end: number,
    contextSize: number = SpanFactory.CONTEXT_SIZE,
  ): string {
    const contextStart = Math.max(0, start - contextSize);
    const contextEnd = Math.min(text.length, end + contextSize);
    return text.substring(contextStart, contextEnd);
  }

  /**
   * Create a Span from a RegExp match
   *
   * @param text - The full text being searched
   * @param match - RegExp match result (must have index property)
   * @param filterType - Type of PHI detected
   * @param options - Optional overrides for defaults
   * @returns New Span instance
   *
   * @example
   * const pattern = /\d{3}-\d{2}-\d{4}/g;
   * let match;
   * while ((match = pattern.exec(text)) !== null) {
   *   spans.push(SpanFactory.fromMatch(text, match, FilterType.SSN));
   * }
   */
  static fromMatch(
    text: string,
    match: RegExpMatchArray | RegExpExecArray,
    filterType: FilterType,
    options: SpanCreateOptions = {},
  ): Span {
    if (match.index === undefined) {
      throw new Error("RegExp match must have index property (use exec() or matchAll())");
    }

    const start = match.index;
    const end = start + match[0].length;
    const matchedText = match[0];

    return new Span({
      text: matchedText,
      originalValue: matchedText,
      characterStart: start,
      characterEnd: end,
      filterType,
      confidence: options.confidence ?? 0.9,
      priority: options.priority ?? this.getDefaultPriority(filterType),
      context: options.context ?? this.extractContext(text, start, end),
      window: options.window ?? [],
      replacement: options.replacement ?? null,
      salt: options.salt ?? null,
      pattern: options.pattern ?? null,
      applied: false,
      ignored: false,
      ambiguousWith: options.ambiguousWith ?? [],
      disambiguationScore: options.disambiguationScore ?? null,
    });
  }

  /**
   * Create a Span from explicit character positions
   *
   * @param text - The full text
   * @param start - Start character index
   * @param end - End character index
   * @param filterType - Type of PHI detected
   * @param options - Optional overrides for defaults
   * @returns New Span instance
   *
   * @example
   * // Create span for characters 10-20
   * const span = SpanFactory.fromPosition(text, 10, 20, FilterType.NAME);
   */
  static fromPosition(
    text: string,
    start: number,
    end: number,
    filterType: FilterType,
    options: SpanCreateOptions = {},
  ): Span {
    if (start < 0 || end > text.length || start >= end) {
      throw new Error(`Invalid span positions: start=${start}, end=${end}, text.length=${text.length}`);
    }

    const matchedText = text.substring(start, end);

    return new Span({
      text: matchedText,
      originalValue: matchedText,
      characterStart: start,
      characterEnd: end,
      filterType,
      confidence: options.confidence ?? 0.9,
      priority: options.priority ?? this.getDefaultPriority(filterType),
      context: options.context ?? this.extractContext(text, start, end),
      window: options.window ?? [],
      replacement: options.replacement ?? null,
      salt: options.salt ?? null,
      pattern: options.pattern ?? null,
      applied: false,
      ignored: false,
      ambiguousWith: options.ambiguousWith ?? [],
      disambiguationScore: options.disambiguationScore ?? null,
    });
  }

  /**
   * Create a Span by finding text within a document
   * Finds the first occurrence of the substring
   *
   * @param document - The full document text
   * @param searchText - Text to find
   * @param filterType - Type of PHI detected
   * @param options - Optional overrides for defaults
   * @returns New Span instance, or null if text not found
   *
   * @example
   * const span = SpanFactory.fromText(document, "John Smith", FilterType.NAME);
   */
  static fromText(
    document: string,
    searchText: string,
    filterType: FilterType,
    options: SpanCreateOptions = {},
  ): Span | null {
    const index = document.indexOf(searchText);
    if (index === -1) {
      return null;
    }

    return this.fromPosition(
      document,
      index,
      index + searchText.length,
      filterType,
      options,
    );
  }

  /**
   * Create multiple Spans for all occurrences of text in a document
   *
   * @param document - The full document text
   * @param searchText - Text to find (all occurrences)
   * @param filterType - Type of PHI detected
   * @param options - Optional overrides for defaults
   * @returns Array of Span instances
   */
  static fromTextAll(
    document: string,
    searchText: string,
    filterType: FilterType,
    options: SpanCreateOptions = {},
  ): Span[] {
    const spans: Span[] = [];
    let index = 0;

    while ((index = document.indexOf(searchText, index)) !== -1) {
      spans.push(
        this.fromPosition(
          document,
          index,
          index + searchText.length,
          filterType,
          options,
        ),
      );
      index += searchText.length;
    }

    return spans;
  }

  /**
   * Create a Span with high confidence (0.95+)
   * Use for highly reliable detections like validated SSNs, MRNs with checksums
   */
  static highConfidence(
    text: string,
    match: RegExpMatchArray | RegExpExecArray,
    filterType: FilterType,
    options: SpanCreateOptions = {},
  ): Span {
    return this.fromMatch(text, match, filterType, {
      ...options,
      confidence: options.confidence ?? 0.95,
    });
  }

  /**
   * Create a Span with medium confidence (0.7-0.85)
   * Use for pattern matches that may need context validation
   */
  static mediumConfidence(
    text: string,
    match: RegExpMatchArray | RegExpExecArray,
    filterType: FilterType,
    options: SpanCreateOptions = {},
  ): Span {
    return this.fromMatch(text, match, filterType, {
      ...options,
      confidence: options.confidence ?? 0.75,
    });
  }

  /**
   * Create a Span with low confidence (0.5-0.65)
   * Use for possible matches that need disambiguation
   */
  static lowConfidence(
    text: string,
    match: RegExpMatchArray | RegExpExecArray,
    filterType: FilterType,
    options: SpanCreateOptions = {},
  ): Span {
    return this.fromMatch(text, match, filterType, {
      ...options,
      confidence: options.confidence ?? 0.6,
    });
  }

  /**
   * Create a Span with elevated priority
   * Use for field-contextual matches (e.g., value following "SSN:" label)
   */
  static withElevatedPriority(
    text: string,
    match: RegExpMatchArray | RegExpExecArray,
    filterType: FilterType,
    priorityBoost: number = 100,
    options: SpanCreateOptions = {},
  ): Span {
    const basePriority = options.priority ?? this.getDefaultPriority(filterType);
    return this.fromMatch(text, match, filterType, {
      ...options,
      priority: basePriority + priorityBoost,
      confidence: options.confidence ?? 0.95, // Field context = high confidence
    });
  }

  /**
   * Clone a span with modifications
   *
   * @param original - Span to clone
   * @param overrides - Properties to override
   * @returns New Span instance with overrides applied
   */
  static clone(original: Span, overrides: Partial<SpanMetadata> = {}): Span {
    return new Span({
      text: overrides.text ?? original.text,
      originalValue: overrides.originalValue ?? original.text,
      characterStart: overrides.characterStart ?? original.characterStart,
      characterEnd: overrides.characterEnd ?? original.characterEnd,
      filterType: overrides.filterType ?? original.filterType,
      confidence: overrides.confidence ?? original.confidence,
      priority: overrides.priority ?? original.priority,
      context: overrides.context ?? original.context,
      window: overrides.window ?? [...original.window],
      replacement: overrides.replacement ?? original.replacement,
      salt: overrides.salt ?? original.salt,
      pattern: overrides.pattern ?? original.pattern,
      applied: overrides.applied ?? original.applied,
      ignored: overrides.ignored ?? original.ignored,
      ambiguousWith: overrides.ambiguousWith ?? [...original.ambiguousWith],
      disambiguationScore: overrides.disambiguationScore ?? original.disambiguationScore,
    });
  }

  /**
   * Create a batch of spans from multiple regex matches
   * Useful for filters that run multiple patterns
   *
   * @param text - The full text being searched
   * @param patterns - Array of compiled regex patterns
   * @param filterType - Type of PHI detected
   * @param options - Optional overrides for defaults
   * @returns Array of Span instances from all matches
   */
  static fromPatterns(
    text: string,
    patterns: RegExp[],
    filterType: FilterType,
    options: SpanCreateOptions = {},
  ): Span[] {
    const spans: Span[] = [];

    for (const pattern of patterns) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        spans.push(this.fromMatch(text, match, filterType, {
          ...options,
          pattern: options.pattern ?? pattern.source,
        }));
      }
    }

    return spans;
  }
}
