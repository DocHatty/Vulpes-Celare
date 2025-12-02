/**
 * AddressFilterSpan - Street Address and Geographic Location Detection (Span-Based)
 *
 * Detects addresses in various formats (US, Canadian, UK, Australian) and returns Spans.
 * Also detects geographic subdivisions smaller than a state (cities, highways) which are PHI under HIPAA.
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import {
  SpanBasedFilter,
  FilterPriority,
} from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";

export class AddressFilterSpan extends SpanBasedFilter {
  /**
   * Common street suffixes (US/UK/Canada/Australia)
   */
  private static readonly STREET_SUFFIXES = [
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
  private static readonly STATE_ABBR = [
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
  private static readonly PROVINCE_ABBR = [
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
  private static readonly AU_STATE_ABBR = [
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
   * Context words that indicate a geographic location reference (for city detection)
   * These help identify when a capitalized word is a location rather than a name
   */
  private static readonly LOCATION_CONTEXT_WORDS = [
    "near",
    "in",
    "at",
    "from",
    "to",
    "around",
    "outside",
    "downtown",
    "north",
    "south",
    "east",
    "west",
    "suburb",
    "city",
    "town",
    "area",
    "region",
    "resident",
    "lives",
    "living",
    "moved",
    "relocated",
  ];

  /**
   * Facility/location suffixes that indicate following word may be a city
   * E.g., "Sunrise Senior Living, Arvada"
   */
  private static readonly FACILITY_SUFFIXES = [
    "Living",
    "Center",
    "Hospital",
    "Clinic",
    "Medical",
    "Health",
    "Care",
    "Rehabilitation",
    "Nursing",
    "Assisted",
    "Memory",
    "Hospice",
    "Facility",
    "Institute",
    "Associates",
  ];

  /**
   * Highway/road reference patterns - these are geographic identifiers under HIPAA
   */
  private static readonly HIGHWAY_PATTERNS = [
    // US Highways: Highway 101, Hwy 1, US-50, US 66
    /\b(?:Highway|Hwy|US[-\s]?)\s*\d{1,3}[A-Z]?\b/gi,
    // Interstate: I-95, Interstate 10, I95
    /\b(?:Interstate|I[-\s]?)\s*\d{1,3}\b/gi,
    // State Routes: State Route 1, SR-99, Route 66
    /\b(?:State\s+)?(?:Route|SR)[-\s]?\d{1,4}\b/gi,
    // County Roads: County Road 12, CR-5
    /\b(?:County\s+Road|CR)[-\s]?\d{1,4}\b/gi,
    // Farm/Ranch Roads (Texas): FM 1960, RM 620
    /\b(?:FM|RM)[-\s]?\d{1,4}\b/gi,
  ];

  /**
   * PERFORMANCE OPTIMIZATION: Pre-compiled address regex patterns (compiled once at class load)
   */
  private static readonly COMPILED_PATTERNS: RegExp[] = (() => {
    const suffixPattern = AddressFilterSpan.STREET_SUFFIXES.join("|");
    const usStatePattern = AddressFilterSpan.STATE_ABBR.join("|");
    const caProvincePattern = AddressFilterSpan.PROVINCE_ABBR.join("|");
    const auStatePattern = AddressFilterSpan.AU_STATE_ABBR.join("|");

    return [
      // ===== UNIVERSAL PATTERNS =====
      // PO Box patterns: "PO Box 123", "P.O. Box 456", "POB 789"
      /\b(?:P\.?O\.?\s*Box|POB)\s+\d+/gi,

      // Street address: "123 Main Street", "456 Oak Ave", "789 Women's Center Blvd"
      // Also handles apartment numbers: "555 Elm Street, Apt 8C"
      // Supports apostrophes in names (Women's, St. Mary's, etc.)
      new RegExp(
        `\\b\\d+\\s+[A-Z][a-z']+(?:\\s+[A-Z][a-z']+)*\\s+(?:${suffixPattern})(?:\\s*,?\\s*(?:Apt|Suite|Unit|#|Ste|Bldg|Building|Floor|Fl)?\\s*[A-Z0-9]+)?\\b`,
        "gi",
      ),

      // Street address with "Home Address:" or "Address:" prefix
      new RegExp(
        `(?:Home\\s+)?Address:\\s*(\\d+\\s+[A-Z][a-z']+(?:\\s+[A-Z][a-z']+)*\\s+(?:${suffixPattern}))`,
        "gi",
      ),

      // ===== US FORMATS =====
      // City, State ZIP: "Boston, MA 02101"
      new RegExp(
        `\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${usStatePattern})\\s+\\d{5}(?:-\\d{4})?\\b`,
        "g",
      ),

      // Multi-line US address block
      new RegExp(
        `\\b\\d+\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern})\\s*[\\r\\n]+\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${usStatePattern})\\s+\\d{5}(?:-\\d{4})?\\b`,
        "gi",
      ),

      // Full US address on one line: "789 Pine Street, Austin, TX 78701"
      new RegExp(
        `\\b\\d+\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern}),\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${usStatePattern})\\s+\\d{5}(?:-\\d{4})?\\b`,
        "gi",
      ),

      // ===== CANADIAN FORMATS =====
      // Canadian postal code: A1A 1A1 format
      // City, Province Postal: "Toronto, ON M5V 1A1"
      new RegExp(
        `\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${caProvincePattern})\\s+[A-Z]\\d[A-Z]\\s*\\d[A-Z]\\d\\b`,
        "gi",
      ),

      // Full Canadian address: "123 Maple Street, Toronto, ON M5V 1A1"
      new RegExp(
        `\\b\\d+\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern}),\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,\\s*(?:${caProvincePattern})\\s+[A-Z]\\d[A-Z]\\s*\\d[A-Z]\\d\\b`,
        "gi",
      ),

      // Standalone Canadian postal code
      /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/g,

      // ===== UK FORMATS =====
      // UK postcode: "SW1A 1AA", "EC1A 1BB", "M1 1AE", "B33 8TH"
      /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi,

      // UK address with postcode: "10 Downing Street, London SW1A 2AA"
      new RegExp(
        `\\b\\d+[A-Za-z]?\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern})(?:,\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)*,?\\s+[A-Z]{1,2}\\d[A-Z\\d]?\\s*\\d[A-Z]{2}\\b`,
        "gi",
      ),

      // UK house with name (e.g., "Rose Cottage, 12 High Street")
      /\b[A-Z][a-z]+\s+(?:Cottage|House|Lodge|Manor|Farm),?\s*\d*\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|Road|Lane|Avenue|Close|Drive|Way|Crescent)\b/gi,

      // ===== AUSTRALIAN FORMATS =====
      // Australian address: "42 Wallaby Way, Sydney NSW 2000"
      new RegExp(
        `\\b\\d+\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${suffixPattern}),\\s*[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*\\s+(?:${auStatePattern})\\s+\\d{4}\\b`,
        "gi",
      ),

      // City, State Postcode (Australian): "Sydney, NSW 2000"
      new RegExp(
        `\\b[A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*,?\\s+(?:${auStatePattern})\\s+\\d{4}\\b`,
        "gi",
      ),
    ];
  })();

  getType(): string {
    return "ADDRESS";
  }

  getPriority(): number {
    return FilterPriority.ADDRESS;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    // Apply all address patterns
    for (const pattern of AddressFilterSpan.COMPILED_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      let match;

      while ((match = pattern.exec(text)) !== null) {
        // For patterns with capture groups, use the captured portion only
        // This handles cases like "Home Address: 789 Pine Street" where we only want the address
        const hasCapture = match.length > 1 && match[1];

        if (hasCapture) {
          // Find the position of the captured group within the full match
          const captureText = match[1];
          const captureOffset = match[0].indexOf(captureText);
          const captureStart = match.index! + captureOffset;
          const captureEnd = captureStart + captureText.length;

          const span = new Span({
            text: captureText,
            originalValue: captureText,
            characterStart: captureStart,
            characterEnd: captureEnd,
            filterType: FilterType.ADDRESS,
            confidence: 0.85,
            priority: this.getPriority(),
            context: this.extractContext(text, captureStart, captureEnd),
            window: [],
            replacement: null,
            salt: null,
            pattern: "Address with prefix",
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
          });
          spans.push(span);
        } else {
          // No capture group - use full match
          const span = this.createSpanFromMatch(
            text,
            match,
            FilterType.ADDRESS,
            0.85, // Good confidence for addresses
          );
          spans.push(span);
        }
      }
    }

    // Detect highway/road references (geographic identifiers under HIPAA)
    this.detectHighways(text, spans);

    // Detect contextual city names (cities mentioned with location context words)
    this.detectContextualCities(text, spans);

    // Detect city names after facility names (e.g., "Sunrise Senior Living, Arvada")
    this.detectFacilityCities(text, spans);

    return spans;
  }

  /**
   * Detect highway and road references
   */
  private detectHighways(text: string, spans: Span[]): void {
    for (const pattern of AddressFilterSpan.HIGHWAY_PATTERNS) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const span = new Span({
          text: match[0],
          originalValue: match[0],
          characterStart: match.index,
          characterEnd: match.index + match[0].length,
          filterType: FilterType.ADDRESS,
          confidence: 0.9,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + match[0].length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Highway/Road reference",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }
  }

  /**
   * Detect city names when they appear in geographic context
   * E.g., "near Boulder", "in Aurora", "from Lakewood"
   */
  private detectContextualCities(text: string, spans: Span[]): void {
    // Build pattern for location context detection
    const contextWords = AddressFilterSpan.LOCATION_CONTEXT_WORDS.join("|");

    // Pattern: context word followed by capitalized word(s) that could be a city
    // E.g., "near Boulder", "in Aurora", "from Lakewood", "outside Denver"
    // Note: Case-sensitive to avoid matching acronyms like "CBT"
    const pattern = new RegExp(
      `\\b(${contextWords})\\s+([A-Z][a-z]{2,}(?:\\s+[A-Z][a-z]+)?)\\b`,
      "g", // NOT case-insensitive - city names are capitalized
    );

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const cityName = match[2];
      const cityStart = match.index + match[0].indexOf(cityName);

      // Skip if it looks like a person name (has multiple parts that look like first/last)
      // Cities are usually single words or compound names like "New York"
      if (this.looksLikePersonName(cityName, text, cityStart)) {
        continue;
      }

      // Skip acronyms (all caps or too short)
      if (cityName.length <= 3 || /^[A-Z]+$/.test(cityName)) {
        continue;
      }

      const span = new Span({
        text: cityName,
        originalValue: cityName,
        characterStart: cityStart,
        characterEnd: cityStart + cityName.length,
        filterType: FilterType.ADDRESS,
        confidence: 0.75, // Lower confidence since it's contextual
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          cityStart,
          cityStart + cityName.length,
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Contextual city name",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Detect city names that appear after facility names
   * E.g., "Sunrise Senior Living, Arvada" or "Mountain View Hospital, Boulder"
   */
  private detectFacilityCities(text: string, spans: Span[]): void {
    const facilitySuffixes = AddressFilterSpan.FACILITY_SUFFIXES.join("|");

    // Pattern: Facility name ending with suffix, comma, then city name
    // Captures the city name after the comma
    const pattern = new RegExp(
      `\\b(?:[A-Z][a-z]+\\s+)*(?:${facilitySuffixes}),\\s*([A-Z][a-z]+)\\b`,
      "g",
    );

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const cityName = match[1];
      const cityStart = match.index + match[0].lastIndexOf(cityName);

      // Skip if followed by state abbreviation (already handled by address patterns)
      const afterCity = text.substring(
        cityStart + cityName.length,
        cityStart + cityName.length + 10,
      );
      if (/^,?\s*[A-Z]{2}\s+\d{5}/.test(afterCity)) {
        continue; // This is part of a full address, skip
      }

      const span = new Span({
        text: cityName,
        originalValue: cityName,
        characterStart: cityStart,
        characterEnd: cityStart + cityName.length,
        filterType: FilterType.ADDRESS,
        confidence: 0.8,
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          cityStart,
          cityStart + cityName.length,
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "City after facility name",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Check if a potential city name looks more like a person name
   */
  private looksLikePersonName(
    name: string,
    text: string,
    position: number,
  ): boolean {
    // Check for name suffixes that indicate a person
    const nameSuffixes = ["Jr", "Sr", "II", "III", "MD", "PhD", "RN"];
    const afterText = text.substring(
      position + name.length,
      position + name.length + 10,
    );
    for (const suffix of nameSuffixes) {
      if (afterText.trim().startsWith(suffix)) {
        return true;
      }
    }

    // Check for patterns like "Dr. Boulder" or "Mr. Aurora" which would indicate a name
    const beforeText = text.substring(Math.max(0, position - 10), position);
    if (/\b(?:Dr|Mr|Mrs|Ms|Miss)\.?\s*$/i.test(beforeText)) {
      return true;
    }

    return false;
  }
}
