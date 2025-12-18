/**
 * RelativeDateFilterSpan - Context-Aware Relative Temporal Expression Detection
 *
 * WIN-WIN STRATEGY:
 * - INCREASES SENSITIVITY: Detects relative dates that narrow down specific
 *   timeframes and are PHI under HIPAA ("yesterday", "last Tuesday", "2 weeks ago")
 * - INCREASES SPECIFICITY: Only matches in clinical context, preventing
 *   false positives on casual temporal references in non-clinical text
 *
 * HIPAA Note: Relative dates can narrow down specific dates when combined with
 * document dates, making them identifiers. For example, "admitted yesterday"
 * in a document dated 2024-03-15 = admitted 2024-03-14.
 *
 * Based on:
 * - i2b2 2014 temporal expression guidelines
 * - HIPAA Safe Harbor date requirements
 * - 2024-2025 clinical NLP best practices
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class RelativeDateFilterSpan extends SpanBasedFilter {
    /**
     * All patterns combined for efficient iteration
     */
    private static readonly ALL_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
}
//# sourceMappingURL=RelativeDateFilterSpan.d.ts.map