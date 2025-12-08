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
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class UniqueIdentifierFilterSpan extends SpanBasedFilter {
    /**
     * Known loyalty/membership program prefixes
     * These are brands commonly associated with membership/loyalty programs
     */
    private static readonly LOYALTY_PREFIXES;
    /**
     * Context keywords that indicate a membership/loyalty ID
     */
    private static readonly CONTEXT_KEYWORDS;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Pattern 1: Brand prefix IDs
     * Matches: PLANETFIT-392847, DELTA-847392SK, MARRIOTT-BONVOY-123456
     */
    private detectBrandPrefixIds;
    /**
     * Pattern 2: Labeled membership/loyalty IDs
     * Matches: "Member ID: ABC123", "Loyalty #: 12345678", "Membership Number: XYZ-789"
     */
    private detectLabeledMembershipIds;
    /**
     * Pattern 3: Generic membership ID patterns with nearby context
     * Looks for alphanumeric codes near membership-related keywords
     */
    private detectContextualMembershipIds;
    /**
     * Pattern 4: Frequent flyer/traveler numbers
     * Matches specific airline loyalty number formats
     */
    private detectFrequentTravelerNumbers;
    /**
     * Pattern 5: Badge/Access IDs
     * Matches employee badges, access cards, etc.
     */
    private detectBadgeAccessIds;
}
//# sourceMappingURL=UniqueIdentifierFilterSpan.d.ts.map