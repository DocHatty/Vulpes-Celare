/**
 * AddressFilterSpan - Street Address and Geographic Location Detection (Span-Based)
 *
 * Detects addresses in various formats (US, Canadian, UK, Australian) and returns Spans.
 * Also detects geographic subdivisions smaller than a state (cities, highways) which are PHI under HIPAA.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class AddressFilterSpan extends SpanBasedFilter {
    /**
     * Common street suffixes (US/UK/Canada/Australia)
     */
    private static readonly STREET_SUFFIXES;
    /**
     * US state abbreviations (2-letter codes)
     */
    private static readonly STATE_ABBR;
    /**
     * Canadian province abbreviations
     */
    private static readonly PROVINCE_ABBR;
    /**
     * Australian state abbreviations
     */
    private static readonly AU_STATE_ABBR;
    /**
     * Context words that indicate a geographic location reference (for city detection)
     * These help identify when a capitalized word is a location rather than a name
     */
    private static readonly LOCATION_CONTEXT_WORDS;
    /**
     * Facility/location suffixes that indicate following word may be a city
     * E.g., "Sunrise Senior Living, Arvada"
     */
    private static readonly FACILITY_SUFFIXES;
    /**
     * Highway/road reference patterns - these are geographic identifiers under HIPAA
     */
    private static readonly HIGHWAY_PATTERNS;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled address regex patterns (compiled once at class load)
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Detect addresses with lowercase, mixed case, or OCR corruption
     * Examples: "8007 marketneadows", "1493 front crossing, bldg 372", "7416 ceNTER OpiNT"
     */
    private detectCaseInsensitiveAddresses;
    /**
     * Detect highway and road references
     */
    private detectHighways;
    /**
     * Detect city names when they appear in geographic context
     * E.g., "near Boulder", "in Aurora", "from Lakewood"
     */
    private detectContextualCities;
    /**
     * Detect city names that appear after facility names
     * E.g., "Sunrise Senior Living, Arvada" or "Mountain View Hospital, Boulder"
     */
    private detectFacilityCities;
    /**
     * Check if a potential city name looks more like a person name
     */
    private looksLikePersonName;
}
//# sourceMappingURL=AddressFilterSpan.d.ts.map