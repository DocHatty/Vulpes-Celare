"use strict";
/**
 * SharedPatterns - Centralized Regex Pattern Repository
 *
 * Provides common patterns used across multiple filters to eliminate
 * duplication and ensure consistency.
 *
 * @module patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonPatterns = exports.PatternStrings = exports.COUNTRY_CODES = exports.PROFESSIONAL_TITLES = exports.HONORIFICS = exports.NAME_PARTICLES = exports.MONTHS_MILITARY = exports.MONTHS_ABBR = exports.MONTHS_FULL = exports.AU_STATE_ABBR = exports.CANADIAN_PROVINCE_ABBR = exports.US_STATE_ABBR = exports.STREET_SUFFIXES = void 0;
exports.createAlternation = createAlternation;
exports.createCaseInsensitiveAlternation = createCaseInsensitiveAlternation;
/**
 * Common street suffixes for address detection (US, UK, Canada, Australia)
 */
exports.STREET_SUFFIXES = [
    // US/General
    "street",
    "st",
    "avenue",
    "ave",
    "road",
    "rd",
    "drive",
    "dr",
    "boulevard",
    "blvd",
    "lane",
    "ln",
    "way",
    "court",
    "ct",
    "circle",
    "cir",
    "place",
    "pl",
    "terrace",
    "ter",
    "parkway",
    "pkwy",
    "highway",
    "hwy",
    "trail",
    "path",
    "alley",
    "plaza",
    // UK additions
    "close",
    "crescent",
    "cres",
    "gardens",
    "gdns",
    "grove",
    "gr",
    "mews",
    "rise",
    "row",
    "square",
    "sq",
    "walk",
    // Australian additions
    "parade",
    "pde",
    "esplanade",
    "esp",
    "promenade",
];
/**
 * US state abbreviations (2-letter codes)
 */
exports.US_STATE_ABBR = [
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
    "DC",
];
/**
 * Canadian province abbreviations
 */
exports.CANADIAN_PROVINCE_ABBR = [
    "AB",
    "BC",
    "MB",
    "NB",
    "NL",
    "NS",
    "NT",
    "NU",
    "ON",
    "PE",
    "QC",
    "SK",
    "YT",
];
/**
 * Australian state abbreviations
 */
exports.AU_STATE_ABBR = [
    "NSW",
    "VIC",
    "QLD",
    "WA",
    "SA",
    "TAS",
    "ACT",
    "NT",
];
/**
 * Full month names
 */
exports.MONTHS_FULL = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
/**
 * Abbreviated month names
 */
exports.MONTHS_ABBR = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Sept",
    "Oct",
    "Nov",
    "Dec",
];
/**
 * Three-letter month abbreviations (military format)
 */
exports.MONTHS_MILITARY = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
];
/**
 * Common name particles (prefixes/infixes in names like van Gogh, de Silva)
 */
exports.NAME_PARTICLES = [
    "van",
    "de",
    "von",
    "di",
    "da",
    "du",
    "del",
    "della",
    "la",
    "le",
    "el",
    "al",
    "bin",
    "ibn",
    "af",
    "av",
    "ten",
    "ter",
    "vander",
    "vanden",
];
/**
 * Common honorific titles
 */
exports.HONORIFICS = [
    "Mr",
    "Mrs",
    "Ms",
    "Miss",
    "Dr",
    "Prof",
    "Rev",
    "Fr",
    "Sr",
    "Jr",
    "Sir",
    "Dame",
    "Lord",
    "Lady",
];
/**
 * Medical/professional titles
 */
exports.PROFESSIONAL_TITLES = [
    "MD",
    "DO",
    "PhD",
    "NP",
    "PA",
    "RN",
    "LPN",
    "DDS",
    "DMD",
    "OD",
    "PharmD",
    "DPT",
    "DC",
    "DPM",
    "CRNA",
    "CNM",
    "CNS",
    "APRN",
];
/**
 * International country calling codes (commonly used)
 */
exports.COUNTRY_CODES = [
    "1", // US/Canada
    "44", // UK
    "33", // France
    "49", // Germany
    "61", // Australia
    "64", // New Zealand
    "91", // India
    "86", // China
    "81", // Japan
    "82", // South Korea
    "39", // Italy
    "34", // Spain
    "31", // Netherlands
    "32", // Belgium
    "41", // Switzerland
    "43", // Austria
    "46", // Sweden
    "47", // Norway
    "45", // Denmark
    "358", // Finland
    "48", // Poland
    "7", // Russia
    "55", // Brazil
    "52", // Mexico
];
/**
 * Helper to create a regex-safe alternation pattern from an array
 */
function createAlternation(items) {
    return items.join("|");
}
/**
 * Helper to create a case-insensitive alternation pattern
 */
function createCaseInsensitiveAlternation(items) {
    return items.map((item) => `(?:${item})`).join("|");
}
/**
 * Pre-built pattern strings for common use cases
 */
exports.PatternStrings = {
    /** All month names (full + abbreviated) */
    monthsAll: createAlternation([...exports.MONTHS_FULL, ...exports.MONTHS_ABBR]),
    /** Full month names only */
    monthsFull: createAlternation(exports.MONTHS_FULL),
    /** Abbreviated month names only */
    monthsAbbr: createAlternation(exports.MONTHS_ABBR),
    /** Military month abbreviations */
    monthsMilitary: createAlternation(exports.MONTHS_MILITARY),
    /** US states */
    usStates: createAlternation(exports.US_STATE_ABBR),
    /** Canadian provinces */
    canadianProvinces: createAlternation(exports.CANADIAN_PROVINCE_ABBR),
    /** Australian states */
    australianStates: createAlternation(exports.AU_STATE_ABBR),
    /** All US/CA/AU location abbreviations */
    allLocationAbbr: createAlternation([
        ...exports.US_STATE_ABBR,
        ...exports.CANADIAN_PROVINCE_ABBR,
        ...exports.AU_STATE_ABBR,
    ]),
    /** Street suffixes */
    streetSuffixes: createAlternation(exports.STREET_SUFFIXES),
    /** Name particles */
    nameParticles: createAlternation(exports.NAME_PARTICLES),
    /** Honorifics */
    honorifics: createAlternation(exports.HONORIFICS),
    /** Professional titles */
    professionalTitles: createAlternation(exports.PROFESSIONAL_TITLES),
};
/**
 * Pre-compiled common regex patterns
 */
exports.CommonPatterns = {
    /** US ZIP code (5 or 9 digits) */
    usZipCode: /\b\d{5}(?:-\d{4})?\b/g,
    /** Canadian postal code */
    canadianPostalCode: /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/gi,
    /** UK postcode */
    ukPostcode: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi,
    /** Australian postcode (4 digits) */
    australianPostcode: /\b\d{4}\b/g,
    /** US phone (10 digits) */
    usPhone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    /** Social Security Number */
    ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    /** Email address */
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}(?:\.[A-Z|a-z]{2,})?\b/gi,
    /** IPv4 address */
    ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    /** Credit card (common patterns) */
    creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    /** Date: MM/DD/YYYY or MM-DD-YYYY */
    dateUSFull: /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](19|20)\d{2}\b/g,
    /** Date: DD/MM/YYYY or DD-MM-YYYY (European) */
    dateEuropeanFull: /\b(1[3-9]|2[0-9]|3[01])[-/](0?[1-9]|1[0-2])[-/](19|20)\d{2}\b/g,
    /** Date: YYYY-MM-DD (ISO) */
    dateISO: /\b(19|20)\d{2}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g,
    /** Time: HH:MM or HH:MM:SS (12 or 24 hour) */
    time: /\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*(?:AM|PM|am|pm))?\b/g,
};
//# sourceMappingURL=SharedPatterns.js.map