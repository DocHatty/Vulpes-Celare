/**
 * DocumentVocabulary - Centralized Non-PHI Term Registry
 *
 * Single source of truth for all terms that should NEVER be redacted as PHI.
 * This consolidates exclusions previously scattered across multiple files:
 * - SmartNameFilterSpan.ts
 * - FieldLabelWhitelist.ts
 * - ParallelRedactionEngine.ts
 *
 * Categories:
 * - Document structure terms (headers, section names)
 * - Medical terminology (conditions, procedures, medications)
 * - Geographic/location terms (cities, states, directions)
 * - Field labels (Name:, DOB:, MRN:, etc.)
 * - HIPAA-specific terminology
 *
 * @module redaction/vocabulary
 */
export declare class DocumentVocabulary {
    /**
     * Document structure terms - headers, sections, report types
     * These are NEVER patient names
     */
    static readonly DOCUMENT_STRUCTURE: Set<string>;
    /**
     * Medical terminology - conditions, procedures, medications, anatomy
     * These are NEVER patient names
     */
    static readonly MEDICAL_TERMS: Set<string>;
    /**
     * Insurance company names - should never be redacted as patient names
     */
    static readonly INSURANCE_TERMS: Set<string>;
    /**
     * Hospital and medical facility names - should never be redacted as patient names
     * These are healthcare facility identifiers, NOT patient PHI under HIPAA Safe Harbor
     */
    static readonly HOSPITAL_NAMES: Set<string>;
    /**
     * Geographic and location terms
     * These are context words, not PHI by themselves
     */
    static readonly GEOGRAPHIC_TERMS: Set<string>;
    /**
     * Field label terms - words that indicate field labels, not PHI values
     */
    static readonly FIELD_LABELS: Set<string>;
    /**
     * Single words that are NEVER part of a person's name
     * Used to filter false positives in name detection
     */
    static readonly NEVER_NAME_WORDS: Set<string>;
    /**
     * Check if a term is a known non-PHI document structure term
     */
    static isDocumentStructure(text: string): boolean;
    /**
     * Lazy-initialized lowercase lookup set for performance
     * Includes all medical terms in lowercase for fast matching
     */
    private static lowerMedicalTerms;
    private static getLowerMedicalTerms;
    /**
     * Check if a term is a known medical term
     * Handles case variations: lowercase, capitalized, ALL CAPS
     */
    static isMedicalTerm(text: string): boolean;
    /**
     * Check if a term is a geographic term
     */
    static isGeographicTerm(text: string): boolean;
    /**
     * Check if a term is a field label
     */
    static isFieldLabel(text: string): boolean;
    /**
     * Check if a word should never be part of a name
     */
    static isNeverNameWord(word: string): boolean;
    /**
     * Check if a term is an insurance company name
     */
    static isInsuranceTerm(text: string): boolean;
    /**
     * Check if a term is a hospital or medical facility name
     */
    static isHospitalName(text: string): boolean;
    /**
     * Master check - is this text definitely NOT PHI?
     * Combines all checks into a single method
     */
    static isNonPHI(text: string): boolean;
    /**
     * Check if text contains any non-PHI indicators
     * Less strict than isNonPHI - returns true if ANY word matches
     */
    static containsNonPHIIndicator(text: string): boolean;
    /**
     * Get all terms from all categories (for testing/debugging)
     */
    static getAllTerms(): Set<string>;
}
//# sourceMappingURL=DocumentVocabulary.d.ts.map