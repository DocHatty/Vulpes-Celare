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
import { TextBox } from "./OCRService";
import { VisualBox } from "../../VulpesNative";
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
    dimensions: {
        width: number;
        height: number;
    };
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
export declare class ImageRedactor {
    private ocrService;
    private policy;
    private initialized;
    private initializing;
    private initError;
    private logger;
    private textRedactor;
    constructor(policy?: Partial<VisualPolicy>);
    /**
     * Initialize all sub-services
     */
    initialize(): Promise<void>;
    /**
     * Set the text redaction function (usually VulpesCelare.redact)
     */
    setTextRedactor(redactor: (text: string) => Promise<{
        redacted: string;
        matches: string[];
    }>): void;
    /**
     * Redact PHI from an image
     *
     * @param imageBuffer - Input image data
     * @param policyOverrides - Optional policy overrides
     * @returns Redacted image and metadata
     */
    redact(imageBuffer: Buffer, policyOverrides?: Partial<VisualPolicy>): Promise<ImageRedactionResult>;
    /**
     * Check if extracted text contains PHI
     */
    private checkIfTextIsPHI;
    /**
     * Apply redaction boxes to the image
     */
    private applyRedactions;
    /**
     * Check if services are ready
     */
    isReady(): boolean;
    /**
     * Release resources
     */
    dispose(): Promise<void>;
}
export default ImageRedactor;
//# sourceMappingURL=ImageRedactor.d.ts.map