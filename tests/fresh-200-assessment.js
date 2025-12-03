/**
 * FRESH 200-CASE AUTHENTIC ASSESSMENT
 * Generates 200 NEW documents, runs through REAL engine, reports ONLY at end
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
const FIRST = ["James","Mary","Robert","Patricia","John","Jennifer","Michael","Linda","David","Elizabeth","William","Barbara","Richard","Susan","Joseph","Jessica","Thomas","Sarah","Christopher","Karen","Charles","Lisa","Daniel","Nancy","Matthew","Betty","Anthony","Margaret","Steven","Kimberly","Paul","Emily","Andrew","Donna","Joshua","Michelle","Kenneth","Dorothy","Kevin","Carol","Brian","Amanda","George","Melissa","Timothy","Deborah","Ronald","Stephanie","Edward","Rebecca","Jason","Sharon","Jeffrey","Laura","Ryan","Cynthia","Jacob","Kathleen","Gary","Amy","Nicholas","Angela","Eric","Shirley","Jonathan","Anna","Stephen","Brenda","Larry","Pamela","Justin","Emma","Scott","Nicole","Brandon","Helen","Benjamin","Samantha","Samuel","Katherine","Raymond","Christine","Gregory","Debra","Frank","Rachel","Alexander","Carolyn","Patrick","Janet","Jack","Catherine","Dennis","Maria","Jerry","Heather","Tyler","Diane","Aaron","Ruth","Jose","Julie","Adam","Olivia","Nathan","Joyce","Henry","Virginia","Douglas","Victoria","Zachary","Kelly","Peter","Lauren","Kyle","Christina","Noah","Joan","Ethan","Evelyn","Jeremy","Judith","Walter","Megan","Christian","Andrea","Keith","Cheryl","Roger","Hannah","Terry","Jacqueline","Harry","Martha","Ralph","Gloria","Sean","Teresa","Jesse","Ann","Austin","Sara","Arthur","Madison","Lawrence","Frances","Dylan","Kathryn","Bryan","Janice","Joe","Jean","Jordan","Abigail","Billy","Alice","Bruce","Judy","Gabriel","Sophia","Logan","Grace","Albert","Denise","Willie","Amber","Alan","Doris","Eugene","Marilyn","Russell","Danielle","Vincent","Beverly","Philip","Isabella","Bobby","Theresa","Johnny","Diana","Bradley","Natalie","Roy","Brittany","Louis","Charlotte","Dylan","Alyssa","Yuki","Wei","Fatima","Omar","Raj","Chen","Kim","Singh","Patel","Khan","Carlos","Sofia","Miguel","Juan","Mohammed","Aaliyah","Hiroshi","Priya","Vladimir","Natasha","Olga","Ivan","Dmitri","Svetlana","Kenji","Akiko","Takeshi","Yumiko","Sanjay","Deepa","Ravi","Lakshmi","Alejandro","Isabella","Fernando","Gabriela","Ricardo","Valentina","Andres","Camila","Diego","Lucia","Bartholomew","Penelope","Gertrude","Wilfred","Clementine","Reginald","Cornelius","Josephine","Archibald","Millicent","DeShawn","LaTonya","Jamal","Shaniqua","Terrence","Keisha","Darnell","Tamika","Tyrone","Latoya"];
const LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Gomez","Phillips","Evans","Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes","Stewart","Morris","Morales","Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper","Peterson","Bailey","Reed","Kelly","Howard","Ramos","Kim","Cox","Ward","Richardson","Watson","Brooks","Chavez","Wood","James","Bennett","Gray","Mendoza","Ruiz","Hughes","Price","Alvarez","Castillo","Sanders","Patel","Myers","Long","Ross","Foster","Jimenez","O'Brien","O'Connor","McDonald","McCarthy","Nakamura","Tanaka","Chen","Wang","Kumar","Sharma","Mueller","Schmidt","Van der Berg","De la Cruz","Al-Rashid","Ben-David","Park","Singh","Nguyen","Tran","Kowalski","Johansson","Fitzgerald","McAllister","St. James","DuPont","La Fontaine","Dela Rosa","Ibn Saud","Johanssen-Schmidt","Worthington-Smythe","Blackwood-Harrison"];
const MIDDLE = ["Marie","Ann","Lee","James","Michael","Elizabeth","Rose","Lynn","Grace","Jean","Paul","John","David","Edward","Thomas","William","Alexander","Catherine","Margaret","Victoria","Louise","Francis","Joseph","Robert","Charles","George","Henry","Richard","Andrew","Patrick","Christopher","Daniel","Matthew","Benjamin","Nicholas","Anthony","Stephen","Raymond","Lawrence","Douglas"];
const TITLES = ["Dr.", "Mr.", "Mrs.", "Ms.", "Prof.", "Rev."];
const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "MD", "PhD", "DO", "RN", "NP", "PA-C", "FACS", "FACP", "FACOG", "MBA", "JD", "Esq."];
const CITIES = ["New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas","San Jose","Austin","Jacksonville","Fort Worth","Columbus","Indianapolis","Charlotte","San Francisco","Seattle","Denver","Boston","El Paso","Nashville","Detroit","Oklahoma City","Portland","Las Vegas","Memphis","Louisville","Baltimore","Milwaukee","Albuquerque","Tucson","Fresno","Sacramento","Kansas City","Atlanta","Miami","Raleigh","Omaha","Minneapolis","Cleveland","Tulsa","Oakland","Tampa","Honolulu","Anchorage","Pittsburgh","Cincinnati","St. Louis","New Orleans"];
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];
const STREET_TYPES = ["Street","Avenue","Boulevard","Drive","Lane","Road","Way","Place","Court","Circle","Terrace","Trail","Parkway","Highway","Pike","Alley"];
const STREET_NAMES = ["Main","Oak","Maple","Cedar","Pine","Elm","Washington","Park","Lake","Hill","Forest","River","Spring","Valley","Meadow","Sunset","Highland","Church","School","Mill","Center","North","South","East","West","Walnut","Cherry","Birch","Willow","Hickory","Spruce","Magnolia","Dogwood","Poplar","Sycamore","Chestnut","Beech"];
const DIAGNOSES = ["Hypertension","Type 2 Diabetes Mellitus","COPD","Coronary Artery Disease","Congestive Heart Failure","Community-Acquired Pneumonia","Asthma","GERD","Major Depressive Disorder","Generalized Anxiety Disorder","Chronic Kidney Disease Stage III","Atrial Fibrillation","Hypothyroidism","Hyperlipidemia","Osteoarthritis","Rheumatoid Arthritis","Chronic Low Back Pain","Migraine without Aura","Epilepsy","Multiple Sclerosis","Parkinson's Disease","Alzheimer's Disease","Acute Myocardial Infarction","Pulmonary Embolism","Deep Vein Thrombosis","Cellulitis","Urinary Tract Infection","Sepsis","Acute Appendicitis","Cholecystitis","Pancreatitis","Diverticulitis","Crohn's Disease","Ulcerative Colitis","Cirrhosis","Hepatitis C","HIV/AIDS","Lupus","Fibromyalgia","Gout"];
const PROCEDURES = ["CT Scan of Chest","MRI of Brain","X-Ray of Chest","Abdominal Ultrasound","Colonoscopy","Echocardiogram","Appendectomy","Total Knee Replacement","Coronary Angiography","Upper GI Endoscopy","Bronchoscopy","Lumbar Puncture","Cardiac Catheterization","CABG","Total Hip Arthroplasty","Cholecystectomy","Thyroidectomy","Mastectomy","Prostatectomy","Hysterectomy","Laparoscopic Hernia Repair","Spinal Fusion","Carpal Tunnel Release","Rotator Cuff Repair","ACL Reconstruction","Cataract Surgery","LASIK","Pacemaker Insertion","ICD Implantation","Kidney Transplant"];
const MEDICATIONS = ["Lisinopril","Metformin","Atorvastatin","Omeprazole","Amlodipine","Metoprolol","Levothyroxine","Gabapentin","Hydrochlorothiazide","Losartan","Albuterol","Fluticasone","Sertraline","Escitalopram","Tramadol","Oxycodone","Prednisone","Warfarin","Clopidogrel","Aspirin","Pantoprazole","Rosuvastatin","Carvedilol","Furosemide","Spironolactone","Insulin Glargine","Methotrexate","Adalimumab","Rituximab","Pembrolizumab"];
const HOSPITALS = ["Memorial Hospital","St. Mary's Medical Center","University Hospital","Regional Medical Center","Community General Hospital","Sacred Heart Hospital","Presbyterian Hospital","Baptist Medical Center","Methodist Hospital","Children's Hospital","Veterans Affairs Medical Center","County General Hospital","Mount Sinai Hospital","Johns Hopkins Hospital","Mayo Clinic","Cleveland Clinic","Massachusetts General Hospital","Cedars-Sinai Medical Center","Duke University Hospital","Stanford Health Care","UCSF Medical Center","Northwestern Memorial Hospital","NYU Langone Health","Emory University Hospital","Vanderbilt University Medical Center"];

function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateSSN(err = true, lvl = "medium") {
  const s = randomInt(100, 899) + "-" + String(randomInt(10, 99)).padStart(2, "0") + "-" + randomInt(1000, 9999);
  return err ? messUp(s, lvl) : s;
}

function generateMRN(err = true, lvl = "medium") {
  const p = random(["MRN", "PAT", "PT", "MED", ""]);
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
  const p = random([`${f.toLowerCase()}.${l.toLowerCase()}`, `${f.toLowerCase()}${l.toLowerCase()}`, `${f[0].toLowerCase()}${l.toLowerCase()}`, `${l.toLowerCase()}.${f.toLowerCase()}`]);
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
  const apt = Math.random() < 0.25 ? `, Apt ${randomInt(1, 500)}` : (Math.random() < 0.15 ? `, Suite ${randomInt(100, 999)}` : "");
  const c = random(CITIES);
  const s = random(STATES);
  const z = String(randomInt(10000, 99999));
  return { street: `${n} ${st}${apt}`, city: c, state: s, zip: z, full: `${n} ${st}${apt}, ${c}, ${s} ${z}` };
}

function generateNPI() { return String(randomInt(1000000000, 9999999999)); }
function generateDEA() { const L = "ABCDEFGHJKLMNPRSTUVWXYZ"; return L[randomInt(0, L.length - 1)] + L[randomInt(0, L.length - 1)] + randomInt(1000000, 9999999); }
function generateIP() { return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`; }
function generateURL() { return `https://${random(["patient-portal", "myhealth", "health-records", "medportal"])}${random([".com", ".org", ".health"])}/patient/${randomInt(10000, 99999)}`; }
function generateCreditCard() { const pre = random(["4", "5", "37", "6011"]); let n = pre; while (n.length < 16) n += randomInt(0, 9); return random([n, `${n.slice(0,4)}-${n.slice(4,8)}-${n.slice(8,12)}-${n.slice(12)}`, `${n.slice(0,4)} ${n.slice(4,8)} ${n.slice(8,12)} ${n.slice(12)}`]); }
function generateVIN() { const c = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"; let v = ""; for (let i = 0; i < 17; i++) v += c[randomInt(0, c.length - 1)]; return v; }
function generateLicensePlate() { const L = "ABCDEFGHJKLMNPRSTUVWXYZ"; return `${L[randomInt(0,25)]}${L[randomInt(0,25)]}${L[randomInt(0,25)]}-${randomInt(1000, 9999)}`; }

function generateName(format = "random", lvl = "medium") {
  const first = random(FIRST);
  const middle = random(MIDDLE);
  const last = random(LAST);
  const title = random(TITLES);
  const suffix = random(SUFFIXES);
  const fmts = {
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
  const keys = Object.keys(fmts);
  if (format === "random") format = keys[randomInt(0, keys.length - 1)];
  const clean = fmts[format] || fmts.first_last;
  const messy = messUp(clean, lvl);
  return { first, middle, last, clean, formatted: messy, hasErrors: clean !== messy };
}

// ============================================================================
// DOCUMENT GENERATORS
// ============================================================================

function genRadiologyReport(id, lvl) {
  const patient = generateName("random", lvl);
  const ordering = generateName("titled", lvl);
  const radiologist = generateName("first_last", lvl);
  const dob = generateDOB(true, lvl), examDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl), phone = generatePhone(true, lvl);
  const hospital = random(HOSPITALS);
  const procedure = random(PROCEDURES.filter(p => /CT|MRI|X-Ray|Ultrasound/.test(p)));
  
  const content = `${hospital}\nRADIOLOGY REPORT\n\nPATIENT: ${patient.formatted}\nDOB: ${dob}\nMRN: ${mrn}\nEXAM DATE: ${examDate}\n\nPROCEDURE: ${procedure}\nORDERING PHYSICIAN: ${ordering.formatted}\nPHONE: ${phone}\n\nCLINICAL HISTORY: ${random(DIAGNOSES)}\nFINDINGS: ${random(["No acute abnormality.", "Findings consistent with clinical history.", "Stable examination."])}\nIMPRESSION: ${random(["Normal study.", "No acute findings.", "Recommend follow-up."])}\n\nSigned: ${radiologist.formatted}, MD`;
  
  return { id, type: "Radiology Report", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: ordering.clean, actual: ordering.formatted, hasErrors: ordering.hasErrors },
    { type: "NAME", value: radiologist.clean, actual: radiologist.formatted, hasErrors: radiologist.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: examDate },
    { type: "MRN", value: mrn }, { type: "PHONE", value: phone }, { type: "HOSPITAL", value: hospital }
  ], expectedNonPHI: [{ type: "PROCEDURE", value: procedure }] };
}

function genLabReport(id, lvl) {
  const patient = generateName("last_first_middle", lvl);
  const orderingDoc = generateName("titled", lvl);
  const labDir = generateName("first_last", lvl);
  const dob = generateDOB(true, lvl), collDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl), npi = generateNPI(), phone = generatePhone(true, lvl), ssn = generateSSN(true, lvl);
  const hospital = random(HOSPITALS);
  
  const content = `${hospital}\nLABORATORY REPORT\n\nPATIENT: ${patient.formatted}\nMRN: ${mrn}\nSSN: ${ssn}\nDOB: ${dob}\n\nCOLLECTION DATE: ${collDate}\n\nORDERING PHYSICIAN: ${orderingDoc.formatted}\nNPI: ${npi}\nPhone: ${phone}\n\nCBC:\nWBC: ${(Math.random()*10+4).toFixed(1)} x10^9/L\nHgb: ${(Math.random()*5+12).toFixed(1)} g/dL\nPlt: ${randomInt(150,400)} x10^9/L\n\nCMP:\nGlucose: ${randomInt(70,200)} mg/dL\nBUN: ${randomInt(7,30)} mg/dL\nCreatinine: ${(Math.random()*1.5+0.6).toFixed(2)} mg/dL\n\nLab Director: ${labDir.formatted}, MD, PhD`;
  
  return { id, type: "Lab Report", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: orderingDoc.clean, actual: orderingDoc.formatted, hasErrors: orderingDoc.hasErrors },
    { type: "NAME", value: labDir.clean, actual: labDir.formatted, hasErrors: labDir.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: collDate },
    { type: "MRN", value: mrn }, { type: "NPI", value: npi }, { type: "PHONE", value: phone }, { type: "SSN", value: ssn }, { type: "HOSPITAL", value: hospital }
  ], expectedNonPHI: [] };
}

function genProgressNote(id, lvl) {
  const patient = generateName("first_middle_last", lvl);
  const patientRef = generateName("titled_last", lvl);
  const provider = generateName("titled", lvl);
  const dob = generateDOB(true, lvl), visitDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl), phone = generatePhone(true, lvl);
  const address = generateAddress(), email = generateEmail(patient.first, patient.last);
  const age = randomInt(25, 85);
  const hospital = random(HOSPITALS);
  
  const content = `${hospital}\nPROGRESS NOTE\n\nPatient: ${patient.formatted}\nMRN: ${mrn}\nDOB: ${dob}\nAge: ${age} years\nDate: ${visitDate}\nProvider: ${provider.formatted}\n\nCC: ${random(["Follow-up", "New symptoms", "Med refill"])}\n\nHPI: ${patientRef.formatted} is a ${age}-year-old with ${random(DIAGNOSES)}.\n\nContact: ${address.full}\nPhone: ${phone}\nEmail: ${email}\n\nVitals: BP ${randomInt(100,160)}/${randomInt(60,100)}, HR ${randomInt(55,100)}\n\nPlan: Continue current management. Follow up ${randomInt(2,12)} weeks.\n\nSigned: ${provider.clean.replace(/Dr\. |Prof\. /g, "")}, MD`;
  
  return { id, type: "Progress Note", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
    { type: "NAME", value: provider.clean, actual: provider.formatted, hasErrors: provider.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: visitDate },
    { type: "MRN", value: mrn }, { type: "ADDRESS", value: address.street }, { type: "ZIPCODE", value: address.zip },
    { type: "PHONE", value: phone }, { type: "EMAIL", value: email }, { type: "AGE", value: String(age) }, { type: "HOSPITAL", value: hospital }
  ], expectedNonPHI: [] };
}

function genEmergencyNote(id, lvl) {
  const patient = generateName("all_caps_last_first", lvl);
  const emergContact = generateName("first_last", lvl);
  const attending = generateName("titled", lvl);
  const resident = generateName("titled", lvl);
  const nurse = generateName("first_last", lvl);
  const dob = generateDOB(true, lvl), arrivalDate = generateDate(2023, 2024, true, lvl);
  const mrn = `ED-${randomInt(2023,2024)}${randomInt(10000,99999)}`;
  const ssn = generateSSN(true, lvl), phone = generatePhone(true, lvl);
  const address = generateAddress();
  const hospital = random(HOSPITALS);
  
  const content = `${hospital}\nEMERGENCY DEPARTMENT NOTE\n\nPATIENT: ${patient.formatted}\nDOB: ${dob}\nMRN: ${mrn}\nSSN: ${ssn}\nArrival: ${arrivalDate}\n\nAddress: ${address.full}\n\nEmergency Contact: ${emergContact.formatted}\nPhone: ${phone}\n\nAttending: ${attending.formatted}\nResident: ${resident.formatted}\nNurse: ${nurse.formatted}, RN\n\nCC: ${random(["Chest pain", "Shortness of breath", "Trauma", "Altered mental status"])}\n\nVS: BP ${randomInt(80,200)}/${randomInt(40,120)}, HR ${randomInt(40,150)}, SpO2 ${randomInt(85,100)}%\n\nDisposition: ${random(["Admitted", "Discharged", "ICU", "Observation"])}\n\nSigned: ${attending.clean.replace(/Dr\. |Prof\. /g, "")}, MD`;
  
  return { id, type: "Emergency Note", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: emergContact.clean, actual: emergContact.formatted, hasErrors: emergContact.hasErrors },
    { type: "NAME", value: attending.clean, actual: attending.formatted, hasErrors: attending.hasErrors },
    { type: "NAME", value: resident.clean, actual: resident.formatted, hasErrors: resident.hasErrors },
    { type: "NAME", value: nurse.clean, actual: nurse.formatted, hasErrors: nurse.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: arrivalDate },
    { type: "MRN", value: mrn }, { type: "SSN", value: ssn }, { type: "PHONE", value: phone },
    { type: "ADDRESS", value: address.street }, { type: "ZIPCODE", value: address.zip }, { type: "HOSPITAL", value: hospital }
  ], expectedNonPHI: [] };
}

function genDischargeSummary(id, lvl) {
  const patient = generateName("last_first", lvl);
  const patientRef = generateName("titled_last", lvl);
  const attending = generateName("titled", lvl);
  const pcp = generateName("titled", lvl);
  const consultant = generateName("titled", lvl);
  const family = generateName("first_last", lvl);
  const dob = generateDOB(true, lvl), admitDate = generateDate(2023, 2024, true, lvl), dischDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl), phone1 = generatePhone(true, lvl), phone2 = generatePhone(true, lvl);
  const hospital = random(HOSPITALS);
  
  const content = `${hospital}\nDISCHARGE SUMMARY\n\nPATIENT: ${patient.formatted}\nMRN: ${mrn}\nDOB: ${dob}\nAdmission: ${admitDate}\nDischarge: ${dischDate}\n\nAttending: ${attending.formatted}\nConsultant: ${consultant.formatted}\n\nDiagnosis: ${random(DIAGNOSES)}\n\nCourse: ${patientRef.formatted} was admitted with ${random(["acute exacerbation", "new onset", "worsening"])} symptoms.\n\nFollow-up: ${pcp.formatted} - ${phone1}\nEmergency Contact: ${family.formatted} - ${phone2}\n\nDictated by: ${attending.clean.replace(/Dr\. |Prof\. /g, "")}, MD`;
  
  return { id, type: "Discharge Summary", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
    { type: "NAME", value: attending.clean, actual: attending.formatted, hasErrors: attending.hasErrors },
    { type: "NAME", value: consultant.clean, actual: consultant.formatted, hasErrors: consultant.hasErrors },
    { type: "NAME", value: pcp.clean, actual: pcp.formatted, hasErrors: pcp.hasErrors },
    { type: "NAME", value: family.clean, actual: family.formatted, hasErrors: family.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: admitDate }, { type: "DATE", value: dischDate },
    { type: "MRN", value: mrn }, { type: "PHONE", value: phone1 }, { type: "PHONE", value: phone2 }, { type: "HOSPITAL", value: hospital }
  ], expectedNonPHI: [] };
}

function genOperativeReport(id, lvl) {
  const patient = generateName("all_caps_last_first", lvl);
  const surgeon = generateName("titled", lvl);
  const assistant = generateName("titled", lvl);
  const anesthesiologist = generateName("titled", lvl);
  const scrubNurse = generateName("first_last", lvl);
  const dob = generateDOB(true, lvl), surgeryDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl);
  const hospital = random(HOSPITALS);
  const procedure = random(PROCEDURES.filter(p => !/CT|MRI|X-Ray|Ultrasound|EKG/.test(p)));
  
  const content = `${hospital}\nOPERATIVE REPORT\n\nPATIENT: ${patient.formatted}\nMRN: ${mrn}\nDOB: ${dob}\nDATE OF SURGERY: ${surgeryDate}\n\nSurgeon: ${surgeon.formatted}, FACS\nAssistant: ${assistant.formatted}\nAnesthesiologist: ${anesthesiologist.formatted}\nScrub Nurse: ${scrubNurse.formatted}, RN\n\nPROCEDURE: ${procedure}\nANESTHESIA: ${random(["General", "Spinal", "Regional", "MAC"])}\nEBL: ${randomInt(5,500)} mL\n\nFINDINGS: ${random(["As expected", "Uncomplicated", "No complications"])}\n\nSigned: ${surgeon.clean.replace(/Dr\. |Prof\. /g, "")}, MD, FACS`;
  
  return { id, type: "Operative Report", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: surgeon.clean, actual: surgeon.formatted, hasErrors: surgeon.hasErrors },
    { type: "NAME", value: assistant.clean, actual: assistant.formatted, hasErrors: assistant.hasErrors },
    { type: "NAME", value: anesthesiologist.clean, actual: anesthesiologist.formatted, hasErrors: anesthesiologist.hasErrors },
    { type: "NAME", value: scrubNurse.clean, actual: scrubNurse.formatted, hasErrors: scrubNurse.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: surgeryDate },
    { type: "MRN", value: mrn }, { type: "HOSPITAL", value: hospital }
  ], expectedNonPHI: [{ type: "PROCEDURE", value: procedure }] };
}

function genPrescription(id, lvl) {
  const patient = generateName("last_first_middle", lvl);
  const prescriber = generateName("titled", lvl);
  const dob = generateDOB(true, lvl), rxDate = generateDate(2023, 2024, true, lvl);
  const address = generateAddress(), phone = generatePhone(true, lvl);
  const dea = generateDEA(), npi = generateNPI();
  const med = random(MEDICATIONS);
  
  const content = `PRESCRIPTION\n\nDATE: ${rxDate}\n\nPatient: ${patient.formatted}\nDOB: ${dob}\nAddress: ${address.full}\nPhone: ${phone}\n\nPrescriber: ${prescriber.formatted}\nDEA: ${dea}\nNPI: ${npi}\n\nRx: ${med} ${randomInt(5,100)}mg\nSig: Take ${random(["one", "two"])} tablet ${random(["daily", "twice daily", "as needed"])}\nQty: ${randomInt(30,90)}\nRefills: ${randomInt(0,5)}\n\nSignature: ${prescriber.clean.replace(/Dr\. |Prof\. /g, "")}, MD`;
  
  return { id, type: "Prescription", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: prescriber.clean, actual: prescriber.formatted, hasErrors: prescriber.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: rxDate },
    { type: "ADDRESS", value: address.street }, { type: "ZIPCODE", value: address.zip },
    { type: "PHONE", value: phone }, { type: "DEA", value: dea }, { type: "NPI", value: npi }
  ], expectedNonPHI: [{ type: "MEDICATION", value: med }] };
}

function genConsultNote(id, lvl) {
  const patient = generateName("all_caps_full", lvl);
  const patientRef = generateName("titled_last", lvl);
  const requesting = generateName("titled", lvl);
  const consulting = generateName("titled", lvl);
  const family = generateName("first_last", lvl);
  const dob = generateDOB(true, lvl), consultDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl), phone = generatePhone(true, lvl);
  const email = generateEmail(patient.first, patient.last);
  const age = randomInt(30, 80);
  const hospital = random(HOSPITALS);
  
  const content = `${hospital}\nCONSULTATION NOTE\n\nRE: ${patient.formatted}\nDOB: ${dob}\nMRN: ${mrn}\nDATE: ${consultDate}\n\nRequesting: ${requesting.formatted}\nConsulting: ${consulting.formatted}\n\nHPI: ${patientRef.formatted} is a ${age}-year-old with ${random(DIAGNOSES)}.\n\nFamily Contact: ${family.formatted}\nPhone: ${phone}\nEmail: ${email}\n\nRecommendations:\n1. ${random(["Start " + random(MEDICATIONS), "Continue current management", "Order imaging"])}\n2. Follow up in ${randomInt(1,4)} weeks\n\n${consulting.clean.replace(/Dr\. |Prof\. /g, "")}, MD`;
  
  return { id, type: "Consultation Note", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: patientRef.clean, actual: patientRef.formatted, hasErrors: patientRef.hasErrors },
    { type: "NAME", value: requesting.clean, actual: requesting.formatted, hasErrors: requesting.hasErrors },
    { type: "NAME", value: consulting.clean, actual: consulting.formatted, hasErrors: consulting.hasErrors },
    { type: "NAME", value: family.clean, actual: family.formatted, hasErrors: family.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: consultDate },
    { type: "MRN", value: mrn }, { type: "PHONE", value: phone }, { type: "EMAIL", value: email },
    { type: "AGE", value: String(age) }, { type: "HOSPITAL", value: hospital }
  ], expectedNonPHI: [] };
}

function genNursingAssessment(id, lvl) {
  const patient = generateName("all_caps_full", lvl);
  const primaryNurse = generateName("first_last", lvl);
  const chargeNurse = generateName("first_last", lvl);
  const emerg1 = generateName("first_last", lvl);
  const emerg2 = generateName("with_suffix", lvl);
  const pcp = generateName("titled", lvl);
  const dob = generateDOB(true, lvl), admitDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl), phone1 = generatePhone(true, lvl), phone2 = generatePhone(true, lvl), phone3 = generatePhone(true, lvl);
  const hospital = random(HOSPITALS);
  
  const content = `${hospital}\nNURSING ADMISSION ASSESSMENT\n\nPatient: ${patient.formatted}\nMRN: ${mrn}\nDOB: ${dob}\nAdmit: ${admitDate}\n\nPrimary Nurse: ${primaryNurse.formatted}, RN\nCharge Nurse: ${chargeNurse.formatted}, RN\n\nEmergency Contacts:\n1. ${emerg1.formatted} - ${phone1}\n2. ${emerg2.formatted} - ${phone2}\n\nPCP: ${pcp.formatted}\nPhone: ${phone3}\n\nVS: BP ${randomInt(90,180)}/${randomInt(50,110)}, HR ${randomInt(50,120)}, SpO2 ${randomInt(90,100)}%\nAllergies: ${random(["NKDA", "Penicillin", "Sulfa", "Morphine"])}\nFall Risk: ${random(["Low", "Moderate", "High"])}\n\nAssessed by: ${primaryNurse.formatted}, RN`;
  
  return { id, type: "Nursing Assessment", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: primaryNurse.clean, actual: primaryNurse.formatted, hasErrors: primaryNurse.hasErrors },
    { type: "NAME", value: chargeNurse.clean, actual: chargeNurse.formatted, hasErrors: chargeNurse.hasErrors },
    { type: "NAME", value: emerg1.clean, actual: emerg1.formatted, hasErrors: emerg1.hasErrors },
    { type: "NAME", value: emerg2.clean, actual: emerg2.formatted, hasErrors: emerg2.hasErrors },
    { type: "NAME", value: pcp.clean, actual: pcp.formatted, hasErrors: pcp.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: admitDate },
    { type: "MRN", value: mrn }, { type: "PHONE", value: phone1 }, { type: "PHONE", value: phone2 }, { type: "PHONE", value: phone3 }, { type: "HOSPITAL", value: hospital }
  ], expectedNonPHI: [] };
}

function genSpecialDoc(id, lvl) {
  const patient = generateName("first_last", lvl);
  const provider = generateName("titled", lvl);
  const dob = generateDOB(true, lvl), regDate = generateDate(2023, 2024, true, lvl);
  const mrn = generateMRN(true, lvl), ssn = generateSSN(true, lvl), phone = generatePhone(true, lvl);
  const email = generateEmail(patient.first, patient.last);
  const address = generateAddress();
  const ip = generateIP(), url = generateURL(), cc = generateCreditCard(), vin = generateVIN(), plate = generateLicensePlate();
  const hospital = random(HOSPITALS);
  
  const content = `${hospital}\nPATIENT REGISTRATION\n\nPatient: ${patient.formatted}\nDOB: ${dob}\nMRN: ${mrn}\nSSN: ${ssn}\nDate: ${regDate}\n\nProvider: ${provider.formatted}\n\nAddress: ${address.full}\nPhone: ${phone}\nEmail: ${email}\n\nPortal: ${url}\nLast Login IP: ${ip}\n\nBilling:\nCard: ${cc}\n\nVehicle (valet):\nVIN: ${vin}\nPlate: ${plate}`;
  
  return { id, type: "Special Document", errorLevel: lvl, content, expectedPHI: [
    { type: "NAME", value: patient.clean, actual: patient.formatted, hasErrors: patient.hasErrors },
    { type: "NAME", value: provider.clean, actual: provider.formatted, hasErrors: provider.hasErrors },
    { type: "DATE", value: dob }, { type: "DATE", value: regDate },
    { type: "MRN", value: mrn }, { type: "SSN", value: ssn }, { type: "PHONE", value: phone }, { type: "EMAIL", value: email },
    { type: "ADDRESS", value: address.street }, { type: "ZIPCODE", value: address.zip },
    { type: "IP", value: ip }, { type: "URL", value: url }, { type: "CREDIT_CARD", value: cc },
    { type: "VIN", value: vin }, { type: "LICENSE_PLATE", value: plate }, { type: "HOSPITAL", value: hospital }
  ], expectedNonPHI: [] };
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
  // Shuffle
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
  console.log("VULPES CELARE - FRESH 200-CASE AUTHENTIC ASSESSMENT");
  console.log("=".repeat(80) + "\n");

  // Load engine
  let VulpesCelare;
  try {
    const module = require("../dist/VulpesCelare.js");
    VulpesCelare = module.VulpesCelare;
    console.log(`Engine: ${VulpesCelare.NAME} v${VulpesCelare.VERSION}`);
  } catch (err) {
    console.error("Failed to load:", err.message);
    process.exit(1);
  }

  const engine = new VulpesCelare();
  console.log(`Filters: ${engine.getActiveFilters().length}\n`);

  // Generate fresh documents
  console.log("Generating 200 FRESH documents...");
  const documents = generateDocuments(200);
  
  const errDist = { low: 0, medium: 0, high: 0 };
  const typeDist = {};
  documents.forEach(d => {
    errDist[d.errorLevel]++;
    typeDist[d.type] = (typeDist[d.type] || 0) + 1;
  });
  
  console.log(`Generated ${documents.length} documents\n`);
  console.log("Error Distribution: Low=" + errDist.low + " Medium=" + errDist.medium + " High=" + errDist.high);
  console.log("Types: " + Object.entries(typeDist).map(([k,v]) => `${k}:${v}`).join(", ") + "\n");

  // Process ALL documents
  console.log("Processing all documents (no stopping)...\n");
  const startTime = Date.now();

  let tp = 0, fn = 0, tn = 0, fp = 0;
  const byLevel = { low: { tp: 0, fn: 0, total: 0 }, medium: { tp: 0, fn: 0, total: 0 }, high: { tp: 0, fn: 0, total: 0 } };
  const byType = {};
  const failures = [];
  const fpList = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const result = await engine.process(doc.content);
    const redacted = result.text;

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

    for (const nonPhi of doc.expectedNonPHI) {
      if (redacted.includes(nonPhi.value)) tn++;
      else {
        fp++;
        fpList.push({ docId: doc.id, type: nonPhi.type, value: nonPhi.value });
      }
    }
  }

  const totalTime = Date.now() - startTime;
  const totalPHI = tp + fn;
  const totalNonPHI = tn + fp;

  // Calculate metrics
  const sensitivity = (tp / totalPHI * 100);
  const specificity = totalNonPHI > 0 ? (tn / totalNonPHI * 100) : 100;
  const precision = tp / (tp + fp) * 100;
  const f1 = 2 * (precision * sensitivity) / (precision + sensitivity);

  let score = Math.round(sensitivity * 0.7 + specificity * 0.3);
  if (sensitivity < 95) score = Math.min(score, 70);
  if (sensitivity < 90) score = Math.min(score, 50);
  const grade = score >= 97 ? "A+" : score >= 93 ? "A" : score >= 90 ? "A-" : score >= 87 ? "B+" : score >= 83 ? "B" : score >= 80 ? "B-" : score >= 77 ? "C+" : score >= 73 ? "C" : score >= 70 ? "C-" : score >= 60 ? "D" : "F";

  // OUTPUT RESULTS
  console.log("=".repeat(80));
  console.log("RESULTS");
  console.log("=".repeat(80) + "\n");

  console.log("METRICS:");
  console.log(`  Documents:          ${documents.length}`);
  console.log(`  Total PHI Items:    ${totalPHI}`);
  console.log(`  Processing Time:    ${(totalTime/1000).toFixed(2)}s (${(totalTime/documents.length).toFixed(1)}ms/doc)\n`);

  console.log("CONFUSION MATRIX:");
  console.log(`  True Positives:     ${tp}`);
  console.log(`  False Negatives:    ${fn}`);
  console.log(`  True Negatives:     ${tn}`);
  console.log(`  False Positives:    ${fp}\n`);

  console.log("PRIMARY METRICS:");
  console.log(`  SENSITIVITY:        ${sensitivity.toFixed(2)}%`);
  console.log(`  SPECIFICITY:        ${specificity.toFixed(2)}%`);
  console.log(`  PRECISION:          ${precision.toFixed(2)}%`);
  console.log(`  F1 SCORE:           ${f1.toFixed(2)}\n`);

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
    console.log(`MISSED PHI SAMPLES (${failures.length} total, showing first 20):`);
    failures.slice(0, 20).forEach(f => {
      const tag = f.hasErrors ? " [ERRORS]" : "";
      console.log(`  Doc ${f.docId} (${f.docType}/${f.errorLevel}): ${f.phiType} = "${f.actual}"${tag}`);
    });
    console.log();
  }

  if (fpList.length > 0) {
    console.log(`FALSE POSITIVES (${fpList.length} total):`);
    fpList.slice(0, 10).forEach(f => console.log(`  Doc ${f.docId}: ${f.type} - "${f.value}"`));
    console.log();
  }

  // Save results
  const resultsDir = path.join(__dirname, "results");
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  const resultsFile = path.join(resultsDir, "fresh-200-assessment-" + Date.now() + ".json");
  
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    engine: { name: VulpesCelare.NAME, version: VulpesCelare.VERSION },
    config: { documents: documents.length, errorDistribution: errDist },
    metrics: { sensitivity, specificity, precision, f1, score, grade },
    confusion: { tp, fn, tn, fp },
    byErrorLevel: byLevel,
    byPHIType: byType,
    failures,
    falsePositives: fpList
  }, null, 2));

  console.log(`Results saved: ${resultsFile}`);
  console.log("=".repeat(80));
}

runAssessment().catch(console.error);
