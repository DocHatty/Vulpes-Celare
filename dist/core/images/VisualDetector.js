"use strict";
/**
 * VisualDetector - Face and Visual PHI Detection using UltraFace ONNX
 *
 * Detects faces and other visual PHI (biometric identifiers) in images
 * using the lightweight UltraFace model via ONNX Runtime.
 *
 * @module core/images/VisualDetector
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualDetector = void 0;
const ort = __importStar(require("onnxruntime-node"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = require("./logger");
// ============================================================================
// CONSTANTS
// ============================================================================
const SERVICE_NAME = 'VisualDetector';
const DEFAULT_CONFIG = {
    modelPath: path.join(__dirname, '../../../models/vision/ultraface.onnx'),
    confidenceThreshold: 0.7,
    useGPU: false,
    nmsThreshold: 0.3,
    debug: false,
    inferenceTimeoutMs: 30000,
};
// UltraFace input dimensions
const INPUT_WIDTH = 640;
const INPUT_HEIGHT = 480;
// ============================================================================
// SERVICE CLASS
// ============================================================================
/**
 * VisualDetector - Detects faces and visual PHI
 */
class VisualDetector {
    constructor(config = {}) {
        this.session = null;
        this.initialized = false;
        this.initializing = false;
        this.initError = null;
        this.logger = (0, logger_1.getLogger)();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger.debug(SERVICE_NAME, 'constructor', 'VisualDetector created', {
            model: this.config.modelPath,
            confidenceThreshold: this.config.confidenceThreshold,
        });
    }
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    /**
     * Initialize the ONNX model
     */
    async initialize() {
        if (this.initialized)
            return;
        // Prevent race conditions
        if (this.initializing) {
            while (this.initializing) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            if (this.initError)
                throw this.initError;
            return;
        }
        this.initializing = true;
        const complete = this.logger.startOperation(SERVICE_NAME, 'initialize');
        try {
            const sessionOptions = {
                executionProviders: this.config.useGPU ? ['cuda', 'cpu'] : ['cpu'],
            };
            if (!fs.existsSync(this.config.modelPath)) {
                throw new Error(`Model not found: ${this.config.modelPath}`);
            }
            this.session = await ort.InferenceSession.create(this.config.modelPath, sessionOptions);
            this.initialized = true;
            complete(true);
            this.logger.info(SERVICE_NAME, 'initialize', 'Model loaded successfully', {
                inputNames: this.session.inputNames,
                outputNames: this.session.outputNames,
            });
        }
        catch (error) {
            this.initError = error instanceof Error ? error : new Error(String(error));
            complete(false, this.initError.message);
            this.logger.error(SERVICE_NAME, 'initialize', 'Initialization failed', this.initError);
            throw this.initError;
        }
        finally {
            this.initializing = false;
        }
    }
    /**
     * Detect faces in an image
     */
    async detect(imageBuffer, width, height) {
        // Validate input
        if (!imageBuffer || imageBuffer.length === 0) {
            this.logger.warn(SERVICE_NAME, 'detect', 'Empty image buffer provided');
            return [];
        }
        if (!this.initialized) {
            await this.initialize();
        }
        if (!this.session) {
            this.logger.warn(SERVICE_NAME, 'detect', 'Model not loaded');
            return [];
        }
        const complete = this.logger.startOperation(SERVICE_NAME, 'detect');
        try {
            // Get image dimensions
            const metadata = await this.getImageMetadata(imageBuffer);
            const origW = width || metadata.width || 640;
            const origH = height || metadata.height || 480;
            this.logger.debug(SERVICE_NAME, 'detect', 'Processing image', {
                width: origW,
                height: origH,
                bufferSize: imageBuffer.length,
            });
            // Run detection with timeout
            const detections = await (0, logger_1.withTimeout)(SERVICE_NAME, 'runInference', () => this.runInference(imageBuffer, origW, origH), this.config.inferenceTimeoutMs);
            complete(true);
            this.logger.info(SERVICE_NAME, 'detect', `Detected ${detections.length} objects`, {
                faces: detections.filter(d => d.type === 'FACE').length,
            });
            return detections;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            complete(false, err.message);
            this.logger.error(SERVICE_NAME, 'detect', 'Detection failed', err);
            return [];
        }
    }
    /**
     * Check if model is loaded
     */
    isModelLoaded() {
        return this.session !== null;
    }
    /**
     * Check if service is ready
     */
    isReady() {
        return this.initialized && this.isModelLoaded();
    }
    /**
     * Get service status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            modelLoaded: this.isModelLoaded(),
            config: {
                confidenceThreshold: this.config.confidenceThreshold,
                useGPU: this.config.useGPU,
                nmsThreshold: this.config.nmsThreshold,
                debug: this.config.debug,
                inferenceTimeoutMs: this.config.inferenceTimeoutMs,
            },
        };
    }
    /**
     * Release resources
     */
    async dispose() {
        const complete = this.logger.startOperation(SERVICE_NAME, 'dispose');
        try {
            if (this.session) {
                await this.session.release();
                this.session = null;
            }
            this.initialized = false;
            this.initError = null;
            complete(true);
            this.logger.info(SERVICE_NAME, 'dispose', 'VisualDetector disposed');
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            complete(false, err.message);
            this.logger.error(SERVICE_NAME, 'dispose', 'Disposal failed', err);
        }
    }
    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================
    async getImageMetadata(imageBuffer) {
        try {
            return await (0, sharp_1.default)(imageBuffer).metadata();
        }
        catch (error) {
            this.logger.warn(SERVICE_NAME, 'getImageMetadata', 'Failed to read metadata');
            return { width: 640, height: 480 };
        }
    }
    async runInference(imageBuffer, origW, origH) {
        if (!this.session)
            return [];
        // Preprocess image
        const { data } = await (0, sharp_1.default)(imageBuffer)
            .resize(INPUT_WIDTH, INPUT_HEIGHT, { fit: 'fill' })
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        // Normalize to CHW format
        const pixels = INPUT_WIDTH * INPUT_HEIGHT;
        const floatData = new Float32Array(3 * pixels);
        for (let i = 0; i < pixels; i++) {
            floatData[0 * pixels + i] = data[i * 3 + 0] / 255.0;
            floatData[1 * pixels + i] = data[i * 3 + 1] / 255.0;
            floatData[2 * pixels + i] = data[i * 3 + 2] / 255.0;
        }
        // Run inference
        const tensor = new ort.Tensor('float32', floatData, [1, 3, INPUT_HEIGHT, INPUT_WIDTH]);
        const inputName = this.session.inputNames[0] || 'input';
        const results = await this.session.run({ [inputName]: tensor });
        // Parse output
        return this.parseOutput(results, origW, origH);
    }
    parseOutput(results, origW, origH) {
        const detections = [];
        const outputNames = Object.keys(results);
        // Find scores and boxes tensors
        let scoresData = null;
        let boxesData = null;
        let numDetections = 0;
        for (const name of outputNames) {
            const tensor = results[name];
            const dims = tensor.dims;
            const data = tensor.data;
            if (dims.length === 3 && dims[2] === 2) {
                scoresData = data;
                numDetections = dims[1];
            }
            else if (dims.length === 3 && dims[2] === 4) {
                boxesData = data;
            }
        }
        if (!scoresData || !boxesData) {
            this.logger.warn(SERVICE_NAME, 'parseOutput', 'Could not find scores/boxes in output');
            return detections;
        }
        // Scale factors
        const scaleX = origW / INPUT_WIDTH;
        const scaleY = origH / INPUT_HEIGHT;
        // Collect candidates above threshold
        const candidates = [];
        for (let i = 0; i < numDetections; i++) {
            const confidence = scoresData[i * 2 + 1];
            if (confidence >= this.config.confidenceThreshold) {
                const x1 = boxesData[i * 4 + 0] * INPUT_WIDTH * scaleX;
                const y1 = boxesData[i * 4 + 1] * INPUT_HEIGHT * scaleY;
                const x2 = boxesData[i * 4 + 2] * INPUT_WIDTH * scaleX;
                const y2 = boxesData[i * 4 + 3] * INPUT_HEIGHT * scaleY;
                candidates.push({
                    box: {
                        x: Math.max(0, x1),
                        y: Math.max(0, y1),
                        width: Math.max(1, x2 - x1),
                        height: Math.max(1, y2 - y1),
                    },
                    confidence,
                });
            }
        }
        // Apply NMS
        const nmsResults = this.nms(candidates);
        for (const result of nmsResults) {
            detections.push({
                type: 'FACE',
                box: result.box,
                confidence: result.confidence,
            });
        }
        return detections;
    }
    nms(candidates) {
        if (candidates.length === 0)
            return [];
        // Sort by confidence descending
        candidates.sort((a, b) => b.confidence - a.confidence);
        const kept = [];
        const suppressed = new Set();
        for (let i = 0; i < candidates.length; i++) {
            if (suppressed.has(i))
                continue;
            kept.push(candidates[i]);
            for (let j = i + 1; j < candidates.length; j++) {
                if (suppressed.has(j))
                    continue;
                const iou = this.calculateIoU(candidates[i].box, candidates[j].box);
                if (iou > this.config.nmsThreshold) {
                    suppressed.add(j);
                }
            }
        }
        return kept;
    }
    calculateIoU(a, b) {
        const x1 = Math.max(a.x, b.x);
        const y1 = Math.max(a.y, b.y);
        const x2 = Math.min(a.x + a.width, b.x + b.width);
        const y2 = Math.min(a.y + a.height, b.y + b.height);
        if (x2 <= x1 || y2 <= y1)
            return 0;
        const intersection = (x2 - x1) * (y2 - y1);
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;
        const union = areaA + areaB - intersection;
        return union > 0 ? intersection / union : 0;
    }
}
exports.VisualDetector = VisualDetector;
exports.default = VisualDetector;
//# sourceMappingURL=VisualDetector.js.map