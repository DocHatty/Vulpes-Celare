"use strict";
/**
 * EmailFilterSpan - Email Address Detection (Span-Based)
 *
 * Detects email addresses using RFC 5322 compliant patterns and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
class EmailFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "EMAIL";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.EMAIL;
    }
    detect(text, config, context) {
        const spans = [];
        const pattern = EmailFilterSpan.EMAIL_PATTERN;
        pattern.lastIndex = 0; // Reset regex
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const span = this.createSpanFromMatch(text, match, Span_1.FilterType.EMAIL, 0.95 // High confidence for email
            );
            spans.push(span);
        }
        return spans;
    }
}
exports.EmailFilterSpan = EmailFilterSpan;
/**
 * Pre-compiled email regex pattern for maximum performance
 *
 * Pattern breakdown:
 * - Local part: A-Z0-9._%+- (standard email characters)
 * - @ symbol
 * - Domain: A-Z0-9.- (standard domain characters)
 * - TLD: At least 2 characters (com, org, edu, etc.)
 */
EmailFilterSpan.EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
//# sourceMappingURL=EmailFilterSpan.js.map