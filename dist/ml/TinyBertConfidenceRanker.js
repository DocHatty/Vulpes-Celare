"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TinyBertConfidenceRanker = void 0;
exports.getConfidenceRanker = getConfidenceRanker;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ONNXInference_1 = require("./ONNXInference");
const ModelManager_1 = require("./ModelManager");
const Span_1 = require("../models/Span");
const FeatureToggles_1 = require("../config/FeatureToggles");
const VulpesLogger_1 = require("../utils/VulpesLogger");
const logger = VulpesLogger_1.vulpesLogger.forComponent("TinyBertConfidenceRanker");
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
const PHI_TYPE_ENCODING = {
    [Span_1.FilterType.NAME]: 1,
    [Span_1.FilterType.DATE]: 2,
    [Span_1.FilterType.PHONE]: 3,
    [Span_1.FilterType.EMAIL]: 4,
    [Span_1.FilterType.SSN]: 5,
    [Span_1.FilterType.MRN]: 6,
    [Span_1.FilterType.ADDRESS]: 7,
    [Span_1.FilterType.ZIPCODE]: 8,
    [Span_1.FilterType.AGE]: 9,
    [Span_1.FilterType.IP]: 10,
    [Span_1.FilterType.URL]: 11,
    [Span_1.FilterType.FAX]: 12,
    [Span_1.FilterType.ACCOUNT]: 13,
    [Span_1.FilterType.LICENSE]: 14,
    [Span_1.FilterType.VEHICLE]: 15,
    [Span_1.FilterType.DEVICE]: 16,
    [Span_1.FilterType.HEALTH_PLAN]: 17,
    [Span_1.FilterType.BIOMETRIC]: 18,
    [Span_1.FilterType.CREDIT_CARD]: 19,
    [Span_1.FilterType.PASSPORT]: 20,
};
/**
 * TinyBERT-based confidence ranker
 */
class TinyBertConfidenceRanker extends ONNXInference_1.ONNXInference {
    constructor(session, tokenizer) {
        super(session);
        this.tokenizer = tokenizer;
    }
    /**
     * Create a new TinyBertConfidenceRanker instance
     */
    static async create() {
        // Load model via ModelManager
        const loadedModel = await ModelManager_1.ModelManager.loadModel("tinybert");
        // Load tokenizer vocabulary
        const modelsDir = ModelManager_1.ModelManager.getModelsDirectory();
        const vocabPath = path.join(modelsDir, "tinybert", "vocab.json");
        let vocab;
        try {
            const vocabData = fs.readFileSync(vocabPath, "utf-8");
            vocab = JSON.parse(vocabData);
        }
        catch (error) {
            logger.warn(`Could not load vocab from ${vocabPath}, using default BERT vocab`);
            // Use a minimal default vocab if not found
            vocab = getDefaultBertVocab();
        }
        const tokenizer = new ONNXInference_1.SimpleWordPieceTokenizer(vocab, { maxLength: MAX_SEQ_LENGTH });
        return new TinyBertConfidenceRanker(loadedModel.session, tokenizer);
    }
    /**
     * Check if re-ranking should run based on configuration
     */
    static shouldRun() {
        return FeatureToggles_1.FeatureToggles.isMLConfidenceEnabled();
    }
    /**
     * Check if a span is in the borderline confidence range
     */
    static isBorderline(confidence) {
        return confidence >= BORDERLINE_MIN && confidence <= BORDERLINE_MAX;
    }
    /**
     * Re-rank confidence scores for a batch of spans
     */
    async rerank(spans, text) {
        if (!this.tokenizer) {
            logger.error("Tokenizer not initialized");
            return spans;
        }
        // Filter to borderline spans only
        const borderlineSpans = spans.filter((s) => TinyBertConfidenceRanker.isBorderline(s.confidence));
        if (borderlineSpans.length === 0) {
            logger.debug("No borderline spans to re-rank");
            return spans;
        }
        logger.debug(`Re-ranking ${borderlineSpans.length} borderline spans`);
        try {
            // Extract features for all borderline spans
            const features = borderlineSpans.map((span) => this.extractFeatures(span, text));
            // Run batch inference
            const newConfidences = await this.predictBatch(features);
            // Update span confidences
            for (let i = 0; i < borderlineSpans.length; i++) {
                const span = borderlineSpans[i];
                const newConfidence = newConfidences[i];
                // Blend original and predicted confidence (70% ML, 30% original)
                // This prevents wild swings from model errors
                const blendedConfidence = 0.7 * newConfidence + 0.3 * span.confidence;
                logger.debug(`Span "${span.text.substring(0, 20)}...": ${span.confidence.toFixed(3)} -> ${blendedConfidence.toFixed(3)}`);
                span.confidence = blendedConfidence;
            }
            return spans;
        }
        catch (error) {
            logger.error(`Re-ranking failed: ${error}`);
            return spans; // Return unchanged on error
        }
    }
    /**
     * Extract features from a span for confidence prediction
     */
    extractFeatures(span, text) {
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
    async predictBatch(features) {
        const batchSize = features.length;
        // Tokenize all inputs
        const encodedInputs = features.map((f) => {
            // Create input text: [CLS] context [SEP] span [SEP] type_info [SEP]
            const inputText = `${f.context} ${f.spanText}`;
            return this.tokenizer.encode(inputText, { addSpecialTokens: true });
        });
        // Pad to same length
        const maxLen = Math.min(MAX_SEQ_LENGTH, Math.max(...encodedInputs.map((e) => e.input_ids.length)));
        const paddedInputIds = [];
        const paddedAttentionMask = [];
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
        const auxFeatures = features.map((f) => [
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
        const feeds = {};
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
        let predictions = [];
        // Look for logits or confidence output
        for (const name of outputNames) {
            const output = outputs[name];
            if (output) {
                const data = this.extractFloatArray(output);
                if (output.dims.length === 1) {
                    // Direct confidence output
                    predictions = Array.from(data).map((x) => this.sigmoid(x));
                }
                else if (output.dims.length === 2) {
                    // Batch output [batch, classes]
                    const numClasses = output.dims[1];
                    for (let i = 0; i < batchSize; i++) {
                        if (numClasses === 1) {
                            // Single sigmoid output
                            predictions.push(this.sigmoid(data[i]));
                        }
                        else if (numClasses === 2) {
                            // Binary classification (negative, positive)
                            const logits = [data[i * 2], data[i * 2 + 1]];
                            const probs = this.softmax(logits);
                            predictions.push(probs[1]); // Probability of positive class
                        }
                        else {
                            // Multi-class - use max probability
                            const classLogits = [];
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
exports.TinyBertConfidenceRanker = TinyBertConfidenceRanker;
/**
 * Get a minimal default BERT vocabulary
 * This is a fallback if vocab.json is not found
 */
function getDefaultBertVocab() {
    // Minimal vocab with special tokens and common characters
    const vocab = {
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
let rankerInstance = null;
let instancePromise = null;
/**
 * Get or create the TinyBertConfidenceRanker singleton
 */
async function getConfidenceRanker() {
    // Check if ML confidence is enabled
    if (!TinyBertConfidenceRanker.shouldRun()) {
        return null;
    }
    // Check if model is available
    if (!ModelManager_1.ModelManager.modelAvailable("tinybert")) {
        logger.warn("TinyBERT model not found. Run 'npm run models:download' to download.");
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
exports.default = TinyBertConfidenceRanker;
//# sourceMappingURL=TinyBertConfidenceRanker.js.map