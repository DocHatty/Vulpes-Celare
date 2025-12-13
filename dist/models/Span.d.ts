/**
 * Span Model - Represents a detected PII/PHI entity with rich metadata
 *
 * PERFORMANCE UPGRADE (v2.0):
 * - SpanUtils.dropOverlappingSpans now uses IntervalTree for O(n log n) instead of O(n²)
 * - Composite scoring optimized with cached calculations
 *
 * Based on Phileas's Span architecture with enhancements for VulpesHIPPA.
 * Tracks character positions, confidence, priority, context, and disambiguation info.
 *
 * @module redaction/models
 */
export declare enum FilterType {
    NAME = "NAME",
    PROVIDER_NAME = "PROVIDER_NAME",// Healthcare provider names (Dr., Prof., etc.) - redacted but labeled differently
    EMAIL = "EMAIL",
    SSN = "SSN",
    PHONE = "PHONE",
    FAX = "FAX",
    ADDRESS = "ADDRESS",
    ZIPCODE = "ZIPCODE",
    CITY = "CITY",
    STATE = "STATE",
    COUNTY = "COUNTY",
    DATE = "DATE",
    RELATIVE_DATE = "RELATIVE_DATE",
    AGE = "AGE",
    CREDIT_CARD = "CREDIT_CARD",
    ACCOUNT = "ACCOUNT",
    BITCOIN = "BITCOIN",
    IBAN = "IBAN",
    MRN = "MRN",
    NPI = "NPI",
    DEA = "DEA",
    HEALTH_PLAN = "HEALTH_PLAN",
    DEVICE = "DEVICE",
    LICENSE = "LICENSE",
    PASSPORT = "PASSPORT",
    IP = "IP",
    URL = "URL",
    MAC_ADDRESS = "MAC_ADDRESS",
    BIOMETRIC = "BIOMETRIC",
    VEHICLE = "VEHICLE",
    OCCUPATION = "OCCUPATION",
    CUSTOM = "CUSTOM"
}
export interface SpanMetadata {
    text: string;
    originalValue: string;
    characterStart: number;
    characterEnd: number;
    filterType: FilterType;
    confidence: number;
    priority: number;
    context: string;
    window: string[];
    replacement: string | null;
    salt: string | null;
    pattern: string | null;
    applied: boolean;
    ignored: boolean;
    ambiguousWith: FilterType[];
    disambiguationScore: number | null;
}
/**
 * Span - Represents a detected entity in text
 */
export declare class Span {
    characterStart: number;
    characterEnd: number;
    text: string;
    filterType: FilterType;
    confidence: number;
    priority: number;
    context: string;
    window: string[];
    replacement: string | null;
    salt: string | null;
    pattern: string | null;
    applied: boolean;
    ignored: boolean;
    ambiguousWith: FilterType[];
    disambiguationScore: number | null;
    constructor(metadata: SpanMetadata);
    /**
     * Get span length
     */
    get length(): number;
    /**
     * Check if this span overlaps with another
     */
    overlapsWith(other: Span): boolean;
    /**
     * Check if this span is identical to another (same position and length)
     */
    isIdenticalTo(other: Span): boolean;
    /**
     * Check if this span fully contains another span
     */
    contains(other: Span): boolean;
    /**
     * Create a copy of this span
     */
    clone(): Span;
    /**
     * Convert to simple token format for backward compatibility
     */
    toToken(sessionId: string, count: number): string;
    /**
     * Shift span positions (used after text manipulation)
     */
    shift(offset: number): void;
}
/**
 * Span Utilities - Operations on collections of spans
 *
 * PERFORMANCE: Now uses IntervalTree for O(n log n) overlap detection
 * instead of O(n²) nested loops.
 */
export declare class SpanUtils {
    private static USE_INTERVAL_TREE;
    /**
     * Enable or disable interval tree optimization (for debugging)
     */
    static setUseIntervalTree(enabled: boolean): void;
    /**
     * Calculate composite score for a span
     * Used for tie-breaking when spans have similar characteristics
     *
     * @param span - The span to score
     * @returns A composite score (higher = better)
     */
    static calculateSpanScore(span: Span): number;
    /**
     * Drop overlapping spans, keeping the best ones based on:
     * 1. Composite score (length, confidence, type specificity, priority)
     * 2. Special handling for containment (parent vs child spans)
     * 3. Same-position disambiguation
     *
     * PERFORMANCE: O(n log n) using IntervalTree instead of O(n²) nested loops
     */
    static dropOverlappingSpans(spans: Span[]): Span[];
    /**
     * Legacy O(n²) implementation - kept for backward compatibility and debugging
     */
    private static dropOverlappingSpansLegacy;
    /**
     * Find spans that are identical in position
     * Returns groups of identical spans (for disambiguation)
     */
    static getIdenticalSpanGroups(spans: Span[]): Span[][];
    /**
     * Merge spans from multiple sources (e.g., regex + NER)
     * Removes duplicates and resolves overlaps
     *
     * PERFORMANCE: O(n log n) using IntervalTree
     */
    static mergeSpans(spanArrays: Span[][]): Span[];
    /**
     * Shift all spans by offset (used after text manipulation)
     */
    static shiftSpans(spans: Span[], offset: number): void;
    /**
     * Filter spans by confidence threshold
     */
    static filterByConfidence(spans: Span[], minConfidence: number): Span[];
    /**
     * Filter spans by filter type
     */
    static filterByType(spans: Span[], filterTypes: FilterType[]): Span[];
    /**
     * Sort spans by position (ascending)
     */
    static sortByPosition(spans: Span[]): Span[];
    /**
     * Get type specificity for a filter type
     */
    static getTypeSpecificity(filterType: FilterType | string): number;
}
//# sourceMappingURL=Span.d.ts.map