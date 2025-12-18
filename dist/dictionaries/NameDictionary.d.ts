/**
 * NameDictionary - First Name and Surname Validation Service
 *
 * Uses Phileas's 30K first names and 162K surnames dictionaries
 * to validate whether detected "names" are actually real names.
 *
 * This dramatically reduces false positives like "Timeline Narrative"
 * being flagged as a name (since "Timeline" is not a first name).
 *
 * BACKENDS:
 * 1. SQLite FTS5 (preferred): Memory-mapped database, 96% less heap usage
 * 2. In-memory Set (fallback): Fast but uses ~46MB heap
 *
 * Set VULPES_USE_SQLITE_DICT=0 to force in-memory mode.
 *
 * Performance: O(1) lookup using Set or indexed SQLite query.
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
    private static cachedNameLists;
    private static sqliteMatcher;
    private static usingSQLite;
    private static isSQLiteEnabled;
    private static isPhoneticEnabled;
    private static getPhoneticThreshold;
    /**
     * Initialize dictionaries from files or SQLite database
     * Call once at app startup
     *
     * Initialization order:
     * 1. Try SQLite database (memory-efficient, ~96% less heap)
     * 2. Fall back to in-memory Sets if SQLite unavailable
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
     * Initialize phonetic matcher when using SQLite backend
     * Uses SQLite's phonetic matching capabilities when possible
     */
    private static initPhoneticMatcherFromSQLite;
    /**
     * Get initialization status
     */
    static getStatus(): DictionaryStatus & {
        usingSQLite?: boolean;
    };
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
     * Calculate Levenshtein edit distance between two strings
     */
    private static levenshteinDistance;
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
    /**
     * Returns the loaded name dictionaries as arrays (lowercased).
     * Intended for initializing native/Rust accelerators.
     */
    static getNameLists(): {
        firstNames: string[];
        surnames: string[];
    };
}
//# sourceMappingURL=NameDictionary.d.ts.map