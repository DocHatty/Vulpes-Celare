# Changelog

All notable changes to Vulpes Celare will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-12-02

### Added

- Initial release of Vulpes Celare (Hatkoff Redaction Engine)
- Parallel filter architecture with 26 HIPAA PHI filters
- VulpesCelare main orchestrator class with plug-and-play API
- ParallelRedactionEngine for concurrent filter execution
- Span-based detection with priority merging

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
- NPIFilter

#### Financial Filters
- CreditCardFilter (with Luhn validation)
- BankAccountFilter

#### Technical Filters
- IPAddressFilter
- URLFilter
- DeviceIDFilter
- VehicleFilter

#### Temporal Filters
- SmartDateFilter
- AgeOver89Filter

### Initial Testing Results

- **Test corpus**: 220 synthetic medical documents
- **Sensitivity**: 99.4% (author-reported)
- **Specificity**: 100% (author-reported)
- **Note**: These metrics require independent verification

---

## [Unreleased]

### Planned
- International phone number support
- Additional language support
- Performance optimizations for large documents
- Community-validated metrics

---

*For more details on changes, see the commit history.*
