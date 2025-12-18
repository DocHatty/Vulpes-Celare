/**
 * Performance Benchmarks for Vulpes Celare Optimizations
 *
 * Measures the performance improvements from:
 * 1. FastFuzzyMatcher (SymSpell-inspired) vs legacy O(n²) matching
 * 2. IntervalTreeSpanIndex vs legacy O(n²) overlap detection
 * 3. ComputationCache hit rates
 * 4. Static regex patterns in EnsembleVoter
 *
 * Run with: npx vitest bench
 */

import { describe, bench, beforeAll } from 'vitest';

// We'll import the actual modules after build
let FastFuzzyMatcher: any;
let FuzzyDictionaryMatcher: any;
let IntervalTreeSpanIndex: any;
let SpanUtils: any;
let Span: any;
let ComputationCache: any;
let EnsembleVoter: any;
let InterPHIDisambiguator: any;

// Sample data for benchmarks
const SAMPLE_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
];

// Generate a larger dictionary for realistic testing
const LARGE_DICTIONARY = Array.from({ length: 5000 }, (_, i) => {
  const base = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
  return `${base}${Math.floor(i / SAMPLE_NAMES.length) || ''}`;
});

// Sample queries with various typos
const SAMPLE_QUERIES = [
  'Smth', 'Jonson', 'Willaims', 'Browm', 'Jnes', 'Gracia', 'Millr', 'Davs',
  'Rodrigez', 'Martinz', 'Hernandz', 'Lopz', 'Gonzlez', 'Wilsn', 'Andersn',
  'Thmas', 'Taylr', 'Moor', 'Jacksn', 'Martn', 'Le', 'Prez', 'Thompsn',
  'Whit', 'Harrs', 'Sanchz', 'Clarck', 'Ramiez', 'Lewiss', 'Robinsn',
];

// Sample spans for overlap testing
function generateSpans(count: number): any[] {
  const spans: any[] = [];
  let pos = 0;
  for (let i = 0; i < count; i++) {
    const length = 5 + Math.floor(Math.random() * 20);
    const gap = Math.floor(Math.random() * 5); // Some overlaps
    spans.push({
      start: pos,
      end: pos + length,
      text: 'x'.repeat(length),
      type: 'NAME',
      confidence: 0.8 + Math.random() * 0.2,
    });
    pos += length - gap; // Negative gap = overlap
  }
  return spans;
}

// Sample contexts for disambiguation
const SAMPLE_CONTEXTS = [
  'Patient was born on 1985 and admitted for treatment',
  'The patient is 45 year old male presenting with symptoms',
  'Medication: Aspirin 325mg tablet daily as prescribed',
  'Diagnosis: Type 2 Diabetes diagnosed in 2020',
  'Dr. Smith signed the discharge papers on January 15',
  'Contact: John Doe, spouse, at 555-123-4567',
  'Lab result: Glucose level 120 mg/dL',
  'Patient John Smith was admitted on 03/15/2024',
];

describe('FuzzyMatcher Performance', () => {
  beforeAll(async () => {
    try {
      const fuzzyModule = await import('../../dist/dictionaries/FastFuzzyMatcher.js');
      FastFuzzyMatcher = fuzzyModule.FastFuzzyMatcher;

      const dictModule = await import('../../dist/dictionaries/FuzzyDictionaryMatcher.js');
      FuzzyDictionaryMatcher = dictModule.FuzzyDictionaryMatcher;
    } catch (e) {
      console.warn('Modules not built yet. Run npm run build first.');
    }
  });

  bench('FastFuzzyMatcher - 1000 lookups on 5000 term dictionary', async () => {
    if (!FastFuzzyMatcher) return;

    const matcher = new FastFuzzyMatcher(LARGE_DICTIONARY, {
      maxEditDistance: 2,
      cacheSize: 1000,
    });

    for (let i = 0; i < 1000; i++) {
      const query = SAMPLE_QUERIES[i % SAMPLE_QUERIES.length];
      matcher.lookup(query);
    }
  });

  bench('FuzzyDictionaryMatcher (fast mode) - 1000 lookups', async () => {
    if (!FuzzyDictionaryMatcher) return;

    const matcher = new FuzzyDictionaryMatcher(LARGE_DICTIONARY, {
      useFastMatcher: true,
      maxEditDistance: 2,
    });

    for (let i = 0; i < 1000; i++) {
      const query = SAMPLE_QUERIES[i % SAMPLE_QUERIES.length];
      matcher.lookup(query);
    }
  });

  bench('FuzzyDictionaryMatcher (legacy mode) - 100 lookups', async () => {
    if (!FuzzyDictionaryMatcher) return;

    // Legacy mode is much slower, so we do fewer iterations
    const matcher = new FuzzyDictionaryMatcher(LARGE_DICTIONARY, {
      useFastMatcher: false,
      maxEditDistance: 2,
    });

    for (let i = 0; i < 100; i++) {
      const query = SAMPLE_QUERIES[i % SAMPLE_QUERIES.length];
      matcher.lookup(query);
    }
  });
});

describe('IntervalTree Span Performance', () => {
  beforeAll(async () => {
    try {
      const intervalModule = await import('../../dist/models/IntervalTreeSpanIndex.js');
      IntervalTreeSpanIndex = intervalModule.IntervalTreeSpanIndex;

      const spanModule = await import('../../dist/models/Span.js');
      SpanUtils = spanModule.SpanUtils;
      Span = spanModule.Span;
    } catch (e) {
      console.warn('Modules not built yet. Run npm run build first.');
    }
  });

  bench('IntervalTree - dropOverlappingSpans with 1000 spans', async () => {
    if (!IntervalTreeSpanIndex) return;

    const spans = generateSpans(1000);
    IntervalTreeSpanIndex.dropOverlappingSpans(spans);
  });

  bench('IntervalTree - mergeSpans with 10 arrays of 100 spans', async () => {
    if (!IntervalTreeSpanIndex) return;

    const spanArrays = Array.from({ length: 10 }, () => generateSpans(100));
    IntervalTreeSpanIndex.mergeSpans(spanArrays);
  });

  bench('IntervalTree - findOverlaps query (1000 spans, 100 queries)', async () => {
    if (!IntervalTreeSpanIndex) return;

    const spans = generateSpans(1000);
    const index = new IntervalTreeSpanIndex();

    for (const span of spans) {
      index.insert(span);
    }

    // Query for overlaps
    for (let i = 0; i < 100; i++) {
      const start = Math.floor(Math.random() * 5000);
      const end = start + 50;
      index.findOverlaps(start, end);
    }
  });
});

describe('ComputationCache Performance', () => {
  beforeAll(async () => {
    try {
      const cacheModule = await import('../../dist/utils/ComputationCache.js');
      ComputationCache = cacheModule.ComputationCache;
    } catch (e) {
      console.warn('Modules not built yet. Run npm run build first.');
    }
  });

  bench('ComputationCache - entropy caching (10000 calls, ~90% hit rate)', async () => {
    if (!ComputationCache) return;

    const cache = ComputationCache.getInstance();
    cache.clearAll();

    // Simulate realistic usage with repeated values
    for (let i = 0; i < 10000; i++) {
      const positive = i % 10; // Only 10 unique positive counts
      const total = 5 + (i % 5); // Only 5 unique totals
      const key = ComputationCache.entropyKey(positive, total);

      cache.getEntropy(key, () => {
        // Expensive computation
        const p = positive / total;
        if (p <= 0 || p >= 1) return 0;
        return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
      });
    }
  });

  bench('ComputationCache - similarity caching (5000 string pairs)', async () => {
    if (!ComputationCache) return;

    const cache = ComputationCache.getInstance();
    cache.clearAll();

    const strings = SAMPLE_NAMES.slice(0, 20);

    for (let i = 0; i < 5000; i++) {
      const s1 = strings[i % strings.length];
      const s2 = strings[(i + 1) % strings.length];

      cache.getJaroWinkler(s1, s2, () => {
        // Simulate Jaro-Winkler computation
        return 0.85 + Math.random() * 0.15;
      });
    }
  });
});

describe('EnsembleVoter Performance', () => {
  beforeAll(async () => {
    try {
      const voterModule = await import('../../dist/core/EnsembleVoter.js');
      EnsembleVoter = voterModule.EnsembleVoter;
      InterPHIDisambiguator = voterModule.InterPHIDisambiguator;
    } catch (e) {
      console.warn('Modules not built yet. Run npm run build first.');
    }
  });

  bench('EnsembleVoter - 1000 votes with multiple signals', async () => {
    if (!EnsembleVoter) return;

    const voter = new EnsembleVoter();

    for (let i = 0; i < 1000; i++) {
      voter.quickVote({
        patternMatch: { confidence: 0.8, name: 'SSN_PATTERN' },
        dictionaryMatch: { confidence: 0.75, type: 'NAME', fuzzy: true },
        contextMatch: { confidence: 0.6, type: 'MEDICAL' },
        labelMatch: { confidence: 0.9, label: 'Patient Name:' },
      });
    }
  });

  bench('InterPHIDisambiguator - disambiguateDate (1000 calls)', async () => {
    if (!InterPHIDisambiguator) return;

    for (let i = 0; i < 1000; i++) {
      const context = SAMPLE_CONTEXTS[i % SAMPLE_CONTEXTS.length];
      InterPHIDisambiguator.disambiguateDate('9/12', context, 'AGE');
    }
  });

  bench('InterPHIDisambiguator - disambiguateName (1000 calls)', async () => {
    if (!InterPHIDisambiguator) return;

    for (let i = 0; i < 1000; i++) {
      const context = SAMPLE_CONTEXTS[i % SAMPLE_CONTEXTS.length];
      InterPHIDisambiguator.disambiguateName('Smith', context, 'MEDICATION');
    }
  });
});

describe('End-to-End Performance Comparison', () => {
  bench('Combined workflow - Fast path (all optimizations)', async () => {
    if (!FastFuzzyMatcher || !IntervalTreeSpanIndex || !EnsembleVoter) return;

    // Simulate a realistic document processing workflow
    const matcher = new FastFuzzyMatcher(SAMPLE_NAMES, { maxEditDistance: 2 });
    const voter = new EnsembleVoter();

    // Process 100 "documents"
    for (let doc = 0; doc < 100; doc++) {
      const spans: any[] = [];

      // Find matches
      for (let i = 0; i < 10; i++) {
        const query = SAMPLE_QUERIES[i % SAMPLE_QUERIES.length];
        const result = matcher.lookup(query);

        if (result.found) {
          spans.push({
            start: i * 20,
            end: i * 20 + query.length,
            text: query,
            type: 'NAME',
            confidence: result.confidence,
          });
        }
      }

      // Vote on each span
      for (const span of spans) {
        voter.quickVote({
          patternMatch: { confidence: span.confidence, name: 'NAME_PATTERN' },
          dictionaryMatch: { confidence: span.confidence, type: 'NAME' },
        });
      }

      // Deduplicate spans
      if (spans.length > 0) {
        IntervalTreeSpanIndex.dropOverlappingSpans(spans);
      }
    }
  });
});
