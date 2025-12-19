/**
 * FaxNumberFilterSpan - Fax Number Detection (Span-Based)
 *
 * Detects fax numbers with explicit labels to avoid false positives with phone numbers.
 * Only captures when explicitly labeled as "Fax" to maintain precision.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class FaxNumberFilterSpan extends SpanBasedFilter {
    /**
     * Fax number regex pattern sources
     */
    private static readonly FAX_PATTERN_SOURCES;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Validate US phone number format (10 digits + optional +1)
     */
    private isValidUSPhoneNumber;
}
//# sourceMappingURL=FaxNumberFilterSpan.d.ts.map