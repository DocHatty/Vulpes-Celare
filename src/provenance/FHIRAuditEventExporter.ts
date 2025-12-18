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
import { ENGINE_NAME, VERSION } from "../meta";

/**
 * FHIR AuditEvent version supported
 */
export const FHIR_VERSION = "5.0.0";

/**
 * FHIR AuditEvent resource type
 */
export const RESOURCE_TYPE = "AuditEvent";

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
export class FHIRAuditEventExporter {
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
  static generate(
    result: RedactionResult,
    options: FHIRAuditEventOptions = {}
  ): FHIRAuditEvent {
    const timestamp = new Date().toISOString();
    const eventId = options.id || this.generateEventId();

    // Build the AuditEvent
    const auditEvent: FHIRAuditEvent = {
      resourceType: "AuditEvent",
      id: eventId,
      meta: {
        lastUpdated: timestamp,
        profile: ["http://hl7.org/fhir/StructureDefinition/AuditEvent"],
      },

      // Category: Security Alert - Data Masking/De-identification
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/audit-event-type",
              code: "110106",
              display: "Export",
            },
          ],
          text: "PHI De-identification/Redaction",
        },
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/iso-21089-lifecycle",
              code: "deidentify",
              display: "De-Identify",
            },
          ],
        },
      ],

      // Code: Specific event type - PHI Redaction
      code: {
        coding: [
          {
            system: "http://hl7.org/fhir/restful-interaction",
            code: "operation",
            display: "Operation",
          },
          {
            system: "urn:vulpes-celare:audit-event-code",
            code: "phi-redaction",
            display: "PHI Redaction Operation",
          },
        ],
        text: "HIPAA Safe Harbor PHI Redaction",
      },

      // Action: Execute (E) - Processing operation
      action: "E",

      // Severity: Informational for successful redaction
      severity: "informational",

      // When the redaction occurred
      occurredDateTime: timestamp,

      // When this audit event was recorded
      recorded: timestamp,

      // Outcome: Success or failure
      outcome: this.buildOutcome(result),

      // Authorization/Purpose of Use
      authorization: this.buildAuthorization(options.purposeOfUse),

      // Patient reference if provided
      patient: options.patientReference
        ? { reference: options.patientReference }
        : undefined,

      // Encounter reference if provided
      encounter: options.encounterReference
        ? { reference: options.encounterReference }
        : undefined,

      // Agents involved in the event
      agent: this.buildAgents(options),

      // Source of the audit event
      source: this.buildSource(options),

      // Entities (data objects) involved
      entity: this.buildEntities(result, options),
    };

    // Remove undefined fields for cleaner output
    return this.cleanUndefined(auditEvent);
  }

  /**
   * Generate multiple AuditEvents from a batch of redaction results
   *
   * @param results - Array of redaction results
   * @param options - Configuration options (applied to all events)
   * @returns Array of FHIR AuditEvent resources
   */
  static generateBatch(
    results: RedactionResult[],
    options: FHIRAuditEventOptions = {}
  ): FHIRAuditEvent[] {
    return results.map((result, index) =>
      this.generate(result, {
        ...options,
        id: options.id ? `${options.id}-${index}` : undefined,
      })
    );
  }

  /**
   * Export AuditEvent as NDJSON (Newline Delimited JSON)
   * Suitable for bulk FHIR operations
   *
   * @param events - Array of AuditEvents
   * @returns NDJSON string
   */
  static toNDJSON(events: FHIRAuditEvent[]): string {
    return events.map((e) => JSON.stringify(e)).join("\n");
  }

  /**
   * Export AuditEvent as a FHIR Bundle
   *
   * @param events - Array of AuditEvents
   * @param bundleType - Type of bundle (default: "collection")
   * @returns FHIR Bundle resource
   */
  static toBundle(
    events: FHIRAuditEvent[],
    bundleType: "collection" | "batch" | "transaction" = "collection"
  ): object {
    return {
      resourceType: "Bundle",
      type: bundleType,
      timestamp: new Date().toISOString(),
      entry: events.map((event) => ({
        resource: event,
        request:
          bundleType !== "collection"
            ? {
                method: "POST",
                url: "AuditEvent",
              }
            : undefined,
      })),
    };
  }

  /**
   * Build outcome based on redaction result
   */
  private static buildOutcome(result: RedactionResult): FHIRAuditEventOutcome {
    // Assume success if we have a result
    const isSuccess = result.redactionCount !== undefined;

    return {
      code: {
        system: "http://hl7.org/fhir/issue-severity",
        code: isSuccess ? "success" : "error",
        display: isSuccess ? "Success" : "Error",
      },
      detail: [
        {
          coding: [
            {
              system: "urn:vulpes-celare:outcome-detail",
              code: "redaction-complete",
              display: "Redaction Completed",
            },
          ],
          text: `${result.redactionCount || 0} PHI elements redacted in ${result.executionTimeMs || 0}ms`,
        },
      ],
    };
  }

  /**
   * Build authorization (purpose of use) elements
   */
  private static buildAuthorization(
    purposeOfUse?: string[]
  ): FHIRCodeableConcept[] | undefined {
    const defaultPurposes = ["HOPERAT"]; // Healthcare Operations
    const purposes = purposeOfUse || defaultPurposes;

    return purposes.map((code) => ({
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/v3-ActReason",
          code,
          display: this.getPurposeDisplay(code),
        },
      ],
    }));
  }

  /**
   * Get display text for purpose of use code
   */
  private static getPurposeDisplay(code: string): string {
    const displays: Record<string, string> = {
      TREAT: "Treatment",
      HPAYMT: "Healthcare Payment",
      HOPERAT: "Healthcare Operations",
      PUBHLTH: "Public Health",
      HRESCH: "Healthcare Research",
      ETREAT: "Emergency Treatment",
      PATRQT: "Patient Requested",
      FAMRQT: "Family Requested",
      PWATRNY: "Power of Attorney",
      SUPNWK: "Support Network",
      SYSDEV: "System Development",
      HTEST: "Health System Test",
      TRAIN: "Training",
      HMARKT: "Healthcare Marketing",
      CLINTRCH: "Clinical Trial Research",
      CLINTRCHNPC: "Clinical Trial Non-Standard Protocol",
      CLINTRCHS: "Clinical Trial Standard Protocol",
      DISRES: "Disease Specific Healthcare Research",
    };
    return displays[code] || code;
  }

  /**
   * Build agent elements
   */
  private static buildAgents(
    options: FHIRAuditEventOptions
  ): FHIRAuditEventAgent[] {
    const agents: FHIRAuditEventAgent[] = [];

    // Primary agent: The redaction system/device
    const primaryAgent: FHIRAuditEventAgent = {
      type: {
        coding: [
          {
            system: "http://dicom.nema.org/resources/ontology/DCM",
            code: "110153",
            display: "Source Role ID",
          },
        ],
      },
      role: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/extra-security-role-type",
              code: "dataprocessor",
              display: "Data Processor",
            },
          ],
        },
      ],
      who: {
        type: "Device",
        display: options.actorDisplay || `${ENGINE_NAME} v${VERSION}`,
        identifier: options.actorId
          ? { value: options.actorId }
          : { system: "urn:vulpes-celare:device", value: "vulpes-redactor" },
      },
      requestor: true,
      networkString: options.networkAddress,
      authorization: options.purposeOfUse
        ? options.purposeOfUse.map((code) => ({
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActReason",
                code,
              },
            ],
          }))
        : undefined,
    };

    agents.push(primaryAgent);

    // Organization agent if provided
    if (options.organizationName || options.organizationReference) {
      agents.push({
        type: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
              code: "custodian",
              display: "Custodian",
            },
          ],
        },
        who: {
          type: "Organization",
          reference: options.organizationReference,
          display: options.organizationName,
        },
        requestor: false,
      });
    }

    return agents;
  }

  /**
   * Build source element
   */
  private static buildSource(
    _options: FHIRAuditEventOptions
  ): FHIRAuditEventSource {
    return {
      observer: {
        type: "Device",
        display: `${ENGINE_NAME} v${VERSION}`,
        identifier: {
          system: "urn:vulpes-celare:device",
          value: "vulpes-redactor",
        },
      },
      type: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/security-source-type",
              code: "4",
              display: "Application Server",
            },
          ],
        },
      ],
    };
  }

  /**
   * Build entity elements (data objects involved)
   */
  private static buildEntities(
    result: RedactionResult,
    options: FHIRAuditEventOptions
  ): FHIRAuditEventEntity[] {
    const entities: FHIRAuditEventEntity[] = [];

    // Entity 1: The document that was redacted
    if (options.documentReference) {
      entities.push({
        what: {
          reference: options.documentReference,
          type: "DocumentReference",
        },
        role: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/object-role",
              code: "4",
              display: "Domain Resource",
            },
          ],
        },
        securityLabel: [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
                code: "R",
                display: "Restricted",
              },
            ],
          },
        ],
      });
    }

    // Entity 2: Redaction statistics/metadata
    entities.push({
      what: {
        display: "Redaction Operation Results",
      },
      role: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/object-role",
            code: "13",
            display: "Security Resource",
          },
        ],
      },
      detail: [
        {
          type: {
            coding: [
              {
                system: "urn:vulpes-celare:entity-detail",
                code: "phi-elements-redacted",
              },
            ],
            text: "PHI Elements Redacted",
          },
          valueInteger: result.redactionCount || 0,
        },
        {
          type: {
            coding: [
              {
                system: "urn:vulpes-celare:entity-detail",
                code: "processing-time-ms",
              },
            ],
            text: "Processing Time (ms)",
          },
          valueInteger: result.executionTimeMs || 0,
        },
        {
          type: {
            coding: [
              {
                system: "urn:vulpes-celare:entity-detail",
                code: "compliance-standard",
              },
            ],
            text: "Compliance Standard",
          },
          valueString: "HIPAA Safe Harbor",
        },
      ],
    });

    return entities;
  }

  /**
   * Generate a unique event ID
   */
  private static generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `vulpes-audit-${timestamp}-${random}`;
  }

  /**
   * Remove undefined fields from object (recursive)
   */
  private static cleanUndefined<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.cleanUndefined(item)).filter((item) => item !== undefined) as T;
    }

    if (typeof obj === "object") {
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const cleanedValue = this.cleanUndefined(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned as T;
    }

    return obj;
  }
}
