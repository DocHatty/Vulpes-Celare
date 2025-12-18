"use strict";
/**
 * MultiPatternScanner - High-Performance Multi-Pattern Matching
 *
 * Scans text against all PHI patterns in a single optimized pass.
 *
 * RUST ACCELERATION (PRIMARY):
 * - Uses Rust `scan_all_identifiers` for 50-100x speedup
 * - All patterns compiled into optimized Rust regex engine
 * - Automatic UTF-16 index mapping for JS interop
 * - Enabled by default via VULPES_SCAN_ACCEL=1
 *
 * TYPESCRIPT FALLBACK:
 * - Groups patterns by type for cache-friendly access
 * - Uses sticky regex for efficient sequential scanning
 * - Used when Rust binding unavailable
 *
 * @module redaction/dfa
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZigDFAScanner = exports.RustDFAScanner = exports.MultiPatternScanner = void 0;
exports.getMultiPatternScanner = getMultiPatternScanner;
exports.isDFAScanningEnabled = isDFAScanningEnabled;
exports.isRustAccelerationAvailable = isRustAccelerationAvailable;
exports.scanWithDFA = scanWithDFA;
const patterns_1 = require("./patterns");
const binding_1 = require("../native/binding");
const RustAccelConfig_1 = require("../config/RustAccelConfig");
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
function isRustScanEnabled() {
    return RustAccelConfig_1.RustAccelConfig.isScanKernelEnabled();
}
/**
 * MultiPatternScanner - Main scanner class
 *
 * Uses Rust acceleration by default for 50-100x speedup.
 * Falls back to TypeScript implementation when Rust unavailable.
 */
class MultiPatternScanner {
    patterns;
    patternsByType;
    useRust = false;
    rustScanFn = null;
    // Statistics
    totalScans = 0;
    totalMatches = 0;
    totalTimeMs = 0;
    rustScans = 0;
    tsScans = 0;
    constructor(customPatterns) {
        this.patterns = customPatterns || patterns_1.ALL_PATTERNS;
        this.patternsByType = this.groupByType();
        // Initialize Rust acceleration
        if (isRustScanEnabled()) {
            const binding = getBinding();
            if (binding?.scanAllIdentifiers) {
                this.rustScanFn = binding.scanAllIdentifiers;
                this.useRust = true;
            }
        }
    }
    groupByType() {
        const map = new Map();
        for (const pattern of this.patterns) {
            if (!map.has(pattern.filterType)) {
                map.set(pattern.filterType, []);
            }
            map.get(pattern.filterType).push(pattern);
        }
        return map;
    }
    /**
     * Scan text for all patterns
     *
     * Uses Rust scan_all_identifiers when available (50-100x faster).
     * Falls back to TypeScript regex scanning otherwise.
     */
    scan(text) {
        const startTime = performance.now();
        // Try Rust path first (primary)
        if (this.useRust && this.rustScanFn) {
            try {
                const rustMatches = this.rustScanFn(text);
                const endTime = performance.now();
                const scanTimeMs = endTime - startTime;
                // Convert Rust results to ScanMatch format
                const matches = rustMatches.map((rm) => ({
                    patternId: `RUST_${rm.filterType}`,
                    filterType: rm.filterType,
                    text: rm.text,
                    start: rm.characterStart,
                    end: rm.characterEnd,
                    confidence: rm.confidence,
                    groups: [],
                }));
                // Update stats
                this.totalScans++;
                this.rustScans++;
                this.totalMatches += matches.length;
                this.totalTimeMs += scanTimeMs;
                return {
                    matches,
                    stats: {
                        textLength: text.length,
                        patternsChecked: this.patterns.length,
                        matchesFound: matches.length,
                        scanTimeMs,
                    },
                };
            }
            catch {
                // Fall through to TypeScript path
            }
        }
        // TypeScript fallback path
        return this.scanTypeScript(text);
    }
    /**
     * TypeScript-only scan (fallback)
     */
    scanTypeScript(text) {
        const startTime = performance.now();
        const matches = [];
        for (const pattern of this.patterns) {
            // Reset regex state
            pattern.regex.lastIndex = 0;
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                // Run validator if present
                if (pattern.validator && !pattern.validator(match[0])) {
                    continue;
                }
                matches.push({
                    patternId: pattern.id,
                    filterType: pattern.filterType,
                    text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: pattern.confidence,
                    groups: match.slice(1),
                });
            }
        }
        const endTime = performance.now();
        const scanTimeMs = endTime - startTime;
        // Update stats
        this.totalScans++;
        this.tsScans++;
        this.totalMatches += matches.length;
        this.totalTimeMs += scanTimeMs;
        return {
            matches,
            stats: {
                textLength: text.length,
                patternsChecked: this.patterns.length,
                matchesFound: matches.length,
                scanTimeMs,
            },
        };
    }
    /**
     * Check if Rust acceleration is active
     */
    isRustAccelerated() {
        return this.useRust;
    }
    /**
     * Scan for specific filter types only
     */
    scanForTypes(text, types) {
        const startTime = performance.now();
        const matches = [];
        for (const type of types) {
            const patterns = this.patternsByType.get(type);
            if (!patterns)
                continue;
            for (const pattern of patterns) {
                pattern.regex.lastIndex = 0;
                let match;
                while ((match = pattern.regex.exec(text)) !== null) {
                    if (pattern.validator && !pattern.validator(match[0])) {
                        continue;
                    }
                    matches.push({
                        patternId: pattern.id,
                        filterType: pattern.filterType,
                        text: match[0],
                        start: match.index,
                        end: match.index + match[0].length,
                        confidence: pattern.confidence,
                        groups: match.slice(1),
                    });
                }
            }
        }
        const endTime = performance.now();
        return {
            matches,
            stats: {
                textLength: text.length,
                patternsChecked: types.reduce((sum, t) => sum + (this.patternsByType.get(t)?.length || 0), 0),
                matchesFound: matches.length,
                scanTimeMs: endTime - startTime,
            },
        };
    }
    /**
     * Get scanner statistics
     */
    getStats() {
        return {
            patterns: (0, patterns_1.getPatternStats)(),
            scans: {
                total: this.totalScans,
                totalMatches: this.totalMatches,
                avgTimeMs: this.totalScans > 0 ? this.totalTimeMs / this.totalScans : 0,
                rustScans: this.rustScans,
                tsScans: this.tsScans,
                rustAccelerated: this.useRust,
            },
        };
    }
    /**
     * Reset scan statistics
     */
    resetStats() {
        this.totalScans = 0;
        this.totalMatches = 0;
        this.totalTimeMs = 0;
    }
}
exports.MultiPatternScanner = MultiPatternScanner;
/**
 * Rust DFA Scanner - Uses scan_all_identifiers from Rust binding
 *
 * Enabled by default when Rust binding is available.
 * Set VULPES_SCAN_ACCEL=0 to disable.
 */
class RustDFAScannerImpl {
    initialized = false;
    available = false;
    scanFn = null;
    init() {
        if (this.initialized)
            return;
        this.initialized = true;
        if (!isRustScanEnabled()) {
            return;
        }
        try {
            const binding = getBinding();
            if (binding?.scanAllIdentifiers) {
                this.scanFn = binding.scanAllIdentifiers;
                this.available = true;
            }
        }
        catch {
            // Rust binding not available
        }
    }
    scan(text) {
        this.init();
        if (this.available && this.scanFn) {
            const rustMatches = this.scanFn(text);
            return rustMatches.map((rm) => ({
                patternId: `RUST_${rm.filterType}`,
                filterType: rm.filterType,
                text: rm.text,
                start: rm.characterStart,
                end: rm.characterEnd,
                confidence: rm.confidence,
                groups: [],
            }));
        }
        // Fall back to TypeScript implementation
        return getMultiPatternScanner().scan(text).matches;
    }
    isAvailable() {
        this.init();
        return this.available;
    }
}
exports.RustDFAScanner = new RustDFAScannerImpl();
// Legacy alias for backwards compatibility
exports.ZigDFAScanner = exports.RustDFAScanner;
// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════
let sharedScanner = null;
/**
 * Get shared scanner instance
 */
function getMultiPatternScanner() {
    if (!sharedScanner) {
        sharedScanner = new MultiPatternScanner();
    }
    return sharedScanner;
}
/**
 * Check if DFA scanning is enabled (Rust acceleration)
 */
function isDFAScanningEnabled() {
    return exports.RustDFAScanner.isAvailable() || process.env.VULPES_DFA_SCAN === "1";
}
/**
 * Check if Rust acceleration is available
 */
function isRustAccelerationAvailable() {
    return exports.RustDFAScanner.isAvailable();
}
/**
 * Scan text using the best available method
 *
 * Priority:
 * 1. Rust scan_all_identifiers (50-100x faster)
 * 2. TypeScript regex fallback
 */
function scanWithDFA(text) {
    // The MultiPatternScanner already handles Rust vs TS selection
    return getMultiPatternScanner().scan(text);
}
//# sourceMappingURL=MultiPatternScanner.js.map