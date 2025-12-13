/**
 * OcrChaosDetector - Adaptive Document Quality Assessment
 *
 * Measures OCR quality and text corruption to enable adaptive detection thresholds.
 * Documents with higher chaos scores should use more permissive matching patterns.
 *
 * RUST ACCELERATION:
 * When VULPES_CHAOS_ACCEL is enabled (default), uses Rust native implementation
 * for 5-15x speedup. Set VULPES_CHAOS_ACCEL=0 to disable.
 *
 * MATHEMATICAL FOUNDATION:
 * 1. Shannon Entropy - Measures character distribution randomness
 *    Formula: H = -sum(p_i * log2(p_i)) where p_i = frequency of character i
 *    Reference: Shannon (1948) "A Mathematical Theory of Communication"
 *
 * 2. Weighted Chaos Score - Combines multiple indicators with empirical weights
 *    Formula: score = sum(w_i * indicator_i) / sum(w_i)
 *    Weights derived from OCR error analysis literature
 *
 * 3. Sigmoid Threshold Mapping - Smooth threshold adjustment
 *    Formula: threshold = base - (base - min) * sigmoid(k * (score - midpoint))
 *    Provides smooth transition between threshold levels
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
    quality: "CLEAN" | "NOISY" | "DEGRADED" | "CHAOTIC";
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
export declare class OcrChaosDetector {
    /** Cache of analyzed documents to avoid re-computation */
    private static analysisCache;
    private static readonly CACHE_MAX_SIZE;
    private static readonly LOG2;
    private static readonly EPSILON;
    /**
     * Sigmoid function for smooth threshold transitions
     * Formula: sigmoid(x) = 1 / (1 + exp(-x))
     */
    private static sigmoid;
    /**
     * Calculate Shannon entropy of character distribution
     * Formula: H = -sum(p_i * log2(p_i))
     * Returns normalized entropy in [0, 1] where 1 = maximum randomness
     * Reference: Shannon (1948)
     */
    private static calculateCharacterEntropy;
    /**
     * Analyze a document/text block for OCR chaos indicators
     * Uses entropy-based scoring combined with pattern detection
     */
    static analyze(text: string): ChaosAnalysis;
    /**
     * Get confidence weights adjusted for document chaos level
     */
    static getConfidenceWeights(chaosScore: number): ConfidenceWeights;
    /**
     * Calculate confidence for a specific name match based on its case pattern
     */
    static calculateNameConfidence(name: string, chaosScore: number, hasLabel?: boolean): number;
    /**
     * Classify the case pattern of a name
     */
    static classifyCasePattern(name: string): "PROPER" | "ALL_CAPS" | "ALL_LOWER" | "CHAOS";
    /**
     * Measure digit-for-letter substitutions
     * Higher score = more OCR digit substitutions detected
     */
    private static measureDigitSubstitutions;
    /**
     * Measure case chaos (inconsistent capitalization within words)
     */
    private static measureCaseChaos;
    /**
     * Measure spacing anomalies
     */
    private static measureSpacingAnomalies;
    /**
     * Measure character corruption indicators
     */
    private static measureCharCorruption;
    /**
     * Calculate recommended confidence threshold based on chaos score
     * Uses sigmoid function for smooth transitions between threshold levels
     *
     * Formula: threshold = maxThreshold - (maxThreshold - minThreshold) * sigmoid(k * (score - midpoint))
     * Parameters:
     *   - maxThreshold = 0.85 (clean documents)
     *   - minThreshold = 0.55 (chaotic documents)
     *   - k = 8.0 (steepness of transition)
     *   - midpoint = 0.35 (center of transition zone)
     */
    private static calculateThreshold;
    /**
     * Classify overall document quality
     */
    private static classifyQuality;
    /**
     * Clear the analysis cache (useful for testing)
     */
    static clearCache(): void;
}
//# sourceMappingURL=OcrChaosDetector.d.ts.map