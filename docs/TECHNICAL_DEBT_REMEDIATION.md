# Technical Debt Remediation Plan

## Overview

This document outlines a comprehensive, safe approach to address the remaining technical debt issues identified during the production readiness audit. All changes prioritize stability and maintain backward compatibility.

---

## Issue Summary

| ID | Severity | Issue | File(s) | Status |
|----|----------|-------|---------|--------|
| H1 | High | NAME filter pipeline over-complexity | ParallelRedactionEngine.ts, PostFilterService.ts | **RESOLVED** |
| H2 | High | Duplicate detection patterns across name filters | 4 name filter files | **RESOLVED** |
| M1 | Medium | Hardcoded word lists in PostFilterService | PostFilterService.ts | **RESOLVED** |
| M2 | Medium | Hardcoded OCR suffix patterns | AddressFilterSpan.ts | **RESOLVED** |
| M3 | Medium | No centralized OCR error mapping | Multiple filters | **RESOLVED** |
| M4 | Medium | Priority/confidence thresholds scattered | Multiple filters | **RESOLVED** |
| L1 | Low | No pipeline stage visualization | ParallelRedactionEngine.ts | **RESOLVED** |
| L2 | Low | Test context object creation verbose | Test files | **RESOLVED** |

### Completed Implementation (2025-12-18)

**ALL 8 issues resolved:**

| Issue | Implementation | Files Created |
|-------|----------------|---------------|
| L2 | Test helpers | `tests/utils/test-helpers.ts` |
| M4 | Thresholds config | `src/config/Thresholds.ts` |
| L1 | Span journey tracker | `src/diagnostics/PipelineTracer.ts` (enhanced) |
| M1 | Word lists config | `src/config/WordLists.ts` |
| M2, M3 | OCR patterns config | `src/config/OcrPatterns.ts` |
| - | Config index | `src/config/index.ts` |
| H1, H2 | Name detection consolidation | `src/filters/name-patterns/NamePatternLibrary.ts`, `src/filters/name-patterns/NameDetectionCoordinator.ts` |

**H1/H2 Resolution Details:**
- Created `NamePatternLibrary.ts` - Centralized pattern definitions with categories
- Created `NameDetectionCoordinator.ts` - Caches Rust scanner results to eliminate duplicate FFI calls
- Updated all 4 name filters (FormattedNameFilterSpan, SmartNameFilterSpan, TitledNameFilterSpan, FamilyNameFilterSpan) to use coordinator
- Added coordinator lifecycle to `ParallelRedactionEngine.ts` (beginDocument/endDocument)

**All tests pass:** 204 unit tests, master suite metrics: Sensitivity: 97.70%, Specificity: 91.04%

---

## Phase 1: Configuration Externalization (M1, M2, M4)

### Goal
Move hardcoded values to centralized configuration files for easier maintenance.

### 1.1 Create Configuration Directory Structure

```
src/config/
├── thresholds.ts          # M4: Priority/confidence thresholds
├── word-lists.ts          # M1: SECTION_HEADINGS, STRUCTURE_WORDS, etc.
├── ocr-patterns.ts        # M2, M3: OCR character substitutions
└── index.ts               # Unified exports
```

### 1.2 Thresholds Configuration (M4)

**Create: `src/config/thresholds.ts`**

```typescript
/**
 * Centralized confidence and priority thresholds.
 * Previously scattered across filter files as magic numbers.
 */
export const Thresholds = {
  // Confidence levels
  confidence: {
    HIGH: 0.95,
    MEDIUM: 0.85,
    LOW: 0.70,
    MINIMUM: 0.60,
  },

  // Priority values (higher = more important)
  priority: {
    SSN: 200,
    NAME: 180,
    PHONE: 150,
    ADDRESS: 140,
    DATE: 130,
    EMAIL: 120,
    MRN: 110,
    DEFAULT: 100,
  },

  // Short name handling
  shortName: {
    MIN_LENGTH: 5,
    MIN_CONFIDENCE_WHEN_SHORT: 0.9,
  },

  // Context window sizes
  context: {
    LOOKBACK_CHARS: 50,
    LOOKAHEAD_CHARS: 50,
    WINDOW_TOKENS: 5,
  },
} as const;
```

### 1.3 Word Lists Configuration (M1)

**Create: `src/config/word-lists.ts`**

Extract from PostFilterService.ts:
- `SECTION_HEADINGS` (88 entries)
- `SINGLE_WORD_HEADINGS` (40+ entries)
- `STRUCTURE_WORDS` (45+ entries)
- `INVALID_STARTS` (medical phrase prefixes)
- `MEDICAL_PHRASES` (false positive triggers)

```typescript
/**
 * Centralized word lists for false positive filtering.
 * Previously hardcoded in PostFilterService.ts.
 */

export const SectionHeadings = new Set([
  "CLINICAL INFORMATION",
  "COMPARISON",
  // ... (all 88 entries)
]);

export const SingleWordHeadings = new Set([
  "IMPRESSION",
  "FINDINGS",
  // ... (all 40+ entries)
]);

export const StructureWords = new Set([
  "RECORD",
  "INFORMATION",
  // ... (all 45+ entries)
]);
```

### 1.4 OCR Patterns Configuration (M2, M3)

**Create: `src/config/ocr-patterns.ts`**

```typescript
/**
 * Centralized OCR error patterns and character substitutions.
 * Previously scattered across AddressFilterSpan.ts and other filters.
 */

// Character substitutions (0 <-> O, 1 <-> l/I, etc.)
export const OcrSubstitutions: Record<string, string[]> = {
  '0': ['O', 'o', 'Q'],
  'O': ['0'],
  'o': ['0'],
  '1': ['l', 'I', '|', 'i'],
  'l': ['1', 'I', '|'],
  'I': ['1', 'l', '|'],
  '5': ['S', 's'],
  'S': ['5'],
  's': ['5'],
  '8': ['B'],
  'B': ['8'],
  'm': ['rn', 'nn'],
  'rn': ['m'],
  'nn': ['m'],
  'cl': ['d'],
  'd': ['cl'],
  // Add more as discovered
};

// Common OCR suffix patterns for addresses
export const OcrAddressSuffixes = [
  /,?\s*[A-Z]{2}\s*\d{5}(?:-?\d{4})?/i,  // State ZIP
  // ... other patterns from AddressFilterSpan.ts
];

/**
 * Generate OCR-tolerant pattern from a string.
 * Useful for matching text with common OCR errors.
 */
export function generateOcrTolerantPattern(text: string): RegExp {
  let pattern = '';
  for (const char of text) {
    const subs = OcrSubstitutions[char];
    if (subs && subs.length > 0) {
      pattern += `[${char}${subs.join('')}]`;
    } else {
      pattern += char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(pattern, 'i');
}
```

---

## Phase 2: Name Filter Consolidation (H1, H2)

### Goal
Reduce complexity and eliminate duplicate detection patterns across name filters.

### Current State Analysis

**Three overlapping name filters:**

1. **FormattedNameFilterSpan.ts**
   - Labeled name fields ("Name:", "Patient:")
   - Last, First format
   - First Initial + Last Name (J. Smith)
   - General full names

2. **SmartNameFilterSpan.ts**
   - Dictionary-based detection
   - Family relationship names
   - Patient context names
   - All caps names
   - Names with suffixes
   - Possessive names
   - Age/gender context names

3. **TitledNameFilterSpan.ts**
   - Dr./Mr./Mrs. prefix detection
   - Provider role names (NP, PA, RN)

### Proposed Consolidation

**Option A: Unified Name Detector (Recommended)**

Create `UnifiedNameDetector.ts` that orchestrates sub-strategies:

```typescript
/**
 * Unified Name Detection - Single Entry Point
 *
 * Coordinates all name detection strategies with clear responsibilities.
 * Eliminates duplicate pattern matching across filters.
 */
export class UnifiedNameDetector extends SpanBasedFilter {
  private strategies: NameDetectionStrategy[] = [
    new LabeledFieldStrategy(),      // "Name:", "Patient:"
    new LastFirstFormatStrategy(),   // Smith, John
    new TitledNameStrategy(),        // Dr. Smith
    new DictionaryStrategy(),        // Dictionary lookups
    new ContextualStrategy(),        // Age/gender/family context
  ];

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const allSpans: Span[] = [];

    // Run strategies in priority order
    for (const strategy of this.strategies) {
      const spans = strategy.detect(text, config, context);
      allSpans.push(...spans);
    }

    // Deduplicate at detection time (not in pipeline)
    return this.deduplicateSpans(allSpans);
  }

  private deduplicateSpans(spans: Span[]): Span[] {
    // Sort by priority, then confidence
    // Remove overlapping lower-priority spans
    // Return deduplicated list
  }
}
```

**Benefits:**
- Single point of name detection
- Clear strategy responsibilities
- Deduplication at source (not in pipeline)
- Easier debugging (one filter to trace)

**Option B: Strategy Pattern Refactor (Lower Risk)**

Keep existing filters but:
1. Extract shared patterns to `NamePatternLibrary.ts`
2. Have filters import patterns instead of defining them
3. Add deduplication flag to prevent double-matching

---

## Phase 3: Pipeline Visualization (L1)

### Goal
Add debug mode to trace span journey through the 11-stage pipeline.

### Implementation

**Create: `src/diagnostics/PipelineTracer.ts`**

```typescript
/**
 * Pipeline Tracer - Debug Span Journey
 *
 * Tracks each span through all 11 pipeline stages,
 * recording modifications and removals with reasons.
 */
export class PipelineTracer {
  private enabled: boolean;
  private traces: Map<string, SpanTrace[]> = new Map();

  constructor() {
    this.enabled = process.env.VULPES_TRACE_PIPELINE === '1';
  }

  // Record span entering a stage
  enterStage(span: Span, stage: PipelineStage): void {
    if (!this.enabled) return;
    this.getTrace(span).push({
      stage,
      action: 'enter',
      confidence: span.confidence,
      timestamp: Date.now(),
    });
  }

  // Record span being modified
  modifySpan(span: Span, stage: PipelineStage, reason: string): void {
    if (!this.enabled) return;
    this.getTrace(span).push({
      stage,
      action: 'modify',
      reason,
      confidence: span.confidence,
      timestamp: Date.now(),
    });
  }

  // Record span being removed
  removeSpan(span: Span, stage: PipelineStage, reason: string): void {
    if (!this.enabled) return;
    this.getTrace(span).push({
      stage,
      action: 'remove',
      reason,
      confidence: span.confidence,
      timestamp: Date.now(),
    });
  }

  // Get full trace for a span
  getSpanJourney(span: Span): SpanTrace[] {
    return this.getTrace(span);
  }

  // Export all traces for debugging
  exportTraces(): Record<string, SpanTrace[]> {
    return Object.fromEntries(this.traces);
  }
}

export const pipelineTracer = new PipelineTracer();
```

**Integration Points (11 stages):**

1. Filter detection → `pipelineTracer.enterStage()`
2. FieldContextDetector → `pipelineTracer.modifySpan()`
3. FieldLabelWhitelist → `pipelineTracer.removeSpan()` if filtered
4. DocumentVocabulary → `pipelineTracer.modifySpan()`
5. filterAllCapsStructure → `pipelineTracer.removeSpan()` if filtered
6. applyFieldContextToSpans → `pipelineTracer.modifySpan()`
7. ConfidenceModifierService → `pipelineTracer.modifySpan()`
8. SpanEnhancer → `pipelineTracer.modifySpan()`
9. VectorDisambiguationService → `pipelineTracer.modifySpan()`
10. CrossTypeReasoner → `pipelineTracer.modifySpan()`
11. PostFilterService → `pipelineTracer.removeSpan()` if filtered

---

## Phase 4: Test Helpers (L2)

### Goal
Reduce verbosity in test context creation.

### Implementation

**Create: `tests/utils/test-helpers.ts`**

```typescript
/**
 * Test Helpers - Reduce Boilerplate
 */
import { RedactionContext } from '../../src/context/RedactionContext';
import { VulpesCelare } from '../../src/VulpesCelare';

// Quick context creation with defaults
export function createTestContext(overrides?: Partial<RedactionContextOptions>): RedactionContext {
  return new RedactionContext({
    documentId: 'test-doc',
    ...overrides,
  });
}

// Quick redaction with common settings
export async function quickRedact(text: string): Promise<string> {
  return VulpesCelare.redact(text);
}

// Redact with full details for assertions
export async function redactWithDetails(text: string) {
  return VulpesCelare.redactWithDetails(text);
}

// Create span for testing
export function createTestSpan(text: string, type: FilterType, overrides?: Partial<SpanOptions>): Span {
  return new Span({
    text,
    originalValue: text,
    characterStart: 0,
    characterEnd: text.length,
    filterType: type,
    confidence: 0.9,
    priority: 100,
    context: '',
    window: [],
    replacement: null,
    pattern: null,
    matchSource: 'test',
    ...overrides,
  });
}
```

---

## Implementation Order

### Priority 1: Low-Risk, High-Value (Do First)

1. **Phase 4 (L2)**: Test helpers
   - Effort: 1 hour
   - Risk: None (additive only)
   - Value: Immediate developer experience improvement

2. **Phase 1.2 (M4)**: Thresholds configuration
   - Effort: 2-3 hours
   - Risk: Low (extract and reference, no behavior change)
   - Value: Eliminates magic numbers

3. **Phase 3 (L1)**: Pipeline visualization
   - Effort: 4-6 hours
   - Risk: None (debug-only, disabled by default)
   - Value: Critical for debugging false negatives

### Priority 2: Medium-Risk, High-Value

4. **Phase 1.3 (M1)**: Word lists configuration
   - Effort: 2-3 hours
   - Risk: Low (extract and reference)
   - Value: Easier maintenance of false positive lists

5. **Phase 1.4 (M2, M3)**: OCR patterns configuration
   - Effort: 3-4 hours
   - Risk: Low (centralize existing patterns)
   - Value: Single source of truth for OCR handling

### Priority 3: Higher-Risk, Highest-Value

6. **Phase 2 (H1, H2)**: Name filter consolidation
   - Effort: 8-16 hours
   - Risk: Medium (behavioral changes possible)
   - Value: Major complexity reduction
   - **Recommendation**: Implement Option B first (Strategy Pattern Refactor) as stepping stone to Option A

---

## Testing Strategy

### For Each Phase:

1. **Before Changes**
   - Run full test suite: `npm test`
   - Record baseline metrics from master-suite
   - Snapshot current behavior for critical cases

2. **During Implementation**
   - Incremental changes with tests after each step
   - Use shadow mode for behavioral comparison
   - Run targeted unit tests frequently

3. **After Changes**
   - Full test suite must pass
   - Metrics must not regress (sensitivity >= 98%, specificity >= 92%)
   - Manual review of any behavioral differences

---

## Rollback Plan

Each phase is independently reversible:

1. **Configuration files**: Delete new files, revert imports
2. **Pipeline tracer**: Disable via environment variable
3. **Test helpers**: Additive only, no rollback needed
4. **Name filter consolidation**: Keep old filters as fallback, feature-flag new detector

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Test suite pass rate | 100% | 100% | `npm test` |
| Sensitivity | 98.18% | >= 98% | Master-suite |
| Specificity | 92.97% | >= 92% | Master-suite |
| Code duplication (name filters) | 3 files | 1-2 files | Manual review |
| Magic number count | ~50 | 0 | Grep search |
| Hardcoded word list locations | 5+ | 1 | Grep search |

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 4 (Test helpers) | 1 hour | None |
| Phase 1.2 (Thresholds) | 2-3 hours | None |
| Phase 3 (Pipeline tracer) | 4-6 hours | None |
| Phase 1.3 (Word lists) | 2-3 hours | Phase 1.2 |
| Phase 1.4 (OCR patterns) | 3-4 hours | Phase 1.2 |
| Phase 2 (Name consolidation) | 8-16 hours | All above |

**Total**: 20-33 hours of focused development

---

*Created: 2025-12-18*
*Status: Plan approved, ready for implementation*
