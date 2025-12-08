/**
 * NPIFilterSpan - National Provider Identifier Detection (Span-Based)
 *
 * Detects 10-digit NPI values when explicitly labeled and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class NPIFilterSpan extends SpanBasedFilter {
    /**
     * Explicit NPI label + 10 digits
     */
    private static readonly NPI_PATTERN;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
}
//# sourceMappingURL=NPIFilterSpan.d.ts.map