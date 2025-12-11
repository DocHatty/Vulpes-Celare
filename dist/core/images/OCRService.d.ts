/**
 * OCRService - High-Performance Text Extraction using PaddleOCR via ONNX Runtime
 *
 * This service provides state-of-the-art OCR capabilities using PaddleOCR models
 * exported to ONNX format. Runs entirely locally with no cloud dependencies.
 *
 * Architecture:
 * - Detection Model: Identifies text regions (outputs probability map)
 * - Recognition Model: Converts text regions to strings (CTC decoder)
 * - ONNX Runtime for native C++ performance
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
    /** Character-level positions if available */
    charPositions?: {
        char: string;
        x: number;
        y: number;
    }[];
}
/**
 * Configuration options for OCRService
 */
export interface OCRServiceConfig {
    /** Path to the detection model (.onnx) */
    detectionModelPath?: string;
    /** Path to the recognition model (.onnx) */
    recognitionModelPath?: string;
    /** Path to character dictionary */
    dictionaryPath?: string;
    /** Minimum confidence threshold for results (0-1) */
    confidenceThreshold?: number;
    /** Whether to use GPU acceleration if available */
    useGPU?: boolean;
    /** Maximum image dimension (larger images will be scaled) */
    maxImageDimension?: number;
    /** Detection threshold for text probability map */
    detectionThreshold?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** Timeout for inference operations (ms) */
    inferenceTimeoutMs?: number;
}
/**
 * OCRService - Extracts text and bounding boxes from images
 */
export declare class OCRService {
    private config;
    private detectionSession;
    private recognitionSession;
    private initialized;
    private initializing;
    private charset;
    private initError;
    private logger;
    constructor(config?: OCRServiceConfig);
    /**
     * Initialize the ONNX models. Must be called before extractText().
     * Safe to call multiple times - will only initialize once.
     */
    initialize(): Promise<void>;
    /**
     * Extract text and bounding boxes from an image buffer
     */
    extractText(imageBuffer: Buffer, width?: number, height?: number): Promise<OCRResult[]>;
    /**
     * Check if models are loaded
     */
    isModelLoaded(): boolean;
    /**
     * Check if service is ready
     */
    isReady(): boolean;
    /**
     * Get service status for debugging
     */
    getStatus(): {
        initialized: boolean;
        modelsLoaded: boolean;
        charsetSize: number;
        config: Omit<Required<OCRServiceConfig>, 'detectionModelPath' | 'recognitionModelPath' | 'dictionaryPath'>;
    };
    /**
     * Release ONNX sessions and free memory
     */
    dispose(): Promise<void>;
    private loadCharacterDictionary;
    private loadModels;
    private getImageMetadata;
    private detectTextRegions;
    private parseDetectionOutput;
    private floodFill;
    private regionToBox;
    private mergeBoxes;
    private overlap;
    private merge;
    private recognizeText;
    private ctcDecode;
}
export default OCRService;
//# sourceMappingURL=OCRService.d.ts.map