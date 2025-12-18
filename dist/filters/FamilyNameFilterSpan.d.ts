/**
 * FamilyNameFilterSpan - Family Member Name Detection (Span-Based)
 *
 * Detects family member names and relationships and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class FamilyNameFilterSpan extends SpanBasedFilter {
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Fallback: Detect titled names (Dr. Smith, Mr. John Doe, etc.)
     *
     * IMPORTANT: Titled names are PROVIDER names under HIPAA Safe Harbor
     * and should NOT be redacted. Patients don't have formal titles.
     * This pattern is DISABLED to prevent provider name over-redaction.
     */
    private detectTitledNames;
    /**
     * Fallback: Detect Last, First format (Smith, John)
     */
    private detectLastFirstNames;
    /**
     * Fallback: Detect general full names (John Smith, Jane Mary Doe)
     *
     * CRITICAL: This pattern is DISABLED because it's too aggressive and matches
     * medical diagnoses like "Trigeminal Neuralgia", "Bell Palsy", etc.
     * SmartNameFilterSpan handles general name detection with proper dictionary validation.
     */
    private detectGeneralFullNames;
    /**
     * Check if text looks like a person name (not organization/place)
     * Delegates to shared NameDetectionUtils
     */
    private looksLikePersonName;
}
//# sourceMappingURL=FamilyNameFilterSpan.d.ts.map