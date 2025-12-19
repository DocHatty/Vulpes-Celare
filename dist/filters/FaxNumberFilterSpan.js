"use strict";
/**
 * FaxNumberFilterSpan - Fax Number Detection (Span-Based)
 *
 * Detects fax numbers with explicit labels to avoid false positives with phone numbers.
 * Only captures when explicitly labeled as "Fax" to maintain precision.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaxNumberFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class FaxNumberFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    /**
     * Fax number regex pattern sources
     */
    static FAX_PATTERN_SOURCES = [
        // Pattern 1: Explicitly labeled fax numbers
        // Must have "Fax" or "FAX" label to avoid false positives
        /\b(?:Fax|FAX)(?:\s+(?:Number|No|#))?\s*[#:]?\s*(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/gi,
        // Pattern 2: "Send to fax" or "Fax results to"
        /\b(?:send|fax|transmit)(?:\s+(?:to|results))?\s+(?:fax)?\s*[#:]?\s*(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/gi,
    ];
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    static COMPILED_PATTERNS = FaxNumberFilterSpan.compilePatterns(FaxNumberFilterSpan.FAX_PATTERN_SOURCES);
    getType() {
        return "FAX";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.FAX;
    }
    detect(text, _config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "FAX");
        if (accelerated && accelerated.length > 0) {
            return accelerated.map((d) => {
                return new Span_1.Span({
                    text: d.text,
                    originalValue: d.text,
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    filterType: Span_1.FilterType.FAX,
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
        for (const pattern of FaxNumberFilterSpan.COMPILED_PATTERNS) {
            pattern.lastIndex = 0; // Reset regex
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const fullMatch = match[0];
                const faxNumber = match[1] || fullMatch;
                // Validate it's actually a fax number (must contain "fax")
                if (!fullMatch.toLowerCase().includes("fax")) {
                    continue;
                }
                // Validate phone number format
                if (!this.isValidUSPhoneNumber(faxNumber)) {
                    continue;
                }
                // Create span for the fax number
                const span = this.createSpanFromMatch(text, match, Span_1.FilterType.FAX, 0.95);
                spans.push(span);
            }
        }
        return spans;
    }
    /**
     * Validate US phone number format (10 digits + optional +1)
     */
    isValidUSPhoneNumber(phoneNumber) {
        // Extract digits only
        const digits = phoneNumber.replace(/\D/g, "");
        // Must be 10 digits (US) or 11 digits (with country code 1)
        if (digits.length === 10) {
            return true;
        }
        if (digits.length === 11 && digits[0] === "1") {
            return true;
        }
        return false;
    }
}
exports.FaxNumberFilterSpan = FaxNumberFilterSpan;
//# sourceMappingURL=FaxNumberFilterSpan.js.map