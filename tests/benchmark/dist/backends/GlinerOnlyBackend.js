"use strict";
/**
 * ============================================================================
 * GLINER-ONLY BACKEND
 * ============================================================================
 *
 * Detection backend using only GLiNER ML model (no rules).
 * Pure ML-based zero-shot named entity recognition.
 *
 * Environment: VULPES_NAME_DETECTION_MODE=gliner
 *
 * @module benchmark/backends/GlinerOnlyBackend
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
exports.GlinerOnlyBackend = void 0;
exports.createGlinerOnlyBackend = createGlinerOnlyBackend;
const BaseBackend_1 = require("./BaseBackend");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * GLiNER-only detection backend
 *
 * Uses GLiNER zero-shot NER for all PHI detection.
 * This tests pure ML performance without rule assistance.
 *
 * GLiNER entity labels:
 * - patient_name
 * - provider_name
 * - person_name
 * - family_member
 * - location
 * - date
 * - phone_number
 * - email
 * - ssn
 * - medical_record_number
 */
class GlinerOnlyBackend extends BaseBackend_1.BaseBackend {
    id = 'vulpes-gliner-v1';
    name = 'Vulpes Celare (GLiNER Only)';
    type = 'ml';
    glinerModelPath = null;
    glinerAvailable = false;
    getDetectionMode() {
        return 'gliner';
    }
    async doInitialize() {
        // Verify GLiNER is enabled
        if (process.env.VULPES_USE_GLINER !== '1') {
            console.warn(`[${this.id}] Warning: VULPES_USE_GLINER should be enabled for gliner mode`);
        }
        // Check GLiNER model availability
        this.glinerModelPath = process.env.VULPES_GLINER_MODEL_PATH ||
            path.join(process.cwd(), 'models', 'gliner', 'model.onnx');
        if (fs.existsSync(this.glinerModelPath)) {
            this.glinerAvailable = true;
        }
        else {
            throw new Error(`GLiNER model not found at ${this.glinerModelPath}. ` +
                `Run: npm run models:download:gliner to download the model.`);
        }
        // Verify ONNX runtime is available
        try {
            require('onnxruntime-node');
        }
        catch (error) {
            throw new Error('onnxruntime-node not available. ' +
                'GLiNER backend requires ONNX runtime for inference.');
        }
    }
    getCapabilities() {
        return {
            batchProcessing: true,
            streaming: false, // ML models don't support streaming well
            gpuAcceleration: this.isGPUAvailable(),
            supportedPHITypes: [
                // GLiNER primarily handles names and some identifiers
                // Other types fall back to minimal rule support
                'name',
                'date',
                'phone',
                'email',
                'ssn',
                'mrn',
                'address',
            ],
            maxDocumentLength: 500_000, // Limited by model context
            estimatedThroughput: 10, // ~10 docs/sec (ML-heavy)
        };
    }
    /**
     * Check if GPU acceleration is available
     */
    isGPUAvailable() {
        const gpuProvider = process.env.VULPES_GPU_PROVIDER?.toLowerCase();
        return gpuProvider === 'cuda' ||
            gpuProvider === 'directml' ||
            gpuProvider === 'coreml';
    }
    /**
     * Check if GLiNER model is available
     */
    isGlinerAvailable() {
        return this.glinerAvailable;
    }
    /**
     * Get GLiNER model path
     */
    getGlinerModelPath() {
        return this.glinerModelPath;
    }
    /**
     * Get GPU execution provider being used
     */
    getExecutionProvider() {
        const gpuProvider = process.env.VULPES_GPU_PROVIDER?.toLowerCase();
        if (gpuProvider === 'cuda')
            return 'CUDAExecutionProvider';
        if (gpuProvider === 'directml')
            return 'DmlExecutionProvider';
        if (gpuProvider === 'coreml')
            return 'CoreMLExecutionProvider';
        return 'CPUExecutionProvider';
    }
}
exports.GlinerOnlyBackend = GlinerOnlyBackend;
/**
 * Factory function
 */
function createGlinerOnlyBackend() {
    return new GlinerOnlyBackend();
}
//# sourceMappingURL=GlinerOnlyBackend.js.map