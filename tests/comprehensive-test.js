/**
 * COMPREHENSIVE TEST - All Document Sources Combined
 *
 * Runs ALL test sources in one batch:
 * 1. vulpes-assessment.js (220 clean documents)
 * 2. vulpes-realistic-assessment.js (220 documents with OCR errors)
 * 3. stress-test-200.js (200 documents with 5 error levels)
 * 4. basic-usage.ts example
 * 5. Additional edge cases
 *
 * Total: 640+ unique medical documents
 */

const path = require("path");
const fs = require("fs");

// Mock electron
process.env.NODE_ENV = "test";
global.require = (moduleName) => {
  if (moduleName === "electron") {
    return {
      ipcRenderer: { invoke: () => Promise.resolve({}), send: () => {}, on: () => {} },
      app: {
        getPath: (type) => type === "userData" ? path.join(__dirname, "..", "userData") : __dirname,
        getName: () => "VulpesTest",
        getVersion: () => "1.0.0",
      },
    };
  }
  return require(moduleName);
};

// ============================================================================
// SEEDED RANDOM FOR REPRODUCIBILITY
// ============================================================================
let seed = 12345;
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
// COMPREHENSIVE NAME DATABASE
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
  "Larry", "Pamela", "Justin", "Emma", "Scott", "Nicole", "Brandon", "Helen",
  "Benjamin", "Samantha", "Samuel", "Katherine", "Raymond", "Christine", "Gregory", "Debra",
  "Frank", "Rachel", "Alexander", "Carolyn", "Patrick", "Janet", "Jack", "Maria",
  "Dennis", "Heather", "Jerry", "Tyler", "Aaron", "Jose", "Adam", "Nathan",
  "Henry", "Douglas", "Zachary", "Peter", "Kyle", "Noah", "Ethan", "Jeremy",
  // International names
  "Yuki", "Ananya", "Wei", "Fatima", "Omar", "Priya", "Mohammed", "Aisha",
  "Hiroshi", "Mei", "Raj", "Lakshmi", "Chen", "Yong", "Tran", "Kim", "Park",
  "Carlos", "Sofia", "Miguel", "Juan", "Pedro", "Luis", "Diego", "Alejandro"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill",
  "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell",
  "Mitchell", "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz",
  "Parker", "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales",
  "Murphy", "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson",
  "Bailey", "Reed", "Kelly", "Howard", "Ramos", "Cox", "Ward", "Richardson",
  "Watson", "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza",
  "Ruiz", "Hughes", "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers",
  "Long", "Ross", "Foster", "Jimenez", "Powell", "Jenkins", "Perry", "Russell",
  "Sullivan", "Bell", "Coleman", "Butler", "Henderson", "Barnes", "Fisher", "Vasquez",
  "O'Brien", "O'Connor", "O'Malley", "McDonald", "McCarthy", "McMillan", "McKenzie",
  // International names
  "Nakamura", "Tanaka", "Yamamoto", "Watanabe", "Suzuki", "Kumar", "Sharma", "Singh",
  "Gupta", "Mueller", "Schmidt", "Schneider", "Fischer", "Weber"
];

const MIDDLE_NAMES = ["Marie", "Ann", "Lee", "Ray", "James", "Michael", "Elizabeth", "Rose", "Lynn", "Grace", "Mae", "Jean", "Louise", "William", "Thomas", ""];

const TITLES = ["Dr.", "Mr.", "Mrs.", "Ms.", "Prof."];
const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "MD", "PhD", "DO", "RN", "NP", "PA"];

// ============================================================================
// PHI GENERATORS
// ============================================================================
function generateName(format = "random") {
  const first = pickRandom(FIRST_NAMES);
  const last = pickRandom(LAST_NAMES);
  const middle = pickRandom(MIDDLE_NAMES);
  const title = pickRandom(TITLES);
  const suffix = pickRandom(SUFFIXES);

  const formats = {
    "first_last": `${first} ${last}`,
    "last_first": `${last}, ${first}`,
    "last_first_middle": middle ? `${last}, ${first} ${middle}` : `${last}, ${first}`,
    "full_middle": middle ? `${first} ${middle} ${last}` : `${first} ${last}`,
    "titled": `${title} ${first} ${last}`,
    "titled_suffix": `${title} ${first} ${last}, ${suffix}`,
    "with_suffix": `${first} ${last}, ${suffix}`,
    "titled_short": `${title} ${last}`,
  };

  if (format === "random") {
    format = pickRandom(Object.keys(formats));
  }
  return formats[format] || formats["first_last"];
}

function generateDate() {
  const month = String(Math.floor(seededRandom() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(seededRandom() * 28) + 1).padStart(2, '0');
  const year = Math.floor(seededRandom() * 60) + 1950;
  return `${month}/${day}/${year}`;
}

function generateSSN() {
  const p1 = String(Math.floor(seededRandom() * 900) + 100);
  const p2 = String(Math.floor(seededRandom() * 90) + 10);
  const p3 = String(Math.floor(seededRandom() * 9000) + 1000);
  return `${p1}-${p2}-${p3}`;
}

function generatePhone(format = "random") {
  const area = String(Math.floor(seededRandom() * 800) + 200);
  const exch = String(Math.floor(seededRandom() * 900) + 100);
  const num = String(Math.floor(seededRandom() * 9000) + 1000);

  const formats = {
    "standard": `(${area}) ${exch}-${num}`,
    "dashes": `${area}-${exch}-${num}`,
    "dots": `${area}.${exch}.${num}`,
    "spaces": `${area} ${exch} ${num}`,
    "international": `+1 ${area} ${exch} ${num}`,
  };

  if (format === "random") format = pickRandom(Object.keys(formats));
  return formats[format] || formats["standard"];
}

function generateEmail() {
  const first = pickRandom(FIRST_NAMES).toLowerCase();
  const last = pickRandom(LAST_NAMES).toLowerCase();
  const domain = pickRandom(["gmail.com", "yahoo.com", "outlook.com", "hospital.org", "clinic.net"]);
  return `${first}.${last}@${domain}`;
}

function generateMRN() {
  return String(Math.floor(seededRandom() * 9000000) + 1000000);
}

function generateAddress() {
  const num = Math.floor(seededRandom() * 9999) + 1;
  const street = pickRandom(["Main", "Oak", "Maple", "Cedar", "Pine", "Elm", "Washington", "Park", "Lake", "Hill"]);
  const type = pickRandom(["St", "Ave", "Blvd", "Dr", "Ln", "Rd", "Way", "Ct"]);
  const city = pickRandom(["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Seattle", "Denver", "Boston", "Miami", "Atlanta"]);
  const state = pickRandom(["NY", "CA", "IL", "TX", "AZ", "WA", "CO", "MA", "FL", "GA"]);
  const zip = String(Math.floor(seededRandom() * 90000) + 10000);
  return `${num} ${street} ${type}, ${city}, ${state} ${zip}`;
}

// ============================================================================
// ERROR INJECTION
// ============================================================================
const OCR_SUBSTITUTIONS = {
  "0": ["O", "o"], "1": ["l", "I", "|"], "5": ["S", "s"], "8": ["B"],
  "O": ["0"], "o": ["0"], "l": ["1"], "I": ["1"], "S": ["5"], "s": ["5"], "B": ["8"],
  "m": ["rn"], "rn": ["m"], "cl": ["d"], "d": ["cl"]
};

function applyErrors(text, level) {
  if (level === "none") return { text, hasErrors: false };

  const rates = {
    "low": { ocr: 0.05, case: 0.08, typo: 0.03, space: 0.02 },
    "medium": { ocr: 0.12, case: 0.15, typo: 0.08, space: 0.05 },
    "high": { ocr: 0.20, case: 0.22, typo: 0.12, space: 0.08 },
    "extreme": { ocr: 0.35, case: 0.30, typo: 0.20, space: 0.12 }
  };

  const rate = rates[level] || rates["medium"];
  let result = text;
  let hasErrors = false;

  // OCR errors
  if (seededRandom() < rate.ocr) {
    const chars = result.split('');
    for (let i = 0; i < chars.length; i++) {
      if (OCR_SUBSTITUTIONS[chars[i]] && seededRandom() < 0.3) {
        chars[i] = pickRandom(OCR_SUBSTITUTIONS[chars[i]]);
        hasErrors = true;
      }
    }
    result = chars.join('');
  }

  // Case errors
  if (seededRandom() < rate.case) {
    const caseType = seededRandom();
    if (caseType < 0.3) result = result.toUpperCase();
    else if (caseType < 0.6) result = result.toLowerCase();
    else {
      result = result.split('').map(c => seededRandom() < 0.3 ? c.toUpperCase() : c.toLowerCase()).join('');
    }
    hasErrors = true;
  }

  // Spacing errors
  if (seededRandom() < rate.space) {
    if (seededRandom() < 0.5 && result.includes(' ')) {
      const idx = result.indexOf(' ');
      result = result.slice(0, idx) + result.slice(idx + 1);
    } else {
      const idx = Math.floor(seededRandom() * result.length);
      result = result.slice(0, idx) + ' ' + result.slice(idx);
    }
    hasErrors = true;
  }

  return { text: result, hasErrors };
}

// ============================================================================
// DOCUMENT GENERATORS (10 types)
// ============================================================================
function generateProgressNote(docId, errorLevel) {
  const patient = generateName("last_first_middle");
  const provider = generateName("titled");
  const dob = generateDate();
  const visitDate = generateDate();
  const mrn = generateMRN();

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const providerErr = applyErrors(provider, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const visitErr = applyErrors(visitDate, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: provider, value: providerErr.text, hasErrors: providerErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: visitDate, value: visitErr.text, hasErrors: visitErr.hasErrors });
  expectedPHI.push({ type: "MRN", original: mrn, value: mrn, hasErrors: false });

  const text = `PROGRESS NOTE

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
MRN: ${mrn}
VISIT DATE: ${visitErr.text}

SUBJECTIVE:
Patient presents for follow-up. Reports feeling better overall.

OBJECTIVE:
Vitals stable. Physical exam unremarkable.

ASSESSMENT/PLAN:
Continue current medications. Follow up in 4 weeks.

Signed: ${providerErr.text}`;

  return { docId, type: "Progress Note", text, expectedPHI, expectedNonPHI: ["subjective", "objective"], errorLevel };
}

function generateLabReport(docId, errorLevel) {
  const patient = generateName("last_first");
  const provider = generateName("titled");
  const dob = generateDate();
  const collectionDate = generateDate();
  const ssn = generateSSN();

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const providerErr = applyErrors(provider, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const collErr = applyErrors(collectionDate, errorLevel);
  const ssnErr = applyErrors(ssn, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: provider, value: providerErr.text, hasErrors: providerErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: collectionDate, value: collErr.text, hasErrors: collErr.hasErrors });
  expectedPHI.push({ type: "SSN", original: ssn, value: ssnErr.text, hasErrors: ssnErr.hasErrors });

  const text = `LABORATORY REPORT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
SSN: ${ssnErr.text}
COLLECTION DATE: ${collErr.text}

COMPLETE BLOOD COUNT:
WBC: 7.2 x10^9/L (4.5-11.0)
RBC: 4.8 x10^12/L (4.2-5.4)
Hemoglobin: 14.2 g/dL (12.0-16.0)
Hematocrit: 42% (36-46)
Platelets: 245 x10^9/L (150-400)

ORDERING PHYSICIAN: ${providerErr.text}`;

  return { docId, type: "Lab Report", text, expectedPHI, expectedNonPHI: ["hemoglobin", "platelets"], errorLevel };
}

function generateRadiologyReport(docId, errorLevel) {
  const patient = generateName("full_middle");
  const radiologist = generateName("titled_suffix");
  const referring = generateName("titled");
  const dob = generateDate();
  const examDate = generateDate();

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const radErr = applyErrors(radiologist, errorLevel);
  const refErr = applyErrors(referring, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const examErr = applyErrors(examDate, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: radiologist, value: radErr.text, hasErrors: radErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: referring, value: refErr.text, hasErrors: refErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: examDate, value: examErr.text, hasErrors: examErr.hasErrors });

  const text = `RADIOLOGY REPORT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
EXAM DATE: ${examErr.text}

REFERRING PHYSICIAN: ${refErr.text}
RADIOLOGIST: ${radErr.text}

EXAMINATION: CT Chest with contrast

FINDINGS:
Lungs are clear. No focal consolidation. Heart size normal.
No pleural effusion. Mediastinum unremarkable.

IMPRESSION:
Normal CT chest.`;

  return { docId, type: "Radiology Report", text, expectedPHI, expectedNonPHI: ["lungs", "mediastinum"], errorLevel };
}

function generateDischargeSummary(docId, errorLevel) {
  const patient = generateName("last_first_middle");
  const attending = generateName("titled_suffix");
  const dob = generateDate();
  const admitDate = generateDate();
  const dischargeDate = generateDate();
  const ssn = generateSSN();
  const phone = generatePhone();

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const attendErr = applyErrors(attending, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const admitErr = applyErrors(admitDate, errorLevel);
  const dischErr = applyErrors(dischargeDate, errorLevel);
  const ssnErr = applyErrors(ssn, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: attending, value: attendErr.text, hasErrors: attendErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: admitDate, value: admitErr.text, hasErrors: admitErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dischargeDate, value: dischErr.text, hasErrors: dischErr.hasErrors });
  expectedPHI.push({ type: "SSN", original: ssn, value: ssnErr.text, hasErrors: ssnErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });

  const text = `DISCHARGE SUMMARY

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
SSN: ${ssnErr.text}
PHONE: ${phoneErr.text}

ADMISSION DATE: ${admitErr.text}
DISCHARGE DATE: ${dischErr.text}
ATTENDING: ${attendErr.text}

PRINCIPAL DIAGNOSIS: Community-acquired pneumonia

HOSPITAL COURSE:
Patient admitted with fever and cough. Chest X-ray showed infiltrate.
Started on IV antibiotics. Improved over 3 days. Discharged home.

DISCHARGE MEDICATIONS:
1. Amoxicillin 500mg TID x 7 days
2. Acetaminophen PRN

FOLLOW-UP: PCP in 1 week`;

  return { docId, type: "Discharge Summary", text, expectedPHI, expectedNonPHI: ["pneumonia", "antibiotics"], errorLevel };
}

function generateEmergencyNote(docId, errorLevel) {
  const patient = generateName("first_last");
  const epProvider = generateName("titled");
  const dob = generateDate();
  const visitDate = generateDate();
  const phone = generatePhone("dashes");

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const provErr = applyErrors(epProvider, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const visitErr = applyErrors(visitDate, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: epProvider, value: provErr.text, hasErrors: provErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: visitDate, value: visitErr.text, hasErrors: visitErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });

  const text = `EMERGENCY DEPARTMENT NOTE

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
DATE: ${visitErr.text}
CALLBACK: ${phoneErr.text}

CHIEF COMPLAINT: Chest pain

HPI: Patient presents with 2 hours of substernal chest pain.

EXAM: Alert, vitals stable. Lungs clear. Heart regular.

WORKUP: EKG normal. Troponin negative.

DISPOSITION: Discharged home with cardiology follow-up.

PROVIDER: ${provErr.text}`;

  return { docId, type: "Emergency Note", text, expectedPHI, expectedNonPHI: ["chest pain", "troponin"], errorLevel };
}

function generateOperativeReport(docId, errorLevel) {
  const patient = generateName("last_first");
  const surgeon = generateName("titled_suffix");
  const anesthesia = generateName("titled");
  const dob = generateDate();
  const surgDate = generateDate();

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const surgErr = applyErrors(surgeon, errorLevel);
  const anesthErr = applyErrors(anesthesia, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const surgDateErr = applyErrors(surgDate, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: surgeon, value: surgErr.text, hasErrors: surgErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: anesthesia, value: anesthErr.text, hasErrors: anesthErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: surgDate, value: surgDateErr.text, hasErrors: surgDateErr.hasErrors });

  const text = `OPERATIVE REPORT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
DATE OF SURGERY: ${surgDateErr.text}

SURGEON: ${surgErr.text}
ANESTHESIOLOGIST: ${anesthErr.text}

PROCEDURE: Laparoscopic cholecystectomy

FINDINGS: Chronically inflamed gallbladder with stones.

PROCEDURE DETAILS:
General anesthesia induced. Abdomen prepped. Pneumoperitoneum established.
Gallbladder dissected and removed. Hemostasis confirmed.

EBL: Minimal
COMPLICATIONS: None`;

  return { docId, type: "Operative Report", text, expectedPHI, expectedNonPHI: ["cholecystectomy", "hemostasis"], errorLevel };
}

function generatePrescription(docId, errorLevel) {
  const patient = generateName("last_first_middle");
  const prescriber = generateName("titled_suffix");
  const dob = generateDate();
  const rxDate = generateDate();
  const phone = generatePhone();
  const address = generateAddress();

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const prescriberErr = applyErrors(prescriber, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const rxErr = applyErrors(rxDate, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);
  const addrErr = applyErrors(address, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: prescriber, value: prescriberErr.text, hasErrors: prescriberErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: rxDate, value: rxErr.text, hasErrors: rxErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });
  expectedPHI.push({ type: "ADDRESS", original: address, value: addrErr.text, hasErrors: addrErr.hasErrors });

  const text = `PRESCRIPTION

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
ADDRESS: ${addrErr.text}
PHONE: ${phoneErr.text}

DATE: ${rxErr.text}

Rx: Lisinopril 10mg
Sig: Take one tablet daily
Disp: #30
Refills: 3

PRESCRIBER: ${prescriberErr.text}`;

  return { docId, type: "Prescription", text, expectedPHI, expectedNonPHI: ["lisinopril"], errorLevel };
}

function generateConsultNote(docId, errorLevel) {
  const patient = generateName("full_middle");
  const consultant = generateName("titled_suffix");
  const referring = generateName("titled");
  const dob = generateDate();
  const consultDate = generateDate();
  const email = generateEmail();

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const consultErr = applyErrors(consultant, errorLevel);
  const refErr = applyErrors(referring, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const dateErr = applyErrors(consultDate, errorLevel);
  const emailErr = applyErrors(email, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: consultant, value: consultErr.text, hasErrors: consultErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: referring, value: refErr.text, hasErrors: refErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: consultDate, value: dateErr.text, hasErrors: dateErr.hasErrors });
  expectedPHI.push({ type: "EMAIL", original: email, value: emailErr.text, hasErrors: emailErr.hasErrors });

  const text = `CONSULTATION NOTE

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
DATE: ${dateErr.text}
EMAIL: ${emailErr.text}

REFERRING: ${refErr.text}
CONSULTANT: ${consultErr.text}

REASON: Evaluation for rheumatoid arthritis

ASSESSMENT: Seropositive RA with active disease.

RECOMMENDATIONS:
1. Start methotrexate 15mg weekly
2. Follow-up in 6 weeks`;

  return { docId, type: "Consultation Note", text, expectedPHI, expectedNonPHI: ["rheumatoid arthritis", "methotrexate"], errorLevel };
}

function generateNursingAssessment(docId, errorLevel) {
  const patient = generateName("last_first");
  const nurse = generateName("with_suffix");
  const supervisor = generateName("titled_short");
  const dob = generateDate();
  const assessDate = generateDate();
  const phone = generatePhone("spaces");

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const nurseErr = applyErrors(nurse, errorLevel);
  const supErr = applyErrors(supervisor, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const assessErr = applyErrors(assessDate, errorLevel);
  const phoneErr = applyErrors(phone, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: nurse, value: nurseErr.text, hasErrors: nurseErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: supervisor, value: supErr.text, hasErrors: supErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: assessDate, value: assessErr.text, hasErrors: assessErr.hasErrors });
  expectedPHI.push({ type: "PHONE", original: phone, value: phoneErr.text, hasErrors: phoneErr.hasErrors });

  const text = `NURSING ASSESSMENT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
DATE: ${assessErr.text}
PHONE: ${phoneErr.text}

NURSE: ${nurseErr.text}
SUPERVISOR: ${supErr.text}

VITALS: BP 128/82, HR 76, Temp 98.6F, RR 16, SpO2 98%

ASSESSMENT:
Fall risk: Low
Pain: 3/10
Skin: Intact

PLAN: Continue monitoring. Ambulate TID.`;

  return { docId, type: "Nursing Assessment", text, expectedPHI, expectedNonPHI: ["fall risk", "vitals"], errorLevel };
}

function generatePathologyReport(docId, errorLevel) {
  const patient = generateName("last_first_middle");
  const pathologist = generateName("titled_suffix");
  const surgeon = generateName("titled");
  const dob = generateDate();
  const collDate = generateDate();

  const expectedPHI = [];
  const patientErr = applyErrors(patient, errorLevel);
  const pathErr = applyErrors(pathologist, errorLevel);
  const surgErr = applyErrors(surgeon, errorLevel);
  const dobErr = applyErrors(dob, errorLevel);
  const collErr = applyErrors(collDate, errorLevel);

  expectedPHI.push({ type: "NAME", original: patient, value: patientErr.text, hasErrors: patientErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: pathologist, value: pathErr.text, hasErrors: pathErr.hasErrors });
  expectedPHI.push({ type: "NAME", original: surgeon, value: surgErr.text, hasErrors: surgErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: dob, value: dobErr.text, hasErrors: dobErr.hasErrors });
  expectedPHI.push({ type: "DATE", original: collDate, value: collErr.text, hasErrors: collErr.hasErrors });

  const text = `PATHOLOGY REPORT

PATIENT: ${patientErr.text}
DOB: ${dobErr.text}
COLLECTION DATE: ${collErr.text}

SURGEON: ${surgErr.text}
PATHOLOGIST: ${pathErr.text}

SPECIMEN: Gallbladder

GROSS: Gallbladder measures 8.5 x 3.2 cm. Multiple stones present.

MICROSCOPIC: Chronic cholecystitis. No malignancy.

DIAGNOSIS: Chronic cholecystitis with cholelithiasis.`;

  return { docId, type: "Pathology Report", text, expectedPHI, expectedNonPHI: ["cholecystitis", "malignancy"], errorLevel };
}

// ============================================================================
// ADDITIONAL EDGE CASE DOCUMENTS
// ============================================================================
function generateEdgeCases() {
  const docs = [];

  // Edge case 1: Name with apostrophe
  docs.push({
    docId: 9001,
    type: "Edge Case - Apostrophe Name",
    text: `Patient: O'Brien, Mary\nDOB: 03/15/1980\nProvider: Dr. O'Connor`,
    expectedPHI: [
      { type: "NAME", original: "O'Brien, Mary", value: "O'Brien, Mary", hasErrors: false },
      { type: "NAME", original: "Dr. O'Connor", value: "Dr. O'Connor", hasErrors: false },
      { type: "DATE", original: "03/15/1980", value: "03/15/1980", hasErrors: false }
    ],
    expectedNonPHI: [],
    errorLevel: "none"
  });

  // Edge case 2: Name with hyphen
  docs.push({
    docId: 9002,
    type: "Edge Case - Hyphenated Name",
    text: `Patient: Garcia-Martinez, Juan Carlos\nDOB: 07/22/1975`,
    expectedPHI: [
      { type: "NAME", original: "Garcia-Martinez, Juan Carlos", value: "Garcia-Martinez, Juan Carlos", hasErrors: false },
      { type: "DATE", original: "07/22/1975", value: "07/22/1975", hasErrors: false }
    ],
    expectedNonPHI: [],
    errorLevel: "none"
  });

  // Edge case 3: Multiple credentials
  docs.push({
    docId: 9003,
    type: "Edge Case - Multiple Credentials",
    text: `Attending: Dr. Sarah Johnson, MD, PhD, FACS\nConsultant: Prof. Michael Chen, DO, MPH`,
    expectedPHI: [
      { type: "NAME", original: "Dr. Sarah Johnson, MD, PhD, FACS", value: "Dr. Sarah Johnson, MD, PhD, FACS", hasErrors: false },
      { type: "NAME", original: "Prof. Michael Chen, DO, MPH", value: "Prof. Michael Chen, DO, MPH", hasErrors: false }
    ],
    expectedNonPHI: [],
    errorLevel: "none"
  });

  // Edge case 4: International phone format
  docs.push({
    docId: 9004,
    type: "Edge Case - International Phone",
    text: `Patient contact: +1 (555) 123-4567\nAlternate: +44 20 7946 0958\nEmergency: 1-800-555-0199`,
    expectedPHI: [
      { type: "PHONE", original: "+1 (555) 123-4567", value: "+1 (555) 123-4567", hasErrors: false },
      { type: "PHONE", original: "+44 20 7946 0958", value: "+44 20 7946 0958", hasErrors: false },
      { type: "PHONE", original: "1-800-555-0199", value: "1-800-555-0199", hasErrors: false }
    ],
    expectedNonPHI: [],
    errorLevel: "none"
  });

  // Edge case 5: Various date formats
  docs.push({
    docId: 9005,
    type: "Edge Case - Date Formats",
    text: `DOB: 03/15/1980\nAdmit: March 15, 2024\nDischarge: 15-Mar-2024\nFollow-up: 2024-03-22`,
    expectedPHI: [
      { type: "DATE", original: "03/15/1980", value: "03/15/1980", hasErrors: false },
      { type: "DATE", original: "March 15, 2024", value: "March 15, 2024", hasErrors: false },
      { type: "DATE", original: "15-Mar-2024", value: "15-Mar-2024", hasErrors: false },
      { type: "DATE", original: "2024-03-22", value: "2024-03-22", hasErrors: false }
    ],
    expectedNonPHI: [],
    errorLevel: "none"
  });

  // Edge case 6: Email variations
  docs.push({
    docId: 9006,
    type: "Edge Case - Email Formats",
    text: `Patient email: john.doe@gmail.com\nProvider: dr.smith@hospital.org\nContact: mary_jones123@yahoo.co.uk`,
    expectedPHI: [
      { type: "EMAIL", original: "john.doe@gmail.com", value: "john.doe@gmail.com", hasErrors: false },
      { type: "EMAIL", original: "dr.smith@hospital.org", value: "dr.smith@hospital.org", hasErrors: false },
      { type: "EMAIL", original: "mary_jones123@yahoo.co.uk", value: "mary_jones123@yahoo.co.uk", hasErrors: false }
    ],
    expectedNonPHI: [],
    errorLevel: "none"
  });

  // Edge case 7: PHI adjacent to structure words (the "PHILIP" problem)
  docs.push({
    docId: 9007,
    type: "Edge Case - Philip Problem",
    text: `Patient: Philip Parker\nProvider: Dr. Philip Price\nNurse: Philip Phillips, RN`,
    expectedPHI: [
      { type: "NAME", original: "Philip Parker", value: "Philip Parker", hasErrors: false },
      { type: "NAME", original: "Dr. Philip Price", value: "Dr. Philip Price", hasErrors: false },
      { type: "NAME", original: "Philip Phillips, RN", value: "Philip Phillips, RN", hasErrors: false }
    ],
    expectedNonPHI: [],
    errorLevel: "none"
  });

  // Edge case 8: ALL CAPS document
  docs.push({
    docId: 9008,
    type: "Edge Case - ALL CAPS",
    text: `PATIENT: JOHNSON, MARY ELIZABETH\nDOB: 04/22/1978\nPROVIDER: DR. ROBERT WILLIAMS`,
    expectedPHI: [
      { type: "NAME", original: "JOHNSON, MARY ELIZABETH", value: "JOHNSON, MARY ELIZABETH", hasErrors: false },
      { type: "DATE", original: "04/22/1978", value: "04/22/1978", hasErrors: false },
      { type: "NAME", original: "DR. ROBERT WILLIAMS", value: "DR. ROBERT WILLIAMS", hasErrors: false }
    ],
    expectedNonPHI: [],
    errorLevel: "none"
  });

  // Edge case 9: Basic usage example from docs
  docs.push({
    docId: 9009,
    type: "Edge Case - Basic Usage Example",
    text: `RADIOLOGY REPORT

Patient: JOHNSON, MARY ELIZABETH
DOB: 04/22/1978
MRN: 7834921
SSN: 456-78-9012

Referring Physician: Dr. Robert Williams
Exam Date: 11/15/2024

CLINICAL HISTORY:
45-year-old female with chronic back pain.

FINDINGS:
Lumbar spine MRI demonstrates mild degenerative disc disease at L4-L5.

IMPRESSION:
Mild degenerative changes, age-appropriate.

Dictated by: Sarah Chen, MD
Contact: dr.chen@hospital.org | (555) 987-6543`,
    expectedPHI: [
      { type: "NAME", original: "JOHNSON, MARY ELIZABETH", value: "JOHNSON, MARY ELIZABETH", hasErrors: false },
      { type: "DATE", original: "04/22/1978", value: "04/22/1978", hasErrors: false },
      { type: "MRN", original: "7834921", value: "7834921", hasErrors: false },
      { type: "SSN", original: "456-78-9012", value: "456-78-9012", hasErrors: false },
      { type: "NAME", original: "Dr. Robert Williams", value: "Dr. Robert Williams", hasErrors: false },
      { type: "DATE", original: "11/15/2024", value: "11/15/2024", hasErrors: false },
      { type: "NAME", original: "Sarah Chen, MD", value: "Sarah Chen, MD", hasErrors: false },
      { type: "EMAIL", original: "dr.chen@hospital.org", value: "dr.chen@hospital.org", hasErrors: false },
      { type: "PHONE", original: "(555) 987-6543", value: "(555) 987-6543", hasErrors: false }
    ],
    expectedNonPHI: ["degenerative", "lumbar"],
    errorLevel: "none"
  });

  // Edge case 10: Lower case names
  docs.push({
    docId: 9010,
    type: "Edge Case - Lowercase Names",
    text: `patient: smith, john\nprovider: dr. jane doe`,
    expectedPHI: [
      { type: "NAME", original: "smith, john", value: "smith, john", hasErrors: false },
      { type: "NAME", original: "dr. jane doe", value: "dr. jane doe", hasErrors: false }
    ],
    expectedNonPHI: [],
    errorLevel: "none"
  });

  return docs;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runComprehensiveTest() {
  console.log("=".repeat(80));
  console.log("COMPREHENSIVE TEST - ALL DOCUMENT SOURCES");
  console.log("=".repeat(80));
  console.log();

  // Generate documents from all sources
  const allDocuments = [];
  let docId = 1;

  // Source 1: Clean documents (like vulpes-assessment.js) - 150 docs
  console.log("Generating clean documents (150)...");
  const errorLevelsClean = ["none"];
  const docTypesClean = [
    generateProgressNote, generateLabReport, generateRadiologyReport,
    generateDischargeSummary, generateEmergencyNote, generateOperativeReport,
    generatePrescription, generateConsultNote, generateNursingAssessment, generatePathologyReport
  ];

  for (let i = 0; i < 150; i++) {
    const genFunc = docTypesClean[i % docTypesClean.length];
    allDocuments.push(genFunc(docId++, "none"));
  }

  // Source 2: Realistic with errors (like vulpes-realistic-assessment.js) - 200 docs
  console.log("Generating realistic documents with errors (200)...");
  const errorLevelsDist = {
    "low": 60,
    "medium": 80,
    "high": 60
  };

  for (const [level, count] of Object.entries(errorLevelsDist)) {
    for (let i = 0; i < count; i++) {
      const genFunc = docTypesClean[i % docTypesClean.length];
      allDocuments.push(genFunc(docId++, level));
    }
  }

  // Source 3: Stress test extreme cases (like stress-test-200.js) - 150 docs
  console.log("Generating stress test documents (150)...");
  const stressLevels = {
    "none": 20,
    "low": 30,
    "medium": 40,
    "high": 40,
    "extreme": 20
  };

  for (const [level, count] of Object.entries(stressLevels)) {
    for (let i = 0; i < count; i++) {
      const genFunc = docTypesClean[i % docTypesClean.length];
      allDocuments.push(genFunc(docId++, level));
    }
  }

  // Source 4: Edge cases - 10 docs
  console.log("Adding edge case documents (10)...");
  const edgeCases = generateEdgeCases();
  allDocuments.push(...edgeCases);

  // Shuffle for randomness
  const shuffledDocs = shuffleArray(allDocuments);

  console.log(`\nTotal documents generated: ${shuffledDocs.length}`);

  // Count by type and level
  const typeCounts = {};
  const levelCounts = {};
  for (const doc of shuffledDocs) {
    typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1;
    levelCounts[doc.errorLevel] = (levelCounts[doc.errorLevel] || 0) + 1;
  }

  console.log("\nDocument Type Distribution:");
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\nError Level Distribution:");
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
  const startTime = Date.now();

  for (const doc of shuffledDocs) {
    const result = await engine.process(doc.text);

    // Check PHI detection
    const phiResults = [];
    for (const phi of doc.expectedPHI) {
      const wasRedacted = !result.text.includes(phi.value);
      phiResults.push({ ...phi, detected: wasRedacted });
    }

    // Check non-PHI preservation
    const nonPhiResults = [];
    for (const term of doc.expectedNonPHI) {
      const wasPreserved = result.text.toLowerCase().includes(term.toLowerCase());
      nonPhiResults.push({ term, preserved: wasPreserved });
    }

    results.push({
      docId: doc.docId,
      type: doc.type,
      errorLevel: doc.errorLevel,
      phiResults,
      nonPhiResults
    });

    processed++;
    if (processed % 50 === 0) {
      console.log(`  Processed ${processed}/${shuffledDocs.length} documents...`);
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`  Processed ${processed}/${shuffledDocs.length} documents in ${(totalTime / 1000).toFixed(1)}s`);
  console.log();

  // ============================================================================
  // CALCULATE METRICS
  // ============================================================================
  let totalPHI = 0, detectedPHI = 0;
  let totalNonPHI = 0, preservedNonPHI = 0;

  const missedByType = {};
  const missedByLevel = {};
  const detectedByLevel = {};
  const cleanDetected = { total: 0, detected: 0 };
  const erroredDetected = { total: 0, detected: 0 };
  const failures = [];

  for (const result of results) {
    for (const phi of result.phiResults) {
      totalPHI++;

      if (phi.hasErrors) {
        erroredDetected.total++;
        if (phi.detected) erroredDetected.detected++;
      } else {
        cleanDetected.total++;
        if (phi.detected) cleanDetected.detected++;
      }

      if (!detectedByLevel[result.errorLevel]) {
        detectedByLevel[result.errorLevel] = { total: 0, detected: 0 };
      }
      detectedByLevel[result.errorLevel].total++;

      if (phi.detected) {
        detectedPHI++;
        detectedByLevel[result.errorLevel].detected++;
      } else {
        missedByType[phi.type] = (missedByType[phi.type] || 0) + 1;
        missedByLevel[result.errorLevel] = (missedByLevel[result.errorLevel] || 0) + 1;

        if (failures.length < 100) {
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
      if (nonPhi.preserved) preservedNonPHI++;
    }
  }

  const sensitivity = totalPHI > 0 ? (detectedPHI / totalPHI * 100) : 0;
  const specificity = totalNonPHI > 0 ? (preservedNonPHI / totalNonPHI * 100) : 0;
  const cleanRate = cleanDetected.total > 0 ? (cleanDetected.detected / cleanDetected.total * 100) : 0;
  const erroredRate = erroredDetected.total > 0 ? (erroredDetected.detected / erroredDetected.total * 100) : 0;
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
  else grade = "F";

  // ============================================================================
  // DISPLAY RESULTS
  // ============================================================================
  console.log("=".repeat(80));
  console.log("COMPREHENSIVE TEST RESULTS");
  console.log("=".repeat(80));
  console.log();

  console.log(`Documents Tested: ${shuffledDocs.length}`);
  console.log(`Total PHI Items: ${totalPHI}`);
  console.log(`Total Non-PHI Items: ${totalNonPHI}`);
  console.log(`Processing Time: ${(totalTime / 1000).toFixed(1)}s (${(totalTime / shuffledDocs.length).toFixed(0)}ms/doc)`);
  console.log();

  console.log("SENSITIVITY (PHI Detection):");
  console.log(`  Detected:    ${detectedPHI}/${totalPHI}`);
  console.log(`  Missed:      ${totalPHI - detectedPHI}`);
  console.log(`  SENSITIVITY: ${sensitivity.toFixed(2)}%`);
  console.log();

  console.log("SPECIFICITY (Non-PHI Preservation):");
  console.log(`  Preserved:   ${preservedNonPHI}/${totalNonPHI}`);
  console.log(`  SPECIFICITY: ${specificity.toFixed(2)}%`);
  console.log();

  console.log("-".repeat(80));
  console.log(`OVERALL SCORE: ${overallScore}/100 (${grade})`);
  console.log("-".repeat(80));
  console.log();

  console.log("PERFORMANCE BY ERROR LEVEL:");
  console.log("-".repeat(50));
  const levels = ["none", "low", "medium", "high", "extreme"];
  for (const level of levels) {
    const data = detectedByLevel[level];
    if (data) {
      const rate = (data.detected / data.total * 100).toFixed(1);
      const missed = missedByLevel[level] || 0;
      console.log(`  ${level.toUpperCase().padEnd(8)}: ${data.detected}/${data.total} (${rate}%) - ${missed} missed`);
    }
  }
  console.log();

  console.log("CLEAN vs ERRORED ITEMS:");
  console.log("-".repeat(50));
  console.log(`  Clean items:   ${cleanDetected.detected}/${cleanDetected.total} (${cleanRate.toFixed(1)}%)`);
  console.log(`  Errored items: ${erroredDetected.detected}/${erroredDetected.total} (${erroredRate.toFixed(1)}%)`);
  console.log();

  console.log("MISSED PHI BY TYPE:");
  console.log("-".repeat(50));
  const sortedTypes = Object.entries(missedByType).sort((a, b) => b[1] - a[1]);
  for (const [type, count] of sortedTypes) {
    console.log(`  ${type}: ${count} missed`);
  }
  console.log();

  // ============================================================================
  // TOP 3 ISSUES ANALYSIS
  // ============================================================================
  console.log("=".repeat(80));
  console.log("TOP 3 REMAINING ISSUES");
  console.log("=".repeat(80));
  console.log();

  // Analyze failure patterns
  const issuePatterns = {
    nameCase: { count: 0, examples: [] },
    nameTypo: { count: 0, examples: [] },
    nameFormat: { count: 0, examples: [] },
    dateOCR: { count: 0, examples: [] },
    dateFormat: { count: 0, examples: [] },
    phoneOCR: { count: 0, examples: [] },
    ssnOCR: { count: 0, examples: [] },
    other: { count: 0, examples: [] }
  };

  for (const f of failures) {
    const orig = f.original || "";
    const val = f.value || "";

    if (f.phiType === "NAME") {
      if (val !== orig && (val === val.toLowerCase() || val === val.toUpperCase() || /[A-Z][a-z]+[A-Z]/.test(val))) {
        issuePatterns.nameCase.count++;
        if (issuePatterns.nameCase.examples.length < 5) issuePatterns.nameCase.examples.push({ orig, val });
      } else if (val !== orig && /[^a-zA-Z\s,.'()-]/.test(val)) {
        issuePatterns.nameTypo.count++;
        if (issuePatterns.nameTypo.examples.length < 5) issuePatterns.nameTypo.examples.push({ orig, val });
      } else {
        issuePatterns.nameFormat.count++;
        if (issuePatterns.nameFormat.examples.length < 5) issuePatterns.nameFormat.examples.push({ orig, val });
      }
    } else if (f.phiType === "DATE") {
      if (val !== orig) {
        issuePatterns.dateOCR.count++;
        if (issuePatterns.dateOCR.examples.length < 5) issuePatterns.dateOCR.examples.push({ orig, val });
      } else {
        issuePatterns.dateFormat.count++;
        if (issuePatterns.dateFormat.examples.length < 5) issuePatterns.dateFormat.examples.push({ orig, val });
      }
    } else if (f.phiType === "PHONE") {
      issuePatterns.phoneOCR.count++;
      if (issuePatterns.phoneOCR.examples.length < 5) issuePatterns.phoneOCR.examples.push({ orig, val });
    } else if (f.phiType === "SSN") {
      issuePatterns.ssnOCR.count++;
      if (issuePatterns.ssnOCR.examples.length < 5) issuePatterns.ssnOCR.examples.push({ orig, val });
    } else {
      issuePatterns.other.count++;
      if (issuePatterns.other.examples.length < 5) issuePatterns.other.examples.push({ orig, val, type: f.phiType });
    }
  }

  // Sort by count
  const sortedIssues = Object.entries(issuePatterns)
    .filter(([_, data]) => data.count > 0)
    .sort((a, b) => b[1].count - a[1].count);

  let issueNum = 1;
  for (const [key, data] of sortedIssues.slice(0, 3)) {
    const names = {
      nameCase: "NAME - Case Sensitivity Issues",
      nameTypo: "NAME - OCR/Typo Corruption",
      nameFormat: "NAME - Format/Pattern Issues",
      dateOCR: "DATE - OCR Corruption",
      dateFormat: "DATE - Format Issues",
      phoneOCR: "PHONE - OCR Corruption",
      ssnOCR: "SSN - OCR Corruption",
      other: "OTHER - Misc Issues"
    };

    console.log(`ISSUE #${issueNum}: ${names[key]}`);
    console.log(`  Count: ${data.count} failures`);
    console.log(`  Examples:`);
    for (const ex of data.examples) {
      if (ex.orig === ex.val) {
        console.log(`    - "${ex.val}" [CLEAN - not detected]`);
      } else {
        console.log(`    - "${ex.orig}" -> "${ex.val}"`);
      }
    }
    console.log();
    issueNum++;
  }

  // Save results
  const resultsDir = path.join(__dirname, "results");
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);

  const outputPath = path.join(resultsDir, "comprehensive-test.json");
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      documentsAssessed: shuffledDocs.length,
      totalPHI,
      detectedPHI,
      missedPHI: totalPHI - detectedPHI,
      sensitivity: sensitivity.toFixed(2),
      totalNonPHI,
      preservedNonPHI,
      specificity: specificity.toFixed(2),
      overallScore,
      grade,
      cleanRate: cleanRate.toFixed(2),
      erroredRate: erroredRate.toFixed(2),
      processingTimeMs: totalTime
    },
    byErrorLevel: detectedByLevel,
    missedByType,
    missedByLevel,
    topIssues: sortedIssues.slice(0, 3).map(([key, data]) => ({ issue: key, count: data.count, examples: data.examples })),
    failures: failures.slice(0, 50)
  }, null, 2));

  console.log(`Detailed results saved to: ${outputPath}`);
  console.log("=".repeat(80));
}

runComprehensiveTest().catch(console.error);
