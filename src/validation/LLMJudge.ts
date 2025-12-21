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

import { vulpesLogger } from "../utils/VulpesLogger";

const log = vulpesLogger.forComponent("LLMJudge");

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

const DEFAULT_CONFIG: LLMJudgeConfig = {
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

export class LLMJudge {
  private static instance: LLMJudge;
  private config: LLMJudgeConfig;
  private enabled: boolean;
  private cache: Map<string, JudgeVerdict> = new Map();

  private constructor(config: Partial<LLMJudgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.enabled = this.isEnabled();
  }

  static getInstance(config?: Partial<LLMJudgeConfig>): LLMJudge {
    if (!LLMJudge.instance) {
      LLMJudge.instance = new LLMJudge(config);
    }
    return LLMJudge.instance;
  }

  /**
   * Reset instance (for testing)
   */
  static resetInstance(): void {
    LLMJudge.instance = undefined as any;
  }

  private isEnabled(): boolean {
    const envValue = process.env.VULPES_LLM_JUDGE;
    return envValue === '1' || envValue === 'true';
  }

  /**
   * Force enable/disable (useful for testing)
   */
  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  /**
   * Validate a single PHI detection
   */
  async validate(detection: PHIDetection): Promise<JudgeVerdict> {
    // Skip if disabled or high confidence
    if (!this.enabled || detection.confidence >= this.config.skipThreshold) {
      return this.createDefaultVerdict(detection, true);
    }

    // Check cache
    const cacheKey = this.getCacheKey(detection);
    if (this.config.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
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
  async validateBatch(detections: PHIDetection[]): Promise<BatchResult> {
    const startTime = Date.now();
    const verdicts = new Map<string, JudgeVerdict>();
    let valid = 0;
    let falsePositives = 0;
    let needsReview = 0;

    // Process in batches to respect rate limits
    const batchSize = this.config.maxConcurrent;
    for (let i = 0; i < detections.length; i += batchSize) {
      const batch = detections.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(d => this.validate(d))
      );

      for (let j = 0; j < batch.length; j++) {
        const detection = batch[j];
        const verdict = results[j];
        const key = `${detection.start}-${detection.end}-${detection.text}`;

        verdicts.set(key, verdict);

        if (verdict.isValid) valid++;
        if (verdict.isFalsePositive) falsePositives++;
        if (verdict.recommendation === 'REVIEW') needsReview++;
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
  getPrompt(detection: PHIDetection): string {
    return VALIDATION_PROMPT
      .replace('{text}', detection.text)
      .replace(/{phiType}/g, detection.phiType)
      .replace('{confidence}', detection.confidence.toFixed(2))
      .replace('{context}', detection.context || 'No context available');
  }

  /**
   * Clear the verdict cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for real implementation
    };
  }

  // ============ Private Methods ============

  private getCacheKey(detection: PHIDetection): string {
    return `${detection.text}:${detection.phiType}:${detection.context?.substring(0, 50)}`;
  }

  private createDefaultVerdict(detection: PHIDetection, isValid: boolean): JudgeVerdict {
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

  private async callLLM(detection: PHIDetection): Promise<JudgeVerdict> {
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
  private async mockLLMCall(detection: PHIDetection): Promise<JudgeVerdict> {
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
  private heuristicValidation(detection: PHIDetection): boolean {
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
  private async callOpenAI(_prompt: string, detection: PHIDetection): Promise<JudgeVerdict> {
    // In production, this would call the OpenAI API
    // For now, fall back to mock
    log.warn("OpenAI integration not implemented, using mock");
    return this.mockLLMCall(detection);
  }

  /**
   * Call Anthropic API (stub - would need actual implementation)
   */
  private async callAnthropic(_prompt: string, detection: PHIDetection): Promise<JudgeVerdict> {
    // In production, this would call the Anthropic API
    // For now, fall back to mock
    log.warn("Anthropic integration not implemented, using mock");
    return this.mockLLMCall(detection);
  }

  /**
   * Call local LLM (stub - would need actual implementation)
   */
  private async callLocal(_prompt: string, detection: PHIDetection): Promise<JudgeVerdict> {
    // In production, this would call a local LLM
    // For now, fall back to mock
    log.warn("Local LLM integration not implemented, using mock");
    return this.mockLLMCall(detection);
  }
}

// Singleton export
export const llmJudge = LLMJudge.getInstance();
