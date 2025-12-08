# Vulpes Celare - AI Agent Instructions

This project uses **Vulpes Celare** for HIPAA-compliant PHI redaction.

## Critical Rules

1. **PHI Sensitivity First**: Never miss Protected Health Information. Missing PHI = HIPAA violation.
2. **Test After Changes**: Always run `npm run build && npm test` after code modifications.
3. **One Change at a Time**: Make incremental changes and validate each one.
4. **NEVER** commit unredacted PHI to version control.

## Quick Commands

```bash
# Build the project
npm run build

# Run all tests
npm test

# Redact PHI from text
vulpes redact "Patient John Smith SSN 123-45-6789"

# Interactive redaction mode
vulpes interactive
```

## Available MCP Tools

- **redact_text**: Redact PHI from any text
- **analyze_redaction**: See what PHI would be detected without redacting
- **run_tests**: Execute the Vulpes test suite

## Codebase Structure

```
src/
├── filters/          # 28 PHI detection filters
├── core/             # Engine orchestration
├── dictionaries/     # Name/location databases
└── cli/              # Command-line interface

tests/
├── unit/             # Filter unit tests
└── master-suite/     # Integration tests with Cortex

docs/
├── internal/         # Development docs, assessments, plans
├── compliance/       # HIPAA compliance documentation
├── deployment/       # Deployment guides
└── legal/            # Licensing information
```

## Target Metrics

| Metric | Target | Priority |
|--------|--------|----------|
| Sensitivity | ≥99% | CRITICAL - Missing PHI = HIPAA violation |
| Specificity | ≥96% | Important but secondary |

## PHI Types Detected

Names, SSN, Dates, Phone/Fax, Email, Addresses, ZIP codes, MRN, NPI,
Health Plan IDs, Account Numbers, License Numbers, Vehicle IDs,
Device IDs, URLs, IP Addresses, Biometrics, Unique Identifiers

## When Editing Filters

1. Read the existing filter code first
2. Make ONE change at a time
3. Run tests: `npm run build && npm test`
4. Check metrics before/after

## When Working with Clinical Documents

1. Assume any clinical text may contain PHI
2. Redact before logging, sharing, or external API calls
3. Use synthetic data for testing
4. Never commit real PHI to version control
