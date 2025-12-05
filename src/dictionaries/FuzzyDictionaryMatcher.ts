/**
 * FuzzyDictionaryMatcher - OCR-Tolerant Dictionary Lookup
 *
 * RESEARCH BASIS: Gazetteers/dictionaries improve PHI detection by 5-10%,
 * especially for names and locations. However, OCR errors break exact matching.
 *
 * This module provides:
 * 1. Fuzzy matching with Levenshtein distance
 * 2. OCR-aware normalization before matching
 * 3. Phonetic matching (Soundex/Metaphone) for names
 * 4. Confidence scoring based on match quality
 *
 * @module redaction/dictionaries
 */

export interface FuzzyMatchResult {
  matched: boolean;
  matchedTerm: string | null;
  originalQuery: string;
  normalizedQuery: string;
  matchType: 'EXACT' | 'NORMALIZED' | 'FUZZY' | 'PHONETIC' | 'NONE';
  distance: number;  // Edit distance (0 for exact)
  confidence: number;
}

export interface FuzzyMatchConfig {
  /** Maximum Levenshtein distance for fuzzy match */
  maxDistance: number;
  /** Enable OCR normalization before matching */
  ocrNormalize: boolean;
  /** Enable phonetic matching for names */
  phoneticMatch: boolean;
  /** Minimum term length for fuzzy matching */
  minLengthForFuzzy: number;
}

const DEFAULT_CONFIG: FuzzyMatchConfig = {
  maxDistance: 2,
  ocrNormalize: true,
  phoneticMatch: true,
  minLengthForFuzzy: 4,
};

export class FuzzyDictionaryMatcher {
  private terms: Set<string>;
  private normalizedTerms: Map<string, string>;  // normalized -> original
  private phoneticIndex: Map<string, string[]>;  // phonetic code -> terms
  private config: FuzzyMatchConfig;

  constructor(terms: string[], config: Partial<FuzzyMatchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.terms = new Set(terms.map(t => t.toLowerCase()));
    this.normalizedTerms = new Map();
    this.phoneticIndex = new Map();
    
    // Build indexes
    for (const term of terms) {
      const lower = term.toLowerCase();
      const normalized = this.ocrNormalize(lower);
      this.normalizedTerms.set(normalized, lower);
      
      if (this.config.phoneticMatch) {
        const phonetic = this.soundex(lower);
        if (!this.phoneticIndex.has(phonetic)) {
          this.phoneticIndex.set(phonetic, []);
        }
        this.phoneticIndex.get(phonetic)!.push(lower);
      }
    }
  }

  /**
   * Look up a term with fuzzy matching
   */
  lookup(query: string): FuzzyMatchResult {
    const lowerQuery = query.toLowerCase().trim();
    const normalizedQuery = this.ocrNormalize(lowerQuery);
    
    // 1. Exact match
    if (this.terms.has(lowerQuery)) {
      return {
        matched: true,
        matchedTerm: lowerQuery,
        originalQuery: query,
        normalizedQuery,
        matchType: 'EXACT',
        distance: 0,
        confidence: 1.0,
      };
    }
    
    // 2. Normalized match (OCR correction)
    if (this.config.ocrNormalize && this.normalizedTerms.has(normalizedQuery)) {
      return {
        matched: true,
        matchedTerm: this.normalizedTerms.get(normalizedQuery)!,
        originalQuery: query,
        normalizedQuery,
        matchType: 'NORMALIZED',
        distance: 0,
        confidence: 0.95,
      };
    }
    
    // 3. Phonetic match (for names)
    if (this.config.phoneticMatch && lowerQuery.length >= this.config.minLengthForFuzzy) {
      const queryPhonetic = this.soundex(lowerQuery);
      const phoneticMatches = this.phoneticIndex.get(queryPhonetic);
      
      if (phoneticMatches && phoneticMatches.length > 0) {
        // Find closest phonetic match
        let bestMatch = phoneticMatches[0];
        let bestDistance = this.levenshteinDistance(lowerQuery, bestMatch);
        
        for (const match of phoneticMatches) {
          const dist = this.levenshteinDistance(lowerQuery, match);
          if (dist < bestDistance) {
            bestDistance = dist;
            bestMatch = match;
          }
        }
        
        if (bestDistance <= this.config.maxDistance) {
          return {
            matched: true,
            matchedTerm: bestMatch,
            originalQuery: query,
            normalizedQuery,
            matchType: 'PHONETIC',
            distance: bestDistance,
            confidence: this.calculateConfidence(lowerQuery, bestMatch, bestDistance),
          };
        }
      }
    }
    
    // 4. Fuzzy match (Levenshtein)
    if (lowerQuery.length >= this.config.minLengthForFuzzy) {
      const fuzzyResult = this.findClosestFuzzy(lowerQuery);
      if (fuzzyResult) {
        return {
          matched: true,
          matchedTerm: fuzzyResult.term,
          originalQuery: query,
          normalizedQuery,
          matchType: 'FUZZY',
          distance: fuzzyResult.distance,
          confidence: this.calculateConfidence(lowerQuery, fuzzyResult.term, fuzzyResult.distance),
        };
      }
    }
    
    // No match
    return {
      matched: false,
      matchedTerm: null,
      originalQuery: query,
      normalizedQuery,
      matchType: 'NONE',
      distance: Infinity,
      confidence: 0,
    };
  }

  /**
   * Check if term exists (with fuzzy tolerance)
   */
  has(query: string): boolean {
    return this.lookup(query).matched;
  }

  /**
   * Get confidence score for a query
   */
  getConfidence(query: string): number {
    return this.lookup(query).confidence;
  }

  // ============ OCR Normalization ============

  /**
   * Normalize common OCR substitutions
   */
  private ocrNormalize(text: string): string {
    return text
      // Digit → letter substitutions
      .replace(/0/g, 'o')
      .replace(/1/g, 'l')
      .replace(/5/g, 's')
      .replace(/8/g, 'b')
      .replace(/6/g, 'g')
      .replace(/4/g, 'a')
      .replace(/3/g, 'e')
      .replace(/7/g, 't')
      // Special character substitutions
      .replace(/\|/g, 'l')
      .replace(/\$/g, 's')
      .replace(/@/g, 'a')
      .replace(/!/g, 'i')
      // Normalize spacing
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ============ Phonetic Matching ============

  /**
   * Soundex algorithm for phonetic matching
   */
  private soundex(text: string): string {
    const s = text.toUpperCase().replace(/[^A-Z]/g, '');
    if (s.length === 0) return '0000';
    
    const codes: { [key: string]: string } = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6',
      A: '0', E: '0', I: '0', O: '0', U: '0', H: '0', W: '0', Y: '0',
    };
    
    let result = s[0];
    let prevCode = codes[s[0]] || '0';
    
    for (let i = 1; i < s.length && result.length < 4; i++) {
      const code = codes[s[i]] || '0';
      if (code !== '0' && code !== prevCode) {
        result += code;
      }
      prevCode = code;
    }
    
    return (result + '000').substring(0, 4);
  }

  // ============ Levenshtein Distance ============

  /**
   * Calculate Levenshtein edit distance
   */
  private levenshteinDistance(a: string, b: string): number {
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
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,  // substitution
            matrix[i][j - 1] + 1,      // insertion
            matrix[i - 1][j] + 1       // deletion
          );
        }
      }
    }
    
    return matrix[b.length][a.length];
  }

  /**
   * Find closest fuzzy match within distance threshold
   */
  private findClosestFuzzy(query: string): { term: string; distance: number } | null {
    let bestMatch: string | null = null;
    let bestDistance = this.config.maxDistance + 1;
    
    // For performance, only check terms of similar length
    const minLen = Math.max(1, query.length - this.config.maxDistance);
    const maxLen = query.length + this.config.maxDistance;
    
    for (const term of this.terms) {
      if (term.length < minLen || term.length > maxLen) continue;
      
      const distance = this.levenshteinDistance(query, term);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = term;
      }
      
      // Early exit if exact match found
      if (distance === 0) break;
    }
    
    if (bestMatch && bestDistance <= this.config.maxDistance) {
      return { term: bestMatch, distance: bestDistance };
    }
    
    return null;
  }

  /**
   * Calculate confidence based on match quality
   */
  private calculateConfidence(query: string, matched: string, distance: number): number {
    if (distance === 0) return 1.0;
    
    const maxLen = Math.max(query.length, matched.length);
    const similarity = 1 - (distance / maxLen);
    
    // Adjust confidence based on distance
    if (distance === 1) {
      return 0.85 + (similarity * 0.1);
    } else if (distance === 2) {
      return 0.70 + (similarity * 0.15);
    } else {
      return 0.50 + (similarity * 0.2);
    }
  }

  // ============ Static factory methods ============

  /**
   * Create matcher from first names dictionary
   */
  static forFirstNames(names: string[]): FuzzyDictionaryMatcher {
    return new FuzzyDictionaryMatcher(names, {
      maxDistance: 2,
      ocrNormalize: true,
      phoneticMatch: true,
      minLengthForFuzzy: 3,
    });
  }

  /**
   * Create matcher from surnames dictionary
   */
  static forSurnames(names: string[]): FuzzyDictionaryMatcher {
    return new FuzzyDictionaryMatcher(names, {
      maxDistance: 2,
      ocrNormalize: true,
      phoneticMatch: true,
      minLengthForFuzzy: 3,
    });
  }

  /**
   * Create matcher for locations (less phonetic, more OCR)
   */
  static forLocations(locations: string[]): FuzzyDictionaryMatcher {
    return new FuzzyDictionaryMatcher(locations, {
      maxDistance: 2,
      ocrNormalize: true,
      phoneticMatch: false,
      minLengthForFuzzy: 4,
    });
  }

  /**
   * Create strict matcher (exact + normalized only)
   */
  static strict(terms: string[]): FuzzyDictionaryMatcher {
    return new FuzzyDictionaryMatcher(terms, {
      maxDistance: 0,
      ocrNormalize: true,
      phoneticMatch: false,
      minLengthForFuzzy: 100, // effectively disable fuzzy
    });
  }
}
