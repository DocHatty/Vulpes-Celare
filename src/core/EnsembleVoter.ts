/**
 * EnsembleVoter - Multi-Signal PHI Detection Voting System
 *
 * RESEARCH BASIS: Ensemble methods consistently outperform single approaches
 * in PHI detection (2016 N-GRID winner, 2014 i2b2 top systems).
 *
 * MATHEMATICAL FOUNDATION:
 * 1. Weighted Geometric Mean - More robust than arithmetic mean for probability combination
 *    Formula: score = exp(sum(w_i * ln(c_i)) / sum(w_i))
 *    Reference: Genest & Zidek (1986) "Combining Probability Distributions"
 *
 * 2. Log-Odds Bayesian Combination (optional mode)
 *    Formula: P(PHI|signals) = sigmoid(sum(logit(c_i) * w_i) / sum(w_i) + logit(prior))
 *    Reference: Good (1950) "Probability and the Weighing of Evidence"
 *
 * 3. Agreement Bonus via Normalized Shannon Entropy
 *    H = -sum(p_i * log2(p_i)) where p_i = positive_signals / total_signals
 *    Low entropy (high agreement) -> confidence boost
 *    Reference: Shannon (1948) "A Mathematical Theory of Communication"
 *
 * SIGNALS:
 * 1. Pattern Match - Regex/structural patterns
 * 2. Dictionary Match - Known PHI terms (names, locations)
 * 3. Context Analysis - Surrounding text signals
 * 4. Structural Position - Where in document (header, form field, narrative)
 * 5. Label Proximity - Explicit labels ("Patient Name:", "DOB:")
 * 6. Document Chaos Level - OCR quality affects weighting
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Static regex patterns compiled once at class load time
 * - Entropy calculations cached via ComputationCache
 * - Pattern matching results cached for repeated context analysis
 *
 * @module redaction/core
 */

import { ComputationCache } from "../utils/ComputationCache";

export interface VoteSignal {
  source:
    | "PATTERN"
    | "DICTIONARY"
    | "CONTEXT"
    | "STRUCTURE"
    | "LABEL"
    | "CHAOS_ADJUSTED";
  weight: number; // 0.0 to 1.0
  confidence: number; // Signal's own confidence
  reason: string; // Human-readable explanation
}

export interface EnsembleVote {
  signals: VoteSignal[];
  combinedScore: number;
  recommendation: "REDACT" | "SKIP" | "UNCERTAIN";
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
  /** Use Bayesian log-odds combination instead of geometric mean */
  useBayesian: boolean;
  /** Prior probability of PHI (base rate) - used in Bayesian mode */
  phiPrior: number;
}

const DEFAULT_CONFIG: VotingConfig = {
  redactThreshold: 0.65,
  skipThreshold: 0.35,
  signalWeights: {
    PATTERN: 0.3, // Pattern matches are strongest evidence
    DICTIONARY: 0.25, // Dictionary matches are very reliable
    CONTEXT: 0.2, // Context provides good supporting evidence
    STRUCTURE: 0.1, // Structure is weak but useful signal
    LABEL: 0.1, // Labels boost confidence when present
    CHAOS_ADJUSTED: 0.05, // Minor adjustment for OCR quality
  },
  minimumAgreement: 2,
  useBayesian: false, // Default to geometric mean (more stable)
  phiPrior: 0.15, // ~15% of detected candidates are true PHI (empirical)
};

export class EnsembleVoter {
  private config: VotingConfig;
  private readonly cache: ComputationCache;

  // Mathematical constants
  private static readonly EPSILON = 1e-10; // Prevent log(0) and division by zero
  private static readonly LOG2 = Math.log(2);

  constructor(config: Partial<VotingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = ComputationCache.getInstance();
  }

  /**
   * Sigmoid function: maps (-inf, inf) -> (0, 1)
   * Formula: sigmoid(x) = 1 / (1 + exp(-x))
   * Used for Bayesian posterior calculation
   */
  private static sigmoid(x: number): number {
    if (x >= 0) {
      return 1 / (1 + Math.exp(-x));
    } else {
      // Numerically stable for negative values
      const expX = Math.exp(x);
      return expX / (1 + expX);
    }
  }

  /**
   * Logit function: inverse of sigmoid, maps (0, 1) -> (-inf, inf)
   * Formula: logit(p) = ln(p / (1 - p))
   * Converts probability to log-odds for linear combination
   */
  private static logit(p: number): number {
    // Clamp to prevent infinity
    const clampedP = Math.max(
      EnsembleVoter.EPSILON,
      Math.min(1 - EnsembleVoter.EPSILON, p),
    );
    return Math.log(clampedP / (1 - clampedP));
  }

  /**
   * Calculate Shannon entropy for agreement measurement
   * Formula: H = -sum(p_i * log2(p_i)) for i in {positive, negative}
   * Returns normalized entropy in [0, 1] where 0 = full agreement, 1 = maximum disagreement
   *
   * PERFORMANCE: Results are cached via ComputationCache
   */
  private normalizedEntropy(positiveCount: number, totalCount: number): number {
    if (totalCount <= 1) return 0; // Single signal = no disagreement possible

    // Use cached entropy calculation
    const cacheKey = ComputationCache.entropyKey(positiveCount, totalCount);
    return this.cache.getEntropy(cacheKey, () => {
      const pPositive = positiveCount / totalCount;
      const pNegative = 1 - pPositive;

      // Handle edge cases where one probability is 0
      if (
        pPositive < EnsembleVoter.EPSILON ||
        pNegative < EnsembleVoter.EPSILON
      ) {
        return 0; // Full agreement
      }

      // Binary entropy: H = -p*log2(p) - (1-p)*log2(1-p)
      const entropy =
        -(pPositive * Math.log(pPositive) + pNegative * Math.log(pNegative)) /
        EnsembleVoter.LOG2;

      // Normalized to [0, 1] (max binary entropy is 1.0)
      return entropy;
    });
  }

  /**
   * Weighted Geometric Mean combination
   * Formula: exp(sum(w_i * ln(c_i)) / sum(w_i))
   * More robust than arithmetic mean for probabilities - penalizes extreme disagreement
   * Reference: Genest & Zidek (1986)
   */
  private weightedGeometricMean(signals: VoteSignal[]): number {
    let weightedLogSum = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const typeWeight = this.config.signalWeights[signal.source] || 0.1;
      const effectiveWeight = typeWeight * signal.weight;

      // Clamp confidence to prevent log(0)
      const clampedConfidence = Math.max(
        EnsembleVoter.EPSILON,
        signal.confidence,
      );

      weightedLogSum += effectiveWeight * Math.log(clampedConfidence);
      totalWeight += effectiveWeight;
    }

    if (totalWeight < EnsembleVoter.EPSILON) return 0;

    return Math.exp(weightedLogSum / totalWeight);
  }

  /**
   * Bayesian Log-Odds combination
   * Formula: sigmoid(sum(w_i * logit(c_i)) / sum(w_i) + logit(prior))
   * Theoretically principled probability combination with prior integration
   * Reference: Good (1950)
   */
  private bayesianLogOddsCombination(signals: VoteSignal[]): number {
    let weightedLogOddsSum = 0;
    let totalWeight = 0;

    for (const signal of signals) {
      const typeWeight = this.config.signalWeights[signal.source] || 0.1;
      const effectiveWeight = typeWeight * signal.weight;

      weightedLogOddsSum +=
        effectiveWeight * EnsembleVoter.logit(signal.confidence);
      totalWeight += effectiveWeight;
    }

    if (totalWeight < EnsembleVoter.EPSILON) return this.config.phiPrior;

    // Average log-odds + prior log-odds
    const avgLogOdds = weightedLogOddsSum / totalWeight;
    const priorLogOdds = EnsembleVoter.logit(this.config.phiPrior);

    // Combined log-odds back to probability via sigmoid
    return EnsembleVoter.sigmoid(avgLogOdds + priorLogOdds);
  }

  /**
   * Calculate agreement bonus/penalty based on Shannon entropy
   * High agreement (low entropy) -> boost, High disagreement (high entropy) -> penalty
   */
  private calculateAgreementMultiplier(
    positiveSignals: number,
    totalSignals: number,
  ): number {
    if (totalSignals < 2) return 1.0; // No adjustment for single signal

    const entropy = this.normalizedEntropy(positiveSignals, totalSignals);

    // Map entropy to multiplier:
    // entropy = 0 (full agreement) -> multiplier = 1.15 (15% boost)
    // entropy = 0.5 (moderate disagreement) -> multiplier = 1.0 (no change)
    // entropy = 1.0 (complete disagreement) -> multiplier = 0.85 (15% penalty)
    // Linear interpolation: multiplier = 1.15 - 0.30 * entropy
    const multiplier = 1.15 - 0.3 * entropy;

    // Additional boost if meeting minimum agreement threshold
    if (positiveSignals >= this.config.minimumAgreement) {
      return Math.min(1.2, multiplier + 0.05);
    }

    return multiplier;
  }

  /**
   * Combine multiple detection signals into a single vote
   * Uses either weighted geometric mean or Bayesian log-odds based on config
   */
  vote(signals: VoteSignal[]): EnsembleVote {
    if (signals.length === 0) {
      return {
        signals: [],
        combinedScore: 0,
        recommendation: "SKIP",
        dominantSignal: "NONE",
        explanation: "No detection signals provided",
      };
    }

    // Count positive signals and find strongest
    let positiveSignals = 0;
    let strongestSignal: VoteSignal | null = null;
    let strongestContribution = 0;

    for (const signal of signals) {
      if (signal.confidence > 0.5) {
        positiveSignals++;
      }

      const typeWeight = this.config.signalWeights[signal.source] || 0.1;
      const contribution = typeWeight * signal.weight * signal.confidence;

      if (contribution > strongestContribution) {
        strongestContribution = contribution;
        strongestSignal = signal;
      }
    }

    // Calculate base combined score using selected method
    const baseScore = this.config.useBayesian
      ? this.bayesianLogOddsCombination(signals)
      : this.weightedGeometricMean(signals);

    // Apply entropy-based agreement multiplier
    const agreementMultiplier = this.calculateAgreementMultiplier(
      positiveSignals,
      signals.length,
    );
    let adjustedScore = Math.min(
      1.0,
      Math.max(0.0, baseScore * agreementMultiplier),
    );

    // Determine recommendation
    let recommendation: "REDACT" | "SKIP" | "UNCERTAIN";
    if (adjustedScore >= this.config.redactThreshold) {
      recommendation = "REDACT";
    } else if (adjustedScore <= this.config.skipThreshold) {
      recommendation = "SKIP";
    } else {
      recommendation = "UNCERTAIN";
    }

    return {
      signals,
      combinedScore: adjustedScore,
      recommendation,
      dominantSignal: strongestSignal?.source || "NONE",
      explanation: this.generateExplanation(
        signals,
        adjustedScore,
        recommendation,
      ),
    };
  }

  /**
   * Create a PATTERN signal
   */
  static patternSignal(confidence: number, patternName: string): VoteSignal {
    return {
      source: "PATTERN",
      weight: 1.0,
      confidence,
      reason: `Pattern match: ${patternName}`,
    };
  }

  /**
   * Create a DICTIONARY signal
   */
  static dictionarySignal(
    confidence: number,
    dictionaryType: string,
    fuzzyMatch: boolean = false,
  ): VoteSignal {
    return {
      source: "DICTIONARY",
      weight: fuzzyMatch ? 0.8 : 1.0,
      confidence,
      reason: `Dictionary ${fuzzyMatch ? "fuzzy " : ""}match: ${dictionaryType}`,
    };
  }

  /**
   * Create a CONTEXT signal
   */
  static contextSignal(confidence: number, contextType: string): VoteSignal {
    return {
      source: "CONTEXT",
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
      source: "STRUCTURE",
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
      source: "LABEL",
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
      source: "CHAOS_ADJUSTED",
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
      signals.push(
        EnsembleVoter.patternSignal(
          options.patternMatch.confidence,
          options.patternMatch.name,
        ),
      );
    }
    if (options.dictionaryMatch) {
      signals.push(
        EnsembleVoter.dictionarySignal(
          options.dictionaryMatch.confidence,
          options.dictionaryMatch.type,
          options.dictionaryMatch.fuzzy,
        ),
      );
    }
    if (options.contextMatch) {
      signals.push(
        EnsembleVoter.contextSignal(
          options.contextMatch.confidence,
          options.contextMatch.type,
        ),
      );
    }
    if (options.labelMatch) {
      signals.push(
        EnsembleVoter.labelSignal(
          options.labelMatch.confidence,
          options.labelMatch.label,
        ),
      );
    }
    if (options.structureMatch) {
      signals.push(
        EnsembleVoter.structureSignal(
          options.structureMatch.confidence,
          options.structureMatch.position,
        ),
      );
    }
    if (options.chaosAdjustment) {
      signals.push(
        EnsembleVoter.chaosSignal(
          options.chaosAdjustment.confidence,
          options.chaosAdjustment.level,
        ),
      );
    }

    return this.vote(signals);
  }

  private generateExplanation(
    signals: VoteSignal[],
    score: number,
    recommendation: string,
  ): string {
    const positiveSignals = signals.filter((s) => s.confidence > 0.5);
    const negativeSignals = signals.filter((s) => s.confidence <= 0.5);

    let explanation = `Score: ${(score * 100).toFixed(1)}% → ${recommendation}. `;

    if (positiveSignals.length > 0) {
      explanation += `Positive: ${positiveSignals.map((s) => s.source).join(", ")}. `;
    }
    if (negativeSignals.length > 0) {
      explanation += `Negative: ${negativeSignals.map((s) => s.source).join(", ")}.`;
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
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - All regex patterns are compiled once as static class fields
 * - Eliminates pattern recompilation on every method call (was O(n) per call)
 */
export class InterPHIDisambiguator {
  // ============ Static Regex Patterns (compiled once) ============

  // DATE indicators
  private static readonly DATE_INDICATORS: readonly RegExp[] = [
    /\b(born|dob|date of birth|admission|discharge|visit|appointment)\b/i,
    /\b(on|dated|as of|effective|expires?)\b/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  ] as const;

  // AGE indicators
  private static readonly AGE_INDICATORS: readonly RegExp[] = [
    /\b(year[- ]?old|yo|y\.?o\.?|aged?)\b/i,
    /\b(patient is|she is|he is|who is)\s+\d/i,
  ] as const;

  // MEASUREMENT indicators
  private static readonly MEASUREMENT_INDICATORS: readonly RegExp[] = [
    /\b(mg|ml|mcg|units?|mmol|mmhg|bpm)\b/i,
    /\b(level|value|result|reading|score)\b/i,
    /\d+\s*[\/x×]\s*\d+/i, // Ratios like "9/12" or "120x80"
  ] as const;

  // NAME indicators
  private static readonly NAME_INDICATORS: readonly RegExp[] = [
    /\b(patient|mr\.?|mrs\.?|ms\.?|dr\.?|name|signed|by)\b/i,
    /\b(contact|guardian|spouse|mother|father|son|daughter)\b/i,
  ] as const;

  // MEDICATION indicators
  private static readonly MEDICATION_INDICATORS: readonly RegExp[] = [
    /\b(mg|mcg|tablet|capsule|prescribed|taking|dose|daily|prn)\b/i,
    /\b(medication|drug|rx|prescription)\b/i,
  ] as const;

  // DIAGNOSIS indicators
  private static readonly DIAGNOSIS_INDICATORS: readonly RegExp[] = [
    /\b(diagnosis|diagnosed|condition|disease|syndrome|disorder)\b/i,
    /\b(icd|code|assessment)\b/i,
  ] as const;

  /**
   * Count pattern matches against context
   */
  private static countMatches(
    patterns: readonly RegExp[],
    context: string,
  ): number {
    let count = 0;
    for (const pattern of patterns) {
      if (pattern.test(context)) count++;
    }
    return count;
  }

  /**
   * Disambiguate between DATE and other interpretations
   */
  static disambiguateDate(
    text: string,
    context: string,
    alternativeType: string,
  ): { winner: string; confidence: number; reason: string } {
    const lowerContext = context.toLowerCase();

    // Count matches using pre-compiled static patterns
    const dateMatches = InterPHIDisambiguator.countMatches(
      InterPHIDisambiguator.DATE_INDICATORS,
      lowerContext,
    );
    let dateScore = dateMatches * 0.3;
    let altScore = 0;

    if (alternativeType === "AGE") {
      const ageMatches = InterPHIDisambiguator.countMatches(
        InterPHIDisambiguator.AGE_INDICATORS,
        lowerContext,
      );
      altScore = ageMatches * 0.4;
    }

    if (alternativeType === "MEASUREMENT") {
      const measurementMatches = InterPHIDisambiguator.countMatches(
        InterPHIDisambiguator.MEASUREMENT_INDICATORS,
        lowerContext,
      );
      altScore = measurementMatches * 0.4;
    }

    if (dateScore > altScore) {
      return {
        winner: "DATE",
        confidence: Math.min(0.95, 0.5 + dateScore),
        reason: "Date context indicators",
      };
    } else if (altScore > dateScore) {
      return {
        winner: alternativeType,
        confidence: Math.min(0.95, 0.5 + altScore),
        reason: `${alternativeType} context indicators`,
      };
    }

    return {
      winner: "DATE",
      confidence: 0.5,
      reason: "Ambiguous - defaulting to DATE",
    };
  }

  /**
   * Disambiguate between NAME and other interpretations
   */
  static disambiguateName(
    text: string,
    context: string,
    alternativeType: string,
  ): { winner: string; confidence: number; reason: string } {
    const lowerContext = context.toLowerCase();

    // Count matches using pre-compiled static patterns
    const nameMatches = InterPHIDisambiguator.countMatches(
      InterPHIDisambiguator.NAME_INDICATORS,
      lowerContext,
    );
    let nameScore = nameMatches * 0.3;
    let altScore = 0;

    if (alternativeType === "MEDICATION") {
      const medMatches = InterPHIDisambiguator.countMatches(
        InterPHIDisambiguator.MEDICATION_INDICATORS,
        lowerContext,
      );
      altScore = medMatches * 0.35;
    }

    if (alternativeType === "DIAGNOSIS") {
      const dxMatches = InterPHIDisambiguator.countMatches(
        InterPHIDisambiguator.DIAGNOSIS_INDICATORS,
        lowerContext,
      );
      altScore = dxMatches * 0.35;
    }

    if (nameScore > altScore) {
      return {
        winner: "NAME",
        confidence: Math.min(0.95, 0.5 + nameScore),
        reason: "Name context indicators",
      };
    } else if (altScore > nameScore) {
      return {
        winner: alternativeType,
        confidence: Math.min(0.95, 0.5 + altScore),
        reason: `${alternativeType} context indicators`,
      };
    }

    return {
      winner: "NAME",
      confidence: 0.5,
      reason: "Ambiguous - defaulting to NAME",
    };
  }
}
