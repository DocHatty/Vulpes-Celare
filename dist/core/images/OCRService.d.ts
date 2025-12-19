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
/**
 * OCRService - Extracts text and bounding boxes from images using Rust Native Core
 */
export declare class OCRService {
    private config;
    private engine;
    private initialized;
    private initError;
    private logger;
    constructor(config?: OCRServiceConfig);
    /**
     * Initialize the Native Rust Engine.
     */
    initialize(): Promise<void>;
    /**
     * Extract text and bounding boxes from an image buffer via Rust Native
     */
    extractText(imageBuffer: Buffer, _width?: number, _height?: number): Promise<OCRResult[]>;
    /**
     * Check if service is ready
     */
    isReady(): boolean;
    /**
     * Backwards-compatible alias for isReady()
     */
    isModelLoaded(): boolean;
    /**
     * Release resources
     */
    dispose(): Promise<void>;
    private mapNativeResult;
    private pointsToBox;
}
export default OCRService;
//# sourceMappingURL=OCRService.d.ts.map