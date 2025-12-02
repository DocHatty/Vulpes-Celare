/**
 * VULPES CELARE STRESS TEST - 200 Complete Novel Medical Exams
 *
 * Rigorous, objective assessment with:
 * - Real-world spelling errors
 * - OCR corruption patterns
 * - Edge cases and boundary conditions
 * - Complete medical document formats
 * - Precise tracking of every PHI item
 */

const fs = require("fs");
const path = require("path");

// Deterministic random for reproducibility
let seed = 42;
function seededRandom() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function pickRandom(arr) {
  return arr[Math.floor(seededRandom() * arr.length)];
}

function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// NAME DATA - Diverse, realistic names
// ============================================================================
const FIRST_NAMES = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
  "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Lisa", "Daniel", "Nancy",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
  "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
  "Timothy", "Deborah", "Ronald", "Stephanie", "Edward", "Rebecca", "Jason", "Sharon",
  "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
  "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna", "Stephen", "Brenda",
  "Wei", "Yuki", "Omar", "Fatima", "Raj", "Priya", "Carlos", "Maria", "Ahmed", "Aisha",
  "Dmitri", "Olga", "Hiroshi", "Keiko", "Mohammed", "Layla", "Chen", "Ming"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
  "Carter", "Roberts", "Turner", "Phillips", "Parker", "Evans", "Edwards", "Collins",
  "Stewart", "Morris", "Murphy", "Cook", "Rogers", "Morgan", "Peterson", "Cooper",
  "O'Brien", "O'Connor", "McDonald", "McCarthy", "O'Neill", "Sullivan", "Murphy",
  "Kim", "Park", "Chen", "Wang", "Li", "Zhang", "Liu", "Patel", "Singh", "Kumar",
  "Tanaka", "Yamamoto", "Nakamura", "Schmidt", "Mueller", "Weber", "Schneider"
];

const MIDDLE_NAMES = [
  "Ann", "Marie", "Lee", "James", "Michael", "Rose", "Grace", "Elizabeth",
  "Joseph", "William", "John", "Paul", "David", "Thomas", "Edward", "Lynn"
];

// ============================================================================
// ERROR INJECTION - Realistic corruption patterns
// ============================================================================
const OCR_SUBSTITUTIONS = {
  "1": ["l", "I", "|"],
  "0": ["O", "o"],
  "l": ["1", "I"],
  "I": ["1", "l", "|"],
  "O": ["0"],
  "o": ["0"],
  "S": ["5", "$"],
  "5": ["S"],
  "B": ["8"],
  "8": ["B"],
  "g": ["9", "q"],
  "q": ["9", "g"],
  "m": ["rn", "nn"],
  "rn": ["m"],
  "a": ["@", "o"],
  "e": ["c"],
  "c": ["e", "("],
};

function applyOCRErrors(text, errorRate = 0.15) {
  if (seededRandom() > errorRate) return { text, hasErrors: false };

  let result = text;
  let hasErrors = false;

  for (let i = 0; i < result.length; i++) {
    if (seededRandom() < 0.1) {
      const char = result[i];
      if (OCR_SUBSTITUTIONS[char]) {
        const replacement = pickRandom(OCR_SUBSTITUTIONS[char]);
        result = result.slice(0, i) + replacement + result.slice(i + 1);
        hasErrors = true;
      }
    }
  }

  return { text: result, hasErrors };
}

function applyCaseErrors(text, errorRate = 0.2) {
  if (seededRandom() > errorRate) return { text, hasErrors: false };

  const mode = seededRandom();
  let result;

  if (mode < 0.3) {
    // All lowercase
    result = text.toLowerCase();
  } else if (mode < 0.6) {
    // All uppercase
    result = text.toUpperCase();
  } else {
    // Random case
    result = text.split("").map(c =>
      seededRandom() < 0.5 ? c.toLowerCase() : c.toUpperCase()
    ).join("");
  }

  return { text: result, hasErrors: result !== text };
}

function applyTypos(text, errorRate = 0.1) {
  if (seededRandom() > errorRate) return { text, hasErrors: false };

  let result = text;
  let hasErrors = false;
  const mode = seededRandom();

  if (mode < 0.25 && result.length > 3) {
    // Transposition
    const pos = Math.floor(seededRandom() * (result.length - 1));
    result = result.slice(0, pos) + result[pos + 1] + result[pos] + result.slice(pos + 2);
    hasErrors = true;
  } else if (mode < 0.5 && result.length > 4) {
    // Missing letter
    const pos = Math.floor(seededRandom() * result.length);
    result = result.slice(0, pos) + result.slice(pos + 1);
    hasErrors = true;
  } else if (mode < 0.75) {
    // Double letter
    const pos = Math.floor(seededRandom() * result.length);
    result = result.slice(0, pos) + result[pos] + result.slice(pos);
    hasErrors = true;
  } else {
    // Wrong letter (adjacent key)
    const adjacent = { "a": "sq", "s": "awd", "d": "sfe", "f": "dgr", "e": "wr", "r": "et" };
    for (let i = 0; i < result.length; i++) {
      const lower = result[i].toLowerCase();
      if (adjacent[lower] && seededRandom() < 0.3) {
        const replacement = pickRandom(adjacent[lower].split(""));
        result = result.slice(0, i) + replacement + result.slice(i + 1);
        hasErrors = true;
        break;
      }
    }
  }

  return { text: result, hasErrors };
}

function applySpacingErrors(text, errorRate = 0.08) {
  if (seededRandom() > errorRate) return { text, hasErrors: false };

  const mode = seededRandom();
  let result = text;

  if (mode < 0.4) {
    // Remove space
    const spacePos = result.indexOf(" ");
    if (spacePos > 0) {
      result = result.slice(0, spacePos) + result.slice(spacePos + 1);
    }
  } else if (mode < 0.7) {
    // Add extra space
    const pos = Math.floor(seededRandom() * result.length);
    result = result.slice(0, pos) + " " + result.slice(pos);
  } else {
    // Split word incorrectly
    const pos = Math.floor(result.length / 2);
    if (result[pos] !== " ") {
      result = result.slice(0, pos) + " " + result.slice(pos);
    }
  }

  return { text: result, hasErrors: result !== text };
}

function applyErrors(text, errorLevel) {
  const rates = {
    none: { ocr: 0, case: 0, typo: 0, spacing: 0 },
    low: { ocr: 0.05, case: 0.08, typo: 0.05, spacing: 0.03 },
    medium: { ocr: 0.15, case: 0.15, typo: 0.1, spacing: 0.05 },
    high: { ocr: 0.25, case: 0.25, typo: 0.15, spacing: 0.1 },
    extreme: { ocr: 0.4, case: 0.35, typo: 0.25, spacing: 0.15 }
  };

  const rate = rates[errorLevel] || rates.medium;
  let result = text;
  let hasErrors = false;

  const ocrResult = applyOCRErrors(result, rate.ocr);
  result = ocrResult.text;
  hasErrors = hasErrors || ocrResult.hasErrors;

  const caseResult = applyCaseErrors(result, rate.case);
  result = caseResult.text;
  hasErrors = hasErrors || caseResult.hasErrors;

  const typoResult = applyTypos(result, rate.typo);
  result = typoResult.text;
  hasErrors = hasErrors || typoResult.hasErrors;

  const spacingResult = applySpacingErrors(result, rate.spacing);
  result = spacingResult.text;
  hasErrors = hasErrors || spacingResult.hasErrors;

  return { text: result, hasErrors };
}

// ============================================================================
// PHI GENERATORS
// ============================================================================
function generateName(format = "full") {
  const first = pickRandom(FIRST_NAMES);
  const last = pickRandom(LAST_NAMES);
  const middle = pickRandom(MIDDLE_NAMES);
  const title = pickRandom(["Dr.", "Mr.", "Mrs.", "Ms.", "Prof."]);
  const suffix = pickRandom(["Jr.", "Sr.", "III", "MD", "RN", "NP"]);

  switch (format) {
    case "titled": return `${title} ${first} ${last}`;
    case "titled_short": return `${title} ${last}`;
    case "last_first": return `${last}, ${first}`;
    case "last_first_middle": return `${last}, ${first} ${middle}`;
    case "full_middle": return `${first} ${middle} ${last}`;
    case "with_suffix": return `${first} ${last}, ${suffix}`;
    case "titled_suffix": return `${title} ${first} ${last}, ${suffix}`;
    default: return `${first} ${last}`;
  }
}

function generateDate(format = "us") {
  const year = 1950 + Math.floor(seededRandom() * 74);
  const month = 1 + Math.floor(seededRandom() * 12);
  const day = 1 + Math.floor(seededRandom() * 28);

  const mm = month.toString().padStart(2, "0");
  const dd = day.toString().padStart(2, "0");
  const yy = (year % 100).toString().padStart(2, "0");

  switch (format) {
    case "short": return `${month}/${day}/${yy}`;
    case "iso": return `${year}-${mm}-${dd}`;
    case "european": return `${dd}/${mm}/${year}`;
    case "written": return `${pickRandom(["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"])} ${day}, ${year}`;
    default: return `${mm}/${dd}/${year}`;
  }
}

function generatePhone(format = "standard") {
  const area = 200 + Math.floor(seededRandom() * 800);
  const prefix = 200 + Math.floor(seededRandom() * 800);
  const line = 1000 + Math.floor(seededRandom() * 9000);

  switch (format) {
    case "dots": return `${area}.${prefix}.${line}`;
    case "dashes": return `${area}-${prefix}-${line}`;
    case "parens": return `(${area}) ${prefix}-${line}`;
    case "spaces": return `${area} ${prefix} ${line}`;
    case "international": return `+1 ${area} ${prefix} ${line}`;
    default: return `(${area}) ${prefix}-${line}`;
  }
}

function generateSSN() {
  const area = 100 + Math.floor(seededRandom() * 900);
  const group = 10 + Math.floor(seededRandom() * 90);
  const serial = 1000 + Math.floor(seededRandom() * 9000);
  return `${area}-${group}-${serial}`;
}

function generateMRN() {
  const formats = [
    () => `MRN: ${Math.floor(seededRandom() * 90000000 + 10000000)}`,
    () => `MRN-${Math.floor(seededRandom() * 900000 + 100000)}`,
    () => `#${Math.floor(seededRandom() * 9000000 + 1000000)}`,
    () => `Patient ID: ${Math.floor(seededRandom() * 900000 + 100000)}`
  ];
  return pickRandom(formats)();
}

function generateEmail() {
  const first = pickRandom(FIRST_NAMES).toLowerCase();
  const last = pickRandom(LAST_NAMES).toLowerCase().replace("'", "");
  const domain = pickRandom(["gmail.com", "yahoo.com", "outlook.com", "email.com", "hospital.org"]);
  const separator = pickRandom([".", "_", ""]);
  const num = seededRandom() < 0.3 ? Math.floor(seededRandom() * 100) : "";
  return `${first}${separator}${last}${num}@${domain}`;
}

function generateAddress() {
  const num = 100 + Math.floor(seededRandom() * 9900);
  const street = pickRandom(["Main", "Oak", "Maple", "Cedar", "Pine", "Elm", "Washington", "Lincoln", "Park", "Lake"]);
  const type = pickRandom(["Street", "Avenue", "Road", "Boulevard", "Drive", "Lane", "Court"]);
  const city = pickRandom(["Springfield", "Clinton", "Madison", "Georgetown", "Franklin", "Bristol", "Salem"]);
  const state = pickRandom(["CA", "NY", "TX", "FL", "IL", "PA", "OH", "GA", "NC", "MI"]);
  const zip = 10000 + Math.floor(seededRandom() * 90000);
  return `${num} ${street} ${type}, ${city}, ${state} ${zip}`;
}

// ============================================================================
// DOCUMENT GENERATORS - Complete realistic medical documents
// ============================================================================
function generateProgressNote(docId, errorLevel) {
  const patientName = generateName("last_first_middle");
  const providerName = generateName("titled");
  const nurseName = generateName("titled_short");
  const dob = generateDate();
  const visitDate = generateDate();
  const phone = generatePhone();
  const mrn = generateMRN();

  const expectedPHI = [];
  const expectedNonPHI = [];

  // Apply errors and track
  const patient = applyErrors(patientName, errorLevel);
  const provider = applyErrors(providerName, errorLevel);
  const nurse = applyErrors(nurseName, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const visitErr = applyErrors(visitDate, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: providerName, value: provider.text, hasErrors: provider.hasErrors });
  expectedPHI.push({ type: "NAME", original: nurseName, value: nurse.text, hasErrors: nurse.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: visitDate, value: visitErr.text, hasErrors: visitErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });

  // Add non-PHI that shouldn't be redacted
  expectedNonPHI.push("blood pressure", "diabetes mellitus", "hypertension");

  const text = `PROGRESS NOTE

Patient: ${patient.text}
DOB: ${dobErr.text}
${mrn}
Visit Date: ${visitErr.text}
Phone: ${phoneErr.text}

CHIEF COMPLAINT: Patient presents with chest pain and shortness of breath.

HISTORY OF PRESENT ILLNESS:
This is a ${Math.floor(seededRandom() * 40 + 40)}-year-old patient with history of diabetes mellitus and hypertension who presents with progressive chest discomfort over the past 3 days.

VITAL SIGNS:
Blood pressure: ${100 + Math.floor(seededRandom() * 40)}/${60 + Math.floor(seededRandom() * 30)} mmHg
Heart rate: ${60 + Math.floor(seededRandom() * 40)} bpm
Temperature: ${97 + seededRandom() * 2}°F
Respiratory rate: ${14 + Math.floor(seededRandom() * 6)} breaths/min

PHYSICAL EXAMINATION:
General: Alert, oriented, no acute distress
Cardiovascular: Regular rate and rhythm, no murmurs
Respiratory: Clear to auscultation bilaterally
Abdomen: Soft, non-tender

ASSESSMENT AND PLAN:
1. Chest pain - likely musculoskeletal, will obtain EKG
2. Hypertension - continue current medications
3. Follow up in 2 weeks

Attending Physician: ${provider.text}
Nurse: ${nurse.text}

Electronically signed on ${visitErr.text}`;

  return { docId, type: "Progress Note", text, expectedPHI, expectedNonPHI, errorLevel };
}

function generateDischargeSum(docId, errorLevel) {
  const patientName = generateName("last_first");
  const attendingName = generateName("titled");
  const consultName = generateName("titled_suffix");
  const familyName = generateName("full");
  const dob = generateDate();
  const admitDate = generateDate();
  const dischargeDate = generateDate();
  const ssn = generateSSN();
  const address = generateAddress();

  const expectedPHI = [];
  const expectedNonPHI = [];

  const patient = applyErrors(patientName, errorLevel);
  const attending = applyErrors(attendingName, errorLevel);
  const consult = applyErrors(consultName, errorLevel);
  const family = applyErrors(familyName, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const admitErr = applyErrors(admitDate, errorLevel);
  const dischargeErr = applyErrors(dischargeDate, errorLevel);
  const ssnErr = applyErrors(ssn, errorLevel);
  const addrErr = applyErrors(address, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: attendingName, value: attending.text, hasErrors: attending.hasErrors });
  expectedPHI.push({ type: "NAME", original: consultName, value: consult.text, hasErrors: consult.hasErrors });
  expectedPHI.push({ type: "NAME", original: familyName, value: family.text, hasErrors: family.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: admitDate, value: admitErr.text, hasErrors: admitErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dischargeDate, value: dischargeErr.text, hasErrors: dischargeErr.hasErrors });
  expectedPHI.push({ type: "SSN", original: ssn, value: ssnErr.text, hasErrors: ssnErr.hasErrors });
  expectedPHI.push({ type: "ADDRESS", original: address, value: addrErr.text, hasErrors: addrErr.hasErrors });

  expectedNonPHI.push("congestive heart failure", "acute coronary syndrome");

  const text = `DISCHARGE SUMMARY

PATIENT INFORMATION:
Name: ${patient.text}
DOB: ${dobErr.text}
SSN: ${ssnErr.text}
Address: ${addrErr.text}

ADMISSION DATE: ${admitErr.text}
DISCHARGE DATE: ${dischargeErr.text}

ATTENDING PHYSICIAN: ${attending.text}
CONSULTING PHYSICIAN: ${consult.text}

ADMISSION DIAGNOSIS:
1. Acute coronary syndrome
2. Congestive heart failure

HOSPITAL COURSE:
Patient was admitted for management of acute coronary syndrome. Underwent cardiac catheterization which showed 80% stenosis of LAD. Patient underwent successful PCI with drug-eluting stent placement.

DISCHARGE MEDICATIONS:
1. Aspirin 81mg daily
2. Clopidogrel 75mg daily
3. Metoprolol 25mg twice daily
4. Lisinopril 10mg daily
5. Atorvastatin 80mg at bedtime

FOLLOW-UP:
1. Cardiology clinic in 2 weeks
2. Primary care in 1 month

EMERGENCY CONTACT: ${family.text}

Dictated by: ${attending.text}
Transcribed: ${dischargeErr.text}`;

  return { docId, type: "Discharge Summary", text, expectedPHI, expectedNonPHI, errorLevel };
}

function generateLabReport(docId, errorLevel) {
  const patientName = generateName("last_first_middle");
  const orderingDoc = generateName("titled_short");
  const pathologist = generateName("titled_suffix");
  const dob = generateDate();
  const collectionDate = generateDate();
  const mrn = generateMRN();
  const phone = generatePhone("dots");

  const expectedPHI = [];
  const expectedNonPHI = [];

  const patient = applyErrors(patientName, errorLevel);
  const ordering = applyErrors(orderingDoc, errorLevel);
  const path = applyErrors(pathologist, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const collectErr = applyErrors(collectionDate, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: orderingDoc, value: ordering.text, hasErrors: ordering.hasErrors });
  expectedPHI.push({ type: "NAME", original: pathologist, value: path.text, hasErrors: path.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: collectionDate, value: collectErr.text, hasErrors: collectErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });

  expectedNonPHI.push("hemoglobin", "white blood cell", "platelet count");

  const text = `LABORATORY REPORT

PATIENT: ${patient.text}
DOB: ${dobErr.text}
${mrn}
PHONE: ${phoneErr.text}

COLLECTION DATE: ${collectErr.text}
ORDERING PHYSICIAN: ${ordering.text}
PATHOLOGIST: ${path.text}

COMPLETE BLOOD COUNT:
  White Blood Cell Count: ${4 + seededRandom() * 7} x10^9/L (ref: 4.5-11.0)
  Red Blood Cell Count: ${4 + seededRandom() * 2} x10^12/L (ref: 4.5-5.5)
  Hemoglobin: ${12 + seededRandom() * 4} g/dL (ref: 12-16)
  Hematocrit: ${36 + seededRandom() * 10}% (ref: 36-46)
  Platelet Count: ${150 + seededRandom() * 250} x10^9/L (ref: 150-400)

BASIC METABOLIC PANEL:
  Sodium: ${136 + Math.floor(seededRandom() * 8)} mEq/L (ref: 136-145)
  Potassium: ${3.5 + seededRandom() * 1.5} mEq/L (ref: 3.5-5.0)
  Chloride: ${98 + Math.floor(seededRandom() * 8)} mEq/L (ref: 98-106)
  BUN: ${7 + Math.floor(seededRandom() * 18)} mg/dL (ref: 7-20)
  Creatinine: ${0.7 + seededRandom() * 0.6} mg/dL (ref: 0.7-1.3)
  Glucose: ${70 + Math.floor(seededRandom() * 60)} mg/dL (ref: 70-100)

INTERPRETATION: All values within normal limits.

Reviewed and signed by: ${path.text}`;

  return { docId, type: "Lab Report", text, expectedPHI, expectedNonPHI, errorLevel };
}

function generateRadiologyReport(docId, errorLevel) {
  const patientName = generateName("full_middle");
  const radiologist = generateName("titled_suffix");
  const referringDoc = generateName("titled");
  const dob = generateDate();
  const examDate = generateDate();
  const email = generateEmail();

  const expectedPHI = [];
  const expectedNonPHI = [];

  const patient = applyErrors(patientName, errorLevel);
  const rad = applyErrors(radiologist, errorLevel);
  const referring = applyErrors(referringDoc, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const examErr = applyErrors(examDate, errorLevel);
  const emailErr = applyErrors(email, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: radiologist, value: rad.text, hasErrors: rad.hasErrors });
  expectedPHI.push({ type: "NAME", original: referringDoc, value: referring.text, hasErrors: referring.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: examDate, value: examErr.text, hasErrors: examErr.hasErrors });
  expectedPHI.push({ type: "EMAIL", original: email, value: emailErr.text, hasErrors: emailErr.hasErrors });

  expectedNonPHI.push("cardiomegaly", "pulmonary edema", "atherosclerosis");

  const text = `RADIOLOGY REPORT

PATIENT: ${patient.text}
DOB: ${dobErr.text}
EXAM DATE: ${examErr.text}
EMAIL: ${emailErr.text}

REFERRING PHYSICIAN: ${referring.text}
RADIOLOGIST: ${rad.text}

EXAMINATION: Chest X-Ray, PA and Lateral

CLINICAL INDICATION: Shortness of breath, rule out pneumonia

TECHNIQUE: Standard two-view chest radiograph obtained

COMPARISON: Prior examination dated ${pickRandom(["3 months ago", "1 year ago", "none available"])}

FINDINGS:
Heart: Normal cardiothoracic ratio without cardiomegaly
Lungs: Clear bilaterally without focal consolidation, no pulmonary edema
Mediastinum: Within normal limits
Bones: No acute osseous abnormalities
Soft tissues: Unremarkable

IMPRESSION:
1. No acute cardiopulmonary process
2. No evidence of pneumonia
3. Age-appropriate atherosclerosis of the aortic arch

Electronically signed by ${rad.text}
${examErr.text}`;

  return { docId, type: "Radiology Report", text, expectedPHI, expectedNonPHI, errorLevel };
}

function generateEmergencyNote(docId, errorLevel) {
  const patientName = generateName();
  const emergencyDoc = generateName("titled");
  const nurseName = generateName("with_suffix");
  const contactName = generateName();
  const dob = generateDate();
  const arrivalTime = generateDate();
  const phone = generatePhone("parens");
  const contactPhone = generatePhone("dashes");

  const expectedPHI = [];
  const expectedNonPHI = [];

  const patient = applyErrors(patientName, errorLevel);
  const doc = applyErrors(emergencyDoc, errorLevel);
  const nurse = applyErrors(nurseName, errorLevel);
  const contact = applyErrors(contactName, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const arrivalErr = applyErrors(arrivalTime, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);
  const contactPhoneErr = applyErrors(contactPhone, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: emergencyDoc, value: doc.text, hasErrors: doc.hasErrors });
  expectedPHI.push({ type: "NAME", original: nurseName, value: nurse.text, hasErrors: nurse.hasErrors });
  expectedPHI.push({ type: "NAME", original: contactName, value: contact.text, hasErrors: contact.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: arrivalTime, value: arrivalErr.text, hasErrors: arrivalErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: contactPhone, value: contactPhoneErr.text, hasErrors: contactPhoneErr.hasErrors });

  expectedNonPHI.push("laceration", "tetanus prophylaxis");

  const text = `EMERGENCY DEPARTMENT NOTE

PATIENT: ${patient.text}
DOB: ${dobErr.text}
PHONE: ${phoneErr.text}
ARRIVAL: ${arrivalErr.text}

EMERGENCY CONTACT: ${contact.text}
CONTACT PHONE: ${contactPhoneErr.text}

CHIEF COMPLAINT: Fall with laceration to forehead

MECHANISM: Patient tripped on stairs at home, striking head on railing

EXAMINATION:
General: Alert, oriented x3
HEENT: 3cm laceration to right forehead, no skull depression
Neuro: GCS 15, pupils equal and reactive

TREATMENT:
1. Wound irrigated and cleaned
2. Laceration repaired with 5 sutures
3. Tetanus prophylaxis administered

DISPOSITION: Discharged home in stable condition
RETURN PRECAUTIONS: Given for head injury

ATTENDING PHYSICIAN: ${doc.text}
CHARGE NURSE: ${nurse.text}`;

  return { docId, type: "Emergency Note", text, expectedPHI, expectedNonPHI, errorLevel };
}

function generateOperativeReport(docId, errorLevel) {
  const patientName = generateName("last_first");
  const surgeonName = generateName("titled_suffix");
  const assistantName = generateName("titled");
  const anesthesiologist = generateName("titled_short");
  const dob = generateDate();
  const surgeryDate = generateDate();
  const mrn = generateMRN();

  const expectedPHI = [];
  const expectedNonPHI = [];

  const patient = applyErrors(patientName, errorLevel);
  const surgeon = applyErrors(surgeonName, errorLevel);
  const assistant = applyErrors(assistantName, errorLevel);
  const anesth = applyErrors(anesthesiologist, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const surgeryErr = applyErrors(surgeryDate, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: surgeonName, value: surgeon.text, hasErrors: surgeon.hasErrors });
  expectedPHI.push({ type: "NAME", original: assistantName, value: assistant.text, hasErrors: assistant.hasErrors });
  expectedPHI.push({ type: "NAME", original: anesthesiologist, value: anesth.text, hasErrors: anesth.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: surgeryDate, value: surgeryErr.text, hasErrors: surgeryErr.hasErrors });

  expectedNonPHI.push("laparoscopic cholecystectomy", "general anesthesia");

  const text = `OPERATIVE REPORT

PATIENT: ${patient.text}
DOB: ${dobErr.text}
${mrn}
DATE OF SURGERY: ${surgeryErr.text}

SURGEON: ${surgeon.text}
FIRST ASSISTANT: ${assistant.text}
ANESTHESIOLOGIST: ${anesth.text}

PREOPERATIVE DIAGNOSIS: Symptomatic cholelithiasis
POSTOPERATIVE DIAGNOSIS: Same

PROCEDURE: Laparoscopic cholecystectomy

ANESTHESIA: General anesthesia

FINDINGS: Chronically inflamed gallbladder with multiple stones

PROCEDURE IN DETAIL:
Patient was brought to the operating room and placed in supine position. After induction of general anesthesia, the abdomen was prepped and draped in sterile fashion. Pneumoperitoneum was established. The gallbladder was identified and the critical view of safety obtained. The cystic duct and artery were clipped and divided. The gallbladder was removed from the liver bed using electrocautery. Hemostasis was confirmed. All ports removed and fascia closed. Skin closed with subcuticular sutures.

ESTIMATED BLOOD LOSS: Minimal
COMPLICATIONS: None
SPECIMENS: Gallbladder to pathology

Dictated by: ${surgeon.text}`;

  return { docId, type: "Operative Report", text, expectedPHI, expectedNonPHI, errorLevel };
}

function generateConsultNote(docId, errorLevel) {
  const patientName = generateName("full_middle");
  const consultantName = generateName("titled_suffix");
  const referringName = generateName("titled");
  const dob = generateDate();
  const consultDate = generateDate();
  const phone = generatePhone("international");
  const email = generateEmail();

  const expectedPHI = [];
  const expectedNonPHI = [];

  const patient = applyErrors(patientName, errorLevel);
  const consultant = applyErrors(consultantName, errorLevel);
  const referring = applyErrors(referringName, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const consultErr = applyErrors(consultDate, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);
  const emailErr = applyErrors(email, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: consultantName, value: consultant.text, hasErrors: consultant.hasErrors });
  expectedPHI.push({ type: "NAME", original: referringName, value: referring.text, hasErrors: referring.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: consultDate, value: consultErr.text, hasErrors: consultErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });
  expectedPHI.push({ type: "EMAIL", original: email, value: emailErr.text, hasErrors: emailErr.hasErrors });

  expectedNonPHI.push("rheumatoid arthritis", "autoimmune");

  const text = `CONSULTATION NOTE

PATIENT: ${patient.text}
DOB: ${dobErr.text}
DATE: ${consultErr.text}
PHONE: ${phoneErr.text}
EMAIL: ${emailErr.text}

REFERRING PHYSICIAN: ${referring.text}
CONSULTANT: ${consultant.text}
SPECIALTY: Rheumatology

REASON FOR CONSULTATION:
Evaluation of joint pain and suspected rheumatoid arthritis

HISTORY:
Patient is a ${40 + Math.floor(seededRandom() * 30)}-year-old with progressive joint pain involving the hands and wrists for the past 6 months. Morning stiffness lasting >1 hour. No prior rheumatologic history.

PHYSICAL EXAMINATION:
Hands: Symmetric swelling of MCP and PIP joints bilaterally
Wrists: Mild synovitis noted
Other joints: No involvement

LABORATORY REVIEW:
RF: Positive at 156 IU/mL
Anti-CCP: Positive at 89 U/mL
ESR: 45 mm/hr
CRP: 2.8 mg/dL

ASSESSMENT:
Seropositive rheumatoid arthritis with active disease

RECOMMENDATIONS:
1. Start methotrexate 15mg weekly
2. Folic acid supplementation
3. Consider DMARD therapy if inadequate response
4. Follow-up in 6 weeks

Thank you for this interesting referral.

${consultant.text}
Rheumatology`;

  return { docId, type: "Consultation Note", text, expectedPHI, expectedNonPHI, errorLevel };
}

function generatePrescription(docId, errorLevel) {
  const patientName = generateName("last_first_middle");
  const prescriberName = generateName("titled_suffix");
  const dob = generateDate();
  const rxDate = generateDate();
  const phone = generatePhone();
  const address = generateAddress();

  const expectedPHI = [];
  const expectedNonPHI = [];

  const patient = applyErrors(patientName, errorLevel);
  const prescriber = applyErrors(prescriberName, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const rxErr = applyErrors(rxDate, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);
  const addrErr = applyErrors(address, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: prescriberName, value: prescriber.text, hasErrors: prescriber.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: rxDate, value: rxErr.text, hasErrors: rxErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });
  expectedPHI.push({ type: "ADDRESS", original: address, value: addrErr.text, hasErrors: addrErr.hasErrors });

  expectedNonPHI.push("lisinopril", "metformin", "atorvastatin");

  const text = `PRESCRIPTION

PATIENT: ${patient.text}
DOB: ${dobErr.text}
ADDRESS: ${addrErr.text}
PHONE: ${phoneErr.text}

DATE: ${rxErr.text}

Rx:
1. Lisinopril 10mg
   Sig: Take one tablet by mouth daily
   Disp: #30 Qty: 30
   Refills: 3

2. Metformin 500mg
   Sig: Take one tablet by mouth twice daily with meals
   Disp: #60 Qty: 60
   Refills: 3

3. Atorvastatin 20mg
   Sig: Take one tablet by mouth at bedtime
   Disp: #30 Qty: 30
   Refills: 3

PRESCRIBER: ${prescriber.text}
DEA: ${pickRandom(["AB", "BC", "CD"])}${Math.floor(seededRandom() * 9000000 + 1000000)}
NPI: ${Math.floor(seededRandom() * 9000000000 + 1000000000)}

Signature: ____________________`;

  return { docId, type: "Prescription", text, expectedPHI, expectedNonPHI, errorLevel };
}

function generateNursingAssessment(docId, errorLevel) {
  const patientName = generateName("last_first");
  const nurseName = generateName("with_suffix");
  const supervisorName = generateName("titled_short");
  const familyName = generateName();
  const dob = generateDate();
  const assessDate = generateDate();
  const phone = generatePhone("spaces");

  const expectedPHI = [];
  const expectedNonPHI = [];

  const patient = applyErrors(patientName, errorLevel);
  const nurse = applyErrors(nurseName, errorLevel);
  const supervisor = applyErrors(supervisorName, errorLevel);
  const family = applyErrors(familyName, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const assessErr = applyErrors(assessDate, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: nurseName, value: nurse.text, hasErrors: nurse.hasErrors });
  expectedPHI.push({ type: "NAME", original: supervisorName, value: supervisor.text, hasErrors: supervisor.hasErrors });
  expectedPHI.push({ type: "NAME", original: familyName, value: family.text, hasErrors: family.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: assessDate, value: assessErr.text, hasErrors: assessErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });

  expectedNonPHI.push("fall risk", "skin integrity", "pain assessment");

  const text = `NURSING ADMISSION ASSESSMENT

PATIENT: ${patient.text}
DOB: ${dobErr.text}
ASSESSMENT DATE: ${assessErr.text}
PHONE: ${phoneErr.text}

PRIMARY NURSE: ${nurse.text}
SUPERVISOR: ${supervisor.text}
FAMILY CONTACT: ${family.text}

VITAL SIGNS:
  BP: ${110 + Math.floor(seededRandom() * 30)}/${70 + Math.floor(seededRandom() * 20)} mmHg
  HR: ${65 + Math.floor(seededRandom() * 30)} bpm
  Temp: ${97.5 + seededRandom() * 2}°F
  RR: ${14 + Math.floor(seededRandom() * 6)}/min
  O2 Sat: ${95 + Math.floor(seededRandom() * 5)}% on room air

FALL RISK ASSESSMENT (Morse Scale):
  History of falling: ${pickRandom(["Yes (25)", "No (0)"])}
  Secondary diagnosis: Yes (15)
  Ambulatory aid: ${pickRandom(["None (0)", "Crutches/cane (15)", "Furniture (30)"])}
  IV/Heparin lock: ${pickRandom(["Yes (20)", "No (0)"])}
  Gait: ${pickRandom(["Normal (0)", "Weak (10)", "Impaired (20)"])}
  Mental status: ${pickRandom(["Oriented (0)", "Forgetful (15)"])}
  TOTAL SCORE: ${Math.floor(seededRandom() * 60 + 20)}

SKIN INTEGRITY: Intact, no pressure injuries
PAIN ASSESSMENT: ${Math.floor(seededRandom() * 5)}/10, ${pickRandom(["dull", "sharp", "aching"])} in nature

COMPLETED BY: ${nurse.text}
REVIEWED BY: ${supervisor.text}`;

  return { docId, type: "Nursing Assessment", text, expectedPHI, expectedNonPHI, errorLevel };
}

function generatePathologyReport(docId, errorLevel) {
  const patientName = generateName("full");
  const pathologist = generateName("titled_suffix");
  const surgeonName = generateName("titled");
  const dob = generateDate();
  const collectionDate = generateDate();
  const reportDate = generateDate();

  const expectedPHI = [];
  const expectedNonPHI = [];

  const patient = applyErrors(patientName, errorLevel);
  const path = applyErrors(pathologist, errorLevel);
  const surgeon = applyErrors(surgeonName, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const collectErr = applyErrors(collectionDate, errorLevel);
  const reportErr = applyErrors(reportDate, errorLevel);

  expectedPHI.push({ type: "NAME", original: patientName, value: patient.text, hasErrors: patient.hasErrors });
  expectedPHI.push({ type: "NAME", original: pathologist, value: path.text, hasErrors: path.hasErrors });
  expectedPHI.push({ type: "NAME", original: surgeonName, value: surgeon.text, hasErrors: surgeon.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: collectionDate, value: collectErr.text, hasErrors: collectErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: reportDate, value: reportErr.text, hasErrors: reportErr.hasErrors });

  expectedNonPHI.push("adenocarcinoma", "malignant", "metastasis");

  const text = `SURGICAL PATHOLOGY REPORT

PATIENT: ${patient.text}
DOB: ${dobErr.text}
COLLECTION DATE: ${collectErr.text}
REPORT DATE: ${reportErr.text}

SURGEON: ${surgeon.text}
PATHOLOGIST: ${path.text}

SPECIMEN: Right colon resection

GROSS DESCRIPTION:
Received fresh labeled with patient name and MRN, a right hemicolectomy specimen measuring 25 cm in length. There is an exophytic mass measuring 4.5 x 3.2 x 2.8 cm located 8 cm from the ileocecal valve.

MICROSCOPIC DESCRIPTION:
Sections show moderately differentiated adenocarcinoma infiltrating through the muscularis propria into pericolonic fat. Fifteen lymph nodes identified, two positive for metastatic carcinoma.

DIAGNOSIS:
1. RIGHT COLON, RESECTION:
   - Moderately differentiated adenocarcinoma
   - Tumor size: 4.5 cm
   - Depth of invasion: pT3 (through muscularis propria)
   - Lymph node status: pN1a (2/15 positive)
   - Margins: Negative
   - Lymphovascular invasion: Present
   - Perineural invasion: Not identified

PATHOLOGIC STAGE: pT3 N1a M0 (Stage IIIB)

Electronically signed: ${path.text}
${reportErr.text}`;

  return { docId, type: "Pathology Report", text, expectedPHI, expectedNonPHI, errorLevel };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runStressTest() {
  console.log("=".repeat(80));
  console.log("VULPES CELARE STRESS TEST - 200 COMPLETE MEDICAL DOCUMENTS");
  console.log("Rigorous, Objective Assessment with Real-World Error Patterns");
  console.log("=".repeat(80));
  console.log();

  // Generate 200 documents with varied error levels
  const generators = [
    generateProgressNote,
    generateDischargeSum,
    generateLabReport,
    generateRadiologyReport,
    generateEmergencyNote,
    generateOperativeReport,
    generateConsultNote,
    generatePrescription,
    generateNursingAssessment,
    generatePathologyReport
  ];

  const errorLevels = ["none", "low", "medium", "high", "extreme"];
  const errorDistribution = {
    none: 30,    // 15% - clean documents
    low: 40,     // 20% - minor errors
    medium: 50,  // 25% - realistic errors
    high: 50,    // 25% - heavy errors
    extreme: 30  // 15% - severe corruption
  };

  console.log("Generating 200 medical documents...");
  const documents = [];
  let docId = 1;

  for (const [level, count] of Object.entries(errorDistribution)) {
    for (let i = 0; i < count; i++) {
      const generator = generators[docId % generators.length];
      documents.push(generator(docId, level));
      docId++;
    }
  }

  // Shuffle documents
  const shuffledDocs = shuffleArray(documents);

  console.log(`Generated ${shuffledDocs.length} documents\n`);

  // Count distribution
  const typeCounts = {};
  const levelCounts = {};
  for (const doc of shuffledDocs) {
    typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1;
    levelCounts[doc.errorLevel] = (levelCounts[doc.errorLevel] || 0) + 1;
  }

  console.log("Document Type Distribution:");
  for (const [type, count] of Object.entries(typeCounts)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log();

  console.log("Error Level Distribution:");
  for (const [level, count] of Object.entries(levelCounts)) {
    console.log(`  ${level}: ${count}`);
  }
  console.log();

  // Load engine
  console.log("Loading Vulpes Celare engine...");
  const { VulpesCelare } = require("../dist/VulpesCelare.js");
  const engine = new VulpesCelare();
  console.log("Engine loaded\n");

  // Process all documents
  console.log("Processing documents...");
  console.log("-".repeat(80));

  const results = [];
  let processed = 0;

  for (const doc of shuffledDocs) {
    const startTime = Date.now();
    const result = await engine.process(doc.text);
    const processingTime = Date.now() - startTime;

    // Check each expected PHI item
    const phiResults = [];
    for (const phi of doc.expectedPHI) {
      // Check if the PHI value was redacted (replaced with token)
      const wasRedacted = !result.text.includes(phi.value);
      phiResults.push({
        ...phi,
        detected: wasRedacted
      });
    }

    // Check non-PHI items (should NOT be redacted)
    const nonPhiResults = [];
    for (const term of doc.expectedNonPHI) {
      const wasPreserved = result.text.toLowerCase().includes(term.toLowerCase());
      nonPhiResults.push({
        term,
        preserved: wasPreserved
      });
    }

    results.push({
      docId: doc.docId,
      type: doc.type,
      errorLevel: doc.errorLevel,
      phiResults,
      nonPhiResults,
      processingTime
    });

    processed++;
    if (processed % 20 === 0) {
      console.log(`  Processed ${processed}/${shuffledDocs.length} documents...`);
    }
  }
  console.log(`  Processed ${processed}/${shuffledDocs.length} documents...`);
  console.log();

  // ============================================================================
  // CALCULATE PRECISE METRICS
  // ============================================================================
  let totalPHI = 0;
  let detectedPHI = 0;
  let missedPHI = 0;
  let totalNonPHI = 0;
  let preservedNonPHI = 0;
  let falsePositives = 0;

  const missedByType = {};
  const missedByLevel = {};
  const detectedByLevel = {};
  const cleanDetected = { total: 0, detected: 0 };
  const erroredDetected = { total: 0, detected: 0 };
  const failures = [];

  for (const result of results) {
    for (const phi of result.phiResults) {
      totalPHI++;

      // Track by error status
      if (phi.hasErrors) {
        erroredDetected.total++;
        if (phi.detected) erroredDetected.detected++;
      } else {
        cleanDetected.total++;
        if (phi.detected) cleanDetected.detected++;
      }

      // Track by level
      if (!detectedByLevel[result.errorLevel]) {
        detectedByLevel[result.errorLevel] = { total: 0, detected: 0 };
      }
      detectedByLevel[result.errorLevel].total++;

      if (phi.detected) {
        detectedPHI++;
        detectedByLevel[result.errorLevel].detected++;
      } else {
        missedPHI++;

        // Track missed by type
        missedByType[phi.type] = (missedByType[phi.type] || 0) + 1;

        // Track missed by level
        missedByLevel[result.errorLevel] = (missedByLevel[result.errorLevel] || 0) + 1;

        // Record failure details
        if (failures.length < 50) {
          failures.push({
            docId: result.docId,
            docType: result.type,
            errorLevel: result.errorLevel,
            phiType: phi.type,
            original: phi.original,
            value: phi.value,
            hasErrors: phi.hasErrors
          });
        }
      }
    }

    for (const nonPhi of result.nonPhiResults) {
      totalNonPHI++;
      if (nonPhi.preserved) {
        preservedNonPHI++;
      } else {
        falsePositives++;
      }
    }
  }

  // Calculate metrics
  const sensitivity = totalPHI > 0 ? (detectedPHI / totalPHI * 100) : 0;
  const specificity = totalNonPHI > 0 ? (preservedNonPHI / totalNonPHI * 100) : 0;
  const cleanRate = cleanDetected.total > 0 ? (cleanDetected.detected / cleanDetected.total * 100) : 0;
  const erroredRate = erroredDetected.total > 0 ? (erroredDetected.detected / erroredDetected.total * 100) : 0;

  // Calculate overall score (weighted)
  // Sensitivity is critical (90% weight), specificity important (10% weight)
  const overallScore = Math.round(sensitivity * 0.9 + specificity * 0.1);

  let grade;
  if (overallScore >= 98) grade = "A+";
  else if (overallScore >= 95) grade = "A";
  else if (overallScore >= 92) grade = "A-";
  else if (overallScore >= 89) grade = "B+";
  else if (overallScore >= 86) grade = "B";
  else if (overallScore >= 83) grade = "B-";
  else if (overallScore >= 80) grade = "C+";
  else if (overallScore >= 77) grade = "C";
  else if (overallScore >= 74) grade = "C-";
  else if (overallScore >= 70) grade = "D";
  else grade = "F";

  // ============================================================================
  // DISPLAY RESULTS
  // ============================================================================
  console.log("=".repeat(80));
  console.log("STRESS TEST RESULTS");
  console.log("=".repeat(80));
  console.log();

  console.log(`Documents Assessed: ${shuffledDocs.length}`);
  console.log(`Total PHI Items Tested: ${totalPHI}`);
  console.log(`Total Non-PHI Items Tested: ${totalNonPHI}`);
  console.log();

  console.log("SENSITIVITY (PHI Detection):");
  console.log(`  Expected PHI items:  ${totalPHI}`);
  console.log(`  Correctly redacted:  ${detectedPHI}`);
  console.log(`  Missed (FN):         ${missedPHI}`);
  console.log(`  SENSITIVITY:         ${sensitivity.toFixed(2)}%`);
  console.log();

  console.log("SPECIFICITY (Non-PHI Preservation):");
  console.log(`  Expected non-PHI:    ${totalNonPHI}`);
  console.log(`  Correctly preserved: ${preservedNonPHI}`);
  console.log(`  False positives:     ${falsePositives}`);
  console.log(`  SPECIFICITY:         ${specificity.toFixed(2)}%`);
  console.log();

  console.log("-".repeat(80));
  console.log(`OVERALL SCORE: ${overallScore}/100 (${grade})`);
  console.log("-".repeat(80));
  console.log();

  console.log("PERFORMANCE BY ERROR LEVEL:");
  console.log("-".repeat(40));
  for (const level of errorLevels) {
    const data = detectedByLevel[level] || { total: 0, detected: 0 };
    const rate = data.total > 0 ? (data.detected / data.total * 100) : 0;
    const missed = missedByLevel[level] || 0;
    console.log(`  ${level.toUpperCase().padEnd(8)}: ${data.detected}/${data.total} (${rate.toFixed(1)}%) - ${missed} missed`);
  }
  console.log();

  console.log("CLEAN vs ERRORED ITEMS:");
  console.log("-".repeat(40));
  console.log(`  Clean items:   ${cleanDetected.detected}/${cleanDetected.total} (${cleanRate.toFixed(1)}%)`);
  console.log(`  Errored items: ${erroredDetected.detected}/${erroredDetected.total} (${erroredRate.toFixed(1)}%)`);
  console.log();

  console.log("MISSED PHI BY TYPE:");
  console.log("-".repeat(40));
  for (const [type, count] of Object.entries(missedByType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count} missed`);
  }
  console.log();

  console.log("SAMPLE FAILURES (first 30):");
  for (const failure of failures.slice(0, 30)) {
    console.log(`  Doc ${failure.docId} (${failure.docType}) [${failure.errorLevel}]:`);
    if (failure.hasErrors) {
      console.log(`    - ${failure.phiType}: "${failure.original}" -> "${failure.value}" [CORRUPTED]`);
    } else {
      console.log(`    - ${failure.phiType}: "${failure.value}" [CLEAN]`);
    }
  }
  console.log();

  // Save detailed results
  const resultsDir = path.join(__dirname, "results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const detailedResults = {
    timestamp: new Date().toISOString(),
    summary: {
      documentsAssessed: shuffledDocs.length,
      totalPHI,
      detectedPHI,
      missedPHI,
      sensitivity: sensitivity.toFixed(2),
      totalNonPHI,
      preservedNonPHI,
      falsePositives,
      specificity: specificity.toFixed(2),
      overallScore,
      grade,
      cleanRate: cleanRate.toFixed(2),
      erroredRate: erroredRate.toFixed(2)
    },
    byErrorLevel: detectedByLevel,
    missedByType,
    missedByLevel,
    failures
  };

  const resultsFile = path.join(resultsDir, "stress-test-200.json");
  fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
  console.log(`Detailed results saved to: ${resultsFile}`);
  console.log("=".repeat(80));
}

runStressTest().catch(console.error);
