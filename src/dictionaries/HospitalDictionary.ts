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

import * as fs from "fs";
import * as path from "path";
import { RadiologyLogger } from "../utils/RadiologyLogger";
import { AhoCorasick, createAhoCorasick } from "../utils/AhoCorasick";

/**
 * Hospital dictionary initialization error
 */
export class HospitalDictionaryInitError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "HospitalDictionaryInitError";
  }
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

export class HospitalDictionary {
  private static hospitals: Set<string> | null = null;
  private static hospitalPhrases: string[] | null = null;
  private static initialized: boolean = false;
  private static initError: string | null = null;
  // Aho-Corasick automaton for O(n) multi-pattern matching
  private static ahoCorasick: AhoCorasick | null = null;

  /**
   * Initialize the hospital dictionary from file
   *
   * @throws {HospitalDictionaryInitError} If throwOnError is true and loading fails
   */
  private static init(options: { throwOnError?: boolean } = {}): void {
    if (this.initialized) return;

    const { throwOnError = false } = options;
    this.initError = null;

    const hospitalsPath = path.join(__dirname, "hospitals.txt");

    try {
      if (fs.existsSync(hospitalsPath)) {
        const content = fs.readFileSync(hospitalsPath, "utf-8");
        const entries = content
          .split("\n")
          .map((line) => line.trim().toLowerCase())
          .filter((line) => line.length > 0);

        this.hospitals = new Set(entries);
        // Keep array for multi-word phrase matching
        this.hospitalPhrases = entries.filter((e) => e.includes(" "));

        // Build Aho-Corasick automaton for O(n) multi-pattern search
        // This replaces O(n × m) linear scanning
        this.ahoCorasick = createAhoCorasick(this.hospitalPhrases);

        RadiologyLogger.info(
          "DICTIONARY",
          `Loaded ${this.hospitals.size} hospitals (${this.hospitalPhrases.length} phrases, Aho-Corasick built)`,
        );
      } else {
        const errorMsg = `Hospital dictionary not found: ${hospitalsPath}`;
        this.initError = errorMsg;
        RadiologyLogger.warn("DICTIONARY", errorMsg);
        this.hospitals = new Set();
        this.hospitalPhrases = [];

        if (throwOnError) {
          throw new HospitalDictionaryInitError(errorMsg);
        }
      }
    } catch (error) {
      if (error instanceof HospitalDictionaryInitError) throw error;

      const errorMsg = `Failed to load hospital dictionary: ${error instanceof Error ? error.message : String(error)}`;
      this.initError = errorMsg;
      RadiologyLogger.error("DICTIONARY", errorMsg);
      this.hospitals = new Set();
      this.hospitalPhrases = [];

      if (throwOnError) {
        throw new HospitalDictionaryInitError(
          errorMsg,
          error instanceof Error ? error : undefined,
        );
      }
    }

    this.initialized = true;

    if (this.initError) {
      RadiologyLogger.warn(
        "DICTIONARY",
        "HospitalDictionary initialized with errors. Hospital name detection may be degraded.",
      );
    }
  }

  /**
   * Get initialization status
   */
  static getStatus(): HospitalDictionaryStatus {
    return {
      initialized: this.initialized,
      hospitalsLoaded: this.hospitals !== null && this.hospitals.size > 0,
      hospitalCount: this.hospitals?.size || 0,
      phraseCount: this.hospitalPhrases?.length || 0,
      error: this.initError,
    };
  }

  /**
   * Check if dictionary is properly loaded
   */
  static isHealthy(): boolean {
    if (!this.initialized) this.init();
    return (this.hospitals?.size || 0) > 0;
  }

  /**
   * Force initialization with error throwing (for tests/startup validation)
   */
  static initStrict(): void {
    this.init({ throwOnError: true });
  }

  /**
   * Check if a phrase is a known hospital name
   * @param phrase - The phrase to check (case-insensitive)
   * @returns true if the phrase matches a hospital name
   */
  static isHospital(phrase: string): boolean {
    if (!this.initialized) this.init();
    if (!this.hospitals) return false;

    const normalized = phrase.toLowerCase().trim();
    return this.hospitals.has(normalized);
  }

  /**
   * Find all hospital names in a text
   * Uses Aho-Corasick algorithm for O(n + m + z) performance
   * (n = text length, m = total pattern length, z = matches)
   * This is ~50-100x faster than the previous O(n × m) approach
   *
   * @param text - The text to search
   * @returns Array of matches with position and matched text
   */
  static findHospitalsInText(
    text: string,
  ): Array<{ text: string; start: number; end: number }> {
    if (!this.initialized) this.init();
    if (!this.ahoCorasick) return [];

    // Use Aho-Corasick for O(n) scanning instead of O(n × m) loop
    const acMatches = this.ahoCorasick.search(text);
    
    // Convert to result format and verify word boundaries
    const matches: Array<{ text: string; start: number; end: number }> = [];
    const lowerText = text.toLowerCase();
    
    for (const acMatch of acMatches) {
      // Verify word boundaries
      const charBefore = acMatch.start > 0 ? lowerText[acMatch.start - 1] : " ";
      const charAfter =
        acMatch.end < lowerText.length ? lowerText[acMatch.end] : " ";

      const isWordBoundaryBefore = /[\s.,;:\-\n\r(]/.test(charBefore);
      const isWordBoundaryAfter = /[\s.,;:\-\n\r)]/.test(charAfter);

      if (isWordBoundaryBefore && isWordBoundaryAfter) {
        // Get original case from text
        const originalText = text.substring(acMatch.start, acMatch.end);
        matches.push({
          text: originalText,
          start: acMatch.start,
          end: acMatch.end,
        });
      }
    }

    // Sort by position and remove overlaps
    matches.sort((a, b) => a.start - b.start);
    const nonOverlapping: Array<{
      text: string;
      start: number;
      end: number;
    }> = [];

    for (const match of matches) {
      const lastMatch = nonOverlapping[nonOverlapping.length - 1];
      if (!lastMatch || match.start >= lastMatch.end) {
        nonOverlapping.push(match);
      } else if (match.text.length > lastMatch.text.length) {
        // Prefer longer match
        nonOverlapping[nonOverlapping.length - 1] = match;
      }
    }

    return nonOverlapping;
  }

  /**
   * Get total count of hospitals in dictionary
   */
  static getCount(): number {
    if (!this.initialized) this.init();
    return this.hospitals?.size || 0;
  }

  /**
   * Check if a text contains any hospital-related keywords
   * (faster pre-filter before full dictionary search)
   */
  static hasHospitalKeywords(text: string): boolean {
    const keywords = [
      "hospital",
      "medical center",
      "health center",
      "healthcare",
      "health care",
      "clinic",
      "infirmary",
      "memorial",
      "regional",
      "community",
      "general",
    ];
    const lowerText = text.toLowerCase();
    return keywords.some((kw) => lowerText.includes(kw));
  }

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
  static isPartOfHospitalName(potentialName: string, context: string): boolean {
    if (!this.initialized) this.init();

    // Quick check: does context contain hospital keywords?
    if (!this.hasHospitalKeywords(context)) {
      return false;
    }

    // Find all hospital names in the context
    const hospitalMatches = this.findHospitalsInText(context);
    if (hospitalMatches.length === 0) {
      return false;
    }

    // Check if the potential name appears within any hospital name
    const potentialLower = potentialName.toLowerCase().trim();
    for (const match of hospitalMatches) {
      const hospitalLower = match.text.toLowerCase();
      if (hospitalLower.includes(potentialLower)) {
        return true; // This "name" is part of a hospital name - WHITELIST it
      }
    }

    return false;
  }
}
