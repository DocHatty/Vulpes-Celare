/**
 * REALISTIC ASSESSMENT - 200+ Medical Documents with Real-World Messiness
 * Tests with: OCR errors, typos, case variations, formatting issues
 */
const path = require("path");
const fs = require("fs");

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

// Error simulation functions
const OCR_SUBS = { "O": ["0"], "0": ["O"], "I": ["1", "l"], "1": ["I", "l"], "l": ["1", "I"], "S": ["5"], "5": ["S"], "B": ["8"], "8": ["B"], "m": ["rn"] };
const TYPO_MAP = { "a": ["s"], "e": ["r", "w"], "i": ["o", "u"], "o": ["i", "p"], "n": ["m"], "m": ["n"], "s": ["a", "d"], "t": ["r", "y"] };

function applyOCRError(str) {
  if (Math.random() > 0.3) return str;
  return str.split("").map(c => (Math.random() < 0.15 && OCR_SUBS[c]) ? OCR_SUBS[c][0] : c).join("");
}

function applyTypo(str) {
  if (Math.random() > 0.25) return str;
  const chars = str.split("");
  const idx = Math.floor(Math.random() * chars.length);
  const c = chars[idx].toLowerCase();
  if (TYPO_MAP[c]) chars[idx] = str[idx] === str[idx].toUpperCase() ? TYPO_MAP[c][0].toUpperCase() : TYPO_MAP[c][0];
  return chars.join("");
}

function applyTransposition(str) {
  if (Math.random() > 0.15 || str.length < 3) return str;
  const chars = str.split("");
  const idx = Math.floor(Math.random() * (chars.length - 1));
  [chars[idx], chars[idx + 1]] = [chars[idx + 1], chars[idx]];
  return chars.join("");
}

function applyDoubleError(str) {
  if (Math.random() > 0.2) return str;
  for (const d of ["ll", "tt", "nn", "ss", "mm"]) {
    if (str.toLowerCase().includes(d)) return str.replace(new RegExp(d, "i"), d[0]);
  }
  return str;
}

function applySpacingError(str) {
  if (Math.random() > 0.2) return str;
  const words = str.split(" ");
  if (words.length >= 2 && Math.random() < 0.5) {
    const idx = Math.floor(Math.random() * (words.length - 1));
    words[idx] = words[idx] + words[idx + 1];
    words.splice(idx + 1, 1);
  } else if (words.length > 0) {
    const idx = Math.floor(Math.random() * words.length);
    if (words[idx].length > 4) {
      const sp = Math.floor(words[idx].length / 2);
      words[idx] = words[idx].slice(0, sp) + " " + words[idx].slice(sp);
    }
  }
  return words.join(" ");
}

function applyCaseVariation(str) {
  const v = Math.random();
  if (v < 0.45) return str;
  if (v < 0.6) return str.toUpperCase();
  if (v < 0.75) return str.toLowerCase();
  if (v < 0.9) return str.split("").map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join("");
  return str[0].toLowerCase() + str.slice(1);
}

function messUpName(name, level = "medium") {
  let result = name;
  const prob = { low: 0.12, medium: 0.28, high: 0.45 }[level] || 0.28;
  if (Math.random() < prob) result = applyOCRError(result);
  if (Math.random() < prob) result = applyTypo(result);
  if (Math.random() < prob * 0.5) result = applyTransposition(result);
  if (Math.random() < prob * 0.7) result = applyDoubleError(result);
  if (Math.random() < prob * 0.5) result = applySpacingError(result);
  if (Math.random() < prob * 1.3) result = applyCaseVariation(result);
  return result;
}

function messUpDate(d) {
  if (Math.random() > 0.3) return d;
  const fns = [() => d.replace(/\//g, "-"), () => d.replace(/0/g, "O"), () => d.replace(/1/g, "l")];
  return fns[Math.floor(Math.random() * fns.length)]();
}

function messUpPhone(p) {
  if (Math.random() > 0.3) return p;
  const fns = [() => p.replace(/[()\-\s]/g, ""), () => p.replace(/[()\-]/g, "."), () => "+1" + p.replace(/[()\-\s]/g, "")];
  return fns[Math.floor(Math.random() * fns.length)]();
}

function messUpSSN(s) {
  if (Math.random() > 0.3) return s;
  const fns = [() => s.replace(/-/g, " "), () => s.replace(/-/g, "")];
  return fns[Math.floor(Math.random() * fns.length)]();
}

function messUpMRN(m) {
  if (Math.random() > 0.3) return m;
  const fns = [() => m.toLowerCase(), () => m.toUpperCase(), () => m.replace(/-/g, "")];
  return fns[Math.floor(Math.random() * fns.length)]();
}

// Data arrays
const FIRST_NAMES = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Lisa", "Daniel", "Nancy", "Matthew", "Betty", "Anthony", "Margaret", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Timothy", "Deborah", "Philip", "Jean", "Bruce", "Sophia", "Gabriel", "Grace", "Yuki", "Wei", "Fatima", "Omar", "Raj", "Chen", "Kim", "Singh", "Patel", "Khan", "Carlos", "Sofia", "Miguel", "Juan"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "OBrien", "OConnor", "McDonald", "McCarthy", "Nakamura", "Tanaka", "Chen", "Wang", "Kumar", "Sharma", "Mueller", "Schmidt"];
const MIDDLE_NAMES = ["Marie", "Ann", "Lee", "James", "Michael", "Elizabeth", "Rose", "Lynn", "Grace", "Jean", "Paul", "John", "David", "Edward", "Thomas", "William"];
const TITLES = ["Dr.", "Mr.", "Mrs.", "Ms.", "Prof."];
const SUFFIXES = ["Jr.", "Sr.", "II", "III", "MD", "PhD", "DO", "RN", "NP"];
const CITIES = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Seattle", "Denver", "Boston", "Atlanta", "Miami"];
const STATES = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI", "WA", "AZ", "MA", "CO"];
const STREET_TYPES = ["Street", "Avenue", "Boulevard", "Drive", "Lane", "Road"];
const STREET_NAMES = ["Main", "Oak", "Maple", "Cedar", "Pine", "Elm", "Washington", "Park"];
const DIAGNOSES = ["Hypertension", "Type 2 Diabetes", "COPD", "Coronary Artery Disease", "Heart Failure", "Pneumonia", "Asthma", "GERD", "Major Depression"];
const PROCEDURES = ["CT Scan", "MRI", "X-Ray", "Ultrasound", "Colonoscopy", "Echocardiogram", "Appendectomy", "Knee Replacement"];

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateSSN(err = true) {
  const s = randomInt(100, 999) + "-" + randomInt(10, 99) + "-" + randomInt(1000, 9999);
  return err ? messUpSSN(s) : s;
}

function generateMRN(err = true) {
  const p = random(["MRN", "PAT", ""]);
  const m = p ? p + "-" + randomInt(2020, 2024) + "-" + randomInt(10000, 99999) : "" + randomInt(10000, 99999) + randomInt(100, 999);
  return err ? messUpMRN(m) : m;
}

function generatePhone(err = true) {
  const p = "(" + randomInt(200, 999) + ") " + randomInt(200, 999) + "-" + randomInt(1000, 9999);
  return err ? messUpPhone(p) : p;
}

function generateDate(err = true) {
  const d = String(randomInt(1, 12)).padStart(2, "0") + "/" + String(randomInt(1, 28)).padStart(2, "0") + "/" + randomInt(2020, 2024);
  return err ? messUpDate(d) : d;
}

function generateDOB(err = true) {
  const d = String(randomInt(1, 12)).padStart(2, "0") + "/" + String(randomInt(1, 28)).padStart(2, "0") + "/" + randomInt(1940, 2005);
  return err ? messUpDate(d) : d;
}

function generateEmail(f, l) {
  return f.toLowerCase() + "." + l.toLowerCase() + "@" + random(["gmail.com", "yahoo.com", "outlook.com"]);
}

function generateAddress() {
  const n = randomInt(100, 9999);
  const st = random(STREET_NAMES) + " " + random(STREET_TYPES);
  const c = random(CITIES);
  const s = random(STATES);
  const z = String(randomInt(10000, 99999));
  return { street: n + " " + st, city: c, state: s, zip: z, full: n + " " + st + ", " + c + ", " + s + " " + z };
}

function generateNPI() { return String(randomInt(1000000000, 9999999999)); }
function generateDEA() { return "AB" + randomInt(1000000, 9999999); }

function generateName(format = "random", errorLevel = "medium") {
  const first = random(FIRST_NAMES);
  const middle = random(MIDDLE_NAMES);
  const last = random(LAST_NAMES);
  const title = random(TITLES);
  const suffix = random(SUFFIXES);
  const fmts = {
    first_last: first + " " + last,
    first_middle_last: first + " " + middle + " " + last,
    last_first: last + ", " + first,
    last_first_middle: last + ", " + first + " " + middle,
    titled: title + " " + first + " " + last,
    titled_last: title + " " + last,
    with_suffix: first + " " + last + " " + suffix,
    all_caps: first.toUpperCase() + " " + last.toUpperCase(),
    all_caps_last_first: last.toUpperCase() + ", " + first.toUpperCase(),
    all_caps_full: last.toUpperCase() + ", " + first.toUpperCase() + " " + middle.toUpperCase(),
  };
  if (format === "random") format = random(Object.keys(fmts));
  const clean = fmts[format] || fmts["first_last"];
  const messy = messUpName(clean, errorLevel);
  return { first, middle, last, clean, formatted: messy, hasErrors: clean !== messy };
}

// Document generators
function generateRadiologyReport(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("random", lvl);
  const provider = generateName("titled", lvl);
  const radiologist = generateName("first_last", lvl);
  const dob = generateDOB(), examDate = generateDate(), mrn = generateMRN(), phone = generatePhone();
  const procedure = random(PROCEDURES.filter(p => ["CT Scan", "MRI", "X-Ray", "Ultrasound"].includes(p)));
  const content = `RADIOLOGY REPORT

PATIENT: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
EXAM DATE: ${examDate}

PROCEDURE: ${procedure}
ORDERING PHYSICIAN: ${provider.formatted}
Phone: ${phone}

CLINICAL HISTORY: ${random(DIAGNOSES)}
FINDINGS: ${random(["No acute abnormality.", "Findings consistent with clinical history.", "Mild degenerative changes."])}
IMPRESSION: ${random(["Normal study.", "No acute findings.", "Stable examination."])}

Interpreted by: ${radiologist.formatted}, MD`;
  return { id, type: "Radiology Report", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: provider.clean, actual: provider.formatted, hasErrors: provider.hasErrors },
    { type: "NAME", value: radiologist.clean + ", MD", actual: radiologist.formatted + ", MD", hasErrors: radiologist.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: examDate }, { type: "MRN", value: mrn }, { type: "PHONE", value: phone },
  ], expectedNonPHI: [{ type: "PROCEDURE", value: procedure }] };
}

function generateLabReport(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("last_first_middle", lvl);
  const orderingDoc = generateName("titled", lvl);
  const labDirector = generateName("first_last", lvl);
  const dob = generateDOB(), collectionDate = generateDate(), mrn = generateMRN(), npi = generateNPI(), phone = generatePhone(), ssn = generateSSN();
  const content = `LABORATORY REPORT

PATIENT INFORMATION
Name: ${patient.formatted}
Patient ID: ${mrn}
SSN: ${ssn}
Date of Birth: ${dob}

SPECIMEN INFORMATION
Collection Date: ${collectionDate}

ORDERING PHYSICIAN
${orderingDoc.formatted}
NPI: ${npi}
Phone: ${phone}

TEST RESULTS
Complete Blood Count (CBC)
WBC: ${(Math.random() * 10 + 4).toFixed(1)} x10^9/L
Hemoglobin: ${(Math.random() * 5 + 12).toFixed(1)} g/dL

LABORATORY DIRECTOR
${labDirector.formatted}, MD, PhD`;
  return { id, type: "Lab Report", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: orderingDoc.clean, actual: orderingDoc.formatted, hasErrors: orderingDoc.hasErrors },
    { type: "NAME", value: labDirector.clean + ", MD, PhD", actual: labDirector.formatted + ", MD, PhD", hasErrors: labDirector.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: collectionDate }, { type: "MRN", value: mrn },
    { type: "NPI", value: npi }, { type: "PHONE", value: phone }, { type: "SSN", value: ssn },
  ], expectedNonPHI: [] };
}

function generateProgressNote(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("first_middle_last", lvl);
  const patientRef = generateName("titled_last", lvl);
  const provider = generateName("titled", lvl);
  const dob = generateDOB(), visitDate = generateDate(), mrn = generateMRN();
  const address = generateAddress(), phone = generatePhone(), email = generateEmail(patient.first, patient.last);
  const diagnosis = random(DIAGNOSES);
  const content = `PROGRESS NOTE

Patient: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Date of Visit: ${visitDate}
Provider: ${provider.formatted}

CHIEF COMPLAINT: ${random(["chest pain", "shortness of breath", "abdominal pain", "headache"])}

HISTORY OF PRESENT ILLNESS
${patientRef.formatted} is a ${randomInt(25, 85)}-year-old with history of ${diagnosis}.
Patient lives at ${address.full}.
Contact: ${phone} | ${email}

PLAN: Continue current medications. Follow up in ${randomInt(1, 4)} weeks.

Signed by ${provider.clean.replace("Dr. ", "").replace("Prof. ", "")} on ${visitDate}`;
  return { id, type: "Progress Note", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
    { type: "NAME", value: provider.clean, actual: provider.formatted, hasErrors: provider.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: visitDate }, { type: "MRN", value: mrn },
    { type: "ADDRESS", value: address.street }, { type: "ZIPCODE", value: address.zip },
    { type: "PHONE", value: phone }, { type: "EMAIL", value: email },
  ], expectedNonPHI: [{ type: "DIAGNOSIS", value: diagnosis }] };
}

function generateEmergencyNote(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("all_caps_last_first", lvl);
  const emergencyContact = generateName("first_last", lvl);
  const attending = generateName("titled", lvl);
  const resident = generateName("titled", lvl);
  const dob = generateDOB(), arrivalDate = generateDate();
  const mrn = "ED-" + randomInt(20200101, 20241231) + "-" + randomInt(1000, 9999);
  const ssn = generateSSN(), phone = generatePhone();
  const address = generateAddress();
  const content = `EMERGENCY DEPARTMENT NOTE

Patient: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
Arrival: ${arrivalDate}
SSN: ${ssn}

Emergency Contact: ${emergencyContact.formatted} (${random(["spouse", "parent", "sibling"])})
Phone: ${phone}
Address: ${address.full}

Chief Complaint: ${random(["Severe chest pain", "Difficulty breathing", "Abdominal pain", "Trauma"])}
Attending Physician: ${attending.formatted}
Resident: ${resident.formatted}

DIAGNOSIS: ${random(DIAGNOSES)}
DISPOSITION: ${random(["Admitted", "Discharged home", "Transferred to ICU"])}

Signed by ${attending.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD`;
  return { id, type: "Emergency Note", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: emergencyContact.clean, actual: emergencyContact.formatted, hasErrors: emergencyContact.hasErrors },
    { type: "NAME", value: attending.clean, actual: attending.formatted, hasErrors: attending.hasErrors },
    { type: "NAME", value: resident.clean, actual: resident.formatted, hasErrors: resident.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: arrivalDate }, { type: "MRN", value: mrn },
    { type: "SSN", value: ssn }, { type: "ADDRESS", value: address.street }, { type: "ZIPCODE", value: address.zip }, { type: "PHONE", value: phone },
  ], expectedNonPHI: [] };
}

function generateDischargeSummary(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("last_first", lvl);
  const patientRef = generateName("titled_last", lvl);
  const attending = generateName("titled", lvl);
  const pcp = generateName("titled", lvl);
  const familyContact = generateName("first_last", lvl);
  const dob = generateDOB(), admitDate = generateDate(), dischargeDate = generateDate(), mrn = generateMRN();
  const phone1 = generatePhone(), phone2 = generatePhone();
  const content = `DISCHARGE SUMMARY

PATIENT: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
ADMISSION DATE: ${admitDate}
DISCHARGE DATE: ${dischargeDate}
ATTENDING: ${attending.formatted}

PRINCIPAL DIAGNOSIS: ${random(DIAGNOSES)}

HOSPITAL COURSE: ${patientRef.formatted} was admitted with ${random(["acute symptoms", "exacerbation", "new onset"])}.

FOLLOW-UP: PCP appointment with ${pcp.formatted} in 7 days - ${phone1}
EMERGENCY CONTACT: ${familyContact.formatted} - ${phone2}

Dictated by: ${attending.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD`;
  return { id, type: "Discharge Summary", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
    { type: "NAME", value: attending.clean, actual: attending.formatted, hasErrors: attending.hasErrors },
    { type: "NAME", value: pcp.clean, actual: pcp.formatted, hasErrors: pcp.hasErrors },
    { type: "NAME", value: familyContact.clean, actual: familyContact.formatted, hasErrors: familyContact.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: admitDate }, { type: "DATE", value: dischargeDate },
    { type: "MRN", value: mrn }, { type: "PHONE", value: phone1 }, { type: "PHONE", value: phone2 },
  ], expectedNonPHI: [] };
}

function generateConsultationNote(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("all_caps_full", lvl);
  const patientRef = generateName("titled_last", lvl);
  const requesting = generateName("titled", lvl);
  const consulting = generateName("titled", lvl);
  const familyMember = generateName("first_last", lvl);
  const dob = generateDOB(), consultDate = generateDate(), mrn = generateMRN(), phone = generatePhone();
  const email = generateEmail(patient.first, patient.last);
  const content = `CONSULTATION NOTE

RE: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
DATE: ${consultDate}

Requesting Physician: ${requesting.formatted}
Consulting Physician: ${consulting.formatted}

HISTORY: ${patientRef.formatted} is a ${randomInt(30, 80)}-year-old with ${random(DIAGNOSES)}.
Family contact: ${familyMember.formatted}
Contact: ${phone} | ${email}

RECOMMENDATIONS: ${random(["Start medication", "Continue current therapy", "Order additional testing"])}

${consulting.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD`;
  return { id, type: "Consultation Note", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
    { type: "NAME", value: requesting.clean, actual: requesting.formatted, hasErrors: requesting.hasErrors },
    { type: "NAME", value: consulting.clean, actual: consulting.formatted, hasErrors: consulting.hasErrors },
    { type: "NAME", value: familyMember.clean, actual: familyMember.formatted, hasErrors: familyMember.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: consultDate }, { type: "MRN", value: mrn },
    { type: "PHONE", value: phone }, { type: "EMAIL", value: email },
  ], expectedNonPHI: [] };
}

function generateOperativeReport(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("all_caps_last_first", lvl);
  const surgeon = generateName("titled", lvl);
  const assistant = generateName("titled", lvl);
  const anesthesiologist = generateName("titled", lvl);
  const dob = generateDOB(), surgeryDate = generateDate(), mrn = generateMRN();
  const procedure = random(PROCEDURES.filter(p => !["CT Scan", "MRI", "X-Ray", "Ultrasound"].includes(p)));
  const content = `OPERATIVE REPORT

Patient Name: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Date of Surgery: ${surgeryDate}

Surgeon: ${surgeon.formatted}, FACS
First Assistant: ${assistant.formatted}
Anesthesiologist: ${anesthesiologist.formatted}

PROCEDURE PERFORMED: ${procedure}
FINDINGS: ${random(["As expected", "Uncomplicated", "Successful procedure"])}
COMPLICATIONS: None

Signed: ${surgeon.clean.replace("Dr. ", "").replace("Prof. ", "")}, MD, FACS`;
  return { id, type: "Operative Report", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: surgeon.clean, actual: surgeon.formatted, hasErrors: surgeon.hasErrors },
    { type: "NAME", value: assistant.clean, actual: assistant.formatted, hasErrors: assistant.hasErrors },
    { type: "NAME", value: anesthesiologist.clean, actual: anesthesiologist.formatted, hasErrors: anesthesiologist.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: surgeryDate }, { type: "MRN", value: mrn },
  ], expectedNonPHI: [{ type: "PROCEDURE", value: procedure }] };
}

function generatePrescription(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("last_first_middle", lvl);
  const prescriber = generateName("titled", lvl);
  const dob = generateDOB(), rxDate = generateDate();
  const address = generateAddress(), phone = generatePhone(), dea = generateDEA(), npi = generateNPI();
  const meds = ["Lisinopril", "Metformin", "Atorvastatin", "Omeprazole", "Amlodipine", "Metoprolol"];
  const content = `PRESCRIPTION

Patient: ${patient.formatted}
DOB: ${dob}
Address: ${address.full}
Phone: ${phone}

Prescriber: ${prescriber.formatted}
DEA #: ${dea}
NPI: ${npi}

Rx: ${random(meds)} ${randomInt(5, 100)}mg
Sig: Take ${random(["one", "two"])} tablet by mouth ${random(["daily", "twice daily"])}
Qty: ${randomInt(30, 90)}
Refills: ${randomInt(0, 5)}

Date Written: ${rxDate}`;
  return { id, type: "Prescription", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: prescriber.clean, actual: prescriber.formatted, hasErrors: prescriber.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: rxDate },
    { type: "ADDRESS", value: address.street }, { type: "ZIPCODE", value: address.zip },
    { type: "PHONE", value: phone }, { type: "DEA", value: dea }, { type: "NPI", value: npi },
  ], expectedNonPHI: [] };
}

function generateNursingAssessment(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("all_caps_full", lvl);
  const primaryNurse = generateName("first_last", lvl);
  const chargeNurse = generateName("first_last", lvl);
  const emergencyContact1 = generateName("first_last", lvl);
  const emergencyContact2 = generateName("with_suffix", lvl);
  const pcp = generateName("titled", lvl);
  const dob = generateDOB(), admitDate = generateDate(), mrn = generateMRN();
  const phone1 = generatePhone(), phone2 = generatePhone(), phone3 = generatePhone();
  const content = `NURSING ADMISSION ASSESSMENT

Patient: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Admit Date: ${admitDate}

Primary Nurse: ${primaryNurse.formatted}, RN
Charge Nurse: ${chargeNurse.formatted}, RN

EMERGENCY CONTACTS:
1. ${emergencyContact1.formatted} (${random(["spouse", "partner"])}) - ${phone1}
2. ${emergencyContact2.formatted} (${random(["son", "daughter"])}) - ${phone2}

PRIMARY CARE PHYSICIAN:
${pcp.formatted}
Phone: ${phone3}

ALLERGIES: ${random(["Penicillin", "Sulfa", "NKDA", "Morphine"])}

Assessment by: ${primaryNurse.formatted}, RN`;
  return { id, type: "Nursing Assessment", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: primaryNurse.clean + ", RN", actual: primaryNurse.formatted + ", RN", hasErrors: primaryNurse.hasErrors },
    { type: "NAME", value: chargeNurse.clean + ", RN", actual: chargeNurse.formatted + ", RN", hasErrors: chargeNurse.hasErrors },
    { type: "NAME", value: emergencyContact1.clean, actual: emergencyContact1.formatted, hasErrors: emergencyContact1.hasErrors },
    { type: "NAME", value: emergencyContact2.clean, actual: emergencyContact2.formatted, hasErrors: emergencyContact2.hasErrors },
    { type: "NAME", value: pcp.clean, actual: pcp.formatted, hasErrors: pcp.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: admitDate }, { type: "MRN", value: mrn },
    { type: "PHONE", value: phone1 }, { type: "PHONE", value: phone2 }, { type: "PHONE", value: phone3 },
  ], expectedNonPHI: [] };
}

function generateTeamNote(id) {
  const lvl = random(["low", "medium", "high"]);
  const patient = generateName("all_caps_last_first", lvl);
  const patientRef = generateName("titled_last", lvl);
  const team = [];
  for (let i = 0; i < randomInt(3, 5); i++) team.push(generateName("titled", lvl));
  const family = [];
  for (let i = 0; i < randomInt(1, 2); i++) family.push(generateName("first_last", lvl));
  const dob = generateDOB(), noteDate = generateDate(), mrn = generateMRN();
  const phones = family.map(() => generatePhone());
  const teamList = team.map((t, i) => (i + 1) + ". " + t.formatted).join("\n");
  const familyList = family.map((f, i) => f.formatted + " - " + phones[i]).join("\n");
  const content = "MULTIDISCIPLINARY TEAM NOTE\n\nPatient: " + patient.formatted + "\nMRN: " + mrn + "\nDOB: " + dob + "\nDate: " + noteDate + "\n\nCARE TEAM:\n" + teamList + "\n\nDISCUSSION: " + patientRef.formatted + " continues to progress well with treatment plan.\n\nFAMILY PRESENT:\n" + familyList + "\n\nPLAN: Continue current management. Follow up in " + randomInt(1, 4) + " weeks.";
  const expectedPHI = [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
    ...team.map(t => ({ type: "NAME", value: t.clean, actual: t.formatted, hasErrors: t.hasErrors })),
    ...family.map(f => ({ type: "NAME", value: f.clean, actual: f.formatted, hasErrors: f.hasErrors })),
    { type: "DATE", value: dob }, { type: "DATE", value: noteDate }, { type: "MRN", value: mrn },
    ...phones.map(p => ({ type: "PHONE", value: p })),
  ];
  return { id, type: "Team Note", errorLevel: lvl, content, expectedPHI, expectedNonPHI: [] };
}

function generateDocuments(count) {
  const generators = [
    generateRadiologyReport, generateLabReport, generateProgressNote, generateEmergencyNote,
    generateDischargeSummary, generateConsultationNote, generateOperativeReport,
    generatePrescription, generateNursingAssessment, generateTeamNote,
  ];
  const documents = [];
  for (let i = 0; i < count; i++) {
    const generator = generators[i % generators.length];
    documents.push(generator(i + 1));
  }
  for (let i = documents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [documents[i], documents[j]] = [documents[j], documents[i]];
  }
  return documents;
}


// Assessment runner
async function runAssessment() {
  console.log("=".repeat(80));
  console.log("VULPES CELARE - REALISTIC PHI REDACTION ASSESSMENT");
  console.log("Testing with OCR errors, typos, case variations, formatting issues");
  console.log("=".repeat(80));
  console.log();

  console.log("Generating 220 realistic medical documents with errors...");
  const documents = generateDocuments(220);
  console.log("Generated " + documents.length + " documents\n");

  const errorCounts = { low: 0, medium: 0, high: 0 };
  documents.forEach(d => errorCounts[d.errorLevel]++);
  console.log("Error level distribution:");
  console.log("  Low (clean-ish):    " + errorCounts.low);
  console.log("  Medium (realistic): " + errorCounts.medium);
  console.log("  High (messy):       " + errorCounts.high);
  console.log();

  const typeCounts = {};
  documents.forEach(d => { typeCounts[d.type] = (typeCounts[d.type] || 0) + 1; });
  console.log("Document distribution:");
  Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log("  " + type + ": " + count);
  });
  console.log();

  console.log("Loading Vulpes Celare engine...");
  let VulpesCelare;
  try {
    const module = require("../dist/VulpesCelare.js");
    VulpesCelare = module.VulpesCelare;
    console.log("Vulpes Celare loaded\n");
  } catch (err) {
    console.error("Failed to load VulpesCelare:", err.message);
    console.log("Make sure to run: npm run build");
    process.exit(1);
  }

  const engine = new VulpesCelare();

  console.log("Processing documents...");
  console.log("-".repeat(80));

  let totalExpectedPHI = 0, totalRedactedPHI = 0, totalExpectedNonPHI = 0, totalPreservedNonPHI = 0;
  const statsByErrorLevel = { low: { expected: 0, detected: 0 }, medium: { expected: 0, detected: 0 }, high: { expected: 0, detected: 0 } };
  let itemsWithErrors = { expected: 0, detected: 0 };
  let cleanItems = { expected: 0, detected: 0 };
  const failures = [];
  const falsePositives = [];
  const missedByType = {};

  for (let i = 0; i < documents.length; i++) {
    if ((i + 1) % 20 === 0) console.log("  Processed " + (i + 1) + "/" + documents.length + " documents...");
    const doc = documents[i];
    const result = await engine.process(doc.content);
    const redactedText = result.text;
    const docFailures = [];

    for (const phi of doc.expectedPHI) {
      totalExpectedPHI++;
      statsByErrorLevel[doc.errorLevel].expected++;
      if (phi.hasErrors) itemsWithErrors.expected++;
      else cleanItems.expected++;

      const actualValue = phi.actual || phi.value;
      const appearsInClear = redactedText.includes(actualValue);

      if (!appearsInClear) {
        totalRedactedPHI++;
        statsByErrorLevel[doc.errorLevel].detected++;
        if (phi.hasErrors) itemsWithErrors.detected++;
        else cleanItems.detected++;
      } else {
        missedByType[phi.type] = (missedByType[phi.type] || 0) + 1;
        docFailures.push({ type: phi.type, expected: phi.value, actual: actualValue, hasErrors: phi.hasErrors });
      }
    }

    for (const nonPhi of doc.expectedNonPHI) {
      totalExpectedNonPHI++;
      if (redactedText.includes(nonPhi.value)) totalPreservedNonPHI++;
      else falsePositives.push({ docId: doc.id, type: doc.type, item: nonPhi });
    }

    if (docFailures.length > 0) {
      failures.push({ docId: doc.id, type: doc.type, errorLevel: doc.errorLevel, missed: docFailures });
    }
  }

  console.log("  Processed " + documents.length + "/" + documents.length + " documents...");
  console.log();

  const sensitivity = totalExpectedPHI > 0 ? (totalRedactedPHI / totalExpectedPHI) * 100 : 0;
  const specificity = totalExpectedNonPHI > 0 ? (totalPreservedNonPHI / totalExpectedNonPHI) * 100 : 100;

  let score = Math.round((sensitivity * 0.7 + specificity * 0.3));
  if (sensitivity < 95) score = Math.min(score, 70);
  if (sensitivity < 90) score = Math.min(score, 50);

  const grade = score >= 97 ? "A+" : score >= 93 ? "A" : score >= 90 ? "A-" :
                score >= 87 ? "B+" : score >= 83 ? "B" : score >= 80 ? "B-" :
                score >= 77 ? "C+" : score >= 73 ? "C" : score >= 70 ? "C-" :
                score >= 60 ? "D" : "F";

  console.log("=".repeat(80));
  console.log("ASSESSMENT RESULTS");
  console.log("=".repeat(80));
  console.log();
  console.log("Documents Assessed: " + documents.length);
  console.log();
  console.log("SENSITIVITY (PHI Detection):");
  console.log("  Expected PHI items:  " + totalExpectedPHI);
  console.log("  Correctly redacted:  " + totalRedactedPHI);
  console.log("  Missed (FN):         " + (totalExpectedPHI - totalRedactedPHI));
  console.log("  SENSITIVITY:         " + sensitivity.toFixed(1) + "%");
  console.log();
  console.log("SPECIFICITY (Non-PHI Preservation):");
  console.log("  Expected non-PHI:    " + totalExpectedNonPHI);
  console.log("  Correctly preserved: " + totalPreservedNonPHI);
  console.log("  False positives:     " + (totalExpectedNonPHI - totalPreservedNonPHI));
  console.log("  SPECIFICITY:         " + specificity.toFixed(1) + "%");
  console.log();
  console.log("-".repeat(80));
  console.log("OVERALL SCORE: " + score + "/100 (" + grade + ")");
  console.log("-".repeat(80));
  console.log();
  console.log("PERFORMANCE BY ERROR LEVEL:");
  console.log("-".repeat(40));
  for (const level of ["low", "medium", "high"]) {
    const stats = statsByErrorLevel[level];
    const pct = stats.expected > 0 ? (stats.detected / stats.expected * 100).toFixed(1) : "N/A";
    console.log("  " + level.toUpperCase().padEnd(8) + ": " + stats.detected + "/" + stats.expected + " (" + pct + "%)");
  }
  console.log();

  console.log("CLEAN vs ERRORED ITEMS:");
  console.log("-".repeat(40));
  const cleanPct = cleanItems.expected > 0 ? (cleanItems.detected / cleanItems.expected * 100).toFixed(1) : "N/A";
  const errorPct = itemsWithErrors.expected > 0 ? (itemsWithErrors.detected / itemsWithErrors.expected * 100).toFixed(1) : "N/A";
  console.log("  Clean items:   " + cleanItems.detected + "/" + cleanItems.expected + " (" + cleanPct + "%)");
  console.log("  Errored items: " + itemsWithErrors.detected + "/" + itemsWithErrors.expected + " (" + errorPct + "%)");
  console.log();

  if (Object.keys(missedByType).length > 0) {
    console.log("MISSED PHI (False Negatives):");
    console.log("-".repeat(40));
    Object.entries(missedByType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log("  " + type + ": " + count + " missed");
    });
    console.log();
  }

  if (failures.length > 0) {
    console.log("SAMPLE FAILURES (first 20):");
    failures.slice(0, 20).forEach(f => {
      console.log("  Doc " + f.docId + " (" + f.type + ") [" + f.errorLevel + " errors]:");
      f.missed.forEach(m => {
        const errorTag = m.hasErrors ? " [HAS ERRORS]" : "";
        if (m.actual && m.actual !== m.expected) {
          console.log("    - " + m.type + ": \"" + m.expected + "\" -> \"" + m.actual + "\"" + errorTag);
        } else {
          console.log("    - " + m.type + ": \"" + m.expected + "\"" + errorTag);
        }
      });
    });
    console.log();
  }

  const resultsDir = path.join(__dirname, "results");
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const resultsFile = path.join(resultsDir, "vulpes-realistic-assessment.json");
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    engine: "VulpesCelare",
    testType: "REALISTIC (with errors)",
    documentsAssessed: documents.length,
    errorDistribution: errorCounts,
    sensitivity: sensitivity.toFixed(1),
    specificity: specificity.toFixed(1),
    score, grade,
    totalExpectedPHI, totalRedactedPHI, totalExpectedNonPHI, totalPreservedNonPHI,
    performanceByErrorLevel: statsByErrorLevel,
    cleanVsErrored: { clean: cleanItems, errored: itemsWithErrors },
    missedByType, failures, falsePositives,
  }, null, 2));

  console.log("Detailed results saved to: " + resultsFile);
  console.log("=".repeat(80));
}

runAssessment().catch(console.error);
