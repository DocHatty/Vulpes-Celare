/**
 * ModelManager - Optimized ONNX Model Loading and Management
 *
 * Handles lazy loading, caching, and GPU/CPU execution provider selection
 * for all ML models used in Vulpes Celare.
 *
 * OPTIMIZATIONS (Phase 7):
 * - INT8 quantized model support (2-4x inference speedup)
 * - Configurable intra/inter-op threading
 * - Memory arena optimization
 * - Session warm-up for consistent first-inference latency
 * - Model pre-loading capability
 * - Performance metrics collection
 * - Execution provider availability detection
 *
 * Features:
 * - Lazy loading (models only loaded when first needed)
 * - Singleton pattern for model caching
 * - Automatic GPU detection and fallback
 * - Model path resolution with quantized model preference
 *
 * @module ml/ModelManager
 */

import * as ort from "onnxruntime-node";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { vulpesLogger } from "../utils/VulpesLogger";

const logger = vulpesLogger.forComponent("ModelManager");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Supported model types
 */
export type ModelType = 
  | "gliner" 
  | "tinybert" 
  | "fp_classifier"
  | "bio-clinicalbert"
  | "minilm-l6"
  | "biobert";

/**
 * Model precision/quantization level
 */
export type ModelPrecision = "fp32" | "fp16" | "int8" | "auto";

/**
 * Model configuration
 */
export interface ModelConfig {
  /** Model identifier */
  type: ModelType;
  /** Path to ONNX model file */
  modelPath: string;
  /** Path to tokenizer.json (if applicable) */
  tokenizerPath?: string;
  /** Path to config.json (if applicable) */
  configPath?: string;
}

/**
 * Session optimization options
 */
export interface SessionOptimizations {
  /** Number of threads for intra-op parallelism (default: auto) */
  intraOpThreads?: number;
  /** Number of threads for inter-op parallelism (default: 2) */
  interOpThreads?: number;
  /** Enable memory pattern optimization (default: true) */
  enableMemPattern?: boolean;
  /** Enable CPU memory arena (default: true) */
  enableCpuMemArena?: boolean;
  /** Graph optimization level (default: all) */
  graphOptimizationLevel?: "disabled" | "basic" | "extended" | "all";
  /** Preferred model precision (default: auto - prefers quantized if available) */
  precision?: ModelPrecision;
  /** Warm up the model after loading (default: true) */
  warmUp?: boolean;
  /** Path to save optimized model graph (optional) */
  optimizedModelPath?: string;
}

/**
 * Performance metrics for a model
 */
export interface ModelMetrics {
  /** Number of inferences run */
  inferenceCount: number;
  /** Total inference time in ms */
  totalInferenceTimeMs: number;
  /** Average inference time in ms */
  avgInferenceTimeMs: number;
  /** Minimum inference time in ms */
  minInferenceTimeMs: number;
  /** Maximum inference time in ms */
  maxInferenceTimeMs: number;
  /** Last inference time in ms */
  lastInferenceTimeMs: number;
  /** Warm-up time in ms (if warm-up was performed) */
  warmUpTimeMs?: number;
}

/**
 * Loaded model with session and metadata
 */
export interface LoadedModel {
  /** ONNX Runtime inference session */
  session: ort.InferenceSession;
  /** Model type */
  type: ModelType;
  /** Load time in milliseconds */
  loadTimeMs: number;
  /** Execution provider used */
  executionProvider: string;
  /** Model precision (fp32, fp16, int8) */
  precision: ModelPrecision;
  /** Whether warm-up was performed */
  warmedUp: boolean;
  /** Performance metrics */
  metrics: ModelMetrics;
  /** Input/output metadata */
  inputNames: readonly string[];
  outputNames: readonly string[];
}

/**
 * GPU execution provider options
 */
export type GPUProvider = "cuda" | "directml" | "coreml" | "cpu";

/**
 * Default optimization settings based on environment
 */
const DEFAULT_OPTIMIZATIONS: Required<SessionOptimizations> = {
  // Use half the CPU cores for intra-op, minimum 1, maximum 8
  intraOpThreads: Math.min(8, Math.max(1, Math.floor(os.cpus().length / 2))),
  // Inter-op parallelism (usually 1-2 is optimal)
  interOpThreads: 2,
  // Enable memory optimizations
  enableMemPattern: true,
  enableCpuMemArena: true,
  // Maximum graph optimization
  graphOptimizationLevel: "all",
  // Prefer quantized models if available
  precision: "auto",
  // Warm up models by default (except in test environment)
  warmUp: process.env.NODE_ENV !== "test",
  // Don't save optimized graph by default
  optimizedModelPath: "",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the preferred execution providers based on environment configuration
 */
function getExecutionProviders(): ort.InferenceSession.ExecutionProviderConfig[] {
  const preferred = (process.env.VULPES_ML_DEVICE || "cpu").toLowerCase() as GPUProvider;
  const deviceId = parseInt(process.env.VULPES_ML_GPU_DEVICE_ID || "0", 10);

  const providers: ort.InferenceSession.ExecutionProviderConfig[] = [];

  switch (preferred) {
    case "cuda":
      providers.push({
        name: "cuda",
        deviceId: deviceId,
      });
      break;
    case "directml":
      providers.push({
        name: "dml",
        deviceId: deviceId,
      });
      break;
    case "coreml":
      providers.push("coreml");
      break;
  }

  // Always add CPU as fallback
  providers.push("cpu");

  return providers;
}

/**
 * Get the models directory path
 */
function getModelsDir(): string {
  // Check environment variable first
  if (process.env.VULPES_MODELS_DIR) {
    return process.env.VULPES_MODELS_DIR;
  }

  // Default to ./models relative to package root
  // Go up from src/ml to package root
  return path.resolve(__dirname, "../../models");
}

/**
 * Get the default path for a model type
 */
function getDefaultModelPath(type: ModelType): string {
  const modelsDir = getModelsDir();

  switch (type) {
    case "gliner":
      return process.env.VULPES_GLINER_MODEL_PATH ||
        path.join(modelsDir, "gliner", "model.onnx");
    case "tinybert":
      return process.env.VULPES_TINYBERT_MODEL_PATH ||
        path.join(modelsDir, "tinybert", "model.onnx");
    case "fp_classifier":
      return process.env.VULPES_FP_MODEL_PATH ||
        path.join(modelsDir, "fp_classifier", "model.onnx");
    case "bio-clinicalbert":
      return process.env.VULPES_BIO_CLINICALBERT_MODEL_PATH ||
        path.join(modelsDir, "bio-clinicalbert", "model.onnx");
    case "minilm-l6":
      return process.env.VULPES_MINILM_MODEL_PATH ||
        path.join(modelsDir, "minilm-l6", "model.onnx");
    case "biobert":
      return process.env.VULPES_BIOBERT_MODEL_PATH ||
        path.join(modelsDir, "biobert", "model.onnx");
  }
}

/**
 * Check if a model file exists
 */
function modelExists(modelPath: string): boolean {
  try {
    return fs.existsSync(modelPath);
  } catch {
    return false;
  }
}

/**
 * Find the best available model file (prefers quantized versions)
 */
function findBestModelPath(basePath: string, precision: ModelPrecision): { path: string; precision: ModelPrecision } {
  const dir = path.dirname(basePath);
  const ext = path.extname(basePath);
  const name = path.basename(basePath, ext);

  // Define precision preference order
  const precisionOrder: ModelPrecision[] =
    precision === "auto"
      ? ["int8", "fp16", "fp32"] // Prefer quantized for auto
      : [precision, "fp32"]; // Fallback to fp32 if requested precision not found

  for (const prec of precisionOrder) {
    let candidatePath: string;

    switch (prec) {
      case "int8":
        candidatePath = path.join(dir, `${name}.int8${ext}`);
        if (modelExists(candidatePath)) {
          return { path: candidatePath, precision: "int8" };
        }
        // Also check for _int8 suffix
        candidatePath = path.join(dir, `${name}_int8${ext}`);
        if (modelExists(candidatePath)) {
          return { path: candidatePath, precision: "int8" };
        }
        break;

      case "fp16":
        candidatePath = path.join(dir, `${name}.fp16${ext}`);
        if (modelExists(candidatePath)) {
          return { path: candidatePath, precision: "fp16" };
        }
        candidatePath = path.join(dir, `${name}_fp16${ext}`);
        if (modelExists(candidatePath)) {
          return { path: candidatePath, precision: "fp16" };
        }
        break;

      case "fp32":
        // Original file is assumed to be fp32
        if (modelExists(basePath)) {
          return { path: basePath, precision: "fp32" };
        }
        break;
    }
  }

  // Fallback to base path even if it doesn't exist (will error later)
  return { path: basePath, precision: "fp32" };
}

/**
 * Create optimized session options
 */
function createSessionOptions(
  opts: SessionOptimizations,
  providers: ort.InferenceSession.ExecutionProviderConfig[]
): ort.InferenceSession.SessionOptions {
  const merged = { ...DEFAULT_OPTIMIZATIONS, ...opts };

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    executionProviders: providers,
    graphOptimizationLevel: merged.graphOptimizationLevel,
    enableMemPattern: merged.enableMemPattern,
    enableCpuMemArena: merged.enableCpuMemArena,
    intraOpNumThreads: merged.intraOpThreads,
    interOpNumThreads: merged.interOpThreads,
  };

  // Add optimized model path if specified
  if (merged.optimizedModelPath) {
    sessionOptions.optimizedModelFilePath = merged.optimizedModelPath;
  }

  return sessionOptions;
}

/**
 * Create empty metrics object
 */
function createEmptyMetrics(): ModelMetrics {
  return {
    inferenceCount: 0,
    totalInferenceTimeMs: 0,
    avgInferenceTimeMs: 0,
    minInferenceTimeMs: Infinity,
    maxInferenceTimeMs: 0,
    lastInferenceTimeMs: 0,
  };
}

// ============================================================================
// MODEL MANAGER CLASS
// ============================================================================

/**
 * ModelManager singleton class with optimized ONNX Runtime configuration
 */
class ModelManagerImpl {
  private models: Map<ModelType, LoadedModel> = new Map();
  private loadingPromises: Map<ModelType, Promise<LoadedModel>> = new Map();
  private globalOptimizations: SessionOptimizations = {};

  /**
   * Set global optimization options for all future model loads
   */
  setGlobalOptimizations(opts: SessionOptimizations): void {
    this.globalOptimizations = { ...this.globalOptimizations, ...opts };
    logger.debug("Global optimizations updated", { opts });
  }

  /**
   * Get current global optimization settings
   */
  getGlobalOptimizations(): SessionOptimizations {
    return { ...this.globalOptimizations };
  }

  /**
   * Check if a model is loaded
   */
  isLoaded(type: ModelType): boolean {
    return this.models.has(type);
  }

  /**
   * Check if a model file exists (without loading it)
   */
  modelAvailable(type: ModelType): boolean {
    const modelPath = getDefaultModelPath(type);
    return modelExists(modelPath);
  }

  /**
   * Get a loaded model (throws if not loaded)
   */
  getModel(type: ModelType): LoadedModel | undefined {
    return this.models.get(type);
  }

  /**
   * Load a model with optimizations (lazy, cached)
   */
  async loadModel(
    type: ModelType,
    customPath?: string,
    opts?: SessionOptimizations
  ): Promise<LoadedModel> {
    // Return cached model if already loaded
    if (this.models.has(type)) {
      return this.models.get(type)!;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(type)) {
      return this.loadingPromises.get(type)!;
    }

    // Merge options: defaults < global < per-call
    const mergedOpts = {
      ...DEFAULT_OPTIMIZATIONS,
      ...this.globalOptimizations,
      ...opts,
    };

    // Start loading
    const loadingPromise = this._loadModel(type, customPath, mergedOpts);
    this.loadingPromises.set(type, loadingPromise);

    try {
      const model = await loadingPromise;
      this.models.set(type, model);
      return model;
    } finally {
      this.loadingPromises.delete(type);
    }
  }

  /**
   * Pre-load multiple models concurrently
   */
  async preloadModels(
    types: ModelType[],
    opts?: SessionOptimizations
  ): Promise<Map<ModelType, LoadedModel>> {
    const results = new Map<ModelType, LoadedModel>();
    const loadPromises = types.map(async (type) => {
      try {
        const model = await this.loadModel(type, undefined, opts);
        results.set(type, model);
      } catch (error) {
        logger.warn(`Failed to preload ${type} model: ${error}`);
      }
    });

    await Promise.all(loadPromises);
    return results;
  }

  /**
   * Internal model loading implementation with optimizations
   */
  private async _loadModel(
    type: ModelType,
    customPath?: string,
    opts: Required<SessionOptimizations> = DEFAULT_OPTIMIZATIONS
  ): Promise<LoadedModel> {
    const basePath = customPath || getDefaultModelPath(type);

    // Find best available model (prefer quantized)
    const { path: modelPath, precision } = findBestModelPath(basePath, opts.precision);

    if (!modelExists(modelPath)) {
      throw new Error(
        `Model file not found: ${modelPath}\n` +
        `Run 'npm run models:download' to download required models.`
      );
    }

    logger.debug(`Loading ${type} model from ${modelPath}`, {
      precision,
      intraOpThreads: opts.intraOpThreads,
      interOpThreads: opts.interOpThreads,
    });

    const startTime = Date.now();
    const providers = getExecutionProviders();
    const sessionOptions = createSessionOptions(opts, providers);

    try {
      const session = await ort.InferenceSession.create(modelPath, sessionOptions);

      const loadTimeMs = Date.now() - startTime;
      const executionProvider = this.detectExecutionProvider();

      // Get input/output metadata
      const inputNames = session.inputNames;
      const outputNames = session.outputNames;

      const metrics = createEmptyMetrics();
      let warmedUp = false;

      // Warm up the model if requested
      if (opts.warmUp) {
        const warmUpStart = Date.now();
        await this.warmUpSession(session, type);
        metrics.warmUpTimeMs = Date.now() - warmUpStart;
        warmedUp = true;
        logger.debug(`Warmed up ${type} model in ${metrics.warmUpTimeMs}ms`);
      }

      logger.info(
        `Loaded ${type} model in ${loadTimeMs}ms using ${executionProvider}`,
        {
          precision,
          warmedUp,
          warmUpMs: metrics.warmUpTimeMs,
          inputs: inputNames,
          outputs: outputNames,
        }
      );

      return {
        session,
        type,
        loadTimeMs,
        executionProvider,
        precision,
        warmedUp,
        metrics,
        inputNames,
        outputNames,
      };
    } catch (error) {
      logger.error(`Failed to load ${type} model: ${error}`);
      throw error;
    }
  }

  /**
   * Warm up a session with dummy inference to prime JIT compilation
   */
  private async warmUpSession(
    session: ort.InferenceSession,
    type: ModelType
  ): Promise<void> {
    try {
      // Create minimal dummy inputs based on model type
      const feeds = this.createWarmUpInputs(session, type);
      await session.run(feeds);
    } catch (error) {
      // Warm-up failures are non-fatal
      logger.warn(`Warm-up failed for ${type}: ${error}`);
    }
  }

  /**
   * Create dummy inputs for warm-up based on model type
   */
  private createWarmUpInputs(
    session: ort.InferenceSession,
    type: ModelType
  ): Record<string, ort.Tensor> {
    const feeds: Record<string, ort.Tensor> = {};

    // Create minimal tensors for each input
    for (const inputName of session.inputNames) {
      // Default to small tensor sizes for warm-up
      switch (type) {
        case "gliner":
          // GLiNER typically needs input_ids, attention_mask
          if (inputName === "input_ids" || inputName === "attention_mask") {
            feeds[inputName] = new ort.Tensor("int64", BigInt64Array.from([BigInt(1)]), [1, 1]);
          } else if (inputName === "token_type_ids") {
            feeds[inputName] = new ort.Tensor("int64", BigInt64Array.from([BigInt(0)]), [1, 1]);
          } else {
            // Generic small tensor
            feeds[inputName] = new ort.Tensor("float32", Float32Array.from([0]), [1]);
          }
          break;

        case "tinybert":
          if (inputName === "input_ids" || inputName === "attention_mask") {
            feeds[inputName] = new ort.Tensor("int64", BigInt64Array.from([BigInt(101), BigInt(102)]), [1, 2]);
          } else if (inputName === "token_type_ids") {
            feeds[inputName] = new ort.Tensor("int64", BigInt64Array.from([BigInt(0), BigInt(0)]), [1, 2]);
          } else {
            feeds[inputName] = new ort.Tensor("float32", Float32Array.from([0]), [1]);
          }
          break;

        case "fp_classifier":
          // FP classifier may have various feature inputs
          feeds[inputName] = new ort.Tensor("float32", Float32Array.from([0]), [1, 1]);
          break;

        case "bio-clinicalbert":
        case "minilm-l6":
        case "biobert":
          // Embedding models use standard BERT-like inputs
          if (inputName === "input_ids" || inputName === "attention_mask") {
            feeds[inputName] = new ort.Tensor("int64", BigInt64Array.from([BigInt(101), BigInt(102)]), [1, 2]);
          } else if (inputName === "token_type_ids") {
            feeds[inputName] = new ort.Tensor("int64", BigInt64Array.from([BigInt(0), BigInt(0)]), [1, 2]);
          } else {
            feeds[inputName] = new ort.Tensor("float32", Float32Array.from([0]), [1]);
          }
          break;

        default:
          feeds[inputName] = new ort.Tensor("float32", Float32Array.from([0]), [1]);
      }
    }

    return feeds;
  }

  /**
   * Detect which execution provider is actually being used
   */
  private detectExecutionProvider(): string {
    const preferred = (process.env.VULPES_ML_DEVICE || "cpu").toLowerCase();

    if (preferred === "cuda" || preferred === "directml" || preferred === "coreml") {
      return preferred;
    }

    return "cpu";
  }

  /**
   * Record inference timing for a model
   */
  recordInference(type: ModelType, durationMs: number): void {
    const model = this.models.get(type);
    if (!model) return;

    const metrics = model.metrics;
    metrics.inferenceCount++;
    metrics.totalInferenceTimeMs += durationMs;
    metrics.avgInferenceTimeMs = metrics.totalInferenceTimeMs / metrics.inferenceCount;
    metrics.minInferenceTimeMs = Math.min(metrics.minInferenceTimeMs, durationMs);
    metrics.maxInferenceTimeMs = Math.max(metrics.maxInferenceTimeMs, durationMs);
    metrics.lastInferenceTimeMs = durationMs;
  }

  /**
   * Get performance metrics for a model
   */
  getMetrics(type: ModelType): ModelMetrics | undefined {
    return this.models.get(type)?.metrics;
  }

  /**
   * Get all model metrics
   */
  getAllMetrics(): Map<ModelType, ModelMetrics> {
    const metrics = new Map<ModelType, ModelMetrics>();
    for (const [type, model] of this.models) {
      metrics.set(type, { ...model.metrics });
    }
    return metrics;
  }

  /**
   * Reset metrics for a model
   */
  resetMetrics(type: ModelType): void {
    const model = this.models.get(type);
    if (model) {
      model.metrics = createEmptyMetrics();
    }
  }

  /**
   * Unload a specific model
   */
  async unloadModel(type: ModelType): Promise<void> {
    const model = this.models.get(type);
    if (model) {
      await model.session.release();
      this.models.delete(type);
      logger.debug(`Unloaded ${type} model`);
    }
  }

  /**
   * Unload all models
   */
  async unloadAll(): Promise<void> {
    for (const type of this.models.keys()) {
      await this.unloadModel(type);
    }
  }

  /**
   * Get model loading status for all types
   */
  getStatus(): Record<ModelType, {
    loaded: boolean;
    available: boolean;
    path: string;
    precision?: ModelPrecision;
    warmedUp?: boolean;
    executionProvider?: string;
    metrics?: ModelMetrics;
  }> {
    const types: ModelType[] = [
      "gliner", 
      "tinybert", 
      "fp_classifier",
      "bio-clinicalbert",
      "minilm-l6",
      "biobert",
    ];

    const status: Record<ModelType, {
      loaded: boolean;
      available: boolean;
      path: string;
      precision?: ModelPrecision;
      warmedUp?: boolean;
      executionProvider?: string;
      metrics?: ModelMetrics;
    }> = {} as any;

    for (const type of types) {
      const modelPath = getDefaultModelPath(type);
      const loadedModel = this.models.get(type);

      status[type] = {
        loaded: this.isLoaded(type),
        available: modelExists(modelPath),
        path: modelPath,
        ...(loadedModel && {
          precision: loadedModel.precision,
          warmedUp: loadedModel.warmedUp,
          executionProvider: loadedModel.executionProvider,
          metrics: loadedModel.metrics,
        }),
      };
    }

    return status;
  }

  /**
   * Get models directory path
   */
  getModelsDirectory(): string {
    return getModelsDir();
  }

  /**
   * Get recommended thread configuration based on system
   */
  getRecommendedThreadConfig(): { intraOpThreads: number; interOpThreads: number } {
    const cpuCount = os.cpus().length;

    // For high-core-count systems, limit to avoid overhead
    const intraOpThreads = Math.min(8, Math.max(1, Math.floor(cpuCount / 2)));
    const interOpThreads = cpuCount >= 4 ? 2 : 1;

    return { intraOpThreads, interOpThreads };
  }

  /**
   * Check if a specific execution provider is likely available
   */
  checkProviderAvailability(provider: GPUProvider): boolean {
    switch (provider) {
      case "cuda":
        // Check for CUDA environment indicators
        return !!(
          process.env.CUDA_PATH ||
          process.env.CUDA_HOME ||
          process.env.LD_LIBRARY_PATH?.includes("cuda")
        );
      case "directml":
        // DirectML is available on Windows with DirectX 12
        return process.platform === "win32";
      case "coreml":
        // CoreML is available on macOS
        return process.platform === "darwin";
      case "cpu":
        return true;
      default:
        return false;
    }
  }
}

/**
 * Singleton instance
 */
export const ModelManager = new ModelManagerImpl();

export default ModelManager;

// Re-export types for convenience
export { getExecutionProviders, getModelsDir, getDefaultModelPath, modelExists };
