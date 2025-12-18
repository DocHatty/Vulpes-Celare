/**
 * ML Module - Machine Learning Integration for Vulpes Celare
 *
 * This module provides ML-based PHI detection and processing:
 * - GLiNER: Zero-shot name detection
 * - TinyBERT: Confidence re-ranking for borderline detections
 * - FP Classifier: ML-based false positive filtering
 *
 * All ML features are opt-in and gracefully degrade when models are unavailable.
 *
 * @module ml
 */
export { ModelManager } from "./ModelManager";
export type { ModelType, ModelConfig, LoadedModel, GPUProvider } from "./ModelManager";
export { ONNXInference, SimpleWordPieceTokenizer } from "./ONNXInference";
export type { TokenizerOutput, Tokenizer } from "./ONNXInference";
export { GlinerInference } from "./GlinerInference";
export type { GlinerEntity } from "./GlinerInference";
export { TinyBertConfidenceRanker, getConfidenceRanker, } from "./TinyBertConfidenceRanker";
export { FalsePositiveClassifier, applyMLFalsePositiveFilter, } from "./FalsePositiveClassifier";
/**
 * Check if ML features are available
 */
export declare function getMLStatus(): {
    gliner: {
        enabled: boolean;
        available: boolean;
    };
    tinybert: {
        enabled: boolean;
        available: boolean;
    };
    fpClassifier: {
        enabled: boolean;
        available: boolean;
    };
};
/**
 * Print ML feature status to console
 */
export declare function printMLStatus(): void;
//# sourceMappingURL=index.d.ts.map