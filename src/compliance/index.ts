/**
 * Vulpes Celare - Compliance Module
 *
 * HIPAA-compliant retention policies, legal holds, audit management,
 * and FDA SaMD regulatory documentation.
 */

export {
  RetentionPolicyEngine,
  retentionPolicyEngine,
  type RetentionPolicy,
  type RetentionRecord,
  type LegalHold,
  type LegalHoldScope,
  type ArchiveResult,
  type PurgeResult,
  type DestructionCertificate,
  type RetentionPolicyEngineConfig,
  type DataType,
  type DestructionMethod,
} from "./RetentionPolicyEngine";

export {
  FDAExporter,
  fdaExporter,
  type SBOMEntry,
  type RiskEntry,
  type ValidationResult,
  type TPLCReport,
  type ExportOptions,
} from "./FDAExporter";
