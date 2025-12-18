/**
 * HIPAA SAFE HARBOR STANDARDS CONFIGURATION
 * ============================================================================
 * Updated: December 2024 based on latest HHS/OCR guidance
 *
 * References:
 * - HHS.gov De-identification Methods (45 CFR 164.514)
 * - HIPAA Journal 2025 PHI Guidelines
 * - HHS OCR December 2024 Security Rule NPRM
 *
 * CRITICAL: This configuration reflects the official 18 HIPAA identifiers
 * as defined by the Safe Harbor method, with updated interpretations from
 * recent OCR guidance and industry best practices.
 */

module.exports = {
  // ============================================================================
  // THE 18 HIPAA IDENTIFIERS (Safe Harbor Method)
  // Per 45 CFR 164.514(b)(2)
  // ============================================================================
  identifiers: {
    // 1. Names
    NAME: {
      id: 1,
      description: "Names of the individual, relatives, employers, or household members",
      mustRedact: true,
      includesPatient: true,
      includesRelatives: true,
      includesEmployers: true,
      includesHouseholdMembers: true,
      // IMPORTANT: Provider names in professional capacity are DEBATED
      // Conservative approach: DO NOT redact provider names acting professionally
      excludes: ["provider_names_in_professional_capacity", "hospital_names", "facility_names"]
    },

    // 2. Geographic Subdivisions Smaller Than State
    GEOGRAPHIC: {
      id: 2,
      description: "All geographic subdivisions smaller than a state",
      mustRedact: true,
      includes: [
        "street_address",
        "city",
        "county",
        "precinct",
        "geocodes",
        "equivalent_geographic_areas"
      ],
      zipCodeRules: {
        // Initial 3 digits can be retained IF geographic unit contains >20,000 people
        // Otherwise, must change to "000"
        threeDigitExemptZips: [
          "036", "059", "063", "102", "203", "556", "692", "821", "823", "830",
          "831", "878", "879", "884", "893"
        ],
        // These must be changed to "000" per HHS guidance
        smallPopulationZips: true
      }
    },

    // 3. Dates (except year)
    DATES: {
      id: 3,
      description: "All elements of dates except year",
      mustRedact: true,
      includes: [
        "birth_date",
        "admission_date",
        "discharge_date",
        "death_date",
        "service_date",
        "procedure_date"
      ],
      yearOnlyExempt: true, // Year alone is NOT PHI
      ageRules: {
        // Ages 89 and under: NOT required to be redacted
        // Ages 90+: MUST be aggregated to "90 or older" category
        threshold: 90,
        underThresholdIsPHI: false,
        overThresholdIsPHI: true,
        aggregationLabel: "90+"
      }
    },

    // 4. Telephone Numbers
    TELEPHONE: {
      id: 4,
      description: "Telephone numbers",
      mustRedact: true,
      formats: ["standard", "international", "extensions"]
    },

    // 5. Fax Numbers
    FAX: {
      id: 5,
      description: "Fax numbers",
      mustRedact: true
    },

    // 6. Email Addresses
    EMAIL: {
      id: 6,
      description: "Electronic mail addresses",
      mustRedact: true,
      includesPersonal: true,
      includesWork: true
    },

    // 7. Social Security Numbers
    SSN: {
      id: 7,
      description: "Social Security numbers",
      mustRedact: true,
      highSensitivity: true
    },

    // 8. Medical Record Numbers
    MRN: {
      id: 8,
      description: "Medical record numbers",
      mustRedact: true,
      includesPatientIds: true,
      includesAccountNumbers: true,
      includesAccessionNumbers: true
    },

    // 9. Health Plan Beneficiary Numbers
    HEALTH_PLAN: {
      id: 9,
      description: "Health plan beneficiary numbers",
      mustRedact: true,
      includesMemberId: true,
      includesGroupNumber: true,
      includesSubscriberId: true
    },

    // 10. Account Numbers
    ACCOUNT: {
      id: 10,
      description: "Account numbers",
      mustRedact: true,
      includesBankAccounts: true,
      includesCreditCards: true,
      includesBillingAccounts: true
    },

    // 11. Certificate/License Numbers
    LICENSE: {
      id: 11,
      description: "Certificate/license numbers",
      mustRedact: true,
      includes: [
        "drivers_license"
      ],
      excludes: [
        "professional_license",
        "nursing_license",
        "medical_license"
      ]
    },

    // 12. Vehicle Identifiers
    VEHICLE: {
      id: 12,
      description: "Vehicle identifiers and serial numbers, including license plate numbers",
      mustRedact: true,
      includes: ["vin", "license_plate", "registration"]
    },

    // 13. Device Identifiers and Serial Numbers
    DEVICE: {
      id: 13,
      description: "Device identifiers and serial numbers",
      mustRedact: true,
      includesMedicalDevices: true,
      includesImplants: true,
      includesEquipment: true
    },

    // 14. Web URLs
    URL: {
      id: 14,
      description: "Web Universal Resource Locators (URLs)",
      mustRedact: true,
      includesPatientPortals: true,
      includesPersonalUrls: true,
      // Note: Generic healthcare URLs may not need redaction
      excludesGenericHealthcareUrls: true
    },

    // 15. IP Addresses
    IP_ADDRESS: {
      id: 15,
      description: "Internet Protocol (IP) address numbers",
      mustRedact: true,
      includesIPv4: true,
      includesIPv6: true
    },

    // 16. Biometric Identifiers
    BIOMETRIC: {
      id: 16,
      description: "Biometric identifiers, including finger and voice prints",
      mustRedact: true,
      includes: ["fingerprints", "voiceprints", "retinal_scans", "facial_geometry"]
    },

    // 17. Full Face Photographs
    PHOTOGRAPH: {
      id: 17,
      description: "Full face photographic images and any comparable images",
      mustRedact: true,
      includesPhotos: true,
      includesVideos: true,
      includesComparableImages: true
    },

    // 18. Any Other Unique Identifier
    UNIQUE_ID: {
      id: 18,
      description: "Any other unique identifying number, characteristic, or code",
      mustRedact: true,
      includes: [
        "passport_number",
        "alien_registration_number",
        "employer_id",
        "military_id",
        "unique_barcodes",
        "qr_codes_with_phi"
      ]
    }
  },

  // ============================================================================
  // ITEMS THAT ARE NOT PHI (Should NOT be redacted)
  // ============================================================================
  nonPHI: {
    // Facility/Organization Names
    HOSPITAL_NAMES: {
      description: "Hospital and healthcare facility names",
      isPHI: false,
      rationale: "Institutional identifiers, not individual patient identifiers"
    },

    // Provider Names (in professional capacity)
    PROVIDER_NAMES: {
      description: "Names of healthcare providers acting in professional capacity",
      isPHI: false,
      rationale: "Professional identity, not protected under HIPAA for the patient",
      caution: "Some organizations choose to redact for additional privacy"
    },

    // Medical Information
    DIAGNOSES: {
      description: "Medical diagnoses and conditions",
      isPHI: false,
      rationale: "Medical information alone without identifiers is not PHI"
    },

    PROCEDURES: {
      description: "Medical procedures and treatments",
      isPHI: false,
      rationale: "Medical information alone without identifiers is not PHI"
    },

    MEDICATIONS: {
      description: "Medication names and dosages",
      isPHI: false,
      rationale: "Medical information alone without identifiers is not PHI"
    },

    // Ages Under 90
    AGE_UNDER_90: {
      description: "Ages of patients under 90 years old",
      isPHI: false,
      rationale: "Per Safe Harbor, only ages 90+ require redaction/aggregation"
    },

    // Year Only Dates
    YEAR_ONLY: {
      description: "Year component of dates when used alone",
      isPHI: false,
      rationale: "Year alone does not identify individuals"
    },

    // Lab Values
    LAB_VALUES: {
      description: "Laboratory test results and values",
      isPHI: false,
      rationale: "Clinical data without identifiers is not PHI"
    },

    // Vital Signs
    VITAL_SIGNS: {
      description: "Blood pressure, heart rate, temperature, etc.",
      isPHI: false,
      rationale: "Clinical measurements without identifiers are not PHI"
    }
  },

  // ============================================================================
  // GRADING THRESHOLDS (Based on Industry Standards)
  // ============================================================================
  gradingThresholds: {
    // Sensitivity thresholds (ability to catch PHI)
    sensitivity: {
      A_PLUS: 99.5,  // Near-perfect PHI detection
      A: 98.0,       // Excellent
      A_MINUS: 97.0, // Very good
      B_PLUS: 95.0,  // Good
      B: 93.0,       // Acceptable for most uses
      B_MINUS: 90.0, // Minimum acceptable
      C_PLUS: 87.0,  // Below standards
      C: 83.0,       // Concerning
      C_MINUS: 80.0, // Serious issues
      D: 70.0,       // Failing
      F: 0           // Critical failure
    },

    // Specificity thresholds (ability to preserve non-PHI)
    specificity: {
      A_PLUS: 99.0,  // Minimal false positives
      A: 97.0,
      A_MINUS: 95.0,
      B_PLUS: 92.0,
      B: 88.0,
      B_MINUS: 85.0,
      C: 80.0,
      D: 70.0,
      F: 0
    },

    // HIPAA Compliance Minimum Standards
    minimumCompliance: {
      sensitivity: 95.0, // Cannot miss more than 5% of PHI
      specificity: 85.0  // Should not over-redact more than 15%
    },

    // Strict scoring weights (sensitivity is MORE important)
    weights: {
      sensitivity: 0.75,  // 75% weight on catching PHI
      specificity: 0.25   // 25% weight on preserving non-PHI
    }
  },

  // ============================================================================
  // STATISTICAL METRICS (Gold Standard Definitions)
  // ============================================================================
  metrics: {
    // Primary Metrics
    SENSITIVITY: {
      name: "Sensitivity (True Positive Rate / Recall)",
      formula: "TP / (TP + FN)",
      description: "Proportion of actual PHI correctly identified",
      clinicalRelevance: "CRITICAL - Missing PHI is a compliance violation"
    },

    SPECIFICITY: {
      name: "Specificity (True Negative Rate)",
      formula: "TN / (TN + FP)",
      description: "Proportion of non-PHI correctly preserved",
      clinicalRelevance: "Important for document utility"
    },

    PRECISION: {
      name: "Precision (Positive Predictive Value)",
      formula: "TP / (TP + FP)",
      description: "Proportion of identified items that are actually PHI",
      clinicalRelevance: "Indicates false positive rate"
    },

    // Composite Metrics
    F1_SCORE: {
      name: "F1 Score",
      formula: "2 * (Precision * Recall) / (Precision + Recall)",
      description: "Harmonic mean of precision and recall",
      clinicalRelevance: "Balanced measure of overall performance"
    },

    F2_SCORE: {
      name: "F2 Score",
      formula: "5 * (Precision * Recall) / (4 * Precision + Recall)",
      description: "F-score with higher weight on recall",
      clinicalRelevance: "Prioritizes catching PHI over precision"
    },

    // Derived Metrics
    FALSE_NEGATIVE_RATE: {
      name: "False Negative Rate (Miss Rate)",
      formula: "FN / (TP + FN)",
      description: "Proportion of PHI that was missed",
      clinicalRelevance: "CRITICAL - Each miss is a potential violation"
    },

    FALSE_POSITIVE_RATE: {
      name: "False Positive Rate (Fall-out)",
      formula: "FP / (FP + TN)",
      description: "Proportion of non-PHI incorrectly redacted",
      clinicalRelevance: "Affects document readability"
    }
  },

  // ============================================================================
  // RECENT REGULATORY UPDATES (As of December 2024)
  // ============================================================================
  regulatoryUpdates: {
    securityRuleNPRM: {
      date: "December 27, 2024",
      description: "HHS OCR proposed updates to HIPAA Security Rule",
      status: "Comment period closed March 7, 2025",
      keyChanges: [
        "First update since 2013",
        "Enhanced cybersecurity requirements",
        "Response to 102% increase in large breaches (2018-2023)",
        "167 million individuals affected in 2023 alone"
      ]
    },
    reproductiveHealthcare: {
      date: "June 25, 2024",
      description: "Privacy Rule modifications for reproductive healthcare",
      complianceDate: "December 23, 2024",
      nppComplianceDate: "February 16, 2026"
    },
    part2Alignment: {
      date: "2024",
      description: "Part 2 Rule aligning substance use disorder records with HIPAA",
      complianceDate: "February 16, 2026"
    }
  },

  // Version and metadata
  version: "2024.12.03",
  lastUpdated: "2024-12-03",
  sources: [
    "https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html",
    "https://www.hipaajournal.com/considered-phi-hipaa/",
    "https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule"
  ]
};
