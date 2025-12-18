/**
 * Test Data Generators
 * Extracted from comprehensive-test.js
 */

// ============================================================================
// SEEDED RANDOM FOR REPRODUCIBILITY
// ============================================================================
const DEFAULT_SEED = 12345;
let seed = DEFAULT_SEED;

/**
 * Reset the seed to its initial value for reproducible tests.
 * Call this in beforeEach() to ensure test isolation.
 */
export function resetSeed(): void {
    seed = DEFAULT_SEED;
}

/**
 * Set a specific seed value.
 */
export function setSeed(newSeed: number): void {
    seed = newSeed;
}

export function seededRandom() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
}

export function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(seededRandom() * arr.length)];
}

export function shuffleArray<T>(arr: T[]): T[] {
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
    "Benjamin", "Samantha", "Samuel", "Katherine", "Raymond", "Christine", "Gregory",
    "Debra", "Frank", "Rachel", "Alexander", "Carolyn", "Patrick", "Janet", "Jack",
    "Maria", "Dennis", "Heather", "Jerry", "Tyler", "Aaron", "Jose", "Adam",
    "Nathan", "Henry", "Douglas", "Zachary", "Peter", "Kyle", "Noah", "Ethan", "Jeremy",
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
    "Sullivan", "Bell", "Coleman", "Butler", "Henderson", "Barnes", "Fisher",
    "Vasquez", "O'Brien", "O'Connor", "O'Malley", "McDonald", "McCarthy", "McMillan",
    "McKenzie",
    // International names
    "Nakamura", "Tanaka", "Yamamoto", "Watanabe", "Suzuki", "Kumar", "Sharma",
    "Singh", "Gupta", "Mueller", "Schmidt", "Schneider", "Fischer", "Weber"
];

const MIDDLE_NAMES = [
    "Marie", "Ann", "Lee", "Ray", "James", "Michael", "Elizabeth", "Rose",
    "Lynn", "Grace", "Mae", "Jean", "Louise", "William", "Thomas", ""
];

const TITLES = ["Dr.", "Mr.", "Mrs.", "Ms.", "Prof."];
const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "MD", "PhD", "DO", "RN", "NP", "PA"];

// ============================================================================
// PHI GENERATORS
// ============================================================================
export function generateName(format = "random") {
    const first = pickRandom(FIRST_NAMES);
    const last = pickRandom(LAST_NAMES);
    const middle = pickRandom(MIDDLE_NAMES);
    const title = pickRandom(TITLES);
    const suffix = pickRandom(SUFFIXES);

    const formats: Record<string, string> = {
        first_last: `${first} ${last}`,
        last_first: `${last}, ${first}`,
        last_first_middle: middle ? `${last}, ${first} ${middle}` : `${last}, ${first}`,
        full_middle: middle ? `${first} ${middle} ${last}` : `${first} ${last}`,
        titled: `${title} ${first} ${last}`,
        titled_suffix: `${title} ${first} ${last}, ${suffix}`,
        with_suffix: `${first} ${last}, ${suffix}`,
        titled_short: `${title} ${last}`,
    };

    if (format === "random") {
        format = pickRandom(Object.keys(formats));
    }
    return formats[format] || formats["first_last"];
}

export function generateDate() {
    const month = String(Math.floor(seededRandom() * 12) + 1).padStart(2, "0");
    const day = String(Math.floor(seededRandom() * 28) + 1).padStart(2, "0");
    const year = Math.floor(seededRandom() * 60) + 1950;
    return `${month}/${day}/${year}`;
}

export function generateSSN() {
    const p1 = String(Math.floor(seededRandom() * 900) + 100);
    const p2 = String(Math.floor(seededRandom() * 90) + 10);
    const p3 = String(Math.floor(seededRandom() * 9000) + 1000);
    return `${p1}-${p2}-${p3}`;
}

export function generatePhone(format = "random") {
    const area = String(Math.floor(seededRandom() * 800) + 200);
    const exch = String(Math.floor(seededRandom() * 900) + 100);
    const num = String(Math.floor(seededRandom() * 9000) + 1000);

    const formats: Record<string, string> = {
        standard: `(${area}) ${exch}-${num}`,
        dashes: `${area}-${exch}-${num}`,
        dots: `${area}.${exch}.${num}`,
        spaces: `${area} ${exch} ${num}`,
        international: `+1 ${area} ${exch} ${num}`,
    };

    if (format === "random") format = pickRandom(Object.keys(formats));
    return formats[format] || formats["standard"];
}

export function generateEmail() {
    const first = pickRandom(FIRST_NAMES).toLowerCase();
    const last = pickRandom(LAST_NAMES).toLowerCase();
    const domain = pickRandom([
        "gmail.com", "yahoo.com", "outlook.com", "hospital.org", "clinic.net"
    ]);
    return `${first}.${last}@${domain}`;
}

export function generateMRN() {
    return String(Math.floor(seededRandom() * 9000000) + 1000000);
}

export function generateAddress() {
    const num = Math.floor(seededRandom() * 9999) + 1;
    const street = pickRandom([
        "Main", "Oak", "Maple", "Cedar", "Pine", "Elm", "Washington",
        "Park", "Lake", "Hill"
    ]);
    const type = pickRandom(["St", "Ave", "Blvd", "Dr", "Ln", "Rd", "Way", "Ct"]);
    const city = pickRandom([
        "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
        "Seattle", "Denver", "Boston", "Miami", "Atlanta"
    ]);
    const state = pickRandom([
        "NY", "CA", "IL", "TX", "AZ", "WA", "CO", "MA", "FL", "GA"
    ]);
    const zip = String(Math.floor(seededRandom() * 90000) + 10000);
    return `${num} ${street} ${type}, ${city}, ${state} ${zip}`;
}

// ============================================================================
// ERROR INJECTION
// ============================================================================
const OCR_SUBSTITUTIONS: Record<string, string[]> = {
    0: ["O", "o"],
    1: ["l", "I", "|"],
    5: ["S", "s"],
    8: ["B"],
    O: ["0"],
    o: ["0"],
    l: ["1"],
    I: ["1"],
    S: ["5"],
    s: ["5"],
    B: ["8"],
    m: ["rn"],
    rn: ["m"],
    cl: ["d"],
    d: ["cl"],
};

export function applyErrors(text: string, level: string) {
    if (level === "none") return { text, hasErrors: false };

    const rates: Record<string, any> = {
        low: { ocr: 0.05, case: 0.08, typo: 0.03, space: 0.02 },
        medium: { ocr: 0.12, case: 0.15, typo: 0.08, space: 0.05 },
        high: { ocr: 0.2, case: 0.22, typo: 0.12, space: 0.08 },
        extreme: { ocr: 0.35, case: 0.3, typo: 0.2, space: 0.12 },
    };

    const rate = rates[level] || rates["medium"];
    let result = text;
    let hasErrors = false;

    // OCR errors
    if (seededRandom() < rate.ocr) {
        const chars = result.split("");
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            if (OCR_SUBSTITUTIONS[char] && seededRandom() < 0.3) {
                chars[i] = pickRandom(OCR_SUBSTITUTIONS[char]);
                hasErrors = true;
            }
        }
        result = chars.join("");
    }

    // Case errors
    if (seededRandom() < rate.case) {
        const caseType = seededRandom();
        if (caseType < 0.3) result = result.toUpperCase();
        else if (caseType < 0.6) result = result.toLowerCase();
        else {
            result = result
                .split("")
                .map((c) => (seededRandom() < 0.3 ? c.toUpperCase() : c.toLowerCase()))
                .join("");
        }
        hasErrors = true;
    }

    // Spacing errors
    if (seededRandom() < rate.space) {
        if (seededRandom() < 0.5 && result.includes(" ")) {
            const idx = result.indexOf(" ");
            result = result.slice(0, idx) + result.slice(idx + 1);
        } else {
            const idx = Math.floor(seededRandom() * result.length);
            result = result.slice(0, idx) + " " + result.slice(idx);
        }
        hasErrors = true;
    }

    return { text: result, hasErrors };
}
