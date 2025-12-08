/**
 * LicenseNumberFilterSpan - License Number Detection (Span-Based)
 *
 * Detects driver's licenses and professional licenses and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class LicenseNumberFilterSpan extends SpanBasedFilter {
    /**
     * Professional license prefixes commonly used in healthcare
     */
    private static readonly PROFESSIONAL_PREFIXES;
    /**
     * License number pattern definitions
     */
    private static readonly LICENSE_PATTERN_DEFS;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Validate license number
     */
    private validate;
}
//# sourceMappingURL=LicenseNumberFilterSpan.d.ts.map