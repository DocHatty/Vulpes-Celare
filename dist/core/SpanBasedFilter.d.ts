/**
 * Span-Based Filter Interface
 *
 * Modern filter architecture where filters return Spans instead of modified text.
 * This enables:
 * - Parallel execution (all filters scan original text)
 * - No interference between filters
 * - Proper overlap resolution
 * - Significant performance improvement
 *
 * @module redaction/core
 */
import { Span, FilterType } from "../models/Span";
import { RedactionContext } from "../context/RedactionContext";
/**
 * Base interface for Span-based filters
 * Filters scan text and return detected entities as Spans
 */
export declare abstract class SpanBasedFilter {
    /**
     * Scan text and return all detected entities as Spans
     * This method should NOT modify the text - just detect and return positions
     *
     * @param text - Original text to scan
     * @param config - Filter configuration from policy
     * @param context - Redaction context (for metadata only, not for token creation yet)
     * @returns Array of detected Spans
     */
    abstract detect(text: string, config: any, context: RedactionContext): Promise<Span[]> | Span[];
    /**
     * Get filter type (NAME, SSN, PHONE, etc.)
     */
    abstract getType(): string;
    /**
     * Get priority for overlap resolution
     * Higher priority wins when spans overlap
     * Default: 5
     */
    getPriority(): number;
    /**
     * Helper: Create a Span from a regex match
     */
    protected createSpanFromMatch(text: string, match: RegExpMatchArray, filterType: FilterType, confidence?: number, priority?: number): Span;
    /**
     * Extract context around a match
     */
    protected extractContext(text: string, start: number, end: number): string;
    /**
     * Helper: Compile regex patterns once at class initialization
     * PERFORMANCE OPTIMIZATION: Pre-compile patterns to avoid recompilation on every detect() call
     *
     * @param patterns - Array of regex pattern strings or RegExp objects
     * @param flags - Flags to apply (default: 'gi' for global case-insensitive)
     * @returns Array of compiled RegExp objects
     *
     * Usage in filter class:
     * private static readonly COMPILED_PATTERNS = SpanBasedFilter.compilePatterns([
     *   /pattern1/gi,
     *   /pattern2/gi
     * ]);
     */
    protected static compilePatterns(patterns: (RegExp | string)[], flags?: string): RegExp[];
}
/**
 * Priority levels for common filter types
 * Higher priority wins when spans overlap
 */
export declare const FilterPriority: {
    SSN: number;
    CREDITCARD: number;
    MRN: number;
    NPI: number;
    DEVICE: number;
    ACCOUNT: number;
    LICENSE: number;
    HEALTHPLAN: number;
    DATE: number;
    PHONE: number;
    FAX: number;
    EMAIL: number;
    NAME: number;
    ADDRESS: number;
    ZIPCODE: number;
    VEHICLE: number;
    BIOMETRIC: number;
    URL: number;
    IP: number;
    OCCUPATION: number;
};
//# sourceMappingURL=SpanBasedFilter.d.ts.map