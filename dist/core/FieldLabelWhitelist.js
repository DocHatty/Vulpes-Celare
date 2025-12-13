"use strict";
/**
 * Field Label Whitelist - Centralized Exclusion Registry
 *
 * Prevents common medical/clinical field labels and document structure
 * from being incorrectly redacted as PHI/PII.
 *
 * This is the SINGLE SOURCE OF TRUTH for all exclusions.
 * Ported from VulpesMatrix with enhancements for radiology workflows.
 *
 * @module redaction/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldLabelWhitelist = void 0;
class FieldLabelWhitelist {
    /**
     * Terms that should NEVER be redacted - they're field labels, not PHI
     */
    static WHITELIST_TERMS = new Set([
        // ===== Document Structure =====
        "comprehensive",
        "synthetic",
        "hipaa",
        "phi",
        "redactions",
        "section",
        "information",
        "identifiers",
        "characteristics",
        "safe harbor",
        "geographic data",
        "structured medical",
        "multiple formatting",
        "comprehensive synthetic",
        "redaction guide",
        "usage guide",
        "summary table",
        "unique identifying",
        "other unique",
        "any other",
        "format example",
        "data source",
        // ===== Document Types/Titles =====
        "radiology report",
        "sample body radiology report",
        "progress note",
        "discharge summary",
        "consultation report",
        "operative report",
        "pathology report",
        "lab report",
        "clinical note",
        "medical record",
        "clinical narrative",
        "administrative records",
        "correspondence record",
        "billing records",
        "documentation records",
        "implant records",
        "device documentation",
        "communication records",
        "system access",
        "server logs",
        "security audits",
        "identification records",
        "visual documentation",
        "clinical media",
        "administrative media",
        // ===== Facility Types =====
        "imaging center",
        "medical center",
        "health center",
        "regional hospital",
        "community hospital",
        "urgent care",
        "emergency department",
        "intensive care",
        "nursing facility",
        "rehabilitation center",
        "dialysis center",
        "ambulatory care",
        "surgical center",
        // ===== Professional Titles/Descriptors =====
        "board certified radiologist",
        "board certified",
        "attending physician",
        "consulting physician",
        "primary care",
        "emergency medicine",
        "internal medicine",
        "family medicine",
        "nationalrad radiologist",
        "provider credentials",
        "provider information",
        // ===== Signature/Attestation =====
        "electronically signed",
        "digitally signed",
        "electronic signature",
        "report approved",
        // ===== Field Labels - Personal =====
        "patient",
        "name",
        "full name",
        "first name",
        "last name",
        "middle name",
        "date of birth",
        "birth date",
        "age",
        "sex",
        "gender",
        "male",
        "female",
        "address",
        "home address",
        "work address",
        "email",
        "email address",
        "phone",
        "phone number",
        "home phone",
        "cell phone",
        "work phone",
        "contact",
        "emergency contact",
        "emergency contacts",
        // ===== Field Labels - Identification =====
        "medical record number",
        "mrn",
        "account number",
        "patient account",
        "health plan",
        "member id",
        "policy number",
        "social security number",
        "ssn",
        "license number",
        "driver's license",
        "passport number",
        "file #",
        "file number",
        // ===== Field Labels - Clinical =====
        "admission",
        "discharge",
        "surgery",
        "visit",
        "appointment",
        "date of admission",
        "date of discharge",
        "date of surgery",
        "time of admission",
        "time of discharge",
        "time of surgery",
        "diagnosis",
        "diagnosis date",
        "medication start date",
        "weight",
        "height",
        "blood pressure",
        "temperature",
        "clinical information",
        "comparison",
        "contrast",
        "technique",
        "findings",
        "impression",
        // ===== Field Labels - Contacts =====
        "spouse",
        "spouse name",
        "spouse phone",
        "spouse email",
        "mother",
        "father",
        "sister",
        "brother",
        "parent",
        "employer",
        "employer name",
        "employer contact",
        "physician",
        "primary physician",
        "referring physician",
        "cardiologist",
        "specialist",
        // ===== Field Labels - Digital =====
        "portal",
        "patient portal",
        "username",
        "account email",
        "website",
        "personal website",
        "blog",
        "profile",
        "ip address",
        "network",
        "last login",
        // ===== Field Labels - Vehicles =====
        "vehicle",
        "make",
        "model",
        "year",
        "license plate",
        "vin",
        "vehicle identification number",
        // ===== Field Labels - Devices =====
        "device",
        "serial number",
        "pacemaker",
        "implant",
        "pacemaker model",
        "hip implant",
        "pump",
        // ===== Field Labels - Biometric =====
        "build",
        "hair color",
        "eye color",
        "fingerprint",
        "voiceprint",
        "iris scan",
        "retinal pattern",
        "dna sample",
        "photo",
        "photograph",
        // ===== Field Labels - Licenses =====
        "license",
        "nursing license",
        "dea license",
        "professional license",
        "expiration",
        "state of",
        "credentials",
        // ===== Field Labels - Media =====
        "footage",
        "video",
        "recording",
        "photo id",
        "security camera",
        "ultrasound",
        "surgical video",
        // ===== Time/Location Descriptors =====
        "am",
        "pm",
        "time",
        "location",
        "near",
        "area",
        "current",
        "previous",
        "next",
        "last",
        "scheduled",
        // ===== Geographic (Street Types) =====
        "main street",
        "street address",
        "mailing address",
        "physical address",
        // ===== Generic Medical Terms (not PHI) =====
        "applicable",
        "if applicable",
        "referring",
        "effective date",
        "renewal date",
        "evaluation",
        "details",
        "status",
        // ===== Anatomical/Medical Terms (generic) =====
        "implantable",
        "cardioverter",
        "defibrillator",
        "icd",
        "artificial",
        "insulin",
        "cardiac",
        // ===== Relationship Terms =====
        "deceased",
        "alive",
        "married",
        "contact information",
        // ===== Document Metadata =====
        "full",
        "partial",
        "complete",
        "visible",
        "identifiable",
        "clearly",
        "documentation",
        "file",
        // ===== Geographic (Non-specific) =====
        "suite",
        "unit",
        "floor",
        "building",
        "facility",
        "downtown",
        "residential",
        "district",
        // ===== Directional =====
        "north",
        "south",
        "east",
        "west",
        // ===== Transportation Generic =====
        "transportation",
        "make/model/year",
        "plate",
        // ===== Radiology-specific =====
        "exam",
        "date",
        "dob",
        "referring",
        "mri",
        "ct",
        "pet",
        "x-ray",
        "ultrasound",
        "mammogram",
        "fluoroscopy",
        "nationwide",
        "headquartered",
        "diagnostic imaging services",
    ]);
    /**
     * Exact phrase matches that should NOT be redacted (case-insensitive)
     * These are multi-word phrases that look like names but aren't
     */
    static EXACT_PHRASE_EXCLUSIONS = new Set([
        // Document titles
        "sample body radiology report",
        "radiology report",
        "progress note",
        "discharge summary",
        "consultation report",
        "operative report",
        "pathology report",
        "lab report",
        // Facility types
        "imaging center",
        "medical center",
        "health center",
        "regional hospital",
        "community hospital",
        "urgent care",
        // Professional descriptors
        "board certified radiologist",
        "board certified",
        "attending physician",
        "consulting physician",
        "primary care",
        "emergency medicine",
        "internal medicine",
        "family medicine",
        "nationalrad radiologist",
        // Signature phrases
        "electronically signed",
        "digitally signed",
        "electronic signature",
        "report approved on",
        // Address components
        "main street",
        "street address",
        "mailing address",
        // Clinical sections
        "clinical information",
        "history of present illness",
        "past medical history",
        "family history",
        "social history",
        "review of systems",
        "physical examination",
        "physical exam",
        "assessment and plan",
        "diagnostic imaging services",
        // HIPAA document structure - commonly flagged as false positives
        "safe harbor",
        "protected health",
        "health information",
        "geographic data",
        "structured medical",
        "biometric identifiers",
        "biometric authentication",
        "full face photographs",
        "photographic images",
        "visual media",
        "device identifiers",
        "serial numbers",
        "vehicle identifiers",
        "web urls",
        "ip addresses",
        "telephone numbers",
        "email addresses",
        "social security number",
        "medical record number",
        "health plan beneficiary",
        "account numbers",
        "certificate license",
        "unique identifying",
        "other unique",
        // Vital signs and measurements
        "vital signs",
        "blood pressure",
        "heart rate",
        "respiratory rate",
        "oxygen saturation",
        "lab results",
        "test results",
        // Clinical documentation terms
        "clinical note",
        "clinical narrative",
        "discharge planning",
        "nursing education",
        "patient education",
        "cardiac rehabilitation",
        "oxygen support",
        "treatment plan",
        "diagnostic tests",
        // Insurance/administrative
        "insurance card",
        "contact directory",
        "billing records",
        "payment processing",
        "provider credentials",
        "online presence",
        // Medical report section headings
        "emergency contacts",
        "nursing admission assessment",
        "nursing assessment",
        "physical therapy",
        "physical therapy evaluation",
        "psychiatric evaluation",
        "psychiatric assessment",
        "mental status exam",
        "mental status examination",
        "multidisciplinary team",
        "multidisciplinary team note",
        "consultation note",
        "procedure performed",
        "gross description",
        "obstetric ultrasound",
        "second trimester",
        "first trimester",
        "third trimester",
        "vaccines administered",
        "immunization record",
        // Medical specialties (not names)
        "radiation oncology",
        "medical oncology",
        "surgical oncology",
        "internal medicine",
        "family medicine",
        "emergency medicine",
        "pediatric medicine",
        // NOTE: Medications are centralized in DocumentVocabulary.MEDICAL_TERMS
        // Do not duplicate them here - see src/vocabulary/DocumentVocabulary.ts
        // Vaccines and diseases (NOT in DocumentVocabulary - keep here)
        "diphtheria",
        "tetanus",
        "pertussis",
        "measles",
        "mumps",
        "rubella",
        "varicella",
        "hepatitis",
        "influenza",
        "pneumonia",
        "polio",
        "dtap",
        "ipv",
        "mmr",
        "tdap",
        // Mental health terms
        "mental status exam",
        "mental status examination",
        "mood",
        "affect",
        "cognition",
        "appearance",
        // More clinical terms
        "vaccines administered",
        "vaccine",
        "vaccines",
        "allergy",
        "allergies",
    ]);
    /**
     * Words that indicate document structure when part of a phrase
     */
    static STRUCTURE_WORDS = new Set([
        "RECORD",
        "INFORMATION",
        "SECTION",
        "NOTES",
        "HISTORY",
        "DEPARTMENT",
        "REPORT",
        "CENTER",
        "HOSPITAL",
        "CLINIC",
        "STREET", // Address component - "Main Street" should not be a NAME
        "SIGNED",
        "CERTIFIED",
        "IMAGING",
        "SERVICES",
        "NATIONWIDE",
        "HEADQUARTERED",
        // Medical/clinical structure words
        "EXAM",
        "EXAMINATION",
        "STATUS",
        "ASSESSMENT",
        "EVALUATION",
        "ADMINISTERED",
        "ONCOLOGY",
        "THERAPY",
        "VACCINATION",
        "VACCINE",
        "VACCINES",
        // HIPAA/Privacy structure words
        "HIPAA",
        "PHI",
        "HARBOR",
        "IDENTIFIERS",
        "PROTECTED",
        "PRIVACY",
        "COMPLIANCE",
        "REDACTION",
        "REDACTIONS",
        // Document structure words
        "GUIDE",
        "SUMMARY",
        "TABLE",
        "FORMAT",
        "EXAMPLE",
        "DEFINITION",
        "DOCUMENTATION",
        "RECORDS",
        "DATA",
        "MEDIA",
        // Clinical structure words
        "SIGNS",
        "RESULTS",
        "PRESSURE",
        "RATE",
        "SATURATION",
        "REHABILITATION",
        "EDUCATION",
        "PLANNING",
        "SUPPORT",
        // Geographic/organizational
        "GEOGRAPHIC",
        "BIOMETRIC",
        "VEHICLE",
        "DEVICE",
        "SERIAL",
        "CERTIFICATE",
        "BENEFICIARY",
        "PHOTOGRAPHIC",
        "ADMINISTRATIVE",
        "PROCESSING",
        "CREDENTIALS",
        "DIRECTORY",
    ]);
    /**
     * Check if a text span is a whitelisted field label
     *
     * @param text - Text to check
     * @returns true if text should NOT be redacted (is a field label)
     */
    static isFieldLabel(text) {
        if (!text || text.length < 2)
            return false;
        const normalized = text.toLowerCase().trim();
        // Exact match in whitelist
        if (this.WHITELIST_TERMS.has(normalized)) {
            return true;
        }
        // Exact phrase match
        if (this.EXACT_PHRASE_EXCLUSIONS.has(normalized)) {
            return true;
        }
        // Check if text contains a whitelisted drug/medical term as a word
        // This handles cases like "Penicillin, Sulfa" where individual drugs are whitelisted
        const words = normalized
            .split(/[\s,]+/)
            .map((w) => w.trim())
            .filter((w) => w.length > 0);
        for (const word of words) {
            if (this.EXACT_PHRASE_EXCLUSIONS.has(word)) {
                return true;
            }
        }
        // Check for common field label patterns
        const fieldLabelPatterns = [
            /^(.*\s)?(number|name|address|phone|email|date|time|id)$/i,
            /^date of\s/i,
            /^time of\s/i,
            /^\w+\s(license|number|address|phone|email|name)$/i,
        ];
        return fieldLabelPatterns.some((pattern) => pattern.test(normalized));
    }
    /**
     * Check if text contains document structure words
     * These indicate the text is structural, not PHI
     *
     * IMPORTANT: Uses word boundary matching to avoid false positives.
     * For example, "PHILIP" should NOT match "PHI" - only whole word "PHI" should match.
     */
    static containsStructureWord(text) {
        const upper = text.toUpperCase();
        // Split into words and check for exact word matches
        const textWords = upper.split(/[\s,.\-:;]+/).filter((w) => w.length > 0);
        for (const textWord of textWords) {
            if (this.STRUCTURE_WORDS.has(textWord)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if text is likely a generic medical term (not PHI)
     */
    static isGenericMedicalTerm(text) {
        const normalized = text.toLowerCase().trim();
        const genericTerms = [
            "patient",
            "admission",
            "discharge",
            "surgery",
            "visit",
            "diagnosis",
            "medication",
            "treatment",
            "procedure",
            "age",
            "sex",
            "weight",
            "height",
            "blood pressure",
            "temperature",
            "pulse",
            "respiration",
        ];
        return genericTerms.includes(normalized);
    }
    /**
     * Check if text is a common clinical abbreviation
     */
    static isClinicalAbbreviation(text) {
        const normalized = text.toUpperCase().trim();
        const abbreviations = [
            "AM",
            "PM",
            "HR",
            "BP",
            "TEMP",
            "RR",
            "O2",
            "IV",
            "PO",
            "PRN",
            "BID",
            "TID",
            "QID",
            "MG",
            "ML",
            "MCG",
            "UNIT",
            "ICD",
            "MRI",
            "CT",
            "EKG",
            "ECG",
            "DOB",
            "MRN",
            "SSN",
            "USA",
            "FL",
            "CA",
            "NY",
            "TX",
        ];
        return abbreviations.includes(normalized);
    }
    /**
     * Check if text is an exact phrase that should be excluded
     */
    static isExactPhraseExclusion(text) {
        const normalized = text.toLowerCase().trim();
        return this.EXACT_PHRASE_EXCLUSIONS.has(normalized);
    }
    /**
     * Master check - should this text be excluded from redaction?
     * Combines all checks into a single method
     */
    static shouldExclude(text) {
        // Don't exclude actual street addresses (starting with a number)
        // This prevents "789 Pine Street" from being excluded just because it contains "STREET"
        if (this.looksLikeStreetAddress(text)) {
            return false;
        }
        return (this.isFieldLabel(text) ||
            this.containsStructureWord(text) ||
            this.isClinicalAbbreviation(text) ||
            this.isExactPhraseExclusion(text));
    }
    /**
     * Check if text looks like a street address (starts with house number)
     * Examples: "789 Pine Street", "123 Main Ave"
     */
    static looksLikeStreetAddress(text) {
        // Street address pattern: starts with digits, then words, then street suffix
        const streetSuffixes = [
            "street",
            "st",
            "avenue",
            "ave",
            "road",
            "rd",
            "drive",
            "dr",
            "boulevard",
            "blvd",
            "lane",
            "ln",
            "way",
            "court",
            "ct",
            "circle",
            "cir",
            "place",
            "pl",
            "terrace",
            "ter",
            "parkway",
            "pkwy",
            "highway",
            "hwy",
            "trail",
            "path",
            "alley",
            "plaza",
        ];
        const suffixPattern = streetSuffixes.join("|");
        const addressPattern = new RegExp(`^\\d+\\s+[A-Za-z]+.*\\b(?:${suffixPattern})\\b`, "i");
        return addressPattern.test(text.trim());
    }
    /**
     * Filter types that should NEVER be filtered by structure word checks.
     * These are pattern-matched identifiers with specific formats that should
     * not be excluded just because they contain a structure word in the value.
     */
    static PATTERN_MATCHED_TYPES = new Set([
        "EMAIL",
        "URL",
        "PHONE",
        "FAX",
        "SSN",
        "IP",
        "MRN",
        "ACCOUNT",
        "CREDIT_CARD",
        "CREDITCARD",
        "NPI",
        "LICENSE",
        "PASSPORT",
        "DEVICE",
        "VEHICLE",
        "HEALTH_PLAN",
        "HEALTHPLAN",
        "UNIQUE_ID",
        "MAC_ADDRESS",
        "IBAN",
        "BITCOIN",
    ]);
    /**
     * Filter out whitelisted terms from spans
     *
     * @param spans - Detected spans
     * @returns Filtered spans with field labels removed
     */
    static filterSpans(spans) {
        return spans.filter((span) => {
            // Pattern-matched identifier types should NOT be filtered by structure word checks
            // They have specific validated patterns (email, URL, phone, etc.)
            // Example: john.doe@hospital-system.org contains "HOSPITAL" but is still an EMAIL
            if (span.filterType && this.PATTERN_MATCHED_TYPES.has(span.filterType)) {
                return true; // Keep all pattern-matched identifiers
            }
            // For NAME and other types, apply the full exclusion logic
            return !this.shouldExclude(span.text);
        });
    }
}
exports.FieldLabelWhitelist = FieldLabelWhitelist;
//# sourceMappingURL=FieldLabelWhitelist.js.map