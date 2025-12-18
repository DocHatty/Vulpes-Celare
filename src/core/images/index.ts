/**
 * Image Processing Module - Barrel Export
 *
 * @module core/images
 */

// Services
export { OCRService, OCRResult, TextBox, OCRServiceConfig } from "./OCRService";
export { VisualDetector, VisualDetectorConfig } from "./VisualDetector";
export {
  ImageRedactor,
  ImageRedactionResult,
  RedactionRegion,
  VisualPolicy,
} from "./ImageRedactor";

// Visual detection types (from Rust core)
export type { VisualDetection, VisualBox } from "../../VulpesNative";

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
} from "./logger";
