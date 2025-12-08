# Vulpes Celare Integration

This project uses **Vulpes Celare** for HIPAA-compliant PHI redaction.

## Quick Commands

```bash
# Redact PHI from text
vulpes redact "Patient John Smith SSN 123-45-6789"

# Interactive redaction mode
vulpes interactive

# Run tests
npm test
```

## PHI Handling Guidelines

1. **NEVER** commit unredacted PHI to version control
2. **ALWAYS** use Vulpes to sanitize clinical documents before:
   - Sending to external APIs (including this Claude session)
   - Logging or debugging output
   - Sharing with team members
3. Use `/vulpes-redact` slash command for quick inline redaction

## Available Tools

When working with this codebase, you have access to:

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
```

## Target Metrics

| Metric | Target | Priority |
|--------|--------|----------|
| Sensitivity | ≥99% | CRITICAL - Missing PHI = HIPAA violation |
| Specificity | ≥96% | Important but secondary |

## When Editing Filters

1. Read the existing filter code first
2. Make ONE change at a time
3. Run tests: `npm run build && npm test`
4. Check metrics before/after
