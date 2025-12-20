/**
 * Zod Schemas for Configuration Validation
 *
 * Provides runtime validation for all configuration types used with AtomicConfig.
 * Schemas ensure type safety and validate hot-reloaded configurations.
 *
 * @module config/schemas
 */

import { z } from "zod";

// ============================================================================
// THRESHOLD SCHEMAS
// ============================================================================

/**
 * Confidence threshold schema (0.0 - 1.0)
 */
const confidenceValue = z.number().min(0).max(1);

/**
 * Confidence thresholds configuration
 */
export const ConfidenceThresholdsSchema = z.object({
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

export type ConfidenceThresholdsConfig = z.infer<typeof ConfidenceThresholdsSchema>;

/**
 * Context window configuration
 */
export const ContextWindowSchema = z.object({
  /** Characters before match */
  LOOKBACK_CHARS: z.number().int().min(0).max(500).default(50),
  /** Characters after match */
  LOOKAHEAD_CHARS: z.number().int().min(0).max(500).default(50),
  /** Tokens in window array */
  WINDOW_TOKENS: z.number().int().min(0).max(20).default(5),
  /** Max context for heavy ops */
  MAX_CONTEXT_CHARS: z.number().int().min(0).max(1000).default(200),
});

export type ContextWindowConfig = z.infer<typeof ContextWindowSchema>;

/**
 * Short name thresholds
 */
export const ShortNameThresholdsSchema = z.object({
  /** Min length before requiring higher confidence */
  MIN_LENGTH: z.number().int().min(1).max(20).default(5),
  /** Min confidence for short names */
  MIN_CONFIDENCE_WHEN_SHORT: confidenceValue.default(0.90),
});

export type ShortNameThresholdsConfig = z.infer<typeof ShortNameThresholdsSchema>;

/**
 * Pipeline stage thresholds
 */
export const PipelineThresholdsSchema = z.object({
  /** Vector disambiguation minimum */
  VECTOR_DISAMBIGUATION_MIN: confidenceValue.default(0.65),
  /** Cross-type reasoner minimum */
  CROSS_TYPE_REASONER_MIN: confidenceValue.default(0.60),
  /** Labeled field confidence boost */
  LABELED_FIELD_BOOST: z.number().min(0).max(0.5).default(0.15),
  /** Non-clinical context penalty */
  NON_CLINICAL_PENALTY: z.number().min(0).max(0.5).default(0.10),
  /** Maximum confidence cap */
  MAX_CONFIDENCE: confidenceValue.default(1.0),
});

export type PipelineThresholdsConfig = z.infer<typeof PipelineThresholdsSchema>;

/**
 * OCR thresholds
 */
export const OcrThresholdsSchema = z.object({
  /** Base confidence for OCR patterns */
  BASE_CONFIDENCE: confidenceValue.default(0.70),
  /** Multi-match boost */
  MULTI_MATCH_BOOST: z.number().min(0).max(0.3).default(0.10),
  /** Max OCR-only confidence */
  MAX_OCR_ONLY_CONFIDENCE: confidenceValue.default(0.85),
});

export type OcrThresholdsConfig = z.infer<typeof OcrThresholdsSchema>;

/**
 * Complete thresholds configuration
 */
export const ThresholdsConfigSchema = z.object({
  confidence: ConfidenceThresholdsSchema.optional().transform(v => v ?? {
    VERY_HIGH: 0.95,
    HIGH: 0.90,
    MEDIUM: 0.85,
    LOW: 0.70,
    MINIMUM: 0.60,
    DROP: 0.50,
  }),
  context: ContextWindowSchema.optional().transform(v => v ?? {
    LOOKBACK_CHARS: 50,
    LOOKAHEAD_CHARS: 50,
    WINDOW_TOKENS: 5,
    MAX_CONTEXT_CHARS: 200,
  }),
  shortName: ShortNameThresholdsSchema.optional().transform(v => v ?? {
    MIN_LENGTH: 5,
    MIN_CONFIDENCE_WHEN_SHORT: 0.90,
  }),
  pipeline: PipelineThresholdsSchema.optional().transform(v => v ?? {
    VECTOR_DISAMBIGUATION_MIN: 0.65,
    CROSS_TYPE_REASONER_MIN: 0.60,
    LABELED_FIELD_BOOST: 0.15,
    NON_CLINICAL_PENALTY: 0.10,
    MAX_CONFIDENCE: 1.0,
  }),
  ocr: OcrThresholdsSchema.optional().transform(v => v ?? {
    BASE_CONFIDENCE: 0.70,
    MULTI_MATCH_BOOST: 0.10,
    MAX_OCR_ONLY_CONFIDENCE: 0.85,
  }),
});

export type ThresholdsConfig = z.infer<typeof ThresholdsConfigSchema>;

/**
 * Inner defaults for ThresholdsConfig (used by VulpesConfigSchema)
 */
const DEFAULT_THRESHOLDS_INNER: ThresholdsConfig = {
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
export const FeatureCategorySchema = z.enum([
  "core",
  "acceleration",
  "experimental",
  "debug",
]);

/**
 * Individual feature toggle
 */
export const FeatureToggleSchema = z.object({
  enabled: z.boolean(),
  description: z.string().optional(),
  category: FeatureCategorySchema.optional(),
});

/**
 * All feature toggles
 */
export const FeatureTogglesConfigSchema = z.object({
  // Core features
  datalog: z.boolean().default(true),
  contextModifier: z.boolean().default(true),

  // Acceleration features
  dfaScan: z.boolean().default(false),
  rustAccel: z.boolean().default(true),

  // Experimental features
  contextFilters: z.boolean().default(false),
  cortex: z.boolean().default(false),
  optimizedWeights: z.boolean().default(false),
  gliner: z.boolean().default(false),
  mlConfidence: z.boolean().default(false),
  mlFPFilter: z.boolean().default(false),

  // Debug features
  shadowRustName: z.boolean().default(false),
  shadowRustNameFull: z.boolean().default(false),
  shadowRustNameSmart: z.boolean().default(false),
  shadowPostfilter: z.boolean().default(false),
  shadowApplySpans: z.boolean().default(false),

  // GPU/ML configuration
  gpuProvider: z.enum(["cpu", "cuda", "directml", "rocm", "coreml"]).default("cpu"),
  mlDevice: z.enum(["cpu", "cuda", "directml", "coreml"]).default("cpu"),
  nameDetectionMode: z.enum(["hybrid", "gliner", "rules"]).default("hybrid"),
});

export type FeatureTogglesConfig = z.infer<typeof FeatureTogglesConfigSchema>;

// ============================================================================
// CALIBRATION SCHEMAS
// ============================================================================

/**
 * Per-filter calibration entry
 */
export const FilterCalibrationEntrySchema = z.object({
  /** Calibration offset (-0.5 to 0.5) */
  offset: z.number().min(-0.5).max(0.5).default(0),
  /** Calibration scale (0.5 to 2.0) */
  scale: z.number().min(0.5).max(2.0).default(1),
  /** Sample count used for calibration */
  sampleCount: z.number().int().min(0).default(0),
  /** Last calibration timestamp */
  lastCalibrated: z.string().datetime().optional(),
});

export type FilterCalibrationEntry = z.infer<typeof FilterCalibrationEntrySchema>;

/**
 * Full calibration configuration
 */
export const CalibrationConfigSchema = z.object({
  /** Version for compatibility */
  version: z.number().int().min(1).default(1),
  /** Fitted timestamp */
  fittedAt: z.string().datetime().optional(),
  /** Per-filter calibration */
  filters: z.record(z.string(), FilterCalibrationEntrySchema).default({}),
  /** Global offset */
  globalOffset: z.number().min(-0.5).max(0.5).default(0),
  /** Global scale */
  globalScale: z.number().min(0.5).max(2.0).default(1),
  /** Whether calibration is enabled */
  enabled: z.boolean().default(true),
});

export type CalibrationConfig = z.infer<typeof CalibrationConfigSchema>;

// ============================================================================
// FILTER WEIGHT SCHEMAS
// ============================================================================

/**
 * Per-filter weight configuration
 */
export const FilterWeightSchema = z.object({
  /** Base weight for this filter */
  weight: z.number().min(0).max(10).default(1),
  /** Context boost multiplier */
  contextBoost: z.number().min(0).max(3).default(1),
  /** Dictionary match multiplier */
  dictionaryBoost: z.number().min(0).max(3).default(1),
  /** Penalty for low-context matches */
  lowContextPenalty: z.number().min(0).max(1).default(0),
});

export type FilterWeight = z.infer<typeof FilterWeightSchema>;

/**
 * All filter weights
 */
export const FilterWeightsConfigSchema = z.object({
  /** Per-filter-type weights */
  weights: z.record(z.string(), FilterWeightSchema).default({}),
  /** Default weight for unknown filters */
  defaultWeight: FilterWeightSchema.optional().transform(v => v ?? {
    weight: 1,
    contextBoost: 1,
    dictionaryBoost: 1,
    lowContextPenalty: 0,
  }),
  /** Whether to use optimized weights */
  useOptimized: z.boolean().default(false),
  /** Last optimization timestamp */
  lastOptimized: z.string().datetime().optional(),
});

export type FilterWeightsConfig = z.infer<typeof FilterWeightsConfigSchema>;

// ============================================================================
// POST-FILTER SCHEMAS
// ============================================================================

/**
 * Post-filter rule configuration
 */
export const PostFilterRuleSchema = z.object({
  /** Rule ID */
  id: z.string(),
  /** Rule description */
  description: z.string().optional(),
  /** Whether rule is enabled */
  enabled: z.boolean().default(true),
  /** Filter types this rule applies to */
  filterTypes: z.array(z.string()).optional(),
  /** Pattern to match (regex string) */
  pattern: z.string().optional(),
  /** Action to take */
  action: z.enum(["remove", "demote", "boost", "reclassify"]).default("remove"),
  /** Confidence adjustment (for demote/boost) */
  confidenceAdjustment: z.number().min(-1).max(1).default(0),
  /** New filter type (for reclassify) */
  newFilterType: z.string().optional(),
});

export type PostFilterRule = z.infer<typeof PostFilterRuleSchema>;

/**
 * Post-filter configuration
 */
export const PostFilterConfigSchema = z.object({
  /** Custom rules */
  rules: z.array(PostFilterRuleSchema).default([]),
  /** Enable built-in medical whitelist */
  enableMedicalWhitelist: z.boolean().default(true),
  /** Enable structure word filtering */
  enableStructureFiltering: z.boolean().default(true),
  /** Minimum span length */
  minSpanLength: z.number().int().min(1).max(100).default(2),
  /** Maximum span length */
  maxSpanLength: z.number().int().min(1).max(10000).default(500),
});

export type PostFilterConfig = z.infer<typeof PostFilterConfigSchema>;

// ============================================================================
// MASTER CONFIG SCHEMA
// ============================================================================

/**
 * Complete Vulpes configuration
 */
export const VulpesConfigSchema = z.object({
  /** Threshold configuration */
  thresholds: ThresholdsConfigSchema.optional().transform(v => v ?? DEFAULT_THRESHOLDS_INNER),
  /** Feature toggles */
  features: FeatureTogglesConfigSchema.optional(),
  /** Calibration configuration */
  calibration: CalibrationConfigSchema.optional(),
  /** Filter weights */
  weights: FilterWeightsConfigSchema.optional(),
  /** Post-filter configuration */
  postFilter: PostFilterConfigSchema.optional(),
});

export type VulpesConfig = z.infer<typeof VulpesConfigSchema>;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/**
 * Default threshold configuration
 */
export const DEFAULT_THRESHOLDS: ThresholdsConfig = ThresholdsConfigSchema.parse({});

/**
 * Default feature toggles
 */
export const DEFAULT_FEATURES: FeatureTogglesConfig = FeatureTogglesConfigSchema.parse({});

/**
 * Default calibration config
 */
export const DEFAULT_CALIBRATION: CalibrationConfig = CalibrationConfigSchema.parse({});

/**
 * Default filter weights
 */
export const DEFAULT_WEIGHTS: FilterWeightsConfig = FilterWeightsConfigSchema.parse({});

/**
 * Default post-filter config
 */
export const DEFAULT_POSTFILTER: PostFilterConfig = PostFilterConfigSchema.parse({});

/**
 * Default complete config
 */
export const DEFAULT_CONFIG: VulpesConfig = VulpesConfigSchema.parse({});
