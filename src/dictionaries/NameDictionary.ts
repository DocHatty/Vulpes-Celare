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

export class NameDictionary {
  private static firstNames: Set<string> | null = null;
  private static surnames: Set<string> | null = null;
  private static initialized = false;

  /**
   * Initialize dictionaries from files
   * Call once at app startup
   */
  static init(): void {
    if (this.initialized) return;

    try {
      const dictPath = path.join(__dirname);

      // Load first names (30K entries)
      const firstNamesPath = path.join(dictPath, "first-names.txt");
      if (fs.existsSync(firstNamesPath)) {
        const firstNamesContent = fs.readFileSync(firstNamesPath, "utf-8");
        this.firstNames = new Set(
          firstNamesContent
            .split("\n")
            .map((name) => name.trim().toLowerCase())
            .filter((name) => name.length > 0)
        );
      } else {
        console.warn(
          `[NameDictionary] First names file not found: ${firstNamesPath}`
        );
        this.firstNames = new Set();
      }

      // Load surnames (162K entries)
      const surnamesPath = path.join(dictPath, "surnames.txt");
      if (fs.existsSync(surnamesPath)) {
        const surnamesContent = fs.readFileSync(surnamesPath, "utf-8");
        this.surnames = new Set(
          surnamesContent
            .split("\n")
            .map((name) => name.trim().toLowerCase())
            .filter((name) => name.length > 0)
        );
        this.surnames = new Set();
      }

      this.initialized = true;
    } catch (error) {
      console.error("[NameDictionary] Failed to load dictionaries:", error);
      this.firstNames = new Set();
      this.surnames = new Set();
      this.initialized = true;
    }
  }

  /**
   * Check if a word is a known first name
   */
  static isFirstName(word: string): boolean {
    if (!this.initialized) this.init();
    if (!this.firstNames) return false;
    return this.firstNames.has(word.toLowerCase().trim());
  }

  /**
   * Check if a word is a known surname
   */
  static isSurname(word: string): boolean {
    if (!this.initialized) this.init();
    if (!this.surnames) return false;
    return this.surnames.has(word.toLowerCase().trim());
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
