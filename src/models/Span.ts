/**
 * Span Model - Represents a detected PII/PHI entity with rich metadata
 *
 * Based on Phileas's Span architecture with enhancements for VulpesHIPPA.
 * Tracks character positions, confidence, priority, context, and disambiguation info.
 *
 * @module redaction/models
 */

export enum FilterType {
  // Identity
  NAME = "NAME",
  PROVIDER_NAME = "PROVIDER_NAME", // Healthcare provider names (Dr., Prof., etc.) - redacted but labeled differently
  EMAIL = "EMAIL",
  SSN = "SSN",
  PHONE = "PHONE",
  FAX = "FAX",

  // Geographic
  ADDRESS = "ADDRESS",
  ZIPCODE = "ZIPCODE",
  CITY = "CITY",
  STATE = "STATE",
  COUNTY = "COUNTY",

  // Temporal
  DATE = "DATE",
  RELATIVE_DATE = "RELATIVE_DATE",
  AGE = "AGE",

  // Financial
  CREDIT_CARD = "CREDIT_CARD",
  ACCOUNT = "ACCOUNT",
  BITCOIN = "BITCOIN",
  IBAN = "IBAN",

  // Medical
  MRN = "MRN",
  NPI = "NPI",
  DEA = "DEA",
  HEALTH_PLAN = "HEALTH_PLAN",
  DEVICE = "DEVICE",
  LICENSE = "LICENSE",
  PASSPORT = "PASSPORT",

  // Technical
  IP = "IP",
  URL = "URL",
  MAC_ADDRESS = "MAC_ADDRESS",

  // Contextual
  BIOMETRIC = "BIOMETRIC",
  VEHICLE = "VEHICLE",
  OCCUPATION = "OCCUPATION",

  // Custom
  CUSTOM = "CUSTOM",
}

export interface SpanMetadata {
  // Original text information
  text: string;
  originalValue: string;

  // Position information
  characterStart: number;
  characterEnd: number;

  // Classification
  filterType: FilterType;
  confidence: number; // 0.0 to 1.0
  priority: number; // Higher = more important in disambiguation

  // Context
  context: string; // Document/session context
  window: string[]; // Surrounding tokens (e.g., ±5 words)

  // Replacement
  replacement: string | null;
  salt: string | null; // For hashing strategies

  // Pattern information
  pattern: string | null; // Regex pattern that matched (for validation)

  // Status flags
  applied: boolean; // Has replacement been applied?
  ignored: boolean; // Should this span be ignored?

  // Disambiguation
  ambiguousWith: FilterType[]; // Other possible interpretations
  disambiguationScore: number | null; // Score from disambiguation service
}

/**
 * Span - Represents a detected entity in text
 */
export class Span {
  // Core properties
  public characterStart: number;
  public characterEnd: number;
  public text: string;
  public filterType: FilterType;
  public confidence: number;
  public priority: number;

  // Context
  public context: string;
  public window: string[];

  // Replacement
  public replacement: string | null;
  public salt: string | null;

  // Pattern
  public pattern: string | null;

  // Flags
  public applied: boolean;
  public ignored: boolean;

  // Disambiguation
  public ambiguousWith: FilterType[];
  public disambiguationScore: number | null;

  constructor(metadata: SpanMetadata) {
    this.characterStart = metadata.characterStart;
    this.characterEnd = metadata.characterEnd;
    this.text = metadata.text;
    this.filterType = metadata.filterType;
    this.confidence = metadata.confidence;
    this.priority = metadata.priority;
    this.context = metadata.context;
    this.window = metadata.window;
    this.replacement = metadata.replacement;
    this.salt = metadata.salt;
    this.pattern = metadata.pattern;
    this.applied = metadata.applied;
    this.ignored = metadata.ignored;
    this.ambiguousWith = metadata.ambiguousWith;
    this.disambiguationScore = metadata.disambiguationScore;
  }

  /**
   * Get span length
   */
  get length(): number {
    return this.characterEnd - this.characterStart;
  }

  /**
   * Check if this span overlaps with another
   */
  overlapsWith(other: Span): boolean {
    return !(
      this.characterEnd <= other.characterStart ||
      this.characterStart >= other.characterEnd
    );
  }

  /**
   * Check if this span is identical to another (same position and length)
   */
  isIdenticalTo(other: Span): boolean {
    return (
      this.characterStart === other.characterStart &&
      this.characterEnd === other.characterEnd
    );
  }

  /**
   * Check if this span fully contains another span
   */
  contains(other: Span): boolean {
    return (
      this.characterStart <= other.characterStart &&
      this.characterEnd >= other.characterEnd
    );
  }

  /**
   * Create a copy of this span
   */
  clone(): Span {
    return new Span({
      text: this.text,
      originalValue: this.text,
      characterStart: this.characterStart,
      characterEnd: this.characterEnd,
      filterType: this.filterType,
      confidence: this.confidence,
      priority: this.priority,
      context: this.context,
      window: [...this.window],
      replacement: this.replacement,
      salt: this.salt,
      pattern: this.pattern,
      applied: this.applied,
      ignored: this.ignored,
      ambiguousWith: [...this.ambiguousWith],
      disambiguationScore: this.disambiguationScore,
    });
  }

  /**
   * Convert to simple token format for backward compatibility
   */
  toToken(sessionId: string, count: number): string {
    return `{{${this.filterType}_${sessionId}_${count}}}`;
  }

  /**
   * Shift span positions (used after text manipulation)
   */
  shift(offset: number): void {
    this.characterStart += offset;
    this.characterEnd += offset;
  }
}

/**
 * Span Utilities - Operations on collections of spans
 */
export class SpanUtils {
  /**
   * Filter type specificity ranking (higher = more specific/trustworthy)
   * More specific types should win over general ones
   */
  private static readonly TYPE_SPECIFICITY: Record<string, number> = {
    // High specificity - structured patterns
    SSN: 100,
    MRN: 95,
    NPI: 95,
    DEA: 95,
    CREDIT_CARD: 90,
    ACCOUNT: 85,
    LICENSE: 85,
    PASSPORT: 85,
    IBAN: 85,
    HEALTH_PLAN: 85,
    EMAIL: 80,
    PHONE: 75,
    FAX: 75,
    IP: 75,
    URL: 75,
    MAC_ADDRESS: 75,
    BITCOIN: 75,
    VEHICLE: 70,
    DEVICE: 70,
    BIOMETRIC: 70,
    // Medium specificity
    DATE: 60,
    ZIPCODE: 55,
    ADDRESS: 50,
    CITY: 45,
    STATE: 45,
    COUNTY: 45,
    // Lower specificity - context-dependent
    AGE: 40,
    RELATIVE_DATE: 40,
    PROVIDER_NAME: 36, // Slightly higher than NAME since it has title context
    NAME: 35, // Names can overlap with many things
    OCCUPATION: 30,
    CUSTOM: 20,
  };

  /**
   * Calculate composite score for a span
   * Used for tie-breaking when spans have similar characteristics
   *
   * @param span - The span to score
   * @returns A composite score (higher = better)
   */
  private static calculateSpanScore(span: Span): number {
    const typeSpecificity =
      this.TYPE_SPECIFICITY[span.filterType as string] || 25;

    // Weighted scoring:
    // - Length: 40% weight (longer spans capture more context)
    // - Confidence: 30% weight (detection confidence)
    // - Type specificity: 20% weight (structured patterns > fuzzy matches)
    // - Priority: 10% weight (filter-level priority)
    const lengthScore = Math.min(span.length / 50, 1) * 40; // Cap at 50 chars
    const confidenceScore = span.confidence * 30;
    const typeScore = (typeSpecificity / 100) * 20;
    const priorityScore = Math.min(span.priority / 100, 1) * 10; // Normalize

    return lengthScore + confidenceScore + typeScore + priorityScore;
  }

  /**
   * Drop overlapping spans, keeping the best ones based on:
   * 1. Composite score (length, confidence, type specificity, priority)
   * 2. Special handling for containment (parent vs child spans)
   * 3. Same-position disambiguation
   */
  static dropOverlappingSpans(spans: Span[]): Span[] {
    if (spans.length === 0) return [];

    // Calculate scores for all spans
    const scoredSpans = spans.map((span) => ({
      span,
      score: this.calculateSpanScore(span),
    }));

    // Sort by score (descending), then by position (ascending) for stability
    scoredSpans.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.001) return b.score - a.score;
      // Secondary: prefer earlier spans for stability
      if (a.span.characterStart !== b.span.characterStart) {
        return a.span.characterStart - b.span.characterStart;
      }
      // Tertiary: prefer longer spans
      return b.span.length - a.span.length;
    });

    const nonOverlapping: Span[] = [];

    for (const { span } of scoredSpans) {
      let shouldKeep = true;
      let indexToReplace = -1;

      for (let i = 0; i < nonOverlapping.length; i++) {
        const existing = nonOverlapping[i];

        if (!span.overlapsWith(existing)) {
          continue;
        }

        // Special case: if new span fully contains existing, check if we
        // should prefer the more specific (smaller) span for certain types
        if (span.contains(existing)) {
          const spanSpec =
            this.TYPE_SPECIFICITY[span.filterType as string] || 25;
          const existSpec =
            this.TYPE_SPECIFICITY[existing.filterType as string] || 25;

          // If existing is more specific type and high confidence, keep it
          if (existSpec > spanSpec && existing.confidence >= 0.9) {
            shouldKeep = false;
            break;
          }
        }

        // Special case: existing fully contains new span
        if (existing.contains(span)) {
          const spanSpec =
            this.TYPE_SPECIFICITY[span.filterType as string] || 25;
          const existSpec =
            this.TYPE_SPECIFICITY[existing.filterType as string] || 25;

          // If new span is more specific type and high confidence,
          // replace existing with new
          if (spanSpec > existSpec && span.confidence >= 0.9) {
            indexToReplace = i;
            break;
          }
          shouldKeep = false;
          break;
        }

        // Partial overlap - already sorted by score, keep existing
        shouldKeep = false;
        break;
      }

      if (indexToReplace >= 0) {
        nonOverlapping[indexToReplace] = span;
      } else if (shouldKeep) {
        nonOverlapping.push(span);
      }
    }

    // Sort by position for consistent output
    return nonOverlapping.sort((a, b) => a.characterStart - b.characterStart);
  }

  /**
   * Find spans that are identical in position
   * Returns groups of identical spans (for disambiguation)
   */
  static getIdenticalSpanGroups(spans: Span[]): Span[][] {
    const groups: Map<string, Span[]> = new Map();

    for (const span of spans) {
      const key = `${span.characterStart}-${span.characterEnd}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(span);
    }

    // Return only groups with multiple spans (ambiguous)
    return Array.from(groups.values()).filter((group) => group.length > 1);
  }

  /**
   * Merge spans from multiple sources (e.g., regex + NER)
   * Removes duplicates and resolves overlaps
   */
  static mergeSpans(spanArrays: Span[][]): Span[] {
    const allSpans = spanArrays.flat();

    // Remove exact duplicates (same position, same type)
    const uniqueSpans = new Map<string, Span>();
    for (const span of allSpans) {
      const key = `${span.characterStart}-${span.characterEnd}-${span.filterType}`;

      if (
        !uniqueSpans.has(key) ||
        uniqueSpans.get(key)!.confidence < span.confidence
      ) {
        uniqueSpans.set(key, span);
      }
    }

    // Drop overlapping spans
    return SpanUtils.dropOverlappingSpans(Array.from(uniqueSpans.values()));
  }

  /**
   * Shift all spans by offset (used after text manipulation)
   */
  static shiftSpans(spans: Span[], offset: number): void {
    for (const span of spans) {
      span.shift(offset);
    }
  }

  /**
   * Filter spans by confidence threshold
   */
  static filterByConfidence(spans: Span[], minConfidence: number): Span[] {
    return spans.filter((span) => span.confidence >= minConfidence);
  }

  /**
   * Filter spans by filter type
   */
  static filterByType(spans: Span[], filterTypes: FilterType[]): Span[] {
    const typeSet = new Set(filterTypes);
    return spans.filter((span) => typeSet.has(span.filterType));
  }

  /**
   * Sort spans by position (ascending)
   */
  static sortByPosition(spans: Span[]): Span[] {
    return [...spans].sort((a, b) => {
      if (a.characterStart !== b.characterStart) {
        return a.characterStart - b.characterStart;
      }
      return a.characterEnd - b.characterEnd;
    });
  }
}
