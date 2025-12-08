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
 * ValidationUtils - Static utility class for common validations
 */
export declare class ValidationUtils {
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
    static normalizeOCR(text: string, customMap?: Record<string, string>): string;
    /**
     * Extract digits from text, applying OCR normalization first
     *
     * @param text - Text containing digits (possibly with OCR errors)
     * @returns String of extracted digits only
     *
     * @example
     * ValidationUtils.extractDigitsWithOCR("l23-4S-6789") // "123456789"
     */
    static extractDigitsWithOCR(text: string): string;
    /**
     * Extract just digits from text (no OCR normalization)
     *
     * @param text - Text containing digits
     * @returns String of extracted digits only
     */
    static extractDigits(text: string): string;
    /**
     * Extract alphanumeric characters from text
     *
     * @param text - Text to process
     * @param preserveCase - Whether to preserve case (default: true)
     * @returns Alphanumeric characters only
     */
    static extractAlphanumeric(text: string, preserveCase?: boolean): string;
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
    static passesLuhn(number: string): boolean;
    /**
     * Check if a card number is a known test/example card
     * (For HIPAA compliance, we accept these as valid)
     *
     * @param cardNumber - Card number to check
     * @returns true if it's a recognized test card pattern
     */
    static isTestCardNumber(cardNumber: string): boolean;
    /**
     * Validate a US phone number (10 digits, or 11 with country code 1)
     *
     * @param phone - Phone number to validate
     * @returns true if valid US phone format
     */
    static isValidUSPhone(phone: string): boolean;
    /**
     * Validate a phone number has minimum required digits
     *
     * @param phone - Phone number to validate
     * @param minDigits - Minimum digits required (default: 7)
     * @param maxDigits - Maximum digits allowed (default: 15)
     * @returns true if digit count is within range
     */
    static isValidPhoneLength(phone: string, minDigits?: number, maxDigits?: number): boolean;
    /**
     * Validate a vanity phone number (contains letters)
     *
     * @param phone - Phone number to validate
     * @returns true if valid vanity phone (10+ alphanumeric chars)
     */
    static isValidVanityPhone(phone: string): boolean;
    /**
     * Validate a Social Security Number
     *
     * @param ssn - SSN to validate
     * @returns true if valid SSN format (9 digits with valid area/group)
     */
    static isValidSSN(ssn: string): boolean;
    /**
     * Validate a generic numeric/alphanumeric ID
     *
     * @param id - ID to validate
     * @param minLength - Minimum length required
     * @param maxLength - Maximum length allowed
     * @param requireDigit - Whether at least one digit is required
     * @returns true if valid ID format
     */
    static isValidId(id: string, minLength: number, maxLength: number, requireDigit?: boolean): boolean;
    /**
     * Validate a Medical Record Number (MRN)
     *
     * @param mrn - MRN to validate
     * @returns true if valid MRN format
     */
    static isValidMRN(mrn: string): boolean;
    /**
     * Validate an account number
     *
     * @param account - Account number to validate
     * @returns true if valid account format
     */
    static isValidAccountNumber(account: string): boolean;
    /**
     * Validate a license number (driver's license, professional license)
     *
     * @param license - License number to validate
     * @returns true if valid license format
     */
    static isValidLicense(license: string): boolean;
    /**
     * Validate a health plan member ID
     *
     * @param memberId - Member ID to validate
     * @returns true if valid member ID format
     */
    static isValidHealthPlanId(memberId: string): boolean;
    /**
     * Validate an IPv4 address
     *
     * @param ip - IP address to validate
     * @returns true if valid IPv4 format
     */
    static isValidIPv4(ip: string): boolean;
    /**
     * Validate an IPv6 address (basic check)
     *
     * @param ip - IP address to validate
     * @returns true if valid IPv6 format
     */
    static isValidIPv6(ip: string): boolean;
    /**
     * Validate a Vehicle Identification Number (VIN)
     *
     * @param vin - VIN to validate
     * @returns true if valid VIN format
     */
    static isValidVIN(vin: string): boolean;
    /**
     * Validate a license plate number
     *
     * @param plate - License plate to validate
     * @returns true if valid license plate format
     */
    static isValidLicensePlate(plate: string): boolean;
    /**
     * Validate GPS coordinates
     *
     * @param coords - Coordinate string (e.g., "40.7128, -74.0060")
     * @returns true if valid GPS coordinates
     */
    static isValidGPSCoordinate(coords: string): boolean;
    /**
     * Validate "Last, First" name format (case-insensitive)
     * Accepts: "Smith, John", "SMITH, JOHN", "smith, john"
     *
     * @param name - Name in "Last, First" format
     * @returns true if valid name format
     */
    static isValidLastFirstFormat(name: string): boolean;
    /**
     * Validate "Last, First" name format (strict capitalization)
     * Requires: "Smith, John" (first letter capitalized, rest lowercase)
     *
     * @param name - Name in "Last, First" format
     * @returns true if valid name format with proper capitalization
     */
    static isValidLastFirstFormatStrict(name: string): boolean;
    /**
     * Validate "First Last" name format
     *
     * @param name - Name in "First Last" format
     * @param strict - Whether to require proper capitalization
     * @returns true if valid name format
     */
    static isValidFirstLastFormat(name: string, strict?: boolean): boolean;
    /**
     * Check if a word looks like a valid name component
     *
     * @param word - Single word to check
     * @param minLength - Minimum length required (default: 2)
     * @returns true if word could be a name
     */
    static isValidNameComponent(word: string, minLength?: number): boolean;
    /**
     * Check if text is in ALL CAPS (potential section heading, not a name)
     *
     * @param text - Text to check
     * @returns true if text is all uppercase
     */
    static isAllCaps(text: string): boolean;
}
//# sourceMappingURL=ValidationUtils.d.ts.map