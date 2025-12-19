"use strict";
/**
 * AccountNumberFilterSpan - Account Number Detection (Span-Based)
 *
 * Detects hospital/billing account numbers in various formats and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountNumberFilterSpan = void 0;
const Span_1 = require("../models/Span");
const SpanBasedFilter_1 = require("../core/SpanBasedFilter");
const RustScanKernel_1 = require("../utils/RustScanKernel");
class AccountNumberFilterSpan extends SpanBasedFilter_1.SpanBasedFilter {
    /**
     * Account number pattern definitions (source patterns)
     */
    static ACCOUNT_PATTERN_DEFS = [
        {
            regex: /\b(?:Account|Acct)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([0-9][0-9-]{5,14})\b/gi,
            validator: "account",
            description: "Account number",
        },
        {
            regex: /\b(?:Account|Acct)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([A-Z0-9][A-Z0-9-]{5,20})\b/gi,
            validator: "alphanumericAccount",
            description: "Account number (alphanumeric)",
        },
        {
            // ACC: prefix format (common in medical billing)
            // Matches: "ACC: 97167769", "ACC: 47952040", "ACCT: 12345678"
            regex: /\b(ACC[T]?:\s*\d{6,14})\b/gi,
            validator: "accPrefix",
            description: "ACC: prefixed account",
        },
        {
            regex: /\b(?:Billing|Bill)(?:\s+(?:Number|No|#))?\s*[#:]?\s*([0-9][0-9-]{5,14})\b/gi,
            validator: "account",
            description: "Billing number",
        },
        {
            regex: /\b(?:Hospital|Medical\s+Center)(?:\s+(?:Account|Acct))(?:\s+(?:Number|No|#))?\s*[#:]?\s*([0-9][0-9-]{5,14})\b/gi,
            validator: "account",
            description: "Hospital account",
        },
        {
            regex: /\b(?:Bank(?:ing)?|Checking|Savings)\s+(?:Account|Acct)(?:\s+(?:Number|No|#))?\s*[:#]?\s*([*\d][-*\d]{3,15})\b/gi,
            validator: "bank",
            description: "Bank account",
        },
        {
            regex: /\b(?:Insurance\s+)?Policy(?:\s+(?:Number|No|#))?\s*[:#]?\s*([A-Z]{2,4}-\d{4}-\d{4,8}|[A-Z]{3,4}-\d{5,8}|\d{5}-\d{5,8})\b/gi,
            validator: "policy",
            description: "Insurance policy",
        },
        {
            regex: /\b(?:Account|Card)\s+(?:ending\s+in|last\s+4(?:\s+digits)?)[:\s]+([*\d]{4,6})\b/gi,
            validator: "partial",
            description: "Partial account",
        },
        {
            regex: /\b(?:Account\s+Number|Patient\s+ID|Member\s+ID|Subscriber\s+ID|Accession\s+(?:Number|No)|Reference\s+(?:Number|No)|Confirmation\s+(?:Number|No)|Document\s+ID)[\s:]+([A-Z]{2,5}-\d{4,12}(?:-\d{4,12})?)\b/gi,
            validator: "prefixed",
            description: "Prefixed account",
        },
        {
            regex: /\b([A-Z]{2,5}-\d{6,12})\b/g,
            validator: "standalonePrefixed",
            description: "Standalone prefixed ID",
        },
        {
            regex: /\b(?:Group\s+(?:Number|No|#))[\s:]+([A-Z]{3,5}-[A-Z0-9]{4,12}(?:-\d{4})?)\b/gi,
            validator: "group",
            description: "Group number",
        },
        {
            regex: /\b((?:BILL|ACCT|INV|PAY)-\d{4}-\d{6,10})\b/gi,
            validator: "billingWithYear",
            description: "Billing account with year",
        },
        {
            regex: /\b([A-Z]{2,5}-[A-Z]{2,5}-\d{4,6})\b/g,
            validator: "genericId",
            description: "Generic account/transaction ID",
        },
    ];
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled regex patterns (compiled once at class load)
     * Avoids recompiling 12 patterns on every detect() call
     */
    static COMPILED_PATTERNS = AccountNumberFilterSpan.compilePatterns(AccountNumberFilterSpan.ACCOUNT_PATTERN_DEFS.map((p) => p.regex));
    getType() {
        return "ACCOUNT";
    }
    getPriority() {
        return SpanBasedFilter_1.FilterPriority.ACCOUNT;
    }
    detect(text, _config, context) {
        const accelerated = RustScanKernel_1.RustScanKernel.getDetections(context, text, "ACCOUNT");
        if (accelerated && accelerated.length > 0) {
            return accelerated.map((d) => {
                return new Span_1.Span({
                    text: d.text,
                    originalValue: d.text,
                    characterStart: d.characterStart,
                    characterEnd: d.characterEnd,
                    filterType: Span_1.FilterType.ACCOUNT,
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
        // Use pre-compiled patterns for better performance
        for (let i = 0; i < AccountNumberFilterSpan.COMPILED_PATTERNS.length; i++) {
            const pattern = AccountNumberFilterSpan.COMPILED_PATTERNS[i];
            const patternDef = AccountNumberFilterSpan.ACCOUNT_PATTERN_DEFS[i];
            pattern.lastIndex = 0; // Reset regex
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const fullMatch = match[0];
                const value = match[1] || match[0];
                // Validate based on type
                if (this.validate(value, patternDef.validator, fullMatch)) {
                    // Find the position of the value within the full match
                    const valueStart = match.index + fullMatch.indexOf(value);
                    const valueEnd = valueStart + value.length;
                    const span = new Span_1.Span({
                        text: value,
                        originalValue: value,
                        characterStart: valueStart,
                        characterEnd: valueEnd,
                        filterType: Span_1.FilterType.ACCOUNT,
                        confidence: 0.85,
                        priority: this.getPriority(),
                        context: this.extractContext(text, valueStart, valueEnd),
                        window: [],
                        replacement: null,
                        salt: null,
                        pattern: patternDef.description,
                        applied: false,
                        ignored: false,
                        ambiguousWith: [],
                        disambiguationScore: null,
                    });
                    spans.push(span);
                }
            }
        }
        return spans;
    }
    /**
     * Validate account number based on type
     */
    validate(value, validator, fullMatch) {
        // Skip already tokenized values
        if (fullMatch.includes("{{") || fullMatch.includes("}}")) {
            return false;
        }
        switch (validator) {
            case "account":
                return this.isValidAccountNumber(value);
            case "alphanumericAccount":
                return this.isValidAlphanumericAccount(value);
            case "accPrefix":
                return this.isValidAccPrefix(value);
            case "bank":
                return this.isValidBankAccount(value);
            case "policy":
                return this.isValidPolicyNumber(value);
            case "partial":
                return true; // Always redact partial account numbers
            case "prefixed":
                return this.isValidPrefixedAccount(value);
            case "standalonePrefixed":
                return this.isValidStandalonePrefixed(value);
            case "group":
                return this.isValidGroupNumber(value);
            case "billingWithYear":
                return this.isValidBillingWithYear(value);
            case "genericId":
                return this.isValidGenericId(value);
            default:
                return this.isValidAccountNumber(value);
        }
    }
    isValidAccountNumber(number) {
        const digitsOnly = number.replace(/-/g, "");
        return (digitsOnly.length >= 6 &&
            digitsOnly.length <= 15 &&
            /^\d+$/.test(digitsOnly));
    }
    isValidAccPrefix(value) {
        // ACC: or ACCT: followed by 6-14 digits
        const match = value.match(/^ACCT?:\s*(\d+)$/i);
        if (!match)
            return false;
        const digits = match[1];
        return digits.length >= 6 && digits.length <= 14;
    }
    isValidAlphanumericAccount(number) {
        const cleaned = number.replace(/[-\s.]/g, "");
        return (cleaned.length >= 6 &&
            cleaned.length <= 20 &&
            /\d/.test(cleaned) &&
            /^[A-Z0-9-]+$/i.test(cleaned));
    }
    isValidBankAccount(number) {
        const cleaned = number.replace(/[-*]/g, "");
        return cleaned.length >= 4 && cleaned.length <= 17 && /^\d+$/.test(cleaned);
    }
    isValidPolicyNumber(policyNum) {
        return (/\d{4,}/.test(policyNum) &&
            policyNum.length >= 8 &&
            policyNum.length <= 20 &&
            /^[A-Z0-9-]+$/i.test(policyNum));
    }
    isValidPrefixedAccount(accountNum) {
        if (!accountNum.includes("-"))
            return false;
        const parts = accountNum.split("-");
        if (parts.length < 2 || parts.length > 3)
            return false;
        const prefix = parts[0];
        if (!/^[A-Z]{2,5}$/.test(prefix))
            return false;
        for (let i = 1; i < parts.length; i++) {
            if (!/^\d{4,12}$/.test(parts[i]))
                return false;
        }
        return true;
    }
    isValidStandalonePrefixed(accountNum) {
        const commonPrefixes = [
            "ACCT",
            "PID",
            "MID",
            "SID",
            "REF",
            "CONF",
            "TXN",
            "INV",
            "ORD",
            "BILL",
        ];
        const prefix = accountNum.split("-")[0];
        return (commonPrefixes.includes(prefix) && this.isValidPrefixedAccount(accountNum));
    }
    isValidGroupNumber(groupNum) {
        if (!groupNum.includes("-"))
            return false;
        if (groupNum.length < 8 || groupNum.length > 25)
            return false;
        if (!/^[A-Z0-9-]+$/i.test(groupNum))
            return false;
        const parts = groupNum.split("-");
        return parts.length >= 2;
    }
    isValidBillingWithYear(billingNum) {
        const parts = billingNum.split("-");
        if (parts.length !== 3)
            return false;
        const prefix = parts[0].toUpperCase();
        const validPrefixes = ["BILL", "ACCT", "INV", "PAY"];
        if (!validPrefixes.includes(prefix))
            return false;
        const year = parseInt(parts[1]);
        if (isNaN(year) || year < 1990 || year > 2100)
            return false;
        const accountNum = parts[2];
        if (!/^\d{6,10}$/.test(accountNum))
            return false;
        return true;
    }
    isValidGenericId(idNum) {
        const parts = idNum.split("-");
        if (parts.length !== 3)
            return false;
        if (!/^[A-Z]{2,5}$/.test(parts[0]))
            return false;
        if (!/^[A-Z]{2,5}$/.test(parts[1]))
            return false;
        if (!/^\d{4,6}$/.test(parts[2]))
            return false;
        return true;
    }
}
exports.AccountNumberFilterSpan = AccountNumberFilterSpan;
//# sourceMappingURL=AccountNumberFilterSpan.js.map