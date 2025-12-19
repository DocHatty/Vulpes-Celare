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
import * as fs from "fs";
import * as path from "path";
import { ONNXInference } from "./ONNXInference";
import { ModelManager } from "./ModelManager";
import { vulpesLogger } from "../utils/VulpesLogger";

const logger = vulpesLogger.forComponent("GlinerInference");

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
export class GlinerInference extends ONNXInference {
  private vocab: Map<string, number> = new Map();
  private idToToken: Map<number, string> = new Map();

  // Default entity labels for PHI detection
  static readonly DEFAULT_LABELS = [
    "patient_name",
    "provider_name",
    "person_name",
    "family_member",
  ];

  // Special token IDs (will be set from config)
  private clsId = 101;
  private sepId = 102;
  private padId = 0;
  private unkId = 100;
  private maxLength = 512;
  private maxWidth = 12; // Maximum entity width in tokens

  /**
   * Create GLiNER inference from ModelManager
   */
  static async create(): Promise<GlinerInference> {
    const model = await ModelManager.loadModel("gliner");
    const inference = new GlinerInference(model.session);
    await inference.loadConfig();
    return inference;
  }

  /**
   * Load tokenizer and model configuration
   */
  private async loadConfig(): Promise<void> {
    const modelsDir = ModelManager.getModelsDirectory();
    const glinerDir = path.join(modelsDir, "gliner");

    // Try to load tokenizer config
    const tokenizerPath = path.join(glinerDir, "tokenizer.json");
    if (fs.existsSync(tokenizerPath)) {
      try {
        const content = fs.readFileSync(tokenizerPath, "utf-8");
        const tokenizer = JSON.parse(content);

        // Extract vocab
        if (tokenizer.model?.vocab) {
          this.vocab = new Map(Object.entries(tokenizer.model.vocab));
          for (const [token, id] of this.vocab) {
            this.idToToken.set(id as number, token);
          }
        }

        // Extract special tokens
        this.clsId = this.vocab.get("[CLS]") ?? 101;
        this.sepId = this.vocab.get("[SEP]") ?? 102;
        this.padId = this.vocab.get("[PAD]") ?? 0;
        this.unkId = this.vocab.get("[UNK]") ?? 100;

        logger.debug(`Loaded tokenizer with ${this.vocab.size} tokens`);
      } catch (error) {
        logger.warn(`Failed to load tokenizer config: ${error}`);
      }
    }

    // Try to load model config
    const configPath = path.join(glinerDir, "config.json");
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf-8");
        const config = JSON.parse(content);

        this.maxLength = config.max_length || 512;
        this.maxWidth = config.max_width || 12;

        logger.debug(`Loaded model config: maxLength=${this.maxLength}, maxWidth=${this.maxWidth}`);
      } catch (error) {
        logger.warn(`Failed to load model config: ${error}`);
      }
    }
  }

  /**
   * Predict entities in text
   *
   * @param text - Input text to analyze
   * @param labels - Entity labels to detect (default: patient/provider names)
   * @param threshold - Minimum confidence threshold (default: 0.5)
   */
  async predict(
    text: string,
    labels: string[] = GlinerInference.DEFAULT_LABELS,
    threshold: number = 0.5
  ): Promise<GlinerEntity[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    try {
      // Tokenize text
      const tokenized = this.tokenize(text);

      // Prepare entity type embeddings
      const labelTokens = this.tokenizeLabels(labels);

      // Create input tensors
      const feeds = this.createInputFeeds(tokenized, labelTokens, labels.length);

      // Run inference
      const outputs = await this.runInference(feeds);

      // Decode entities from output
      const entities = this.decodeEntities(
        outputs,
        text,
        tokenized,
        labels,
        threshold
      );

      return entities;
    } catch (error) {
      logger.error(`GLiNER prediction failed: ${error}`);
      return [];
    }
  }

  /**
   * Tokenize input text
   */
  private tokenize(text: string): {
    inputIds: number[];
    attentionMask: number[];
    tokenToChar: Map<number, [number, number]>;
  } {
    const inputIds: number[] = [this.clsId];
    const attentionMask: number[] = [1];
    const tokenToChar = new Map<number, [number, number]>();

    // Simple word-level tokenization with character tracking
    const words = this.splitIntoWords(text);

    let tokenIdx = 1; // Start after [CLS]
    for (const { word, start, end } of words) {
      const wordTokens = this.tokenizeWord(word.toLowerCase());

      for (let i = 0; i < wordTokens.length; i++) {
        if (inputIds.length >= this.maxLength - 1) break;

        inputIds.push(wordTokens[i]);
        attentionMask.push(1);

        // Map token to character span
        // For subwords, map to the original word span
        tokenToChar.set(tokenIdx, [start, end]);
        tokenIdx++;
      }

      if (inputIds.length >= this.maxLength - 1) break;
    }

    // Add [SEP]
    inputIds.push(this.sepId);
    attentionMask.push(1);

    return { inputIds, attentionMask, tokenToChar };
  }

  /**
   * Split text into words with character positions
   */
  private splitIntoWords(text: string): Array<{ word: string; start: number; end: number }> {
    const words: Array<{ word: string; start: number; end: number }> = [];
    const regex = /\S+/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      words.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return words;
  }

  /**
   * Tokenize a single word into subword tokens
   */
  private tokenizeWord(word: string): number[] {
    // If we have a vocab, use word-piece tokenization
    if (this.vocab.size > 0) {
      // Check if whole word is in vocab
      if (this.vocab.has(word)) {
        return [this.vocab.get(word)!];
      }

      // Try word-piece tokenization
      const subTokens: number[] = [];
      let start = 0;

      while (start < word.length) {
        let end = word.length;
        let found = false;

        while (start < end) {
          let substr = word.slice(start, end);
          if (start > 0) {
            substr = "##" + substr;
          }

          if (this.vocab.has(substr)) {
            subTokens.push(this.vocab.get(substr)!);
            found = true;
            break;
          }
          end--;
        }

        if (!found) {
          subTokens.push(this.unkId);
          break;
        }

        start = end;
      }

      return subTokens;
    }

    // Fallback: return unknown token
    return [this.unkId];
  }

  /**
   * Tokenize entity labels
   */
  private tokenizeLabels(labels: string[]): number[][] {
    return labels.map(label => {
      // Convert label to tokens (e.g., "patient_name" -> "patient", "name")
      const words = label.replace(/_/g, " ").toLowerCase().split(/\s+/);
      const tokens: number[] = [this.clsId];

      for (const word of words) {
        const wordTokens = this.tokenizeWord(word);
        tokens.push(...wordTokens);
      }

      tokens.push(this.sepId);
      return tokens;
    });
  }

  /**
   * Create input feeds for ONNX inference
   */
  private createInputFeeds(
    tokenized: { inputIds: number[]; attentionMask: number[] },
    labelTokens: number[][],
    _numLabels: number
  ): Record<string, ort.Tensor> {
    const { inputIds, attentionMask } = tokenized;

    // Create tensors - shape depends on model architecture
    // GLiNER typically expects:
    // - input_ids: [batch_size, seq_length]
    // - attention_mask: [batch_size, seq_length]
    // - entity_type_ids: [batch_size, num_entity_types, type_seq_length]

    const feeds: Record<string, ort.Tensor> = {};

    // Main input
    feeds["input_ids"] = this.createTensor2D([inputIds], "int64");
    feeds["attention_mask"] = this.createTensor2D([attentionMask], "int64");

    // Entity type inputs (if model expects them)
    const inputNames = this.getInputNames();

    if (inputNames.includes("entity_type_ids")) {
      // Pad label sequences to same length
      const maxLabelLen = Math.max(...labelTokens.map(t => t.length));
      const paddedLabels = labelTokens.map(tokens => {
        const padded = [...tokens];
        while (padded.length < maxLabelLen) {
          padded.push(this.padId);
        }
        return padded;
      });

      feeds["entity_type_ids"] = this.createTensor3D(
        [paddedLabels],
        "int64" as any
      );
    }

    if (inputNames.includes("entity_type_mask")) {
      const maxLabelLen = Math.max(...labelTokens.map(t => t.length));
      const labelMasks = labelTokens.map(tokens =>
        tokens.map((_, i) => i < tokens.length ? 1 : 0)
      );
      // Pad masks
      const paddedMasks = labelMasks.map(mask => {
        const padded = [...mask];
        while (padded.length < maxLabelLen) {
          padded.push(0);
        }
        return padded;
      });

      feeds["entity_type_mask"] = this.createTensor3D(
        [paddedMasks],
        "int64" as any
      );
    }

    // Word mask for span extraction
    if (inputNames.includes("word_mask")) {
      // Mark which tokens are word starts (not subwords)
      const wordMask = inputIds.map((_, i) => {
        if (i === 0 || i === inputIds.length - 1) return 0; // CLS/SEP
        return 1;
      });
      feeds["word_mask"] = this.createTensor2D([wordMask], "int64");
    }

    return feeds;
  }

  /**
   * Decode entities from model output
   */
  private decodeEntities(
    outputs: ort.InferenceSession.OnnxValueMapType,
    originalText: string,
    tokenized: { inputIds: number[]; tokenToChar: Map<number, [number, number]> },
    labels: string[],
    threshold: number
  ): GlinerEntity[] {
    const entities: GlinerEntity[] = [];

    // GLiNER output is typically:
    // - logits/scores: [batch_size, seq_length, seq_length, num_labels] or similar
    // The exact format depends on the model variant

    // Try different output formats
    let scores: Float32Array | null = null;
    let scoreTensor: ort.Tensor | null = null;

    for (const name of ["logits", "scores", "output", "span_logits"]) {
      if (outputs[name]) {
        scoreTensor = outputs[name] as ort.Tensor;
        scores = scoreTensor.data as Float32Array;
        break;
      }
    }

    if (!scores || !scoreTensor) {
      logger.warn("No recognized output tensor found in GLiNER output");
      return entities;
    }

    const dims = scoreTensor.dims;

    // Handle different output shapes
    if (dims.length === 4) {
      // [batch, seq, seq, num_labels] - span classification format
      const [, seqLen, , numLabels] = dims as number[];
      entities.push(...this.decodeSpanFormat(
        scores,
        seqLen,
        numLabels,
        tokenized,
        originalText,
        labels,
        threshold
      ));
    } else if (dims.length === 3) {
      // [batch, seq, num_labels] - token classification format
      const [, seqLen, numLabels] = dims as number[];
      entities.push(...this.decodeTokenFormat(
        scores,
        seqLen,
        numLabels,
        tokenized,
        originalText,
        labels,
        threshold
      ));
    }

    // Deduplicate overlapping entities (keep highest score)
    return this.deduplicateEntities(entities);
  }

  /**
   * Decode span-based output format
   */
  private decodeSpanFormat(
    scores: Float32Array,
    seqLen: number,
    numLabels: number,
    tokenized: { inputIds: number[]; tokenToChar: Map<number, [number, number]> },
    originalText: string,
    labels: string[],
    threshold: number
  ): GlinerEntity[] {
    const entities: GlinerEntity[] = [];
    const { tokenToChar } = tokenized;

    // Iterate over all possible spans
    for (let start = 1; start < seqLen - 1; start++) {
      for (let end = start; end < Math.min(start + this.maxWidth, seqLen - 1); end++) {
        for (let labelIdx = 0; labelIdx < Math.min(numLabels, labels.length); labelIdx++) {
          // Calculate index in flat array
          const idx = start * seqLen * numLabels + end * numLabels + labelIdx;
          const score = this.sigmoid(scores[idx]);

          if (score >= threshold) {
            // Get character positions
            const startChar = tokenToChar.get(start);
            const endChar = tokenToChar.get(end);

            if (startChar && endChar) {
              const text = originalText.slice(startChar[0], endChar[1]);

              // Skip if it's just whitespace or punctuation
              if (text.trim().length > 0 && /[a-zA-Z]/.test(text)) {
                entities.push({
                  text: text.trim(),
                  start: startChar[0],
                  end: endChar[1],
                  label: labels[labelIdx] || "unknown",
                  score,
                });
              }
            }
          }
        }
      }
    }

    return entities;
  }

  /**
   * Decode token-based output format (BIO tagging)
   */
  private decodeTokenFormat(
    scores: Float32Array,
    seqLen: number,
    numLabels: number,
    tokenized: { inputIds: number[]; tokenToChar: Map<number, [number, number]> },
    originalText: string,
    labels: string[],
    threshold: number
  ): GlinerEntity[] {
    const entities: GlinerEntity[] = [];
    const { tokenToChar } = tokenized;

    let currentEntity: {
      startToken: number;
      endToken: number;
      label: string;
      scores: number[];
    } | null = null;

    for (let tokenIdx = 1; tokenIdx < seqLen - 1; tokenIdx++) {
      // Find best label for this token
      let bestLabel = -1;
      let bestScore = -Infinity;

      for (let labelIdx = 0; labelIdx < numLabels; labelIdx++) {
        const idx = tokenIdx * numLabels + labelIdx;
        const score = scores[idx];
        if (score > bestScore) {
          bestScore = score;
          bestLabel = labelIdx;
        }
      }

      const prob = this.sigmoid(bestScore);

      if (prob >= threshold && bestLabel < labels.length) {
        // Start or continue entity
        if (currentEntity && currentEntity.label === labels[bestLabel]) {
          // Continue
          currentEntity.endToken = tokenIdx;
          currentEntity.scores.push(prob);
        } else {
          // Save previous entity
          if (currentEntity) {
            const entity = this.finalizeEntity(currentEntity, tokenToChar, originalText);
            if (entity) entities.push(entity);
          }
          // Start new entity
          currentEntity = {
            startToken: tokenIdx,
            endToken: tokenIdx,
            label: labels[bestLabel],
            scores: [prob],
          };
        }
      } else {
        // End current entity
        if (currentEntity) {
          const entity = this.finalizeEntity(currentEntity, tokenToChar, originalText);
          if (entity) entities.push(entity);
          currentEntity = null;
        }
      }
    }

    // Don't forget last entity
    if (currentEntity) {
      const entity = this.finalizeEntity(currentEntity, tokenToChar, originalText);
      if (entity) entities.push(entity);
    }

    return entities;
  }

  /**
   * Convert token-based entity to character-based
   */
  private finalizeEntity(
    entity: { startToken: number; endToken: number; label: string; scores: number[] },
    tokenToChar: Map<number, [number, number]>,
    originalText: string
  ): GlinerEntity | null {
    const startChar = tokenToChar.get(entity.startToken);
    const endChar = tokenToChar.get(entity.endToken);

    if (!startChar || !endChar) return null;

    const text = originalText.slice(startChar[0], endChar[1]).trim();
    if (text.length === 0) return null;

    const avgScore = entity.scores.reduce((a, b) => a + b, 0) / entity.scores.length;

    return {
      text,
      start: startChar[0],
      end: endChar[1],
      label: entity.label,
      score: avgScore,
    };
  }

  /**
   * Deduplicate overlapping entities, keeping highest score
   */
  private deduplicateEntities(entities: GlinerEntity[]): GlinerEntity[] {
    if (entities.length === 0) return entities;

    // Sort by score descending
    const sorted = [...entities].sort((a, b) => b.score - a.score);
    const kept: GlinerEntity[] = [];

    for (const entity of sorted) {
      // Check if overlaps with any kept entity
      const overlaps = kept.some(k =>
        (entity.start < k.end && entity.end > k.start)
      );

      if (!overlaps) {
        kept.push(entity);
      }
    }

    // Sort by position
    return kept.sort((a, b) => a.start - b.start);
  }

  /**
   * Override createTensor3D to support int64
   */
  protected createTensor3D(
    data: number[][][],
    dtype: "float32" | "int32" | "int64" = "float32"
  ): ort.Tensor {
    const dim0 = data.length;
    const dim1 = data[0]?.length || 0;
    const dim2 = data[0]?.[0]?.length || 0;
    const flat = data.flat(2);

    if (dtype === "int64") {
      const bigIntData = BigInt64Array.from(flat.map(n => BigInt(n)));
      return new ort.Tensor("int64", bigIntData, [dim0, dim1, dim2]);
    } else if (dtype === "float32") {
      return new ort.Tensor("float32", Float32Array.from(flat), [dim0, dim1, dim2]);
    } else {
      return new ort.Tensor("int32", Int32Array.from(flat), [dim0, dim1, dim2]);
    }
  }
}

export default GlinerInference;
