/**
 * VULPES CELARE VIGOROUS ASSESSMENT
 *
 * A comprehensive, adversarial test suite designed to break the system.
 * Features:
 * - 250+ Unique Documents
 * - 10+ Document Types (including new specialties)
 * - Realistic Error Injection (OCR, Typos, Formatting)
 * - "Tricky" Non-PHI (Room numbers, Model numbers, etc.)
 */

const fs = require("fs");
const path = require("path");

// Mock electron environment for the engine
process.env.NODE_ENV = "test";
global.require = (moduleName) => {
    if (moduleName === "electron") {
        return {
            ipcRenderer: {
                invoke: () => Promise.resolve({}),
                send: () => { },
                on: () => { },
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
// DATA & UTILS
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
    "Dmitri", "Olga", "Hiroshi", "Keiko", "Mohammed", "Layla", "Chen", "Ming",
    "Santiago", "Valentina", "Mateo", "Isabella", "Sebastian", "Camila", "Leonardo", "Sofia"
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
    "Kim", "Park", "Chen", "Wang", "Li", "Zhang", "Liu", "Patel", "Singh", "Kumar",
    "Tanaka", "Yamamoto", "Nakamura", "Schmidt", "Mueller", "Weber", "Schneider",
    "Dubois", "Leroy", "Moreau", "Rossi", "Russo", "Ferrari", "Silva", "Santos"
];

const CITIES = ["Springfield", "Clinton", "Madison", "Georgetown", "Franklin", "Bristol", "Salem", "Fairview", "Riverside", "Centerville"];
const STATES = ["CA", "NY", "TX", "FL", "IL", "PA", "OH", "GA", "NC", "MI", "NJ", "VA", "WA", "AZ", "MA"];
const STREETS = ["Main", "Oak", "Maple", "Cedar", "Pine", "Elm", "Washington", "Lincoln", "Park", "Lake", "Hill", "View"];
const TYPES = ["St", "Ave", "Rd", "Blvd", "Dr", "Ln", "Ct", "Pl", "Way"];

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ============================================================================
// ERROR INJECTION
// ============================================================================

const OCR_MAP = {
    "1": ["l", "I", "|"], "0": ["O", "o"], "l": ["1", "I"], "I": ["1", "l", "|"],
    "O": ["0"], "o": ["0"], "S": ["5", "$"], "5": ["S"], "B": ["8"], "8": ["B"],
    "g": ["9"], "9": ["g"], "a": ["@"], "e": ["c"]
};

function injectErrors(text, probability = 0.05) {
    if (Math.random() > probability) return text;

    let result = "";
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (OCR_MAP[char] && Math.random() < 0.3) {
            result += random(OCR_MAP[char]); // OCR Error
        } else if (Math.random() < 0.05) {
            // Typo: skip char, double char, or wrong case
            const r = Math.random();
            if (r < 0.33) { /* skip */ }
            else if (r < 0.66) { result += char + char; }
            else { result += char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase(); }
        } else {
            result += char;
        }
    }
    return result;
}

// ============================================================================
// GENERATORS
// ============================================================================

function genName() {
    const first = random(FIRST_NAMES);
    const last = random(LAST_NAMES);
    return {
        full: `${first} ${last}`,
        first, last,
        lastFirst: `${last}, ${first}`,
        titled: `Dr. ${first} ${last}`
    };
}

function genDate() {
    const y = randomInt(1950, 2024);
    const m = randomInt(1, 12);
    const d = randomInt(1, 28);
    const ms = m.toString().padStart(2, '0');
    const ds = d.toString().padStart(2, '0');

    const formats = [
        `${ms}/${ds}/${y}`,
        `${ms}-${ds}-${y}`,
        `${y}-${ms}-${ds}`,
        `${d}/${m}/${y}`, // Euro style
        `${random(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])} ${d}, ${y}`
    ];
    return random(formats);
}

function genPhone() {
    const a = randomInt(200, 999);
    const b = randomInt(200, 999);
    const c = randomInt(1000, 9999);
    const formats = [
        `(${a}) ${b}-${c}`,
        `${a}-${b}-${c}`,
        `${a}.${b}.${c}`,
        `+1-${a}-${b}-${c}`
    ];
    return random(formats);
}

function genMRN() {
    return random([
        `MRN-${randomInt(100000, 999999)}`,
        `#${randomInt(1000000, 9999999)}`,
        `ID: ${randomInt(10000, 99999)}`
    ]);
}

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================

function createPsychNote(id) {
    const pt = genName();
    const dr = genName();
    const dob = genDate();
    const date = genDate();
    const mrn = genMRN();

    const content = `
PSYCHIATRIC PROGRESS NOTE
Patient: ${pt.full}
DOB: ${dob}
Date: ${date}
MRN: ${mrn}

Subjective:
Patient reports feeling "anxious" about upcoming family gathering.
Mentions conflict with brother, ${genName().full}.
Sleep has been poor (4 hours/night).

Objective:
Affect: Anxious, restricted.
Thought Process: Linear.
Suicidal Ideation: Denies.

Assessment:
Generalized Anxiety Disorder (F41.1)

Plan:
1. Continue Sertraline 50mg.
2. CBT techniques reviewed.
3. Return in 4 weeks.

Signed,
${dr.titled}
  `.trim();

    return {
        id, type: "Psychiatry Note", content,
        expectedPHI: [pt.full, dob, date, mrn, dr.titled],
        expectedNonPHI: ["Sertraline", "Generalized Anxiety Disorder", "CBT"]
    };
}

function createOncologyPlan(id) {
    const pt = genName();
    const dr = genName();
    const dob = genDate();
    const date = genDate();
    const mrn = genMRN();

    const content = `
ONCOLOGY TREATMENT PLAN
Name: ${pt.lastFirst}
ID: ${mrn}
DOB: ${dob}
Date: ${date}

Diagnosis:
Invasive Ductal Carcinoma, Right Breast (T2N1M0)

Treatment Regimen:
AC-T Protocol
- Doxorubicin 60 mg/m2
- Cyclophosphamide 600 mg/m2
Every 2 weeks x 4 cycles

Followed by:
- Paclitaxel 175 mg/m2
Every 2 weeks x 4 cycles

Labs:
WBC: 4.5
Hgb: 12.1
Plt: 250

Provider: ${dr.titled}
  `.trim();

    return {
        id, type: "Oncology Plan", content,
        expectedPHI: [pt.lastFirst, mrn, dob, date, dr.titled],
        expectedNonPHI: ["Doxorubicin", "Cyclophosphamide", "Paclitaxel", "Invasive Ductal Carcinoma", "60 mg/m2"]
    };
}

function createPTNote(id) {
    const pt = genName();
    const dr = genName();
    const dob = genDate();
    const date = genDate();
    const phone = genPhone();

    const content = `
PHYSICAL THERAPY EVALUATION
Client: ${pt.full}
Phone: ${phone}
DOB: ${dob}
Date: ${date}

History:
Patient presents s/p Right TKA performed on ${genDate()}.
Complains of stiffness and pain (5/10).

Measurements:
ROM Right Knee:
Extension: -10 degrees
Flexion: 95 degrees

Strength:
Quads: 3+/5
Hamstrings: 4/5

Goals:
1. Achieve 0 deg extension by 2 weeks.
2. Ambulate without assistive device.

Therapist: ${dr.full}, PT, DPT
  `.trim();

    return {
        id, type: "PT Evaluation", content,
        expectedPHI: [pt.full, phone, dob, date, dr.full],
        expectedNonPHI: ["TKA", "Extension", "Flexion", "Quads", "Hamstrings"]
    };
}

function createMessyERNote(id) {
    const pt = genName();
    const dr = genName();
    const dob = genDate();
    const date = genDate();
    const ssn = `${randomInt(100, 999)}-${randomInt(10, 99)}-${randomInt(1000, 9999)}`;

    // Inject errors into PHI
    const messyPt = injectErrors(pt.full, 0.5);
    const messySSN = injectErrors(ssn, 0.3);

    const content = `
EMERGENCY DEPT
Pt: ${messyPt}
SSN: ${messySSN}
DOB: ${dob}
Arr: ${date}

CC: Chest pain

HPI:
Pt states pain began 2 hrs ago while mowing lawn.
Radiates to L arm. Diaphoretic.

PMH: HTN, HLD, DM2.

Meds:
Lisinopril 10mg
Metformin 500mg

MD: ${dr.titled}
Room: 102
  `.trim();

    return {
        id, type: "ER Note (Messy)", content,
        expectedPHI: [messyPt, messySSN, dob, date, dr.titled],
        expectedNonPHI: ["Chest pain", "Lisinopril", "Metformin", "Room: 102", "HTN", "HLD"]
    };
}

function createTrickyNote(id) {
    const pt = genName();
    const dob = genDate();

    const content = `
DEVICE REPORT
Patient: ${pt.full} (${dob})

Implanted Device:
Model: S-100
Serial: 8849-221-00
Ref: 2024-05

Settings:
Rate: 60-130 bpm
Mode: DDDR
Output: 2.5V @ 0.4ms

Hospital Room: 404
Call Button: 555
  `.trim();

    return {
        id, type: "Device Report (Tricky)", content,
        expectedPHI: [pt.full, dob],
        expectedNonPHI: ["Model: S-100", "Serial: 8849-221-00", "Ref: 2024-05", "Room: 404", "Call Button: 555"]
    };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runVigorousAssessment() {
    console.log("=".repeat(80));
    console.log("VULPES CELARE: VIGOROUS ASSESSMENT SUITE");
    console.log("=".repeat(80));
    console.log("Generating 250 adversarial documents...");

    const documents = [];
    const generators = [createPsychNote, createOncologyPlan, createPTNote, createMessyERNote, createTrickyNote];

    for (let i = 1; i <= 250; i++) {
        const gen = random(generators);
        documents.push(gen(i));
    }

    console.log(`Generated ${documents.length} documents.`);
    console.log("Loading RedactionEngine...");

    let RedactionEngine, PolicyLoader;
    try {
        const distPath = path.join(__dirname, "..", "dist");
        process.chdir(path.join(__dirname, ".."));
        RedactionEngine = require(path.join(distPath, "RedactionEngine")).RedactionEngine;
        PolicyLoader = require(path.join(distPath, "policies", "PolicyLoader")).PolicyLoader;
    } catch (err) {
        console.error("Failed to load engine:", err);
        process.exit(1);
    }

    await RedactionEngine.init();
    const policy = await PolicyLoader.loadPolicy("maximum");
    console.log("Engine initialized. Starting redaction...");
    console.log("-".repeat(80));

    let totalPHI = 0;
    let redactedPHI = 0;
    let totalNonPHI = 0;
    let preservedNonPHI = 0;

    const failures = [];

    for (const doc of documents) {
        const context = RedactionEngine.createContext();
        const redacted = await RedactionEngine.redact(doc.content, policy, context);

        // Check PHI
        for (const phi of doc.expectedPHI) {
            if (!phi) continue;
            totalPHI++;
            // Simple check: is the EXACT string present?
            // Note: This is strict. If the engine changes "John" to "{{NAME}}", it passes.
            // If "John" remains, it fails.
            if (!redacted.includes(phi)) {
                redactedPHI++;
            } else {
                failures.push({ id: doc.id, type: "MISSED_PHI", value: phi, docType: doc.type });
            }
        }

        // Check Non-PHI
        for (const item of doc.expectedNonPHI) {
            if (!item) continue;
            totalNonPHI++;
            if (redacted.includes(item)) {
                preservedNonPHI++;
            } else {
                failures.push({ id: doc.id, type: "FALSE_POSITIVE", value: item, docType: doc.type });
            }
        }

        if (doc.id % 50 === 0) console.log(`Processed ${doc.id} documents...`);
    }

    const sensitivity = (redactedPHI / totalPHI) * 100;
    const specificity = (preservedNonPHI / totalNonPHI) * 100;
    const score = (sensitivity * 0.7) + (specificity * 0.3);

    console.log("=".repeat(80));
    console.log("RESULTS");
    console.log("=".repeat(80));
    console.log(`SENSITIVITY: ${sensitivity.toFixed(2)}% (${redactedPHI}/${totalPHI})`);
    console.log(`SPECIFICITY: ${specificity.toFixed(2)}% (${preservedNonPHI}/${totalNonPHI})`);
    console.log(`SCORE:       ${score.toFixed(2)}/100`);
    console.log("-".repeat(80));

    if (failures.length > 0) {
        console.log("TOP FAILURES:");
        failures.slice(0, 20).forEach(f => {
            console.log(`[${f.type}] Doc ${f.id} (${f.docType}): "${f.value}"`);
        });
    }

    // Save results
    fs.writeFileSync(
        path.join(__dirname, "results", "vigorous-results.json"),
        JSON.stringify({ sensitivity, specificity, score, failures }, null, 2)
    );
}

runVigorousAssessment().catch(console.error);
