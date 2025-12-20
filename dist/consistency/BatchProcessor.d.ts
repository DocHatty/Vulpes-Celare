/**
 * BatchProcessor - Multi-Document Processing with Referential Consistency
 *
 * Processes multiple documents as a batch while maintaining consistent
 * PHI tokens across all documents. Critical for:
 *
 * - Patient record batches (multiple notes for same patient)
 * - Research datasets (de-identification across cohorts)
 * - Audit exports (maintaining linkage for review)
 *
 * FEATURES:
 * - Consistent token assignment across batch
 * - Parallel processing with shared consistency state
 * - Progress tracking and batch statistics
 * - Optional mapping export for re-identification
 *
 * @module consistency
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { ConsistencyConfig, EntityMapping } from "./ReferentialConsistencyManager";
/**
 * Document in a batch
 */
export interface BatchDocument {
    /** Unique identifier for this document */
    id: string;
    /** Document content */
    text: string;
    /** Optional document metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Result of processing a single document
 */
export interface BatchDocumentResult {
    /** Document identifier */
    id: string;
    /** Redacted text */
    text: string;
    /** Spans that were detected and applied */
    spans: Span[];
    /** Original document length */
    originalLength: number;
    /** Redacted document length */
    redactedLength: number;
    /** Processing time in ms */
    processingTimeMs: number;
    /** Whether processing succeeded */
    success: boolean;
    /** Error if processing failed */
    error?: Error;
}
/**
 * Overall batch processing result
 */
export interface BatchResult {
    /** Individual document results */
    documents: BatchDocumentResult[];
    /** Total documents processed */
    totalDocuments: number;
    /** Documents successfully processed */
    successfulDocuments: number;
    /** Documents that failed */
    failedDocuments: number;
    /** Total processing time */
    totalTimeMs: number;
    /** Average time per document */
    avgTimePerDocMs: number;
    /** Entity statistics */
    entityStats: {
        totalEntities: number;
        byType: Record<string, number>;
        totalOccurrences: number;
    };
    /** Optional encrypted mapping for re-identification */
    entityMapping?: EntityMapping;
}
/**
 * Batch processing configuration
 */
export interface BatchConfig {
    /** Concurrency level for parallel processing */
    concurrency?: number;
    /** Progress callback (called after each document) */
    onProgress?: (completed: number, total: number, current: BatchDocumentResult) => void;
    /** Whether to continue on document errors */
    continueOnError?: boolean;
    /** Consistency configuration */
    consistencyConfig?: ConsistencyConfig;
    /** Export entity mapping (requires encryption key) */
    exportMapping?: boolean;
    /** Encryption key for mapping export */
    exportEncryptionKey?: string;
}
/**
 * BatchProcessor - Process multiple documents with consistent PHI tokens
 */
export declare class BatchProcessor {
    private config;
    private onProgress?;
    private exportEncryptionKey?;
    private consistencyManager;
    private filters;
    private policy;
    constructor(filters: SpanBasedFilter[], policy: any, config?: BatchConfig);
    /**
     * Process a batch of documents
     */
    processBatch(documents: BatchDocument[]): Promise<BatchResult>;
    /**
     * Process a single document with consistency
     */
    private processDocument;
    /**
     * Create a RedactionContext with consistency-aware token generation
     */
    private createConsistentContext;
    /**
     * Apply consistent tokens to redacted text
     */
    private applyConsistentTokens;
    /**
     * Get current entity statistics
     */
    getEntityStatistics(): {
        totalEntities: number;
        byType: Record<string, number>;
        totalOccurrences: number;
    };
    /**
     * Export entity mapping for later re-identification
     */
    exportEntityMapping(encryptionKey: string): EntityMapping;
    /**
     * Import entity mapping from previous session
     */
    importEntityMapping(mapping: EntityMapping, encryptionKey: string, sessionSalt?: string): boolean;
    /**
     * Reset the consistency manager for a new batch
     */
    reset(newSalt?: string): void;
    /**
     * Chunk array into smaller arrays
     */
    private chunkArray;
}
/**
 * Convenience function to process a batch of documents
 */
export declare function processBatch(documents: BatchDocument[], filters: SpanBasedFilter[], policy: any, config?: BatchConfig): Promise<BatchResult>;
//# sourceMappingURL=BatchProcessor.d.ts.map