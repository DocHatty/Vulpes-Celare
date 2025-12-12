/**
 * Vulpes Native (Rust Core) Wrapper
 *
 * Provides a type-safe interface to the high-performance Rust engine.
 * The native binary is loaded via NAPI-RS.
 */

import { resolve } from "path";

// Determine the correct binary path based on platform
function getNativeBinding(): {
  VulpesEngine: new (detPath: string, recPath: string) => VulpesNativeEngine;
  initCore: () => string;
  detectFaces: (
    buffer: Buffer,
    modelPath: string,
    confidenceThreshold?: number,
    nmsThreshold?: number,
  ) => VisualDetection[];
} {
  // Ensure ORT loads our bundled ONNX Runtime by default.
  // Users can override by setting VULPES_ORT_PATH or ORT_DYLIB_PATH before importing this module.
  if (process.env.VULPES_ORT_PATH && !process.env.ORT_DYLIB_PATH) {
    process.env.ORT_DYLIB_PATH = resolve(process.env.VULPES_ORT_PATH);
  }
  if (!process.env.ORT_DYLIB_PATH) {
    process.env.ORT_DYLIB_PATH = resolve(
      __dirname,
      "../native/onnxruntime.dll",
    );
  }

  const platform = process.platform;
  const arch = process.arch;

  let nativeBinding: any;

  try {
    if (platform === "win32" && arch === "x64") {
      nativeBinding = require("../native/vulpes_core.win32-x64-msvc.node");
    } else if (platform === "darwin" && arch === "x64") {
      nativeBinding = require("../native/vulpes_core.darwin-x64.node");
    } else if (platform === "darwin" && arch === "arm64") {
      nativeBinding = require("../native/vulpes_core.darwin-arm64.node");
    } else if (platform === "linux" && arch === "x64") {
      nativeBinding = require("../native/vulpes_core.linux-x64-gnu.node");
    } else {
      throw new Error(`Unsupported platform: ${platform}-${arch}`);
    }
  } catch (e) {
    console.error("Failed to load native binding:", e);
    throw new Error(
      "Vulpes native binding not found. Ensure the Rust core is built. " +
        "Run: cd src/rust && cargo build --release",
    );
  }

  return nativeBinding;
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
}

export default VulpesNative;
