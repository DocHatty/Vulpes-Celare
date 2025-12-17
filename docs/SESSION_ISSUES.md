# Session Issues Log

This file tracks structural issues, technical debt, and architectural concerns discovered during development sessions. **Every AI assistant working on this codebase MUST update this file.**

---

## How to Use This File

1. **During any task**: Add issues you notice to the appropriate section
2. **Before completing a task**: Review and update severity/status
3. **At session end**: Ensure all discovered issues are logged
4. **Priority order**: Critical > High > Medium > Low

---

## Active Issues

### Critical (Must fix before production)

| ID | Issue | File(s) | Discovered | Status | Notes |
|----|-------|---------|------------|--------|-------|
| - | None currently | - | - | - | - |

### High (Should fix soon)

| ID | Issue | File(s) | Discovered | Status | Notes |
|----|-------|---------|------------|--------|-------|
| H1 | NAME filter pipeline over-complexity | ParallelRedactionEngine.ts, PostFilterService.ts | 2024-12-16 | Open | Spans detected at 98% confidence get filtered by 5+ downstream stages. Hard to debug why valid names disappear. |
| H2 | Duplicate detection patterns | FormattedNameFilterSpan.ts, SmartNameFilterSpan.ts, TitledNameFilterSpan.ts | 2024-12-16 | Open | Same name detected by multiple filters with overlapping logic. Wastes cycles, creates merge conflicts. |

### Medium (Technical debt)

| ID | Issue | File(s) | Discovered | Status | Notes |
|----|-------|---------|------------|--------|-------|
| M1 | Hardcoded word lists in PostFilterService | PostFilterService.ts | 2024-12-16 | Open | INVALID_STARTS, MEDICAL_PHRASES, STRUCTURE_WORDS are hardcoded Sets. Should be config/dictionary files for easier maintenance. |
| M2 | Hardcoded OCR suffix patterns | AddressFilterSpan.ts | 2024-12-16 | Open | OCR_SUFFIX_PATTERNS added inline. Should be centralized OCR error dictionary. |
| M3 | No centralized OCR error mapping | Multiple filters | 2024-12-16 | Open | Each filter has its own OCR patterns. Should have shared OCR character substitution service. |
| M4 | Priority/confidence thresholds scattered | Multiple filters | 2024-12-16 | Open | Magic numbers like 150, 180, 0.85 scattered across filters. Should be centralized config. |
| M5 | Version metadata duplicated/hardcoded | src/index.ts, src/mcp/server.ts, src/cli/* | 2025-12-17 | Resolved | Centralized VERSION/ENGINE_NAME/VARIANT in src/meta.ts to avoid heavyweight imports and drift. |
| M6 | Deprecated engine types used internally | src/RedactionEngine.ts, src/core/FilterAdapter.ts | 2025-12-17 | Resolved | Moved BaseFilter to src/core/BaseFilter.ts; RedactionEngine re-exports for backward compatibility. |
| M7 | Removed hospital filter still present | src/filters/HospitalFilterSpan.ts, docs/compliance/HIPAA-SAFE-HARBOR-COVERAGE.md | 2025-12-17 | Resolved | Deleted unused HospitalFilterSpan and updated compliance docs to match current behavior (whitelist, not redact). |
| M8 | Outdated "Ferrari" naming | src/rust/src/lib.rs, src/core/images/OCRService.ts | 2025-12-17 | Resolved | Updated strings to "Vulpes Celare Native Core" for consistency. |

### Low (Nice to have)

| ID | Issue | File(s) | Discovered | Status | Notes |
|----|-------|---------|------------|--------|-------|
| L1 | No pipeline stage visualization | ParallelRedactionEngine.ts | 2024-12-16 | Open | Hard to see which stage filtered a span. Need debug mode that shows span journey. |
| L2 | Test context object creation verbose | Test files | 2024-12-16 | Open | Every test needs `new RedactionContext()`. Should have test helpers. |

---

## Resolved Issues

| ID | Issue | Resolution | Date |
|----|-------|------------|------|
| - | None yet | - | - |

---

## Architectural Observations

### Pipeline Flow Complexity

The current redaction pipeline has **11 stages** that can filter/modify spans:

1. Filter detection (26 filters)
2. FieldContextDetector (multi-line names, FILE #)
3. FieldLabelWhitelist
4. DocumentVocabulary
5. filterAllCapsStructure
6. applyFieldContextToSpans
7. ConfidenceModifierService
8. SpanEnhancer (ensemble)
9. VectorDisambiguationService
10. CrossTypeReasoner
11. PostFilterService

**Problem**: A span can be killed at any stage, and there's no easy way to trace WHY it was removed. This makes debugging false negatives extremely difficult.

**Recommendation**: Add a debug mode that tracks each span's journey through the pipeline with reasons for any modifications/removals.

### Filter Overlap

Three name filters have significant overlap:
- `FormattedNameFilterSpan`: Labeled fields, Last/First, general patterns
- `SmartNameFilterSpan`: Dictionary-based, fuzzy matching
- `TitledNameFilterSpan`: Dr./Mr./Ms. prefixed names

**Problem**: Same text matched by multiple filters creates unnecessary work for the merge/dedup stage.

**Recommendation**: Consider consolidating into a single NameFilterSpan with sub-strategies, or clearly delineate responsibilities.

---

## Session History

### 2024-12-16: OCR Pattern Fixes Session

**Task**: Fix test failures for DATE, NAME, ADDRESS, MRN, AGE filters

**What was done**:
- Added space-tolerant DATE patterns
- Fixed over-greedy NAME labeled field detection
- Added OCR suffix patterns to ADDRESS filter
- Added OCR prefix patterns to MRN filter
- Enhanced AGE standalone detection

**What should have been done differently**:
- Should have investigated pipeline stages BEFORE adding patterns
- Should have checked if confidence thresholds were the real issue
- Should have documented issues as they were discovered
- Should have used deep analysis for the NAME filter complexity

**Metrics impact**:
- Sensitivity: 98.23% -> 98.37% (+0.14%)
- NAME: 93.5% -> 95.2% (+1.7%)
- AGE_90_PLUS: 74.4% -> 86.2% (+11.8%)

---

## Deep Analysis Triggers Log

Track when deep analysis was/should have been triggered:

| Date | Trigger Condition | Was Deep Analysis Done? | Outcome |
|------|-------------------|------------------------|---------|
| 2024-12-16 | 601 false negatives in 1000 doc test | NO | Fixed symptoms, not root causes |
| 2024-12-16 | NAME failures across all error levels | NO | Added patterns instead of investigating pipeline |

---

*Last updated: 2024-12-16*
