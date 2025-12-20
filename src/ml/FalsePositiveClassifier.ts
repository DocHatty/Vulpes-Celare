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

import * as ort from "onnxruntime-node";
import * as path from "path";
import * as fs from "fs";
import { ONNXInference, SimpleWordPieceTokenizer } from "./ONNXInference";
import { ModelManager } from "./ModelManager";
import { Span, FilterType } from "../models/Span";
import { FeatureToggles } from "../config/FeatureToggles";
import { vulpesLogger } from "../utils/VulpesLogger";
import type { IPostFilterStrategy } from "../core/filters/PostFilterService";

const logger = vulpesLogger.forComponent("FalsePositiveClassifier");

/**
 * Default FP probability threshold for removal
 * Higher values are more conservative (fewer removals)
 */
const DEFAULT_FP_THRESHOLD = 0.7;

/**
 * Context window size (characters) for feature extraction
 */
const CONTEXT_WINDOW = 50;

/**
 * Maximum sequence length for tokenization
 */
const MAX_SEQ_LENGTH = 64;

/**
 * Pattern types to numeric encoding
 */
const PATTERN_ENCODING: Record<string, number> = {
  "GLiNER-patient": 1,
  "GLiNER-provider": 2,
  "GLiNER-person": 3,
  "GLiNER-family": 4,
  "labeled-patient": 5,
  "labeled-name": 6,
  "titled-name": 7,
  "formatted-name": 8,
  "smart-name": 9,
  "family-name": 10,
};

/**
 * Common false positive indicators
 */
const FP_INDICATORS: string[] = [
  // Medical section headers
  "history",
  "examination",
  "findings",
  "impression",
  "assessment",
  "plan",
  "diagnosis",
  "treatment",
  // Document structure
  "information",
  "section",
  "report",
  "record",
  "note",
  // Medical phrases
  "disorder",
  "syndrome",
  "disease",
  "mellitus",
  "pressure",
  "rate",
];

/**
 * Feature vector for FP classification
 */
interface FPFeatures {
  /** Span text */
  spanText: string;
  /** Context around span */
  context: string;
  /** Pattern type encoding */
  patternType: number;
  /** Original confidence */
  confidence: number;
  /** Span length */
  spanLength: number;
  /** Word count */
  wordCount: number;
  /** Is all uppercase */
  isAllCaps: boolean;
  /** Contains digits */
  hasDigits: boolean;
  /** Contains punctuation */
  hasPunctuation: boolean;
  /** Number of FP indicator words in span */
  fpIndicatorCount: number;
  /** Whether span ends with common FP suffix */
  hasFpSuffix: boolean;
}

/**
 * ML-based False Positive Classifier
 */
export class FalsePositiveClassifier extends ONNXInference implements IPostFilterStrategy {
  readonly name = "MLFalsePositive";

  private fpThreshold: number;
  private static instance: FalsePositiveClassifier | null = null;
  private static loadingPromise: Promise<FalsePositiveClassifier | null> | null = null;
  private static loadFailed: boolean = false;

  private constructor(
    session: ort.InferenceSession,
    tokenizer: SimpleWordPieceTokenizer | null,
    fpThreshold: number = DEFAULT_FP_THRESHOLD
  ) {
    super(session, "fp_classifier");
    this.tokenizer = tokenizer;
    this.fpThreshold = fpThreshold;
  }

  /**
   * Create a new FalsePositiveClassifier instance
   */
  static async create(
    fpThreshold: number = DEFAULT_FP_THRESHOLD
  ): Promise<FalsePositiveClassifier> {
    // Load model via ModelManager
    const loadedModel = await ModelManager.loadModel("fp_classifier");

    // Try to load tokenizer vocabulary (optional for this model)
    let tokenizer: SimpleWordPieceTokenizer | null = null;
    const modelsDir = ModelManager.getModelsDirectory();
    const vocabPath = path.join(modelsDir, "fp_classifier", "vocab.json");

    try {
      if (fs.existsSync(vocabPath)) {
        const vocabData = fs.readFileSync(vocabPath, "utf-8");
        const vocab = JSON.parse(vocabData);
        tokenizer = new SimpleWordPieceTokenizer(vocab, { maxLength: MAX_SEQ_LENGTH });
      }
    } catch (error) {
      logger.debug("No tokenizer found for FP classifier, using feature-only mode");
    }

    return new FalsePositiveClassifier(loadedModel.session, tokenizer, fpThreshold);
  }

  /**
   * Get or create singleton instance
   */
  static async getInstance(): Promise<FalsePositiveClassifier | null> {
    // Check if ML FP filter is enabled
    if (!FeatureToggles.isMLFPFilterEnabled()) {
      return null;
    }

    // Check if model is available
    if (!ModelManager.modelAvailable("fp_classifier")) {
      logger.warn(
        "FP classifier model not found. Run 'npm run models:download' to download."
      );
      return null;
    }

    // Return existing instance
    if (FalsePositiveClassifier.instance) {
      return FalsePositiveClassifier.instance;
    }

    // Return existing loading promise
    if (FalsePositiveClassifier.loadingPromise) {
      return FalsePositiveClassifier.loadingPromise;
    }

    // Check if loading already failed
    if (FalsePositiveClassifier.loadFailed) {
      return null;
    }

    // Create new instance
    FalsePositiveClassifier.loadingPromise = FalsePositiveClassifier.create()
      .then((instance) => {
        FalsePositiveClassifier.instance = instance;
        return instance;
      })
      .catch((error) => {
        logger.error(`Failed to create FalsePositiveClassifier: ${error}`);
        FalsePositiveClassifier.loadFailed = true;
        FalsePositiveClassifier.loadingPromise = null;
        return null;
      });

    return FalsePositiveClassifier.loadingPromise;
  }

  /**
   * Check if this filter should run
   */
  static shouldRun(): boolean {
    return FeatureToggles.isMLFPFilterEnabled();
  }

  /**
   * IPostFilterStrategy implementation - synchronous check
   * For async ML prediction, use classifyAsync instead
   */
  shouldKeep(span: Span, _text: string): boolean {
    // Only apply to NAME type (highest FP rate)
    if (span.filterType !== FilterType.NAME) {
      return true;
    }

    // Skip if model not loaded (can't do async here)
    // This method is for sync compatibility - use classifyBatch for async
    return true;
  }

  /**
   * Classify a single span (async)
   * @returns true to keep, false to remove
   */
  async classify(span: Span, text: string): Promise<boolean> {
    // Only apply to NAME type
    if (span.filterType !== FilterType.NAME) {
      return true;
    }

    const features = this.extractFeatures(span, text);
    const fpProbability = await this.predictSingle(features);

    const keep = fpProbability < this.fpThreshold;

    if (!keep) {
      logger.debug(
        `ML FP classifier removing "${span.text.substring(0, 20)}..." (P(FP)=${fpProbability.toFixed(3)})`
      );
    }

    return keep;
  }

  /**
   * Classify multiple spans in batch (async)
   * @returns Map of span index to keep decision
   */
  async classifyBatch(
    spans: Span[],
    text: string
  ): Promise<Map<number, boolean>> {
    const results = new Map<number, boolean>();

    // Filter to NAME type only
    const nameSpanIndices: number[] = [];
    const nameFeatures: FPFeatures[] = [];

    for (let i = 0; i < spans.length; i++) {
      if (spans[i].filterType === FilterType.NAME) {
        nameSpanIndices.push(i);
        nameFeatures.push(this.extractFeatures(spans[i], text));
      } else {
        results.set(i, true); // Keep non-NAME spans
      }
    }

    if (nameFeatures.length === 0) {
      return results;
    }

    // Run batch prediction
    const fpProbabilities = await this.predictBatch(nameFeatures);

    // Determine keep/remove decisions
    for (let i = 0; i < nameSpanIndices.length; i++) {
      const spanIdx = nameSpanIndices[i];
      const keep = fpProbabilities[i] < this.fpThreshold;

      if (!keep) {
        logger.debug(
          `ML FP classifier removing "${spans[spanIdx].text.substring(0, 20)}..." (P(FP)=${fpProbabilities[i].toFixed(3)})`
        );
      }

      results.set(spanIdx, keep);
    }

    return results;
  }

  /**
   * Filter spans using ML FP classification (async version)
   */
  async filterSpans(spans: Span[], text: string): Promise<Span[]> {
    const decisions = await this.classifyBatch(spans, text);

    return spans.filter((_, idx) => decisions.get(idx) !== false);
  }

  /**
   * Extract features from a span
   */
  private extractFeatures(span: Span, text: string): FPFeatures {
    // Get surrounding context
    const contextStart = Math.max(0, span.characterStart - CONTEXT_WINDOW);
    const contextEnd = Math.min(text.length, span.characterEnd + CONTEXT_WINDOW);
    const context = text.substring(contextStart, contextEnd);

    // Pattern type encoding
    const patternType = PATTERN_ENCODING[span.pattern || ""] || 0;

    // Word analysis
    const words = span.text.trim().split(/\s+/);
    const wordCount = words.length;

    // Check for FP indicators
    const spanLower = span.text.toLowerCase();
    let fpIndicatorCount = 0;
    for (const indicator of FP_INDICATORS) {
      if (spanLower.includes(indicator)) {
        fpIndicatorCount++;
      }
    }

    // Check for FP suffixes
    const fpSuffixes = [
      "disorder",
      "disease",
      "syndrome",
      "history",
      "examination",
      "information",
      "pressure",
      "rate",
    ];
    const hasFpSuffix = fpSuffixes.some((suffix) =>
      spanLower.endsWith(suffix)
    );

    return {
      spanText: span.text,
      context,
      patternType,
      confidence: span.confidence,
      spanLength: span.text.length,
      wordCount,
      isAllCaps: span.text === span.text.toUpperCase() && /[A-Z]/.test(span.text),
      hasDigits: /\d/.test(span.text),
      hasPunctuation: /[.,!?;:'"()\[\]{}]/.test(span.text),
      fpIndicatorCount,
      hasFpSuffix,
    };
  }

  /**
   * Predict FP probability for single span
   */
  private async predictSingle(features: FPFeatures): Promise<number> {
    const probabilities = await this.predictBatch([features]);
    return probabilities[0];
  }

  /**
   * Predict FP probabilities for batch of spans
   */
  private async predictBatch(features: FPFeatures[]): Promise<number[]> {
    const batchSize = features.length;

    // Create feature vectors
    const featureVectors: number[][] = features.map((f) => [
      f.patternType / 10, // Normalize
      f.confidence,
      Math.min(f.spanLength / 50, 1), // Normalize and cap
      Math.min(f.wordCount / 5, 1), // Normalize and cap
      f.isAllCaps ? 1 : 0,
      f.hasDigits ? 1 : 0,
      f.hasPunctuation ? 1 : 0,
      Math.min(f.fpIndicatorCount / 3, 1), // Normalize
      f.hasFpSuffix ? 1 : 0,
    ]);

    // Prepare model inputs
    const inputNames = this.getInputNames();
    const feeds: Record<string, ort.Tensor> = {};

    // Try different input formats based on model architecture
    if (inputNames.includes("features")) {
      // Simple feature-based model
      feeds["features"] = this.createTensor2D(featureVectors, "float32");
    } else if (inputNames.includes("input_ids") && this.tokenizer) {
      // BERT-style model with tokenization
      const encodedInputs = features.map((f) => {
        const inputText = `${f.spanText} [SEP] ${f.context.substring(0, 100)}`;
        return this.tokenizer!.encode(inputText, { addSpecialTokens: true });
      });

      // Pad to same length
      const maxLen = Math.min(
        MAX_SEQ_LENGTH,
        Math.max(...encodedInputs.map((e) => e.input_ids.length))
      );

      const paddedInputIds = encodedInputs.map((e) => {
        const padLength = maxLen - e.input_ids.length;
        return [...e.input_ids, ...new Array(padLength).fill(0)];
      });

      const paddedAttentionMask = encodedInputs.map((e) => {
        const padLength = maxLen - e.attention_mask.length;
        return [...e.attention_mask, ...new Array(padLength).fill(0)];
      });

      feeds["input_ids"] = this.createTensor2D(paddedInputIds, "int64");
      feeds["attention_mask"] = this.createTensor2D(paddedAttentionMask, "int64");

      if (inputNames.includes("aux_features")) {
        feeds["aux_features"] = this.createTensor2D(featureVectors, "float32");
      }
    } else {
      // Fallback: assume first input accepts feature vectors
      const firstInput = inputNames[0];
      feeds[firstInput] = this.createTensor2D(featureVectors, "float32");
    }

    // Run inference
    let outputs: ort.InferenceSession.OnnxValueMapType;
    try {
      outputs = await this.runInference(feeds);
    } catch (error) {
      logger.error(`FP classifier inference failed: ${error}`);
      // Return low FP probability on error (keep spans)
      return new Array(batchSize).fill(0);
    }

    // Extract predictions
    const outputNames = this.getOutputNames();
    let predictions: number[] = [];

    for (const name of outputNames) {
      const output = outputs[name];
      if (!output) continue;

      const data = this.extractFloatArray(output);

      if (output.dims.length === 1) {
        // Single value per sample
        predictions = Array.from(data).map((x) => this.sigmoid(x));
      } else if (output.dims.length === 2) {
        const numClasses = output.dims[1] as number;

        for (let i = 0; i < batchSize; i++) {
          if (numClasses === 1) {
            // Sigmoid output
            predictions.push(this.sigmoid(data[i]));
          } else if (numClasses === 2) {
            // Binary classification [P(TP), P(FP)]
            const logits = [data[i * 2], data[i * 2 + 1]];
            const probs = this.softmax(logits);
            predictions.push(probs[1]); // P(FP)
          } else {
            // Unexpected output shape - use first class probability
            predictions.push(this.sigmoid(data[i * numClasses]));
          }
        }
      }

      break; // Use first matching output
    }

    // Fallback if extraction failed
    if (predictions.length !== batchSize) {
      logger.warn("Could not extract all predictions from model output");
      return new Array(batchSize).fill(0);
    }

    return predictions;
  }
}

/**
 * Async post-filter function that integrates ML FP classifier
 * Can be used in parallel with rule-based filters
 */
export async function applyMLFalsePositiveFilter(
  spans: Span[],
  text: string
): Promise<Span[]> {
  if (!FalsePositiveClassifier.shouldRun()) {
    return spans;
  }

  const classifier = await FalsePositiveClassifier.getInstance();
  if (!classifier) {
    return spans;
  }

  return classifier.filterSpans(spans, text);
}

export default FalsePositiveClassifier;
