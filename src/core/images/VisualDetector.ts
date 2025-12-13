/**
 * VisualDetector - Visual PHI detection (faces, signatures, etc.)
 *
 * Thin service wrapper around the Rust-native UltraFace detector.
 *
 * @module core/images/VisualDetector
 */

import * as fs from "fs";
import * as path from "path";
import { getLogger } from "./logger";
import { VulpesNative, VisualDetection } from "../../VulpesNative";

export interface VisualDetectorConfig {
  /** Optional UltraFace model path */
  modelPath?: string;
  /** Minimum confidence threshold for detections (0-1) */
  confidenceThreshold?: number;
  /** Optional NMS IoU threshold (0-1) */
  nmsThreshold?: number;
}

const SERVICE_NAME = "VisualDetector";

const DEFAULT_CONFIG: Required<VisualDetectorConfig> = {
  modelPath: path.join(__dirname, "../../../models/vision/ultraface.onnx"),
  confidenceThreshold: 0.7,
  nmsThreshold: 0.3,
};

export class VisualDetector {
  private config: Required<VisualDetectorConfig>;
  private initialized = false;
  private initError: Error | null = null;
  private logger = getLogger();

  constructor(config: VisualDetectorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger.debug(
      SERVICE_NAME,
      "constructor",
      "VisualDetector created",
      {
        modelPath: this.config.modelPath,
        confidenceThreshold: this.config.confidenceThreshold,
        nmsThreshold: this.config.nmsThreshold,
      },
    );
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const complete = this.logger.startOperation(SERVICE_NAME, "initialize");
    try {
      if (!fs.existsSync(this.config.modelPath)) {
        throw new Error(`UltraFace model not found: ${this.config.modelPath}`);
      }

      const status = VulpesNative.initCore();
      this.logger.info(SERVICE_NAME, "initialize", "Rust core initialized", {
        status,
      });

      this.initialized = true;
      complete(true);
    } catch (error) {
      this.initError = error instanceof Error ? error : new Error(String(error));
      complete(false, this.initError.message);
      this.logger.error(
        SERVICE_NAME,
        "initialize",
        "VisualDetector initialization failed",
        this.initError,
      );
      throw this.initError;
    }
  }

  isModelLoaded(): boolean {
    return this.initialized;
  }

  async detect(imageBuffer: Buffer): Promise<VisualDetection[]> {
    if (!imageBuffer || imageBuffer.length === 0) return [];
    if (!this.initialized) await this.initialize();
    if (this.initError) throw this.initError;

    const complete = this.logger.startOperation(SERVICE_NAME, "detect");
    try {
      const detections = VulpesNative.detectFaces(
        imageBuffer,
        this.config.modelPath,
        this.config.confidenceThreshold,
        this.config.nmsThreshold,
      );
      complete(true);
      return Array.isArray(detections) ? detections : [];
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      complete(false, err.message);
      this.logger.error(SERVICE_NAME, "detect", "Visual detection failed", err);
      return [];
    }
  }

  async dispose(): Promise<void> {
    this.initialized = false;
    this.initError = null;
    this.logger.info(SERVICE_NAME, "dispose", "VisualDetector disposed");
  }
}

export default VisualDetector;
