/**
 * ZipCodeFilterSpan - ZIP Code Detection (Span-Based)
 *
 * Detects 5-digit and 9-digit US ZIP codes and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class ZipCodeFilterSpan extends SpanBasedFilter {
    /**
     * ZIP code regex pattern sources
     *
     * Pattern 1: 9-digit ZIP+4 (12345-6789) - must check first to avoid partial match
     * Pattern 2: Standard 5-digit ZIP (12345)
     */
    private static readonly ZIP_PATTERN_SOURCES;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
}
//# sourceMappingURL=ZipCodeFilterSpan.d.ts.map