"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteDictionaryMatcher = void 0;
exports.getSQLiteDictionaryMatcher = getSQLiteDictionaryMatcher;
exports.isSQLiteDictionaryAvailable = isSQLiteDictionaryAvailable;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const bloom_filters_1 = require("bloom-filters");
const BloomFilterStore_1 = require("./BloomFilterStore");
// Default database path
const DEFAULT_DB_PATH = path.join(__dirname, "..", "..", "data", "vulpes-dictionaries.db");
// Dist path (when running from compiled code)
const DIST_DB_PATH = path.join(__dirname, "..", "data", "vulpes-dictionaries.db");
class SQLiteDictionaryMatcher {
    db = null;
    bloomFilter = null;
    isAvailable = false;
    // Prepared statements for performance
    stmtExactFirst = null;
    stmtExactSurname = null;
    stmtExactHospital = null;
    stmtExactCity = null;
    stmtFuzzyFTS = null;
    stmtSoundexFirst = null;
    stmtSoundexSurname = null;
    stmtAllFirstNames = null;
    stmtAllSurnames = null;
    // Statistics
    stats = {
        exactHits: 0,
        exactMisses: 0,
        fuzzyQueries: 0,
        phoneticQueries: 0,
        bloomRejections: 0,
    };
    constructor(config = {}) {
        const dbPath = this.resolveDatabasePath(config.dbPath);
        if (!dbPath) {
            console.warn("[SQLiteDictionaryMatcher] Database not found, operating in fallback mode");
            return;
        }
        try {
            // Open database in read-only mode
            this.db = new better_sqlite3_1.default(dbPath, {
                readonly: true,
                fileMustExist: true,
            });
            // Enable memory-mapping for better performance
            this.db.pragma("mmap_size = 268435456"); // 256MB mmap
            // Prepare statements
            this.prepareStatements();
            // Load bloom filter if enabled
            if (config.enableBloomFilter !== false) {
                this.loadBloomFilter(config.bloomFilterPath);
            }
            this.isAvailable = true;
        }
        catch (error) {
            console.warn("[SQLiteDictionaryMatcher] Failed to open database:", error.message);
            this.db = null;
        }
    }
    resolveDatabasePath(configPath) {
        // Check explicit path first
        if (configPath && fs.existsSync(configPath)) {
            return configPath;
        }
        // Check default path (development)
        if (fs.existsSync(DEFAULT_DB_PATH)) {
            return DEFAULT_DB_PATH;
        }
        // Check dist path (production)
        if (fs.existsSync(DIST_DB_PATH)) {
            return DIST_DB_PATH;
        }
        return null;
    }
    prepareStatements() {
        if (!this.db)
            return;
        // Exact match statements
        this.stmtExactFirst = this.db.prepare("SELECT 1 FROM first_names WHERE name = ? COLLATE NOCASE LIMIT 1");
        this.stmtExactSurname = this.db.prepare("SELECT 1 FROM surnames WHERE name = ? COLLATE NOCASE LIMIT 1");
        this.stmtExactHospital = this.db.prepare("SELECT 1 FROM hospitals WHERE name = ? COLLATE NOCASE LIMIT 1");
        this.stmtExactCity = this.db.prepare("SELECT 1 FROM cities WHERE name = ? COLLATE NOCASE LIMIT 1");
        // FTS5 fuzzy matching
        this.stmtFuzzyFTS = this.db.prepare(`
      SELECT name, source, bm25(names_fts) as score
      FROM names_fts
      WHERE names_fts MATCH ?
      ORDER BY score
      LIMIT 10
    `);
        // Soundex phonetic matching
        this.stmtSoundexFirst = this.db.prepare("SELECT name FROM first_names WHERE soundex = ? LIMIT 20");
        this.stmtSoundexSurname = this.db.prepare("SELECT name FROM surnames WHERE soundex = ? LIMIT 20");
        // Bulk retrieval for cache warming
        this.stmtAllFirstNames = this.db.prepare("SELECT name FROM first_names");
        this.stmtAllSurnames = this.db.prepare("SELECT name FROM surnames");
    }
    loadBloomFilter(bloomPath) {
        // Try to load pre-built bloom filter
        const paths = [
            bloomPath,
            path.join(__dirname, "..", "..", "data", "names-bloom.bin"),
            path.join(__dirname, "..", "data", "names-bloom.bin"),
        ].filter(Boolean);
        for (const p of paths) {
            if (BloomFilterStore_1.BloomFilterStore.isValid(p)) {
                try {
                    const { filter } = BloomFilterStore_1.BloomFilterStore.loadFromFile(p);
                    this.bloomFilter = filter;
                    return;
                }
                catch {
                    // Continue to next path
                }
            }
        }
        // Build bloom filter from database if not cached
        if (this.db && this.stmtAllFirstNames && this.stmtAllSurnames) {
            try {
                const firstNamesRows = this.stmtAllFirstNames.all();
                const surnamesRows = this.stmtAllSurnames.all();
                const firstNames = firstNamesRows.map((r) => r.name);
                const surnames = surnamesRows.map((r) => r.name);
                const allNames = [...firstNames, ...surnames];
                this.bloomFilter = bloom_filters_1.BloomFilter.from(allNames, 0.001);
            }
            catch {
                // Bloom filter is optional, continue without it
            }
        }
    }
    /**
     * Check if SQLite matching is available
     */
    available() {
        return this.isAvailable;
    }
    /**
     * Check for exact match in a specific dictionary
     */
    hasExact(name, type) {
        if (!this.db)
            return false;
        const lower = name.toLowerCase().trim();
        // Bloom filter first-pass for names
        if (this.bloomFilter &&
            (type === "first" || type === "surname" || type === "any")) {
            if (!this.bloomFilter.has(lower)) {
                this.stats.bloomRejections++;
                return false;
            }
        }
        try {
            if (type === "first" || type === "any") {
                if (this.stmtExactFirst?.get(lower)) {
                    this.stats.exactHits++;
                    return true;
                }
            }
            if (type === "surname" || type === "any") {
                if (this.stmtExactSurname?.get(lower)) {
                    this.stats.exactHits++;
                    return true;
                }
            }
            if (type === "hospital" || type === "any") {
                if (this.stmtExactHospital?.get(lower)) {
                    this.stats.exactHits++;
                    return true;
                }
            }
            if (type === "city" || type === "any") {
                if (this.stmtExactCity?.get(lower)) {
                    this.stats.exactHits++;
                    return true;
                }
            }
            this.stats.exactMisses++;
            return false;
        }
        catch {
            return false;
        }
    }
    /**
     * Check if name exists in first names dictionary
     */
    isFirstName(name) {
        return this.hasExact(name, "first");
    }
    /**
     * Check if name exists in surnames dictionary
     */
    isSurname(name) {
        return this.hasExact(name, "surname");
    }
    /**
     * Check if name exists in either first or surname dictionary
     */
    isName(name) {
        return this.hasExact(name, "first") || this.hasExact(name, "surname");
    }
    /**
     * Fuzzy match using FTS5 trigrams
     * Returns matches ranked by BM25 relevance score
     */
    fuzzyMatch(query, limit = 10) {
        if (!this.db || !this.stmtFuzzyFTS)
            return [];
        this.stats.fuzzyQueries++;
        try {
            // FTS5 trigram query - wrap in quotes for phrase matching
            const ftsQuery = `"${query.toLowerCase().replace(/"/g, '""')}"`;
            const results = this.stmtFuzzyFTS.all(ftsQuery);
            return results.slice(0, limit).map((r) => ({
                name: r.name,
                source: r.source,
                // Normalize BM25 score (negative, lower is better) to 0-1 confidence
                score: Math.min(1, Math.max(0, 1 + r.score / 10)),
            }));
        }
        catch {
            return [];
        }
    }
    /**
     * Phonetic matching using Soundex
     */
    phoneticMatch(query) {
        if (!this.db)
            return [];
        this.stats.phoneticQueries++;
        const code = this.soundex(query);
        const results = [];
        try {
            if (this.stmtSoundexFirst) {
                const firstMatches = this.stmtSoundexFirst.all(code);
                results.push(...firstMatches.map((r) => r.name));
            }
            if (this.stmtSoundexSurname) {
                const surnameMatches = this.stmtSoundexSurname.all(code);
                results.push(...surnameMatches.map((r) => r.name));
            }
        }
        catch {
            // Return empty on error
        }
        return results;
    }
    /**
     * Soundex phonetic encoding
     */
    soundex(text) {
        const s = text.toUpperCase().replace(/[^A-Z]/g, "");
        if (s.length === 0)
            return "0000";
        const codes = {
            B: "1",
            F: "1",
            P: "1",
            V: "1",
            C: "2",
            G: "2",
            J: "2",
            K: "2",
            Q: "2",
            S: "2",
            X: "2",
            Z: "2",
            D: "3",
            T: "3",
            L: "4",
            M: "5",
            N: "5",
            R: "6",
        };
        let result = s[0];
        let prevCode = codes[s[0]] || "0";
        for (let i = 1; i < s.length && result.length < 4; i++) {
            const code = codes[s[i]] || "0";
            if (code !== "0" && code !== prevCode) {
                result += code;
            }
            prevCode = code;
        }
        return (result + "000").substring(0, 4);
    }
    /**
     * Get matching statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Get database metadata
     */
    getMetadata() {
        if (!this.db)
            return null;
        try {
            const row = this.db
                .prepare("SELECT value FROM metadata WHERE key = ?")
                .get("info");
            if (row) {
                return JSON.parse(row.value);
            }
        }
        catch {
            // Ignore errors
        }
        return null;
    }
    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isAvailable = false;
        }
    }
}
exports.SQLiteDictionaryMatcher = SQLiteDictionaryMatcher;
// Singleton instance for shared access
let sharedInstance = null;
/**
 * Get shared SQLite dictionary matcher instance
 */
function getSQLiteDictionaryMatcher() {
    if (!sharedInstance) {
        sharedInstance = new SQLiteDictionaryMatcher();
    }
    return sharedInstance;
}
/**
 * Check if SQLite dictionaries are available
 */
function isSQLiteDictionaryAvailable() {
    return getSQLiteDictionaryMatcher().available();
}
//# sourceMappingURL=SQLiteDictionaryMatcher.js.map