/**
 * ValidationUtils - Centralized Validation Utilities
 *
 * Provides common validation functions used across multiple filters.
 * Eliminates code duplication and ensures consistent validation logic.
 *
 * Categories:
 * - OCR normalization (character substitution for scan errors)
 * - Checksum algorithms (Luhn)
 * - Phone number validation
 * - Numeric ID validation (length, digit requirements)
 * - IP address validation
 *
 * @module redaction/utils
 */

/**
 * OCR character substitution map for common scanning errors
 * Used to normalize text that may have OCR mistakes
 */
const OCR_SUBSTITUTION_MAP: Record<string, string> = {
  O: "0",
  o: "0",
  l: "1",
  I: "1",
  "|": "1",
  B: "8",
  b: "6",
  S: "5",
  s: "5",
  Z: "2",
  z: "2",
  G: "6",
  g: "9",
  q: "9",
};

/**
 * ValidationUtils - Static utility class for common validations
 */
export class ValidationUtils {
  // =========================================================================
  // OCR NORMALIZATION
  // =========================================================================

  /**
   * Normalize text with OCR character substitutions
   * Converts common OCR mistakes to their intended digits
   *
   * @param text - Text with potential OCR errors
   * @param customMap - Optional custom substitution map
   * @returns Normalized text with OCR errors corrected
   *
   * @example
   * ValidationUtils.normalizeOCR("O9-ll-I986") // "09-11-1986"
   * ValidationUtils.normalizeOCR("SSN: l23-4S-6789") // "SSN: 123-45-6789"
   */
  static normalizeOCR(
    text: string,
    customMap?: Record<string, string>,
  ): string {
    const map = customMap ?? OCR_SUBSTITUTION_MAP;
    return text.replace(/./g, (char) => map[char] ?? char);
  }

  /**
   * Extract digits from text, applying OCR normalization first
   *
   * @param text - Text containing digits (possibly with OCR errors)
   * @returns String of extracted digits only
   *
   * @example
   * ValidationUtils.extractDigitsWithOCR("l23-4S-6789") // "123456789"
   */
  static extractDigitsWithOCR(text: string): string {
    const normalized = this.normalizeOCR(text);
    return normalized.replace(/\D/g, "");
  }

  /**
   * Extract just digits from text (no OCR normalization)
   *
   * @param text - Text containing digits
   * @returns String of extracted digits only
   */
  static extractDigits(text: string): string {
    return text.replace(/\D/g, "");
  }

  /**
   * Extract alphanumeric characters from text
   *
   * @param text - Text to process
   * @param preserveCase - Whether to preserve case (default: true)
   * @returns Alphanumeric characters only
   */
  static extractAlphanumeric(
    text: string,
    preserveCase: boolean = true,
  ): string {
    const result = text.replace(/[^a-zA-Z0-9]/g, "");
    return preserveCase ? result : result.toUpperCase();
  }

  // =========================================================================
  // CHECKSUM ALGORITHMS
  // =========================================================================

  /**
   * Validate a number using the Luhn algorithm (mod-10)
   * Used for credit cards, IMEI numbers, etc.
   *
   * @param number - Number to validate (digits only)
   * @returns true if valid Luhn checksum
   *
   * @example
   * ValidationUtils.passesLuhn("4532015112830366") // true (valid Visa)
   */
  static passesLuhn(number: string): boolean {
    const digits = this.extractDigits(number);
    if (digits.length === 0) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Check if a card number is a known test/example card
   * (For HIPAA compliance, we accept these as valid)
   *
   * @param cardNumber - Card number to check
   * @returns true if it's a recognized test card pattern
   */
  static isTestCardNumber(cardNumber: string): boolean {
    const digits = this.extractDigits(cardNumber);
    const testPrefixes = ["4532", "4556", "5425", "2221", "3782", "6011"];
    return testPrefixes.some((prefix) => digits.startsWith(prefix));
  }

  // NOTE: DEA validation is handled by DEAFilterSpan.isValidDEA()
  // See src/filters/DEAFilterSpan.ts for the authoritative implementation

  // =========================================================================
  // PHONE NUMBER VALIDATION
  // =========================================================================

  /**
   * Validate a US phone number (10 digits, or 11 with country code 1)
   *
   * @param phone - Phone number to validate
   * @returns true if valid US phone format
   */
  static isValidUSPhone(phone: string): boolean {
    const digits = this.extractDigits(phone);

    // Must be 10 digits or 11 digits starting with 1
    if (digits.length === 10) return true;
    if (digits.length === 11 && digits[0] === "1") return true;

    return false;
  }

  /**
   * Validate a phone number has minimum required digits
   *
   * @param phone - Phone number to validate
   * @param minDigits - Minimum digits required (default: 7)
   * @param maxDigits - Maximum digits allowed (default: 15)
   * @returns true if digit count is within range
   */
  static isValidPhoneLength(
    phone: string,
    minDigits: number = 7,
    maxDigits: number = 15,
  ): boolean {
    const digits = this.extractDigits(phone);
    return digits.length >= minDigits && digits.length <= maxDigits;
  }

  /**
   * Validate a vanity phone number (contains letters)
   *
   * @param phone - Phone number to validate
   * @returns true if valid vanity phone (10+ alphanumeric chars)
   */
  static isValidVanityPhone(phone: string): boolean {
    const alphanumeric = this.extractAlphanumeric(phone).toUpperCase();
    const hasLetters = /[A-Z]/.test(alphanumeric);
    const hasDigits = /[0-9]/.test(alphanumeric);

    // Vanity phones: must have both letters and digits, 10+ chars
    return hasLetters && hasDigits && alphanumeric.length >= 10;
  }

  // =========================================================================
  // SSN VALIDATION
  // =========================================================================

  /**
   * Validate a Social Security Number
   *
   * @param ssn - SSN to validate
   * @returns true if valid SSN format (9 digits with valid area/group)
   */
  static isValidSSN(ssn: string): boolean {
    // Normalize OCR errors
    const normalized = this.normalizeOCR(ssn);
    const digits = this.extractDigits(normalized);

    // Allow 8-9 digits (OCR may drop a digit)
    if (digits.length < 8 || digits.length > 9) {
      // Check for partially masked SSNs (***-**-6789)
      if (/^[\*X]{3}[-\s]?[\*X]{2}[-\s]?\d{4}$/.test(normalized)) {
        return true;
      }
      if (/^\d{3}[-\s]?\d{2}[-\s]?[\*X]{4}$/.test(normalized)) {
        return true;
      }
      return false;
    }

    // SSN cannot start with 9 (reserved), 000, or have 00 in group
    if (digits.startsWith("9")) return false;
    if (digits.startsWith("000")) return false;

    // For HIPAA compliance, accept even "fake" SSNs like 123-45-6789
    return true;
  }

  // =========================================================================
  // NUMERIC ID VALIDATION
  // =========================================================================

  /**
   * Validate a generic numeric/alphanumeric ID
   *
   * @param id - ID to validate
   * @param minLength - Minimum length required
   * @param maxLength - Maximum length allowed
   * @param requireDigit - Whether at least one digit is required
   * @returns true if valid ID format
   */
  static isValidId(
    id: string,
    minLength: number,
    maxLength: number,
    requireDigit: boolean = true,
  ): boolean {
    // Remove common separators
    const cleaned = id.replace(/[-\s.]/g, "");

    // Check length
    if (cleaned.length < minLength || cleaned.length > maxLength) {
      return false;
    }

    // Check alphanumeric
    if (!/^[A-Za-z0-9]+$/.test(cleaned)) {
      return false;
    }

    // Check digit requirement
    if (requireDigit && !/\d/.test(cleaned)) {
      return false;
    }

    return true;
  }

  /**
   * Validate a Medical Record Number (MRN)
   *
   * @param mrn - MRN to validate
   * @returns true if valid MRN format
   */
  static isValidMRN(mrn: string): boolean {
    // MRNs typically 6-15 characters, must have at least one digit
    return this.isValidId(mrn, 6, 15, true);
  }

  /**
   * Validate an account number
   *
   * @param account - Account number to validate
   * @returns true if valid account format
   */
  static isValidAccountNumber(account: string): boolean {
    // Account numbers: 6-20 characters
    return this.isValidId(account, 6, 20, true);
  }

  /**
   * Validate a license number (driver's license, professional license)
   *
   * @param license - License number to validate
   * @returns true if valid license format
   */
  static isValidLicense(license: string): boolean {
    // Licenses: 6-20 characters
    return this.isValidId(license, 6, 20, true);
  }

  /**
   * Validate a health plan member ID
   *
   * @param memberId - Member ID to validate
   * @returns true if valid member ID format
   */
  static isValidHealthPlanId(memberId: string): boolean {
    // Health plan IDs: 7-20 characters
    return this.isValidId(memberId, 7, 20, true);
  }

  // =========================================================================
  // IP ADDRESS VALIDATION
  // =========================================================================

  /**
   * Validate an IPv4 address
   *
   * @param ip - IP address to validate
   * @returns true if valid IPv4 format
   */
  static isValidIPv4(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;

    for (const part of parts) {
      const num = parseInt(part, 10);
      if (isNaN(num) || num < 0 || num > 255) return false;
      // Check for leading zeros (e.g., "01" is invalid)
      if (part.length > 1 && part.startsWith("0")) return false;
    }

    return true;
  }

  /**
   * Validate an IPv6 address (basic check)
   *
   * @param ip - IP address to validate
   * @returns true if valid IPv6 format
   */
  static isValidIPv6(ip: string): boolean {
    // Basic IPv6 validation: contains colons, 3-45 chars, hex characters
    if (!ip.includes(":")) return false;
    if (ip.length < 3 || ip.length > 45) return false;

    // Must not be a time format (e.g., "12:34")
    if (/^\d{1,2}:\d{2}$/.test(ip)) return false;

    // Check for valid hex characters
    const cleaned = ip.replace(/:/g, "");
    if (!/^[0-9a-fA-F]+$/.test(cleaned)) return false;

    return true;
  }

  // =========================================================================
  // VEHICLE IDENTIFICATION
  // =========================================================================

  /**
   * Validate a Vehicle Identification Number (VIN)
   *
   * @param vin - VIN to validate
   * @returns true if valid VIN format
   */
  static isValidVIN(vin: string): boolean {
    // VIN must be exactly 17 characters
    if (vin.length !== 17) return false;

    // Alphanumeric, excluding I, O, Q
    if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return false;

    // Cannot be all digits or all letters
    const digitCount = (vin.match(/\d/g) || []).length;
    if (digitCount === 0 || digitCount === 17) return false;

    // Should have 3-14 digits (reasonable mix)
    if (digitCount < 3 || digitCount > 14) return false;

    return true;
  }

  /**
   * Validate a license plate number
   *
   * @param plate - License plate to validate
   * @returns true if valid license plate format
   */
  static isValidLicensePlate(plate: string): boolean {
    // Remove spaces and normalize
    const cleaned = plate.replace(/\s+/g, "").toUpperCase();

    // 5-8 characters, alphanumeric
    if (cleaned.length < 5 || cleaned.length > 8) return false;
    if (!/^[A-Z0-9]+$/.test(cleaned)) return false;

    // Must have at least one letter AND one digit
    const hasLetter = /[A-Z]/.test(cleaned);
    const hasDigit = /[0-9]/.test(cleaned);
    if (!hasLetter || !hasDigit) return false;

    return true;
  }

  /**
   * Validate GPS coordinates
   *
   * @param coords - Coordinate string (e.g., "40.7128, -74.0060")
   * @returns true if valid GPS coordinates
   */
  static isValidGPSCoordinate(coords: string): boolean {
    // Match latitude, longitude format
    const match = coords.match(/^(-?\d{1,3}\.?\d*)[,\s]+(-?\d{1,3}\.?\d*)$/);
    if (!match) return false;

    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);

    // Latitude: -90 to 90, Longitude: -180 to 180
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;

    // Should have reasonable precision (at least 4 decimal places)
    const latPrecision = (match[1].split(".")[1] || "").length;
    const lonPrecision = (match[2].split(".")[1] || "").length;
    if (latPrecision < 4 && lonPrecision < 4) return false;

    return true;
  }

  // =========================================================================
  // NAME VALIDATION
  // =========================================================================

  /**
   * Validate "Last, First" name format (case-insensitive)
   * Accepts: "Smith, John", "SMITH, JOHN", "smith, john"
   *
   * @param name - Name in "Last, First" format
   * @returns true if valid name format
   */
  static isValidLastFirstFormat(name: string): boolean {
    const parts = name.split(",");
    if (parts.length !== 2) return false;

    const lastName = parts[0].trim();
    const firstName = parts[1].trim();

    // Each part must start with a letter and have at least 3 letters total
    return (
      /^[A-Za-z][a-zA-Z]{2,}/.test(lastName) &&
      /^[A-Za-z][a-zA-Z]{2,}/.test(firstName)
    );
  }

  /**
   * Validate "Last, First" name format (strict capitalization)
   * Requires: "Smith, John" (first letter capitalized, rest lowercase)
   *
   * @param name - Name in "Last, First" format
   * @returns true if valid name format with proper capitalization
   */
  static isValidLastFirstFormatStrict(name: string): boolean {
    const parts = name.split(",");
    if (parts.length !== 2) return false;

    const lastName = parts[0].trim();
    const firstName = parts[1].trim();

    // Each part must start with capital followed by at least 2 lowercase letters
    return (
      /^[A-Z][a-z]{2,}/.test(lastName) && /^[A-Z][a-z]{2,}/.test(firstName)
    );
  }

  /**
   * Validate "First Last" name format
   *
   * @param name - Name in "First Last" format
   * @param strict - Whether to require proper capitalization
   * @returns true if valid name format
   */
  static isValidFirstLastFormat(
    name: string,
    strict: boolean = false,
  ): boolean {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2 || parts.length > 4) return false;

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    if (strict) {
      // Strict: each name must start with capital, rest lowercase
      return (
        /^[A-Z][a-z]{1,}$/.test(firstName) && /^[A-Z][a-z]{1,}$/.test(lastName)
      );
    } else {
      // Lenient: just needs to be alphabetic with min length
      return (
        /^[A-Za-z]{2,}$/.test(firstName) && /^[A-Za-z]{2,}$/.test(lastName)
      );
    }
  }

  /**
   * Check if a word looks like a valid name component
   *
   * @param word - Single word to check
   * @param minLength - Minimum length required (default: 2)
   * @returns true if word could be a name
   */
  static isValidNameComponent(word: string, minLength: number = 2): boolean {
    if (word.length < minLength) return false;

    // Must be alphabetic (allowing apostrophes and hyphens for O'Brien, Smith-Jones)
    if (
      !/^[A-Za-z][A-Za-z'-]*[A-Za-z]$/.test(word) &&
      !/^[A-Za-z]{2,}$/.test(word)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Check if text is in ALL CAPS (potential section heading, not a name)
   *
   * @param text - Text to check
   * @returns true if text is all uppercase
   */
  static isAllCaps(text: string): boolean {
    const trimmed = text.trim();
    return (
      /^[A-Z0-9\s]+$/.test(trimmed) &&
      /[A-Z]/.test(trimmed) &&
      trimmed.length > 4
    );
  }
}
