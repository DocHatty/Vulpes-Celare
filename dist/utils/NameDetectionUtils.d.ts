/**
 * NameDetectionUtils - Centralized Name Detection Utilities
 *
 * Provides shared constants, patterns, and validation methods used across
 * all name detection filters (SmartNameFilterSpan, FormattedNameFilterSpan,
 * TitledNameFilterSpan, FamilyNameFilterSpan).
 *
 * This consolidates ~500+ lines of duplicated code across the name filters.
 *
 * @module redaction/utils
 */
/**
 * Provider and professional title prefixes (Mr., Dr., Prof., etc.)
 * Used across all name filters for titled name detection
 */
export declare const PROVIDER_TITLE_PREFIXES: Set<string>;
/**
 * Professional credentials and suffixes (MD, PhD, RN, etc.)
 */
export declare const PROVIDER_CREDENTIALS: Set<string>;
/**
 * Non-person structure terms - phrases that indicate document structure, not names
 */
export declare const NON_PERSON_STRUCTURE_TERMS: string[];
/**
 * Family relationship keywords for name detection
 */
export declare const FAMILY_RELATIONSHIP_KEYWORDS: string[];
/**
 * NameDetectionUtils - Static utility class for name detection
 */
export declare class NameDetectionUtils {
    /**
     * Get compiled regex for "Last, First" name format
     * Matches: "Smith, John", "O'Brien, Mary Jane"
     */
    static getLastFirstPattern(): RegExp;
    /**
     * Get compiled regex for "Last, First" ALL CAPS format
     * Matches: "SMITH, JOHN", "O'BRIEN, MARY JANE"
     */
    static getLastFirstAllCapsPattern(): RegExp;
    /**
     * Get compiled regex for family relationship names
     * Matches: "Spouse: John Smith", "Mother Jane Doe"
     */
    static getFamilyRelationshipPattern(): RegExp;
    /**
     * Get compiled regex for age/gender descriptor names
     * Matches: "45 year old woman Jane Smith"
     */
    static getAgeGenderPattern(): RegExp;
    /**
     * Get compiled regex for possessive names
     * Matches: "John Smith's"
     */
    static getPossessiveNamePattern(): RegExp;
    /**
     * Get compiled regex for initial + last name
     * Matches: "J. Smith", "J Smith", "JR Smith"
     */
    static getInitialLastNamePattern(): RegExp;
    /**
     * Get compiled regex for titled names
     * Matches: "Dr. John Smith", "Mr. Jones"
     */
    static getTitledNamePattern(): RegExp;
    /**
     * Validate "Last, First" name format (case-insensitive)
     *
     * @param name - Name in "Last, First" format
     * @returns true if valid format
     */
    static validateLastFirst(name: string): boolean;
    /**
     * Validate "Last, First" name format (strict capitalization)
     *
     * @param name - Name in "Last, First" format
     * @returns true if properly capitalized
     */
    static validateLastFirstStrict(name: string): boolean;
    /**
     * Check if text is a non-person structure term
     *
     * @param text - Text to check
     * @returns true if it's a structure term
     */
    static isNonPersonStructureTerm(text: string): boolean;
    /**
     * Extract context around a position in text
     *
     * @param text - Full text
     * @param offset - Start position
     * @param length - Length of match
     * @param contextSize - Characters before/after (default: 150)
     * @returns Context string
     */
    static extractContext(text: string, offset: number, length: number, contextSize?: number): string;
    /**
     * Check if text starts with a provider/professional title
     *
     * @param text - Text to check
     * @returns true if starts with a title
     */
    static startsWithTitle(text: string): boolean;
    /**
     * Remove title prefix from name
     *
     * @param text - Name with potential title
     * @returns Name without title
     */
    static removeTitle(text: string): string;
    /**
     * Check if text ends with professional credentials
     *
     * @param text - Text to check
     * @returns true if ends with credentials
     */
    static endsWithCredentials(text: string): boolean;
    /**
     * Check if text is in ALL CAPS (potential section heading)
     *
     * @param text - Text to check
     * @returns true if all uppercase
     */
    static isAllCaps(text: string): boolean;
    /**
     * Check if text is likely a person name using dictionary validation
     *
     * @param text - Text to check
     * @param context - Optional surrounding context
     * @returns true if likely a person name
     */
    static isLikelyPersonName(text: string, context?: string): boolean;
    /**
     * Check if name appears in provider context (after Dr., Physician:, etc.)
     *
     * @param name - Name to check
     * @param index - Position in text
     * @param text - Full text
     * @returns true if in provider context
     */
    static isInProviderContext(name: string, index: number, text: string): boolean;
    /**
     * Comprehensive whitelist check for name candidates
     *
     * @param text - Name candidate to check
     * @param context - Optional surrounding context
     * @param isAllCapsMode - Whether to use ALL CAPS logic
     * @returns true if should be whitelisted (not a name)
     */
    static performWhitelistCheck(text: string, context?: string, isAllCapsMode?: boolean): boolean;
    /**
     * Get family relationship keywords as array
     */
    static getFamilyRelationshipKeywords(): string[];
    /**
     * Get non-person structure terms as array
     */
    static getStructureTerms(): string[];
    /**
     * Check if a word is a provider title
     */
    static isProviderTitle(word: string): boolean;
    /**
     * Check if a word is a professional credential
     */
    static isCredential(word: string): boolean;
}
//# sourceMappingURL=NameDetectionUtils.d.ts.map