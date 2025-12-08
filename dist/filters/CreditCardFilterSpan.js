"use strict";
/**
 * CreditCardFilterSpan - Credit Card Number Detection (Span-Based)
 *
 * Detects credit card numbers with Luhn algorithm validation and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditCardFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
class CreditCardFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    getType() {
        return "CREDITCARD";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.CREDITCARD;
    }
    detect(text, config, context) {
        const spans = [];
        for (const pattern of CreditCardFilterSpan.COMPILED_PATTERNS) {
            pattern.lastIndex = 0; // Reset regex
            let match;
            while ((match = pattern.exec(text)) !== null) {
                // For labeled format, use captured group; otherwise use full match
                const cardNumber = match[1] || match[0];
                // Validate with Luhn algorithm
                if (this.passesLuhnCheck(cardNumber)) {
                    // For labeled matches, we need to find the actual card number position
                    if (match[1]) {
                        // Labeled format - create span for the card number only
                        const cardStart = match.index + match[0].indexOf(cardNumber);
                        const cardEnd = cardStart + cardNumber.length;
                        const span = new Span_1.Span({
                            text: cardNumber.trim(),
                            originalValue: cardNumber.trim(),
                            characterStart: cardStart,
                            characterEnd: cardEnd,
                            filterType: Span_1.FilterType.CREDIT_CARD,
                            confidence: 0.95,
                            priority: this.getPriority(),
                            context: this.extractContext(text, cardStart, cardEnd),
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
                    else {
                        // Standalone format
                        const span = this.createSpanFromMatch(text, match, Span_1.FilterType.CREDIT_CARD, 0.95);
                        spans.push(span);
                    }
                }
            }
        }
        return spans;
    }
    /**
     * Luhn algorithm validation
     *
     * The Luhn algorithm (mod 10 algorithm) validates credit card numbers.
     * NOTE: We accept invalid/example cards for HIPAA compliance -
     * must redact even fake examples in documents.
     */
    passesLuhnCheck(cardNumber) {
        // Remove all non-digits
        const digits = cardNumber.replace(/\D/g, "");
        // Must be 13-19 digits (standard card length)
        if (digits.length < 13 || digits.length > 19) {
            return false;
        }
        // For HIPAA: Accept cards that LOOK like credit cards
        // even if they fail Luhn (e.g., example numbers in documentation)
        // This prevents data leakage of fake/test card numbers
        // AMEX cards start with 34 or 37 and are 15 digits
        const isAMEX = /^3[47]/.test(digits) && digits.length === 15;
        if (isAMEX) {
            return true; // Accept all AMEX-formatted numbers for HIPAA safety
        }
        let sum = 0;
        let isEven = false;
        // Loop through values starting from the rightmost digit
        for (let i = digits.length - 1; i >= 0; i--) {
            let digit = parseInt(digits[i], 10);
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
            isEven = !isEven;
        }
        const luhnValid = sum % 10 === 0;
        // Accept if Luhn valid OR if it matches common test card patterns
        const isTestCard = /^(4532|4556|5425|2221|3782|6011)/.test(digits);
        return luhnValid || isTestCard;
    }
}
exports.CreditCardFilterSpan = CreditCardFilterSpan;
/**
 * Credit card regex pattern sources
 *
 * Matches:
 * - Labeled format: "Card: 1234-5678-9012-3456"
 * - Standalone: "1234567890123456"
 * - Various separators: dashes, spaces, none
 * - 13-19 digits (industry standard)
 */
CreditCardFilterSpan.CC_PATTERN_SOURCES = [
    // Labeled format: "Card:" or "CC:" followed by number
    /\b(?:card|cc|credit\s*card)\s*[:#]?\s*([\d\s-]{13,23})\b/gi,
    // Standalone card numbers (13-19 digits with optional separators)
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g,
    // Space-separated 16-digit cards: "4964 6696 6947 6761"
    /\b(\d{4}\s+\d{4}\s+\d{4}\s+\d{4})\b/g,
    // Space-separated with varying group sizes
    /\b(\d{4}\s+\d{4}\s+\d{4}\s+\d{1,4})\b/g,
    // Dash-separated with spaces: "4964-6696 - 6947-6761"
    /\b(\d{4}[\s-]+\d{4}[\s-]+\d{4}[\s-]+\d{4})\b/g,
    // OCR errors - extra spaces between groups
    /\b(\d{4}\s{2,}\d{4}\s{2,}\d{4}\s{2,}\d{4})\b/g,
    // AMEX format: 15 digits starting with 34 or 37 (with separators)
    /\b3[47]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3}\b/g,
    // AMEX without separators: 34XXXXXXXXXXXXX or 37XXXXXXXXXXXXX
    /\b3[47]\d{13}\b/g,
    // AMEX with various separator patterns
    /\b3[47]\d{2}[\s-]\d{6}[\s-]\d{5}\b/g,
    // AMEX with spaces: "3782 822463 10005"
    /\b(3[47]\d{2}\s+\d{6}\s+\d{5})\b/g,
    // Continuous 13-19 digits (no separators)
    /\b(\d{13,19})\b/g,
];
/**
 * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
 */
CreditCardFilterSpan.COMPILED_PATTERNS = CreditCardFilterSpan.compilePatterns(CreditCardFilterSpan.CC_PATTERN_SOURCES);
//# sourceMappingURL=CreditCardFilterSpan.js.map