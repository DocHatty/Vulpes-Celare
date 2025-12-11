/**
 * VisualDetector - Face and Visual PHI Detection using UltraFace ONNX
 *
 * Detects faces and other visual PHI (biometric identifiers) in images
 * using the lightweight UltraFace model via ONNX Runtime.
 *
 * @module core/images/VisualDetector
 */
/**
 * Bounding box for visual detections
 */
export interface VisualBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Result of visual detection
 */
export interface VisualDetection {
    /** Type of detection */
    type: 'FACE' | 'SIGNATURE' | 'FINGERPRINT' | 'OTHER';
    /** Bounding box coordinates */
    box: VisualBox;
    /** Confidence score (0-1) */
    confidence: number;
}
/**
 * Configuration options
 */
export interface VisualDetectorConfig {
    /** Path to the detection model (.onnx) */
    modelPath?: string;
    /** Minimum confidence threshold (0-1) */
    confidenceThreshold?: number;
    /** Whether to use GPU */
    useGPU?: boolean;
    /** NMS IoU threshold */
    nmsThreshold?: number;
    /** Enable debug logging */
    debug?: boolean;
    /** Timeout for inference (ms) */
    inferenceTimeoutMs?: number;
}
/**
 * VisualDetector - Detects faces and visual PHI
 */
export declare class VisualDetector {
    private config;
    private session;
    private initialized;
    private initializing;
    private initError;
    private logger;
    constructor(config?: VisualDetectorConfig);
    /**
     * Initialize the ONNX model
     */
    initialize(): Promise<void>;
    /**
     * Detect faces in an image
     */
    detect(imageBuffer: Buffer, width?: number, height?: number): Promise<VisualDetection[]>;
    /**
     * Check if model is loaded
     */
    isModelLoaded(): boolean;
    /**
     * Check if service is ready
     */
    isReady(): boolean;
    /**
     * Get service status
     */
    getStatus(): {
        initialized: boolean;
        modelLoaded: boolean;
        config: Omit<Required<VisualDetectorConfig>, 'modelPath'>;
    };
    /**
     * Release resources
     */
    dispose(): Promise<void>;
    private getImageMetadata;
    private runInference;
    private parseOutput;
    private nms;
    private calculateIoU;
}
export default VisualDetector;
//# sourceMappingURL=VisualDetector.d.ts.map