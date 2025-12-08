/**
 * CreditCardFilterSpan - Credit Card Number Detection (Span-Based)
 *
 * Detects credit card numbers with Luhn algorithm validation and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class CreditCardFilterSpan extends SpanBasedFilter {
    /**
     * Credit card regex pattern sources
     *
     * Matches:
     * - Labeled format: "Card: 1234-5678-9012-3456"
     * - Standalone: "1234567890123456"
     * - Various separators: dashes, spaces, none
     * - 13-19 digits (industry standard)
     */
    private static readonly CC_PATTERN_SOURCES;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Luhn algorithm validation
     *
     * The Luhn algorithm (mod 10 algorithm) validates credit card numbers.
     * NOTE: We accept invalid/example cards for HIPAA compliance -
     * must redact even fake examples in documents.
     */
    private passesLuhnCheck;
}
//# sourceMappingURL=CreditCardFilterSpan.d.ts.map