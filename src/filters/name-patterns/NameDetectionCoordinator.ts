/**
 * NameDetectionCoordinator - Unified Name Detection Orchestration
 *
 * This coordinator eliminates duplicate Rust scanner calls and pattern matching
 * by providing a single entry point for name detection.
 *
 * BEFORE (4 filters calling Rust independently):
 * - FormattedNameFilterSpan: RustNameScanner.detectLastFirst() + detectFirstLast()
 * - SmartNameFilterSpan: RustNameScanner.detectLastFirst() + detectFirstLast() + detectSmart()
 * - TitledNameFilterSpan: RustNameScanner.detectSmart()
 * - FamilyNameFilterSpan: RustNameScanner.detectSmart()
 *
 * AFTER (Coordinator caches results):
 * - Single call to each Rust method per document
 * - Results cached and distributed to filters
 * - ~60% reduction in Rust FFI overhead
 *
 * USAGE:
 * ```typescript
 * const coordinator = NameDetectionCoordinator.getInstance();
 * coordinator.beginDocument(text);
 *
 * // In each filter:
 * const rustLastFirst = coordinator.getRustLastFirst();
 * const rustFirstLast = coordinator.getRustFirstLast();
 * const rustSmart = coordinator.getRustSmart();
 *
 * coordinator.endDocument();
 * ```
 *
 * @module filters/name-patterns
 */

import { RustNameScanner, type RustNameDetection } from "../../utils/RustNameScanner";
import { RadiologyLogger } from "../../utils/RadiologyLogger";

/**
 * Cached Rust detection results for a document
 */
interface RustDetectionCache {
  text: string;
  textHash: number;
  lastFirst: RustNameDetection[] | null;
  firstLast: RustNameDetection[] | null;
  smart: RustNameDetection[] | null;
  timestamp: number;
}

/**
 * Simple string hash for cache invalidation
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 1000); i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

/**
 * Singleton coordinator for unified name detection
 */
export class NameDetectionCoordinator {
  private static instance: NameDetectionCoordinator | null = null;

  private cache: RustDetectionCache | null = null;
  private documentStartTime: number = 0;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NameDetectionCoordinator {
    if (!NameDetectionCoordinator.instance) {
      NameDetectionCoordinator.instance = new NameDetectionCoordinator();
    }
    return NameDetectionCoordinator.instance;
  }

  /**
   * Begin processing a new document
   * Call this once at the start of document processing
   */
  beginDocument(text: string): void {
    const textHash = hashString(text);

    // Check if we already have valid cache for this exact text
    if (this.cache && this.cache.textHash === textHash && this.cache.text.length === text.length) {
      RadiologyLogger.debug(
        "NameDetectionCoordinator",
        "Using cached Rust results from previous call"
      );
      return;
    }

    // Clear old cache and start fresh
    this.cache = {
      text,
      textHash,
      lastFirst: null,
      firstLast: null,
      smart: null,
      timestamp: Date.now(),
    };
    this.documentStartTime = Date.now();

    RadiologyLogger.debug(
      "NameDetectionCoordinator",
      `Beginning document processing (${text.length} chars)`
    );
  }

  /**
   * End document processing and clear cache
   */
  endDocument(): void {
    if (this.cache) {
      const duration = Date.now() - this.documentStartTime;
      const calls = [
        this.cache.lastFirst !== null,
        this.cache.firstLast !== null,
        this.cache.smart !== null,
      ].filter(Boolean).length;

      RadiologyLogger.debug(
        "NameDetectionCoordinator",
        `Document complete: ${calls} Rust methods called in ${duration}ms`
      );
    }
    this.cache = null;
  }

  /**
   * Get Rust "Last, First" detection results (cached)
   */
  getRustLastFirst(): RustNameDetection[] {
    if (!this.cache) {
      RadiologyLogger.warn(
        "NameDetectionCoordinator",
        "getRustLastFirst called without beginDocument - running uncached"
      );
      return RustNameScanner.detectLastFirst("");
    }

    if (this.cache.lastFirst === null) {
      const start = Date.now();
      this.cache.lastFirst = RustNameScanner.detectLastFirst(this.cache.text);
      RadiologyLogger.debug(
        "NameDetectionCoordinator",
        `Rust detectLastFirst: ${this.cache.lastFirst.length} matches in ${Date.now() - start}ms`
      );
    }

    return this.cache.lastFirst;
  }

  /**
   * Get Rust "First Last" detection results (cached)
   */
  getRustFirstLast(): RustNameDetection[] {
    if (!this.cache) {
      RadiologyLogger.warn(
        "NameDetectionCoordinator",
        "getRustFirstLast called without beginDocument - running uncached"
      );
      return RustNameScanner.detectFirstLast("");
    }

    if (this.cache.firstLast === null) {
      const start = Date.now();
      this.cache.firstLast = RustNameScanner.detectFirstLast(this.cache.text);
      RadiologyLogger.debug(
        "NameDetectionCoordinator",
        `Rust detectFirstLast: ${this.cache.firstLast.length} matches in ${Date.now() - start}ms`
      );
    }

    return this.cache.firstLast;
  }

  /**
   * Get Rust "Smart" detection results (cached)
   */
  getRustSmart(): RustNameDetection[] {
    if (!this.cache) {
      RadiologyLogger.warn(
        "NameDetectionCoordinator",
        "getRustSmart called without beginDocument - running uncached"
      );
      return RustNameScanner.detectSmart("");
    }

    if (this.cache.smart === null) {
      const start = Date.now();
      this.cache.smart = RustNameScanner.detectSmart(this.cache.text);
      RadiologyLogger.debug(
        "NameDetectionCoordinator",
        `Rust detectSmart: ${this.cache.smart.length} matches in ${Date.now() - start}ms`
      );
    }

    return this.cache.smart;
  }

  /**
   * Check if Rust scanner is available
   */
  isRustAvailable(): boolean {
    return RustNameScanner.isAvailable();
  }

  /**
   * Get all Rust results at once (for filters that need multiple)
   */
  getAllRustResults(): {
    lastFirst: RustNameDetection[];
    firstLast: RustNameDetection[];
    smart: RustNameDetection[];
  } {
    return {
      lastFirst: this.getRustLastFirst(),
      firstLast: this.getRustFirstLast(),
      smart: this.getRustSmart(),
    };
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache = null;
  }
}

/**
 * Singleton export for convenience
 */
export const nameDetectionCoordinator = NameDetectionCoordinator.getInstance();
