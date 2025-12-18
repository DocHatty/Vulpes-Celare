/**
 * VULPES CELARE - Provenance Module
 *
 * Cryptographic provenance and audit trail exports for PHI redaction operations.
 *
 * This module provides:
 * - Trust Bundles (.red files) for tamper-evident redaction proof
 * - FHIR AuditEvent exports for EHR system integration
 * - Blockchain anchoring via OpenTimestamps for immutable timestamps
 *
 * @module provenance
 *
 * @example
 * ```typescript
 * import {
 *   TrustBundleExporter,
 *   FHIRAuditEventExporter,
 *   BlockchainAnchor
 * } from 'vulpes-celare/provenance';
 *
 * // Generate Trust Bundle
 * const bundle = await TrustBundleExporter.generate(original, redacted, result);
 * await TrustBundleExporter.export(bundle, 'audit.red');
 *
 * // Anchor to Bitcoin blockchain via OpenTimestamps
 * const anchor = await BlockchainAnchor.anchor(bundle);
 * console.log(`Merkle root: ${anchor.merkleRoot}`);
 *
 * // Generate FHIR AuditEvent for EHR integration
 * const auditEvent = FHIRAuditEventExporter.generate(result, {
 *   actorId: 'Device/vulpes-redactor',
 *   patientReference: 'Patient/12345'
 * });
 * ```
 */

// Trust Bundle Exporter - Cryptographic provenance with .red files
export {
  TrustBundleExporter,
  TrustBundle,
  TrustBundleManifest,
  TrustBundleCertificate,
  TrustBundlePolicy,
  TrustBundleOptions,
  VerificationResult,
  TRUST_BUNDLE_VERSION,
  TRUST_BUNDLE_EXTENSION,
} from "./TrustBundleExporter";

// Blockchain Anchoring - OpenTimestamps integration for immutable timestamps
export {
  BlockchainAnchor,
  BlockchainAnchorResult,
  AnchorVerificationResult,
  AnchorAttestation,
  AnchorOptions,
  AnchorStatus,
  OTS_CALENDAR_SERVERS,
  anchorToBlockchain,
  verifyBlockchainAnchor,
} from "./BlockchainAnchor";

// FHIR AuditEvent Exporter - Healthcare EHR integration
export {
  FHIRAuditEventExporter,
  FHIRAuditEvent,
  FHIRAuditEventOptions,
  FHIRAuditEventAgent,
  FHIRAuditEventSource,
  FHIRAuditEventEntity,
  FHIRAuditEventEntityDetail,
  FHIRAuditEventOutcome,
  FHIRCoding,
  FHIRCodeableConcept,
  FHIRReference,
  FHIR_VERSION,
  RESOURCE_TYPE,
} from "./FHIRAuditEventExporter";
