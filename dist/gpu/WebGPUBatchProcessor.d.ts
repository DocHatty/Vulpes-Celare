/**
 * WebGPUBatchProcessor - GPU-Accelerated Batch Document Processing
 *
 * Processes 1000+ documents simultaneously using WebGPU compute shaders.
 * Falls back to parallel CPU processing when WebGPU is unavailable.
 *
 * ARCHITECTURE:
 * 1. Documents are packed into GPU buffers as UTF-16 code units
 * 2. DFA state table is uploaded as a storage buffer
 * 3. Compute shader runs DFA transitions in parallel
 * 4. Results are compacted and transferred back to CPU
 *
 * PERFORMANCE TARGETS:
 * - Current (sequential): 1000 docs × 50ms = 50 seconds
 * - With WebGPU: 1000 docs in ~200ms
 * - Speedup: ~250x for batch processing
 *
 * FALLBACK:
 * When WebGPU is unavailable, uses parallel CPU processing with
 * worker threads for still-significant speedup.
 *
 * @module redaction/gpu
 */
type VulpesCelareConfig = any;
export interface RedactionResult {
    redactedText: string;
    spans: unknown[];
    statistics: {
        originalLength: number;
        redactedLength: number;
        totalRedactions: number;
        processingTimeMs: number;
        filtersExecuted: number;
        filterTimings: Record<string, number>;
    };
    error?: string;
}
export interface BatchProcessingConfig {
    /** Maximum documents per batch (default: 100) */
    batchSize?: number;
    /** Use WebGPU if available (default: true) */
    useGPU?: boolean;
    /** Fallback to CPU if GPU unavailable (default: true) */
    fallbackToCPU?: boolean;
    /** Number of CPU workers for fallback (default: auto) */
    cpuWorkers?: number;
    /** Redaction configuration */
    redactionConfig?: VulpesCelareConfig;
}
export interface BatchResult {
    results: RedactionResult[];
    stats: BatchStats;
}
export interface BatchStats {
    totalDocuments: number;
    successfulDocuments: number;
    failedDocuments: number;
    totalTimeMs: number;
    avgTimePerDocMs: number;
    throughputDocsPerSec: number;
    method: "webgpu" | "cpu-parallel" | "cpu-sequential";
    gpuAvailable: boolean;
}
interface WebGPUInfo {
    available: boolean;
    vendor?: string;
    device?: string;
    maxBufferSize?: number;
    reason?: string;
}
/**
 * Get detailed GPU availability information
 */
export declare function getGPUInfo(): WebGPUInfo;
export declare class WebGPUBatchProcessor {
    private config;
    private initialized;
    private gpuAvailable;
    constructor(config?: BatchProcessingConfig);
    /**
     * Initialize the batch processor
     */
    initialize(): Promise<void>;
    /**
     * Check if GPU acceleration is available
     */
    isGPUAvailable(): boolean;
    /**
     * Process a batch of documents
     */
    processBatch(documents: string[]): Promise<BatchResult>;
    /**
     * Process with WebGPU (placeholder - full implementation requires WebGPU runtime)
     */
    private processWithGPU;
    /**
     * Process with parallel CPU workers
     */
    private processWithCPUParallel;
    /**
     * Process sequentially (slowest, but always works)
     */
    private processSequential;
    /**
     * Process a single document
     */
    private processSingleDocument;
    /**
     * Get processor statistics
     */
    getStats(): {
        initialized: boolean;
        gpuAvailable: boolean;
        config: Required<BatchProcessingConfig>;
    };
}
/**
 * Get shared batch processor instance
 */
export declare function getBatchProcessor(): Promise<WebGPUBatchProcessor>;
/**
 * Process a batch of documents using the best available method
 */
export declare function processBatch(documents: string[], config?: BatchProcessingConfig): Promise<BatchResult>;
/**
 * Check if batch processing should be used based on document count
 */
export declare function shouldUseBatchProcessing(documentCount: number): boolean;
export {};
//# sourceMappingURL=WebGPUBatchProcessor.d.ts.map