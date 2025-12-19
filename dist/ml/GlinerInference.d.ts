/**
 * GlinerInference - GLiNER Zero-Shot NER Model Inference
 *
 * GLiNER (Generalist and Lightweight NER) is a zero-shot Named Entity Recognition
 * model that can detect custom entity types without fine-tuning.
 *
 * This class handles:
 * - Model loading via ModelManager
 * - Text tokenization
 * - ONNX inference
 * - Entity span extraction and decoding
 *
 * @module ml/GlinerInference
 */
import * as ort from "onnxruntime-node";
import { ONNXInference } from "./ONNXInference";
/**
 * Detected entity from GLiNER
 */
export interface GlinerEntity {
    /** The detected text */
    text: string;
    /** Start character position in original text */
    start: number;
    /** End character position in original text */
    end: number;
    /** Entity label (e.g., "patient_name", "provider_name") */
    label: string;
    /** Confidence score 0-1 */
    score: number;
}
/**
 * GLiNER Inference class
 */
export declare class GlinerInference extends ONNXInference {
    private vocab;
    private idToToken;
    static readonly DEFAULT_LABELS: string[];
    private clsId;
    private sepId;
    private padId;
    private unkId;
    private maxLength;
    private maxWidth;
    /**
     * Create GLiNER inference from ModelManager
     */
    static create(): Promise<GlinerInference>;
    /**
     * Load tokenizer and model configuration
     */
    private loadConfig;
    /**
     * Predict entities in text
     *
     * @param text - Input text to analyze
     * @param labels - Entity labels to detect (default: patient/provider names)
     * @param threshold - Minimum confidence threshold (default: 0.5)
     */
    predict(text: string, labels?: string[], threshold?: number): Promise<GlinerEntity[]>;
    /**
     * Tokenize input text
     */
    private tokenize;
    /**
     * Split text into words with character positions
     */
    private splitIntoWords;
    /**
     * Tokenize a single word into subword tokens
     */
    private tokenizeWord;
    /**
     * Tokenize entity labels
     */
    private tokenizeLabels;
    /**
     * Create input feeds for ONNX inference
     */
    private createInputFeeds;
    /**
     * Decode entities from model output
     */
    private decodeEntities;
    /**
     * Decode span-based output format
     */
    private decodeSpanFormat;
    /**
     * Decode token-based output format (BIO tagging)
     */
    private decodeTokenFormat;
    /**
     * Convert token-based entity to character-based
     */
    private finalizeEntity;
    /**
     * Deduplicate overlapping entities, keeping highest score
     */
    private deduplicateEntities;
    /**
     * Override createTensor3D to support int64
     */
    protected createTensor3D(data: number[][][], dtype?: "float32" | "int32" | "int64"): ort.Tensor;
}
export default GlinerInference;
//# sourceMappingURL=GlinerInference.d.ts.map