# Rust Native Core

Vulpes Celare uses a Rust native addon (NAPI-RS) for performance-critical operations. **All Rust accelerators are production-ready and enabled by default**, with TypeScript fallbacks maintained for cross-platform compatibility and HIPAA safety validation.

## Production Status

✅ **All accelerators are production-ready and enabled by default**
- Vision inference: Required for image/DICOM processing (no JS fallback)
- Crypto operations: 2-5x faster than Node.js crypto module
- Text processing: 10-200x speedup on hot paths
- Streaming kernels: 10-50x faster buffer management

All accelerators can be individually disabled via environment variables for debugging or validation purposes.

## Quick Reference

| Category | Modules | Speedup |
|----------|---------|---------|
| Vision | OCR, Face Detection | Required (no JS fallback for inference) |
| Crypto | SHA-256, HMAC, Merkle | 2-5x |
| Text Processing | Tokenization, Span Apply | 10-50x |
| Name Detection | Phonetic, Fuzzy, Scanner | 50-200x |
| Identifiers | Multi-ID Scan | 50-100x |
| Streaming | Buffer, Name, ID Streams | 10-50x |
| Data Structures | Interval Tree, Span Overlap | 10-20x |
| OCR Quality | Chaos Detection | 5-15x |

## Environment Variables

**Default Behavior**: All accelerators are enabled when the native addon is available and no explicit disable flags are set. Set to `0` to disable and use TypeScript fallback.

| Variable | Controls | Default (Native Available) | Status |
|----------|----------|----------------------------|--------|
| `VULPES_ENABLE_PHONETIC` | Phonetic name matching | ON | Production |
| `VULPES_TEXT_ACCEL` | Text normalization, digit extraction, Luhn | ON | Production |
| `VULPES_SPAN_ACCEL` | Span overlap pruning | ON | Production |
| `VULPES_APPLY_SPANS_ACCEL` | UTF-16 aware text replacement | ON | Production |
| `VULPES_NAME_ACCEL` | Name scanner (0=off, 2=default, 3=full) | 2 | Production |
| `VULPES_POSTFILTER_ACCEL` | Post-filter pruning | ON | Production |
| `VULPES_SCAN_ACCEL` | Multi-identifier scanning | ON | Production |
| `VULPES_STREAM_KERNEL` | Streaming buffer management | ON | Production |
| `VULPES_FUZZY_ACCEL` | Fuzzy name matching | ON | Production |
| `VULPES_CHAOS_ACCEL` | OCR chaos detection | ON | Production |
| `VULPES_INTERVAL_ACCEL` | Interval tree operations | ON | Production |

**Note**: If the native addon fails to load (e.g., on unsupported platforms), the system automatically falls back to TypeScript implementations.

## Module Inventory

### Vision (`src/rust/src/vision/`)

**OCR Engine** - PaddleOCR ONNX inference
```rust
VulpesEngine::new(det_path, rec_path) -> VulpesEngine
VulpesEngine::detect_text(buffer) -> Vec<TextDetection>
```
- Wiring: `src/VulpesNative.ts`, `src/core/images/ImageRedactor.ts`

**Face Detection** - UltraFace ONNX inference
```rust
detect_faces(buffer, model_path, confidence?, nms?) -> Vec<FaceDetection>
```
- Wiring: `src/VulpesNative.ts`, `src/core/images/ImageRedactor.ts`

### Cryptography (`src/rust/src/crypto.rs`)

```rust
sha256_hex(buffer) -> String
sha256_hex_string(text) -> String
hmac_sha256_hex(key, message) -> String
merkle_root_sha256_hex(leaf_hashes) -> String
dicom_hash_token(salt, value) -> String
dicom_hash_uid(salt, value) -> String
```
- Wiring: `src/provenance/TrustBundleExporter.ts`, `src/core/dicom/DicomStreamTransformer.ts`
- Fallback: Node.js `crypto` module

### Text Processing

**Tokenization** (`src/rust/src/tokenize.rs`)
```rust
tokenize_with_positions(text, include_punctuation) -> Vec<Token>
```
- Wiring: `src/TextAccel.ts`

**Text Utilities** (`src/rust/src/lib.rs`)
```rust
normalize_ocr(text) -> String           // OCR artifact cleanup
extract_digits(text) -> String          // Digit extraction
extract_digits_with_ocr(text) -> String // OCR-aware digit extraction
extract_alphanumeric(text, preserve_case?) -> String
passes_luhn(text) -> bool               // Credit card validation
```
- Wiring: `src/TextAccel.ts`

**Span Application** (`src/rust/src/apply.rs`)
```rust
apply_replacements(text, replacements) -> String
```
- UTF-16 aware for JavaScript string compatibility
- Wiring: `src/utils/RustApplyKernel.ts`

### Name Detection

**Phonetic Matcher** (`src/rust/src/phonetic.rs`)
```rust
VulpesPhoneticMatcher::new() -> VulpesPhoneticMatcher
VulpesPhoneticMatcher::initialize(first_names, surnames)
VulpesPhoneticMatcher::match_first_name(input) -> Option<Match>
VulpesPhoneticMatcher::match_surname(input) -> Option<Match>
VulpesPhoneticMatcher::match_any_name(input) -> Option<Match>
```
- Algorithm: Soundex + Levenshtein distance
- Wiring: `src/dictionaries/NameDictionary.ts`

**Fuzzy Matcher** (`src/rust/src/fuzzy.rs`)
```rust
VulpesFuzzyMatcher::new(terms, config) -> VulpesFuzzyMatcher
VulpesFuzzyMatcher::lookup(query) -> FuzzyResult
VulpesFuzzyMatcher::has(query) -> bool
VulpesFuzzyMatcher::get_confidence(query) -> f64
```
- Algorithm: SymSpell deletion index + Damerau-Levenshtein + Soundex
- Features: 50K+ surnames, 250K+ first names, LRU cache
- Wiring: `src/dictionaries/FastFuzzyMatcher.ts`

**Name Scanner** (`src/rust/src/name.rs`)
```rust
VulpesNameScanner::new() -> VulpesNameScanner
VulpesNameScanner::initialize(first_names, surnames)
VulpesNameScanner::detect_last_first(text) -> Vec<Detection>
VulpesNameScanner::detect_first_last(text) -> Vec<Detection>
VulpesNameScanner::detect_smart(text) -> Vec<Detection>
```
- Patterns: "Last, First", "First Last", "Dr. First Last", etc.
- Levels: 0=off, 2=basic patterns, 3=full smart detection
- Wiring: `src/filters/SmartNameFilterSpan.ts`, `src/filters/FormattedNameFilterSpan.ts`

### Identifier Scanning (`src/rust/src/scan.rs`)

```rust
scan_all_identifiers(text) -> Vec<IdentifierDetection>
```
- Single-pass detection of 50+ identifier patterns
- Types: SSN, MRN, NPI, DEA, phone, email, credit card, etc.
- Wiring: `src/utils/RustScanKernel.ts`

### Streaming (`src/rust/src/streaming.rs`, `name_stream.rs`, `scan_stream.rs`)

**Buffer Management**
```rust
VulpesStreamingKernel::new(mode, buffer_size, overlap) -> Kernel
VulpesStreamingKernel::push(chunk)
VulpesStreamingKernel::pop_segment(force?) -> Option<String>
```

**Streaming Name Detection**
```rust
VulpesStreamingNameScanner::new(overlap) -> Scanner
VulpesStreamingNameScanner::initialize(first_names, surnames)
VulpesStreamingNameScanner::push(chunk) -> Vec<Detection>
```

**Streaming Identifier Detection**
```rust
VulpesStreamingIdentifierScanner::new(overlap) -> Scanner
VulpesStreamingIdentifierScanner::push(chunk) -> Vec<Detection>
```
- Wiring: `src/StreamingRedactor.ts`, `src/utils/RustStreamingNameScanner.ts`

### Data Structures

**Interval Tree** (`src/rust/src/interval.rs`)
```rust
VulpesIntervalTree::new() -> VulpesIntervalTree
VulpesIntervalTree::insert(span) -> String
VulpesIntervalTree::insert_all(spans)
VulpesIntervalTree::find_overlaps(start, end) -> Vec<Span>
VulpesIntervalTree::has_overlap(span) -> bool
VulpesIntervalTree::remove(span) -> bool
VulpesIntervalTree::clear()
VulpesIntervalTree::get_all_spans() -> Vec<Span>
VulpesIntervalTree::size -> u32

drop_overlapping_spans_fast(spans) -> Vec<i32>  // indices to keep
merge_spans_fast(span_arrays) -> Vec<i32>
get_identical_span_groups(spans) -> Vec<Vec<i32>>
```
- Replaces `@flatten-js/interval-tree` (dependency removed)
- Wiring: `src/models/IntervalTreeSpanIndex.ts`

**Span Overlap** (`src/rust/src/span.rs`)
```rust
drop_overlapping_spans(spans) -> Vec<i32>
```
- Wiring: `src/models/Span.ts`

### OCR Quality (`src/rust/src/chaos.rs`)

```rust
analyze_chaos(text) -> ChaosAnalysis
get_confidence_weights(chaos_score) -> ConfidenceWeights
calculate_name_confidence(name, chaos_score, has_label) -> f64
classify_case_pattern(name) -> String
```
- Algorithm: Shannon entropy + heuristic indicators
- Quality levels: CLEAN, NOISY, DEGRADED, CHAOTIC
- Wiring: `src/utils/OcrChaosDetector.ts`

## TypeScript Wiring

### Primary Integration Points

| TypeScript File | Rust Functions Used |
|-----------------|---------------------|
| `src/native/binding.ts` | NAPI bridge, platform detection |
| `src/VulpesNative.ts` | VulpesEngine, detectFaces |
| `src/TextAccel.ts` | normalizeOcr, extractDigits, passesLuhn |
| `src/StreamingRedactor.ts` | VulpesStreamingKernel |
| `src/dictionaries/NameDictionary.ts` | VulpesPhoneticMatcher |
| `src/dictionaries/FastFuzzyMatcher.ts` | VulpesFuzzyMatcher |
| `src/filters/SmartNameFilterSpan.ts` | VulpesNameScanner |
| `src/filters/FormattedNameFilterSpan.ts` | VulpesNameScanner |
| `src/models/Span.ts` | dropOverlappingSpans |
| `src/models/IntervalTreeSpanIndex.ts` | VulpesIntervalTree |
| `src/utils/OcrChaosDetector.ts` | analyzeChaos, getConfidenceWeights |
| `src/utils/RustApplyKernel.ts` | applyReplacements |
| `src/utils/RustScanKernel.ts` | scanAllIdentifiers |
| `src/provenance/TrustBundleExporter.ts` | sha256Hex, hmacSha256Hex, merkleRoot |

## Fallback Strategy

All Rust accelerators maintain TypeScript fallbacks for maximum reliability:

1. **Cross-platform compatibility** - Non-Windows platforms run pure TS until native builds available
2. **Graceful degradation** - If native addon fails to load, TS executes automatically
3. **Validation parity** - Can compare Rust vs TS outputs for correctness verification
4. **Audit compliance** - TS serves as reference implementation for HIPAA audits
5. **Development flexibility** - Disable accelerators individually for debugging

```typescript
// Example fallback pattern (from IntervalTreeSpanIndex.ts)
if (isIntervalAccelEnabled()) {
  const binding = getBinding();
  if (binding?.VulpesIntervalTree) {
    this.rustTree = new binding.VulpesIntervalTree();
    this.useRust = true;
    return;
  }
}
// Automatic fallback to TypeScript implementation
this.useRust = false;
```

This dual-implementation strategy ensures that Vulpes Celare remains functional across all platforms and provides validation confidence for HIPAA compliance officers.

## Build Commands

```bash
# Build Rust addon
npm run native:build

# Build TypeScript
npm run build

# Run tests
npm test

# Native sanity check
node scripts/test_simple.js
```

## Platform Support

| Platform | Status |
|----------|--------|
| Windows x64 | Full support, prebuilt binary |
| macOS x64 | Requires source build |
| macOS ARM64 | Requires source build |
| Linux x64 | Requires source build |

Set `VULPES_REQUIRE_NATIVE=1` to hard-fail on unsupported platforms instead of falling back to TS.
