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

import * as ort from "onnxruntime-node";
import * as path from "path";
import * as fs from "fs";
import { ONNXInference, SimpleWordPieceTokenizer } from "./ONNXInference";
import { ModelManager } from "./ModelManager";
import { Span, FilterType } from "../models/Span";
import { FeatureToggles } from "../config/FeatureToggles";
import { vulpesLogger } from "../utils/VulpesLogger";

const logger = vulpesLogger.forComponent("TinyBertConfidenceRanker");

/**
 * Confidence range for "borderline" spans that benefit from ML re-ranking
 */
const BORDERLINE_MIN = 0.4;
const BORDERLINE_MAX = 0.8;

/**
 * Context window size (characters) to include around span
 */
const CONTEXT_WINDOW = 100;

/**
 * Maximum sequence length for TinyBERT
 */
const MAX_SEQ_LENGTH = 128;

/**
 * PHI type to numeric encoding for model input
 */
const PHI_TYPE_ENCODING: Record<string, number> = {
  [FilterType.NAME]: 1,
  [FilterType.DATE]: 2,
  [FilterType.PHONE]: 3,
  [FilterType.EMAIL]: 4,
  [FilterType.SSN]: 5,
  [FilterType.MRN]: 6,
  [FilterType.ADDRESS]: 7,
  [FilterType.ZIPCODE]: 8,
  [FilterType.AGE]: 9,
  [FilterType.IP]: 10,
  [FilterType.URL]: 11,
  [FilterType.FAX]: 12,
  [FilterType.ACCOUNT]: 13,
  [FilterType.LICENSE]: 14,
  [FilterType.VEHICLE]: 15,
  [FilterType.DEVICE]: 16,
  [FilterType.HEALTH_PLAN]: 17,
  [FilterType.BIOMETRIC]: 18,
  [FilterType.CREDIT_CARD]: 19,
  [FilterType.PASSPORT]: 20,
};

/**
 * Input features for confidence prediction
 */
interface ConfidenceFeatures {
  /** Span text */
  spanText: string;
  /** Context around the span */
  context: string;
  /** PHI type encoding */
  phiType: number;
  /** Original confidence score */
  originalConfidence: number;
  /** Span length */
  spanLength: number;
  /** Word count in span */
  wordCount: number;
  /** Whether span contains digits */
  hasDigits: boolean;
  /** Whether span is all caps */
  isAllCaps: boolean;
}

/**
 * TinyBERT-based confidence ranker
 */
export class TinyBertConfidenceRanker extends ONNXInference {
  private constructor(session: ort.InferenceSession, tokenizer: SimpleWordPieceTokenizer) {
    super(session);
    this.tokenizer = tokenizer;
  }

  /**
   * Create a new TinyBertConfidenceRanker instance
   */
  static async create(): Promise<TinyBertConfidenceRanker> {
    // Load model via ModelManager
    const loadedModel = await ModelManager.loadModel("tinybert");

    // Load tokenizer vocabulary
    const modelsDir = ModelManager.getModelsDirectory();
    const vocabPath = path.join(modelsDir, "tinybert", "vocab.json");

    let vocab: Record<string, number>;
    try {
      const vocabData = fs.readFileSync(vocabPath, "utf-8");
      vocab = JSON.parse(vocabData);
    } catch (error) {
      logger.warn(`Could not load vocab from ${vocabPath}, using default BERT vocab`);
      // Use a minimal default vocab if not found
      vocab = getDefaultBertVocab();
    }

    const tokenizer = new SimpleWordPieceTokenizer(vocab, { maxLength: MAX_SEQ_LENGTH });

    return new TinyBertConfidenceRanker(loadedModel.session, tokenizer);
  }

  /**
   * Check if re-ranking should run based on configuration
   */
  static shouldRun(): boolean {
    return FeatureToggles.isMLConfidenceEnabled();
  }

  /**
   * Check if a span is in the borderline confidence range
   */
  static isBorderline(confidence: number): boolean {
    return confidence >= BORDERLINE_MIN && confidence <= BORDERLINE_MAX;
  }

  /**
   * Re-rank confidence scores for a batch of spans
   */
  async rerank(spans: Span[], text: string): Promise<Span[]> {
    if (!this.tokenizer) {
      logger.error("Tokenizer not initialized");
      return spans;
    }

    // Filter to borderline spans only
    const borderlineSpans = spans.filter((s) =>
      TinyBertConfidenceRanker.isBorderline(s.confidence)
    );

    if (borderlineSpans.length === 0) {
      logger.debug("No borderline spans to re-rank");
      return spans;
    }

    logger.debug(`Re-ranking ${borderlineSpans.length} borderline spans`);

    try {
      // Extract features for all borderline spans
      const features = borderlineSpans.map((span) =>
        this.extractFeatures(span, text)
      );

      // Run batch inference
      const newConfidences = await this.predictBatch(features);

      // Update span confidences
      for (let i = 0; i < borderlineSpans.length; i++) {
        const span = borderlineSpans[i];
        const newConfidence = newConfidences[i];

        // Blend original and predicted confidence (70% ML, 30% original)
        // This prevents wild swings from model errors
        const blendedConfidence = 0.7 * newConfidence + 0.3 * span.confidence;

        logger.debug(
          `Span "${span.text.substring(0, 20)}...": ${span.confidence.toFixed(3)} -> ${blendedConfidence.toFixed(3)}`
        );

        span.confidence = blendedConfidence;
      }

      return spans;
    } catch (error) {
      logger.error(`Re-ranking failed: ${error}`);
      return spans; // Return unchanged on error
    }
  }

  /**
   * Extract features from a span for confidence prediction
   */
  private extractFeatures(span: Span, text: string): ConfidenceFeatures {
    // Extract context around the span
    const contextStart = Math.max(0, span.characterStart - CONTEXT_WINDOW);
    const contextEnd = Math.min(text.length, span.characterEnd + CONTEXT_WINDOW);
    const context = text.substring(contextStart, contextEnd);

    return {
      spanText: span.text,
      context,
      phiType: PHI_TYPE_ENCODING[span.filterType] || 0,
      originalConfidence: span.confidence,
      spanLength: span.text.length,
      wordCount: span.text.trim().split(/\s+/).length,
      hasDigits: /\d/.test(span.text),
      isAllCaps: span.text === span.text.toUpperCase() && /[A-Z]/.test(span.text),
    };
  }

  /**
   * Run batch prediction
   */
  private async predictBatch(features: ConfidenceFeatures[]): Promise<number[]> {
    const batchSize = features.length;

    // Tokenize all inputs
    const encodedInputs = features.map((f) => {
      // Create input text: [CLS] context [SEP] span [SEP] type_info [SEP]
      const inputText = `${f.context} ${f.spanText}`;
      return this.tokenizer!.encode(inputText, { addSpecialTokens: true });
    });

    // Pad to same length
    const maxLen = Math.min(
      MAX_SEQ_LENGTH,
      Math.max(...encodedInputs.map((e) => e.input_ids.length))
    );

    const paddedInputIds: number[][] = [];
    const paddedAttentionMask: number[][] = [];

    for (const encoded of encodedInputs) {
      const padLength = maxLen - encoded.input_ids.length;
      paddedInputIds.push([
        ...encoded.input_ids,
        ...new Array(padLength).fill(0),
      ]);
      paddedAttentionMask.push([
        ...encoded.attention_mask,
        ...new Array(padLength).fill(0),
      ]);
    }

    // Create auxiliary features tensor
    const auxFeatures: number[][] = features.map((f) => [
      f.phiType / 20, // Normalize type encoding
      f.originalConfidence,
      f.spanLength / 50, // Normalize length
      f.wordCount / 5, // Normalize word count
      f.hasDigits ? 1 : 0,
      f.isAllCaps ? 1 : 0,
    ]);

    // Create tensors
    const inputIdsTensor = this.createTensor2D(paddedInputIds, "int64");
    const attentionMaskTensor = this.createTensor2D(paddedAttentionMask, "int64");

    // Prepare feeds based on model input names
    const inputNames = this.getInputNames();
    const feeds: Record<string, ort.Tensor> = {};

    // Standard BERT inputs
    if (inputNames.includes("input_ids")) {
      feeds["input_ids"] = inputIdsTensor;
    }
    if (inputNames.includes("attention_mask")) {
      feeds["attention_mask"] = attentionMaskTensor;
    }

    // Token type IDs (all zeros for single sequence)
    if (inputNames.includes("token_type_ids")) {
      const tokenTypeIds = paddedInputIds.map((ids) => ids.map(() => 0));
      feeds["token_type_ids"] = this.createTensor2D(tokenTypeIds, "int64");
    }

    // Auxiliary features (if model supports them)
    if (inputNames.includes("aux_features")) {
      feeds["aux_features"] = this.createTensor2D(auxFeatures, "float32");
    }

    // Run inference
    const outputs = await this.runInference(feeds);

    // Extract confidence predictions
    const outputNames = this.getOutputNames();
    let predictions: number[] = [];

    // Look for logits or confidence output
    for (const name of outputNames) {
      const output = outputs[name];
      if (output) {
        const data = this.extractFloatArray(output);

        if (output.dims.length === 1) {
          // Direct confidence output
          predictions = Array.from(data).map((x) => this.sigmoid(x));
        } else if (output.dims.length === 2) {
          // Batch output [batch, classes]
          const numClasses = output.dims[1] as number;
          for (let i = 0; i < batchSize; i++) {
            if (numClasses === 1) {
              // Single sigmoid output
              predictions.push(this.sigmoid(data[i]));
            } else if (numClasses === 2) {
              // Binary classification (negative, positive)
              const logits = [data[i * 2], data[i * 2 + 1]];
              const probs = this.softmax(logits);
              predictions.push(probs[1]); // Probability of positive class
            } else {
              // Multi-class - use max probability
              const classLogits: number[] = [];
              for (let j = 0; j < numClasses; j++) {
                classLogits.push(data[i * numClasses + j]);
              }
              predictions.push(Math.max(...this.softmax(classLogits)));
            }
          }
        }

        break; // Use first matching output
      }
    }

    // Fallback if no predictions extracted
    if (predictions.length === 0) {
      logger.warn("Could not extract predictions from model output");
      return features.map((f) => f.originalConfidence);
    }

    // Ensure predictions are in valid range
    return predictions.map((p) => Math.max(0, Math.min(1, p)));
  }
}

/**
 * Get a minimal default BERT vocabulary
 * This is a fallback if vocab.json is not found
 */
function getDefaultBertVocab(): Record<string, number> {
  // Minimal vocab with special tokens and common characters
  const vocab: Record<string, number> = {
    "[PAD]": 0,
    "[UNK]": 100,
    "[CLS]": 101,
    "[SEP]": 102,
    "[MASK]": 103,
  };

  // Add lowercase letters
  for (let i = 0; i < 26; i++) {
    const char = String.fromCharCode(97 + i); // a-z
    vocab[char] = 1000 + i;
  }

  // Add digits
  for (let i = 0; i < 10; i++) {
    vocab[String(i)] = 2000 + i;
  }

  // Add common punctuation
  const punct = ".,!?;:'\"-()[]{}@#$%&*";
  for (let i = 0; i < punct.length; i++) {
    vocab[punct[i]] = 3000 + i;
  }

  // Add common words
  const commonWords = [
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "can", "patient", "name", "date",
    "phone", "address", "number", "dr", "mr", "mrs", "ms", "md",
  ];
  for (let i = 0; i < commonWords.length; i++) {
    vocab[commonWords[i]] = 4000 + i;
  }

  return vocab;
}

/**
 * Singleton instance management
 */
let rankerInstance: TinyBertConfidenceRanker | null = null;
let instancePromise: Promise<TinyBertConfidenceRanker | null> | null = null;

/**
 * Get or create the TinyBertConfidenceRanker singleton
 */
export async function getConfidenceRanker(): Promise<TinyBertConfidenceRanker | null> {
  // Check if ML confidence is enabled
  if (!TinyBertConfidenceRanker.shouldRun()) {
    return null;
  }

  // Check if model is available
  if (!ModelManager.modelAvailable("tinybert")) {
    logger.warn(
      "TinyBERT model not found. Run 'npm run models:download' to download."
    );
    return null;
  }

  // Return existing instance
  if (rankerInstance) {
    return rankerInstance;
  }

  // Return existing loading promise
  if (instancePromise) {
    return instancePromise;
  }

  // Create new instance
  instancePromise = TinyBertConfidenceRanker.create()
    .then((instance) => {
      rankerInstance = instance;
      return instance;
    })
    .catch((error) => {
      logger.error(`Failed to create TinyBertConfidenceRanker: ${error}`);
      instancePromise = null;
      return null;
    });

  return instancePromise;
}

export default TinyBertConfidenceRanker;
