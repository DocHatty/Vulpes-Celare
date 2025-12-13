"use strict";
/**
 * Span-Based Filter Interface
 *
 * Modern filter architecture where filters return Spans instead of modified text.
 * This enables:
 * - Parallel execution (all filters scan original text)
 * - No interference between filters
 * - Proper overlap resolution
 * - Significant performance improvement
 *
 * @module redaction/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanBasedFilter = exports.FilterPriority = void 0;
const Span_1 = require("../models/Span");
var FilterPriority_1 = require("../models/FilterPriority");
Object.defineProperty(exports, "FilterPriority", { enumerable: true, get: function () { return FilterPriority_1.FilterPriority; } });
/**
 * Base interface for Span-based filters
 * Filters scan text and return detected entities as Spans
 */
class SpanBasedFilter {
    /**
     * Get priority for overlap resolution
     * Higher priority wins when spans overlap
     * Default: 5
     */
    getPriority() {
        return 5;
    }
    /**
     * Helper: Create a Span from a regex match
     */
    createSpanFromMatch(text, match, filterType, confidence = 0.9, priority) {
        const start = match.index;
        const end = start + match[0].length;
        return new Span_1.Span({
            text: match[0],
            originalValue: match[0],
            characterStart: start,
            characterEnd: end,
            filterType: filterType,
            confidence: confidence,
            priority: priority ?? this.getPriority(),
            context: this.extractContext(text, start, end),
            window: [],
            replacement: null,
            salt: null,
            pattern: null,
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
        });
    }
    /**
     * Extract context around a match
     */
    extractContext(text, start, end) {
        const contextSize = 50;
        const contextStart = Math.max(0, start - contextSize);
        const contextEnd = Math.min(text.length, end + contextSize);
        return text.substring(contextStart, contextEnd);
    }
    /**
     * Helper: Compile regex patterns once at class initialization
     * PERFORMANCE OPTIMIZATION: Pre-compile patterns to avoid recompilation on every detect() call
     *
     * @param patterns - Array of regex pattern strings or RegExp objects
     * @param flags - Flags to apply (default: 'gi' for global case-insensitive)
     * @returns Array of compiled RegExp objects
     *
     * Usage in filter class:
     * private static readonly COMPILED_PATTERNS = SpanBasedFilter.compilePatterns([
     *   /pattern1/gi,
     *   /pattern2/gi
     * ]);
     */
    static compilePatterns(patterns, flags = "gi") {
        return patterns.map((pattern) => {
            if (pattern instanceof RegExp) {
                // Extract source and flags from existing RegExp
                return new RegExp(pattern.source, pattern.flags || flags);
            }
            else {
                // Compile string pattern
                return new RegExp(pattern, flags);
            }
        });
    }
}
exports.SpanBasedFilter = SpanBasedFilter;
//# sourceMappingURL=SpanBasedFilter.js.map