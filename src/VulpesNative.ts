/**
 * Vulpes Native (Rust Core) Wrapper
 *
 * Provides a type-safe interface to the high-performance Rust engine.
 * The native binary is loaded via NAPI-RS.
 */

import { resolve } from "path";
import { loadNativeBinding } from "./native/binding";

function getNativeBinding() {
  return loadNativeBinding({ configureOrt: true });
}

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
 * Low-level interface to the Rust engine.
 */
interface VulpesNativeEngine {
  detectText(buffer: Buffer): TextDetectionResult[];
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
export class VulpesNative {
  private engine: VulpesNativeEngine;

  constructor(detModelPath: string, recModelPath: string) {
    const binding = getNativeBinding();
    this.engine = new binding.VulpesEngine(
      resolve(detModelPath),
      resolve(recModelPath),
    );
  }

  /**
   * Detect and recognize text in an image buffer.
   * @param imageData Raw image bytes (PNG, JPEG, etc.)
   * @returns Array of detected text regions with confidence scores.
   */
  detectText(imageData: Buffer): TextDetectionResult[] {
    return this.engine.detectText(imageData);
  }

  /**
   * Detect faces in an image buffer via the Rust UltraFace engine.
   * This is a static helper so image redaction can call it without constructing an OCR engine.
   */
  static detectFaces(
    imageData: Buffer,
    modelPath: string,
    confidenceThreshold?: number,
    nmsThreshold?: number,
  ): VisualDetection[] {
    const binding = getNativeBinding();
    return binding.detectFaces(
      imageData,
      resolve(modelPath),
      confidenceThreshold,
      nmsThreshold,
    );
  }

  /**
   * Initialize the Rust core and logging system.
   * @returns Initialization status message.
   */
  static initCore(): string {
    const binding = getNativeBinding();
    return binding.initCore();
  }

  static sha256Hex(data: Buffer | string): string {
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

  static hmacSha256Hex(key: string, message: string): string {
    const binding = getNativeBinding();
    if (!binding.hmacSha256Hex) {
      throw new Error("Native hmacSha256Hex is not available");
    }
    return binding.hmacSha256Hex(key, message);
  }

  static merkleRootSha256Hex(leafHashesHex: string[]): string {
    const binding = getNativeBinding();
    if (!binding.merkleRootSha256Hex) {
      throw new Error("Native merkleRootSha256Hex is not available");
    }
    return binding.merkleRootSha256Hex(leafHashesHex);
  }
}

export default VulpesNative;
