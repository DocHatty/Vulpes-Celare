/**
 * VULPES CELARE - Constants Module
 * Centralized exports for all constant definitions
 */

const {
  PHI_TYPES,
  NON_PHI_TYPES,
  TYPE_ALIASES,
  normalizeType,
  isPHI,
  isNonPHI,
  getAllPHITypes,
  getAllNonPHITypes,
  HIPAA_SAFE_HARBOR,
} = require("./phi-types");

module.exports = {
  // PHI Type Constants
  PHI_TYPES,
  NON_PHI_TYPES,
  TYPE_ALIASES,

  // Helper Functions
  normalizeType,
  isPHI,
  isNonPHI,
  getAllPHITypes,
  getAllNonPHITypes,

  // Reference Data
  HIPAA_SAFE_HARBOR,
};
