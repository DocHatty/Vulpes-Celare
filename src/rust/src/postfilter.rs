use napi_derive::napi;
use once_cell::sync::Lazy;
use std::collections::HashSet;

#[napi(object)]
pub struct PostFilterSpan {
    pub filter_type: String,
    pub text: String,
    pub confidence: f64,
}

#[napi(object)]
pub struct PostFilterDecision {
    pub keep: bool,
    pub removed_by: Option<String>,
}

fn utf16_len(s: &str) -> usize {
    s.encode_utf16().count()
}

static SECTION_HEADINGS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    HashSet::from([
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
    ])
});

static SINGLE_WORD_HEADINGS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    HashSet::from([
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
    ])
});

static STRUCTURE_WORDS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    HashSet::from([
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
    ])
});

static INVALID_STARTS: &[&str] = &[
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

static INVALID_ENDINGS: &[&str] = &[
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

static MEDICAL_PHRASES: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    HashSet::from([
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
        "allergic rhinitis",
        "current medications",
        "complete blood count",
        "comprehensive metabolic panel",
        "comprehensive metabolic",
        "blood count",
        "partial thromboplastin",
        "prothrombin time",
        "hemoglobin a1c",
        "continue lisinopril",
        "add beta",
        "increase aspirin",
        "add atorvastatin",
        "add metoprolol",
        "increase metformin",
        "continue metformin",
        "medtronic viva",
        "medtronic icd",
        "zimmer prosthesis",
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
        "paternal grandmother",
        "paternal grandfather",
        "maternal grandmother",
        "maternal grandfather",
        "consulting cardiologist",
        "admitting physician",
    ])
});

static MEDICAL_SUFFIXES: &[&str] = &[
    "Disorder",
    "Mellitus",
    "Disease",
    "Syndrome",
    "Infection",
    "Condition",
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

static GEO_TERMS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    HashSet::from([
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
    ])
});

static FIELD_LABELS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    HashSet::from([
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
    ])
});

fn is_all_caps_letters_whitespace(s: &str) -> bool {
    if s.is_empty() {
        return false;
    }
    s.chars()
        .all(|c| c.is_ascii_uppercase() || c.is_whitespace())
}

fn label_like(after_newline_trimmed: &str) -> bool {
    let lower = after_newline_trimmed.to_ascii_lowercase();
    const LABELS: &[&str] = &[
        "dx", "dob", "mrn", "age", "phone", "fax", "email", "address", "street", "zip", "zipcode",
        "npi", "dea", "ssn", "patient", "provider",
    ];

    for &label in LABELS {
        if lower.starts_with(label) {
            let next = lower.as_bytes().get(label.len()).copied();
            let boundary_ok = match next {
                None => true,
                Some(b) => {
                    let c = b as char;
                    !(c.is_ascii_alphanumeric() || c == '_')
                }
            };
            if boundary_ok {
                return true;
            }
        }
    }
    false
}

fn should_keep(span: &PostFilterSpan) -> (bool, Option<&'static str>) {
    let filter_type = span.filter_type.as_str();
    let text = span.text.as_str();

    // Device/phone false positives
    if filter_type == "DEVICE" || filter_type == "PHONE" {
        let lower = text.to_ascii_lowercase();
        if lower.contains("call button") || lower.contains("room:") || lower.contains("bed:") {
            return (false, Some("DevicePhoneFalsePositive"));
        }
    }

    if filter_type != "NAME" {
        return (true, None);
    }

    // ALL CAPS section headings
    if is_all_caps_letters_whitespace(text) {
        let trimmed = text.trim();
        if SECTION_HEADINGS.contains(trimmed) {
            return (false, Some("SectionHeading"));
        }

        let words: Vec<&str> = trimmed.split_whitespace().collect();
        if words.len() == 1 && SINGLE_WORD_HEADINGS.contains(words[0]) {
            return (false, Some("SectionHeading"));
        }
    }

    // Structure words
    {
        let mut upper = String::with_capacity(text.len());
        for ch in text.chars() {
            upper.push(ch.to_ascii_uppercase());
        }
        for word in upper.split_whitespace() {
            if STRUCTURE_WORDS.contains(word) {
                return (false, Some("StructureWord"));
            }
        }
    }

    // Short names
    if utf16_len(text) < 5 && !text.contains(',') && span.confidence < 0.9 {
        return (false, Some("ShortName"));
    }

    // Invalid prefixes (case-sensitive)
    for &start in INVALID_STARTS {
        if text.starts_with(start) {
            return (false, Some("InvalidPrefix"));
        }
    }

    // Invalid suffix endings (case-insensitive)
    {
        let lower = text.to_lowercase();
        for &ending in INVALID_ENDINGS {
            if lower.ends_with(ending) {
                return (false, Some("InvalidSuffix"));
            }
        }
    }

    // Name line breaks
    if text.contains('\n') || text.contains('\r') {
        let normalized = text.replace("\r\n", "\n").replace('\r', "\n");
        let parts: Vec<&str> = normalized.split('\n').collect();
        if parts.len() >= 2 {
            let after = parts[1..].join(" ");
            let after_trimmed = after.trim();

            if label_like(after_trimmed) {
                return (false, Some("NameLineBreak"));
            }

            let after_len = utf16_len(after_trimmed);
            if after_len > 0 && after_len <= 24 && after_trimmed.contains(':') {
                return (false, Some("NameLineBreak"));
            }
        }
    }

    // Medical phrases (case-insensitive set membership)
    if MEDICAL_PHRASES.contains(text.to_ascii_lowercase().as_str()) {
        return (false, Some("MedicalPhrase"));
    }

    // Medical suffixes (case-sensitive)
    for &suffix in MEDICAL_SUFFIXES {
        if text.ends_with(suffix) {
            return (false, Some("MedicalSuffix"));
        }
    }

    // Geographic terms (case-insensitive words)
    {
        let lower = text.to_ascii_lowercase();
        for word in lower.split_whitespace() {
            if GEO_TERMS.contains(word) {
                return (false, Some("GeographicTerm"));
            }
        }
    }

    // Field labels (case-insensitive set membership)
    if FIELD_LABELS.contains(text.to_ascii_lowercase().as_str()) {
        return (false, Some("FieldLabel"));
    }

    (true, None)
}

#[napi]
pub fn postfilter_decisions(spans: Vec<PostFilterSpan>) -> Vec<PostFilterDecision> {
    spans
        .into_iter()
        .map(|s| {
            let (keep, removed_by) = should_keep(&s);
            PostFilterDecision {
                keep,
                removed_by: removed_by.map(|v| v.to_string()),
            }
        })
        .collect()
}
