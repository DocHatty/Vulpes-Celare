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
 */

// Core Assessment
const { RigorousAssessment, GRADING_SCHEMA } = require("./assessment/rigorous-assessment");

// Document Generation
const { generateCompletePHIDataset } = require("./documents/phi-generator");
const { TEMPLATES } = require("./documents/templates");

// Data modules
const names = require("./data/names");
const locations = require("./data/locations");
const medical = require("./data/medical");

// Generator modules
const errors = require("./generators/errors");
const phi = require("./generators/phi");
const documents = require("./generators/documents");

module.exports = {
  // Main Assessment
  RigorousAssessment,
  GRADING_SCHEMA,
  
  // Document Generation
  generateCompletePHIDataset,
  TEMPLATES,
  
  // Data
  data: {
    names,
    locations,
    medical
  },
  
  // Generators
  generators: {
    errors,
    phi,
    documents
  },
  
  // Convenience exports
  generateDocuments: documents.generateDocuments,
  applyErrors: errors.applyErrors,
  
  // Re-export commonly used functions
  ...phi,
  ...documents
};
