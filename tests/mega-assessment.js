/**
 * MEGA ASSESSMENT - 200+ Unique Medical Documents
 *
 * This generates completely unique, diverse medical documents
 * and runs them through the actual RedactionEngine to measure
 * true sensitivity and specificity.
 */

const path = require("path");
const fs = require("fs");

// Mock electron
process.env.NODE_ENV = "test";
global.require = (moduleName) => {
  if (moduleName === "electron") {
    return {
      ipcRenderer: {
        invoke: () => Promise.resolve({}),
        send: () => {},
        on: () => {},
      },
      app: {
        getPath: (type) =>
          type === "userData"
            ? path.join(__dirname, "..", "userData")
            : __dirname,
        getName: () => "VulpesTest",
        getVersion: () => "1.0.0",
      },
    };
  }
  return require(moduleName);
};

// ============================================================================
// NAME DATABASES - Large variety
// ============================================================================
const FIRST_NAMES = [
  "James",
  "Mary",
  "Robert",
  "Patricia",
  "John",
  "Jennifer",
  "Michael",
  "Linda",
  "David",
  "Elizabeth",
  "William",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Christopher",
  "Karen",
  "Charles",
  "Lisa",
  "Daniel",
  "Nancy",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
  "Donald",
  "Ashley",
  "Steven",
  "Kimberly",
  "Paul",
  "Emily",
  "Andrew",
  "Donna",
  "Joshua",
  "Michelle",
  "Kenneth",
  "Dorothy",
  "Kevin",
  "Carol",
  "Brian",
  "Amanda",
  "George",
  "Melissa",
  "Timothy",
  "Deborah",
  "Ronald",
  "Stephanie",
  "Edward",
  "Rebecca",
  "Jason",
  "Sharon",
  "Jeffrey",
  "Laura",
  "Ryan",
  "Cynthia",
  "Jacob",
  "Kathleen",
  "Gary",
  "Amy",
  "Nicholas",
  "Angela",
  "Eric",
  "Shirley",
  "Jonathan",
  "Anna",
  "Stephen",
  "Brenda",
  "Larry",
  "Pamela",
  "Justin",
  "Emma",
  "Scott",
  "Nicole",
  "Brandon",
  "Helen",
  "Benjamin",
  "Samantha",
  "Samuel",
  "Katherine",
  "Raymond",
  "Christine",
  "Gregory",
  "Debra",
  "Frank",
  "Rachel",
  "Alexander",
  "Carolyn",
  "Patrick",
  "Janet",
  "Raymond",
  "Catherine",
  "Jack",
  "Maria",
  "Dennis",
  "Heather",
  "Jerry",
  "Diane",
  "Tyler",
  "Ruth",
  "Aaron",
  "Julie",
  "Jose",
  "Olivia",
  "Adam",
  "Joyce",
  "Nathan",
  "Virginia",
  "Henry",
  "Victoria",
  "Douglas",
  "Kelly",
  "Zachary",
  "Lauren",
  "Peter",
  "Christina",
  "Kyle",
  "Joan",
  "Noah",
  "Evelyn",
  "Ethan",
  "Judith",
  "Jeremy",
  "Megan",
  "Walter",
  "Andrea",
  "Christian",
  "Cheryl",
  "Keith",
  "Hannah",
  "Roger",
  "Jacqueline",
  "Terry",
  "Martha",
  "Harry",
  "Gloria",
  "Ralph",
  "Teresa",
  "Sean",
  "Ann",
  "Jesse",
  "Sara",
  "Roy",
  "Madison",
  "Louis",
  "Frances",
  "Billy",
  "Kathryn",
  "Eugene",
  "Janice",
  "Philip",
  "Jean",
  "Bobby",
  "Abigail",
  "Johnny",
  "Alice",
  "Bradley",
  "Judy",
  "Bruce",
  "Sophia",
  "Gabriel",
  "Grace",
  "Joe",
  "Denise",
  "Logan",
  "Amber",
  "Albert",
  "Doris",
  "Willie",
  "Marilyn",
  "Alan",
  "Danielle",
  "Vincent",
  "Beverly",
  "Derek",
  "Isabella",
  "Dylan",
  "Theresa",
  "Carl",
  "Diana",
  "Arthur",
  "Natalie",
  "Lawrence",
  "Brittany",
  "Jordan",
  "Charlotte",
  "Russell",
  "Marie",
  "Yuki",
  "Ananya",
  "Wei",
  "Fatima",
  "Omar",
  "Priya",
  "Mohammed",
  "Aisha",
  "Hiroshi",
  "Mei",
  "Raj",
  "Lakshmi",
  "Chen",
  "Yong",
  "Tran",
  "Nguyen",
  "Kim",
  "Park",
  "Singh",
  "Patel",
  "Khan",
  "Ahmed",
  "Hassan",
  "Ali",
  "Ivan",
  "Natasha",
  "Dmitri",
  "Olga",
  "Vladimir",
  "Svetlana",
  "Andrei",
  "Elena",
  "Carlos",
  "Sofia",
  "Miguel",
  "Isabella",
  "Juan",
  "Valentina",
  "Pedro",
  "Camila",
  "Luis",
  "Lucia",
  "Diego",
  "Martina",
  "Alejandro",
  "Paula",
  "Fernando",
  "Andrea",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Gomez",
  "Phillips",
  "Evans",
  "Turner",
  "Diaz",
  "Parker",
  "Cruz",
  "Edwards",
  "Collins",
  "Reyes",
  "Stewart",
  "Morris",
  "Morales",
  "Murphy",
  "Cook",
  "Rogers",
  "Gutierrez",
  "Ortiz",
  "Morgan",
  "Cooper",
  "Peterson",
  "Bailey",
  "Reed",
  "Kelly",
  "Howard",
  "Ramos",
  "Kim",
  "Cox",
  "Ward",
  "Richardson",
  "Watson",
  "Brooks",
  "Chavez",
  "Wood",
  "James",
  "Bennett",
  "Gray",
  "Mendoza",
  "Ruiz",
  "Hughes",
  "Price",
  "Alvarez",
  "Castillo",
  "Sanders",
  "Patel",
  "Myers",
  "Long",
  "Ross",
  "Foster",
  "Jimenez",
  "Powell",
  "Jenkins",
  "Perry",
  "Russell",
  "Sullivan",
  "Bell",
  "Coleman",
  "Butler",
  "Henderson",
  "Barnes",
  "Gonzales",
  "Fisher",
  "Vasquez",
  "Simmons",
  "Stokes",
  "Simpson",
  "Burns",
  "Crawford",
  "Olson",
  "Palmer",
  "O'Brien",
  "O'Connor",
  "O'Malley",
  "McDonald",
  "McCarthy",
  "McMillan",
  "McKenzie",
  "McLaughlin",
  "Nakamura",
  "Tanaka",
  "Yamamoto",
  "Watanabe",
  "Suzuki",
  "Takahashi",
  "Ito",
  "Sato",
  "Chen",
  "Wang",
  "Li",
  "Zhang",
  "Liu",
  "Yang",
  "Huang",
  "Zhao",
  "Kumar",
  "Sharma",
  "Singh",
  "Gupta",
  "Reddy",
  "Agarwal",
  "Mehta",
  "Shah",
  "Johansson",
  "Eriksson",
  "Lindberg",
  "Bergman",
  "Larsson",
  "Andersson",
  "Nilsson",
  "Pettersson",
  "Mueller",
  "Schmidt",
  "Schneider",
  "Fischer",
  "Weber",
  "Meyer",
  "Wagner",
  "Becker",
  "Dubois",
  "Bernard",
  "Moreau",
  "Laurent",
  "Lefebvre",
  "Michel",
  "Fournier",
  "Girard",
];

const MIDDLE_NAMES = [
  "Marie",
  "Ann",
  "Lee",
  "Ray",
  "James",
  "Michael",
  "Elizabeth",
  "Rose",
  "Lynn",
  "Grace",
  "Mae",
  "Jean",
  "Louise",
  "May",
  "Jo",
  "Kay",
  "Sue",
  "Faye",
  "Dawn",
  "Hope",
  "Faith",
  "Joy",
  "Eve",
  "Claire",
  "Jane",
  "Ruth",
  "Anne",
  "Beth",
  "Leigh",
  "Rae",
  "Gail",
  "Dale",
  "Earl",
  "Dean",
  "Wayne",
  "Roy",
  "Gene",
  "Jay",
  "Don",
  "Lee",
  "Paul",
  "John",
  "David",
  "Alan",
  "Edward",
  "Thomas",
  "William",
  "Robert",
  "Allen",
  "Scott",
  "Patrick",
  "Joseph",
  "Anthony",
  "Daniel",
  "Andrew",
  "Ryan",
];

const TITLES = ["Dr.", "Mr.", "Mrs.", "Ms.", "Prof."];
const SUFFIXES = [
  "Jr.",
  "Sr.",
  "II",
  "III",
  "IV",
  "MD",
  "PhD",
  "DO",
  "DDS",
  "DPT",
  "RN",
  "NP",
  "PA",
];

const CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "Austin",
  "Jacksonville",
  "Fort Worth",
  "Columbus",
  "Charlotte",
  "Indianapolis",
  "Seattle",
  "Denver",
  "Boston",
  "Nashville",
  "Portland",
  "Las Vegas",
  "Detroit",
  "Memphis",
  "Baltimore",
  "Milwaukee",
  "Albuquerque",
  "Fresno",
  "Sacramento",
  "Atlanta",
  "Miami",
  "Cleveland",
  "Tulsa",
  "Oakland",
  "Minneapolis",
  "Wichita",
  "Arlington",
  "Tampa",
  "Aurora",
  "Anaheim",
  "Santa Ana",
  "Riverside",
  "Corpus Christi",
  "Lexington",
  "Pittsburgh",
  "Stockton",
  "Cincinnati",
  "St. Paul",
  "Greensboro",
  "Lincoln",
  "Anchorage",
  "Plano",
  "Orlando",
  "Irvine",
  "Newark",
  "Durham",
  "Chula Vista",
  "Toledo",
  "Fort Wayne",
  "St. Petersburg",
];

const STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const STREET_TYPES = [
  "Street",
  "Avenue",
  "Boulevard",
  "Drive",
  "Lane",
  "Road",
  "Way",
  "Court",
  "Place",
  "Circle",
];
const STREET_NAMES = [
  "Main",
  "Oak",
  "Maple",
  "Cedar",
  "Pine",
  "Elm",
  "Washington",
  "Park",
  "Lake",
  "Hill",
  "Forest",
  "River",
  "Spring",
  "Meadow",
  "Valley",
  "Summit",
  "Highland",
  "Sunset",
  "Sunrise",
  "Mountain",
];

const SPECIALTIES = [
  "Radiology",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Oncology",
  "Gastroenterology",
  "Pulmonology",
  "Nephrology",
  "Endocrinology",
  "Rheumatology",
  "Dermatology",
  "Ophthalmology",
  "Urology",
  "Psychiatry",
  "Obstetrics",
  "Pediatrics",
  "Geriatrics",
  "Emergency Medicine",
  "Internal Medicine",
  "Family Medicine",
  "Anesthesiology",
  "Pathology",
  "Surgery",
  "Plastic Surgery",
  "Vascular Surgery",
];

const DOCUMENT_TYPES = [
  "Progress Note",
  "Radiology Report",
  "Lab Report",
  "Consultation Note",
  "Discharge Summary",
  "Operative Report",
  "Pathology Report",
  "Emergency Note",
  "Admission Note",
  "H&P",
  "Procedure Note",
  "Nursing Assessment",
  "Physical Therapy Note",
  "Cardiology Report",
  "Neurology Note",
  "Oncology Note",
  "Dental Record",
  "Immunization Record",
  "Prescription",
  "Referral Letter",
];

const DIAGNOSES = [
  "Hypertension",
  "Type 2 Diabetes",
  "Chronic Kidney Disease",
  "COPD",
  "Coronary Artery Disease",
  "Atrial Fibrillation",
  "Heart Failure",
  "Stroke",
  "Pneumonia",
  "Bronchitis",
  "Asthma",
  "Emphysema",
  "Pulmonary Fibrosis",
  "Gastritis",
  "GERD",
  "Peptic Ulcer",
  "Diverticulitis",
  "Crohn's Disease",
  "Rheumatoid Arthritis",
  "Osteoarthritis",
  "Lupus",
  "Fibromyalgia",
  "Major Depression",
  "Generalized Anxiety",
  "Bipolar Disorder",
  "Schizophrenia",
  "Breast Cancer",
  "Lung Cancer",
  "Colon Cancer",
  "Prostate Cancer",
  "Appendicitis",
  "Cholecystitis",
  "Pancreatitis",
  "Hepatitis",
  "Fracture",
  "Sprain",
  "Herniated Disc",
  "Carpal Tunnel Syndrome",
];

const PROCEDURES = [
  "CT Scan",
  "MRI",
  "X-Ray",
  "Ultrasound",
  "PET Scan",
  "Mammogram",
  "Colonoscopy",
  "Endoscopy",
  "Bronchoscopy",
  "Cystoscopy",
  "Echocardiogram",
  "Stress Test",
  "Cardiac Catheterization",
  "Angioplasty",
  "Appendectomy",
  "Cholecystectomy",
  "Hernia Repair",
  "Knee Replacement",
  "Hip Replacement",
  "Spinal Fusion",
  "Laminectomy",
  "ACL Reconstruction",
  "Mastectomy",
  "Lumpectomy",
  "Thyroidectomy",
  "Hysterectomy",
  "CABG",
  "Valve Replacement",
  "Pacemaker Insertion",
  "ICD Placement",
];

// ============================================================================
// RANDOM GENERATORS
// ============================================================================
function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSSN() {
  const formats = [
    `${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(1000, 9999)}`,
    `***-**-${randomInt(1000, 9999)}`,
    `XXX-XX-${randomInt(1000, 9999)}`,
  ];
  return random(formats);
}

function generateMRN() {
  const prefixes = ["MRN", "PAT", "PT", "ACC", "ID", "REC", ""];
  const prefix = random(prefixes);
  const year = randomInt(2020, 2024);
  const num = randomInt(10000, 99999);
  if (prefix) {
    return `${prefix}-${year}-${num}`;
  }
  return `${num}${randomInt(100, 999)}`;
}

function generatePhone() {
  const formats = [
    `(${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
    `${randomInt(200, 999)}-${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
    `${randomInt(200, 999)}.${randomInt(200, 999)}.${randomInt(1000, 9999)}`,
    `+1 ${randomInt(200, 999)}-${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
  ];
  return random(formats);
}

function generateDate() {
  const month = randomInt(1, 12).toString().padStart(2, "0");
  const day = randomInt(1, 28).toString().padStart(2, "0");
  const year = randomInt(1940, 2024);
  const formats = [
    `${month}/${day}/${year}`,
    `${month}-${day}-${year}`,
    `${year}-${month}-${day}`,
    `${month}/${day}/${year.toString().slice(2)}`,
  ];
  return random(formats);
}

function generateDOB() {
  const month = randomInt(1, 12).toString().padStart(2, "0");
  const day = randomInt(1, 28).toString().padStart(2, "0");
  const year = randomInt(1940, 2005);
  return `${month}/${day}/${year}`;
}

function generateEmail(first, last) {
  const domains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "email.com",
    "hotmail.com",
    "aol.com",
  ];
  const formats = [
    `${first.toLowerCase()}.${last.toLowerCase()}@${random(domains)}`,
    `${first.toLowerCase()}${last.toLowerCase()}@${random(domains)}`,
    `${first.toLowerCase()[0]}${last.toLowerCase()}@${random(domains)}`,
    `${first.toLowerCase()}${randomInt(1, 99)}@${random(domains)}`,
  ];
  return random(formats);
}

function generateAddress() {
  const num = randomInt(100, 9999);
  const street = `${random(STREET_NAMES)} ${random(STREET_TYPES)}`;
  const city = random(CITIES);
  const state = random(STATES);
  const zip = randomInt(10000, 99999).toString();

  const hasApt = Math.random() > 0.7;
  const apt = hasApt ? `, Apt ${randomInt(1, 999)}` : "";

  return {
    street: `${num} ${street}${apt}`,
    city,
    state,
    zip,
    full: `${num} ${street}${apt}, ${city}, ${state} ${zip}`,
  };
}

function generateNPI() {
  return randomInt(1000000000, 9999999999).toString();
}

function generateDEA() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXY";
  return `${random(letters.split(""))}${random(letters.split(""))}${randomInt(1000000, 9999999)}`;
}

function generateName(format = "random") {
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
    with_suffix: `${first} ${last} ${suffix}`,
    all_caps: `${first.toUpperCase()} ${last.toUpperCase()}`,
    all_caps_last_first: `${last.toUpperCase()}, ${first.toUpperCase()}`,
    all_caps_full: `${last.toUpperCase()}, ${first.toUpperCase()} ${middle.toUpperCase()}`,
  };

  if (format === "random") {
    format = random(Object.keys(formats));
  }

  return {
    first,
    middle,
    last,
    formatted: formats[format] || formats["first_last"],
    format,
  };
}

// ============================================================================
// DOCUMENT GENERATORS
// ============================================================================

function generateRadiologyReport(id) {
  const patient = generateName("random");
  const provider = generateName("titled");
  const radiologist = generateName("first_last");
  const dob = generateDOB();
  const examDate = generateDate();
  const mrn = generateMRN();
  const phone = generatePhone();
  const procedure = random(
    PROCEDURES.filter((p) =>
      [
        "CT Scan",
        "MRI",
        "X-Ray",
        "Ultrasound",
        "PET Scan",
        "Mammogram",
      ].includes(p),
    ),
  );

  const content = `RADIOLOGY REPORT

PATIENT: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
EXAM DATE: ${examDate}

PROCEDURE: ${procedure}

ORDERING PHYSICIAN: ${provider.formatted}
Phone: ${phone}

CLINICAL HISTORY:
${random(DIAGNOSES)} - ${random(["rule out", "evaluate", "follow-up", "staging"])}

TECHNIQUE:
Standard imaging protocol was followed.

FINDINGS:
${random(["No acute abnormality.", "Findings consistent with clinical history.", "Mild degenerative changes noted.", "No significant interval change."])}

IMPRESSION:
${random(["Normal study.", "No acute findings.", "Stable examination.", "Recommend clinical correlation."])}

Interpreted by: ${radiologist.formatted}, MD
Report finalized: ${examDate}`;

  return {
    id,
    type: "Radiology Report",
    content,
    expectedPHI: [
      { type: "NAME", value: patient.formatted },
      { type: "NAME", value: provider.formatted },
      { type: "NAME", value: `${radiologist.formatted}, MD` },
      { type: "DATE", value: dob },
      { type: "DATE", value: examDate },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone },
    ],
    expectedNonPHI: [
      { type: "PROCEDURE", value: procedure },
      { type: "SECTION", value: "RADIOLOGY REPORT" },
      { type: "SECTION", value: "FINDINGS" },
    ],
  };
}

function generateLabReport(id) {
  const patient = generateName("last_first_middle");
  const orderingDoc = generateName("titled");
  const labDirector = generateName("first_last");
  const dob = generateDOB();
  const collectionDate = generateDate();
  const mrn = generateMRN();
  const accession = `ACC-${randomInt(2020, 2024)}-${randomInt(10000, 99999)}`;
  const npi = generateNPI();
  const phone = generatePhone();
  const ssn = generateSSN();

  const content = `LABORATORY REPORT

PATIENT INFORMATION
Name: ${patient.formatted}
Patient ID: ${mrn}
SSN: ${ssn}
Date of Birth: ${dob}

SPECIMEN INFORMATION
Accession #: ${accession}
Collection Date: ${collectionDate}

ORDERING PHYSICIAN
${orderingDoc.formatted}
NPI: ${npi}
Phone: ${phone}

TEST RESULTS
Complete Blood Count (CBC)
WBC: ${(Math.random() * 10 + 4).toFixed(1)} x10^9/L
RBC: ${(Math.random() * 2 + 4).toFixed(1)} x10^12/L
Hemoglobin: ${(Math.random() * 5 + 12).toFixed(1)} g/dL

LABORATORY DIRECTOR
${labDirector.formatted}, MD, PhD`;

  return {
    id,
    type: "Lab Report",
    content,
    expectedPHI: [
      { type: "NAME", value: patient.formatted },
      { type: "NAME", value: orderingDoc.formatted },
      { type: "NAME", value: `${labDirector.formatted}, MD, PhD` },
      { type: "DATE", value: dob },
      { type: "DATE", value: collectionDate },
      { type: "MRN", value: mrn },
      { type: "MRN", value: accession },
      { type: "NPI", value: npi },
      { type: "PHONE", value: phone },
      { type: "SSN", value: ssn },
    ],
    expectedNonPHI: [
      { type: "TEST", value: "Complete Blood Count" },
      { type: "SECTION", value: "LABORATORY REPORT" },
    ],
  };
}

function generateProgressNote(id) {
  const patient = generateName("first_middle_last");
  const patientRef = `${random(["Mr.", "Mrs.", "Ms."])} ${patient.last}`;
  const provider = generateName("titled");
  const dob = generateDOB();
  const visitDate = generateDate();
  const mrn = generateMRN();
  const address = generateAddress();
  const phone = generatePhone();
  const email = generateEmail(patient.first, patient.last);
  const diagnosis = random(DIAGNOSES);

  const content = `PROGRESS NOTE

Patient: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Date of Visit: ${visitDate}
Provider: ${provider.formatted}

CHIEF COMPLAINT
Patient presents with ${random(["chest pain", "shortness of breath", "abdominal pain", "headache", "back pain", "fatigue"])}.

HISTORY OF PRESENT ILLNESS
${patientRef} is a ${randomInt(25, 85)}-year-old ${random(["male", "female"])} with history of ${diagnosis}.
Patient lives at ${address.full}.
Contact: ${phone} | ${email}

ASSESSMENT
${diagnosis}

PLAN
1. Continue current medications
2. Follow up in ${randomInt(1, 4)} weeks

Electronically signed by ${provider.formatted.replace("Dr. ", "")} on ${visitDate}`;

  return {
    id,
    type: "Progress Note",
    content,
    expectedPHI: [
      { type: "NAME", value: patient.formatted },
      { type: "NAME", value: patientRef },
      { type: "NAME", value: provider.formatted },
      { type: "DATE", value: dob },
      { type: "DATE", value: visitDate },
      { type: "MRN", value: mrn },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "PHONE", value: phone },
      { type: "EMAIL", value: email },
    ],
    expectedNonPHI: [
      { type: "DIAGNOSIS", value: diagnosis },
      { type: "SECTION", value: "PROGRESS NOTE" },
    ],
  };
}

function generateEmergencyNote(id) {
  const patient = generateName("all_caps_last_first");
  const emergencyContact = generateName("first_last");
  const attending = generateName("titled");
  const resident = generateName("titled");
  const dob = generateDOB();
  const arrivalDate = generateDate();
  const mrn = `ED-${randomInt(20200101, 20241231)}-${randomInt(1000, 9999)}`;
  const ssn = generateSSN();
  const address = generateAddress();
  const phone = generatePhone();

  const content = `EMERGENCY DEPARTMENT NOTE

Patient: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
Arrival: ${arrivalDate}
SSN: ${ssn}

Emergency Contact: ${emergencyContact.formatted} (${random(["spouse", "parent", "sibling", "child"])})
Phone: ${phone}
Address: ${address.full}

Chief Complaint: ${random(["Severe chest pain", "Difficulty breathing", "Abdominal pain", "Trauma", "Syncope"])}

Attending Physician: ${attending.formatted}
Resident: ${resident.formatted}

PHYSICAL EXAM:
${random(["Alert and oriented", "Mildly distressed", "Stable condition"])}

DIAGNOSIS:
${random(DIAGNOSES)}

DISPOSITION:
${random(["Admitted", "Discharged home", "Transferred to ICU", "Observation"])}

Signed electronically by ${attending.formatted.replace("Dr. ", "")}, MD`;

  return {
    id,
    type: "Emergency Note",
    content,
    expectedPHI: [
      { type: "NAME", value: patient.formatted },
      { type: "NAME", value: emergencyContact.formatted },
      { type: "NAME", value: attending.formatted },
      { type: "NAME", value: resident.formatted },
      { type: "DATE", value: dob },
      { type: "DATE", value: arrivalDate },
      { type: "MRN", value: mrn },
      { type: "SSN", value: ssn },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "PHONE", value: phone },
    ],
    expectedNonPHI: [{ type: "SECTION", value: "EMERGENCY DEPARTMENT" }],
  };
}

function generateDischargeSummary(id) {
  const patient = generateName("last_first");
  const patientRef = `${random(["Mr.", "Mrs.", "Ms."])} ${patient.last}`;
  const attending = generateName("titled");
  const pcp = generateName("titled");
  const specialist = generateName("titled");
  const familyContact = generateName("first_last");
  const dob = generateDOB();
  const admitDate = generateDate();
  const dischargeDate = generateDate();
  const mrn = generateMRN();
  const phone1 = generatePhone();
  const phone2 = generatePhone();

  const content = `DISCHARGE SUMMARY

PATIENT: ${patient.formatted}
MRN: ${mrn}
ADMISSION DATE: ${admitDate}
DISCHARGE DATE: ${dischargeDate}
ATTENDING: ${attending.formatted}

PRINCIPAL DIAGNOSIS:
${random(DIAGNOSES)}

HOSPITAL COURSE:
${patientRef} was admitted with ${random(["acute symptoms", "exacerbation", "new onset", "worsening"])} of condition.
Patient responded well to treatment.

FOLLOW-UP:
PCP appointment with ${pcp.formatted} in 7 days
Specialist: ${specialist.formatted}, ${phone1}

EMERGENCY CONTACT:
${familyContact.formatted} (${random(["spouse", "child", "sibling"])}) - ${phone2}

Dictated by: ${attending.formatted.replace("Dr. ", "")}, MD`;

  return {
    id,
    type: "Discharge Summary",
    content,
    expectedPHI: [
      { type: "NAME", value: patient.formatted },
      { type: "NAME", value: patientRef },
      { type: "NAME", value: attending.formatted },
      { type: "NAME", value: pcp.formatted },
      { type: "NAME", value: specialist.formatted },
      { type: "NAME", value: familyContact.formatted },
      { type: "DATE", value: admitDate },
      { type: "DATE", value: dischargeDate },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone1 },
      { type: "PHONE", value: phone2 },
    ],
    expectedNonPHI: [{ type: "SECTION", value: "DISCHARGE SUMMARY" }],
  };
}

function generateConsultationNote(id) {
  const patient = generateName("all_caps_full");
  const patientRef = `${random(["Mr.", "Mrs.", "Ms."])} ${patient.last}`;
  const requesting = generateName("titled");
  const consulting = generateName("titled");
  const familyMember = generateName("first_last");
  const dob = generateDOB();
  const consultDate = generateDate();
  const mrn = generateMRN();
  const phone = generatePhone();
  const email = generateEmail(patient.first, patient.last);

  const specialty = random(SPECIALTIES);

  const content = `CONSULTATION NOTE - ${specialty.toUpperCase()}

RE: ${patient.formatted}
DOB: ${dob}
MRN: ${mrn}
DATE: ${consultDate}

Requesting Physician: ${requesting.formatted}, ${random(["Internal Medicine", "Family Medicine", "Primary Care"])}
Consulting Physician: ${consulting.formatted}, ${specialty}

HISTORY:
${patientRef} is a ${randomInt(30, 80)}-year-old ${random(["male", "female"])} with ${random(DIAGNOSES)}.

Patient's ${random(["spouse", "child", "sibling"])}, ${familyMember.formatted}, provides additional history.
Contact: ${phone} | ${email}

ASSESSMENT:
${random(DIAGNOSES)}

RECOMMENDATIONS:
1. ${random(["Start medication", "Continue current therapy", "Recommend procedure", "Order additional testing"])}
2. Follow up in ${randomInt(2, 8)} weeks

${consulting.formatted.replace("Dr. ", "")}, MD
Board Certified ${specialty}`;

  return {
    id,
    type: "Consultation Note",
    content,
    expectedPHI: [
      { type: "NAME", value: patient.formatted },
      { type: "NAME", value: patientRef },
      { type: "NAME", value: requesting.formatted },
      { type: "NAME", value: consulting.formatted },
      { type: "NAME", value: familyMember.formatted },
      { type: "DATE", value: dob },
      { type: "DATE", value: consultDate },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone },
      { type: "EMAIL", value: email },
    ],
    expectedNonPHI: [
      { type: "SPECIALTY", value: specialty },
      { type: "SECTION", value: "CONSULTATION NOTE" },
    ],
  };
}

function generateOperativeReport(id) {
  const patient = generateName("all_caps_last_first");
  const surgeon = generateName("titled");
  const assistant = generateName("titled");
  const anesthesiologist = generateName("titled");
  const dob = generateDOB();
  const surgeryDate = generateDate();
  const mrn = generateMRN();
  const procedure = random(
    PROCEDURES.filter(
      (p) =>
        ![
          "CT Scan",
          "MRI",
          "X-Ray",
          "Ultrasound",
          "PET Scan",
          "Mammogram",
        ].includes(p),
    ),
  );

  const content = `OPERATIVE REPORT

Patient Name: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Date of Surgery: ${surgeryDate}

Surgeon: ${surgeon.formatted}, FACS
First Assistant: ${assistant.formatted}
Anesthesiologist: ${anesthesiologist.formatted}

PREOPERATIVE DIAGNOSIS:
${random(DIAGNOSES)}

PROCEDURE PERFORMED:
${procedure}

FINDINGS:
${random(["As expected", "Uncomplicated", "Successful procedure"])}

COMPLICATIONS:
None

Signed: ${surgeon.formatted.replace("Dr. ", "")}, MD, FACS
Date: ${surgeryDate}`;

  return {
    id,
    type: "Operative Report",
    content,
    expectedPHI: [
      { type: "NAME", value: patient.formatted },
      { type: "NAME", value: surgeon.formatted },
      { type: "NAME", value: assistant.formatted },
      { type: "NAME", value: anesthesiologist.formatted },
      { type: "DATE", value: dob },
      { type: "DATE", value: surgeryDate },
      { type: "MRN", value: mrn },
    ],
    expectedNonPHI: [
      { type: "PROCEDURE", value: procedure },
      { type: "SECTION", value: "OPERATIVE REPORT" },
    ],
  };
}

function generatePrescription(id) {
  const patient = generateName("last_first_middle");
  const prescriber = generateName("titled");
  const dob = generateDOB();
  const rxDate = generateDate();
  const address = generateAddress();
  const phone = generatePhone();
  const dea = generateDEA();
  const npi = generateNPI();
  const license = `MD-${random(STATES)}-${randomInt(10000, 99999)}`;

  const medications = [
    "Lisinopril",
    "Metformin",
    "Atorvastatin",
    "Omeprazole",
    "Amlodipine",
    "Metoprolol",
    "Gabapentin",
    "Tramadol",
  ];

  const content = `PRESCRIPTION

Patient: ${patient.formatted}
DOB: ${dob}
Address: ${address.full}
Phone: ${phone}

Prescriber: ${prescriber.formatted}
DEA #: ${dea}
NPI: ${npi}
License #: ${license}

Rx: ${random(medications)} ${randomInt(5, 100)}mg
Sig: Take ${random(["one", "two"])} tablet${random(["", "s"])} by mouth ${random(["daily", "twice daily", "as needed"])}
Qty: ${randomInt(30, 90)}
Refills: ${randomInt(0, 5)}

Date Written: ${rxDate}`;

  return {
    id,
    type: "Prescription",
    content,
    expectedPHI: [
      { type: "NAME", value: patient.formatted },
      { type: "NAME", value: prescriber.formatted },
      { type: "DATE", value: dob },
      { type: "DATE", value: rxDate },
      { type: "ADDRESS", value: address.street },
      { type: "ZIPCODE", value: address.zip },
      { type: "PHONE", value: phone },
      { type: "DEA", value: dea },
      { type: "NPI", value: npi },
      { type: "LICENSE", value: license },
    ],
    expectedNonPHI: [{ type: "SECTION", value: "PRESCRIPTION" }],
  };
}

function generateNursingAssessment(id) {
  const patient = generateName("all_caps_full");
  const preferredName = random([
    "Bill",
    "Bob",
    "Jim",
    "Tom",
    "Jack",
    "Mike",
    "Sue",
    "Beth",
    "Kate",
    "Liz",
  ]);
  const primaryNurse = generateName("first_last");
  const chargeNurse = generateName("first_last");
  const emergencyContact1 = generateName("first_last");
  const emergencyContact2 = generateName("with_suffix");
  const pcp = generateName("titled");
  const dob = generateDOB();
  const admitDate = generateDate();
  const mrn = generateMRN();
  const phone1 = generatePhone();
  const phone2 = generatePhone();
  const phone3 = generatePhone();

  const content = `NURSING ADMISSION ASSESSMENT

Patient: ${patient.formatted}
Preferred Name: ${preferredName}
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

ALLERGIES: ${random(["Penicillin", "Sulfa", "NKDA", "Morphine", "Latex"])}

Assessment by: ${primaryNurse.formatted}, RN
Date/Time: ${admitDate}`;

  return {
    id,
    type: "Nursing Assessment",
    content,
    expectedPHI: [
      { type: "NAME", value: patient.formatted },
      { type: "NAME", value: preferredName },
      { type: "NAME", value: `${primaryNurse.formatted}, RN` },
      { type: "NAME", value: `${chargeNurse.formatted}, RN` },
      { type: "NAME", value: emergencyContact1.formatted },
      { type: "NAME", value: emergencyContact2.formatted },
      { type: "NAME", value: pcp.formatted },
      { type: "DATE", value: dob },
      { type: "DATE", value: admitDate },
      { type: "MRN", value: mrn },
      { type: "PHONE", value: phone1 },
      { type: "PHONE", value: phone2 },
      { type: "PHONE", value: phone3 },
    ],
    expectedNonPHI: [
      { type: "SECTION", value: "NURSING ADMISSION ASSESSMENT" },
    ],
  };
}

function generateTeamNote(id) {
  const patient = generateName("all_caps_last_first");
  const patientRef = `${random(["Mr.", "Mrs.", "Ms."])} ${patient.last}`;
  const team = [];
  for (let i = 0; i < randomInt(3, 6); i++) {
    team.push(generateName("titled"));
  }
  const family = [];
  for (let i = 0; i < randomInt(1, 3); i++) {
    family.push(generateName("first_last"));
  }
  const dob = generateDOB();
  const noteDate = generateDate();
  const mrn = generateMRN();
  const phone = generatePhone();
  const email = generateEmail(patient.first, patient.last);

  const roles = [
    "Oncology",
    "Radiation Oncology",
    "Surgery",
    "Nurse Navigator",
    "Social Worker",
    "Palliative Care",
  ];

  let teamSection = "TEAM MEMBERS PRESENT:\n";
  team.forEach((member, i) => {
    teamSection += `- ${member.formatted}, ${roles[i % roles.length]}\n`;
  });

  let familySection = "FAMILY PRESENT:\n";
  family.forEach((member) => {
    familySection += `${member.formatted} (${random(["spouse", "child", "parent", "sibling"])})\n`;
  });

  const content = `MULTIDISCIPLINARY TEAM NOTE

Patient: ${patient.formatted}
MRN: ${mrn}
DOB: ${dob}
Date: ${noteDate}

${teamSection}
${familySection}Contact: ${email}, ${phone}

DISCUSSION:
${patientRef} has ${random(DIAGNOSES)}.

PLAN:
1. Proceed with ${random(PROCEDURES)}
2. Follow up in ${randomInt(1, 4)} weeks

Notes by: ${team[0].formatted.replace("Dr. ", "")}, ${roles[0]}`;

  const expectedPHI = [
    { type: "NAME", value: patient.formatted },
    { type: "NAME", value: patientRef },
    { type: "DATE", value: dob },
    { type: "DATE", value: noteDate },
    { type: "MRN", value: mrn },
    { type: "PHONE", value: phone },
    { type: "EMAIL", value: email },
  ];

  team.forEach((member) => {
    expectedPHI.push({ type: "NAME", value: member.formatted });
  });

  family.forEach((member) => {
    expectedPHI.push({ type: "NAME", value: member.formatted });
  });

  return {
    id,
    type: "Team Note",
    content,
    expectedPHI,
    expectedNonPHI: [{ type: "SECTION", value: "MULTIDISCIPLINARY TEAM" }],
  };
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================
const GENERATORS = [
  generateRadiologyReport,
  generateLabReport,
  generateProgressNote,
  generateEmergencyNote,
  generateDischargeSummary,
  generateConsultationNote,
  generateOperativeReport,
  generatePrescription,
  generateNursingAssessment,
  generateTeamNote,
];

function generateDocuments(count) {
  const docs = [];
  for (let i = 1; i <= count; i++) {
    const generator = random(GENERATORS);
    docs.push(generator(i));
  }
  return docs;
}

// ============================================================================
// ASSESSMENT ENGINE
// ============================================================================
async function runAssessment() {
  console.log("=".repeat(80));
  console.log("MEGA ASSESSMENT - 200+ Unique Medical Documents");
  console.log("=".repeat(80));
  console.log("");

  // Generate documents
  console.log("Generating 220 unique medical documents...");
  const documents = generateDocuments(220);
  console.log(`Generated ${documents.length} documents`);
  console.log("");

  // Count by type
  const typeCounts = {};
  documents.forEach((doc) => {
    typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1;
  });
  console.log("Document distribution:");
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  console.log("");

  // Load the redaction engine
  console.log("Loading RedactionEngine...");
  let RedactionEngine, PolicyLoader;
  try {
    const distPath = path.join(__dirname, "..", "dist", "main", "features");
    process.chdir(path.join(__dirname, ".."));

    RedactionEngine = require(
      path.join(distPath, "RedactionEngine"),
    ).RedactionEngine;
    PolicyLoader = require(
      path.join(distPath, "redaction", "policies", "PolicyLoader"),
    ).PolicyLoader;
    console.log("RedactionEngine loaded successfully");
  } catch (err) {
    console.error("Failed to load RedactionEngine:", err.message);
    process.exit(1);
  }
  console.log("");

  // Initialize engine
  console.log("Initializing RedactionEngine...");
  await RedactionEngine.init();
  const policy = await PolicyLoader.loadPolicy("maximum");
  console.log("Engine initialized");
  console.log("");

  // Process each document
  console.log("Processing documents...");
  console.log("-".repeat(80));

  let totalExpectedPHI = 0;
  let totalRedactedPHI = 0;
  let totalExpectedNonPHI = 0;
  let totalPreservedNonPHI = 0;

  const failures = [];
  const falsePositives = [];

  for (const doc of documents) {
    const context = RedactionEngine.createContext();
    const redactedText = await RedactionEngine.redact(
      doc.content,
      policy,
      context,
    );

    // Check PHI redaction (sensitivity)
    let docRedacted = 0;
    let docMissed = [];
    for (const phi of doc.expectedPHI) {
      totalExpectedPHI++;
      // Check if the original value is still in the redacted text
      if (!redactedText.includes(phi.value)) {
        totalRedactedPHI++;
        docRedacted++;
      } else {
        docMissed.push(phi);
      }
    }

    // Check non-PHI preservation (specificity)
    let docPreserved = 0;
    let docFalsePos = [];
    for (const nonPhi of doc.expectedNonPHI) {
      totalExpectedNonPHI++;
      // Check if the non-PHI value is still in the redacted text
      if (redactedText.includes(nonPhi.value)) {
        totalPreservedNonPHI++;
        docPreserved++;
      } else {
        docFalsePos.push(nonPhi);
      }
    }

    // Log progress
    if (doc.id % 20 === 0) {
      console.log(`  Processed ${doc.id}/${documents.length} documents...`);
    }

    // Track failures
    if (docMissed.length > 0) {
      failures.push({
        docId: doc.id,
        type: doc.type,
        missed: docMissed.map((p) => `${p.type}: "${p.value}"`),
      });
    }

    if (docFalsePos.length > 0) {
      falsePositives.push({
        docId: doc.id,
        type: doc.type,
        falsePositives: docFalsePos.map((p) => `${p.type}: "${p.value}"`),
      });
    }
  }

  console.log("-".repeat(80));
  console.log("");

  // Calculate metrics
  const sensitivity =
    totalExpectedPHI > 0 ? (totalRedactedPHI / totalExpectedPHI) * 100 : 0;
  const specificity =
    totalExpectedNonPHI > 0
      ? (totalPreservedNonPHI / totalExpectedNonPHI) * 100
      : 0;

  // Calculate score (weighted: sensitivity more important)
  const score = Math.round(sensitivity * 0.7 + specificity * 0.3);
  const grade =
    score >= 97
      ? "A+"
      : score >= 93
        ? "A"
        : score >= 90
          ? "A-"
          : score >= 87
            ? "B+"
            : score >= 83
              ? "B"
              : score >= 80
                ? "B-"
                : score >= 77
                  ? "C+"
                  : score >= 73
                    ? "C"
                    : score >= 70
                      ? "C-"
                      : score >= 67
                        ? "D+"
                        : score >= 63
                          ? "D"
                          : score >= 60
                            ? "D-"
                            : "F";

  // Report
  console.log("=".repeat(80));
  console.log("ASSESSMENT RESULTS");
  console.log("=".repeat(80));
  console.log("");
  console.log(`Documents Assessed: ${documents.length}`);
  console.log("");
  console.log("SENSITIVITY (PHI Detection):");
  console.log(`  Expected PHI items:  ${totalExpectedPHI}`);
  console.log(`  Correctly redacted:  ${totalRedactedPHI}`);
  console.log(`  Missed (FN):         ${totalExpectedPHI - totalRedactedPHI}`);
  console.log(`  SENSITIVITY:         ${sensitivity.toFixed(1)}%`);
  console.log("");
  console.log("SPECIFICITY (Non-PHI Preservation):");
  console.log(`  Expected non-PHI:    ${totalExpectedNonPHI}`);
  console.log(`  Correctly preserved: ${totalPreservedNonPHI}`);
  console.log(
    `  False positives:     ${totalExpectedNonPHI - totalPreservedNonPHI}`,
  );
  console.log(`  SPECIFICITY:         ${specificity.toFixed(1)}%`);
  console.log("");
  console.log("-".repeat(80));
  console.log(`OVERALL SCORE: ${score}/100 (${grade})`);
  console.log("-".repeat(80));
  console.log("");

  // Show failures summary
  if (failures.length > 0) {
    console.log("MISSED PHI (False Negatives):");
    console.log("-".repeat(40));

    // Group by type
    const byType = {};
    failures.forEach((f) => {
      f.missed.forEach((m) => {
        const type = m.split(":")[0];
        byType[type] = (byType[type] || 0) + 1;
      });
    });

    Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count} missed`);
      });
    console.log("");

    // Show first 10 specific failures
    console.log("Sample failures (first 10):");
    failures.slice(0, 10).forEach((f) => {
      console.log(`  Doc ${f.docId} (${f.type}):`);
      f.missed.forEach((m) => console.log(`    - ${m}`));
    });
    console.log("");
  }

  if (falsePositives.length > 0) {
    console.log("FALSE POSITIVES:");
    console.log("-".repeat(40));
    falsePositives.slice(0, 5).forEach((f) => {
      console.log(`  Doc ${f.docId} (${f.type}):`);
      f.falsePositives.forEach((fp) => console.log(`    - ${fp}`));
    });
    console.log("");
  }

  // Save detailed results
  const resultsPath = path.join(__dirname, "results", "mega-assessment.json");
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        documentsAssessed: documents.length,
        sensitivity: sensitivity.toFixed(1),
        specificity: specificity.toFixed(1),
        score,
        grade,
        totalExpectedPHI,
        totalRedactedPHI,
        totalExpectedNonPHI,
        totalPreservedNonPHI,
        failures: failures.slice(0, 50),
        falsePositives: falsePositives.slice(0, 20),
      },
      null,
      2,
    ),
  );

  console.log(`Detailed results saved to: ${resultsPath}`);
  console.log("");
  console.log("=".repeat(80));
}

// Run
runAssessment().catch((err) => {
  console.error("Assessment failed:", err);
  process.exit(1);
});
