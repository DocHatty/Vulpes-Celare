# Validation Methodology

This document describes how Vulpes Celare's accuracy metrics are generated and how the validation corpus is constructed. The goal is reproducibility: anyone should be able to verify our claims independently.

## The Validation Problem

Clinical de-identification research has historically relied on the i2b2 2014 De-identification Challenge corpus as the primary benchmark. However, access to this corpus requires institutional affiliation, CITI ethics training, and approval through Harvard DBMI's Data Use Agreement process—barriers that exclude many independent developers, international researchers, and smaller organizations.

More fundamentally, the i2b2 2014 corpus represents a snapshot of clinical documentation patterns from over a decade ago. Modern clinical text includes telehealth transcripts, automated EHR boilerplate, and terminology (COVID-19, mRNA, etc.) that simply don't exist in that corpus. Validating exclusively against i2b2 risks overfitting to legacy documentation styles.

## Our Approach: Composite Validation Schema

Vulpes Celare uses a multi-source validation strategy that addresses both the access problem and the generalization problem:

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMPOSITE VALIDATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐   ┌─────────────────┐   ┌──────────────┐ │
│   │  PHI Injection  │   │   Synthetic     │   │  Baseline    │ │
│   │  Corpus         │   │   Generation    │   │  Comparison  │ │
│   │                 │   │                 │   │              │ │
│   │  MTSamples +    │   │  Faker-based    │   │  Presidio    │ │
│   │  Clinical       │   │  PHI with       │   │  Google DLP  │ │
│   │  Templates      │   │  known ground   │   │  Manual      │ │
│   │                 │   │  truth          │   │  Review      │ │
│   └─────────────────┘   └─────────────────┘   └──────────────┘ │
│                                                                 │
│   Ground Truth: KNOWN        Ground Truth: KNOWN    Reference  │
│   (injection offsets)        (generation metadata)  Standard   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Pillar 1: PHI Injection Corpus

### Methodology

The PHI injection approach takes real clinical text (already de-identified or naturally PHI-free) and programmatically inserts synthetic PHI at known locations. Because we control the injection, we have perfect ground truth.

### Source Text

Primary source: Clinical document templates and transcription samples covering 40+ medical specialties. These provide linguistic diversity—the writing patterns of an orthopedic operative report differ substantially from a psychiatric progress note.

### Injection Process

```typescript
// Simplified injection logic (actual implementation in tests/master-suite/generators/phi.js)

interface InjectionSite {
  pattern: RegExp;
  phiType: PHIType;
  generator: () => string;
}

const injectionSites: InjectionSite[] = [
  {
    pattern: /\b(patient|pt\.?|the individual)\b/i,
    phiType: 'NAME',
    generator: () => faker.person.fullName()
  },
  {
    pattern: /\b(admitted|seen|evaluated)\s+(on|at)\b/i,
    phiType: 'DATE',
    generator: () => faker.date.recent().toLocaleDateString()
  },
  {
    pattern: /\b(address|residence|lives at)\b/i,
    phiType: 'ADDRESS',
    generator: () => faker.location.streetAddress({ useFullAddress: true })
  },
  // ... 18+ injection patterns for all HIPAA types
];

function injectPHI(text: string): { injectedText: string; groundTruth: Annotation[] } {
  const annotations: Annotation[] = [];
  let result = text;
  let offset = 0;

  for (const site of injectionSites) {
    const matches = [...result.matchAll(new RegExp(site.pattern, 'gi'))];
    for (const match of matches) {
      const phi = site.generator();
      const insertPos = match.index! + match[0].length + offset;
      
      // Insert PHI after the pattern
      result = result.slice(0, insertPos) + ' ' + phi + result.slice(insertPos);
      
      // Record ground truth
      annotations.push({
        start: insertPos + 1,
        end: insertPos + 1 + phi.length,
        type: site.phiType,
        text: phi
      });
      
      offset += phi.length + 1;
    }
  }

  return { injectedText: result, groundTruth: annotations };
}
```

### Ground Truth Format

Every injected document produces a sidecar annotation file:

```json
{
  "documentId": "mtsamples-ortho-0042",
  "sourceCorpus": "mtsamples",
  "specialty": "Orthopedic",
  "injectionTimestamp": "2024-12-06T15:30:00Z",
  "annotations": [
    {
      "start": 45,
      "end": 57,
      "type": "NAME",
      "text": "John Smith",
      "subtype": "PATIENT_NAME"
    },
    {
      "start": 123,
      "end": 133,
      "type": "DATE",
      "text": "03/15/2024",
      "subtype": "ADMISSION_DATE"
    },
    {
      "start": 456,
      "end": 467,
      "type": "SSN",
      "text": "123-45-6789",
      "subtype": null
    }
  ],
  "injectionConfig": {
    "phiDensity": "high",
    "ambiguityLevel": "standard",
    "seed": 42
  }
}
```

### Adversarial Injection

To stress-test the system, we include deliberately ambiguous PHI:

| Ambiguity Type | Example | Challenge |
|----------------|---------|-----------|
| Name/Month | "April Johnson" | "April" is both a name and month |
| Name/Medication | "Rose Thompson" | "Rose" could be the flower |
| Name/Location | "Florence Martinez" | "Florence" is also a city |
| Date/Measurement | "3/4 strength" | Looks like a date |
| Number/Identifier | "A1C of 7.2" | Could be confused with ID patterns |

The generator includes a configurable `ambiguityLevel` parameter that controls the frequency of these edge cases.

## Pillar 2: Synthetic Generation

### Purpose

While PHI injection tests detection accuracy, synthetic generation tests the system against novel document structures and modern clinical patterns.

### Generator Framework

Located in `tests/master-suite/documents/`:

```javascript
// templates.js - Clinical document templates
const TEMPLATES = {
  dischargeNote: {
    sections: ['CHIEF_COMPLAINT', 'HPI', 'ASSESSMENT', 'PLAN'],
    phiDensity: 'high',
    averageLength: 1500
  },
  radiologyReport: {
    sections: ['CLINICAL_HISTORY', 'TECHNIQUE', 'FINDINGS', 'IMPRESSION'],
    phiDensity: 'medium',
    averageLength: 400
  },
  // ... 15+ document types
};

// phi-generator.js - Synthetic PHI with known ground truth
class PHIGenerator {
  constructor(seed) {
    this.rng = new SeededRandom(seed);
    this.annotations = [];
  }

  generateName(type = 'patient') {
    const name = this.rng.choice(FIRST_NAMES) + ' ' + this.rng.choice(LAST_NAMES);
    this.annotations.push({ type: 'NAME', subtype: type, text: name });
    return name;
  }

  generateSSN() {
    const ssn = `${this.rng.int(100,999)}-${this.rng.int(10,99)}-${this.rng.int(1000,9999)}`;
    this.annotations.push({ type: 'SSN', text: ssn });
    return ssn;
  }

  // ... generators for all 18+ PHI types
}
```

### Reproducibility

All generators use seeded randomness. Given the same seed, the same corpus is produced:

```bash
# Generate test corpus with seed 42
npm run generate-corpus -- --seed 42 --count 1000

# Will always produce identical output
```

## Pillar 3: Baseline Comparison

### Microsoft Presidio Benchmark

Presidio is the industry-standard open-source PII detection library. We run our test corpus through both Vulpes Celare and Presidio, comparing:

```typescript
interface ComparisonResult {
  document: string;
  
  vulpesResults: {
    detected: Annotation[];
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    f1: number;
  };
  
  presidioResults: {
    detected: Annotation[];
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    f1: number;
  };
  
  agreement: {
    bothDetected: Annotation[];      // TP for both
    vulpesOnly: Annotation[];        // Vulpes detected, Presidio missed
    presidioOnly: Annotation[];      // Presidio detected, Vulpes missed
    bothMissed: Annotation[];        // FN for both
  };
}
```

### Google Cloud DLP (Optional)

For users who want commercial-grade comparison, we provide scripts to run samples through Google Cloud DLP:

```bash
# Requires GOOGLE_APPLICATION_CREDENTIALS
npm run benchmark-gdlp -- --sample-size 100
```

## Metrics Calculation

### Definitions

| Metric | Formula | Interpretation |
|--------|---------|----------------|
| **Sensitivity (Recall)** | TP / (TP + FN) | What fraction of actual PHI did we find? |
| **Specificity** | TN / (TN + FP) | What fraction of non-PHI did we correctly ignore? |
| **Precision (PPV)** | TP / (TP + FP) | What fraction of our detections were correct? |
| **F1 Score** | 2 × (P × R) / (P + R) | Harmonic mean of precision and recall |

### Matching Logic

A detection is considered a **true positive** if:

1. **Span overlap**: Detection overlaps with ground truth by ≥50%
2. **Type match**: Detection type matches ground truth type (with type hierarchy)

```typescript
function isMatch(detection: Span, groundTruth: Span): boolean {
  const overlapStart = Math.max(detection.start, groundTruth.start);
  const overlapEnd = Math.min(detection.end, groundTruth.end);
  const overlapLength = Math.max(0, overlapEnd - overlapStart);
  
  const groundTruthLength = groundTruth.end - groundTruth.start;
  const overlapRatio = overlapLength / groundTruthLength;
  
  if (overlapRatio < 0.5) return false;
  
  return typeMatches(detection.type, groundTruth.type);
}

function typeMatches(detected: string, expected: string): boolean {
  // Exact match
  if (detected === expected) return true;
  
  // Hierarchy match (NAME matches PATIENT_NAME, DOCTOR_NAME, etc.)
  const hierarchy: Record<string, string[]> = {
    'NAME': ['PATIENT_NAME', 'DOCTOR_NAME', 'FAMILY_NAME'],
    'DATE': ['DOB', 'ADMISSION_DATE', 'DISCHARGE_DATE'],
    'IDENTIFIER': ['SSN', 'MRN']
  };
  
  for (const [parent, children] of Object.entries(hierarchy)) {
    if (detected === parent && children.includes(expected)) return true;
  }
  
  return false;
}
```

## Test Execution

### Running the Full Suite

```bash
# Full validation suite (7000+ test cases)
npm run test:validation

# Strict mode (fails on any threshold miss)
npm run test:strict

# Generate detailed report
npm run test:validation -- --report
```

### Output Format

```
================================================================================
VULPES CELARE VALIDATION REPORT
Generated: 2024-12-06T16:00:00Z
Corpus Version: 2.1.0
Engine Version: 1.0.0
================================================================================

CORPUS SUMMARY
  Total Documents:     7,234
  Total PHI Elements:  89,456
  PHI Types Tested:    22

OVERALL METRICS
  Sensitivity:         99.2% (88,741 / 89,456)
  Specificity:         96.4%
  Precision:           97.8%
  F1 Score:            98.5%

BY PHI TYPE
  ┌─────────────────────┬────────────┬───────────┬──────────┐
  │ Type                │ Sensitivity│ Precision │ F1       │
  ├─────────────────────┼────────────┼───────────┼──────────┤
  │ NAME                │ 99.6%      │ 98.2%     │ 98.9%    │
  │ DATE                │ 99.8%      │ 99.1%     │ 99.4%    │
  │ SSN                 │ 100.0%     │ 100.0%    │ 100.0%   │
  │ ADDRESS             │ 98.9%      │ 96.8%     │ 97.8%    │
  │ PHONE               │ 99.9%      │ 99.7%     │ 99.8%    │
  │ EMAIL               │ 100.0%     │ 100.0%    │ 100.0%   │
  │ MRN                 │ 99.4%      │ 98.9%     │ 99.1%    │
  │ ...                 │ ...        │ ...       │ ...      │
  └─────────────────────┴────────────┴───────────┴──────────┘

PRESIDIO COMPARISON (n=1000 sample)
  ┌─────────────────────┬────────────────┬──────────────┬─────────┐
  │ Metric              │ Vulpes Celare  │ Presidio     │ Delta   │
  ├─────────────────────┼────────────────┼──────────────┼─────────┤
  │ Sensitivity         │ 99.2%          │ 94.1%        │ +5.1%   │
  │ Precision           │ 97.8%          │ 91.8%        │ +6.0%   │
  │ F1 Score            │ 98.5%          │ 92.9%        │ +5.6%   │
  └─────────────────────┴────────────────┴──────────────┴─────────┘

FALSE NEGATIVE ANALYSIS
  Total Misses: 715 (0.8% of PHI)
  
  By Category:
    Ambiguous names (April, Rose, etc.):     312 (43.6%)
    Complex addresses (apt/suite formats):   198 (27.7%)
    Unusual date formats:                     89 (12.4%)
    Other:                                   116 (16.2%)

================================================================================
```

## Clinical Utility Preservation

De-identification must balance PHI removal against clinical information preservation. Aggressive over-scrubbing destroys the utility of the text.

### Measurement

We measure clinical utility preservation by:

1. Running a medical NER model (e.g., SciSpacy, OpenMed) on text before de-identification
2. Running the same model after de-identification
3. Comparing entity counts

```typescript
interface UtilityMetrics {
  diseasesBeforeDeid: string[];
  diseasesAfterDeid: string[];
  diseaseRetention: number;  // Should be ~100%

  medicationsBeforeDeid: string[];
  medicationsAfterDeid: string[];
  medicationRetention: number;  // Should be ~100%

  proceduresBeforeDeid: string[];
  proceduresAfterDeid: string[];
  procedureRetention: number;  // Should be ~100%
}
```

### Target: Zero Clinical Information Loss

A de-identification system should **never** redact:
- Disease names (even when they look like names: "Parkinson", "Huntington")
- Medication names (even when they look like names: "Flomax", "Prozac")  
- Anatomical terms
- Lab values and vital signs
- Procedure names

Our false positive analysis specifically tracks clinical information that was incorrectly redacted.

## Limitations and Caveats

### What This Validation Does NOT Prove

1. **Performance on your specific data**: Clinical documentation varies by institution, specialty, and EHR system. Pilot testing on representative samples from your environment is essential.

2. **Exhaustive PHI detection**: No system achieves 100% sensitivity. Manual review remains appropriate for high-risk disclosures.

3. **Regulatory compliance**: Validation metrics support but do not guarantee HIPAA Safe Harbor compliance. Consult legal counsel.

### Known Weaknesses

| Weakness | Mitigation |
|----------|------------|
| Novel name patterns not in dictionary | Phonetic matching, context scoring |
| Addresses without street keywords | Geographic database lookup |
| Non-standard date formats | Configurable date parsing |
| Non-English text | Limited support; English-focused |

## Reproducing Our Results

```bash
# Clone the repository
git clone https://github.com/DocHatty/Vulpes-Celare.git
cd Vulpes-Celare

# Install dependencies
npm install
npm run native:install
npm run native:build

# Generate test corpus (deterministic with seed)
npm run generate-corpus -- --seed 42

# Run validation
npm run test:validation

# Compare against Presidio
npm run benchmark-presidio

# Generate full report
npm run test:validation -- --report --output validation-report.md
```

## References

- Stubbs, A., & Uzuner, Ö. (2015). Annotating longitudinal clinical narratives for de-identification: The 2014 i2b2/UTHealth corpus. *Journal of Biomedical Informatics*, 58, S20-S29.
- South, B. R., et al. (2014). Evaluating the effects of machine pre-annotation and an interactive annotation interface on manual de-identification of clinical text. *Journal of Biomedical Informatics*, 50, 162-172.
- Johnson, A. E., et al. (2016). MIMIC-III, a freely accessible critical care database. *Scientific Data*, 3, 160035.
- Microsoft Presidio Documentation: https://microsoft.github.io/presidio/
- HIPAA De-identification Guidance: https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/
