/**
 * Span Disambiguation Service - Vector-based disambiguation of ambiguous spans
 *
 * Solves the problem: Is "123-45-6789" an SSN or a phone number?
 * Uses context windows and cosine similarity to determine the correct type.
 *
 * Based on Phileas's VectorBasedSpanDisambiguationService with VulpesHIPPA adaptations.
 *
 * Example:
 * - "SSN is 123-45-6789" → high confidence it's SSN
 * - "called 123-45-6789" → high confidence it's phone
 *
 * @module redaction/services
 */
import { Span, FilterType } from "../models/Span";
/**
 * Span Disambiguation Service
 */
export declare class SpanDisambiguationService {
    private confidenceThreshold;
    constructor(confidenceThreshold?: number, _windowSize?: number);
    /**
     * Disambiguate a group of identical spans (same position, different types)
     * Returns the most likely FilterType based on context
     */
    disambiguate(spans: Span[]): Span | null;
    /**
     * Calculate context similarity score for a span
     * Uses cosine similarity between window and filter type keywords
     */
    private calculateContextScore;
    /**
     * Fallback disambiguation when context isn't conclusive
     * Uses confidence and priority
     */
    private fallbackDisambiguation;
    /**
     * Disambiguate all ambiguous span groups in a collection
     */
    disambiguateAll(spans: Span[]): Span[];
    /**
     * Check if a span text matches known ambiguous patterns
     */
    isAmbiguousPattern(text: string): FilterType[] | null;
    /**
     * Add custom context keywords for a filter type
     */
    addContextKeywords(filterType: FilterType, keywords: string[]): void;
    /**
     * Add custom ambiguous pattern
     */
    addAmbiguousPattern(pattern: string, types: FilterType[]): void;
    /**
     * Get confidence threshold
     */
    getConfidenceThreshold(): number;
    /**
     * Set confidence threshold
     */
    setConfidenceThreshold(threshold: number): void;
}
//# sourceMappingURL=SpanDisambiguationService.d.ts.map