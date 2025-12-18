"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanFactory = void 0;
const Span_1 = require("../models/Span");
const FilterPriority_1 = require("../models/FilterPriority");
/**
 * SpanFactory - Static utility class for creating Spans
 */
class SpanFactory {
    /** Default context extraction size (characters before/after match) */
    static CONTEXT_SIZE = 50;
    /**
     * Get default priority for a filter type
     */
    static getDefaultPriority(filterType) {
        const priorityMap = {
            [Span_1.FilterType.SSN]: FilterPriority_1.FilterPriority.SSN,
            [Span_1.FilterType.CREDIT_CARD]: FilterPriority_1.FilterPriority.CREDITCARD,
            [Span_1.FilterType.MRN]: FilterPriority_1.FilterPriority.MRN,
            [Span_1.FilterType.DEVICE]: FilterPriority_1.FilterPriority.DEVICE,
            [Span_1.FilterType.ACCOUNT]: FilterPriority_1.FilterPriority.ACCOUNT,
            [Span_1.FilterType.LICENSE]: FilterPriority_1.FilterPriority.LICENSE,
            [Span_1.FilterType.PASSPORT]: FilterPriority_1.FilterPriority.LICENSE,
            [Span_1.FilterType.HEALTH_PLAN]: FilterPriority_1.FilterPriority.HEALTHPLAN,
            [Span_1.FilterType.DATE]: FilterPriority_1.FilterPriority.DATE,
            [Span_1.FilterType.AGE]: FilterPriority_1.FilterPriority.DATE,
            [Span_1.FilterType.PHONE]: FilterPriority_1.FilterPriority.PHONE,
            [Span_1.FilterType.FAX]: FilterPriority_1.FilterPriority.FAX,
            [Span_1.FilterType.EMAIL]: FilterPriority_1.FilterPriority.EMAIL,
            [Span_1.FilterType.NAME]: FilterPriority_1.FilterPriority.NAME,
            [Span_1.FilterType.PROVIDER_NAME]: FilterPriority_1.FilterPriority.NAME,
            [Span_1.FilterType.ADDRESS]: FilterPriority_1.FilterPriority.ADDRESS,
            [Span_1.FilterType.ZIPCODE]: FilterPriority_1.FilterPriority.ZIPCODE,
            [Span_1.FilterType.VEHICLE]: FilterPriority_1.FilterPriority.VEHICLE,
            [Span_1.FilterType.BIOMETRIC]: FilterPriority_1.FilterPriority.BIOMETRIC,
            [Span_1.FilterType.URL]: FilterPriority_1.FilterPriority.URL,
            [Span_1.FilterType.IP]: FilterPriority_1.FilterPriority.IP,
        };
        return priorityMap[filterType] ?? 5;
    }
    /**
     * Extract context around a position in text
     */
    static extractContext(text, start, end, contextSize = SpanFactory.CONTEXT_SIZE) {
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
    static fromMatch(text, match, filterType, options = {}) {
        if (match.index === undefined) {
            throw new Error("RegExp match must have index property (use exec() or matchAll())");
        }
        const start = match.index;
        const end = start + match[0].length;
        const matchedText = match[0];
        return new Span_1.Span({
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
    static fromPosition(text, start, end, filterType, options = {}) {
        if (start < 0 || end > text.length || start >= end) {
            throw new Error(`Invalid span positions: start=${start}, end=${end}, text.length=${text.length}`);
        }
        const matchedText = text.substring(start, end);
        return new Span_1.Span({
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
    static fromText(document, searchText, filterType, options = {}) {
        const index = document.indexOf(searchText);
        if (index === -1) {
            return null;
        }
        return this.fromPosition(document, index, index + searchText.length, filterType, options);
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
    static fromTextAll(document, searchText, filterType, options = {}) {
        const spans = [];
        let index = 0;
        while ((index = document.indexOf(searchText, index)) !== -1) {
            spans.push(this.fromPosition(document, index, index + searchText.length, filterType, options));
            index += searchText.length;
        }
        return spans;
    }
    /**
     * Create a Span with high confidence (0.95+)
     * Use for highly reliable detections like validated SSNs, MRNs with checksums
     */
    static highConfidence(text, match, filterType, options = {}) {
        return this.fromMatch(text, match, filterType, {
            ...options,
            confidence: options.confidence ?? 0.95,
        });
    }
    /**
     * Create a Span with medium confidence (0.7-0.85)
     * Use for pattern matches that may need context validation
     */
    static mediumConfidence(text, match, filterType, options = {}) {
        return this.fromMatch(text, match, filterType, {
            ...options,
            confidence: options.confidence ?? 0.75,
        });
    }
    /**
     * Create a Span with low confidence (0.5-0.65)
     * Use for possible matches that need disambiguation
     */
    static lowConfidence(text, match, filterType, options = {}) {
        return this.fromMatch(text, match, filterType, {
            ...options,
            confidence: options.confidence ?? 0.6,
        });
    }
    /**
     * Create a Span with elevated priority
     * Use for field-contextual matches (e.g., value following "SSN:" label)
     */
    static withElevatedPriority(text, match, filterType, priorityBoost = 100, options = {}) {
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
    static clone(original, overrides = {}) {
        return new Span_1.Span({
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
    static fromPatterns(text, patterns, filterType, options = {}) {
        const spans = [];
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
exports.SpanFactory = SpanFactory;
//# sourceMappingURL=SpanFactory.js.map