"use strict";
/**
 * IPAddressFilterSpan - IP Address Detection (Span-Based)
 *
 * Detects IPv4 addresses with validation and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPAddressFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class IPAddressFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    /**
     * Pre-compiled IPv4 regex pattern
     *
     * Matches: XXX.XXX.XXX.XXX where XXX is 1-3 digits
     * Validation ensures each octet is 0-255
     */
    static IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    getType() {
        return "IP";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.URL; // Same priority as URLs
    }
    detect(text, config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "IP");
        if (accelerated && accelerated.length > 0) {
            return accelerated.map((d) => {
                return new Span_1.Span({
                    text: d.text,
                    originalValue: d.text,
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    filterType: Span_1.FilterType.IP,
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
        const pattern = IPAddressFilterSpan.IP_PATTERN;
        pattern.lastIndex = 0; // Reset regex
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const ip = match[0];
            // Validate IPv4 address octets
            if (this.isValidIP(ip)) {
                const span = this.createSpanFromMatch(text, match, Span_1.FilterType.IP, 0.95);
                spans.push(span);
            }
        }
        return spans;
    }
    /**
     * Validate IPv4 address octets
     *
     * Each octet must be 0-255 (inclusive).
     */
    isValidIP(ip) {
        const octets = ip.split(".");
        if (octets.length !== 4) {
            return false;
        }
        return octets.every((octet) => {
            const num = parseInt(octet, 10);
            return num >= 0 && num <= 255;
        });
    }
}
exports.IPAddressFilterSpan = IPAddressFilterSpan;
//# sourceMappingURL=IPAddressFilterSpan.js.map