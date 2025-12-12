# Architecture Deep Dive

## Overview

Vulpes Celare uses a **parallel filter architecture** where 28 specialized filters process clinical text simultaneously. Each filter is independently testable, inspectable, and optimized for specific PHI types.

### Native Rust Ferrari Core

In addition to the TypeScript/Node.js text pipeline described here, Vulpes Celare ships a Rust native addon (`src/rust/`) for compute‑heavy vision tasks:

- PaddleOCR ONNX inference (text detection + recognition)
- UltraFace ONNX inference (face detection)

The JS layer orchestrates policies, streaming, and trust bundles; the Rust core accelerates image workloads via NAPI.

## Processing Pipeline

```
Clinical Text
    ↓
┌──────────────────────────────┐
│  28 Parallel Filters         │
│  (2-3ms total execution)     │
│                              │
│  • Name Filters (4)          │
│  • Geographic Filters (3)    │
│  • Identifier Filters (8)    │
│  • Contact Info Filters (5)  │
│  • Context Filters (8)       │
└──────────────────────────────┘
    ↓
┌──────────────────────────────┐
│  Smart Overlap Resolution    │
│  - Pick optimal redaction    │
│  - Handle partial matches    │
└──────────────────────────────┘
    ↓
┌──────────────────────────────┐
│  Redaction Token Generation  │
│  - [NAME-1], [ADDRESS-1]...  │
│  - Bidirectional mapping     │
└──────────────────────────────┘
    ↓
┌──────────────────────────────┐
│  Optional Cryptographic Log  │
│  - Merkle-linked audit trail │
│  - Trust bundles             │
└──────────────────────────────┘
    ↓
Redacted Text + Metadata
```

## Filter Categories

### Name Filters

| Filter | Purpose | Examples |
|--------|---------|----------|
| `SmartNameFilter` | Context-aware name detection | "Patient John Smith was..." |
| `TitledNameFilter` | Titles + names | "Dr. Smith", "Mrs. Johnson" |
| `FormattedNameFilter` | Formatted patterns | "SMITH, JOHN", "John Q. Public" |
| `FamilyNameFilter` | Family references | "His brother Michael..." |

**Key Innovation:** Medical context awareness—knows "Dr. Wilson" is a person but "Wilson's disease" is a medical condition.

### Geographic Filters

| Filter | Purpose | Examples |
|--------|---------|----------|
| `AddressFilter` | Street addresses | "123 Main St, Apt 4B" |
| `ZipCodeFilter` | ZIP codes | "12345", "12345-6789" |
| `HospitalFilter` | Hospital names/addresses | "Massachusetts General Hospital" |

### Identifier Filters

| Filter | Purpose | Examples |
|--------|---------|----------|
| `SSNFilter` | Social Security Numbers | "123-45-6789", "123456789" |
| `MRNFilter` | Medical Record Numbers | "MRN: 12345678" |
| `NPIFilter` | National Provider Identifiers | "NPI: 1234567890" |
| `HealthPlanNumberFilter` | Insurance IDs | "Member ID: ABC123456" |
| `AccountNumberFilter` | Account numbers | "Acct# 987654321" |
| `LicenseNumberFilter` | Professional licenses | "License: MD123456" |
| `DEAFilter` | DEA numbers | "DEA: AB1234563" |
| `UniqueIdentifierFilter` | Generic unique IDs | Various formats |

### Contact Info Filters

| Filter | Purpose | Examples |
|--------|---------|----------|
| `PhoneFilter` | Phone numbers | "(555) 123-4567", "555-123-4567" |
| `FaxNumberFilter` | Fax numbers | "Fax: (555) 123-4567" |
| `EmailFilter` | Email addresses | "patient@example.com" |
| `URLFilter` | Web URLs | "https://example.com/patient" |
| `IPAddressFilter` | IP addresses | "192.168.1.1", "2001:db8::1" |

### Specialized Filters

| Filter | Purpose | Examples |
|--------|---------|----------|
| `DateFilter` | Dates (various formats) | "01/15/2024", "January 15, 2024" |
| `BiometricContextFilter` | Biometric identifiers | "Fingerprint ID: ..." |
| `VehicleIdentifierFilter` | VINs, license plates | "VIN: 1HGBH41JXMN109186" |
| `DeviceIdentifierFilter` | Medical device serials | "Serial: ABC123XYZ" |

## OCR Error Resilience

### Character Substitution Handling

Common OCR errors handled automatically:

| Original | Often Scanned As |
|----------|------------------|
| `O` (letter) | `0` (zero) |
| `I` (letter) | `1` (one) |
| `S` | `5` |
| `l` (lowercase L) | `1` (one) |
| `Z` | `2` |

**Example:**
```
Original:  "Patient: JOHNSON, ROBERT"
Scanned:   "Patient: J0HNS0N, R0BERT"  (O→0)
Detected:  ✅ Still caught by SmartNameFilter
```

### Fuzzy Matching

Filters use **phonetic matching** (Double Metaphone) and **edit distance** (Levenshtein) to catch:
- Misspellings
- OCR artifacts
- Partial matches
- Formatting variations

## Smart Overlap Resolution

When multiple filters match the same text:

1. **Score each match** based on:
   - Confidence score
   - Specificity (more specific wins)
   - Coverage (longer match preferred)
   - Context (medical context weighted higher)

2. **Resolve conflicts:**
   - Pick highest-scoring match
   - Extend to cover partial overlaps
   - Preserve medical terminology when safe

**Example:**
```
Text: "Dr. Smith at Mass General"

Matches:
- SmartNameFilter: "Dr. Smith" (confidence: 0.95)
- HospitalFilter: "Mass General" (confidence: 0.98)

Result: Both preserved, no conflict
```

```
Text: "Patient 123-45-6789"

Matches:
- MRNFilter: "123-45-6789" (confidence: 0.70)
- SSNFilter: "123-45-6789" (confidence: 0.95)

Result: SSNFilter wins (higher confidence)
```

## Performance Optimization

### Parallel Execution

All 28 filters run in parallel using Promise.all():

```typescript
const results = await Promise.all(
  filters.map(filter => filter.process(text))
);
```

**Benefit:** Total time = slowest filter (not sum of all filters)

### Bloom Filters

Common name dictionaries use Bloom filters for O(1) lookup:
- 1M+ names indexed
- False positive rate: <0.1%
- Memory footprint: ~2MB

### LRU Caching

Recent redactions cached:
- Cache size: 1000 entries
- Hit rate: ~85% in typical workflows
- Memory overhead: <10MB

### Interval Trees

Redaction coordinates stored in interval trees:
- Fast overlap detection: O(log n)
- Efficient range queries
- Minimal memory overhead

## Zero External Calls

**Everything runs locally:**
- No API calls to external services
- No cloud dependencies
- No network traffic required
- Works completely air-gapped

**Benefits:**
- HIPAA compliance by design
- Predictable performance
- No rate limits
- No external attack surface

## Streaming Architecture

For real-time redaction (e.g., live dictation):

```typescript
const redactor = new StreamingRedactor({
  bufferSize: 100,      // Characters to buffer
  mode: 'sentence'      // Process per sentence
});

for await (const chunk of redactor.redactStream(stream)) {
  console.log(chunk.text);  // PHI already redacted
}
```

**Key Features:**
- Sub-100ms latency
- Sentence-aware buffering
- Partial PHI handling
- Context preservation

> 📖 **Full Streaming Documentation:** [STREAMING-API.md](../examples/streaming/STREAMING-API.md)

## Cryptographic Provenance

### Merkle-Linked Audit Logs

Every redaction event creates a tamper-evident audit entry:

```
┌─────────────────────┐
│  Redaction Event 1  │
│  Hash: abc123...    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Redaction Event 2  │
│  Prev: abc123...    │
│  Hash: def456...    │
└──────────┬──────────┘
           │
           ↓
         ...
```

**Tampering Detection:** Any modification breaks the chain.

### Trust Bundles

Exportable cryptographic certificates proving:
- What was redacted
- When it was redacted
- By which version of Vulpes
- Integrity of the chain

**Use Cases:**
- Regulatory audits
- Compliance verification
- Forensic investigation
- Legal documentation

> 📖 **Provenance Specification:** [provenance-spec.md](../docs/provenance-spec.md)

## Filter Development Guide

### Creating a New Filter

```typescript
import { BaseFilter } from '../core/BaseFilter';

export class MyCustomFilter extends BaseFilter {
  async process(text: string): Promise<RedactionMatch[]> {
    const matches: RedactionMatch[] = [];
    
    // Your detection logic here
    const pattern = /your-pattern/g;
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'CUSTOM_TYPE',
        confidence: 0.95,
        text: match[0]
      });
    }
    
    return matches;
  }
}
```

### Testing Your Filter

```typescript
import { test } from 'vitest';
import { MyCustomFilter } from './MyCustomFilter';

test('detects custom PHI type', async () => {
  const filter = new MyCustomFilter();
  const text = 'Test text with PHI';
  const matches = await filter.process(text);
  
  expect(matches).toHaveLength(1);
  expect(matches[0].type).toBe('CUSTOM_TYPE');
});
```

### Best Practices

1. **Use high confidence scores** (>0.9) for definitive matches
2. **Lower scores** (0.6-0.8) for fuzzy/context-dependent matches
3. **Return all plausible matches** - overlap resolution handles conflicts
4. **Include context** in match metadata for debugging
5. **Test against adversarial examples** - OCR errors, typos, edge cases

## Performance Metrics

### Processing Speed by Document Size

| Document Size | Processing Time |
|---------------|-----------------|
| 100 words | 1.2 ms |
| 500 words | 2.1 ms |
| 1,000 words | 2.8 ms |
| 5,000 words | 4.5 ms |
| 10,000 words | 7.2 ms |

### Accuracy by Document Quality

| Document Quality | Detection Rate |
|------------------|----------------|
| Perfect digital text | 99.9% |
| Minor errors | 99.8% |
| Light scan artifacts | 99.7% |
| Bad scans | 98.5% |
| Barely legible | 97.2% |

> Performance degrades gracefully, not catastrophically.

## Advanced Configuration

### Custom Thresholds

```typescript
const engine = new VulpesCelare({
  confidenceThreshold: 0.85,  // Minimum confidence to redact
  aggressiveness: 'high',      // 'low', 'medium', 'high'
  preserveNumbers: false       // Keep numeric values
});
```

### Policy DSL

Declarative policies without code changes:

```typescript
import { PolicyCompiler } from 'vulpes-celare';

const policy = `
policy RESEARCH {
  description "IRB-approved research"
  
  redact names
  redact ssn
  keep dates
  keep ages
  
  threshold 0.4
}
`;

const compiled = PolicyCompiler.compile(policy);
const engine = new VulpesCelare({ policy: compiled });
```

> 📖 **Full Policy DSL Documentation:** [POLICY-DSL.md](../examples/policy-dsl/POLICY-DSL.md)

## System Requirements

- **Runtime:** Node.js 16+
- **Memory:** ~50MB baseline, +10MB per 1,000 cached entries
- **CPU:** Single-threaded text pipeline, optimized for modern V8
- **Storage:** No persistent storage required (unless using audit logs)
- **Network:** None (completely offline)

### ONNX Runtime Requirements (Vision)

The Rust vision core uses the `ort` crate and requires ONNX Runtime **1.22.x**. Windows releases bundle a compatible CPU DLL at `native/onnxruntime.dll`.

To use an alternate runtime (CUDA/DirectML), set one of these before importing Vulpes:

```bash
set VULPES_ORT_PATH=C:\path\to\onnxruntime.dll
# or
set ORT_DYLIB_PATH=C:\path\to\onnxruntime.dll
```

## Integration Patterns

### Middleware Pattern

```typescript
app.use('/api/ai/*', async (req, res, next) => {
  if (req.body.text) {
    req.body.text = await VulpesCelare.redact(req.body.text);
  }
  next();
});
```

### Streaming Pattern

```typescript
const stream = createClinicalNoteStream();
const redactor = new StreamingRedactor();

for await (const chunk of redactor.redactStream(stream)) {
  await sendToLLM(chunk.text);
}
```

### Batch Pattern

```typescript
const documents = await loadClinicalNotes();
const redacted = await Promise.all(
  documents.map(doc => VulpesCelare.redact(doc))
);
```

---

**Questions?** [Open a discussion](https://github.com/DocHatty/Vulpes-Celare/discussions)
