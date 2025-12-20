/**
 * TemplateSpanMapper - Maps Cached Spans to New Documents
 *
 * When a cache hit is found for a document structure, this module maps
 * the cached span positions to the new document's actual positions.
 *
 * ALGORITHM:
 * 1. Compare field labels between cached and new document
 * 2. For each cached span, find the corresponding field in the new document
 * 3. Calculate position offset based on field position differences
 * 4. Verify mapped span text matches expected PHI type patterns
 *
 * SECURITY:
 * - All mapped spans are validated before use
 * - Confidence is reduced for mapped spans (vs direct detection)
 * - Mapping failures result in full pipeline execution
 *
 * @module cache
 */
import { Span, FilterType } from "../models/Span";
import { DocumentStructure } from "./StructureExtractor";
/**
 * Cached redaction result that can be reused
 */
export interface CachedRedactionResult {
    /** Original document structure */
    structure: DocumentStructure;
    /** Spans detected in the original document */
    spans: CachedSpan[];
    /** Policy used for detection */
    policyHash: string;
    /** Timestamp of cache entry */
    timestamp: number;
    /** Number of times this entry has been used */
    hitCount: number;
}
/**
 * Cached span with relative positioning information
 */
export interface CachedSpan {
    /** Filter type (NAME, DATE, SSN, etc.) */
    filterType: FilterType;
    /** Confidence score from original detection */
    confidence: number;
    /** Priority from original detection */
    priority: number;
    /** Pattern that matched (for validation) */
    pattern: string | null;
    /** Index of the field this span belongs to (-1 if standalone) */
    fieldIndex: number;
    /** Offset from field value start (if field-associated) */
    offsetFromFieldStart: number;
    /** Length of the original span text */
    length: number;
    /** Original span text (for validation) */
    originalText: string;
}
/**
 * Mapping result for a single span
 */
export interface MappedSpan {
    /** Successfully mapped span */
    span: Span;
    /** Confidence in the mapping (0-1) */
    mappingConfidence: number;
    /** Whether the text pattern was validated */
    validated: boolean;
}
/**
 * Result of template mapping operation
 */
export interface TemplateMappingResult {
    /** Successfully mapped spans */
    mappedSpans: MappedSpan[];
    /** Number of spans that failed mapping */
    failedMappings: number;
    /** Overall mapping confidence */
    overallConfidence: number;
    /** Whether mapping is considered reliable */
    isReliable: boolean;
    /** Reason if not reliable */
    failureReason?: string;
}
/**
 * Configuration for template mapping
 */
export interface TemplateMappingConfig {
    /** Minimum mapping confidence to use cached results */
    minMappingConfidence?: number;
    /** Minimum overall confidence for reliable mapping */
    minOverallConfidence?: number;
    /** Maximum allowed failed mappings ratio */
    maxFailedRatio?: number;
    /** Whether to validate mapped text patterns */
    validatePatterns?: boolean;
    /** Confidence penalty for mapped spans vs direct detection */
    mappedConfidencePenalty?: number;
}
/**
 * TemplateSpanMapper - Maps cached spans to new documents
 */
export declare class TemplateSpanMapper {
    private config;
    private structureExtractor;
    constructor(config?: TemplateMappingConfig);
    /**
     * Convert detected spans to cacheable format
     */
    toCachedSpans(spans: Span[], structure: DocumentStructure): CachedSpan[];
    /**
     * Find which field a span belongs to and calculate offset
     */
    private findFieldForSpan;
    /**
     * Map cached spans to a new document
     */
    mapSpans(newText: string, cachedResult: CachedRedactionResult): TemplateMappingResult;
    /**
     * Build mapping between cached fields and new fields
     */
    private buildFieldMapping;
    /**
     * Map a single cached span to the new document
     */
    private mapSingleSpan;
    /**
     * Validate that mapped text matches expected PHI pattern
     */
    private validateMappedText;
    /**
     * Estimate memory usage of a cached result
     */
    static estimateMemoryUsage(result: CachedRedactionResult): number;
}
//# sourceMappingURL=TemplateSpanMapper.d.ts.map