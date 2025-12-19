/**
 * LicenseNumberFilterSpan - Driver's License Detection (Span-Based)
 *
 * Detects driver's licenses and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class LicenseNumberFilterSpan extends SpanBasedFilter {
    /**
     * License number pattern definitions - Driver's licenses ONLY
     */
    private static readonly LICENSE_PATTERN_DEFS;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Validate license number
     */
    private validate;
}
//# sourceMappingURL=LicenseNumberFilterSpan.d.ts.map