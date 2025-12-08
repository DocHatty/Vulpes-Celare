"use strict";
/**
 * ZipCodeFilterSpan - ZIP Code Detection (Span-Based)
 *
 * Detects 5-digit and 9-digit US ZIP codes and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipCodeFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
class ZipCodeFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "ZIPCODE";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.ZIPCODE;
    }
    detect(text, config, context) {
        const spans = [];
        // Apply patterns in order (ZIP+4 first to avoid partial matches)
        for (const pattern of ZipCodeFilterSpan.COMPILED_PATTERNS) {
            pattern.lastIndex = 0; // Reset regex
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const span = this.createSpanFromMatch(text, match, Span_1.FilterType.ZIPCODE, 0.85);
                spans.push(span);
            }
        }
        return spans;
    }
}
exports.ZipCodeFilterSpan = ZipCodeFilterSpan;
/**
 * ZIP code regex pattern sources
 *
 * Pattern 1: 9-digit ZIP+4 (12345-6789) - must check first to avoid partial match
 * Pattern 2: Standard 5-digit ZIP (12345)
 */
ZipCodeFilterSpan.ZIP_PATTERN_SOURCES = [
    /\b\d{5}-\d{4}\b/g, // ZIP+4 format (must check first to avoid partial match)
    /\b\d{5}\b/g, // Standard 5-digit ZIP
];
/**
 * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
 */
ZipCodeFilterSpan.COMPILED_PATTERNS = ZipCodeFilterSpan.compilePatterns(ZipCodeFilterSpan.ZIP_PATTERN_SOURCES);
//# sourceMappingURL=ZipCodeFilterSpan.js.map