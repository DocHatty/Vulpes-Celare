"use strict";
/**
 * PostFilterService - Post-Detection Filtering for False Positive Removal
 *
 * This module handles filtering of detected spans after initial detection
 * but before tokenization. It removes false positives using multiple
 * filtering strategies.
 *
 * Extracted from ParallelRedactionEngine for better maintainability.
 *
 * @module core/filters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldLabelFilter = exports.GeographicTermFilter = exports.MedicalSuffixFilter = exports.MedicalPhraseFilter = exports.InvalidSuffixFilter = exports.InvalidPrefixFilter = exports.ShortNameFilter = exports.StructureWordFilter = exports.SectionHeadingFilter = exports.DevicePhoneFalsePositiveFilter = exports.PostFilterService = void 0;
const Span_1 = require("../../models/Span");
const RadiologyLogger_1 = require("../../utils/RadiologyLogger");
const binding_1 = require("../../native/binding");
const RustAccelConfig_1 = require("../../config/RustAccelConfig");
const FalsePositiveClassifier_1 = require("../../ml/FalsePositiveClassifier");
const post_filter_1 = require("../../config/post-filter");
const AdaptiveThresholdService_1 = require("../../calibration/AdaptiveThresholdService");
let cachedPostFilterBinding = undefined;
function isPostFilterAccelEnabled() {
    return RustAccelConfig_1.RustAccelConfig.isPostFilterEnabled();
}
function isPostFilterShadowEnabled() {
    return process.env.VULPES_SHADOW_POSTFILTER === "1";
}
function getPostFilterBinding() {
    if (cachedPostFilterBinding !== undefined)
        return cachedPostFilterBinding;
    try {
        cachedPostFilterBinding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
    }
    catch {
        cachedPostFilterBinding = null;
    }
    return cachedPostFilterBinding;
}
// =============================================================================
// FILTER STRATEGIES
// =============================================================================
/**
 * Filter for device/phone false positives like "Call Button: 555"
 */
class DevicePhoneFalsePositiveFilter {
    name = "DevicePhoneFalsePositive";
    shouldKeep(span, _text) {
        if (span.filterType !== Span_1.FilterType.DEVICE &&
            span.filterType !== Span_1.FilterType.PHONE) {
            return true;
        }
        const nameLower = span.text.toLowerCase();
        if (nameLower.includes("call button") ||
            nameLower.includes("room:") ||
            nameLower.includes("bed:")) {
            return false;
        }
        return true;
    }
}
exports.DevicePhoneFalsePositiveFilter = DevicePhoneFalsePositiveFilter;
/**
 * Filter for ALL CAPS section headings
 * Uses externalized config from config/post-filter/
 */
class SectionHeadingFilter {
    name = "SectionHeading";
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        const name = span.text;
        // Check if ALL CAPS
        if (!/^[A-Z\s]+$/.test(name)) {
            return true;
        }
        // Check multi-word section headings (config stores lowercase, compare lowercase)
        if ((0, post_filter_1.getSectionHeadings)().has(name.trim().toLowerCase())) {
            return false;
        }
        // Check single-word headings
        const words = name.trim().split(/\s+/);
        if (words.length === 1 &&
            (0, post_filter_1.getSingleWordHeadings)().has(words[0].toLowerCase())) {
            return false;
        }
        return true;
    }
}
exports.SectionHeadingFilter = SectionHeadingFilter;
/**
 * Filter for document structure words
 * Uses externalized config from config/post-filter/
 */
class StructureWordFilter {
    name = "StructureWord";
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        const nameWords = span.text.toLowerCase().split(/\s+/);
        const structureWords = (0, post_filter_1.getStructureWords)();
        for (const word of nameWords) {
            if (structureWords.has(word)) {
                return false;
            }
        }
        return true;
    }
}
exports.StructureWordFilter = StructureWordFilter;
/**
 * Filter for short names (less than 5 chars without comma)
 */
class ShortNameFilter {
    name = "ShortName";
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        const name = span.text;
        if (name.length < 5 && !name.includes(",") && span.confidence < 0.9) {
            return false;
        }
        return true;
    }
}
exports.ShortNameFilter = ShortNameFilter;
/**
 * Filter for invalid prefix words
 */
class InvalidPrefixFilter {
    name = "InvalidPrefix";
    static INVALID_STARTS = [
        "The ",
        "A ",
        "An ",
        "To ",
        "From ",
        "In ",
        "On ",
        "At ",
        "Is ",
        "Was ",
        "Are ",
        "By ",
        "For ",
        "With ",
        "As ",
        "All ",
        "No ",
        "Not ",
        "And ",
        "Or ",
        "But ",
        "Home ",
        "Work ",
        "Cell ",
        "Fax ",
        "Email ",
        "Blood ",
        "Heart ",
        "Vital ",
        "Oxygen ",
        "Cardiac ",
        "Distinct ",
        "Athletic ",
        "Local ",
        "Regional ",
        "National ",
        "Nursing ",
        "Diagnostic ",
        "Unstable ",
        "Acute ",
        "Chronic ",
        // Additional invalid starts
        "Chief ",
        "Present ",
        "Privacy ",
        "Advance ",
        "Consent ",
        "Financial ",
        "Current ",
        "Complete ",
        "Comprehensive ",
        "Continue ",
        "Add ",
        "Increase ",
        "Past ",
        "Family ",
        "Social ",
        "Review ",
        "Treatment ",
        "Provider ",
        "Contact ",
        "Relationship ",
        "Digital ",
        "Online ",
        "Vehicle ",
        "Transportation ",
        "Device ",
        "Implant ",
        "Professional ",
        "Biometric ",
        "Identifying ",
        "Visual ",
        "Reports ",
        "Symptom ",
        "Died ",
        "History ",
        "Diagnosed ",
        "NPO ",
        "Education ",
        "Paternal ",
        "Maternal ",
        "Consulting ",
        "Admitting ",
        "Sister ",
        "Brother ",
        "Allergic ",
        "Seasonal ",
        "General ",
        "Zip ",
        "Lives ",
        "Next ",
        "Medtronic ",
        "Zimmer ",
    ];
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        for (const start of InvalidPrefixFilter.INVALID_STARTS) {
            if (span.text.startsWith(start)) {
                return false;
            }
        }
        return true;
    }
}
exports.InvalidPrefixFilter = InvalidPrefixFilter;
/**
 * Filter for invalid suffix words
 */
class InvalidSuffixFilter {
    name = "InvalidSuffix";
    static INVALID_ENDINGS = [
        " the",
        " at",
        " in",
        " on",
        " to",
        " from",
        " reviewed",
        " case",
        " was",
        " is",
        " are",
        " patient",
        " doctor",
        " nurse",
        " staff",
        " phone",
        " address",
        " email",
        " number",
        " contact",
        " portal",
        " history",
        " status",
        " results",
        " plan",
        " notes",
        " unit",
        " rate",
        " pressure",
        " signs",
        " level",
        " build",
        " network",
        " angina",
        " support",
        " education",
        " planning",
        " studies",
        " management",
        " drip",
        " vehicle",
        " model",
        " location",
        " situation",
        " use",
        " boulder",
        " boston",
        " denver",
        " colorado",
        // Additional invalid endings
        " name",
        " illness",
        " complaint",
        " appearance",
        " notice",
        " rights",
        " responsibilities",
        " treatment",
        " directive",
        " rhinitis",
        " medications",
        " count",
        " panel",
        " mellitus",
        " lisinopril",
        " aspirin",
        " atorvastatin",
        " metoprolol",
        " metformin",
        " information",
        " identifiers",
        " characteristics",
        "-up",
        " hipaa",
    ];
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        const nameLower = span.text.toLowerCase();
        for (const ending of InvalidSuffixFilter.INVALID_ENDINGS) {
            if (nameLower.endsWith(ending)) {
                return false;
            }
        }
        return true;
    }
}
exports.InvalidSuffixFilter = InvalidSuffixFilter;
/**
 * Filter for common medical/clinical phrases
 * Uses externalized config from config/post-filter/
 */
class MedicalPhraseFilter {
    name = "MedicalPhrase";
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        if ((0, post_filter_1.getMedicalPhrases)().has(span.text.toLowerCase())) {
            return false;
        }
        return true;
    }
}
exports.MedicalPhraseFilter = MedicalPhraseFilter;
/**
 * Filter for medical condition suffixes
 */
class MedicalSuffixFilter {
    name = "MedicalSuffix";
    static MEDICAL_SUFFIXES = [
        "Disorder",
        "Mellitus",
        "Disease",
        "Syndrome",
        "Infection",
        "Condition",
        // Facility / org suffixes (common false positives for NAME detection)
        "Health",
        "Hospital",
        "Clinic",
        "Center",
        "Partners",
        "Group",
        "Medical",
        "Medicine",
        "System",
        "Systems",
        "Pressure",
        "Rate",
        "Signs",
        "Phone",
        "Address",
        "Email",
        "Portal",
        "History",
        "Examination",
        "Studies",
        "Management",
        "Planning",
    ];
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        for (const suffix of MedicalSuffixFilter.MEDICAL_SUFFIXES) {
            if (span.text.endsWith(suffix)) {
                return false;
            }
        }
        return true;
    }
}
exports.MedicalSuffixFilter = MedicalSuffixFilter;
/**
 * Filter out name spans that cross line boundaries.
 * Real person names should never include newlines; this prevents swallowing
 * the next line's label (e.g., "Hospital: X\\nDx: ...").
 */
class NameLineBreakFilter {
    name = "NameLineBreak";
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        if (!/[\r\n]/.test(span.text)) {
            return true;
        }
        // If the span crosses into the next line and that next line starts with a
        // common medical field label, this is almost certainly a false positive.
        // Example: "Hospital: Foo\\nDx: Bar" -> avoid swallowing "Dx" into a name span.
        const parts = span.text.split(/\r?\n/);
        const afterNewline = parts.slice(1).join(" ").trim();
        const labelLike = /^(?:dx|dob|mrn|age|phone|fax|email|address|street|zip|zipcode|npi|dea|ssn|patient|provider)\b[:\s-]*/i;
        if (labelLike.test(afterNewline)) {
            return false;
        }
        // If the post-newline tail contains a short label-ish fragment ending with ":"
        // it's also a strong indicator we captured a field label.
        if (afterNewline.length > 0 &&
            afterNewline.length <= 24 &&
            /:/.test(afterNewline)) {
            return false;
        }
        // Otherwise allow newline-separated names (rare but possible in OCR/layout).
        return true;
    }
}
/**
 * Filter for geographic terms that aren't names
 * Uses externalized config from config/post-filter/
 */
class GeographicTermFilter {
    name = "GeographicTerm";
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        const words = span.text.toLowerCase().split(/\s+/);
        const geoTerms = (0, post_filter_1.getGeoTerms)();
        for (const word of words) {
            if (geoTerms.has(word)) {
                return false;
            }
        }
        return true;
    }
}
exports.GeographicTermFilter = GeographicTermFilter;
/**
 * Filter for common field labels
 * Uses externalized config from config/post-filter/
 */
class FieldLabelFilter {
    name = "FieldLabel";
    shouldKeep(span, _text) {
        if (span.filterType !== "NAME") {
            return true;
        }
        if ((0, post_filter_1.getFieldLabels)().has(span.text.toLowerCase())) {
            return false;
        }
        return true;
    }
}
exports.FieldLabelFilter = FieldLabelFilter;
/**
 * Filter spans below adaptive confidence threshold
 *
 * Uses AdaptiveThresholdService to determine context-aware thresholds
 * based on document type, specialty, and PHI type.
 */
class ConfidenceThresholdFilter {
    name = "ConfidenceThreshold";
    // Document-level context cache (set before filtering batch)
    static documentContext = null;
    /**
     * Set the document context for adaptive threshold calculation
     * Call this before filtering a batch of spans from the same document
     */
    static setDocumentContext(context) {
        ConfidenceThresholdFilter.documentContext = context;
    }
    /**
     * Clear document context after processing
     */
    static clearDocumentContext() {
        ConfidenceThresholdFilter.documentContext = null;
    }
    shouldKeep(span, _text) {
        // Get PHI type from filter type
        const phiType = this.filterTypeToPHIType(span.filterType);
        // Build context for this span
        const context = {
            ...ConfidenceThresholdFilter.documentContext,
            phiType,
        };
        // Get adaptive threshold for this context
        const threshold = AdaptiveThresholdService_1.adaptiveThresholds.getMinimumThreshold(context);
        // Keep if confidence meets threshold
        return span.confidence >= threshold;
    }
    /**
     * Map FilterType to PHIType for threshold lookup
     */
    filterTypeToPHIType(filterType) {
        const mapping = {
            NAME: "NAME",
            DATE: "DATE",
            AGE: "AGE",
            SSN: "SSN",
            MRN: "MRN",
            PHONE: "PHONE",
            FAX: "FAX",
            EMAIL: "EMAIL",
            ADDRESS: "ADDRESS",
            ZIP: "ZIP",
            IP_ADDRESS: "IP_ADDRESS",
            URL: "URL",
            ACCOUNT: "ACCOUNT",
            LICENSE: "LICENSE",
            VEHICLE_ID: "VEHICLE_ID",
            DEVICE: "DEVICE_ID",
            BIOMETRIC: "BIOMETRIC",
            HEALTH_PLAN: "HEALTH_PLAN",
        };
        return mapping[filterType];
    }
}
// =============================================================================
// POST FILTER SERVICE
// =============================================================================
/**
 * PostFilterService - Orchestrates all post-detection filtering strategies
 *
 * This service applies multiple filtering strategies to remove false positives
 * from detected spans before they are tokenized.
 */
class PostFilterService {
    static strategies = [
        // Confidence threshold filter runs first (adaptive thresholds)
        new ConfidenceThresholdFilter(),
        // Rule-based filters
        new DevicePhoneFalsePositiveFilter(),
        new SectionHeadingFilter(),
        new StructureWordFilter(),
        new ShortNameFilter(),
        new InvalidPrefixFilter(),
        new InvalidSuffixFilter(),
        new NameLineBreakFilter(),
        new MedicalPhraseFilter(),
        new MedicalSuffixFilter(),
        new GeographicTermFilter(),
        new FieldLabelFilter(),
    ];
    /**
     * Set document context for adaptive threshold calculation
     * Call before filtering spans from a document
     */
    static setAdaptiveContext(context) {
        ConfidenceThresholdFilter.setDocumentContext(context);
    }
    /**
     * Clear adaptive context after processing
     */
    static clearAdaptiveContext() {
        ConfidenceThresholdFilter.clearDocumentContext();
    }
    static filterTs(spans, text) {
        return spans.filter((span) => {
            for (const strategy of PostFilterService.strategies) {
                if (!strategy.shouldKeep(span, text)) {
                    RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Post-filter [${strategy.name}] removed: "${span.text}"`);
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Apply all post-filter strategies to remove false positives
     *
     * @param spans - Detected spans to filter
     * @param text - Full document text for context
     * @returns Filtered spans with false positives removed
     */
    static filter(spans, text, options = {}) {
        const wantsRust = isPostFilterAccelEnabled();
        const wantsShadow = isPostFilterShadowEnabled();
        const binding = wantsRust || wantsShadow ? getPostFilterBinding() : null;
        const postfilterDecisions = binding?.postfilterDecisions;
        const rustAvailable = typeof postfilterDecisions === "function";
        const shadowReport = options.shadowReport;
        if (shadowReport) {
            shadowReport.enabled = wantsShadow;
            shadowReport.rustAvailable = rustAvailable;
            shadowReport.rustEnabled = wantsRust && rustAvailable;
            shadowReport.inputSpans = spans.length;
            shadowReport.tsKept = 0;
            shadowReport.rustKept = 0;
            shadowReport.missingInRust = 0;
            shadowReport.extraInRust = 0;
        }
        const shouldUseRust = wantsRust && rustAvailable;
        const tsFiltered = wantsShadow || !shouldUseRust
            ? PostFilterService.filterTs(spans, text)
            : null;
        if (!shouldUseRust) {
            if (shadowReport && tsFiltered) {
                shadowReport.tsKept = tsFiltered.length;
                shadowReport.rustKept = 0;
                shadowReport.missingInRust = 0;
                shadowReport.extraInRust = 0;
            }
            return tsFiltered ?? PostFilterService.filterTs(spans, text);
        }
        const decisions = postfilterDecisions(spans.map((s) => ({
            filterType: String(s.filterType),
            text: s.text,
            confidence: s.confidence,
        })));
        const rustFiltered = [];
        for (let i = 0; i < spans.length; i++) {
            const decision = decisions[i];
            if (decision?.keep) {
                rustFiltered.push(spans[i]);
                continue;
            }
            RadiologyLogger_1.RadiologyLogger.info("REDACTION", `Post-filter [${decision?.removedBy ?? "Rust"}] removed: "${spans[i].text}"`);
        }
        if (shadowReport && tsFiltered) {
            shadowReport.tsKept = tsFiltered.length;
            shadowReport.rustKept = rustFiltered.length;
            const tsKept = new Set(tsFiltered.map((s) => `${s.characterStart}-${s.characterEnd}-${s.filterType}`));
            const rustKept = new Set(rustFiltered.map((s) => `${s.characterStart}-${s.characterEnd}-${s.filterType}`));
            let missingInRust = 0;
            for (const k of tsKept)
                if (!rustKept.has(k))
                    missingInRust++;
            let extraInRust = 0;
            for (const k of rustKept)
                if (!tsKept.has(k))
                    extraInRust++;
            shadowReport.missingInRust = missingInRust;
            shadowReport.extraInRust = extraInRust;
        }
        return rustFiltered;
    }
    /**
     * Get list of active strategy names
     */
    static getStrategyNames() {
        return PostFilterService.strategies.map((s) => s.name);
    }
    /**
     * Apply post-filter with ML-based false positive detection (async version)
     *
     * This method runs:
     * 1. All rule-based strategies (sync)
     * 2. ML false positive classifier (async, if enabled)
     *
     * @param spans - Detected spans to filter
     * @param text - Full document text for context
     * @returns Filtered spans with false positives removed
     */
    static async filterAsync(spans, text, options = {}) {
        // First apply rule-based filters
        const ruleFiltered = PostFilterService.filter(spans, text, options);
        // Then apply ML FP classifier (if enabled)
        try {
            const mlFiltered = await (0, FalsePositiveClassifier_1.applyMLFalsePositiveFilter)(ruleFiltered, text);
            return mlFiltered;
        }
        catch (error) {
            RadiologyLogger_1.RadiologyLogger.error("REDACTION", `ML FP filter failed, returning rule-based results: ${error}`);
            return ruleFiltered;
        }
    }
}
exports.PostFilterService = PostFilterService;
//# sourceMappingURL=PostFilterService.js.map