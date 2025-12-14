# Vulpes Celare - GitHub Copilot Integration

> **HIPAA PHI Redaction Engine** - This codebase includes enterprise-grade Protected Health Information detection and redaction.

## What You're Working With

Vulpes Celare is a medical-grade text redaction system designed to meet HIPAA Safe Harbor requirements.

### Core Capabilities
- **28 specialized filters** for PHI detection (names, SSN, dates, MRN, etc.)
- **≥99% sensitivity** target (missing PHI = HIPAA violation)
- **≥96% specificity** target (minimize false positives)
- **2-3ms processing time** per document
- **Rust native accelerators** for high-performance operations
- **OCR + DICOM support** for image-based redaction

---

## Quick Reference

### Build & Test
```bash
npm run build           # Compile TypeScript
npm test                # Run all tests
npm run test:strict     # Strict metric enforcement
```

### CLI Usage
```bash
vulpes redact "Patient John Smith DOB 01/15/1990"
vulpes interactive      # Interactive mode
vulpes info             # System info
```

---

## Project Structure

```
src/
├── filters/          # 28 PHI detection filters
│   ├── NameFilter.ts    # Personal names
│   ├── DateFilter.ts    # Dates of birth, service, etc.
│   ├── SSNFilter.ts     # Social Security Numbers
│   ├── PhoneFilter.ts   # Phone/fax numbers
│   ├── MRNFilter.ts     # Medical Record Numbers
│   └── ...              # 23 more filters
├── core/
│   ├── images/       # OCR-based redaction
│   ├── dicom/        # DICOM medical image handling
│   └── cortex/       # Learning system
├── rust/             # Native Rust modules (11 accelerators)
└── cli/              # Command-line interface

tests/
├── unit/             # Per-filter tests
└── master-suite/     # Integration + Cortex
```

---

## PHI Types Detected

The system detects these HIPAA Safe Harbor identifiers:

| Category | Examples |
|----------|----------|
| **Names** | Patient names, doctor names, family |
| **Dates** | DOB, admission, discharge, service dates |
| **SSN** | Social Security Numbers |
| **Phone/Fax** | All phone number formats |
| **Email** | Email addresses |
| **Addresses** | Street, city, state, ZIP |
| **MRN** | Medical Record Numbers |
| **NPI** | National Provider Identifiers |
| **Health Plan IDs** | Insurance identifiers |
| **Account Numbers** | Financial account numbers |
| **URLs/IPs** | Web addresses, IP addresses |
| **Device IDs** | Medical device identifiers |
| **Biometrics** | Fingerprints, retinal (metadata) |

---

## When Editing Filters

### Before
1. Read the existing filter code thoroughly
2. Understand the regex patterns and context rules
3. Add test cases FIRST

### After
1. Run: `npm run build && npm test`
2. Check sensitivity/specificity in output
3. Single filter test: `npm test -- --grep "FilterName"`

### Critical Rules
- **ONE change at a time** - Iterate incrementally
- **Never reduce sensitivity** - Missing PHI is a HIPAA violation
- **Specificity can flex** - False positives are acceptable temporarily

---

## MCP Cortex Server

When running through Vulpes CLI with MCP enabled, these tools are available:

- `redact_text` - Redact PHI from text
- `analyze_redaction` - Preview detection
- `get_system_info` - System status
- `analyze_metrics` - Trend analysis
- `diagnose_failure` - Debug test failures
- `record_intervention` - Log changes
- `consult_history` - Check past fixes

---

## Target Metrics (ALWAYS MONITOR)

| Metric | Target | Priority |
|--------|--------|----------|
| Sensitivity | ≥99% | 🔴 CRITICAL |
| Specificity | ≥96% | 🟡 Important |
| Speed | ≤3ms | 🟢 Nice-to-have |
