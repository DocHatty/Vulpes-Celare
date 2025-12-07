// Research Policy - Limited Dataset
// For IRB-approved research requiring temporal and geographic context
// Requires: Data Use Agreement + IRB Approval

policy RESEARCH_RELAXED extends HIPAA_STRICT {
  description "IRB-approved research - preserves temporal and geographic context for analysis"
  
  // Redact direct identifiers (critical for privacy)
  redact names
  redact ssn
  redact mrn
  redact phones
  redact emails
  redact addresses
  
  // Keep temporal data (essential for longitudinal studies)
  keep dates
  keep ages
  
  // Keep geographic context (epidemiological research)
  keep locations
  keep organizations
  
  // Keep professional context (workflow research)
  keep professions
  
  // Slightly lower threshold for research context
  threshold 0.4
}
