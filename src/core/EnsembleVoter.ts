/**
 * EnsembleVoter - Multi-Signal PHI Detection Voting System
 *
 * RESEARCH BASIS: Ensemble methods consistently outperform single approaches
 * in PHI detection (2016 N-GRID winner, 2014 i2b2 top systems).
 *
 * This module implements a weighted voting system that combines multiple
 * detection signals to make final PHI determination. Each signal contributes
 * a weighted vote, and the combined score determines confidence.
 *
 * SIGNALS:
 * 1. Pattern Match - Regex/structural patterns
 * 2. Dictionary Match - Known PHI terms (names, locations)
 * 3. Context Analysis - Surrounding text signals
 * 4. Structural Position - Where in document (header, form field, narrative)
 * 5. Label Proximity - Explicit labels ("Patient Name:", "DOB:")
 * 6. Document Chaos Level - OCR quality affects weighting
 *
 * @module redaction/core
 */

export interface VoteSignal {
  source: 'PATTERN' | 'DICTIONARY' | 'CONTEXT' | 'STRUCTURE' | 'LABEL' | 'CHAOS_ADJUSTED';
  weight: number;       // 0.0 to 1.0
  confidence: number;   // Signal's own confidence
  reason: string;       // Human-readable explanation
}

export interface EnsembleVote {
  signals: VoteSignal[];
  combinedScore: number;
  recommendation: 'REDACT' | 'SKIP' | 'UNCERTAIN';
  dominantSignal: string;
  explanation: string;
}

export interface VotingConfig {
  /** Threshold for positive redaction decision */
  redactThreshold: number;
  /** Threshold below which to skip (not PHI) */
  skipThreshold: number;
  /** Weight multipliers for different signal types */
  signalWeights: {
    PATTERN: number;
    DICTIONARY: number;
    CONTEXT: number;
    STRUCTURE: number;
    LABEL: number;
    CHAOS_ADJUSTED: number;
  };
  /** Minimum number of agreeing signals for high confidence */
  minimumAgreement: number;
}

const DEFAULT_CONFIG: VotingConfig = {
  redactThreshold: 0.65,
  skipThreshold: 0.35,
  signalWeights: {
    PATTERN: 0.25,
    DICTIONARY: 0.20,
    CONTEXT: 0.20,
    STRUCTURE: 0.10,
    LABEL: 0.15,
    CHAOS_ADJUSTED: 0.10,
  },
  minimumAgreement: 2,
};

export class EnsembleVoter {
  private config: VotingConfig;
  
  constructor(config: Partial<VotingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Combine multiple detection signals into a single vote
   */
  vote(signals: VoteSignal[]): EnsembleVote {
    if (signals.length === 0) {
      return {
        signals: [],
        combinedScore: 0,
        recommendation: 'SKIP',
        dominantSignal: 'NONE',
        explanation: 'No detection signals provided',
      };
    }

    // Calculate weighted score
    let totalWeight = 0;
    let weightedSum = 0;
    let positiveSignals = 0;
    let strongestSignal: VoteSignal | null = null;
    let strongestWeight = 0;

    for (const signal of signals) {
      const typeWeight = this.config.signalWeights[signal.source] || 0.1;
      const effectiveWeight = typeWeight * signal.weight;
      const contribution = effectiveWeight * signal.confidence;
      
      weightedSum += contribution;
      totalWeight += effectiveWeight;
      
      if (signal.confidence > 0.5) {
        positiveSignals++;
      }
      
      if (contribution > strongestWeight) {
        strongestWeight = contribution;
        strongestSignal = signal;
      }
    }

    const combinedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    // Apply agreement bonus/penalty
    let adjustedScore = combinedScore;
    if (positiveSignals >= this.config.minimumAgreement) {
      // Multiple signals agree - boost confidence
      adjustedScore = Math.min(1.0, combinedScore * 1.1);
    } else if (positiveSignals === 1 && signals.length > 2) {
      // Only one signal positive when many available - reduce confidence
      adjustedScore = combinedScore * 0.85;
    }

    // Determine recommendation
    let recommendation: 'REDACT' | 'SKIP' | 'UNCERTAIN';
    if (adjustedScore >= this.config.redactThreshold) {
      recommendation = 'REDACT';
    } else if (adjustedScore <= this.config.skipThreshold) {
      recommendation = 'SKIP';
    } else {
      recommendation = 'UNCERTAIN';
    }

    return {
      signals,
      combinedScore: adjustedScore,
      recommendation,
      dominantSignal: strongestSignal?.source || 'NONE',
      explanation: this.generateExplanation(signals, adjustedScore, recommendation),
    };
  }

  /**
   * Create a PATTERN signal
   */
  static patternSignal(confidence: number, patternName: string): VoteSignal {
    return {
      source: 'PATTERN',
      weight: 1.0,
      confidence,
      reason: `Pattern match: ${patternName}`,
    };
  }

  /**
   * Create a DICTIONARY signal
   */
  static dictionarySignal(confidence: number, dictionaryType: string, fuzzyMatch: boolean = false): VoteSignal {
    return {
      source: 'DICTIONARY',
      weight: fuzzyMatch ? 0.8 : 1.0,
      confidence,
      reason: `Dictionary ${fuzzyMatch ? 'fuzzy ' : ''}match: ${dictionaryType}`,
    };
  }

  /**
   * Create a CONTEXT signal
   */
  static contextSignal(confidence: number, contextType: string): VoteSignal {
    return {
      source: 'CONTEXT',
      weight: 1.0,
      confidence,
      reason: `Context: ${contextType}`,
    };
  }

  /**
   * Create a STRUCTURE signal
   */
  static structureSignal(confidence: number, position: string): VoteSignal {
    return {
      source: 'STRUCTURE',
      weight: 1.0,
      confidence,
      reason: `Structural position: ${position}`,
    };
  }

  /**
   * Create a LABEL signal
   */
  static labelSignal(confidence: number, labelText: string): VoteSignal {
    return {
      source: 'LABEL',
      weight: 1.0,
      confidence,
      reason: `Label proximity: "${labelText}"`,
    };
  }

  /**
   * Create a CHAOS_ADJUSTED signal
   */
  static chaosSignal(confidence: number, chaosLevel: string): VoteSignal {
    return {
      source: 'CHAOS_ADJUSTED',
      weight: 1.0,
      confidence,
      reason: `Chaos-adjusted (${chaosLevel})`,
    };
  }

  /**
   * Convenience method to vote with common signal types
   */
  quickVote(options: {
    patternMatch?: { confidence: number; name: string };
    dictionaryMatch?: { confidence: number; type: string; fuzzy?: boolean };
    contextMatch?: { confidence: number; type: string };
    labelMatch?: { confidence: number; label: string };
    structureMatch?: { confidence: number; position: string };
    chaosAdjustment?: { confidence: number; level: string };
  }): EnsembleVote {
    const signals: VoteSignal[] = [];

    if (options.patternMatch) {
      signals.push(EnsembleVoter.patternSignal(
        options.patternMatch.confidence,
        options.patternMatch.name
      ));
    }
    if (options.dictionaryMatch) {
      signals.push(EnsembleVoter.dictionarySignal(
        options.dictionaryMatch.confidence,
        options.dictionaryMatch.type,
        options.dictionaryMatch.fuzzy
      ));
    }
    if (options.contextMatch) {
      signals.push(EnsembleVoter.contextSignal(
        options.contextMatch.confidence,
        options.contextMatch.type
      ));
    }
    if (options.labelMatch) {
      signals.push(EnsembleVoter.labelSignal(
        options.labelMatch.confidence,
        options.labelMatch.label
      ));
    }
    if (options.structureMatch) {
      signals.push(EnsembleVoter.structureSignal(
        options.structureMatch.confidence,
        options.structureMatch.position
      ));
    }
    if (options.chaosAdjustment) {
      signals.push(EnsembleVoter.chaosSignal(
        options.chaosAdjustment.confidence,
        options.chaosAdjustment.level
      ));
    }

    return this.vote(signals);
  }

  private generateExplanation(
    signals: VoteSignal[],
    score: number,
    recommendation: string
  ): string {
    const positiveSignals = signals.filter(s => s.confidence > 0.5);
    const negativeSignals = signals.filter(s => s.confidence <= 0.5);
    
    let explanation = `Score: ${(score * 100).toFixed(1)}% → ${recommendation}. `;
    
    if (positiveSignals.length > 0) {
      explanation += `Positive: ${positiveSignals.map(s => s.source).join(', ')}. `;
    }
    if (negativeSignals.length > 0) {
      explanation += `Negative: ${negativeSignals.map(s => s.source).join(', ')}.`;
    }
    
    return explanation.trim();
  }
}

/**
 * InterPHIDisambiguator - Resolves conflicts between PHI type claims
 *
 * RESEARCH BASIS: Ambiguity between PHI types is a major challenge.
 * '9/12' could be DATE or medical value. '40's' could be AGE or DATE.
 *
 * This disambiguates based on context patterns.
 */
export class InterPHIDisambiguator {
  /**
   * Disambiguate between DATE and other interpretations
   */
  static disambiguateDate(
    text: string,
    context: string,
    alternativeType: string
  ): { winner: string; confidence: number; reason: string } {
    const lowerContext = context.toLowerCase();
    
    // Strong DATE indicators
    const dateIndicators = [
      /\b(born|dob|date of birth|admission|discharge|visit|appointment)\b/i,
      /\b(on|dated|as of|effective|expires?)\b/i,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    ];
    
    // Strong AGE indicators
    const ageIndicators = [
      /\b(year[- ]?old|yo|y\.?o\.?|aged?)\b/i,
      /\b(patient is|she is|he is|who is)\s+\d/i,
    ];
    
    // Strong MEASUREMENT indicators
    const measurementIndicators = [
      /\b(mg|ml|mcg|units?|mmol|mmhg|bpm)\b/i,
      /\b(level|value|result|reading|score)\b/i,
      /\d+\s*[\/x×]\s*\d+/i, // Ratios like "9/12" or "120x80"
    ];
    
    let dateScore = 0;
    let altScore = 0;
    
    for (const pattern of dateIndicators) {
      if (pattern.test(lowerContext)) dateScore += 0.3;
    }
    
    if (alternativeType === 'AGE') {
      for (const pattern of ageIndicators) {
        if (pattern.test(lowerContext)) altScore += 0.4;
      }
    }
    
    if (alternativeType === 'MEASUREMENT') {
      for (const pattern of measurementIndicators) {
        if (pattern.test(lowerContext)) altScore += 0.4;
      }
    }
    
    if (dateScore > altScore) {
      return { winner: 'DATE', confidence: Math.min(0.95, 0.5 + dateScore), reason: 'Date context indicators' };
    } else if (altScore > dateScore) {
      return { winner: alternativeType, confidence: Math.min(0.95, 0.5 + altScore), reason: `${alternativeType} context indicators` };
    }
    
    return { winner: 'DATE', confidence: 0.5, reason: 'Ambiguous - defaulting to DATE' };
  }

  /**
   * Disambiguate between NAME and other interpretations
   */
  static disambiguateName(
    text: string,
    context: string,
    alternativeType: string
  ): { winner: string; confidence: number; reason: string } {
    const lowerContext = context.toLowerCase();
    
    // Strong NAME indicators
    const nameIndicators = [
      /\b(patient|mr\.?|mrs\.?|ms\.?|dr\.?|name|signed|by)\b/i,
      /\b(contact|guardian|spouse|mother|father|son|daughter)\b/i,
    ];
    
    // Strong MEDICATION indicators
    const medIndicators = [
      /\b(mg|mcg|tablet|capsule|prescribed|taking|dose|daily|prn)\b/i,
      /\b(medication|drug|rx|prescription)\b/i,
    ];
    
    // Strong DIAGNOSIS indicators  
    const dxIndicators = [
      /\b(diagnosis|diagnosed|condition|disease|syndrome|disorder)\b/i,
      /\b(icd|code|assessment)\b/i,
    ];
    
    let nameScore = 0;
    let altScore = 0;
    
    for (const pattern of nameIndicators) {
      if (pattern.test(lowerContext)) nameScore += 0.3;
    }
    
    if (alternativeType === 'MEDICATION') {
      for (const pattern of medIndicators) {
        if (pattern.test(lowerContext)) altScore += 0.35;
      }
    }
    
    if (alternativeType === 'DIAGNOSIS') {
      for (const pattern of dxIndicators) {
        if (pattern.test(lowerContext)) altScore += 0.35;
      }
    }
    
    if (nameScore > altScore) {
      return { winner: 'NAME', confidence: Math.min(0.95, 0.5 + nameScore), reason: 'Name context indicators' };
    } else if (altScore > nameScore) {
      return { winner: alternativeType, confidence: Math.min(0.95, 0.5 + altScore), reason: `${alternativeType} context indicators` };
    }
    
    return { winner: 'NAME', confidence: 0.5, reason: 'Ambiguous - defaulting to NAME' };
  }
}
