/**
 * SSN Filter (Span-Based)
 *
 * Detects Social Security Numbers and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class SSNFilterSpan extends SpanBasedFilter {
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled static patterns
     * Changed from instance-level to class-level to avoid re-creating patterns for each filter instance
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Validate SSN format
     * NOTE: We allow obviously fake SSNs like 123-45-6789 for testing/examples
     * Also handles partially masked SSNs like ***-**-6789
     */
    private isValidSSN;
}
//# sourceMappingURL=SSNFilterSpan.d.ts.map