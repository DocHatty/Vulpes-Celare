/**
 * Centralized Word Lists for False Positive Filtering
 *
 * This module consolidates hardcoded word lists from PostFilterService.ts
 * for easier maintenance and customization.
 *
 * This addresses M1: Hardcoded word lists in PostFilterService
 *
 * Lists are organized by category:
 * - Section headings (document structure)
 * - Structure words (single words indicating document structure)
 * - Invalid prefixes (words that shouldn't start a name)
 * - Invalid suffixes (words that shouldn't end a name)
 * - Medical phrases (clinical terminology that are false positives)
 *
 * @module config/WordLists
 */
/**
 * Multi-word section headings that should not be detected as names.
 * These are ALL CAPS headings commonly found in clinical documents.
 */
export declare const SectionHeadings: Set<string>;
/**
 * Single-word headings that should not be detected as names.
 */
export declare const SingleWordHeadings: Set<string>;
/**
 * Words that indicate document structure rather than names.
 * If a "name" contains these words, it's likely a false positive.
 */
export declare const StructureWords: Set<string>;
/**
 * Words that should not start a valid name.
 * Names starting with these are likely false positives.
 */
export declare const InvalidNamePrefixes: string[];
/**
 * Words that should not end a valid name.
 * Names ending with these are likely false positives.
 */
export declare const InvalidNameSuffixes: string[];
/**
 * Complete medical/clinical phrases that are false positives.
 * These are matched as complete phrases (case-insensitive).
 */
export declare const MedicalPhrases: Set<string>;
/**
 * Check if a string is a section heading.
 */
export declare function isSectionHeading(text: string): boolean;
/**
 * Check if a string contains structure words.
 */
export declare function containsStructureWord(text: string): boolean;
/**
 * Check if a name starts with an invalid prefix.
 */
export declare function hasInvalidPrefix(name: string): boolean;
/**
 * Check if a name ends with an invalid suffix.
 */
export declare function hasInvalidSuffix(name: string): boolean;
/**
 * Check if text matches a medical phrase.
 */
export declare function isMedicalPhrase(text: string): boolean;
/**
 * Unified WordLists export for convenient importing.
 *
 * @example
 * import { WordLists } from '../config/WordLists';
 * if (WordLists.isSectionHeading(text)) { ... }
 */
export declare const WordLists: {
    readonly SectionHeadings: Set<string>;
    readonly SingleWordHeadings: Set<string>;
    readonly StructureWords: Set<string>;
    readonly InvalidNamePrefixes: string[];
    readonly InvalidNameSuffixes: string[];
    readonly MedicalPhrases: Set<string>;
    readonly isSectionHeading: typeof isSectionHeading;
    readonly containsStructureWord: typeof containsStructureWord;
    readonly hasInvalidPrefix: typeof hasInvalidPrefix;
    readonly hasInvalidSuffix: typeof hasInvalidSuffix;
    readonly isMedicalPhrase: typeof isMedicalPhrase;
};
//# sourceMappingURL=WordLists.d.ts.map