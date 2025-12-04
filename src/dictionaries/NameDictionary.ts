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

import * as fs from "fs";
import * as path from "path";
import { RadiologyLogger } from "../utils/RadiologyLogger";

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

  /**
   * Initialize dictionaries from files
   * Call once at app startup
   *
   * @throws {DictionaryInitError} If dictionaries cannot be loaded and throwOnError is true
   */
  static init(options: { throwOnError?: boolean } = {}): void {
    if (this.initialized) return;

    const { throwOnError = false } = options;
    this.initErrors = [];

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

    // Log overall status
    if (this.initErrors.length > 0) {
      RadiologyLogger.warn(
        "DICTIONARY",
        `NameDictionary initialized with ${this.initErrors.length} error(s). Name validation may be degraded.`,
      );
    }
  }

  /**
   * Get initialization status
   */
  static getStatus(): DictionaryStatus {
    return {
      initialized: this.initialized,
      firstNamesLoaded: this.firstNames !== null && this.firstNames.size > 0,
      surnamesLoaded: this.surnames !== null && this.surnames.size > 0,
      firstNamesCount: this.firstNames?.size || 0,
      surnamesCount: this.surnames?.size || 0,
      errors: [...this.initErrors],
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
   * Check if a word is a known first name
   */
  static isFirstName(name: string): boolean {
    if (!this.initialized) this.init();
    if (!this.firstNames) return false;
    if (!name) return false;

    const lower = name.toLowerCase().trim();
    if (this.firstNames.has(lower)) return true;

    // Try OCR normalization
    const normalized = this.normalizeOCR(lower);
    if (normalized !== lower && this.firstNames.has(normalized)) return true;

    // Try deduplication (handle T@yyl0r -> Taylor, WiIlliam -> William)
    const deduplicated = this.deduplicate(normalized);
    if (deduplicated !== normalized && this.firstNames.has(deduplicated))
      return true;

    return false;
  }

  /**
   * Check if a word is a known surname
   */
  static isSurname(name: string): boolean {
    if (!this.initialized) this.init();
    if (!this.surnames) return false;
    if (!name) return false;

    const lower = name.toLowerCase().trim();
    if (this.surnames.has(lower)) return true;

    // Try OCR normalization
    const normalized = this.normalizeOCR(lower);
    if (normalized !== lower && this.surnames.has(normalized)) return true;

    // Try deduplication
    const deduplicated = this.deduplicate(normalized);
    if (deduplicated !== normalized && this.surnames.has(deduplicated))
      return true;

    return false;
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
}
