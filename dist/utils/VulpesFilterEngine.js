"use strict";
/**
 * VulpesFilterEngine - Unified PHI Scanning Interface
 *
 * This module provides a unified interface for PHI detection that
 * combines Rust-accelerated scanning with TypeScript filters.
 *
 * ARCHITECTURE:
 * 1. Rust `scanAllIdentifiers()` handles pattern-based detection (SSN, Phone, Email, etc.)
 * 2. TypeScript filters handle context-aware detection (Names, Addresses, etc.)
 * 3. Results are merged and deduplicated
 *
 * PERFORMANCE:
 * - Single Rust NAPI call for all pattern-based identifiers
 * - Reduces N individual regex scans to 1 optimized Rust scan
 * - Estimated 3-5x speedup for pattern-heavy documents
 *
 * @module utils/VulpesFilterEngine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VulpesFilterEngine = void 0;
exports.isUnifiedScannerAvailable = isUnifiedScannerAvailable;
exports.isUnifiedScannerEnabled = isUnifiedScannerEnabled;
exports.scanAllWithRust = scanAllWithRust;
exports.detectionsToSpans = detectionsToSpans;
exports.getRustSupportedTypes = getRustSupportedTypes;
exports.getTypeScriptOnlyTypes = getTypeScriptOnlyTypes;
const binding_1 = require("../native/binding");
const Span_1 = require("../models/Span");
const RustAccelConfig_1 = require("../config/RustAccelConfig");
// Cache the native binding
let cachedBinding = undefined;
function getBinding() {
    if (cachedBinding !== undefined)
        return cachedBinding;
    try {
        cachedBinding = (0, binding_1.loadNativeBinding)({ configureOrt: false });
    }
    catch {
        cachedBinding = null;
    }
    return cachedBinding;
}
/**
 * Check if unified Rust scanning is available
 */
function isUnifiedScannerAvailable() {
    const binding = getBinding();
    return typeof binding?.scanAllIdentifiers === "function";
}
/**
 * Check if unified Rust scanning is enabled
 */
function isUnifiedScannerEnabled() {
    return (RustAccelConfig_1.RustAccelConfig.isScanKernelEnabled() && isUnifiedScannerAvailable());
}
/**
 * Scan text using the unified Rust scanner
 * Returns all pattern-based PHI detections in a single call
 */
function scanAllWithRust(text) {
    if (!isUnifiedScannerEnabled())
        return null;
    const binding = getBinding();
    const scanAll = binding?.scanAllIdentifiers;
    if (typeof scanAll !== "function")
        return null;
    try {
        const detections = scanAll(text) ?? [];
        return detections.map((d) => ({
            filterType: d.filterType,
            characterStart: d.characterStart,
            characterEnd: d.characterEnd,
            text: d.text,
            confidence: d.confidence,
            pattern: d.pattern,
            source: "rust",
        }));
    }
    catch {
        return null;
    }
}
/**
 * Convert unified detections to Span objects
 */
function detectionsToSpans(detections, fullText) {
    return detections.map((d) => {
        const contextStart = Math.max(0, d.characterStart - 50);
        const contextEnd = Math.min(fullText.length, d.characterEnd + 50);
        return new Span_1.Span({
            text: d.text,
            originalValue: d.text,
            characterStart: d.characterStart,
            characterEnd: d.characterEnd,
            filterType: d.filterType,
            confidence: d.confidence,
            priority: d.source === "rust" ? 80 : 70, // Rust detections get slightly higher priority
            context: fullText.substring(contextStart, contextEnd),
            window: [],
            replacement: null,
            salt: null,
            pattern: `${d.source}:${d.pattern}`,
            applied: false,
            ignored: false,
            ambiguousWith: [],
            disambiguationScore: null,
        });
    });
}
/**
 * Get supported filter types from the Rust scanner
 */
function getRustSupportedTypes() {
    return [
        Span_1.FilterType.SSN,
        Span_1.FilterType.PHONE,
        Span_1.FilterType.EMAIL,
        Span_1.FilterType.IP,
        Span_1.FilterType.URL,
        Span_1.FilterType.FAX,
        Span_1.FilterType.MRN,
        Span_1.FilterType.ZIPCODE,
        Span_1.FilterType.CREDIT_CARD,
        Span_1.FilterType.ACCOUNT,
        Span_1.FilterType.LICENSE,
        Span_1.FilterType.HEALTH_PLAN,
        Span_1.FilterType.PASSPORT,
        Span_1.FilterType.DATE,
        Span_1.FilterType.ADDRESS,
        Span_1.FilterType.VEHICLE,
        Span_1.FilterType.DEVICE,
    ];
}
/**
 * Get filter types that require TypeScript (not yet in Rust)
 */
function getTypeScriptOnlyTypes() {
    return [Span_1.FilterType.NAME, Span_1.FilterType.AGE, Span_1.FilterType.BIOMETRIC];
}
/**
 * VulpesFilterEngine - Unified scanning interface
 */
exports.VulpesFilterEngine = {
    /**
     * Check if the unified scanner is available and enabled
     */
    isAvailable: isUnifiedScannerAvailable,
    isEnabled: isUnifiedScannerEnabled,
    /**
     * Scan text for all pattern-based PHI using Rust
     * This is the primary entry point for unified scanning
     */
    scanAll(text) {
        const startTime = performance.now();
        const rustAvailable = isUnifiedScannerAvailable();
        const rustEnabled = isUnifiedScannerEnabled();
        let rustDetections = [];
        if (rustEnabled) {
            const result = scanAllWithRust(text);
            if (result) {
                rustDetections = result;
            }
        }
        const endTime = performance.now();
        return {
            detections: rustDetections,
            stats: {
                rustDetections: rustDetections.length,
                tsDetections: 0, // TypeScript filters run separately in the pipeline
                totalDetections: rustDetections.length,
                scanTimeMs: endTime - startTime,
                rustAvailable,
                rustEnabled,
            },
        };
    },
    /**
     * Convert detections to Spans for pipeline integration
     */
    toSpans: detectionsToSpans,
    /**
     * Get filter types supported by Rust scanner
     */
    rustSupportedTypes: getRustSupportedTypes,
    /**
     * Get filter types that require TypeScript
     */
    tsOnlyTypes: getTypeScriptOnlyTypes,
    /**
     * Get status information
     */
    getStatus() {
        return {
            available: isUnifiedScannerAvailable(),
            enabled: isUnifiedScannerEnabled(),
            rustTypes: getRustSupportedTypes().length,
            tsTypes: getTypeScriptOnlyTypes().length,
        };
    },
};
exports.default = exports.VulpesFilterEngine;
//# sourceMappingURL=VulpesFilterEngine.js.map