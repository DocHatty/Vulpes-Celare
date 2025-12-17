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
import { ALL_PATTERNS, PatternDef, getPatternStats } from "./patterns";
import { loadNativeBinding } from "../native/binding";
import { RustAccelConfig } from "../config/RustAccelConfig";

// ═══════════════════════════════════════════════════════════════════════════
// RUST BINDING CACHE
// ═══════════════════════════════════════════════════════════════════════════

type RustScanResult = {
  filterType: string;
  characterStart: number;
  characterEnd: number;
  text: string;
  confidence: number;
  pattern: string;
};

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

function isRustScanEnabled(): boolean {
  return RustAccelConfig.isScanKernelEnabled();
}

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
export class MultiPatternScanner {
  private patterns: PatternDef[];
  private patternsByType: Map<FilterType, PatternDef[]>;
  private useRust: boolean = false;
  private rustScanFn: ((text: string) => RustScanResult[]) | null = null;

  // Statistics
  private totalScans = 0;
  private totalMatches = 0;
  private totalTimeMs = 0;
  private rustScans = 0;
  private tsScans = 0;

  constructor(customPatterns?: PatternDef[]) {
    this.patterns = customPatterns || ALL_PATTERNS;
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

  private groupByType(): Map<FilterType, PatternDef[]> {
    const map = new Map<FilterType, PatternDef[]>();

    for (const pattern of this.patterns) {
      if (!map.has(pattern.filterType)) {
        map.set(pattern.filterType, []);
      }
      map.get(pattern.filterType)!.push(pattern);
    }

    return map;
  }

  /**
   * Scan text for all patterns
   *
   * Uses Rust scan_all_identifiers when available (50-100x faster).
   * Falls back to TypeScript regex scanning otherwise.
   */
  scan(text: string): ScanResult {
    const startTime = performance.now();

    // Try Rust path first (primary)
    if (this.useRust && this.rustScanFn) {
      try {
        const rustMatches = this.rustScanFn(text);
        const endTime = performance.now();
        const scanTimeMs = endTime - startTime;

        // Convert Rust results to ScanMatch format
        const matches: ScanMatch[] = rustMatches.map((rm) => ({
          patternId: `RUST_${rm.filterType}`,
          filterType: rm.filterType as FilterType,
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
      } catch {
        // Fall through to TypeScript path
      }
    }

    // TypeScript fallback path
    return this.scanTypeScript(text);
  }

  /**
   * TypeScript-only scan (fallback)
   */
  private scanTypeScript(text: string): ScanResult {
    const startTime = performance.now();
    const matches: ScanMatch[] = [];

    for (const pattern of this.patterns) {
      // Reset regex state
      pattern.regex.lastIndex = 0;

      let match: RegExpExecArray | null;
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
  isRustAccelerated(): boolean {
    return this.useRust;
  }

  /**
   * Scan for specific filter types only
   */
  scanForTypes(text: string, types: FilterType[]): ScanResult {
    const startTime = performance.now();
    const matches: ScanMatch[] = [];

    for (const type of types) {
      const patterns = this.patternsByType.get(type);
      if (!patterns) continue;

      for (const pattern of patterns) {
        pattern.regex.lastIndex = 0;

        let match: RegExpExecArray | null;
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
        patternsChecked: types.reduce(
          (sum, t) => sum + (this.patternsByType.get(t)?.length || 0),
          0,
        ),
        matchesFound: matches.length,
        scanTimeMs: endTime - startTime,
      },
    };
  }

  /**
   * Get scanner statistics
   */
  getStats(): {
    patterns: { total: number; byType: Record<string, number> };
    scans: {
      total: number;
      totalMatches: number;
      avgTimeMs: number;
      rustScans: number;
      tsScans: number;
      rustAccelerated: boolean;
    };
  } {
    return {
      patterns: getPatternStats(),
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
  resetStats(): void {
    this.totalScans = 0;
    this.totalMatches = 0;
    this.totalTimeMs = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUST DFA SCANNER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

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

/**
 * Rust DFA Scanner - Uses scan_all_identifiers from Rust binding
 *
 * Enabled by default when Rust binding is available.
 * Set VULPES_SCAN_ACCEL=0 to disable.
 */
class RustDFAScannerImpl implements RustDFAScannerInterface {
  private initialized = false;
  private available = false;
  private scanFn: ((text: string) => RustScanResult[]) | null = null;

  private init(): void {
    if (this.initialized) return;
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
    } catch {
      // Rust binding not available
    }
  }

  scan(text: string): ScanMatch[] {
    this.init();
    if (this.available && this.scanFn) {
      const rustMatches = this.scanFn(text);
      return rustMatches.map((rm) => ({
        patternId: `RUST_${rm.filterType}`,
        filterType: rm.filterType as FilterType,
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

  isAvailable(): boolean {
    this.init();
    return this.available;
  }
}

export const RustDFAScanner: RustDFAScannerInterface = new RustDFAScannerImpl();

// Legacy alias for backwards compatibility
export const ZigDFAScanner = RustDFAScanner;

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

let sharedScanner: MultiPatternScanner | null = null;

/**
 * Get shared scanner instance
 */
export function getMultiPatternScanner(): MultiPatternScanner {
  if (!sharedScanner) {
    sharedScanner = new MultiPatternScanner();
  }
  return sharedScanner;
}

/**
 * Check if DFA scanning is enabled (Rust acceleration)
 */
export function isDFAScanningEnabled(): boolean {
  return RustDFAScanner.isAvailable() || process.env.VULPES_DFA_SCAN === "1";
}

/**
 * Check if Rust acceleration is available
 */
export function isRustAccelerationAvailable(): boolean {
  return RustDFAScanner.isAvailable();
}

/**
 * Scan text using the best available method
 *
 * Priority:
 * 1. Rust scan_all_identifiers (50-100x faster)
 * 2. TypeScript regex fallback
 */
export function scanWithDFA(text: string): ScanResult {
  // The MultiPatternScanner already handles Rust vs TS selection
  return getMultiPatternScanner().scan(text);
}
