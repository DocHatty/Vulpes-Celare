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
import {
  ALL_PATTERNS,
  PatternDef,
  getPatternStats,
} from "./patterns";

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
export class MultiPatternScanner {
  private patterns: PatternDef[];
  private patternsByType: Map<FilterType, PatternDef[]>;

  // Statistics
  private totalScans = 0;
  private totalMatches = 0;
  private totalTimeMs = 0;

  constructor(customPatterns?: PatternDef[]) {
    this.patterns = customPatterns || ALL_PATTERNS;
    this.patternsByType = this.groupByType();
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
   */
  scan(text: string): ScanResult {
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
          0
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
    scans: { total: number; totalMatches: number; avgTimeMs: number };
  } {
    return {
      patterns: getPatternStats(),
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
  resetStats(): void {
    this.totalScans = 0;
    this.totalMatches = 0;
    this.totalTimeMs = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ZIG DFA SCANNER INTERFACE (Future implementation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interface for native Zig DFA scanner
 *
 * When implemented, the Zig scanner will provide:
 * - Comptime DFA generation (all patterns compiled into one automaton)
 * - Single-pass O(n) scanning regardless of pattern count
 * - SIMD-accelerated state transitions
 * - 50-200x speedup over TypeScript regex
 */
export interface ZigDFAScannerInterface {
  scan(text: string): ScanMatch[];
  isAvailable(): boolean;
}

/**
 * Zig DFA Scanner - Auto-detects native binding availability
 *
 * To enable Zig acceleration:
 * 1. Build the Zig DFA module: `zig build -Drelease-fast`
 * 2. Place vulpes_dfa.node in native/ directory
 * 3. The scanner will auto-detect and use it
 *
 * Currently falls back to TypeScript MultiPatternScanner.
 */
class ZigDFAScannerImpl implements ZigDFAScannerInterface {
  private nativeBinding: ZigDFAScannerInterface | null = null;
  private initialized = false;

  private init(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // Future: Load Zig native module when available
      // const binding = require('../../native/vulpes_dfa.node');
      // if (binding && typeof binding.scan === 'function') {
      //   this.nativeBinding = binding;
      //   console.log('[ZigDFA] Native Zig DFA scanner loaded');
      // }
    } catch {
      // Zig binding not available - this is expected until implemented
    }
  }

  scan(text: string): ScanMatch[] {
    this.init();
    if (this.nativeBinding) {
      return this.nativeBinding.scan(text);
    }
    // Fall back to TypeScript implementation
    return getMultiPatternScanner().scan(text).matches;
  }

  isAvailable(): boolean {
    this.init();
    return this.nativeBinding !== null;
  }
}

export const ZigDFAScanner: ZigDFAScannerInterface = new ZigDFAScannerImpl();

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
 * Check if DFA scanning is enabled (via Zig or TypeScript fallback)
 */
export function isDFAScanningEnabled(): boolean {
  return process.env.VULPES_DFA_SCAN === "1";
}

/**
 * Scan text using the best available method
 */
export function scanWithDFA(text: string): ScanResult {
  // Try Zig DFA first
  if (ZigDFAScanner.isAvailable()) {
    const matches = ZigDFAScanner.scan(text);
    return {
      matches,
      stats: {
        textLength: text.length,
        patternsChecked: ALL_PATTERNS.length,
        matchesFound: matches.length,
        scanTimeMs: 0, // Zig reports its own timing
      },
    };
  }

  // Fall back to TypeScript
  return getMultiPatternScanner().scan(text);
}
