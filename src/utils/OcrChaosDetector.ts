/**
 * OcrChaosDetector - Adaptive Document Quality Assessment
 *
 * Measures OCR quality and text corruption to enable adaptive detection thresholds.
 * Documents with higher chaos scores should use more permissive matching patterns.
 *
 * DESIGN PHILOSOPHY:
 * - Clean documents (chaos < 0.2): Strict patterns, high confidence required
 * - Noisy documents (chaos 0.2-0.5): Moderate tolerance, medium confidence
 * - Chaotic documents (chaos > 0.5): Permissive patterns, label-context boosting
 *
 * @module redaction/utils
 */

export interface ChaosAnalysis {
  /** Overall chaos score 0.0 (clean) to 1.0 (total chaos) */
  score: number;
  
  /** Individual chaos indicators */
  indicators: {
    /** Digit-for-letter substitutions (0→O, 1→l, 5→S) */
    digitSubstitutions: number;
    /** Case inconsistency (mIxEd CaSe) */
    caseChaosFactor: number;
    /** Spacing anomalies (extra spaces, missing spaces) */
    spacingAnomalies: number;
    /** Character corruption (partial chars, merged chars) */
    charCorruption: number;
  };
  
  /** Recommended confidence threshold for this document */
  recommendedThreshold: number;
  
  /** Whether to enable permissive label-based detection */
  enableLabelBoost: boolean;
  
  /** Human-readable quality assessment */
  quality: 'CLEAN' | 'NOISY' | 'DEGRADED' | 'CHAOTIC';
}

export interface ConfidenceWeights {
  /** Base confidence for proper case (Patricia Johnson) */
  properCase: number;
  /** Confidence for ALL CAPS (PATRICIA JOHNSON) */
  allCaps: number;
  /** Confidence for all lowercase (patricia johnson) */
  allLower: number;
  /** Confidence for mixed chaos (pAtRiCiA jOhNsOn) */
  chaosCase: number;
  /** Boost when preceded by explicit label (Patient Name:) */
  labelBoost: number;
}

export class OcrChaosDetector {
  /** Cache of analyzed documents to avoid re-computation */
  private static analysisCache = new Map<string, ChaosAnalysis>();
  private static readonly CACHE_MAX_SIZE = 100;

  /**
   * Analyze a document/text block for OCR chaos indicators
   */
  static analyze(text: string): ChaosAnalysis {
    // Check cache first (use first 500 chars as key)
    const cacheKey = text.substring(0, 500);
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    const indicators = {
      digitSubstitutions: this.measureDigitSubstitutions(text),
      caseChaosFactor: this.measureCaseChaos(text),
      spacingAnomalies: this.measureSpacingAnomalies(text),
      charCorruption: this.measureCharCorruption(text),
    };

    // Weighted combination of indicators
    const score = Math.min(1.0, 
      indicators.digitSubstitutions * 0.35 +
      indicators.caseChaosFactor * 0.30 +
      indicators.spacingAnomalies * 0.20 +
      indicators.charCorruption * 0.15
    );

    const analysis: ChaosAnalysis = {
      score,
      indicators,
      recommendedThreshold: this.calculateThreshold(score),
      enableLabelBoost: score > 0.3,
      quality: this.classifyQuality(score),
    };

    // Cache the result
    if (this.analysisCache.size >= this.CACHE_MAX_SIZE) {
      // Clear oldest entries
      const keys = Array.from(this.analysisCache.keys());
      for (let i = 0; i < 20; i++) {
        this.analysisCache.delete(keys[i]);
      }
    }
    this.analysisCache.set(cacheKey, analysis);

    return analysis;
  }

  /**
   * Get confidence weights adjusted for document chaos level
   */
  static getConfidenceWeights(chaosScore: number): ConfidenceWeights {
    // Base weights for clean documents
    const baseWeights: ConfidenceWeights = {
      properCase: 0.95,
      allCaps: 0.90,
      allLower: 0.80,
      chaosCase: 0.50,  // Very low for clean docs - chaos case is suspicious
      labelBoost: 0.10,
    };

    // Adjust weights based on chaos - higher chaos = more tolerance for weird patterns
    if (chaosScore > 0.5) {
      // Chaotic document - be very permissive
      return {
        properCase: 0.90,
        allCaps: 0.88,
        allLower: 0.85,
        chaosCase: 0.75,  // Much higher - chaos case is EXPECTED
        labelBoost: 0.20, // Strong boost from labels
      };
    } else if (chaosScore > 0.2) {
      // Noisy document - moderate tolerance
      return {
        properCase: 0.92,
        allCaps: 0.88,
        allLower: 0.82,
        chaosCase: 0.65,
        labelBoost: 0.15,
      };
    }

    return baseWeights;
  }

  /**
   * Calculate confidence for a specific name match based on its case pattern
   */
  static calculateNameConfidence(
    name: string, 
    chaosScore: number,
    hasLabel: boolean = false
  ): number {
    const weights = this.getConfidenceWeights(chaosScore);
    const casePattern = this.classifyCasePattern(name);
    
    let baseConfidence: number;
    switch (casePattern) {
      case 'PROPER':
        baseConfidence = weights.properCase;
        break;
      case 'ALL_CAPS':
        baseConfidence = weights.allCaps;
        break;
      case 'ALL_LOWER':
        baseConfidence = weights.allLower;
        break;
      case 'CHAOS':
      default:
        baseConfidence = weights.chaosCase;
        break;
    }

    // Apply label boost if applicable
    if (hasLabel) {
      baseConfidence = Math.min(0.98, baseConfidence + weights.labelBoost);
    }

    return baseConfidence;
  }

  /**
   * Classify the case pattern of a name
   */
  static classifyCasePattern(name: string): 'PROPER' | 'ALL_CAPS' | 'ALL_LOWER' | 'CHAOS' {
    const words = name.trim().split(/\s+/);
    
    // Check if all caps
    if (/^[A-Z\s.,'-]+$/.test(name) && /[A-Z]/.test(name)) {
      return 'ALL_CAPS';
    }
    
    // Check if all lowercase
    if (/^[a-z\s.,'-]+$/.test(name) && /[a-z]/.test(name)) {
      return 'ALL_LOWER';
    }
    
    // Check if proper case (each word starts with capital, rest lowercase)
    const isProperCase = words.every(word => {
      const cleaned = word.replace(/[.,'-]/g, '');
      if (cleaned.length === 0) return true;
      // Allow middle initials like "J."
      if (cleaned.length === 1) return /^[A-Z]$/.test(cleaned);
      // Standard word should be Capital + lowercase
      return /^[A-Z][a-z]+$/.test(cleaned);
    });
    
    if (isProperCase) {
      return 'PROPER';
    }
    
    return 'CHAOS';
  }

  // ============ Private measurement methods ============

  /**
   * Measure digit-for-letter substitutions
   * Higher score = more OCR digit substitutions detected
   */
  private static measureDigitSubstitutions(text: string): number {
    // Common OCR substitutions in names/words
    const substitutionPatterns = [
      /[a-zA-Z]0[a-zA-Z]/g,  // 0 for O in middle of word
      /[a-zA-Z]1[a-zA-Z]/g,  // 1 for l/I in middle of word
      /[a-zA-Z]5[a-zA-Z]/g,  // 5 for S in middle of word
      /[a-zA-Z]8[a-zA-Z]/g,  // 8 for B in middle of word
      /[a-zA-Z]6[a-zA-Z]/g,  // 6 for G in middle of word
      /[a-zA-Z]4[a-zA-Z]/g,  // 4 for A in middle of word
      /[a-zA-Z]3[a-zA-Z]/g,  // 3 for E in middle of word
    ];

    let substitutionCount = 0;
    for (const pattern of substitutionPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        substitutionCount += matches.length;
      }
    }

    // Normalize by text length
    const normalizedCount = substitutionCount / Math.max(100, text.length / 10);
    return Math.min(1.0, normalizedCount * 2);
  }

  /**
   * Measure case chaos (inconsistent capitalization within words)
   */
  private static measureCaseChaos(text: string): number {
    // Find words with mixed case that aren't proper case
    const words = text.match(/[a-zA-Z]{3,}/g) || [];
    
    let chaosWords = 0;
    for (const word of words) {
      // Skip if all caps or all lower
      if (/^[A-Z]+$/.test(word) || /^[a-z]+$/.test(word)) continue;
      // Skip if proper case (Capital + lowercase)
      if (/^[A-Z][a-z]+$/.test(word)) continue;
      // Skip if camelCase (common in code/IDs)
      if (/^[a-z]+[A-Z]/.test(word)) continue;
      
      // This is chaos case
      chaosWords++;
    }

    return Math.min(1.0, (chaosWords / Math.max(1, words.length)) * 3);
  }

  /**
   * Measure spacing anomalies
   */
  private static measureSpacingAnomalies(text: string): number {
    let anomalies = 0;
    
    // Multiple consecutive spaces (beyond 2)
    const multiSpaces = text.match(/\s{3,}/g);
    if (multiSpaces) anomalies += multiSpaces.length;
    
    // Space before punctuation
    const spacePunc = text.match(/\s[.,;:!?]/g);
    if (spacePunc) anomalies += spacePunc.length;
    
    // Letter-space-letter in middle of apparent words
    const brokenWords = text.match(/[a-zA-Z]\s[a-zA-Z](?=[a-zA-Z])/g);
    if (brokenWords) anomalies += brokenWords.length;

    // Normalize
    return Math.min(1.0, anomalies / Math.max(10, text.length / 50));
  }

  /**
   * Measure character corruption indicators
   */
  private static measureCharCorruption(text: string): number {
    let corruption = 0;
    
    // Unusual character sequences that suggest OCR errors
    const unusualPatterns = [
      /[|!]{2,}/g,     // Multiple pipes/bangs (often corrupted l/I)
      /[()]{2,}/g,     // Multiple parens (corrupted chars)
      /[{}]{2,}/g,     // Braces (unlikely in medical text)
      /[$@#]{2,}/g,    // Special chars in sequence
    ];
    
    for (const pattern of unusualPatterns) {
      const matches = text.match(pattern);
      if (matches) corruption += matches.length;
    }

    return Math.min(1.0, corruption / Math.max(5, text.length / 100));
  }

  /**
   * Calculate recommended confidence threshold based on chaos score
   */
  private static calculateThreshold(chaosScore: number): number {
    // Clean doc: require 0.85
    // Noisy doc: require 0.70
    // Chaotic doc: require 0.55
    if (chaosScore > 0.5) return 0.55;
    if (chaosScore > 0.2) return 0.70;
    return 0.85;
  }

  /**
   * Classify overall document quality
   */
  private static classifyQuality(score: number): 'CLEAN' | 'NOISY' | 'DEGRADED' | 'CHAOTIC' {
    if (score < 0.15) return 'CLEAN';
    if (score < 0.35) return 'NOISY';
    if (score < 0.6) return 'DEGRADED';
    return 'CHAOTIC';
  }

  /**
   * Clear the analysis cache (useful for testing)
   */
  static clearCache(): void {
    this.analysisCache.clear();
  }
}
