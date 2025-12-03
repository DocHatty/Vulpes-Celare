/**
 * COMPREHENSIVE 200-CASE PHI REDACTION ASSESSMENT
 * ============================================================================
 * Tests the Vulpes Celare engine with 200 authentic medical documents
 * containing real-world PHI patterns, OCR errors, and edge cases.
 * 
 * Metrics computed:
 * - Sensitivity (True Positive Rate) - % of PHI correctly redacted
 * - Specificity (True Negative Rate) - % of non-PHI correctly preserved  
 * - Precision (PPV) - % of redactions that were actual PHI
 * - F1 Score - Harmonic mean of precision and recall
 * - Per-filter breakdown
 * - Error tolerance analysis
 */

const path = require("path");
const fs = require("fs");

// Mock electron for testing
process.env.NODE_ENV = "test";
global.require = (moduleName) => {
  if (moduleName === "electron") {
    return {
      ipcRenderer: { invoke: () => Promise.resolve({}), send: () => {}, on: () => {} },
      app: { getPath: (type) => type === "userData" ? path.join(__dirname, "..", "userData") : __dirname, getName: () => "VulpesTest", getVersion: () => "1.0.0" },
    };
  }
  return require(moduleName);
};

// ============================================================================
// DATA GENERATION UTILITIES
// ============================================================================

// Comprehensive name databases
const FIRST_NAMES = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", 
  "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Lisa", "Daniel", "Nancy",
  "Matthew", "Betty", "Anthony", "Margaret", "Steven", "Kimberly", "Paul", "Emily",
  "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Dorothy", "Kevin", "Carol",
  "Brian", "Amanda", "George", "Melissa", "Timothy", "Deborah", "Philip", "Jean",
  "Bruce", "Sophia", "Gabriel", "Grace", "Yuki", "Wei", "Fatima", "Omar", "Raj", 
  "Chen", "Kim", "Singh", "Patel", "Khan", "Carlos", "Sofia", "Miguel", "Juan",
  "Mohammed", "Aaliyah", "Hiroshi", "Priya", "Vladimir", "Natasha", "Olga", "Ivan",
  "Yolanda", "Terrence", "Keisha", "DeShawn", "LaTonya", "Jamal", "Shaniqua",
  "Bartholomew", "Penelope", "Gertrude", "Wilfred", "Clementine", "Reginald"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Phillips", "Evans", "Turner",
  "Diaz", "Parker", "Cruz", "O'Brien", "O'Connor", "McDonald", "McCarthy",
  "Nakamura", "Tanaka", "Chen", "Wang", "Kumar", "Sharma", "Mueller", "Schmidt",
  "Van der Berg", "De la Cruz", "Al-Rashid", "Ben-David", "Kim", "Park", "Singh",
  "Patel", "Nguyen", "Tran", "Kowalski", "Johansson", "Fitzgerald", "McAllister",
  "St. James", "DuPont", "La Fontaine", "Dela Rosa", "Ibn Saud"
];

const MIDDLE_NAMES = ["Marie", "Ann", "Lee", "James", "Michael", "Elizabeth", "Rose", 
  "Lynn", "Grace", "Jean", "Paul", "John", "David", "Edward", "Thomas", "William",
  "Alexander", "Catherine", "Margaret", "Victoria", "Louise", "Francis", "Joseph"];

const TITLES = ["Dr.", "Mr.", "Mrs.", "Ms.", "Prof.", "Rev.", "Hon."];
const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "MD", "PhD", "DO", "RN", "NP", "PA-C", "FACS", "FACP"];

const CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
  "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth",
  "Columbus", "Indianapolis", "Charlotte", "San Francisco", "Seattle", "Denver", "Boston",
  "El Paso", "Nashville", "Detroit", "Oklahoma City", "Portland", "Las Vegas", "Memphis",
  "Louisville", "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento",
  "Kansas City", "Atlanta", "Miami", "Raleigh", "Omaha", "Minneapolis"];

const STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID",
  "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

const STREET_TYPES = ["Street", "Avenue", "Boulevard", "Drive", "Lane", "Road", "Way",
  "Place", "Court", "Circle", "Terrace", "Trail", "Parkway"];
const STREET_NAMES = ["Main", "Oak", "Maple", "Cedar", "Pine", "Elm", "Washington", "Park",
  "Lake", "Hill", "Forest", "River", "Spring", "Valley", "Meadow", "Sunset", "Highland",
  "Church", "School", "Mill", "Center", "North", "South", "East", "West"];

const DIAGNOSES = [
  "Hypertension", "Type 2 Diabetes Mellitus", "COPD", "Coronary Artery Disease",
  "Congestive Heart Failure", "Community-Acquired Pneumonia", "Asthma", "GERD",
  "Major Depressive Disorder", "Generalized Anxiety Disorder", "Chronic Kidney Disease",
  "Atrial Fibrillation", "Hypothyroidism", "Hyperlipidemia", "Osteoarthritis",
  "Rheumatoid Arthritis", "Chronic Low Back Pain", "Migraine", "Epilepsy",
  "Multiple Sclerosis", "Parkinson's Disease", "Alzheimer's Disease"
];

const PROCEDURES = ["CT Scan of Chest", "MRI of Brain", "X-Ray of Chest", "Abdominal Ultrasound",
  "Colonoscopy", "Echocardiogram", "Appendectomy", "Total Knee Replacement",
  "Coronary Angiography", "Upper GI Endoscopy", "Bronchoscopy", "Lumbar Puncture",
  "Cardiac Catheterization", "CABG", "Total Hip Arthroplasty", "Cholecystectomy",
  "Thyroidectomy", "Mastectomy", "Prostatectomy", "Hysterectomy"];

const MEDICATIONS = ["Lisinopril", "Metformin", "Atorvastatin", "Omeprazole", "Amlodipine",
  "Metoprolol", "Levothyroxine", "Gabapentin", "Hydrochlorothiazide", "Losartan",
  "Albuterol", "Fluticasone", "Sertraline", "Escitalopram", "Tramadol", "Oxycodone",
  "Prednisone", "Warfarin", "Clopidogrel", "Aspirin"];

const HOSPITALS = [
  "Memorial Hospital", "St. Mary's Medical Center", "University Hospital",
  "Regional Medical Center", "Community General Hospital", "Sacred Heart Hospital",
  "Presbyterian Hospital", "Baptist Medical Center", "Methodist Hospital",
  "Children's Hospital", "Veterans Affairs Medical Center", "County General Hospital",
  "Mount Sinai Hospital", "Johns Hopkins Hospital", "Mayo Clinic", "Cleveland Clinic",
  "Massachusetts General Hospital", "Cedars-Sinai Medical Center"
];

// ============================================================================
// ERROR SIMULATION (Realistic OCR/Typing Errors)
// ============================================================================

const OCR_SUBSTITUTIONS = {
  "O": ["0"], "0": ["O"], "I": ["1", "l", "|"], "1": ["I", "l", "|"], 
  "l": ["1", "I", "|"], "S": ["5", "$"], "5": ["S"], "B": ["8", "6"],
  "8": ["B"], "G": ["6"], "6": ["G"], "Z": ["2"], "2": ["Z"],
  "m": ["rn", "nn"], "rn": ["m"], "w": ["vv"], "D": ["O", "0"],
  "Q": ["O", "0"], "c": ["e"], "e": ["c"]
};

const TYPO_ADJACENTS = {
  "a": ["s", "q", "w", "z"], "b": ["v", "g", "h", "n"], "c": ["x", "d", "f", "v"],
  "d": ["s", "e", "r", "f", "c", "x"], "e": ["w", "r", "d", "s"],
  "f": ["d", "r", "t", "g", "v", "c"], "g": ["f", "t", "y", "h", "b", "v"],
  "h": ["g", "y", "u", "j", "n", "b"], "i": ["u", "o", "k", "j"],
  "j": ["h", "u", "i", "k", "m", "n"], "k": ["j", "i", "o", "l", "m"],
  "l": ["k", "o", "p"], "m": ["n", "j", "k"], "n": ["b", "h", "j", "m"],
  "o": ["i", "p", "l", "k"], "p": ["o", "l"], "q": ["w", "a"],
  "r": ["e", "t", "d", "f"], "s": ["a", "w", "e", "d", "x", "z"],
  "t": ["r", "y", "f", "g"], "u": ["y", "i", "h", "j"],
  "v": ["c", "f", "g", "b"], "w": ["q", "e", "a", "s"],
  "x": ["z", "s", "d", "c"], "y": ["t", "u", "g", "h"], "z": ["a", "s", "x"]
};

function applyOCRError(str, probability = 0.15) {
  if (Math.random() > probability) return str;
  return str.split("").map(c => {
    if (Math.random() < 0.12 && OCR_SUBSTITUTIONS[c]) {
      const subs = OCR_SUBSTITUTIONS[c];
      return subs[Math.floor(Math.random() * subs.length)];
    }
    return c;
  }).join("");
}

function applyTypo(str, probability = 0.2) {
  if (Math.random() > probability || str.length < 2) return str;
  const chars = str.split("");
  const idx = Math.floor(Math.random() * chars.length);
  const c = chars[idx].toLowerCase();
  if (TYPO_ADJACENTS[c]) {
    const adj = TYPO_ADJACENTS[c];
    const newChar = adj[Math.floor(Math.random() * adj.length)];
    chars[idx] = str[idx] === str[idx].toUpperCase() ? newChar.toUpperCase() : newChar;
  }
  return chars.join("");
}

function applyTransposition(str, probability = 0.1) {
  if (Math.random() > probability || str.length < 3) return str;
  const chars = str.split("");
  const idx = Math.floor(Math.random() * (chars.length - 1));
  [chars[idx], chars[idx + 1]] = [chars[idx + 1], chars[idx]];
  return chars.join("");
}

function applyDoubleLetterError(str, probability = 0.15) {
  if (Math.random() > probability) return str;
  const doubles = ["ll", "tt", "nn", "ss", "mm", "rr", "pp", "ff", "cc", "ee", "oo"];
  for (const d of doubles) {
    if (str.toLowerCase().includes(d) && Math.random() < 0.5) {
      return str.replace(new RegExp(d, "i"), d[0]);
    }
  }
  // Sometimes add double
  const vowels = ["a", "e", "i", "o", "u"];
  for (const v of vowels) {
    if (str.toLowerCase().includes(v) && Math.random() < 0.2) {
      return str.replace(new RegExp(v, "i"), v + v);
    }
  }
  return str;
}

function applyCaseVariation(str, probability = 0.25) {
  const v = Math.random();
  if (v > probability) return str;
  const variant = Math.random();
  if (variant < 0.35) return str.toUpperCase();
  if (variant < 0.6) return str.toLowerCase();
  if (variant < 0.85) {
    return str.split("").map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join("");
  }
  return str[0].toLowerCase() + str.slice(1);
}

function applySpacingError(str, probability = 0.12) {
  if (Math.random() > probability) return str;
  const words = str.split(" ");
  if (words.length >= 2 && Math.random() < 0.5) {
    // Merge words
    const idx = Math.floor(Math.random() * (words.length - 1));
    words[idx] = words[idx] + words[idx + 1];
    words.splice(idx + 1, 1);
  } else if (words.length > 0) {
    // Split word
    const idx = Math.floor(Math.random() * words.length);
    if (words[idx].length > 4) {
      const sp = Math.floor(words[idx].length / 2);
      words[idx] = words[idx].slice(0, sp) + " " + words[idx].slice(sp);
    }
  }
  return words.join(" ");
}

function messUpValue(value, errorLevel = "medium") {
  const probs = {
    low: { ocr: 0.08, typo: 0.1, trans: 0.05, double: 0.08, case: 0.12, space: 0.05 },
    medium: { ocr: 0.18, typo: 0.22, trans: 0.12, double: 0.18, case: 0.25, space: 0.12 },
    high: { ocr: 0.35, typo: 0.4, trans: 0.25, double: 0.3, case: 0.4, space: 0.2 }
  };
  const p = probs[errorLevel] || probs.medium;
  
  let result = value;
  result = applyOCRError(result, p.ocr);
  result = applyTypo(result, p.typo);
  result = applyTransposition(result, p.trans);
  result = applyDoubleLetterError(result, p.double);
  result = applyCaseVariation(result, p.case);
  result = applySpacingError(result, p.space);
  return result;
}

// ============================================================================
// DATA GENERATORS
// ============================================================================

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateSSN(applyErrors = true, errorLevel = "medium") {
  const area = String(randomInt(100, 899)).padStart(3, "0");
  const group = String(randomInt(10, 99));
  const serial = String(randomInt(1000, 9999));
  const formats = [
    `${area}-${group}-${serial}`,
    `${area} ${group} ${serial}`,
    `${area}${group}${serial}`
  ];
  const ssn = random(formats);
  return applyErrors ? messUpValue(ssn, errorLevel) : ssn;
}

function generateMRN(applyErrors = true, errorLevel = "medium") {
  const prefixes = ["MRN", "PAT", "PT", "MED", ""];
  const prefix = random(prefixes);
  const year = randomInt(2018, 2024);
  const num = randomInt(10000, 999999);
  const formats = prefix ? [
    `${prefix}-${year}-${num}`,
    `${prefix}${num}`,
    `${prefix}-${num}`
  ] : [
    String(num),
    `${year}${num}`
  ];
  const mrn = random(formats);
  return applyErrors ? messUpValue(mrn, errorLevel) : mrn;
}

function generatePhone(applyErrors = true, errorLevel = "medium") {
  const area = String(randomInt(201, 989));
  const exchange = String(randomInt(200, 999));
  const subscriber = String(randomInt(1000, 9999));
  const formats = [
    `(${area}) ${exchange}-${subscriber}`,
    `${area}-${exchange}-${subscriber}`,
    `${area}.${exchange}.${subscriber}`,
    `${area}${exchange}${subscriber}`,
    `+1 ${area}-${exchange}-${subscriber}`,
    `1-${area}-${exchange}-${subscriber}`
  ];
  const phone = random(formats);
  return applyErrors ? messUpValue(phone, errorLevel) : phone;
}

function generateFax(applyErrors = true, errorLevel = "medium") {
  const phone = generatePhone(false);
  const fax = random([`Fax: ${phone}`, `FAX ${phone}`, `F: ${phone}`]);
  return applyErrors ? messUpValue(fax, errorLevel) : fax;
}

function generateEmail(first, last) {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com",
    "icloud.com", "mail.com", "protonmail.com"];
  const patterns = [
    `${first.toLowerCase()}.${last.toLowerCase()}@${random(domains)}`,
    `${first.toLowerCase()}${last.toLowerCase()}@${random(domains)}`,
    `${first[0].toLowerCase()}${last.toLowerCase()}@${random(domains)}`,
    `${first.toLowerCase()}_${last.toLowerCase()}@${random(domains)}`,
    `${last.toLowerCase()}.${first.toLowerCase()}@${random(domains)}`
  ];
  return random(patterns);
}

function generateDate(yearMin = 2020, yearMax = 2024, applyErrors = true, errorLevel = "medium") {
  const month = String(randomInt(1, 12)).padStart(2, "0");
  const day = String(randomInt(1, 28)).padStart(2, "0");
  const year = randomInt(yearMin, yearMax);
  const formats = [
    `${month}/${day}/${year}`,
    `${month}-${day}-${year}`,
    `${year}-${month}-${day}`,
    `${month}/${day}/${String(year).slice(-2)}`,
    `${parseInt(month)}/${parseInt(day)}/${year}`
  ];
  const date = random(formats);
  return applyErrors ? messUpValue(date, errorLevel) : date;
}

function generateDOB(applyErrors = true, errorLevel = "medium") {
  return generateDate(1935, 2010, applyErrors, errorLevel);
}

function generateAddress() {
  const num = randomInt(1, 9999);
  const street = `${random(STREET_NAMES)} ${random(STREET_TYPES)}`;
  const apt = Math.random() < 0.3 ? `, Apt ${randomInt(1, 500)}` : "";
  const city = random(CITIES);
  const state = random(STATES);
  const zip = String(randomInt(10000, 99999));
  return {
    street: `${num} ${street}${apt}`,
    city,
    state,
    zip,
    full: `${num} ${street}${apt}, ${city}, ${state} ${zip}`
  };
}

function generateNPI() {
  return String(randomInt(1000000000, 9999999999));
}

function generateDEA() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const prefix = letters[randomInt(0, letters.length - 1)] + letters[randomInt(0, letters.length - 1)];
  return prefix + String(randomInt(1000000, 9999999));
}

function generateIP() {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

function generateURL() {
  const domains = ["patient-portal", "health-records", "myhealth", "medportal"];
  const tlds = [".com", ".org", ".net", ".health"];
  return `https://${random(domains)}${random(tlds)}/patient/${randomInt(10000, 99999)}`;
}

function generateCreditCard() {
  const prefixes = ["4", "5", "37", "6011"];
  const prefix = random(prefixes);
  let num = prefix;
  while (num.length < 16) num += randomInt(0, 9);
  const formats = [
    num,
    `${num.slice(0,4)}-${num.slice(4,8)}-${num.slice(8,12)}-${num.slice(12)}`,
    `${num.slice(0,4)} ${num.slice(4,8)} ${num.slice(8,12)} ${num.slice(12)}`
  ];
  return random(formats);
}

function generateVIN() {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let vin = "";
  for (let i = 0; i < 17; i++) vin += chars[randomInt(0, chars.length - 1)];
  return vin;
}

function generateLicensePlate() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const formats = [
    () => `${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}-${randomInt(1000, 9999)}`,
    () => `${randomInt(100, 999)} ${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}`,
    () => `${randomInt(1, 9)}${letters[randomInt(0, 25)]}${letters[randomInt(0, 25)]}${randomInt(100, 999)}`
  ];
  return random(formats)();
}

function generateAge() {
  return randomInt(18, 95);
}

function generateName(format = "random", errorLevel = "medium") {
  const first = random(FIRST_NAMES);
  const middle = random(MIDDLE_NAMES);
  const last = random(LAST_NAMES);
  const title = random(TITLES);
  const suffix = random(SUFFIXES);
  
  const formats = {
    first_last: `${first} ${last}`,
    first_middle_last: `${first} ${middle} ${last}`,
    last_first: `${last}, ${first}`,
    last_first_middle: `${last}, ${first} ${middle}`,
    titled: `${title} ${first} ${last}`,
    titled_last: `${title} ${last}`,
    with_suffix: `${first} ${last}, ${suffix}`,
    full_suffix: `${first} ${middle} ${last}, ${suffix}`,
    all_caps: `${first.toUpperCase()} ${last.toUpperCase()}`,
    all_caps_last_first: `${last.toUpperCase()}, ${first.toUpperCase()}`,
    all_caps_full: `${last.toUpperCase()}, ${first.toUpperCase()} ${middle.toUpperCase()}`
  };
  
  const formatKeys = Object.keys(formats);
  if (format === "random") format = formatKeys[randomInt(0, formatKeys.length - 1)];
  
  const clean = formats[format] || formats.first_last;
  const messy = messUpValue(clean, errorLevel);
  
  return {
    first, middle, last, clean, formatted: messy,
    hasErrors: clean !== messy
  };
}

// ============================================================================
// DOCUMENT GENERATORS - 10 TYPES
// ============================================================================

function generateRadiologyReport(id, errorLevel) {
  const patient = generateName("random", errorLevel);
  const orderingPhysician = generateName("titled", errorLevel);
  const radiologist = generateName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const examDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const accession = `ACC-${randomInt(100000, 999999)}`;
  const procedure = random(PROCEDURES.filter(p => ["CT", "MRI", "X-Ray", "Ultrasound"].some(t => p.includes(t))));
  const hospital = random(HOSPITALS);
  
  const content = `
${hospital}
RADIOLOGY REPORT

PATIENT: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
ACCESSION #: ${accession}
EXAM DATE: ${examDate}

PROCEDURE: ${procedure}
ORDERING PHYSICIAN: ${orderingPhysician.formatted}
PHONE: ${phone}

CLINICAL HISTORY:
Patient presents with ${random(DIAGNOSES)}. ${random(["Evaluate for acute changes.", "Rule out malignancy.", "Follow-up imaging.", "New symptoms reported."])}

TECHNIQUE:
${procedure} performed per standard protocol. ${Math.random() > 0.5 ? "IV contrast administered." : "No contrast."}

COMPARISON:
${Math.random() > 0.5 ? `Prior study dated ${generateDate(2022, 2023, true, errorLevel)}.` : "No prior studies available for comparison."}

FINDINGS:
${random([
  "No acute cardiopulmonary abnormality identified.",
  "Findings are consistent with the clinical history of " + random(DIAGNOSES) + ".",
  "Mild degenerative changes noted. No acute findings.",
  "Stable appearance compared to prior examination.",
  "Small pleural effusion noted. Consider clinical correlation."
])}

IMPRESSION:
${random([
  "1. Normal study. No acute abnormality.",
  "1. Findings consistent with clinical history.\n2. No acute process identified.",
  "1. Stable examination.\n2. Recommend follow-up as clinically indicated."
])}

Electronically signed by: ${radiologist.formatted}, MD
${examDate}
`.trim();

  return {
    id,
    type: "Radiology Report",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: orderingPhysician.clean, actual: orderingPhysician.formatted, hasErrors: orderingPhysician.hasErrors },
      { type: "NAME", value: radiologist.clean, actual: radiologist.formatted, hasErrors: radiologist.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: examDate, category: "EXAM_DATE" },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone },
      { type: "HOSPITAL", value: hospital }
    ],
    expectedNonPHI: [
      { type: "PROCEDURE", value: procedure },
      { type: "MEDICAL_TERM", value: random(DIAGNOSES) }
    ]
  };
}

function generateLabReport(id, errorLevel) {
  const patient = generateName("last_first_middle", errorLevel);
  const orderingDoc = generateName("titled", errorLevel);
  const labDirector = generateName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const collectionDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const npi = generateNPI();
  const phone = generatePhone(true, errorLevel);
  const ssn = generateSSN(true, errorLevel);
  const hospital = random(HOSPITALS);
  
  const content = `
${hospital}
CLINICAL LABORATORY REPORT

PATIENT INFORMATION
Name: ${patient.formatted}
Patient ID: ${mrn}
SSN: ${ssn}
Date of Birth: ${dob}

SPECIMEN INFORMATION
Collection Date: ${collectionDate}
Specimen Type: ${random(["Serum", "Whole Blood", "Plasma", "Urine"])}
Fasting: ${random(["Yes", "No", "Unknown"])}

ORDERING PHYSICIAN
${orderingDoc.formatted}
NPI: ${npi}
Phone: ${phone}

TEST RESULTS
==================================================
Complete Blood Count (CBC)
--------------------------------------------------
Test                Result      Reference Range
WBC                 ${(Math.random() * 10 + 4).toFixed(1)}         4.5-11.0 x10^9/L
RBC                 ${(Math.random() * 2 + 4).toFixed(2)}         4.0-5.5 x10^12/L
Hemoglobin          ${(Math.random() * 5 + 12).toFixed(1)}         12.0-17.5 g/dL
Hematocrit          ${(Math.random() * 15 + 36).toFixed(1)}         36-50%
Platelets           ${randomInt(150, 400)}          150-400 x10^9/L

Comprehensive Metabolic Panel
--------------------------------------------------
Glucose             ${randomInt(70, 200)}           70-100 mg/dL
BUN                 ${randomInt(7, 30)}            7-20 mg/dL
Creatinine          ${(Math.random() * 1.5 + 0.6).toFixed(2)}         0.7-1.3 mg/dL
Sodium              ${randomInt(135, 148)}          136-145 mEq/L
Potassium           ${(Math.random() * 2 + 3.5).toFixed(1)}         3.5-5.0 mEq/L

LABORATORY DIRECTOR
${labDirector.formatted}, MD, PhD

Report generated: ${collectionDate}
`.trim();

  return {
    id,
    type: "Lab Report",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: orderingDoc.clean, actual: orderingDoc.formatted, hasErrors: orderingDoc.hasErrors },
      { type: "NAME", value: labDirector.clean, actual: labDirector.formatted, hasErrors: labDirector.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: collectionDate, category: "COLLECTION_DATE" },
      { type: "MRN", value: mrn },
      { type: "NPI", value: npi },
      { type: "PHONE", value: phone },
      { type: "SSN", value: ssn },
      { type: "HOSPITAL", value: hospital }
    ],
    expectedNonPHI: []
  };
}

function generateProgressNote(id, errorLevel) {
  const patient = generateName("first_middle_last", errorLevel);
  const patientRef = generateName("titled_last", errorLevel);
  const provider = generateName("titled", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const visitDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const address = generateAddress();
  const phone = generatePhone(true, errorLevel);
  const email = generateEmail(patient.first, patient.last);
  const age = generateAge();
  const diagnosis = random(DIAGNOSES);
  const hospital = random(HOSPITALS);
  
  const content = `
${hospital}
OUTPATIENT PROGRESS NOTE

Patient: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Age: ${age} years
Date of Visit: ${visitDate}
Provider: ${provider.formatted}

CHIEF COMPLAINT:
${random(["Follow-up for chronic conditions", "New onset chest pain", "Medication refill", "Annual wellness visit", "Shortness of breath", "Abdominal pain"])}

HISTORY OF PRESENT ILLNESS:
${patientRef.formatted} is a ${age}-year-old ${random(["male", "female"])} with a history of ${diagnosis} who presents today for ${random(["routine follow-up", "new symptoms", "medication management", "post-procedure evaluation"])}.

Patient reports ${random(["symptoms are well controlled", "intermittent symptoms", "worsening symptoms", "no new complaints"])}. ${random(["Denies fever, chills, or weight loss.", "Reports occasional fatigue.", "Notes improved energy levels.", "Compliance with medications has been good."])}

Patient Contact Information:
Address: ${address.full}
Phone: ${phone}
Email: ${email}

PHYSICAL EXAMINATION:
Vitals: BP ${randomInt(100, 160)}/${randomInt(60, 100)}, HR ${randomInt(55, 100)}, Temp ${(Math.random() * 2 + 97).toFixed(1)}F, SpO2 ${randomInt(94, 100)}%
General: ${random(["Well-appearing", "No acute distress", "Alert and oriented"])}
${random(["Lungs: Clear to auscultation bilaterally", "Heart: Regular rate and rhythm, no murmurs", "Abdomen: Soft, non-tender"])}

ASSESSMENT/PLAN:
1. ${diagnosis} - ${random(["stable on current regimen", "adjust medications as below", "continue current management"])}
2. ${random(["Preventive care up to date", "Schedule follow-up labs", "Continue lifestyle modifications"])}
3. Return to clinic in ${randomInt(2, 12)} weeks

Electronically signed by ${provider.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD
${visitDate}
`.trim();

  return {
    id,
    type: "Progress Note",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
      { type: "NAME", value: provider.clean, actual: provider.formatted, hasErrors: provider.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: visitDate, category: "VISIT_DATE" },
      { type: "MRN", value: mrn },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "PHONE", value: phone },
      { type: "EMAIL", value: email },
      { type: "AGE", value: String(age) },
      { type: "HOSPITAL", value: hospital }
    ],
    expectedNonPHI: [
      { type: "DIAGNOSIS", value: diagnosis }
    ]
  };
}

function generateEmergencyNote(id, errorLevel) {
  const patient = generateName("all_caps_last_first", errorLevel);
  const emergencyContact = generateName("first_last", errorLevel);
  const attending = generateName("titled", errorLevel);
  const resident = generateName("titled", errorLevel);
  const nurse = generateName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const arrivalTime = generateDate(2023, 2024, true, errorLevel);
  const mrn = `ED-${randomInt(2023, 2024)}${randomInt(10000, 99999)}`;
  const ssn = generateSSN(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const address = generateAddress();
  const hospital = random(HOSPITALS);
  
  const content = `
${hospital}
EMERGENCY DEPARTMENT NOTE

PATIENT IDENTIFICATION
Name: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
SSN: ${ssn}
Address: ${address.full}

ARRIVAL INFORMATION
Date/Time: ${arrivalTime}
Mode of Arrival: ${random(["Ambulance", "Walk-in", "Private vehicle", "Police custody"])}
Acuity: ${random(["Level 1 - Resuscitation", "Level 2 - Emergent", "Level 3 - Urgent", "Level 4 - Less Urgent", "Level 5 - Non-urgent"])}

EMERGENCY CONTACT
Name: ${emergencyContact.formatted}
Relationship: ${random(["Spouse", "Parent", "Child", "Sibling", "Friend"])}
Phone: ${phone}

CARE TEAM
Attending Physician: ${attending.formatted}
Resident Physician: ${resident.formatted}
Primary Nurse: ${nurse.formatted}, RN

CHIEF COMPLAINT:
${random(["Severe chest pain", "Shortness of breath", "Abdominal pain", "Trauma - MVA", "Altered mental status", "Syncope", "Severe headache"])}

HISTORY OF PRESENT ILLNESS:
Patient is a ${randomInt(18, 90)}-year-old ${random(["male", "female"])} presenting with ${random(["acute onset", "progressive", "intermittent"])} symptoms. ${random(["Onset approximately " + randomInt(1, 72) + " hours ago.", "Symptoms started suddenly.", "Gradual worsening over past few days."])}

PAST MEDICAL HISTORY:
${random(DIAGNOSES)}, ${random(DIAGNOSES)}

MEDICATIONS:
${random(MEDICATIONS)} ${randomInt(5, 100)}mg daily
${random(MEDICATIONS)} ${randomInt(5, 50)}mg twice daily

PHYSICAL EXAM:
VS: BP ${randomInt(80, 200)}/${randomInt(40, 120)}, HR ${randomInt(40, 150)}, RR ${randomInt(12, 30)}, Temp ${(Math.random() * 4 + 96).toFixed(1)}F, SpO2 ${randomInt(85, 100)}%
General: ${random(["Acutely ill-appearing", "Moderate distress", "Stable condition"])}

ED COURSE:
${random(["IV access obtained", "Labs drawn", "Imaging ordered", "Specialist consulted"])}

DISPOSITION:
${random(["Admitted to Medicine", "Admitted to ICU", "Discharged home", "Transferred to higher level of care", "Observation unit"])}

Attending Signature: ${attending.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD
Time: ${arrivalTime}
`.trim();

  return {
    id,
    type: "Emergency Note",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: emergencyContact.clean, actual: emergencyContact.formatted, hasErrors: emergencyContact.hasErrors },
      { type: "NAME", value: attending.clean, actual: attending.formatted, hasErrors: attending.hasErrors },
      { type: "NAME", value: resident.clean, actual: resident.formatted, hasErrors: resident.hasErrors },
      { type: "NAME", value: nurse.clean, actual: nurse.formatted, hasErrors: nurse.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: arrivalTime, category: "ARRIVAL" },
      { type: "MRN", value: mrn },
      { type: "SSN", value: ssn },
      { type: "PHONE", value: phone },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "HOSPITAL", value: hospital }
    ],
    expectedNonPHI: []
  };
}

function generateDischargeSummary(id, errorLevel) {
  const patient = generateName("last_first", errorLevel);
  const patientRef = generateName("titled_last", errorLevel);
  const attending = generateName("titled", errorLevel);
  const pcp = generateName("titled", errorLevel);
  const consultant = generateName("titled", errorLevel);
  const familyContact = generateName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const admitDate = generateDate(2023, 2024, true, errorLevel);
  const dischargeDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const phone1 = generatePhone(true, errorLevel);
  const phone2 = generatePhone(true, errorLevel);
  const hospital = random(HOSPITALS);
  
  const content = `
${hospital}
DISCHARGE SUMMARY

PATIENT: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}

DATES OF SERVICE
Admission Date: ${admitDate}
Discharge Date: ${dischargeDate}
Length of Stay: ${randomInt(1, 14)} days

ATTENDING PHYSICIAN: ${attending.formatted}
CONSULTING PHYSICIAN: ${consultant.formatted}

PRINCIPAL DIAGNOSIS:
${random(DIAGNOSES)}

SECONDARY DIAGNOSES:
1. ${random(DIAGNOSES)}
2. ${random(DIAGNOSES)}

PROCEDURES PERFORMED:
1. ${random(PROCEDURES)}

HOSPITAL COURSE:
${patientRef.formatted} was admitted with ${random(["acute exacerbation", "new onset", "worsening"])} of ${random(DIAGNOSES)}. Initial workup revealed ${random(["elevated inflammatory markers", "abnormal imaging findings", "concerning lab values"])}. Patient was started on ${random(["IV antibiotics", "anticoagulation", "supportive care", "aggressive fluid resuscitation"])}.

Hospital course was ${random(["uncomplicated", "complicated by " + random(["hospital-acquired infection", "acute kidney injury", "delirium"]), "prolonged due to social issues"])}. Patient showed ${random(["steady improvement", "gradual recovery", "good response to treatment"])}.

DISCHARGE MEDICATIONS:
1. ${random(MEDICATIONS)} ${randomInt(5, 100)}mg ${random(["daily", "twice daily", "three times daily"])}
2. ${random(MEDICATIONS)} ${randomInt(5, 50)}mg ${random(["daily", "at bedtime", "as needed"])}
3. ${random(MEDICATIONS)} ${randomInt(5, 200)}mg ${random(["daily", "twice daily"])}

DISCHARGE INSTRUCTIONS:
- Activity: ${random(["No restrictions", "Light activity only", "Bed rest with bathroom privileges"])}
- Diet: ${random(["Regular", "Low sodium", "Diabetic diet", "Cardiac diet"])}
- Follow-up: See PCP within ${randomInt(3, 14)} days

FOLLOW-UP APPOINTMENTS:
Primary Care: ${pcp.formatted}
Phone: ${phone1}

EMERGENCY CONTACT:
${familyContact.formatted}
Phone: ${phone2}

Dictated by: ${attending.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD
${dischargeDate}
`.trim();

  return {
    id,
    type: "Discharge Summary",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
      { type: "NAME", value: attending.clean, actual: attending.formatted, hasErrors: attending.hasErrors },
      { type: "NAME", value: consultant.clean, actual: consultant.formatted, hasErrors: consultant.hasErrors },
      { type: "NAME", value: pcp.clean, actual: pcp.formatted, hasErrors: pcp.hasErrors },
      { type: "NAME", value: familyContact.clean, actual: familyContact.formatted, hasErrors: familyContact.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: admitDate, category: "ADMIT" },
      { type: "DATE", value: dischargeDate, category: "DISCHARGE" },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone1 },
      { type: "PHONE", value: phone2 },
      { type: "HOSPITAL", value: hospital }
    ],
    expectedNonPHI: []
  };
}

function generateOperativeReport(id, errorLevel) {
  const patient = generateName("all_caps_last_first", errorLevel);
  const surgeon = generateName("titled", errorLevel);
  const assistant = generateName("titled", errorLevel);
  const anesthesiologist = generateName("titled", errorLevel);
  const circulatingNurse = generateName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const surgeryDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const procedure = random(PROCEDURES.filter(p => !["CT", "MRI", "X-Ray", "Ultrasound", "EKG"].some(t => p.includes(t))));
  const hospital = random(HOSPITALS);
  
  const content = `
${hospital}
OPERATIVE REPORT

PATIENT NAME: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
DATE OF SURGERY: ${surgeryDate}

SURGICAL TEAM:
Surgeon: ${surgeon.formatted}, FACS
First Assistant: ${assistant.formatted}
Anesthesiologist: ${anesthesiologist.formatted}
Circulating Nurse: ${circulatingNurse.formatted}, RN

PREOPERATIVE DIAGNOSIS:
${random(DIAGNOSES)}

POSTOPERATIVE DIAGNOSIS:
${random(DIAGNOSES)}

PROCEDURE PERFORMED:
${procedure}

ANESTHESIA:
${random(["General endotracheal", "Spinal", "Regional block", "MAC sedation"])}

ESTIMATED BLOOD LOSS:
${randomInt(5, 500)} mL

SPECIMENS:
${random(["Sent to pathology", "None", "Tissue sample for culture", "Lymph nodes for biopsy"])}

DRAINS:
${random(["None", "Jackson-Pratt drain placed", "Foley catheter", "Chest tube"])}

INDICATIONS:
Patient with ${random(DIAGNOSES)} requiring surgical intervention.

DESCRIPTION OF PROCEDURE:
After proper identification and informed consent, patient was brought to the operating room and placed in ${random(["supine", "lateral decubitus", "prone", "lithotomy"])} position. ${random(["General anesthesia was induced", "Regional block was placed", "MAC sedation initiated"])} without complication.

The surgical site was prepped and draped in sterile fashion. ${random(["A midline incision was made", "Laparoscopic ports were placed", "Standard approach was utilized"])}. ${random(["Dissection proceeded without incident", "Careful hemostasis was maintained throughout", "All structures were clearly visualized"])}.

${random(["The procedure was completed without complication", "Excellent hemostasis was achieved", "All counts were correct at the end of the procedure"])}. Patient was transferred to recovery in stable condition.

COMPLICATIONS:
${random(["None", "Minimal bleeding controlled with electrocautery", "None - routine case"])}

DISPOSITION:
${random(["PACU in stable condition", "ICU for monitoring", "Same day surgery unit"])}

Electronically signed:
${surgeon.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD, FACS
${surgeryDate}
`.trim();

  return {
    id,
    type: "Operative Report",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: surgeon.clean, actual: surgeon.formatted, hasErrors: surgeon.hasErrors },
      { type: "NAME", value: assistant.clean, actual: assistant.formatted, hasErrors: assistant.hasErrors },
      { type: "NAME", value: anesthesiologist.clean, actual: anesthesiologist.formatted, hasErrors: anesthesiologist.hasErrors },
      { type: "NAME", value: circulatingNurse.clean, actual: circulatingNurse.formatted, hasErrors: circulatingNurse.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: surgeryDate, category: "SURGERY_DATE" },
      { type: "MRN", value: mrn },
      { type: "HOSPITAL", value: hospital }
    ],
    expectedNonPHI: [
      { type: "PROCEDURE", value: procedure }
    ]
  };
}

function generatePrescription(id, errorLevel) {
  const patient = generateName("last_first_middle", errorLevel);
  const prescriber = generateName("titled", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const rxDate = generateDate(2023, 2024, true, errorLevel);
  const address = generateAddress();
  const phone = generatePhone(true, errorLevel);
  const dea = generateDEA();
  const npi = generateNPI();
  const medication = random(MEDICATIONS);
  
  const content = `
PRESCRIPTION

DATE: ${rxDate}

PATIENT INFORMATION:
Name: ${patient.formatted}
DOB: ${dob}
Address: ${address.full}
Phone: ${phone}

PRESCRIBER INFORMATION:
${prescriber.formatted}
DEA #: ${dea}
NPI: ${npi}
Phone: ${generatePhone(false)}

Rx: ${medication} ${randomInt(5, 100)}mg tablets

Sig: Take ${random(["one", "two", "one-half"])} tablet(s) by mouth ${random(["once daily", "twice daily", "three times daily", "every 8 hours", "at bedtime", "as needed for pain"])}

Disp: ${randomInt(30, 90)} tablets
Refills: ${randomInt(0, 11)} ${Math.random() > 0.5 ? "(No refills)" : ""}

${random(["Brand medically necessary", "Generic substitution permitted", "Dispense as written"])}

${Math.random() > 0.7 ? "CAUTION: May cause drowsiness" : ""}

Prescriber Signature: _______________________
${prescriber.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD

Date: ${rxDate}
`.trim();

  return {
    id,
    type: "Prescription",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: prescriber.clean, actual: prescriber.formatted, hasErrors: prescriber.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: rxDate, category: "RX_DATE" },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "PHONE", value: phone },
      { type: "DEA", value: dea },
      { type: "NPI", value: npi }
    ],
    expectedNonPHI: [
      { type: "MEDICATION", value: medication }
    ]
  };
}

function generateConsultationNote(id, errorLevel) {
  const patient = generateName("all_caps_full", errorLevel);
  const patientRef = generateName("titled_last", errorLevel);
  const requesting = generateName("titled", errorLevel);
  const consulting = generateName("titled", errorLevel);
  const familyMember = generateName("first_last", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const consultDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const email = generateEmail(patient.first, patient.last);
  const age = generateAge();
  const hospital = random(HOSPITALS);
  
  const content = `
${hospital}
CONSULTATION NOTE

RE: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
DATE OF CONSULTATION: ${consultDate}

Requesting Physician: ${requesting.formatted}
Consulting Physician: ${consulting.formatted}
Specialty: ${random(["Cardiology", "Pulmonology", "Gastroenterology", "Neurology", "Oncology", "Nephrology", "Infectious Disease", "Rheumatology"])}

REASON FOR CONSULTATION:
${random(["Evaluation and management of " + random(DIAGNOSES), "Pre-operative cardiac clearance", "Unexplained symptoms requiring specialist input", "Second opinion requested"])}

HISTORY OF PRESENT ILLNESS:
Thank you for this consultation. ${patientRef.formatted} is a ${age}-year-old ${random(["male", "female"])} with a history of ${random(DIAGNOSES)} and ${random(DIAGNOSES)} who was referred for ${random(["further evaluation", "specialist management", "diagnostic workup"])}.

The patient reports ${random(["symptoms for the past " + randomInt(1, 12) + " weeks", "gradual onset of symptoms", "acute presentation"])}. Current medications include ${random(MEDICATIONS)} and ${random(MEDICATIONS)}.

Family contact for medical decisions: ${familyMember.formatted}
Contact: ${phone}
Email: ${email}

PHYSICAL EXAMINATION:
Vitals: Stable
General: ${random(["Well-appearing", "Mildly ill-appearing", "Comfortable at rest"])}
${random(["Cardiovascular: Regular rate and rhythm, no murmurs", "Pulmonary: Clear bilaterally", "Neurological: Alert, oriented, no focal deficits"])}

ASSESSMENT:
${age}-year-old with ${random(DIAGNOSES)}. ${random(["Likely etiology is...", "Differential includes...", "Most consistent with..."])}

RECOMMENDATIONS:
1. ${random(["Initiate " + random(MEDICATIONS), "Continue current management", "Obtain additional imaging"])}
2. ${random(["Consider " + random(PROCEDURES), "Lifestyle modifications", "Close follow-up"])}
3. Follow up with our office in ${randomInt(1, 4)} weeks

Thank you for this consultation. Please contact us with any questions.

${consulting.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD
${consultDate}
`.trim();

  return {
    id,
    type: "Consultation Note",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
      { type: "NAME", value: requesting.clean, actual: requesting.formatted, hasErrors: requesting.hasErrors },
      { type: "NAME", value: consulting.clean, actual: consulting.formatted, hasErrors: consulting.hasErrors },
      { type: "NAME", value: familyMember.clean, actual: familyMember.formatted, hasErrors: familyMember.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: consultDate, category: "CONSULT_DATE" },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone },
      { type: "EMAIL", value: email },
      { type: "AGE", value: String(age) },
      { type: "HOSPITAL", value: hospital }
    ],
    expectedNonPHI: []
  };
}

function generateNursingAssessment(id, errorLevel) {
  const patient = generateName("all_caps_full", errorLevel);
  const primaryNurse = generateName("first_last", errorLevel);
  const chargeNurse = generateName("first_last", errorLevel);
  const emergencyContact1 = generateName("first_last", errorLevel);
  const emergencyContact2 = generateName("with_suffix", errorLevel);
  const pcp = generateName("titled", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const admitDate = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const phone1 = generatePhone(true, errorLevel);
  const phone2 = generatePhone(true, errorLevel);
  const phone3 = generatePhone(true, errorLevel);
  const hospital = random(HOSPITALS);
  
  const content = `
${hospital}
NURSING ADMISSION ASSESSMENT

PATIENT INFORMATION
Name: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Admission Date: ${admitDate}
Room: ${randomInt(100, 999)}${random(["A", "B", ""])}
Bed: ${randomInt(1, 4)}

NURSING STAFF
Primary Nurse: ${primaryNurse.formatted}, RN
Charge Nurse: ${chargeNurse.formatted}, RN

EMERGENCY CONTACTS
1. ${emergencyContact1.formatted}
   Relationship: ${random(["Spouse", "Partner", "Parent"])}
   Phone: ${phone1}
   
2. ${emergencyContact2.formatted}
   Relationship: ${random(["Son", "Daughter", "Sibling"])}
   Phone: ${phone2}

PRIMARY CARE PHYSICIAN
${pcp.formatted}
Phone: ${phone3}

ADMISSION VITAL SIGNS
Blood Pressure: ${randomInt(90, 180)}/${randomInt(50, 110)} mmHg
Heart Rate: ${randomInt(50, 120)} bpm
Respiratory Rate: ${randomInt(12, 28)} breaths/min
Temperature: ${(Math.random() * 3 + 97).toFixed(1)}°F
SpO2: ${randomInt(90, 100)}% on ${random(["room air", "2L NC", "4L NC", "NRB mask"])}
Pain Scale: ${randomInt(0, 10)}/10

ALLERGIES
${random(["NKDA", "Penicillin - rash", "Sulfa drugs - hives", "Morphine - nausea", "Iodine contrast - anaphylaxis"])}

FALL RISK ASSESSMENT
Morse Fall Scale Score: ${randomInt(0, 125)}
Risk Level: ${random(["Low", "Moderate", "High"])}

SKIN ASSESSMENT
Braden Scale Score: ${randomInt(6, 23)}
Pressure Injury Risk: ${random(["No risk", "Mild risk", "Moderate risk", "High risk"])}
Skin Integrity: ${random(["Intact", "Pressure ulcer present - stage " + randomInt(1, 4), "Surgical incision healing"])}

FUNCTIONAL STATUS
Mobility: ${random(["Independent", "Requires assistance", "Bedbound", "Wheelchair dependent"])}
ADLs: ${random(["Independent", "Partial assistance", "Total care required"])}

ASSESSMENT NOTES:
Patient ${random(["oriented x3", "alert and cooperative", "slightly confused but redirectable"])}. ${random(["IV access established", "Foley catheter in place", "No invasive lines"])}. Plan of care discussed with patient and family.

Assessment completed by: ${primaryNurse.formatted}, RN
Date/Time: ${admitDate}
`.trim();

  return {
    id,
    type: "Nursing Assessment",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: primaryNurse.clean, actual: primaryNurse.formatted, hasErrors: primaryNurse.hasErrors },
      { type: "NAME", value: chargeNurse.clean, actual: chargeNurse.formatted, hasErrors: chargeNurse.hasErrors },
      { type: "NAME", value: emergencyContact1.clean, actual: emergencyContact1.formatted, hasErrors: emergencyContact1.hasErrors },
      { type: "NAME", value: emergencyContact2.clean, actual: emergencyContact2.formatted, hasErrors: emergencyContact2.hasErrors },
      { type: "NAME", value: pcp.clean, actual: pcp.formatted, hasErrors: pcp.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: admitDate, category: "ADMIT_DATE" },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone1 },
      { type: "PHONE", value: phone2 },
      { type: "PHONE", value: phone3 },
      { type: "HOSPITAL", value: hospital }
    ],
    expectedNonPHI: []
  };
}

function generateSpecializedDocument(id, errorLevel) {
  // This generates documents with additional PHI types: IP, URL, credit card, VIN, etc.
  const patient = generateName("first_last", errorLevel);
  const provider = generateName("titled", errorLevel);
  const dob = generateDOB(true, errorLevel);
  const date = generateDate(2023, 2024, true, errorLevel);
  const mrn = generateMRN(true, errorLevel);
  const ssn = generateSSN(true, errorLevel);
  const phone = generatePhone(true, errorLevel);
  const email = generateEmail(patient.first, patient.last);
  const ip = generateIP();
  const url = generateURL();
  const creditCard = generateCreditCard();
  const vin = generateVIN();
  const licensePlate = generateLicensePlate();
  const address = generateAddress();
  const hospital = random(HOSPITALS);
  
  const content = `
${hospital}
PATIENT REGISTRATION - SUPPLEMENTAL FORM

PATIENT: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
SSN: ${ssn}
Registration Date: ${date}

PROVIDER: ${provider.formatted}

CONTACT INFORMATION
Address: ${address.full}
Phone: ${phone}
Email: ${email}

PATIENT PORTAL ACCESS
Portal URL: ${url}
Last Login IP: ${ip}

BILLING INFORMATION
Credit Card on File: ${creditCard}
Billing Address: Same as above

TRANSPORTATION
Vehicle Information (for valet):
VIN: ${vin}
License Plate: ${licensePlate}

INSURANCE INFORMATION
Primary Insurance: ${random(["Blue Cross Blue Shield", "Aetna", "United Healthcare", "Cigna", "Medicare", "Medicaid"])}
Member ID: ${randomInt(100000000, 999999999)}
Group #: ${randomInt(10000, 99999)}

HIPAA ACKNOWLEDGMENT
I acknowledge receipt of the Notice of Privacy Practices.
Patient Signature: _______________  Date: ${date}

Form completed by: Registration Staff
System timestamp: ${date}
`.trim();

  return {
    id,
    type: "Specialized Document",
    errorLevel,
    content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: provider.clean, actual: provider.formatted, hasErrors: provider.hasErrors },
      { type: "DATE", value: dob, category: "DOB" },
      { type: "DATE", value: date, category: "REG_DATE" },
      { type: "MRN", value: mrn },
      { type: "SSN", value: ssn },
      { type: "PHONE", value: phone },
      { type: "EMAIL", value: email },
      { type: "IP", value: ip },
      { type: "URL", value: url },
      { type: "CREDIT_CARD", value: creditCard },
      { type: "VIN", value: vin },
      { type: "LICENSE_PLATE", value: licensePlate },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "HOSPITAL", value: hospital }
    ],
    expectedNonPHI: []
  };
}

// ============================================================================
// DOCUMENT GENERATION
// ============================================================================

function generateDocuments(count) {
  const generators = [
    generateRadiologyReport,
    generateLabReport,
    generateProgressNote,
    generateEmergencyNote,
    generateDischargeSummary,
    generateOperativeReport,
    generatePrescription,
    generateConsultationNote,
    generateNursingAssessment,
    generateSpecializedDocument
  ];
  
  const errorLevels = ["low", "medium", "high"];
  const documents = [];
  
  for (let i = 0; i < count; i++) {
    const generator = generators[i % generators.length];
    const errorLevel = errorLevels[Math.floor(Math.random() * 3)];
    documents.push(generator(i + 1, errorLevel));
  }
  
  // Shuffle
  for (let i = documents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [documents[i], documents[j]] = [documents[j], documents[i]];
  }
  
  return documents;
}

// ============================================================================
// ASSESSMENT ENGINE
// ============================================================================

async function runComprehensiveAssessment() {
  console.log("=".repeat(80));
  console.log("VULPES CELARE - COMPREHENSIVE 200-CASE PHI REDACTION ASSESSMENT");
  console.log("=".repeat(80));
  console.log();
  
  // Load engine
  console.log("Loading Vulpes Celare engine...");
  let VulpesCelare;
  try {
    const module = require("../dist/VulpesCelare.js");
    VulpesCelare = module.VulpesCelare;
    console.log(`✓ Engine loaded: ${VulpesCelare.NAME} v${VulpesCelare.VERSION}`);
    console.log(`  Variant: ${VulpesCelare.VARIANT}`);
  } catch (err) {
    console.error("✗ Failed to load VulpesCelare:", err.message);
    console.log("  Run: npm run build");
    process.exit(1);
  }
  
  const engine = new VulpesCelare();
  console.log(`  Active filters: ${engine.getActiveFilters().length}`);
  console.log();
  
  // Generate documents
  console.log("Generating 200 comprehensive medical documents...");
  const documents = generateDocuments(200);
  console.log(`✓ Generated ${documents.length} documents`);
  console.log();
  
  // Analyze distribution
  const errorDist = { low: 0, medium: 0, high: 0 };
  const typeDist = {};
  let totalExpectedPHI = 0;
  let totalExpectedNonPHI = 0;
  
  documents.forEach(d => {
    errorDist[d.errorLevel]++;
    typeDist[d.type] = (typeDist[d.type] || 0) + 1;
    totalExpectedPHI += d.expectedPHI.length;
    totalExpectedNonPHI += d.expectedNonPHI.length;
  });
  
  console.log("Document Distribution:");
  Object.entries(typeDist).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log();
  
  console.log("Error Level Distribution:");
  console.log(`  Low (clean):   ${errorDist.low}`);
  console.log(`  Medium:        ${errorDist.medium}`);
  console.log(`  High (messy):  ${errorDist.high}`);
  console.log();
  
  console.log(`Total PHI items to detect: ${totalExpectedPHI}`);
  console.log(`Total non-PHI items to preserve: ${totalExpectedNonPHI}`);
  console.log();
  
  // Run assessment
  console.log("-".repeat(80));
  console.log("PROCESSING DOCUMENTS...");
  console.log("-".repeat(80));
  
  const startTime = Date.now();
  
  // Metrics tracking
  let truePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  
  const byErrorLevel = {
    low: { tp: 0, fn: 0, total: 0 },
    medium: { tp: 0, fn: 0, total: 0 },
    high: { tp: 0, fn: 0, total: 0 }
  };
  
  const byPHIType = {};
  const failures = [];
  const fpList = [];
  const missedWithErrors = [];
  const missedClean = [];
  
  for (let i = 0; i < documents.length; i++) {
    if ((i + 1) % 25 === 0) {
      process.stdout.write(`  Processed ${i + 1}/${documents.length} documents...\r`);
    }
    
    const doc = documents[i];
    const result = await engine.process(doc.content);
    const redactedText = result.text;
    
    // Check each expected PHI
    for (const phi of doc.expectedPHI) {
      const actualValue = phi.actual || phi.value;
      
      // Initialize type tracking
      if (!byPHIType[phi.type]) {
        byPHIType[phi.type] = { tp: 0, fn: 0, total: 0 };
      }
      byPHIType[phi.type].total++;
      byErrorLevel[doc.errorLevel].total++;
      
      // Check if PHI was redacted (not appearing in clear text)
      const wasRedacted = !redactedText.includes(actualValue);
      
      if (wasRedacted) {
        truePositives++;
        byPHIType[phi.type].tp++;
        byErrorLevel[doc.errorLevel].tp++;
      } else {
        falseNegatives++;
        byPHIType[phi.type].fn++;
        byErrorLevel[doc.errorLevel].fn++;
        
        const failureInfo = {
          docId: doc.id,
          docType: doc.type,
          errorLevel: doc.errorLevel,
          phiType: phi.type,
          expected: phi.value,
          actual: actualValue,
          hasErrors: phi.hasErrors || false
        };
        failures.push(failureInfo);
        
        if (phi.hasErrors) {
          missedWithErrors.push(failureInfo);
        } else {
          missedClean.push(failureInfo);
        }
      }
    }
    
    // Check non-PHI preservation
    for (const nonPhi of doc.expectedNonPHI) {
      const wasPreserved = redactedText.includes(nonPhi.value);
      if (wasPreserved) {
        trueNegatives++;
      } else {
        falsePositives++;
        fpList.push({
          docId: doc.id,
          docType: doc.type,
          type: nonPhi.type,
          value: nonPhi.value
        });
      }
    }
  }
  
  console.log(`  Processed ${documents.length}/${documents.length} documents...`);
  console.log();
  
  const totalTime = Date.now() - startTime;
  
  // Calculate metrics
  const sensitivity = truePositives / (truePositives + falseNegatives) * 100;
  const specificity = totalExpectedNonPHI > 0 
    ? trueNegatives / (trueNegatives + falsePositives) * 100 
    : 100;
  const precision = truePositives / (truePositives + falsePositives) * 100;
  const f1Score = 2 * (precision * sensitivity) / (precision + sensitivity);
  
  // Calculate score
  let score = Math.round(sensitivity * 0.7 + specificity * 0.3);
  if (sensitivity < 95) score = Math.min(score, 70);
  if (sensitivity < 90) score = Math.min(score, 50);
  
  const grade = score >= 97 ? "A+" : score >= 93 ? "A" : score >= 90 ? "A-" :
                score >= 87 ? "B+" : score >= 83 ? "B" : score >= 80 ? "B-" :
                score >= 77 ? "C+" : score >= 73 ? "C" : score >= 70 ? "C-" :
                score >= 60 ? "D" : "F";
  
  // Print results
  console.log("=".repeat(80));
  console.log("ASSESSMENT RESULTS");
  console.log("=".repeat(80));
  console.log();
  
  console.log("OVERALL METRICS:");
  console.log("-".repeat(40));
  console.log(`  Documents Processed:    ${documents.length}`);
  console.log(`  Total PHI Items:        ${totalExpectedPHI}`);
  console.log(`  Total Non-PHI Items:    ${totalExpectedNonPHI}`);
  console.log(`  Processing Time:        ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  Avg Time per Doc:       ${(totalTime / documents.length).toFixed(1)}ms`);
  console.log();
  
  console.log("CONFUSION MATRIX:");
  console.log("-".repeat(40));
  console.log(`  True Positives (PHI correctly redacted):     ${truePositives}`);
  console.log(`  False Negatives (PHI missed):                ${falseNegatives}`);
  console.log(`  True Negatives (Non-PHI preserved):          ${trueNegatives}`);
  console.log(`  False Positives (Non-PHI incorrectly redacted): ${falsePositives}`);
  console.log();
  
  console.log("PRIMARY METRICS:");
  console.log("-".repeat(40));
  console.log(`  SENSITIVITY (Recall):   ${sensitivity.toFixed(2)}%`);
  console.log(`  SPECIFICITY:            ${specificity.toFixed(2)}%`);
  console.log(`  PRECISION (PPV):        ${precision.toFixed(2)}%`);
  console.log(`  F1 SCORE:               ${f1Score.toFixed(2)}`);
  console.log();
  
  console.log("-".repeat(80));
  console.log(`  OVERALL SCORE: ${score}/100 (${grade})`);
  console.log("-".repeat(80));
  console.log();
  
  console.log("PERFORMANCE BY ERROR LEVEL:");
  console.log("-".repeat(40));
  for (const level of ["low", "medium", "high"]) {
    const stats = byErrorLevel[level];
    const sens = stats.total > 0 ? (stats.tp / stats.total * 100).toFixed(1) : "N/A";
    console.log(`  ${level.toUpperCase().padEnd(8)}: ${stats.tp}/${stats.total} (${sens}%)`);
  }
  console.log();
  
  console.log("PERFORMANCE BY PHI TYPE:");
  console.log("-".repeat(40));
  const sortedTypes = Object.entries(byPHIType).sort((a, b) => b[1].total - a[1].total);
  for (const [type, stats] of sortedTypes) {
    const sens = stats.total > 0 ? (stats.tp / stats.total * 100).toFixed(1) : "N/A";
    const missed = stats.fn;
    console.log(`  ${type.padEnd(15)}: ${stats.tp}/${stats.total} (${sens}%)${missed > 0 ? ` - ${missed} missed` : ""}`);
  }
  console.log();
  
  // Analyze missed PHI
  if (failures.length > 0) {
    console.log("MISSED PHI ANALYSIS:");
    console.log("-".repeat(40));
    console.log(`  Clean items missed:     ${missedClean.length}`);
    console.log(`  Errored items missed:   ${missedWithErrors.length}`);
    console.log();
    
    // Group by type
    const missedByType = {};
    failures.forEach(f => {
      missedByType[f.phiType] = (missedByType[f.phiType] || 0) + 1;
    });
    
    console.log("  Missed by type:");
    Object.entries(missedByType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });
    console.log();
    
    // Sample failures
    console.log("SAMPLE MISSED PHI (first 15):");
    console.log("-".repeat(40));
    failures.slice(0, 15).forEach(f => {
      const errorTag = f.hasErrors ? " [HAS ERRORS]" : "";
      console.log(`  Doc ${f.docId} (${f.docType}) [${f.errorLevel}]:`);
      if (f.actual !== f.expected) {
        console.log(`    ${f.phiType}: "${f.expected}" → "${f.actual}"${errorTag}`);
      } else {
        console.log(`    ${f.phiType}: "${f.expected}"${errorTag}`);
      }
    });
    console.log();
  }
  
  if (fpList.length > 0) {
    console.log("FALSE POSITIVES (Non-PHI incorrectly redacted):");
    console.log("-".repeat(40));
    fpList.slice(0, 10).forEach(fp => {
      console.log(`  Doc ${fp.docId}: ${fp.type} - "${fp.value}"`);
    });
    console.log();
  }
  
  // Save detailed results
  const resultsDir = path.join(__dirname, "results");
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  
  const resultsFile = path.join(resultsDir, "comprehensive-200-assessment.json");
  const resultsData = {
    timestamp: new Date().toISOString(),
    engine: {
      name: VulpesCelare.NAME,
      version: VulpesCelare.VERSION,
      variant: VulpesCelare.VARIANT,
      activeFilters: engine.getActiveFilters().length
    },
    testConfig: {
      documentCount: documents.length,
      errorDistribution: errorDist,
      documentTypes: typeDist
    },
    metrics: {
      sensitivity: parseFloat(sensitivity.toFixed(2)),
      specificity: parseFloat(specificity.toFixed(2)),
      precision: parseFloat(precision.toFixed(2)),
      f1Score: parseFloat(f1Score.toFixed(2)),
      score,
      grade
    },
    confusionMatrix: {
      truePositives,
      falseNegatives,
      trueNegatives,
      falsePositives
    },
    performanceByErrorLevel: byErrorLevel,
    performanceByPHIType: byPHIType,
    processing: {
      totalTimeMs: totalTime,
      avgTimePerDocMs: totalTime / documents.length
    },
    failures: failures,
    falsePositives: fpList
  };
  
  fs.writeFileSync(resultsFile, JSON.stringify(resultsData, null, 2));
  console.log(`Detailed results saved to: ${resultsFile}`);
  console.log("=".repeat(80));
  
  return resultsData;
}

// Run the assessment
runComprehensiveAssessment().catch(console.error);
