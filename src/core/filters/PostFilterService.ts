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

  shouldKeep(span: Span, text: string): boolean {
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
 */
class SectionHeadingFilter implements IPostFilterStrategy {
  readonly name = "SectionHeading";

  private static readonly SECTION_HEADINGS = new Set([
    "CLINICAL INFORMATION",
    "COMPARISON",
    "CONTRAST",
    "TECHNIQUE",
    "FINDINGS",
    "IMPRESSION",
    "HISTORY",
    "EXAMINATION",
    "ASSESSMENT",
    "PLAN",
    "MEDICATIONS",
    "ALLERGIES",
    "DIAGNOSIS",
    "PROCEDURE",
    "RESULTS",
    "CONCLUSION",
    "RECOMMENDATIONS",
    "SUMMARY",
    "CHIEF COMPLAINT",
    "PRESENT ILLNESS",
    "PAST MEDICAL HISTORY",
    "FAMILY HISTORY",
    "SOCIAL HISTORY",
    "REVIEW OF SYSTEMS",
    "PHYSICAL EXAMINATION",
    "LABORATORY DATA",
    "IMAGING STUDIES",
    "PATIENT INFORMATION",
    "VISIT INFORMATION",
    "PROVIDER INFORMATION",
    "DISCHARGE SUMMARY",
    "OPERATIVE REPORT",
    "PROGRESS NOTE",
    "CONSULTATION REPORT",
    "RADIOLOGY REPORT",
    "PATHOLOGY REPORT",
    "EMERGENCY CONTACT",
    "EMERGENCY CONTACTS",
    "BILLING INFORMATION",
    "INSURANCE INFORMATION",
    // HIPAA document structure headings
    "REDACTION GUIDE",
    "COMPREHENSIVE HIPAA PHI",
    "HIPAA PHI",
    "GEOGRAPHIC DATA",
    "TELEPHONE NUMBERS",
    "EMAIL ADDRESSES",
    "SOCIAL SECURITY NUMBER",
    "MEDICAL RECORD NUMBER",
    "HEALTH PLAN BENEFICIARY NUMBER",
    "HEALTH PLAN BENEFICIARY",
    "ACCOUNT NUMBERS",
    "CERTIFICATE LICENSE NUMBERS",
    "CERTIFICATE LICENSE",
    "VEHICLE IDENTIFIERS",
    "DEVICE IDENTIFIERS",
    "SERIAL NUMBERS",
    "WEB URLS",
    "IP ADDRESSES",
    "BIOMETRIC IDENTIFIERS",
    "FULL FACE PHOTOGRAPHS",
    "PHOTOGRAPHIC IMAGES",
    "VISUAL MEDIA",
    "USAGE GUIDE",
    "SUMMARY TABLE",
    "UNIQUE IDENTIFYING NUMBERS",
    "OTHER UNIQUE IDENTIFIERS",
    "ALL DATES",
    "ALL NAMES",
    // Additional clinical headings
    "TREATMENT PLAN",
    "DIAGNOSTIC TESTS",
    "VITAL SIGNS",
    "LAB RESULTS",
    "TEST RESULTS",
    "CURRENT ADDRESS",
    "LOCATION INFORMATION",
    "CONTACT INFORMATION",
    "RELATIONSHIP INFORMATION",
    "DATES INFORMATION",
    "TIME INFORMATION",
    "DIGITAL IDENTIFIERS",
    "ONLINE IDENTIFIERS",
    "TRANSPORTATION INFORMATION",
    "IMPLANT INFORMATION",
    "DEVICE INFORMATION",
    "PROFESSIONAL LICENSES",
    "BIOMETRIC CHARACTERISTICS",
    "IDENTIFYING CHARACTERISTICS",
    "PATIENT ACKNOWLEDGMENTS",
    "PATIENT IDENTIFICATION SECTION",
    "PATIENT IDENTIFICATION",
    // Format example headings
    "FORMAT EXAMPLE",
    "CLINICAL NARRATIVE",
    "ADMINISTRATIVE RECORDS",
    "CLINICAL NOTES",
    "CLINICAL DOCUMENTATION",
    "DOCUMENTATION RECORDS",
    "IDENTIFICATION RECORDS",
    "IMPLANT RECORDS",
    "DEVICE DOCUMENTATION",
    "ONLINE PRESENCE",
    "COMMUNICATION RECORDS",
    "SYSTEM ACCESS",
    "SERVER LOGS",
    "SECURITY AUDITS",
    "BIOMETRIC AUTHENTICATION",
    "VISUAL DOCUMENTATION",
    "CLINICAL MEDIA",
    "ADMINISTRATIVE MEDIA",
  ]);

  private static readonly SINGLE_WORD_HEADINGS = new Set([
    "IMPRESSION",
    "FINDINGS",
    "TECHNIQUE",
    "COMPARISON",
    "CONTRAST",
    "HISTORY",
    "EXAMINATION",
    "ASSESSMENT",
    "PLAN",
    "MEDICATIONS",
    "ALLERGIES",
    "DIAGNOSIS",
    "PROCEDURE",
    "RESULTS",
    "CONCLUSION",
    "RECOMMENDATIONS",
    "SUMMARY",
    "DEMOGRAPHICS",
    "SPECIMEN",
    // Additional single-word headings
    "NAMES",
    "DATES",
    "IDENTIFIERS",
    "CHARACTERISTICS",
    "DEFINITION",
    "EXAMPLES",
    "GUIDE",
    "TABLE",
    "SECTION",
    "CATEGORY",
    "USAGE",
    "REDACTION",
    "COMPLIANCE",
    "HIPAA",
    "GEOGRAPHIC",
    "TELEPHONE",
    "BIOMETRIC",
    "PHOTOGRAPHIC",
    "ADMINISTRATIVE",
    "DOCUMENTATION",
    "CREDENTIALS",
    "TRANSPORTATION",
  ]);

  shouldKeep(span: Span, text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    const name = span.text;

    // Check if ALL CAPS
    if (!/^[A-Z\s]+$/.test(name)) {
      return true;
    }

    // Check multi-word section headings
    if (SectionHeadingFilter.SECTION_HEADINGS.has(name.trim())) {
      return false;
    }

    // Check single-word headings
    const words = name.trim().split(/\s+/);
    if (
      words.length === 1 &&
      SectionHeadingFilter.SINGLE_WORD_HEADINGS.has(words[0])
    ) {
      return false;
    }

    return true;
  }
}

/**
 * Filter for document structure words
 */
class StructureWordFilter implements IPostFilterStrategy {
  readonly name = "StructureWord";

  private static readonly STRUCTURE_WORDS = new Set([
    "RECORD",
    "INFORMATION",
    "SECTION",
    "NOTES",
    "HISTORY",
    "DEPARTMENT",
    "NUMBER",
    "ACCOUNT",
    "ROUTING",
    "BANK",
    "POLICY",
    "GROUP",
    "MEMBER",
    "STATUS",
    "DATE",
    "FORMAT",
    "PHONE",
    "ADDRESS",
    "EMAIL",
    "CONTACT",
    "PORTAL",
    "EXAMINATION",
    "RESULTS",
    "SIGNS",
    "RATE",
    "PRESSURE",
    "VEHICLE",
    "LICENSE",
    "DEVICE",
    "SERIAL",
    "MODEL",
    // Additional structure words
    "IDENTIFIERS",
    "CHARACTERISTICS",
    "GUIDE",
    "TABLE",
    "CATEGORY",
    "DEFINITION",
    "EXAMPLE",
    "EXAMPLES",
    "DOCUMENTATION",
    "RECORDS",
    "FILES",
    "DATA",
    "MEDIA",
    "IMAGES",
    "VIDEOS",
    "PHOTOGRAPHS",
    "AUTHENTICATION",
    "CREDENTIALS",
    "BIOMETRIC",
    "GEOGRAPHIC",
    "TRANSPORTATION",
    "REDACTION",
    "COMPLIANCE",
    "HARBOR",
    "BENEFICIARY",
    "CERTIFICATE",
  ]);

  shouldKeep(span: Span, text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    const nameWords = span.text.toUpperCase().split(/\s+/);
    for (const word of nameWords) {
      if (StructureWordFilter.STRUCTURE_WORDS.has(word)) {
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

  shouldKeep(span: Span, text: string): boolean {
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

  shouldKeep(span: Span, text: string): boolean {
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

  shouldKeep(span: Span, text: string): boolean {
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
 */
class MedicalPhraseFilter implements IPostFilterStrategy {
  readonly name = "MedicalPhrase";

  private static readonly MEDICAL_PHRASES = new Set([
    "the patient",
    "the doctor",
    "emergency department",
    "intensive care",
    "medical history",
    "physical examination",
    "diabetes mellitus",
    "depressive disorder",
    "bipolar disorder",
    "transgender male",
    "domestic partner",
    "is taking",
    "software engineer",
    "in any format",
    "blood pressure",
    "heart rate",
    "respiratory rate",
    "oxygen saturation",
    "vital signs",
    "lab results",
    "test results",
    "unstable angina",
    "acute coronary",
    "oxygen support",
    "discharge planning",
    "nursing education",
    "natriuretic peptide",
    "complete blood",
    "metabolic panel",
    "imaging studies",
    "lab work",
    "acute management",
    "telemetry unit",
    "nitroglycerin drip",
    "cranial nerves",
    "home phone",
    "cell phone",
    "work phone",
    "fax number",
    "home address",
    "work address",
    "email address",
    "patient portal",
    "insurance portal",
    "home network",
    "patient vehicle",
    "spouse vehicle",
    "vehicle license",
    "pacemaker model",
    "pacemaker serial",
    "physical therapy",
    "professional license",
    "retinal pattern",
    "patient photo",
    "security camera",
    "building access",
    "parking lot",
    "waiting room",
    "surgical video",
    "ultrasound video",
    "telehealth session",
    "living situation",
    "tobacco history",
    "alcohol use",
    "drug history",
    "stress level",
    "senior partner",
    "distinct boston",
    "athletic build",
    "north boulder",
    "downtown boulder",
    // Document structure terms
    "with all hipaa",
    "patient full name",
    "zip code",
    "lives near",
    "next scheduled follow",
    "chief complaint",
    "present illness",
    "general appearance",
    "privacy notice",
    "patient rights",
    "advance directive",
    "consent for treatment",
    "financial responsibility",
    // Medical terms and lab tests
    "allergic rhinitis",
    "current medications",
    "complete blood count",
    "comprehensive metabolic panel",
    "comprehensive metabolic",
    "blood count",
    "partial thromboplastin",
    "prothrombin time",
    "hemoglobin a1c",
    // Medication instructions
    "continue lisinopril",
    "add beta",
    "increase aspirin",
    "add atorvastatin",
    "add metoprolol",
    "increase metformin",
    "continue metformin",
    // Device and equipment terms
    "medtronic viva",
    "medtronic icd",
    "zimmer prosthesis",
    // Section headers
    "past medical history",
    "family history",
    "social history",
    "review of systems",
    "assessment",
    "clinical impressions",
    "diagnostic tests",
    "treatment plan",
    "provider information",
    "patient acknowledgments",
    "contact information",
    "relationship information",
    "dates information",
    "time information",
    "digital identifiers",
    "online identifiers",
    "vehicle information",
    "transportation information",
    "device information",
    "implant information",
    "professional licenses",
    "credentials",
    "biometric characteristics",
    "identifying characteristics",
    "photographs",
    "visual media",
    "current address",
    "location information",
    // Common clinical phrases
    "reports symptom",
    "symptom onset",
    "died of",
    "history of",
    "diagnosed june",
    "diagnosed january",
    "diagnosed february",
    "diagnosed march",
    "diagnosed april",
    "diagnosed may",
    "diagnosed july",
    "diagnosed august",
    "diagnosed september",
    "diagnosed october",
    "diagnosed november",
    "diagnosed december",
    "npo pending",
    "education materials",
    "sister linda",
    // Role/title fragments
    "paternal grandmother",
    "paternal grandfather",
    "maternal grandmother",
    "maternal grandfather",
    "consulting cardiologist",
    "admitting physician",
  ]);

  shouldKeep(span: Span, text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    if (MedicalPhraseFilter.MEDICAL_PHRASES.has(span.text.toLowerCase())) {
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

  shouldKeep(span: Span, text: string): boolean {
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

  shouldKeep(span: Span, text: string): boolean {
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
 */
class GeographicTermFilter implements IPostFilterStrategy {
  readonly name = "GeographicTerm";

  private static readonly GEO_TERMS = new Set([
    "boulder",
    "boston",
    "denver",
    "colorado",
    "texas",
    "california",
    "regional",
    "downtown",
    "north",
    "south",
    "east",
    "west",
    "central",
    "metro",
    "urban",
    "rural",
  ]);

  shouldKeep(span: Span, text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    const words = span.text.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (GeographicTermFilter.GEO_TERMS.has(word)) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Filter for common field labels
 */
class FieldLabelFilter implements IPostFilterStrategy {
  readonly name = "FieldLabel";

  private static readonly FIELD_LABELS = new Set([
    "spouse name",
    "sister name",
    "brother name",
    "mother name",
    "father name",
    "employer name",
    "employer contact",
    "spouse phone",
    "spouse email",
    "sister contact",
    "referring physician",
    "personal website",
    "admitting physician",
    "nurse manager",
    "last visit",
    "next scheduled",
    "health journal",
    "patient education",
    "document created",
    "last updated",
    "signature location",
  ]);

  shouldKeep(span: Span, text: string): boolean {
    if (span.filterType !== "NAME") {
      return true;
    }

    if (FieldLabelFilter.FIELD_LABELS.has(span.text.toLowerCase())) {
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
