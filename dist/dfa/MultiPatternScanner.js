"use strict";
/**
 * MultiPatternScanner - High-Performance Multi-Pattern Matching
 *
 * Scans text against all PHI patterns in a single optimized pass.
 * This is the TypeScript implementation that can be replaced with
 * Zig comptime DFA for 50-200x performance improvement.
 *
 * CURRENT IMPLEMENTATION:
 * - Groups patterns by type for cache-friendly access
 * - Uses sticky regex for efficient sequential scanning
 * - Caches compiled patterns
 *
 * FUTURE ZIG IMPLEMENTATION:
 * - All patterns compiled into ONE DFA at build time
 * - Single-pass O(n) scan regardless of pattern count
 * - SIMD-accelerated state transitions
 *
 * @module redaction/dfa
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZigDFAScanner = exports.MultiPatternScanner = void 0;
exports.getMultiPatternScanner = getMultiPatternScanner;
exports.isDFAScanningEnabled = isDFAScanningEnabled;
exports.scanWithDFA = scanWithDFA;
const patterns_1 = require("./patterns");
/**
 * MultiPatternScanner - Main scanner class
 */
class MultiPatternScanner {
    patterns;
    patternsByType;
    // Statistics
    totalScans = 0;
    totalMatches = 0;
    totalTimeMs = 0;
    constructor(customPatterns) {
        this.patterns = customPatterns || patterns_1.ALL_PATTERNS;
        this.patternsByType = this.groupByType();
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
     */
    scan(text) {
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
 * Placeholder for Zig DFA scanner - will be implemented when Zig bindings are added
 */
exports.ZigDFAScanner = {
    scan(_text) {
        // TODO: Implement Zig DFA bindings
        // This would call into a compiled Zig module via NAPI
        return [];
    },
    isAvailable() {
        // Check if Zig native module is loaded
        return false;
    },
};
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
 * Check if DFA scanning is enabled (via Zig or TypeScript fallback)
 */
function isDFAScanningEnabled() {
    return process.env.VULPES_DFA_SCAN === "1";
}
/**
 * Scan text using the best available method
 */
function scanWithDFA(text) {
    // Try Zig DFA first
    if (exports.ZigDFAScanner.isAvailable()) {
        const matches = exports.ZigDFAScanner.scan(text);
        return {
            matches,
            stats: {
                textLength: text.length,
                patternsChecked: patterns_1.ALL_PATTERNS.length,
                matchesFound: matches.length,
                scanTimeMs: 0, // Zig reports its own timing
            },
        };
    }
    // Fall back to TypeScript
    return getMultiPatternScanner().scan(text);
}
//# sourceMappingURL=MultiPatternScanner.js.map