/**
 * Vulpes Native (Rust Core) Wrapper
 *
 * Provides a type-safe interface to the high-performance Rust engine.
 * The native binary is loaded via NAPI-RS.
 */
/**
 * Text detection result from the Rust OCR engine.
 */
export interface TextDetectionResult {
    text: string;
    confidence: number;
    boxPoints: number[][];
}
/**
 * Bounding box for visual detections.
 */
export interface VisualBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Result of visual PHI detection from the Rust face engine.
 */
export interface VisualDetection {
    type: "FACE" | "SIGNATURE" | "FINGERPRINT" | "OTHER";
    box: VisualBox;
    confidence: number;
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
export declare class VulpesNative {
    private engine;
    constructor(detModelPath: string, recModelPath: string);
    /**
     * Detect and recognize text in an image buffer.
     * @param imageData Raw image bytes (PNG, JPEG, etc.)
     * @returns Array of detected text regions with confidence scores.
     */
    detectText(imageData: Buffer): TextDetectionResult[];
    /**
     * Detect faces in an image buffer via the Rust UltraFace engine.
     * This is a static helper so image redaction can call it without constructing an OCR engine.
     */
    static detectFaces(imageData: Buffer, modelPath: string, confidenceThreshold?: number, nmsThreshold?: number): VisualDetection[];
    /**
     * Initialize the Rust core and logging system.
     * @returns Initialization status message.
     */
    static initCore(): string;
}
export default VulpesNative;
//# sourceMappingURL=VulpesNative.d.ts.map