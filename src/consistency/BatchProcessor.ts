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

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { ParallelRedactionEngine } from "../core/ParallelRedactionEngine";
import {
  ReferentialConsistencyManager,
  ConsistencyConfig,
  EntityMapping,
} from "./ReferentialConsistencyManager";

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
 * Default batch configuration
 */
const DEFAULT_BATCH_CONFIG: Required<Omit<BatchConfig, 'onProgress' | 'exportEncryptionKey'>> = {
  concurrency: 4,
  continueOnError: true,
  consistencyConfig: {},
  exportMapping: false,
};

/**
 * BatchProcessor - Process multiple documents with consistent PHI tokens
 */
export class BatchProcessor {
  private config: Required<Omit<BatchConfig, 'onProgress' | 'exportEncryptionKey'>>;
  private onProgress?: BatchConfig['onProgress'];
  private exportEncryptionKey?: string;
  private consistencyManager: ReferentialConsistencyManager;
  private filters: SpanBasedFilter[];
  private policy: any;

  constructor(
    filters: SpanBasedFilter[],
    policy: any,
    config: BatchConfig = {}
  ) {
    this.config = {
      ...DEFAULT_BATCH_CONFIG,
      ...config,
      consistencyConfig: config.consistencyConfig || {},
    };
    this.onProgress = config.onProgress;
    this.exportEncryptionKey = config.exportEncryptionKey;
    this.filters = filters;
    this.policy = policy;
    this.consistencyManager = new ReferentialConsistencyManager(
      this.config.consistencyConfig
    );
  }

  /**
   * Process a batch of documents
   */
  async processBatch(documents: BatchDocument[]): Promise<BatchResult> {
    const startTime = Date.now();
    const results: BatchDocumentResult[] = [];

    // Process in chunks based on concurrency
    const chunks = this.chunkArray(documents, this.config.concurrency);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((doc) => this.processDocument(doc))
      );

      for (const result of chunkResults) {
        results.push(result);

        // Call progress callback
        if (this.onProgress) {
          this.onProgress(results.length, documents.length, result);
        }

        // Check if we should stop on error
        if (!result.success && !this.config.continueOnError) {
          break;
        }
      }
    }

    const totalTimeMs = Date.now() - startTime;
    const successfulDocuments = results.filter((r) => r.success).length;
    const entityStats = this.consistencyManager.getStatistics();

    // Build result
    const batchResult: BatchResult = {
      documents: results,
      totalDocuments: documents.length,
      successfulDocuments,
      failedDocuments: results.length - successfulDocuments,
      totalTimeMs,
      avgTimePerDocMs: results.length > 0 ? totalTimeMs / results.length : 0,
      entityStats,
    };

    // Export mapping if requested
    if (this.config.exportMapping && this.exportEncryptionKey) {
      batchResult.entityMapping = this.consistencyManager.exportMapping(
        this.exportEncryptionKey
      );
    }

    return batchResult;
  }

  /**
   * Process a single document with consistency
   */
  private async processDocument(doc: BatchDocument): Promise<BatchDocumentResult> {
    const startTime = Date.now();

    try {
      // Create context with consistency-aware token generator
      const context = this.createConsistentContext(doc.id);

      // Run redaction
      const result = await ParallelRedactionEngine.redactParallelV2(
        doc.text,
        this.filters,
        this.policy,
        context
      );

      // Apply consistent tokens to the result
      const consistentText = this.applyConsistentTokens(
        doc.text,
        result.appliedSpans
      );

      return {
        id: doc.id,
        text: consistentText,
        spans: result.appliedSpans,
        originalLength: doc.text.length,
        redactedLength: consistentText.length,
        processingTimeMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        id: doc.id,
        text: doc.text, // Return original on failure
        spans: [],
        originalLength: doc.text.length,
        redactedLength: doc.text.length,
        processingTimeMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a RedactionContext with consistency-aware token generation
   */
  private createConsistentContext(documentId: string): RedactionContext {
    const context = new RedactionContext(documentId);

    // Override token creation to use consistency manager
    context.createToken = (filterType: string, originalValue: string): string => {
      // Get consistent token from manager
      return this.consistencyManager.getConsistentToken(
        originalValue,
        filterType as FilterType
      );
    };

    return context;
  }

  /**
   * Apply consistent tokens to redacted text
   */
  private applyConsistentTokens(
    originalText: string,
    spans: Span[]
  ): string {
    // Sort spans by position (reverse) for safe replacement
    const sortedSpans = [...spans].sort(
      (a, b) => b.characterStart - a.characterStart
    );

    let result = originalText;

    for (const span of sortedSpans) {
      // Get consistent token for this span
      const token = this.consistencyManager.getConsistentToken(
        span.text,
        span.filterType
      );

      // Apply replacement
      result =
        result.substring(0, span.characterStart) +
        token +
        result.substring(span.characterEnd);

      // Update span with consistent replacement
      span.replacement = token;
    }

    return result;
  }

  /**
   * Get current entity statistics
   */
  getEntityStatistics(): {
    totalEntities: number;
    byType: Record<string, number>;
    totalOccurrences: number;
  } {
    return this.consistencyManager.getStatistics();
  }

  /**
   * Export entity mapping for later re-identification
   */
  exportEntityMapping(encryptionKey: string): EntityMapping {
    return this.consistencyManager.exportMapping(encryptionKey);
  }

  /**
   * Import entity mapping from previous session
   */
  importEntityMapping(
    mapping: EntityMapping,
    encryptionKey: string,
    sessionSalt?: string
  ): boolean {
    return this.consistencyManager.importMapping(mapping, encryptionKey, sessionSalt);
  }

  /**
   * Reset the consistency manager for a new batch
   */
  reset(newSalt?: string): void {
    this.consistencyManager.reset(newSalt);
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Convenience function to process a batch of documents
 */
export async function processBatch(
  documents: BatchDocument[],
  filters: SpanBasedFilter[],
  policy: any,
  config?: BatchConfig
): Promise<BatchResult> {
  const processor = new BatchProcessor(filters, policy, config);
  return processor.processBatch(documents);
}
