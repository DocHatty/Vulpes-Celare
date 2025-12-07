// HIPAA Safe Harbor - Strict Compliance
// Redacts all 18 HIPAA identifiers for maximum compliance

policy HIPAA_STRICT {
  description "Full HIPAA Safe Harbor compliance - all 18 identifiers"
  
  // Names and contact information
  redact names
  redact phones
  redact fax
  redact emails
  
  // Geographic information
  redact addresses
  
  // Dates (all dates)
  redact dates
  
  // Government and medical IDs
  redact ssn
  redact mrn
  redact health_plan
  redact accounts
  redact license
  
  // Technical identifiers
  redact vehicle
  redact device
  redact urls
  redact ip
  redact biometric
  redact unique_id
  
  // Ages over 89 (HIPAA requirement)
  redact ages where age > 89
  
  threshold 0.5
}
