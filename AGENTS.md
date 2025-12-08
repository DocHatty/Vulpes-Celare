# Vulpes Celare - PHI Redaction Agent Instructions

You are working in a codebase that includes **Vulpes Celare**, a HIPAA-compliant PHI redaction engine.

## Critical Rules

1. **PHI Sensitivity First**: Never miss Protected Health Information. Missing PHI = HIPAA violation.
2. **Test After Changes**: Always run `npm run build && npm test` after code modifications.
3. **One Change at a Time**: Make incremental changes and validate each one.

## Available Capabilities

### Redaction Tools
- Use `vulpes redact "<text>"` to redact PHI from command line
- The engine has 28 specialized filters covering 17/18 HIPAA Safe Harbor identifiers
- Processing time: 2-3ms per document

### Target Metrics
| Metric | Target |
|--------|--------|
| Sensitivity | ≥99% |
| Specificity | ≥96% |

### Key Paths
- Filters: `src/filters/*.ts`
- Dictionaries: `src/dictionaries/`
- Tests: `tests/master-suite/run.js`
- MCP Cortex: `localhost:3100` (if running)

## PHI Types Detected

Names, SSN, Dates, Phone/Fax, Email, Addresses, ZIP codes, MRN, NPI,
Health Plan IDs, Account Numbers, License Numbers, Vehicle IDs,
Device IDs, URLs, IP Addresses, Biometrics, Unique Identifiers

## When Working with Clinical Documents

1. Assume any clinical text may contain PHI
2. Redact before logging, sharing, or external API calls
3. Use synthetic data for testing
4. Never commit real PHI to version control

## Quick Commands

```bash
# Build the project
npm run build

# Run all tests
npm test

# Interactive redaction
vulpes interactive

# Quick redact
vulpes redact "Patient text here"
```
