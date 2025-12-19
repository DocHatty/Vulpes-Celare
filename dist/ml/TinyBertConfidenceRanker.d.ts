/**
 * TinyBertConfidenceRanker - ML-Based Confidence Re-ranking
 *
 * Uses TinyBERT (4-layer distilled BERT) to predict calibrated
 * confidence scores for borderline PHI detections.
 *
 * Features:
 * - Only modifies borderline cases (0.4-0.8 confidence)
 * - High-confidence (>0.9) and low-confidence (<0.3) unchanged
 * - Extracts features from span text + surrounding context
 * - Supports batch inference for efficiency
 *
 * @module ml/TinyBertConfidenceRanker
 */
import { ONNXInference } from "./ONNXInference";
import { Span } from "../models/Span";
/**
 * TinyBERT-based confidence ranker
 */
export declare class TinyBertConfidenceRanker extends ONNXInference {
    private constructor();
    /**
     * Create a new TinyBertConfidenceRanker instance
     */
    static create(): Promise<TinyBertConfidenceRanker>;
    /**
     * Check if re-ranking should run based on configuration
     */
    static shouldRun(): boolean;
    /**
     * Check if a span is in the borderline confidence range
     */
    static isBorderline(confidence: number): boolean;
    /**
     * Re-rank confidence scores for a batch of spans
     */
    rerank(spans: Span[], text: string): Promise<Span[]>;
    /**
     * Extract features from a span for confidence prediction
     */
    private extractFeatures;
    /**
     * Run batch prediction
     */
    private predictBatch;
}
/**
 * Get or create the TinyBertConfidenceRanker singleton
 */
export declare function getConfidenceRanker(): Promise<TinyBertConfidenceRanker | null>;
export default TinyBertConfidenceRanker;
//# sourceMappingURL=TinyBertConfidenceRanker.d.ts.map