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
class IPAddressFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "IP";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.URL; // Same priority as URLs
    }
    detect(text, config, context) {
        const spans = [];
        const pattern = IPAddressFilterSpan.IP_PATTERN;
        pattern.lastIndex = 0; // Reset regex
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const ip = match[0];
            // Validate IPv4 address octets
            if (this.isValidIP(ip)) {
                const span = this.createSpanFromMatch(text, match, Span_1.FilterType.IP, 0.95 // High confidence for valid IPs
                );
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
/**
 * Pre-compiled IPv4 regex pattern
 *
 * Matches: XXX.XXX.XXX.XXX where XXX is 1-3 digits
 * Validation ensures each octet is 0-255
 */
IPAddressFilterSpan.IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
//# sourceMappingURL=IPAddressFilterSpan.js.map