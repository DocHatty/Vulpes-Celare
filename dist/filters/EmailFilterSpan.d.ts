/**
 * EmailFilterSpan - Email Address Detection (Span-Based)
 *
 * Detects email addresses using RFC 5322 compliant patterns and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class EmailFilterSpan extends SpanBasedFilter {
    /**
     * Pre-compiled email regex pattern for maximum performance
     *
     * Pattern breakdown:
     * - Local part: A-Z0-9._%+- (standard email characters)
     * - @ symbol
     * - Domain: A-Z0-9.- (standard domain characters)
     * - TLD: At least 2 characters (com, org, edu, etc.)
     */
    private static readonly EMAIL_PATTERN;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
}
//# sourceMappingURL=EmailFilterSpan.d.ts.map