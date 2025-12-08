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
export interface VoteSignal {
    source: "PATTERN" | "DICTIONARY" | "CONTEXT" | "STRUCTURE" | "LABEL" | "CHAOS_ADJUSTED";
    weight: number;
    confidence: number;
    reason: string;
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
export declare class EnsembleVoter {
    private config;
    private readonly cache;
    private static readonly EPSILON;
    private static readonly LOG2;
    constructor(config?: Partial<VotingConfig>);
    /**
     * Sigmoid function: maps (-inf, inf) -> (0, 1)
     * Formula: sigmoid(x) = 1 / (1 + exp(-x))
     * Used for Bayesian posterior calculation
     */
    private static sigmoid;
    /**
     * Logit function: inverse of sigmoid, maps (0, 1) -> (-inf, inf)
     * Formula: logit(p) = ln(p / (1 - p))
     * Converts probability to log-odds for linear combination
     */
    private static logit;
    /**
     * Calculate Shannon entropy for agreement measurement
     * Formula: H = -sum(p_i * log2(p_i)) for i in {positive, negative}
     * Returns normalized entropy in [0, 1] where 0 = full agreement, 1 = maximum disagreement
     *
     * PERFORMANCE: Results are cached via ComputationCache
     */
    private normalizedEntropy;
    /**
     * Weighted Geometric Mean combination
     * Formula: exp(sum(w_i * ln(c_i)) / sum(w_i))
     * More robust than arithmetic mean for probabilities - penalizes extreme disagreement
     * Reference: Genest & Zidek (1986)
     */
    private weightedGeometricMean;
    /**
     * Bayesian Log-Odds combination
     * Formula: sigmoid(sum(w_i * logit(c_i)) / sum(w_i) + logit(prior))
     * Theoretically principled probability combination with prior integration
     * Reference: Good (1950)
     */
    private bayesianLogOddsCombination;
    /**
     * Calculate agreement bonus/penalty based on Shannon entropy
     * High agreement (low entropy) -> boost, High disagreement (high entropy) -> penalty
     */
    private calculateAgreementMultiplier;
    /**
     * Combine multiple detection signals into a single vote
     * Uses either weighted geometric mean or Bayesian log-odds based on config
     */
    vote(signals: VoteSignal[]): EnsembleVote;
    /**
     * Create a PATTERN signal
     */
    static patternSignal(confidence: number, patternName: string): VoteSignal;
    /**
     * Create a DICTIONARY signal
     */
    static dictionarySignal(confidence: number, dictionaryType: string, fuzzyMatch?: boolean): VoteSignal;
    /**
     * Create a CONTEXT signal
     */
    static contextSignal(confidence: number, contextType: string): VoteSignal;
    /**
     * Create a STRUCTURE signal
     */
    static structureSignal(confidence: number, position: string): VoteSignal;
    /**
     * Create a LABEL signal
     */
    static labelSignal(confidence: number, labelText: string): VoteSignal;
    /**
     * Create a CHAOS_ADJUSTED signal
     */
    static chaosSignal(confidence: number, chaosLevel: string): VoteSignal;
    /**
     * Convenience method to vote with common signal types
     */
    quickVote(options: {
        patternMatch?: {
            confidence: number;
            name: string;
        };
        dictionaryMatch?: {
            confidence: number;
            type: string;
            fuzzy?: boolean;
        };
        contextMatch?: {
            confidence: number;
            type: string;
        };
        labelMatch?: {
            confidence: number;
            label: string;
        };
        structureMatch?: {
            confidence: number;
            position: string;
        };
        chaosAdjustment?: {
            confidence: number;
            level: string;
        };
    }): EnsembleVote;
    private generateExplanation;
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
export declare class InterPHIDisambiguator {
    private static readonly DATE_INDICATORS;
    private static readonly AGE_INDICATORS;
    private static readonly MEASUREMENT_INDICATORS;
    private static readonly NAME_INDICATORS;
    private static readonly MEDICATION_INDICATORS;
    private static readonly DIAGNOSIS_INDICATORS;
    /**
     * Count pattern matches against context
     */
    private static countMatches;
    /**
     * Disambiguate between DATE and other interpretations
     */
    static disambiguateDate(text: string, context: string, alternativeType: string): {
        winner: string;
        confidence: number;
        reason: string;
    };
    /**
     * Disambiguate between NAME and other interpretations
     */
    static disambiguateName(text: string, context: string, alternativeType: string): {
        winner: string;
        confidence: number;
        reason: string;
    };
}
//# sourceMappingURL=EnsembleVoter.d.ts.map