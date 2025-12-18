# Codex Instructions for Vulpes Celare

This file provides instructions for OpenAI Codex and similar AI coding assistants working on this HIPAA-compliant PHI redaction system.

---

## MANDATORY ANALYSIS PROTOCOL

**CRITICAL: Read this section before ANY code changes.**

### The Problem This Solves

Previous AI sessions made quick pattern fixes without understanding root causes. This led to:
- Fixes that created new problems
- Structural issues being ignored
- Same problems recurring in different forms
- Technical debt accumulating silently

### Required Workflow

#### Phase 1: Understand Before Acting

When asked to fix issues or improve detection:

1. **DO NOT immediately add regex patterns or modify filters**
2. **First investigate**:
   - Read `docs/SESSION_ISSUES.md` for known problems
   - Check if the issue is a PATTERN problem vs PIPELINE problem
   - Trace failing cases through the detection stages

3. **Ask these questions**:
   - Is the pattern being detected but filtered out downstream?
   - Is this a confidence threshold issue?
   - Is there architectural debt causing this?

#### Phase 2: Document Everything

Maintain `docs/SESSION_ISSUES.md`:

```markdown
| Issue | Type | File(s) | Severity | Notes |
|-------|------|---------|----------|-------|
| Description | Architectural/Pattern/Config | file.ts | High/Med/Low | Details |
```

**You MUST add issues you discover even if you don't fix them.**

#### Phase 3: Fix with Validation

Only after understanding the root cause:

1. Make ONE change at a time
2. Run tests: `npm run build && npm test`
3. Compare before/after metrics
4. If metrics worsen, REVERT immediately
5. Document what you learned

---

## Project Architecture

### Detection Pipeline (11 stages)

```
1. Filter Detection (26 filters)
        |
2. FieldContextDetector
        |
3. FieldLabelWhitelist
        |
4. DocumentVocabulary
        |
5. filterAllCapsStructure
        |
6. applyFieldContextToSpans
        |
7. ConfidenceModifierService
        |
8. SpanEnhancer
        |
9. VectorDisambiguationService
        |
10. CrossTypeReasoner
        |
11. PostFilterService
        |
    [Final Output]
```

**Key Insight**: A span can be killed at ANY stage. If something isn't being detected, check ALL stages, not just the filter.

### Key Files

| File | Purpose |
|------|---------|
| `src/core/ParallelRedactionEngine.ts` | Main orchestrator, all pipeline stages |
| `src/core/filters/PostFilterService.ts` | Final false positive removal |
| `src/filters/*FilterSpan.ts` | Individual PHI type detectors |
| `src/vocabulary/DocumentVocabulary.ts` | Medical term whitelist |
| `docs/SESSION_ISSUES.md` | Issue tracking (UPDATE THIS!) |

---

## Pattern vs Pipeline Problems

### Pattern Problem Indicators
- New format we've never seen (e.g., different date separator)
- OCR corruption we haven't handled
- No filter is even attempting to match

### Pipeline Problem Indicators
- Filter logs show span was detected
- Span disappears in later stages
- Same pattern works for some docs but not others
- Failures correlate with confidence levels

**If it's a pipeline problem, DON'T add more patterns. Fix the pipeline.**

---

## Common Mistakes to Avoid

1. **Adding patterns without checking if span was already detected**
   - Always check filter logs first
   
2. **Ignoring structural issues**
   - Document them even if you can't fix now

3. **Not running full test suite**
   - Quick tests hide regressions

4. **Magic numbers in filters**
   - Confidence thresholds should be in config

5. **Duplicate logic across filters**
   - Check if another filter already handles this

---

## Testing Commands

```bash
# Quick sanity check (50 docs)
npm test -- --docs 50 --seed fixed

# Full validation (200 docs)  
npm test -- --docs 200 --seed random

# Stress test (1000 docs)
npm test -- --docs 1000 --seed random

# Build before testing
npm run build && npm test
```

---

## Metrics Targets

| Metric | Target | Priority |
|--------|--------|----------|
| Sensitivity | >= 99% | CRITICAL |
| Specificity | >= 96% | High |

**Sensitivity is paramount** - Missing PHI = HIPAA violation.

---

## Session Checklist

### At Start
- [ ] Read `docs/SESSION_ISSUES.md`
- [ ] Run quick test to get baseline metrics
- [ ] Clarify: fix mode or investigate mode?

### During Work
- [ ] One change at a time
- [ ] Test after each change
- [ ] Document issues discovered

### At End
- [ ] Update `docs/SESSION_ISSUES.md`
- [ ] Run full test suite
- [ ] Document metrics change
- [ ] Commit with descriptive message

---

## Deep Analysis Triggers

Enter thorough investigation mode when:

1. Test failures exceed 50 items
2. Same PHI type fails across multiple error levels
3. Sensitivity drops below 98%
4. About to modify 3+ filters
5. User mentions "deep", "analysis", "research", or "think"

Deep analysis means:
- Trace specific failures through all pipeline stages
- Check confidence thresholds and filtering rules
- Investigate architectural causes
- Document findings BEFORE implementing

---

*Last updated: 2024-12-16*
