"use strict";
/**
 * OCRService - High-Performance Text Extraction using Vulpes "Ferrari" Engine (Rust)
 *
 * This service wraps the high-performance Rust core (VulpesNative) which provides:
 * - PaddleOCR v4 Detection & Recognition via ONNX Runtime (C++)
 * - Multi-threaded inference
 * - DB Post-processing & CTC Decoding
 * - 10-20x performance boost over pure JS implementation
 *
 * @module core/images/OCRService
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
exports.OCRService = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const logger_1 = require("./logger");
const VulpesNative_1 = require("../../VulpesNative");
// ============================================================================
// CONSTANTS
// ============================================================================
const SERVICE_NAME = 'OCRService';
const DEFAULT_CONFIG = {
    detectionModelPath: path.join(__dirname, '../../../models/ocr/det.onnx'),
    recognitionModelPath: path.join(__dirname, '../../../models/ocr/rec.onnx'),
    confidenceThreshold: 0.5,
};
// ============================================================================
// SERVICE CLASS
// ============================================================================
/**
 * OCRService - Extracts text and bounding boxes from images using Rust Native Core
 */
class OCRService {
    constructor(config = {}) {
        this.engine = null;
        this.initialized = false;
        this.initError = null;
        this.logger = (0, logger_1.getLogger)();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger.debug(SERVICE_NAME, 'constructor', 'OCRService created', {
            detectionModel: this.config.detectionModelPath,
            recognitionModel: this.config.recognitionModelPath,
        });
    }
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    /**
     * Initialize the Native Rust Engine.
     */
    async initialize() {
        if (this.initialized)
            return;
        const complete = this.logger.startOperation(SERVICE_NAME, 'initialize');
        try {
            // Validate model files exist
            if (!fs.existsSync(this.config.detectionModelPath)) {
                throw new Error(`Detection model not found: ${this.config.detectionModelPath}`);
            }
            if (!fs.existsSync(this.config.recognitionModelPath)) {
                throw new Error(`Recognition model not found: ${this.config.recognitionModelPath}`);
            }
            // Initialize Rust Core Logging
            const status = VulpesNative_1.VulpesNative.initCore();
            this.logger.info(SERVICE_NAME, 'initialize', 'Rust core initialized', { status });
            // Create Engine Instance
            this.engine = new VulpesNative_1.VulpesNative(this.config.detectionModelPath, this.config.recognitionModelPath);
            this.initialized = true;
            complete(true);
            this.logger.info(SERVICE_NAME, 'initialize', 'Vulpes Ferrari Engine (Rust) ready');
        }
        catch (error) {
            this.initError = error instanceof Error ? error : new Error(String(error));
            complete(false, this.initError.message);
            this.logger.error(SERVICE_NAME, 'initialize', 'Native initialization failed', this.initError);
            throw this.initError;
        }
    }
    /**
     * Extract text and bounding boxes from an image buffer via Rust Native
     */
    async extractText(imageBuffer, width, height) {
        // Validate input
        if (!imageBuffer || imageBuffer.length === 0) {
            this.logger.warn(SERVICE_NAME, 'extractText', 'Empty image buffer provided');
            return [];
        }
        if (!this.initialized) {
            await this.initialize();
        }
        if (!this.engine) {
            this.logger.error(SERVICE_NAME, 'extractText', 'Engine not initialized');
            return [];
        }
        const complete = this.logger.startOperation(SERVICE_NAME, 'extractText');
        try {
            this.logger.debug(SERVICE_NAME, 'extractText', 'Processing image with Rust engine', {
                bufferSize: imageBuffer.length
            });
            // CALL RUST ENGINE
            const nativeResults = this.engine.detectText(imageBuffer);
            // Convert native results to service format
            const results = [];
            for (const item of nativeResults) {
                if (item.confidence >= this.config.confidenceThreshold) {
                    results.push(this.mapNativeResult(item));
                }
            }
            complete(true);
            this.logger.info(SERVICE_NAME, 'extractText', `Extracted ${results.length} text segments (Rust)`, {
                rawCount: nativeResults.length,
                filteredCount: results.length,
            });
            return results;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            complete(false, err.message);
            this.logger.error(SERVICE_NAME, 'extractText', 'Native text extraction failed', err);
            return [];
        }
    }
    /**
     * Check if service is ready
     */
    isReady() {
        return this.initialized && this.engine !== null;
    }
    /**
     * Release resources
     */
    async dispose() {
        this.engine = null;
        this.initialized = false;
        this.logger.info(SERVICE_NAME, 'dispose', 'OCRService disposed');
    }
    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================
    mapNativeResult(native) {
        return {
            text: native.text,
            confidence: native.confidence,
            box: this.pointsToBox(native.boxPoints)
        };
    }
    pointsToBox(points) {
        if (!points || points.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            const x = p[0] || 0;
            const y = p[1] || 0;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
        }
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}
exports.OCRService = OCRService;
exports.default = OCRService;
//# sourceMappingURL=OCRService.js.map