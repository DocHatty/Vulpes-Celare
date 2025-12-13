"use strict";
/**
 * VisualDetector - Visual PHI detection (faces, signatures, etc.)
 *
 * Thin service wrapper around the Rust-native UltraFace detector.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualDetector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
const VulpesNative_1 = require("../../VulpesNative");
const SERVICE_NAME = "VisualDetector";
const DEFAULT_CONFIG = {
    modelPath: path.join(__dirname, "../../../models/vision/ultraface.onnx"),
    confidenceThreshold: 0.7,
    nmsThreshold: 0.3,
};
class VisualDetector {
    config;
    initialized = false;
    initError = null;
    logger = (0, logger_1.getLogger)();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger.debug(SERVICE_NAME, "constructor", "VisualDetector created", {
            modelPath: this.config.modelPath,
            confidenceThreshold: this.config.confidenceThreshold,
            nmsThreshold: this.config.nmsThreshold,
        });
    }
    async initialize() {
        if (this.initialized)
            return;
        const complete = this.logger.startOperation(SERVICE_NAME, "initialize");
        try {
            if (!fs.existsSync(this.config.modelPath)) {
                throw new Error(`UltraFace model not found: ${this.config.modelPath}`);
            }
            const status = VulpesNative_1.VulpesNative.initCore();
            this.logger.info(SERVICE_NAME, "initialize", "Rust core initialized", {
                status,
            });
            this.initialized = true;
            complete(true);
        }
        catch (error) {
            this.initError = error instanceof Error ? error : new Error(String(error));
            complete(false, this.initError.message);
            this.logger.error(SERVICE_NAME, "initialize", "VisualDetector initialization failed", this.initError);
            throw this.initError;
        }
    }
    isModelLoaded() {
        return this.initialized;
    }
    async detect(imageBuffer) {
        if (!imageBuffer || imageBuffer.length === 0)
            return [];
        if (!this.initialized)
            await this.initialize();
        if (this.initError)
            throw this.initError;
        const complete = this.logger.startOperation(SERVICE_NAME, "detect");
        try {
            const detections = VulpesNative_1.VulpesNative.detectFaces(imageBuffer, this.config.modelPath, this.config.confidenceThreshold, this.config.nmsThreshold);
            complete(true);
            return Array.isArray(detections) ? detections : [];
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            complete(false, err.message);
            this.logger.error(SERVICE_NAME, "detect", "Visual detection failed", err);
            return [];
        }
    }
    async dispose() {
        this.initialized = false;
        this.initError = null;
        this.logger.info(SERVICE_NAME, "dispose", "VisualDetector disposed");
    }
}
exports.VisualDetector = VisualDetector;
exports.default = VisualDetector;
//# sourceMappingURL=VisualDetector.js.map