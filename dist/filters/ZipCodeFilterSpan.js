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
const SpanFactory_1 = require("../core/SpanFactory");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class ZipCodeFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    /**
     * ZIP code regex pattern sources
     *
     * Pattern 1: 9-digit ZIP+4 (12345-6789) - must check first to avoid partial match
     * Pattern 2: Standard 5-digit ZIP (12345)
     */
    static ZIP_PATTERN_SOURCES = [
        /\b\d{5}-\d{4}\b/g, // ZIP+4 format (must check first to avoid partial match)
        /\b\d{5}\b/g, // Standard 5-digit ZIP
        // OCR/state-attachment variants: "AZ40576" or "A Z40576"
        /\b[A-Z]\s*[A-Z](\d{5})(?:-\d{4})?\b/g,
        /\b[A-Z]{2}(\d{5})(?:-\d{4})?\b/g,
    ];
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    static COMPILED_PATTERNS = ZipCodeFilterSpan.compilePatterns(ZipCodeFilterSpan.ZIP_PATTERN_SOURCES);
    getType() {
        return "ZIPCODE";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.ZIPCODE;
    }
    detect(text, _config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "ZIPCODE");
        if (accelerated && accelerated.length > 0) {
            return accelerated.map((d) => {
                return SpanFactory_1.SpanFactory.fromPosition(text, d.characterStart, d.characterEnd, Span_1.FilterType.ZIPCODE, {
                    confidence: d.confidence,
                    priority: this.getPriority(),
                    pattern: d.pattern,
                });
            });
        }
        const spans = [];
        const seen = new Set();
        // Apply patterns in order (ZIP+4 first to avoid partial matches)
        for (const pattern of ZipCodeFilterSpan.COMPILED_PATTERNS) {
            pattern.lastIndex = 0; // Reset regex
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const zip = match[1] || match[0];
                const start = match.index + match[0].indexOf(zip);
                const end = start + zip.length;
                const key = `${start}-${end}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                spans.push(SpanFactory_1.SpanFactory.fromPosition(text, start, end, Span_1.FilterType.ZIPCODE, {
                    confidence: 0.85,
                    priority: this.getPriority(),
                    pattern: "ZIP code",
                }));
            }
        }
        return spans;
    }
}
exports.ZipCodeFilterSpan = ZipCodeFilterSpan;
//# sourceMappingURL=ZipCodeFilterSpan.js.map