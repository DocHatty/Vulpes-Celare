# Vulpes Celare - Master Test Suite

## Overview

This is the **authoritative, unbiased test suite** for the Vulpes Celare PHI redaction engine. It has been completely redesigned with the following principles:

1. **UNBIASED TESTING**: Tests PHI detection without favoring specific implementations
2. **COMPREHENSIVE COVERAGE**: All 18 HIPAA Safe Harbor identifiers tested
3. **REALISTIC SCENARIOS**: Tests the engine as an integrated system, not isolated components
4. **STRICT GRADING**: Clinical-grade thresholds appropriate for safety-critical applications
5. **MULTI-PASS ANALYSIS**: Detection → Grading → Deep Investigation workflow
6. **TRANSPARENT EVALUATION**: Every decision documented and traceable

## Quick Start

```bash
# Run the standard 200-document assessment
node tests/master-suite/run.js

# Quick test (50 documents)
node tests/master-suite/run.js --quick

# Thorough test (500 documents)
node tests/master-suite/run.js --thorough

# Custom document count
node tests/master-suite/run.js --count=1000

# JSON output for CI/CD
node tests/master-suite/run.js --json-only
```

## Directory Structure

```
master-suite/
├── run.js                           # Main test runner
├── index.js                         # Module exports
├── README.md                        # This file
│
├── assessment/
│   └── rigorous-assessment.js       # Core assessment engine with strict grading
│
├── documents/
│   ├── templates.js                 # Comprehensive medical document templates
│   └── phi-generator.js             # Complete PHI dataset generator
│
├── generators/
│   ├── errors.js                    # OCR/typo error simulation
│   ├── phi.js                       # PHI value generators
│   └── documents.js                 # Legacy document generators
│
└── data/
    ├── names.js                     # Diverse name database
    ├── locations.js                 # Geographic data
    └── medical.js                   # Medical terminology
```

## Test Workflow

### Phase 1: Full Test Suite Execution
The **ENTIRE** test suite runs without interruption:
- Generates N test documents (default: 200)
- Each document contains 20-50+ PHI items
- Documents include realistic OCR errors, typos, and formatting variations
- Engine processes each document as an integrated system

### Phase 2: Comprehensive Metric Calculation
After all documents are processed:
- Calculate sensitivity (PHI correctly redacted)
- Calculate specificity (non-PHI correctly preserved)
- Calculate precision, recall, F1 score
- Track performance by PHI type, error level, and document type

### Phase 3: Deep Investigation
Only after grading is complete:
- Analyze failure patterns
- Identify root causes
- Generate actionable recommendations
- Produce comprehensive report

## Document Templates

The suite includes comprehensive, realistic medical documents:

| Template | Description | Complexity |
|----------|-------------|------------|
| History & Physical | Complete H&P with all sections | High |
| Operative Report | Surgical procedure documentation | High |
| Registration Form | Patient intake with ALL PHI types | Extreme |
| Referral Letter | Provider-to-provider communication | Medium |
| Pathology Report | Technical lab findings | High |
| Insurance EOB | Claims and billing documentation | High |

## PHI Types Tested

All 18 HIPAA Safe Harbor identifiers:

| Type | Description | Examples |
|------|-------------|----------|
| NAME | Patient/family names | "Smith, John A." |
| SSN | Social Security Numbers | "123-45-6789" |
| DATE | Dates (DOB, admission, etc.) | "01/15/1985" |
| PHONE | Phone numbers | "(555) 123-4567" |
| FAX | Fax numbers | "Fax: 555-987-6543" |
| EMAIL | Email addresses | "john.smith@email.com" |
| ADDRESS | Street addresses | "123 Main St" |
| ZIPCODE | ZIP codes | "12345-6789" |
| MRN | Medical record numbers | "MRN-2024-123456" |
| ACCOUNT_NUMBER | Account numbers | "ACCT: 789456123" |
| HEALTH_PLAN_ID | Insurance member IDs | "XYZ123456789" |
| CREDIT_CARD | Credit card numbers | "4111-1111-1111-1111" |
| IP | IP addresses | "192.168.1.100" |
| URL | Patient portal URLs | "https://portal.com/patient/123" |
| VIN | Vehicle identification | "1HGBH41JXMN109186" |
| LICENSE_PLATE | License plates | "ABC-1234" |
| AGE_90_PLUS | Ages 90 and over | "92 years old" |
| NPI/DEA | Provider identifiers | "1234567890" |

## Error Simulation

Realistic document degradation:

| Level | Description | Probability |
|-------|-------------|-------------|
| none | Clean data | 5% |
| low | Minor errors | 25% |
| medium | Realistic OCR | 40% |
| high | Heavy corruption | 25% |
| extreme | Severe degradation | 5% |

### Error Types
- **OCR substitutions**: O↔0, l↔1↔I, S↔5, B↔8, G↔6
- **Typos**: Adjacent key substitutions
- **Transpositions**: Character swaps
- **Case variations**: ALL CAPS, lowercase, MiXeD
- **Spacing**: Word merging/splitting
- **Deletions/Insertions**: Missing/duplicate characters

## Grading Schema

### Clinical-Grade Thresholds

PHI redaction is a **safety-critical application**. Grading reflects this:

| Metric | Excellent | Good | Acceptable | Poor | Failing |
|--------|-----------|------|------------|------|---------|
| Sensitivity | ≥99.5% | ≥98% | ≥95% | ≥90% | <90% |
| Specificity | ≥99% | ≥95% | ≥90% | ≥85% | <85% |
| Precision | ≥98% | ≥95% | ≥90% | ≥85% | <85% |

### Score Calculation

```
Score = (Sensitivity × 0.70) + (Specificity × 0.20) + (Precision × 0.10)
      + Penalties/Bonuses
```

**Penalties** (safety-critical failures):
- Missed SSN: -10 points each
- Missed Patient Name: -8 points each
- Missed DOB: -5 points each

**Bonuses** (perfect categories):
- Perfect SSN detection: +3 points
- Perfect Name detection: +3 points
- Perfect Date detection: +2 points

### Hard Caps

Sensitivity below threshold caps the maximum grade:
- <90% sensitivity → Max grade: F (score capped at 30)
- <95% sensitivity → Max grade: C (score capped at 70)
- <98% sensitivity → Max grade: A- (no cap)

### Grade Scale

| Score | Grade | Description |
|-------|-------|-------------|
| 97-100 | A+ | EXCELLENT - Production ready |
| 93-96 | A | VERY GOOD - Suitable for production |
| 90-92 | A- | GOOD - Acceptable with auditing |
| 87-89 | B+ | ABOVE AVERAGE - Needs improvement |
| 83-86 | B | AVERAGE - Significant improvements needed |
| 80-82 | B- | BELOW AVERAGE - Major issues |
| 77-79 | C+ | MARGINAL - Not for production |
| 73-76 | C | POOR - High leak risk |
| 70-72 | C- | VERY POOR - Very high leak risk |
| 60-69 | D | FAILING - Unsafe |
| <60 | F | CRITICAL FAILURE - Do not use |

## Output Files

Results saved to `tests/results/`:

### JSON File
```json
{
  "meta": { "timestamp": "...", "version": "3.0.0" },
  "engine": { "name": "...", "version": "..." },
  "metrics": {
    "sensitivity": 99.2,
    "specificity": 98.5,
    "precision": 97.8,
    "finalScore": 95,
    "grade": "A"
  },
  "failures": [...],
  "investigation": {
    "patterns": {...},
    "recommendations": [...]
  }
}
```

### Text Report
Human-readable report with:
- Final grade and score
- Confusion matrix
- Performance by PHI type
- Performance by error level
- Failure samples
- Critical findings
- Recommendations

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Run PHI Redaction Tests
  run: |
    npm run build
    node tests/master-suite/run.js --json-only > results.json
    
- name: Check Sensitivity Threshold
  run: |
    SENSITIVITY=$(jq '.metrics.sensitivity' results.json)
    if (( $(echo "$SENSITIVITY < 95" | bc -l) )); then
      echo "FAILED: Sensitivity ${SENSITIVITY}% below 95% threshold"
      exit 1
    fi
```

## Non-PHI Preservation

The suite also tests that non-PHI is NOT redacted:

- Hospital/facility names
- Provider names (in professional capacity)
- Medical diagnoses
- Procedures
- Medications
- Ages under 90
- Insurance company names

## Changelog

### v3.0.0 (Current)
- Complete redesign with unbiased testing methodology
- Clinical-grade strict grading schema
- Multi-pass analysis workflow (Detection → Grading → Investigation)
- Comprehensive medical document templates
- Complete PHI dataset generator
- Deep failure investigation with recommendations
- Machine-readable and human-readable output

### v2.0.0
- Initial master suite consolidation

### v1.x
- Individual test files (deprecated)
