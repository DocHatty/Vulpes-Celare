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
- `VULPES_APPLY_SPANS_ACCEL=1`: applies all replacement tokens via a Rust string splice kernel in `src/core/ParallelRedactionEngine.ts` (reduces large-string churn; TS still creates tokens and logs detections).
- `VULPES_SHADOW_APPLY_SPANS=1`: runs TS vs Rust span-apply in parallel and records equality in the execution report (no behavior change).
- `VULPES_SHADOW_RUST_NAME=1`: runs Rust comma-name scan in parallel and records a diff summary in the execution report (no behavior change).
- `VULPES_NAME_ACCEL=1`: uses the Rust comma-name scanner inside `src/filters/SmartNameFilterSpan.ts` for Last, First-style matches (opt-in).
- `VULPES_NAME_ACCEL=2`: additionally enables the Rust First Last scanner (still opt-in; promote only after shadow diffs look clean).
- `VULPES_NAME_ACCEL=3`: enables the Rust SmartName scanner (ports remaining SmartNameFilterSpan pattern families; promote only after shadow diffs look clean).
- `VULPES_SHADOW_RUST_NAME_FULL=1`: runs Rust First Last scan in parallel and records a diff summary in the execution report (no behavior change).
- `VULPES_SHADOW_RUST_NAME_SMART=1`: runs the Rust SmartName scanner in parallel and records a diff summary in the execution report (no behavior change).
- `VULPES_STREAM_KERNEL=1`: uses the Rust streaming buffer kernel inside `src/StreamingRedactor.ts` (incremental boundary tracking + overlap buffering; TS still runs full redaction on emitted segments).
- `VulpesStreamingIdentifierScanner` (Rust): stateful rolling-window identifier scanner for streams (no env flag; use via `src/utils/RustStreamingIdentifierScanner.ts`).
- `VULPES_SCAN_ACCEL=1`: uses the Rust multi-identifier scan kernel for regex-heavy identifier filters (EMAIL/URL/IP/PHONE/SSN/DATE/MRN/CREDITCARD/ACCOUNT/LICENSE/PASSPORT/HEALTHPLAN/FAX/ZIPCODE/ADDRESS/VEHICLE/DEVICE) while keeping the filter orchestration in TS.
- `VULPES_POSTFILTER_ACCEL=1`: enables Rust post-filter decisions in `src/core/filters/PostFilterService.ts` (false-positive pruning).
- `VULPES_SHADOW_POSTFILTER=1`: runs Rust + TS post-filtering in parallel and records a diff summary in the execution report (no behavior change).

## Notes

- Keep PHI sensitivity fail-safe: add Rust acceleration behind a fallback path until verified.
- Prefer moving CPU-bound inner loops, not policy/orchestration.
