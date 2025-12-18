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
import { Span, FilterType } from "../models/Span";
/**
 * Detection result from the unified scanner
 */
export interface UnifiedDetection {
    filterType: string;
    characterStart: number;
    characterEnd: number;
    text: string;
    confidence: number;
    pattern: string;
    source: "rust" | "typescript";
}
/**
 * Scan result with statistics
 */
export interface UnifiedScanResult {
    detections: UnifiedDetection[];
    stats: {
        rustDetections: number;
        tsDetections: number;
        totalDetections: number;
        scanTimeMs: number;
        rustAvailable: boolean;
        rustEnabled: boolean;
    };
}
/**
 * Check if unified Rust scanning is available
 */
export declare function isUnifiedScannerAvailable(): boolean;
/**
 * Check if unified Rust scanning is enabled
 */
export declare function isUnifiedScannerEnabled(): boolean;
/**
 * Scan text using the unified Rust scanner
 * Returns all pattern-based PHI detections in a single call
 */
export declare function scanAllWithRust(text: string): UnifiedDetection[] | null;
/**
 * Convert unified detections to Span objects
 */
export declare function detectionsToSpans(detections: UnifiedDetection[], fullText: string): Span[];
/**
 * Get supported filter types from the Rust scanner
 */
export declare function getRustSupportedTypes(): FilterType[];
/**
 * Get filter types that require TypeScript (not yet in Rust)
 */
export declare function getTypeScriptOnlyTypes(): FilterType[];
/**
 * VulpesFilterEngine - Unified scanning interface
 */
export declare const VulpesFilterEngine: {
    /**
     * Check if the unified scanner is available and enabled
     */
    isAvailable: typeof isUnifiedScannerAvailable;
    isEnabled: typeof isUnifiedScannerEnabled;
    /**
     * Scan text for all pattern-based PHI using Rust
     * This is the primary entry point for unified scanning
     */
    scanAll(text: string): UnifiedScanResult;
    /**
     * Convert detections to Spans for pipeline integration
     */
    toSpans: typeof detectionsToSpans;
    /**
     * Get filter types supported by Rust scanner
     */
    rustSupportedTypes: typeof getRustSupportedTypes;
    /**
     * Get filter types that require TypeScript
     */
    tsOnlyTypes: typeof getTypeScriptOnlyTypes;
    /**
     * Get status information
     */
    getStatus(): {
        available: boolean;
        enabled: boolean;
        rustTypes: number;
        tsTypes: number;
    };
};
export default VulpesFilterEngine;
//# sourceMappingURL=VulpesFilterEngine.d.ts.map