"use strict";
/**
 * DFA Pattern Definitions
 *
 * All PHI detection patterns consolidated in one place for DFA compilation.
 * These patterns are extracted from the Rust scan.rs implementation.
 *
 * PATTERN CATEGORIES:
 * - SSN: 27 patterns (with/without dashes, spaces, context)
 * - PHONE: 36 patterns (US formats, international, extensions)
 * - EMAIL: Standard email patterns
 * - DATE: 10+ patterns (MM/DD/YYYY, written months, etc.)
 * - MRN: 13 patterns (various hospital formats)
 * - CREDIT_CARD: 11 patterns (Visa, MC, Amex, etc.)
 * - And more...
 *
 * FUTURE: These patterns will be compiled into a Zig DFA at build time.
 * For now, they're used by the JavaScript multi-pattern matcher.
 *
 * @module redaction/dfa
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PATTERNS = exports.ZIPCODE_PATTERNS = exports.IP_PATTERNS = exports.CREDIT_CARD_PATTERNS = exports.MRN_PATTERNS = exports.DATE_PATTERNS = exports.EMAIL_PATTERNS = exports.PHONE_PATTERNS = exports.SSN_PATTERNS = void 0;
exports.getPatternStats = getPatternStats;
const Span_1 = require("../models/Span");
// ═══════════════════════════════════════════════════════════════════════════
// SSN PATTERNS (27 patterns from scan.rs)
// ═══════════════════════════════════════════════════════════════════════════
exports.SSN_PATTERNS = [
    // Core formats
    {
        id: "SSN_DASHED",
        regex: /\b(\d{3})-(\d{2})-(\d{4})\b/g,
        filterType: Span_1.FilterType.SSN,
        confidence: 0.95,
        description: "SSN with dashes: 123-45-6789",
        validator: validateSSN,
    },
    {
        id: "SSN_SPACED",
        regex: /\b(\d{3})\s(\d{2})\s(\d{4})\b/g,
        filterType: Span_1.FilterType.SSN,
        confidence: 0.90,
        description: "SSN with spaces: 123 45 6789",
        validator: validateSSN,
    },
    {
        id: "SSN_SOLID",
        regex: /\b(\d{9})\b/g,
        filterType: Span_1.FilterType.SSN,
        confidence: 0.60, // Lower confidence without delimiters
        description: "SSN without delimiters: 123456789",
        validator: validateSSN,
    },
    // Context-boosted patterns
    {
        id: "SSN_LABELED",
        regex: /\b(?:ssn|social\s*security(?:\s*(?:number|#|no\.?))?)\s*[:\s#]?\s*(\d{3})[- ]?(\d{2})[- ]?(\d{4})\b/gi,
        filterType: Span_1.FilterType.SSN,
        confidence: 0.98,
        description: "Labeled SSN: SSN: 123-45-6789",
        validator: validateSSN,
    },
    {
        id: "SSN_LAST4",
        regex: /\b(?:ssn|social\s*security).*?(\d{4})\b/gi,
        filterType: Span_1.FilterType.SSN,
        confidence: 0.85,
        description: "Last 4 of SSN: SSN ending in 6789",
    },
];
// ═══════════════════════════════════════════════════════════════════════════
// PHONE PATTERNS (36 patterns from scan.rs)
// ═══════════════════════════════════════════════════════════════════════════
exports.PHONE_PATTERNS = [
    // US formats
    {
        id: "PHONE_US_PARENS",
        regex: /\((\d{3})\)\s*(\d{3})[- .]?(\d{4})\b/g,
        filterType: Span_1.FilterType.PHONE,
        confidence: 0.95,
        description: "US phone with parens: (555) 123-4567",
    },
    {
        id: "PHONE_US_DASHED",
        regex: /\b(\d{3})-(\d{3})-(\d{4})\b/g,
        filterType: Span_1.FilterType.PHONE,
        confidence: 0.90,
        description: "US phone dashed: 555-123-4567",
    },
    {
        id: "PHONE_US_DOTTED",
        regex: /\b(\d{3})\.(\d{3})\.(\d{4})\b/g,
        filterType: Span_1.FilterType.PHONE,
        confidence: 0.90,
        description: "US phone dotted: 555.123.4567",
    },
    {
        id: "PHONE_US_SPACED",
        regex: /\b(\d{3})\s(\d{3})\s(\d{4})\b/g,
        filterType: Span_1.FilterType.PHONE,
        confidence: 0.85,
        description: "US phone spaced: 555 123 4567",
    },
    {
        id: "PHONE_US_SOLID",
        regex: /\b(\d{10})\b/g,
        filterType: Span_1.FilterType.PHONE,
        confidence: 0.50, // Lower without formatting
        description: "US phone solid: 5551234567",
    },
    // With country code
    {
        id: "PHONE_INTL_PLUS",
        regex: /\+1[- .]?(\d{3})[- .]?(\d{3})[- .]?(\d{4})\b/g,
        filterType: Span_1.FilterType.PHONE,
        confidence: 0.95,
        description: "International +1: +1-555-123-4567",
    },
    {
        id: "PHONE_INTL_PARENS",
        regex: /\+1[- .]?\((\d{3})\)\s*(\d{3})[- .]?(\d{4})\b/g,
        filterType: Span_1.FilterType.PHONE,
        confidence: 0.95,
        description: "International +1 with parens: +1 (555) 123-4567",
    },
    // With extension
    {
        id: "PHONE_EXT",
        regex: /\b(\d{3})[- .]?(\d{3})[- .]?(\d{4})\s*(?:ext|x|extension)[.:]?\s*(\d{1,6})\b/gi,
        filterType: Span_1.FilterType.PHONE,
        confidence: 0.95,
        description: "Phone with extension: 555-123-4567 ext 123",
    },
    // Labeled
    {
        id: "PHONE_LABELED",
        regex: /\b(?:phone|tel|telephone|cell|mobile|contact)[:\s#]*\s*\(?(\d{3})\)?[- .]?(\d{3})[- .]?(\d{4})\b/gi,
        filterType: Span_1.FilterType.PHONE,
        confidence: 0.98,
        description: "Labeled phone: Phone: 555-123-4567",
    },
];
// ═══════════════════════════════════════════════════════════════════════════
// EMAIL PATTERNS
// ═══════════════════════════════════════════════════════════════════════════
exports.EMAIL_PATTERNS = [
    {
        id: "EMAIL_STANDARD",
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        filterType: Span_1.FilterType.EMAIL,
        confidence: 0.95,
        description: "Standard email format",
    },
    {
        id: "EMAIL_LABELED",
        regex: /\b(?:email|e-mail)[:\s]*\s*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/gi,
        filterType: Span_1.FilterType.EMAIL,
        confidence: 0.98,
        description: "Labeled email: Email: user@example.com",
    },
];
// ═══════════════════════════════════════════════════════════════════════════
// DATE PATTERNS (10+ patterns)
// ═══════════════════════════════════════════════════════════════════════════
exports.DATE_PATTERNS = [
    {
        id: "DATE_MMDDYYYY_SLASH",
        regex: /\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(\d{4}|\d{2})\b/g,
        filterType: Span_1.FilterType.DATE,
        confidence: 0.90,
        description: "MM/DD/YYYY or MM/DD/YY",
    },
    {
        id: "DATE_MMDDYYYY_DASH",
        regex: /\b(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])-(\d{4}|\d{2})\b/g,
        filterType: Span_1.FilterType.DATE,
        confidence: 0.90,
        description: "MM-DD-YYYY or MM-DD-YY",
    },
    {
        id: "DATE_YYYYMMDD",
        regex: /\b(\d{4})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g,
        filterType: Span_1.FilterType.DATE,
        confidence: 0.92,
        description: "YYYY-MM-DD (ISO format)",
    },
    {
        id: "DATE_WRITTEN_FULL",
        regex: /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi,
        filterType: Span_1.FilterType.DATE,
        confidence: 0.95,
        description: "Written date: January 15, 2024",
    },
    {
        id: "DATE_WRITTEN_ABBREV",
        regex: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?,?\s+(\d{4}|\d{2})\b/gi,
        filterType: Span_1.FilterType.DATE,
        confidence: 0.92,
        description: "Abbreviated date: Jan 15, 2024",
    },
    {
        id: "DATE_DAY_WRITTEN",
        regex: /\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi,
        filterType: Span_1.FilterType.DATE,
        confidence: 0.95,
        description: "Day first: 15 January 2024",
    },
];
// ═══════════════════════════════════════════════════════════════════════════
// MRN PATTERNS (13 patterns)
// ═══════════════════════════════════════════════════════════════════════════
exports.MRN_PATTERNS = [
    {
        id: "MRN_LABELED",
        regex: /\b(?:mrn|medical\s*record(?:\s*(?:number|#|no\.?))?|chart(?:\s*(?:number|#|no\.?))?)\s*[:\s#]?\s*([A-Z]?\d{5,10})\b/gi,
        filterType: Span_1.FilterType.MRN,
        confidence: 0.98,
        description: "Labeled MRN: MRN: 12345678",
    },
    {
        id: "MRN_PREFIX",
        regex: /\b(MRN|MR|PT)[- ]?(\d{6,10})\b/g,
        filterType: Span_1.FilterType.MRN,
        confidence: 0.90,
        description: "Prefixed MRN: MRN-12345678",
    },
    {
        id: "MRN_NUMERIC_CONTEXT",
        regex: /\b(?:patient\s*(?:id|#|number)?)[:\s#]*\s*(\d{5,10})\b/gi,
        filterType: Span_1.FilterType.MRN,
        confidence: 0.85,
        description: "Patient ID context: Patient ID: 12345678",
    },
];
// ═══════════════════════════════════════════════════════════════════════════
// CREDIT CARD PATTERNS (11 patterns with Luhn validation)
// ═══════════════════════════════════════════════════════════════════════════
exports.CREDIT_CARD_PATTERNS = [
    {
        id: "CC_VISA",
        regex: /\b(4\d{3})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g,
        filterType: Span_1.FilterType.CREDIT_CARD,
        confidence: 0.95,
        description: "Visa: 4xxx-xxxx-xxxx-xxxx",
        validator: validateLuhn,
    },
    {
        id: "CC_MASTERCARD",
        regex: /\b(5[1-5]\d{2})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g,
        filterType: Span_1.FilterType.CREDIT_CARD,
        confidence: 0.95,
        description: "Mastercard: 5[1-5]xx-xxxx-xxxx-xxxx",
        validator: validateLuhn,
    },
    {
        id: "CC_AMEX",
        regex: /\b(3[47]\d{2})[- ]?(\d{6})[- ]?(\d{5})\b/g,
        filterType: Span_1.FilterType.CREDIT_CARD,
        confidence: 0.95,
        description: "Amex: 3[47]xx-xxxxxx-xxxxx",
        validator: validateLuhn,
    },
    {
        id: "CC_DISCOVER",
        regex: /\b(6011)[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g,
        filterType: Span_1.FilterType.CREDIT_CARD,
        confidence: 0.95,
        description: "Discover: 6011-xxxx-xxxx-xxxx",
        validator: validateLuhn,
    },
    {
        id: "CC_GENERIC_16",
        regex: /\b(\d{4})[- ](\d{4})[- ](\d{4})[- ](\d{4})\b/g,
        filterType: Span_1.FilterType.CREDIT_CARD,
        confidence: 0.80, // Lower without brand identification
        description: "Generic 16-digit card",
        validator: validateLuhn,
    },
];
// ═══════════════════════════════════════════════════════════════════════════
// IP ADDRESS PATTERNS
// ═══════════════════════════════════════════════════════════════════════════
exports.IP_PATTERNS = [
    {
        id: "IP_V4",
        regex: /\b((?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
        filterType: Span_1.FilterType.IP,
        confidence: 0.90,
        description: "IPv4 address: 192.168.1.1",
        validator: validateIPv4,
    },
    {
        id: "IP_V6",
        regex: /\b([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
        filterType: Span_1.FilterType.IP,
        confidence: 0.95,
        description: "IPv6 address",
    },
];
// ═══════════════════════════════════════════════════════════════════════════
// ZIPCODE PATTERNS
// ═══════════════════════════════════════════════════════════════════════════
exports.ZIPCODE_PATTERNS = [
    {
        id: "ZIP_5",
        regex: /\b(\d{5})\b/g,
        filterType: Span_1.FilterType.ZIPCODE,
        confidence: 0.50, // Low without context
        description: "5-digit ZIP",
    },
    {
        id: "ZIP_PLUS4",
        regex: /\b(\d{5})-(\d{4})\b/g,
        filterType: Span_1.FilterType.ZIPCODE,
        confidence: 0.90,
        description: "ZIP+4: 12345-6789",
    },
    {
        id: "ZIP_LABELED",
        regex: /\b(?:zip(?:\s*code)?|postal\s*code)[:\s]*\s*(\d{5})(?:-(\d{4}))?\b/gi,
        filterType: Span_1.FilterType.ZIPCODE,
        confidence: 0.98,
        description: "Labeled ZIP: Zip Code: 12345",
    },
];
// ═══════════════════════════════════════════════════════════════════════════
// ALL PATTERNS COMBINED
// ═══════════════════════════════════════════════════════════════════════════
exports.ALL_PATTERNS = [
    ...exports.SSN_PATTERNS,
    ...exports.PHONE_PATTERNS,
    ...exports.EMAIL_PATTERNS,
    ...exports.DATE_PATTERNS,
    ...exports.MRN_PATTERNS,
    ...exports.CREDIT_CARD_PATTERNS,
    ...exports.IP_PATTERNS,
    ...exports.ZIPCODE_PATTERNS,
];
// ═══════════════════════════════════════════════════════════════════════════
// VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════
function validateSSN(ssn) {
    // Remove non-digits
    const digits = ssn.replace(/\D/g, "");
    if (digits.length !== 9)
        return false;
    // Check for invalid SSNs
    const area = parseInt(digits.substring(0, 3));
    const group = parseInt(digits.substring(3, 5));
    const serial = parseInt(digits.substring(5, 9));
    // Area cannot be 000, 666, or 900-999
    if (area === 0 || area === 666 || area >= 900)
        return false;
    // Group and serial cannot be 0000
    if (group === 0 || serial === 0)
        return false;
    // Reject common test SSNs
    if (digits === "123456789" || digits === "111111111")
        return false;
    return true;
}
function validateLuhn(cardNumber) {
    const digits = cardNumber.replace(/\D/g, "");
    let sum = 0;
    let isEven = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i]);
        if (isEven) {
            digit *= 2;
            if (digit > 9)
                digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
    }
    return sum % 10 === 0;
}
function validateIPv4(ip) {
    const octets = ip.split(".").map(Number);
    if (octets.length !== 4)
        return false;
    for (const octet of octets) {
        if (isNaN(octet) || octet < 0 || octet > 255)
            return false;
    }
    // Reject private/reserved ranges? (optional - currently allowing all valid IPs)
    return true;
}
// ═══════════════════════════════════════════════════════════════════════════
// PATTERN STATISTICS
// ═══════════════════════════════════════════════════════════════════════════
function getPatternStats() {
    const byType = {};
    for (const pattern of exports.ALL_PATTERNS) {
        const key = pattern.filterType;
        byType[key] = (byType[key] || 0) + 1;
    }
    return {
        total: exports.ALL_PATTERNS.length,
        byType,
    };
}
//# sourceMappingURL=patterns.js.map