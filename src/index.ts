/**
 * ============================================================================
 * VULPES CELARE - Package Exports
 * ============================================================================
 *
 * Hatkoff Redaction Engine
 *
 * This file exports all public APIs from the Vulpes Celare package.
 * For most use cases, you only need VulpesCelare from the main export.
 *
 * SIMPLE USAGE:
 *   import { VulpesCelare } from "vulpes-celare";
 *   const safe = await VulpesCelare.redact(document);
 *
 * ADVANCED USAGE:
 *   import { VulpesCelare, ParallelRedactionEngine, SSNFilterSpan } from "vulpes-celare";
 *
 * ============================================================================
 */

// ============================================================================
// MAIN ORCHESTRATOR - Start Here!
// ============================================================================

export {
  VulpesCelare,
  VulpesCelareConfig,
  RedactionResult,
  PHIType,
  ReplacementStyle,
} from "./VulpesCelare";
export { default } from "./VulpesCelare";

// ============================================================================
// CORE ENGINE COMPONENTS
// For advanced users who need low-level access
// ============================================================================

export {
  ParallelRedactionEngine,
  RedactionExecutionReport,
  FilterExecutionResult,
} from "./core/ParallelRedactionEngine";
export { SpanBasedFilter, FilterPriority } from "./core/SpanBasedFilter";
export { SpanFactory, SpanCreateOptions } from "./core/SpanFactory";
export { FilterAdapter } from "./core/FilterAdapter";
export {
  FieldContextDetector,
  FieldContext,
} from "./core/FieldContextDetector";
export { FieldLabelWhitelist } from "./core/FieldLabelWhitelist";
export {
  PostFilterService,
  IPostFilterStrategy,
} from "./core/filters/PostFilterService";

// ============================================================================
// DATA MODELS
// ============================================================================

export { Span, SpanUtils, FilterType } from "./models/Span";
export { RedactionContext } from "./context/RedactionContext";

// ============================================================================
// VOCABULARY & DICTIONARIES
// ============================================================================

export { DocumentVocabulary } from "./vocabulary/DocumentVocabulary";

// ============================================================================
// IDENTITY FILTERS
// ============================================================================

export { SmartNameFilterSpan } from "./filters/SmartNameFilterSpan";
export { FormattedNameFilterSpan } from "./filters/FormattedNameFilterSpan";
export { TitledNameFilterSpan } from "./filters/TitledNameFilterSpan";
export { FamilyNameFilterSpan } from "./filters/FamilyNameFilterSpan";

// ============================================================================
// GOVERNMENT ID FILTERS
// ============================================================================

export { SSNFilterSpan } from "./filters/SSNFilterSpan";
export { PassportNumberFilterSpan } from "./filters/PassportNumberFilterSpan";
export { LicenseNumberFilterSpan } from "./filters/LicenseNumberFilterSpan";

// ============================================================================
// CONTACT FILTERS
// ============================================================================

export { PhoneFilterSpan } from "./filters/PhoneFilterSpan";
export { FaxNumberFilterSpan } from "./filters/FaxNumberFilterSpan";
export { EmailFilterSpan } from "./filters/EmailFilterSpan";
export { AddressFilterSpan } from "./filters/AddressFilterSpan";
export { ZipCodeFilterSpan } from "./filters/ZipCodeFilterSpan";

// ============================================================================
// MEDICAL IDENTIFIER FILTERS
// ============================================================================

export { MRNFilterSpan } from "./filters/MRNFilterSpan";
export { NPIFilterSpan } from "./filters/NPIFilterSpan";
export { HealthPlanNumberFilterSpan } from "./filters/HealthPlanNumberFilterSpan";
// HospitalFilterSpan removed - hospital names are NOT PHI under HIPAA Safe Harbor
export { AgeFilterSpan } from "./filters/AgeFilterSpan";
export { DateFilterSpan } from "./filters/DateFilterSpan";

// ============================================================================
// FINANCIAL FILTERS
// ============================================================================

export { CreditCardFilterSpan } from "./filters/CreditCardFilterSpan";
export { AccountNumberFilterSpan } from "./filters/AccountNumberFilterSpan";

// ============================================================================
// TECHNICAL IDENTIFIER FILTERS
// ============================================================================

export { IPAddressFilterSpan } from "./filters/IPAddressFilterSpan";
export { URLFilterSpan } from "./filters/URLFilterSpan";
export { DeviceIdentifierFilterSpan } from "./filters/DeviceIdentifierFilterSpan";
export { VehicleIdentifierFilterSpan } from "./filters/VehicleIdentifierFilterSpan";
export { BiometricContextFilterSpan } from "./filters/BiometricContextFilterSpan";
export { UniqueIdentifierFilterSpan } from "./filters/UniqueIdentifierFilterSpan";

// ============================================================================
// SUPPORT SERVICES
// ============================================================================

export { FilterRegistry } from "./filters/FilterRegistry";
export { WindowService } from "./services/WindowService";
export { ConfidenceModifierService } from "./services/ConfidenceModifierService";
export { ReplacementContextService } from "./services/ReplacementContextService";

// ============================================================================
// DIAGNOSTICS & UTILITIES
// ============================================================================

export { ValidationUtils } from "./utils/ValidationUtils";
export {
  NameDetectionUtils,
  PROVIDER_TITLE_PREFIXES,
  PROVIDER_CREDENTIALS,
  NON_PERSON_STRUCTURE_TERMS,
  FAMILY_RELATIONSHIP_KEYWORDS,
} from "./utils/NameDetectionUtils";
export { FilterHealthCheck } from "./diagnostics/FilterHealthCheck";
export { StatisticsTracker } from "./stats/StatisticsTracker";
export { TokenManager } from "./tokens/TokenManager";
export { PolicyLoader } from "./policies/PolicyLoader";

// ============================================================================
// STREAMING REDACTION API
// ============================================================================

export {
  StreamingRedactor,
  WebSocketRedactionHandler,
  StreamingRedactorConfig,
  StreamingChunk,
} from "./StreamingRedactor";

// ============================================================================
// POLICY DSL
// ============================================================================

export {
  PolicyCompiler,
  PolicyTemplates,
  PolicyRule,
  PolicyDefinition,
  CompiledPolicy,
} from "./PolicyDSL";

// ============================================================================
// VERSION INFO
// ============================================================================

export const VERSION = "1.0.0";
export const ENGINE_NAME = "Vulpes Celare";
export const VARIANT = "Hatkoff Redaction Engine";
