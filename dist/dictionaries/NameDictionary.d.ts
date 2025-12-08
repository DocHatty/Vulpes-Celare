/**
 * NameDictionary - First Name and Surname Validation Service
 *
 * Uses Phileas's 30K first names and 162K surnames dictionaries
 * to validate whether detected "names" are actually real names.
 *
 * This dramatically reduces false positives like "Timeline Narrative"
 * being flagged as a name (since "Timeline" is not a first name).
 *
 * Performance: O(1) lookup using Set, loaded once at startup.
 *
 * @module redaction/dictionaries
 */
import { PhoneticMatch } from "../utils/PhoneticMatcher";
/**
 * Dictionary initialization error - thrown when dictionaries cannot be loaded
 */
export declare class DictionaryInitError extends Error {
    readonly dictionaryType: "firstNames" | "surnames" | "both";
    readonly cause?: Error | undefined;
    constructor(message: string, dictionaryType: "firstNames" | "surnames" | "both", cause?: Error | undefined);
}
/**
 * Dictionary initialization status
 */
export interface DictionaryStatus {
    initialized: boolean;
    firstNamesLoaded: boolean;
    surnamesLoaded: boolean;
    firstNamesCount: number;
    surnamesCount: number;
    errors: string[];
}
export declare class NameDictionary {
    private static firstNames;
    private static surnames;
    private static initialized;
    private static initErrors;
    private static phoneticMatcher;
    private static phoneticInitialized;
    /**
     * Initialize dictionaries from files
     * Call once at app startup
     *
     * @throws {DictionaryInitError} If dictionaries cannot be loaded and throwOnError is true
     */
    static init(options?: {
        throwOnError?: boolean;
    }): void;
    /**
     * Initialize the phonetic matcher for fuzzy name matching
     * This enables detection of OCR-corrupted names like "PENEL0PE" -> "PENELOPE"
     */
    private static initPhoneticMatcher;
    /**
     * Get initialization status
     */
    static getStatus(): DictionaryStatus;
    /**
     * Check if dictionaries are properly loaded
     */
    static isHealthy(): boolean;
    /**
     * Normalize common OCR errors
     * @ -> a
     * 0 -> o
     * 1 -> l
     * 3 -> e
     * c -> e (common in this dataset: Brcnda -> Brenda, Pctcrson -> Peterson)
     * $ -> s
     * 8 -> b
     * 9 -> g
     * 5 -> s
     * | -> l
     * I -> l (common in names: WiIlliam -> William, EIiz@beth -> Elizabeth)
     */
    private static normalizeOCR;
    private static deduplicate;
    /**
     * Check if a word is a known first name
     * Uses exact match, OCR normalization, deduplication, and phonetic matching
     */
    static isFirstName(name: string): boolean;
    /**
     * Check if a word is a known surname
     * Uses exact match, OCR normalization, deduplication, and phonetic matching
     */
    static isSurname(name: string): boolean;
    /**
     * Get phonetic match details for a name (for debugging/logging)
     */
    static getPhoneticMatch(name: string): PhoneticMatch | null;
    /**
     * Check if a two-word phrase is likely a real name
     * Returns confidence score 0.0 - 1.0
     *
     * "John Smith" → first name + surname → 1.0
     * "John Williams" → first name + surname → 1.0
     * "Timeline Narrative" → not first name → 0.0
     * "Rodriguez Garcia" → surname + surname → 0.5 (could be Hispanic name)
     */
    static getNameConfidence(phrase: string): number;
    /**
     * Quick check: Is this phrase likely a real name?
     * Uses threshold of 0.5
     */
    static isLikelyRealName(phrase: string): boolean;
    /**
     * Get dictionary stats
     */
    static getStats(): {
        firstNames: number;
        surnames: number;
    };
}
//# sourceMappingURL=NameDictionary.d.ts.map