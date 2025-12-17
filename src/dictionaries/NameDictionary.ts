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

import * as fs from "fs";
import * as path from "path";
import { RadiologyLogger } from "../utils/RadiologyLogger";
import { PhoneticMatcher, PhoneticMatch } from "../utils/PhoneticMatcher";
import {
  SQLiteDictionaryMatcher,
  getSQLiteDictionaryMatcher,
} from "./SQLiteDictionaryMatcher";

/**
 * Dictionary initialization error - thrown when dictionaries cannot be loaded
 */
export class DictionaryInitError extends Error {
  constructor(
    message: string,
    public readonly dictionaryType: "firstNames" | "surnames" | "both",
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "DictionaryInitError";
  }
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

export class NameDictionary {
  private static firstNames: Set<string> | null = null;
  private static surnames: Set<string> | null = null;
  private static initialized = false;
  private static initErrors: string[] = [];
  private static phoneticMatcher: PhoneticMatcher | null = null;
  private static phoneticInitialized = false;
  private static cachedNameLists: {
    firstNames: string[];
    surnames: string[];
  } | null = null;

  // SQLite backend (preferred when available)
  private static sqliteMatcher: SQLiteDictionaryMatcher | null = null;
  private static usingSQLite = false;

  private static isSQLiteEnabled(): boolean {
    // SQLite dictionary is enabled by default. Set VULPES_USE_SQLITE_DICT=0 to disable.
    return process.env.VULPES_USE_SQLITE_DICT !== "0";
  }

  private static isPhoneticEnabled(): boolean {
    // Rust phonetic matching is now DEFAULT (promoted from opt-in).
    // Set VULPES_ENABLE_PHONETIC=0 to disable.
    const val = process.env.VULPES_ENABLE_PHONETIC;
    return val === undefined || val === "1";
  }

  private static getPhoneticThreshold(): number {
    const raw = process.env.VULPES_PHONETIC_THRESHOLD;
    const parsed = raw ? Number(raw) : Number.NaN;
    if (!Number.isFinite(parsed)) return 0.95;
    return Math.min(1, Math.max(0, parsed));
  }

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
  static init(options: { throwOnError?: boolean } = {}): void {
    if (this.initialized) return;

    const { throwOnError = false } = options;
    this.initErrors = [];

    // Try SQLite backend first (preferred for memory efficiency)
    if (this.isSQLiteEnabled()) {
      try {
        this.sqliteMatcher = getSQLiteDictionaryMatcher();
        if (this.sqliteMatcher.available()) {
          this.usingSQLite = true;
          const metadata = this.sqliteMatcher.getMetadata();
          RadiologyLogger.info(
            "DICTIONARY",
            `Using SQLite dictionary backend (${metadata?.total_entries || "?"} entries, 96% less memory)`,
          );
          this.initialized = true;

          // Still initialize phonetic matcher if enabled
          if (this.isPhoneticEnabled()) {
            this.initPhoneticMatcherFromSQLite();
          }
          return;
        }
      } catch (error) {
        RadiologyLogger.warn(
          "DICTIONARY",
          `SQLite backend unavailable, falling back to in-memory: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Fall back to in-memory dictionaries
    const dictPath = path.join(__dirname);

    // Load first names (30K entries)
    const firstNamesPath = path.join(dictPath, "first-names.txt");
    try {
      if (fs.existsSync(firstNamesPath)) {
        const firstNamesContent = fs.readFileSync(firstNamesPath, "utf-8");
        this.firstNames = new Set(
          firstNamesContent
            .split("\n")
            .map((name) => name.trim().toLowerCase())
            .filter((name) => name.length > 0),
        );
        RadiologyLogger.info(
          "DICTIONARY",
          `Loaded ${this.firstNames.size} first names`,
        );
      } else {
        const errorMsg = `First names dictionary not found: ${firstNamesPath}`;
        this.initErrors.push(errorMsg);
        RadiologyLogger.warn("DICTIONARY", errorMsg);
        this.firstNames = new Set();

        if (throwOnError) {
          throw new DictionaryInitError(errorMsg, "firstNames");
        }
      }
    } catch (error) {
      if (error instanceof DictionaryInitError) throw error;

      const errorMsg = `Failed to load first names dictionary: ${error instanceof Error ? error.message : String(error)}`;
      this.initErrors.push(errorMsg);
      RadiologyLogger.error("DICTIONARY", errorMsg);
      this.firstNames = new Set();

      if (throwOnError) {
        throw new DictionaryInitError(
          errorMsg,
          "firstNames",
          error instanceof Error ? error : undefined,
        );
      }
    }

    // Load surnames (162K entries)
    const surnamesPath = path.join(dictPath, "surnames.txt");
    try {
      if (fs.existsSync(surnamesPath)) {
        const surnamesContent = fs.readFileSync(surnamesPath, "utf-8");
        this.surnames = new Set(
          surnamesContent
            .split("\n")
            .map((name) => name.trim().toLowerCase())
            .filter((name) => name.length > 0),
        );
        RadiologyLogger.info(
          "DICTIONARY",
          `Loaded ${this.surnames.size} surnames`,
        );
      } else {
        const errorMsg = `Surnames dictionary not found: ${surnamesPath}`;
        this.initErrors.push(errorMsg);
        RadiologyLogger.warn("DICTIONARY", errorMsg);
        this.surnames = new Set();

        if (throwOnError) {
          throw new DictionaryInitError(errorMsg, "surnames");
        }
      }
    } catch (error) {
      if (error instanceof DictionaryInitError) throw error;

      const errorMsg = `Failed to load surnames dictionary: ${error instanceof Error ? error.message : String(error)}`;
      this.initErrors.push(errorMsg);
      RadiologyLogger.error("DICTIONARY", errorMsg);
      this.surnames = new Set();

      if (throwOnError) {
        throw new DictionaryInitError(
          errorMsg,
          "surnames",
          error instanceof Error ? error : undefined,
        );
      }
    }

    this.initialized = true;

    // Phonetic matching is optional (it can shift sensitivity/specificity tradeoffs).
    // Enable via `VULPES_ENABLE_PHONETIC=1` when experimenting/tuning.
    if (this.isPhoneticEnabled()) {
      this.initPhoneticMatcher();
    }

    // Log overall status
    if (this.initErrors.length > 0) {
      RadiologyLogger.warn(
        "DICTIONARY",
        `NameDictionary initialized with ${this.initErrors.length} error(s). Name validation may be degraded.`,
      );
    }
  }

  /**
   * Initialize the phonetic matcher for fuzzy name matching
   * This enables detection of OCR-corrupted names like "PENEL0PE" -> "PENELOPE"
   */
  private static initPhoneticMatcher(): void {
    if (this.phoneticInitialized) return;

    try {
      const firstNamesArray = this.firstNames
        ? Array.from(this.firstNames)
        : [];
      const surnamesArray = this.surnames ? Array.from(this.surnames) : [];

      if (firstNamesArray.length > 0 || surnamesArray.length > 0) {
        this.phoneticMatcher = new PhoneticMatcher();
        this.phoneticMatcher.initialize(firstNamesArray, surnamesArray);
        this.phoneticInitialized = true;
        if (this.isPhoneticEnabled()) {
          RadiologyLogger.info(
            "DICTIONARY",
            `PhoneticMatcher initialized for fuzzy name matching`,
          );
        }
      }
    } catch (error) {
      RadiologyLogger.warn(
        "DICTIONARY",
        `Failed to initialize PhoneticMatcher: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Initialize phonetic matcher when using SQLite backend
   * Uses SQLite's phonetic matching capabilities when possible
   */
  private static initPhoneticMatcherFromSQLite(): void {
    if (this.phoneticInitialized) return;

    // For now, we'll use SQLite's built-in soundex for phonetic matching
    // The SQLiteDictionaryMatcher has phoneticMatch() method
    // We skip loading PhoneticMatcher to save memory
    this.phoneticInitialized = true;
    RadiologyLogger.info(
      "DICTIONARY",
      `Using SQLite phonetic matching (soundex-indexed)`,
    );
  }

  /**
   * Get initialization status
   */
  static getStatus(): DictionaryStatus & { usingSQLite?: boolean } {
    if (this.usingSQLite && this.sqliteMatcher) {
      const metadata = this.sqliteMatcher.getMetadata() as {
        first_names_count?: number;
        surnames_count?: number;
      } | null;
      return {
        initialized: this.initialized,
        firstNamesLoaded: true,
        surnamesLoaded: true,
        firstNamesCount: metadata?.first_names_count || 0,
        surnamesCount: metadata?.surnames_count || 0,
        errors: [...this.initErrors],
        usingSQLite: true,
      };
    }

    return {
      initialized: this.initialized,
      firstNamesLoaded: this.firstNames !== null && this.firstNames.size > 0,
      surnamesLoaded: this.surnames !== null && this.surnames.size > 0,
      firstNamesCount: this.firstNames?.size || 0,
      surnamesCount: this.surnames?.size || 0,
      errors: [...this.initErrors],
      usingSQLite: false,
    };
  }

  /**
   * Check if dictionaries are properly loaded
   */
  static isHealthy(): boolean {
    if (!this.initialized) return false;
    return (this.firstNames?.size || 0) > 0 && (this.surnames?.size || 0) > 0;
  }

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
  private static normalizeOCR(text: string): string {
    return (
      text
        .replace(/@/g, "a")
        .replace(/0/g, "o")
        .replace(/1/g, "l")
        .replace(/3/g, "e")
        .replace(/\$/g, "s")
        .replace(/8/g, "b")
        .replace(/9/g, "g")
        .replace(/5/g, "s")
        .replace(/\|/g, "l")
        .replace(/I/g, "l")
        // Only replace 'c' with 'e' if it makes sense?
        // For now, simple replacement as we are validating against a dictionary.
        // If "Brcnda" becomes "Brenda" (valid), good.
        // If "Cat" becomes "Eat" (not a name), it won't match anyway.
        .replace(/c/g, "e")
    );
  }

  private static deduplicate(text: string): string {
    return text.replace(/(.)\1+/g, "$1");
  }

  /**
   * Calculate Levenshtein edit distance between two strings
   */
  private static levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Check if a word is a known first name
   * Uses exact match, OCR normalization, deduplication, and phonetic matching
   */
  static isFirstName(name: string): boolean {
    if (!this.initialized) this.init();
    if (!name) return false;

    const lower = name.toLowerCase().trim();

    // Use SQLite backend if available
    if (this.usingSQLite && this.sqliteMatcher) {
      if (this.sqliteMatcher.hasExact(lower, "first")) return true;

      // Try OCR normalization
      const normalized = this.normalizeOCR(lower);
      if (
        normalized !== lower &&
        this.sqliteMatcher.hasExact(normalized, "first")
      )
        return true;

      // Try deduplication
      const deduplicated = this.deduplicate(normalized);
      if (
        deduplicated !== normalized &&
        this.sqliteMatcher.hasExact(deduplicated, "first")
      )
        return true;

      // Phonetic matching via SQLite soundex - require close edit distance
      if (this.isPhoneticEnabled()) {
        const phoneticMatches = this.sqliteMatcher.phoneticMatch(lower);
        // Only accept phonetic match if edit distance is small (typo-level)
        for (const match of phoneticMatches) {
          if (this.levenshteinDistance(lower, match) <= 2) {
            return true;
          }
        }
      }

      return false;
    }

    // Fall back to in-memory Set
    if (!this.firstNames) return false;

    if (this.firstNames.has(lower)) return true;

    // Try OCR normalization
    const normalized = this.normalizeOCR(lower);
    if (normalized !== lower && this.firstNames.has(normalized)) return true;

    // Try deduplication (handle T@yyl0r -> Taylor, WiIlliam -> William)
    const deduplicated = this.deduplicate(normalized);
    if (deduplicated !== normalized && this.firstNames.has(deduplicated))
      return true;

    // Optional: phonetic match for OCR-corrupted names (Rust-accelerated when native is available).
    // Kept opt-in because it can shift sensitivity/specificity tradeoffs on some corpora.
    if (this.isPhoneticEnabled()) {
      if (!this.phoneticInitialized) this.initPhoneticMatcher();
      if (this.phoneticMatcher && this.phoneticInitialized) {
        const phoneticMatch = this.phoneticMatcher.matchFirstName(name);
        if (
          phoneticMatch &&
          phoneticMatch.confidence >= this.getPhoneticThreshold()
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a word is a known surname
   * Uses exact match, OCR normalization, deduplication, and phonetic matching
   */
  static isSurname(name: string): boolean {
    if (!this.initialized) this.init();
    if (!name) return false;

    const lower = name.toLowerCase().trim();

    // Use SQLite backend if available
    if (this.usingSQLite && this.sqliteMatcher) {
      if (this.sqliteMatcher.hasExact(lower, "surname")) return true;

      // Try OCR normalization
      const normalized = this.normalizeOCR(lower);
      if (
        normalized !== lower &&
        this.sqliteMatcher.hasExact(normalized, "surname")
      )
        return true;

      // Try deduplication
      const deduplicated = this.deduplicate(normalized);
      if (
        deduplicated !== normalized &&
        this.sqliteMatcher.hasExact(deduplicated, "surname")
      )
        return true;

      // Phonetic matching via SQLite soundex - require close edit distance
      if (this.isPhoneticEnabled()) {
        const phoneticMatches = this.sqliteMatcher.phoneticMatch(lower);
        // Only accept phonetic match if edit distance is small (typo-level)
        for (const match of phoneticMatches) {
          if (this.levenshteinDistance(lower, match) <= 2) {
            return true;
          }
        }
      }

      return false;
    }

    // Fall back to in-memory Set
    if (!this.surnames) return false;

    if (this.surnames.has(lower)) return true;

    // Try OCR normalization
    const normalized = this.normalizeOCR(lower);
    if (normalized !== lower && this.surnames.has(normalized)) return true;

    // Try deduplication
    const deduplicated = this.deduplicate(normalized);
    if (deduplicated !== normalized && this.surnames.has(deduplicated))
      return true;

    if (this.isPhoneticEnabled()) {
      if (!this.phoneticInitialized) this.initPhoneticMatcher();
      if (this.phoneticMatcher && this.phoneticInitialized) {
        const phoneticMatch = this.phoneticMatcher.matchSurname(name);
        if (
          phoneticMatch &&
          phoneticMatch.confidence >= this.getPhoneticThreshold()
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get phonetic match details for a name (for debugging/logging)
   */
  static getPhoneticMatch(name: string): PhoneticMatch | null {
    if (!this.isPhoneticEnabled()) return null;
    if (!this.phoneticInitialized) this.initPhoneticMatcher();
    if (!this.phoneticMatcher || !this.phoneticInitialized) return null;
    return this.phoneticMatcher.matchAnyName(name);
  }

  /**
   * Check if a two-word phrase is likely a real name
   * Returns confidence score 0.0 - 1.0
   *
   * "John Smith" → first name + surname → 1.0
   * "John Williams" → first name + surname → 1.0
   * "Timeline Narrative" → not first name → 0.0
   * "Rodriguez Garcia" → surname + surname → 0.5 (could be Hispanic name)
   */
  static getNameConfidence(phrase: string): number {
    if (!this.initialized) this.init();

    const words = phrase.trim().split(/\s+/);
    if (words.length < 2) return 0.0;

    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    const isFirstNameValid = this.isFirstName(firstWord);
    const isLastNameValid = this.isSurname(lastWord);

    // Both match → high confidence
    if (isFirstNameValid && isLastNameValid) {
      return 1.0;
    }

    // First name matches, last name doesn't → medium confidence
    // (could be unusual/foreign surname)
    if (isFirstNameValid && !isLastNameValid) {
      return 0.7;
    }

    // First name doesn't match, last name does → low confidence
    // (could be "Dr. Smith" pattern without the "Dr.")
    if (!isFirstNameValid && isLastNameValid) {
      // Check if first word could be a surname (Hispanic double surname)
      if (this.isSurname(firstWord)) {
        return 0.5;
      }
      return 0.2;
    }

    // Neither match → very low confidence
    // This catches "Timeline Narrative", "Physical Therapy", etc.
    return 0.0;
  }

  /**
   * Quick check: Is this phrase likely a real name?
   * Uses threshold of 0.5
   */
  static isLikelyRealName(phrase: string): boolean {
    return this.getNameConfidence(phrase) >= 0.5;
  }

  /**
   * Get dictionary stats
   */
  static getStats(): { firstNames: number; surnames: number } {
    if (!this.initialized) this.init();
    return {
      firstNames: this.firstNames?.size || 0,
      surnames: this.surnames?.size || 0,
    };
  }

  /**
   * Returns the loaded name dictionaries as arrays (lowercased).
   * Intended for initializing native/Rust accelerators.
   */
  static getNameLists(): { firstNames: string[]; surnames: string[] } {
    if (!this.initialized) this.init();

    if (this.cachedNameLists) return this.cachedNameLists;

    const firstNames = this.firstNames ? Array.from(this.firstNames) : [];
    const surnames = this.surnames ? Array.from(this.surnames) : [];
    this.cachedNameLists = { firstNames, surnames };
    return this.cachedNameLists;
  }
}
