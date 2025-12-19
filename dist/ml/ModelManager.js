"use strict";
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
exports.ModelManager = void 0;
const ort = __importStar(require("onnxruntime-node"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const VulpesLogger_1 = require("../utils/VulpesLogger");
const logger = VulpesLogger_1.vulpesLogger.forComponent("ModelManager");
/**
 * Get the preferred execution providers based on environment configuration
 */
function getExecutionProviders() {
    const preferred = (process.env.VULPES_ML_DEVICE || "cpu").toLowerCase();
    const deviceId = parseInt(process.env.VULPES_ML_GPU_DEVICE_ID || "0", 10);
    const providers = [];
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
function getModelsDir() {
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
function getDefaultModelPath(type) {
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
function modelExists(modelPath) {
    try {
        return fs.existsSync(modelPath);
    }
    catch {
        return false;
    }
}
/**
 * ModelManager singleton class
 */
class ModelManagerImpl {
    models = new Map();
    loadingPromises = new Map();
    /**
     * Check if a model is loaded
     */
    isLoaded(type) {
        return this.models.has(type);
    }
    /**
     * Check if a model file exists (without loading it)
     */
    modelAvailable(type) {
        const modelPath = getDefaultModelPath(type);
        return modelExists(modelPath);
    }
    /**
     * Get a loaded model (throws if not loaded)
     */
    getModel(type) {
        return this.models.get(type);
    }
    /**
     * Load a model (lazy, cached)
     */
    async loadModel(type, customPath) {
        // Return cached model if already loaded
        if (this.models.has(type)) {
            return this.models.get(type);
        }
        // Return existing loading promise if in progress
        if (this.loadingPromises.has(type)) {
            return this.loadingPromises.get(type);
        }
        // Start loading
        const loadingPromise = this._loadModel(type, customPath);
        this.loadingPromises.set(type, loadingPromise);
        try {
            const model = await loadingPromise;
            this.models.set(type, model);
            return model;
        }
        finally {
            this.loadingPromises.delete(type);
        }
    }
    /**
     * Internal model loading implementation
     */
    async _loadModel(type, customPath) {
        const modelPath = customPath || getDefaultModelPath(type);
        if (!modelExists(modelPath)) {
            throw new Error(`Model file not found: ${modelPath}\n` +
                `Run 'npm run models:download' to download required models.`);
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
            logger.info(`Loaded ${type} model in ${loadTimeMs}ms using ${executionProvider}`);
            return {
                session,
                type,
                loadTimeMs,
                executionProvider,
            };
        }
        catch (error) {
            logger.error(`Failed to load ${type} model: ${error}`);
            throw error;
        }
    }
    /**
     * Detect which execution provider is actually being used
     */
    detectExecutionProvider(_session) {
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
    async unloadModel(type) {
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
    async unloadAll() {
        for (const type of this.models.keys()) {
            await this.unloadModel(type);
        }
    }
    /**
     * Get model loading status for all types
     */
    getStatus() {
        const types = ["gliner", "tinybert", "fp_classifier"];
        const status = {};
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
    getModelsDirectory() {
        return getModelsDir();
    }
}
/**
 * Singleton instance
 */
exports.ModelManager = new ModelManagerImpl();
exports.default = exports.ModelManager;
//# sourceMappingURL=ModelManager.js.map