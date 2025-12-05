<div align="center">

# VULPES CELARE

<img alt="Vulpes Celare Logo" src="https://github.com/user-attachments/assets/ebc320d1-ff4d-4610-b0de-7aad2a1da5cb" style="max-width: 400px; width: 100%;" />

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
| **Sensitivity** | 99.6% | PHI correctly identified |
| **Specificity** | 96-100% | Non-PHI correctly preserved |
| **Documents** | 7000+ | Synthetic adversarial documents |

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

The 99.6% sensitivity on synthetic data means approximately 0.4% of PHI may slip through. For many use cases, that requires human spot-checking or a double-pass workflow.

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
3. **OCR tolerance** - Handles common scan errors such as `O`↔`0`, `l`↔`1`, `S`↔`5`, `B`↔`8`, and `|`↔`l`.
4. **Span-based resolution** - When multiple filters detect overlapping regions, priority rules determine the winner.
5. **Rules over ML** - A deliberate choice for transparency, speed, and predictability. No GPU required, no cloud dependency.

---

## Performance by Data Quality

Real documents have errors. We test against them.

| Error Level | Sensitivity | What It Simulates |
|:-----------:|:-----------:|:------------------|
| **Clean** | 99.9% | Perfect digital text |
| **Low** | 99.8% | Minor typos and spacing issues |
| **Medium** | 99.7% | Light OCR artifacts |
| **High** | 98.5% | Heavy OCR corruption |
| **Extreme** | 97.2% | Worst-case scan quality |

**Clean data detection: 99.9%** - The engine performs well on properly formatted text. Performance degrades gracefully as corruption increases.

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
| `William` | `WiIlliam` | Detected |
| `Elizabeth` | `EIiz@beth` | Detected |

**Handled substitutions:** `O`↔`0`, `l`↔`1`↔`I`↔`|`, `S`↔`5`, `B`↔`8`, `g`↔`9`, `o`↔`0`, plus spacing variations.

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

## Vulpes Cortex: Self-Learning Test Intelligence

<div align="center">

*The engine learns. The tests remember. Every run makes the system smarter.*

</div>

Traditional testing tells you what failed. Vulpes Cortex tells you **why it failed, whether you've seen it before, and what actually worked last time**.

### The Problem with Traditional PHI Testing

Most test suites are stateless. Run 1,000 tests, get results, make changes, run again. But:

- Did that regex change actually help, or did it break something else?
- We fixed NAME detection last month—why is it failing the same way again?
- Which patterns keep recurring across hundreds of runs?

You end up making the same mistakes, trying the same fixes, and losing institutional knowledge every time someone new touches the code.

### How Cortex Changes This

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VULPES CORTEX ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│   │  Run Tests  │────▶│   Analyze   │────▶│   Record    │                  │
│   │  (200 docs) │     │  Patterns   │     │  to History │                  │
│   └─────────────┘     └─────────────┘     └──────┬──────┘                  │
│                                                  │                          │
│   ┌─────────────┐     ┌─────────────┐           │                          │
│   │   Consult   │◀────│    Learn    │◀──────────┘                          │
│   │   History   │     │  Over Time  │                                      │
│   └──────┬──────┘     └─────────────┘                                      │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │  "Last time we tried fuzzy matching for NAME, sensitivity   │          │
│   │   improved 2.3% but specificity dropped. The DICTIONARY_    │          │
│   │   MISS pattern has appeared 96 times across 12 runs."       │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Every test run feeds the knowledge base:**

| What Gets Recorded | Why It Matters |
|:-------------------|:---------------|
| Failure patterns | Know *why* things fail, not just *that* they failed |
| Intervention history | Never repeat a failed experiment |
| Metric trends | Catch regressions before they compound |
| Codebase state | Correlate filter changes with outcomes |

### Real Intelligence, Not Buzzwords

Cortex doesn't use machine learning to guess. It uses **bi-temporal tracking** to know exactly what was true at any point in time:

```
When did this pattern first appear?  →  t_occurred
When did we learn about it?          →  t_recorded  
When was this knowledge valid?       →  t_valid
```

This means you can ask: *"What did we know about NAME detection failures on March 15th, and what have we learned since?"*

### Industry-Standard Metrics

We measure what matters for PHI detection:

| Metric | What It Tells You |
|:------:|:------------------|
| **Sensitivity** | Did we catch all the PHI? (Miss rate = HIPAA risk) |
| **Specificity** | Did we avoid over-redacting? (False positives = unusable documents) |
| **MCC** | Single best metric for imbalanced classification |
| **F1 Score** | Harmonic balance of precision and recall |

Every run calculates all of these, tracks trends, and alerts on regressions.

### MCP Integration: Plug Into Any LLM

Cortex exposes itself via the **Model Context Protocol (MCP)**—the emerging standard for AI tool integration:

```bash
# Start the MCP server
node tests/master-suite/cortex/mcp/server.js

# Cortex provides:
# - 16 tools (analyze, compare, record, rollback...)
# - 8 prompts (debug failures, plan experiments, status reports...)
# - Auto-handshake with any MCP-compatible client
```

**The key insight:** The MCP server provides **data and context**. The LLM provides **reasoning and decisions**. Cortex doesn't pretend to think—it remembers, correlates, and serves up exactly what the LLM needs to make informed recommendations.

### A/B Experiments with Auto-Rollback

Test changes safely:

```javascript
// Snapshot current documents
const snapshot = cortex.createSnapshot(documents);

// Make your filter change
// ...

// Compare before/after on IDENTICAL documents
const comparison = cortex.compare(baselineResults, treatmentResults);

// Automatic rollback if sensitivity drops >1%
if (comparison.verdict === 'MAJOR_REGRESSION') {
  cortex.rollback(snapshot.id);
}
```

No more "I think this helped" uncertainty. Measure. Compare. Know.

### Running the Test Suite

```bash
# Basic run with Cortex analysis
node tests/master-suite/run.js --count 200 --cortex

# Full report with insights
node tests/master-suite/run.js --count 200 --cortex --cortex-report

# What you'll see:
# ✓ Sensitivity: 96.4%
# ✓ Top failure pattern: DICTIONARY_MISS (96 occurrences)
# ✓ Trend: IMPROVING over last 5 runs
# ✓ Recommendation: Focus on NAME dictionary coverage
```

### What Makes This Different

| Traditional Testing | Vulpes Cortex |
|:-------------------:|:-------------:|
| Stateless | Remembers everything |
| "Test passed/failed" | "Why, and have we seen this before?" |
| Manual analysis | Pattern recognition built-in |
| Hope changes helped | Measure changes with A/B experiments |
| Knowledge in people's heads | Knowledge in the system |

---

## Validation and Testing

We encourage independent validation. To help test:

```bash
git clone https://github.com/anthropics/vulpes-celare
cd vulpes-celare
npm install
npm run build
npm test  # Runs comprehensive synthetic test suite

# Run with Cortex intelligence
node tests/master-suite/run.js --count 200 --cortex
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
> This software is experimental. The metrics reported (99.6% sensitivity, 100% specificity) are based on author-performed testing using 7000+ programmatically generated synthetic documents. These results have not been independently verified or tested against real clinical data.

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

## Community Standards

- Read the [Code of Conduct](CODE_OF_CONDUCT.md) before participating in discussions or contributions.
- Report vulnerabilities through the [Security Policy](SECURITY.md); avoid sharing real PHI in any issue.
- File issues using the provided templates (bug reports or feature requests) to ensure we have the context we need.
- Submit pull requests with the template checklist to document testing and avoid accidental PHI leaks.

---

<div align="center">

**Built for transparency. Requires validation. Welcomes collaboration.**

</div>
