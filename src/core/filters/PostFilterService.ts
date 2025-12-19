/**
 * PostFilterService - Post-Detection Filtering for False Positive Removal
 *
 * This module handles filtering of detected spans after initial detection
 * but before tokenization. It removes false positives using multiple
 * filtering strategies.
 *
 * Extracted from ParallelRedactionEngine for better maintainability.
 *
 * @module core/filters
 */

import { Span, FilterType } from "../../models/Span";
import { RadiologyLogger } from "../../utils/RadiologyLogger";
import { loadNativeBinding } from "../../native/binding";
import { RustAccelConfig } from "../../config/RustAccelConfig";
import { applyMLFalsePositiveFilter } from "../../ml/FalsePositiveClassifier";
import {
  getSectionHeadings,
  getSingleWordHeadings,
  getStructureWords,
  getMedicalPhrases,
  getGeoTerms,
  getFieldLabels,
} from "../../config/post-filter";

let cachedPostFilterBinding:
  | ReturnType<typeof loadNativeBinding>
  | null
  | undefined = undefined;

function isPostFilterAccelEnabled(): boolean {
  return RustAccelConfig.isPostFilterEnabled();
}

function isPostFilterShadowEnabled(): boolean {
  return process.env.VULPES_SHADOW_POSTFILTER === "1";
}

function getPostFilterBinding(): ReturnType<typeof loadNativeBinding> | null {
  if (cachedPostFilterBinding !== undefined) return cachedPostFilterBinding;
  try {
    cachedPostFilterBinding = loadNativeBinding({ configureOrt: false });
  } catch {
    cachedPostFilterBinding = null;
  }
  return cachedPostFilterBinding;
}

export type PostFilterShadowReport = {
  enabled: boolean;
  rustAvailable: boolean;
  rustEnabled: boolean;
  inputSpans: number;
  tsKept: number;
  rustKept: number;
  missingInRust: number;
  extraInRust: number;
};

/**
 * Interface for filter strategies
 */
export interface IPostFilterStrategy {
  /** Name of the filter for logging */
  readonly name: string;

  /**
   * Determine if span should be filtered out (return false to remove)
   * @param span - The span to check
   * @param text - Full document text for context
   * @returns true to keep span, false to remove
   */
  shouldKeep(span: Span, text: string): boolean;
}

// =============================================================================
// FILTER STRATEGIES
// =============================================================================

/**
 * Filter for device/phone false positives like "Call Button: 555"
 */
class DevicePhoneFalsePositiveFilter implements IPostFilterStrategy {
  readonly name = "DevicePhoneFalsePositive";

  shouldKeep(span: Span, _text: string): boolean {
    if (
      span.filterType !== FilterType.DEVICE &&
      span.filterType !== FilterType.PHONE
    ) {
      return true;
    }

    const nameLower = span.text.toLowerCase();
    if (
      nameLower.includes("call button") ||
      nameLower.includes("room:") ||
      nameLower.includes("bed:")
    ) {
      return false;
    }

    return true;
  }
}

/**
 * Filter for ALL CAPS section headings
 * Uses externalized config from config/post-filter/
 */
class SectionHeadingFilter implements IPostFilterStrategy {
  readonly name = "SectionHeading";

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    const name = span.text;

    // Check if ALL CAPS
    if (!/^[A-Z\s]+$/.test(name)) {
      return true;
    }

    // Check multi-word section headings (config stores lowercase, compare lowercase)
    if (getSectionHeadings().has(name.trim().toLowerCase())) {
      return false;
    }

    // Check single-word headings
    const words = name.trim().split(/\s+/);
    if (
      words.length === 1 &&
      getSingleWordHeadings().has(words[0].toLowerCase())
    ) {
      return false;
    }

    return true;
  }
}

/**
 * Filter for document structure words
 * Uses externalized config from config/post-filter/
 */
class StructureWordFilter implements IPostFilterStrategy {
  readonly name = "StructureWord";

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    const nameWords = span.text.toLowerCase().split(/\s+/);
    const structureWords = getStructureWords();
    for (const word of nameWords) {
      if (structureWords.has(word)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Filter for short names (less than 5 chars without comma)
 */
class ShortNameFilter implements IPostFilterStrategy {
  readonly name = "ShortName";

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    const name = span.text;
    if (name.length < 5 && !name.includes(",") && span.confidence < 0.9) {
      return false;
    }

    return true;
  }
}

/**
 * Filter for invalid prefix words
 */
class InvalidPrefixFilter implements IPostFilterStrategy {
  readonly name = "InvalidPrefix";

  private static readonly INVALID_STARTS = [
    "The ",
    "A ",
    "An ",
    "To ",
    "From ",
    "In ",
    "On ",
    "At ",
    "Is ",
    "Was ",
    "Are ",
    "By ",
    "For ",
    "With ",
    "As ",
    "All ",
    "No ",
    "Not ",
    "And ",
    "Or ",
    "But ",
    "Home ",
    "Work ",
    "Cell ",
    "Fax ",
    "Email ",
    "Blood ",
    "Heart ",
    "Vital ",
    "Oxygen ",
    "Cardiac ",
    "Distinct ",
    "Athletic ",
    "Local ",
    "Regional ",
    "National ",
    "Nursing ",
    "Diagnostic ",
    "Unstable ",
    "Acute ",
    "Chronic ",
    // Additional invalid starts
    "Chief ",
    "Present ",
    "Privacy ",
    "Advance ",
    "Consent ",
    "Financial ",
    "Current ",
    "Complete ",
    "Comprehensive ",
    "Continue ",
    "Add ",
    "Increase ",
    "Past ",
    "Family ",
    "Social ",
    "Review ",
    "Treatment ",
    "Provider ",
    "Contact ",
    "Relationship ",
    "Digital ",
    "Online ",
    "Vehicle ",
    "Transportation ",
    "Device ",
    "Implant ",
    "Professional ",
    "Biometric ",
    "Identifying ",
    "Visual ",
    "Reports ",
    "Symptom ",
    "Died ",
    "History ",
    "Diagnosed ",
    "NPO ",
    "Education ",
    "Paternal ",
    "Maternal ",
    "Consulting ",
    "Admitting ",
    "Sister ",
    "Brother ",
    "Allergic ",
    "Seasonal ",
    "General ",
    "Zip ",
    "Lives ",
    "Next ",
    "Medtronic ",
    "Zimmer ",
  ];

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    for (const start of InvalidPrefixFilter.INVALID_STARTS) {
      if (span.text.startsWith(start)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Filter for invalid suffix words
 */
class InvalidSuffixFilter implements IPostFilterStrategy {
  readonly name = "InvalidSuffix";

  private static readonly INVALID_ENDINGS = [
    " the",
    " at",
    " in",
    " on",
    " to",
    " from",
    " reviewed",
    " case",
    " was",
    " is",
    " are",
    " patient",
    " doctor",
    " nurse",
    " staff",
    " phone",
    " address",
    " email",
    " number",
    " contact",
    " portal",
    " history",
    " status",
    " results",
    " plan",
    " notes",
    " unit",
    " rate",
    " pressure",
    " signs",
    " level",
    " build",
    " network",
    " angina",
    " support",
    " education",
    " planning",
    " studies",
    " management",
    " drip",
    " vehicle",
    " model",
    " location",
    " situation",
    " use",
    " boulder",
    " boston",
    " denver",
    " colorado",
    // Additional invalid endings
    " name",
    " illness",
    " complaint",
    " appearance",
    " notice",
    " rights",
    " responsibilities",
    " treatment",
    " directive",
    " rhinitis",
    " medications",
    " count",
    " panel",
    " mellitus",
    " lisinopril",
    " aspirin",
    " atorvastatin",
    " metoprolol",
    " metformin",
    " information",
    " identifiers",
    " characteristics",
    "-up",
    " hipaa",
  ];

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    const nameLower = span.text.toLowerCase();
    for (const ending of InvalidSuffixFilter.INVALID_ENDINGS) {
      if (nameLower.endsWith(ending)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Filter for common medical/clinical phrases
 * Uses externalized config from config/post-filter/
 */
class MedicalPhraseFilter implements IPostFilterStrategy {
  readonly name = "MedicalPhrase";

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    if (getMedicalPhrases().has(span.text.toLowerCase())) {
      return false;
    }

    return true;
  }
}

/**
 * Filter for medical condition suffixes
 */
class MedicalSuffixFilter implements IPostFilterStrategy {
  readonly name = "MedicalSuffix";

  private static readonly MEDICAL_SUFFIXES = [
    "Disorder",
    "Mellitus",
    "Disease",
    "Syndrome",
    "Infection",
    "Condition",
    // Facility / org suffixes (common false positives for NAME detection)
    "Health",
    "Hospital",
    "Clinic",
    "Center",
    "Partners",
    "Group",
    "Medical",
    "Medicine",
    "System",
    "Systems",
    "Pressure",
    "Rate",
    "Signs",
    "Phone",
    "Address",
    "Email",
    "Portal",
    "History",
    "Examination",
    "Studies",
    "Management",
    "Planning",
  ];

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    for (const suffix of MedicalSuffixFilter.MEDICAL_SUFFIXES) {
      if (span.text.endsWith(suffix)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Filter out name spans that cross line boundaries.
 * Real person names should never include newlines; this prevents swallowing
 * the next line's label (e.g., "Hospital: X\\nDx: ...").
 */
class NameLineBreakFilter implements IPostFilterStrategy {
  readonly name = "NameLineBreak";

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    if (!/[\r\n]/.test(span.text)) {
      return true;
    }

    // If the span crosses into the next line and that next line starts with a
    // common medical field label, this is almost certainly a false positive.
    // Example: "Hospital: Foo\\nDx: Bar" -> avoid swallowing "Dx" into a name span.
    const parts = span.text.split(/\r?\n/);
    const afterNewline = parts.slice(1).join(" ").trim();

    const labelLike =
      /^(?:dx|dob|mrn|age|phone|fax|email|address|street|zip|zipcode|npi|dea|ssn|patient|provider)\b[:\s-]*/i;
    if (labelLike.test(afterNewline)) {
      return false;
    }

    // If the post-newline tail contains a short label-ish fragment ending with ":"
    // it's also a strong indicator we captured a field label.
    if (
      afterNewline.length > 0 &&
      afterNewline.length <= 24 &&
      /:/.test(afterNewline)
    ) {
      return false;
    }

    // Otherwise allow newline-separated names (rare but possible in OCR/layout).
    return true;
  }
}

/**
 * Filter for geographic terms that aren't names
 * Uses externalized config from config/post-filter/
 */
class GeographicTermFilter implements IPostFilterStrategy {
  readonly name = "GeographicTerm";

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    const words = span.text.toLowerCase().split(/\s+/);
    const geoTerms = getGeoTerms();
    for (const word of words) {
      if (geoTerms.has(word)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Filter for common field labels
 * Uses externalized config from config/post-filter/
 */
class FieldLabelFilter implements IPostFilterStrategy {
  readonly name = "FieldLabel";

  shouldKeep(span: Span, _text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    if (getFieldLabels().has(span.text.toLowerCase())) {
      return false;
    }

    return true;
  }
}

// =============================================================================
// POST FILTER SERVICE
// =============================================================================

/**
 * PostFilterService - Orchestrates all post-detection filtering strategies
 *
 * This service applies multiple filtering strategies to remove false positives
 * from detected spans before they are tokenized.
 */
export class PostFilterService {
  private static readonly strategies: IPostFilterStrategy[] = [
    new DevicePhoneFalsePositiveFilter(),
    new SectionHeadingFilter(),
    new StructureWordFilter(),
    new ShortNameFilter(),
    new InvalidPrefixFilter(),
    new InvalidSuffixFilter(),
    new NameLineBreakFilter(),
    new MedicalPhraseFilter(),
    new MedicalSuffixFilter(),
    new GeographicTermFilter(),
    new FieldLabelFilter(),
  ];

  private static filterTs(spans: Span[], text: string): Span[] {
    return spans.filter((span) => {
      for (const strategy of PostFilterService.strategies) {
        if (!strategy.shouldKeep(span, text)) {
          RadiologyLogger.info(
            "REDACTION",
            `Post-filter [${strategy.name}] removed: "${span.text}"`,
          );
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Apply all post-filter strategies to remove false positives
   *
   * @param spans - Detected spans to filter
   * @param text - Full document text for context
   * @returns Filtered spans with false positives removed
   */
  static filter(
    spans: Span[],
    text: string,
    options: { shadowReport?: PostFilterShadowReport } = {},
  ): Span[] {
    const wantsRust = isPostFilterAccelEnabled();
    const wantsShadow = isPostFilterShadowEnabled();

    const binding = wantsRust || wantsShadow ? getPostFilterBinding() : null;
    const postfilterDecisions = binding?.postfilterDecisions;
    const rustAvailable = typeof postfilterDecisions === "function";

    const shadowReport = options.shadowReport;
    if (shadowReport) {
      shadowReport.enabled = wantsShadow;
      shadowReport.rustAvailable = rustAvailable;
      shadowReport.rustEnabled = wantsRust && rustAvailable;
      shadowReport.inputSpans = spans.length;
      shadowReport.tsKept = 0;
      shadowReport.rustKept = 0;
      shadowReport.missingInRust = 0;
      shadowReport.extraInRust = 0;
    }

    const shouldUseRust = wantsRust && rustAvailable;

    const tsFiltered =
      wantsShadow || !shouldUseRust
        ? PostFilterService.filterTs(spans, text)
        : null;

    if (!shouldUseRust) {
      if (shadowReport && tsFiltered) {
        shadowReport.tsKept = tsFiltered.length;
        shadowReport.rustKept = 0;
        shadowReport.missingInRust = 0;
        shadowReport.extraInRust = 0;
      }
      return tsFiltered ?? PostFilterService.filterTs(spans, text);
    }

    const decisions = postfilterDecisions!(
      spans.map((s) => ({
        filterType: String(s.filterType),
        text: s.text,
        confidence: s.confidence,
      })),
    );

    const rustFiltered: Span[] = [];
    for (let i = 0; i < spans.length; i++) {
      const decision = decisions[i];
      if (decision?.keep) {
        rustFiltered.push(spans[i]);
        continue;
      }
      RadiologyLogger.info(
        "REDACTION",
        `Post-filter [${decision?.removedBy ?? "Rust"}] removed: "${spans[i].text}"`,
      );
    }

    if (shadowReport && tsFiltered) {
      shadowReport.tsKept = tsFiltered.length;
      shadowReport.rustKept = rustFiltered.length;

      const tsKept = new Set(
        tsFiltered.map(
          (s) => `${s.characterStart}-${s.characterEnd}-${s.filterType}`,
        ),
      );
      const rustKept = new Set(
        rustFiltered.map(
          (s) => `${s.characterStart}-${s.characterEnd}-${s.filterType}`,
        ),
      );

      let missingInRust = 0;
      for (const k of tsKept) if (!rustKept.has(k)) missingInRust++;

      let extraInRust = 0;
      for (const k of rustKept) if (!tsKept.has(k)) extraInRust++;

      shadowReport.missingInRust = missingInRust;
      shadowReport.extraInRust = extraInRust;
    }

    return rustFiltered;
  }

  /**
   * Get list of active strategy names
   */
  static getStrategyNames(): string[] {
    return PostFilterService.strategies.map((s) => s.name);
  }

  /**
   * Apply post-filter with ML-based false positive detection (async version)
   *
   * This method runs:
   * 1. All rule-based strategies (sync)
   * 2. ML false positive classifier (async, if enabled)
   *
   * @param spans - Detected spans to filter
   * @param text - Full document text for context
   * @returns Filtered spans with false positives removed
   */
  static async filterAsync(
    spans: Span[],
    text: string,
    options: { shadowReport?: PostFilterShadowReport } = {},
  ): Promise<Span[]> {
    // First apply rule-based filters
    const ruleFiltered = PostFilterService.filter(spans, text, options);

    // Then apply ML FP classifier (if enabled)
    try {
      const mlFiltered = await applyMLFalsePositiveFilter(ruleFiltered, text);
      return mlFiltered;
    } catch (error) {
      RadiologyLogger.error(
        "REDACTION",
        `ML FP filter failed, returning rule-based results: ${error}`,
      );
      return ruleFiltered;
    }
  }
}

// Export individual strategies for testing
export {
  DevicePhoneFalsePositiveFilter,
  SectionHeadingFilter,
  StructureWordFilter,
  ShortNameFilter,
  InvalidPrefixFilter,
  InvalidSuffixFilter,
  MedicalPhraseFilter,
  MedicalSuffixFilter,
  GeographicTermFilter,
  FieldLabelFilter,
};
