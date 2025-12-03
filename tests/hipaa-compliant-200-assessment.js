/**
 * HIPAA-COMPLIANT 200-CASE ASSESSMENT
 * ============================================================================
 * Tests ACTUAL HIPAA Safe Harbor PHI requirements:
 * 
 * MUST REDACT (18 identifiers):
 * - Patient names
 * - SSN, MRN, health plan numbers, account numbers
 * - Phone, fax, email
 * - Addresses, zip codes
 * - Dates (DOB, admission, discharge, etc.) except year alone
 * - Ages 90 AND OVER (under 90 = NOT PHI)
 * - IP addresses, URLs (patient-specific)
 * - Device/vehicle identifiers (VIN, plates)
 * - License/passport numbers
 * - Credit card numbers
 * - Biometric identifiers
 * 
 * DO NOT REDACT (not patient PHI):
 * - Hospital/facility names
 * - Provider names (in professional capacity)
 * - Medical diagnoses, procedures, medications
 * - Ages UNDER 90
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

// ============================================================================
// ERROR SIMULATION
// ============================================================================
const OCR_SUBS = { "O": ["0"], "0": ["O"], "I": ["1", "l"], "1": ["I", "l"], "l": ["1", "I"], "S": ["5"], "5": ["S"], "B": ["8"], "8": ["B"], "m": ["rn"], "rn": ["m"], "D": ["0"], "G": ["6"], "6": ["G"] };
const TYPO_MAP = { "a": ["s", "q"], "e": ["r", "w", "d"], "i": ["o", "u", "k"], "o": ["i", "p", "l"], "n": ["m", "b"], "m": ["n", "k"], "s": ["a", "d", "w"], "t": ["r", "y", "g"], "r": ["e", "t", "f"], "c": ["x", "v", "d"], "d": ["s", "f", "e"] };

function applyOCRError(str, prob = 0.15) {
  if (Math.random() > prob) return str;
  return str.split("").map(c => (Math.random() < 0.12 && OCR_SUBS[c]) ? OCR_SUBS[c][Math.floor(Math.random() * OCR_SUBS[c].length)] : c).join("");
}

function applyTypo(str, prob = 0.2) {
  if (Math.random() > prob || str.length < 2) return str;
  const chars = str.split("");
  const idx = Math.floor(Math.random() * chars.length);
  const c = chars[idx].toLowerCase();
  if (TYPO_MAP[c]) {
    const adj = TYPO_MAP[c];
    chars[idx] = str[idx] === str[idx].toUpperCase() ? adj[0].toUpperCase() : adj[0];
  }
  return chars.join("");
}

function applyTransposition(str, prob = 0.1) {
  if (Math.random() > prob || str.length < 3) return str;
  const chars = str.split("");
  const idx = Math.floor(Math.random() * (chars.length - 1));
  [chars[idx], chars[idx + 1]] = [chars[idx + 1], chars[idx]];
  return chars.join("");
}

function applyDoubleError(str, prob = 0.15) {
  if (Math.random() > prob) return str;
  for (const d of ["ll", "tt", "nn", "ss", "mm", "rr", "pp", "ff"]) {
    if (str.toLowerCase().includes(d) && Math.random() < 0.5) return str.replace(new RegExp(d, "i"), d[0]);
  }
  return str;
}

function applyCaseVariation(str, prob = 0.25) {
  const v = Math.random();
  if (v > prob) return str;
  const variant = Math.random();
  if (variant < 0.3) return str.toUpperCase();
  if (variant < 0.55) return str.toLowerCase();
  if (variant < 0.8) return str.split("").map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join("");
  return str[0].toLowerCase() + str.slice(1);
}

function messUp(value, level = "medium") {
  const p = { low: 0.1, medium: 0.25, high: 0.45 }[level] || 0.25;
  let result = value;
  if (Math.random() < p) result = applyOCRError(result, p);
  if (Math.random() < p) result = applyTypo(result, p);
  if (Math.random() < p * 0.6) result = applyTransposition(result, p);
  if (Math.random() < p * 0.8) result = applyDoubleError(result, p);
  if (Math.random() < p * 1.2) result = applyCaseVariation(result, p);
  return result;
}

// ============================================================================
// DATA
// ============================================================================
const FIRST = ["James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda","David","Elizabeth","William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Christopher","Karen","Charles","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle","Kenneth","Dorothy","Kevin","Carol","Brian","Amanda","George","Melissa","Timothy","Deborah","Ronald","Stephanie","Edward","Rebecca","Jason","Sharon","Jeffrey","Laura","Ryan","Cynthia","Jacob","Kathleen","Gary","Amy","Nicholas","Angela","Eric","Shirley","Jonathan","Anna","Stephen","Brenda","Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen","Benjamin","Samantha","Samuel","Katherine","Raymond","Christine","Gregory","Debra","Frank","Rachel","Alexander","Carolyn","Patrick","Janet","Jack","Catherine","Dennis","Maria","Jerry","Heather","Tyler","Diane","Aaron","Ruth","Jose","Julie","Adam","Olivia","Nathan","Joyce","Henry","Virginia","Douglas","Victoria","Zachary","Kelly","Peter","Lauren","Kyle","Christina","Noah","Joan","Ethan","Evelyn","Jeremy","Judith","Walter","Megan","Christian","Andrea","Keith","Cheryl","Roger","Hannah","Terry","Jacqueline","Harry","Martha","Ralph","Gloria","Sean","Teresa","Jesse","Ann","Austin","Sara","Arthur","Madison","Lawrence","Frances","Dylan","Kathryn","Bryan","Janice","Joe","Jean","Jordan","Abigail","Billy","Alice","Bruce","Judy","Gabriel","Sophia","Logan","Grace","Albert","Denise","Willie","Amber","Alan","Doris","Eugene","Marilyn","Russell","Danielle","Vincent","Beverly","Philip","Isabella","Bobby","Theresa","Johnny","Diana","Bradley","Natalie","Roy","Brittany","Yuki","Wei","Fatima","Omar","Raj","Chen","Kim","Singh","Patel","Khan","Carlos","Sofia","Miguel","Juan","Mohammed","Aaliyah","Hiroshi","Priya","Vladimir","Natasha","Olga","Ivan","Dmitri","Svetlana","Kenji","Akiko","DeShawn","LaTonya","Jamal","Shaniqua","Terrence","Keisha","Bartholomew","Penelope","Gertrude","Clementine"];
const LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes","Stewart","Morris","Morales","Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper","Peterson","Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward","Richardson","Watson","Brooks","Chavez","Wood","James","Bennett","Gray","Mendoza","Ruiz","Hughes","Price","Alvarez","Castillo","Sanders","Patel","Myers","Long","Ross","Foster","Jimenez","O'Brien","O'Connor","McDonald","McCarthy","Nakamura","Tanaka","Chen","Wang","Kumar","Sharma","Mueller","Schmidt","Van der Berg","De la Cruz","Al-Rashid","Ben-David","Park","Singh","Kowalski","Fitzgerald","McAllister"];
const MIDDLE = ["Marie","Ann","Lee","James","Michael","Elizabeth","Rose","Lynn","Grace","Jean","Paul","John","David","Edward","Thomas","William","Alexander","Catherine","Margaret","Victoria","Louise","Francis","Joseph"];
const TITLES = ["Dr.", "Mr.", "Mrs.", "Ms.", "Prof."];
const SUFFIXES = ["Jr.", "Sr.", "II", "III", "MD", "PhD", "DO", "RN", "NP", "PA-C", "FACS"];
const CITIES = ["New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas","Austin","Jacksonville","Fort Worth","Columbus","Indianapolis","Charlotte","San Francisco","Seattle","Denver","Boston","Nashville","Detroit","Portland","Las Vegas","Memphis","Louisville","Baltimore","Milwaukee","Albuquerque","Tucson","Fresno","Sacramento","Kansas City","Atlanta","Miami","Raleigh","Minneapolis"];
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const STREET_TYPES = ["Street","Avenue","Boulevard","Drive","Lane","Road","Way","Place","Court","Circle"];
const STREET_NAMES = ["Main","Oak","Maple","Cedar","Pine","Elm","Washington","Park","Lake","Hill","Forest","River","Spring","Valley","Meadow","Sunset","Highland"];
const DIAGNOSES = ["Hypertension","Type 2 Diabetes","COPD","Coronary Artery Disease","Heart Failure","Pneumonia","Asthma","GERD","Major Depression","Anxiety Disorder","Chronic Kidney Disease","Atrial Fibrillation","Hypothyroidism","Hyperlipidemia","Osteoarthritis","Chronic Back Pain","Migraine","Epilepsy"];
const PROCEDURES = ["CT Scan","MRI","X-Ray","Ultrasound","Colonoscopy","Echocardiogram","Appendectomy","Knee Replacement","Angiography","Endoscopy","Bronchoscopy","Cardiac Catheterization","Hip Replacement","Cholecystectomy"];
const MEDICATIONS = ["Lisinopril","Metformin","Atorvastatin","Omeprazole","Amlodipine","Metoprolol","Levothyroxine","Gabapentin","Losartan","Sertraline","Tramadol","Prednisone","Warfarin","Aspirin"];
const HOSPITALS = ["Memorial Hospital","St. Mary's Medical Center","University Hospital","Regional Medical Center","Community General Hospital","Sacred Heart Hospital","Presbyterian Hospital","Baptist Medical Center","Methodist Hospital","Children's Hospital","Veterans Affairs Medical Center","County General Hospital","Mount Sinai Hospital","Johns Hopkins Hospital","Mayo Clinic","Cleveland Clinic","Massachusetts General Hospital","Cedar-Sinai Medical Center"];

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ============================================================================
// PHI GENERATORS - Only actual HIPAA-required PHI
// ============================================================================

function generateSSN(err = true, lvl = "medium") {
  const s = randomInt(100, 899) + "-" + String(randomInt(10, 99)).padStart(2, "0") + "-" + randomInt(1000, 9999);
  return err ? messUp(s, lvl) : s;
}

function generateMRN(err = true, lvl = "medium") {
  const p = random(["MRN", "PAT", "PT", ""]);
  const m = p ? p + "-" + randomInt(2020, 2024) + "-" + randomInt(10000, 99999) : String(randomInt(100000, 9999999));
  return err ? messUp(m, lvl) : m;
}

function generatePhone(err = true, lvl = "medium") {
  const a = randomInt(201, 989);
  const e = randomInt(200, 999);
  const sub = randomInt(1000, 9999);
  const fmts = [`(${a}) ${e}-${sub}`, `${a}-${e}-${sub}`, `${a}.${e}.${sub}`, `+1 ${a}-${e}-${sub}`, `1-${a}-${e}-${sub}`];
  return err ? messUp(random(fmts), lvl) : random(fmts);
}

function generateEmail(f, l) {
  const d = random(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "aol.com", "icloud.com"]);
  const p = random([`${f.toLowerCase()}.${l.toLowerCase()}`, `${f.toLowerCase()}${l.toLowerCase()}`, `${f[0].toLowerCase()}${l.toLowerCase()}`]);
  return `${p}@${d}`;
}

function generateDate(yMin = 2020, yMax = 2024, err = true, lvl = "medium") {
  const m = String(randomInt(1, 12)).padStart(2, "0");
  const d = String(randomInt(1, 28)).padStart(2, "0");
  const y = randomInt(yMin, yMax);
  const fmts = [`${m}/${d}/${y}`, `${m}-${d}-${y}`, `${y}-${m}-${d}`, `${parseInt(m)}/${parseInt(d)}/${y}`];
  return err ? messUp(random(fmts), lvl) : random(fmts);
}

function generateDOB(err = true, lvl = "medium") { return generateDate(1935, 2005, err, lvl); }

function generateAddress() {
  const n = randomInt(1, 9999);
  const st = `${random(STREET_NAMES)} ${random(STREET_TYPES)}`;
  const apt = Math.random() < 0.2 ? `, Apt ${randomInt(1, 500)}` : "";
  const c = random(CITIES);
  const s = random(STATES);
  const z = String(randomInt(10000, 99999));
  return { street: `${n} ${st}${apt}`, city: c, state: s, zip: z, full: `${n} ${st}${apt}, ${c}, ${s} ${z}` };
}

function generateNPI() { return String(randomInt(1000000000, 9999999999)); }
function generateIP() { return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`; }
function generateURL() { return `https://${random(["patient-portal", "myhealth", "health-records"])}${random([".com", ".org", ".health"])}/patient/${randomInt(10000, 99999)}`; }
function generateCreditCard() { 
  const pre = random(["4", "5", "34", "37", "6011"]); 
  let n = pre; 
  // AMEX cards (34xx, 37xx) are 15 digits, others are 16
  const targetLen = (pre === "34" || pre === "37") ? 15 : 16;
  while (n.length < targetLen) n += randomInt(0, 9); 
  // Format based on card type
  if (targetLen === 15) {
    // AMEX format: xxxx xxxxxx xxxxx
    return random([n, `${n.slice(0,4)}-${n.slice(4,10)}-${n.slice(10)}`, `${n.slice(0,4)} ${n.slice(4,10)} ${n.slice(10)}`]);
  }
  return random([n, `${n.slice(0,4)}-${n.slice(4,8)}-${n.slice(8,12)}-${n.slice(12)}`, `${n.slice(0,4)} ${n.slice(4,8)} ${n.slice(8,12)} ${n.slice(12)}`]); 
}
function generateVIN() { const c = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"; let v = ""; for (let i = 0; i < 17; i++) v += c[randomInt(0, c.length - 1)]; return v; }
function generateLicensePlate() { const L = "ABCDEFGHJKLMNPRSTUVWXYZ"; return `${L[randomInt(0,L.length-1)]}${L[randomInt(0,L.length-1)]}${L[randomInt(0,L.length-1)]}-${randomInt(1000, 9999)}`; }

// HIPAA: Ages 90+ must be redacted, under 90 do NOT need redaction
function generateAge() {
  // 15% chance of age 90+, which DOES need redaction
  if (Math.random() < 0.15) {
    return { age: randomInt(90, 105), needsRedaction: true };
  }
  // 85% chance of age under 90, which does NOT need redaction
  return { age: randomInt(18, 89), needsRedaction: false };
}

function generatePatientName(format = "random", lvl = "medium") {
  const first = random(FIRST);
  const middle = random(MIDDLE);
  const last = random(LAST);
  const suffix = Math.random() < 0.1 ? ", " + random(SUFFIXES.filter(s => !["MD","PhD","DO","RN","NP","PA-C","FACS"].includes(s))) : "";
  
  const fmts = {
    first_last: `${first} ${last}${suffix}`,
    first_middle_last: `${first} ${middle} ${last}${suffix}`,
    last_first: `${last}, ${first}${suffix}`,
    last_first_middle: `${last}, ${first} ${middle}${suffix}`,
    all_caps: `${first.toUpperCase()} ${last.toUpperCase()}${suffix.toUpperCase()}`,
    all_caps_last_first: `${last.toUpperCase()}, ${first.toUpperCase()}${suffix.toUpperCase()}`
  };
  const keys = Object.keys(fmts);
  if (format === "random") format = keys[randomInt(0, keys.length - 1)];
  const clean = fmts[format] || fmts.first_last;
  const messy = messUp(clean, lvl);
  return { first, middle, last, clean, formatted: messy, hasErrors: clean !== messy };
}

// ============================================================================
// DOCUMENT GENERATORS - With CORRECT PHI expectations
// ============================================================================

function genRadiologyReport(id, lvl) {
  const patient = generatePatientName("random", lvl);
  const dob = generateDOB(true, lvl);
  const examDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl);
  const phone = generatePhone(true, lvl);
  const hospital = random(HOSPITALS); // NOT PHI
  const procedure = random(PROCEDURES); // NOT PHI
  const diagnosis = random(DIAGNOSES); // NOT PHI
  const providerName = `Dr. ${random(FIRST)} ${random(LAST)}`; // Provider - NOT patient PHI
  
  const content = `${hospital}
RADIOLOGY REPORT

PATIENT: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
EXAM DATE: ${examDate}

PROCEDURE: ${procedure}
ORDERING PHYSICIAN: ${providerName}
PHONE: ${phone}

CLINICAL HISTORY: ${diagnosis}
FINDINGS: ${random(["No acute abnormality.", "Findings consistent with clinical history.", "Stable examination."])}
IMPRESSION: ${random(["Normal study.", "No acute findings.", "Recommend follow-up."])}

Signed: ${providerName}`;
  
  return { id, type: "Radiology Report", errorLevel: lvl, content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "DATE", value: dob },
      { type: "DATE", value: examDate },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone }
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "PROCEDURE", value: procedure },
      { type: "DIAGNOSIS", value: diagnosis }
    ]
  };
}

function genLabReport(id, lvl) {
  const patient = generatePatientName("last_first_middle", lvl);
  const dob = generateDOB(true, lvl);
  const collDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl);
  const npi = generateNPI();
  const phone = generatePhone(true, lvl);
  const ssn = generateSSN(true, lvl);
  const hospital = random(HOSPITALS);
  const providerName = `Dr. ${random(FIRST)} ${random(LAST)}`;
  
  const content = `${hospital}
LABORATORY REPORT

PATIENT: ${patient.formatted}
MRN: ${mrn}
SSN: ${ssn}
DOB: ${dob}

COLLECTION DATE: ${collDate}

ORDERING PHYSICIAN: ${providerName}
NPI: ${npi}
Phone: ${phone}

CBC:
WBC: ${(Math.random()*10+4).toFixed(1)} x10^9/L
Hgb: ${(Math.random()*5+12).toFixed(1)} g/dL
Plt: ${randomInt(150,400)} x10^9/L

Lab Director: Dr. ${random(FIRST)} ${random(LAST)}, MD, PhD`;
  
  return { id, type: "Lab Report", errorLevel: lvl, content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "DATE", value: dob },
      { type: "DATE", value: collDate },
      { type: "MRN", value: mrn },
      { type: "NPI", value: npi },
      { type: "PHONE", value: phone },
      { type: "SSN", value: ssn }
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital }
    ]
  };
}

function genProgressNote(id, lvl) {
  const patient = generatePatientName("first_middle_last", lvl);
  const dob = generateDOB(true, lvl);
  const visitDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl);
  const phone = generatePhone(true, lvl);
  const address = generateAddress();
  const email = generateEmail(patient.first, patient.last);
  const ageData = generateAge();
  const hospital = random(HOSPITALS);
  const diagnosis = random(DIAGNOSES);
  const providerName = `Dr. ${random(FIRST)} ${random(LAST)}`;
  
  const content = `${hospital}
PROGRESS NOTE

Patient: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Age: ${ageData.age} years
Date: ${visitDate}
Provider: ${providerName}

CC: ${random(["Follow-up", "New symptoms", "Med refill"])}

HPI: Patient is a ${ageData.age}-year-old with ${diagnosis}.

Contact: ${address.full}
Phone: ${phone}
Email: ${email}

Plan: Continue current management. Follow up ${randomInt(2,12)} weeks.

Signed: ${providerName}`;
  
  const expectedPHI = [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "DATE", value: dob },
    { type: "DATE", value: visitDate },
    { type: "MRN", value: mrn },
    { type: "ADDRESS", value: address.street },
    { type: "ZIPCODE", value: address.zip },
    { type: "PHONE", value: phone },
    { type: "EMAIL", value: email }
  ];
  
  // Only add age if 90+ (HIPAA requirement)
  if (ageData.needsRedaction) {
    expectedPHI.push({ type: "AGE_90_PLUS", value: String(ageData.age) });
  }
  
  return { id, type: "Progress Note", errorLevel: lvl, content, expectedPHI,
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "DIAGNOSIS", value: diagnosis },
      ...(ageData.needsRedaction ? [] : [{ type: "AGE_UNDER_90", value: String(ageData.age) }])
    ],
    ageInfo: ageData
  };
}

function genEmergencyNote(id, lvl) {
  const patient = generatePatientName("all_caps_last_first", lvl);
  const emergContact = generatePatientName("first_last", lvl);
  const dob = generateDOB(true, lvl);
  const arrivalDate = generateDate(2023, 2024, true, lvl);
  const mrn = `ED-${randomInt(2023,2024)}${randomInt(10000,99999)}`;
  const ssn = generateSSN(true, lvl);
  const phone = generatePhone(true, lvl);
  const address = generateAddress();
  const hospital = random(HOSPITALS);
  const providerName = `Dr. ${random(FIRST)} ${random(LAST)}`;
  
  const content = `${hospital}
EMERGENCY DEPARTMENT NOTE

PATIENT: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
SSN: ${ssn}
Arrival: ${arrivalDate}

Address: ${address.full}

Emergency Contact: ${emergContact.formatted}
Phone: ${phone}

Attending: ${providerName}

CC: ${random(["Chest pain", "Shortness of breath", "Trauma", "Altered mental status"])}

Disposition: ${random(["Admitted", "Discharged", "ICU", "Observation"])}

Signed: ${providerName}`;
  
  return { id, type: "Emergency Note", errorLevel: lvl, content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: emergContact.clean, actual: emergContact.formatted, hasErrors: emergContact.hasErrors },
      { type: "DATE", value: dob },
      { type: "DATE", value: arrivalDate },
      { type: "MRN", value: mrn },
      { type: "SSN", value: ssn },
      { type: "PHONE", value: phone },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip }
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital }
    ]
  };
}

function genDischargeSummary(id, lvl) {
  const patient = generatePatientName("last_first", lvl);
  const familyContact = generatePatientName("first_last", lvl);
  const dob = generateDOB(true, lvl);
  const admitDate = generateDate(2023, 2024, true, lvl);
  const dischDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl);
  const phone1 = generatePhone(true, lvl);
  const phone2 = generatePhone(true, lvl);
  const hospital = random(HOSPITALS);
  const diagnosis = random(DIAGNOSES);
  const providerName = `Dr. ${random(FIRST)} ${random(LAST)}`;
  
  const content = `${hospital}
DISCHARGE SUMMARY

PATIENT: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Admission: ${admitDate}
Discharge: ${dischDate}

Attending: ${providerName}

Diagnosis: ${diagnosis}

Emergency Contact: ${familyContact.formatted} - ${phone1}
PCP Phone: ${phone2}

Dictated by: ${providerName}`;
  
  return { id, type: "Discharge Summary", errorLevel: lvl, content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: familyContact.clean, actual: familyContact.formatted, hasErrors: familyContact.hasErrors },
      { type: "DATE", value: dob },
      { type: "DATE", value: admitDate },
      { type: "DATE", value: dischDate },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone1 },
      { type: "PHONE", value: phone2 }
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "DIAGNOSIS", value: diagnosis }
    ]
  };
}

function genOperativeReport(id, lvl) {
  const patient = generatePatientName("all_caps_last_first", lvl);
  const dob = generateDOB(true, lvl);
  const surgeryDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl);
  const hospital = random(HOSPITALS);
  const procedure = random(PROCEDURES.filter(p => !["CT Scan","MRI","X-Ray","Ultrasound"].includes(p)));
  const providerName = `Dr. ${random(FIRST)} ${random(LAST)}`;
  
  const content = `${hospital}
OPERATIVE REPORT

PATIENT: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
DATE OF SURGERY: ${surgeryDate}

Surgeon: ${providerName}, FACS

PROCEDURE: ${procedure}
ANESTHESIA: ${random(["General", "Spinal", "Regional", "MAC"])}
EBL: ${randomInt(5,500)} mL

FINDINGS: ${random(["As expected", "Uncomplicated", "No complications"])}

Signed: ${providerName}, FACS`;
  
  return { id, type: "Operative Report", errorLevel: lvl, content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "DATE", value: dob },
      { type: "DATE", value: surgeryDate },
      { type: "MRN", value: mrn }
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "PROCEDURE", value: procedure }
    ]
  };
}

function genPrescription(id, lvl) {
  const patient = generatePatientName("last_first_middle", lvl);
  const dob = generateDOB(true, lvl);
  const rxDate = generateDate(2023, 2024, true, lvl);
  const address = generateAddress();
  const phone = generatePhone(true, lvl);
  const npi = generateNPI();
  const med = random(MEDICATIONS);
  const providerName = `Dr. ${random(FIRST)} ${random(LAST)}`;
  
  const content = `PRESCRIPTION

DATE: ${rxDate}

Patient: ${patient.formatted}
DOB: ${dob}
Address: ${address.full}
Phone: ${phone}

Prescriber: ${providerName}
NPI: ${npi}

Rx: ${med} ${randomInt(5,100)}mg
Sig: Take ${random(["one", "two"])} tablet ${random(["daily", "twice daily", "as needed"])}
Qty: ${randomInt(30,90)}
Refills: ${randomInt(0,5)}

Signature: ${providerName}`;
  
  return { id, type: "Prescription", errorLevel: lvl, content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "DATE", value: dob },
      { type: "DATE", value: rxDate },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "PHONE", value: phone },
      { type: "NPI", value: npi }
    ],
    shouldNotRedact: [
      { type: "MEDICATION", value: med }
    ]
  };
}

function genConsultNote(id, lvl) {
  const patient = generatePatientName("all_caps_last_first", lvl);
  const familyMember = generatePatientName("first_last", lvl);
  const dob = generateDOB(true, lvl);
  const consultDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl);
  const phone = generatePhone(true, lvl);
  const email = generateEmail(patient.first, patient.last);
  const ageData = generateAge();
  const hospital = random(HOSPITALS);
  const diagnosis = random(DIAGNOSES);
  const providerName = `Dr. ${random(FIRST)} ${random(LAST)}`;
  
  const content = `${hospital}
CONSULTATION NOTE

RE: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
DATE: ${consultDate}

Consulting: ${providerName}

HPI: Patient is a ${ageData.age}-year-old with ${diagnosis}.

Family Contact: ${familyMember.formatted}
Phone: ${phone}
Email: ${email}

Recommendations:
1. Continue current management
2. Follow up in ${randomInt(1,4)} weeks

${providerName}`;
  
  const expectedPHI = [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: familyMember.clean, actual: familyMember.formatted, hasErrors: familyMember.hasErrors },
    { type: "DATE", value: dob },
    { type: "DATE", value: consultDate },
    { type: "MRN", value: mrn },
    { type: "PHONE", value: phone },
    { type: "EMAIL", value: email }
  ];
  
  if (ageData.needsRedaction) {
    expectedPHI.push({ type: "AGE_90_PLUS", value: String(ageData.age) });
  }
  
  return { id, type: "Consultation Note", errorLevel: lvl, content, expectedPHI,
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital },
      { type: "DIAGNOSIS", value: diagnosis },
      ...(ageData.needsRedaction ? [] : [{ type: "AGE_UNDER_90", value: String(ageData.age) }])
    ],
    ageInfo: ageData
  };
}

function genNursingAssessment(id, lvl) {
  const patient = generatePatientName("all_caps_last_first", lvl);
  const emerg1 = generatePatientName("first_last", lvl);
  const emerg2 = generatePatientName("first_last", lvl);
  const dob = generateDOB(true, lvl);
  const admitDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl);
  const phone1 = generatePhone(true, lvl);
  const phone2 = generatePhone(true, lvl);
  const hospital = random(HOSPITALS);
  const providerName = `Dr. ${random(FIRST)} ${random(LAST)}`;
  
  const content = `${hospital}
NURSING ADMISSION ASSESSMENT

Patient: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Admit: ${admitDate}

Emergency Contacts:
1. ${emerg1.formatted} - ${phone1}
2. ${emerg2.formatted} - ${phone2}

PCP: ${providerName}

VS: BP ${randomInt(90,180)}/${randomInt(50,110)}, HR ${randomInt(50,120)}
Allergies: ${random(["NKDA", "Penicillin", "Sulfa", "Morphine"])}

Assessed by: RN Staff`;
  
  return { id, type: "Nursing Assessment", errorLevel: lvl, content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "NAME", value: emerg1.clean, actual: emerg1.formatted, hasErrors: emerg1.hasErrors },
      { type: "NAME", value: emerg2.clean, actual: emerg2.formatted, hasErrors: emerg2.hasErrors },
      { type: "DATE", value: dob },
      { type: "DATE", value: admitDate },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone1 },
      { type: "PHONE", value: phone2 }
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital }
    ]
  };
}

function genSpecialDoc(id, lvl) {
  const patient = generatePatientName("first_last", lvl);
  const dob = generateDOB(true, lvl);
  const regDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl);
  const ssn = generateSSN(true, lvl);
  const phone = generatePhone(true, lvl);
  const email = generateEmail(patient.first, patient.last);
  const address = generateAddress();
  const ip = generateIP();
  const url = generateURL();
  const cc = generateCreditCard();
  const vin = generateVIN();
  const plate = generateLicensePlate();
  const hospital = random(HOSPITALS);
  
  const content = `${hospital}
PATIENT REGISTRATION

Patient: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
SSN: ${ssn}
Date: ${regDate}

Address: ${address.full}
Phone: ${phone}
Email: ${email}

Portal: ${url}
Last Login IP: ${ip}

Billing:
Card: ${cc}

Vehicle (valet):
VIN: ${vin}
Plate: ${plate}`;
  
  return { id, type: "Special Document", errorLevel: lvl, content,
    expectedPHI: [
      { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
      { type: "DATE", value: dob },
      { type: "DATE", value: regDate },
      { type: "MRN", value: mrn },
      { type: "SSN", value: ssn },
      { type: "PHONE", value: phone },
      { type: "EMAIL", value: email },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "IP", value: ip },
      { type: "URL", value: url },
      { type: "CREDIT_CARD", value: cc },
      { type: "VIN", value: vin },
      { type: "LICENSE_PLATE", value: plate }
    ],
    shouldNotRedact: [
      { type: "HOSPITAL", value: hospital }
    ]
  };
}

function generateDocuments(count) {
  const generators = [genRadiologyReport, genLabReport, genProgressNote, genEmergencyNote, genDischargeSummary, genOperativeReport, genPrescription, genConsultNote, genNursingAssessment, genSpecialDoc];
  const levels = ["low", "medium", "high"];
  const docs = [];
  for (let i = 0; i < count; i++) {
    const gen = generators[i % generators.length];
    const lvl = levels[Math.floor(Math.random() * 3)];
    docs.push(gen(i + 1, lvl));
  }
  for (let i = docs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [docs[i], docs[j]] = [docs[j], docs[i]];
  }
  return docs;
}

// ============================================================================
// MAIN ASSESSMENT
// ============================================================================

async function runAssessment() {
  console.log("=".repeat(80));
  console.log("VULPES CELARE - HIPAA-COMPLIANT 200-CASE ASSESSMENT");
  console.log("=".repeat(80));
  console.log("\nHIPAA Safe Harbor Compliance:");
  console.log("  ✓ Ages under 90: NOT redacted (correct)");
  console.log("  ✓ Ages 90+: MUST be redacted");
  console.log("  ✓ Hospital names: NOT PHI (should not redact)");
  console.log("  ✓ Diagnoses/Procedures: NOT PHI (should not redact)");
  console.log("  ✓ Provider names: NOT patient PHI\n");

  let VulpesCelare;
  try {
    const module = require("../dist/VulpesCelare.js");
    VulpesCelare = module.VulpesCelare;
    console.log(`Engine: ${VulpesCelare.NAME} v${VulpesCelare.VERSION}\n`);
  } catch (err) {
    console.error("Failed to load:", err.message);
    process.exit(1);
  }

  const engine = new VulpesCelare();
  console.log("Generating 200 documents...");
  const documents = generateDocuments(200);
  
  const errDist = { low: 0, medium: 0, high: 0 };
  const typeDist = {};
  documents.forEach(d => {
    errDist[d.errorLevel]++;
    typeDist[d.type] = (typeDist[d.type] || 0) + 1;
  });
  
  console.log(`Generated ${documents.length} documents`);
  console.log(`Error levels: Low=${errDist.low} Medium=${errDist.medium} High=${errDist.high}\n`);

  console.log("Processing...\n");
  const startTime = Date.now();

  let tp = 0, fn = 0;
  let correctlyPreserved = 0, incorrectlyRedacted = 0;
  const byLevel = { low: { tp: 0, fn: 0, total: 0 }, medium: { tp: 0, fn: 0, total: 0 }, high: { tp: 0, fn: 0, total: 0 } };
  const byType = {};
  const failures = [];
  const overRedactions = [];

  for (const doc of documents) {
    const result = await engine.process(doc.content);
    const redacted = result.text;

    // Check PHI that SHOULD be redacted
    for (const phi of doc.expectedPHI) {
      if (!byType[phi.type]) byType[phi.type] = { tp: 0, fn: 0, total: 0 };
      byType[phi.type].total++;
      byLevel[doc.errorLevel].total++;

      const val = phi.actual || phi.value;
      const wasRedacted = !redacted.includes(val);

      if (wasRedacted) {
        tp++;
        byType[phi.type].tp++;
        byLevel[doc.errorLevel].tp++;
      } else {
        fn++;
        byType[phi.type].fn++;
        byLevel[doc.errorLevel].fn++;
        failures.push({ docId: doc.id, docType: doc.type, errorLevel: doc.errorLevel, phiType: phi.type, expected: phi.value, actual: val, hasErrors: phi.hasErrors || false });
      }
    }

    // Check items that should NOT be redacted
    for (const item of (doc.shouldNotRedact || [])) {
      const wasPreserved = redacted.includes(item.value);
      if (wasPreserved) {
        correctlyPreserved++;
      } else {
        incorrectlyRedacted++;
        overRedactions.push({ docId: doc.id, docType: doc.type, type: item.type, value: item.value });
      }
    }
  }

  const totalTime = Date.now() - startTime;
  const totalPHI = tp + fn;
  const totalNonPHI = correctlyPreserved + incorrectlyRedacted;

  const sensitivity = (tp / totalPHI * 100);
  const specificity = totalNonPHI > 0 ? (correctlyPreserved / totalNonPHI * 100) : 100;
  const precision = tp / (tp + incorrectlyRedacted) * 100;
  const f1 = 2 * (precision * sensitivity) / (precision + sensitivity);

  let score = Math.round(sensitivity * 0.7 + specificity * 0.3);
  if (sensitivity < 95) score = Math.min(score, 70);
  if (sensitivity < 90) score = Math.min(score, 50);
  const grade = score >= 97 ? "A+" : score >= 93 ? "A" : score >= 90 ? "A-" : score >= 87 ? "B+" : score >= 83 ? "B" : score >= 80 ? "B-" : score >= 77 ? "C+" : score >= 73 ? "C" : score >= 70 ? "C-" : score >= 60 ? "D" : "F";

  console.log("=".repeat(80));
  console.log("RESULTS (HIPAA-Compliant Scoring)");
  console.log("=".repeat(80) + "\n");

  console.log("SUMMARY:");
  console.log(`  Documents:              ${documents.length}`);
  console.log(`  PHI items to redact:    ${totalPHI}`);
  console.log(`  Non-PHI to preserve:    ${totalNonPHI}`);
  console.log(`  Processing Time:        ${(totalTime/1000).toFixed(2)}s\n`);

  console.log("PHI DETECTION (Sensitivity):");
  console.log(`  Correctly redacted:     ${tp}`);
  console.log(`  Missed (FN):            ${fn}`);
  console.log(`  SENSITIVITY:            ${sensitivity.toFixed(2)}%\n`);

  console.log("NON-PHI PRESERVATION (Specificity):");
  console.log(`  Correctly preserved:    ${correctlyPreserved}`);
  console.log(`  Over-redacted (FP):     ${incorrectlyRedacted}`);
  console.log(`  SPECIFICITY:            ${specificity.toFixed(2)}%\n`);

  console.log(`  PRECISION:              ${precision.toFixed(2)}%`);
  console.log(`  F1 SCORE:               ${f1.toFixed(2)}\n`);

  console.log("-".repeat(80));
  console.log(`  OVERALL SCORE: ${score}/100 (${grade})`);
  console.log("-".repeat(80) + "\n");

  console.log("BY ERROR LEVEL:");
  for (const lvl of ["low", "medium", "high"]) {
    const s = byLevel[lvl];
    console.log(`  ${lvl.toUpperCase().padEnd(8)}: ${s.tp}/${s.total} (${s.total > 0 ? (s.tp/s.total*100).toFixed(1) : "N/A"}%)`);
  }
  console.log();

  console.log("BY PHI TYPE:");
  Object.entries(byType).sort((a,b) => b[1].total - a[1].total).forEach(([type, s]) => {
    const pct = s.total > 0 ? (s.tp/s.total*100).toFixed(1) : "N/A";
    console.log(`  ${type.padEnd(15)}: ${s.tp}/${s.total} (${pct}%)${s.fn > 0 ? ` - ${s.fn} missed` : ""}`);
  });
  console.log();

  if (failures.length > 0) {
    console.log(`MISSED PHI (${failures.length} total, showing first 25):`);
    failures.slice(0, 25).forEach(f => {
      const tag = f.hasErrors ? " [ERRORS]" : "";
      console.log(`  Doc ${f.docId} (${f.docType}/${f.errorLevel}): ${f.phiType} = "${f.actual}"${tag}`);
    });
    console.log();
  }

  if (overRedactions.length > 0) {
    console.log(`OVER-REDACTIONS (should NOT have been redacted - ${overRedactions.length} total):`);
    overRedactions.slice(0, 15).forEach(o => {
      console.log(`  Doc ${o.docId}: ${o.type} = "${o.value}"`);
    });
    console.log();
  }

  const resultsDir = path.join(__dirname, "results");
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  const resultsFile = path.join(resultsDir, "hipaa-compliant-200-" + Date.now() + ".json");
  
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    engine: { name: VulpesCelare.NAME, version: VulpesCelare.VERSION },
    hipaaCompliant: true,
    config: { documents: documents.length, errorDistribution: errDist },
    metrics: { sensitivity, specificity, precision, f1, score, grade },
    counts: { tp, fn, correctlyPreserved, incorrectlyRedacted, totalPHI, totalNonPHI },
    byErrorLevel: byLevel,
    byPHIType: byType,
    failures,
    overRedactions
  }, null, 2));

  console.log(`Results saved: ${resultsFile}`);
  console.log("=".repeat(80));
}

runAssessment().catch(console.error);
