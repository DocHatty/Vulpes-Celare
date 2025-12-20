/**
 * Zod Schemas for Configuration Validation
 *
 * Provides runtime validation for all configuration types used with AtomicConfig.
 * Schemas ensure type safety and validate hot-reloaded configurations.
 *
 * @module config/schemas
 */
import { z } from "zod";
/**
 * Confidence thresholds configuration
 */
export declare const ConfidenceThresholdsSchema: z.ZodObject<{
    VERY_HIGH: z.ZodDefault<z.ZodNumber>;
    HIGH: z.ZodDefault<z.ZodNumber>;
    MEDIUM: z.ZodDefault<z.ZodNumber>;
    LOW: z.ZodDefault<z.ZodNumber>;
    MINIMUM: z.ZodDefault<z.ZodNumber>;
    DROP: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type ConfidenceThresholdsConfig = z.infer<typeof ConfidenceThresholdsSchema>;
/**
 * Context window configuration
 */
export declare const ContextWindowSchema: z.ZodObject<{
    LOOKBACK_CHARS: z.ZodDefault<z.ZodNumber>;
    LOOKAHEAD_CHARS: z.ZodDefault<z.ZodNumber>;
    WINDOW_TOKENS: z.ZodDefault<z.ZodNumber>;
    MAX_CONTEXT_CHARS: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type ContextWindowConfig = z.infer<typeof ContextWindowSchema>;
/**
 * Short name thresholds
 */
export declare const ShortNameThresholdsSchema: z.ZodObject<{
    MIN_LENGTH: z.ZodDefault<z.ZodNumber>;
    MIN_CONFIDENCE_WHEN_SHORT: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type ShortNameThresholdsConfig = z.infer<typeof ShortNameThresholdsSchema>;
/**
 * Pipeline stage thresholds
 */
export declare const PipelineThresholdsSchema: z.ZodObject<{
    VECTOR_DISAMBIGUATION_MIN: z.ZodDefault<z.ZodNumber>;
    CROSS_TYPE_REASONER_MIN: z.ZodDefault<z.ZodNumber>;
    LABELED_FIELD_BOOST: z.ZodDefault<z.ZodNumber>;
    NON_CLINICAL_PENALTY: z.ZodDefault<z.ZodNumber>;
    MAX_CONFIDENCE: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type PipelineThresholdsConfig = z.infer<typeof PipelineThresholdsSchema>;
/**
 * OCR thresholds
 */
export declare const OcrThresholdsSchema: z.ZodObject<{
    BASE_CONFIDENCE: z.ZodDefault<z.ZodNumber>;
    MULTI_MATCH_BOOST: z.ZodDefault<z.ZodNumber>;
    MAX_OCR_ONLY_CONFIDENCE: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type OcrThresholdsConfig = z.infer<typeof OcrThresholdsSchema>;
/**
 * Complete thresholds configuration
 */
export declare const ThresholdsConfigSchema: z.ZodObject<{
    confidence: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        VERY_HIGH: z.ZodDefault<z.ZodNumber>;
        HIGH: z.ZodDefault<z.ZodNumber>;
        MEDIUM: z.ZodDefault<z.ZodNumber>;
        LOW: z.ZodDefault<z.ZodNumber>;
        MINIMUM: z.ZodDefault<z.ZodNumber>;
        DROP: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>, z.ZodTransform<{
        VERY_HIGH: number;
        HIGH: number;
        MEDIUM: number;
        LOW: number;
        MINIMUM: number;
        DROP: number;
    }, {
        VERY_HIGH: number;
        HIGH: number;
        MEDIUM: number;
        LOW: number;
        MINIMUM: number;
        DROP: number;
    } | undefined>>;
    context: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        LOOKBACK_CHARS: z.ZodDefault<z.ZodNumber>;
        LOOKAHEAD_CHARS: z.ZodDefault<z.ZodNumber>;
        WINDOW_TOKENS: z.ZodDefault<z.ZodNumber>;
        MAX_CONTEXT_CHARS: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>, z.ZodTransform<{
        LOOKBACK_CHARS: number;
        LOOKAHEAD_CHARS: number;
        WINDOW_TOKENS: number;
        MAX_CONTEXT_CHARS: number;
    }, {
        LOOKBACK_CHARS: number;
        LOOKAHEAD_CHARS: number;
        WINDOW_TOKENS: number;
        MAX_CONTEXT_CHARS: number;
    } | undefined>>;
    shortName: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        MIN_LENGTH: z.ZodDefault<z.ZodNumber>;
        MIN_CONFIDENCE_WHEN_SHORT: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>, z.ZodTransform<{
        MIN_LENGTH: number;
        MIN_CONFIDENCE_WHEN_SHORT: number;
    }, {
        MIN_LENGTH: number;
        MIN_CONFIDENCE_WHEN_SHORT: number;
    } | undefined>>;
    pipeline: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        VECTOR_DISAMBIGUATION_MIN: z.ZodDefault<z.ZodNumber>;
        CROSS_TYPE_REASONER_MIN: z.ZodDefault<z.ZodNumber>;
        LABELED_FIELD_BOOST: z.ZodDefault<z.ZodNumber>;
        NON_CLINICAL_PENALTY: z.ZodDefault<z.ZodNumber>;
        MAX_CONFIDENCE: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>, z.ZodTransform<{
        VECTOR_DISAMBIGUATION_MIN: number;
        CROSS_TYPE_REASONER_MIN: number;
        LABELED_FIELD_BOOST: number;
        NON_CLINICAL_PENALTY: number;
        MAX_CONFIDENCE: number;
    }, {
        VECTOR_DISAMBIGUATION_MIN: number;
        CROSS_TYPE_REASONER_MIN: number;
        LABELED_FIELD_BOOST: number;
        NON_CLINICAL_PENALTY: number;
        MAX_CONFIDENCE: number;
    } | undefined>>;
    ocr: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        BASE_CONFIDENCE: z.ZodDefault<z.ZodNumber>;
        MULTI_MATCH_BOOST: z.ZodDefault<z.ZodNumber>;
        MAX_OCR_ONLY_CONFIDENCE: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>, z.ZodTransform<{
        BASE_CONFIDENCE: number;
        MULTI_MATCH_BOOST: number;
        MAX_OCR_ONLY_CONFIDENCE: number;
    }, {
        BASE_CONFIDENCE: number;
        MULTI_MATCH_BOOST: number;
        MAX_OCR_ONLY_CONFIDENCE: number;
    } | undefined>>;
}, z.core.$strip>;
export type ThresholdsConfig = z.infer<typeof ThresholdsConfigSchema>;
/**
 * Feature category
 */
export declare const FeatureCategorySchema: z.ZodEnum<{
    debug: "debug";
    core: "core";
    acceleration: "acceleration";
    experimental: "experimental";
}>;
/**
 * Individual feature toggle
 */
export declare const FeatureToggleSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<{
        debug: "debug";
        core: "core";
        acceleration: "acceleration";
        experimental: "experimental";
    }>>;
}, z.core.$strip>;
/**
 * All feature toggles
 */
export declare const FeatureTogglesConfigSchema: z.ZodObject<{
    datalog: z.ZodDefault<z.ZodBoolean>;
    contextModifier: z.ZodDefault<z.ZodBoolean>;
    dfaScan: z.ZodDefault<z.ZodBoolean>;
    rustAccel: z.ZodDefault<z.ZodBoolean>;
    contextFilters: z.ZodDefault<z.ZodBoolean>;
    cortex: z.ZodDefault<z.ZodBoolean>;
    optimizedWeights: z.ZodDefault<z.ZodBoolean>;
    gliner: z.ZodDefault<z.ZodBoolean>;
    mlConfidence: z.ZodDefault<z.ZodBoolean>;
    mlFPFilter: z.ZodDefault<z.ZodBoolean>;
    shadowRustName: z.ZodDefault<z.ZodBoolean>;
    shadowRustNameFull: z.ZodDefault<z.ZodBoolean>;
    shadowRustNameSmart: z.ZodDefault<z.ZodBoolean>;
    shadowPostfilter: z.ZodDefault<z.ZodBoolean>;
    shadowApplySpans: z.ZodDefault<z.ZodBoolean>;
    gpuProvider: z.ZodDefault<z.ZodEnum<{
        cpu: "cpu";
        cuda: "cuda";
        directml: "directml";
        coreml: "coreml";
        rocm: "rocm";
    }>>;
    mlDevice: z.ZodDefault<z.ZodEnum<{
        cpu: "cpu";
        cuda: "cuda";
        directml: "directml";
        coreml: "coreml";
    }>>;
    nameDetectionMode: z.ZodDefault<z.ZodEnum<{
        gliner: "gliner";
        hybrid: "hybrid";
        rules: "rules";
    }>>;
}, z.core.$strip>;
export type FeatureTogglesConfig = z.infer<typeof FeatureTogglesConfigSchema>;
/**
 * Per-filter calibration entry
 */
export declare const FilterCalibrationEntrySchema: z.ZodObject<{
    offset: z.ZodDefault<z.ZodNumber>;
    scale: z.ZodDefault<z.ZodNumber>;
    sampleCount: z.ZodDefault<z.ZodNumber>;
    lastCalibrated: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FilterCalibrationEntry = z.infer<typeof FilterCalibrationEntrySchema>;
/**
 * Full calibration configuration
 */
export declare const CalibrationConfigSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodNumber>;
    fittedAt: z.ZodOptional<z.ZodString>;
    filters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        offset: z.ZodDefault<z.ZodNumber>;
        scale: z.ZodDefault<z.ZodNumber>;
        sampleCount: z.ZodDefault<z.ZodNumber>;
        lastCalibrated: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    globalOffset: z.ZodDefault<z.ZodNumber>;
    globalScale: z.ZodDefault<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type CalibrationConfig = z.infer<typeof CalibrationConfigSchema>;
/**
 * Per-filter weight configuration
 */
export declare const FilterWeightSchema: z.ZodObject<{
    weight: z.ZodDefault<z.ZodNumber>;
    contextBoost: z.ZodDefault<z.ZodNumber>;
    dictionaryBoost: z.ZodDefault<z.ZodNumber>;
    lowContextPenalty: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type FilterWeight = z.infer<typeof FilterWeightSchema>;
/**
 * All filter weights
 */
export declare const FilterWeightsConfigSchema: z.ZodObject<{
    weights: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        weight: z.ZodDefault<z.ZodNumber>;
        contextBoost: z.ZodDefault<z.ZodNumber>;
        dictionaryBoost: z.ZodDefault<z.ZodNumber>;
        lowContextPenalty: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>;
    defaultWeight: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        weight: z.ZodDefault<z.ZodNumber>;
        contextBoost: z.ZodDefault<z.ZodNumber>;
        dictionaryBoost: z.ZodDefault<z.ZodNumber>;
        lowContextPenalty: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>, z.ZodTransform<{
        weight: number;
        contextBoost: number;
        dictionaryBoost: number;
        lowContextPenalty: number;
    }, {
        weight: number;
        contextBoost: number;
        dictionaryBoost: number;
        lowContextPenalty: number;
    } | undefined>>;
    useOptimized: z.ZodDefault<z.ZodBoolean>;
    lastOptimized: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FilterWeightsConfig = z.infer<typeof FilterWeightsConfigSchema>;
/**
 * Post-filter rule configuration
 */
export declare const PostFilterRuleSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    filterTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    pattern: z.ZodOptional<z.ZodString>;
    action: z.ZodDefault<z.ZodEnum<{
        remove: "remove";
        demote: "demote";
        boost: "boost";
        reclassify: "reclassify";
    }>>;
    confidenceAdjustment: z.ZodDefault<z.ZodNumber>;
    newFilterType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PostFilterRule = z.infer<typeof PostFilterRuleSchema>;
/**
 * Post-filter configuration
 */
export declare const PostFilterConfigSchema: z.ZodObject<{
    rules: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        enabled: z.ZodDefault<z.ZodBoolean>;
        filterTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
        pattern: z.ZodOptional<z.ZodString>;
        action: z.ZodDefault<z.ZodEnum<{
            remove: "remove";
            demote: "demote";
            boost: "boost";
            reclassify: "reclassify";
        }>>;
        confidenceAdjustment: z.ZodDefault<z.ZodNumber>;
        newFilterType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    enableMedicalWhitelist: z.ZodDefault<z.ZodBoolean>;
    enableStructureFiltering: z.ZodDefault<z.ZodBoolean>;
    minSpanLength: z.ZodDefault<z.ZodNumber>;
    maxSpanLength: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type PostFilterConfig = z.infer<typeof PostFilterConfigSchema>;
/**
 * Complete Vulpes configuration
 */
export declare const VulpesConfigSchema: z.ZodObject<{
    thresholds: z.ZodPipe<z.ZodOptional<z.ZodObject<{
        confidence: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            VERY_HIGH: z.ZodDefault<z.ZodNumber>;
            HIGH: z.ZodDefault<z.ZodNumber>;
            MEDIUM: z.ZodDefault<z.ZodNumber>;
            LOW: z.ZodDefault<z.ZodNumber>;
            MINIMUM: z.ZodDefault<z.ZodNumber>;
            DROP: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>, z.ZodTransform<{
            VERY_HIGH: number;
            HIGH: number;
            MEDIUM: number;
            LOW: number;
            MINIMUM: number;
            DROP: number;
        }, {
            VERY_HIGH: number;
            HIGH: number;
            MEDIUM: number;
            LOW: number;
            MINIMUM: number;
            DROP: number;
        } | undefined>>;
        context: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            LOOKBACK_CHARS: z.ZodDefault<z.ZodNumber>;
            LOOKAHEAD_CHARS: z.ZodDefault<z.ZodNumber>;
            WINDOW_TOKENS: z.ZodDefault<z.ZodNumber>;
            MAX_CONTEXT_CHARS: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>, z.ZodTransform<{
            LOOKBACK_CHARS: number;
            LOOKAHEAD_CHARS: number;
            WINDOW_TOKENS: number;
            MAX_CONTEXT_CHARS: number;
        }, {
            LOOKBACK_CHARS: number;
            LOOKAHEAD_CHARS: number;
            WINDOW_TOKENS: number;
            MAX_CONTEXT_CHARS: number;
        } | undefined>>;
        shortName: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            MIN_LENGTH: z.ZodDefault<z.ZodNumber>;
            MIN_CONFIDENCE_WHEN_SHORT: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>, z.ZodTransform<{
            MIN_LENGTH: number;
            MIN_CONFIDENCE_WHEN_SHORT: number;
        }, {
            MIN_LENGTH: number;
            MIN_CONFIDENCE_WHEN_SHORT: number;
        } | undefined>>;
        pipeline: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            VECTOR_DISAMBIGUATION_MIN: z.ZodDefault<z.ZodNumber>;
            CROSS_TYPE_REASONER_MIN: z.ZodDefault<z.ZodNumber>;
            LABELED_FIELD_BOOST: z.ZodDefault<z.ZodNumber>;
            NON_CLINICAL_PENALTY: z.ZodDefault<z.ZodNumber>;
            MAX_CONFIDENCE: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>, z.ZodTransform<{
            VECTOR_DISAMBIGUATION_MIN: number;
            CROSS_TYPE_REASONER_MIN: number;
            LABELED_FIELD_BOOST: number;
            NON_CLINICAL_PENALTY: number;
            MAX_CONFIDENCE: number;
        }, {
            VECTOR_DISAMBIGUATION_MIN: number;
            CROSS_TYPE_REASONER_MIN: number;
            LABELED_FIELD_BOOST: number;
            NON_CLINICAL_PENALTY: number;
            MAX_CONFIDENCE: number;
        } | undefined>>;
        ocr: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            BASE_CONFIDENCE: z.ZodDefault<z.ZodNumber>;
            MULTI_MATCH_BOOST: z.ZodDefault<z.ZodNumber>;
            MAX_OCR_ONLY_CONFIDENCE: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>, z.ZodTransform<{
            BASE_CONFIDENCE: number;
            MULTI_MATCH_BOOST: number;
            MAX_OCR_ONLY_CONFIDENCE: number;
        }, {
            BASE_CONFIDENCE: number;
            MULTI_MATCH_BOOST: number;
            MAX_OCR_ONLY_CONFIDENCE: number;
        } | undefined>>;
    }, z.core.$strip>>, z.ZodTransform<{
        confidence: {
            VERY_HIGH: number;
            HIGH: number;
            MEDIUM: number;
            LOW: number;
            MINIMUM: number;
            DROP: number;
        };
        context: {
            LOOKBACK_CHARS: number;
            LOOKAHEAD_CHARS: number;
            WINDOW_TOKENS: number;
            MAX_CONTEXT_CHARS: number;
        };
        shortName: {
            MIN_LENGTH: number;
            MIN_CONFIDENCE_WHEN_SHORT: number;
        };
        pipeline: {
            VECTOR_DISAMBIGUATION_MIN: number;
            CROSS_TYPE_REASONER_MIN: number;
            LABELED_FIELD_BOOST: number;
            NON_CLINICAL_PENALTY: number;
            MAX_CONFIDENCE: number;
        };
        ocr: {
            BASE_CONFIDENCE: number;
            MULTI_MATCH_BOOST: number;
            MAX_OCR_ONLY_CONFIDENCE: number;
        };
    }, {
        confidence: {
            VERY_HIGH: number;
            HIGH: number;
            MEDIUM: number;
            LOW: number;
            MINIMUM: number;
            DROP: number;
        };
        context: {
            LOOKBACK_CHARS: number;
            LOOKAHEAD_CHARS: number;
            WINDOW_TOKENS: number;
            MAX_CONTEXT_CHARS: number;
        };
        shortName: {
            MIN_LENGTH: number;
            MIN_CONFIDENCE_WHEN_SHORT: number;
        };
        pipeline: {
            VECTOR_DISAMBIGUATION_MIN: number;
            CROSS_TYPE_REASONER_MIN: number;
            LABELED_FIELD_BOOST: number;
            NON_CLINICAL_PENALTY: number;
            MAX_CONFIDENCE: number;
        };
        ocr: {
            BASE_CONFIDENCE: number;
            MULTI_MATCH_BOOST: number;
            MAX_OCR_ONLY_CONFIDENCE: number;
        };
    } | undefined>>;
    features: z.ZodOptional<z.ZodObject<{
        datalog: z.ZodDefault<z.ZodBoolean>;
        contextModifier: z.ZodDefault<z.ZodBoolean>;
        dfaScan: z.ZodDefault<z.ZodBoolean>;
        rustAccel: z.ZodDefault<z.ZodBoolean>;
        contextFilters: z.ZodDefault<z.ZodBoolean>;
        cortex: z.ZodDefault<z.ZodBoolean>;
        optimizedWeights: z.ZodDefault<z.ZodBoolean>;
        gliner: z.ZodDefault<z.ZodBoolean>;
        mlConfidence: z.ZodDefault<z.ZodBoolean>;
        mlFPFilter: z.ZodDefault<z.ZodBoolean>;
        shadowRustName: z.ZodDefault<z.ZodBoolean>;
        shadowRustNameFull: z.ZodDefault<z.ZodBoolean>;
        shadowRustNameSmart: z.ZodDefault<z.ZodBoolean>;
        shadowPostfilter: z.ZodDefault<z.ZodBoolean>;
        shadowApplySpans: z.ZodDefault<z.ZodBoolean>;
        gpuProvider: z.ZodDefault<z.ZodEnum<{
            cpu: "cpu";
            cuda: "cuda";
            directml: "directml";
            coreml: "coreml";
            rocm: "rocm";
        }>>;
        mlDevice: z.ZodDefault<z.ZodEnum<{
            cpu: "cpu";
            cuda: "cuda";
            directml: "directml";
            coreml: "coreml";
        }>>;
        nameDetectionMode: z.ZodDefault<z.ZodEnum<{
            gliner: "gliner";
            hybrid: "hybrid";
            rules: "rules";
        }>>;
    }, z.core.$strip>>;
    calibration: z.ZodOptional<z.ZodObject<{
        version: z.ZodDefault<z.ZodNumber>;
        fittedAt: z.ZodOptional<z.ZodString>;
        filters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
            offset: z.ZodDefault<z.ZodNumber>;
            scale: z.ZodDefault<z.ZodNumber>;
            sampleCount: z.ZodDefault<z.ZodNumber>;
            lastCalibrated: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        globalOffset: z.ZodDefault<z.ZodNumber>;
        globalScale: z.ZodDefault<z.ZodNumber>;
        enabled: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>>;
    weights: z.ZodOptional<z.ZodObject<{
        weights: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
            weight: z.ZodDefault<z.ZodNumber>;
            contextBoost: z.ZodDefault<z.ZodNumber>;
            dictionaryBoost: z.ZodDefault<z.ZodNumber>;
            lowContextPenalty: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>>;
        defaultWeight: z.ZodPipe<z.ZodOptional<z.ZodObject<{
            weight: z.ZodDefault<z.ZodNumber>;
            contextBoost: z.ZodDefault<z.ZodNumber>;
            dictionaryBoost: z.ZodDefault<z.ZodNumber>;
            lowContextPenalty: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>, z.ZodTransform<{
            weight: number;
            contextBoost: number;
            dictionaryBoost: number;
            lowContextPenalty: number;
        }, {
            weight: number;
            contextBoost: number;
            dictionaryBoost: number;
            lowContextPenalty: number;
        } | undefined>>;
        useOptimized: z.ZodDefault<z.ZodBoolean>;
        lastOptimized: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    postFilter: z.ZodOptional<z.ZodObject<{
        rules: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            enabled: z.ZodDefault<z.ZodBoolean>;
            filterTypes: z.ZodOptional<z.ZodArray<z.ZodString>>;
            pattern: z.ZodOptional<z.ZodString>;
            action: z.ZodDefault<z.ZodEnum<{
                remove: "remove";
                demote: "demote";
                boost: "boost";
                reclassify: "reclassify";
            }>>;
            confidenceAdjustment: z.ZodDefault<z.ZodNumber>;
            newFilterType: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        enableMedicalWhitelist: z.ZodDefault<z.ZodBoolean>;
        enableStructureFiltering: z.ZodDefault<z.ZodBoolean>;
        minSpanLength: z.ZodDefault<z.ZodNumber>;
        maxSpanLength: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type VulpesConfig = z.infer<typeof VulpesConfigSchema>;
/**
 * Default threshold configuration
 */
export declare const DEFAULT_THRESHOLDS: ThresholdsConfig;
/**
 * Default feature toggles
 */
export declare const DEFAULT_FEATURES: FeatureTogglesConfig;
/**
 * Default calibration config
 */
export declare const DEFAULT_CALIBRATION: CalibrationConfig;
/**
 * Default filter weights
 */
export declare const DEFAULT_WEIGHTS: FilterWeightsConfig;
/**
 * Default post-filter config
 */
export declare const DEFAULT_POSTFILTER: PostFilterConfig;
/**
 * Default complete config
 */
export declare const DEFAULT_CONFIG: VulpesConfig;
//# sourceMappingURL=schemas.d.ts.map