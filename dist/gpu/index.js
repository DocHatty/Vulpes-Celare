"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUseBatchProcessing = exports.processBatch = exports.getBatchProcessor = exports.WebGPUBatchProcessor = void 0;
var WebGPUBatchProcessor_1 = require("./WebGPUBatchProcessor");
Object.defineProperty(exports, "WebGPUBatchProcessor", { enumerable: true, get: function () { return WebGPUBatchProcessor_1.WebGPUBatchProcessor; } });
Object.defineProperty(exports, "getBatchProcessor", { enumerable: true, get: function () { return WebGPUBatchProcessor_1.getBatchProcessor; } });
Object.defineProperty(exports, "processBatch", { enumerable: true, get: function () { return WebGPUBatchProcessor_1.processBatch; } });
Object.defineProperty(exports, "shouldUseBatchProcessing", { enumerable: true, get: function () { return WebGPUBatchProcessor_1.shouldUseBatchProcessing; } });
//# sourceMappingURL=index.js.map