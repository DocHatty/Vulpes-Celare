/**
 * Consistency Module - Referential Consistency Across Documents
 *
 * This module provides cross-document PHI token consistency:
 *
 * - ReferentialConsistencyManager: Maintains consistent tokens per entity
 * - BatchProcessor: Process multiple documents with shared consistency
 *
 * @module consistency
 */

export {
  ReferentialConsistencyManager,
  getConsistencyManager,
  initializeConsistencyManager,
  resetConsistencyManager,
  ConsoleAuditLogger,
  type ConsistentToken,
  type EntityMapping,
  type ConsistencyConfig,
  type AuditLogEntry,
  type AuditLogHandler,
} from "./ReferentialConsistencyManager";

export {
  BatchProcessor,
  processBatch,
  type BatchDocument,
  type BatchDocumentResult,
  type BatchResult,
  type BatchConfig,
} from "./BatchProcessor";
