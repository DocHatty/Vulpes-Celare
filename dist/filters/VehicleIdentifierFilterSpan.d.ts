/**
 * VehicleIdentifierFilterSpan - Vehicle Identifier Detection (Span-Based)
 *
 * Detects and redacts vehicle identifiers per HIPAA requirement #12:
 * - Vehicle Identification Numbers (VINs): 17-character alphanumeric
 * - License plate numbers with context
 * - GPS coordinates (latitude/longitude)
 * - Workstation IDs (medical equipment identifiers)
 * - IPv6 addresses
 *
 * Production-grade with validation to avoid false positives
 * Parallel-execution ready.
 *
 * @module filters
 */
import { Span } from "../models/Span";
import { SpanBasedFilter } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
export declare class VehicleIdentifierFilterSpan extends SpanBasedFilter {
    getType(): string;
    getPriority(): number;
    detect(text: string, config: any, context: RedactionContext): Span[];
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
     * Pattern 5: GPS Coordinates (Decimal Degrees)
     */
    private detectGPSCoordinates;
    /**
     * Pattern 6: IPv6 Addresses (full and compressed)
     */
    private detectIPv6Addresses;
    /**
     * Pattern 7: Workstation IDs (explicit format)
     */
    private detectExplicitWorkstationIDs;
    /**
     * Pattern 8: Workstation IDs with context
     */
    private detectContextualWorkstationIDs;
    /**
     * Common vehicle makes for pattern matching
     */
    private static readonly VEHICLE_MAKES;
    /**
     * Common vehicle model names (partial list for validation)
     */
    private static readonly COMMON_MODELS;
    /**
     * Pattern 9: Vehicle Make/Model/Year combinations
     * Detects: "2019 Toyota Camry", "Toyota Camry 2019", "19 Ford F-150"
     */
    private detectVehicleMakeModelYear;
    /**
     * Pattern 10: Vehicle descriptions with context
     * Detects vehicle mentions with explicit labels like "patient's vehicle", "drives a", etc.
     */
    private detectVehicleDescriptions;
    /**
     * Check if the match appears in vehicle-related context
     */
    private hasVehicleContext;
    /**
     * Validate that a string looks like a vehicle description
     */
    private isValidVehicleDescription;
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
    /**
     * Validate GPS coordinates
     */
    private isValidGPSCoordinate;
    /**
     * Validate IPv6 address
     */
    private isValidIPv6;
}
//# sourceMappingURL=VehicleIdentifierFilterSpan.d.ts.map