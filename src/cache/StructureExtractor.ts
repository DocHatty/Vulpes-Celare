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

import { createHash } from "crypto";

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
export enum DocumentType {
  ADMISSION_NOTE = "ADMISSION_NOTE",
  DISCHARGE_SUMMARY = "DISCHARGE_SUMMARY",
  PROGRESS_NOTE = "PROGRESS_NOTE",
  RADIOLOGY_REPORT = "RADIOLOGY_REPORT",
  LAB_REPORT = "LAB_REPORT",
  PRESCRIPTION = "PRESCRIPTION",
  REFERRAL = "REFERRAL",
  CLINICAL_NOTE = "CLINICAL_NOTE",
  UNKNOWN = "UNKNOWN",
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
 * Default configuration
 */
const DEFAULT_CONFIG: Required<StructureExtractorConfig> = {
  minLabelLength: 2,
  maxValueLength: 200,
  normalizeWhitespace: true,
  extractNumericPatterns: true,
};

/**
 * Common field labels in clinical documents
 * Maps label patterns to expected PHI types
 */
const FIELD_LABEL_PATTERNS: Map<RegExp, string> = new Map([
  // Name fields
  [/\b(?:PATIENT\s*(?:NAME)?|NAME|PATIENT)\s*[:\-]/gi, "NAME"],
  [/\b(?:PHYSICIAN|PROVIDER|DOCTOR|DR\.?|ATTENDING)\s*[:\-]/gi, "NAME"],
  [/\b(?:REFERRING|REFERRING\s+PHYSICIAN)\s*[:\-]/gi, "NAME"],

  // Date fields
  [/\b(?:DATE\s*OF\s*BIRTH|DOB|BIRTH\s*DATE)\s*[:\-]/gi, "DATE"],
  [/\b(?:ADMISSION\s*DATE|ADMIT\s*DATE)\s*[:\-]/gi, "DATE"],
  [/\b(?:DISCHARGE\s*DATE)\s*[:\-]/gi, "DATE"],
  [/\b(?:DATE\s*OF\s*(?:SERVICE|EXAM|STUDY))\s*[:\-]/gi, "DATE"],
  [/\b(?:EXAM\s*DATE|STUDY\s*DATE)\s*[:\-]/gi, "DATE"],

  // Identifier fields
  [/\b(?:MRN|MEDICAL\s*RECORD\s*(?:NUMBER|NO\.?|#)?|CHART\s*#?)\s*[:\-]/gi, "MRN"],
  [/\b(?:ACCOUNT\s*(?:NUMBER|NO\.?|#)?|ACCT\.?\s*#?)\s*[:\-]/gi, "ACCOUNT"],
  [/\b(?:SSN|SOCIAL\s*SECURITY)\s*[:\-]/gi, "SSN"],
  [/\b(?:FILE\s*(?:NUMBER|NO\.?|#)?)\s*[:\-]/gi, "MRN"],

  // Contact fields
  [/\b(?:PHONE|TELEPHONE|TEL\.?|PH\.?)\s*[:\-]/gi, "PHONE"],
  [/\b(?:FAX)\s*[:\-]/gi, "FAX"],
  [/\b(?:EMAIL|E-MAIL)\s*[:\-]/gi, "EMAIL"],
  [/\b(?:ADDRESS|ADDR\.?)\s*[:\-]/gi, "ADDRESS"],

  // Age fields
  [/\b(?:AGE)\s*[:\-]/gi, "AGE"],

  // Insurance fields
  [/\b(?:INSURANCE|INSURER|PAYER)\s*[:\-]/gi, "HEALTH_PLAN"],
  [/\b(?:POLICY\s*(?:NUMBER|NO\.?|#)?)\s*[:\-]/gi, "HEALTH_PLAN"],
  [/\b(?:MEMBER\s*ID)\s*[:\-]/gi, "HEALTH_PLAN"],
]);

/**
 * Document type indicators
 */
const DOCUMENT_TYPE_INDICATORS: Map<RegExp, DocumentType> = new Map([
  [/\bADMISSION\s*(?:NOTE|SUMMARY|RECORD)/gi, DocumentType.ADMISSION_NOTE],
  [/\bDISCHARGE\s*SUMMARY/gi, DocumentType.DISCHARGE_SUMMARY],
  [/\bPROGRESS\s*NOTE/gi, DocumentType.PROGRESS_NOTE],
  [/\b(?:RADIOLOGY|X-?RAY|CT|MRI|IMAGING)\s*REPORT/gi, DocumentType.RADIOLOGY_REPORT],
  [/\bLAB(?:ORATORY)?\s*(?:REPORT|RESULTS)/gi, DocumentType.LAB_REPORT],
  [/\bPRESCRIPTION/gi, DocumentType.PRESCRIPTION],
  [/\bREFERRAL/gi, DocumentType.REFERRAL],
  [/\bCLINICAL\s*NOTE/gi, DocumentType.CLINICAL_NOTE],
]);

/**
 * Placeholders for variable content types
 */
const PLACEHOLDERS: Record<string, string> = {
  NAME: "{{__NAME__}}",
  DATE: "{{__DATE__}}",
  MRN: "{{__MRN__}}",
  SSN: "{{__SSN__}}",
  PHONE: "{{__PHONE__}}",
  FAX: "{{__FAX__}}",
  EMAIL: "{{__EMAIL__}}",
  ADDRESS: "{{__ADDRESS__}}",
  AGE: "{{__AGE__}}",
  ACCOUNT: "{{__ACCOUNT__}}",
  HEALTH_PLAN: "{{__HEALTH_PLAN__}}",
  NUMERIC: "{{__NUM__}}",
  ALPHANUMERIC: "{{__ALPHANUM__}}",
  GENERIC: "{{__VALUE__}}",
};

/**
 * StructureExtractor - Extracts document structure for semantic caching
 */
export class StructureExtractor {
  private config: Required<StructureExtractorConfig>;

  constructor(config: StructureExtractorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract structure from a document
   */
  extract(text: string): DocumentStructure {
    // Detect document type first
    const documentType = this.detectDocumentType(text);

    // Extract field labels and their positions
    const fields = this.extractFields(text);

    // Build skeleton by replacing variable content with placeholders
    const skeleton = this.buildSkeleton(text, fields);

    // Calculate structure hash
    const hash = this.hashStructure(skeleton);

    // Calculate confidence based on field detection
    const confidence = this.calculateConfidence(fields, text.length);

    return {
      skeleton,
      hash,
      fields,
      documentType,
      confidence,
      originalLength: text.length,
    };
  }

  /**
   * Detect document type from content
   */
  private detectDocumentType(text: string): DocumentType {
    const upperText = text.toUpperCase();

    for (const [pattern, docType] of DOCUMENT_TYPE_INDICATORS) {
      if (pattern.test(upperText)) {
        return docType;
      }
    }

    return DocumentType.UNKNOWN;
  }

  /**
   * Extract field labels and their positions
   */
  private extractFields(text: string): FieldDescriptor[] {
    const fields: FieldDescriptor[] = [];
    const seen = new Set<string>(); // Avoid duplicate detections

    for (const [pattern, expectedType] of FIELD_LABEL_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const label = match[0];
        const labelStart = match.index;
        const labelEnd = labelStart + label.length;

        // Skip if too short
        if (label.length < this.config.minLabelLength) continue;

        // Skip duplicates at same position
        const key = `${labelStart}-${labelEnd}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Estimate value region (from end of label to next label or line end)
        const valueStart = labelEnd;
        const valueEnd = this.estimateValueEnd(text, valueStart);

        fields.push({
          label: label.trim(),
          expectedType,
          labelStart,
          labelEnd,
          valueStart,
          valueEnd,
        });
      }
    }

    // Sort by position
    fields.sort((a, b) => a.labelStart - b.labelStart);

    return fields;
  }

  /**
   * Estimate where a field value ends
   */
  private estimateValueEnd(text: string, valueStart: number): number {
    // Look for next field label, line break, or section break
    const remaining = text.substring(valueStart);

    // Find next label pattern
    let minEnd = Math.min(
      valueStart + this.config.maxValueLength,
      text.length
    );

    for (const [pattern] of FIELD_LABEL_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(remaining);
      if (match && valueStart + match.index < minEnd) {
        minEnd = valueStart + match.index;
      }
    }

    // Also check for line breaks (values typically don't span multiple lines)
    const lineBreak = remaining.indexOf("\n");
    if (lineBreak >= 0 && lineBreak < 80 && valueStart + lineBreak < minEnd) {
      minEnd = valueStart + lineBreak;
    }

    return minEnd;
  }

  /**
   * Build skeleton by replacing variable content with placeholders
   */
  private buildSkeleton(text: string, fields: FieldDescriptor[]): string {
    if (fields.length === 0) {
      // No fields detected - use generic normalization
      return this.normalizeGeneric(text);
    }

    // Replace field values with typed placeholders
    let skeleton = text;
    let offset = 0;

    for (const field of fields) {
      const placeholder = PLACEHOLDERS[field.expectedType] || PLACEHOLDERS.GENERIC;

      // Calculate adjusted positions (accounting for previous replacements)
      const adjustedValueStart = field.valueStart + offset;
      const adjustedValueEnd = field.valueEnd + offset;

      // Extract and check the value region
      const valueRegion = skeleton.substring(adjustedValueStart, adjustedValueEnd).trim();

      // Only replace if there's actual content
      if (valueRegion.length > 0) {
        const before = skeleton.substring(0, adjustedValueStart);
        const after = skeleton.substring(adjustedValueEnd);

        skeleton = before + placeholder + after;
        offset += placeholder.length - (adjustedValueEnd - adjustedValueStart);
      }
    }

    // Additional normalization
    skeleton = this.normalizePatterns(skeleton);

    if (this.config.normalizeWhitespace) {
      skeleton = this.normalizeWhitespace(skeleton);
    }

    return skeleton;
  }

  /**
   * Normalize generic patterns that might be variable content
   */
  private normalizeGeneric(text: string): string {
    let result = text;

    // Replace obvious PHI patterns with placeholders
    // SSN pattern
    result = result.replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, PLACEHOLDERS.SSN);

    // Phone patterns
    result = result.replace(
      /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      PLACEHOLDERS.PHONE
    );

    // Email patterns
    result = result.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      PLACEHOLDERS.EMAIL
    );

    // Date patterns
    result = result.replace(
      /\b(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/g,
      PLACEHOLDERS.DATE
    );

    // MRN/Account patterns (6-12 digit numbers)
    result = result.replace(/\b\d{6,12}\b/g, PLACEHOLDERS.NUMERIC);

    return this.normalizePatterns(result);
  }

  /**
   * Normalize common variable patterns
   */
  private normalizePatterns(text: string): string {
    let result = text;

    if (this.config.extractNumericPatterns) {
      // Replace standalone numbers (not already placeholders)
      result = result.replace(
        /(?<!\{\{__)\b\d{4,}\b(?!__\}\})/g,
        PLACEHOLDERS.NUMERIC
      );
    }

    // Replace time patterns
    result = result.replace(
      /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g,
      "{{__TIME__}}"
    );

    return result;
  }

  /**
   * Normalize whitespace for consistent comparison
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, "\n")           // Normalize line endings
      .replace(/\t/g, " ")               // Tabs to spaces
      .replace(/ {2,}/g, " ")            // Multiple spaces to single
      .replace(/\n{3,}/g, "\n\n")        // Max 2 consecutive newlines
      .trim();
  }

  /**
   * Calculate SHA-256 hash of structure
   */
  private hashStructure(skeleton: string): string {
    return createHash("sha256")
      .update(skeleton, "utf-8")
      .digest("hex");
  }

  /**
   * Calculate confidence in structure detection
   */
  private calculateConfidence(fields: FieldDescriptor[], textLength: number): number {
    if (textLength === 0) return 0;

    // Base confidence on field density and coverage
    const fieldCount = fields.length;
    const coverageRatio = this.calculateCoverage(fields, textLength);

    // More fields = higher confidence (up to a point)
    const fieldConfidence = Math.min(fieldCount / 10, 1.0);

    // Higher coverage = higher confidence
    const coverageConfidence = Math.min(coverageRatio * 2, 1.0);

    // Combined confidence
    return (fieldConfidence + coverageConfidence) / 2;
  }

  /**
   * Calculate what portion of the document is covered by detected fields
   */
  private calculateCoverage(fields: FieldDescriptor[], textLength: number): number {
    if (fields.length === 0 || textLength === 0) return 0;

    let coveredChars = 0;
    for (const field of fields) {
      coveredChars += (field.valueEnd - field.labelStart);
    }

    return Math.min(coveredChars / textLength, 1.0);
  }

  /**
   * Compare two structures for similarity
   */
  static compare(a: DocumentStructure, b: DocumentStructure): number {
    // Fast path: identical hashes
    if (a.hash === b.hash) return 1.0;

    // Check document type match
    if (a.documentType !== b.documentType &&
        a.documentType !== DocumentType.UNKNOWN &&
        b.documentType !== DocumentType.UNKNOWN) {
      return 0.0; // Different document types
    }

    // Compare field labels
    const aLabels = new Set(a.fields.map(f => f.label.toUpperCase()));
    const bLabels = new Set(b.fields.map(f => f.label.toUpperCase()));

    const intersection = [...aLabels].filter(l => bLabels.has(l)).length;
    const union = new Set([...aLabels, ...bLabels]).size;

    if (union === 0) return 0.5; // No fields in either

    const jaccardSimilarity = intersection / union;

    // Compare skeleton similarity using normalized edit distance
    const skeletonSimilarity = StructureExtractor.skeletonSimilarity(
      a.skeleton,
      b.skeleton
    );

    // Weighted combination
    return jaccardSimilarity * 0.4 + skeletonSimilarity * 0.6;
  }

  /**
   * Calculate skeleton similarity (simplified for performance)
   */
  private static skeletonSimilarity(a: string, b: string): number {
    // Length-based quick check
    const lengthRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    if (lengthRatio < 0.5) return lengthRatio * 0.5;

    // Line-by-line comparison for structured documents
    const aLines = a.split("\n").filter(l => l.trim());
    const bLines = b.split("\n").filter(l => l.trim());

    if (aLines.length === 0 || bLines.length === 0) {
      return lengthRatio;
    }

    // Count matching lines
    let matches = 0;
    const maxLines = Math.max(aLines.length, bLines.length);
    const minLines = Math.min(aLines.length, bLines.length);

    for (let i = 0; i < minLines; i++) {
      if (aLines[i] === bLines[i]) {
        matches++;
      }
    }

    return matches / maxLines;
  }
}
