/**
 * ImageRedactor - Policy-Driven Visual Redaction Engine
 *
 * This is the orchestrator for image-based PHI redaction. It coordinates:
 * - OCR text extraction (via OCRService)
 * - Visual PHI detection (via Rust UltraFace)
 * - Text-based PHI matching (via VulpesCelare core)
 * - Pixel-level redaction (via Sharp)
 *
 * Key Feature: Multi-Modal Verification
 * - Cross-references detected text with metadata
 * - Automated redaction for high-confidence matches
 * - Flags ambiguous cases for human review
 *
 * @module core/images/ImageRedactor
 */

import sharp from "sharp";
import * as path from "path";
import { OCRService, OCRResult, TextBox } from "./OCRService";
import { VulpesNative, VisualDetection, VisualBox } from "../../VulpesNative";
import { getLogger } from "./logger";

/**
 * Region to be redacted in the output image
 */
export interface RedactionRegion {
  /** Region coordinates */
  box: VisualBox | TextBox;
  /** Reason for redaction */
  reason: "FACE" | "TEXT_PHI" | "SIGNATURE" | "VISUAL_PHI";
  /** What was detected (e.g., the matched text) */
  matchedContent?: string;
  /** Confidence score */
  confidence: number;
  /** Whether this was auto-redacted or flagged for review */
  autoRedacted: boolean;
}

/**
 * Result of image redaction
 */
export interface ImageRedactionResult {
  /** Redacted image buffer (PNG) */
  buffer: Buffer;
  /** Original image dimensions */
  dimensions: { width: number; height: number };
  /** All regions that were redacted */
  redactions: RedactionRegion[];
  /** Regions flagged for human review */
  flaggedForReview: RedactionRegion[];
  /** Extracted text (for audit trail) */
  extractedText: string[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Visual redaction policy configuration
 */
export interface VisualPolicy {
  /** Redact all detected faces */
  redactFaces: boolean;
  /** Minimum confidence for face redaction (0-1) */
  faceConfidenceThreshold: number;
  /** Optional UltraFace model path */
  faceModelPath?: string;
  /** Optional NMS IoU threshold */
  faceNmsThreshold?: number;
  /** Redact text matching PHI patterns */
  redactTextPHI: boolean;
  /** Minimum confidence for text redaction (0-1) */
  textConfidenceThreshold: number;
  /** Cross-reference OCR text with metadata for verification */
  enableMultiModalVerification: boolean;
  /** Redaction style */
  redactionStyle: "BLACK_BOX" | "BLUR" | "PIXELATE";
  /** Padding around redacted regions (pixels) */
  redactionPadding: number;
  /** Known patient identifiers for cross-reference */
  knownIdentifiers?: string[];
}

const DEFAULT_FACE_MODEL_PATH = path.join(
  __dirname,
  "../../../models/vision/ultraface.onnx",
);

const DEFAULT_POLICY: VisualPolicy = {
  redactFaces: true,
  faceConfidenceThreshold: 0.7,
  faceModelPath: DEFAULT_FACE_MODEL_PATH,
  faceNmsThreshold: 0.3,
  redactTextPHI: true,
  textConfidenceThreshold: 0.5,
  enableMultiModalVerification: true,
  redactionStyle: "BLACK_BOX",
  redactionPadding: 5,
};

/**
 * ImageRedactor - Coordinates visual PHI detection and redaction
 *
 * @example
 * ```typescript
 * const redactor = new ImageRedactor();
 * await redactor.initialize();
 *
 * const imageBuffer = fs.readFileSync('medical-scan.png');
 * const result = await redactor.redact(imageBuffer, {
 *     knownIdentifiers: ['John Smith', 'MRN-12345']
 * });
 *
 * fs.writeFileSync('safe-scan.png', result.buffer);
 * console.log(`Redacted ${result.redactions.length} regions in ${result.processingTimeMs}ms`);
 * ```
 */
export class ImageRedactor {
  private ocrService: OCRService;
  private policy: VisualPolicy;
  private initialized = false;
  private initializing = false;
  private initError: Error | null = null;
  private logger = getLogger();

  // Reference to the text redaction engine (injected or lazy-loaded)
  private textRedactor:
    | ((text: string) => Promise<{ redacted: string; matches: string[] }>)
    | null = null;

  constructor(policy: Partial<VisualPolicy> = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    this.ocrService = new OCRService({
      confidenceThreshold: this.policy.textConfidenceThreshold,
    });
    this.logger.debug("ImageRedactor", "constructor", "Created with policy", {
      policy: this.policy,
    });
  }

  /**
   * Initialize all sub-services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Prevent race conditions
    if (this.initializing) {
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (this.initError) throw this.initError;
      return;
    }

    this.initializing = true;
    const complete = this.logger.startOperation("ImageRedactor", "initialize");

    try {
      await this.ocrService.initialize();

      this.initialized = true;
      complete(true);
      this.logger.info(
        "ImageRedactor",
        "initialize",
        "Initialized successfully",
      );
    } catch (error) {
      this.initError =
        error instanceof Error ? error : new Error(String(error));
      complete(false, this.initError.message);
      this.logger.error(
        "ImageRedactor",
        "initialize",
        "Initialization failed",
        this.initError,
      );
      throw this.initError;
    } finally {
      this.initializing = false;
    }
  }

  /**
   * Set the text redaction function (usually VulpesCelare.redact)
   */
  setTextRedactor(
    redactor: (
      text: string,
    ) => Promise<{ redacted: string; matches: string[] }>,
  ): void {
    this.textRedactor = redactor;
  }

  /**
   * Redact PHI from an image
   *
   * @param imageBuffer - Input image data
   * @param policyOverrides - Optional policy overrides
   * @returns Redacted image and metadata
   */
  async redact(
    imageBuffer: Buffer,
    policyOverrides?: Partial<VisualPolicy>,
  ): Promise<ImageRedactionResult> {
    const startTime = Date.now();
    const policy = { ...this.policy, ...policyOverrides };

    if (!this.initialized) {
      await this.initialize();
    }

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    const faceModelPath = policy.faceModelPath ?? DEFAULT_FACE_MODEL_PATH;
    const faceNmsThreshold = policy.faceNmsThreshold ?? 0.3;

    // Run detection in parallel
    const [ocrResults, visualDetections] = await Promise.all([
      policy.redactTextPHI
        ? this.ocrService.extractText(imageBuffer, width, height)
        : Promise.resolve([]),
      policy.redactFaces
        ? Promise.resolve()
            .then(() =>
              VulpesNative.detectFaces(
                imageBuffer,
                faceModelPath,
                policy.faceConfidenceThreshold,
                faceNmsThreshold,
              ),
            )
            .catch((err) => {
              this.logger.error(
                "ImageRedactor",
                "redact",
                "Rust face detection failed",
                err,
              );
              return [];
            })
        : Promise.resolve([]),
    ]);

    // Build redaction regions
    const redactions: RedactionRegion[] = [];
    const flaggedForReview: RedactionRegion[] = [];
    const extractedText: string[] = [];

    // Process visual detections (faces, etc.)
    for (const detection of visualDetections) {
      if (detection.type === "FACE" && policy.redactFaces) {
        redactions.push({
          box: detection.box,
          reason: "FACE",
          confidence: detection.confidence,
          autoRedacted: detection.confidence >= policy.faceConfidenceThreshold,
        });
      }
    }

    // Process OCR text
    for (const ocrResult of ocrResults) {
      extractedText.push(ocrResult.text);

      // Check if text matches PHI patterns
      const isPHI = await this.checkIfTextIsPHI(
        ocrResult.text,
        policy.knownIdentifiers,
      );

      if (isPHI.match) {
        const region: RedactionRegion = {
          box: ocrResult.box,
          reason: "TEXT_PHI",
          matchedContent: ocrResult.text,
          confidence: Math.min(ocrResult.confidence, isPHI.confidence),
          autoRedacted: isPHI.confidence >= 0.8,
        };

        if (region.autoRedacted) {
          redactions.push(region);
        } else {
          flaggedForReview.push(region);
        }
      }
    }

    // Apply redactions to image
    const redactedBuffer = await this.applyRedactions(
      imageBuffer,
      redactions,
      policy,
    );

    return {
      buffer: redactedBuffer,
      dimensions: { width, height },
      redactions,
      flaggedForReview,
      extractedText,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Check if extracted text contains PHI
   */
  private async checkIfTextIsPHI(
    text: string,
    knownIdentifiers?: string[],
  ): Promise<{ match: boolean; confidence: number }> {
    // Check against known identifiers first (highest confidence)
    if (knownIdentifiers) {
      for (const identifier of knownIdentifiers) {
        if (text.toLowerCase().includes(identifier.toLowerCase())) {
          return { match: true, confidence: 1.0 };
        }
      }
    }

    // Use the text redaction engine if available
    if (this.textRedactor) {
      try {
        const result = await this.textRedactor(text);
        if (result.matches.length > 0) {
          return { match: true, confidence: 0.9 };
        }
      } catch (error) {
        console.warn("[ImageRedactor] Text redactor error:", error);
      }
    }

    // Basic heuristics for common PHI patterns
    const phiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Z]{1,2}\d{6,8}\b/i, // MRN-like
      /\b\d{10}\b/, // Phone
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/, // Name pattern
    ];

    for (const pattern of phiPatterns) {
      if (pattern.test(text)) {
        return { match: true, confidence: 0.6 };
      }
    }

    return { match: false, confidence: 0 };
  }

  /**
   * Apply redaction boxes to the image
   */
  private async applyRedactions(
    imageBuffer: Buffer,
    redactions: RedactionRegion[],
    policy: VisualPolicy,
  ): Promise<Buffer> {
    if (redactions.length === 0) {
      return imageBuffer;
    }

    let image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Create overlay SVG for black boxes
    if (policy.redactionStyle === "BLACK_BOX") {
      const rects = redactions
        .map((r) => {
          const pad = policy.redactionPadding;
          const x = Math.max(0, r.box.x - pad);
          const y = Math.max(0, r.box.y - pad);
          const w = Math.min(width - x, r.box.width + pad * 2);
          const h = Math.min(height - y, r.box.height + pad * 2);
          return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="black"/>`;
        })
        .join("");

      const svg = `<svg width="${width}" height="${height}">${rects}</svg>`;

      image = image.composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0,
        },
      ]);
    }
    // BLUR and PIXELATE would require different approaches
    // (extracting regions, blurring, compositing back)

    return image.png().toBuffer();
  }

  /**
   * Check if services are ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Release resources
   */
  async dispose(): Promise<void> {
    await this.ocrService.dispose();
    this.initialized = false;
  }
}

export default ImageRedactor;
