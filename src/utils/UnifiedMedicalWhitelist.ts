/**
 * UnifiedMedicalWhitelist - SINGLE SOURCE OF TRUTH for Non-PHI Detection
 *
 * This module consolidates ALL whitelist logic previously scattered across:
 * - CentralizedWhitelist.ts (DEAD CODE - now deprecated)
 * - DocumentVocabulary.ts (~847 terms)
 * - NameFilterConstants.ts (~1002 terms)
 * - FieldLabelWhitelist.ts (~238 terms)
 * - WeightedPHIScorer.ts (~267 terms)
 *
 * TOTAL: ~1901 unique terms consolidated into categorized sets.
 *
 * DESIGN PRINCIPLES:
 * 1. Single source of truth - ALL whitelist decisions go through here
 * 2. Fast O(1) lookups using Sets
 * 3. Context-aware decisions (e.g., "Wilson" in "Wilson's disease" vs "Dr. Wilson")
 * 4. Hierarchical categories for fine-grained control
 * 5. Extensible at runtime for institution-specific terms
 *
 * CATEGORIES:
 * - Medical Eponyms (diseases named after people)
 * - Medical Conditions (diagnoses, diseases)
 * - Medications (drug names)
 * - Procedures (surgeries, tests)
 * - Anatomical Terms
 * - Clinical Acronyms (CT, MRI, etc.)
 * - Document Structure (section headers, field labels)
 * - Insurance Companies
 * - Hospital Names
 * - Geographic Terms
 * - Professional Titles/Credentials
 *
 * @module utils/UnifiedMedicalWhitelist
 */

import { FilterType } from "../models/Span";

// ============================================================================
// MEDICAL EPONYMS - Names that are also medical conditions
// These need context-aware detection - "Wilson's disease" vs "Dr. Wilson"
// ============================================================================
const MEDICAL_EPONYMS = new Set([
  // Neurological
  "parkinson",
  "alzheimer",
  "huntington",
  "tourette",
  "bell",
  "guillain",
  "barre",
  "charcot",
  "marie",
  "lou gehrig",
  "gehrig",

  // Metabolic/Genetic
  "wilson",
  "cushing",
  "addison",
  "graves",
  "hashimoto",
  "turner",
  "klinefelter",
  "marfan",
  "ehlers",
  "danlos",
  "gaucher",
  "fabry",
  "pompe",
  "tay",
  "sachs",
  "down",

  // Cardiovascular
  "raynaud",
  "kawasaki",
  "wegener",
  "takayasu",

  // Gastrointestinal
  "crohn",
  "barrett",
  "hirschsprung",
  "whipple",
  "peutz",
  "jeghers",
  "mallory",
  "weiss",

  // Orthopedic
  "dupuytren",
  "paget",
  "osgood",
  "schlatter",

  // Cancer
  "hodgkin",
  "burkitt",
  "kaposi",
  "wilms",
  "ewing",

  // Other syndromes
  "sjogren",
  "behcet",
  "reiter",
  "goodpasture",
  "meniere",
  "von willebrand",
  "henoch",
  "schonlein",
  "bowen",
  "peyronie",

  // Clinical signs/tests named after people
  "murphy",
  "mcburney",
  "rovsing",
  "cullen",
  "grey turner",
  "kussmaul",
  "cheyne",
  "stokes",
  "trousseau",
  "chvostek",
  "brudzinski",
  "kernig",
  "babinski",
  "romberg",
  "rinne",
  "weber",
  "virchow",
  "heimlich",
  "valsalva",
  "trendelenburg",
  "seldinger",

  // Classification/scoring systems
  "apgar",
  "bishop",
  "mallampati",
  "rockall",
  "blatchford",
  "glasgow",
  "apache",
  "wells",
  "geneva",
  "framingham",
  "killip",
  "hunt",
  "hess",
  "fisher",
  "breslow",
  "clark",
  "fuhrman",
  "gleason",
  "binet",
  "rai",
  "dukes",
  "frankel",
  "schatzki",

  // Procedures/techniques
  "kocher",
  "pfannenstiel",
  "lichtenstein",
  "nissen",
  "billroth",
  "fontan",
  "blalock",
  "taussig",
  "ross",
  "maze",

  // Diagnostic criteria
  "mcdonald",
  "duke",
  "jones",
  "rome",
  "manning",
  "ranson",
  "child",
  "pugh",
]);

// ============================================================================
// MEDICAL CONDITIONS - Diseases, diagnoses, syndromes (non-eponymous)
// ============================================================================
const MEDICAL_CONDITIONS = new Set([
  // Metabolic/Endocrine
  "diabetes",
  "diabetes mellitus",
  "type 1 diabetes",
  "type 2 diabetes",
  "hypertension",
  "hypotension",
  "hypothyroidism",
  "hyperthyroidism",
  "hyperlipidemia",
  "hypoglycemia",
  "hyperglycemia",
  "metabolic syndrome",

  // Cardiovascular
  "coronary artery disease",
  "congestive heart failure",
  "heart failure",
  "atrial fibrillation",
  "unstable angina",
  "acute coronary syndrome",
  "myocardial infarction",
  "cardiac arrest",
  "arrhythmia",
  "tachycardia",
  "bradycardia",
  "cardiomyopathy",
  "hypertrophic cardiomyopathy",
  "pericarditis",
  "myocarditis",
  "endocarditis",
  "aortic stenosis",
  "mitral regurgitation",
  "aortic aneurysm",
  "peripheral artery disease",
  "carotid stenosis",
  "deep vein thrombosis",
  "pulmonary embolism",
  "ventricular tachycardia",
  "supraventricular tachycardia",
  "atrial flutter",

  // Pulmonary
  "asthma",
  "copd",
  "chronic obstructive pulmonary disease",
  "pneumonia",
  "bronchitis",
  "emphysema",
  "pulmonary fibrosis",
  "interstitial lung disease",
  "pleural effusion",
  "pneumothorax",
  "hemothorax",
  "sleep apnea",
  "obstructive sleep apnea",
  "central sleep apnea",

  // Renal
  "chronic kidney disease",
  "acute kidney injury",
  "end stage renal disease",
  "esrd",
  "nephritis",
  "glomerulonephritis",
  "nephrolithiasis",
  "kidney stone",
  "polycystic kidney disease",
  "cystitis",
  "pyelonephritis",

  // GI/Hepatic
  "cirrhosis",
  "hepatitis",
  "pancreatitis",
  "colitis",
  "ulcerative colitis",
  "gastritis",
  "esophagitis",
  "cholangitis",
  "cholecystitis",
  "appendicitis",
  "diverticulitis",
  "fatty liver disease",
  "nonalcoholic fatty liver",
  "gastric ulcer",
  "duodenal ulcer",
  "peptic ulcer disease",
  "peptic ulcer",
  "hiatal hernia",
  "inguinal hernia",
  "gerd",
  "gastroesophageal reflux",
  "irritable bowel syndrome",
  "ibs",

  // Neurological
  "stroke",
  "cerebrovascular accident",
  "tia",
  "transient ischemic attack",
  "seizure",
  "epilepsy",
  "migraine",
  "neuropathy",
  "peripheral neuropathy",
  "dementia",
  "multiple sclerosis",
  "amyotrophic lateral sclerosis",
  "als",
  "trigeminal neuralgia",
  "lumbar radiculopathy",
  "cervical radiculopathy",
  "carpal tunnel syndrome",
  "carpal tunnel",
  "restless leg syndrome",
  "restless legs",
  "essential tremor",
  "glioblastoma",

  // Mental Health
  "depression",
  "major depressive disorder",
  "major depression",
  "anxiety",
  "generalized anxiety disorder",
  "panic disorder",
  "social anxiety disorder",
  "bipolar disorder",
  "bipolar",
  "schizophrenia",
  "ptsd",
  "post-traumatic stress disorder",
  "ocd",
  "obsessive-compulsive disorder",
  "obsessive compulsive disorder",
  "adhd",
  "attention deficit hyperactivity disorder",
  "binge eating disorder",
  "borderline personality disorder",
  "antisocial personality disorder",

  // Musculoskeletal
  "arthritis",
  "osteoarthritis",
  "rheumatoid arthritis",
  "psoriatic arthritis",
  "ankylosing spondylitis",
  "osteoporosis",
  "osteopenia",
  "fibromyalgia",
  "gout",
  "rotator cuff tear",
  "meniscus tear",
  "acl tear",
  "herniated disc",
  "degenerative disc disease",
  "spinal stenosis",

  // Hematologic/Oncologic
  "anemia",
  "leukemia",
  "lymphoma",
  "melanoma",
  "carcinoma",
  "adenocarcinoma",
  "sarcoma",
  "cancer",
  "breast cancer",
  "lung cancer",
  "colon cancer",
  "prostate cancer",
  "bladder cancer",
  "kidney cancer",
  "liver cancer",
  "pancreatic cancer",
  "ovarian cancer",
  "thyroid cancer",
  "skin cancer",
  "brain cancer",
  "stomach cancer",
  "esophageal cancer",
  "squamous cell carcinoma",
  "basal cell carcinoma",
  "thrombosis",
  "embolism",
  "thrombocytopenia",
  "neutropenia",
  "bacteremia",
  "sepsis",

  // Infectious
  "infection",
  "cellulitis",
  "osteomyelitis",
  "meningitis",
  "encephalitis",
  "sinusitis",
  "otitis",
  "conjunctivitis",
  "dermatitis",
  "eczema",
  "psoriasis",
  "hiv",
  "aids",

  // Other conditions
  "b12 deficiency",
  "vitamin b12 deficiency",
  "lupus",
  "systemic lupus erythematosus",
  "systemic lupus",
  "temporal arteritis",
  "giant cell arteritis",
  "allergic rhinitis",
  "pcos",
  "thyroid nodule",
  "diabetes insipidus",
  "pheochromocytoma",
  "pericardial effusion",
  "myopathy",
  "portal hypertension",
  "pulmonary hypertension",
  "bell palsy",
  "bell's palsy",
  "graves disease",
  "hashimoto thyroiditis",
  "addison disease",
  "cushing syndrome",
  "crohn disease",
  "alzheimer disease",
  "parkinson disease",
  "huntington disease",
  "end-stage renal disease",
  "urinary tract infection",
  "lap band",
  "lap-band",
  "gastric band",

  // Mental health (full names)
  "major depressive",
  "major depressive disorder",
  "post-traumatic stress",
  "post-traumatic stress disorder",
  "generalized anxiety",
  "generalized anxiety disorder",
  "obsessive compulsive",
  "obsessive compulsive disorder",
  "social anxiety",
  "social anxiety disorder",
  "attention deficit",
  "attention deficit disorder",
  "attention deficit hyperactivity disorder",
  "binge eating",
  "binge eating disorder",
  "borderline personality",
  "borderline personality disorder",
  "antisocial personality",
  "antisocial personality disorder",

  // Clinical descriptors (frequently misidentified as names)
  "acute",
  "chronic",
  "benign",
  "malignant",
  "stable",
  "unstable",
  "progressive",
  "resolving",
  "bilateral",
  "unilateral",
  "proximal",
  "distal",

  // Pathology/radiology findings
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
]);

// ============================================================================
// MEDICATIONS - Drug names (generic and brand)
// ============================================================================
const MEDICATIONS = new Set([
  // Cardiovascular
  "lisinopril",
  "metoprolol",
  "amlodipine",
  "losartan",
  "atorvastatin",
  "simvastatin",
  "rosuvastatin",
  "clopidogrel",
  "warfarin",
  "aspirin",
  "heparin",
  "enoxaparin",
  "rivaroxaban",
  "apixaban",
  "dabigatran",
  "fondaparinux",
  "nitroglycerin",
  "carvedilol",
  "diltiazem",
  "verapamil",
  "amiodarone",
  "flecainide",
  "digoxin",
  "hydralazine",
  "minoxidil",
  "furosemide",
  "hydrochlorothiazide",
  "bumetanide",
  "torsemide",
  "spironolactone",

  // Diabetes
  "metformin",
  "insulin",
  "insulin glargine",
  "insulin lispro",
  "insulin aspart",
  "insulin detemir",
  "insulin degludec",
  "glipizide",
  "glyburide",
  "sitagliptin",
  "linagliptin",
  "empagliflozin",
  "canagliflozin",
  "dapagliflozin",
  "liraglutide",
  "semaglutide",
  "dulaglutide",
  "tirzepatide",

  // GI
  "omeprazole",
  "pantoprazole",
  "esomeprazole",
  "lansoprazole",
  "rabeprazole",
  "famotidine",
  "ondansetron",
  "promethazine",
  "metoclopramide",
  "docusate",
  "bisacodyl",
  "lactulose",
  "polyethylene glycol",
  "linaclotide",
  "loperamide",
  "mesalamine",

  // Pain/Inflammation
  "acetaminophen",
  "ibuprofen",
  "naproxen",
  "meloxicam",
  "celecoxib",
  "diclofenac",
  "tramadol",
  "oxycodone",
  "hydrocodone",
  "morphine",
  "fentanyl",
  "gabapentin",
  "pregabalin",
  "cyclobenzaprine",
  "prednisone",
  "methylprednisolone",
  "dexamethasone",
  "budesonide",

  // Thyroid
  "levothyroxine",

  // Antibiotics
  "amoxicillin",
  "azithromycin",
  "penicillin",
  "penicillin vk",
  "penicillin v",
  "ciprofloxacin",
  "clindamycin",
  "metronidazole",
  "doxycycline",
  "cephalexin",
  "trimethoprim",
  "sulfamethoxazole",

  // Psychiatric
  "sertraline",
  "fluoxetine",
  "escitalopram",
  "citalopram",
  "paroxetine",
  "duloxetine",
  "venlafaxine",
  "bupropion",
  "mirtazapine",
  "trazodone",
  "nortriptyline",
  "amitriptyline",
  "buspirone",
  "hydroxyzine",
  "alprazolam",
  "lorazepam",
  "diazepam",
  "clonazepam",
  "quetiapine",
  "olanzapine",
  "risperidone",
  "aripiprazole",
  "ziprasidone",
  "paliperidone",
  "lurasidone",
  "clozapine",
  "lithium",
  "divalproex",
  "valproic acid",

  // Neurology
  "levetiracetam",
  "lamotrigine",
  "topiramate",
  "carbamazepine",
  "phenytoin",
  "oxcarbazepine",
  "lacosamide",
  "sumatriptan",
  "memantine",
  "donepezil",
  "rivastigmine",
  "galantamine",
  "pramipexole",
  "ropinirole",
  "rasagiline",

  // Respiratory
  "albuterol",
  "fluticasone",
  "montelukast",
  "cetirizine",
  "loratadine",
  "fexofenadine",
  "diphenhydramine",

  // Immunologic/Rheumatologic
  "methotrexate",
  "hydroxychloroquine",
  "sulfasalazine",
  "leflunomide",
  "infliximab",
  "adalimumab",
  "etanercept",
  "rituximab",
  "tacrolimus",
  "cyclosporine",
  "mycophenolate",
  "azathioprine",
  "colchicine",
  "allopurinol",
  "febuxostat",

  // Urology
  "tamsulosin",
  "finasteride",
  "dutasteride",
  "sildenafil",
  "tadalafil",
  "oxybutynin",
  "tolterodine",
  "solifenacin",
  "mirabegron",

  // Other
  "diphenoxylate",
  "diphenoxylate-atropine",
  "lomotil",
]);

// ============================================================================
// PROCEDURES - Medical procedures, surgeries, tests
// ============================================================================
const PROCEDURES = new Set([
  // Surgeries
  "surgery",
  "appendectomy",
  "cholecystectomy",
  "hysterectomy",
  "mastectomy",
  "colectomy",
  "gastrectomy",
  "nephrectomy",
  "splenectomy",
  "thyroidectomy",
  "parathyroidectomy",
  "adrenalectomy",
  "prostatectomy",
  "cystectomy",
  "tonsillectomy",
  "laryngectomy",
  "esophagectomy",
  "pneumonectomy",
  "lobectomy",
  "oophorectomy",
  "salpingectomy",
  "thrombectomy",
  "endarterectomy",
  "carotid endarterectomy",
  "craniotomy",
  "laminectomy",
  "discectomy",
  "hip replacement",
  "knee replacement",
  "joint replacement",
  "spinal fusion",
  "acl reconstruction",
  "rotator cuff repair",
  "meniscectomy",
  "arthroplasty",
  "cataract surgery",
  "whipple procedure",
  "coronary artery bypass",
  "cabg",
  "orif",
  "open reduction internal fixation",

  // Cardiac procedures
  "cardiac catheterization",
  "angioplasty",
  "stent placement",
  "pacemaker implantation",
  "defibrillator implantation",
  "ablation",
  "cardioversion",
  "defibrillation",
  "pericardiocentesis",
  "transesophageal echo",
  "transesophageal echocardiogram",

  // Scopes/Endoscopy
  "biopsy",
  "endoscopy",
  "colonoscopy",
  "bronchoscopy",
  "laparoscopy",
  "thoracoscopy",
  "cystoscopy",
  "arthroscopy",
  "capsule endoscopy",
  "excisional biopsy",
  "incisional biopsy",
  "bone marrow biopsy",
  "prostate biopsy",

  // Imaging
  "mri",
  "ct scan",
  "ct",
  "pet scan",
  "pet",
  "x-ray",
  "mammogram",
  "mammography",
  "ultrasound",
  "abdominal ultrasound",
  "pelvic ultrasound",
  "renal ultrasound",
  "thyroid ultrasound",
  "transvaginal ultrasound",
  "carotid ultrasound",
  "doppler ultrasound",
  "echocardiogram",
  "angiogram",
  "angiography",
  "venography",
  "arteriography",
  "mra",
  "mra of head and neck",
  "fluoroscopy",

  // Lab tests
  "cbc",
  "bmp",
  "cmp",
  "lft",
  "abg",

  // Other procedures
  "dialysis",
  "chemotherapy",
  "radiation therapy",
  "immunotherapy",
  "physical therapy",
  "occupational therapy",
  "speech therapy",
  "transfusion",
  "transplant",
  "resection",
  "excision",
  "thoracentesis",
  "paracentesis",
  "lumbar puncture",
  "spinal tap",
  "spirometry",
  "pulmonary function test",
  "nerve conduction study",
  "eeg",
  "emg",
  "turp",
  "deep brain stimulation",
  "carpal tunnel release",
]);

// ============================================================================
// ANATOMICAL TERMS
// ============================================================================
const ANATOMICAL_TERMS = new Set([
  "cardiac",
  "pulmonary",
  "hepatic",
  "renal",
  "cerebral",
  "spinal",
  "thoracic",
  "abdominal",
  "pelvic",
  "femoral",
  "brachial",
  "carotid",
  "jugular",
  "portal",
  "mesenteric",
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
  "cephalic",
  "breech",
  "fundal",
]);

// ============================================================================
// CLINICAL ACRONYMS - Medical abbreviations
// ============================================================================
const CLINICAL_ACRONYMS = new Set([
  // Imaging/Tests
  "ct",
  "mri",
  "pet",
  "ekg",
  "ecg",
  "cbc",
  "bmi",
  "bp",
  "hr",
  "rr",
  "iv",
  "im",
  "po",
  "prn",
  "bid",
  "tid",
  "qid",
  "npo",
  "dnr",
  "dni",
  "er",
  "ed",
  "icu",
  "ccu",
  "or",
  "pacu",
  "ob",
  "gyn",
  "ent",
  "gi",
  "stat",
  "asap",
  "bmp",
  "cmp",
  "lft",
  "abg",
  "wbc",
  "rbc",
  "hgb",
  "hct",
  "plt",
  "pt",
  "ptt",
  "inr",
  "bun",
  "gfr",
  "a1c",
  "tsh",

  // Physical exam
  "perrla",
  "eomi",
  "heent",
  "ncat",
  "rrr",
  "cta",
  "ntnd",
  "a&o",
  "wnl",
  "nad",
  "aao",
  "avss",

  // Therapy
  "cbt",
  "dbt",
  "emdr",
  "act",
  "ipt",
  "mbct",
  "ptsd",
  "adhd",
  "ocd",
  "gad",
  "mdd",
  "bpd",
  "phq",
  "gad7",

  // Document/ID
  "dob",
  "mrn",
  "ssn",
  "vin",
  "ein",
  "tin",

  // Government/Legal
  "hipaa",
  "phi",
  "pii",
  "ferpa",
  "ada",
  "osha",
  "cms",
  "hhs",

  // Common diagnosis abbreviations (critical for specificity)
  "chf", // congestive heart failure
  "cad", // coronary artery disease
  "dvt", // deep vein thrombosis
  "pe", // pulmonary embolism
  "uti", // urinary tract infection
  "mi", // myocardial infarction
  "cva", // cerebrovascular accident
  "afib", // atrial fibrillation
  "nstemi",
  "stemi",
  "htn", // hypertension
  "dm", // diabetes mellitus
  "ckd", // chronic kidney disease
  "aki", // acute kidney injury
  "ards", // acute respiratory distress syndrome
  "sirs", // systemic inflammatory response syndrome
  "sepsis",
  "ams", // altered mental status
  "sob", // shortness of breath
  "cp", // chest pain
  "abd", // abdominal
  "r/o", // rule out
  "c/o", // complains of
  "h/o", // history of
  "s/p", // status post
  "f/u", // follow up
  "w/u", // work up

  // Clinical assessment scales
  "morse fall score",
  "braden score",
  "norton scale",
  "waterlow score",
  "apache score",
  "sofa score",
  "news score",
  "mews score",
  "glasglow coma scale",
  "gcs",
  "nihss",
  "mmse",
  "moca",
  "phq-9",
  "gad-7",
]);

// ============================================================================
// DOCUMENT STRUCTURE - Section headers, field labels
// ============================================================================
const DOCUMENT_STRUCTURE = new Set([
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

  // Section headings
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

  // HIPAA terms
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
  "safe harbor",
  "protected health information",
  "personally identifiable information",

  // Additional document structure (from DocumentVocabulary)
  "usage guide",
  "summary table",
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
  "guideline",
  "protocol",
  "policy",
]);

// ============================================================================
// FIELD LABELS - Form field names that should not be redacted
// ============================================================================
const FIELD_LABELS = new Set([
  // Personal info
  "patient",
  "patient name",
  "full name",
  "first name",
  "last name",
  "middle name",
  "maiden name",
  "date of birth",
  "birth date",
  "dob",
  "age",
  "sex",
  "gender",
  "race",
  "ethnicity",
  "marital status",
  "occupation",
  "employer",

  // Contact
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

  // IDs
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

  // Relationships
  "spouse name",
  "spouse phone",
  "spouse email",
  "mother name",
  "father name",
  "sister name",
  "brother name",
  "guardian name",
  "caregiver name",

  // Provider
  "attending physician",
  "referring physician",
  "primary physician",
  "consulting physician",
  "admitting physician",
  "nurse manager",
  "case manager",

  // Technical
  "ip address",
  "mac address",
  "serial number",
  "device id",
  "license plate",
  "vin number",
  "vehicle identification",
]);

// ============================================================================
// INSURANCE COMPANIES
// ============================================================================
const INSURANCE_COMPANIES = new Set([
  "aetna",
  "anthem",
  "bcbs",
  "blue cross",
  "blue shield",
  "blue cross blue shield",
  "cigna",
  "humana",
  "kaiser",
  "kaiser permanente",
  "medicaid",
  "medicare",
  "tricare",
  "united",
  "united healthcare",
  "unitedhealthcare",
  "united health",
  "wellcare",
  "centene",
  "molina",
  "oscar",
  "oscar health",
  "clover",
  "clover health",
  "devoted",
  "alignment",
  "bright health",
  "ambetter",
  "health net",
]);

// ============================================================================
// HOSPITAL/FACILITY NAMES
// ============================================================================
const HOSPITAL_NAMES = new Set([
  // Major academic centers
  "johns hopkins",
  "johns hopkins hospital",
  "beth israel",
  "beth israel deaconess",
  "mount sinai",
  "mount sinai hospital",
  "cedars sinai",
  "cedars-sinai",
  "mayo clinic",
  "cleveland clinic",
  "massachusetts general",
  "mass general",
  "brigham and women",
  "ucla medical center",
  "ucsf medical center",
  "stanford hospital",
  "stanford health care",
  "ut southwestern",
  "md anderson",
  "memorial sloan kettering",
  "sloan kettering",
  "duke university hospital",
  "duke medical center",
  "northwestern memorial",
  "new york presbyterian",
  "ny presbyterian",
  "nyu langone",
  "upmc",
  "penn medicine",
  "vanderbilt university medical center",
  "emory university hospital",
  "rush university medical center",
  "university of michigan hospital",
  "michigan medicine",
  "barnes jewish",
  "barnes-jewish hospital",

  // Generic patterns
  "regional medical center",
  "community hospital",
  "general hospital",
  "memorial hospital",
  "medical center",
  "health center",
  "healthcare center",
  "university hospital",

  // Religious
  "st mary",
  "st. mary",
  "saint mary",
  "st joseph",
  "st. joseph",
  "saint joseph",
  "sacred heart",
  "good samaritan",
  "holy cross",
  "mercy hospital",
  "providence hospital",
  "baptist hospital",
  "methodist hospital",
  "presbyterian hospital",
  "lutheran hospital",
  "adventist health",

  // Government
  "veterans affairs",
  "va hospital",
  "va medical center",
  "walter reed",
]);

// ============================================================================
// GEOGRAPHIC TERMS - Directions, location descriptors
// ============================================================================
const GEOGRAPHIC_TERMS = new Set([
  // Directions
  "north",
  "south",
  "east",
  "west",
  "northeast",
  "northwest",
  "southeast",
  "southwest",
  "central",
  "northern",
  "southern",
  "eastern",
  "western",
  "downtown",
  "uptown",
  "midtown",

  // Location types
  "state",
  "county",
  "city",
  "town",
  "village",
  "district",
  "region",
  "area",
  "zone",
  "campus",
  "building",
  "floor",
  "suite",
  "office",
  "regional",
  "community",
  "metropolitan",
  "suburban",
  "rural",
  "urban",

  // US States that could be names
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

  // Cities that could be names
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
  "charlotte",
  "nashville",
  "cleveland",
  "columbus",
  "detroit",
]);

// ============================================================================
// PROFESSIONAL TITLES AND CREDENTIALS
// ============================================================================
const PROFESSIONAL_TITLES = new Set([
  // Honorifics
  "mr",
  "mrs",
  "ms",
  "miss",
  "dr",
  "prof",
  "rev",
  "hon",

  // Medical degrees
  "md",
  "do",
  "phd",
  "dds",
  "dmd",
  "dpm",
  "dvm",
  "od",
  "psyd",
  "pharmd",
  "dc",
  "nd",

  // Nursing
  "rn",
  "np",
  "bsn",
  "msn",
  "dnp",
  "aprn",
  "crna",
  "cns",
  "cnm",
  "lpn",
  "lvn",
  "cna",

  // PA
  "pa",
  "pa-c",

  // Allied health
  "pt",
  "dpt",
  "ot",
  "otr",
  "slp",
  "rt",
  "rrt",
  "rd",
  "rdn",
  "lcsw",
  "lmft",
  "lpc",

  // Fellowships
  "facs",
  "facp",
  "facc",
  "facog",
  "faan",
  "faap",

  // Other
  "esq",
  "cpa",
  "mba",
  "mph",
  "jd",
]);

// ============================================================================
// COMMON WORDS THAT ARE NEVER NAMES
// ============================================================================
const NEVER_NAME_WORDS = new Set([
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

  // Common words
  "major",
  "minor",
  "senior",
  "junior",
  "chief",
  "associate",
  "assistant",
  "director",
  "manager",
  "coordinator",
  "specialist",
  "consultant",
  "supervisor",
  "administrator",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "annual",
  "quarterly",
  "attending",
  "resident",
  "fellow",
  "intern",
  "nurse",
  "technician",
  "therapist",
  "pharmacist",
  "dietitian",
  "counselor",
  "aide",
  "pending",
  "approved",
  "denied",
  "completed",
  "scheduled",
  "cancelled",
  "confirmed",
  "verified",
  "reviewed",
  "baseline",
  "average",
  "maximum",
  "minimum",
  "optimal",
  "target",
  "threshold",
  "range",
  "level",
  "degree",
]);

// ============================================================================
// CONTEXT PATTERNS
// ============================================================================

/**
 * Pattern indicating medical eponym usage (not person name)
 */
const EPONYM_DISEASE_PATTERN =
  /\b(disease|syndrome|sign|test|phenomenon|reflex|maneuver|law|rule|ring|node|body|cell|duct|canal|nerve|artery|vein|muscle|ligament|tendon|bone|criteria|score|scale|classification|staging|grade)\b/i;

const EPONYM_POSSESSIVE_PATTERN = /'s?\s+(disease|syndrome|sign|test|phenomenon|criteria|score|scale)/i;

/**
 * Title patterns indicating a person (should NOT be whitelisted)
 */
const PERSON_TITLE_PATTERN =
  /^(?:Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Miss|Prof\.?|Rev\.?)\s+/i;

const NAME_SUFFIX_PATTERN = /\s+(?:Jr\.?|Sr\.?|II|III|IV|V|MD|DO|PhD|RN|NP)$/i;

// ============================================================================
// MAIN CLASS
// ============================================================================

/**
 * UnifiedMedicalWhitelist - Single source of truth for all whitelist decisions
 */
export class UnifiedMedicalWhitelist {
  // Cache for fast repeated lookups
  private static cachedAllTerms: Set<string> | null = null;

  // ========== CATEGORY CHECKS ==========

  /**
   * Check if text is a medical eponym (disease/test named after person)
   * Context-aware: "Wilson's disease" = eponym, "Dr. Wilson" = person
   */
  static isMedicalEponym(text: string, context?: string): boolean {
    const normalized = text.toLowerCase().trim();
    const words = normalized.split(/\s+/);

    // Check if any word is a known eponym
    const hasEponymWord = words.some((w) => MEDICAL_EPONYMS.has(w));
    if (!hasEponymWord) return false;

    // If we have context, check for disease indicators
    if (context) {
      const fullContext = `${text} ${context}`.toLowerCase();
      if (EPONYM_DISEASE_PATTERN.test(fullContext)) return true;
      if (EPONYM_POSSESSIVE_PATTERN.test(fullContext)) return true;
    }

    // Check the text itself for disease indicators
    if (EPONYM_DISEASE_PATTERN.test(text)) return true;
    if (EPONYM_POSSESSIVE_PATTERN.test(text)) return true;

    // Possessive form with 's suggests medical usage
    if (/'s?\s*$/i.test(normalized)) return true;

    // Without disease context, we can't be sure
    return false;
  }

  /**
   * Check if text is a medical condition
   */
  static isMedicalCondition(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    if (MEDICAL_CONDITIONS.has(normalized)) return true;

    // Check individual words
    const words = normalized.split(/\s+/);
    return words.some((w) => MEDICAL_CONDITIONS.has(w));
  }

  /**
   * Check if text is a medication name
   */
  static isMedication(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return MEDICATIONS.has(normalized);
  }

  /**
   * Check if text is a medical procedure
   */
  static isProcedure(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    if (PROCEDURES.has(normalized)) return true;

    const words = normalized.split(/\s+/);
    return words.some((w) => PROCEDURES.has(w));
  }

  /**
   * Check if text is an anatomical term
   */
  static isAnatomicalTerm(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return ANATOMICAL_TERMS.has(normalized);
  }

  /**
   * Check if text is a clinical acronym
   */
  static isClinicalAcronym(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    return CLINICAL_ACRONYMS.has(normalized);
  }

  /**
   * Check if text is document structure
   */
  static isDocumentStructure(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    if (DOCUMENT_STRUCTURE.has(normalized)) return true;

    // Check for partial matches
    for (const term of DOCUMENT_STRUCTURE) {
      if (normalized.includes(term)) return true;
    }
    return false;
  }

  /**
   * Check if text is a field label
   */
  static isFieldLabel(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    if (FIELD_LABELS.has(normalized)) return true;

    for (const label of FIELD_LABELS) {
      if (normalized.includes(label)) return true;
    }
    return false;
  }

  /**
   * Check if text is an insurance company
   */
  static isInsuranceCompany(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    for (const company of INSURANCE_COMPANIES) {
      if (normalized.includes(company)) return true;
    }
    return false;
  }

  /**
   * Check if text is a hospital/facility name
   */
  static isHospitalName(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    for (const hospital of HOSPITAL_NAMES) {
      if (normalized.includes(hospital)) return true;
    }
    return false;
  }

  /**
   * Check if text is a geographic term
   */
  static isGeographicTerm(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    if (GEOGRAPHIC_TERMS.has(normalized)) return true;

    const words = normalized.split(/\s+/);
    return words.some((w) => GEOGRAPHIC_TERMS.has(w));
  }

  /**
   * Check if text has person indicators (title, suffix)
   * If true, should NOT be whitelisted even if contains medical term
   */
  static hasPersonIndicators(text: string): boolean {
    return PERSON_TITLE_PATTERN.test(text) || NAME_SUFFIX_PATTERN.test(text);
  }

  /**
   * Check if word should never be part of a name
   */
  static isNeverNameWord(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    if (NEVER_NAME_WORDS.has(normalized)) return true;

    const words = normalized.split(/\s+/);
    return words.every((w) => NEVER_NAME_WORDS.has(w));
  }

  // ========== STRUCTURE DETECTION (from FieldLabelWhitelist) ==========

  /**
   * Structure words that indicate document structure when part of a phrase
   * These indicate the text is structural, not PHI
   */
  private static readonly STRUCTURE_WORDS = new Set([
    "RECORD", "INFORMATION", "SECTION", "NOTES", "HISTORY", "DEPARTMENT",
    "REPORT", "CENTER", "HOSPITAL", "CLINIC", "STREET", "SIGNED", "CERTIFIED",
    "IMAGING", "SERVICES", "NATIONWIDE", "HEADQUARTERED", "EXAM", "EXAMINATION",
    "STATUS", "ASSESSMENT", "EVALUATION", "ADMINISTERED", "ONCOLOGY", "THERAPY",
    "VACCINATION", "VACCINE", "VACCINES", "HIPAA", "PHI", "HARBOR", "IDENTIFIERS",
    "PROTECTED", "PRIVACY", "COMPLIANCE", "REDACTION", "REDACTIONS", "GUIDE",
    "SUMMARY", "TABLE", "FORMAT", "EXAMPLE", "DEFINITION", "DOCUMENTATION",
    "RECORDS", "DATA", "MEDIA", "SIGNS", "RESULTS", "PRESSURE", "RATE",
    "SATURATION", "REHABILITATION", "EDUCATION", "PLANNING", "SUPPORT",
    "GEOGRAPHIC", "BIOMETRIC", "VEHICLE", "DEVICE", "SERIAL", "CERTIFICATE",
    "BENEFICIARY", "PHOTOGRAPHIC", "ADMINISTRATIVE", "PROCESSING", "CREDENTIALS",
    "DIRECTORY",
  ]);

  /**
   * Filter types that should bypass structure word checks
   * These are pattern-matched identifiers with specific formats
   */
  private static readonly PATTERN_MATCHED_TYPES = new Set([
    "EMAIL", "URL", "PHONE", "FAX", "SSN", "IP", "MRN", "ACCOUNT",
    "CREDIT_CARD", "CREDITCARD", "LICENSE", "PASSPORT", "DEVICE", "VEHICLE",
    "HEALTH_PLAN", "HEALTHPLAN", "UNIQUE_ID", "MAC_ADDRESS", "IBAN", "BITCOIN",
  ]);

  /**
   * Check if text contains document structure words
   * Uses word boundary matching to avoid false positives (e.g., "PHILIP" vs "PHI")
   */
  static containsStructureWord(text: string): boolean {
    const upper = text.toUpperCase();
    const textWords = upper.split(/[\s,.\-:;]+/).filter((w) => w.length > 0);
    for (const textWord of textWords) {
      if (this.STRUCTURE_WORDS.has(textWord)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if text looks like a street address (starts with house number)
   * Examples: "789 Pine Street", "123 Main Ave"
   * Street addresses should NOT be whitelisted even if they contain structure words
   */
  static looksLikeStreetAddress(text: string): boolean {
    const streetSuffixes = [
      "street", "st", "avenue", "ave", "road", "rd", "drive", "dr",
      "boulevard", "blvd", "lane", "ln", "way", "court", "ct", "circle",
      "cir", "place", "pl", "terrace", "ter", "parkway", "pkwy", "highway",
      "hwy", "trail", "path", "alley", "plaza",
    ];
    const suffixPattern = streetSuffixes.join("|");
    const addressPattern = new RegExp(
      `^\\d+\\s+[A-Za-z]+.*\\b(?:${suffixPattern})\\b`,
      "i"
    );
    return addressPattern.test(text.trim());
  }

  /**
   * Check if a filter type is pattern-matched (bypasses structure word checks)
   */
  static isPatternMatchedType(filterType: string): boolean {
    return this.PATTERN_MATCHED_TYPES.has(filterType.toUpperCase());
  }

  /**
   * Filter spans using whitelist rules
   * Pattern-matched types (EMAIL, URL, etc.) bypass structure word checks
   */
  static filterSpans<
    T extends {
      text: string;
      characterStart: number;
      characterEnd: number;
      filterType?: string;
    }
  >(spans: T[]): T[] {
    return spans.filter((span) => {
      // Pattern-matched identifier types should NOT be filtered by structure checks
      if (span.filterType && this.PATTERN_MATCHED_TYPES.has(span.filterType)) {
        return true;
      }
      // For NAME and other types, apply the full exclusion logic
      return !this.shouldExcludeFromRedaction(span.text);
    });
  }

  /**
   * Check if text should be excluded from redaction (used by filterSpans)
   * Does not apply to pattern-matched types
   */
  static shouldExcludeFromRedaction(text: string): boolean {
    // Don't exclude actual street addresses
    if (this.looksLikeStreetAddress(text)) {
      return false;
    }
    return (
      this.isFieldLabel(text) ||
      this.containsStructureWord(text) ||
      this.isClinicalAcronym(text) ||
      this.isDocumentStructure(text)
    );
  }

  // ========== MASTER CHECKS ==========

  /**
   * Check if text is ANY known medical term
   * Combines conditions, medications, procedures, anatomy, acronyms
   */
  static isMedicalTerm(text: string): boolean {
    return (
      this.isMedicalCondition(text) ||
      this.isMedication(text) ||
      this.isProcedure(text) ||
      this.isAnatomicalTerm(text) ||
      this.isClinicalAcronym(text)
    );
  }

  /**
   * Master whitelist check - should text NOT be redacted?
   *
   * @param text - The text to check
   * @param filterType - The PHI type being considered
   * @param context - Surrounding context for disambiguation
   * @returns True if text should be whitelisted (not redacted)
   */
  static shouldWhitelist(
    text: string,
    filterType?: FilterType | string,
    context?: string
  ): boolean {
    // Person indicators override all whitelisting
    // "Dr. Wilson" is a person, even though Wilson is an eponym
    if (this.hasPersonIndicators(text)) {
      return false;
    }

    // Check all whitelist categories
    if (this.isFieldLabel(text)) return true;
    if (this.isInsuranceCompany(text)) return true;
    if (this.isHospitalName(text)) return true;
    if (this.isDocumentStructure(text)) return true;
    if (this.isMedicalTerm(text)) return true;
    if (this.isMedicalEponym(text, context)) return true;

    // For NAME type, also check geographic terms and never-name words
    if (filterType === FilterType.NAME || filterType === "NAME") {
      if (this.isGeographicTerm(text)) return true;
      if (this.isNeverNameWord(text)) return true;
    }

    return false;
  }

  /**
   * Get whitelist penalty for confidence scoring
   * Higher penalty = less likely to be PHI
   *
   * @param text - The text to check
   * @param context - Surrounding context
   * @returns Penalty value (0-1, where 1 means definitely not PHI)
   */
  static getWhitelistPenalty(text: string, context?: string): number {
    if (this.hasPersonIndicators(text)) return 0;

    // Document structure is almost never PHI
    if (this.isDocumentStructure(text)) return 0.95;
    if (this.isFieldLabel(text)) return 0.9;

    // Medical terms with high penalties
    if (this.isMedicalEponym(text, context)) return 0.9;
    if (this.isMedication(text)) return 0.85;
    if (this.isMedicalCondition(text)) return 0.85;
    if (this.isProcedure(text)) return 0.8;
    if (this.isAnatomicalTerm(text)) return 0.75;
    if (this.isClinicalAcronym(text)) return 0.8;

    // Organizations
    if (this.isInsuranceCompany(text)) return 0.9;
    if (this.isHospitalName(text)) return 0.85;

    // Geographic
    if (this.isGeographicTerm(text)) return 0.7;

    // Never-name words
    if (this.isNeverNameWord(text)) return 0.7;

    return 0;
  }

  /**
   * Check if text is non-PHI (comprehensive check)
   * More inclusive than shouldWhitelist - returns true if ANY indicator present
   */
  static isNonPHI(text: string): boolean {
    const normalized = text.toLowerCase().trim();

    // Direct match in any major category
    if (
      MEDICAL_CONDITIONS.has(normalized) ||
      MEDICATIONS.has(normalized) ||
      PROCEDURES.has(normalized) ||
      ANATOMICAL_TERMS.has(normalized) ||
      CLINICAL_ACRONYMS.has(normalized) ||
      FIELD_LABELS.has(normalized) ||
      GEOGRAPHIC_TERMS.has(normalized)
    ) {
      return true;
    }

    // Check document structure
    if (this.isDocumentStructure(text)) return true;

    // Check if all words are "never name" words
    const words = normalized.split(/\s+/);
    if (words.length > 0 && words.every((w) => NEVER_NAME_WORDS.has(w))) {
      return true;
    }

    return false;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Add custom terms to a category at runtime
   * Useful for institution-specific terms
   */
  static addCustomTerms(
    category:
      | "eponyms"
      | "conditions"
      | "medications"
      | "procedures"
      | "anatomical"
      | "acronyms"
      | "structure"
      | "labels"
      | "insurance"
      | "hospitals"
      | "geographic"
      | "never_names",
    terms: string[]
  ): void {
    const normalizedTerms = terms.map((t) => t.toLowerCase().trim());
    const targetSet = this.getCategorySet(category);
    normalizedTerms.forEach((t) => targetSet.add(t));
    this.cachedAllTerms = null; // Invalidate cache
  }

  private static getCategorySet(
    category: string
  ): Set<string> {
    switch (category) {
      case "eponyms":
        return MEDICAL_EPONYMS;
      case "conditions":
        return MEDICAL_CONDITIONS;
      case "medications":
        return MEDICATIONS;
      case "procedures":
        return PROCEDURES;
      case "anatomical":
        return ANATOMICAL_TERMS;
      case "acronyms":
        return CLINICAL_ACRONYMS;
      case "structure":
        return DOCUMENT_STRUCTURE;
      case "labels":
        return FIELD_LABELS;
      case "insurance":
        return INSURANCE_COMPANIES;
      case "hospitals":
        return HOSPITAL_NAMES;
      case "geographic":
        return GEOGRAPHIC_TERMS;
      case "never_names":
        return NEVER_NAME_WORDS;
      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }

  /**
   * Get all terms from all categories (for testing/debugging)
   */
  static getAllTerms(): Set<string> {
    if (this.cachedAllTerms) return this.cachedAllTerms;

    const allTerms = new Set<string>();
    const categories = [
      MEDICAL_EPONYMS,
      MEDICAL_CONDITIONS,
      MEDICATIONS,
      PROCEDURES,
      ANATOMICAL_TERMS,
      CLINICAL_ACRONYMS,
      DOCUMENT_STRUCTURE,
      FIELD_LABELS,
      INSURANCE_COMPANIES,
      HOSPITAL_NAMES,
      GEOGRAPHIC_TERMS,
      PROFESSIONAL_TITLES,
      NEVER_NAME_WORDS,
    ];

    for (const category of categories) {
      for (const term of category) {
        allTerms.add(term);
      }
    }

    this.cachedAllTerms = allTerms;
    return allTerms;
  }

  /**
   * Get statistics about the whitelist
   */
  static getStats(): Record<string, number> {
    return {
      medicalEponyms: MEDICAL_EPONYMS.size,
      medicalConditions: MEDICAL_CONDITIONS.size,
      medications: MEDICATIONS.size,
      procedures: PROCEDURES.size,
      anatomicalTerms: ANATOMICAL_TERMS.size,
      clinicalAcronyms: CLINICAL_ACRONYMS.size,
      documentStructure: DOCUMENT_STRUCTURE.size,
      fieldLabels: FIELD_LABELS.size,
      insuranceCompanies: INSURANCE_COMPANIES.size,
      hospitalNames: HOSPITAL_NAMES.size,
      geographicTerms: GEOGRAPHIC_TERMS.size,
      professionalTitles: PROFESSIONAL_TITLES.size,
      neverNameWords: NEVER_NAME_WORDS.size,
      total: this.getAllTerms().size,
    };
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick check if text should be whitelisted
 */
export function shouldWhitelist(
  text: string,
  filterType?: FilterType | string,
  context?: string
): boolean {
  return UnifiedMedicalWhitelist.shouldWhitelist(text, filterType, context);
}

/**
 * Get whitelist penalty for confidence scoring
 */
export function getWhitelistPenalty(text: string, context?: string): number {
  return UnifiedMedicalWhitelist.getWhitelistPenalty(text, context);
}

/**
 * Check if text is any medical term
 */
export function isMedicalTerm(text: string): boolean {
  return UnifiedMedicalWhitelist.isMedicalTerm(text);
}

/**
 * Check if text is non-PHI
 */
export function isNonPHI(text: string): boolean {
  return UnifiedMedicalWhitelist.isNonPHI(text);
}
