/**
 * VehicleIdentifierFilterSpan - Vehicle Identifier Detection (Span-Based)
 *
 * Detects and redacts vehicle identifiers per HIPAA requirement #12:
 * - Vehicle Identification Numbers (VINs): 17-character alphanumeric
 * - License plate numbers with context
 *
 * Simplified to focus on core HIPAA-required vehicle identifiers only.
 * GPS coordinates, IPv6, and workstation IDs are handled by other filters
 * or are not patient PHI under HIPAA Safe Harbor.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class VehicleIdentifierFilterSpan extends SpanBasedFilter {
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Pattern 1: VIN with context (explicit label)
     */
    private detectLabeledVINs;
    /**
     * Pattern 2: Standalone VIN (17 characters, strict validation)
     */
    private detectStandaloneVINs;
    /**
     * Pattern 3: License Plate with explicit context
     */
    private detectLabeledLicensePlates;
    /**
     * Pattern 4: Standalone license plates with common US formats
     */
    private detectStandaloneLicensePlates;
    /**
     * Check if the match appears to be a vital sign reading (e.g., BP 150, HR 98)
     * These should NOT be detected as license plates
     */
    private isVitalSignContext;
    /**
     * Validation Methods
     */
    /**
     * Validate VIN format
     * - Must be exactly 17 characters
     * - Alphanumeric, excluding I, O, Q
     * - Reasonable mix of letters and numbers
     */
    private isValidVIN;
    /**
     * Validate license plate format
     */
    private isValidLicensePlate;
}
//# sourceMappingURL=VehicleIdentifierFilterSpan.d.ts.map