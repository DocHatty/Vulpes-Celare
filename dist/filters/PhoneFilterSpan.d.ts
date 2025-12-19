/**
 * PhoneFilterSpan - Phone Number Detection (Span-Based)
 *
 * Detects phone numbers in various formats (US and International) and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class PhoneFilterSpan extends SpanBasedFilter {
    /**
     * Phone number pattern sources
     *
     * US Formats:
     * - (123) 456-7890, 123-456-7890, 123.456.7890
     * - +1 (123) 456-7890, 1-800-555-1234
     *
     * International Formats:
     * - +44 20 7946 0958 (UK)
     * - +33 1 23 45 67 89 (France)
     * - +49 30 12345678 (Germany)
     * - +61 2 9876 5432 (Australia)
     * - +1 416-555-1234 (Canada)
     *
     * With Extensions (numeric and vanity):
     * - 123-456-7890 ext. 123
     * - 123-456-7890 x123
     * - 123-456-7890, ext 456
     * - 415-555-HELP (vanity extension)
     * - 415-555-ortho (vanity extension)
     */
    private static readonly PHONE_PATTERN_SOURCES;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled regex patterns (compiled once at class load)
     * Avoids recompiling 13 patterns on every detect() call
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
}
//# sourceMappingURL=PhoneFilterSpan.d.ts.map