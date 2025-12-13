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
export { VulpesCelare, VulpesCelareConfig, RedactionResult, PHIType, ReplacementStyle, } from "./VulpesCelare";
export { default } from "./VulpesCelare";
export { ParallelRedactionEngine, RedactionExecutionReport, FilterExecutionResult, } from "./core/ParallelRedactionEngine";
export { SpanBasedFilter, FilterPriority } from "./core/SpanBasedFilter";
export { SpanFactory, SpanCreateOptions } from "./core/SpanFactory";
export { FilterAdapter } from "./core/FilterAdapter";
export { FieldContextDetector, FieldContext, } from "./core/FieldContextDetector";
export { FieldLabelWhitelist } from "./core/FieldLabelWhitelist";
export { PostFilterService, IPostFilterStrategy, } from "./core/filters/PostFilterService";
export { Span, SpanUtils, FilterType } from "./models/Span";
export { RedactionContext } from "./context/RedactionContext";
export { DocumentVocabulary } from "./vocabulary/DocumentVocabulary";
export { SmartNameFilterSpan } from "./filters/SmartNameFilterSpan";
export { FormattedNameFilterSpan } from "./filters/FormattedNameFilterSpan";
export { TitledNameFilterSpan } from "./filters/TitledNameFilterSpan";
export { FamilyNameFilterSpan } from "./filters/FamilyNameFilterSpan";
export { SSNFilterSpan } from "./filters/SSNFilterSpan";
export { PassportNumberFilterSpan } from "./filters/PassportNumberFilterSpan";
export { LicenseNumberFilterSpan } from "./filters/LicenseNumberFilterSpan";
export { DEAFilterSpan } from "./filters/DEAFilterSpan";
export { PhoneFilterSpan } from "./filters/PhoneFilterSpan";
export { FaxNumberFilterSpan } from "./filters/FaxNumberFilterSpan";
export { EmailFilterSpan } from "./filters/EmailFilterSpan";
export { AddressFilterSpan } from "./filters/AddressFilterSpan";
export { ZipCodeFilterSpan } from "./filters/ZipCodeFilterSpan";
export { MRNFilterSpan } from "./filters/MRNFilterSpan";
export { NPIFilterSpan } from "./filters/NPIFilterSpan";
export { HealthPlanNumberFilterSpan } from "./filters/HealthPlanNumberFilterSpan";
export { AgeFilterSpan } from "./filters/AgeFilterSpan";
export { DateFilterSpan } from "./filters/DateFilterSpan";
export { CreditCardFilterSpan } from "./filters/CreditCardFilterSpan";
export { AccountNumberFilterSpan } from "./filters/AccountNumberFilterSpan";
export { IPAddressFilterSpan } from "./filters/IPAddressFilterSpan";
export { URLFilterSpan } from "./filters/URLFilterSpan";
export { DeviceIdentifierFilterSpan } from "./filters/DeviceIdentifierFilterSpan";
export { VehicleIdentifierFilterSpan } from "./filters/VehicleIdentifierFilterSpan";
export { BiometricContextFilterSpan } from "./filters/BiometricContextFilterSpan";
export { UniqueIdentifierFilterSpan } from "./filters/UniqueIdentifierFilterSpan";
export { FilterRegistry } from "./filters/FilterRegistry";
export { WindowService } from "./services/WindowService";
export { ConfidenceModifierService } from "./services/ConfidenceModifierService";
export { ReplacementContextService } from "./services/ReplacementContextService";
export { ProvenanceService, type ProvenanceRecordOptions, } from "./services/ProvenanceService";
export { MLWeightOptimizer, mlWeightOptimizer, TrainingDocument, GroundTruthLabel, OptimizationResult, } from "./core/MLWeightOptimizer";
export { CrossTypeReasoner, crossTypeReasoner, ReasoningResult, } from "./core/CrossTypeReasoner";
export { ConfidenceCalibrator, confidenceCalibrator, CalibrationDataPoint, CalibrationMetrics, CalibrationResult, } from "./core/ConfidenceCalibrator";
export { WeightedPHIScorer, weightedScorer, ScoringWeights, ScoringResult, } from "./core/WeightedPHIScorer";
export { SpanEnhancer, spanEnhancer, EnhancementResult, EnhancementConfig, } from "./core/SpanEnhancer";
export { EnsembleVoter, VoteSignal, EnsembleVote, VotingConfig, InterPHIDisambiguator, } from "./core/EnsembleVoter";
export { ValidationUtils } from "./utils/ValidationUtils";
export { NameDetectionUtils, PROVIDER_TITLE_PREFIXES, PROVIDER_CREDENTIALS, NON_PERSON_STRUCTURE_TERMS, FAMILY_RELATIONSHIP_KEYWORDS, } from "./utils/NameDetectionUtils";
export { FilterHealthCheck } from "./diagnostics/FilterHealthCheck";
export { StatisticsTracker } from "./stats/StatisticsTracker";
export { TokenManager } from "./tokens/TokenManager";
export { PolicyLoader } from "./policies/PolicyLoader";
export { StreamingRedactor, WebSocketRedactionHandler, StreamingRedactorConfig, StreamingChunk, } from "./StreamingRedactor";
export { PolicyCompiler, PolicyTemplates, PolicyRule, PolicyDefinition, CompiledPolicy, } from "./PolicyDSL";
export { TrustBundleExporter, TrustBundle, TrustBundleManifest, TrustBundleCertificate, TrustBundlePolicy, TrustBundleOptions, VerificationResult, TRUST_BUNDLE_VERSION, TRUST_BUNDLE_EXTENSION, } from "./provenance/TrustBundleExporter";
export { ImageRedactor, ImageRedactionResult, RedactionRegion, VisualPolicy, } from "./core/images";
export { OCRService, OCRResult, TextBox, OCRServiceConfig, } from "./core/images";
export { VisualDetector, VisualDetectorConfig } from "./core/images";
export type { VisualDetection, VisualBox } from "./core/images";
export { ImageServiceLogger, getLogger, withErrorBoundary, withRetry, withTimeout, LogLevel, LogEntry, ServiceHealth, OperationMetrics, } from "./core/images";
export { DicomStreamTransformer, HIPAA_DICOM_TAGS, anonymizeDicomBuffer, } from "./core/dicom";
export type { DicomAnonymizationRule, DicomTransformerConfig, } from "./core/dicom";
export { CortexPythonBridge } from "./core/cortex/python/CortexPythonBridge";
export type { CortexTask, CortexTaskRequest, CortexTaskResponse, CortexBridgeConfig, } from "./core/cortex/python/CortexPythonBridge";
export declare const VERSION = "1.0.0";
export declare const ENGINE_NAME = "Vulpes Celare";
export declare const VARIANT = "Hatkoff Redaction Engine";
//# sourceMappingURL=index.d.ts.map