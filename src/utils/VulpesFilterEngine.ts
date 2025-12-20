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

import { loadNativeBinding } from "../native/binding";
import { Span, FilterType } from "../models/Span";
import { RustAccelConfig } from "../config/RustAccelConfig";
import { SpanFactory } from "../core/SpanFactory";

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

// Cache the native binding
let cachedBinding: ReturnType<typeof loadNativeBinding> | null | undefined =
  undefined;

function getBinding(): ReturnType<typeof loadNativeBinding> | null {
  if (cachedBinding !== undefined) return cachedBinding;
  try {
    cachedBinding = loadNativeBinding({ configureOrt: false });
  } catch {
    cachedBinding = null;
  }
  return cachedBinding;
}

/**
 * Check if unified Rust scanning is available
 */
export function isUnifiedScannerAvailable(): boolean {
  const binding = getBinding();
  return typeof binding?.scanAllIdentifiers === "function";
}

/**
 * Check if unified Rust scanning is enabled
 */
export function isUnifiedScannerEnabled(): boolean {
  return (
    RustAccelConfig.isScanKernelEnabled() && isUnifiedScannerAvailable()
  );
}

/**
 * Scan text using the unified Rust scanner
 * Returns all pattern-based PHI detections in a single call
 */
export function scanAllWithRust(text: string): UnifiedDetection[] | null {
  if (!isUnifiedScannerEnabled()) return null;

  const binding = getBinding();
  const scanAll = binding?.scanAllIdentifiers;
  if (typeof scanAll !== "function") return null;

  try {
    const detections = scanAll(text) ?? [];
    return detections.map(
      (d: {
        filterType: string;
        characterStart: number;
        characterEnd: number;
        text: string;
        confidence: number;
        pattern: string;
      }) => ({
        filterType: d.filterType,
        characterStart: d.characterStart,
        characterEnd: d.characterEnd,
        text: d.text,
        confidence: d.confidence,
        pattern: d.pattern,
        source: "rust" as const,
      })
    );
  } catch {
    return null;
  }
}

/**
 * Convert unified detections to Span objects
 */
export function detectionsToSpans(
  detections: UnifiedDetection[],
  fullText: string
): Span[] {
  return detections.map((d) => {
    return SpanFactory.fromPosition(
      fullText,
      d.characterStart,
      d.characterEnd,
      d.filterType as FilterType,
      {
        confidence: d.confidence,
        priority: d.source === "rust" ? 80 : 70, // Rust detections get slightly higher priority
        pattern: `${d.source}:${d.pattern}`,
      }
    );
  });
}

/**
 * Get supported filter types from the Rust scanner
 */
export function getRustSupportedTypes(): FilterType[] {
  return [
    FilterType.SSN,
    FilterType.PHONE,
    FilterType.EMAIL,
    FilterType.IP,
    FilterType.URL,
    FilterType.FAX,
    FilterType.MRN,
    FilterType.ZIPCODE,
    FilterType.CREDIT_CARD,
    FilterType.ACCOUNT,
    FilterType.LICENSE,
    FilterType.HEALTH_PLAN,
    FilterType.PASSPORT,
    FilterType.DATE,
    FilterType.ADDRESS,
    FilterType.VEHICLE,
    FilterType.DEVICE,
  ];
}

/**
 * Get filter types that require TypeScript (not yet in Rust)
 */
export function getTypeScriptOnlyTypes(): FilterType[] {
  return [FilterType.NAME, FilterType.AGE, FilterType.BIOMETRIC];
}

/**
 * VulpesFilterEngine - Unified scanning interface
 */
export const VulpesFilterEngine = {
  /**
   * Check if the unified scanner is available and enabled
   */
  isAvailable: isUnifiedScannerAvailable,
  isEnabled: isUnifiedScannerEnabled,

  /**
   * Scan text for all pattern-based PHI using Rust
   * This is the primary entry point for unified scanning
   */
  scanAll(text: string): UnifiedScanResult {
    const startTime = performance.now();
    const rustAvailable = isUnifiedScannerAvailable();
    const rustEnabled = isUnifiedScannerEnabled();

    let rustDetections: UnifiedDetection[] = [];

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
  getStatus(): {
    available: boolean;
    enabled: boolean;
    rustTypes: number;
    tsTypes: number;
  } {
    return {
      available: isUnifiedScannerAvailable(),
      enabled: isUnifiedScannerEnabled(),
      rustTypes: getRustSupportedTypes().length,
      tsTypes: getTypeScriptOnlyTypes().length,
    };
  },
};

export default VulpesFilterEngine;
