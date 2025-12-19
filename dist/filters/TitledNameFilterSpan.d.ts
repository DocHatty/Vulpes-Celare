/**
 * TitledNameFilterSpan - Titled Name Detection (Span-Based)
 *
 * Detects names with formal titles (Dr., Mr., Mrs., etc.) and returns Spans.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class TitledNameFilterSpan extends SpanBasedFilter {
    /**
     * Common formal name prefixes
     */
    private readonly PREFIXES;
    /**
     * Name suffixes for complete name patterns
     */
    private readonly SUFFIXES;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, _context: RedactionContext): Span[];
    /**
     * Pattern 6: Names after provider role labels
     * Matches: "Referring: Dr. John Smith", "Sonographer: Sarah Mitchell, RDMS"
     *
     * NEW APPROACH: Redact as PROVIDER_NAME for consistency and context
     * Names after role labels like "Attending:", "Surgeon:", etc. are providers
     */
    private detectProviderRoleNames;
    /**
     * Pattern 1: Title + Name (handles both "Dr. Smith" and "Dr. John Smith")
     * Matches: Dr. Smith, Dr. John Smith, Mr. Robert Jones, etc.
     *
     * NEW APPROACH: Redact ALL names but label titled names as PROVIDER_NAME
     * This maintains context ("Dr. Smith" -> "{{PROVIDER_1}}") while ensuring
     * consistent redaction and document coherence.
     */
    private detectTitledNames;
    /**
     * Pattern 2: Title + Name + Suffix (Dr. John Smith Jr., Prof. Jane Doe MD)
     *
     * NEW APPROACH: Redact as PROVIDER_NAME for consistency
     */
    private detectTitledNamesWithSuffix;
    /**
     * Pattern 3: Last, First format (Smith, John)
     * Detects "Last, First" or "Last, First Middle" patterns
     *
     * CRITICAL: This pattern is DISABLED because SmartNameFilterSpan handles
     * Last, First detection with proper validation to avoid false positives.
     */
    private detectLastFirstNames;
    /**
     * Pattern 4: General Full Names (First Last or First Middle Last)
     * Detects standard full name patterns without titles
     *
     * IMPORTANT: Names starting with provider titles (Dame, Sir, Mr, Mrs, etc.)
     * are provider names and should NOT be redacted under HIPAA Safe Harbor
     *
     * CRITICAL: This pattern is DISABLED because it's too aggressive and matches
     * medical diagnoses like "Trigeminal Neuralgia", "Bell Palsy", etc.
     * Name detection should be handled by SmartNameFilterSpan which has proper
     * dictionary validation.
     */
    private detectGeneralFullNames;
    /**
     * Pattern 5: Family relationship names (Daughter: Emma, Wife: Mary, etc.)
     *
     * STREET-SMART: When a name appears after a family relationship label
     * (Son:, Daughter:, Wife:, etc.), it's ALWAYS a person name.
     * Don't whitelist based on eponymous disease names (Bell's palsy, Wilson's disease).
     */
    private detectFamilyRelationshipNames;
    /**
     * Check if text matches whitelist (case-insensitive)
     * Uses NameDetectionUtils + DocumentVocabulary for comprehensive coverage
     *
     * IMPORTANT: If text starts with a person title (Dr., Mr., etc.), we should NOT
     * whitelist based on eponymous disease names. "Dr. Wilson" is a person even though
     * "Wilson's disease" exists.
     */
    private isWhitelisted;
    /**
     * Check if text is a non-person structure term.
     * Delegates to shared NameDetectionUtils
     */
    private isNonPersonStructureTerm;
}
//# sourceMappingURL=TitledNameFilterSpan.d.ts.map