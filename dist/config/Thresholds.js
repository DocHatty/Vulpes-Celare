"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Thresholds = exports.OcrThresholds = exports.PipelineThresholds = exports.ShortNameThresholds = exports.ContextWindow = exports.ConfidenceThresholds = void 0;
// =============================================================================
// CONFIDENCE THRESHOLDS
// =============================================================================
/**
 * Confidence level thresholds for span scoring and filtering.
 *
 * These values determine when spans are kept/filtered at various pipeline stages.
 * Previously scattered as magic numbers like 0.6, 0.7, 0.85, 0.9, etc.
 */
exports.ConfidenceThresholds = {
    /**
     * Very high confidence - used for structured patterns (SSN, MRN, etc.)
     * Rarely questioned, almost always real PHI.
     */
    VERY_HIGH: 0.95,
    /**
     * High confidence - used for dictionary matches with strong context.
     * Reliable detections.
     */
    HIGH: 0.90,
    /**
     * Medium confidence - used for pattern matches without strong context.
     * May need additional validation.
     */
    MEDIUM: 0.85,
    /**
     * Low confidence - used for weak pattern matches or OCR-tolerant patterns.
     * Higher false positive risk.
     */
    LOW: 0.70,
    /**
     * Minimum threshold for span retention.
     * Spans below this are filtered out by PostFilterService.
     * Also used as the decision threshold in ExplanationGenerator.
     */
    MINIMUM: 0.60,
    /**
     * Threshold below which a span is definitely dropped.
     * Used for early-exit filtering.
     */
    DROP: 0.50,
};
// =============================================================================
// CONTEXT WINDOW SIZES
// =============================================================================
/**
 * Context extraction window sizes.
 *
 * Used for extracting surrounding text for context analysis.
 * Previously hardcoded as 50 in SpanBasedFilter.extractContext().
 */
exports.ContextWindow = {
    /**
     * Characters to include before match for context extraction.
     */
    LOOKBACK_CHARS: 50,
    /**
     * Characters to include after match for context extraction.
     */
    LOOKAHEAD_CHARS: 50,
    /**
     * Number of tokens to include in span.window array.
     */
    WINDOW_TOKENS: 5,
    /**
     * Maximum context size for heavy operations (embedding, etc.)
     */
    MAX_CONTEXT_CHARS: 200,
};
// =============================================================================
// SHORT NAME HANDLING
// =============================================================================
/**
 * Thresholds for short name filtering.
 *
 * Short names (< 5 chars) without strong context are often false positives.
 */
exports.ShortNameThresholds = {
    /**
     * Minimum name length before requiring higher confidence.
     */
    MIN_LENGTH: 5,
    /**
     * Minimum confidence required for names shorter than MIN_LENGTH.
     */
    MIN_CONFIDENCE_WHEN_SHORT: 0.90,
};
// =============================================================================
// PIPELINE STAGE THRESHOLDS
// =============================================================================
/**
 * Thresholds used at specific pipeline stages.
 */
exports.PipelineThresholds = {
    /**
     * Minimum confidence for vector disambiguation service to consider a span.
     */
    VECTOR_DISAMBIGUATION_MIN: 0.65,
    /**
     * Minimum confidence for cross-type reasoner to process.
     */
    CROSS_TYPE_REASONER_MIN: 0.60,
    /**
     * Confidence boost for labeled field matches (e.g., "Name: John Smith")
     */
    LABELED_FIELD_BOOST: 0.15,
    /**
     * Confidence penalty for matches in non-clinical context.
     */
    NON_CLINICAL_PENALTY: 0.10,
    /**
     * Maximum confidence cap (never exceed 1.0).
     */
    MAX_CONFIDENCE: 1.0,
};
// =============================================================================
// OCR TOLERANCE THRESHOLDS
// =============================================================================
/**
 * Thresholds for OCR error tolerance.
 */
exports.OcrThresholds = {
    /**
     * Base confidence for OCR-tolerant pattern matches.
     * Lower than clean patterns because of higher false positive risk.
     */
    BASE_CONFIDENCE: 0.70,
    /**
     * Confidence boost when multiple OCR patterns match consistently.
     */
    MULTI_MATCH_BOOST: 0.10,
    /**
     * Maximum confidence for OCR-only matches (no clean pattern match).
     */
    MAX_OCR_ONLY_CONFIDENCE: 0.85,
};
// =============================================================================
// AGGREGATED EXPORT
// =============================================================================
/**
 * Unified Thresholds export for convenient importing.
 *
 * @example
 * import { Thresholds } from '../config/Thresholds';
 * if (span.confidence >= Thresholds.confidence.MINIMUM) { ... }
 * const contextSize = Thresholds.context.LOOKBACK_CHARS;
 */
exports.Thresholds = {
    confidence: exports.ConfidenceThresholds,
    context: exports.ContextWindow,
    shortName: exports.ShortNameThresholds,
    pipeline: exports.PipelineThresholds,
    ocr: exports.OcrThresholds,
};
//# sourceMappingURL=Thresholds.js.map