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
 * ModelManager singleton class
 */
declare class ModelManagerImpl {
    private models;
    private loadingPromises;
    /**
     * Check if a model is loaded
     */
    isLoaded(type: ModelType): boolean;
    /**
     * Check if a model file exists (without loading it)
     */
    modelAvailable(type: ModelType): boolean;
    /**
     * Get a loaded model (throws if not loaded)
     */
    getModel(type: ModelType): LoadedModel | undefined;
    /**
     * Load a model (lazy, cached)
     */
    loadModel(type: ModelType, customPath?: string): Promise<LoadedModel>;
    /**
     * Internal model loading implementation
     */
    private _loadModel;
    /**
     * Detect which execution provider is actually being used
     */
    private detectExecutionProvider;
    /**
     * Unload a specific model
     */
    unloadModel(type: ModelType): Promise<void>;
    /**
     * Unload all models
     */
    unloadAll(): Promise<void>;
    /**
     * Get model loading status for all types
     */
    getStatus(): Record<ModelType, {
        loaded: boolean;
        available: boolean;
        path: string;
    }>;
    /**
     * Get models directory path
     */
    getModelsDirectory(): string;
}
/**
 * Singleton instance
 */
export declare const ModelManager: ModelManagerImpl;
export default ModelManager;
//# sourceMappingURL=ModelManager.d.ts.map