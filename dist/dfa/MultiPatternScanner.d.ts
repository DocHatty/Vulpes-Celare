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
import { FilterType } from "../models/Span";
import { PatternDef } from "./patterns";
export interface ScanMatch {
    patternId: string;
    filterType: FilterType;
    text: string;
    start: number;
    end: number;
    confidence: number;
    groups: string[];
}
export interface ScanResult {
    matches: ScanMatch[];
    stats: {
        textLength: number;
        patternsChecked: number;
        matchesFound: number;
        scanTimeMs: number;
    };
}
/**
 * MultiPatternScanner - Main scanner class
 */
export declare class MultiPatternScanner {
    private patterns;
    private patternsByType;
    private totalScans;
    private totalMatches;
    private totalTimeMs;
    constructor(customPatterns?: PatternDef[]);
    private groupByType;
    /**
     * Scan text for all patterns
     */
    scan(text: string): ScanResult;
    /**
     * Scan for specific filter types only
     */
    scanForTypes(text: string, types: FilterType[]): ScanResult;
    /**
     * Get scanner statistics
     */
    getStats(): {
        patterns: {
            total: number;
            byType: Record<string, number>;
        };
        scans: {
            total: number;
            totalMatches: number;
            avgTimeMs: number;
        };
    };
    /**
     * Reset scan statistics
     */
    resetStats(): void;
}
export interface ZigDFAScannerInterface {
    scan(text: string): ScanMatch[];
    isAvailable(): boolean;
}
/**
 * Placeholder for Zig DFA scanner - will be implemented when Zig bindings are added
 */
export declare const ZigDFAScanner: ZigDFAScannerInterface;
/**
 * Get shared scanner instance
 */
export declare function getMultiPatternScanner(): MultiPatternScanner;
/**
 * Check if DFA scanning is enabled (via Zig or TypeScript fallback)
 */
export declare function isDFAScanningEnabled(): boolean;
/**
 * Scan text using the best available method
 */
export declare function scanWithDFA(text: string): ScanResult;
//# sourceMappingURL=MultiPatternScanner.d.ts.map