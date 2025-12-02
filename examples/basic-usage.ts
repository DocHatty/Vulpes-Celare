/**
 * Vulpes Celare - Basic Usage Example
 * 
 * Demonstrates simple text redaction with default settings.
 */

import { 
  ParallelRedactionEngine,
  RedactionContext,
  SSNFilterSpan,
  PhoneFilterSpan,
  EmailFilterSpan,
  SmartNameFilterSpan,
  FormattedNameFilterSpan,
  DateFilterSpan,
  MRNFilterSpan
} from '../src';

// Sample medical document
const sampleText = `
RADIOLOGY REPORT

Patient: JOHNSON, MARY ELIZABETH
DOB: 04/22/1978
MRN: 7834921
SSN: 456-78-9012

Referring Physician: Dr. Robert Williams
Exam Date: 11/15/2024

CLINICAL HISTORY:
45-year-old female with chronic back pain. Patient reports symptoms
worsening over past 3 months.

FINDINGS:
Lumbar spine MRI demonstrates mild degenerative disc disease at L4-L5.
No evidence of herniation or stenosis.

IMPRESSION:
Mild degenerative changes, age-appropriate.

Dictated by: Sarah Chen, MD
Contact: dr.chen@hospital.org | (555) 987-6543
`;

async function main() {
  // Create filters
  const filters = [
    new SSNFilterSpan(),
    new PhoneFilterSpan(),
    new EmailFilterSpan(),
    new SmartNameFilterSpan(),
    new FormattedNameFilterSpan(),
    new DateFilterSpan(),
    new MRNFilterSpan()
  ];

  // Default policy - redact everything
  const policy = {
    identifiers: {
      ssn: { enabled: true, replacement: '[SSN]' },
      phone: { enabled: true, replacement: '[PHONE]' },
      email: { enabled: true, replacement: '[EMAIL]' },
      name: { enabled: true, replacement: '[NAME]' },
      date: { enabled: true, replacement: '[DATE]' },
      mrn: { enabled: true, replacement: '[MRN]' }
    }
  };

  // Create context
  const context = new RedactionContext();

  // Redact!
  console.log('=== ORIGINAL TEXT ===\n');
  console.log(sampleText);
  
  console.log('\n=== REDACTED TEXT ===\n');
  const redacted = await ParallelRedactionEngine.redactParallel(
    sampleText, 
    filters, 
    policy, 
    context
  );
  console.log(redacted);

  // Show execution report
  const report = ParallelRedactionEngine.getLastExecutionReport();
  if (report) {
    console.log('\n=== EXECUTION REPORT ===');
    console.log(`Filters executed: ${report.filtersExecuted}`);
    console.log(`Total spans detected: ${report.totalSpansDetected}`);
    console.log(`Execution time: ${report.totalExecutionTimeMs}ms`);
  }
}

main().catch(console.error);
