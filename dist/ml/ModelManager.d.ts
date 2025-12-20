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
/**
 * Supported model types
 */
export type ModelType = "gliner" | "tinybert" | "fp_classifier" | "bio-clinicalbert" | "minilm-l6" | "biobert";
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
 * Get the preferred execution providers based on environment configuration
 */
declare function getExecutionProviders(): ort.InferenceSession.ExecutionProviderConfig[];
/**
 * Get the models directory path
 */
declare function getModelsDir(): string;
/**
 * Get the default path for a model type
 */
declare function getDefaultModelPath(type: ModelType): string;
/**
 * Check if a model file exists
 */
declare function modelExists(modelPath: string): boolean;
/**
 * ModelManager singleton class with optimized ONNX Runtime configuration
 */
declare class ModelManagerImpl {
    private models;
    private loadingPromises;
    private globalOptimizations;
    /**
     * Set global optimization options for all future model loads
     */
    setGlobalOptimizations(opts: SessionOptimizations): void;
    /**
     * Get current global optimization settings
     */
    getGlobalOptimizations(): SessionOptimizations;
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
     * Load a model with optimizations (lazy, cached)
     */
    loadModel(type: ModelType, customPath?: string, opts?: SessionOptimizations): Promise<LoadedModel>;
    /**
     * Pre-load multiple models concurrently
     */
    preloadModels(types: ModelType[], opts?: SessionOptimizations): Promise<Map<ModelType, LoadedModel>>;
    /**
     * Internal model loading implementation with optimizations
     */
    private _loadModel;
    /**
     * Warm up a session with dummy inference to prime JIT compilation
     */
    private warmUpSession;
    /**
     * Create dummy inputs for warm-up based on model type
     */
    private createWarmUpInputs;
    /**
     * Detect which execution provider is actually being used
     */
    private detectExecutionProvider;
    /**
     * Record inference timing for a model
     */
    recordInference(type: ModelType, durationMs: number): void;
    /**
     * Get performance metrics for a model
     */
    getMetrics(type: ModelType): ModelMetrics | undefined;
    /**
     * Get all model metrics
     */
    getAllMetrics(): Map<ModelType, ModelMetrics>;
    /**
     * Reset metrics for a model
     */
    resetMetrics(type: ModelType): void;
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
        precision?: ModelPrecision;
        warmedUp?: boolean;
        executionProvider?: string;
        metrics?: ModelMetrics;
    }>;
    /**
     * Get models directory path
     */
    getModelsDirectory(): string;
    /**
     * Get recommended thread configuration based on system
     */
    getRecommendedThreadConfig(): {
        intraOpThreads: number;
        interOpThreads: number;
    };
    /**
     * Check if a specific execution provider is likely available
     */
    checkProviderAvailability(provider: GPUProvider): boolean;
}
/**
 * Singleton instance
 */
export declare const ModelManager: ModelManagerImpl;
export default ModelManager;
export { getExecutionProviders, getModelsDir, getDefaultModelPath, modelExists };
//# sourceMappingURL=ModelManager.d.ts.map