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
  RedactionResultWithProvenance,
  ProvenanceOptions,
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
  ParallelRedactionResult,
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
// FieldLabelWhitelist is deprecated - use UnifiedMedicalWhitelist instead
// export { FieldLabelWhitelist } from "./core/FieldLabelWhitelist";
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
// VOCABULARY & WHITELISTS
// ============================================================================

// DocumentVocabulary is deprecated - use UnifiedMedicalWhitelist instead
// export { DocumentVocabulary } from "./vocabulary/DocumentVocabulary";

export {
  shouldWhitelist,
  isMedicalTerm,
  isNonPHI,
  getWhitelistPenalty,
} from "./utils/UnifiedMedicalWhitelist";

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

// ============================================================================
// CONTEXT-AWARE FILTERS (WIN-WIN: increase sensitivity AND specificity)
// ============================================================================

export { ContextAwareNameFilter } from "./filters/ContextAwareNameFilter";
export { RelativeDateFilterSpan } from "./filters/RelativeDateFilterSpan";
export { ContextAwareAddressFilter } from "./filters/ContextAwareAddressFilter";

// ============================================================================
// CLINICAL CONTEXT DETECTION
// ============================================================================

export {
  ClinicalContextDetector,
  contextDetector,
  RELATIVE_DATE_PATTERNS,
  type ContextWindow,
  type ContextIndicator,
  type ContextType,
  type ContextStrength,
} from "./context/ClinicalContextDetector";

// ============================================================================
// SUPPORT SERVICES
// ============================================================================

export { FilterRegistry } from "./filters/FilterRegistry";
export { WindowService } from "./services/WindowService";
export { ConfidenceModifierService } from "./services/ConfidenceModifierService";
export { ReplacementContextService } from "./services/ReplacementContextService";
export {
  ProvenanceService,
  type ProvenanceRecordOptions,
} from "./services/ProvenanceService";

// ============================================================================
// ML & ADVANCED SCORING SYSTEMS
// ============================================================================

export {
  MLWeightOptimizer,
  mlWeightOptimizer,
  TrainingDocument,
  GroundTruthLabel,
  OptimizationResult,
} from "./core/MLWeightOptimizer";

export {
  CrossTypeReasoner,
  crossTypeReasoner,
  ReasoningResult,
} from "./core/CrossTypeReasoner";

export {
  ConfidenceCalibrator,
  confidenceCalibrator,
  CalibrationDataPoint,
  CalibrationMetrics,
  CalibrationResult,
} from "./core/ConfidenceCalibrator";

// ============================================================================
// CALIBRATION SYSTEM (Auto-calibration from test data)
// ============================================================================

export {
  AutoCalibrator,
  autoCalibrator,
  initializeCalibration,
  getCalibratedConfidence,
  CalibrationDataExtractor,
  calibrationDataExtractor,
  CalibrationPersistence,
  calibrationPersistence,
  type AutoCalibrationOptions,
  type CalibrationResult as AutoCalibrationResult,
  type LiveTestResult,
  type CalibrationMetadata,
  type FilterCalibrationStats,
} from "./calibration";

export {
  ContextualConfidenceModifier,
  contextualConfidenceModifier,
  isContextModifierEnabled,
  type ContextModifierConfig,
  type ContextModificationResult,
} from "./core/ContextualConfidenceModifier";

export {
  WeightedPHIScorer,
  weightedScorer,
  ScoringWeights,
  ScoringResult,
} from "./core/WeightedPHIScorer";

export {
  SpanEnhancer,
  spanEnhancer,
  EnhancementResult,
  EnhancementConfig,
} from "./core/SpanEnhancer";

export {
  EnsembleVoter,
  VoteSignal,
  EnsembleVote,
  VotingConfig,
  InterPHIDisambiguator,
} from "./core/EnsembleVoter";

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

export {
  SupervisedStreamingRedactor,
  SupervisedStreamingConfig,
  SupervisedStreamingStats,
  createSupervisedStreamingRedactor,
} from "./SupervisedStreamingRedactor";

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
// TRUST BUNDLE & PROVENANCE
// ============================================================================

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
} from "./provenance/TrustBundleExporter";

// ============================================================================
// BLOCKCHAIN ANCHORING (OpenTimestamps Integration)
// ============================================================================

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
} from "./provenance/BlockchainAnchor";

// ============================================================================
// FHIR AUDIT EVENT EXPORT (EHR Integration)
// ============================================================================

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
} from "./provenance/FHIRAuditEventExporter";

// ============================================================================
// IMAGE REDACTION (Step 17: Photo/Image PHI)
// ============================================================================

export {
  ImageRedactor,
  ImageRedactionResult,
  RedactionRegion,
  VisualPolicy,
} from "./core/images";

export {
  OCRService,
  OCRResult,
  TextBox,
  OCRServiceConfig,
} from "./core/images";
export { VisualDetector, VisualDetectorConfig } from "./core/images";

export type { VisualDetection, VisualBox } from "./core/images";

// Image Service Logging & Debugging
export {
  ImageServiceLogger,
  getLogger,
  withErrorBoundary,
  withRetry,
  withTimeout,
  LogLevel,
  LogEntry,
  ServiceHealth,
  OperationMetrics,
} from "./core/images";

// ============================================================================
// DICOM ANONYMIZATION (The "DICOM Firewall")
// ============================================================================

export {
  DicomStreamTransformer,
  HIPAA_DICOM_TAGS,
  anonymizeDicomBuffer,
} from "./core/dicom";

export type {
  DicomAnonymizationRule,
  DicomTransformerConfig,
} from "./core/dicom";

// ============================================================================
// PYTHON INTELLIGENCE BRIDGE (The "Cortex Brain")
// ============================================================================

export { CortexPythonBridge } from "./core/cortex/python/CortexPythonBridge";

export type {
  CortexTask,
  CortexTaskRequest,
  CortexTaskResponse,
  CortexBridgeConfig,
} from "./core/cortex/python/CortexPythonBridge";

// ============================================================================
// DFA MULTI-PATTERN SCANNING (Phase 4: High-Performance Pattern Matching)
// ============================================================================

export {
  PatternDef,
  ALL_PATTERNS,
  SSN_PATTERNS,
  PHONE_PATTERNS,
  EMAIL_PATTERNS,
  DATE_PATTERNS,
  MRN_PATTERNS,
  CREDIT_CARD_PATTERNS,
  IP_PATTERNS,
  ZIPCODE_PATTERNS,
  getPatternStats,
} from "./dfa/patterns";

export {
  ScanMatch,
  ScanResult,
  MultiPatternScanner,
  RustDFAScanner,
  RustDFAScannerInterface,
  ZigDFAScanner, // Legacy alias
  getMultiPatternScanner,
  isDFAScanningEnabled,
  isRustAccelerationAvailable,
  scanWithDFA,
} from "./dfa/MultiPatternScanner";

// Legacy type alias for backwards compatibility
export type ZigDFAScannerInterface = RustDFAScannerInterface;
import type { RustDFAScannerInterface } from "./dfa/MultiPatternScanner";

// ============================================================================
// GPU BATCH PROCESSING (Phase 5: WebGPU Acceleration)
// ============================================================================

export {
  WebGPUBatchProcessor,
  BatchProcessingConfig,
  BatchResult,
  BatchStats,
  getBatchProcessor,
  processBatch,
  shouldUseBatchProcessing,
} from "./gpu";

// ============================================================================
// SUPERVISION & FAULT TOLERANCE (Phase 6: Elixir-Style Supervision)
// ============================================================================

export {
  Supervisor,
  SupervisorConfig,
  ChildSpec,
  ChildProcess,
  RestartStrategy,
  RestartType,
} from "./supervision/Supervisor";

export {
  CircuitBreaker,
  CircuitBreakerConfig,
  CircuitOpenError,
  CircuitState,
} from "./supervision/CircuitBreaker";

export {
  BackpressureQueue,
  BackpressureQueueConfig,
  QueueStats,
} from "./supervision/BackpressureQueue";

// ============================================================================
// DATALOG REASONING (Phase 3: Declarative Constraint Solving)
// ============================================================================

export {
  DatalogReasoner,
  DatalogReasoningResult,
  datalogReasoner,
} from "./core/DatalogReasoner";

// ============================================================================
// ADVANCED DICTIONARIES (Phase 1 & 2: Bloom Filter + SQLite)
// ============================================================================

export {
  FastFuzzyMatcher,
  FastMatchResult,
  FastMatcherConfig,
} from "./dictionaries/FastFuzzyMatcher";
export { BloomFilterStore } from "./dictionaries/BloomFilterStore";
export {
  SQLiteDictionaryMatcher,
  FuzzyMatchResult,
  SQLiteDictionaryConfig,
  getSQLiteDictionaryMatcher,
  isSQLiteDictionaryAvailable,
} from "./dictionaries/SQLiteDictionaryMatcher";

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

export {
  isBloomFilterEnabled,
  isSQLiteDictionaryEnabled,
  isDatalogReasonerEnabled,
  isDFAScanEnabled,
  isZigDFAAccelEnabled,
  getZigDFAMode,
  isGPUBatchEnabled,
  getGPUFallbackThreshold,
  isSupervisionEnabled,
  isCircuitBreakerEnabled,
  isFuzzyAccelEnabled,
  isPhoneticEnabled,
  getPhoneticThreshold,
  isStreamKernelEnabled,
  isStreamDetectionsEnabled,
  getConfigurationSummary,
  logConfiguration,
  ConfigurationSummary,
} from "./config/EnvironmentConfig";

// ============================================================================
// FEATURE TOGGLES (Centralized Feature Flag Management)
// ============================================================================

export { FeatureToggles } from "./config/FeatureToggles";

// ============================================================================
// UNIFIED FILTER ENGINE (Single Rust NAPI call for all patterns)
// ============================================================================

export {
  VulpesFilterEngine,
  UnifiedDetection,
  UnifiedScanResult,
  isUnifiedScannerAvailable,
  isUnifiedScannerEnabled,
  scanAllWithRust,
  detectionsToSpans,
  getRustSupportedTypes,
  getTypeScriptOnlyTypes,
} from "./utils/VulpesFilterEngine";

// ============================================================================
// EXPLANATIONS (Explainable AI / Audit Trail)
// ============================================================================

export {
  ExplanationGenerator,
  RedactionExplanation,
  ExplanationReport,
  ConfidenceFactor,
} from "./explanations";

// ============================================================================
// LLM SDK WRAPPERS (Drop-in OpenAI/Anthropic with PHI Redaction)
// ============================================================================

export {
  BaseLLMWrapper,
  LLMRedactionConfig,
  RedactionMapping,
  RedactionAuditEntry,
  VulpesOpenAI,
  VulpesOpenAIConfig,
  OpenAIMessage,
  OpenAIChatCompletionParams,
  OpenAIChatCompletionResponse,
  VulpesAnthropic,
  VulpesAnthropicConfig,
  AnthropicMessage,
  AnthropicContentBlock,
  AnthropicMessageParams,
  AnthropicMessageResponse,
} from "./llm";

// ============================================================================
// DIFFERENTIAL PRIVACY (Privacy-Preserving Analytics)
// ============================================================================

export {
  DifferentialPrivacy,
  DifferentialPrivacyConfig,
  NoisyStatistic,
  DPRedactionStats,
  PrivacyPreset,
  PRIVACY_PRESETS,
  DPHistogram,
  PrivacyAccountant,
  createDifferentialPrivacy,
} from "./privacy";

// ============================================================================
// VERSION INFO
// ============================================================================

export { VERSION, ENGINE_NAME, VARIANT } from "./meta";
