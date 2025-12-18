/**
 * Test Helpers - Reduce Boilerplate in Tests
 *
 * Provides convenient utilities for common test operations:
 * - Quick context creation
 * - Simplified redaction calls
 * - Span creation for assertions
 * - Common test assertions
 *
 * @module tests/utils/test-helpers
 */

import { VulpesCelare, RedactionResult } from "../../src/VulpesCelare";
import { RedactionContext } from "../../src/context/RedactionContext";
import { Span, FilterType } from "../../src/models/Span";
import { ReplacementScope } from "../../src/services/ReplacementContextService";

// =============================================================================
// CONTEXT CREATION HELPERS
// =============================================================================

/**
 * Create a RedactionContext with sensible test defaults.
 * Much shorter than new RedactionContext(sessionId, contextName, scope).
 *
 * @example
 * // Simple usage
 * const ctx = createTestContext();
 *
 * // With custom session ID
 * const ctx = createTestContext({ sessionId: 'test-123' });
 *
 * // With all options
 * const ctx = createTestContext({
 *   sessionId: 'custom-session',
 *   contextName: 'my-test',
 *   scope: ReplacementScope.SESSION
 * });
 */
export function createTestContext(options?: {
    sessionId?: string;
    contextName?: string;
    scope?: ReplacementScope;
}): RedactionContext {
    return new RedactionContext(
        options?.sessionId ?? `test-${Date.now()}`,
        options?.contextName ?? "test-context",
        options?.scope ?? ReplacementScope.DOCUMENT
    );
}

// =============================================================================
// REDACTION HELPERS
// =============================================================================

/**
 * Quick redaction - returns just the redacted text.
 * Use when you only care about the output, not the details.
 *
 * @example
 * const redacted = await quickRedact("Patient John Smith");
 * expect(redacted).not.toContain("John Smith");
 */
export async function quickRedact(text: string): Promise<string> {
    return VulpesCelare.redact(text);
}

/**
 * Redact with full details for comprehensive assertions.
 * Returns redaction count, breakdown, spans, etc.
 *
 * @example
 * const result = await redactWithDetails("John Smith DOB 01/01/1990");
 * expect(result.redactionCount).toBe(2);
 * expect(result.breakdown.NAME).toBe(1);
 * expect(result.breakdown.DATE).toBe(1);
 */
export async function redactWithDetails(text: string): Promise<RedactionResult> {
    return VulpesCelare.redactWithDetails(text);
}

/**
 * Check if specific PHI was redacted from text.
 * Returns true if the PHI value is NOT in the redacted output.
 *
 * @example
 * const wasRedacted = await wasPhiRedacted("Patient: John Smith", "John Smith");
 * expect(wasRedacted).toBe(true);
 */
export async function wasPhiRedacted(
    originalText: string,
    phiValue: string
): Promise<boolean> {
    const redacted = await quickRedact(originalText);
    return !redacted.includes(phiValue);
}

/**
 * Check if non-PHI content was preserved in redacted output.
 * Returns true if the content IS still in the redacted output.
 *
 * @example
 * const preserved = await wasContentPreserved(
 *   "Patient: John Smith has diabetes",
 *   "diabetes"
 * );
 * expect(preserved).toBe(true);
 */
export async function wasContentPreserved(
    originalText: string,
    nonPhiContent: string
): Promise<boolean> {
    const redacted = await quickRedact(originalText);
    return redacted.toLowerCase().includes(nonPhiContent.toLowerCase());
}

// =============================================================================
// SPAN CREATION HELPERS
// =============================================================================

/**
 * Create a test Span with sensible defaults.
 * Useful for unit testing filter logic or span comparisons.
 *
 * @example
 * // Simple name span
 * const span = createTestSpan("John Smith", FilterType.NAME);
 *
 * // With position override
 * const span = createTestSpan("John Smith", FilterType.NAME, {
 *   characterStart: 10,
 *   characterEnd: 20,
 * });
 *
 * // With confidence override
 * const span = createTestSpan("123-45-6789", FilterType.SSN, {
 *   confidence: 0.99,
 * });
 */
export function createTestSpan(
    text: string,
    filterType: FilterType,
    overrides?: Partial<{
        characterStart: number;
        characterEnd: number;
        confidence: number;
        priority: number;
        context: string;
        pattern: string | null;
        matchSource: string;
    }>
): Span {
    return new Span({
        text,
        originalValue: text,
        characterStart: overrides?.characterStart ?? 0,
        characterEnd: overrides?.characterEnd ?? text.length,
        filterType,
        confidence: overrides?.confidence ?? 0.9,
        priority: overrides?.priority ?? 100,
        context: overrides?.context ?? "",
        window: [],
        replacement: null,
        pattern: overrides?.pattern ?? null,
        matchSource: overrides?.matchSource ?? "test",
        ambiguousWith: [],
        disambiguationScore: null,
    });
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert that all expected PHI values were redacted.
 * Throws detailed error if any PHI was missed.
 *
 * @example
 * const result = await redactWithDetails(doc.text);
 * assertAllPhiRedacted(result.text, ["John Smith", "123-45-6789", "01/01/1990"]);
 */
export function assertAllPhiRedacted(
    redactedText: string,
    expectedPhi: string[]
): void {
    const missed: string[] = [];
    for (const phi of expectedPhi) {
        if (redactedText.includes(phi)) {
            missed.push(phi);
        }
    }
    if (missed.length > 0) {
        throw new Error(
            `PHI not redacted: ${missed.map((p) => `"${p}"`).join(", ")}\n` +
            `Redacted text: ${redactedText.substring(0, 200)}...`
        );
    }
}

/**
 * Assert that all expected non-PHI content was preserved.
 * Throws detailed error if any content was incorrectly redacted.
 *
 * @example
 * const result = await redactWithDetails(doc.text);
 * assertContentPreserved(result.text, ["diabetes", "hypertension", "follow-up"]);
 */
export function assertContentPreserved(
    redactedText: string,
    expectedContent: string[]
): void {
    const missing: string[] = [];
    const lowerText = redactedText.toLowerCase();
    for (const content of expectedContent) {
        if (!lowerText.includes(content.toLowerCase())) {
            missing.push(content);
        }
    }
    if (missing.length > 0) {
        throw new Error(
            `Content incorrectly removed: ${missing.map((c) => `"${c}"`).join(", ")}\n` +
            `Redacted text: ${redactedText.substring(0, 200)}...`
        );
    }
}

/**
 * Assert minimum redaction count.
 * Useful for sanity checks that redaction is working.
 *
 * @example
 * const result = await redactWithDetails(doc.text);
 * assertMinRedactions(result, 5); // At least 5 PHI elements should be redacted
 */
export function assertMinRedactions(
    result: RedactionResult,
    minCount: number
): void {
    if (result.redactionCount < minCount) {
        throw new Error(
            `Expected at least ${minCount} redactions, got ${result.redactionCount}\n` +
            `Breakdown: ${JSON.stringify(result.breakdown)}`
        );
    }
}

/**
 * Assert redaction count for a specific PHI type.
 *
 * @example
 * const result = await redactWithDetails(doc.text);
 * assertTypeRedactionCount(result, "NAME", 3); // Exactly 3 names redacted
 */
export function assertTypeRedactionCount(
    result: RedactionResult,
    phiType: string,
    expectedCount: number
): void {
    const actualCount = result.breakdown[phiType] ?? 0;
    if (actualCount !== expectedCount) {
        throw new Error(
            `Expected ${expectedCount} ${phiType} redactions, got ${actualCount}\n` +
            `Full breakdown: ${JSON.stringify(result.breakdown)}`
        );
    }
}

// =============================================================================
// BULK TESTING HELPERS
// =============================================================================

/**
 * Run redaction on multiple texts and collect results.
 * Useful for batch testing or benchmarking.
 *
 * @example
 * const results = await batchRedact([
 *   "Patient: John Smith",
 *   "SSN: 123-45-6789",
 *   "DOB: 01/01/1990"
 * ]);
 * expect(results.every(r => r.redactionCount > 0)).toBe(true);
 */
export async function batchRedact(texts: string[]): Promise<RedactionResult[]> {
    return Promise.all(texts.map((text) => VulpesCelare.redactWithDetails(text)));
}

/**
 * Test a document with expected PHI and non-PHI lists.
 * Returns { passed: boolean, errors: string[] }
 *
 * @example
 * const doc = {
 *   text: "Patient John Smith has diabetes",
 *   expectedPHI: ["John Smith"],
 *   expectedNonPHI: ["diabetes"]
 * };
 * const { passed, errors } = await testDocument(doc);
 * expect(passed).toBe(true);
 */
export async function testDocument(doc: {
    text: string;
    expectedPHI: Array<{ value: string } | string>;
    expectedNonPHI?: string[];
}): Promise<{ passed: boolean; errors: string[] }> {
    const errors: string[] = [];
    const result = await VulpesCelare.redactWithDetails(doc.text);

    // Check PHI redaction
    for (const phi of doc.expectedPHI) {
        const value = typeof phi === "string" ? phi : phi.value;
        if (result.text.includes(value)) {
            errors.push(`PHI not redacted: "${value}"`);
        }
    }

    // Check non-PHI preservation
    if (doc.expectedNonPHI) {
        const lowerText = result.text.toLowerCase();
        for (const content of doc.expectedNonPHI) {
            if (!lowerText.includes(content.toLowerCase())) {
                errors.push(`Non-PHI incorrectly removed: "${content}"`);
            }
        }
    }

    return { passed: errors.length === 0, errors };
}
