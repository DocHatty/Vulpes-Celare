"use strict";
/**
 * Vulpes Native (Rust Core) Wrapper
 *
 * Provides a type-safe interface to the high-performance Rust engine.
 * The native binary is loaded via NAPI-RS.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VulpesNative = void 0;
const path_1 = require("path");
const binding_1 = require("./native/binding");
function getNativeBinding() {
    return (0, binding_1.loadNativeBinding)({ configureOrt: true });
}
/**
 * High-performance Vulpes Engine powered by Rust.
 *
 * Usage:
 * ```typescript
 * import { VulpesNative } from './VulpesNative';
 *
 * const engine = new VulpesNative.Engine('models/ocr/det.onnx', 'models/ocr/rec.onnx');
 * const results = engine.detectText(imageBuffer);
 * ```
 */
class VulpesNative {
    constructor(detModelPath, recModelPath) {
        const binding = getNativeBinding();
        this.engine = new binding.VulpesEngine((0, path_1.resolve)(detModelPath), (0, path_1.resolve)(recModelPath));
    }
    /**
     * Detect and recognize text in an image buffer.
     * @param imageData Raw image bytes (PNG, JPEG, etc.)
     * @returns Array of detected text regions with confidence scores.
     */
    detectText(imageData) {
        return this.engine.detectText(imageData);
    }
    /**
     * Detect faces in an image buffer via the Rust UltraFace engine.
     * This is a static helper so image redaction can call it without constructing an OCR engine.
     */
    static detectFaces(imageData, modelPath, confidenceThreshold, nmsThreshold) {
        const binding = getNativeBinding();
        return binding.detectFaces(imageData, (0, path_1.resolve)(modelPath), confidenceThreshold, nmsThreshold);
    }
    /**
     * Initialize the Rust core and logging system.
     * @returns Initialization status message.
     */
    static initCore() {
        const binding = getNativeBinding();
        return binding.initCore();
    }
    static sha256Hex(data) {
        const binding = getNativeBinding();
        if (typeof data === "string") {
            if (!binding.sha256HexString) {
                throw new Error("Native sha256HexString is not available");
            }
            return binding.sha256HexString(data);
        }
        if (!binding.sha256Hex) {
            throw new Error("Native sha256Hex is not available");
        }
        return binding.sha256Hex(data);
    }
    static hmacSha256Hex(key, message) {
        const binding = getNativeBinding();
        if (!binding.hmacSha256Hex) {
            throw new Error("Native hmacSha256Hex is not available");
        }
        return binding.hmacSha256Hex(key, message);
    }
    static merkleRootSha256Hex(leafHashesHex) {
        const binding = getNativeBinding();
        if (!binding.merkleRootSha256Hex) {
            throw new Error("Native merkleRootSha256Hex is not available");
        }
        return binding.merkleRootSha256Hex(leafHashesHex);
    }
}
exports.VulpesNative = VulpesNative;
exports.default = VulpesNative;
//# sourceMappingURL=VulpesNative.js.map