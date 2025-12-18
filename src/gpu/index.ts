/**
 * GPU Module - WebGPU Batch Processing
 *
 * Provides GPU-accelerated batch document processing for Vulpes Celare.
 *
 * USAGE:
 *   import { processBatch, WebGPUBatchProcessor } from "./gpu";
 *
 *   const result = await processBatch(documents);
 *   console.log(result.stats.throughputDocsPerSec);
 *
 * @module redaction/gpu
 */

export {
  BatchProcessingConfig,
  BatchResult,
  BatchStats,
  WebGPUBatchProcessor,
  getBatchProcessor,
  processBatch,
  shouldUseBatchProcessing,
} from "./WebGPUBatchProcessor";
