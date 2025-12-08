/**
 * DateFilterSpan - Date Detection (Span-Based)
 *
 * Detects dates in various formats and returns Spans.
 * Note: Date shifting/chronological preservation will be handled at the redaction stage.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class DateFilterSpan extends SpanBasedFilter {
    /**
     * Month names for pattern building - using centralized SharedPatterns
     */
    private static readonly MONTHS_FULL;
    private static readonly MONTHS_ABBR;
    private static readonly MONTHS_ALL;
    /**
     * Date regex pattern sources
     *
     * US Formats:
     * - MM/DD/YYYY or MM-DD-YYYY
     * - MM/DD/YY or MM-DD-YY
     *
     * ISO Format:
     * - YYYY/MM/DD or YYYY-MM-DD
     *
     * European Format:
     * - DD/MM/YYYY (when day > 12, unambiguous)
     * - DD.MM.YYYY (common in EU)
     *
     * Named Month Formats:
     * - Month DD, YYYY
     * - DD Month YYYY
     *
     * Ordinal Formats:
     * - January 15th, 2024
     * - 15th of January 2024
     *
     * Military Format:
     * - 23JAN2024
     *
     * Abbreviated:
     * - Jan 15, 2024
     * - 15 Jan 2024
     */
    private static readonly DATE_PATTERN_SOURCES;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
}
//# sourceMappingURL=DateFilterSpan.d.ts.map