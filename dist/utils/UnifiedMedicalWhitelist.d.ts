/**
 * UnifiedMedicalWhitelist - SINGLE SOURCE OF TRUTH for Non-PHI Detection
 *
 * This module consolidates ALL whitelist logic previously scattered across:
 * - CentralizedWhitelist.ts (DEAD CODE - now deprecated)
 * - DocumentVocabulary.ts (~847 terms)
 * - NameFilterConstants.ts (~1002 terms)
 * - FieldLabelWhitelist.ts (~238 terms)
 * - WeightedPHIScorer.ts (~267 terms)
 *
 * TOTAL: ~1901 unique terms consolidated into categorized sets.
 *
 * DESIGN PRINCIPLES:
 * 1. Single source of truth - ALL whitelist decisions go through here
 * 2. Fast O(1) lookups using Sets
 * 3. Context-aware decisions (e.g., "Wilson" in "Wilson's disease" vs "Dr. Wilson")
 * 4. Hierarchical categories for fine-grained control
 * 5. Extensible at runtime for institution-specific terms
 *
 * CATEGORIES:
 * - Medical Eponyms (diseases named after people)
 * - Medical Conditions (diagnoses, diseases)
 * - Medications (drug names)
 * - Procedures (surgeries, tests)
 * - Anatomical Terms
 * - Clinical Acronyms (CT, MRI, etc.)
 * - Document Structure (section headers, field labels)
 * - Insurance Companies
 * - Hospital Names
 * - Geographic Terms
 * - Professional Titles/Credentials
 *
 * @module utils/UnifiedMedicalWhitelist
 */
import { FilterType } from "../models/Span";
/**
 * UnifiedMedicalWhitelist - Single source of truth for all whitelist decisions
 */
export declare class UnifiedMedicalWhitelist {
    private static cachedAllTerms;
    /**
     * Check if text is a medical eponym (disease/test named after person)
     * Context-aware: "Wilson's disease" = eponym, "Dr. Wilson" = person
     */
    static isMedicalEponym(text: string, context?: string): boolean;
    /**
     * Check if text is a medical condition
     */
    static isMedicalCondition(text: string): boolean;
    /**
     * Check if text is a medication name
     */
    static isMedication(text: string): boolean;
    /**
     * Check if text is a medical procedure
     */
    static isProcedure(text: string): boolean;
    /**
     * Check if text is an anatomical term
     */
    static isAnatomicalTerm(text: string): boolean;
    /**
     * Check if text is a clinical acronym
     */
    static isClinicalAcronym(text: string): boolean;
    /**
     * Check if text is document structure
     */
    static isDocumentStructure(text: string): boolean;
    /**
     * Check if text is a field label
     */
    static isFieldLabel(text: string): boolean;
    /**
     * Check if text is an insurance company
     */
    static isInsuranceCompany(text: string): boolean;
    /**
     * Check if text is a hospital/facility name
     */
    static isHospitalName(text: string): boolean;
    /**
     * Check if text is a geographic term
     */
    static isGeographicTerm(text: string): boolean;
    /**
     * Check if text has person indicators (title, suffix)
     * If true, should NOT be whitelisted even if contains medical term
     */
    static hasPersonIndicators(text: string): boolean;
    /**
     * Check if word should never be part of a name
     */
    static isNeverNameWord(text: string): boolean;
    /**
     * Structure words that indicate document structure when part of a phrase
     * These indicate the text is structural, not PHI
     */
    private static readonly STRUCTURE_WORDS;
    /**
     * Filter types that should bypass structure word checks
     * These are pattern-matched identifiers with specific formats
     */
    private static readonly PATTERN_MATCHED_TYPES;
    /**
     * Check if text contains document structure words
     * Uses word boundary matching to avoid false positives (e.g., "PHILIP" vs "PHI")
     */
    static containsStructureWord(text: string): boolean;
    /**
     * Check if text looks like a street address (starts with house number)
     * Examples: "789 Pine Street", "123 Main Ave"
     * Street addresses should NOT be whitelisted even if they contain structure words
     */
    static looksLikeStreetAddress(text: string): boolean;
    /**
     * Check if a filter type is pattern-matched (bypasses structure word checks)
     */
    static isPatternMatchedType(filterType: string): boolean;
    /**
     * Filter spans using whitelist rules
     * Pattern-matched types (EMAIL, URL, etc.) bypass structure word checks
     */
    static filterSpans<T extends {
        text: string;
        characterStart: number;
        characterEnd: number;
        filterType?: string;
    }>(spans: T[]): T[];
    /**
     * Check if text should be excluded from redaction (used by filterSpans)
     * Does not apply to pattern-matched types
     */
    static shouldExcludeFromRedaction(text: string): boolean;
    /**
     * Check if text is ANY known medical term
     * Combines conditions, medications, procedures, anatomy, acronyms
     */
    static isMedicalTerm(text: string): boolean;
    /**
     * Master whitelist check - should text NOT be redacted?
     *
     * @param text - The text to check
     * @param filterType - The PHI type being considered
     * @param context - Surrounding context for disambiguation
     * @returns True if text should be whitelisted (not redacted)
     */
    static shouldWhitelist(text: string, filterType?: FilterType | string, context?: string): boolean;
    /**
     * Get whitelist penalty for confidence scoring
     * Higher penalty = less likely to be PHI
     *
     * @param text - The text to check
     * @param context - Surrounding context
     * @returns Penalty value (0-1, where 1 means definitely not PHI)
     */
    static getWhitelistPenalty(text: string, context?: string): number;
    /**
     * Check if text is non-PHI (comprehensive check)
     * More inclusive than shouldWhitelist - returns true if ANY indicator present
     */
    static isNonPHI(text: string): boolean;
    /**
     * Add custom terms to a category at runtime
     * Useful for institution-specific terms
     */
    static addCustomTerms(category: "eponyms" | "conditions" | "medications" | "procedures" | "anatomical" | "acronyms" | "structure" | "labels" | "insurance" | "hospitals" | "geographic" | "never_names", terms: string[]): void;
    private static getCategorySet;
    /**
     * Get all terms from all categories (for testing/debugging)
     */
    static getAllTerms(): Set<string>;
    /**
     * Get statistics about the whitelist
     */
    static getStats(): Record<string, number>;
}
/**
 * Quick check if text should be whitelisted
 */
export declare function shouldWhitelist(text: string, filterType?: FilterType | string, context?: string): boolean;
/**
 * Get whitelist penalty for confidence scoring
 */
export declare function getWhitelistPenalty(text: string, context?: string): number;
/**
 * Check if text is any medical term
 */
export declare function isMedicalTerm(text: string): boolean;
/**
 * Check if text is non-PHI
 */
export declare function isNonPHI(text: string): boolean;
//# sourceMappingURL=UnifiedMedicalWhitelist.d.ts.map