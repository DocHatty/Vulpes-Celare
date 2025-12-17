"use strict";
/**
 * NameFilterConstants - Shared Constants for Name Filters
 *
 * Consolidates common whitelists and term sets used across multiple name filters
 * to ensure consistency and reduce code duplication.
 *
 * @module filters/constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDICAL_EPONYMS = exports.STRUCTURE_WORDS = exports.COMPOUND_PHRASE_WHITELIST = exports.EXCLUDED_PHRASES = exports.EXCLUDED_ACRONYMS = exports.GEOGRAPHIC_TERMS = exports.NON_NAME_ENDINGS = exports.DOCUMENT_TERMS = exports.NAME_WHITELIST = exports.NAME_SUFFIXES = exports.NAME_PREFIXES = void 0;
exports.isCompoundPhraseStart = isCompoundPhraseStart;
exports.isPartOfCompoundPhrase = isPartOfCompoundPhrase;
exports.isMedicalEponym = isMedicalEponym;
exports.isWhitelisted = isWhitelisted;
exports.isExcludedAllCaps = isExcludedAllCaps;
/**
 * Common name prefixes/titles
 * IMPORTANT: These are used to identify PROVIDER names that should NOT be redacted
 */
exports.NAME_PREFIXES = [
    "Mr",
    "Mrs",
    "Ms",
    "Miss",
    "Dr",
    "Prof",
    "Rev",
    "Hon",
    "Capt",
    "Lt",
    "Sgt",
    "Col",
    "Gen",
    // Additional honorifics (were missing - caused provider name redaction)
    "Dame",
    "Sir",
    "Lord",
    "Lady",
    "Baron",
    "Count",
    "Duke",
    "Earl",
    "Msgr", // Monsignor
    "Fr", // Father
    "Sr", // Sister (religious)
    "Br", // Brother (religious)
    "Rabbi",
    "Imam",
    "Pastor",
    "Bishop",
    "Archbishop",
    "Cardinal",
    "Deacon",
    "Elder",
    "Atty", // Attorney
    "Judge",
    "Justice",
    "Cmdr", // Commander
    "Adm", // Admiral
    "Maj", // Major
    "Cpl", // Corporal
    "Pvt", // Private
    "Chief",
    "Officer",
    "Det", // Detective
    "Insp", // Inspector
    "Supt", // Superintendent
    "Commissioner",
];
/**
 * Common name suffixes and professional credentials
 * IMPORTANT: These help identify PROVIDER names that should NOT be redacted
 */
exports.NAME_SUFFIXES = [
    // Generational suffixes
    "Jr",
    "Sr",
    "II",
    "III",
    "IV",
    "V",
    // Doctoral degrees
    "MD",
    "DO", // Doctor of Osteopathic Medicine (was missing!)
    "PhD",
    "DDS",
    "DMD", // Doctor of Dental Medicine
    "DPM", // Doctor of Podiatric Medicine
    "DVM", // Doctor of Veterinary Medicine
    "OD", // Doctor of Optometry (was missing!)
    "PsyD", // Doctor of Psychology
    "PharmD", // Doctor of Pharmacy
    "EdD", // Doctor of Education
    "DrPH", // Doctor of Public Health
    "DC", // Doctor of Chiropractic
    "ND", // Doctor of Naturopathy
    "JD", // Juris Doctor
    // Nursing credentials
    "RN",
    "NP",
    "BSN", // Bachelor of Science in Nursing (was missing!)
    "MSN", // Master of Science in Nursing
    "DNP", // Doctor of Nursing Practice
    "APRN", // Advanced Practice Registered Nurse
    "CRNA", // Certified Registered Nurse Anesthetist (was missing!)
    "CNS", // Clinical Nurse Specialist
    "CNM", // Certified Nurse Midwife
    "LPN", // Licensed Practical Nurse
    "LVN", // Licensed Vocational Nurse
    "CNA", // Certified Nursing Assistant
    "ACNP-BC", // Acute Care Nurse Practitioner - Board Certified (was missing!)
    "FNP-BC", // Family Nurse Practitioner - Board Certified
    "ANP-BC", // Adult Nurse Practitioner - Board Certified
    "PNP-BC", // Pediatric Nurse Practitioner - Board Certified
    "PMHNP-BC", // Psychiatric-Mental Health Nurse Practitioner
    // Physician Assistant
    "PA",
    "PA-C", // Physician Assistant - Certified
    // Other medical professionals
    "PT", // Physical Therapist
    "DPT", // Doctor of Physical Therapy
    "OT", // Occupational Therapist
    "OTR", // Occupational Therapist Registered
    "SLP", // Speech-Language Pathologist
    "CCC-SLP", // Certificate of Clinical Competence in SLP
    "RT", // Respiratory Therapist
    "RRT", // Registered Respiratory Therapist
    "RD", // Registered Dietitian
    "RDN", // Registered Dietitian Nutritionist
    "LCSW", // Licensed Clinical Social Worker
    "LMFT", // Licensed Marriage and Family Therapist
    "LPC", // Licensed Professional Counselor
    "LCPC", // Licensed Clinical Professional Counselor
    // Medical specialties and board certifications
    "FACS", // Fellow of the American College of Surgeons
    "FACP", // Fellow of the American College of Physicians
    "FACC", // Fellow of the American College of Cardiology
    "FACOG", // Fellow of American College of Obstetricians and Gynecologists
    "FASN", // Fellow of the American Society of Nephrology (was missing!)
    "FAAN", // Fellow of the American Academy of Nursing
    "FAAP", // Fellow of the American Academy of Pediatrics
    "FACHE", // Fellow of the American College of Healthcare Executives
    // Other credentials
    "Esq",
    "CPA",
    "MBA",
    "MPH", // Master of Public Health
    "MHA", // Master of Health Administration
    "MHSA", // Master of Health Services Administration
    "MS",
    "MA",
    "BA",
    "BS",
    "BBA",
];
/**
 * Whitelist of terms that should NOT be redacted as names.
 * This comprehensive list covers document metadata, field labels,
 * section headings, medical/clinical terms, and HIPAA document structure.
 */
exports.NAME_WHITELIST = new Set([
    // Document metadata
    "Protected Health",
    "Expanded Simulation",
    "New Examples",
    "Fresh Sample",
    "Sample Entries",
    "Sample Written",
    "Full name",
    "Full face",
    "Full photo",
    // Field labels
    "Patient Name",
    "Patient Information",
    "Referral Source",
    "Data Source",
    "Emergency Contact",
    "Primary Care",
    "Attending Physician",
    "Insurance Company",
    "Policy Holder",
    "Home Phone",
    "Cell Phone",
    "Work Phone",
    "Fax Number",
    "Portal Login",
    "Portal Username",
    // Section headings
    "Sensitive Information",
    "Reference List",
    "Home Address",
    "Phone Number",
    "Email Address",
    "Lab Results",
    "Test Values",
    "Medication Information",
    "Provider Name",
    "Hospital Name",
    "Account Number",
    "Biometric Data",
    "Genetic Information",
    "Pregnancy Status",
    "Sexual Orientation",
    "Gender Identity",
    "Mental Health",
    "Privacy Rule",
    "Contact Information",
    "Drug Allergies",
    "Known Drug",
    // Medical/Clinical terms
    "Social Security",
    "Medical record",
    "Health plan",
    "Account numbers",
    "License numbers",
    "Billing Acct",
    "Next of Kin",
    "License Plate",
    "Vehicle Identifier",
    "Device Identifier",
    "Serial Number",
    "Biometric Identifier",
    "Employee badge",
    "Cardiology Fax",
    "Emergency Department",
    "Intensive Care",
    // Insurance companies (should not be redacted as names)
    "Blue Cross",
    "Blue Shield",
    "Blue Cross Blue Shield",
    "BCBS",
    "Aetna",
    "Cigna",
    "United Healthcare",
    "UnitedHealthcare",
    "United Health",
    "Humana",
    "Kaiser",
    "Kaiser Permanente",
    "Anthem",
    "Molina",
    "Centene",
    "Medicare",
    "Medicaid",
    "Tricare",
    "Health Net",
    "WellCare",
    "Ambetter",
    "Oscar Health",
    "Bright Health",
    "Clover Health",
    // Medical procedures and tests (not names)
    "colonoscopy",
    "mammogram",
    "mammography",
    "endoscopy",
    "biopsy",
    "ultrasound",
    "echocardiogram",
    "angiogram",
    "arthroplasty",
    "laparoscopy",
    "bronchoscopy",
    "cystoscopy",
    // Pathology/radiology terms
    "microcalcifications",
    "calcifications",
    "periapical",
    "radiolucency",
    "radiopacity",
    "adenopathy",
    "lymphadenopathy",
    "cardiomegaly",
    "hepatomegaly",
    "splenomegaly",
    // Medications (common ones that look like names)
    "Sumatriptan",
    "Hydroxyzine",
    "Gabapentin",
    "Tramadol",
    "Trazodone",
    "Buspirone",
    "Duloxetine",
    "Venlafaxine",
    "Escitalopram",
    "Citalopram",
    "Fluoxetine",
    "Paroxetine",
    "Mirtazapine",
    "Bupropion",
    "Lamotrigine",
    "Topiramate",
    "Pregabalin",
    "Cyclobenzaprine",
    "Meloxicam",
    "Naproxen",
    "Celecoxib",
    "Diclofenac",
    // Medical conditions
    "hypothyroidism",
    "hyperthyroidism",
    "hypertension",
    "hypotension",
    "hyperlipidemia",
    "hypoglycemia",
    "hyperglycemia",
    "osteoporosis",
    "osteoarthritis",
    "fibromyalgia",
    "neuropathy",
    "cardiomyopathy",
    "arrhythmia",
    "tachycardia",
    "bradycardia",
    // Cancer types (prevent false positives like "Breast Cancer" being detected as name)
    "Breast Cancer",
    "Lung Cancer",
    "Prostate Cancer",
    "Colon Cancer",
    "Skin Cancer",
    "Pancreatic Cancer",
    "Ovarian Cancer",
    "Liver Cancer",
    "Kidney Cancer",
    "Bladder Cancer",
    "Thyroid Cancer",
    "Leukemia",
    "Lymphoma",
    "Melanoma",
    "Sarcoma",
    "Carcinoma",
    // Other medical terms that look like names
    "Herniated Disc",
    "Hernia Repair",
    "Pulmonary Fibrosis",
    "Pacemaker Insertion",
    "Pacemaker Replacement",
    "Cardiac Pacemaker",
    "Peptic Ulcer",
    "Gastric Ulcer",
    "Duodenal Ulcer",
    "Valve Replacement",
    "Heart Valve",
    "Aortic Valve",
    "Mitral Valve",
    // Obstetric terms
    "cephalic",
    "breech",
    "fundal",
    "gravida",
    "primigravida",
    "multigravida",
    "nulliparous",
    "multiparous",
    // Clinical assessment scales
    "Morse Fall Score",
    "Morse Fall",
    "Morse Score",
    "Braden Score",
    "Braden Scale",
    "Norton Scale",
    "Norton Score",
    "Waterlow Score",
    "Waterlow Scale",
    "APACHE Score",
    "SOFA Score",
    "NEWS Score",
    "MEWS Score",
    "Fall Risk",
    "Pressure Ulcer",
    "Skin Assessment",
    // Medical/Technical terms
    "Contrast Enhanced",
    "Magnetic Resonance",
    "Computed Tomography",
    "Informed Consent",
    "Patient Care",
    "Medical History",
    "Physical Examination",
    "Differential Diagnosis",
    "Clinical Findings",
    "Treatment Plan",
    "Follow Up",
    "Blood Pressure",
    "Heart Rate",
    "Respiratory Rate",
    "Body Mass",
    "Chief Complaint",
    "Present Illness",
    "Past Medical",
    "Family History",
    "Social History",
    "Review Systems",
    "General Appearance",
    "Vital Signs",
    "Unstable Angina",
    "Acute Coronary",
    "Oxygen Support",
    "Discharge Planning",
    "Nursing Education",
    "Natriuretic Peptide",
    "Complete Blood",
    "Metabolic Panel",
    "Imaging Studies",
    "Lab Work",
    "Acute Management",
    "Telemetry Unit",
    "Nitroglycerin Drip",
    "Add Beta",
    "Add Atorvastatin",
    "Increase Aspirin",
    "Continue Lisinopril",
    "Cranial Nerves",
    "Document Created",
    "Last Updated",
    "Patient Portal",
    "Signature Location",
    "Admitting Physician",
    "Nurse Manager",
    "Last Visit",
    "Next Scheduled",
    "Health Journal",
    "Patient Education",
    "Insurance Portal",
    "Home Network",
    "Patient Vehicle",
    "Spouse Vehicle",
    "Vehicle License",
    "Pacemaker Model",
    "Pacemaker Serial",
    "Physical Therapy",
    "Professional License",
    "Retinal Pattern",
    "Patient Photo",
    "Security Camera",
    "Building Access",
    "Parking Lot",
    "Waiting Room",
    "Surgical Video",
    "Ultrasound Video",
    "Telehealth Session",
    "Living Situation",
    "Tobacco History",
    "Alcohol Use",
    "Drug History",
    "Stress Level",
    "Senior Partner",
    "Spouse Name",
    "Spouse Phone",
    "Spouse Email",
    "Sister Name",
    "Sister Contact",
    "Mother Name",
    "Father Name",
    "Employer Name",
    "Employer Contact",
    "Referring Physician",
    "Personal Website",
    "tried for relief",
    // Common descriptive terms that look like names
    "Distinct Boston",
    "Athletic Build",
    "North Boulder",
    "Downtown Boulder",
    // All caps section headings
    "PATIENT CLINICAL NOTE",
    "PATIENT INFORMATION",
    "VISIT INFORMATION",
    "CHIEF COMPLAINT",
    "HISTORY OF PRESENT ILLNESS",
    "PAST MEDICAL HISTORY",
    "PAST SURGICAL HISTORY",
    "FAMILY HISTORY",
    "SOCIAL HISTORY",
    "REVIEW OF SYSTEMS",
    "PHYSICAL EXAMINATION",
    "ASSESSMENT",
    "PLAN",
    "DIAGNOSTIC STUDIES ORDERED",
    "DISPOSITION",
    "PROVIDER INFORMATION",
    "BILLING INFORMATION",
    "ALLERGIES",
    "MEDICATIONS",
    // HIPAA document structure terms
    "Safe Harbor",
    "Geographic Data",
    "Structured Medical",
    "Multiple Formatting",
    "Comprehensive Synthetic",
    "REDACTION GUIDE",
    "HIPAA PHI",
    "TELEPHONE NUMBERS",
    "EMAIL ADDRESSES",
    "SOCIAL SECURITY NUMBER",
    "MEDICAL RECORD NUMBER",
    "HEALTH PLAN BENEFICIARY",
    "ACCOUNT NUMBERS",
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
    "UNIQUE IDENTIFYING",
    "OTHER UNIQUE",
    "ANY OTHER",
    // Clinical documentation terms
    "Diagnostic Tests",
    "Clinical Information",
    "Cardiac Rehabilitation",
    "Oxygen Saturation",
    // Additional document structure
    "Format Example",
    "Clinical Note",
    "Clinical Narrative",
    "Administrative Records",
    "Insurance Card",
    "Contact Directory",
    "Correspondence Record",
    "Billing Records",
    "Payment Processing",
    "Provider Credentials",
    "Documentation Records",
    "Implant Records",
    "Device Documentation",
    "Online Presence",
    "Communication Records",
    "System Access",
    "Server Logs",
    "Security Audits",
    "Biometric Authentication",
    "Identification Records",
    "Visual Documentation",
    "Clinical Media",
    "Administrative Media",
]);
/**
 * Document/section terms that should NOT be treated as names
 * (first words that indicate non-name phrases)
 */
exports.DOCUMENT_TERMS = new Set([
    "Sample",
    "Written",
    "History",
    "Physical",
    "Examination",
    "Information",
    "Reference",
    "Data",
    "Status",
    "Results",
    "Values",
    "Service",
    "Contact",
    "Comments",
    "Surgical",
    "Medical",
    "Patient",
    "Document",
    "Record",
    "Report",
    "Clinical",
    "Complete",
    "Current",
    "Primary",
    "Secondary",
    "Emergency",
    "Acute",
    "Chronic",
    "General",
    "Initial",
    // Insurance-related terms (prevent "Blue Shield" from being a name)
    "Blue",
    "Shield",
    "Cross",
    "Insurance",
    "Health",
    "Care",
    "Plan",
    "Coverage",
    // Common adjectives that look like first names
    "Distinct",
    "Athletic",
    "Healthy",
    "Normal",
    "Stable",
    "Active",
    "Remote",
    "Local",
    "Regional",
    "National",
    "Previous",
    "Existing",
    "Available",
    "Required",
    "Necessary",
    // Field label starters
    "Home",
    "Work",
    "Cell",
    "Mobile",
    "Fax",
    "Email",
    "Spouse",
    "Sister",
    "Brother",
    "Mother",
    "Father",
    "Employer",
    "Insurance",
    "Portal",
    "Account",
    "License",
    // Medical terms that could look like names
    "Unstable",
    "Allergic",
    "Diagnostic",
    "Nursing",
    "Cardiac",
    "Oxygen",
    "Blood",
    "Heart",
    "Vital",
    "Cranial",
    // Document structure words causing false positives
    "Safe",
    "Harbor",
    "Protected",
    "Expanded",
    "Multiple",
    "Formatting",
    "Comprehensive",
    "Synthetic",
    "Geographic",
    "Structured",
    "Telephone",
    "Numbers",
    "Certificate",
    "Beneficiary",
    "Photographic",
    "Definition",
    "Format",
    "Example",
    "Administrative",
    "Processing",
    "Contextual",
    "Unique",
    "Other",
    "Usage",
    "Guide",
    "Summary",
    "Table",
    "Visual",
    // HIPAA-specific terms
    "Identifiers",
    "Redaction",
    "Redact",
    "Excluded",
    "Included",
    "Privacy",
    "Compliance",
    "Covered",
    "Entity",
    "Business",
    "Associate",
    // More clinical section starters
    "Assessment",
    "Impressions",
    "Recommendations",
    "Conclusions",
    "Laboratory",
    "Imaging",
    "Specialist",
    "Telehealth",
    "Session",
    "Biometric",
    "Vehicle",
    "Device",
    "Serial",
    "Implant",
    "Pacemaker",
    // Additional structure words
    "Section",
    "Category",
    "Type",
    "Level",
    "Grade",
    "Class",
    "Stage",
    "Full",
    "Partial",
    "Total",
    "Direct",
    "Indirect",
    "Related",
    "Web",
    "Internet",
    "Online",
    "Digital",
    "Electronic",
    "Virtual",
    // Common report terms
    "Findings",
    "Impression",
    "Technique",
    "Comparison",
    "Contrast",
    "Indication",
    "Protocol",
    "Procedure",
    "Method",
    "Approach",
    // Additional document structure terms
    "Standard",
    "Official",
    "Optional",
    "Mandatory",
    "Minimum",
    "Maximum",
    "Average",
    "Typical",
    "Specific",
    "Detailed",
    "Brief",
    "Quick",
    "Immediate",
    "Delayed",
    "Routine",
    "Regular",
    "Annual",
    "Monthly",
    "Weekly",
    "Daily",
    "Hourly",
    // Healthcare settings
    "Inpatient",
    "Outpatient",
    "Ambulatory",
    "Residential",
    "Hospice",
    "Palliative",
    "Preventive",
    "Screening",
    "Therapeutic",
    // Action/recommendation words (not name starters)
    "Consider",
    "Start",
    "Stop",
    "Continue",
    "Increase",
    "Decrease",
    "Discontinue",
    "Refer",
    "Order",
    "Schedule",
    "Obtain",
    "Monitor",
    "Avoid",
    "Recommend",
    // Form/document types
    "Consent",
    "Authorization",
    "Release",
    "Waiver",
    "Notice",
    "Acknowledgment",
    "Agreement",
    "Statement",
    "Affidavit",
    "Attestation",
    // Insurance/billing terms
    "Coverage",
    "Eligibility",
    "Verification",
    "Preauthorization",
    "Predetermination",
    "Coordination",
    "Benefits",
    "Deductible",
    "Copayment",
    "Coinsurance",
    // Technical terms
    "System",
    "Server",
    "Database",
    "Interface",
    "Integration",
    "Configuration",
    "Implementation",
    "Deployment",
    "Maintenance",
    "Support",
]);
/**
 * Common non-name endings (last words that indicate non-name phrases)
 */
exports.NON_NAME_ENDINGS = new Set([
    "Phone",
    "Address",
    "Email",
    "Number",
    "Contact",
    "Portal",
    "History",
    "Status",
    "Results",
    "Plan",
    "Notes",
    "Unit",
    "Rate",
    "Pressure",
    "Signs",
    "Level",
    "Build",
    "Network",
    "Angina",
    "Support",
    "Education",
    "Planning",
    "Studies",
    "Management",
    "Drip",
    "Vehicle",
    "Model",
    "Location",
    "Situation",
    "Use",
    "Partner",
    "Nerves",
    "Video",
    // Additional non-name endings
    "Data",
    "Information",
    "Guide",
    "Harbor",
    "Identifiers",
    "Characteristics",
    "Numbers",
    "Codes",
    "Media",
    "Images",
    "Videos",
    "Photographs",
    "Documentation",
    "Records",
    "Files",
    "Examination",
    "Assessment",
    "Evaluation",
    "Analysis",
    "Review",
    "Summary",
    "Report",
    "Note",
    "Form",
    "Table",
    "List",
    "Section",
    "Category",
    "Type",
    "Format",
    "Example",
    "Definition",
    // More comprehensive non-name endings
    "Service",
    "Services",
    "System",
    "Systems",
    "Program",
    "Programs",
    "Center",
    "Centers",
    "Department",
    "Division",
    "Group",
    "Team",
    "Committee",
    "Board",
    "Council",
    "Agency",
    "Office",
    "Bureau",
    "Administration",
    "Organization",
    "Association",
    "Foundation",
    "Institute",
    "Institution",
    "Corporation",
    "Company",
    "Practice",
    "Clinic",
    "Hospital",
    "Facility",
    "Laboratory",
    "Pharmacy",
    "Radiology",
    "Pathology",
    "Oncology",
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "Pediatrics",
    "Psychiatry",
    "Surgery",
    "Medicine",
    "Therapy",
    "Rehabilitation",
    "Care",
    "Treatment",
    "Diagnosis",
    "Prognosis",
    "Condition",
    "Disease",
    "Disorder",
    "Syndrome",
    "Infection",
    "Injury",
    "Operation",
    "Intervention",
    "Medication",
    "Prescription",
    "Dosage",
    "Frequency",
    "Duration",
    "Route",
    "Technique",
    "Standard",
    "Guideline",
    "Policy",
    "Process",
    "Workflow",
]);
/**
 * Geographic terms that shouldn't be treated as names
 */
exports.GEOGRAPHIC_TERMS = new Set([
    "Boulder",
    "Boston",
    "Denver",
    "Colorado",
    "Texas",
    "California",
    "Regional",
    "Downtown",
    "North",
    "South",
    "East",
    "West",
    "Central",
    "Northern",
    "Southern",
    "Eastern",
    "Western",
    "Northeastern",
    "Northwestern",
    "Southeastern",
    "Southwestern",
    "Metropolitan",
    "Suburban",
    "Rural",
    "Urban",
    "County",
    "State",
    "Federal",
    "National",
    "International",
    "Global",
    "Worldwide",
    "Metro",
]);
/**
 * Single-word acronyms that should be excluded from name detection
 */
exports.EXCLUDED_ACRONYMS = new Set([
    // Medical/Clinical acronyms
    "CT",
    "MRI",
    "PET",
    "EKG",
    "ECG",
    "CBC",
    "BMI",
    "BP",
    "HR",
    "RR",
    "IV",
    "IM",
    "PO",
    "PRN",
    "BID",
    "TID",
    "QID",
    "NPO",
    "DNR",
    "DNI",
    "ER",
    "ED",
    "ICU",
    "CCU",
    "OR",
    "PACU",
    "OB",
    "GYN",
    "ENT",
    "GI",
    "STAT",
    "ASAP",
    "BMP",
    "CMP",
    "LFT",
    "ABG",
    "WBC",
    "RBC",
    "HGB",
    "HCT",
    "PLT",
    "PT",
    "PTT",
    "INR",
    "BUN",
    "GFR",
    "A1C",
    "TSH",
    // Physical exam abbreviations (look like LAST, FIRST format)
    "PERRLA", // Pupils Equal, Round, Reactive to Light and Accommodation
    "EOMI", // Extraocular Movements Intact
    "HEENT", // Head, Eyes, Ears, Nose, Throat
    "NCAT", // Normocephalic, Atraumatic
    "RRR", // Regular Rate and Rhythm
    "CTA", // Clear to Auscultation
    "NTND", // Non-Tender, Non-Distended
    "A&O", // Alert and Oriented
    "WNL", // Within Normal Limits
    "NAD", // No Acute Distress
    "AAO", // Awake, Alert, Oriented
    "AVSS", // Afebrile, Vital Signs Stable
    // Therapy/Mental health acronyms
    "CBT", // Cognitive Behavioral Therapy
    "DBT", // Dialectical Behavior Therapy
    "EMDR", // Eye Movement Desensitization and Reprocessing
    "ACT", // Acceptance and Commitment Therapy
    "IPT", // Interpersonal Therapy
    "MBCT", // Mindfulness-Based Cognitive Therapy
    "PTSD", // Post-Traumatic Stress Disorder
    "ADHD", // Attention Deficit Hyperactivity Disorder
    "OCD", // Obsessive-Compulsive Disorder
    "GAD", // Generalized Anxiety Disorder
    "MDD", // Major Depressive Disorder
    "BPD", // Borderline Personality Disorder
    "PHQ", // Patient Health Questionnaire
    "GAD7", // GAD-7 scale
    // Government/Legal
    "USA",
    "FBI",
    "CIA",
    "NSA",
    "IRS",
    "DMV",
    "SSA",
    "CMS",
    "HHS",
    "HIPAA",
    "PHI",
    "PII",
    "FERPA",
    "ADA",
    "OSHA",
    // Document structure
    "DOB",
    "MRN",
    "SSN",
    "VIN",
    "EIN",
    "TIN",
    // Common words that appear in ALL CAPS
    "ALL",
    "NO",
    "YES",
    "NOT",
    "AND",
    "THE",
    "FOR",
    "WITH",
    "NEW",
    "OLD",
    "PRE",
    "POST",
    "FULL",
    "LAST",
    "NEXT",
    "CURRENT",
    "PREVIOUS",
]);
/**
 * Multi-word phrases that should NOT be redacted as names (ALL CAPS)
 */
exports.EXCLUDED_PHRASES = new Set([
    // Physical exam abbreviation combinations (look like LAST, FIRST format)
    "PERRLA, EOMI",
    "EOMI, PERRLA",
    "NCAT, ATRAUMATIC",
    "RRR, NO MURMURS",
    "CTA, BILATERALLY",
    "NTND, BS PRESENT",
    // Section headers
    "ALL HIPAA",
    "NO REDACTIONS",
    "ALL CAPS",
    "HIPAA PHI",
    "PATIENT IDENTIFICATION",
    "CURRENT ADDRESS",
    "LOCATION INFORMATION",
    "CONTACT INFORMATION",
    "RELATIONSHIP INFORMATION",
    "TIME INFORMATION",
    "ONLINE IDENTIFIERS",
    "TRANSPORTATION INFORMATION",
    "IMPLANT INFORMATION",
    "PROFESSIONAL LICENSES",
    "IDENTIFYING CHARACTERISTICS",
    "VISUAL MEDIA",
    "PRESENT ILLNESS",
    "MEDICAL HISTORY",
    "PAST MEDICAL",
    "FAMILY HISTORY",
    "SOCIAL HISTORY",
    "PHYSICAL EXAMINATION",
    "CLINICAL IMPRESSIONS",
    "TESTS ORDERED",
    "TREATMENT PLAN",
    "PROVIDER INFORMATION",
    "PATIENT ACKNOWLEDGMENTS",
    "DIAGNOSTIC STUDIES",
    // Common field labels in ALL CAPS
    "HOME PHONE",
    "CELL PHONE",
    "WORK PHONE",
    "FAX NUMBER",
    "HOME ADDRESS",
    "WORK ADDRESS",
    "EMAIL ADDRESS",
    "MAILING ADDRESS",
    "BLOOD PRESSURE",
    "HEART RATE",
    "RESPIRATORY RATE",
    "OXYGEN SATURATION",
    "VITAL SIGNS",
    "LAB RESULTS",
    "TEST RESULTS",
    "EMERGENCY CONTACT",
    "NEXT OF KIN",
    "PRIMARY CARE",
    "INSURANCE COMPANY",
    "POLICY NUMBER",
    "MEMBER ID",
    "GROUP NUMBER",
    "MEDICAL RECORD",
    "ACCOUNT NUMBER",
    "CHART STATUS",
    "DEVICE MODEL",
    "SERIAL NUMBER",
    "LICENSE NUMBER",
    // Document types/headers
    "CHIEF COMPLAINT",
    "HISTORY OF",
    "REVIEW OF",
    "ASSESSMENT AND",
    "DISCHARGE PLANNING",
    "ADMISSION DATE",
    "DISCHARGE DATE",
]);
/**
 * Context-aware compound phrases that should NOT be redacted.
 * These are multi-word terms where individual words might look like names,
 * but when appearing together, they form a known non-PHI phrase.
 *
 * Format: Map of "trigger word" -> ["words that follow it to form a safe phrase"]
 * If "Johns" is followed by "Hopkins", don't redact "Johns".
 */
exports.COMPOUND_PHRASE_WHITELIST = new Map([
    // Hospital names - first word looks like a name but isn't PHI when followed by second word
    ["Johns", ["Hopkins"]],
    ["Mount", ["Sinai"]],
    ["Mayo", ["Clinic"]],
    ["Cleveland", ["Clinic"]],
    ["Kaiser", ["Permanente"]],
    ["Cedars", ["Sinai"]],
    ["Cedar", ["Sinai"]],
    // Medical conditions where first word looks like a name/title
    ["Major", ["Depression", "Depressive", "Disorder"]],
    ["General", ["Anxiety", "Anesthesia", "Surgery", "Hospital", "Medicine"]],
    ["Acute", ["Coronary", "Myocardial", "Kidney", "Respiratory", "Care"]],
    ["Chronic", ["Kidney", "Obstructive", "Pain", "Fatigue", "Disease"]],
    ["Regional", ["Medical", "Center", "Hospital", "Anesthesia"]],
    ["Community", ["General", "Hospital", "Health", "Center"]],
    ["Sacred", ["Heart"]],
    ["Holy", ["Cross", "Family", "Spirit"]],
    ["Good", ["Samaritan", "Shepherd"]],
    ["Saint", ["Mary", "Joseph", "Luke", "John", "Francis", "Vincent"]],
    ["St", ["Mary", "Joseph", "Luke", "John", "Francis", "Vincent"]],
    // Common medical phrase starters
    ["Physical", ["Therapy", "Examination", "Exam", "Medicine"]],
    ["Mental", ["Health", "Status", "Illness"]],
    ["Social", ["Security", "History", "Work", "Worker"]],
    ["Family", ["History", "Medicine", "Practice", "Member"]],
    ["Emergency", ["Department", "Room", "Contact", "Medicine"]],
    ["Primary", ["Care", "Physician", "Doctor"]],
    ["Intensive", ["Care"]],
    // Insurance companies
    ["Blue", ["Cross", "Shield"]],
    ["United", ["Healthcare", "Health"]],
]);
/**
 * Check if a word is part of a compound phrase that should not be redacted.
 * Returns true if the word appears to be the START of a whitelisted compound phrase.
 *
 * @param word - The potentially triggering word (e.g., "Johns")
 * @param followingText - The text that follows this word
 * @returns true if this appears to be a compound phrase that should be preserved
 */
function isCompoundPhraseStart(word, followingText) {
    const normalizedWord = word.trim();
    // Check if this word is a trigger for any compound phrase
    const possibleFollowers = exports.COMPOUND_PHRASE_WHITELIST.get(normalizedWord);
    if (!possibleFollowers) {
        // Also check case-insensitive
        for (const [trigger, followers] of exports.COMPOUND_PHRASE_WHITELIST.entries()) {
            if (trigger.toLowerCase() === normalizedWord.toLowerCase()) {
                // Check if any of the expected followers appear at the start of followingText
                const followingNormalized = followingText.trim();
                for (const follower of followers) {
                    // Check if followingText starts with this follower (case-insensitive)
                    const regex = new RegExp(`^\\s*${follower}\\b`, "i");
                    if (regex.test(followingNormalized)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    // Check if any of the expected followers appear at the start of followingText
    const followingNormalized = followingText.trim();
    for (const follower of possibleFollowers) {
        const regex = new RegExp(`^\\s*${follower}\\b`, "i");
        if (regex.test(followingNormalized)) {
            return true;
        }
    }
    return false;
}
/**
 * Check if text is part of a known compound phrase that should not be redacted.
 * Checks both as a phrase start and within the phrase.
 */
function isPartOfCompoundPhrase(text, fullContext) {
    // Get position of text in context
    const textLower = text.toLowerCase();
    const contextLower = fullContext.toLowerCase();
    const pos = contextLower.indexOf(textLower);
    if (pos === -1)
        return false;
    // Get what comes after this text
    const followingText = fullContext.substring(pos + text.length);
    // Check if this is the start of a compound phrase
    const words = text.trim().split(/\s+/);
    if (words.length >= 1) {
        const firstWord = words[0];
        if (isCompoundPhraseStart(firstWord, words.slice(1).join(" ") + " " + followingText)) {
            return true;
        }
    }
    // Also check if the text itself is a complete compound phrase
    for (const [trigger, followers] of exports.COMPOUND_PHRASE_WHITELIST.entries()) {
        for (const follower of followers) {
            const phrase = `${trigger} ${follower}`.toLowerCase();
            if (textLower.includes(phrase) || phrase.includes(textLower)) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Structure words that indicate the text is a header/label, not a name
 */
exports.STRUCTURE_WORDS = new Set([
    "SECTION",
    "INFORMATION",
    "HISTORY",
    "EXAMINATION",
    "RESULTS",
    "STATUS",
    "NUMBER",
    "ADDRESS",
    "PHONE",
    "DATE",
    "TIME",
    "RECORD",
    "CHART",
    "NOTES",
    "PLAN",
    "ASSESSMENT",
    "DIAGNOSIS",
]);
/**
 * Medical eponyms - names used in medical terminology that should NOT be redacted as patient names.
 * These are diseases, criteria, syndromes, procedures, and anatomical terms named after people.
 */
exports.MEDICAL_EPONYMS = new Set([
    // Diagnostic criteria
    "McDonald", // McDonald criteria for MS
    "Duke", // Duke criteria for endocarditis
    "Jones", // Jones criteria for rheumatic fever
    "Rome", // Rome criteria for IBS
    "Manning", // Manning criteria for IBS
    "Ranson", // Ranson criteria for pancreatitis
    "Child", // Child-Pugh score
    "Pugh", // Child-Pugh score
    "Wells", // Wells criteria for DVT/PE
    "Geneva", // Geneva score for PE
    "CHADS", // CHADS2 stroke risk
    "Framingham", // Framingham risk score
    "APACHE", // APACHE score
    "Glasgow", // Glasgow Coma Scale
    "Apgar", // Apgar score
    "Bishop", // Bishop score
    "Mallampati", // Mallampati score
    "Rockall", // Rockall score for GI bleeding
    "Blatchford", // Glasgow-Blatchford score
    // Diseases and syndromes
    "Parkinson", // Parkinson's disease
    "Alzheimer", // Alzheimer's disease
    "Huntington", // Huntington's disease
    "Crohn", // Crohn's disease
    "Addison", // Addison's disease
    "Cushing", // Cushing's syndrome
    "Graves", // Graves' disease
    "Hashimoto", // Hashimoto's thyroiditis
    "Hodgkin", // Hodgkin's lymphoma
    "Kaposi", // Kaposi's sarcoma
    "Marfan", // Marfan syndrome
    "Ehlers", // Ehlers-Danlos syndrome
    "Danlos", // Ehlers-Danlos syndrome
    "Down", // Down syndrome
    "Turner", // Turner syndrome
    "Klinefelter", // Klinefelter syndrome
    "Guillain", // Guillain-Barré syndrome
    "Barré", // Guillain-Barré syndrome
    "Meniere", // Meniere's disease
    "Raynaud", // Raynaud's phenomenon
    "Paget", // Paget's disease
    "Bell", // Bell's palsy
    "Dupuytren", // Dupuytren's contracture
    "Peyronie", // Peyronie's disease
    "Sjögren", // Sjögren's syndrome
    "Sjogren", // Sjögren's syndrome (alternate spelling)
    "Wegener", // Wegener's granulomatosis
    "Behçet", // Behçet's disease
    "Behcet", // Behçet's disease (alternate spelling)
    "Reiter", // Reiter's syndrome
    "Kawasaki", // Kawasaki disease
    "Henoch", // Henoch-Schönlein purpura
    "Schönlein", // Henoch-Schönlein purpura
    "Takayasu", // Takayasu arteritis
    "Goodpasture", // Goodpasture syndrome
    "Charcot", // Charcot-Marie-Tooth disease
    "Marie", // Charcot-Marie-Tooth disease
    "Wilson", // Wilson's disease
    "Whipple", // Whipple's disease
    "Barrett", // Barrett's esophagus
    "Bowen", // Bowen's disease
    "Peutz", // Peutz-Jeghers syndrome
    "Jeghers", // Peutz-Jeghers syndrome
    "Lou", // Lou Gehrig's disease (ALS)
    "Gehrig", // Lou Gehrig's disease
    // Anatomical structures and signs
    "Virchow", // Virchow's node
    "Trousseau", // Trousseau sign
    "Chvostek", // Chvostek sign
    "Brudzinski", // Brudzinski sign
    "Kernig", // Kernig sign
    "Babinski", // Babinski sign
    "Romberg", // Romberg test
    "Rinne", // Rinne test
    "Weber", // Weber test
    "Murphy", // Murphy's sign
    "McBurney", // McBurney's point
    "Rovsing", // Rovsing's sign
    "Cullen", // Cullen's sign
    "Grey", // Grey Turner's sign
    "Turner", // Grey Turner's sign
    "Kussmaul", // Kussmaul breathing
    "Cheyne", // Cheyne-Stokes respiration
    "Stokes", // Cheyne-Stokes respiration
    // Procedures and techniques
    "Heimlich", // Heimlich maneuver
    "Valsalva", // Valsalva maneuver
    "Trendelenburg", // Trendelenburg position
    "Seldinger", // Seldinger technique
    "Kocher", // Kocher incision
    "Pfannenstiel", // Pfannenstiel incision
    "Lichtenstein", // Lichtenstein repair
    "Nissen", // Nissen fundoplication
    "Whipple", // Whipple procedure
    "Billroth", // Billroth I/II
    "Fontan", // Fontan procedure
    "Blalock", // Blalock-Taussig shunt
    "Taussig", // Blalock-Taussig shunt
    "Ross", // Ross procedure
    "Maze", // Maze procedure
    // Classifications and scales
    "Killip", // Killip classification
    "Hunt", // Hunt and Hess scale
    "Hess", // Hunt and Hess scale
    "Fisher", // Fisher grade
    "Breslow", // Breslow depth
    "Clark", // Clark level
    "Fuhrman", // Fuhrman grade
    "Gleason", // Gleason score
    "Binet", // Binet staging
    "Rai", // Rai staging
    "Ann", // Ann Arbor staging
    "Arbor", // Ann Arbor staging
    "Dukes", // Dukes classification
    "Frankel", // Frankel classification
    "Schatzki", // Schatzki ring
    "Mallory", // Mallory-Weiss tear
    "Weiss", // Mallory-Weiss tear
]);
/**
 * Helper function to check if text is a medical eponym
 * Medical eponyms are names used in medical terminology (diseases, criteria, procedures)
 * that should NOT be redacted as patient names.
 */
/**
 * Check if text is a medical eponym being used in a MEDICAL CONTEXT.
 *
 * STREET-SMART: Many medical eponyms (Murphy, Ross, Weber, Fisher, Jones, McDonald)
 * are also extremely common surnames. We should ONLY treat them as medical terms when:
 * 1. The eponym appears ALONE (just "Murphy" not "Alice Murphy")
 * 2. The eponym is followed by medical context words ("Murphy's sign", "McDonald criteria")
 * 3. The eponym appears with possessive form ("Murphy's", "Parkinson's")
 *
 * This prevents rejecting real person names like "Alice Murphy" or "Dr. Jones".
 */
function isMedicalEponym(text) {
    const normalized = text.trim();
    const words = normalized.split(/\s+/);
    // STREET-SMART: If text has multiple words and looks like a person name
    // (First Last or Title Last), do NOT treat as medical eponym
    // "Alice Murphy" is a person, not Murphy's sign
    // "Dr. Murphy" is a person, not Murphy's sign
    if (words.length >= 2) {
        const firstWord = words[0];
        // Check if first word is a title or a first name pattern
        const titles = ["Dr", "Mr", "Mrs", "Ms", "Miss", "Prof", "Rev", "Hon"];
        const isTitled = titles.some((t) => firstWord.toLowerCase() === t.toLowerCase() ||
            firstWord.toLowerCase() === t.toLowerCase() + ".");
        // Check if it looks like First Last pattern (both capitalized words)
        const isFirstLastPattern = words.length === 2 &&
            /^[A-Z][a-z]+$/.test(words[0]) &&
            /^[A-Z][a-z]+$/.test(words[1]);
        if (isTitled || isFirstLastPattern) {
            // Only return true if there's EXPLICIT medical context
            const textLower = normalized.toLowerCase();
            const medicalContextWords = [
                "criteria",
                "disease",
                "syndrome",
                "sign",
                "test",
                "score",
                "classification",
                "staging",
                "grade",
                "scale",
                "maneuver",
                "procedure",
                "operation",
                "technique",
                "incision",
                "repair",
                "'s disease",
                "'s syndrome",
                "'s sign",
                "'s criteria",
            ];
            for (const context of medicalContextWords) {
                if (textLower.includes(context)) {
                    return true;
                }
            }
            // No medical context - this is a person name, not a medical eponym
            return false;
        }
    }
    // For single words, check exact match (case-insensitive)
    // STREET-SMART: Common surnames that are ALSO medical eponyms should NOT
    // be treated as medical terms when they appear alone. These are too common
    // as real surnames to automatically reject.
    const COMMON_SURNAME_EPONYMS = new Set([
        "murphy", // Murphy's sign - but Murphy is a very common Irish surname
        "jones", // Jones criteria - but Jones is extremely common surname
        "ross", // Ross procedure - but Ross is a common surname
        "fisher", // Fisher grade - but Fisher is a common surname
        "weber", // Weber test - but Weber is a common German surname
        "turner", // Turner syndrome - but Turner is a common surname
        "cooper", // Cooper's ligament - but Cooper is a common surname
        "bell", // Bell's palsy - but Bell is a common surname
        "wilson", // Wilson's disease - but Wilson is a common surname
        "morgan", // Not a major eponym but appears in results
        "phillips", // Not a medical eponym at all - common surname
        "foster", // Not a medical eponym at all - common surname
        "clark", // Not a medical eponym at all - common surname
        "mcdonald", // McDonald criteria - but McDonald is a common surname
        "price", // Price classification exists but rare - common surname
        "morris", // Not a major medical eponym - common surname
        "taylor", // Not a medical eponym - common surname
        "stokes", // Cheyne-Stokes - but Stokes is a common surname
        "gupta", // Not a medical eponym - common surname
        "sato", // Not a medical eponym - common surname
        "garcia", // Not a medical eponym - common surname
        "pettersson", // Not a medical eponym - common surname
    ]);
    if (words.length === 1) {
        const wordLower = normalized.toLowerCase();
        // Skip common surnames - they need explicit medical context to be eponyms
        if (COMMON_SURNAME_EPONYMS.has(wordLower)) {
            return false;
        }
        for (const eponym of exports.MEDICAL_EPONYMS) {
            if (wordLower === eponym.toLowerCase()) {
                return true;
            }
        }
    }
    // Check if text contains a medical eponym followed by medical context words
    // e.g., "McDonald criteria", "Parkinson's disease", "Bell's palsy"
    const medicalContextWords = [
        "criteria",
        "disease",
        "syndrome",
        "sign",
        "test",
        "score",
        "classification",
        "staging",
        "grade",
        "scale",
        "maneuver",
        "procedure",
        "operation",
        "technique",
        "incision",
        "repair",
        "'s",
        "s'", // Possessive forms
    ];
    for (const eponym of exports.MEDICAL_EPONYMS) {
        const eponymLower = eponym.toLowerCase();
        const textLower = normalized.toLowerCase();
        // Check if text starts with an eponym followed by medical context
        if (textLower.startsWith(eponymLower)) {
            const remainder = textLower.substring(eponymLower.length).trim();
            for (const contextWord of medicalContextWords) {
                if (remainder.startsWith(contextWord)) {
                    return true;
                }
            }
        }
    }
    return false;
}
/**
 * Helper function to check if text is whitelisted
 */
function isWhitelisted(text) {
    const normalized = text.trim().toLowerCase();
    // Check if it's a medical eponym first
    if (isMedicalEponym(text)) {
        return true;
    }
    for (const whitelisted of exports.NAME_WHITELIST) {
        if (normalized === whitelisted.toLowerCase() ||
            normalized.includes(whitelisted.toLowerCase())) {
            return true;
        }
    }
    return false;
}
/**
 * Helper function to check if ALL CAPS text should be excluded
 */
function isExcludedAllCaps(text) {
    const normalized = text.toUpperCase().trim();
    const words = normalized.split(/\s+/);
    // Check if any word is an excluded acronym
    for (const word of words) {
        if (exports.EXCLUDED_ACRONYMS.has(word)) {
            return true;
        }
    }
    // Check if it's an excluded phrase (exact match)
    if (exports.EXCLUDED_PHRASES.has(normalized)) {
        return true;
    }
    // Check if normalized text contains comma-separated acronyms (like "PERRLA, EOMI")
    // These look like "LAST, FIRST" format but are medical abbreviations
    if (normalized.includes(",")) {
        const commaParts = normalized.split(",").map((p) => p.trim());
        if (commaParts.every((part) => exports.EXCLUDED_ACRONYMS.has(part))) {
            return true;
        }
    }
    // Check for structure words
    for (const word of words) {
        if (exports.STRUCTURE_WORDS.has(word)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=NameFilterConstants.js.map