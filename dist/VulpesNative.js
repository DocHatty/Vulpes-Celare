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
// Determine the correct binary path based on platform
function getNativeBinding() {
    // Ensure ORT loads our bundled ONNX Runtime by default.
    // Users can override by setting VULPES_ORT_PATH or ORT_DYLIB_PATH before importing this module.
    if (process.env.VULPES_ORT_PATH && !process.env.ORT_DYLIB_PATH) {
        process.env.ORT_DYLIB_PATH = (0, path_1.resolve)(process.env.VULPES_ORT_PATH);
    }
    if (!process.env.ORT_DYLIB_PATH) {
        process.env.ORT_DYLIB_PATH = (0, path_1.resolve)(__dirname, "../native/onnxruntime.dll");
    }
    const platform = process.platform;
    const arch = process.arch;
    let nativeBinding;
    try {
        if (platform === "win32" && arch === "x64") {
            nativeBinding = require("../native/vulpes_core.win32-x64-msvc.node");
        }
        else if (platform === "darwin" && arch === "x64") {
            nativeBinding = require("../native/vulpes_core.darwin-x64.node");
        }
        else if (platform === "darwin" && arch === "arm64") {
            nativeBinding = require("../native/vulpes_core.darwin-arm64.node");
        }
        else if (platform === "linux" && arch === "x64") {
            nativeBinding = require("../native/vulpes_core.linux-x64-gnu.node");
        }
        else {
            throw new Error(`Unsupported platform: ${platform}-${arch}`);
        }
    }
    catch (e) {
        console.error("Failed to load native binding:", e);
        throw new Error("Vulpes native binding not found. Ensure the Rust core is built. " +
            "Run: cd src/rust && cargo build --release");
    }
    return nativeBinding;
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
}
exports.VulpesNative = VulpesNative;
exports.default = VulpesNative;
//# sourceMappingURL=VulpesNative.js.map