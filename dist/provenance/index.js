"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESOURCE_TYPE = exports.FHIR_VERSION = exports.FHIRAuditEventExporter = exports.verifyBlockchainAnchor = exports.anchorToBlockchain = exports.OTS_CALENDAR_SERVERS = exports.BlockchainAnchor = exports.TRUST_BUNDLE_EXTENSION = exports.TRUST_BUNDLE_VERSION = exports.TrustBundleExporter = void 0;
// Trust Bundle Exporter - Cryptographic provenance with .red files
var TrustBundleExporter_1 = require("./TrustBundleExporter");
Object.defineProperty(exports, "TrustBundleExporter", { enumerable: true, get: function () { return TrustBundleExporter_1.TrustBundleExporter; } });
Object.defineProperty(exports, "TRUST_BUNDLE_VERSION", { enumerable: true, get: function () { return TrustBundleExporter_1.TRUST_BUNDLE_VERSION; } });
Object.defineProperty(exports, "TRUST_BUNDLE_EXTENSION", { enumerable: true, get: function () { return TrustBundleExporter_1.TRUST_BUNDLE_EXTENSION; } });
// Blockchain Anchoring - OpenTimestamps integration for immutable timestamps
var BlockchainAnchor_1 = require("./BlockchainAnchor");
Object.defineProperty(exports, "BlockchainAnchor", { enumerable: true, get: function () { return BlockchainAnchor_1.BlockchainAnchor; } });
Object.defineProperty(exports, "OTS_CALENDAR_SERVERS", { enumerable: true, get: function () { return BlockchainAnchor_1.OTS_CALENDAR_SERVERS; } });
Object.defineProperty(exports, "anchorToBlockchain", { enumerable: true, get: function () { return BlockchainAnchor_1.anchorToBlockchain; } });
Object.defineProperty(exports, "verifyBlockchainAnchor", { enumerable: true, get: function () { return BlockchainAnchor_1.verifyBlockchainAnchor; } });
// FHIR AuditEvent Exporter - Healthcare EHR integration
var FHIRAuditEventExporter_1 = require("./FHIRAuditEventExporter");
Object.defineProperty(exports, "FHIRAuditEventExporter", { enumerable: true, get: function () { return FHIRAuditEventExporter_1.FHIRAuditEventExporter; } });
Object.defineProperty(exports, "FHIR_VERSION", { enumerable: true, get: function () { return FHIRAuditEventExporter_1.FHIR_VERSION; } });
Object.defineProperty(exports, "RESOURCE_TYPE", { enumerable: true, get: function () { return FHIRAuditEventExporter_1.RESOURCE_TYPE; } });
//# sourceMappingURL=index.js.map