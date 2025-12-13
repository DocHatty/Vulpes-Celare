/**
 * VisualDetector - Visual PHI detection (faces, signatures, etc.)
 *
 * Thin service wrapper around the Rust-native UltraFace detector.
 *
 * @module core/images/VisualDetector
 */
import { VisualDetection } from "../../VulpesNative";
export interface VisualDetectorConfig {
    /** Optional UltraFace model path */
    modelPath?: string;
    /** Minimum confidence threshold for detections (0-1) */
    confidenceThreshold?: number;
    /** Optional NMS IoU threshold (0-1) */
    nmsThreshold?: number;
}
export declare class VisualDetector {
    private config;
    private initialized;
    private initError;
    private logger;
    constructor(config?: VisualDetectorConfig);
    initialize(): Promise<void>;
    isModelLoaded(): boolean;
    detect(imageBuffer: Buffer): Promise<VisualDetection[]>;
    dispose(): Promise<void>;
}
export default VisualDetector;
//# sourceMappingURL=VisualDetector.d.ts.map