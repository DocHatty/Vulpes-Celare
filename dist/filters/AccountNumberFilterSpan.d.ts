/**
 * AccountNumberFilterSpan - Account Number Detection (Span-Based)
 *
 * Detects hospital/billing account numbers in various formats and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class AccountNumberFilterSpan extends SpanBasedFilter {
    /**
     * Account number pattern definitions (source patterns)
     */
    private static readonly ACCOUNT_PATTERN_DEFS;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled regex patterns (compiled once at class load)
     * Avoids recompiling 12 patterns on every detect() call
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Validate account number based on type
     */
    private validate;
    private isValidAccountNumber;
    private isValidAccPrefix;
    private isValidAlphanumericAccount;
    private isValidBankAccount;
    private isValidPolicyNumber;
    private isValidPrefixedAccount;
    private isValidStandalonePrefixed;
    private isValidGroupNumber;
    private isValidBillingWithYear;
    private isValidGenericId;
}
//# sourceMappingURL=AccountNumberFilterSpan.d.ts.map