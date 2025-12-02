/**
 * CityDictionary - US City Name Lookup Service
 *
 * Provides O(1) lookup for 999 US city names.
 * Used to detect geographic PHI that could identify patient location.
 *
 * Note: Cities are only considered PHI when combined with other
 * location data (street address, zip code) that could narrow down
 * to populations under 20,000 per HIPAA Safe Harbor.
 *
 * @module redaction/dictionaries
 */

import * as fs from "fs";
import * as path from "path";

export class CityDictionary {
  private static cities: Set<string> | null = null;
  private static cityList: string[] | null = null;
  private static initialized: boolean = false;

  /**
   * Initialize the city dictionary from file
   */
  private static init(): void {
    if (this.initialized) return;

    try {
      const citiesPath = path.join(__dirname, "cities.txt");

      if (fs.existsSync(citiesPath)) {
        const content = fs.readFileSync(citiesPath, "utf-8");
        const entries = content
          .split("\n")
          .map((line) => line.trim().toLowerCase())
          .filter((line) => line.length > 0);

        this.cities = new Set(entries);
        this.cityList = entries;

        // console.log(`[CityDictionary] Loaded ${this.cities.size} city names`);
      } else {
        console.warn(`[CityDictionary] Cities file not found: ${citiesPath}`);
        this.cities = new Set();
        this.cityList = [];
      }
    } catch (error) {
      console.error(`[CityDictionary] Error loading cities:`, error);
      this.cities = new Set();
      this.cityList = [];
    }

    this.initialized = true;
  }

  /**
   * Check if a word is a known US city
   * @param word - The word to check (case-insensitive)
   * @returns true if the word matches a city name
   */
  static isCity(word: string): boolean {
    if (!this.initialized) this.init();
    if (!this.cities) return false;

    const normalized = word.toLowerCase().trim();
    return this.cities.has(normalized);
  }

  /**
   * Find all city names in a text
   * @param text - The text to search
   * @returns Array of matches with position and matched text
   */
  static findCitiesInText(
    text: string
  ): Array<{ text: string; start: number; end: number }> {
    if (!this.initialized) this.init();
    if (!this.cityList || this.cityList.length === 0) return [];

    const matches: Array<{ text: string; start: number; end: number }> = [];
    const lowerText = text.toLowerCase();

    // Search for city names (both single and multi-word)
    for (const city of this.cityList) {
      let searchStart = 0;
      let index: number;

      while ((index = lowerText.indexOf(city, searchStart)) !== -1) {
        // Verify word boundaries
        const charBefore = index > 0 ? lowerText[index - 1] : " ";
        const charAfter =
          index + city.length < lowerText.length
            ? lowerText[index + city.length]
            : " ";

        const isWordBoundaryBefore = /[\s.,;:\-\n\r(]/.test(charBefore);
        const isWordBoundaryAfter = /[\s.,;:\-\n\r)]/.test(charAfter);

        if (isWordBoundaryBefore && isWordBoundaryAfter) {
          // Get original case from text
          const originalText = text.substring(index, index + city.length);
          matches.push({
            text: originalText,
            start: index,
            end: index + city.length,
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
        // Prefer longer match (e.g., "San Francisco" over "San")
        nonOverlapping[nonOverlapping.length - 1] = match;
      }
    }

    return nonOverlapping;
  }

  /**
   * Check if text contains a city name in address context
   * (more reliable than standalone city detection)
   * @param text - The text to check
   * @returns true if a city appears in address-like context
   */
  static hasCityInAddressContext(text: string): boolean {
    if (!this.initialized) this.init();
    if (!this.cities) return false;

    const lowerText = text.toLowerCase();

    // Look for patterns like "City, ST" or "City, State"
    const addressPattern =
      /\b([a-z\s]+),\s*([a-z]{2})\b|\b([a-z\s]+),\s*(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/gi;

    let match;
    while ((match = addressPattern.exec(lowerText)) !== null) {
      const cityCandidate = (match[1] || match[3])?.trim();
      if (cityCandidate && this.cities.has(cityCandidate)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get total count of cities in dictionary
   */
  static getCount(): number {
    if (!this.initialized) this.init();
    return this.cities?.size || 0;
  }

  /**
   * Check if text looks like it contains geographic information
   * (faster pre-filter before full dictionary search)
   */
  static hasGeographicContext(text: string): boolean {
    const keywords = [
      "address",
      "located",
      "resident",
      "lives in",
      "from",
      "city",
      "state",
      "street",
      "avenue",
      "blvd",
      "drive",
      "road",
      "zip",
    ];
    const lowerText = text.toLowerCase();
    return keywords.some((kw) => lowerText.includes(kw));
  }
}
