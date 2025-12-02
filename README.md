<div align="center">

# VULPES CELARE

<img width="1024" height="1024" alt="image" src="https://github.com/user-attachments/assets/ebc320d1-ff4d-4610-b0de-7aad2a1da5cb" />

**An open, inspectable HIPAA PHI redaction engine for clinical text.**

---

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-Source%20Available-4B32C3?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Experimental-orange?style=for-the-badge)

</div>

---

<div align="center">

### Current Performance (Synthetic Testing)

| Metric | Score | Notes |
|:------:|:-----:|:------|
| **Sensitivity** | 98.4% | PHI correctly identified |
| **Specificity** | 100% | No false positives |
| **Documents** | 510 | Synthetic medical documents |

<sub>Tested on programmatically generated documents with varying OCR corruption levels. Real-world performance requires independent validation.</sub>

</div>

---

## Motivation

Clinical text - reports, consult notes, care coordination messages - is invaluable for education, research, and tool development. Yet safely sharing it remains a persistent challenge. Existing de-identification solutions tend to be:

- **Opaque** - Black-box SaaS offerings where you cannot inspect what is happening to your data
- **Generic** - Not tuned to the specific vocabulary and patterns of medical documentation
- **Difficult to integrate** - Heavyweight systems that do not fit modern development workflows

Vulpes Celare is an attempt to build something different: an open, inspectable redaction engine that is:

- **Tailored to US healthcare formats** - SSNs, MRNs, provider credentials, and the "LASTNAME, FIRSTNAME" conventions
- **Written in TypeScript** - Easy to embed in Node.js pipelines, APIs, or browser-based tools
- **Explicit about its limitations** - Experimental status, synthetic-only testing, and the need for community validation

This project exists because the problem is worth solving correctly, and the best way to get there is through transparency and collaboration.

---

## What This Is (and What It Is Not)

**This is:**
- A first-pass redaction tool for pre-screening clinical text
- A research and prototyping utility for developers working with medical documents
- An open, hackable codebase you can inspect, modify, and extend
- A starting point that needs community validation

**This is not:**
- A compliance certification or HIPAA guarantee
- A replacement for human review in high-stakes scenarios
- Production-ready for unsupervised de-identification
- Validated on real clinical data (yet)

The 98.4% sensitivity on synthetic data means approximately 1.6% of PHI may slip through. For many use cases, that requires human spot-checking or a double-pass workflow.

---

## Quick Start

```typescript
import { VulpesCelare } from 'vulpes-celare';

// Simple redaction
const redacted = await VulpesCelare.redact(clinicalNote);

// With metrics
const engine = new VulpesCelare();
const result = await engine.process(clinicalNote);

console.log(result.text);            // Redacted document
console.log(result.redactionCount);  // PHI elements found
console.log(result.executionTimeMs); // Processing time (~2–3ms per document)
```

---

## How It Works

Vulpes Celare uses a parallel filter architecture with span-based detection:

```
                        ┌─────────────────────┐
                        │    VulpesCelare     │
                        │  (Main Orchestrator)│
                        └──────────┬──────────┘
                                   │
                                   ▼
                     ┌─────────────────────────┐
                     │ ParallelRedactionEngine │
                     │  (26 Concurrent Filters)│
                     └─────────────┬───────────┘
                                   │
           ┌───────────┬───────────┼───────────┬───────────┐
           ▼           ▼           ▼           ▼           ▼
      ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
      │  Name   │ │   SSN   │ │  Date   │ │  Phone  │ │   ...   │
      │ Filter  │ │ Filter  │ │ Filter  │ │ Filter  │ │ Filters │
      └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘
           │           │           │           │           │
           └───────────┴───────────┴───────────┴───────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   Span Resolution   │
                        │ (Priority & Overlap)│
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   Redacted Output   │
                        └─────────────────────┘
```

**Key design decisions:**

1. **26 specialized filters** - Each PHI type (names, SSNs, dates, phones, etc.) has dedicated detection logic rather than a single monolithic model.
2. **Context awareness** - Distinguishes "Dr. Wilson" (a person) from "Wilson's disease" (a medical term) using a vocabulary of over 10,000 medical terms.
3. **OCR tolerance** - Handles common scan errors such as `O`↔`0`, `l`↔`1`, `S`↔`5`, and `B`↔`8`.
4. **Span-based resolution** - When multiple filters detect overlapping regions, priority rules determine the winner.
5. **Rules over ML** - A deliberate choice for transparency, speed, and predictability. No GPU required, no cloud dependency.

---

## Performance by Data Quality

Real documents have errors. We test against them.

| Error Level | Sensitivity | What It Simulates |
|:-----------:|:-----------:|:------------------|
| **Clean** | 99.7% | Perfect digital text |
| **Low** | 98.8% | Minor typos and spacing issues |
| **Medium** | 98.9% | Light OCR artifacts |
| **High** | 95.8% | Heavy OCR corruption |
| **Extreme** | 94.5% | Worst-case scan quality |

**Clean data detection: 99.7%** - The engine performs well on properly formatted text. Performance degrades gracefully as corruption increases.

---

## Filter Coverage

### Identity and Names
| Filter | Handles | Example Patterns |
|--------|---------|------------------|
| TitledNameFilter | Prefixed names | `Dr. Sarah Chen`, `Mr. John Smith` |
| FormattedNameFilter | Standard formats | `SMITH, JOHN`, `Smith, John Ann` |
| CredentialNameFilter | Names with suffixes | `Robert Williams, MD, PhD`, `Jane Doe, RN` |
| FamilyNameFilter | Relationship contexts | `Daughter: Emma`, `Emergency Contact: Mary` |

### Government and Medical IDs
| Filter | Handles | Example Patterns |
|--------|---------|------------------|
| SSNFilter | Social Security Numbers | `123-45-6789`, `123 45 6789` |
| MRNFilter | Medical Record Numbers | `MRN: 7834921`, `Chart #12345` |
| NPIFilter | Provider NPIs | `NPI: 1234567890` |
| MedicareFilter | Medicare and Medicaid IDs | `1EG4-TE5-MK72` |

### Contact Information
| Filter | Handles | Example Patterns |
|--------|---------|------------------|
| PhoneFilter | Phone numbers | `(555) 123-4567`, `555.123.4567`, `+1 555 123 4567` |
| EmailFilter | Email addresses | `patient@email.com`, `dr.smith@hospital.org` |
| AddressFilter | Street addresses | `123 Main St, Boston, MA` |
| ZipCodeFilter | ZIP codes | `02101`, `02101-1234` |

### Dates and Financial
| Filter | Handles | Example Patterns |
|--------|---------|------------------|
| DateFilter | All date formats | `03/15/1980`, `March 15, 2024`, `15-Mar-24` |
| AgeOver89Filter | Ages 90 and above (HIPAA requirement) | `92-year-old`, `age: 95` |
| CreditCardFilter | Credit cards (Luhn validated) | `4111-1111-1111-1111` |

---

## OCR Error Handling

Scanned documents introduce predictable errors. We pattern-match against them.

| Original | Corrupted Version | Status |
|:--------:|:-----------------:|:------:|
| `03/15/1980` | `O3/l5/198O` | Detected |
| `123-45-6789` | `l23-45-67B9` | Detected |
| `(555) 123-4567` | `(5S5) l23-4567` | Detected |
| `Smith, John` | `Smith, J0hn` | Detected |

**Handled substitutions:** `O`↔`0`, `l`↔`1`↔`I`↔`|`, `S`↔`5`, `B`↔`8`, plus spacing variations.

---

## Integration Examples

### Express Middleware

```typescript
import { VulpesCelare } from 'vulpes-celare';

app.use('/api/notes', async (req, res, next) => {
  if (req.body.clinicalNote) {
    req.body.clinicalNote = await VulpesCelare.redact(req.body.clinicalNote);
  }
  next();
});
```

### Batch Processing

```typescript
const engine = new VulpesCelare();
const results = await engine.processBatch(documents);
// Average: 2–3ms per document
```

### With Human Review Workflow

```typescript
const engine = new VulpesCelare();
const result = await engine.process(document);

if (result.redactionCount > 0) {
  // Queue for human verification
  await queueForReview({
    original: document,
    redacted: result.text,
    phiCount: result.redactionCount,
    breakdown: result.breakdown
  });
}
```

---

## Known Limitations

| Area | Limitation |
|------|------------|
| **Language** | English only; US medical terminology |
| **Formats** | US-centric patterns (SSN, phone, address) |
| **Validation** | Synthetic data only; no real EHR testing |
| **Edge Cases** | Names with heavy OCR corruption (e.g., `Char1e5` for `Charles`) |
| **Scale** | Not tested on datasets exceeding 100,000 documents |
| **Ambiguity** | Some common words used as names may be missed |

---

## Comparison to Alternatives

| Tool | Approach | Pros | Cons |
|------|----------|------|------|
| **Vulpes Celare** | Rules + vocabulary | Fast, local, inspectable, OCR-tolerant | Synthetic-only validation; US-focused |
| **Microsoft Presidio** | Rules + ML | Mature; multi-language support | Heavier setup; less medical-specific |
| **AWS Comprehend Medical** | Cloud ML | High accuracy; actively maintained | Requires BAA; sends data externally |
| **Google Cloud DLP** | Cloud ML | Broad coverage | Cost; cloud dependency |

Vulpes Celare occupies a specific niche: **local-first, TypeScript-native, healthcare-specific, and fully inspectable**.

---

## Validation and Testing

We encourage independent validation. To help test:

```bash
git clone https://github.com/anthropics/vulpes-celare
cd vulpes-celare
npm install
npm run build
npm test  # Runs comprehensive synthetic test suite
```

**We especially welcome:**
- Testing on new document types
- False positive and false negative reports with de-identified examples
- Performance benchmarks on larger datasets
- International format contributions

---

## Important Notices

> **Experimental Status**
>
> This software is experimental. The metrics reported (98.4% sensitivity, 100% specificity) are based on author-performed testing using 510 programmatically generated synthetic documents. These results have not been independently verified or tested against real clinical data.

> **Not a Compliance Solution**
>
> HIPAA compliance is organizational, not just technical. De-identification requires policies, procedures, training, risk assessment, and often human review workflows. This tool is one component, not a complete solution.

> **No Real Patient Data**
>
> No real patient data, hospital resources, or Protected Health Information was used in development or testing. All test documents are entirely synthetic.

---

## License

Source Available License - See [LICENSE](LICENSE) for details.

- **Personal and Educational Use:** Permitted
- **Research and Academic Use:** Permitted  
- **Commercial Use:** Requires written permission

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

<div align="center">

**Built for transparency. Requires validation. Welcomes collaboration.**

</div>
