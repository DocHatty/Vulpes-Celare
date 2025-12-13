# Profiling & Hotspots

Workflow:

1. measure where time is spent (bench/profile)
2. only then migrate specific hot loops to Rust

## Quick Commands

Benchmarks:

```bash
npm run build
npm run test:bench
```

Filter timing (engine report aggregation, synthetic docs):

```bash
npm run build
node scripts/profile-filters.js --count=20 --seed=1337
```

## What To Migrate To Rust (After Measuring)

Typical inner-loop candidates:

- normalization (OCR substitutions, case-folding)
- repeated scanning (regex-like passes over large notes)
- dictionary lookups and fuzzy matching
- span merging / overlap resolution

## Optional Rust Accelerators (Feature Flags)

These are opt-in until they are fully validated across evaluation suites:

- `VULPES_TEXT_ACCEL=1`: enables native `normalizeOcr` for OCR-substitution normalization (used by `src/utils/ValidationUtils.ts`).
- `VULPES_TEXT_ACCEL=1`: also enables native tokenization with offsets for window extraction (used by `src/services/WindowService.ts`).
- `VULPES_ENABLE_PHONETIC=1`: enables phonetic name validation in `src/dictionaries/NameDictionary.ts`.
  - Optional threshold: `VULPES_PHONETIC_THRESHOLD=0.95` (0..1)
- `VULPES_SPAN_ACCEL=1`: enables native `dropOverlappingSpans` in `src/models/Span.ts` (span overlap resolution).

## Notes

- Keep PHI sensitivity fail-safe: add Rust acceleration behind a fallback path until verified.
- Prefer moving CPU-bound inner loops, not policy/orchestration.
