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
export declare const STREET_SUFFIXES: readonly ["street", "st", "avenue", "ave", "road", "rd", "drive", "dr", "boulevard", "blvd", "lane", "ln", "way", "court", "ct", "circle", "cir", "place", "pl", "terrace", "ter", "parkway", "pkwy", "highway", "hwy", "trail", "path", "alley", "plaza", "close", "crescent", "cres", "gardens", "gdns", "grove", "gr", "mews", "rise", "row", "square", "sq", "walk", "parade", "pde", "esplanade", "esp", "promenade"];
/**
 * US state abbreviations (2-letter codes)
 */
export declare const US_STATE_ABBR: readonly ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"];
/**
 * Canadian province abbreviations
 */
export declare const CANADIAN_PROVINCE_ABBR: readonly ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];
/**
 * Australian state abbreviations
 */
export declare const AU_STATE_ABBR: readonly ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
/**
 * Full month names
 */
export declare const MONTHS_FULL: readonly ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/**
 * Abbreviated month names
 */
export declare const MONTHS_ABBR: readonly ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Sept", "Oct", "Nov", "Dec"];
/**
 * Three-letter month abbreviations (military format)
 */
export declare const MONTHS_MILITARY: readonly ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
/**
 * Common name particles (prefixes/infixes in names like van Gogh, de Silva)
 */
export declare const NAME_PARTICLES: readonly ["van", "de", "von", "di", "da", "du", "del", "della", "la", "le", "el", "al", "bin", "ibn", "af", "av", "ten", "ter", "vander", "vanden"];
/**
 * Common honorific titles
 */
export declare const HONORIFICS: readonly ["Mr", "Mrs", "Ms", "Miss", "Dr", "Prof", "Rev", "Fr", "Sr", "Jr", "Sir", "Dame", "Lord", "Lady"];
/**
 * Medical/professional titles
 */
export declare const PROFESSIONAL_TITLES: readonly ["MD", "DO", "PhD", "NP", "PA", "RN", "LPN", "DDS", "DMD", "OD", "PharmD", "DPT", "DC", "DPM", "CRNA", "CNM", "CNS", "APRN"];
/**
 * International country calling codes (commonly used)
 */
export declare const COUNTRY_CODES: readonly ["1", "44", "33", "49", "61", "64", "91", "86", "81", "82", "39", "34", "31", "32", "41", "43", "46", "47", "45", "358", "48", "7", "55", "52"];
/**
 * Helper to create a regex-safe alternation pattern from an array
 */
export declare function createAlternation(items: readonly string[]): string;
/**
 * Helper to create a case-insensitive alternation pattern
 */
export declare function createCaseInsensitiveAlternation(items: readonly string[]): string;
/**
 * Pre-built pattern strings for common use cases
 */
export declare const PatternStrings: {
    /** All month names (full + abbreviated) */
    readonly monthsAll: string;
    /** Full month names only */
    readonly monthsFull: string;
    /** Abbreviated month names only */
    readonly monthsAbbr: string;
    /** Military month abbreviations */
    readonly monthsMilitary: string;
    /** US states */
    readonly usStates: string;
    /** Canadian provinces */
    readonly canadianProvinces: string;
    /** Australian states */
    readonly australianStates: string;
    /** All US/CA/AU location abbreviations */
    readonly allLocationAbbr: string;
    /** Street suffixes */
    readonly streetSuffixes: string;
    /** Name particles */
    readonly nameParticles: string;
    /** Honorifics */
    readonly honorifics: string;
    /** Professional titles */
    readonly professionalTitles: string;
};
/**
 * Pre-compiled common regex patterns
 */
export declare const CommonPatterns: {
    /** US ZIP code (5 or 9 digits) */
    readonly usZipCode: RegExp;
    /** Canadian postal code */
    readonly canadianPostalCode: RegExp;
    /** UK postcode */
    readonly ukPostcode: RegExp;
    /** Australian postcode (4 digits) */
    readonly australianPostcode: RegExp;
    /** US phone (10 digits) */
    readonly usPhone: RegExp;
    /** Social Security Number */
    readonly ssn: RegExp;
    /** Email address */
    readonly email: RegExp;
    /** IPv4 address */
    readonly ipv4: RegExp;
    /** Credit card (common patterns) */
    readonly creditCard: RegExp;
    /** Date: MM/DD/YYYY or MM-DD-YYYY */
    readonly dateUSFull: RegExp;
    /** Date: DD/MM/YYYY or DD-MM-YYYY (European) */
    readonly dateEuropeanFull: RegExp;
    /** Date: YYYY-MM-DD (ISO) */
    readonly dateISO: RegExp;
    /** Time: HH:MM or HH:MM:SS (12 or 24 hour) */
    readonly time: RegExp;
};
//# sourceMappingURL=SharedPatterns.d.ts.map