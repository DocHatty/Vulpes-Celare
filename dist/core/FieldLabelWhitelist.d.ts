/**
 * Field Label Whitelist - Centralized Exclusion Registry
 *
 * Prevents common medical/clinical field labels and document structure
 * from being incorrectly redacted as PHI/PII.
 *
 * This is the SINGLE SOURCE OF TRUTH for all exclusions.
 * Ported from VulpesMatrix with enhancements for radiology workflows.
 *
 * @module redaction/core
 */
export declare class FieldLabelWhitelist {
    /**
     * Terms that should NEVER be redacted - they're field labels, not PHI
     */
    private static readonly WHITELIST_TERMS;
    /**
     * Exact phrase matches that should NOT be redacted (case-insensitive)
     * These are multi-word phrases that look like names but aren't
     */
    private static readonly EXACT_PHRASE_EXCLUSIONS;
    /**
     * Words that indicate document structure when part of a phrase
     */
    private static readonly STRUCTURE_WORDS;
    /**
     * Check if a text span is a whitelisted field label
     *
     * @param text - Text to check
     * @returns true if text should NOT be redacted (is a field label)
     */
    static isFieldLabel(text: string): boolean;
    /**
     * Check if text contains document structure words
     * These indicate the text is structural, not PHI
     *
     * IMPORTANT: Uses word boundary matching to avoid false positives.
     * For example, "PHILIP" should NOT match "PHI" - only whole word "PHI" should match.
     */
    static containsStructureWord(text: string): boolean;
    /**
     * Check if text is likely a generic medical term (not PHI)
     */
    static isGenericMedicalTerm(text: string): boolean;
    /**
     * Check if text is a common clinical abbreviation
     */
    static isClinicalAbbreviation(text: string): boolean;
    /**
     * Check if text is an exact phrase that should be excluded
     */
    static isExactPhraseExclusion(text: string): boolean;
    /**
     * Master check - should this text be excluded from redaction?
     * Combines all checks into a single method
     */
    static shouldExclude(text: string): boolean;
    /**
     * Check if text looks like a street address (starts with house number)
     * Examples: "789 Pine Street", "123 Main Ave"
     */
    private static looksLikeStreetAddress;
    /**
     * Filter types that should NEVER be filtered by structure word checks.
     * These are pattern-matched identifiers with specific formats that should
     * not be excluded just because they contain a structure word in the value.
     */
    private static readonly PATTERN_MATCHED_TYPES;
    /**
     * Filter out whitelisted terms from spans
     *
     * @param spans - Detected spans
     * @returns Filtered spans with field labels removed
     */
    static filterSpans<T extends {
        text: string;
        characterStart: number;
        characterEnd: number;
        filterType?: string;
    }>(spans: T[]): T[];
}
//# sourceMappingURL=FieldLabelWhitelist.d.ts.map