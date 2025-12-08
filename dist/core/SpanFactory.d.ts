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
export declare class SpanFactory {
    /** Default context extraction size (characters before/after match) */
    private static readonly CONTEXT_SIZE;
    /**
     * Get default priority for a filter type
     */
    static getDefaultPriority(filterType: FilterType): number;
    /**
     * Extract context around a position in text
     */
    static extractContext(text: string, start: number, end: number, contextSize?: number): string;
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
    static fromMatch(text: string, match: RegExpMatchArray | RegExpExecArray, filterType: FilterType, options?: SpanCreateOptions): Span;
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
    static fromPosition(text: string, start: number, end: number, filterType: FilterType, options?: SpanCreateOptions): Span;
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
    static fromText(document: string, searchText: string, filterType: FilterType, options?: SpanCreateOptions): Span | null;
    /**
     * Create multiple Spans for all occurrences of text in a document
     *
     * @param document - The full document text
     * @param searchText - Text to find (all occurrences)
     * @param filterType - Type of PHI detected
     * @param options - Optional overrides for defaults
     * @returns Array of Span instances
     */
    static fromTextAll(document: string, searchText: string, filterType: FilterType, options?: SpanCreateOptions): Span[];
    /**
     * Create a Span with high confidence (0.95+)
     * Use for highly reliable detections like validated SSNs, MRNs with checksums
     */
    static highConfidence(text: string, match: RegExpMatchArray | RegExpExecArray, filterType: FilterType, options?: SpanCreateOptions): Span;
    /**
     * Create a Span with medium confidence (0.7-0.85)
     * Use for pattern matches that may need context validation
     */
    static mediumConfidence(text: string, match: RegExpMatchArray | RegExpExecArray, filterType: FilterType, options?: SpanCreateOptions): Span;
    /**
     * Create a Span with low confidence (0.5-0.65)
     * Use for possible matches that need disambiguation
     */
    static lowConfidence(text: string, match: RegExpMatchArray | RegExpExecArray, filterType: FilterType, options?: SpanCreateOptions): Span;
    /**
     * Create a Span with elevated priority
     * Use for field-contextual matches (e.g., value following "SSN:" label)
     */
    static withElevatedPriority(text: string, match: RegExpMatchArray | RegExpExecArray, filterType: FilterType, priorityBoost?: number, options?: SpanCreateOptions): Span;
    /**
     * Clone a span with modifications
     *
     * @param original - Span to clone
     * @param overrides - Properties to override
     * @returns New Span instance with overrides applied
     */
    static clone(original: Span, overrides?: Partial<SpanMetadata>): Span;
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
    static fromPatterns(text: string, patterns: RegExp[], filterType: FilterType, options?: SpanCreateOptions): Span[];
}
//# sourceMappingURL=SpanFactory.d.ts.map