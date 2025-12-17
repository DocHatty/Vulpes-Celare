# Changelog

All notable changes to Vulpes Celare will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **VulpesLogger**: World-class diagnostic logging system with dual-mode output (human TUI / machine JSON)
- **VulpesOutput**: Dedicated user-facing CLI output system with semantic methods
- **Verification Portal Redesign**: Complete UI overhaul with modern design system
  - CSS custom properties (50+ design tokens)
  - Dark mode with system preference detection
  - Full WCAG 2.1 AA accessibility compliance
  - Micro-animations and polish
  - Inter + JetBrains Mono typography

### Changed
- All Rust accelerators now enabled by default (production-ready status)
- Migrated diagnostic logging from console.* to VulpesLogger across all core modules
- Migrated CLI output from console.* to VulpesOutput across all CLI modules
- Improved documentation with clearer architecture descriptions and marketability statements
- Enhanced cross-references between documentation files
- Verification portal server now uses process.stdout/stderr instead of console.*

---

## [1.0.0] - 2025-12-02

### Added

#### Core Engine
- Initial release of Vulpes Celare (Hatkoff Redaction Engine)
- Parallel filter architecture with 28+ HIPAA PHI filters
- VulpesCelare main orchestrator class with plug-and-play API
- ParallelRedactionEngine for concurrent filter execution
- Span-based detection with priority merging
- Streaming redaction API for real-time processing
- Policy DSL for declarative redaction rules

#### Rust Native Accelerators (Production-Ready)
- **Vision Processing**: PaddleOCR and UltraFace ONNX inference (required for image/DICOM)
- **Cryptographic Operations**: SHA-256, HMAC-SHA256, Merkle root (see `docs/RUST-NATIVE.md` for details)
- **Text Processing**: Tokenization, span operations, normalization (see `docs/RUST-NATIVE.md` for details)
- **Name Detection**: Phonetic matching, fuzzy matching, pattern scanning (see `docs/RUST-NATIVE.md` for details)
- **Identifier Scanning**: Multi-identifier scan kernel (see `docs/RUST-NATIVE.md` for details)
- **Streaming Kernels**: Buffer management, incremental detection (see `docs/RUST-NATIVE.md` for details)
- **Data Structures**: Interval tree operations, span overlap (see `docs/RUST-NATIVE.md` for details)
- **OCR Quality**: Chaos detection for confidence scoring (see `docs/RUST-NATIVE.md` for details)

All Rust accelerators are enabled by default when the native addon is available. TypeScript fallbacks ensure cross-platform compatibility.

#### Identity Filters
- NameFilter with context awareness
- NamePrefixFilter (Mr., Mrs., Dr., etc.)
- CredentialSuffixFilter (MD, RN, NP, etc.)
- LastNameFirstFilter ("SMITH, JOHN" format)

#### Government ID Filters
- SSNFilter
- MedicareFilter
- MedicaidFilter
- DriversLicenseFilter

#### Contact Information Filters
- PhoneFilter
- FaxFilter
- EmailFilter
- AddressFilter
- ZipCodeFilter

#### Medical Identifier Filters
- MRNFilter
- AccountNumberFilter
- DEANumberFilter
- NPIFilterSpan
- PassportNumberFilter
- HealthPlanNumberFilter

#### Financial Filters
- CreditCardFilter (with Luhn validation)
- BankAccountFilter

#### Technical Filters
- IPAddressFilter
- URLFilter
- DeviceIDFilter
- VehicleFilter
- BiometricContextFilter
- UniqueIdentifierFilter

#### Temporal Filters
- SmartDateFilter
- AgeOver89Filter (HIPAA special case)

#### Image & DICOM Processing
- Image redaction (faces + OCR text detection)
- DICOM anonymization with safe re-encoding
- Trust bundle generation and verification (`.red` format)

### Testing & Validation

- **Test corpus**: 220+ synthetic medical documents
- **Sensitivity**: 99.4% (synthetic data)
- **Specificity**: 100% (synthetic data)
- **Note**: i2b2 2014 validation pending

### Infrastructure

- Native addon packaging (Windows-first, prebuilt binaries)
- Automatic fallback to TypeScript implementations
- ONNX Runtime bundling for vision processing
- Comprehensive test suite with strict gating
- Profiling and benchmarking harness

---

## [Planned]

### Future Enhancements
- i2b2 2014 validation and publication
- macOS and Linux native binaries
- International phone number support
- Additional language support
- Enhanced streaming optimizations
- Trust bundle UX improvements

---

*For more details on changes, see the commit history and `docs/ROADMAP.md`.*
