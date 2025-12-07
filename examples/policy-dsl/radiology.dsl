// Radiology Department Policy
// Balances patient privacy with operational workflow needs
// Preserves study identifiers for PACS integration

policy RADIOLOGY_DEPT {
  description "Radiology department workflow - preserves study identifiers for PACS"
  
  // Remove patient direct identifiers
  redact names
  redact ssn
  redact phones
  redact emails
  redact addresses
  
  // Keep for workflow and study tracking
  keep mrn
  keep dates
  keep ages
  keep organizations
  
  // Medium-high threshold for clinical accuracy
  threshold 0.6
}
