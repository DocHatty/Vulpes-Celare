"use strict";
/**
 * Zod Schemas for Configuration Validation
 *
 * Provides runtime validation for all configuration types used with AtomicConfig.
 * Schemas ensure type safety and validate hot-reloaded configurations.
 *
 * @module config/schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.DEFAULT_POSTFILTER = exports.DEFAULT_WEIGHTS = exports.DEFAULT_CALIBRATION = exports.DEFAULT_FEATURES = exports.DEFAULT_THRESHOLDS = exports.VulpesConfigSchema = exports.PostFilterConfigSchema = exports.PostFilterRuleSchema = exports.FilterWeightsConfigSchema = exports.FilterWeightSchema = exports.CalibrationConfigSchema = exports.FilterCalibrationEntrySchema = exports.FeatureTogglesConfigSchema = exports.FeatureToggleSchema = exports.FeatureCategorySchema = exports.ThresholdsConfigSchema = exports.OcrThresholdsSchema = exports.PipelineThresholdsSchema = exports.ShortNameThresholdsSchema = exports.ContextWindowSchema = exports.ConfidenceThresholdsSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// THRESHOLD SCHEMAS
// ============================================================================
/**
 * Confidence threshold schema (0.0 - 1.0)
 */
const confidenceValue = zod_1.z.number().min(0).max(1);
/**
 * Confidence thresholds configuration
 */
exports.ConfidenceThresholdsSchema = zod_1.z.object({
    /** Very high confidence (0.9-1.0) */
    VERY_HIGH: confidenceValue.default(0.95),
    /** High confidence (0.85-0.95) */
    HIGH: confidenceValue.default(0.90),
    /** Medium confidence (0.7-0.85) */
    MEDIUM: confidenceValue.default(0.85),
    /** Low confidence (0.5-0.7) */
    LOW: confidenceValue.default(0.70),
    /** Minimum threshold for retention */
    MINIMUM: confidenceValue.default(0.60),
    /** Drop threshold */
    DROP: confidenceValue.default(0.50),
});
/**
 * Context window configuration
 */
exports.ContextWindowSchema = zod_1.z.object({
    /** Characters before match */
    LOOKBACK_CHARS: zod_1.z.number().int().min(0).max(500).default(50),
    /** Characters after match */
    LOOKAHEAD_CHARS: zod_1.z.number().int().min(0).max(500).default(50),
    /** Tokens in window array */
    WINDOW_TOKENS: zod_1.z.number().int().min(0).max(20).default(5),
    /** Max context for heavy ops */
    MAX_CONTEXT_CHARS: zod_1.z.number().int().min(0).max(1000).default(200),
});
/**
 * Short name thresholds
 */
exports.ShortNameThresholdsSchema = zod_1.z.object({
    /** Min length before requiring higher confidence */
    MIN_LENGTH: zod_1.z.number().int().min(1).max(20).default(5),
    /** Min confidence for short names */
    MIN_CONFIDENCE_WHEN_SHORT: confidenceValue.default(0.90),
});
/**
 * Pipeline stage thresholds
 */
exports.PipelineThresholdsSchema = zod_1.z.object({
    /** Vector disambiguation minimum */
    VECTOR_DISAMBIGUATION_MIN: confidenceValue.default(0.65),
    /** Cross-type reasoner minimum */
    CROSS_TYPE_REASONER_MIN: confidenceValue.default(0.60),
    /** Labeled field confidence boost */
    LABELED_FIELD_BOOST: zod_1.z.number().min(0).max(0.5).default(0.15),
    /** Non-clinical context penalty */
    NON_CLINICAL_PENALTY: zod_1.z.number().min(0).max(0.5).default(0.10),
    /** Maximum confidence cap */
    MAX_CONFIDENCE: confidenceValue.default(1.0),
});
/**
 * OCR thresholds
 */
exports.OcrThresholdsSchema = zod_1.z.object({
    /** Base confidence for OCR patterns */
    BASE_CONFIDENCE: confidenceValue.default(0.70),
    /** Multi-match boost */
    MULTI_MATCH_BOOST: zod_1.z.number().min(0).max(0.3).default(0.10),
    /** Max OCR-only confidence */
    MAX_OCR_ONLY_CONFIDENCE: confidenceValue.default(0.85),
});
/**
 * Complete thresholds configuration
 */
exports.ThresholdsConfigSchema = zod_1.z.object({
    confidence: exports.ConfidenceThresholdsSchema.optional().transform(v => v ?? {
        VERY_HIGH: 0.95,
        HIGH: 0.90,
        MEDIUM: 0.85,
        LOW: 0.70,
        MINIMUM: 0.60,
        DROP: 0.50,
    }),
    context: exports.ContextWindowSchema.optional().transform(v => v ?? {
        LOOKBACK_CHARS: 50,
        LOOKAHEAD_CHARS: 50,
        WINDOW_TOKENS: 5,
        MAX_CONTEXT_CHARS: 200,
    }),
    shortName: exports.ShortNameThresholdsSchema.optional().transform(v => v ?? {
        MIN_LENGTH: 5,
        MIN_CONFIDENCE_WHEN_SHORT: 0.90,
    }),
    pipeline: exports.PipelineThresholdsSchema.optional().transform(v => v ?? {
        VECTOR_DISAMBIGUATION_MIN: 0.65,
        CROSS_TYPE_REASONER_MIN: 0.60,
        LABELED_FIELD_BOOST: 0.15,
        NON_CLINICAL_PENALTY: 0.10,
        MAX_CONFIDENCE: 1.0,
    }),
    ocr: exports.OcrThresholdsSchema.optional().transform(v => v ?? {
        BASE_CONFIDENCE: 0.70,
        MULTI_MATCH_BOOST: 0.10,
        MAX_OCR_ONLY_CONFIDENCE: 0.85,
    }),
});
/**
 * Inner defaults for ThresholdsConfig (used by VulpesConfigSchema)
 */
const DEFAULT_THRESHOLDS_INNER = {
    confidence: {
        VERY_HIGH: 0.95,
        HIGH: 0.90,
        MEDIUM: 0.85,
        LOW: 0.70,
        MINIMUM: 0.60,
        DROP: 0.50,
    },
    context: {
        LOOKBACK_CHARS: 50,
        LOOKAHEAD_CHARS: 50,
        WINDOW_TOKENS: 5,
        MAX_CONTEXT_CHARS: 200,
    },
    shortName: {
        MIN_LENGTH: 5,
        MIN_CONFIDENCE_WHEN_SHORT: 0.90,
    },
    pipeline: {
        VECTOR_DISAMBIGUATION_MIN: 0.65,
        CROSS_TYPE_REASONER_MIN: 0.60,
        LABELED_FIELD_BOOST: 0.15,
        NON_CLINICAL_PENALTY: 0.10,
        MAX_CONFIDENCE: 1.0,
    },
    ocr: {
        BASE_CONFIDENCE: 0.70,
        MULTI_MATCH_BOOST: 0.10,
        MAX_OCR_ONLY_CONFIDENCE: 0.85,
    },
};
// ============================================================================
// FEATURE TOGGLE SCHEMAS
// ============================================================================
/**
 * Feature category
 */
exports.FeatureCategorySchema = zod_1.z.enum([
    "core",
    "acceleration",
    "experimental",
    "debug",
]);
/**
 * Individual feature toggle
 */
exports.FeatureToggleSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    description: zod_1.z.string().optional(),
    category: exports.FeatureCategorySchema.optional(),
});
/**
 * All feature toggles
 */
exports.FeatureTogglesConfigSchema = zod_1.z.object({
    // Core features
    datalog: zod_1.z.boolean().default(true),
    contextModifier: zod_1.z.boolean().default(true),
    // Acceleration features
    dfaScan: zod_1.z.boolean().default(false),
    rustAccel: zod_1.z.boolean().default(true),
    // Experimental features
    contextFilters: zod_1.z.boolean().default(false),
    cortex: zod_1.z.boolean().default(false),
    optimizedWeights: zod_1.z.boolean().default(false),
    gliner: zod_1.z.boolean().default(false),
    mlConfidence: zod_1.z.boolean().default(false),
    mlFPFilter: zod_1.z.boolean().default(false),
    // Debug features
    shadowRustName: zod_1.z.boolean().default(false),
    shadowRustNameFull: zod_1.z.boolean().default(false),
    shadowRustNameSmart: zod_1.z.boolean().default(false),
    shadowPostfilter: zod_1.z.boolean().default(false),
    shadowApplySpans: zod_1.z.boolean().default(false),
    // GPU/ML configuration
    gpuProvider: zod_1.z.enum(["cpu", "cuda", "directml", "rocm", "coreml"]).default("cpu"),
    mlDevice: zod_1.z.enum(["cpu", "cuda", "directml", "coreml"]).default("cpu"),
    nameDetectionMode: zod_1.z.enum(["hybrid", "gliner", "rules"]).default("hybrid"),
});
// ============================================================================
// CALIBRATION SCHEMAS
// ============================================================================
/**
 * Per-filter calibration entry
 */
exports.FilterCalibrationEntrySchema = zod_1.z.object({
    /** Calibration offset (-0.5 to 0.5) */
    offset: zod_1.z.number().min(-0.5).max(0.5).default(0),
    /** Calibration scale (0.5 to 2.0) */
    scale: zod_1.z.number().min(0.5).max(2.0).default(1),
    /** Sample count used for calibration */
    sampleCount: zod_1.z.number().int().min(0).default(0),
    /** Last calibration timestamp */
    lastCalibrated: zod_1.z.string().datetime().optional(),
});
/**
 * Full calibration configuration
 */
exports.CalibrationConfigSchema = zod_1.z.object({
    /** Version for compatibility */
    version: zod_1.z.number().int().min(1).default(1),
    /** Fitted timestamp */
    fittedAt: zod_1.z.string().datetime().optional(),
    /** Per-filter calibration */
    filters: zod_1.z.record(zod_1.z.string(), exports.FilterCalibrationEntrySchema).default({}),
    /** Global offset */
    globalOffset: zod_1.z.number().min(-0.5).max(0.5).default(0),
    /** Global scale */
    globalScale: zod_1.z.number().min(0.5).max(2.0).default(1),
    /** Whether calibration is enabled */
    enabled: zod_1.z.boolean().default(true),
});
// ============================================================================
// FILTER WEIGHT SCHEMAS
// ============================================================================
/**
 * Per-filter weight configuration
 */
exports.FilterWeightSchema = zod_1.z.object({
    /** Base weight for this filter */
    weight: zod_1.z.number().min(0).max(10).default(1),
    /** Context boost multiplier */
    contextBoost: zod_1.z.number().min(0).max(3).default(1),
    /** Dictionary match multiplier */
    dictionaryBoost: zod_1.z.number().min(0).max(3).default(1),
    /** Penalty for low-context matches */
    lowContextPenalty: zod_1.z.number().min(0).max(1).default(0),
});
/**
 * All filter weights
 */
exports.FilterWeightsConfigSchema = zod_1.z.object({
    /** Per-filter-type weights */
    weights: zod_1.z.record(zod_1.z.string(), exports.FilterWeightSchema).default({}),
    /** Default weight for unknown filters */
    defaultWeight: exports.FilterWeightSchema.optional().transform(v => v ?? {
        weight: 1,
        contextBoost: 1,
        dictionaryBoost: 1,
        lowContextPenalty: 0,
    }),
    /** Whether to use optimized weights */
    useOptimized: zod_1.z.boolean().default(false),
    /** Last optimization timestamp */
    lastOptimized: zod_1.z.string().datetime().optional(),
});
// ============================================================================
// POST-FILTER SCHEMAS
// ============================================================================
/**
 * Post-filter rule configuration
 */
exports.PostFilterRuleSchema = zod_1.z.object({
    /** Rule ID */
    id: zod_1.z.string(),
    /** Rule description */
    description: zod_1.z.string().optional(),
    /** Whether rule is enabled */
    enabled: zod_1.z.boolean().default(true),
    /** Filter types this rule applies to */
    filterTypes: zod_1.z.array(zod_1.z.string()).optional(),
    /** Pattern to match (regex string) */
    pattern: zod_1.z.string().optional(),
    /** Action to take */
    action: zod_1.z.enum(["remove", "demote", "boost", "reclassify"]).default("remove"),
    /** Confidence adjustment (for demote/boost) */
    confidenceAdjustment: zod_1.z.number().min(-1).max(1).default(0),
    /** New filter type (for reclassify) */
    newFilterType: zod_1.z.string().optional(),
});
/**
 * Post-filter configuration
 */
exports.PostFilterConfigSchema = zod_1.z.object({
    /** Custom rules */
    rules: zod_1.z.array(exports.PostFilterRuleSchema).default([]),
    /** Enable built-in medical whitelist */
    enableMedicalWhitelist: zod_1.z.boolean().default(true),
    /** Enable structure word filtering */
    enableStructureFiltering: zod_1.z.boolean().default(true),
    /** Minimum span length */
    minSpanLength: zod_1.z.number().int().min(1).max(100).default(2),
    /** Maximum span length */
    maxSpanLength: zod_1.z.number().int().min(1).max(10000).default(500),
});
// ============================================================================
// MASTER CONFIG SCHEMA
// ============================================================================
/**
 * Complete Vulpes configuration
 */
exports.VulpesConfigSchema = zod_1.z.object({
    /** Threshold configuration */
    thresholds: exports.ThresholdsConfigSchema.optional().transform(v => v ?? DEFAULT_THRESHOLDS_INNER),
    /** Feature toggles */
    features: exports.FeatureTogglesConfigSchema.optional(),
    /** Calibration configuration */
    calibration: exports.CalibrationConfigSchema.optional(),
    /** Filter weights */
    weights: exports.FilterWeightsConfigSchema.optional(),
    /** Post-filter configuration */
    postFilter: exports.PostFilterConfigSchema.optional(),
});
// ============================================================================
// DEFAULT VALUES
// ============================================================================
/**
 * Default threshold configuration
 */
exports.DEFAULT_THRESHOLDS = exports.ThresholdsConfigSchema.parse({});
/**
 * Default feature toggles
 */
exports.DEFAULT_FEATURES = exports.FeatureTogglesConfigSchema.parse({});
/**
 * Default calibration config
 */
exports.DEFAULT_CALIBRATION = exports.CalibrationConfigSchema.parse({});
/**
 * Default filter weights
 */
exports.DEFAULT_WEIGHTS = exports.FilterWeightsConfigSchema.parse({});
/**
 * Default post-filter config
 */
exports.DEFAULT_POSTFILTER = exports.PostFilterConfigSchema.parse({});
/**
 * Default complete config
 */
exports.DEFAULT_CONFIG = exports.VulpesConfigSchema.parse({});
//# sourceMappingURL=schemas.js.map