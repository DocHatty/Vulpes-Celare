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
  labelDistance: number;  // Characters from label
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
  formFieldDensity: number;  // 0-1, how form-like
  narrativeDensity: number;  // 0-1, how narrative-like
  sections: SectionInfo[];
}

export interface SectionInfo {
  type: SectionType;
  startOffset: number;
  endOffset: number;
  labels: string[];
}

export class DocumentStructureAnalyzer {
  private static readonly HEADER_PATTERNS = [
    /^[\s]*(?:PATIENT|CLINICAL|MEDICAL|HEALTH)\s+(?:INFORMATION|RECORD|HISTORY|SUMMARY)/im,
    /^[\s]*(?:ADMISSION|DISCHARGE|PROGRESS|OPERATIVE)\s+(?:NOTE|SUMMARY|REPORT)/im,
    /^[\s]*(?:HISTORY\s+AND\s+PHYSICAL|H&P|CONSULTATION)/im,
  ];

  private static readonly DEMOGRAPHICS_PATTERNS = [
    /(?:Patient\s+Name|Name|DOB|Date\s+of\s+Birth|MRN|Medical\s+Record|SSN|Address|Phone)[\s]*:/i,
    /(?:Age|Sex|Gender|Race|Ethnicity|Marital\s+Status)[\s]*:/i,
  ];

  private static readonly FOOTER_PATTERNS = [
    /(?:Electronically\s+signed|Signed|Authenticated)\s+by/i,
    /(?:Dictated|Transcribed|Reviewed)\s+by/i,
    /Page\s+\d+\s+of\s+\d+/i,
    /(?:Confidential|HIPAA|Privacy)/i,
  ];

  private static readonly LABEL_PATTERN = /([A-Za-z][A-Za-z\s]{2,30})[\s]*:[\s]*/g;
  private static readonly TABLE_INDICATORS = /[\|┃│]|(?:\t{2,})|(?:  {3,})/;

  /**
   * Analyze full document structure
   */
  static analyzeDocument(text: string): DocumentProfile {
    const hasHeaders = this.HEADER_PATTERNS.some(p => p.test(text));
    const hasFooters = this.FOOTER_PATTERNS.some(p => p.test(text));
    const hasTables = this.TABLE_INDICATORS.test(text);

    // Count labeled fields
    const labelMatches = text.match(this.LABEL_PATTERN) || [];
    const hasLabeledFields = labelMatches.length > 3;

    // Calculate densities
    const lines = text.split('\n');
    let formLines = 0;
    let narrativeLines = 0;

    for (const line of lines) {
      if (/^[A-Za-z\s]+:\s*.+/.test(line)) {
        formLines++;
      } else if (line.length > 80 && /[.!?]\s+[A-Z]/.test(line)) {
        narrativeLines++;
      }
    }

    const totalLines = Math.max(1, lines.length);
    const formFieldDensity = formLines / totalLines;
    const narrativeDensity = narrativeLines / totalLines;

    // Determine document type
    let type: DocumentType;
    if (formFieldDensity > 0.4 && narrativeDensity < 0.2) {
      type = 'FORM';
    } else if (narrativeDensity > 0.4 && formFieldDensity < 0.2) {
      type = 'NARRATIVE';
    } else if (hasTables && formFieldDensity < 0.2) {
      type = 'TABLE';
    } else if (formFieldDensity > 0.1 || narrativeDensity > 0.1) {
      type = 'MIXED';
    } else {
      type = 'UNKNOWN';
    }

    // Identify sections
    const sections = this.identifySections(text);

    return {
      type,
      hasHeaders,
      hasFooters,
      hasTables,
      hasLabeledFields,
      formFieldDensity,
      narrativeDensity,
      sections,
    };
  }

  /**
   * Get structural position for a specific offset
   */
  static getPositionContext(text: string, offset: number, profile?: DocumentProfile): StructuralPosition {
    profile = profile || this.analyzeDocument(text);

    // Find section
    let sectionType: SectionType = 'BODY';
    for (const section of profile.sections) {
      if (offset >= section.startOffset && offset <= section.endOffset) {
        sectionType = section.type;
        break;
      }
    }

    // Find nearest label
    const { label, distance } = this.findNearestLabel(text, offset);

    // Determine field context
    let fieldContext: FieldContext;
    if (label && distance < 50) {
      fieldContext = 'LABELED';
    } else if (this.isInTable(text, offset)) {
      fieldContext = 'TABLE_CELL';
    } else if (this.isInList(text, offset)) {
      fieldContext = 'LIST_ITEM';
    } else if (profile.type === 'FORM') {
      fieldContext = 'STRUCTURED';
    } else {
      fieldContext = 'FREE_TEXT';
    }

    // Check for table column header
    const columnHeader = fieldContext === 'TABLE_CELL' ? this.findColumnHeader(text, offset) : null;

    // Calculate confidence based on how clear the structure is
    let confidence = 0.7;
    if (fieldContext === 'LABELED' && distance < 20) confidence = 0.95;
    else if (fieldContext === 'TABLE_CELL' && columnHeader) confidence = 0.9;
    else if (profile.type === 'FORM' && fieldContext === 'STRUCTURED') confidence = 0.85;

    return {
      documentType: profile.type,
      sectionType,
      fieldContext,
      nearestLabel: label,
      labelDistance: distance,
      inTable: fieldContext === 'TABLE_CELL',
      columnHeader,
      confidence,
    };
  }

  /**
   * Get PHI-relevant context boost based on structure
   */
  static getContextBoost(position: StructuralPosition, phiType: string): number {
    let boost = 0;

    // Label proximity is very strong signal
    if (position.fieldContext === 'LABELED' && position.nearestLabel) {
      const label = position.nearestLabel.toLowerCase();

      // Type-specific label matching
      if (phiType === 'NAME') {
        if (/\b(name|patient|member|client|contact|guardian)\b/.test(label)) {
          boost += 0.25;
        }
      } else if (phiType === 'DATE') {
        if (/\b(date|dob|born|birth|admission|discharge|visit)\b/.test(label)) {
          boost += 0.25;
        }
      } else if (phiType === 'SSN') {
        if (/\b(ssn|social|security)\b/.test(label)) {
          boost += 0.30;
        }
      } else if (phiType === 'PHONE' || phiType === 'FAX') {
        if (/\b(phone|tel|fax|contact|cell|mobile)\b/.test(label)) {
          boost += 0.20;
        }
      } else if (phiType === 'ADDRESS') {
        if (/\b(address|street|city|state|zip)\b/.test(label)) {
          boost += 0.20;
        }
      } else if (phiType === 'MRN') {
        if (/\b(mrn|medical record|patient id|chart)\b/.test(label)) {
          boost += 0.25;
        }
      }
    }

    // Demographics section boost for identity-related PHI
    if (position.sectionType === 'DEMOGRAPHICS') {
      if (['NAME', 'DATE', 'SSN', 'ADDRESS', 'PHONE', 'MRN'].includes(phiType)) {
        boost += 0.10;
      }
    }

    // Signature section - likely provider names, reduce patient name confidence
    if (position.sectionType === 'SIGNATURE' && phiType === 'NAME') {
      boost -= 0.15; // More likely to be provider name
    }

    // Table context with relevant header
    if (position.columnHeader) {
      const header = position.columnHeader.toLowerCase();
      if (phiType === 'NAME' && /\b(name|patient|member)\b/.test(header)) {
        boost += 0.20;
      } else if (phiType === 'DATE' && /\b(date|dob|birth)\b/.test(header)) {
        boost += 0.20;
      }
    }

    return Math.max(-0.3, Math.min(0.4, boost)); // Clamp to reasonable range
  }

  // ============ Private helpers ============

  private static identifySections(text: string): SectionInfo[] {
    const sections: SectionInfo[] = [];
    const lines = text.split('\n');
    let currentOffset = 0;
    let currentSection: SectionInfo | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = currentOffset;
      currentOffset += line.length + 1; // +1 for newline

      // Check for section markers
      let newSectionType: SectionType | null = null;

      if (this.HEADER_PATTERNS.some(p => p.test(line))) {
        newSectionType = 'HEADER';
      } else if (this.DEMOGRAPHICS_PATTERNS.some(p => p.test(line))) {
        newSectionType = 'DEMOGRAPHICS';
      } else if (this.FOOTER_PATTERNS.some(p => p.test(line))) {
        newSectionType = 'FOOTER';
      } else if (/(?:signature|signed|authenticated)/i.test(line)) {
        newSectionType = 'SIGNATURE';
      } else if (/(?:assessment|diagnosis|impression|plan|treatment)/i.test(line) && line.length < 50) {
        newSectionType = 'CLINICAL';
      }

      if (newSectionType) {
        // Close previous section
        if (currentSection) {
          currentSection.endOffset = lineStart - 1;
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          type: newSectionType,
          startOffset: lineStart,
          endOffset: text.length,
          labels: [],
        };
      }

      // Collect labels in current section
      if (currentSection) {
        const labelMatch = line.match(/^([A-Za-z][A-Za-z\s]{2,25}):/);
        if (labelMatch) {
          currentSection.labels.push(labelMatch[1].trim());
        }
      }
    }

    // Close final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private static findNearestLabel(text: string, offset: number): { label: string | null; distance: number } {
    // Look backwards for labels
    const searchStart = Math.max(0, offset - 100);
    const searchText = text.substring(searchStart, offset);

    // Find last label in search range
    const labelRegex = /([A-Za-z][A-Za-z\s]{2,30})[\s]*:[\s]*/g;
    let lastMatch: RegExpExecArray | null = null;
    let match: RegExpExecArray | null;

    while ((match = labelRegex.exec(searchText)) !== null) {
      lastMatch = match;
    }

    if (lastMatch) {
      const labelEnd = searchStart + lastMatch.index + lastMatch[0].length;
      return {
        label: lastMatch[1].trim(),
        distance: offset - labelEnd,
      };
    }

    return { label: null, distance: Infinity };
  }

  private static isInTable(text: string, offset: number): boolean {
    // Check if current line looks like table row
    const lineStart = text.lastIndexOf('\n', offset) + 1;
    const lineEnd = text.indexOf('\n', offset);
    const line = text.substring(lineStart, lineEnd === -1 ? undefined : lineEnd);

    // Table indicators: pipes, multiple tabs, aligned columns
    return /[\|┃│]/.test(line) || /\t.*\t/.test(line) || /  {4,}/.test(line);
  }

  private static isInList(text: string, offset: number): boolean {
    const lineStart = text.lastIndexOf('\n', offset) + 1;
    const lineText = text.substring(lineStart, lineStart + 10);

    return /^[\s]*[-•*\d+.]\s/.test(lineText);
  }

  private static findColumnHeader(text: string, offset: number): string | null {
    // Look up to find header row
    const lineStart = text.lastIndexOf('\n', offset) + 1;

    // Find column position
    const colPosition = offset - lineStart;

    // Search backwards for header row (usually has === or --- after it, or is first row)
    let searchPos = lineStart;
    while (searchPos > 0) {
      const prevLineStart = text.lastIndexOf('\n', searchPos - 2) + 1;
      const prevLine = text.substring(prevLineStart, searchPos - 1);

      // Check if this might be a header row
      if (/^[A-Za-z\s\|]+$/.test(prevLine) && !/^\s*$/.test(prevLine)) {
        // Try to extract column at similar position
        const words = prevLine.split(/[\|\t]/).map(w => w.trim());
        // Rough column matching based on position
        const columnIndex = Math.floor(colPosition / 20); // Assume ~20 char columns
        if (words[columnIndex]) {
          return words[columnIndex];
        }
      }

      // Stop if we've gone too far
      if (lineStart - prevLineStart > 500) break;
      searchPos = prevLineStart;
    }

    return null;
  }
}
