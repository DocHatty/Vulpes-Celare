/**
 * UniqueIdentifierFilterSpan - HIPAA Identifier #17 Detection (Span-Based)
 *
 * Detects "Any other unique identifying number, characteristic, or code"
 * per HIPAA Safe Harbor requirements. This includes:
 * - Loyalty program IDs (gym memberships, retail loyalty cards)
 * - Frequent flyer/traveler numbers
 * - Membership IDs (clubs, organizations)
 * - Customer/client IDs
 * - Subscriber IDs
 * - Badge/Access IDs
 * - Any branded identifier that could uniquely identify an individual
 *
 * Parallel-execution ready.
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import {
  SpanBasedFilter,
  FilterPriority,
} from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";

export class UniqueIdentifierFilterSpan extends SpanBasedFilter {
  /**
   * Known loyalty/membership program prefixes
   * These are brands commonly associated with membership/loyalty programs
   */
  private static readonly LOYALTY_PREFIXES: string[] = [
    // Fitness/Gym
    "PLANETFIT",
    "PLANET",
    "ANYTIME",
    "LAFITNESS",
    "GOLDSGYM",
    "GOLDS",
    "YMCA",
    "EQUINOX",
    "ORANGETHEORY",
    "CROSSFIT",
    "LIFETIME",
    "CRUNCH",
    "SNAP",
    "FIT4LESS",
    "BLINK",
    // Airlines
    "DELTA",
    "UNITED",
    "AMERICAN",
    "SOUTHWEST",
    "JETBLUE",
    "ALASKA",
    "SPIRIT",
    "FRONTIER",
    "HAWAIIAN",
    "SKYTEAM",
    "ONEWORLD",
    "STARALLIANCE",
    "SKYMILES",
    "MILEAGEPLUS",
    "AADVANTAGE",
    "RAPIDREWARDS",
    "TRUEBLUE",
    // Hotels
    "MARRIOTT",
    "HILTON",
    "HYATT",
    "IHG",
    "WYNDHAM",
    "CHOICE",
    "BESTWESTERN",
    "RADISSON",
    "ACCOR",
    "BONVOY",
    "HONORS",
    "WORLDOFHYATT",
    // Retail
    "TARGET",
    "WALMART",
    "COSTCO",
    "SAMS",
    "BJS",
    "AMAZON",
    "PRIME",
    "KROGER",
    "CVS",
    "WALGREENS",
    "RITE",
    "STARBUCKS",
    "PANERA",
    "CHIPOTLE",
    "DUNKIN",
    // Car Rental
    "HERTZ",
    "ENTERPRISE",
    "NATIONAL",
    "AVIS",
    "BUDGET",
    "ALAMO",
    "DOLLAR",
    "THRIFTY",
    // Credit/Banking Rewards
    "CHASE",
    "AMEX",
    "CITI",
    "DISCOVER",
    "CAPITALONE",
    "WELLSFARGO",
    "BOA",
    "BARCLAYS",
    // Generic membership
    "MEMBER",
    "CLUB",
    "LOYALTY",
    "REWARDS",
    "POINTS",
    "VIP",
    "PREMIUM",
    "ELITE",
    "GOLD",
    "PLATINUM",
    "DIAMOND",
    "SILVER",
    "BRONZE",
  ];

  /**
   * Context keywords that indicate a membership/loyalty ID
   */
  private static readonly CONTEXT_KEYWORDS: string[] = [
    "member",
    "membership",
    "loyalty",
    "rewards",
    "points",
    "frequent",
    "flyer",
    "traveler",
    "subscriber",
    "subscription",
    "customer",
    "client",
    "patron",
    "badge",
    "access",
    "card",
    "number",
    "id",
    "identifier",
    "account",
    "program",
    "club",
  ];

  getType(): string {
    return "UNIQUE_ID";
  }

  getPriority(): number {
    return FilterPriority.ACCOUNT; // Same priority as account numbers
  }

  detect(text: string, config: any, context: RedactionContext): Span[] {
    const spans: Span[] = [];

    // Pattern 1: Brand prefix IDs (PLANETFIT-392847, DELTA-847392SK)
    this.detectBrandPrefixIds(text, spans);

    // Pattern 2: Labeled membership/loyalty IDs
    this.detectLabeledMembershipIds(text, spans);

    // Pattern 3: Generic membership ID patterns with context
    this.detectContextualMembershipIds(text, spans);

    // Pattern 4: Frequent flyer/traveler numbers
    this.detectFrequentTravelerNumbers(text, spans);

    // Pattern 5: Badge/Access IDs
    this.detectBadgeAccessIds(text, spans);

    return spans;
  }

  /**
   * Pattern 1: Brand prefix IDs
   * Matches: PLANETFIT-392847, DELTA-847392SK, MARRIOTT-BONVOY-123456
   */
  private detectBrandPrefixIds(text: string, spans: Span[]): void {
    const prefixPattern = UniqueIdentifierFilterSpan.LOYALTY_PREFIXES.join("|");

    // Pattern: BRAND-ALPHANUMERIC (1-3 segments)
    const pattern = new RegExp(
      `\\b((?:${prefixPattern})(?:-[A-Z0-9]+){1,3})\\b`,
      "gi"
    );

    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const idCode = match[1];

      // Validate: Must have alphanumeric component after prefix
      const parts = idCode.split("-");
      if (parts.length < 2) continue;

      // Check if any part after the prefix has numbers (likely an ID)
      const hasNumericPart = parts
        .slice(1)
        .some((part) => /\d{3,}/.test(part) || part.length >= 6);

      if (!hasNumericPart) continue;

      // Skip obvious non-IDs
      const lowerCode = idCode.toLowerCase();
      if (
        lowerCode.endsWith("-card") ||
        lowerCode.endsWith("-program") ||
        lowerCode.endsWith("-account") ||
        lowerCode.endsWith("-member")
      ) {
        continue;
      }

      const span = new Span({
        text: idCode,
        originalValue: idCode,
        characterStart: match.index,
        characterEnd: match.index + idCode.length,
        filterType: FilterType.ACCOUNT, // Using ACCOUNT as closest match
        confidence: 0.92,
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          match.index,
          match.index + idCode.length
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Loyalty/Membership brand ID",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 2: Labeled membership/loyalty IDs
   * Matches: "Member ID: ABC123", "Loyalty #: 12345678", "Membership Number: XYZ-789"
   */
  private detectLabeledMembershipIds(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:member(?:ship)?|loyalty|rewards?|subscriber|customer|client|patron|frequent\s*(?:flyer|traveler)?)\s*(?:id|identifier|number|#|no\.?|code)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{4,})\b/gi;

    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];
      const idValue = match[1];

      // Validate ID has some structure
      if (idValue.length < 5) continue;

      const span = new Span({
        text: fullMatch,
        originalValue: fullMatch,
        characterStart: match.index,
        characterEnd: match.index + fullMatch.length,
        filterType: FilterType.ACCOUNT,
        confidence: 0.94,
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          match.index,
          match.index + fullMatch.length
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Labeled membership identifier",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 3: Generic membership ID patterns with nearby context
   * Looks for alphanumeric codes near membership-related keywords
   */
  private detectContextualMembershipIds(text: string, spans: Span[]): void {
    // Find sentences/clauses with membership context
    const contextPattern =
      /[^.!?\n]*\b(?:member(?:ship)?|loyalty|rewards?|subscriber|club|gym|fitness|airline|hotel|program)\b[^.!?\n]*/gi;

    contextPattern.lastIndex = 0;
    let contextMatch;

    while ((contextMatch = contextPattern.exec(text)) !== null) {
      const sentence = contextMatch[0];
      const sentenceStart = contextMatch.index;

      // Look for ID-like patterns within this context
      const idPattern = /\b([A-Z]{2,}[\-#][A-Z0-9]{5,})\b/gi;
      idPattern.lastIndex = 0;
      let idMatch;

      while ((idMatch = idPattern.exec(sentence)) !== null) {
        const idCode = idMatch[1];

        // Must have numeric component
        if (!/\d{3,}/.test(idCode)) continue;

        const absoluteStart = sentenceStart + idMatch.index;

        const span = new Span({
          text: idCode,
          originalValue: idCode,
          characterStart: absoluteStart,
          characterEnd: absoluteStart + idCode.length,
          filterType: FilterType.ACCOUNT,
          confidence: 0.88,
          priority: this.getPriority(),
          context: this.extractContext(
            text,
            absoluteStart,
            absoluteStart + idCode.length
          ),
          window: [],
          replacement: null,
          salt: null,
          pattern: "Contextual membership ID",
          applied: false,
          ignored: false,
          ambiguousWith: [],
          disambiguationScore: null,
        });
        spans.push(span);
      }
    }
  }

  /**
   * Pattern 4: Frequent flyer/traveler numbers
   * Matches specific airline loyalty number formats
   */
  private detectFrequentTravelerNumbers(text: string, spans: Span[]): void {
    // Pattern for labeled frequent flyer numbers
    const pattern =
      /\b(?:frequent\s*(?:flyer|traveler)|ff|mileage(?:plus)?|skymiles|aadvantage|rapid\s*rewards|true\s*blue)\s*(?:#|number|no\.?|id)?\s*[:\-]?\s*([A-Z0-9]{6,12})\b/gi;

    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];

      const span = new Span({
        text: fullMatch,
        originalValue: fullMatch,
        characterStart: match.index,
        characterEnd: match.index + fullMatch.length,
        filterType: FilterType.ACCOUNT,
        confidence: 0.93,
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          match.index,
          match.index + fullMatch.length
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Frequent traveler number",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }

  /**
   * Pattern 5: Badge/Access IDs
   * Matches employee badges, access cards, etc.
   */
  private detectBadgeAccessIds(text: string, spans: Span[]): void {
    const pattern =
      /\b(?:badge|access|employee|staff|visitor|contractor)\s*(?:id|identifier|number|#|no\.?|code|card)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{4,})\b/gi;

    pattern.lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const fullMatch = match[0];

      const span = new Span({
        text: fullMatch,
        originalValue: fullMatch,
        characterStart: match.index,
        characterEnd: match.index + fullMatch.length,
        filterType: FilterType.ACCOUNT,
        confidence: 0.91,
        priority: this.getPriority(),
        context: this.extractContext(
          text,
          match.index,
          match.index + fullMatch.length
        ),
        window: [],
        replacement: null,
        salt: null,
        pattern: "Badge/Access identifier",
        applied: false,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });
      spans.push(span);
    }
  }
}
