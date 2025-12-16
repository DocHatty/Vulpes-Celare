/**
 * AgeFilterSpan - Age 90+ Detection (Span-Based)
 *
 * Detects ages 90 and above per HIPAA Safe Harbor requirements.
 * HIPAA requires that ages 90+ be aggregated to prevent re-identification
 * of elderly individuals who may be uniquely identifiable by extreme age.
 *
 * NOTE: Ages 89 and below are NOT PHI under HIPAA Safe Harbor.
 * Only ages 90+ require redaction/aggregation.
 *
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class AgeFilterSpan extends SpanBasedFilter {
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Pattern 1: Explicit age statements
     * Matches: "92 years old", "age 95", "94 y/o", "91 yo", "aged 96"
     */
    private detectExplicitAgeStatements;
    /**
     * Pattern 2: Labeled ages in medical records
     * Matches: "Age: 91", "Patient Age: 94", "DOB/Age: 92"
     * Also handles large whitespace gaps common in form-style documents:
     *   "Age:            90 years"
     *   "Age:                    99 years old"
     */
    private detectLabeledAges;
    /**
     * Pattern 3: Age ranges involving 90+
     * Matches: "90-95 years", "aged 92-98", "between 91 and 95"
     */
    private detectAgeRanges;
    /**
     * Pattern 4: Ordinal ages (decades)
     * Matches: "in her 90s", "early 90s", "mid-90s", "late 90s", "100s"
     */
    private detectOrdinalAges;
    /**
     * Pattern 5: Contextual age mentions
     * Matches: "the 93-year-old patient", "a 91-year-old male/female"
     */
    private detectContextualAges;
    /**
     * Check if there's age-related context nearby
     */
    private hasAgeContext;
}
//# sourceMappingURL=AgeFilterSpan.d.ts.map