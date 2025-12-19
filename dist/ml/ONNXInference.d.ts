/**
 * ONNXInference - Base Class for ONNX Model Inference
 *
 * Provides common functionality for running inference with ONNX models,
 * including tensor creation, batch processing, and output parsing.
 *
 * @module ml/ONNXInference
 */
import * as ort from "onnxruntime-node";
/**
 * Tokenizer output format (simplified)
 */
export interface TokenizerOutput {
    input_ids: number[];
    attention_mask: number[];
    token_type_ids?: number[];
}
/**
 * Simple tokenizer interface
 */
export interface Tokenizer {
    encode(text: string, options?: {
        addSpecialTokens?: boolean;
    }): TokenizerOutput;
    decode(ids: number[]): string;
    vocab: Map<string, number>;
    idToToken: Map<number, string>;
}
/**
 * Base class for ONNX inference operations
 */
export declare abstract class ONNXInference {
    protected session: ort.InferenceSession;
    protected tokenizer: Tokenizer | null;
    constructor(session: ort.InferenceSession);
    /**
     * Get input names for the model
     */
    getInputNames(): readonly string[];
    /**
     * Get output names for the model
     */
    getOutputNames(): readonly string[];
    /**
     * Create a tensor from a 1D array
     */
    protected createTensor1D(data: number[] | BigInt64Array, dtype?: "int64" | "float32" | "int32"): ort.Tensor;
    /**
     * Create a tensor from a 2D array (batch)
     */
    protected createTensor2D(data: number[][], dtype?: "int64" | "float32" | "int32"): ort.Tensor;
    /**
     * Create a tensor from a 3D array
     */
    protected createTensor3D(data: number[][][], dtype?: "float32" | "int32"): ort.Tensor;
    /**
     * Run inference with the given inputs
     */
    protected runInference(feeds: Record<string, ort.Tensor>): Promise<ort.InferenceSession.OnnxValueMapType>;
    /**
     * Extract float array from output tensor
     */
    protected extractFloatArray(output: ort.Tensor): Float32Array;
    /**
     * Extract 2D float array from output tensor
     */
    protected extract2DFloatArray(output: ort.Tensor): number[][];
    /**
     * Extract 3D float array from output tensor
     */
    protected extract3DFloatArray(output: ort.Tensor): number[][][];
    /**
     * Get argmax along last dimension
     */
    protected argmax(scores: number[]): number;
    /**
     * Apply softmax to scores
     */
    protected softmax(scores: number[]): number[];
    /**
     * Apply sigmoid to a single value
     */
    protected sigmoid(x: number): number;
    /**
     * Dispose of resources
     */
    dispose(): Promise<void>;
}
/**
 * Simple word-piece tokenizer for BERT-style models
 * This is a basic implementation - production should use a proper tokenizer
 */
export declare class SimpleWordPieceTokenizer implements Tokenizer {
    vocab: Map<string, number>;
    idToToken: Map<number, string>;
    private unkId;
    private clsId;
    private sepId;
    private maxLength;
    constructor(vocabData: Record<string, number>, options?: {
        maxLength?: number;
    });
    encode(text: string, options?: {
        addSpecialTokens?: boolean;
    }): TokenizerOutput;
    decode(ids: number[]): string;
    private basicTokenize;
    private wordPieceTokenize;
}
export default ONNXInference;
//# sourceMappingURL=ONNXInference.d.ts.map