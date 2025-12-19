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
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Find a corrupted date in the original text that corresponds to a normalized match
     * Uses fuzzy matching to locate the original corrupted version
     */
    private findCorruptedDateInOriginal;
    /**
     * Check if two date strings match (allowing for minor variations)
     */
    private datesMatch;
    /**
     * Normalize structural OCR errors in date-like patterns
     * Handles issues that character substitution alone can't fix:
     * - Double punctuation: "9//2" → "9/2", "07--16" → "07-16"
     * - Misplaced spaces: "9//2 2/54" → "9/22/54", "2023- 0-08" → "2023-10-08"
     * - Leading/trailing spaces around separators: "05/14 //2024" → "05/14/2024"
     * - Space-corrupted digit sequences: "05/1 7/73" → "05/17/73"
     * - Pipe characters: "12-|7-2024" → "12-17-2024"
     * - Mixed OCR errors: "05/S B/22" → "05/58/22"
     */
    private normalizeOCRStructure;
}
//# sourceMappingURL=DateFilterSpan.d.ts.map