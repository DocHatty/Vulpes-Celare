// Medical Education and Training Policy
// For case studies, grand rounds, and educational materials
// Removes identifiers while preserving clinical learning value

policy TRAINING {
  description "Medical education and training - preserves clinical context"
  
  // Remove all direct patient identifiers
  redact names
  redact ssn
  redact mrn
  redact phones
  redact emails
  redact addresses
  
  // Keep clinical and temporal context
  keep dates
  keep ages where age < 90
  keep organizations
  keep professions
  
  // Standard threshold
  threshold 0.5
}
