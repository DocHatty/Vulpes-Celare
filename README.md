<div align="center">

# VULPES CELARE

<img width="1024" height="1024" alt="Vulpes Celare Logo" src="https://github.com/user-attachments/assets/6ce29f86-e17e-40b0-abca-77431fcfe319" />

**A precision HIPAA PHI redaction engine built for the real world.**

---

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-Source%20Available-4B32C3?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Beta-blue?style=for-the-badge)

</div>

---

<div align="center">

### Performance at a Glance

| Metric | Score | Documents Tested |
|:------:|:-----:|:----------------:|
| **Sensitivity** | 96.4% | 510 |
| **Specificity** | 100% | 510 |
| **Grade** | **A** | — |

<sub>Tested across 510 synthetic medical documents including progress notes, lab reports, radiology reports, discharge summaries, prescriptions, operative reports, and more — with varying levels of OCR corruption, typos, and formatting errors.</sub>

</div>

---

## The Problem

Clinical text is gold. Research depends on it. AI training needs it. Quality improvement requires it.

But sharing it? That's where things get complicated.

**PHI is everywhere.** Names buried in narratives. Dates scattered across timestamps. Phone numbers hiding in follow-up instructions. One missed redaction and you've got a HIPAA violation.

Existing solutions are either:
- **Black boxes** — SaaS platforms where your data disappears into someone else's servers
- **Outdated** — Rule-based systems from 2010 that miss modern patterns
- **Overfit** — ML models that hallucinate redactions or miss obvious PHI
- **Expensive** — Enterprise pricing that locks out researchers and small clinics

---

## The Solution

Vulpes Celare is different.

```typescript
import { VulpesCelare } from 'vulpes-celare';

const result = await VulpesCelare.redact(medicalDocument);
// That's it. PHI gone. Document intact.
```

**What makes it work:**

- **26 parallel filters** — Each PHI type has its own specialized detector
- **Context-aware** — Knows "Dr. Wilson" is a person, "Wilson's disease" is not
- **OCR-tolerant** — Handles `O` → `0`, `l` → `1`, `S` → `5` and other scan errors
- **Medical vocabulary** — 10,000+ terms it knows not to redact
- **Span-based architecture** — Overlapping detections resolve intelligently

---

## Real-World Performance

We don't just test on clean data. We test on *messy* data.

<div align="center">

| Error Level | Detection Rate | Description |
|:-----------:|:--------------:|:------------|
| **Clean** | 98.9% | Perfect formatting |
| **Low** | 96.0% | Minor typos |
| **Medium** | 97.6% | OCR artifacts |
| **High** | 92.5% | Heavy corruption |
| **Extreme** | 89.1% | Worst-case scenarios |

</div>

**What we catch:**
- Names in every format: `SMITH, JOHN` · `Dr. Jane Doe` · `smith, john` · `John A. Smith, MD, PhD`
- Dates with OCR errors: `03/15/1980` · `O3/l5/198O` · `03/15/ 1980`
- Phone variants: `(555) 123-4567` · `555.123.4567` · `+1 555 123 4567`
- SSNs with corruption: `123-45-6789` · `123--45-6789` · `123-4 5-6789`
- Emails, addresses, MRNs, DEA numbers, and 14 other identifier types

---

## Quick Start

### Installation

```bash
npm install vulpes-celare
```

### Basic Usage

```typescript
import { VulpesCelare } from 'vulpes-celare';

// One-liner redaction
const redacted = await VulpesCelare.redact(text);

// With full metrics
const engine = new VulpesCelare();
const result = await engine.process(text);

console.log(result.text);           // Redacted document
console.log(result.spansRedacted);  // PHI elements found
console.log(result.processingTime); // Speed (typically 2-4ms/doc)
```

### Express Middleware

```typescript
app.use(async (req, res, next) => {
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
// 3ms per document average
```

---

## Architecture

```
                        ┌─────────────────────┐
                        │    VulpesCelare     │
                        │  (Main Orchestrator)│
                        └──────────┬──────────┘
                                   │
                                   ▼
                     ┌─────────────────────────┐
                     │ ParallelRedactionEngine │
                     │   (26 Concurrent Filters)│
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

---

## Filter Coverage

### Identity & Names
| Filter | Detects | Example |
|--------|---------|---------|
| **TitledNameFilter** | Names with prefixes | `Dr. Sarah Chen`, `Mr. John Smith` |
| **FormattedNameFilter** | Standard name formats | `SMITH, JOHN`, `Jane Doe` |
| **CredentialNameFilter** | Names with suffixes | `Robert Williams, MD, PhD` |
| **FamilyNameFilter** | Relationship contexts | `Daughter: Emma`, `Wife: Mary` |

### Government & Medical IDs
| Filter | Detects | Example |
|--------|---------|---------|
| **SSNFilter** | Social Security Numbers | `123-45-6789` |
| **MRNFilter** | Medical Record Numbers | `MRN: 7834921` |
| **DEAFilter** | DEA Numbers | `AB1234567` |
| **NPIFilter** | Provider NPIs | `1234567890` |
| **MedicareFilter** | Medicare IDs | `1EG4-TE5-MK72` |

### Contact Information
| Filter | Detects | Example |
|--------|---------|---------|
| **PhoneFilter** | Phone numbers | `(555) 123-4567`, `+1 555.123.4567` |
| **EmailFilter** | Email addresses | `doctor@hospital.org` |
| **AddressFilter** | Street addresses | `123 Main St, Boston, MA 02101` |
| **ZipCodeFilter** | ZIP codes | `02101`, `02101-1234` |

### Dates & Times
| Filter | Detects | Example |
|--------|---------|---------|
| **DateFilter** | All date formats | `03/15/1980`, `March 15, 2024`, `15-Mar-2024` |
| **AgeOver89Filter** | Ages 90+ | `92-year-old`, `age 95` |

### Financial & Technical
| Filter | Detects | Example |
|--------|---------|---------|
| **CreditCardFilter** | Credit cards (Luhn validated) | `4111-1111-1111-1111` |
| **IPAddressFilter** | IP addresses | `192.168.1.1`, `2001:db8::1` |
| **VehicleFilter** | VINs & plates | `1HGCM82633A123456` |

---

## OCR Error Tolerance

Real documents are scanned. Scans have errors. We handle them.

<div align="center">

| Original | Corrupted | Detected? |
|:--------:|:---------:|:---------:|
| `03/15/1980` | `O3/l5/198O` | ✅ |
| `123-45-6789` | `123--45-6789` | ✅ |
| `(555) 123-4567` | `(5S5) l23-4567` | ✅ |
| `Smith, John` | `smith, john` | ✅ |
| `Dr. Wilson` | `Dr.Wilson` | ✅ |

</div>

**Supported OCR substitutions:**
- `O` ↔ `0` (letter O / zero)
- `l` ↔ `1` ↔ `I` ↔ `|` (lowercase L / one / capital I / pipe)
- `S` ↔ `s` ↔ `5` (letter S / five)
- `B` ↔ `8` (letter B / eight)
- Space insertion/deletion
- Double-character errors

---

## Important Notices

> **Testing Methodology**
>
> All metrics are based on 510 programmatically-generated synthetic medical documents. Test documents include 10 different document types (progress notes, lab reports, radiology reports, discharge summaries, emergency notes, operative reports, prescriptions, consultation notes, nursing assessments, and pathology reports) with five error levels (none, low, medium, high, extreme) simulating real-world OCR and formatting issues.
>
> **These results have not been independently verified against real clinical data.**

> **No Real Patient Data**
>
> No real patient data, hospital resources, or Protected Health Information was used in the development or testing of this software. All test documents are entirely synthetic.

> **Not a Compliance Guarantee**
>
> This software is a tool, not a compliance certification. HIPAA compliance requires organizational policies, procedures, training, and technical safeguards beyond any single piece of software. Always validate independently before production use.

---

## Known Limitations

| Limitation | Details |
|------------|---------|
| **Language** | English only (US medical terminology) |
| **Formats** | US-centric (SSN, phone, address patterns) |
| **Extreme OCR** | 4+ character substitutions may be missed |
| **Ambiguous Names** | Some edge cases with common words as names |
| **Scale Testing** | Not yet tested on 100K+ document sets |

---

## Roadmap

- [ ] Multi-language support
- [ ] International format detection
- [ ] Custom filter plugins
- [ ] Confidence score exports
- [ ] FHIR resource integration
- [ ] Streaming API for large documents

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Most valuable contributions:**
1. Testing on new document types
2. Reporting false positives/negatives with examples
3. Adding filters for new PHI patterns
4. Performance optimizations

---

## License

Source Available License — See [LICENSE](LICENSE) for details.

- **Personal & Educational**: Permitted
- **Research**: Permitted
- **Commercial**: Requires written permission

---

<div align="center">

*Built with care. Test with rigor. Deploy with confidence.*

**[Documentation](docs/) · [Issues](issues/) · [Discussions](discussions/)**

</div>
