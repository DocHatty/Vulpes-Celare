"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchProcessor = void 0;
exports.processBatch = processBatch;
const RedactionContext_1 = require("../context/RedactionContext");
const ParallelRedactionEngine_1 = require("../core/ParallelRedactionEngine");
const ReferentialConsistencyManager_1 = require("./ReferentialConsistencyManager");
/**
 * Default batch configuration
 */
const DEFAULT_BATCH_CONFIG = {
    concurrency: 4,
    continueOnError: true,
    consistencyConfig: {},
    exportMapping: false,
};
/**
 * BatchProcessor - Process multiple documents with consistent PHI tokens
 */
class BatchProcessor {
    config;
    onProgress;
    exportEncryptionKey;
    consistencyManager;
    filters;
    policy;
    constructor(filters, policy, config = {}) {
        this.config = {
            ...DEFAULT_BATCH_CONFIG,
            ...config,
            consistencyConfig: config.consistencyConfig || {},
        };
        this.onProgress = config.onProgress;
        this.exportEncryptionKey = config.exportEncryptionKey;
        this.filters = filters;
        this.policy = policy;
        this.consistencyManager = new ReferentialConsistencyManager_1.ReferentialConsistencyManager(this.config.consistencyConfig);
    }
    /**
     * Process a batch of documents
     */
    async processBatch(documents) {
        const startTime = Date.now();
        const results = [];
        // Process in chunks based on concurrency
        const chunks = this.chunkArray(documents, this.config.concurrency);
        for (const chunk of chunks) {
            const chunkResults = await Promise.all(chunk.map((doc) => this.processDocument(doc)));
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
        const batchResult = {
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
            batchResult.entityMapping = this.consistencyManager.exportMapping(this.exportEncryptionKey);
        }
        return batchResult;
    }
    /**
     * Process a single document with consistency
     */
    async processDocument(doc) {
        const startTime = Date.now();
        try {
            // Create context with consistency-aware token generator
            const context = this.createConsistentContext(doc.id);
            // Run redaction
            const result = await ParallelRedactionEngine_1.ParallelRedactionEngine.redactParallelV2(doc.text, this.filters, this.policy, context);
            // Apply consistent tokens to the result
            const consistentText = this.applyConsistentTokens(doc.text, result.appliedSpans);
            return {
                id: doc.id,
                text: consistentText,
                spans: result.appliedSpans,
                originalLength: doc.text.length,
                redactedLength: consistentText.length,
                processingTimeMs: Date.now() - startTime,
                success: true,
            };
        }
        catch (error) {
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
    createConsistentContext(documentId) {
        const context = new RedactionContext_1.RedactionContext(documentId);
        // Override token creation to use consistency manager
        context.createToken = (filterType, originalValue) => {
            // Get consistent token from manager
            return this.consistencyManager.getConsistentToken(originalValue, filterType);
        };
        return context;
    }
    /**
     * Apply consistent tokens to redacted text
     */
    applyConsistentTokens(originalText, spans) {
        // Sort spans by position (reverse) for safe replacement
        const sortedSpans = [...spans].sort((a, b) => b.characterStart - a.characterStart);
        let result = originalText;
        for (const span of sortedSpans) {
            // Get consistent token for this span
            const token = this.consistencyManager.getConsistentToken(span.text, span.filterType);
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
    getEntityStatistics() {
        return this.consistencyManager.getStatistics();
    }
    /**
     * Export entity mapping for later re-identification
     */
    exportEntityMapping(encryptionKey) {
        return this.consistencyManager.exportMapping(encryptionKey);
    }
    /**
     * Import entity mapping from previous session
     */
    importEntityMapping(mapping, encryptionKey, sessionSalt) {
        return this.consistencyManager.importMapping(mapping, encryptionKey, sessionSalt);
    }
    /**
     * Reset the consistency manager for a new batch
     */
    reset(newSalt) {
        this.consistencyManager.reset(newSalt);
    }
    /**
     * Chunk array into smaller arrays
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
}
exports.BatchProcessor = BatchProcessor;
/**
 * Convenience function to process a batch of documents
 */
async function processBatch(documents, filters, policy, config) {
    const processor = new BatchProcessor(filters, policy, config);
    return processor.processBatch(documents);
}
//# sourceMappingURL=BatchProcessor.js.map