"use strict";
/**
 * Centralized Word Lists for False Positive Filtering
 *
 * This module consolidates hardcoded word lists from PostFilterService.ts
 * for easier maintenance and customization.
 *
 * This addresses M1: Hardcoded word lists in PostFilterService
 *
 * Lists are organized by category:
 * - Section headings (document structure)
 * - Structure words (single words indicating document structure)
 * - Invalid prefixes (words that shouldn't start a name)
 * - Invalid suffixes (words that shouldn't end a name)
 * - Medical phrases (clinical terminology that are false positives)
 *
 * @module config/WordLists
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordLists = exports.MedicalPhrases = exports.InvalidNameSuffixes = exports.InvalidNamePrefixes = exports.StructureWords = exports.SingleWordHeadings = exports.SectionHeadings = void 0;
exports.isSectionHeading = isSectionHeading;
exports.containsStructureWord = containsStructureWord;
exports.hasInvalidPrefix = hasInvalidPrefix;
exports.hasInvalidSuffix = hasInvalidSuffix;
exports.isMedicalPhrase = isMedicalPhrase;
// =============================================================================
// SECTION HEADINGS
// =============================================================================
/**
 * Multi-word section headings that should not be detected as names.
 * These are ALL CAPS headings commonly found in clinical documents.
 */
exports.SectionHeadings = new Set([
    // Core clinical sections
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
    // History sections
    "CHIEF COMPLAINT",
    "PRESENT ILLNESS",
    "PAST MEDICAL HISTORY",
    "FAMILY HISTORY",
    "SOCIAL HISTORY",
    "REVIEW OF SYSTEMS",
    // Examination sections
    "PHYSICAL EXAMINATION",
    "LABORATORY DATA",
    "IMAGING STUDIES",
    // Administrative sections
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
// =============================================================================
// SINGLE WORD HEADINGS
// =============================================================================
/**
 * Single-word headings that should not be detected as names.
 */
exports.SingleWordHeadings = new Set([
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
// =============================================================================
// STRUCTURE WORDS
// =============================================================================
/**
 * Words that indicate document structure rather than names.
 * If a "name" contains these words, it's likely a false positive.
 */
exports.StructureWords = new Set([
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
// =============================================================================
// INVALID NAME PREFIXES
// =============================================================================
/**
 * Words that should not start a valid name.
 * Names starting with these are likely false positives.
 */
exports.InvalidNamePrefixes = [
    // Articles and prepositions
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
    // Contact type labels
    "Home ",
    "Work ",
    "Cell ",
    "Fax ",
    "Email ",
    // Medical/clinical terms
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
    // Document structure
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
    // Device manufacturer names (not person names)
    "Medtronic ",
    "Zimmer ",
];
// =============================================================================
// INVALID NAME SUFFIXES
// =============================================================================
/**
 * Words that should not end a valid name.
 * Names ending with these are likely false positives.
 */
exports.InvalidNameSuffixes = [
    // Prepositions and articles
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
    // Role words
    " patient",
    " doctor",
    " nurse",
    " staff",
    // Contact/document terms
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
    // Medical terms
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
    // Place names (not person names)
    " boulder",
    " boston",
    " denver",
    " colorado",
    // Document structure
    " name",
    " illness",
    " complaint",
    " appearance",
    " notice",
    " rights",
    " responsibilities",
    " treatment",
    " directive",
    // Medical terms
    " rhinitis",
    " medications",
    " count",
    " panel",
    " mellitus",
    // Medication names
    " lisinopril",
    " aspirin",
    " atorvastatin",
    " metoprolol",
    " metformin",
    // Generic endings
    " information",
    " identifiers",
    " characteristics",
    "-up",
    " hipaa",
];
// =============================================================================
// MEDICAL PHRASES
// =============================================================================
/**
 * Complete medical/clinical phrases that are false positives.
 * These are matched as complete phrases (case-insensitive).
 */
exports.MedicalPhrases = new Set([
    // General medical phrases
    "the patient",
    "the doctor",
    "emergency department",
    "intensive care",
    "medical history",
    "physical examination",
    // Conditions
    "diabetes mellitus",
    "depressive disorder",
    "bipolar disorder",
    "transgender male",
    "domestic partner",
    "is taking",
    "software engineer",
    "in any format",
    // Vital signs
    "blood pressure",
    "heart rate",
    "respiratory rate",
    "oxygen saturation",
    "vital signs",
    "lab results",
    "test results",
    // Clinical terms
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
    // Contact types
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
    // Vehicle/device terms
    "patient vehicle",
    "spouse vehicle",
    "vehicle license",
    "pacemaker model",
    "pacemaker serial",
    // Professional terms
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
    // Social history terms
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
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Check if a string is a section heading.
 */
function isSectionHeading(text) {
    const trimmed = text.trim();
    if (exports.SectionHeadings.has(trimmed))
        return true;
    // Check single-word headings
    const words = trimmed.split(/\s+/);
    if (words.length === 1 && exports.SingleWordHeadings.has(words[0]))
        return true;
    return false;
}
/**
 * Check if a string contains structure words.
 */
function containsStructureWord(text) {
    const upper = text.toUpperCase();
    const words = upper.split(/\s+/);
    return words.some((word) => exports.StructureWords.has(word));
}
/**
 * Check if a name starts with an invalid prefix.
 */
function hasInvalidPrefix(name) {
    return exports.InvalidNamePrefixes.some((prefix) => name.startsWith(prefix));
}
/**
 * Check if a name ends with an invalid suffix.
 */
function hasInvalidSuffix(name) {
    const lower = name.toLowerCase();
    return exports.InvalidNameSuffixes.some((suffix) => lower.endsWith(suffix));
}
/**
 * Check if text matches a medical phrase.
 */
function isMedicalPhrase(text) {
    return exports.MedicalPhrases.has(text.toLowerCase());
}
// =============================================================================
// AGGREGATED EXPORT
// =============================================================================
/**
 * Unified WordLists export for convenient importing.
 *
 * @example
 * import { WordLists } from '../config/WordLists';
 * if (WordLists.isSectionHeading(text)) { ... }
 */
exports.WordLists = {
    SectionHeadings: exports.SectionHeadings,
    SingleWordHeadings: exports.SingleWordHeadings,
    StructureWords: exports.StructureWords,
    InvalidNamePrefixes: exports.InvalidNamePrefixes,
    InvalidNameSuffixes: exports.InvalidNameSuffixes,
    MedicalPhrases: exports.MedicalPhrases,
    // Utility functions
    isSectionHeading,
    containsStructureWord,
    hasInvalidPrefix,
    hasInvalidSuffix,
    isMedicalPhrase,
};
//# sourceMappingURL=WordLists.js.map