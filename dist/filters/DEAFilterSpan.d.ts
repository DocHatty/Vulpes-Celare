/**
 * DEAFilterSpan - DEA Number Detection (Span-Based)
 *
 * Detects Drug Enforcement Administration (DEA) registration numbers.
 * DEA numbers are used by healthcare providers to prescribe controlled substances.
 *
 * DEA Number Format:
 * - 2 letters followed by 7 digits (e.g., AB1234567)
 * - First letter: registrant type (A, B, C, D, E, F, G, H, J, K, L, M, P, R, S, T, U, X)
 * - Second letter: first letter of registrant's last name
 * - 7 digits with checksum validation
 *
 * Per HIPAA Safe Harbor, DEA numbers are considered identifiers that must be redacted.
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class DEAFilterSpan extends SpanBasedFilter {
    /**
     * Valid first letters for DEA numbers by registrant type:
     * A, B - Deprecated (older registrations)
     * C - Practitioner (primary letter for physicians)
     * D - Pharmacy
     * E - Exporter
     * F - Distributor
     * G - Gateway (for controlled substances ordering)
     * H - Hospital/Clinic
     * J - Mid-level Practitioner (Nurse Practitioner, Physician Assistant)
     * K - Narcotic Treatment Program
     * L - Laboratory
     * M - Mid-level Practitioner
     * P - Manufacturer
     * R - Reverse Distributor
     * S - Researcher
     * T - Analytical Laboratory
     * U - Narcotic Treatment Program
     * X - Suboxone/Subutex prescribers (DATA waiver)
     */
    private static readonly VALID_FIRST_LETTERS;
    /**
     * DEA pattern definitions
     */
    private static readonly DEA_PATTERN_SOURCES;
    /**
     * PERFORMANCE OPTIMIZATION: Pre-compiled patterns
     */
    private static readonly COMPILED_PATTERNS;
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
    /**
     * Validate DEA number format
     *
     * DEA numbers have a checksum:
     * Sum of (1st + 3rd + 5th digits) + 2*(2nd + 4th + 6th digits)
     * The last digit of this sum should equal the 7th digit of the DEA number
     */
    private isValidDEA;
}
//# sourceMappingURL=DEAFilterSpan.d.ts.map