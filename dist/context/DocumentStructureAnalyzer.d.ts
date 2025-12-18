/**
 * DocumentStructureAnalyzer - Structural Context Detection
 *
 * RESEARCH BASIS: Different document structures require different detection strategies.
 * Forms have label→value patterns. Narratives need NLP-style features.
 * Tables use column headers as context.
 *
 * This analyzer determines:
 * 1. Document type (form, narrative, mixed)
 * 2. Section types (header, body, footer, signature block)
 * 3. Field contexts (after label, in table cell, free text)
 *
 * @module redaction/context
 */
export type DocumentType = 'FORM' | 'NARRATIVE' | 'TABLE' | 'LIST' | 'MIXED' | 'UNKNOWN';
export type SectionType = 'HEADER' | 'DEMOGRAPHICS' | 'CLINICAL' | 'FOOTER' | 'SIGNATURE' | 'BODY';
export type FieldContext = 'LABELED' | 'TABLE_CELL' | 'FREE_TEXT' | 'LIST_ITEM' | 'STRUCTURED';
export interface StructuralPosition {
    documentType: DocumentType;
    sectionType: SectionType;
    fieldContext: FieldContext;
    nearestLabel: string | null;
    labelDistance: number;
    inTable: boolean;
    columnHeader: string | null;
    confidence: number;
}
export interface DocumentProfile {
    type: DocumentType;
    hasHeaders: boolean;
    hasFooters: boolean;
    hasTables: boolean;
    hasLabeledFields: boolean;
    formFieldDensity: number;
    narrativeDensity: number;
    sections: SectionInfo[];
}
export interface SectionInfo {
    type: SectionType;
    startOffset: number;
    endOffset: number;
    labels: string[];
}
export declare class DocumentStructureAnalyzer {
    private static readonly HEADER_PATTERNS;
    private static readonly DEMOGRAPHICS_PATTERNS;
    private static readonly FOOTER_PATTERNS;
    private static readonly LABEL_PATTERN;
    private static readonly TABLE_INDICATORS;
    /**
     * Analyze full document structure
     */
    static analyzeDocument(text: string): DocumentProfile;
    /**
     * Get structural position for a specific offset
     */
    static getPositionContext(text: string, offset: number, profile?: DocumentProfile): StructuralPosition;
    /**
     * Get PHI-relevant context boost based on structure
     */
    static getContextBoost(position: StructuralPosition, phiType: string): number;
    private static identifySections;
    private static findNearestLabel;
    private static isInTable;
    private static isInList;
    private static findColumnHeader;
}
//# sourceMappingURL=DocumentStructureAnalyzer.d.ts.map