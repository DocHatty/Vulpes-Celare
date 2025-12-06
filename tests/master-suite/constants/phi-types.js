/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ║                                                                               ║
 * ║      ██████╗███████╗██╗      █████╗ ██████╗ ███████╗                          ║
 * ║     ██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝                          ║
 * ║     ██║     █████╗  ██║     ███████║██████╔╝█████╗                            ║
 * ║     ██║     ██╔══╝  ██║     ██╔══██║██╔══██╗██╔══╝                            ║
 * ║     ╚██████╗███████╗███████╗██║  ██║██║  ██║███████╗                          ║
 * ║      ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝                          ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   PHI TYPE CONSTANTS                                                          ║
 * ║   Centralized definitions for Protected Health Information types              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This file provides a single source of truth for PHI type naming across the
 * entire test suite. All modules should import from here to ensure consistency.
 *
 * HIPAA Safe Harbor De-identification Standard (45 CFR 164.514(b)(2))
 * Lists 18 types of identifiers that must be removed for de-identification.
 */

// ============================================================================
// PHI TYPES - Protected Health Information (MUST be redacted)
// Based on HIPAA Safe Harbor 18 identifiers
// ============================================================================

const PHI_TYPES = {
  // ----------------------------------------
  // Identity Identifiers
  // ----------------------------------------
  NAME: "NAME", // #1 - Names (patient names)
  SSN: "SSN", // #10 - Social Security Numbers

  // ----------------------------------------
  // Geographic Identifiers
  // ----------------------------------------
  ADDRESS: "ADDRESS", // #2 - Geographic subdivisions smaller than state (street address)
  ZIPCODE: "ZIPCODE", // #2 - ZIP codes (first 3 digits if population < 20,000)

  // ----------------------------------------
  // Date Identifiers
  // ----------------------------------------
  DATE: "DATE", // #3 - Dates (except year) related to an individual
  AGE_90_PLUS: "AGE_90_PLUS", // #3 - Ages 90 and over (aggregated to 90+)

  // ----------------------------------------
  // Contact Identifiers
  // ----------------------------------------
  PHONE: "PHONE", // #4 - Phone numbers (also covers TELEPHONE)
  FAX: "FAX", // #5 - Fax numbers
  EMAIL: "EMAIL", // #6 - Email addresses

  // ----------------------------------------
  // Record Identifiers
  // ----------------------------------------
  MRN: "MRN", // #7 - Medical record numbers
  HEALTH_PLAN_ID: "HEALTH_PLAN_ID", // #8 - Health plan beneficiary numbers
  ACCOUNT_NUMBER: "ACCOUNT_NUMBER", // #9 - Account numbers

  // ----------------------------------------
  // License/Certificate Identifiers
  // ----------------------------------------
  NPI: "NPI", // #11 - National Provider Identifier (10-digit)
  DEA: "DEA", // #11 - DEA registration number

  // ----------------------------------------
  // Vehicle Identifiers
  // ----------------------------------------
  VIN: "VIN", // #12 - Vehicle identifiers and serial numbers
  LICENSE_PLATE: "LICENSE_PLATE", // #12 - License plate numbers

  // ----------------------------------------
  // Device Identifiers
  // ----------------------------------------
  DEVICE_ID: "DEVICE_ID", // #13 - Device identifiers and serial numbers

  // ----------------------------------------
  // Web/Electronic Identifiers
  // ----------------------------------------
  IP: "IP", // #14 - IP addresses (also covers IP_ADDRESS)
  URL: "URL", // #15 - Web URLs

  // ----------------------------------------
  // Financial Identifiers
  // ----------------------------------------
  CREDIT_CARD: "CREDIT_CARD", // #16 - Credit card numbers

  // ----------------------------------------
  // Biometric Identifiers (not currently generated)
  // ----------------------------------------
  // BIOMETRIC: "BIOMETRIC",     // #17 - Biometric identifiers
  // PHOTO: "PHOTO",             // #18 - Full-face photos and comparable images
};

// ============================================================================
// NON-PHI TYPES - Clinical data that should NOT be redacted
// ============================================================================

const NON_PHI_TYPES = {
  // ----------------------------------------
  // Provider Information (NOT patient-identifying)
  // ----------------------------------------
  PROVIDER_NAME: "PROVIDER_NAME", // Doctor/nurse names (not PHI)
  HOSPITAL: "HOSPITAL", // Hospital/facility names

  // ----------------------------------------
  // Clinical Information (NOT identifying)
  // ----------------------------------------
  DIAGNOSIS: "DIAGNOSIS", // Medical diagnoses
  PROCEDURE: "PROCEDURE", // Medical procedures
  MEDICATION: "MEDICATION", // Medication names
  SPECIALTY: "SPECIALTY", // Medical specialties

  // ----------------------------------------
  // Insurance Company (NOT identifying)
  // ----------------------------------------
  INSURANCE_COMPANY: "INSURANCE_COMPANY", // Insurance company names

  // ----------------------------------------
  // Age Under 90 (NOT PHI per HIPAA)
  // ----------------------------------------
  AGE_UNDER_90: "AGE_UNDER_90", // Ages under 90 are NOT PHI
};

// ============================================================================
// TYPE ALIASES - For backwards compatibility and common variations
// ============================================================================

const TYPE_ALIASES = {
  // Phone variations
  TELEPHONE: PHI_TYPES.PHONE,
  CELL_PHONE: PHI_TYPES.PHONE,
  MOBILE: PHI_TYPES.PHONE,
  WORK_PHONE: PHI_TYPES.PHONE,
  HOME_PHONE: PHI_TYPES.PHONE,

  // IP address variations
  IP_ADDRESS: PHI_TYPES.IP,
  IPV4: PHI_TYPES.IP,
  IPV6: PHI_TYPES.IP,

  // SSN variations
  SOCIAL_SECURITY: PHI_TYPES.SSN,
  SOCIAL_SECURITY_NUMBER: PHI_TYPES.SSN,

  // Name variations
  PATIENT_NAME: PHI_TYPES.NAME,

  // Record number variations
  MEDICAL_RECORD_NUMBER: PHI_TYPES.MRN,
  ACCESSION: PHI_TYPES.MRN,
  ACCESSION_NUMBER: PHI_TYPES.MRN,

  // Date variations
  DOB: PHI_TYPES.DATE,
  DATE_OF_BIRTH: PHI_TYPES.DATE,
  ADMISSION_DATE: PHI_TYPES.DATE,
  DISCHARGE_DATE: PHI_TYPES.DATE,
  SERVICE_DATE: PHI_TYPES.DATE,

  // Address variations
  STREET_ADDRESS: PHI_TYPES.ADDRESS,
  ZIP: PHI_TYPES.ZIPCODE,
  ZIP_CODE: PHI_TYPES.ZIPCODE,
  POSTAL_CODE: PHI_TYPES.ZIPCODE,

  // Financial variations
  CARD_NUMBER: PHI_TYPES.CREDIT_CARD,
  CC_NUMBER: PHI_TYPES.CREDIT_CARD,

  // Provider variations (non-PHI)
  DOCTOR_NAME: NON_PHI_TYPES.PROVIDER_NAME,
  PHYSICIAN_NAME: NON_PHI_TYPES.PROVIDER_NAME,
  ATTENDING_NAME: NON_PHI_TYPES.PROVIDER_NAME,
  PCP_NAME: NON_PHI_TYPES.PROVIDER_NAME,
  SURGEON_NAME: NON_PHI_TYPES.PROVIDER_NAME,

  // Hospital variations (non-PHI)
  FACILITY: NON_PHI_TYPES.HOSPITAL,
  FACILITY_NAME: NON_PHI_TYPES.HOSPITAL,
  CLINIC: NON_PHI_TYPES.HOSPITAL,

  // Insurance variations (non-PHI)
  INSURANCE: NON_PHI_TYPES.INSURANCE_COMPANY,
  INSURER: NON_PHI_TYPES.INSURANCE_COMPANY,
  PAYER: NON_PHI_TYPES.INSURANCE_COMPANY,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize a PHI type to its canonical form
 * @param {string} type - The type to normalize
 * @returns {string} - The canonical type name
 */
function normalizeType(type) {
  if (!type) return null;
  const upper = type.toUpperCase().replace(/[^A-Z0-9_]/g, "_");

  // Check if it's already a canonical PHI type
  if (Object.values(PHI_TYPES).includes(upper)) {
    return upper;
  }

  // Check if it's a canonical non-PHI type
  if (Object.values(NON_PHI_TYPES).includes(upper)) {
    return upper;
  }

  // Check aliases
  if (TYPE_ALIASES[upper]) {
    return TYPE_ALIASES[upper];
  }

  // Return as-is if not found (allows extension)
  return upper;
}

/**
 * Check if a type is PHI (requires redaction)
 * @param {string} type - The type to check
 * @returns {boolean} - True if the type is PHI
 */
function isPHI(type) {
  const normalized = normalizeType(type);
  return Object.values(PHI_TYPES).includes(normalized);
}

/**
 * Check if a type is non-PHI (should NOT be redacted)
 * @param {string} type - The type to check
 * @returns {boolean} - True if the type is non-PHI
 */
function isNonPHI(type) {
  const normalized = normalizeType(type);
  return Object.values(NON_PHI_TYPES).includes(normalized);
}

/**
 * Get all PHI types as an array
 * @returns {string[]} - Array of PHI type names
 */
function getAllPHITypes() {
  return Object.values(PHI_TYPES);
}

/**
 * Get all non-PHI types as an array
 * @returns {string[]} - Array of non-PHI type names
 */
function getAllNonPHITypes() {
  return Object.values(NON_PHI_TYPES);
}

// ============================================================================
// HIPAA REFERENCE - Safe Harbor 18 Identifiers
// ============================================================================
const HIPAA_SAFE_HARBOR = {
  1: { name: "Names", types: [PHI_TYPES.NAME] },
  2: {
    name: "Geographic data",
    types: [PHI_TYPES.ADDRESS, PHI_TYPES.ZIPCODE],
  },
  3: { name: "Dates", types: [PHI_TYPES.DATE, PHI_TYPES.AGE_90_PLUS] },
  4: { name: "Phone numbers", types: [PHI_TYPES.PHONE] },
  5: { name: "Fax numbers", types: [PHI_TYPES.FAX] },
  6: { name: "Email addresses", types: [PHI_TYPES.EMAIL] },
  7: { name: "Social Security numbers", types: [PHI_TYPES.SSN] },
  8: { name: "Medical record numbers", types: [PHI_TYPES.MRN] },
  9: {
    name: "Health plan beneficiary numbers",
    types: [PHI_TYPES.HEALTH_PLAN_ID],
  },
  10: { name: "Account numbers", types: [PHI_TYPES.ACCOUNT_NUMBER] },
  11: {
    name: "Certificate/license numbers",
    types: [PHI_TYPES.NPI, PHI_TYPES.DEA],
  },
  12: {
    name: "Vehicle identifiers",
    types: [PHI_TYPES.VIN, PHI_TYPES.LICENSE_PLATE],
  },
  13: { name: "Device identifiers", types: [PHI_TYPES.DEVICE_ID] },
  14: { name: "Web URLs", types: [PHI_TYPES.URL] },
  15: { name: "IP addresses", types: [PHI_TYPES.IP] },
  16: { name: "Biometric identifiers", types: [] }, // Not currently generated
  17: { name: "Full-face photographs", types: [] }, // Not currently generated
  18: {
    name: "Any other unique identifying number",
    types: [PHI_TYPES.CREDIT_CARD],
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Primary type constants
  PHI_TYPES,
  NON_PHI_TYPES,
  TYPE_ALIASES,

  // Helper functions
  normalizeType,
  isPHI,
  isNonPHI,
  getAllPHITypes,
  getAllNonPHITypes,

  // Reference
  HIPAA_SAFE_HARBOR,
};
