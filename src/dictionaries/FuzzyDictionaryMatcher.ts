/**
 * FuzzyDictionaryMatcher - OCR-Tolerant Dictionary Lookup
 *
 * RESEARCH BASIS: Gazetteers/dictionaries improve PHI detection by 5-10%,
 * especially for names and locations. However, OCR errors break exact matching.
 *
 * MATHEMATICAL FOUNDATION:
 * 1. Jaro-Winkler Similarity - Gold standard for name matching
 *    Formula: JW(s1, s2) = Jaro(s1, s2) + (l * p * (1 - Jaro(s1, s2)))
 *    where l = common prefix length (max 4), p = 0.1 scaling factor
 *    Reference: Winkler (1990) "String Comparator Metrics and Enhanced Decision Rules"
 *
 * 2. Levenshtein Distance - Edit distance for OCR error tolerance
 *    Formula: min insertions + deletions + substitutions to transform s1 -> s2
 *    Reference: Levenshtein (1966) "Binary codes capable of correcting deletions"
 *
 * 3. Soundex - Phonetic encoding for pronunciation-based matching
 *    Reference: Russell & Odell (1918) US Patent 1,261,167
 *
 * 4. Confidence Formula (refined):
 *    confidence = alpha * JaroWinkler + beta * (1 - normalizedLevenshtein) + gamma * phoneticBonus
 *    where alpha + beta + gamma = 1.0
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

  // ============ Jaro-Winkler Similarity ============

  /**
   * Calculate Jaro similarity between two strings
   * Formula: Jaro(s1, s2) = (1/3) * (m/|s1| + m/|s2| + (m-t)/m)
   * where m = matching characters, t = transpositions / 2
   * Characters match if they are the same and within floor(max(|s1|,|s2|)/2) - 1
   */
  private jaroSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matching characters
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0.0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    // Jaro formula: (1/3) * (m/|s1| + m/|s2| + (m - t/2) / m)
    return (
      (matches / s1.length +
        matches / s2.length +
        (matches - transpositions / 2) / matches) /
      3
    );
  }

  /**
   * Calculate Jaro-Winkler similarity (gold standard for name matching)
   * Formula: JW = Jaro + (l * p * (1 - Jaro))
   * where l = common prefix length (max 4), p = scaling factor (default 0.1)
   * Reference: Winkler (1990)
   */
  private jaroWinklerSimilarity(s1: string, s2: string, prefixScale: number = 0.1): number {
    const jaro = this.jaroSimilarity(s1, s2);

    // Find common prefix (max 4 characters)
    let prefixLen = 0;
    const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
    for (let i = 0; i < maxPrefix; i++) {
      if (s1[i] === s2[i]) {
        prefixLen++;
      } else {
        break;
      }
    }

    // Jaro-Winkler formula
    return jaro + prefixLen * prefixScale * (1 - jaro);
  }

  // ============ Levenshtein Distance ============

  /**
   * Calculate Levenshtein edit distance
   * Uses dynamic programming with O(min(m,n)) space optimization
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Ensure a is the shorter string for space optimization
    if (a.length > b.length) {
      [a, b] = [b, a];
    }

    const m = a.length;
    const n = b.length;

    // Use single row with O(m) space instead of full matrix
    let prevRow = new Array(m + 1);
    let currRow = new Array(m + 1);

    // Initialize first row
    for (let j = 0; j <= m; j++) {
      prevRow[j] = j;
    }

    for (let i = 1; i <= n; i++) {
      currRow[0] = i;

      for (let j = 1; j <= m; j++) {
        if (b[i - 1] === a[j - 1]) {
          currRow[j] = prevRow[j - 1];
        } else {
          currRow[j] = 1 + Math.min(
            prevRow[j - 1],  // substitution
            prevRow[j],      // deletion
            currRow[j - 1]   // insertion
          );
        }
      }

      // Swap rows
      [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[m];
  }

  /**
   * Calculate normalized Levenshtein similarity in [0, 1]
   * Formula: 1 - (distance / max(|s1|, |s2|))
   */
  private normalizedLevenshteinSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    return 1 - this.levenshteinDistance(s1, s2) / maxLen;
  }

  /**
   * Find closest fuzzy match within distance threshold
   * Uses Jaro-Winkler as primary metric for better name matching
   */
  private findClosestFuzzy(query: string): { term: string; distance: number; jaroWinkler: number } | null {
    let bestMatch: string | null = null;
    let bestDistance = this.config.maxDistance + 1;
    let bestJaroWinkler = 0;

    // For performance, only check terms of similar length
    const minLen = Math.max(1, query.length - this.config.maxDistance);
    const maxLen = query.length + this.config.maxDistance;

    for (const term of this.terms) {
      if (term.length < minLen || term.length > maxLen) continue;

      // Use Jaro-Winkler as primary filter (faster than Levenshtein)
      const jw = this.jaroWinklerSimilarity(query, term);

      // Only compute Levenshtein if Jaro-Winkler is promising (> 0.7)
      if (jw > 0.7 || jw > bestJaroWinkler) {
        const distance = this.levenshteinDistance(query, term);

        if (distance < bestDistance || (distance === bestDistance && jw > bestJaroWinkler)) {
          bestDistance = distance;
          bestJaroWinkler = jw;
          bestMatch = term;
        }
      }

      // Early exit if exact match found
      if (bestDistance === 0) break;
    }

    if (bestMatch && bestDistance <= this.config.maxDistance) {
      return { term: bestMatch, distance: bestDistance, jaroWinkler: bestJaroWinkler };
    }

    return null;
  }

  /**
   * Calculate confidence using weighted combination of similarity metrics
   * Formula: confidence = alpha * JW + beta * normLev + gamma * phoneticBonus
   *
   * Coefficients optimized empirically for name matching:
   * - alpha = 0.6 (Jaro-Winkler - best for names with typos)
   * - beta = 0.3 (Normalized Levenshtein - catches OCR errors)
   * - gamma = 0.1 (Phonetic bonus - helps with pronunciation variants)
   */
  private calculateConfidence(query: string, matched: string, distance: number): number {
    if (distance === 0) return 1.0;

    // Calculate component similarities
    const jaroWinkler = this.jaroWinklerSimilarity(query, matched);
    const normalizedLev = this.normalizedLevenshteinSimilarity(query, matched);

    // Phonetic bonus: if Soundex codes match, add boost
    const phoneticBonus = this.soundex(query) === this.soundex(matched) ? 1.0 : 0.0;

    // Weighted combination (alpha=0.6, beta=0.3, gamma=0.1)
    const rawConfidence = 0.6 * jaroWinkler + 0.3 * normalizedLev + 0.1 * phoneticBonus;

    // Apply distance-based penalty for additional safety
    // Each edit distance point reduces confidence by ~5%
    const distancePenalty = Math.pow(0.95, distance);

    return Math.min(0.98, rawConfidence * distancePenalty);
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
