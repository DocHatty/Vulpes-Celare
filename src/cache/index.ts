/**
 * Cache Module - Semantic Document Caching for PHI Redaction
 *
 * This module provides high-performance caching for the redaction pipeline:
 *
 * - SemanticRedactionCache: Main cache with exact and structure-based matching
 * - StructureExtractor: Document structure extraction for template matching
 * - TemplateSpanMapper: Maps cached spans to new documents
 *
 * @module cache
 */

export {
  SemanticRedactionCache,
  getSemanticCache,
  initializeSemanticCache,
  clearSemanticCache,
  type SemanticCacheConfig,
  type CacheStats,
  type CacheLookupResult,
} from "./SemanticRedactionCache";

export {
  StructureExtractor,
  DocumentType,
  type DocumentStructure,
  type FieldDescriptor,
  type StructureExtractorConfig,
} from "./StructureExtractor";

export {
  TemplateSpanMapper,
  type CachedRedactionResult,
  type CachedSpan,
  type MappedSpan,
  type TemplateMappingResult,
  type TemplateMappingConfig,
} from "./TemplateSpanMapper";
