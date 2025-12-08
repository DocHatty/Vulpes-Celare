# VULPES CELARE PERFORMANCE OVERHAUL - IMPLEMENTATION PLAN

## Executive Summary

This plan addresses critical performance bottlenecks and test system issues through:
1. **SymSpell Algorithm** - Replace O(n*m) fuzzy matching with O(1) lookups
2. **Interval Tree** - Replace O(n²) span overlap detection with O(log n + k)
3. **LRU Caching** - Memoize expensive computations
4. **Static Regex** - Eliminate repeated regex compilation
5. **Vitest Migration** - Modern, fast test framework

**Expected Speedup: 10-100x on weighting engine**

---

## Phase 1: Dependencies & Infrastructure

### Step 1.1: Install New Dependencies

```bash
npm install --save @flatten-js/interval-tree lru-cache
npm install --save-dev vitest @vitest/coverage-v8
```

**Packages:**
- `@flatten-js/interval-tree` - O(log n) interval queries (production-ready, TypeScript)
- `lru-cache` - Industry-standard LRU cache implementation
- `vitest` - 10-20x faster than Jest, native ESM/TypeScript

**Note:** We will NOT use `symspell-ex` npm package (outdated, 3 years old). Instead, we implement a simplified SymSpell-inspired approach using prefix indexing and deletion neighborhoods.

---

## Phase 2: Core Algorithm Replacements

### Step 2.1: Create FastFuzzyMatcher (SymSpell-Inspired)

**File:** `src/dictionaries/FastFuzzyMatcher.ts`

**Algorithm:**
1. Pre-compute deletion neighborhood for all dictionary terms (1-2 edits)
2. Store in hash map: `deletion -> [original terms]`
3. On lookup: generate deletions of query, check hash map
4. For matches: compute exact Jaro-Winkler only on candidates

**Complexity:** O(1) for exact match, O(k) for fuzzy where k = small constant

### Step 2.2: Create IntervalTreeSpanIndex

**File:** `src/models/IntervalTreeSpanIndex.ts`

**Algorithm:**
1. Build augmented BST from spans (Cormen et al. approach)
2. Query overlaps in O(log n + k) where k = overlaps found
3. Use for both overlap detection AND merge operations

### Step 2.3: Add Computation Cache

**File:** `src/utils/ComputationCache.ts`

**Caches:**
- Jaro-Winkler similarity results
- Levenshtein distance results  
- Shannon entropy calculations
- Document analysis results

---

## Phase 3: File-by-File Modifications

### 3.1 FuzzyDictionaryMatcher.ts

**Changes:**
1. Add `FastFuzzyMatcher` as internal engine
2. Keep existing API (`lookup()`, `has()`, `getConfidence()`)
3. Fall back to original algorithm for edge cases
4. Add LRU cache for repeated queries

### 3.2 Span.ts (SpanUtils)

**Changes:**
1. Replace `dropOverlappingSpans()` with interval tree implementation
2. Keep same function signature for compatibility
3. Add `IntervalTreeSpanIndex` for complex operations

### 3.3 EnsembleVoter.ts

**Changes:**
1. Move all regex patterns to static class fields
2. Add entropy calculation cache
3. Pre-compile InterPHIDisambiguator patterns

### 3.4 EnhancedPHIDetector.ts

**Changes:**
1. Use new FastFuzzyMatcher
2. Increase document cache size
3. Parallelize signal computation where possible

---

## Phase 4: Test System Overhaul

### 4.1 Vitest Configuration

**File:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
```

### 4.2 Test File Structure

```
tests/
├── vitest.config.ts
├── setup.ts                    # Global test setup
├── fixtures/
│   ├── documents.ts            # Shared document generators
│   ├── phi-samples.ts          # PHI test data
│   └── mock-electron.ts        # Electron mocks
├── unit/
│   ├── fast-fuzzy-matcher.test.ts
│   ├── interval-tree-span.test.ts
│   ├── ensemble-voter.test.ts
│   └── span-utils.test.ts
├── integration/
│   ├── full-pipeline.test.ts
│   └── phi-detection.test.ts
├── benchmarks/
│   ├── fuzzy-matching.bench.ts
│   └── span-overlap.bench.ts
└── e2e/
    └── hipaa-compliance.test.ts
```

---

## Phase 5: Implementation Order

### Day 1: Core Infrastructure
1. ✅ Install dependencies
2. ✅ Create `FastFuzzyMatcher.ts`
3. ✅ Create `IntervalTreeSpanIndex.ts`
4. ✅ Create `ComputationCache.ts`

### Day 2: Integration
5. ✅ Update `FuzzyDictionaryMatcher.ts` to use new engine
6. ✅ Update `SpanUtils.dropOverlappingSpans()` to use interval tree
7. ✅ Update `EnsembleVoter.ts` with static patterns and caching

### Day 3: Testing & Validation
8. ✅ Set up Vitest
9. ✅ Create benchmark tests
10. ✅ Run full regression suite
11. ✅ Measure performance improvements

---

## Risk Mitigation

### Backward Compatibility
- All public APIs remain unchanged
- Internal implementations swapped
- Fallback to original algorithms if issues detected

### Performance Validation
- Benchmark before/after for each change
- Automated regression tests
- CI/CD integration

### Rollback Plan
- Each change in separate commit
- Feature flags for new implementations
- Git tags at stable points

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Fuzzy match (1000 terms) | ~500ms | <5ms |
| Span overlap (100 spans) | ~10ms | <1ms |
| Full document processing | ~200ms | <50ms |
| Test suite runtime | ~60s | <10s |

---

## Files to Create

1. `src/dictionaries/FastFuzzyMatcher.ts` - New SymSpell-inspired matcher
2. `src/models/IntervalTreeSpanIndex.ts` - Interval tree for spans
3. `src/utils/ComputationCache.ts` - LRU caching utilities
4. `vitest.config.ts` - Vitest configuration
5. `tests/setup.ts` - Test setup file
6. `tests/benchmarks/performance.bench.ts` - Performance benchmarks

## Files to Modify

1. `src/dictionaries/FuzzyDictionaryMatcher.ts` - Use FastFuzzyMatcher internally
2. `src/models/Span.ts` - Use IntervalTree in SpanUtils
3. `src/core/EnsembleVoter.ts` - Static regex, caching
4. `src/core/EnhancedPHIDetector.ts` - Use new components
5. `package.json` - Add dependencies and scripts

---

## Let's Begin Implementation

Starting with Phase 1: Installing dependencies and creating core infrastructure.
