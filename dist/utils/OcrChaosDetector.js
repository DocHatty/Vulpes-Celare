"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrChaosDetector = void 0;
const binding_1 = require("../native/binding");
const RustAccelConfig_1 = require("../config/RustAccelConfig");
// Cache the native binding
let cachedBinding = undefined;
function getBinding() {
    if (cachedBinding !== undefined)
        return cachedBinding;
    try {
        cachedBinding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
    }
    catch {
        cachedBinding = null;
    }
    return cachedBinding;
}
function isChaosAccelEnabled() {
    return RustAccelConfig_1.RustAccelConfig.isChaosEnabled();
}
class OcrChaosDetector {
    /** Cache of analyzed documents to avoid re-computation */
    static analysisCache = new Map();
    static CACHE_MAX_SIZE = 100;
    static CONTEXT_CACHE_KEY = "OcrChaosDetector:analysis";
    // Mathematical constants
    static LOG2 = Math.log(2);
    static EPSILON = 1e-10;
    /**
     * Sigmoid function for smooth threshold transitions
     * Formula: sigmoid(x) = 1 / (1 + exp(-x))
     */
    static sigmoid(x) {
        if (x >= 0) {
            return 1 / (1 + Math.exp(-x));
        }
        else {
            const expX = Math.exp(x);
            return expX / (1 + expX);
        }
    }
    /**
     * Calculate Shannon entropy of character distribution
     * Formula: H = -sum(p_i * log2(p_i))
     * Returns normalized entropy in [0, 1] where 1 = maximum randomness
     * Reference: Shannon (1948)
     */
    static calculateCharacterEntropy(text) {
        if (text.length === 0)
            return 0;
        // Count character frequencies
        const charCounts = new Map();
        for (const char of text) {
            charCounts.set(char, (charCounts.get(char) || 0) + 1);
        }
        // Calculate entropy
        let entropy = 0;
        const total = text.length;
        for (const count of charCounts.values()) {
            const p = count / total;
            if (p > OcrChaosDetector.EPSILON) {
                entropy -= (p * Math.log(p)) / OcrChaosDetector.LOG2;
            }
        }
        // Normalize by maximum possible entropy (log2 of alphabet size)
        // For typical text, use 96 printable ASCII characters as reference
        const maxEntropy = Math.log(96) / OcrChaosDetector.LOG2;
        return Math.min(1.0, entropy / maxEntropy);
    }
    /**
     * Analyze a document/text block for OCR chaos indicators
     * Uses entropy-based scoring combined with pattern detection
     */
    static analyze(text, context) {
        if (context) {
            const existing = context.getMemo(this.CONTEXT_CACHE_KEY);
            if (existing && existing.text === text)
                return existing.analysis;
        }
        // Try Rust accelerator first
        if (isChaosAccelEnabled()) {
            const binding = getBinding();
            if (binding?.analyzeChaos) {
                try {
                    const rustResult = binding.analyzeChaos(text);
                    // Convert Rust result to TypeScript interface
                    const analysis = {
                        score: rustResult.score,
                        indicators: {
                            digitSubstitutions: rustResult.indicators.digitSubstitutions,
                            caseChaosFactor: rustResult.indicators.caseChaosFactor,
                            spacingAnomalies: rustResult.indicators.spacingAnomalies,
                            charCorruption: rustResult.indicators.charCorruption,
                        },
                        recommendedThreshold: rustResult.recommendedThreshold,
                        enableLabelBoost: rustResult.enableLabelBoost,
                        quality: rustResult.quality,
                    };
                    if (context) {
                        context.setMemo(this.CONTEXT_CACHE_KEY, { text, analysis });
                    }
                    return analysis;
                }
                catch {
                    // Fall back to TS implementation
                }
            }
        }
        let cacheKey = "";
        if (!context) {
            // Check cache first (use first 500 chars as key)
            cacheKey = text.substring(0, 500);
            if (this.analysisCache.has(cacheKey)) {
                return this.analysisCache.get(cacheKey);
            }
        }
        const indicators = {
            digitSubstitutions: this.measureDigitSubstitutions(text),
            caseChaosFactor: this.measureCaseChaos(text),
            spacingAnomalies: this.measureSpacingAnomalies(text),
            charCorruption: this.measureCharCorruption(text),
        };
        // Calculate character entropy as additional indicator
        const charEntropy = this.calculateCharacterEntropy(text);
        // Weighted combination of indicators using empirically-derived weights
        // Weights based on OCR error analysis research:
        // - Digit substitutions are most indicative of OCR errors (0.30)
        // - Case chaos strongly indicates poor scan quality (0.25)
        // - Spacing anomalies are common in scanned docs (0.20)
        // - Character corruption is less common but significant (0.15)
        // - High entropy suggests noise/corruption (0.10)
        const weights = {
            digitSubstitutions: 0.3,
            caseChaosFactor: 0.25,
            spacingAnomalies: 0.2,
            charCorruption: 0.15,
            entropy: 0.1,
        };
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        const score = Math.min(1.0, ((indicators.digitSubstitutions * weights.digitSubstitutions +
            indicators.caseChaosFactor * weights.caseChaosFactor +
            indicators.spacingAnomalies * weights.spacingAnomalies +
            indicators.charCorruption * weights.charCorruption +
            charEntropy * weights.entropy) /
            totalWeight) *
            totalWeight); // Normalize to original scale
        const analysis = {
            score,
            indicators,
            recommendedThreshold: this.calculateThreshold(score),
            enableLabelBoost: score > 0.3,
            quality: this.classifyQuality(score),
        };
        if (context) {
            context.setMemo(this.CONTEXT_CACHE_KEY, { text, analysis });
        }
        else {
            // Cache the result
            if (this.analysisCache.size >= this.CACHE_MAX_SIZE) {
                // Clear oldest entries
                const keys = Array.from(this.analysisCache.keys());
                for (let i = 0; i < 20; i++) {
                    this.analysisCache.delete(keys[i]);
                }
            }
            this.analysisCache.set(cacheKey, analysis);
        }
        return analysis;
    }
    /**
     * Get confidence weights adjusted for document chaos level
     */
    static getConfidenceWeights(chaosScore) {
        // Try Rust accelerator first
        if (isChaosAccelEnabled()) {
            const binding = getBinding();
            if (binding?.getConfidenceWeights) {
                try {
                    const rustResult = binding.getConfidenceWeights(chaosScore);
                    return {
                        properCase: rustResult.properCase,
                        allCaps: rustResult.allCaps,
                        allLower: rustResult.allLower,
                        chaosCase: rustResult.chaosCase,
                        labelBoost: rustResult.labelBoost,
                    };
                }
                catch {
                    // Fall back to TS implementation
                }
            }
        }
        // Base weights for clean documents
        const baseWeights = {
            properCase: 0.95,
            allCaps: 0.9,
            allLower: 0.8,
            chaosCase: 0.5, // Very low for clean docs - chaos case is suspicious
            labelBoost: 0.1,
        };
        // Adjust weights based on chaos - higher chaos = more tolerance for weird patterns
        if (chaosScore > 0.5) {
            // Chaotic document - be very permissive
            return {
                properCase: 0.9,
                allCaps: 0.88,
                allLower: 0.85,
                chaosCase: 0.75, // Much higher - chaos case is EXPECTED
                labelBoost: 0.2, // Strong boost from labels
            };
        }
        else if (chaosScore > 0.2) {
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
    static calculateNameConfidence(name, chaosScore, hasLabel = false) {
        // Try Rust accelerator first
        if (isChaosAccelEnabled()) {
            const binding = getBinding();
            if (binding?.calculateNameConfidence) {
                try {
                    return binding.calculateNameConfidence(name, chaosScore, hasLabel);
                }
                catch {
                    // Fall back to TS implementation
                }
            }
        }
        const weights = this.getConfidenceWeights(chaosScore);
        const casePattern = this.classifyCasePattern(name);
        let baseConfidence;
        switch (casePattern) {
            case "PROPER":
                baseConfidence = weights.properCase;
                break;
            case "ALL_CAPS":
                baseConfidence = weights.allCaps;
                break;
            case "ALL_LOWER":
                baseConfidence = weights.allLower;
                break;
            case "CHAOS":
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
    static classifyCasePattern(name) {
        // Try Rust accelerator first
        if (isChaosAccelEnabled()) {
            const binding = getBinding();
            if (binding?.classifyCasePattern) {
                try {
                    return binding.classifyCasePattern(name);
                }
                catch {
                    // Fall back to TS implementation
                }
            }
        }
        const words = name.trim().split(/\s+/);
        // Check if all caps
        if (/^[A-Z\s.,'-]+$/.test(name) && /[A-Z]/.test(name)) {
            return "ALL_CAPS";
        }
        // Check if all lowercase
        if (/^[a-z\s.,'-]+$/.test(name) && /[a-z]/.test(name)) {
            return "ALL_LOWER";
        }
        // Check if proper case (each word starts with capital, rest lowercase)
        const isProperCase = words.every((word) => {
            const cleaned = word.replace(/[.,'-]/g, "");
            if (cleaned.length === 0)
                return true;
            // Allow middle initials like "J."
            if (cleaned.length === 1)
                return /^[A-Z]$/.test(cleaned);
            // Standard word should be Capital + lowercase
            return /^[A-Z][a-z]+$/.test(cleaned);
        });
        if (isProperCase) {
            return "PROPER";
        }
        return "CHAOS";
    }
    // ============ Private measurement methods ============
    /**
     * Measure digit-for-letter substitutions
     * Higher score = more OCR digit substitutions detected
     */
    static measureDigitSubstitutions(text) {
        // Common OCR substitutions in names/words
        const substitutionPatterns = [
            /[a-zA-Z]0[a-zA-Z]/g, // 0 for O in middle of word
            /[a-zA-Z]1[a-zA-Z]/g, // 1 for l/I in middle of word
            /[a-zA-Z]5[a-zA-Z]/g, // 5 for S in middle of word
            /[a-zA-Z]8[a-zA-Z]/g, // 8 for B in middle of word
            /[a-zA-Z]6[a-zA-Z]/g, // 6 for G in middle of word
            /[a-zA-Z]4[a-zA-Z]/g, // 4 for A in middle of word
            /[a-zA-Z]3[a-zA-Z]/g, // 3 for E in middle of word
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
    static measureCaseChaos(text) {
        // Find words with mixed case that aren't proper case
        const words = text.match(/[a-zA-Z]{3,}/g) || [];
        let chaosWords = 0;
        for (const word of words) {
            // Skip if all caps or all lower
            if (/^[A-Z]+$/.test(word) || /^[a-z]+$/.test(word))
                continue;
            // Skip if proper case (Capital + lowercase)
            if (/^[A-Z][a-z]+$/.test(word))
                continue;
            // Skip if camelCase (common in code/IDs)
            if (/^[a-z]+[A-Z]/.test(word))
                continue;
            // This is chaos case
            chaosWords++;
        }
        return Math.min(1.0, (chaosWords / Math.max(1, words.length)) * 3);
    }
    /**
     * Measure spacing anomalies
     */
    static measureSpacingAnomalies(text) {
        let anomalies = 0;
        // Multiple consecutive spaces (beyond 2)
        const multiSpaces = text.match(/\s{3,}/g);
        if (multiSpaces)
            anomalies += multiSpaces.length;
        // Space before punctuation
        const spacePunc = text.match(/\s[.,;:!?]/g);
        if (spacePunc)
            anomalies += spacePunc.length;
        // Letter-space-letter in middle of apparent words
        const brokenWords = text.match(/[a-zA-Z]\s[a-zA-Z](?=[a-zA-Z])/g);
        if (brokenWords)
            anomalies += brokenWords.length;
        // Normalize
        return Math.min(1.0, anomalies / Math.max(10, text.length / 50));
    }
    /**
     * Measure character corruption indicators
     */
    static measureCharCorruption(text) {
        let corruption = 0;
        // Unusual character sequences that suggest OCR errors
        const unusualPatterns = [
            /[|!]{2,}/g, // Multiple pipes/bangs (often corrupted l/I)
            /[()]{2,}/g, // Multiple parens (corrupted chars)
            /[{}]{2,}/g, // Braces (unlikely in medical text)
            /[$@#]{2,}/g, // Special chars in sequence
        ];
        for (const pattern of unusualPatterns) {
            const matches = text.match(pattern);
            if (matches)
                corruption += matches.length;
        }
        return Math.min(1.0, corruption / Math.max(5, text.length / 100));
    }
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
    static calculateThreshold(chaosScore) {
        const maxThreshold = 0.85; // Threshold for clean documents
        const minThreshold = 0.55; // Threshold for chaotic documents
        const k = 8.0; // Steepness parameter
        const midpoint = 0.35; // Center of transition
        // Sigmoid maps chaos score to [0, 1], then we interpolate thresholds
        const sigmoidValue = this.sigmoid(k * (chaosScore - midpoint));
        // Higher chaos -> higher sigmoid -> lower threshold
        const threshold = maxThreshold - (maxThreshold - minThreshold) * sigmoidValue;
        // Round to 2 decimal places for cleaner values
        return Math.round(threshold * 100) / 100;
    }
    /**
     * Classify overall document quality
     */
    static classifyQuality(score) {
        if (score < 0.15)
            return "CLEAN";
        if (score < 0.35)
            return "NOISY";
        if (score < 0.6)
            return "DEGRADED";
        return "CHAOTIC";
    }
    /**
     * Clear the analysis cache (useful for testing)
     */
    static clearCache() {
        this.analysisCache.clear();
    }
}
exports.OcrChaosDetector = OcrChaosDetector;
//# sourceMappingURL=OcrChaosDetector.js.map