/**
 * UnifiedNameDetector - Centralized Name Detection Patterns
 *
 * This module consolidates the DUPLICATE patterns that were spread across:
 * - SmartNameFilterSpan
 * - FormattedNameFilterSpan
 * - TitledNameFilterSpan
 * - FamilyNameFilterSpan
 *
 * Each filter should use these shared patterns instead of implementing their own.
 * This eliminates ~2000 lines of duplicate code while preserving functionality.
 *
 * PATTERN OWNERSHIP (after consolidation):
 * - UnifiedNameDetector: All shared patterns (patient, ALL CAPS, suffix, possessive, age/gender)
 * - SmartNameFilterSpan: OCR-specific patterns, chaos detection, special formats
 * - FormattedNameFilterSpan: Labeled fields (Name:), Last/First with priority
 * - TitledNameFilterSpan: Provider names (Dr., Mr.), provider roles
 * - FamilyNameFilterSpan: Relationships, maiden names, nicknames, children
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanFactory } from "../core/SpanFactory";
import { FilterPriority } from "../core/SpanBasedFilter";

/**
 * Name detection result with metadata
 */
export interface NameDetection {
  text: string;
  start: number;
  end: number;
  confidence: number;
  priority: number;
  pattern: string;
  filterType: FilterType;
}

/**
 * Patterns for family relationship prefixes
 * Used by: SmartNameFilter, FormattedNameFilter, TitledNameFilter, FamilyNameFilter
 */
export const FAMILY_RELATIONSHIP_PREFIXES = [
  "Spouse",
  "Wife",
  "Husband",
  "Father",
  "Mother",
  "Dad",
  "Mom",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Child",
  "Children",
  "Parent",
  "Sibling",
  "Partner",
  "Guardian",
  "Emergency Contact",
  "Next of Kin",
  "NOK",
  "Grandmother",
  "Grandfather",
  "Grandparent",
  "Uncle",
  "Aunt",
  "Cousin",
  "Nephew",
  "Niece",
  "Stepfather",
  "Stepmother",
  "Stepson",
  "Stepdaughter",
  "Fiancee",
  "Fiance",
  "Boyfriend",
  "Girlfriend",
  "Significant Other",
];

/**
 * Patterns for patient label prefixes
 * Used by: SmartNameFilter, FormattedNameFilter
 */
export const PATIENT_PREFIXES = [
  "Patient",
  "Pt",
  "Pt.",
  "Client",
  "Subject",
  "Resident",
  "Individual",
  "Member",
  "Enrollee",
  "Beneficiary",
];

/**
 * Name suffix patterns
 * Used by: SmartNameFilter, FormattedNameFilter
 */
export const NAME_SUFFIXES = [
  "Jr",
  "Jr.",
  "Sr",
  "Sr.",
  "II",
  "III",
  "IV",
  "V",
  "2nd",
  "3rd",
  "4th",
  "Esq",
  "Esq.",
];

/**
 * Age/gender descriptor patterns
 */
export const AGE_GENDER_PATTERNS = [
  /\b(\d{1,3})[\s-]?(?:year|yr|y\.?o\.?|yo)[\s-]?(?:old)?[\s-]*(male|female|man|woman|boy|girl|gentleman|lady|person|individual|patient)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/gi,
  /\b(male|female|man|woman|boy|girl)[\s,]+(?:age[d]?\s+)?(\d{1,3})[\s,]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/gi,
];

/**
 * ALL CAPS name pattern (2-3 words, all uppercase)
 */
export const ALL_CAPS_NAME_PATTERN =
  /\b([A-Z]{2,20}(?:\s+[A-Z]{2,20}){1,2})\b/g;

/**
 * Possessive name pattern
 */
export const POSSESSIVE_NAME_PATTERN =
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\s+(?=\w)/g;

/**
 * Unified name detector class
 */
export class UnifiedNameDetector {
  /**
   * Detect family relationship names
   * CONSOLIDATED: Was duplicated in 4 filters
   *
   * @param text - Text to search
   * @returns Array of name detections
   */
  static detectFamilyRelationshipNames(text: string): NameDetection[] {
    const detections: NameDetection[] = [];
    const prefixPattern = FAMILY_RELATIONSHIP_PREFIXES.join("|").replace(
      /\s+/g,
      "\\s+"
    );
    const pattern = new RegExp(
      `\\b(?:${prefixPattern})[:\\s]+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)\\b`,
      "gi"
    );

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      if (name && name.length >= 2) {
        detections.push({
          text: name,
          start: match.index + match[0].indexOf(name),
          end: match.index + match[0].indexOf(name) + name.length,
          confidence: 0.9,
          priority: FilterPriority.NAME,
          pattern: "Family relationship name",
          filterType: FilterType.NAME,
        });
      }
    }

    return detections;
  }

  /**
   * Detect patient-labeled names
   * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
   *
   * @param text - Text to search
   * @returns Array of name detections
   */
  static detectPatientNames(text: string): NameDetection[] {
    const detections: NameDetection[] = [];
    const prefixPattern = PATIENT_PREFIXES.map((p) =>
      p.replace(".", "\\.")
    ).join("|");
    const pattern = new RegExp(
      `\\b(?:${prefixPattern})[:\\s]+([A-Z][a-zA-Z'-]+(?:\\s+[A-Z][a-zA-Z'-]+){0,2})\\b`,
      "gi"
    );

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1];
      if (name && name.length >= 2) {
        detections.push({
          text: name,
          start: match.index + match[0].indexOf(name),
          end: match.index + match[0].indexOf(name) + name.length,
          confidence: 0.92,
          priority: FilterPriority.NAME,
          pattern: "Patient-labeled name",
          filterType: FilterType.NAME,
        });
      }
    }

    return detections;
  }

  /**
   * Detect ALL CAPS names
   * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
   *
   * @param text - Text to search
   * @returns Array of name detections
   */
  static detectAllCapsNames(text: string): NameDetection[] {
    const detections: NameDetection[] = [];

    // Patient-prefixed ALL CAPS
    const patientCapsPattern =
      /\b(?:PATIENT|PT)[:\s]+([A-Z]{2,20}(?:\s+[A-Z]{2,20}){1,2})\b/g;
    let match;
    while ((match = patientCapsPattern.exec(text)) !== null) {
      const name = match[1];
      if (name && name.length >= 4) {
        detections.push({
          text: name,
          start: match.index + match[0].indexOf(name),
          end: match.index + match[0].indexOf(name) + name.length,
          confidence: 0.88,
          priority: FilterPriority.NAME,
          pattern: "Patient ALL CAPS name",
          filterType: FilterType.NAME,
        });
      }
    }

    // Standalone ALL CAPS (lower confidence, could be headers)
    ALL_CAPS_NAME_PATTERN.lastIndex = 0;
    while ((match = ALL_CAPS_NAME_PATTERN.exec(text)) !== null) {
      const name = match[1];
      // Exclude common headers and medical terms
      const excludePatterns = [
        /^(PATIENT|HISTORY|DIAGNOSIS|TREATMENT|MEDICATION|ALLERGIES|VITAL|SIGNS|ASSESSMENT|PLAN|CHIEF|COMPLAINT|REVIEW|SYSTEMS|PHYSICAL|EXAMINATION|IMPRESSION|RECOMMENDATION|FOLLOW|DISCHARGE|INSTRUCTIONS|INSURANCE|BILLING|CONTACT|EMERGENCY|IDENTIFIER|HIPAA|PRIVACY|PROTECTED|GEOGRAPHIC|DEMOGRAPHIC|BIOMETRIC|HARBOR)$/i,
      ];

      if (!excludePatterns.some((p) => p.test(name))) {
        detections.push({
          text: name,
          start: match.index,
          end: match.index + name.length,
          confidence: 0.75,
          priority: FilterPriority.NAME,
          pattern: "Standalone ALL CAPS name",
          filterType: FilterType.NAME,
        });
      }
    }

    return detections;
  }

  /**
   * Detect names with suffixes (Jr., Sr., III, etc.)
   * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
   *
   * @param text - Text to search
   * @returns Array of name detections
   */
  static detectNamesWithSuffix(text: string): NameDetection[] {
    const detections: NameDetection[] = [];
    const suffixPattern = NAME_SUFFIXES.map((s) =>
      s.replace(".", "\\.")
    ).join("|");
    const pattern = new RegExp(
      `\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+),?\\s*(?:${suffixPattern})\\b`,
      "gi"
    );

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];
      detections.push({
        text: fullMatch,
        start: match.index,
        end: match.index + fullMatch.length,
        confidence: 0.92,
        priority: FilterPriority.NAME,
        pattern: "Name with suffix",
        filterType: FilterType.NAME,
      });
    }

    return detections;
  }

  /**
   * Detect possessive names (John Smith's)
   * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
   *
   * @param text - Text to search
   * @returns Array of name detections
   */
  static detectPossessiveNames(text: string): NameDetection[] {
    const detections: NameDetection[] = [];

    POSSESSIVE_NAME_PATTERN.lastIndex = 0;
    let match;
    while ((match = POSSESSIVE_NAME_PATTERN.exec(text)) !== null) {
      const name = match[1];
      if (name && name.length >= 2) {
        // Exclude medical eponyms (Wilson's disease, Parkinson's, etc.)
        const medicalEponyms = [
          "parkinson",
          "alzheimer",
          "wilson",
          "cushing",
          "addison",
          "graves",
          "crohn",
          "hodgkin",
        ];
        if (!medicalEponyms.some((e) => name.toLowerCase().includes(e))) {
          detections.push({
            text: name,
            start: match.index,
            end: match.index + name.length,
            confidence: 0.87,
            priority: FilterPriority.NAME,
            pattern: "Possessive name",
            filterType: FilterType.NAME,
          });
        }
      }
    }

    return detections;
  }

  /**
   * Detect names with age/gender descriptors
   * CONSOLIDATED: Was duplicated in SmartNameFilter and FormattedNameFilter
   *
   * @param text - Text to search
   * @returns Array of name detections
   */
  static detectAgeGenderNames(text: string): NameDetection[] {
    const detections: NameDetection[] = [];

    for (const pattern of AGE_GENDER_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[3] || match[1];
        if (name && /^[A-Z]/.test(name)) {
          detections.push({
            text: name,
            start: match.index + match[0].lastIndexOf(name),
            end: match.index + match[0].lastIndexOf(name) + name.length,
            confidence: 0.91,
            priority: FilterPriority.NAME,
            pattern: "Age/gender descriptor name",
            filterType: FilterType.NAME,
          });
        }
      }
    }

    return detections;
  }

  /**
   * Run all consolidated name detection patterns
   * Returns deduplicated results
   *
   * @param text - Text to search
   * @returns Array of unique name detections
   */
  static detectAll(text: string): NameDetection[] {
    const allDetections: NameDetection[] = [];

    // Run all patterns
    allDetections.push(...this.detectFamilyRelationshipNames(text));
    allDetections.push(...this.detectPatientNames(text));
    allDetections.push(...this.detectAllCapsNames(text));
    allDetections.push(...this.detectNamesWithSuffix(text));
    allDetections.push(...this.detectPossessiveNames(text));
    allDetections.push(...this.detectAgeGenderNames(text));

    // Deduplicate by position
    const seen = new Set<string>();
    const unique: NameDetection[] = [];

    for (const det of allDetections) {
      const key = `${det.start}-${det.end}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(det);
      }
    }

    return unique;
  }

  /**
   * Convert detections to Spans
   *
   * @param detections - Array of name detections
   * @param text - Original text (for context extraction)
   * @returns Array of Span objects
   */
  static toSpans(detections: NameDetection[], text: string): Span[] {
    return detections.map((det) =>
      SpanFactory.fromPosition(text, det.start, det.end, det.filterType, {
        confidence: det.confidence,
        priority: det.priority,
        pattern: det.pattern,
      })
    );
  }
}

/**
 * Convenience function to get all unified name spans
 */
export function detectUnifiedNames(text: string): Span[] {
  const detections = UnifiedNameDetector.detectAll(text);
  return UnifiedNameDetector.toSpans(detections, text);
}
