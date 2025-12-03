/**
 * MASTER TEST SUITE - Name Data
 * Comprehensive and diverse name database for realistic PHI generation
 */

// Extended first names - diverse cultural backgrounds
const FIRST_NAMES = [
  // Common American
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
  "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Christopher", "Karen", "Charles", "Lisa", "Daniel", "Nancy",
  "Matthew", "Betty", "Anthony", "Margaret", "Steven", "Kimberly", "Paul", "Emily",
  "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Dorothy", "Kevin", "Carol",
  "Brian", "Amanda", "George", "Melissa", "Timothy", "Deborah", "Ronald", "Stephanie",
  
  // Hispanic/Latino
  "Carlos", "Sofia", "Miguel", "Isabella", "Juan", "Valentina", "Pedro", "Camila",
  "Luis", "Lucia", "Diego", "Martina", "Alejandro", "Paula", "Fernando", "Andrea",
  "Ricardo", "Gabriela", "Javier", "Elena", "Santiago", "Mariana", "Andres", "Daniela",
  
  // Asian
  "Wei", "Yuki", "Chen", "Ming", "Hiroshi", "Keiko", "Takeshi", "Yumiko",
  "Raj", "Priya", "Sanjay", "Deepa", "Ravi", "Lakshmi", "Ananya", "Arjun",
  "Kim", "Park", "Jin", "Hana", "Tran", "Nguyen", "Minh", "Linh",
  
  // Middle Eastern
  "Mohammed", "Fatima", "Omar", "Aisha", "Ahmed", "Layla", "Hassan", "Sara",
  "Yusuf", "Maryam", "Ali", "Noor", "Ibrahim", "Zainab", "Khalid", "Huda",
  
  // Eastern European
  "Vladimir", "Natasha", "Dmitri", "Olga", "Ivan", "Svetlana", "Andrei", "Elena",
  "Sergei", "Irina", "Mikhail", "Tatiana", "Nikolai", "Anastasia", "Pavel", "Katya",
  
  // African American
  "DeShawn", "LaTonya", "Jamal", "Shaniqua", "Terrence", "Keisha", "Darnell", "Tamika",
  "Tyrone", "Latoya", "Marcus", "Aaliyah", "Jerome", "Destiny", "Malik", "Jasmine",
  
  // Unusual/Older
  "Bartholomew", "Penelope", "Gertrude", "Wilfred", "Clementine", "Reginald",
  "Cornelius", "Josephine", "Archibald", "Millicent", "Thaddeus", "Prudence",
  "Ebenezer", "Winifred", "Algernon", "Beatrice", "Mortimer", "Hortense"
];

// Extended last names - multi-ethnic
const LAST_NAMES = [
  // Common American
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
  "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  
  // Irish/Scottish
  "O'Brien", "O'Connor", "O'Sullivan", "O'Neill", "McDonald", "McCarthy", "McMillan",
  "McKenzie", "McLaughlin", "Fitzgerald", "Murphy", "Kelly", "Sullivan", "Walsh",
  
  // Jewish
  "Cohen", "Levy", "Goldberg", "Silverman", "Rosenberg", "Friedman", "Katz",
  "Ben-David", "Shapiro", "Weiss", "Rosen", "Klein", "Schwartz", "Kaplan",
  
  // Asian
  "Nakamura", "Tanaka", "Yamamoto", "Watanabe", "Suzuki", "Takahashi", "Ito", "Sato",
  "Chen", "Wang", "Li", "Zhang", "Liu", "Yang", "Huang", "Zhao",
  "Kumar", "Sharma", "Singh", "Gupta", "Reddy", "Agarwal", "Mehta", "Shah",
  "Kim", "Park", "Choi", "Lee", "Jung", "Kang", "Cho", "Yoon",
  "Nguyen", "Tran", "Le", "Pham", "Hoang", "Vo", "Dang", "Bui",
  "Patel", "Desai", "Joshi", "Rao", "Nair", "Menon", "Iyer", "Pillai",
  
  // European
  "Mueller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
  "Johansson", "Eriksson", "Lindberg", "Bergman", "Larsson", "Andersson", "Nilsson",
  "Dubois", "Bernard", "Moreau", "Laurent", "Lefebvre", "Michel", "Fournier", "Girard",
  "Kowalski", "Nowak", "Wisniewski", "Wojcik", "Kowalczyk", "Kaminski", "Lewandowski",
  
  // Middle Eastern
  "Al-Rashid", "Al-Farsi", "Al-Mahmoud", "Ibn Saud", "Haddad", "Khoury", "Mansour",
  "Abboud", "Nassar", "Khalil", "Saleh", "Hamid", "Youssef", "Habib",
  
  // Compound/Hyphenated
  "Van der Berg", "De la Cruz", "St. James", "DuPont", "La Fontaine", "Dela Rosa",
  "Worthington-Smythe", "Blackwood-Harrison", "Montgomery-Wells", "Ashford-Cross",
  "Johanssen-Schmidt", "Garcia-Lopez", "Kim-Park", "Chen-Wang", "Rivera-Martinez"
];

// Middle names
const MIDDLE_NAMES = [
  "Marie", "Ann", "Lee", "James", "Michael", "Elizabeth", "Rose", "Lynn",
  "Grace", "Jean", "Paul", "John", "David", "Edward", "Thomas", "William",
  "Alexander", "Catherine", "Margaret", "Victoria", "Louise", "Francis", "Joseph",
  "Robert", "Charles", "George", "Henry", "Richard", "Andrew", "Patrick",
  "Christopher", "Daniel", "Matthew", "Benjamin", "Nicholas", "Anthony", "Stephen",
  "Raymond", "Lawrence", "Douglas", "Philip", "Vincent", "Peter", "Arthur"
];

// Professional titles
const TITLES = ["Dr.", "Mr.", "Mrs.", "Ms.", "Prof.", "Rev.", "Hon.", "Sir", "Dame"];

// Professional suffixes (medical and non-medical)
const SUFFIXES_PATIENT = ["Jr.", "Sr.", "II", "III", "IV", "V", "Esq."];
const SUFFIXES_PROVIDER = [
  "MD", "DO", "PhD", "RN", "NP", "PA-C", "FACS", "FACP", "FACOG", "FACC",
  "FAAN", "FASN", "FCCP", "FAHA", "DNP", "MSN", "BSN", "DPT", "OTR/L",
  "LCSW", "LMFT", "PsyD", "PharmD", "DDS", "DMD", "DPM", "DC", "OD",
  "FNP-BC", "CRNA", "CNM", "ACNP-BC", "ANP-BC", "AGNP-C", "PMHNP-BC"
];

module.exports = {
  FIRST_NAMES,
  LAST_NAMES,
  MIDDLE_NAMES,
  TITLES,
  SUFFIXES_PATIENT,
  SUFFIXES_PROVIDER
};
