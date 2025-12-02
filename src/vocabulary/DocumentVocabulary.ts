/**
 * DocumentVocabulary - Centralized Non-PHI Term Registry
 *
 * Single source of truth for all terms that should NEVER be redacted as PHI.
 * This consolidates exclusions previously scattered across multiple files:
 * - SmartNameFilterSpan.ts
 * - FieldLabelWhitelist.ts
 * - ParallelRedactionEngine.ts
 *
 * Categories:
 * - Document structure terms (headers, section names)
 * - Medical terminology (conditions, procedures, medications)
 * - Geographic/location terms (cities, states, directions)
 * - Field labels (Name:, DOB:, MRN:, etc.)
 * - HIPAA-specific terminology
 *
 * @module redaction/vocabulary
 */

export class DocumentVocabulary {
  /**
   * Document structure terms - headers, sections, report types
   * These are NEVER patient names
   */
  static readonly DOCUMENT_STRUCTURE = new Set([
    // Report types
    "radiology report",
    "progress note",
    "discharge summary",
    "consultation report",
    "operative report",
    "pathology report",
    "lab report",
    "clinical note",
    "medical record",
    "admission note",
    "transfer note",
    "procedure note",
    "history and physical",
    "h&p",

    // Section headings (lowercase for case-insensitive matching)
    "clinical information",
    "comparison",
    "contrast",
    "technique",
    "findings",
    "impression",
    "history",
    "examination",
    "assessment",
    "plan",
    "medications",
    "allergies",
    "diagnosis",
    "procedure",
    "results",
    "conclusion",
    "recommendations",
    "summary",
    "chief complaint",
    "present illness",
    "history of present illness",
    "past medical history",
    "past surgical history",
    "family history",
    "social history",
    "review of systems",
    "physical examination",
    "laboratory data",
    "imaging studies",
    "patient information",
    "visit information",
    "provider information",
    "billing information",
    "insurance information",
    "emergency contact",
    "emergency contacts",
    "vital signs",
    "lab results",
    "test results",
    "treatment plan",
    "diagnostic tests",

    // HIPAA document terms
    "redaction guide",
    "hipaa phi",
    "geographic data",
    "telephone numbers",
    "email addresses",
    "social security number",
    "medical record number",
    "health plan beneficiary",
    "account numbers",
    "certificate license",
    "vehicle identifiers",
    "device identifiers",
    "serial numbers",
    "web urls",
    "ip addresses",
    "biometric identifiers",
    "full face photographs",
    "photographic images",
    "visual media",
    "usage guide",
    "summary table",
    "safe harbor",
    "protected health information",
    "personally identifiable information",

    // Format/example terms
    "format example",
    "clinical narrative",
    "administrative records",
    "documentation records",
    "identification records",
    "implant records",
    "device documentation",
    "online presence",
    "communication records",
    "system access",
    "server logs",
    "security audits",
    "biometric authentication",
    "visual documentation",
    "clinical media",
    "administrative media",
  ]);

  /**
   * Medical terminology - conditions, procedures, medications, anatomy
   * These are NEVER patient names
   */
  static readonly MEDICAL_TERMS = new Set([
    // Conditions
    "diabetes mellitus",
    "hypertension",
    "hyperlipidemia",
    "coronary artery disease",
    "congestive heart failure",
    "chronic kidney disease",
    "chronic obstructive pulmonary disease",
    "atrial fibrillation",
    "unstable angina",
    "acute coronary syndrome",
    "myocardial infarction",
    "cerebrovascular accident",
    "deep vein thrombosis",
    "pulmonary embolism",
    "pneumonia",
    "urinary tract infection",
    "sepsis",
    "anemia",
    "hypothyroidism",
    "hyperthyroidism",
    "hypoglycemia",
    "hyperglycemia",
    "osteoporosis",
    "fibromyalgia",
    "neuropathy",
    "cardiomyopathy",
    "arrhythmia",
    "tachycardia",
    "bradycardia",
    "osteoarthritis",
    "rheumatoid arthritis",
    "depression",
    "anxiety",
    "bipolar disorder",
    "schizophrenia",
    "dementia",
    "alzheimer disease",
    "parkinson disease",
    "epilepsy",
    "migraine",
    "asthma",
    "allergic rhinitis",
    "gastroesophageal reflux",
    "irritable bowel syndrome",
    "crohn disease",
    "ulcerative colitis",
    "cirrhosis",
    "hepatitis",
    "pancreatitis",
    "appendicitis",
    "cholecystitis",
    "diverticulitis",
    "cellulitis",
    "osteomyelitis",
    "meningitis",
    "encephalitis",

    // Procedures
    "appendectomy",
    "cholecystectomy",
    "hysterectomy",
    "mastectomy",
    "colectomy",
    "gastrectomy",
    "nephrectomy",
    "splenectomy",
    "thyroidectomy",
    "tonsillectomy",
    "coronary artery bypass",
    "cardiac catheterization",
    "angioplasty",
    "stent placement",
    "pacemaker implantation",
    "defibrillator implantation",
    "hip replacement",
    "knee replacement",
    "joint replacement",
    "spinal fusion",
    "laminectomy",
    "discectomy",
    "craniotomy",
    "biopsy",
    "endoscopy",
    "colonoscopy",
    "bronchoscopy",
    "laparoscopy",
    "thoracoscopy",
    "cystoscopy",
    "dialysis",
    "chemotherapy",
    "radiation therapy",
    "immunotherapy",
    "physical therapy",
    "occupational therapy",
    "speech therapy",
    "mammogram",
    "mammography",
    "ultrasound",
    "echocardiogram",
    "angiogram",
    "arthroplasty",

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
    "morse fall score",
    "braden score",
    "norton scale",
    "waterlow score",
    "apache score",
    "sofa score",
    "news score",
    "mews score",

    // Therapy acronyms
    "cbt",
    "dbt",
    "emdr",

    // Common medications (that could look like names)
    "lisinopril",
    "metformin",
    "atorvastatin",
    "amlodipine",
    "metoprolol",
    "omeprazole",
    "losartan",
    "gabapentin",
    "hydrochlorothiazide",
    "levothyroxine",
    "acetaminophen",
    "ibuprofen",
    "aspirin",
    "warfarin",
    "heparin",
    "insulin",
    "prednisone",
    "azithromycin",
    "amoxicillin",
    "penicillin",
    "ciprofloxacin",
    "sertraline",
    "fluoxetine",
    "escitalopram",
    "duloxetine",
    "venlafaxine",
    "bupropion",
    "trazodone",
    "alprazolam",
    "lorazepam",
    "diazepam",
    "clonazepam",
    "morphine",
    "oxycodone",
    "hydrocodone",
    "fentanyl",
    "tramadol",
    "nitroglycerin",
    "sumatriptan",
    "hydroxyzine",
    "buspirone",
    "mirtazapine",
    "lamotrigine",
    "topiramate",
    "pregabalin",
    "cyclobenzaprine",
    "meloxicam",
    "naproxen",
    "celecoxib",
    "diclofenac",
    "paroxetine",

    // Anatomical terms
    "cardiovascular",
    "respiratory",
    "gastrointestinal",
    "genitourinary",
    "musculoskeletal",
    "neurological",
    "psychiatric",
    "endocrine",
    "hematologic",
    "immunologic",
    "dermatologic",
    "ophthalmologic",
    "otolaryngologic",

    // Clinical descriptors
    "bilateral",
    "unilateral",
    "proximal",
    "distal",
    "anterior",
    "posterior",
    "superior",
    "inferior",
    "medial",
    "lateral",
    "acute",
    "chronic",
    "benign",
    "malignant",
    "stable",
    "unstable",
    "progressive",
    "resolving",
  ]);

  /**
   * Insurance company names - should never be redacted as patient names
   */
  static readonly INSURANCE_TERMS = new Set([
    "blue cross",
    "blue shield",
    "blue cross blue shield",
    "bcbs",
    "aetna",
    "cigna",
    "united healthcare",
    "unitedhealthcare",
    "united health",
    "humana",
    "kaiser",
    "kaiser permanente",
    "anthem",
    "molina",
    "centene",
    "medicare",
    "medicaid",
    "tricare",
    "health net",
    "wellcare",
    "ambetter",
    "oscar health",
    "bright health",
    "clover health",
  ]);

  /**
   * Geographic and location terms
   * These are context words, not PHI by themselves
   */
  static readonly GEOGRAPHIC_TERMS = new Set([
    // US States (that could look like names)
    "colorado",
    "montana",
    "georgia",
    "virginia",
    "carolina",
    "dakota",
    "indiana",
    "louisiana",
    "maryland",
    "washington",

    // Major cities (that could look like names)
    "boulder",
    "boston",
    "denver",
    "dallas",
    "austin",
    "phoenix",
    "portland",
    "seattle",
    "chicago",
    "houston",
    "atlanta",
    "miami",
    "orlando",
    "tampa",
    "charlotte",
    "raleigh",
    "nashville",
    "memphis",
    "cleveland",
    "columbus",
    "detroit",
    "minneapolis",
    "milwaukee",
    "indianapolis",
    "jacksonville",
    "sacramento",
    "oakland",
    "fresno",
    "albuquerque",
    "tucson",
    "mesa",
    "omaha",
    "tulsa",

    // Directional terms
    "north",
    "south",
    "east",
    "west",
    "northeast",
    "northwest",
    "southeast",
    "southwest",
    "central",
    "downtown",
    "uptown",
    "midtown",

    // Location descriptors
    "regional",
    "community",
    "metropolitan",
    "suburban",
    "rural",
    "urban",
    "residential",
    "commercial",
    "industrial",
  ]);

  /**
   * Field label terms - words that indicate field labels, not PHI values
   */
  static readonly FIELD_LABELS = new Set([
    // Personal information fields
    "patient name",
    "full name",
    "first name",
    "last name",
    "middle name",
    "maiden name",
    "date of birth",
    "birth date",
    "age",
    "sex",
    "gender",
    "race",
    "ethnicity",
    "marital status",
    "occupation",
    "employer",

    // Contact fields
    "home address",
    "work address",
    "mailing address",
    "email address",
    "home phone",
    "work phone",
    "cell phone",
    "mobile phone",
    "fax number",
    "emergency contact",
    "next of kin",

    // Identification fields
    "medical record number",
    "account number",
    "patient id",
    "member id",
    "policy number",
    "group number",
    "social security number",
    "driver license",
    "passport number",
    "file number",

    // Relationship fields
    "spouse name",
    "spouse phone",
    "spouse email",
    "mother name",
    "father name",
    "sister name",
    "brother name",
    "emergency contact name",
    "guardian name",
    "caregiver name",

    // Provider fields
    "attending physician",
    "referring physician",
    "primary physician",
    "consulting physician",
    "admitting physician",
    "nurse manager",
    "case manager",

    // Technical fields
    "ip address",
    "mac address",
    "serial number",
    "device id",
    "license plate",
    "vin number",
    "vehicle identification",
  ]);

  /**
   * Single words that are NEVER part of a person's name
   * Used to filter false positives in name detection
   */
  static readonly NEVER_NAME_WORDS = new Set([
    // Document structure
    "section",
    "information",
    "record",
    "records",
    "document",
    "documentation",
    "report",
    "note",
    "notes",
    "form",
    "table",
    "list",
    "guide",
    "summary",
    "category",
    "type",
    "format",
    "example",
    "definition",
    "description",

    // Clinical terms
    "examination",
    "assessment",
    "evaluation",
    "analysis",
    "review",
    "findings",
    "impression",
    "diagnosis",
    "procedure",
    "treatment",
    "medication",
    "allergy",
    "history",
    "status",
    "results",
    "plan",

    // Technical terms
    "number",
    "numbers",
    "identifier",
    "identifiers",
    "address",
    "phone",
    "email",
    "portal",
    "account",
    "license",
    "serial",
    "device",
    "vehicle",
    "model",

    // HIPAA terms
    "hipaa",
    "phi",
    "pii",
    "redaction",
    "compliance",
    "harbor",
    "protected",
    "beneficiary",
    "certificate",

    // Descriptors
    "comprehensive",
    "synthetic",
    "geographic",
    "structured",
    "multiple",
    "formatting",
    "administrative",
    "clinical",
    "medical",
    "biometric",
    "photographic",
    "visual",
    "digital",
    "electronic",
    "online",

    // Common adjectives mistaken for first names
    "distinct",
    "athletic",
    "healthy",
    "normal",
    "stable",
    "active",
    "remote",
    "local",
    "regional",
    "national",
    "current",
    "previous",
    "primary",
    "secondary",
    "general",
    "initial",
    "final",
    "complete",
    "partial",
    "full",
    "total",
  ]);

  /**
   * Check if a term is a known non-PHI document structure term
   */
  static isDocumentStructure(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return this.DOCUMENT_STRUCTURE.has(normalized);
  }

  /**
   * Check if a term is a known medical term
   */
  static isMedicalTerm(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return this.MEDICAL_TERMS.has(normalized);
  }

  /**
   * Check if a term is a geographic term
   */
  static isGeographicTerm(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return this.GEOGRAPHIC_TERMS.has(normalized);
  }

  /**
   * Check if a term is a field label
   */
  static isFieldLabel(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return this.FIELD_LABELS.has(normalized);
  }

  /**
   * Check if a word should never be part of a name
   */
  static isNeverNameWord(word: string): boolean {
    const normalized = word.toLowerCase().trim();
    return this.NEVER_NAME_WORDS.has(normalized);
  }

  /**
   * Check if a term is an insurance company name
   */
  static isInsuranceTerm(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return this.INSURANCE_TERMS.has(normalized);
  }

  /**
   * Master check - is this text definitely NOT PHI?
   * Combines all checks into a single method
   */
  static isNonPHI(text: string): boolean {
    const normalized = text.toLowerCase().trim();

    // Direct match in any category
    if (
      this.DOCUMENT_STRUCTURE.has(normalized) ||
      this.MEDICAL_TERMS.has(normalized) ||
      this.GEOGRAPHIC_TERMS.has(normalized) ||
      this.FIELD_LABELS.has(normalized) ||
      this.INSURANCE_TERMS.has(normalized)
    ) {
      return true;
    }

    // Check if ALL words are "never name" words
    const words = normalized.split(/\s+/);
    if (words.length > 0 && words.every((w) => this.NEVER_NAME_WORDS.has(w))) {
      return true;
    }

    // Check if ANY word is a strong indicator of non-PHI
    const strongIndicators = [
      "information",
      "identifiers",
      "documentation",
      "examination",
      "redaction",
      "compliance",
      "hipaa",
      "geographic",
      "biometric",
      "characteristics",
    ];
    for (const word of words) {
      if (strongIndicators.includes(word)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if text contains any non-PHI indicators
   * Less strict than isNonPHI - returns true if ANY word matches
   */
  static containsNonPHIIndicator(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    const words = normalized.split(/\s+/);

    for (const word of words) {
      if (this.NEVER_NAME_WORDS.has(word)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all terms from all categories (for testing/debugging)
   */
  static getAllTerms(): Set<string> {
    const allTerms = new Set<string>();

    for (const term of this.DOCUMENT_STRUCTURE) allTerms.add(term);
    for (const term of this.MEDICAL_TERMS) allTerms.add(term);
    for (const term of this.GEOGRAPHIC_TERMS) allTerms.add(term);
    for (const term of this.FIELD_LABELS) allTerms.add(term);
    for (const term of this.NEVER_NAME_WORDS) allTerms.add(term);
    for (const term of this.INSURANCE_TERMS) allTerms.add(term);

    return allTerms;
  }
}
