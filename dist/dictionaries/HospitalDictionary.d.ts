/**
 * HospitalDictionary - Healthcare Facility Name Lookup Service
 *
 * Provides O(1) lookup for 7,389 healthcare facility names including:
 * - Hospitals
 * - Medical centers
 * - Health systems
 * - Clinics
 * - Indian Health Service facilities
 *
 * Used to detect organization names that could identify patient location.
 *
 * @module redaction/dictionaries
 */
/**
 * Hospital dictionary initialization error
 */
export declare class HospitalDictionaryInitError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
/**
 * Hospital dictionary status
 */
export interface HospitalDictionaryStatus {
    initialized: boolean;
    hospitalsLoaded: boolean;
    hospitalCount: number;
    phraseCount: number;
    error: string | null;
}
export declare class HospitalDictionary {
    private static hospitals;
    private static hospitalPhrases;
    private static initialized;
    private static initError;
    private static ahoCorasick;
    /**
     * Initialize the hospital dictionary from file
     *
     * @throws {HospitalDictionaryInitError} If throwOnError is true and loading fails
     */
    private static init;
    /**
     * Get initialization status
     */
    static getStatus(): HospitalDictionaryStatus;
    /**
     * Check if dictionary is properly loaded
     */
    static isHealthy(): boolean;
    /**
     * Force initialization with error throwing (for tests/startup validation)
     */
    static initStrict(): void;
    /**
     * Check if a phrase is a known hospital name
     * @param phrase - The phrase to check (case-insensitive)
     * @returns true if the phrase matches a hospital name
     */
    static isHospital(phrase: string): boolean;
    /**
     * Find all hospital names in a text
     * Uses Aho-Corasick algorithm for O(n + m + z) performance
     * (n = text length, m = total pattern length, z = matches)
     * This is ~50-100x faster than the previous O(n × m) approach
     *
     * @param text - The text to search
     * @returns Array of matches with position and matched text
     */
    static findHospitalsInText(text: string): Array<{
        text: string;
        start: number;
        end: number;
    }>;
    /**
     * Get total count of hospitals in dictionary
     */
    static getCount(): number;
    /**
     * Check if a text contains any hospital-related keywords
     * (faster pre-filter before full dictionary search)
     */
    static hasHospitalKeywords(text: string): boolean;
    /**
     * WHITELIST CHECK: Check if a potential name match is actually part of a hospital name.
     * This is used to PROTECT hospital name components from being redacted as patient names.
     *
     * Hospital names are NOT patient PHI under HIPAA Safe Harbor.
     *
     * @param potentialName - The potential name to check (e.g., "Johns", "Hopkins")
     * @param context - The surrounding text to check for hospital patterns
     * @returns true if this text is part of a hospital name and should NOT be redacted
     */
    static isPartOfHospitalName(potentialName: string, context: string): boolean;
}
//# sourceMappingURL=HospitalDictionary.d.ts.map