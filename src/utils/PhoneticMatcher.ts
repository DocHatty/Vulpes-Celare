/**
 * PhoneticMatcher - Double Metaphone based name matching for OCR-corrupted text
 *
 * This module provides phonetic matching capabilities to detect names even when
 * they contain OCR errors like digit-for-letter substitutions (0→O, 1→L, 8→U).
 *
 * Key insight: Phonetic algorithms encode by SOUND, not spelling, so:
 * - "PENELOPE" and "PENEL0PE" encode to the same phonetic code
 * - "LAURENT" and "LA8RENT" encode similarly
 *
 * @module utils
 */

import { doubleMetaphone } from "double-metaphone";
import { closest, distance } from "fastest-levenshtein";
import { loadNativeBinding } from "../native/binding";

/**
 * Pre-computed phonetic index for fast lookup
 */
interface PhoneticIndex {
  primary: Map<string, Set<string>>; // primary code -> set of names
  secondary: Map<string, Set<string>>; // secondary code -> set of names
  names: Set<string>; // all indexed names (lowercase)
}

/**
 * Match result with confidence scoring
 */
export interface PhoneticMatch {
  original: string; // The OCR-corrupted input
  matched: string; // The dictionary match found
  confidence: number; // 0-1 confidence score
  matchType:
    | "exact"
    | "phonetic_primary"
    | "phonetic_secondary"
    | "levenshtein";
}

/**
 * OCR character substitution map for pre-normalization
 */
const OCR_SUBSTITUTIONS: Record<string, string> = {
  "0": "o",
  "1": "l",
  "|": "l",
  "!": "i",
  "@": "a",
  $: "s",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
};

export class PhoneticMatcher {
  private firstNameIndex: PhoneticIndex;
  private surnameIndex: PhoneticIndex;
  private initialized: boolean = false;
  private nativeMatcher:
    | null
    | (new () => {
        initialize(firstNames: string[], surnames: string[]): void;
        matchFirstName(input: string): PhoneticMatch | null;
        matchSurname(input: string): PhoneticMatch | null;
        matchAnyName(input: string): PhoneticMatch | null;
        isInitialized(): boolean;
        getStats(): {
          firstNames: number;
          surnames: number;
          primaryCodes: number;
          secondaryCodes: number;
        };
      }) = null;
  private nativeInstance: any = null;

  // Configuration
  private readonly MAX_LEVENSHTEIN_DISTANCE = 2;
  private readonly MIN_NAME_LENGTH = 2;

  constructor() {
    this.firstNameIndex = this.createEmptyIndex();
    this.surnameIndex = this.createEmptyIndex();

    // Prefer the Rust-native phonetic matcher when available (much faster and avoids JS heavy deps).
    // Falls back to the JS implementation for environments without the native binding.
    try {
      const binding = loadNativeBinding({ configureOrt: false });
      if (binding.VulpesPhoneticMatcher) {
        this.nativeMatcher = binding.VulpesPhoneticMatcher as any;
        this.nativeInstance = new (binding.VulpesPhoneticMatcher as any)();
      }
    } catch {
      this.nativeMatcher = null;
      this.nativeInstance = null;
    }
  }

  /**
   * Create an empty phonetic index
   */
  private createEmptyIndex(): PhoneticIndex {
    return {
      primary: new Map(),
      secondary: new Map(),
      names: new Set(),
    };
  }

  /**
   * Initialize the matcher with name dictionaries
   * Call this once at startup with your name lists
   */
  initialize(firstNames: string[], surnames: string[]): void {
    const startTime = Date.now();

    if (this.nativeInstance) {
      this.nativeInstance.initialize(firstNames, surnames);
      this.initialized = true;

      const elapsed = Date.now() - startTime;

      if (
        !process.env.VULPES_QUIET &&
        !process.argv.includes("--quiet") &&
        !process.argv.includes("-q")
      ) {
        const stats = this.nativeInstance.getStats?.();
        console.log(
          `[PhoneticMatcher] (native) Indexed ${stats?.firstNames ?? firstNames.length} first names and ${stats?.surnames ?? surnames.length} surnames in ${elapsed}ms`,
        );
      }
      return;
    }

    this.firstNameIndex = this.buildIndex(firstNames);
    this.surnameIndex = this.buildIndex(surnames);
    this.initialized = true;

    const elapsed = Date.now() - startTime;

    // Only log if not in quiet mode
    if (
      !process.env.VULPES_QUIET &&
      !process.argv.includes("--quiet") &&
      !process.argv.includes("-q")
    ) {
      console.log(
        `[PhoneticMatcher] Indexing ${firstNames.length} first names and ${surnames.length} surnames...`,
      );
      console.log(`[PhoneticMatcher] Indexing complete in ${elapsed}ms`);
      console.log(
        `[PhoneticMatcher] First names: ${this.firstNameIndex.primary.size} primary codes, ${this.firstNameIndex.secondary.size} secondary codes`,
      );
      console.log(
        `[PhoneticMatcher] Surnames: ${this.surnameIndex.primary.size} primary codes, ${this.surnameIndex.secondary.size} secondary codes`,
      );
    }
  }

  /**
   * Build a phonetic index from a list of names
   */
  private buildIndex(names: string[]): PhoneticIndex {
    const index = this.createEmptyIndex();

    for (const name of names) {
      const normalized = name.toLowerCase().trim();
      if (normalized.length < this.MIN_NAME_LENGTH) continue;

      index.names.add(normalized);

      try {
        const [primary, secondary] = doubleMetaphone(normalized);

        if (primary) {
          if (!index.primary.has(primary)) {
            index.primary.set(primary, new Set());
          }
          index.primary.get(primary)!.add(normalized);
        }

        if (secondary && secondary !== primary) {
          if (!index.secondary.has(secondary)) {
            index.secondary.set(secondary, new Set());
          }
          index.secondary.get(secondary)!.add(normalized);
        }
      } catch {
        // Skip names that can't be encoded
      }
    }

    return index;
  }

  /**
   * Normalize OCR-corrupted text by replacing common substitutions
   */
  normalizeOcr(text: string): string {
    let result = text.toLowerCase();

    for (const [ocr, letter] of Object.entries(OCR_SUBSTITUTIONS)) {
      result = result.split(ocr).join(letter);
    }

    // Remove extra spaces
    result = result.replace(/\s+/g, " ").trim();

    return result;
  }

  /**
   * Check if a string looks like a first name (with phonetic matching)
   * Returns match info if found, null otherwise
   */
  matchFirstName(input: string): PhoneticMatch | null {
    if (!this.initialized) {
      console.warn(
        "[PhoneticMatcher] Not initialized - call initialize() first",
      );
      return null;
    }

    if (this.nativeInstance) {
      return this.nativeInstance.matchFirstName(input);
    }
    return this.matchAgainstIndex(input, this.firstNameIndex);
  }

  /**
   * Check if a string looks like a surname (with phonetic matching)
   * Returns match info if found, null otherwise
   */
  matchSurname(input: string): PhoneticMatch | null {
    if (!this.initialized) {
      console.warn(
        "[PhoneticMatcher] Not initialized - call initialize() first",
      );
      return null;
    }

    if (this.nativeInstance) {
      return this.nativeInstance.matchSurname(input);
    }
    return this.matchAgainstIndex(input, this.surnameIndex);
  }

  /**
   * Check if a string is likely a name (first OR surname)
   * Returns the best match found
   */
  matchAnyName(input: string): PhoneticMatch | null {
    if (this.nativeInstance) {
      if (!this.initialized) {
        console.warn(
          "[PhoneticMatcher] Not initialized - call initialize() first",
        );
        return null;
      }
      return this.nativeInstance.matchAnyName(input);
    }

    const firstMatch = this.matchFirstName(input);
    const surnameMatch = this.matchSurname(input);

    if (!firstMatch && !surnameMatch) return null;
    if (!firstMatch) return surnameMatch;
    if (!surnameMatch) return firstMatch;

    // Return the higher confidence match
    return firstMatch.confidence >= surnameMatch.confidence
      ? firstMatch
      : surnameMatch;
  }

  /**
   * Match input against a phonetic index
   */
  private matchAgainstIndex(
    input: string,
    index: PhoneticIndex,
  ): PhoneticMatch | null {
    const normalized = this.normalizeOcr(input);

    if (normalized.length < this.MIN_NAME_LENGTH) {
      return null;
    }

    // 1. Exact match (after OCR normalization)
    if (index.names.has(normalized)) {
      return {
        original: input,
        matched: normalized,
        confidence: 1.0,
        matchType: "exact",
      };
    }

    // 2. Phonetic match (primary code)
    try {
      const [primaryCode, secondaryCode] = doubleMetaphone(normalized);

      if (primaryCode && index.primary.has(primaryCode)) {
        const candidates = index.primary.get(primaryCode)!;
        const bestMatch = this.findClosestMatch(normalized, candidates);
        if (bestMatch) {
          return {
            original: input,
            matched: bestMatch,
            confidence: 0.9,
            matchType: "phonetic_primary",
          };
        }
      }

      // 3. Phonetic match (secondary code)
      if (secondaryCode && index.secondary.has(secondaryCode)) {
        const candidates = index.secondary.get(secondaryCode)!;
        const bestMatch = this.findClosestMatch(normalized, candidates);
        if (bestMatch) {
          return {
            original: input,
            matched: bestMatch,
            confidence: 0.85,
            matchType: "phonetic_secondary",
          };
        }
      }
    } catch {
      // Phonetic encoding failed, continue to Levenshtein
    }

    // 4. Levenshtein distance fallback for short names
    if (normalized.length <= 6) {
      const levenshteinMatch = this.findLevenshteinMatch(
        normalized,
        index.names,
      );
      if (levenshteinMatch) {
        return {
          original: input,
          matched: levenshteinMatch,
          confidence: 0.75,
          matchType: "levenshtein",
        };
      }
    }

    return null;
  }

  /**
   * Find the closest matching name from candidates using Levenshtein distance
   */
  private findClosestMatch(
    input: string,
    candidates: Set<string>,
  ): string | null {
    if (candidates.size === 0) return null;

    const candidateArray = Array.from(candidates);
    const best = closest(input, candidateArray);

    // Verify the match is within acceptable distance
    const dist = distance(input, best);
    if (dist <= this.MAX_LEVENSHTEIN_DISTANCE) {
      return best;
    }

    return null;
  }

  /**
   * Find a Levenshtein match in the full name set
   * Only used for short names as fallback
   */
  private findLevenshteinMatch(
    input: string,
    names: Set<string>,
  ): string | null {
    // For efficiency, only check names of similar length
    const minLen = Math.max(this.MIN_NAME_LENGTH, input.length - 2);
    const maxLen = input.length + 2;

    let bestMatch: string | null = null;
    let bestDistance = this.MAX_LEVENSHTEIN_DISTANCE + 1;

    for (const name of names) {
      if (name.length < minLen || name.length > maxLen) continue;

      const dist = distance(input, name);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = name;
      }

      // Early exit if we found an exact or near-exact match
      if (dist <= 1) break;
    }

    return bestDistance <= this.MAX_LEVENSHTEIN_DISTANCE ? bestMatch : null;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    if (this.nativeInstance) {
      return this.nativeInstance.isInitialized();
    }
    return this.initialized;
  }

  /**
   * Get index statistics
   */
  getStats(): {
    firstNames: number;
    surnames: number;
    primaryCodes: number;
    secondaryCodes: number;
  } {
    if (this.nativeInstance) {
      return this.nativeInstance.getStats();
    }
    return {
      firstNames: this.firstNameIndex.names.size,
      surnames: this.surnameIndex.names.size,
      primaryCodes:
        this.firstNameIndex.primary.size + this.surnameIndex.primary.size,
      secondaryCodes:
        this.firstNameIndex.secondary.size + this.surnameIndex.secondary.size,
    };
  }
}

// Singleton instance for global use
let globalMatcher: PhoneticMatcher | null = null;

/**
 * Get or create the global PhoneticMatcher instance
 */
export function getPhoneticMatcher(): PhoneticMatcher {
  if (!globalMatcher) {
    globalMatcher = new PhoneticMatcher();
  }
  return globalMatcher;
}

/**
 * Initialize the global matcher with name dictionaries
 * Should be called once at application startup
 */
export function initializePhoneticMatcher(
  firstNames: string[],
  surnames: string[],
): void {
  const matcher = getPhoneticMatcher();
  matcher.initialize(firstNames, surnames);
}

/**
 * Quick check if a word looks like a name using phonetic matching
 * Convenience function that uses the global matcher
 */
export function isLikelyName(word: string): boolean {
  const matcher = getPhoneticMatcher();
  if (!matcher.isInitialized()) {
    return false;
  }
  return matcher.matchAnyName(word) !== null;
}

/**
 * Get the best name match for an OCR-corrupted string
 * Convenience function that uses the global matcher
 */
export function findNameMatch(word: string): PhoneticMatch | null {
  const matcher = getPhoneticMatcher();
  if (!matcher.isInitialized()) {
    return null;
  }
  return matcher.matchAnyName(word);
}
