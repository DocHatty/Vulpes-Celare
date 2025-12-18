/**
 * NameFilterConstants - Shared Constants for Name Filters
 *
 * Consolidates common whitelists and term sets used across multiple name filters
 * to ensure consistency and reduce code duplication.
 *
 * @module filters/constants
 */
/**
 * Common name prefixes/titles
 * IMPORTANT: These are used to identify PROVIDER names that should NOT be redacted
 */
export declare const NAME_PREFIXES: string[];
/**
 * Common name suffixes and professional credentials
 * IMPORTANT: These help identify PROVIDER names that should NOT be redacted
 */
export declare const NAME_SUFFIXES: string[];
/**
 * Whitelist of terms that should NOT be redacted as names.
 * This comprehensive list covers document metadata, field labels,
 * section headings, medical/clinical terms, and HIPAA document structure.
 */
export declare const NAME_WHITELIST: Set<string>;
/**
 * Document/section terms that should NOT be treated as names
 * (first words that indicate non-name phrases)
 */
export declare const DOCUMENT_TERMS: Set<string>;
/**
 * Common non-name endings (last words that indicate non-name phrases)
 */
export declare const NON_NAME_ENDINGS: Set<string>;
/**
 * Geographic terms that shouldn't be treated as names
 */
export declare const GEOGRAPHIC_TERMS: Set<string>;
/**
 * Single-word acronyms that should be excluded from name detection
 */
export declare const EXCLUDED_ACRONYMS: Set<string>;
/**
 * Multi-word phrases that should NOT be redacted as names (ALL CAPS)
 */
export declare const EXCLUDED_PHRASES: Set<string>;
/**
 * Context-aware compound phrases that should NOT be redacted.
 * These are multi-word terms where individual words might look like names,
 * but when appearing together, they form a known non-PHI phrase.
 *
 * Format: Map of "trigger word" -> ["words that follow it to form a safe phrase"]
 * If "Johns" is followed by "Hopkins", don't redact "Johns".
 */
export declare const COMPOUND_PHRASE_WHITELIST: Map<string, string[]>;
/**
 * Check if a word is part of a compound phrase that should not be redacted.
 * Returns true if the word appears to be the START of a whitelisted compound phrase.
 *
 * @param word - The potentially triggering word (e.g., "Johns")
 * @param followingText - The text that follows this word
 * @returns true if this appears to be a compound phrase that should be preserved
 */
export declare function isCompoundPhraseStart(word: string, followingText: string): boolean;
/**
 * Check if text is part of a known compound phrase that should not be redacted.
 * Checks both as a phrase start and within the phrase.
 */
export declare function isPartOfCompoundPhrase(text: string, fullContext: string): boolean;
/**
 * Structure words that indicate the text is a header/label, not a name
 */
export declare const STRUCTURE_WORDS: Set<string>;
/**
 * Medical eponyms - names used in medical terminology that should NOT be redacted as patient names.
 * These are diseases, criteria, syndromes, procedures, and anatomical terms named after people.
 */
export declare const MEDICAL_EPONYMS: Set<string>;
/**
 * Helper function to check if text is a medical eponym
 * Medical eponyms are names used in medical terminology (diseases, criteria, procedures)
 * that should NOT be redacted as patient names.
 */
/**
 * Check if text is a medical eponym being used in a MEDICAL CONTEXT.
 *
 * STREET-SMART: Many medical eponyms (Murphy, Ross, Weber, Fisher, Jones, McDonald)
 * are also extremely common surnames. We should ONLY treat them as medical terms when:
 * 1. The eponym appears ALONE (just "Murphy" not "Alice Murphy")
 * 2. The eponym is followed by medical context words ("Murphy's sign", "McDonald criteria")
 * 3. The eponym appears with possessive form ("Murphy's", "Parkinson's")
 *
 * This prevents rejecting real person names like "Alice Murphy" or "Dr. Jones".
 */
export declare function isMedicalEponym(text: string): boolean;
/**
 * Helper function to check if text is whitelisted
 */
export declare function isWhitelisted(text: string): boolean;
/**
 * Helper function to check if ALL CAPS text should be excluded
 */
export declare function isExcludedAllCaps(text: string): boolean;
//# sourceMappingURL=NameFilterConstants.d.ts.map