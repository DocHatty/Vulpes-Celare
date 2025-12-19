/**
 * ModelManager - Centralized ONNX Model Loading and Management
 *
 * Handles lazy loading, caching, and GPU/CPU execution provider selection
 * for all ML models used in Vulpes Celare.
 *
 * Features:
 * - Lazy loading (models only loaded when first needed)
 * - Singleton pattern for model caching
 * - Automatic GPU detection and fallback
 * - Model path resolution
 *
 * @module ml/ModelManager
 */

import * as ort from "onnxruntime-node";
import * as path from "path";
import * as fs from "fs";
import { vulpesLogger } from "../utils/VulpesLogger";

const logger = vulpesLogger.forComponent("ModelManager");

/**
 * Supported model types
 */
export type ModelType = "gliner" | "tinybert" | "fp_classifier";

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
}

/**
 * GPU execution provider options
 */
export type GPUProvider = "cuda" | "directml" | "coreml" | "cpu";

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
 * ModelManager singleton class
 */
class ModelManagerImpl {
  private models: Map<ModelType, LoadedModel> = new Map();
  private loadingPromises: Map<ModelType, Promise<LoadedModel>> = new Map();

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
   * Load a model (lazy, cached)
   */
  async loadModel(type: ModelType, customPath?: string): Promise<LoadedModel> {
    // Return cached model if already loaded
    if (this.models.has(type)) {
      return this.models.get(type)!;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(type)) {
      return this.loadingPromises.get(type)!;
    }

    // Start loading
    const loadingPromise = this._loadModel(type, customPath);
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
   * Internal model loading implementation
   */
  private async _loadModel(type: ModelType, customPath?: string): Promise<LoadedModel> {
    const modelPath = customPath || getDefaultModelPath(type);

    if (!modelExists(modelPath)) {
      throw new Error(
        `Model file not found: ${modelPath}\n` +
        `Run 'npm run models:download' to download required models.`
      );
    }

    logger.debug(`Loading ${type} model from ${modelPath}`);
    const startTime = Date.now();

    const providers = getExecutionProviders();

    try {
      const session = await ort.InferenceSession.create(modelPath, {
        executionProviders: providers,
        graphOptimizationLevel: "all",
      });

      const loadTimeMs = Date.now() - startTime;
      const executionProvider = this.detectExecutionProvider(session);

      logger.info(
        `Loaded ${type} model in ${loadTimeMs}ms using ${executionProvider}`
      );

      return {
        session,
        type,
        loadTimeMs,
        executionProvider,
      };
    } catch (error) {
      logger.error(`Failed to load ${type} model: ${error}`);
      throw error;
    }
  }

  /**
   * Detect which execution provider is actually being used
   */
  private detectExecutionProvider(_session: ort.InferenceSession): string {
    // ONNX Runtime doesn't expose this directly, so we infer from configuration
    const preferred = (process.env.VULPES_ML_DEVICE || "cpu").toLowerCase();

    // In practice, if the preferred provider was requested and no error occurred,
    // it's likely being used. Otherwise, CPU fallback.
    if (preferred === "cuda" || preferred === "directml" || preferred === "coreml") {
      return preferred;
    }

    return "cpu";
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
  getStatus(): Record<ModelType, { loaded: boolean; available: boolean; path: string }> {
    const types: ModelType[] = ["gliner", "tinybert", "fp_classifier"];

    const status: Record<ModelType, { loaded: boolean; available: boolean; path: string }> = {} as any;

    for (const type of types) {
      const modelPath = getDefaultModelPath(type);
      status[type] = {
        loaded: this.isLoaded(type),
        available: modelExists(modelPath),
        path: modelPath,
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
}

/**
 * Singleton instance
 */
export const ModelManager = new ModelManagerImpl();

export default ModelManager;
