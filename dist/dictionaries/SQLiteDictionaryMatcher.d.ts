/**
 * SQLiteDictionaryMatcher - Memory-Efficient Dictionary Matching via SQLite
 *
 * PERFORMANCE BENEFITS:
 * - 96% memory reduction: ~46MB JS heap -> ~1.6MB (OS memory-maps the DB)
 * - O(1) exact lookups via indexed queries
 * - FTS5 trigram matching for fuzzy search
 * - Soundex phonetic matching via indexed column
 * - Thread-safe: SQLite handles concurrent reads
 *
 * USAGE:
 *   const matcher = new SQLiteDictionaryMatcher();
 *   matcher.hasExact("john", "first");     // true
 *   matcher.fuzzyMatch("jonh");            // [{ name: "john", score: 0.95 }]
 *   matcher.phoneticMatch("jon");          // ["john", "jon", "juan"]
 *
 * FALLBACK:
 * If SQLite is unavailable or the database doesn't exist, methods return
 * empty results. The caller should have fallback logic to use in-memory
 * dictionaries.
 *
 * @module redaction/dictionaries
 */
export interface FuzzyMatchResult {
    name: string;
    source: "first" | "surname" | "hospital" | "city";
    score: number;
}
export interface SQLiteDictionaryConfig {
    dbPath?: string;
    enableBloomFilter?: boolean;
    bloomFilterPath?: string;
}
export declare class SQLiteDictionaryMatcher {
    private db;
    private bloomFilter;
    private isAvailable;
    private stmtExactFirst;
    private stmtExactSurname;
    private stmtExactHospital;
    private stmtExactCity;
    private stmtFuzzyFTS;
    private stmtSoundexFirst;
    private stmtSoundexSurname;
    private stmtAllFirstNames;
    private stmtAllSurnames;
    private stats;
    constructor(config?: SQLiteDictionaryConfig);
    private resolveDatabasePath;
    private prepareStatements;
    private loadBloomFilter;
    /**
     * Check if SQLite matching is available
     */
    available(): boolean;
    /**
     * Check for exact match in a specific dictionary
     */
    hasExact(name: string, type: "first" | "surname" | "hospital" | "city" | "any"): boolean;
    /**
     * Check if name exists in first names dictionary
     */
    isFirstName(name: string): boolean;
    /**
     * Check if name exists in surnames dictionary
     */
    isSurname(name: string): boolean;
    /**
     * Check if name exists in either first or surname dictionary
     */
    isName(name: string): boolean;
    /**
     * Fuzzy match using FTS5 trigrams
     * Returns matches ranked by BM25 relevance score
     */
    fuzzyMatch(query: string, limit?: number): FuzzyMatchResult[];
    /**
     * Phonetic matching using Soundex
     */
    phoneticMatch(query: string): string[];
    /**
     * Soundex phonetic encoding
     */
    private soundex;
    /**
     * Get all names from the database (for initializing Rust accelerators)
     * Returns arrays of lowercased names
     */
    getAllNames(): {
        firstNames: string[];
        surnames: string[];
    };
    /**
     * Get matching statistics
     */
    getStats(): typeof this.stats;
    /**
     * Get database metadata
     */
    getMetadata(): Record<string, unknown> | null;
    /**
     * Close database connection
     */
    close(): void;
}
/**
 * Get shared SQLite dictionary matcher instance
 */
export declare function getSQLiteDictionaryMatcher(): SQLiteDictionaryMatcher;
/**
 * Check if SQLite dictionaries are available
 */
export declare function isSQLiteDictionaryAvailable(): boolean;
//# sourceMappingURL=SQLiteDictionaryMatcher.d.ts.map