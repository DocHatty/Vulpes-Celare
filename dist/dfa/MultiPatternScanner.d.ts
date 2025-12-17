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
 *
 * Uses Rust acceleration by default for 50-100x speedup.
 * Falls back to TypeScript implementation when Rust unavailable.
 */
export declare class MultiPatternScanner {
    private patterns;
    private patternsByType;
    private useRust;
    private rustScanFn;
    private totalScans;
    private totalMatches;
    private totalTimeMs;
    private rustScans;
    private tsScans;
    constructor(customPatterns?: PatternDef[]);
    private groupByType;
    /**
     * Scan text for all patterns
     *
     * Uses Rust scan_all_identifiers when available (50-100x faster).
     * Falls back to TypeScript regex scanning otherwise.
     */
    scan(text: string): ScanResult;
    /**
     * TypeScript-only scan (fallback)
     */
    private scanTypeScript;
    /**
     * Check if Rust acceleration is active
     */
    isRustAccelerated(): boolean;
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
            rustScans: number;
            tsScans: number;
            rustAccelerated: boolean;
        };
    };
    /**
     * Reset scan statistics
     */
    resetStats(): void;
}
/**
 * Interface for native Rust DFA scanner
 *
 * The Rust scanner provides:
 * - All PHI patterns compiled into optimized Rust regex engine
 * - Single-pass scanning with UTF-16 index mapping
 * - 50-100x speedup over TypeScript regex
 * - Automatic OCR normalization for fuzzy matching
 */
export interface RustDFAScannerInterface {
    scan(text: string): ScanMatch[];
    isAvailable(): boolean;
}
export declare const RustDFAScanner: RustDFAScannerInterface;
export declare const ZigDFAScanner: RustDFAScannerInterface;
/**
 * Get shared scanner instance
 */
export declare function getMultiPatternScanner(): MultiPatternScanner;
/**
 * Check if DFA scanning is enabled (Rust acceleration)
 */
export declare function isDFAScanningEnabled(): boolean;
/**
 * Check if Rust acceleration is available
 */
export declare function isRustAccelerationAvailable(): boolean;
/**
 * Scan text using the best available method
 *
 * Priority:
 * 1. Rust scan_all_identifiers (50-100x faster)
 * 2. TypeScript regex fallback
 */
export declare function scanWithDFA(text: string): ScanResult;
//# sourceMappingURL=MultiPatternScanner.d.ts.map