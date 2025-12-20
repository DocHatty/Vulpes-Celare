"use strict";
/**
 * LLMJudge - LLM-as-Judge Validation for PHI Detection
 *
 * Uses a language model to validate PHI detection decisions.
 * This provides automated QA for edge cases and uncertain detections.
 *
 * Key capabilities:
 * - Validate individual PHI detections
 * - Batch validation for efficiency
 * - Confidence calibration feedback
 * - False positive/negative identification
 *
 * Feature-flagged via VULPES_LLM_JUDGE environment variable.
 *
 * @module validation/LLMJudge
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmJudge = exports.LLMJudge = void 0;
const DEFAULT_CONFIG = {
    provider: 'mock',
    model: 'gpt-4o-mini',
    maxConcurrent: 5,
    timeout: 30000,
    skipThreshold: 0.95,
    enableCache: true,
};
/**
 * Prompt template for PHI validation
 */
const VALIDATION_PROMPT = `You are a HIPAA compliance expert validating PHI detection.

Analyze the following detection and determine if it correctly identifies Protected Health Information (PHI).

Detection:
- Text: "{text}"
- Claimed PHI Type: {phiType}
- Detection Confidence: {confidence}
- Context: "{context}"

Respond with a JSON object:
{
  "isValid": boolean,       // Is this correctly identified PHI?
  "confidence": number,     // Your confidence (0-1)
  "reasoning": string,      // Brief explanation
  "isFalsePositive": boolean, // Is this a false positive?
  "isPartialMatch": boolean,  // Is only part of the text PHI?
  "suggestedType": string | null, // Correct type if misclassified
  "recommendation": "REDACT" | "SKIP" | "REVIEW"
}

Consider:
- Is "{text}" actually a {phiType}?
- Could this be a medical term, organization name, or other non-PHI?
- Does the context support or contradict this being PHI?
- Is the full PHI captured or only a fragment?`;
class LLMJudge {
    static instance;
    config;
    enabled;
    cache = new Map();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.enabled = this.isEnabled();
    }
    static getInstance(config) {
        if (!LLMJudge.instance) {
            LLMJudge.instance = new LLMJudge(config);
        }
        return LLMJudge.instance;
    }
    /**
     * Reset instance (for testing)
     */
    static resetInstance() {
        LLMJudge.instance = undefined;
    }
    isEnabled() {
        const envValue = process.env.VULPES_LLM_JUDGE;
        return envValue === '1' || envValue === 'true';
    }
    /**
     * Force enable/disable (useful for testing)
     */
    setEnabled(value) {
        this.enabled = value;
    }
    /**
     * Validate a single PHI detection
     */
    async validate(detection) {
        // Skip if disabled or high confidence
        if (!this.enabled || detection.confidence >= this.config.skipThreshold) {
            return this.createDefaultVerdict(detection, true);
        }
        // Check cache
        const cacheKey = this.getCacheKey(detection);
        if (this.config.enableCache && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        // Call LLM
        const verdict = await this.callLLM(detection);
        // Cache result
        if (this.config.enableCache) {
            this.cache.set(cacheKey, verdict);
        }
        return verdict;
    }
    /**
     * Validate multiple detections (batched for efficiency)
     */
    async validateBatch(detections) {
        const startTime = Date.now();
        const verdicts = new Map();
        let valid = 0;
        let falsePositives = 0;
        let needsReview = 0;
        // Process in batches to respect rate limits
        const batchSize = this.config.maxConcurrent;
        for (let i = 0; i < detections.length; i += batchSize) {
            const batch = detections.slice(i, i + batchSize);
            const results = await Promise.all(batch.map(d => this.validate(d)));
            for (let j = 0; j < batch.length; j++) {
                const detection = batch[j];
                const verdict = results[j];
                const key = `${detection.start}-${detection.end}-${detection.text}`;
                verdicts.set(key, verdict);
                if (verdict.isValid)
                    valid++;
                if (verdict.isFalsePositive)
                    falsePositives++;
                if (verdict.recommendation === 'REVIEW')
                    needsReview++;
            }
        }
        return {
            total: detections.length,
            valid,
            falsePositives,
            needsReview,
            verdicts,
            processingTime: Date.now() - startTime,
        };
    }
    /**
     * Get validation prompt for a detection
     */
    getPrompt(detection) {
        return VALIDATION_PROMPT
            .replace('{text}', detection.text)
            .replace(/{phiType}/g, detection.phiType)
            .replace('{confidence}', detection.confidence.toFixed(2))
            .replace('{context}', detection.context || 'No context available');
    }
    /**
     * Clear the verdict cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            hitRate: 0, // Would need to track hits/misses for real implementation
        };
    }
    // ============ Private Methods ============
    getCacheKey(detection) {
        return `${detection.text}:${detection.phiType}:${detection.context?.substring(0, 50)}`;
    }
    createDefaultVerdict(detection, isValid) {
        return {
            isValid,
            confidence: detection.confidence,
            reasoning: isValid
                ? 'High confidence detection - validation skipped'
                : 'Detection validation required',
            isFalsePositive: false,
            isPartialMatch: false,
            recommendation: isValid ? 'REDACT' : 'REVIEW',
        };
    }
    async callLLM(detection) {
        const prompt = this.getPrompt(detection);
        switch (this.config.provider) {
            case 'mock':
                return this.mockLLMCall(detection);
            case 'openai':
                return this.callOpenAI(prompt, detection);
            case 'anthropic':
                return this.callAnthropic(prompt, detection);
            case 'local':
                return this.callLocal(prompt, detection);
            default:
                return this.mockLLMCall(detection);
        }
    }
    /**
     * Mock LLM call for testing/demo
     */
    async mockLLMCall(detection) {
        // Simulate latency
        await new Promise(resolve => setTimeout(resolve, 10));
        // Simple heuristic-based mock validation
        const isLikelyValid = this.heuristicValidation(detection);
        return {
            isValid: isLikelyValid,
            confidence: isLikelyValid ? 0.85 : 0.7,
            reasoning: isLikelyValid
                ? `"${detection.text}" appears to be a valid ${detection.phiType}`
                : `"${detection.text}" may not be a ${detection.phiType}`,
            isFalsePositive: !isLikelyValid && detection.confidence > 0.7,
            isPartialMatch: false,
            recommendation: isLikelyValid ? 'REDACT' : 'REVIEW',
        };
    }
    /**
     * Simple heuristic validation for mock mode
     */
    heuristicValidation(detection) {
        const { text, phiType } = detection;
        switch (phiType) {
            case 'NAME':
                // Names should be 2+ words or title case
                return text.includes(' ') || /^[A-Z][a-z]+$/.test(text);
            case 'DATE':
                // Should look like a date
                return /\d/.test(text) && (text.includes('/') || text.includes('-') || /[a-zA-Z]/.test(text));
            case 'SSN':
                // Should have 9 digits
                return text.replace(/\D/g, '').length === 9;
            case 'PHONE':
                // Should have 10 digits
                return text.replace(/\D/g, '').length >= 10;
            case 'EMAIL':
                // Should contain @
                return text.includes('@');
            case 'ADDRESS':
                // Should have numbers and words
                return /\d/.test(text) && /[a-zA-Z]/.test(text);
            default:
                // Default to valid
                return true;
        }
    }
    /**
     * Call OpenAI API (stub - would need actual implementation)
     */
    async callOpenAI(_prompt, detection) {
        // In production, this would call the OpenAI API
        // For now, fall back to mock
        console.warn('OpenAI integration not implemented, using mock');
        return this.mockLLMCall(detection);
    }
    /**
     * Call Anthropic API (stub - would need actual implementation)
     */
    async callAnthropic(_prompt, detection) {
        // In production, this would call the Anthropic API
        // For now, fall back to mock
        console.warn('Anthropic integration not implemented, using mock');
        return this.mockLLMCall(detection);
    }
    /**
     * Call local LLM (stub - would need actual implementation)
     */
    async callLocal(_prompt, detection) {
        // In production, this would call a local LLM
        // For now, fall back to mock
        console.warn('Local LLM integration not implemented, using mock');
        return this.mockLLMCall(detection);
    }
}
exports.LLMJudge = LLMJudge;
// Singleton export
exports.llmJudge = LLMJudge.getInstance();
//# sourceMappingURL=LLMJudge.js.map