/**
 * EnsembleEmbeddingService - Multi-Model Embedding Fusion
 *
 * Generates high-quality semantic embeddings by combining multiple
 * transformer models specialized for different aspects:
 * - Bio_ClinicalBERT: Clinical/medical domain understanding
 * - MiniLM-L6-v2: Fast general semantic similarity
 * - BioBERT: Biomedical entity recognition
 *
 * Features:
 * - Weighted fusion of embeddings from multiple models
 * - LRU cache for computed embeddings
 * - Graceful degradation if models unavailable
 * - Batch inference for efficiency
 *
 * @module ml/EnsembleEmbeddingService
 */

import * as ort from "onnxruntime-node";
import * as path from "path";
import * as fs from "fs";
import { ONNXInference, SimpleWordPieceTokenizer } from "./ONNXInference";
import { ModelManager, ModelType } from "./ModelManager";
import { FeatureToggles } from "../config/FeatureToggles";
import { vulpesLogger } from "../utils/VulpesLogger";

const logger = vulpesLogger.forComponent("EnsembleEmbeddingService");

/**
 * Configuration for each embedding model
 */
interface EmbeddingModelConfig {
  /** Model identifier for ModelManager */
  modelId: string;
  /** Weight in ensemble fusion (0-1) */
  weight: number;
  /** Embedding dimension */
  dimension: number;
  /** Maximum sequence length */
  maxLength: number;
  /** Description for logging */
  description: string;
  /** Whether this is a required model */
  required: boolean;
}

/**
 * Model configurations for the ensemble
 */
const MODEL_CONFIGS: EmbeddingModelConfig[] = [
  {
    modelId: "bio-clinicalbert",
    weight: 0.45,
    dimension: 768,
    maxLength: 512,
    description: "Bio_ClinicalBERT - Clinical domain embeddings",
    required: false,
  },
  {
    modelId: "minilm-l6",
    weight: 0.35,
    dimension: 384,
    maxLength: 256,
    description: "MiniLM-L6-v2 - Fast semantic similarity",
    required: true, // Required for basic functionality
  },
  {
    modelId: "biobert",
    weight: 0.20,
    dimension: 768,
    maxLength: 512,
    description: "BioBERT - Biomedical NER embeddings",
    required: false,
  },
];

/**
 * Unified output embedding dimension (projected from all models)
 */
const UNIFIED_DIMENSION = 256;

/**
 * LRU Cache entry with embedding and metadata
 */
interface CacheEntry {
  embedding: Float32Array;
  timestamp: number;
  hitCount: number;
}

/**
 * LRU Cache for embeddings
 */
class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  /**
   * Get embedding from cache
   */
  get(key: string): Float32Array | null {
    const entry = this.cache.get(key);
    if (entry) {
      entry.hitCount++;
      entry.timestamp = Date.now();
      this.hits++;
      return entry.embedding;
    }
    this.misses++;
    return null;
  }

  /**
   * Set embedding in cache with LRU eviction
   */
  set(key: string, embedding: Float32Array): void {
    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      hitCount: 1,
    });
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      // Consider both timestamp and hit count for eviction
      const score = entry.timestamp - entry.hitCount * 1000;
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear all cached embeddings
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
}

/**
 * Loaded model with session and tokenizer
 */
interface LoadedModel {
  config: EmbeddingModelConfig;
  session: ort.InferenceSession;
  tokenizer: SimpleWordPieceTokenizer;
  projectionMatrix: Float32Array | null;
}

/**
 * Ensemble Embedding Service
 *
 * Combines multiple transformer models to generate high-quality
 * embeddings for PHI disambiguation and semantic analysis.
 */
export class EnsembleEmbeddingService extends ONNXInference {
  private models: Map<string, LoadedModel> = new Map();
  private cache: EmbeddingCache;
  private projectionMatrices: Map<string, Float32Array> = new Map();
  private initialized = false;

  private constructor() {
    // Call parent with null session - we manage multiple sessions
    super(null as any, undefined);
    this.cache = new EmbeddingCache(10000);
  }

  /**
   * Create and initialize the ensemble service
   */
  static async create(): Promise<EnsembleEmbeddingService> {
    const service = new EnsembleEmbeddingService();
    await service.initialize();
    return service;
  }

  /**
   * Check if ensemble embeddings are enabled
   */
  static isEnabled(): boolean {
    return FeatureToggles.isEnsembleEmbeddingsEnabled?.() ?? true;
  }

  /**
   * Initialize all available models
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info("Initializing EnsembleEmbeddingService...");

    let loadedCount = 0;
    let requiredLoaded = true;

    for (const config of MODEL_CONFIGS) {
      try {
        const loaded = await this.loadModel(config);
        if (loaded) {
          this.models.set(config.modelId, loaded);
          loadedCount++;
          logger.info(`Loaded ${config.description}`);
        } else if (config.required) {
          requiredLoaded = false;
          logger.error(`Required model ${config.modelId} not available`);
        }
      } catch (error) {
        logger.warn(`Failed to load ${config.modelId}: ${error}`);
        if (config.required) {
          requiredLoaded = false;
        }
      }
    }

    if (!requiredLoaded) {
      throw new Error("Required embedding model(s) not available. Run 'npm run models:download'");
    }

    if (loadedCount === 0) {
      throw new Error("No embedding models available");
    }

    // Normalize weights based on loaded models
    this.normalizeWeights();

    // Initialize projection matrices for dimension reduction
    await this.initializeProjections();

    this.initialized = true;
    logger.info(`EnsembleEmbeddingService initialized with ${loadedCount} models`);
  }

  /**
   * Load a single model
   */
  private async loadModel(config: EmbeddingModelConfig): Promise<LoadedModel | null> {
    // Check if model is available
    if (!ModelManager.modelAvailable(config.modelId as ModelType)) {
      logger.debug(`Model ${config.modelId} not available`);
      return null;
    }

    try {
      const loadedModel = await ModelManager.loadModel(config.modelId as ModelType);
      const modelsDir = ModelManager.getModelsDirectory();
      const vocabPath = path.join(modelsDir, config.modelId, "vocab.json");

      let vocab: Record<string, number>;
      try {
        const vocabData = fs.readFileSync(vocabPath, "utf-8");
        vocab = JSON.parse(vocabData);
      } catch {
        // Try tokenizer.json format
        const tokenizerPath = path.join(modelsDir, config.modelId, "tokenizer.json");
        if (fs.existsSync(tokenizerPath)) {
          const tokenizerData = JSON.parse(fs.readFileSync(tokenizerPath, "utf-8"));
          vocab = tokenizerData.model?.vocab || {};
        } else {
          logger.warn(`No vocabulary found for ${config.modelId}`);
          vocab = this.getDefaultVocab();
        }
      }

      const tokenizer = new SimpleWordPieceTokenizer(vocab, {
        maxLength: config.maxLength,
      });

      return {
        config,
        session: loadedModel.session,
        tokenizer,
        projectionMatrix: null,
      };
    } catch (error) {
      logger.error(`Error loading model ${config.modelId}: ${error}`);
      return null;
    }
  }

  /**
   * Normalize weights based on loaded models
   */
  private normalizeWeights(): void {
    const totalWeight = Array.from(this.models.values())
      .reduce((sum, m) => sum + m.config.weight, 0);

    if (totalWeight > 0 && totalWeight !== 1) {
      for (const model of this.models.values()) {
        model.config.weight /= totalWeight;
      }
    }
  }

  /**
   * Initialize projection matrices for dimension reduction
   */
  private async initializeProjections(): Promise<void> {
    for (const [modelId, model] of this.models) {
      const projPath = path.join(
        ModelManager.getModelsDirectory(),
        modelId,
        "projection.bin"
      );

      if (fs.existsSync(projPath)) {
        // Load pre-computed projection matrix
        const buffer = fs.readFileSync(projPath);
        model.projectionMatrix = new Float32Array(buffer.buffer);
      } else {
        // Generate random orthogonal projection (for initial use)
        model.projectionMatrix = this.generateRandomProjection(
          model.config.dimension,
          UNIFIED_DIMENSION
        );
      }

      this.projectionMatrices.set(modelId, model.projectionMatrix);
    }
  }

  /**
   * Generate random orthogonal projection matrix
   * Uses Gram-Schmidt orthogonalization
   */
  private generateRandomProjection(inputDim: number, outputDim: number): Float32Array {
    const matrix = new Float32Array(inputDim * outputDim);

    // Initialize with random values
    for (let i = 0; i < matrix.length; i++) {
      matrix[i] = (Math.random() - 0.5) * 2 / Math.sqrt(inputDim);
    }

    // Gram-Schmidt orthogonalization (simplified)
    for (let col = 0; col < outputDim; col++) {
      // Get column vector
      const colStart = col;

      // Normalize
      let norm = 0;
      for (let row = 0; row < inputDim; row++) {
        norm += matrix[row * outputDim + colStart] ** 2;
      }
      norm = Math.sqrt(norm);

      if (norm > 0) {
        for (let row = 0; row < inputDim; row++) {
          matrix[row * outputDim + colStart] /= norm;
        }
      }
    }

    return matrix;
  }

  /**
   * Get embedding for a single text
   */
  async embed(text: string): Promise<Float32Array> {
    const embeddings = await this.embedBatch([text]);
    return embeddings[0];
  }

  /**
   * Get embeddings for multiple texts (batch)
   */
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.initialized) {
      throw new Error("EnsembleEmbeddingService not initialized");
    }

    const results: Float32Array[] = [];
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    // Check cache first
    for (let i = 0; i < texts.length; i++) {
      const cacheKey = this.getCacheKey(texts[i]);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(texts[i]);
      }
    }

    // Compute embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const computed = await this.computeEmbeddings(uncachedTexts);

      for (let j = 0; j < uncachedTexts.length; j++) {
        const originalIndex = uncachedIndices[j];
        results[originalIndex] = computed[j];

        // Cache the result
        const cacheKey = this.getCacheKey(uncachedTexts[j]);
        this.cache.set(cacheKey, computed[j]);
      }
    }

    return results;
  }

  /**
   * Compute embeddings using the ensemble
   */
  private async computeEmbeddings(texts: string[]): Promise<Float32Array[]> {
    const modelEmbeddings: Map<string, Float32Array[]> = new Map();

    // Get embeddings from each model
    for (const [modelId, model] of this.models) {
      try {
        const embeddings = await this.runModelInference(model, texts);
        modelEmbeddings.set(modelId, embeddings);
      } catch (error) {
        logger.warn(`Model ${modelId} inference failed: ${error}`);
      }
    }

    // Fuse embeddings
    const fused = this.fuseEmbeddings(texts.length, modelEmbeddings);
    return fused;
  }

  /**
   * Run inference on a single model
   */
  private async runModelInference(
    model: LoadedModel,
    texts: string[]
  ): Promise<Float32Array[]> {
    const batchSize = texts.length;

    // Tokenize all texts
    const encodedInputs = texts.map((text) =>
      model.tokenizer.encode(text, { addSpecialTokens: true })
    );

    // Pad to same length
    const maxLen = Math.min(
      model.config.maxLength,
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

    // Create tensors
    const inputIdsTensor = this.createTensor2D(paddedInputIds, "int64");
    const attentionMaskTensor = this.createTensor2D(paddedAttentionMask, "int64");

    const feeds: Record<string, ort.Tensor> = {
      input_ids: inputIdsTensor,
      attention_mask: attentionMaskTensor,
    };

    // Add token_type_ids if needed
    const inputNames = model.session.inputNames;
    if (inputNames.includes("token_type_ids")) {
      const tokenTypeIds = paddedInputIds.map((ids) => ids.map(() => 0));
      feeds["token_type_ids"] = this.createTensor2D(tokenTypeIds, "int64");
    }

    // Run inference
    const outputs = await model.session.run(feeds);

    // Extract embeddings (use [CLS] token or mean pooling)
    const embeddings = this.extractEmbeddings(
      outputs,
      batchSize,
      model.config.dimension,
      paddedAttentionMask
    );

    // Project to unified dimension
    const projected = embeddings.map((emb) =>
      this.projectEmbedding(emb, model.projectionMatrix!)
    );

    return projected;
  }

  /**
   * Extract embeddings from model output
   */
  private extractEmbeddings(
    outputs: ort.InferenceSession.OnnxValueMapType,
    batchSize: number,
    _dimension: number,
    attentionMasks: number[][]
  ): Float32Array[] {
    // Try different output tensor names
    const outputTensor =
      outputs["last_hidden_state"] ||
      outputs["pooler_output"] ||
      outputs["embeddings"] ||
      outputs[Object.keys(outputs)[0]];

    if (!outputTensor) {
      throw new Error("No output tensor found");
    }

    const data = this.extractFloatArray(outputTensor);
    const dims = outputTensor.dims;
    const embeddings: Float32Array[] = [];

    if (dims.length === 3) {
      // [batch, seq_len, hidden_size] - use mean pooling
      const seqLen = dims[1] as number;
      const hiddenSize = dims[2] as number;

      for (let b = 0; b < batchSize; b++) {
        const embedding = new Float32Array(hiddenSize);
        let count = 0;

        for (let s = 0; s < seqLen; s++) {
          if (attentionMasks[b][s] === 1) {
            for (let h = 0; h < hiddenSize; h++) {
              embedding[h] += data[b * seqLen * hiddenSize + s * hiddenSize + h];
            }
            count++;
          }
        }

        // Average
        if (count > 0) {
          for (let h = 0; h < hiddenSize; h++) {
            embedding[h] /= count;
          }
        }

        // L2 normalize
        this.l2Normalize(embedding);
        embeddings.push(embedding);
      }
    } else if (dims.length === 2) {
      // [batch, hidden_size] - already pooled
      const hiddenSize = dims[1] as number;

      for (let b = 0; b < batchSize; b++) {
        const embedding = new Float32Array(hiddenSize);
        for (let h = 0; h < hiddenSize; h++) {
          embedding[h] = data[b * hiddenSize + h];
        }
        this.l2Normalize(embedding);
        embeddings.push(embedding);
      }
    }

    return embeddings;
  }

  /**
   * Project embedding to unified dimension
   */
  private projectEmbedding(
    embedding: Float32Array,
    projectionMatrix: Float32Array
  ): Float32Array {
    const inputDim = embedding.length;
    const outputDim = UNIFIED_DIMENSION;
    const projected = new Float32Array(outputDim);

    for (let o = 0; o < outputDim; o++) {
      let sum = 0;
      for (let i = 0; i < inputDim; i++) {
        sum += embedding[i] * projectionMatrix[i * outputDim + o];
      }
      projected[o] = sum;
    }

    this.l2Normalize(projected);
    return projected;
  }

  /**
   * Fuse embeddings from multiple models
   */
  private fuseEmbeddings(
    count: number,
    modelEmbeddings: Map<string, Float32Array[]>
  ): Float32Array[] {
    const fused: Float32Array[] = [];

    for (let i = 0; i < count; i++) {
      const embedding = new Float32Array(UNIFIED_DIMENSION);

      for (const [modelId, embeddings] of modelEmbeddings) {
        const model = this.models.get(modelId);
        if (!model || !embeddings[i]) continue;

        const weight = model.config.weight;
        for (let d = 0; d < UNIFIED_DIMENSION; d++) {
          embedding[d] += weight * embeddings[i][d];
        }
      }

      // L2 normalize final embedding
      this.l2Normalize(embedding);
      fused.push(embedding);
    }

    return fused;
  }

  /**
   * L2 normalize a vector in-place
   */
  private l2Normalize(vector: Float32Array): void {
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
  }

  /**
   * Compute cosine similarity between two embeddings
   */
  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error("Embedding dimensions must match");
    }

    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }

    // Vectors are already L2 normalized, so dot product = cosine similarity
    return dot;
  }

  /**
   * Find most similar embedding from a set
   */
  findMostSimilar(
    query: Float32Array,
    candidates: Float32Array[],
    topK: number = 1
  ): Array<{ index: number; similarity: number }> {
    const similarities = candidates.map((candidate, index) => ({
      index,
      similarity: this.cosineSimilarity(query, candidate),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK);
  }

  /**
   * Generate cache key for text
   */
  private getCacheKey(text: string): string {
    // Use text content as key (truncated for memory)
    const normalized = text.toLowerCase().trim().substring(0, 200);
    return normalized;
  }

  /**
   * Get default vocabulary (fallback)
   */
  private getDefaultVocab(): Record<string, number> {
    const vocab: Record<string, number> = {
      "[PAD]": 0,
      "[UNK]": 100,
      "[CLS]": 101,
      "[SEP]": 102,
      "[MASK]": 103,
    };

    // Add lowercase letters
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(97 + i);
      vocab[char] = 1000 + i;
    }

    // Add digits
    for (let i = 0; i < 10; i++) {
      vocab[String(i)] = 2000 + i;
    }

    return vocab;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info("Embedding cache cleared");
  }

  /**
   * Get list of loaded models
   */
  getLoadedModels(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Get embedding dimension
   */
  getEmbeddingDimension(): number {
    return UNIFIED_DIMENSION;
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    for (const model of this.models.values()) {
      await model.session.release?.();
    }
    this.models.clear();
    this.cache.clear();
    this.initialized = false;
    logger.info("EnsembleEmbeddingService disposed");
  }
}

/**
 * Singleton instance management
 */
let serviceInstance: EnsembleEmbeddingService | null = null;
let instancePromise: Promise<EnsembleEmbeddingService | null> | null = null;

/**
 * Get or create the EnsembleEmbeddingService singleton
 */
export async function getEnsembleEmbeddingService(): Promise<EnsembleEmbeddingService | null> {
  // Check if ensemble embeddings are enabled
  if (!EnsembleEmbeddingService.isEnabled()) {
    return null;
  }

  // Return existing instance
  if (serviceInstance) {
    return serviceInstance;
  }

  // Return existing loading promise
  if (instancePromise) {
    return instancePromise;
  }

  // Create new instance
  instancePromise = EnsembleEmbeddingService.create()
    .then((instance) => {
      serviceInstance = instance;
      logger.info("EnsembleEmbeddingService singleton created");
      return instance;
    })
    .catch((error) => {
      logger.warn(`Failed to create EnsembleEmbeddingService: ${error}`);
      instancePromise = null;
      return null;
    });

  return instancePromise;
}

/**
 * Reset singleton (for testing)
 */
export function resetEnsembleEmbeddingService(): void {
  if (serviceInstance) {
    serviceInstance.dispose();
  }
  serviceInstance = null;
  instancePromise = null;
}

export default EnsembleEmbeddingService;
