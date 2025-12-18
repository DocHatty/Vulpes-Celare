/**
 * VULPES CELARE - FHIR AuditEvent Exporter
 *
 * Generates HL7 FHIR R5 AuditEvent resources for PHI redaction operations.
 * Enables direct integration with healthcare EHR audit systems and HIPAA audit trails.
 *
 * FHIR AuditEvent is the standard for healthcare security audit logs, based on:
 * - IHE-ATNA (Audit Trail and Node Authentication)
 * - DICOM Audit Message (Part 15 Annex A5)
 * - RFC 3881 Security Audit and Access Accountability Message
 *
 * @module FHIRAuditEventExporter
 * @see https://www.hl7.org/fhir/auditevent.html
 *
 * @example
 * ```typescript
 * import { VulpesCelare } from 'vulpes-celare';
 * import { FHIRAuditEventExporter } from 'vulpes-celare/provenance';
 *
 * const engine = new VulpesCelare();
 * const result = await engine.process(clinicalNote);
 *
 * // Generate FHIR AuditEvent
 * const auditEvent = FHIRAuditEventExporter.generate(result, {
 *   actorId: 'system/vulpes-redactor',
 *   organizationName: 'General Hospital',
 *   patientReference: 'Patient/12345'
 * });
 *
 * // Export as JSON for EHR integration
 * const json = JSON.stringify(auditEvent, null, 2);
 * ```
 */
import { RedactionResult } from "../VulpesCelare";
/**
 * FHIR AuditEvent version supported
 */
export declare const FHIR_VERSION = "5.0.0";
/**
 * FHIR AuditEvent resource type
 */
export declare const RESOURCE_TYPE = "AuditEvent";
/**
 * Options for FHIR AuditEvent generation
 */
export interface FHIRAuditEventOptions {
    /**
     * Unique identifier for the audit event
     * If not provided, one will be generated
     */
    id?: string;
    /**
     * Actor/agent identifier who performed the redaction
     * Example: "Device/vulpes-redactor-001" or "system/redaction-service"
     */
    actorId?: string;
    /**
     * Display name for the actor
     */
    actorDisplay?: string;
    /**
     * Organization name performing the redaction
     */
    organizationName?: string;
    /**
     * Organization identifier (FHIR reference)
     * Example: "Organization/hospital-123"
     */
    organizationReference?: string;
    /**
     * Patient reference if known
     * Example: "Patient/12345"
     */
    patientReference?: string;
    /**
     * Encounter reference if applicable
     * Example: "Encounter/visit-456"
     */
    encounterReference?: string;
    /**
     * Document/resource that was redacted
     * Example: "DocumentReference/clinical-note-789"
     */
    documentReference?: string;
    /**
     * Purpose of use codes (HIPAA authorization)
     * Example: ["TREAT", "HPAYMT", "HOPERAT"]
     */
    purposeOfUse?: string[];
    /**
     * Policy URIs that authorized the redaction
     * Example: ["urn:oid:2.16.840.1.113883.1.11.20471"]
     */
    policyUris?: string[];
    /**
     * Network address of the system performing redaction
     */
    networkAddress?: string;
    /**
     * Additional metadata to include
     */
    metadata?: Record<string, unknown>;
}
/**
 * FHIR Coding type
 */
export interface FHIRCoding {
    system?: string;
    code: string;
    display?: string;
}
/**
 * FHIR CodeableConcept type
 */
export interface FHIRCodeableConcept {
    coding?: FHIRCoding[];
    text?: string;
}
/**
 * FHIR Reference type
 */
export interface FHIRReference {
    reference?: string;
    type?: string;
    display?: string;
    identifier?: {
        system?: string;
        value: string;
    };
}
/**
 * FHIR AuditEvent Agent
 */
export interface FHIRAuditEventAgent {
    type?: FHIRCodeableConcept;
    role?: FHIRCodeableConcept[];
    who: FHIRReference;
    requestor?: boolean;
    networkString?: string;
    networkUri?: string;
    authorization?: FHIRCodeableConcept[];
}
/**
 * FHIR AuditEvent Source
 */
export interface FHIRAuditEventSource {
    observer: FHIRReference;
    type?: FHIRCodeableConcept[];
}
/**
 * FHIR AuditEvent Entity Detail
 */
export interface FHIRAuditEventEntityDetail {
    type: FHIRCodeableConcept;
    valueString?: string;
    valueInteger?: number;
    valueBoolean?: boolean;
}
/**
 * FHIR AuditEvent Entity
 */
export interface FHIRAuditEventEntity {
    what?: FHIRReference;
    role?: FHIRCodeableConcept;
    securityLabel?: FHIRCodeableConcept[];
    detail?: FHIRAuditEventEntityDetail[];
}
/**
 * FHIR AuditEvent Outcome
 */
export interface FHIRAuditEventOutcome {
    code: FHIRCoding;
    detail?: FHIRCodeableConcept[];
}
/**
 * Complete FHIR R5 AuditEvent Resource
 */
export interface FHIRAuditEvent {
    resourceType: "AuditEvent";
    id?: string;
    meta?: {
        versionId?: string;
        lastUpdated?: string;
        profile?: string[];
    };
    category?: FHIRCodeableConcept[];
    code: FHIRCodeableConcept;
    action?: "C" | "R" | "U" | "D" | "E";
    severity?: "emergency" | "alert" | "critical" | "error" | "warning" | "notice" | "informational" | "debug";
    occurredDateTime?: string;
    recorded: string;
    outcome?: FHIRAuditEventOutcome;
    authorization?: FHIRCodeableConcept[];
    patient?: FHIRReference;
    encounter?: FHIRReference;
    agent: FHIRAuditEventAgent[];
    source: FHIRAuditEventSource;
    entity?: FHIRAuditEventEntity[];
}
/**
 * FHIR AuditEvent Exporter
 *
 * Generates HL7 FHIR R5 compliant AuditEvent resources for PHI redaction operations.
 * These can be directly imported into EHR systems for HIPAA audit trail compliance.
 */
export declare class FHIRAuditEventExporter {
    /**
     * Generate a FHIR AuditEvent from a redaction result
     *
     * @param result - Redaction result from VulpesCelare
     * @param options - Configuration options for the audit event
     * @returns Complete FHIR R5 AuditEvent resource
     *
     * @example
     * ```typescript
     * const auditEvent = FHIRAuditEventExporter.generate(result, {
     *   actorId: 'Device/redactor',
     *   patientReference: 'Patient/12345'
     * });
     * ```
     */
    static generate(result: RedactionResult, options?: FHIRAuditEventOptions): FHIRAuditEvent;
    /**
     * Generate multiple AuditEvents from a batch of redaction results
     *
     * @param results - Array of redaction results
     * @param options - Configuration options (applied to all events)
     * @returns Array of FHIR AuditEvent resources
     */
    static generateBatch(results: RedactionResult[], options?: FHIRAuditEventOptions): FHIRAuditEvent[];
    /**
     * Export AuditEvent as NDJSON (Newline Delimited JSON)
     * Suitable for bulk FHIR operations
     *
     * @param events - Array of AuditEvents
     * @returns NDJSON string
     */
    static toNDJSON(events: FHIRAuditEvent[]): string;
    /**
     * Export AuditEvent as a FHIR Bundle
     *
     * @param events - Array of AuditEvents
     * @param bundleType - Type of bundle (default: "collection")
     * @returns FHIR Bundle resource
     */
    static toBundle(events: FHIRAuditEvent[], bundleType?: "collection" | "batch" | "transaction"): object;
    /**
     * Build outcome based on redaction result
     */
    private static buildOutcome;
    /**
     * Build authorization (purpose of use) elements
     */
    private static buildAuthorization;
    /**
     * Get display text for purpose of use code
     */
    private static getPurposeDisplay;
    /**
     * Build agent elements
     */
    private static buildAgents;
    /**
     * Build source element
     */
    private static buildSource;
    /**
     * Build entity elements (data objects involved)
     */
    private static buildEntities;
    /**
     * Generate a unique event ID
     */
    private static generateEventId;
    /**
     * Remove undefined fields from object (recursive)
     */
    private static cleanUndefined;
}
//# sourceMappingURL=FHIRAuditEventExporter.d.ts.map