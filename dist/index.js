"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceModifierService = exports.WindowService = exports.FilterRegistry = exports.RELATIVE_DATE_PATTERNS = exports.contextDetector = exports.ClinicalContextDetector = exports.ContextAwareAddressFilter = exports.RelativeDateFilterSpan = exports.ContextAwareNameFilter = exports.UniqueIdentifierFilterSpan = exports.BiometricContextFilterSpan = exports.VehicleIdentifierFilterSpan = exports.DeviceIdentifierFilterSpan = exports.URLFilterSpan = exports.IPAddressFilterSpan = exports.AccountNumberFilterSpan = exports.CreditCardFilterSpan = exports.DateFilterSpan = exports.AgeFilterSpan = exports.HealthPlanNumberFilterSpan = exports.NPIFilterSpan = exports.MRNFilterSpan = exports.ZipCodeFilterSpan = exports.AddressFilterSpan = exports.EmailFilterSpan = exports.FaxNumberFilterSpan = exports.PhoneFilterSpan = exports.DEAFilterSpan = exports.LicenseNumberFilterSpan = exports.PassportNumberFilterSpan = exports.SSNFilterSpan = exports.FamilyNameFilterSpan = exports.TitledNameFilterSpan = exports.FormattedNameFilterSpan = exports.SmartNameFilterSpan = exports.DocumentVocabulary = exports.RedactionContext = exports.FilterType = exports.SpanUtils = exports.Span = exports.PostFilterService = exports.FieldLabelWhitelist = exports.FieldContextDetector = exports.FilterAdapter = exports.SpanFactory = exports.FilterPriority = exports.SpanBasedFilter = exports.ParallelRedactionEngine = exports.default = exports.VulpesCelare = void 0;
exports.withErrorBoundary = exports.getLogger = exports.ImageServiceLogger = exports.VisualDetector = exports.OCRService = exports.ImageRedactor = exports.TRUST_BUNDLE_EXTENSION = exports.TRUST_BUNDLE_VERSION = exports.TrustBundleExporter = exports.PolicyTemplates = exports.PolicyCompiler = exports.createSupervisedStreamingRedactor = exports.SupervisedStreamingRedactor = exports.WebSocketRedactionHandler = exports.StreamingRedactor = exports.PolicyLoader = exports.TokenManager = exports.StatisticsTracker = exports.FilterHealthCheck = exports.FAMILY_RELATIONSHIP_KEYWORDS = exports.NON_PERSON_STRUCTURE_TERMS = exports.PROVIDER_CREDENTIALS = exports.PROVIDER_TITLE_PREFIXES = exports.NameDetectionUtils = exports.ValidationUtils = exports.InterPHIDisambiguator = exports.EnsembleVoter = exports.spanEnhancer = exports.SpanEnhancer = exports.weightedScorer = exports.WeightedPHIScorer = exports.isContextModifierEnabled = exports.contextualConfidenceModifier = exports.ContextualConfidenceModifier = exports.calibrationPersistence = exports.CalibrationPersistence = exports.calibrationDataExtractor = exports.CalibrationDataExtractor = exports.getCalibratedConfidence = exports.initializeCalibration = exports.autoCalibrator = exports.AutoCalibrator = exports.confidenceCalibrator = exports.ConfidenceCalibrator = exports.crossTypeReasoner = exports.CrossTypeReasoner = exports.mlWeightOptimizer = exports.MLWeightOptimizer = exports.ProvenanceService = exports.ReplacementContextService = void 0;
exports.isSupervisionEnabled = exports.getGPUFallbackThreshold = exports.isGPUBatchEnabled = exports.getZigDFAMode = exports.isZigDFAAccelEnabled = exports.isDFAScanEnabled = exports.isDatalogReasonerEnabled = exports.isSQLiteDictionaryEnabled = exports.isBloomFilterEnabled = exports.isSQLiteDictionaryAvailable = exports.getSQLiteDictionaryMatcher = exports.SQLiteDictionaryMatcher = exports.BloomFilterStore = exports.FastFuzzyMatcher = exports.datalogReasoner = exports.DatalogReasoner = exports.BackpressureQueue = exports.CircuitOpenError = exports.CircuitBreaker = exports.Supervisor = exports.shouldUseBatchProcessing = exports.processBatch = exports.getBatchProcessor = exports.WebGPUBatchProcessor = exports.scanWithDFA = exports.isRustAccelerationAvailable = exports.isDFAScanningEnabled = exports.getMultiPatternScanner = exports.ZigDFAScanner = exports.RustDFAScanner = exports.MultiPatternScanner = exports.getPatternStats = exports.DEA_PATTERNS = exports.NPI_PATTERNS = exports.ZIPCODE_PATTERNS = exports.IP_PATTERNS = exports.CREDIT_CARD_PATTERNS = exports.MRN_PATTERNS = exports.DATE_PATTERNS = exports.EMAIL_PATTERNS = exports.PHONE_PATTERNS = exports.SSN_PATTERNS = exports.ALL_PATTERNS = exports.CortexPythonBridge = exports.anonymizeDicomBuffer = exports.HIPAA_DICOM_TAGS = exports.DicomStreamTransformer = exports.LogLevel = exports.withTimeout = exports.withRetry = void 0;
exports.VARIANT = exports.ENGINE_NAME = exports.VERSION = exports.getTypeScriptOnlyTypes = exports.getRustSupportedTypes = exports.detectionsToSpans = exports.scanAllWithRust = exports.isUnifiedScannerEnabled = exports.isUnifiedScannerAvailable = exports.VulpesFilterEngine = exports.FeatureToggles = exports.logConfiguration = exports.getConfigurationSummary = exports.isStreamDetectionsEnabled = exports.isStreamKernelEnabled = exports.getPhoneticThreshold = exports.isPhoneticEnabled = exports.isFuzzyAccelEnabled = exports.isCircuitBreakerEnabled = void 0;
// ============================================================================
// MAIN ORCHESTRATOR - Start Here!
// ============================================================================
var VulpesCelare_1 = require("./VulpesCelare");
Object.defineProperty(exports, "VulpesCelare", { enumerable: true, get: function () { return VulpesCelare_1.VulpesCelare; } });
var VulpesCelare_2 = require("./VulpesCelare");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(VulpesCelare_2).default; } });
// ============================================================================
// CORE ENGINE COMPONENTS
// For advanced users who need low-level access
// ============================================================================
var ParallelRedactionEngine_1 = require("./core/ParallelRedactionEngine");
Object.defineProperty(exports, "ParallelRedactionEngine", { enumerable: true, get: function () { return ParallelRedactionEngine_1.ParallelRedactionEngine; } });
var SpanBasedFilter_1 = require("./core/SpanBasedFilter");
Object.defineProperty(exports, "SpanBasedFilter", { enumerable: true, get: function () { return SpanBasedFilter_1.SpanBasedFilter; } });
Object.defineProperty(exports, "FilterPriority", { enumerable: true, get: function () { return SpanBasedFilter_1.FilterPriority; } });
var SpanFactory_1 = require("./core/SpanFactory");
Object.defineProperty(exports, "SpanFactory", { enumerable: true, get: function () { return SpanFactory_1.SpanFactory; } });
var FilterAdapter_1 = require("./core/FilterAdapter");
Object.defineProperty(exports, "FilterAdapter", { enumerable: true, get: function () { return FilterAdapter_1.FilterAdapter; } });
var FieldContextDetector_1 = require("./core/FieldContextDetector");
Object.defineProperty(exports, "FieldContextDetector", { enumerable: true, get: function () { return FieldContextDetector_1.FieldContextDetector; } });
var FieldLabelWhitelist_1 = require("./core/FieldLabelWhitelist");
Object.defineProperty(exports, "FieldLabelWhitelist", { enumerable: true, get: function () { return FieldLabelWhitelist_1.FieldLabelWhitelist; } });
var PostFilterService_1 = require("./core/filters/PostFilterService");
Object.defineProperty(exports, "PostFilterService", { enumerable: true, get: function () { return PostFilterService_1.PostFilterService; } });
// ============================================================================
// DATA MODELS
// ============================================================================
var Span_1 = require("./models/Span");
Object.defineProperty(exports, "Span", { enumerable: true, get: function () { return Span_1.Span; } });
Object.defineProperty(exports, "SpanUtils", { enumerable: true, get: function () { return Span_1.SpanUtils; } });
Object.defineProperty(exports, "FilterType", { enumerable: true, get: function () { return Span_1.FilterType; } });
var RedactionContext_1 = require("./context/RedactionContext");
Object.defineProperty(exports, "RedactionContext", { enumerable: true, get: function () { return RedactionContext_1.RedactionContext; } });
// ============================================================================
// VOCABULARY & DICTIONARIES
// ============================================================================
var DocumentVocabulary_1 = require("./vocabulary/DocumentVocabulary");
Object.defineProperty(exports, "DocumentVocabulary", { enumerable: true, get: function () { return DocumentVocabulary_1.DocumentVocabulary; } });
// ============================================================================
// IDENTITY FILTERS
// ============================================================================
var SmartNameFilterSpan_1 = require("./filters/SmartNameFilterSpan");
Object.defineProperty(exports, "SmartNameFilterSpan", { enumerable: true, get: function () { return SmartNameFilterSpan_1.SmartNameFilterSpan; } });
var FormattedNameFilterSpan_1 = require("./filters/FormattedNameFilterSpan");
Object.defineProperty(exports, "FormattedNameFilterSpan", { enumerable: true, get: function () { return FormattedNameFilterSpan_1.FormattedNameFilterSpan; } });
var TitledNameFilterSpan_1 = require("./filters/TitledNameFilterSpan");
Object.defineProperty(exports, "TitledNameFilterSpan", { enumerable: true, get: function () { return TitledNameFilterSpan_1.TitledNameFilterSpan; } });
var FamilyNameFilterSpan_1 = require("./filters/FamilyNameFilterSpan");
Object.defineProperty(exports, "FamilyNameFilterSpan", { enumerable: true, get: function () { return FamilyNameFilterSpan_1.FamilyNameFilterSpan; } });
// ============================================================================
// GOVERNMENT ID FILTERS
// ============================================================================
var SSNFilterSpan_1 = require("./filters/SSNFilterSpan");
Object.defineProperty(exports, "SSNFilterSpan", { enumerable: true, get: function () { return SSNFilterSpan_1.SSNFilterSpan; } });
var PassportNumberFilterSpan_1 = require("./filters/PassportNumberFilterSpan");
Object.defineProperty(exports, "PassportNumberFilterSpan", { enumerable: true, get: function () { return PassportNumberFilterSpan_1.PassportNumberFilterSpan; } });
var LicenseNumberFilterSpan_1 = require("./filters/LicenseNumberFilterSpan");
Object.defineProperty(exports, "LicenseNumberFilterSpan", { enumerable: true, get: function () { return LicenseNumberFilterSpan_1.LicenseNumberFilterSpan; } });
var DEAFilterSpan_1 = require("./filters/DEAFilterSpan");
Object.defineProperty(exports, "DEAFilterSpan", { enumerable: true, get: function () { return DEAFilterSpan_1.DEAFilterSpan; } });
// ============================================================================
// CONTACT FILTERS
// ============================================================================
var PhoneFilterSpan_1 = require("./filters/PhoneFilterSpan");
Object.defineProperty(exports, "PhoneFilterSpan", { enumerable: true, get: function () { return PhoneFilterSpan_1.PhoneFilterSpan; } });
var FaxNumberFilterSpan_1 = require("./filters/FaxNumberFilterSpan");
Object.defineProperty(exports, "FaxNumberFilterSpan", { enumerable: true, get: function () { return FaxNumberFilterSpan_1.FaxNumberFilterSpan; } });
var EmailFilterSpan_1 = require("./filters/EmailFilterSpan");
Object.defineProperty(exports, "EmailFilterSpan", { enumerable: true, get: function () { return EmailFilterSpan_1.EmailFilterSpan; } });
var AddressFilterSpan_1 = require("./filters/AddressFilterSpan");
Object.defineProperty(exports, "AddressFilterSpan", { enumerable: true, get: function () { return AddressFilterSpan_1.AddressFilterSpan; } });
var ZipCodeFilterSpan_1 = require("./filters/ZipCodeFilterSpan");
Object.defineProperty(exports, "ZipCodeFilterSpan", { enumerable: true, get: function () { return ZipCodeFilterSpan_1.ZipCodeFilterSpan; } });
// ============================================================================
// MEDICAL IDENTIFIER FILTERS
// ============================================================================
var MRNFilterSpan_1 = require("./filters/MRNFilterSpan");
Object.defineProperty(exports, "MRNFilterSpan", { enumerable: true, get: function () { return MRNFilterSpan_1.MRNFilterSpan; } });
var NPIFilterSpan_1 = require("./filters/NPIFilterSpan");
Object.defineProperty(exports, "NPIFilterSpan", { enumerable: true, get: function () { return NPIFilterSpan_1.NPIFilterSpan; } });
var HealthPlanNumberFilterSpan_1 = require("./filters/HealthPlanNumberFilterSpan");
Object.defineProperty(exports, "HealthPlanNumberFilterSpan", { enumerable: true, get: function () { return HealthPlanNumberFilterSpan_1.HealthPlanNumberFilterSpan; } });
// HospitalFilterSpan removed - hospital names are NOT PHI under HIPAA Safe Harbor
var AgeFilterSpan_1 = require("./filters/AgeFilterSpan");
Object.defineProperty(exports, "AgeFilterSpan", { enumerable: true, get: function () { return AgeFilterSpan_1.AgeFilterSpan; } });
var DateFilterSpan_1 = require("./filters/DateFilterSpan");
Object.defineProperty(exports, "DateFilterSpan", { enumerable: true, get: function () { return DateFilterSpan_1.DateFilterSpan; } });
// ============================================================================
// FINANCIAL FILTERS
// ============================================================================
var CreditCardFilterSpan_1 = require("./filters/CreditCardFilterSpan");
Object.defineProperty(exports, "CreditCardFilterSpan", { enumerable: true, get: function () { return CreditCardFilterSpan_1.CreditCardFilterSpan; } });
var AccountNumberFilterSpan_1 = require("./filters/AccountNumberFilterSpan");
Object.defineProperty(exports, "AccountNumberFilterSpan", { enumerable: true, get: function () { return AccountNumberFilterSpan_1.AccountNumberFilterSpan; } });
// ============================================================================
// TECHNICAL IDENTIFIER FILTERS
// ============================================================================
var IPAddressFilterSpan_1 = require("./filters/IPAddressFilterSpan");
Object.defineProperty(exports, "IPAddressFilterSpan", { enumerable: true, get: function () { return IPAddressFilterSpan_1.IPAddressFilterSpan; } });
var URLFilterSpan_1 = require("./filters/URLFilterSpan");
Object.defineProperty(exports, "URLFilterSpan", { enumerable: true, get: function () { return URLFilterSpan_1.URLFilterSpan; } });
var DeviceIdentifierFilterSpan_1 = require("./filters/DeviceIdentifierFilterSpan");
Object.defineProperty(exports, "DeviceIdentifierFilterSpan", { enumerable: true, get: function () { return DeviceIdentifierFilterSpan_1.DeviceIdentifierFilterSpan; } });
var VehicleIdentifierFilterSpan_1 = require("./filters/VehicleIdentifierFilterSpan");
Object.defineProperty(exports, "VehicleIdentifierFilterSpan", { enumerable: true, get: function () { return VehicleIdentifierFilterSpan_1.VehicleIdentifierFilterSpan; } });
var BiometricContextFilterSpan_1 = require("./filters/BiometricContextFilterSpan");
Object.defineProperty(exports, "BiometricContextFilterSpan", { enumerable: true, get: function () { return BiometricContextFilterSpan_1.BiometricContextFilterSpan; } });
var UniqueIdentifierFilterSpan_1 = require("./filters/UniqueIdentifierFilterSpan");
Object.defineProperty(exports, "UniqueIdentifierFilterSpan", { enumerable: true, get: function () { return UniqueIdentifierFilterSpan_1.UniqueIdentifierFilterSpan; } });
// ============================================================================
// CONTEXT-AWARE FILTERS (WIN-WIN: increase sensitivity AND specificity)
// ============================================================================
var ContextAwareNameFilter_1 = require("./filters/ContextAwareNameFilter");
Object.defineProperty(exports, "ContextAwareNameFilter", { enumerable: true, get: function () { return ContextAwareNameFilter_1.ContextAwareNameFilter; } });
var RelativeDateFilterSpan_1 = require("./filters/RelativeDateFilterSpan");
Object.defineProperty(exports, "RelativeDateFilterSpan", { enumerable: true, get: function () { return RelativeDateFilterSpan_1.RelativeDateFilterSpan; } });
var ContextAwareAddressFilter_1 = require("./filters/ContextAwareAddressFilter");
Object.defineProperty(exports, "ContextAwareAddressFilter", { enumerable: true, get: function () { return ContextAwareAddressFilter_1.ContextAwareAddressFilter; } });
// ============================================================================
// CLINICAL CONTEXT DETECTION
// ============================================================================
var ClinicalContextDetector_1 = require("./context/ClinicalContextDetector");
Object.defineProperty(exports, "ClinicalContextDetector", { enumerable: true, get: function () { return ClinicalContextDetector_1.ClinicalContextDetector; } });
Object.defineProperty(exports, "contextDetector", { enumerable: true, get: function () { return ClinicalContextDetector_1.contextDetector; } });
Object.defineProperty(exports, "RELATIVE_DATE_PATTERNS", { enumerable: true, get: function () { return ClinicalContextDetector_1.RELATIVE_DATE_PATTERNS; } });
// ============================================================================
// SUPPORT SERVICES
// ============================================================================
var FilterRegistry_1 = require("./filters/FilterRegistry");
Object.defineProperty(exports, "FilterRegistry", { enumerable: true, get: function () { return FilterRegistry_1.FilterRegistry; } });
var WindowService_1 = require("./services/WindowService");
Object.defineProperty(exports, "WindowService", { enumerable: true, get: function () { return WindowService_1.WindowService; } });
var ConfidenceModifierService_1 = require("./services/ConfidenceModifierService");
Object.defineProperty(exports, "ConfidenceModifierService", { enumerable: true, get: function () { return ConfidenceModifierService_1.ConfidenceModifierService; } });
var ReplacementContextService_1 = require("./services/ReplacementContextService");
Object.defineProperty(exports, "ReplacementContextService", { enumerable: true, get: function () { return ReplacementContextService_1.ReplacementContextService; } });
var ProvenanceService_1 = require("./services/ProvenanceService");
Object.defineProperty(exports, "ProvenanceService", { enumerable: true, get: function () { return ProvenanceService_1.ProvenanceService; } });
// ============================================================================
// ML & ADVANCED SCORING SYSTEMS
// ============================================================================
var MLWeightOptimizer_1 = require("./core/MLWeightOptimizer");
Object.defineProperty(exports, "MLWeightOptimizer", { enumerable: true, get: function () { return MLWeightOptimizer_1.MLWeightOptimizer; } });
Object.defineProperty(exports, "mlWeightOptimizer", { enumerable: true, get: function () { return MLWeightOptimizer_1.mlWeightOptimizer; } });
var CrossTypeReasoner_1 = require("./core/CrossTypeReasoner");
Object.defineProperty(exports, "CrossTypeReasoner", { enumerable: true, get: function () { return CrossTypeReasoner_1.CrossTypeReasoner; } });
Object.defineProperty(exports, "crossTypeReasoner", { enumerable: true, get: function () { return CrossTypeReasoner_1.crossTypeReasoner; } });
var ConfidenceCalibrator_1 = require("./core/ConfidenceCalibrator");
Object.defineProperty(exports, "ConfidenceCalibrator", { enumerable: true, get: function () { return ConfidenceCalibrator_1.ConfidenceCalibrator; } });
Object.defineProperty(exports, "confidenceCalibrator", { enumerable: true, get: function () { return ConfidenceCalibrator_1.confidenceCalibrator; } });
// ============================================================================
// CALIBRATION SYSTEM (Auto-calibration from test data)
// ============================================================================
var calibration_1 = require("./calibration");
Object.defineProperty(exports, "AutoCalibrator", { enumerable: true, get: function () { return calibration_1.AutoCalibrator; } });
Object.defineProperty(exports, "autoCalibrator", { enumerable: true, get: function () { return calibration_1.autoCalibrator; } });
Object.defineProperty(exports, "initializeCalibration", { enumerable: true, get: function () { return calibration_1.initializeCalibration; } });
Object.defineProperty(exports, "getCalibratedConfidence", { enumerable: true, get: function () { return calibration_1.getCalibratedConfidence; } });
Object.defineProperty(exports, "CalibrationDataExtractor", { enumerable: true, get: function () { return calibration_1.CalibrationDataExtractor; } });
Object.defineProperty(exports, "calibrationDataExtractor", { enumerable: true, get: function () { return calibration_1.calibrationDataExtractor; } });
Object.defineProperty(exports, "CalibrationPersistence", { enumerable: true, get: function () { return calibration_1.CalibrationPersistence; } });
Object.defineProperty(exports, "calibrationPersistence", { enumerable: true, get: function () { return calibration_1.calibrationPersistence; } });
var ContextualConfidenceModifier_1 = require("./core/ContextualConfidenceModifier");
Object.defineProperty(exports, "ContextualConfidenceModifier", { enumerable: true, get: function () { return ContextualConfidenceModifier_1.ContextualConfidenceModifier; } });
Object.defineProperty(exports, "contextualConfidenceModifier", { enumerable: true, get: function () { return ContextualConfidenceModifier_1.contextualConfidenceModifier; } });
Object.defineProperty(exports, "isContextModifierEnabled", { enumerable: true, get: function () { return ContextualConfidenceModifier_1.isContextModifierEnabled; } });
var WeightedPHIScorer_1 = require("./core/WeightedPHIScorer");
Object.defineProperty(exports, "WeightedPHIScorer", { enumerable: true, get: function () { return WeightedPHIScorer_1.WeightedPHIScorer; } });
Object.defineProperty(exports, "weightedScorer", { enumerable: true, get: function () { return WeightedPHIScorer_1.weightedScorer; } });
var SpanEnhancer_1 = require("./core/SpanEnhancer");
Object.defineProperty(exports, "SpanEnhancer", { enumerable: true, get: function () { return SpanEnhancer_1.SpanEnhancer; } });
Object.defineProperty(exports, "spanEnhancer", { enumerable: true, get: function () { return SpanEnhancer_1.spanEnhancer; } });
var EnsembleVoter_1 = require("./core/EnsembleVoter");
Object.defineProperty(exports, "EnsembleVoter", { enumerable: true, get: function () { return EnsembleVoter_1.EnsembleVoter; } });
Object.defineProperty(exports, "InterPHIDisambiguator", { enumerable: true, get: function () { return EnsembleVoter_1.InterPHIDisambiguator; } });
// ============================================================================
// DIAGNOSTICS & UTILITIES
// ============================================================================
var ValidationUtils_1 = require("./utils/ValidationUtils");
Object.defineProperty(exports, "ValidationUtils", { enumerable: true, get: function () { return ValidationUtils_1.ValidationUtils; } });
var NameDetectionUtils_1 = require("./utils/NameDetectionUtils");
Object.defineProperty(exports, "NameDetectionUtils", { enumerable: true, get: function () { return NameDetectionUtils_1.NameDetectionUtils; } });
Object.defineProperty(exports, "PROVIDER_TITLE_PREFIXES", { enumerable: true, get: function () { return NameDetectionUtils_1.PROVIDER_TITLE_PREFIXES; } });
Object.defineProperty(exports, "PROVIDER_CREDENTIALS", { enumerable: true, get: function () { return NameDetectionUtils_1.PROVIDER_CREDENTIALS; } });
Object.defineProperty(exports, "NON_PERSON_STRUCTURE_TERMS", { enumerable: true, get: function () { return NameDetectionUtils_1.NON_PERSON_STRUCTURE_TERMS; } });
Object.defineProperty(exports, "FAMILY_RELATIONSHIP_KEYWORDS", { enumerable: true, get: function () { return NameDetectionUtils_1.FAMILY_RELATIONSHIP_KEYWORDS; } });
var FilterHealthCheck_1 = require("./diagnostics/FilterHealthCheck");
Object.defineProperty(exports, "FilterHealthCheck", { enumerable: true, get: function () { return FilterHealthCheck_1.FilterHealthCheck; } });
var StatisticsTracker_1 = require("./stats/StatisticsTracker");
Object.defineProperty(exports, "StatisticsTracker", { enumerable: true, get: function () { return StatisticsTracker_1.StatisticsTracker; } });
var TokenManager_1 = require("./tokens/TokenManager");
Object.defineProperty(exports, "TokenManager", { enumerable: true, get: function () { return TokenManager_1.TokenManager; } });
var PolicyLoader_1 = require("./policies/PolicyLoader");
Object.defineProperty(exports, "PolicyLoader", { enumerable: true, get: function () { return PolicyLoader_1.PolicyLoader; } });
// ============================================================================
// STREAMING REDACTION API
// ============================================================================
var StreamingRedactor_1 = require("./StreamingRedactor");
Object.defineProperty(exports, "StreamingRedactor", { enumerable: true, get: function () { return StreamingRedactor_1.StreamingRedactor; } });
Object.defineProperty(exports, "WebSocketRedactionHandler", { enumerable: true, get: function () { return StreamingRedactor_1.WebSocketRedactionHandler; } });
var SupervisedStreamingRedactor_1 = require("./SupervisedStreamingRedactor");
Object.defineProperty(exports, "SupervisedStreamingRedactor", { enumerable: true, get: function () { return SupervisedStreamingRedactor_1.SupervisedStreamingRedactor; } });
Object.defineProperty(exports, "createSupervisedStreamingRedactor", { enumerable: true, get: function () { return SupervisedStreamingRedactor_1.createSupervisedStreamingRedactor; } });
// ============================================================================
// POLICY DSL
// ============================================================================
var PolicyDSL_1 = require("./PolicyDSL");
Object.defineProperty(exports, "PolicyCompiler", { enumerable: true, get: function () { return PolicyDSL_1.PolicyCompiler; } });
Object.defineProperty(exports, "PolicyTemplates", { enumerable: true, get: function () { return PolicyDSL_1.PolicyTemplates; } });
// ============================================================================
// TRUST BUNDLE & PROVENANCE
// ============================================================================
var TrustBundleExporter_1 = require("./provenance/TrustBundleExporter");
Object.defineProperty(exports, "TrustBundleExporter", { enumerable: true, get: function () { return TrustBundleExporter_1.TrustBundleExporter; } });
Object.defineProperty(exports, "TRUST_BUNDLE_VERSION", { enumerable: true, get: function () { return TrustBundleExporter_1.TRUST_BUNDLE_VERSION; } });
Object.defineProperty(exports, "TRUST_BUNDLE_EXTENSION", { enumerable: true, get: function () { return TrustBundleExporter_1.TRUST_BUNDLE_EXTENSION; } });
// ============================================================================
// IMAGE REDACTION (Step 17: Photo/Image PHI)
// ============================================================================
var images_1 = require("./core/images");
Object.defineProperty(exports, "ImageRedactor", { enumerable: true, get: function () { return images_1.ImageRedactor; } });
var images_2 = require("./core/images");
Object.defineProperty(exports, "OCRService", { enumerable: true, get: function () { return images_2.OCRService; } });
var images_3 = require("./core/images");
Object.defineProperty(exports, "VisualDetector", { enumerable: true, get: function () { return images_3.VisualDetector; } });
// Image Service Logging & Debugging
var images_4 = require("./core/images");
Object.defineProperty(exports, "ImageServiceLogger", { enumerable: true, get: function () { return images_4.ImageServiceLogger; } });
Object.defineProperty(exports, "getLogger", { enumerable: true, get: function () { return images_4.getLogger; } });
Object.defineProperty(exports, "withErrorBoundary", { enumerable: true, get: function () { return images_4.withErrorBoundary; } });
Object.defineProperty(exports, "withRetry", { enumerable: true, get: function () { return images_4.withRetry; } });
Object.defineProperty(exports, "withTimeout", { enumerable: true, get: function () { return images_4.withTimeout; } });
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return images_4.LogLevel; } });
// ============================================================================
// DICOM ANONYMIZATION (The "DICOM Firewall")
// ============================================================================
var dicom_1 = require("./core/dicom");
Object.defineProperty(exports, "DicomStreamTransformer", { enumerable: true, get: function () { return dicom_1.DicomStreamTransformer; } });
Object.defineProperty(exports, "HIPAA_DICOM_TAGS", { enumerable: true, get: function () { return dicom_1.HIPAA_DICOM_TAGS; } });
Object.defineProperty(exports, "anonymizeDicomBuffer", { enumerable: true, get: function () { return dicom_1.anonymizeDicomBuffer; } });
// ============================================================================
// PYTHON INTELLIGENCE BRIDGE (The "Cortex Brain")
// ============================================================================
var CortexPythonBridge_1 = require("./core/cortex/python/CortexPythonBridge");
Object.defineProperty(exports, "CortexPythonBridge", { enumerable: true, get: function () { return CortexPythonBridge_1.CortexPythonBridge; } });
// ============================================================================
// DFA MULTI-PATTERN SCANNING (Phase 4: High-Performance Pattern Matching)
// ============================================================================
var patterns_1 = require("./dfa/patterns");
Object.defineProperty(exports, "ALL_PATTERNS", { enumerable: true, get: function () { return patterns_1.ALL_PATTERNS; } });
Object.defineProperty(exports, "SSN_PATTERNS", { enumerable: true, get: function () { return patterns_1.SSN_PATTERNS; } });
Object.defineProperty(exports, "PHONE_PATTERNS", { enumerable: true, get: function () { return patterns_1.PHONE_PATTERNS; } });
Object.defineProperty(exports, "EMAIL_PATTERNS", { enumerable: true, get: function () { return patterns_1.EMAIL_PATTERNS; } });
Object.defineProperty(exports, "DATE_PATTERNS", { enumerable: true, get: function () { return patterns_1.DATE_PATTERNS; } });
Object.defineProperty(exports, "MRN_PATTERNS", { enumerable: true, get: function () { return patterns_1.MRN_PATTERNS; } });
Object.defineProperty(exports, "CREDIT_CARD_PATTERNS", { enumerable: true, get: function () { return patterns_1.CREDIT_CARD_PATTERNS; } });
Object.defineProperty(exports, "IP_PATTERNS", { enumerable: true, get: function () { return patterns_1.IP_PATTERNS; } });
Object.defineProperty(exports, "ZIPCODE_PATTERNS", { enumerable: true, get: function () { return patterns_1.ZIPCODE_PATTERNS; } });
Object.defineProperty(exports, "NPI_PATTERNS", { enumerable: true, get: function () { return patterns_1.NPI_PATTERNS; } });
Object.defineProperty(exports, "DEA_PATTERNS", { enumerable: true, get: function () { return patterns_1.DEA_PATTERNS; } });
Object.defineProperty(exports, "getPatternStats", { enumerable: true, get: function () { return patterns_1.getPatternStats; } });
var MultiPatternScanner_1 = require("./dfa/MultiPatternScanner");
Object.defineProperty(exports, "MultiPatternScanner", { enumerable: true, get: function () { return MultiPatternScanner_1.MultiPatternScanner; } });
Object.defineProperty(exports, "RustDFAScanner", { enumerable: true, get: function () { return MultiPatternScanner_1.RustDFAScanner; } });
Object.defineProperty(exports, "ZigDFAScanner", { enumerable: true, get: function () { return MultiPatternScanner_1.ZigDFAScanner; } });
Object.defineProperty(exports, "getMultiPatternScanner", { enumerable: true, get: function () { return MultiPatternScanner_1.getMultiPatternScanner; } });
Object.defineProperty(exports, "isDFAScanningEnabled", { enumerable: true, get: function () { return MultiPatternScanner_1.isDFAScanningEnabled; } });
Object.defineProperty(exports, "isRustAccelerationAvailable", { enumerable: true, get: function () { return MultiPatternScanner_1.isRustAccelerationAvailable; } });
Object.defineProperty(exports, "scanWithDFA", { enumerable: true, get: function () { return MultiPatternScanner_1.scanWithDFA; } });
// ============================================================================
// GPU BATCH PROCESSING (Phase 5: WebGPU Acceleration)
// ============================================================================
var gpu_1 = require("./gpu");
Object.defineProperty(exports, "WebGPUBatchProcessor", { enumerable: true, get: function () { return gpu_1.WebGPUBatchProcessor; } });
Object.defineProperty(exports, "getBatchProcessor", { enumerable: true, get: function () { return gpu_1.getBatchProcessor; } });
Object.defineProperty(exports, "processBatch", { enumerable: true, get: function () { return gpu_1.processBatch; } });
Object.defineProperty(exports, "shouldUseBatchProcessing", { enumerable: true, get: function () { return gpu_1.shouldUseBatchProcessing; } });
// ============================================================================
// SUPERVISION & FAULT TOLERANCE (Phase 6: Elixir-Style Supervision)
// ============================================================================
var Supervisor_1 = require("./supervision/Supervisor");
Object.defineProperty(exports, "Supervisor", { enumerable: true, get: function () { return Supervisor_1.Supervisor; } });
var CircuitBreaker_1 = require("./supervision/CircuitBreaker");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return CircuitBreaker_1.CircuitBreaker; } });
Object.defineProperty(exports, "CircuitOpenError", { enumerable: true, get: function () { return CircuitBreaker_1.CircuitOpenError; } });
var BackpressureQueue_1 = require("./supervision/BackpressureQueue");
Object.defineProperty(exports, "BackpressureQueue", { enumerable: true, get: function () { return BackpressureQueue_1.BackpressureQueue; } });
// ============================================================================
// DATALOG REASONING (Phase 3: Declarative Constraint Solving)
// ============================================================================
var DatalogReasoner_1 = require("./core/DatalogReasoner");
Object.defineProperty(exports, "DatalogReasoner", { enumerable: true, get: function () { return DatalogReasoner_1.DatalogReasoner; } });
Object.defineProperty(exports, "datalogReasoner", { enumerable: true, get: function () { return DatalogReasoner_1.datalogReasoner; } });
// ============================================================================
// ADVANCED DICTIONARIES (Phase 1 & 2: Bloom Filter + SQLite)
// ============================================================================
var FastFuzzyMatcher_1 = require("./dictionaries/FastFuzzyMatcher");
Object.defineProperty(exports, "FastFuzzyMatcher", { enumerable: true, get: function () { return FastFuzzyMatcher_1.FastFuzzyMatcher; } });
var BloomFilterStore_1 = require("./dictionaries/BloomFilterStore");
Object.defineProperty(exports, "BloomFilterStore", { enumerable: true, get: function () { return BloomFilterStore_1.BloomFilterStore; } });
var SQLiteDictionaryMatcher_1 = require("./dictionaries/SQLiteDictionaryMatcher");
Object.defineProperty(exports, "SQLiteDictionaryMatcher", { enumerable: true, get: function () { return SQLiteDictionaryMatcher_1.SQLiteDictionaryMatcher; } });
Object.defineProperty(exports, "getSQLiteDictionaryMatcher", { enumerable: true, get: function () { return SQLiteDictionaryMatcher_1.getSQLiteDictionaryMatcher; } });
Object.defineProperty(exports, "isSQLiteDictionaryAvailable", { enumerable: true, get: function () { return SQLiteDictionaryMatcher_1.isSQLiteDictionaryAvailable; } });
// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================
var EnvironmentConfig_1 = require("./config/EnvironmentConfig");
Object.defineProperty(exports, "isBloomFilterEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isBloomFilterEnabled; } });
Object.defineProperty(exports, "isSQLiteDictionaryEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isSQLiteDictionaryEnabled; } });
Object.defineProperty(exports, "isDatalogReasonerEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isDatalogReasonerEnabled; } });
Object.defineProperty(exports, "isDFAScanEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isDFAScanEnabled; } });
Object.defineProperty(exports, "isZigDFAAccelEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isZigDFAAccelEnabled; } });
Object.defineProperty(exports, "getZigDFAMode", { enumerable: true, get: function () { return EnvironmentConfig_1.getZigDFAMode; } });
Object.defineProperty(exports, "isGPUBatchEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isGPUBatchEnabled; } });
Object.defineProperty(exports, "getGPUFallbackThreshold", { enumerable: true, get: function () { return EnvironmentConfig_1.getGPUFallbackThreshold; } });
Object.defineProperty(exports, "isSupervisionEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isSupervisionEnabled; } });
Object.defineProperty(exports, "isCircuitBreakerEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isCircuitBreakerEnabled; } });
Object.defineProperty(exports, "isFuzzyAccelEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isFuzzyAccelEnabled; } });
Object.defineProperty(exports, "isPhoneticEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isPhoneticEnabled; } });
Object.defineProperty(exports, "getPhoneticThreshold", { enumerable: true, get: function () { return EnvironmentConfig_1.getPhoneticThreshold; } });
Object.defineProperty(exports, "isStreamKernelEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isStreamKernelEnabled; } });
Object.defineProperty(exports, "isStreamDetectionsEnabled", { enumerable: true, get: function () { return EnvironmentConfig_1.isStreamDetectionsEnabled; } });
Object.defineProperty(exports, "getConfigurationSummary", { enumerable: true, get: function () { return EnvironmentConfig_1.getConfigurationSummary; } });
Object.defineProperty(exports, "logConfiguration", { enumerable: true, get: function () { return EnvironmentConfig_1.logConfiguration; } });
// ============================================================================
// FEATURE TOGGLES (Centralized Feature Flag Management)
// ============================================================================
var FeatureToggles_1 = require("./config/FeatureToggles");
Object.defineProperty(exports, "FeatureToggles", { enumerable: true, get: function () { return FeatureToggles_1.FeatureToggles; } });
// ============================================================================
// UNIFIED FILTER ENGINE (Single Rust NAPI call for all patterns)
// ============================================================================
var VulpesFilterEngine_1 = require("./utils/VulpesFilterEngine");
Object.defineProperty(exports, "VulpesFilterEngine", { enumerable: true, get: function () { return VulpesFilterEngine_1.VulpesFilterEngine; } });
Object.defineProperty(exports, "isUnifiedScannerAvailable", { enumerable: true, get: function () { return VulpesFilterEngine_1.isUnifiedScannerAvailable; } });
Object.defineProperty(exports, "isUnifiedScannerEnabled", { enumerable: true, get: function () { return VulpesFilterEngine_1.isUnifiedScannerEnabled; } });
Object.defineProperty(exports, "scanAllWithRust", { enumerable: true, get: function () { return VulpesFilterEngine_1.scanAllWithRust; } });
Object.defineProperty(exports, "detectionsToSpans", { enumerable: true, get: function () { return VulpesFilterEngine_1.detectionsToSpans; } });
Object.defineProperty(exports, "getRustSupportedTypes", { enumerable: true, get: function () { return VulpesFilterEngine_1.getRustSupportedTypes; } });
Object.defineProperty(exports, "getTypeScriptOnlyTypes", { enumerable: true, get: function () { return VulpesFilterEngine_1.getTypeScriptOnlyTypes; } });
// ============================================================================
// VERSION INFO
// ============================================================================
exports.VERSION = "1.0.0";
exports.ENGINE_NAME = "Vulpes Celare";
exports.VARIANT = "Hatkoff Redaction Engine";
//# sourceMappingURL=index.js.map