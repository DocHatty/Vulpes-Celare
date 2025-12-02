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

export class HospitalDictionary {
  private static hospitals: Set<string> | null = null;
  private static hospitalPhrases: string[] | null = null;
  private static initialized: boolean = false;

  /**
   * Initialize the hospital dictionary from file
   */
  private static init(): void {
    if (this.initialized) return;

    try {
      const hospitalsPath = path.join(__dirname, "hospitals.txt");

      if (fs.existsSync(hospitalsPath)) {
        const content = fs.readFileSync(hospitalsPath, "utf-8");
        const entries = content
          .split("\n")
          .map((line) => line.trim().toLowerCase())
          .filter((line) => line.length > 0);

        this.hospitals = new Set(entries);
        // Keep array for multi-word phrase matching
        this.hospitalPhrases = entries.filter((e) => e.includes(" "));

      } else {
        console.warn(
          `[HospitalDictionary] Hospital file not found: ${hospitalsPath}`
        );
        this.hospitals = new Set();
        this.hospitalPhrases = [];
      }
    } catch (error) {
      console.error(`[HospitalDictionary] Error loading hospitals:`, error);
      this.hospitals = new Set();
      this.hospitalPhrases = [];
    }

    this.initialized = true;
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
   * @param text - The text to search
   * @returns Array of matches with position and matched text
   */
  static findHospitalsInText(
    text: string
  ): Array<{ text: string; start: number; end: number }> {
    if (!this.initialized) this.init();
    if (!this.hospitalPhrases || this.hospitalPhrases.length === 0) return [];

    const matches: Array<{ text: string; start: number; end: number }> = [];
    const lowerText = text.toLowerCase();

    // Search for multi-word hospital names
    for (const hospital of this.hospitalPhrases) {
      let searchStart = 0;
      let index: number;

      while ((index = lowerText.indexOf(hospital, searchStart)) !== -1) {
        // Verify word boundaries
        const charBefore = index > 0 ? lowerText[index - 1] : " ";
        const charAfter =
          index + hospital.length < lowerText.length
            ? lowerText[index + hospital.length]
            : " ";

        const isWordBoundaryBefore = /[\s.,;:\-\n\r(]/.test(charBefore);
        const isWordBoundaryAfter = /[\s.,;:\-\n\r)]/.test(charAfter);

        if (isWordBoundaryBefore && isWordBoundaryAfter) {
          // Get original case from text
          const originalText = text.substring(index, index + hospital.length);
          matches.push({
            text: originalText,
            start: index,
            end: index + hospital.length,
          });
        }

        searchStart = index + 1;
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
}
