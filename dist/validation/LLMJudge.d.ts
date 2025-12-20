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
export interface PHIDetection {
    /** The detected text */
    text: string;
    /** PHI type (NAME, DATE, SSN, etc.) */
    phiType: string;
    /** Detection confidence (0-1) */
    confidence: number;
    /** Surrounding context */
    context?: string;
    /** Start position in document */
    start?: number;
    /** End position in document */
    end?: number;
}
export interface JudgeVerdict {
    /** Whether the detection is valid */
    isValid: boolean;
    /** Confidence in the verdict (0-1) */
    confidence: number;
    /** Reasoning for the verdict */
    reasoning: string;
    /** Suggested correct PHI type (if different) */
    suggestedType?: string;
    /** Whether this appears to be a false positive */
    isFalsePositive: boolean;
    /** Whether this appears to be a partial match */
    isPartialMatch: boolean;
    /** Recommended action */
    recommendation: 'REDACT' | 'SKIP' | 'REVIEW';
}
export interface BatchResult {
    /** Total detections validated */
    total: number;
    /** Valid detections */
    valid: number;
    /** False positives identified */
    falsePositives: number;
    /** Detections needing review */
    needsReview: number;
    /** Individual verdicts */
    verdicts: Map<string, JudgeVerdict>;
    /** Processing time in ms */
    processingTime: number;
}
export interface LLMJudgeConfig {
    /** LLM provider (openai, anthropic, local) */
    provider: 'openai' | 'anthropic' | 'local' | 'mock';
    /** Model name */
    model: string;
    /** API key (from env if not provided) */
    apiKey?: string;
    /** Maximum concurrent requests */
    maxConcurrent: number;
    /** Timeout per request in ms */
    timeout: number;
    /** Minimum confidence to skip validation */
    skipThreshold: number;
    /** Cache verdicts */
    enableCache: boolean;
}
export declare class LLMJudge {
    private static instance;
    private config;
    private enabled;
    private cache;
    private constructor();
    static getInstance(config?: Partial<LLMJudgeConfig>): LLMJudge;
    /**
     * Reset instance (for testing)
     */
    static resetInstance(): void;
    private isEnabled;
    /**
     * Force enable/disable (useful for testing)
     */
    setEnabled(value: boolean): void;
    /**
     * Validate a single PHI detection
     */
    validate(detection: PHIDetection): Promise<JudgeVerdict>;
    /**
     * Validate multiple detections (batched for efficiency)
     */
    validateBatch(detections: PHIDetection[]): Promise<BatchResult>;
    /**
     * Get validation prompt for a detection
     */
    getPrompt(detection: PHIDetection): string;
    /**
     * Clear the verdict cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
    private getCacheKey;
    private createDefaultVerdict;
    private callLLM;
    /**
     * Mock LLM call for testing/demo
     */
    private mockLLMCall;
    /**
     * Simple heuristic validation for mock mode
     */
    private heuristicValidation;
    /**
     * Call OpenAI API (stub - would need actual implementation)
     */
    private callOpenAI;
    /**
     * Call Anthropic API (stub - would need actual implementation)
     */
    private callAnthropic;
    /**
     * Call local LLM (stub - would need actual implementation)
     */
    private callLocal;
}
export declare const llmJudge: LLMJudge;
//# sourceMappingURL=LLMJudge.d.ts.map