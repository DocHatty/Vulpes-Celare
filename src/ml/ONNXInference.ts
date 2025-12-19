/**
 * ONNXInference - Base Class for ONNX Model Inference
 *
 * Provides common functionality for running inference with ONNX models,
 * including tensor creation, batch processing, and output parsing.
 *
 * @module ml/ONNXInference
 */

import * as ort from "onnxruntime-node";
import { vulpesLogger } from "../utils/VulpesLogger";

const logger = vulpesLogger.forComponent("ONNXInference");

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
  encode(text: string, options?: { addSpecialTokens?: boolean }): TokenizerOutput;
  decode(ids: number[]): string;
  vocab: Map<string, number>;
  idToToken: Map<number, string>;
}

/**
 * Base class for ONNX inference operations
 */
export abstract class ONNXInference {
  protected session: ort.InferenceSession;
  protected tokenizer: Tokenizer | null = null;

  constructor(session: ort.InferenceSession) {
    this.session = session;
  }

  /**
   * Get input names for the model
   */
  getInputNames(): readonly string[] {
    return this.session.inputNames;
  }

  /**
   * Get output names for the model
   */
  getOutputNames(): readonly string[] {
    return this.session.outputNames;
  }

  /**
   * Create a tensor from a 1D array
   */
  protected createTensor1D(
    data: number[] | BigInt64Array,
    dtype: "int64" | "float32" | "int32" = "int64"
  ): ort.Tensor {
    if (dtype === "int64") {
      const bigIntData = data instanceof BigInt64Array
        ? data
        : BigInt64Array.from(data.map(n => BigInt(n)));
      return new ort.Tensor("int64", bigIntData, [bigIntData.length]);
    } else if (dtype === "float32") {
      return new ort.Tensor("float32", Float32Array.from(data as number[]), [(data as number[]).length]);
    } else {
      return new ort.Tensor("int32", Int32Array.from(data as number[]), [(data as number[]).length]);
    }
  }

  /**
   * Create a tensor from a 2D array (batch)
   */
  protected createTensor2D(
    data: number[][],
    dtype: "int64" | "float32" | "int32" = "int64"
  ): ort.Tensor {
    const batchSize = data.length;
    const seqLength = data[0]?.length || 0;
    const flat = data.flat();

    if (dtype === "int64") {
      const bigIntData = BigInt64Array.from(flat.map(n => BigInt(n)));
      return new ort.Tensor("int64", bigIntData, [batchSize, seqLength]);
    } else if (dtype === "float32") {
      return new ort.Tensor("float32", Float32Array.from(flat), [batchSize, seqLength]);
    } else {
      return new ort.Tensor("int32", Int32Array.from(flat), [batchSize, seqLength]);
    }
  }

  /**
   * Create a tensor from a 3D array
   */
  protected createTensor3D(
    data: number[][][],
    dtype: "float32" | "int32" = "float32"
  ): ort.Tensor {
    const dim0 = data.length;
    const dim1 = data[0]?.length || 0;
    const dim2 = data[0]?.[0]?.length || 0;
    const flat = data.flat(2);

    if (dtype === "float32") {
      return new ort.Tensor("float32", Float32Array.from(flat), [dim0, dim1, dim2]);
    } else {
      return new ort.Tensor("int32", Int32Array.from(flat), [dim0, dim1, dim2]);
    }
  }

  /**
   * Run inference with the given inputs
   */
  protected async runInference(
    feeds: Record<string, ort.Tensor>
  ): Promise<ort.InferenceSession.OnnxValueMapType> {
    try {
      return await this.session.run(feeds);
    } catch (error) {
      logger.error(`Inference failed: ${error}`);
      throw error;
    }
  }

  /**
   * Extract float array from output tensor
   */
  protected extractFloatArray(output: ort.Tensor): Float32Array {
    return output.data as Float32Array;
  }

  /**
   * Extract 2D float array from output tensor
   */
  protected extract2DFloatArray(output: ort.Tensor): number[][] {
    const data = output.data as Float32Array;
    const [batchSize, seqLength] = output.dims as [number, number];

    const result: number[][] = [];
    for (let i = 0; i < batchSize; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLength; j++) {
        row.push(data[i * seqLength + j]);
      }
      result.push(row);
    }

    return result;
  }

  /**
   * Extract 3D float array from output tensor
   */
  protected extract3DFloatArray(output: ort.Tensor): number[][][] {
    const data = output.data as Float32Array;
    const [dim0, dim1, dim2] = output.dims as [number, number, number];

    const result: number[][][] = [];
    for (let i = 0; i < dim0; i++) {
      const matrix: number[][] = [];
      for (let j = 0; j < dim1; j++) {
        const row: number[] = [];
        for (let k = 0; k < dim2; k++) {
          row.push(data[i * dim1 * dim2 + j * dim2 + k]);
        }
        matrix.push(row);
      }
      result.push(matrix);
    }

    return result;
  }

  /**
   * Get argmax along last dimension
   */
  protected argmax(scores: number[]): number {
    let maxIdx = 0;
    let maxVal = scores[0];
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > maxVal) {
        maxVal = scores[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  /**
   * Apply softmax to scores
   */
  protected softmax(scores: number[]): number[] {
    const maxScore = Math.max(...scores);
    const exp = scores.map(s => Math.exp(s - maxScore));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(e => e / sum);
  }

  /**
   * Apply sigmoid to a single value
   */
  protected sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    // Session is managed by ModelManager, don't release here
  }
}

/**
 * Simple word-piece tokenizer for BERT-style models
 * This is a basic implementation - production should use a proper tokenizer
 */
export class SimpleWordPieceTokenizer implements Tokenizer {
  vocab: Map<string, number>;
  idToToken: Map<number, string>;
  private unkId: number;
  private clsId: number;
  private sepId: number;
  private maxLength: number;

  constructor(
    vocabData: Record<string, number>,
    options?: { maxLength?: number }
  ) {
    this.vocab = new Map(Object.entries(vocabData));
    this.idToToken = new Map();
    for (const [token, id] of this.vocab) {
      this.idToToken.set(id, token);
    }

    this.unkId = this.vocab.get("[UNK]") || 100;
    this.clsId = this.vocab.get("[CLS]") || 101;
    this.sepId = this.vocab.get("[SEP]") || 102;
    this.maxLength = options?.maxLength || 512;
  }

  encode(text: string, options?: { addSpecialTokens?: boolean }): TokenizerOutput {
    const addSpecial = options?.addSpecialTokens !== false;

    // Basic tokenization: lowercase and split on whitespace/punctuation
    const tokens = this.basicTokenize(text);

    // Convert tokens to IDs with word-piece splitting
    const ids: number[] = [];
    if (addSpecial) {
      ids.push(this.clsId);
    }

    for (const token of tokens) {
      const subTokens = this.wordPieceTokenize(token);
      for (const subToken of subTokens) {
        ids.push(this.vocab.get(subToken) ?? this.unkId);
      }
    }

    if (addSpecial) {
      ids.push(this.sepId);
    }

    // Truncate if necessary
    const truncatedIds = ids.slice(0, this.maxLength);

    // Create attention mask
    const attentionMask = new Array(truncatedIds.length).fill(1);

    return {
      input_ids: truncatedIds,
      attention_mask: attentionMask,
    };
  }

  decode(ids: number[]): string {
    const tokens = ids
      .map(id => this.idToToken.get(id) || "[UNK]")
      .filter(t => !["[CLS]", "[SEP]", "[PAD]"].includes(t));

    // Reconstruct text from word-pieces
    let result = "";
    for (const token of tokens) {
      if (token.startsWith("##")) {
        result += token.slice(2);
      } else {
        result += (result ? " " : "") + token;
      }
    }

    return result;
  }

  private basicTokenize(text: string): string[] {
    // Lowercase
    text = text.toLowerCase();

    // Add spaces around punctuation
    text = text.replace(/([.,!?;:'"()\[\]{}])/g, " $1 ");

    // Split on whitespace
    return text.split(/\s+/).filter(t => t.length > 0);
  }

  private wordPieceTokenize(token: string): string[] {
    // If the whole token is in vocab, return it
    if (this.vocab.has(token)) {
      return [token];
    }

    // Otherwise, try to split into word pieces
    const subTokens: string[] = [];
    let start = 0;

    while (start < token.length) {
      let end = token.length;
      let found = false;

      while (start < end) {
        let substr = token.slice(start, end);
        if (start > 0) {
          substr = "##" + substr;
        }

        if (this.vocab.has(substr)) {
          subTokens.push(substr);
          found = true;
          break;
        }

        end--;
      }

      if (!found) {
        // Character not found in vocab, use [UNK]
        subTokens.push("[UNK]");
        break;
      }

      start = end;
    }

    return subTokens;
  }
}

export default ONNXInference;
