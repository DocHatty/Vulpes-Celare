/**
 * DeviceIdentifierFilterSpan - Medical Device Identifier Detection (Span-Based)
 *
 * Detects and redacts medical device identifiers per HIPAA:
 * - Pacemaker serial numbers: PM-2024-567890, Pacemaker SN: ABC123
 * - Implant IDs: Implant ID: DEF456789
 * - Device serial numbers: Device Serial #12345678
 * - Defibrillator IDs: ICD Serial: XYZ-123-456
 *
 * Production-grade with context-aware detection
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class DeviceIdentifierFilterSpan extends SpanBasedFilter {
    /**
     * Medical device keywords for context checking
     */
    private readonly DEVICE_KEYWORDS;
    getType(): string;
    getPriority(): number;
    detect(text: string, _config: any, context: RedactionContext): Span[];
    /**
     * Pattern 1: Device + Serial/ID + Number
     */
    private detectDeviceWithSerial;
    /**
     * Pattern 2: Model Number in medical context
     */
    private detectModelNumbers;
    /**
     * Pattern 3: Serial Number (standalone, medical context)
     * Supports both long serials (7+ chars) and short serials (4-6 chars) with medical context
     */
    private detectSerialNumbers;
    /**
     * Pattern 4: Implant with date code
     */
    private detectImplantDateCodes;
    /**
     * Validation Methods
     */
    /**
     * Validate device identifier format
     * Must be 7-25 alphanumeric characters with optional dashes
     */
    private isValidDeviceIdentifier;
    /**
     * Check if text appears in medical device context
     * Looks for device keywords within 100 characters
     */
    private isInMedicalContext;
    /**
     * Pattern 5: Medical device manufacturer serial numbers
     * Catches: ABBOTT-XIENCE-3928475, STRYKER-TRIAZ-1293847, MEDTRONIC-12345
     */
    private detectManufacturerSerials;
    /**
     * Pattern 6: Common device serial prefixes
     * Catches: BS-3928475, TAN-8473921, PM-12345
     */
    private detectDevicePrefixSerials;
}
//# sourceMappingURL=DeviceIdentifierFilterSpan.d.ts.map