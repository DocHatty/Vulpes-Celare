/**
 * SharedPatterns - Centralized Regex Pattern Repository
 *
 * Provides common patterns used across multiple filters to eliminate
 * duplication and ensure consistency.
 *
 * @module patterns
 */

/**
 * Common street suffixes for address detection (US, UK, Canada, Australia)
 */
export const STREET_SUFFIXES = [
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
] as const;

/**
 * US state abbreviations (2-letter codes)
 */
export const US_STATE_ABBR = [
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
] as const;

/**
 * Canadian province abbreviations
 */
export const CANADIAN_PROVINCE_ABBR = [
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
] as const;

/**
 * Australian state abbreviations
 */
export const AU_STATE_ABBR = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
] as const;

/**
 * Full month names
 */
export const MONTHS_FULL = [
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
] as const;

/**
 * Abbreviated month names
 */
export const MONTHS_ABBR = [
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
] as const;

/**
 * Three-letter month abbreviations (military format)
 */
export const MONTHS_MILITARY = [
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
] as const;

/**
 * Common name particles (prefixes/infixes in names like van Gogh, de Silva)
 */
export const NAME_PARTICLES = [
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
] as const;

/**
 * Common honorific titles
 */
export const HONORIFICS = [
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
] as const;

/**
 * Medical/professional titles
 */
export const PROFESSIONAL_TITLES = [
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
] as const;

/**
 * International country calling codes (commonly used)
 */
export const COUNTRY_CODES = [
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
] as const;

/**
 * Helper to create a regex-safe alternation pattern from an array
 */
export function createAlternation(items: readonly string[]): string {
  return items.join("|");
}

/**
 * Helper to create a case-insensitive alternation pattern
 */
export function createCaseInsensitiveAlternation(
  items: readonly string[]
): string {
  return items.map((item) => `(?:${item})`).join("|");
}

/**
 * Pre-built pattern strings for common use cases
 */
export const PatternStrings = {
  /** All month names (full + abbreviated) */
  monthsAll: createAlternation([...MONTHS_FULL, ...MONTHS_ABBR]),

  /** Full month names only */
  monthsFull: createAlternation(MONTHS_FULL),

  /** Abbreviated month names only */
  monthsAbbr: createAlternation(MONTHS_ABBR),

  /** Military month abbreviations */
  monthsMilitary: createAlternation(MONTHS_MILITARY),

  /** US states */
  usStates: createAlternation(US_STATE_ABBR),

  /** Canadian provinces */
  canadianProvinces: createAlternation(CANADIAN_PROVINCE_ABBR),

  /** Australian states */
  australianStates: createAlternation(AU_STATE_ABBR),

  /** All US/CA/AU location abbreviations */
  allLocationAbbr: createAlternation([
    ...US_STATE_ABBR,
    ...CANADIAN_PROVINCE_ABBR,
    ...AU_STATE_ABBR,
  ]),

  /** Street suffixes */
  streetSuffixes: createAlternation(STREET_SUFFIXES),

  /** Name particles */
  nameParticles: createAlternation(NAME_PARTICLES),

  /** Honorifics */
  honorifics: createAlternation(HONORIFICS),

  /** Professional titles */
  professionalTitles: createAlternation(PROFESSIONAL_TITLES),
} as const;

/**
 * Pre-compiled common regex patterns
 */
export const CommonPatterns = {
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
  email:
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}(?:\.[A-Z|a-z]{2,})?\b/gi,

  /** IPv4 address */
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

  /** Credit card (common patterns) */
  creditCard:
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,

  /** Date: MM/DD/YYYY or MM-DD-YYYY */
  dateUSFull:
    /\b(0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])[-/](19|20)\d{2}\b/g,

  /** Date: DD/MM/YYYY or DD-MM-YYYY (European) */
  dateEuropeanFull:
    /\b(1[3-9]|2[0-9]|3[01])[-/](0?[1-9]|1[0-2])[-/](19|20)\d{2}\b/g,

  /** Date: YYYY-MM-DD (ISO) */
  dateISO: /\b(19|20)\d{2}[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g,

  /** Time: HH:MM or HH:MM:SS (12 or 24 hour) */
  time: /\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*(?:AM|PM|am|pm))?\b/g,
} as const;
