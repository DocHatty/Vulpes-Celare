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
exports.ConfidenceCalibrator = exports.crossTypeReasoner = exports.CrossTypeReasoner = exports.mlWeightOptimizer = exports.MLWeightOptimizer = exports.ReplacementContextService = exports.ConfidenceModifierService = exports.WindowService = exports.FilterRegistry = exports.UniqueIdentifierFilterSpan = exports.BiometricContextFilterSpan = exports.VehicleIdentifierFilterSpan = exports.DeviceIdentifierFilterSpan = exports.URLFilterSpan = exports.IPAddressFilterSpan = exports.AccountNumberFilterSpan = exports.CreditCardFilterSpan = exports.DateFilterSpan = exports.AgeFilterSpan = exports.HealthPlanNumberFilterSpan = exports.NPIFilterSpan = exports.MRNFilterSpan = exports.ZipCodeFilterSpan = exports.AddressFilterSpan = exports.EmailFilterSpan = exports.FaxNumberFilterSpan = exports.PhoneFilterSpan = exports.DEAFilterSpan = exports.LicenseNumberFilterSpan = exports.PassportNumberFilterSpan = exports.SSNFilterSpan = exports.FamilyNameFilterSpan = exports.TitledNameFilterSpan = exports.FormattedNameFilterSpan = exports.SmartNameFilterSpan = exports.DocumentVocabulary = exports.RedactionContext = exports.FilterType = exports.SpanUtils = exports.Span = exports.PostFilterService = exports.FieldLabelWhitelist = exports.FieldContextDetector = exports.FilterAdapter = exports.SpanFactory = exports.FilterPriority = exports.SpanBasedFilter = exports.ParallelRedactionEngine = exports.default = exports.VulpesCelare = void 0;
exports.VARIANT = exports.ENGINE_NAME = exports.VERSION = exports.CortexPythonBridge = exports.anonymizeDicomBuffer = exports.HIPAA_DICOM_TAGS = exports.DicomStreamTransformer = exports.LogLevel = exports.withTimeout = exports.withRetry = exports.withErrorBoundary = exports.getLogger = exports.ImageServiceLogger = exports.VisualDetector = exports.OCRService = exports.ImageRedactor = exports.TRUST_BUNDLE_EXTENSION = exports.TRUST_BUNDLE_VERSION = exports.TrustBundleExporter = exports.PolicyTemplates = exports.PolicyCompiler = exports.WebSocketRedactionHandler = exports.StreamingRedactor = exports.PolicyLoader = exports.TokenManager = exports.StatisticsTracker = exports.FilterHealthCheck = exports.FAMILY_RELATIONSHIP_KEYWORDS = exports.NON_PERSON_STRUCTURE_TERMS = exports.PROVIDER_CREDENTIALS = exports.PROVIDER_TITLE_PREFIXES = exports.NameDetectionUtils = exports.ValidationUtils = exports.InterPHIDisambiguator = exports.EnsembleVoter = exports.spanEnhancer = exports.SpanEnhancer = exports.weightedScorer = exports.WeightedPHIScorer = exports.confidenceCalibrator = void 0;
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
// VERSION INFO
// ============================================================================
exports.VERSION = "1.0.0";
exports.ENGINE_NAME = "Vulpes Celare";
exports.VARIANT = "Hatkoff Redaction Engine";
//# sourceMappingURL=index.js.map