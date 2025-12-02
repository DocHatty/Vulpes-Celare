<div align="center">

# VULPES CELARE
<img width="1024" height="1024" alt="image" src="https://github.com/user-attachments/assets/6ce29f86-e17e-40b0-abca-77431fcfe319" />

**A HIPAA PHI redaction engine built for precision, speed, and simplicity.**

---

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge)
![License](https://img.shields.io/badge/License-Source%20Available-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Experimental-orange?style=for-the-badge)

---

*Hatkoff Redaction Engine*

</div>

---

## Important Notice

> **This project is in an experimental stage.**
>
> The metrics reported below (99.4% sensitivity, 100% specificity) are based on **initial testing performed by the author** using 220 programmatically-generated synthetic medical documents. While these results are promising, they have not been independently verified or tested against real-world production data.
>
> **This engine requires broader, widespread experimentation from the community to truly quantify its value and reliability.** If you use this in any capacity, please share your findings - both successes and failures. Your feedback is essential to understanding the true capabilities and limitations of this system.
>
> **Do not rely on this for production HIPAA compliance without thorough independent validation.**

---

## Disclaimer

> **No real patient data or hospital resources were used in the development or testing of this software.**
> All test documents, sample data, and examples are entirely synthetic and programmatically generated.
> No Protected Health Information from any healthcare institution was accessed, utilized, or
> compromised in any way during the creation of this project.

---

## What is Vulpes Celare?

Vulpes Celare is a PHI redaction engine that attempts to identify and redact all 18 HIPAA identifier types from medical documents. It uses a parallel filter architecture with span-based detection.

The system:

- **Attempts context awareness** - Tries to distinguish "Dr. Wilson" (person) from "Wilsons disease" (medical term)
- **Has medical vocabulary** - Attempts to avoid redacting terms like "Breast Cancer" or "Peptic Ulcer"
- **Handles common patterns** - Detects "SMITH, JOHN" formats, credential suffixes like "RN, NP, MD"
- **Runs filters in parallel** - All 26 filters execute simultaneously for speed

**Initial testing (author-performed):** 220 synthetic medical documents
- Reported sensitivity: 99.4%
- Reported specificity: 100%
- These numbers need independent verification

---

## Quick Start

```typescript
import { VulpesCelare } from 'vulpes-celare';

// Simple one-liner
const redacted = await VulpesCelare.redact(medicalText);

// With metrics
const engine = new VulpesCelare();
const result = await engine.process(medicalText);

console.log(result.text);           // Redacted text
console.log(result.spansRedacted);  // Number of PHI elements found
console.log(result.processingTime); // Time in milliseconds
```

---

## Architecture

```
                      VulpesCelare
                   (Main Orchestrator)
                          |
                          v
                 ParallelRedactionEngine
              (Concurrent Filter Execution)
                          |
          +---------------+---------------+
          v               v               v
    [ Filter 1 ]    [ Filter 2 ]    [ Filter N ]
    [  (Name)  ]    [  (SSN)   ]    [  (...)   ]
          |               |               |
          +---------------+---------------+
                          v
                   Span Resolution
                 (Priority Merging)
                          |
                          v
                   Redacted Output
```


---

## Filter Categories

### Identity Filters
| Filter | Purpose |
|--------|---------|
| NameFilter | Patient and provider names with context awareness |
| NamePrefixFilter | Prefixed names (Mr., Mrs., Dr., etc.) |
| CredentialSuffixFilter | Names with credentials (MD, RN, NP, etc.) |
| LastNameFirstFilter | "SMITH, JOHN" format detection |

### Government ID Filters
| Filter | Purpose |
|--------|---------|
| SSNFilter | Social Security Numbers (XXX-XX-XXXX) |
| MedicareFilter | Medicare Beneficiary Identifiers |
| MedicaidFilter | State Medicaid ID patterns |
| DriversLicenseFilter | State driver license formats |

### Contact Information Filters
| Filter | Purpose |
|--------|---------|
| PhoneFilter | Phone numbers (various formats) |
| FaxFilter | Fax numbers |
| EmailFilter | Email addresses |
| AddressFilter | Street addresses |
| ZipCodeFilter | ZIP and ZIP+4 codes |

### Medical Identifier Filters
| Filter | Purpose |
|--------|---------|
| MRNFilter | Medical Record Numbers |
| AccountNumberFilter | Patient account numbers |
| DEANumberFilter | DEA registration numbers |
| NPIFilter | National Provider Identifiers |

### Financial Filters
| Filter | Purpose |
|--------|---------|
| CreditCardFilter | Credit card numbers (with Luhn validation) |
| BankAccountFilter | Bank account patterns |

### Technical Filters
| Filter | Purpose |
|--------|---------|
| IPAddressFilter | IPv4 and IPv6 addresses |
| URLFilter | Web URLs |
| DeviceIDFilter | Medical device identifiers |
| VehicleFilter | VIN and license plates |

### Temporal Filters
| Filter | Purpose |
|--------|---------|
| SmartDateFilter | Dates with context awareness |
| AgeOver89Filter | Ages over 89 (HIPAA requirement) |


---

## Configuration

```typescript
const engine = new VulpesCelare({
  // Custom redaction policy
  policy: new CustomRedactionPolicy(),
  
  // Filter selection (default: all)
  filters: [NameFilter, SSNFilter, PhoneFilter],
  
  // Processing options
  preserveStructure: true,
  parallelExecution: true
});
```

---

## Integration

Vulpes Celare is designed for plug-and-play integration:

```typescript
// Express middleware example
app.use(async (req, res, next) => {
  if (req.body.medicalText) {
    req.body.medicalText = await VulpesCelare.redact(req.body.medicalText);
  }
  next();
});

// Batch processing
const engine = new VulpesCelare();
const results = await engine.processBatch(documentsArray);
```

---

## Testing Your Own Data

If you want to help validate this engine:

1. **Generate synthetic test data** - Never use real PHI
2. **Run the engine against your synthetic data**
3. **Manually verify redactions** - Check for false positives and false negatives
4. **Report findings** - Open an issue with your methodology and results

Your contributions to understanding this engine's real-world performance are invaluable.

---

## Known Limitations

- **Synthetic testing only** - No real-world validation yet
- **English language** - Optimized for English medical documents
- **US formats** - Phone numbers, SSNs, addresses assume US formats
- **Context edge cases** - Some ambiguous names may still cause issues
- **Performance at scale** - Not yet tested on very large document sets

---

## License

Source Available License - See [LICENSE](LICENSE) for details.

- Personal and educational use: Permitted
- Commercial use: Requires written permission

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

<div align="center">

*Vulpes Celare*

**Use responsibly. Validate independently. Share your findings.**

</div>

