/**
 * StructureExtractor - Document Structure Extraction for Semantic Caching
 *
 * Extracts the structural "skeleton" of a document by replacing variable content
 * (likely PHI values) with normalized placeholders while preserving structure.
 *
 * MOTIVATION:
 * Clinical documents are highly templated. The same admission note structure
 * is used thousands of times with different patient data. By extracting structure,
 * we can cache redaction patterns and reuse them for similar documents.
 *
 * SECURITY:
 * - Structure extraction is done WITHOUT accessing PHI values
 * - Only structural elements (labels, formatting) are preserved
 * - Variable content is replaced with type-specific placeholders
 *
 * @module cache
 */
/**
 * Structure extraction result
 */
export interface DocumentStructure {
    /** Normalized structure with placeholders */
    skeleton: string;
    /** Hash of the skeleton for fast comparison */
    hash: string;
    /** Detected field labels and their positions */
    fields: FieldDescriptor[];
    /** Document type classification */
    documentType: DocumentType;
    /** Confidence in structure detection */
    confidence: number;
    /** Original document length */
    originalLength: number;
}
/**
 * Field descriptor for labeled fields in the document
 */
export interface FieldDescriptor {
    /** Label text (e.g., "PATIENT NAME:") */
    label: string;
    /** Expected PHI type for this field */
    expectedType: string;
    /** Start position of the label in original text */
    labelStart: number;
    /** End position of the label in original text */
    labelEnd: number;
    /** Start position of expected value area */
    valueStart: number;
    /** End position of expected value area (estimate) */
    valueEnd: number;
}
/**
 * Document type classifications
 */
export declare enum DocumentType {
    ADMISSION_NOTE = "ADMISSION_NOTE",
    DISCHARGE_SUMMARY = "DISCHARGE_SUMMARY",
    PROGRESS_NOTE = "PROGRESS_NOTE",
    RADIOLOGY_REPORT = "RADIOLOGY_REPORT",
    LAB_REPORT = "LAB_REPORT",
    PRESCRIPTION = "PRESCRIPTION",
    REFERRAL = "REFERRAL",
    CLINICAL_NOTE = "CLINICAL_NOTE",
    UNKNOWN = "UNKNOWN"
}
/**
 * Configuration for structure extraction
 */
export interface StructureExtractorConfig {
    /** Minimum label length to consider */
    minLabelLength?: number;
    /** Maximum value region length to consider */
    maxValueLength?: number;
    /** Whether to normalize whitespace */
    normalizeWhitespace?: boolean;
    /** Whether to extract numeric patterns */
    extractNumericPatterns?: boolean;
}
/**
 * StructureExtractor - Extracts document structure for semantic caching
 */
export declare class StructureExtractor {
    private config;
    constructor(config?: StructureExtractorConfig);
    /**
     * Extract structure from a document
     */
    extract(text: string): DocumentStructure;
    /**
     * Detect document type from content
     */
    private detectDocumentType;
    /**
     * Extract field labels and their positions
     */
    private extractFields;
    /**
     * Estimate where a field value ends
     */
    private estimateValueEnd;
    /**
     * Build skeleton by replacing variable content with placeholders
     */
    private buildSkeleton;
    /**
     * Normalize generic patterns that might be variable content
     */
    private normalizeGeneric;
    /**
     * Normalize common variable patterns
     */
    private normalizePatterns;
    /**
     * Normalize whitespace for consistent comparison
     */
    private normalizeWhitespace;
    /**
     * Calculate SHA-256 hash of structure
     */
    private hashStructure;
    /**
     * Calculate confidence in structure detection
     */
    private calculateConfidence;
    /**
     * Calculate what portion of the document is covered by detected fields
     */
    private calculateCoverage;
    /**
     * Compare two structures for similarity
     */
    static compare(a: DocumentStructure, b: DocumentStructure): number;
    /**
     * Calculate skeleton similarity (simplified for performance)
     */
    private static skeletonSimilarity;
}
//# sourceMappingURL=StructureExtractor.d.ts.map