/**
 * MRNFilterSpan - Medical Record Number Detection (Span-Based)
 *
 * Detects medical record numbers in various formats and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class MRNFilterSpan extends SpanBasedFilter {
    /**
     * Medical Record Number pattern definitions
     */
    private static readonly MRN_PATTERN_DEFS;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Validate medical record number
     */
    private validateMRN;
}
//# sourceMappingURL=MRNFilterSpan.d.ts.map