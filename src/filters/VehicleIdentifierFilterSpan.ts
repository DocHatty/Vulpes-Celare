/**
 * VehicleIdentifierFilterSpan - Vehicle Identifier Detection (Span-Based)
 *
 * Detects and redacts vehicle identifiers per HIPAA requirement #12:
 * - Vehicle Identification Numbers (VINs): 17-character alphanumeric
 * - License plate numbers with context
 * - GPS coordinates (latitude/longitude)
 * - Workstation IDs (medical equipment identifiers)
 * - IPv6 addresses
 *
 * Production-grade with validation to avoid false positives
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import { RustScanKernel } from "../utils/RustScanKernel";

export class VehicleIdentifierFilterSpan extends SpanBasedFilter {
  getType(): string {
    return "VEHICLE";
  }

  getPriority(): number {
    return FilterPriority.VEHICLE;
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const accelerated = RustScanKernel.getDetections(context, text, "VEHICLE");
    if (accelerated) {
      return accelerated.map((d) => {
        return new Span({
          text: d.text,
          originalValue: d.text,
          characterStart: d.characterStart,
          characterEnd: d.characterEnd,
          filterType: FilterType.VEHICLE,
          confidence: d.confidence,
          priority: this.getPriority(),
          context: this.extractContext(text, d.characterStart, d.characterEnd),
          window: [],
          replacement: null,
          salt: null,
          pattern: d.pattern,
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
      });
    }

    const spans: Span[] = [];

    // Pattern 1: VIN with context (explicit label)
    this.detectLabeledVINs(text, spans);

    // Pattern 2: Standalone VINs (17 characters, strict validation)
    this.detectStandaloneVINs(text, spans);

    // Pattern 3: License Plate with explicit context
    this.detectLabeledLicensePlates(text, spans);

    // Pattern 4: Standalone license plates with common US formats
    this.detectStandaloneLicensePlates(text, spans);

    // Pattern 5: GPS Coordinates
    this.detectGPSCoordinates(text, spans);

    // Pattern 6: IPv6 Addresses
    this.detectIPv6Addresses(text, spans);

    // Pattern 7: Workstation IDs (explicit format)
    this.detectExplicitWorkstationIDs(text, spans);

    // Pattern 8: Workstation IDs with context
    this.detectContextualWorkstationIDs(text, spans);

    // Pattern 9: Vehicle Make/Model/Year combinations
    this.detectVehicleMakeModelYear(text, spans);

    // Pattern 10: Vehicle descriptions with context
    this.detectVehicleDescriptions(text, spans);

    return spans;
  }

  /**
   * Pattern 1: VIN with context (explicit label)
   */
  private detectLabeledVINs(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:VIN|Vehicle\s+Identification\s+Number|Vehicle\s+ID)[\s:#]*([A-HJ-NPR-Z0-9]{17})\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const vin = match[1];

      if (this.isValidVIN(vin)) {
        const fullMatch = match[0];
        const matchPos = match.index;
        const vinStart = matchPos + fullMatch.indexOf(vin);

        const span = new Span({
          text: vin,
          originalValue: vin,
          characterStart: vinStart,
          characterEnd: vinStart + vin.length,
          filterType: FilterType.VEHICLE,
          confidence: 0.98,
          priority: this.getPriority(),
          context: this.extractContext(text, vinStart, vinStart + vin.length),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Labeled VIN",
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
   * Pattern 2: Standalone VIN (17 characters, strict validation)
   */
  private detectStandaloneVINs(text: string, spans: Span[]): void {
    const pattern = /\b([A-HJ-NPR-Z0-9]{17})\b/g;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const vin = match[1];

      if (this.isValidVIN(vin)) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.VEHICLE,
          0.85,
        );
        span.pattern = "Standalone VIN";
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 3: License Plate with explicit context
   */
  private detectLabeledLicensePlates(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:license\s+plate|plate\s+number|registration|plate)[\s:#]*([A-Z]{2}[-\s]?[A-Z0-9]{5,7}|[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{3,4})\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const plate = match[1];

      if (this.isValidLicensePlate(plate)) {
        const fullMatch = match[0];
        const matchPos = match.index;
        const plateStart = matchPos + fullMatch.indexOf(plate);

        const span = new Span({
          text: plate,
          originalValue: plate,
          characterStart: plateStart,
          characterEnd: plateStart + plate.length,
          filterType: FilterType.VEHICLE,
          confidence: 0.95,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            plateStart,
            plateStart + plate.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Labeled license plate",
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
   * Pattern 4: Standalone license plates with common US formats
   */
  private detectStandaloneLicensePlates(text: string, spans: Span[]): void {
    // Expanded patterns to catch more plate formats
    const patterns = [
      // Original patterns
      /\b([A-Z]{2}[-\s][A-Z0-9]{5,7})\b/gi,
      /\b([A-Z]{2,3}[-\s][0-9]{3,4})\b/gi,
      /\b([0-9][A-Z]{2,3}[0-9]{3,4})\b/gi,
      // Short 6-char plates (HABG81, YNJA52) - 4 letters + 2 digits or 3+3
      /\b([A-Z]{4}[0-9]{2})\b/g,
      /\b([A-Z]{3}[0-9]{3})\b/g,
      /\b([A-Z]{2}[0-9]{4})\b/g,
      // UK style plates (K25 PBE, AB12 CDE)
      /\b([A-Z]{1,2}[0-9]{2}\s+[A-Z]{3})\b/gi,
      /\b([A-Z]{2}[0-9]{2}\s+[A-Z]{3})\b/gi,
      // Reverse format (123 ABC)
      /\b([0-9]{3}\s+[A-Z]{3})\b/gi,
      // Mixed short formats
      /\b([A-Z][0-9]{2}\s+[A-Z]{3})\b/gi,
      // Continuous 6-7 char alphanumeric (letters first)
      /\b([A-Z]{2,4}[0-9]{2,4})\b/g,
      /\b([0-9]{2,4}[A-Z]{2,4})\b/g,
      // En-dash or hyphen separated alphanumerics (ABC–1234, AB-12-XYZ)
      /\b([A-Z0-9]{2,4}[\u2013-][A-Z0-9]{2,4})\b/gi,
      // Three-way split plates with separators or dots (AB-123-CD, A·123·BC)
      /\b([A-Z0-9]{1,3}[.\u2013-\s][A-Z0-9]{1,3}[.\u2013-\s][A-Z0-9]{1,4})\b/gi,
    ];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const plate = match[1];

        // Skip if this looks like a vital sign reading (BP, HR, RR, etc.)
        if (this.isVitalSignContext(text, match.index, plate)) {
          continue;
        }

        if (this.isValidLicensePlate(plate)) {
          const span = this.createSpanFromMatch(
            text,
            match,
            FilterType.VEHICLE,
            0.75,
          );
          span.pattern = "Standalone license plate";
          spans.push(span);
        }
      }
    }
  }

  /**
   * Check if the match appears to be a vital sign reading (e.g., BP 150, HR 98)
   * These should NOT be detected as license plates
   */
  private isVitalSignContext(
    text: string,
    matchIndex: number,
    matchedText: string,
  ): boolean {
    // Common vital sign abbreviations
    const vitalSignPrefixes =
      /\b(BP|HR|RR|PR|Temp|SpO2|O2|Sat|SBP|DBP|MAP)\s*$/i;

    // Check the text immediately before the match
    const prefix = text.substring(Math.max(0, matchIndex - 20), matchIndex);
    if (vitalSignPrefixes.test(prefix)) {
      return true;
    }

    // Check if the matched text itself starts with a vital sign abbreviation
    const vitalStarts = /^(BP|HR|RR|PR)\s/i;
    if (vitalStarts.test(matchedText)) {
      return true;
    }

    // Check for vital sign context patterns (e.g., "Blood Pressure: 150/90")
    const vitalContextPatterns = [
      /blood\s+pressure/i,
      /heart\s+rate/i,
      /respiratory\s+rate/i,
      /pulse\s+rate/i,
      /vital\s+signs/i,
      /mmHg/i,
      /bpm/i,
    ];

    const surroundingText = text.substring(
      Math.max(0, matchIndex - 50),
      Math.min(text.length, matchIndex + matchedText.length + 20),
    );

    for (const pattern of vitalContextPatterns) {
      if (pattern.test(surroundingText)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Pattern 5: GPS Coordinates (Decimal Degrees)
   */
  private detectGPSCoordinates(text: string, spans: Span[]): void {
    const pattern =
      /\b(-?\d{1,3}\.\d{4,10})\s*°?\s*[NS]?,?\s*(-?\d{1,3}\.\d{4,10})\s*°?\s*[EW]?\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const coords = match[0];

      if (this.isValidGPSCoordinate(coords)) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.VEHICLE,
          0.92,
        );
        span.pattern = "GPS coordinates";
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 6: IPv6 Addresses (full and compressed)
   */
  private detectIPv6Addresses(text: string, spans: Span[]): void {
    // Pattern 6a: Full IPv6
    const fullPattern = /\b((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4})\b/g;
    fullPattern.lastIndex = 0;
    let match;

    while ((match = fullPattern.exec(text)) !== null) {
      const ipv6 = match[1];

      if (this.isValidIPv6(ipv6)) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.VEHICLE,
          0.9,
        );
        span.pattern = "IPv6 address";
        spans.push(span);
      }
    }

    // Pattern 6b: Compressed IPv6
    const compressedPattern =
      /\b((?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:))\b/g;
    compressedPattern.lastIndex = 0;

    while ((match = compressedPattern.exec(text)) !== null) {
      const ipv6 = match[1];

      if (this.isValidIPv6(ipv6)) {
        const span = this.createSpanFromMatch(
          text,
          match,
          FilterType.VEHICLE,
          0.88,
        );
        span.pattern = "IPv6 address (compressed)";
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 7: Workstation IDs (explicit format)
   */
  private detectExplicitWorkstationIDs(text: string, spans: Span[]): void {
    const pattern =
      /\b([A-Z]{2,8}-[A-Z]{2,8}-(?:STATION|TERMINAL|WS|WORKSTATION|COMPUTER)-[A-Z0-9]{1,4})\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const span = this.createSpanFromMatch(
        text,
        match,
        FilterType.VEHICLE,
        0.93,
      );
      span.pattern = "Workstation ID (explicit)";
      spans.push(span);
    }
  }

  /**
   * Pattern 8: Workstation IDs with context
   */
  private detectContextualWorkstationIDs(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:Workstation|Terminal|Station|Computer)\s+(?:ID|Number|#)[\s:#]*([A-Z0-9]{2,}-[A-Z0-9]{2,}-[A-Z0-9]{2,})\b/gi;
    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const workstationID = match[1];
      const matchPos = match.index;
      const idStart = matchPos + fullMatch.indexOf(workstationID);

      const span = new Span({
        text: workstationID,
        originalValue: workstationID,
        characterStart: idStart,
        characterEnd: idStart + workstationID.length,
        filterType: FilterType.VEHICLE,
        confidence: 0.95,
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          idStart,
          idStart + workstationID.length,
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Workstation ID with context",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Common vehicle makes for pattern matching
   */
  private static readonly VEHICLE_MAKES: string[] = [
    // American
    "FORD",
    "CHEVROLET",
    "CHEVY",
    "GMC",
    "DODGE",
    "RAM",
    "JEEP",
    "CHRYSLER",
    "CADILLAC",
    "BUICK",
    "LINCOLN",
    "TESLA",
    "RIVIAN",
    // Japanese
    "TOYOTA",
    "HONDA",
    "NISSAN",
    "MAZDA",
    "SUBARU",
    "MITSUBISHI",
    "LEXUS",
    "ACURA",
    "INFINITI",
    "SUZUKI",
    "ISUZU",
    // Korean
    "HYUNDAI",
    "KIA",
    "GENESIS",
    // German
    "BMW",
    "MERCEDES",
    "MERCEDES-BENZ",
    "VOLKSWAGEN",
    "VW",
    "AUDI",
    "PORSCHE",
    "MINI",
    // European
    "VOLVO",
    "SAAB",
    "FIAT",
    "ALFA",
    "FERRARI",
    "LAMBORGHINI",
    "MASERATI",
    "JAGUAR",
    "LAND ROVER",
    "RANGE ROVER",
    "BENTLEY",
    "ROLLS-ROYCE",
    "ASTON MARTIN",
    // Other
    "HARLEY",
    "HARLEY-DAVIDSON",
    "INDIAN",
    "KAWASAKI",
    "YAMAHA",
    "DUCATI",
  ];

  /**
   * Common vehicle model names (partial list for validation)
   */
  private static readonly COMMON_MODELS: string[] = [
    // Toyota
    "CAMRY",
    "COROLLA",
    "RAV4",
    "HIGHLANDER",
    "TACOMA",
    "TUNDRA",
    "PRIUS",
    "4RUNNER",
    // Honda
    "CIVIC",
    "ACCORD",
    "CR-V",
    "PILOT",
    "ODYSSEY",
    "FIT",
    "HR-V",
    // Ford
    "F-150",
    "F150",
    "F-250",
    "F250",
    "MUSTANG",
    "EXPLORER",
    "ESCAPE",
    "BRONCO",
    "RANGER",
    // Chevrolet
    "SILVERADO",
    "CAMARO",
    "CORVETTE",
    "MALIBU",
    "EQUINOX",
    "TAHOE",
    "SUBURBAN",
    // Others common
    "ALTIMA",
    "MAXIMA",
    "SENTRA",
    "ROGUE",
    "PATHFINDER",
    "ELANTRA",
    "SONATA",
    "TUCSON",
    "SANTA FE",
    "OPTIMA",
    "SORENTO",
    "SPORTAGE",
    "TELLURIDE",
    "3 SERIES",
    "5 SERIES",
    "X3",
    "X5",
    "C-CLASS",
    "E-CLASS",
    "S-CLASS",
    "GLC",
    "GLE",
    "A4",
    "A6",
    "Q5",
    "Q7",
    "OUTBACK",
    "FORESTER",
    "IMPREZA",
    "CROSSTREK",
    "MODEL S",
    "MODEL 3",
    "MODEL X",
    "MODEL Y",
    "WRANGLER",
    "GRAND CHEROKEE",
    "CHEROKEE",
    "COMPASS",
    "CHARGER",
    "CHALLENGER",
    "DURANGO",
  ];

  /**
   * Pattern 9: Vehicle Make/Model/Year combinations
   * Detects: "2019 Toyota Camry", "Toyota Camry 2019", "19 Ford F-150"
   */
  private detectVehicleMakeModelYear(text: string, spans: Span[]): void {
    const makesPattern = VehicleIdentifierFilterSpan.VEHICLE_MAKES.join("|");

    // Pattern A: Year + Make + Model (e.g., "2019 Toyota Camry")
    const patternA = new RegExp(
      `\\b((?:19|20)\\d{2}|'\\d{2})\\s+(${makesPattern})\\s+([A-Z][A-Z0-9\\-]{1,15}(?:\\s+[A-Z0-9\\-]{1,10})?)\\b`,
      "gi",
    );

    patternA.lastIndex = 0;
    let match;

    while ((match = patternA.exec(text)) !== null) {
      const fullMatch = match[0];

      // Validate this looks like a vehicle description
      if (this.isValidVehicleDescription(fullMatch)) {
        const span = new Span({
          text: fullMatch,
          originalValue: fullMatch,
          characterStart: match.index,
          characterEnd: match.index + fullMatch.length,
          filterType: FilterType.VEHICLE,
          confidence: 0.92,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + fullMatch.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Vehicle Make/Model/Year",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }

    // Pattern B: Make + Model + Year (e.g., "Toyota Camry 2019")
    const patternB = new RegExp(
      `\\b(${makesPattern})\\s+([A-Z][A-Z0-9\\-]{1,15}(?:\\s+[A-Z0-9\\-]{1,10})?)\\s+((?:19|20)\\d{2}|'\\d{2})\\b`,
      "gi",
    );

    patternB.lastIndex = 0;

    while ((match = patternB.exec(text)) !== null) {
      const fullMatch = match[0];

      if (this.isValidVehicleDescription(fullMatch)) {
        const span = new Span({
          text: fullMatch,
          originalValue: fullMatch,
          characterStart: match.index,
          characterEnd: match.index + fullMatch.length,
          filterType: FilterType.VEHICLE,
          confidence: 0.91,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + fullMatch.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Vehicle Make/Model/Year",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }

    // Pattern C: Make + Model (no year, but with vehicle context)
    // Only match if there's vehicle context nearby
    const patternC = new RegExp(
      `\\b(${makesPattern})\\s+([A-Z][A-Z0-9\\-]{2,15})\\b`,
      "gi",
    );

    patternC.lastIndex = 0;

    while ((match = patternC.exec(text)) !== null) {
      const fullMatch = match[0];
      const make = match[1];
      const model = match[2];

      // Check if model is a known model or if there's vehicle context
      const isKnownModel = VehicleIdentifierFilterSpan.COMMON_MODELS.some(
        (m) =>
          m.toUpperCase() === model.toUpperCase() ||
          m.toUpperCase().replace(/[- ]/g, "") ===
            model.toUpperCase().replace(/[- ]/g, ""),
      );

      const hasVehicleContext = this.hasVehicleContext(
        text,
        match.index,
        fullMatch.length,
      );

      if (isKnownModel || hasVehicleContext) {
        const span = new Span({
          text: fullMatch,
          originalValue: fullMatch,
          characterStart: match.index,
          characterEnd: match.index + fullMatch.length,
          filterType: FilterType.VEHICLE,
          confidence: isKnownModel ? 0.88 : 0.78,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + fullMatch.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Vehicle Make/Model",
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
   * Pattern 10: Vehicle descriptions with context
   * Detects vehicle mentions with explicit labels like "patient's vehicle", "drives a", etc.
   */
  private detectVehicleDescriptions(text: string, spans: Span[]): void {
    // Labeled vehicle patterns
    const pattern =
      /\b(?:patient'?s?\s+)?(?:vehicle|car|truck|suv|van|motorcycle|bike)\s*(?:is|was|:)?\s*(?:a\s+)?([A-Z0-9][A-Z0-9\s\-']{5,40})\b/gi;

    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const description = match[1];

      // Validate: should contain a known make or year
      const hasMake = VehicleIdentifierFilterSpan.VEHICLE_MAKES.some((make) =>
        description.toUpperCase().includes(make),
      );
      const hasYear = /(?:19|20)\d{2}/.test(description);

      if (hasMake || hasYear) {
        const fullMatch = match[0];

        const span = new Span({
          text: fullMatch,
          originalValue: fullMatch,
          characterStart: match.index,
          characterEnd: match.index + fullMatch.length,
          filterType: FilterType.VEHICLE,
          confidence: 0.89,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            match.index,
            match.index + fullMatch.length,
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Vehicle description with context",
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
   * Check if the match appears in vehicle-related context
   */
  private hasVehicleContext(
    text: string,
    matchIndex: number,
    matchLength: number,
  ): boolean {
    const contextWindow = 100;
    const start = Math.max(0, matchIndex - contextWindow);
    const end = Math.min(text.length, matchIndex + matchLength + contextWindow);
    const surroundingText = text.substring(start, end).toLowerCase();

    const vehicleContextTerms = [
      "vehicle",
      "car",
      "truck",
      "suv",
      "van",
      "motorcycle",
      "auto",
      "drives",
      "drove",
      "driving",
      "driven",
      "parked",
      "parking",
      "license",
      "plate",
      "registration",
      "vin",
      "odometer",
      "mileage",
      "collision",
      "accident",
      "crash",
      "garage",
      "driveway",
      "patient's car",
      "patient's vehicle",
      "motor vehicle",
    ];

    return vehicleContextTerms.some((term) => surroundingText.includes(term));
  }

  /**
   * Validate that a string looks like a vehicle description
   */
  private isValidVehicleDescription(description: string): boolean {
    // Should not be too short
    if (description.length < 10) return false;

    // Should have at least one known make
    const hasMake = VehicleIdentifierFilterSpan.VEHICLE_MAKES.some((make) =>
      description.toUpperCase().includes(make),
    );

    if (!hasMake) return false;

    // Should not be a false positive (e.g., "Toyota Corporation", "Ford Foundation")
    const falsePositiveTerms = [
      "corporation",
      "company",
      "inc",
      "llc",
      "foundation",
      "hospital",
      "medical",
      "clinic",
      "center",
      "institute",
      "university",
      "dealer",
      "dealership",
      "sales",
      "service",
    ];

    const lower = description.toLowerCase();
    if (falsePositiveTerms.some((term) => lower.includes(term))) {
      return false;
    }

    return true;
  }

  /**
   * Validation Methods
   */

  /**
   * Validate VIN format
   * - Must be exactly 17 characters
   * - Alphanumeric, excluding I, O, Q
   * - Reasonable mix of letters and numbers
   */
  private isValidVIN(vin: string): boolean {
    // Must be exactly 17 characters
    if (vin.length !== 17) {
      return false;
    }

    // Must be alphanumeric (excluding I, O, Q)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      return false;
    }

    // Should not be all digits
    if (/^\d{17}$/.test(vin)) {
      return false;
    }

    // Should not be all letters
    if (/^[A-Z]{17}$/.test(vin)) {
      return false;
    }

    // Should have reasonable mix of letters and numbers
    const digitCount = (vin.match(/\d/g) || []).length;
    if (digitCount < 3 || digitCount > 14) {
      return false;
    }

    return true;
  }

  /**
   * Validate license plate format
   */
  private isValidLicensePlate(plate: string): boolean {
    // Clean the plate
    const cleaned = plate.replace(/[-\s.\u2013]/g, "");

    // Must be 5-8 characters (reduced minimum from 5 to 5, but accept 6-char plates)
    if (cleaned.length < 5 || cleaned.length > 8) {
      return false;
    }

    // Must be alphanumeric
    if (!/^[A-Z0-9]+$/i.test(cleaned)) {
      return false;
    }

    // Must have at least one letter and one digit
    if (!/[A-Z]/i.test(cleaned) || !/\d/.test(cleaned)) {
      return false;
    }

    // Common formats - expanded to include more variations
    const commonFormats = [
      /^[A-Z]{2}[A-Z0-9]{5,6}$/i, // IL7XK920
      /^[A-Z]{2,3}\d{3,4}$/i, // ABC123 or AB1234
      /^\d[A-Z]{2,3}\d{3,4}$/i, // 1ABC234
      // Short 6-char formats
      /^[A-Z]{4}\d{2}$/i, // HABG81, YNJA52
      /^[A-Z]{3}\d{3}$/i, // ABC123
      /^[A-Z]{2}\d{4}$/i, // AB1234
      /^\d{4}[A-Z]{2}$/i, // 1234AB
      /^\d{3}[A-Z]{3}$/i, // 123ABC
      /^\d{2}[A-Z]{4}$/i, // 12ABCD
      // UK style (after space removal): K25PBE, AB12CDE
      /^[A-Z]{1,2}\d{2}[A-Z]{3}$/i, // K25PBE, AB12CDE
      /^\d{3}[A-Z]{3}$/i, // 123ABC (reverse UK)
      // 7 char formats
      /^[A-Z]{3}\d{4}$/i, // ABC1234
      /^[A-Z]{4}\d{3}$/i, // ABCD123
      /^\d{4}[A-Z]{3}$/i, // 1234ABC
    ];

    const matchesFormat = commonFormats.some((format) => format.test(cleaned));
    if (!matchesFormat) {
      return false;
    }

    return true;
  }

  /**
   * Validate GPS coordinates
   */
  private isValidGPSCoordinate(coords: string): boolean {
    // Extract numeric values
    const matches = coords.match(/-?\d{1,3}\.\d{4,10}/g);
    if (!matches || matches.length !== 2) {
      return false;
    }

    const [lat, lon] = matches.map(parseFloat);

    // Validate latitude range (-90 to 90)
    if (lat < -90 || lat > 90) {
      return false;
    }

    // Validate longitude range (-180 to 180)
    if (lon < -180 || lon > 180) {
      return false;
    }

    // Both coordinates should have reasonable precision (at least 4 decimal places)
    if (!matches[0].includes(".") || !matches[1].includes(".")) {
      return false;
    }

    return true;
  }

  /**
   * Validate IPv6 address
   */
  private isValidIPv6(ipv6: string): boolean {
    // Basic validation - must contain colons
    if (!ipv6.includes(":")) {
      return false;
    }

    // Must have reasonable length
    if (ipv6.length < 3 || ipv6.length > 45) {
      return false;
    }

    // Should not be a common false positive (e.g., time format)
    if (/^\d{1,2}:\d{2}$/.test(ipv6)) {
      return false;
    }

    // Must have hex characters
    if (!/[0-9a-fA-F]/.test(ipv6)) {
      return false;
    }

    return true;
  }
}
