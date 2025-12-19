/**
 * HealthPlanNumberFilterSpan - Health Insurance Identifier Detection (Span-Based)
 *
 * Detects health plan beneficiary numbers and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class HealthPlanNumberFilterSpan extends SpanBasedFilter {
    /**
     * Insurance-related keywords for context checking
     */
    private readonly INSURANCE_KEYWORDS;
    /**
     * Health plan number pattern definitions
     */
    private static readonly HEALTHPLAN_PATTERN_DEFS;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Validate health plan number format
     */
    private validateHealthPlanNumber;
    /**
     * Check if match appears in insurance context
     */
    private isInInsuranceContext;
}
//# sourceMappingURL=HealthPlanNumberFilterSpan.d.ts.map