/**
 * FalsePositiveClassifier - ML-Based False Positive Detection
 *
 * Uses a small MLP classifier to identify likely false positive detections,
 * particularly for NAME type spans which have the highest FP rate.
 *
 * Features:
 * - Binary classification: keep (true PHI) vs remove (false positive)
 * - Only applies to NAME type by default
 * - Uses span text, pattern, confidence, and context as features
 * - High-confidence threshold (P(FP) > 0.7) to avoid removing true PHI
 *
 * @module ml/FalsePositiveClassifier
 */
import { ONNXInference } from "./ONNXInference";
import { Span } from "../models/Span";
import type { IPostFilterStrategy } from "../core/filters/PostFilterService";
/**
 * ML-based False Positive Classifier
 */
export declare class FalsePositiveClassifier extends ONNXInference implements IPostFilterStrategy {
    readonly name = "MLFalsePositive";
    private fpThreshold;
    private static instance;
    private static loadingPromise;
    private static loadFailed;
    private constructor();
    /**
     * Create a new FalsePositiveClassifier instance
     */
    static create(fpThreshold?: number): Promise<FalsePositiveClassifier>;
    /**
     * Get or create singleton instance
     */
    static getInstance(): Promise<FalsePositiveClassifier | null>;
    /**
     * Check if this filter should run
     */
    static shouldRun(): boolean;
    /**
     * IPostFilterStrategy implementation - synchronous check
     * For async ML prediction, use classifyAsync instead
     */
    shouldKeep(span: Span, _text: string): boolean;
    /**
     * Classify a single span (async)
     * @returns true to keep, false to remove
     */
    classify(span: Span, text: string): Promise<boolean>;
    /**
     * Classify multiple spans in batch (async)
     * @returns Map of span index to keep decision
     */
    classifyBatch(spans: Span[], text: string): Promise<Map<number, boolean>>;
    /**
     * Filter spans using ML FP classification (async version)
     */
    filterSpans(spans: Span[], text: string): Promise<Span[]>;
    /**
     * Extract features from a span
     */
    private extractFeatures;
    /**
     * Predict FP probability for single span
     */
    private predictSingle;
    /**
     * Predict FP probabilities for batch of spans
     */
    private predictBatch;
}
/**
 * Async post-filter function that integrates ML FP classifier
 * Can be used in parallel with rule-based filters
 */
export declare function applyMLFalsePositiveFilter(spans: Span[], text: string): Promise<Span[]>;
export default FalsePositiveClassifier;
//# sourceMappingURL=FalsePositiveClassifier.d.ts.map