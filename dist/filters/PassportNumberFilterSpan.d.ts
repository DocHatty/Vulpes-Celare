/**
 * PassportNumberFilterSpan - Passport Number Detection (Span-Based)
 *
 * Detects passport numbers from various countries and returns Spans.
 * Supports multiple passport number formats including:
 * - Canada: 1-2 letters + 6-8 digits (e.g., C47829385, AB1234567)
 * - US: 9 alphanumeric (letter + 8 digits or 9 digits)
 * - UK: 9 alphanumeric
 * - European formats: various patterns
 *
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class PassportNumberFilterSpan extends SpanBasedFilter {
    /**
     * Context keywords that indicate a passport number
     */
    private static readonly PASSPORT_KEYWORDS;
    /**
     * Passport regex pattern sources
     */
    private static readonly PASSPORT_PATTERN_SOURCES;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Detect passport numbers with explicit context (Passport Number: XXX)
     */
    private detectContextualPassports;
    /**
     * Detect Canadian passport numbers (1-2 letters + 6-8 digits)
     * Only matches if near passport context keywords
     */
    private detectCanadianPassports;
    /**
     * Detect US passport numbers (9 digits or letter + 8 digits)
     * Only matches if near passport context keywords
     */
    private detectUSPassports;
    /**
     * Detect UK/EU passport numbers
     * Only matches if near passport context keywords
     */
    private detectUKEUPassports;
    /**
     * Check if there's passport-related context near the match
     */
    private hasPassportContext;
    /**
     * Check if the number looks like another type of identifier (SSN, phone, etc.)
     */
    private looksLikeOtherIdentifier;
    /**
     * Create a passport span
     */
    private createPassportSpan;
}
//# sourceMappingURL=PassportNumberFilterSpan.d.ts.map