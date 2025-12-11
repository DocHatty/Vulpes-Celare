/**
 * Image Processing Module - Barrel Export
 * 
 * @module core/images
 */

// Services
export { OCRService, OCRResult, TextBox, OCRServiceConfig } from './OCRService';
export { VisualDetector, VisualDetection, VisualBox, VisualDetectorConfig } from './VisualDetector';
export { ImageRedactor, ImageRedactionResult, RedactionRegion, VisualPolicy } from './ImageRedactor';

// Logging & Error Handling
export {
    ImageServiceLogger,
    getLogger,
    withErrorBoundary,
    withRetry,
    withTimeout,
    LogLevel,
    LogEntry,
    ServiceHealth,
    OperationMetrics,
} from './logger';
