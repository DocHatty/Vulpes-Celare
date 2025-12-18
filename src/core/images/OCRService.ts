/**
 * OCRService - High-Performance Text Extraction using Vulpes Celare Native Core (Rust)
 *
 * This service wraps the high-performance Rust core (VulpesNative) which provides:
 * - PaddleOCR v4 Detection & Recognition via ONNX Runtime (C++)
 * - Multi-threaded inference
 * - DB Post-processing & CTC Decoding
 * - 10-20x performance boost over pure JS implementation
 *
 * @module core/images/OCRService
 */

import * as path from "path";
import * as fs from "fs";
import { getLogger } from "./logger";
import { VulpesNative, TextDetectionResult } from "../../VulpesNative";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Bounding box for detected text regions
 */
export interface TextBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Result of OCR detection on an image
 */
export interface OCRResult {
  /** Extracted text content */
  text: string;
  /** Bounding box coordinates */
  box: TextBox;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Configuration options for OCRService
 */
export interface OCRServiceConfig {
  /** Path to the detection model (.onnx) */
  detectionModelPath?: string;
  /** Path to the recognition model (.onnx) */
  recognitionModelPath?: string;
  /** Minimum confidence threshold for results (0-1) */
  confidenceThreshold?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVICE_NAME = "OCRService";

const DEFAULT_CONFIG: Required<OCRServiceConfig> = {
  detectionModelPath: path.join(__dirname, "../../../models/ocr/det.onnx"),
  recognitionModelPath: path.join(__dirname, "../../../models/ocr/rec.onnx"),
  confidenceThreshold: 0.5,
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * OCRService - Extracts text and bounding boxes from images using Rust Native Core
 */
export class OCRService {
  private config: Required<OCRServiceConfig>;
  private engine: VulpesNative | null = null;
  private initialized = false;
  private initError: Error | null = null;
  private logger = getLogger();

  constructor(config: OCRServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger.debug(SERVICE_NAME, "constructor", "OCRService created", {
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
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const complete = this.logger.startOperation(SERVICE_NAME, "initialize");

    try {
      // Validate model files exist
      if (!fs.existsSync(this.config.detectionModelPath)) {
        throw new Error(
          `Detection model not found: ${this.config.detectionModelPath}`,
        );
      }
      if (!fs.existsSync(this.config.recognitionModelPath)) {
        throw new Error(
          `Recognition model not found: ${this.config.recognitionModelPath}`,
        );
      }

      // Initialize Rust Core Logging
      const status = VulpesNative.initCore();
      this.logger.info(SERVICE_NAME, "initialize", "Rust core initialized", {
        status,
      });

      // Create Engine Instance
      this.engine = new VulpesNative(
        this.config.detectionModelPath,
        this.config.recognitionModelPath,
      );

      this.initialized = true;
      complete(true);
      this.logger.info(
        SERVICE_NAME,
        "initialize",
        "Vulpes Celare Native Core (Rust) ready",
      );
    } catch (error) {
      this.initError =
        error instanceof Error ? error : new Error(String(error));
      complete(false, this.initError.message);
      this.logger.error(
        SERVICE_NAME,
        "initialize",
        "Native initialization failed",
        this.initError,
      );
      throw this.initError;
    }
  }

  /**
   * Extract text and bounding boxes from an image buffer via Rust Native
   */
  async extractText(
    imageBuffer: Buffer,
    width?: number,
    height?: number,
  ): Promise<OCRResult[]> {
    // Validate input
    if (!imageBuffer || imageBuffer.length === 0) {
      this.logger.warn(
        SERVICE_NAME,
        "extractText",
        "Empty image buffer provided",
      );
      return [];
    }

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.engine) {
      this.logger.error(SERVICE_NAME, "extractText", "Engine not initialized");
      return [];
    }

    const complete = this.logger.startOperation(SERVICE_NAME, "extractText");

    try {
      this.logger.debug(
        SERVICE_NAME,
        "extractText",
        "Processing image with Rust engine",
        {
          bufferSize: imageBuffer.length,
        },
      );

      // CALL RUST ENGINE
      const nativeResults = this.engine.detectText(imageBuffer);

      // Convert native results to service format
      const results: OCRResult[] = [];
      for (const item of nativeResults) {
        if (item.confidence >= this.config.confidenceThreshold) {
          results.push(this.mapNativeResult(item));
        }
      }

      complete(true);
      this.logger.info(
        SERVICE_NAME,
        "extractText",
        `Extracted ${results.length} text segments (Rust)`,
        {
          rawCount: nativeResults.length,
          filteredCount: results.length,
        },
      );

      return results;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      complete(false, err.message);
      this.logger.error(
        SERVICE_NAME,
        "extractText",
        "Native text extraction failed",
        err,
      );
      return [];
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized && this.engine !== null;
  }

  /**
   * Backwards-compatible alias for isReady()
   */
  isModelLoaded(): boolean {
    return this.isReady();
  }

  /**
   * Release resources
   */
  async dispose(): Promise<void> {
    this.engine = null;
    this.initialized = false;
    this.logger.info(SERVICE_NAME, "dispose", "OCRService disposed");
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private mapNativeResult(native: TextDetectionResult): OCRResult {
    return {
      text: native.text,
      confidence: native.confidence,
      box: this.pointsToBox(native.boxPoints),
    };
  }

  private pointsToBox(points: number[][]): TextBox {
    if (!points || points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

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
      height: maxY - minY,
    };
  }
}

export default OCRService;
