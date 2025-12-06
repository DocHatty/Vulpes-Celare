/**
 * VULPES CELARE - MASTER TEST SUITE
 * Comprehensive, Unbiased PHI Redaction Assessment
 *
 * This is the SINGLE authoritative test system for Vulpes Celare.
 *
 * USAGE:
 *   node tests/master-suite/run.js                    # Standard 200-doc test
 *   node tests/master-suite/run.js --quick            # Quick 50-doc test
 *   node tests/master-suite/run.js --thorough         # Thorough 500-doc test
 *   node tests/master-suite/run.js --count=1000       # Custom count
 *
 * MODULE STRUCTURE:
 *   assessment/     - Main assessment engine (RigorousAssessment)
 *   documents/      - PHI generation & document templates (PRIMARY)
 *   generators/     - Low-level generators (used by documents/)
 *   data/           - Static data (names, locations, medical terms)
 *   evolution/      - Smart grading profiles
 *   cortex/         - MCP server & learning system
 */

// ============================================================================
// CORE ASSESSMENT
// ============================================================================
const {
  RigorousAssessment,
  GRADING_SCHEMA,
} = require("./assessment/assessment");

// ============================================================================
// DOCUMENT & PHI GENERATION (Primary API)
// ============================================================================
const { generateCompletePHIDataset } = require("./documents/phi-generator");
const { TEMPLATES } = require("./documents/templates");

// ============================================================================
// LOW-LEVEL GENERATORS (Internal use - prefer documents/ API)
// ============================================================================
const phi = require("./generators/phi");
const errors = require("./generators/errors");
const {
  random,
  randomInt,
  seedGlobal,
  resetGlobal,
} = require("./generators/seeded-random");

// ============================================================================
// STATIC DATA
// ============================================================================
const names = require("./data/names");
const locations = require("./data/locations");
const medical = require("./data/medical");

// ============================================================================
// CONSTANTS
// ============================================================================
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
} = require("./constants");

// ============================================================================
// SMART GRADING (Advanced multi-perspective grading)
// ============================================================================
const {
  SmartGrader,
  GRADING_PROFILES,
  generateGradingReport,
} = require("./evolution/smart-grading");

// ============================================================================
// EXPORTS
// ============================================================================
module.exports = {
  // Main Assessment
  RigorousAssessment,
  GRADING_SCHEMA,

  // Document Generation (PRIMARY API)
  generateCompletePHIDataset,
  TEMPLATES,

  // Constants (PHI type definitions)
  PHI_TYPES,
  NON_PHI_TYPES,
  TYPE_ALIASES,
  normalizeType,
  isPHI,
  isNonPHI,
  getAllPHITypes,
  getAllNonPHITypes,
  HIPAA_SAFE_HARBOR,

  // Smart Grading (multi-perspective analysis)
  SmartGrader,
  GRADING_PROFILES,
  generateGradingReport,

  // Static Data
  data: {
    names,
    locations,
    medical,
  },

  // Low-level Generators (for advanced use)
  generators: {
    phi,
    errors,
    random,
    randomInt,
    seedGlobal,
    resetGlobal,
  },

  // Convenience re-exports from phi generators
  ...phi,
};
