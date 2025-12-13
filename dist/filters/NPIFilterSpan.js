"use strict";
/**
 * NPIFilterSpan - National Provider Identifier Detection (Span-Based)
 *
 * Detects 10-digit NPI values when explicitly labeled and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NPIFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class NPIFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "NPI";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.MRN; // Same priority as MRN
    }
    detect(text, config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "NPI");
        if (accelerated) {
            return accelerated.map((d) => {
                return new Span_1.Span({
                    text: d.text,
                    originalValue: d.text,
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    filterType: Span_1.FilterType.NPI,
                    confidence: d.confidence,
                    priority: this.getPriority(),
                    context: this.extractContext(text, d.characterStart, d.characterEnd),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: d.pattern,
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
            });
        }
        const spans = [];
        const pattern = NPIFilterSpan.NPI_PATTERN;
        pattern.lastIndex = 0; // Reset regex
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const npi = match[1]; // Captured NPI number
            const fullMatch = match[0];
            // Ensure it's 10 digits
            if (/^\d{10}$/.test(npi)) {
                // Find the position of the NPI number within the full match
                const npiStart = match.index + fullMatch.indexOf(npi);
                const npiEnd = npiStart + npi.length;
                const span = new Span_1.Span({
                    text: npi,
                    originalValue: npi,
                    characterStart: npiStart,
                    characterEnd: npiEnd,
                    filterType: Span_1.FilterType.NPI,
                    confidence: 0.95,
                    priority: this.getPriority(),
                    context: this.extractContext(text, npiStart, npiEnd),
                    window: [],
                    replacement: null,
                    salt: null,
                    pattern: null,
                    applied: false,
                    ignored: false,
                    ambiguousWith: [],
                    disambiguationScore: null,
                });
                spans.push(span);
            }
        }
        return spans;
    }
}
exports.NPIFilterSpan = NPIFilterSpan;
/**
 * Explicit NPI label + 10 digits
 */
NPIFilterSpan.NPI_PATTERN = /\bNPI(?:\s+(?:Number|No|#))?\s*[#:]*\s*([0-9]{10})\b/gi;
//# sourceMappingURL=NPIFilterSpan.js.map