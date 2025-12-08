/**
 * HospitalFilterSpan - Healthcare Facility Name Detection (Span-Based)
 *
 * Detects healthcare facility names using a dictionary of 7,389 known facilities.
 * These are redacted because they can identify patient location and care settings.
 *
 * Covered facility types:
 * - Hospitals (general, regional, community)
 * - Medical centers
 * - Health systems
 * - Clinics
 * - Indian Health Service facilities
 * - Specialty care centers
 *
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class HospitalFilterSpan extends SpanBasedFilter {
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
}
//# sourceMappingURL=HospitalFilterSpan.d.ts.map