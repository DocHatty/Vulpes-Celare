/**
 * Centralized Threshold Configuration
 *
 * Consolidates confidence thresholds, context window sizes, and other
 * numeric constants that were previously scattered across the codebase.
 *
 * This addresses M4: Priority/confidence thresholds scattered (magic numbers)
 *
 * Usage:
 *   import { Thresholds } from '../config/Thresholds';
 *   if (span.confidence >= Thresholds.confidence.MINIMUM) { ... }
 *
 * @module config/Thresholds
 */
/**
 * Confidence level thresholds for span scoring and filtering.
 *
 * These values determine when spans are kept/filtered at various pipeline stages.
 * Previously scattered as magic numbers like 0.6, 0.7, 0.85, 0.9, etc.
 */
export declare const ConfidenceThresholds: {
    /**
     * Very high confidence - used for structured patterns (SSN, MRN, etc.)
     * Rarely questioned, almost always real PHI.
     */
    readonly VERY_HIGH: 0.95;
    /**
     * High confidence - used for dictionary matches with strong context.
     * Reliable detections.
     */
    readonly HIGH: 0.9;
    /**
     * Medium confidence - used for pattern matches without strong context.
     * May need additional validation.
     */
    readonly MEDIUM: 0.85;
    /**
     * Low confidence - used for weak pattern matches or OCR-tolerant patterns.
     * Higher false positive risk.
     */
    readonly LOW: 0.7;
    /**
     * Minimum threshold for span retention.
     * Spans below this are filtered out by PostFilterService.
     * Also used as the decision threshold in ExplanationGenerator.
     */
    readonly MINIMUM: 0.6;
    /**
     * Threshold below which a span is definitely dropped.
     * Used for early-exit filtering.
     */
    readonly DROP: 0.5;
};
/**
 * Context extraction window sizes.
 *
 * Used for extracting surrounding text for context analysis.
 * Previously hardcoded as 50 in SpanBasedFilter.extractContext().
 */
export declare const ContextWindow: {
    /**
     * Characters to include before match for context extraction.
     */
    readonly LOOKBACK_CHARS: 50;
    /**
     * Characters to include after match for context extraction.
     */
    readonly LOOKAHEAD_CHARS: 50;
    /**
     * Number of tokens to include in span.window array.
     */
    readonly WINDOW_TOKENS: 5;
    /**
     * Maximum context size for heavy operations (embedding, etc.)
     */
    readonly MAX_CONTEXT_CHARS: 200;
};
/**
 * Thresholds for short name filtering.
 *
 * Short names (< 5 chars) without strong context are often false positives.
 */
export declare const ShortNameThresholds: {
    /**
     * Minimum name length before requiring higher confidence.
     */
    readonly MIN_LENGTH: 5;
    /**
     * Minimum confidence required for names shorter than MIN_LENGTH.
     */
    readonly MIN_CONFIDENCE_WHEN_SHORT: 0.9;
};
/**
 * Thresholds used at specific pipeline stages.
 */
export declare const PipelineThresholds: {
    /**
     * Minimum confidence for vector disambiguation service to consider a span.
     */
    readonly VECTOR_DISAMBIGUATION_MIN: 0.65;
    /**
     * Minimum confidence for cross-type reasoner to process.
     */
    readonly CROSS_TYPE_REASONER_MIN: 0.6;
    /**
     * Confidence boost for labeled field matches (e.g., "Name: John Smith")
     */
    readonly LABELED_FIELD_BOOST: 0.15;
    /**
     * Confidence penalty for matches in non-clinical context.
     */
    readonly NON_CLINICAL_PENALTY: 0.1;
    /**
     * Maximum confidence cap (never exceed 1.0).
     */
    readonly MAX_CONFIDENCE: 1;
};
/**
 * Thresholds for OCR error tolerance.
 */
export declare const OcrThresholds: {
    /**
     * Base confidence for OCR-tolerant pattern matches.
     * Lower than clean patterns because of higher false positive risk.
     */
    readonly BASE_CONFIDENCE: 0.7;
    /**
     * Confidence boost when multiple OCR patterns match consistently.
     */
    readonly MULTI_MATCH_BOOST: 0.1;
    /**
     * Maximum confidence for OCR-only matches (no clean pattern match).
     */
    readonly MAX_OCR_ONLY_CONFIDENCE: 0.85;
};
/**
 * Unified Thresholds export for convenient importing.
 *
 * @example
 * import { Thresholds } from '../config/Thresholds';
 * if (span.confidence >= Thresholds.confidence.MINIMUM) { ... }
 * const contextSize = Thresholds.context.LOOKBACK_CHARS;
 */
export declare const Thresholds: {
    readonly confidence: {
        /**
         * Very high confidence - used for structured patterns (SSN, MRN, etc.)
         * Rarely questioned, almost always real PHI.
         */
        readonly VERY_HIGH: 0.95;
        /**
         * High confidence - used for dictionary matches with strong context.
         * Reliable detections.
         */
        readonly HIGH: 0.9;
        /**
         * Medium confidence - used for pattern matches without strong context.
         * May need additional validation.
         */
        readonly MEDIUM: 0.85;
        /**
         * Low confidence - used for weak pattern matches or OCR-tolerant patterns.
         * Higher false positive risk.
         */
        readonly LOW: 0.7;
        /**
         * Minimum threshold for span retention.
         * Spans below this are filtered out by PostFilterService.
         * Also used as the decision threshold in ExplanationGenerator.
         */
        readonly MINIMUM: 0.6;
        /**
         * Threshold below which a span is definitely dropped.
         * Used for early-exit filtering.
         */
        readonly DROP: 0.5;
    };
    readonly context: {
        /**
         * Characters to include before match for context extraction.
         */
        readonly LOOKBACK_CHARS: 50;
        /**
         * Characters to include after match for context extraction.
         */
        readonly LOOKAHEAD_CHARS: 50;
        /**
         * Number of tokens to include in span.window array.
         */
        readonly WINDOW_TOKENS: 5;
        /**
         * Maximum context size for heavy operations (embedding, etc.)
         */
        readonly MAX_CONTEXT_CHARS: 200;
    };
    readonly shortName: {
        /**
         * Minimum name length before requiring higher confidence.
         */
        readonly MIN_LENGTH: 5;
        /**
         * Minimum confidence required for names shorter than MIN_LENGTH.
         */
        readonly MIN_CONFIDENCE_WHEN_SHORT: 0.9;
    };
    readonly pipeline: {
        /**
         * Minimum confidence for vector disambiguation service to consider a span.
         */
        readonly VECTOR_DISAMBIGUATION_MIN: 0.65;
        /**
         * Minimum confidence for cross-type reasoner to process.
         */
        readonly CROSS_TYPE_REASONER_MIN: 0.6;
        /**
         * Confidence boost for labeled field matches (e.g., "Name: John Smith")
         */
        readonly LABELED_FIELD_BOOST: 0.15;
        /**
         * Confidence penalty for matches in non-clinical context.
         */
        readonly NON_CLINICAL_PENALTY: 0.1;
        /**
         * Maximum confidence cap (never exceed 1.0).
         */
        readonly MAX_CONFIDENCE: 1;
    };
    readonly ocr: {
        /**
         * Base confidence for OCR-tolerant pattern matches.
         * Lower than clean patterns because of higher false positive risk.
         */
        readonly BASE_CONFIDENCE: 0.7;
        /**
         * Confidence boost when multiple OCR patterns match consistently.
         */
        readonly MULTI_MATCH_BOOST: 0.1;
        /**
         * Maximum confidence for OCR-only matches (no clean pattern match).
         */
        readonly MAX_OCR_ONLY_CONFIDENCE: 0.85;
    };
};
export type ConfidenceLevel = keyof typeof ConfidenceThresholds;
export type ContextWindowKey = keyof typeof ContextWindow;
//# sourceMappingURL=Thresholds.d.ts.map