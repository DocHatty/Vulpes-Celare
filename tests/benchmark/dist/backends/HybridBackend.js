"use strict";
/**
 * ============================================================================
 * HYBRID BACKEND
 * ============================================================================
 *
 * Detection backend combining rules with GLiNER ML model.
 * Best of both worlds: deterministic patterns + ML flexibility.
 *
 * Environment: VULPES_NAME_DETECTION_MODE=hybrid
 *
 * @module benchmark/backends/HybridBackend
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
exports.HybridBackend = void 0;
exports.createHybridBackend = createHybridBackend;
const BaseBackend_1 = require("./BaseBackend");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Hybrid detection backend (Rules + GLiNER)
 *
 * Combines:
 * 1. All 28 rule-based filters (high precision)
 * 2. GLiNER zero-shot NER (high recall for names)
 *
 * GLiNER runs in parallel with rules, and results are merged
 * with priority-based overlap resolution.
 */
class HybridBackend extends BaseBackend_1.BaseBackend {
    id = 'vulpes-hybrid-v1';
    name = 'Vulpes Celare (Hybrid: Rules + GLiNER)';
    type = 'hybrid';
    glinerModelPath = null;
    glinerAvailable = false;
    getDetectionMode() {
        return 'hybrid';
    }
    async doInitialize() {
        // Verify GLiNER is enabled
        if (process.env.VULPES_USE_GLINER !== '1') {
            console.warn(`[${this.id}] Warning: VULPES_USE_GLINER should be enabled for hybrid mode`);
        }
        // Check GLiNER model availability
        this.glinerModelPath = process.env.VULPES_GLINER_MODEL_PATH ||
            path.join(process.cwd(), 'models', 'gliner', 'model.onnx');
        if (fs.existsSync(this.glinerModelPath)) {
            this.glinerAvailable = true;
        }
        else {
            console.warn(`[${this.id}] Warning: GLiNER model not found at ${this.glinerModelPath}`);
            console.warn(`[${this.id}] Run: npm run models:download:gliner to download the model`);
            this.glinerAvailable = false;
        }
        // Pre-initialize filter registry
        try {
            const registryPath = require.resolve('../../../dist/filters/FilterRegistry.js');
            delete require.cache[registryPath];
            const { FilterRegistry } = require(registryPath);
            await FilterRegistry.initialize();
        }
        catch (error) {
            // FilterRegistry initialization handled by VulpesCelare
        }
    }
    getCapabilities() {
        return {
            batchProcessing: true,
            streaming: false, // GLiNER doesn't support streaming
            gpuAcceleration: this.isGPUAvailable(),
            supportedPHITypes: [
                'name', 'ssn', 'phone', 'email', 'address', 'date', 'mrn',
                'ip', 'url', 'credit_card', 'account', 'health_plan', 'license',
                'passport', 'vehicle', 'device', 'biometric', 'zip', 'fax', 'age',
            ],
            maxDocumentLength: 500_000, // Lower due to ML model context window
            estimatedThroughput: 20, // ~20 docs/sec (GLiNER adds latency)
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
}
exports.HybridBackend = HybridBackend;
/**
 * Factory function
 */
function createHybridBackend() {
    return new HybridBackend();
}
//# sourceMappingURL=HybridBackend.js.map