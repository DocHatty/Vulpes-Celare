/**
 * Replacement Context Service
 *
 * Ensures consistent token replacement across document/session.
 * Based on Phileas's ContextService architecture.
 *
 * Guarantees: Same original value → Same token replacement
 *
 * @module redaction/services
 */

import { FilterType } from "../models/Span";

export enum ReplacementScope {
  /** Same value gets same replacement across entire document */
  DOCUMENT = "DOCUMENT",

  /** Same value gets same replacement within same context */
  CONTEXT = "CONTEXT",

  /** No consistency - each occurrence gets unique replacement */
  NONE = "NONE",
}

export interface ReplacementEntry {
  originalValue: string;
  replacement: string;
  filterType: FilterType;
  context: string;
  firstSeen: number; // timestamp
  occurrences: number;
}

/**
 * Replacement Context Service
 * Manages consistent token replacement across scopes
 */
export class ReplacementContextService {
  private scope: ReplacementScope;

  // DOCUMENT scope: originalValue+filterType → replacement
  private documentMap: Map<string, ReplacementEntry> = new Map();

  // CONTEXT scope: context+originalValue+filterType → replacement
  private contextMap: Map<string, ReplacementEntry> = new Map();

  // Statistics
  private stats = {
    totalReplacements: 0,
    uniqueValues: 0,
    consistentReplacements: 0,
  };

  constructor(scope: ReplacementScope = ReplacementScope.DOCUMENT) {
    this.scope = scope;
  }

  /**
   * Get replacement for a value (or create new one)
   *
   * @param originalValue - Original PII/PHI value
   * @param filterType - Type of filter
   * @param context - Document context (for CONTEXT scope)
   * @param generator - Function to generate new replacement if needed
   * @returns Replacement token (consistent if seen before)
   */
  getReplacement(
    originalValue: string,
    filterType: FilterType,
    context: string,
    generator: () => string,
  ): string {
    this.stats.totalReplacements++;

    if (this.scope === ReplacementScope.NONE) {
      return generator();
    }

    const key = this.makeKey(originalValue, filterType, context);
    const map = this.getMap();

    let entry = map.get(key);

    if (entry) {
      // Consistent replacement: use existing
      entry.occurrences++;
      this.stats.consistentReplacements++;
      return entry.replacement;
    }

    // First time seeing this value: generate new replacement
    const replacement = generator();
    entry = {
      originalValue,
      replacement,
      filterType,
      context,
      firstSeen: Date.now(),
      occurrences: 1,
    };

    map.set(key, entry);
    this.stats.uniqueValues++;

    return replacement;
  }

  /**
   * Check if value has been seen before
   *
   * @param originalValue - Original value
   * @param filterType - Filter type
   * @param context - Document context
   * @returns True if value has existing replacement
   */
  hasSeen(
    originalValue: string,
    filterType: FilterType,
    context: string,
  ): boolean {
    if (this.scope === ReplacementScope.NONE) {
      return false;
    }

    const key = this.makeKey(originalValue, filterType, context);
    return this.getMap().has(key);
  }

  /**
   * Get existing replacement (if any)
   *
   * @param originalValue - Original value
   * @param filterType - Filter type
   * @param context - Document context
   * @returns Existing replacement or null
   */
  getExistingReplacement(
    originalValue: string,
    filterType: FilterType,
    context: string,
  ): string | null {
    if (this.scope === ReplacementScope.NONE) {
      return null;
    }

    const key = this.makeKey(originalValue, filterType, context);
    const entry = this.getMap().get(key);

    return entry ? entry.replacement : null;
  }

  /**
   * Get all replacements for a filter type
   *
   * @param filterType - Filter type
   * @returns Array of replacement entries
   */
  getReplacementsForType(filterType: FilterType): ReplacementEntry[] {
    const map = this.getMap();
    const entries: ReplacementEntry[] = [];

    for (const entry of map.values()) {
      if (entry.filterType === filterType) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Get all replacements for a context
   *
   * @param context - Document context
   * @returns Array of replacement entries
   */
  getReplacementsForContext(context: string): ReplacementEntry[] {
    const map = this.getMap();
    const entries: ReplacementEntry[] = [];

    for (const entry of map.values()) {
      if (entry.context === context) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Get total number of unique values tracked
   */
  getUniqueValueCount(): number {
    return this.getMap().size;
  }

  /**
   * Get total number of replacements made
   */
  getTotalReplacementCount(): number {
    return this.stats.totalReplacements;
  }

  /**
   * Get number of consistent replacements (reused existing token)
   */
  getConsistentReplacementCount(): number {
    return this.stats.consistentReplacements;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      uniqueValues: this.getUniqueValueCount(),
      consistencyRate:
        this.stats.totalReplacements > 0
          ? this.stats.consistentReplacements / this.stats.totalReplacements
          : 0,
    };
  }

  /**
   * Clear all replacements
   */
  clear(): void {
    this.documentMap.clear();
    this.contextMap.clear();
    this.stats = {
      totalReplacements: 0,
      uniqueValues: 0,
      consistentReplacements: 0,
    };
  }

  /**
   * Set replacement scope
   */
  setScope(scope: ReplacementScope): void {
    this.scope = scope;
  }

  /**
   * Get current scope
   */
  getScope(): ReplacementScope {
    return this.scope;
  }

  /**
   * Export replacements to JSON
   */
  export(): Record<string, any> {
    const entries: ReplacementEntry[] = [];

    for (const entry of this.getMap().values()) {
      entries.push(entry);
    }

    return {
      scope: this.scope,
      entries,
      stats: this.getStatistics(),
    };
  }

  /**
   * Import replacements from JSON
   */
  import(data: Record<string, any>): void {
    this.clear();

    if (data.scope) {
      this.scope = data.scope;
    }

    if (data.entries) {
      const map = this.getMap();

      for (const entry of data.entries) {
        const key = this.makeKey(
          entry.originalValue,
          entry.filterType,
          entry.context,
        );
        map.set(key, entry);
      }
    }
  }

  /**
   * Make key for map lookup
   */
  private makeKey(
    originalValue: string,
    filterType: FilterType,
    context: string,
  ): string {
    if (this.scope === ReplacementScope.DOCUMENT) {
      return `${filterType}:${originalValue}`;
    } else {
      // CONTEXT scope
      return `${context}:${filterType}:${originalValue}`;
    }
  }

  /**
   * Get appropriate map based on scope
   */
  private getMap(): Map<string, ReplacementEntry> {
    if (this.scope === ReplacementScope.DOCUMENT) {
      return this.documentMap;
    } else {
      return this.contextMap;
    }
  }
}
