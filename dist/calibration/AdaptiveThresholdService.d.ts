/**
 * AdaptiveThresholdService - ML-Driven Adaptive Confidence Thresholds
 *
 * Provides context-aware, document-type-aware, and specialty-aware
 * confidence thresholds that adapt based on:
 *
 * 1. Document Type (Admission, Discharge, Radiology, etc.)
 * 2. Clinical Context Strength (Strong, Moderate, Weak, None)
 * 3. Medical Specialty (Cardiology, Oncology, Radiology, etc.)
 * 4. PHI Type (NAME, DATE, SSN, etc.)
 * 5. Purpose of Use (Treatment, Research, Operations)
 * 6. Historical Performance (feedback-driven adjustments)
 *
 * This enables the system to:
 * - Use lower thresholds in high-clinical-context documents (more aggressive detection)
 * - Use higher thresholds in low-context documents (fewer false positives)
 * - Adapt to specialty-specific patterns (e.g., oncology has more eponymous names)
 * - Learn from feedback to improve over time
 *
 * @module calibration
 */
import { EventEmitter } from "events";
import { DocumentType } from "../cache/StructureExtractor";
import { ContextStrength } from "../context/ClinicalContextDetector";
/**
 * Medical specialty classifications
 */
export declare enum MedicalSpecialty {
    CARDIOLOGY = "CARDIOLOGY",
    ONCOLOGY = "ONCOLOGY",
    RADIOLOGY = "RADIOLOGY",
    NEUROLOGY = "NEUROLOGY",
    ORTHOPEDICS = "ORTHOPEDICS",
    PEDIATRICS = "PEDIATRICS",
    PSYCHIATRY = "PSYCHIATRY",
    SURGERY = "SURGERY",
    EMERGENCY = "EMERGENCY",
    PRIMARY_CARE = "PRIMARY_CARE",
    PATHOLOGY = "PATHOLOGY",
    UNKNOWN = "UNKNOWN"
}
/**
 * Purpose of use classifications (HIPAA categories)
 */
export declare enum PurposeOfUse {
    TREATMENT = "TREATMENT",// Direct patient care
    PAYMENT = "PAYMENT",// Billing/insurance
    OPERATIONS = "OPERATIONS",// Healthcare operations
    RESEARCH = "RESEARCH",// De-identified research
    PUBLIC_HEALTH = "PUBLIC_HEALTH",// Public health reporting
    MARKETING = "MARKETING"
}
/**
 * PHI types for type-specific thresholds
 */
export type PHIType = "NAME" | "DATE" | "AGE" | "SSN" | "MRN" | "PHONE" | "FAX" | "EMAIL" | "ADDRESS" | "ZIP" | "IP_ADDRESS" | "URL" | "ACCOUNT" | "LICENSE" | "VEHICLE_ID" | "DEVICE_ID" | "BIOMETRIC" | "HEALTH_PLAN";
/**
 * Context for adaptive threshold calculation
 */
export interface AdaptiveContext {
    /** Document type if known */
    documentType?: DocumentType;
    /** Clinical context strength */
    contextStrength?: ContextStrength;
    /** Medical specialty if detected */
    specialty?: MedicalSpecialty;
    /** Purpose of the de-identification */
    purposeOfUse?: PurposeOfUse;
    /** PHI type being evaluated */
    phiType?: PHIType;
    /** Document length (affects threshold) */
    documentLength?: number;
    /** Whether this is OCR text (higher error tolerance) */
    isOCR?: boolean;
}
/**
 * Calculated thresholds for a specific context
 */
export interface AdaptiveThresholds {
    /** Minimum confidence to retain a span */
    minimum: number;
    /** Low confidence level */
    low: number;
    /** Medium confidence level */
    medium: number;
    /** High confidence level */
    high: number;
    /** Very high confidence level */
    veryHigh: number;
    /** Drop threshold (immediate filter) */
    drop: number;
    /** Context that produced these thresholds */
    context: AdaptiveContext;
    /** Explanation of threshold adjustments */
    adjustments: ThresholdAdjustment[];
}
/**
 * Individual threshold adjustment with explanation
 */
export interface ThresholdAdjustment {
    /** Factor applied (multiplier) */
    factor: string;
    /** Adjustment type */
    type: "documentType" | "contextStrength" | "specialty" | "purposeOfUse" | "phiType" | "ocr" | "feedback";
    /** Human-readable reason */
    reason: string;
    /** Modifier value (e.g., 0.95 = lower thresholds by 5%) */
    modifier: number;
}
/**
 * Feedback record for learning
 */
export interface ThresholdFeedback {
    /** Context that was active */
    context: AdaptiveContext;
    /** PHI type involved */
    phiType: PHIType;
    /** Was this a false positive? */
    wasFalsePositive: boolean;
    /** Was this a false negative (missed PHI)? */
    wasFalseNegative: boolean;
    /** Confidence score at time of detection */
    confidence: number;
    /** Threshold that was applied */
    appliedThreshold: number;
    /** Timestamp */
    timestamp: Date;
}
/**
 * Performance statistics for a context
 */
export interface ContextPerformance {
    /** Total evaluations */
    totalCount: number;
    /** False positives */
    falsePositives: number;
    /** False negatives */
    falseNegatives: number;
    /** True positives */
    truePositives: number;
    /** True negatives */
    trueNegatives: number;
    /** Calculated adjustment factor */
    adjustmentFactor: number;
    /** Last updated */
    lastUpdated: Date;
}
/**
 * Configuration for the adaptive threshold service
 */
export interface AdaptiveThresholdConfig {
    /** Enable adaptive thresholds (default: true) */
    enabled?: boolean;
    /** Enable feedback-based learning (default: true) */
    enableFeedbackLearning?: boolean;
    /** Minimum feedback samples before adjusting (default: 50) */
    minFeedbackSamples?: number;
    /** Maximum adjustment factor from feedback (default: 0.15) */
    maxFeedbackAdjustment?: number;
    /** Path to persist learned adjustments */
    persistencePath?: string;
    /** Target sensitivity (default: 0.98) */
    targetSensitivity?: number;
    /** Target specificity (default: 0.95) */
    targetSpecificity?: number;
}
/**
 * AdaptiveThresholdService - Provides context-aware confidence thresholds
 */
export declare class AdaptiveThresholdService extends EventEmitter {
    private config;
    private feedbackHistory;
    private contextPerformance;
    private learnedAdjustments;
    constructor(config?: AdaptiveThresholdConfig);
    /**
     * Get adaptive thresholds for a given context
     */
    getThresholds(context?: AdaptiveContext): AdaptiveThresholds;
    /**
     * Get the minimum threshold for a specific context
     * This is the most commonly used method
     */
    getMinimumThreshold(context?: AdaptiveContext): number;
    /**
     * Get type-specific decision threshold
     */
    getTypeThreshold(phiType: PHIType, context?: AdaptiveContext): number;
    /**
     * Detect medical specialty from document text
     */
    detectSpecialty(text: string): {
        specialty: MedicalSpecialty;
        confidence: number;
    };
    /**
     * Build full adaptive context from document analysis
     */
    analyzeDocument(text: string, documentType?: DocumentType, contextStrength?: ContextStrength, purposeOfUse?: PurposeOfUse): AdaptiveContext;
    /**
     * Detect if text appears to be from OCR
     */
    private detectOCR;
    /**
     * Record feedback for learning
     */
    recordFeedback(feedback: ThresholdFeedback): void;
    /**
     * Get feedback-based modifier for a context
     */
    private getFeedbackModifier;
    /**
     * Calculate adjustment factor based on performance
     */
    private calculateAdjustmentFactor;
    /**
     * Create a key for context-based lookup
     */
    private contextKey;
    /**
     * Load persisted adjustments
     */
    private loadPersistedAdjustments;
    /**
     * Persist learned adjustments
     */
    private persistAdjustments;
    /**
     * Get base thresholds without adaptation
     */
    private getBaseThresholds;
    /**
     * Clamp threshold to valid range
     */
    private clamp;
    /**
     * Get statistics about learned adjustments
     */
    getStatistics(): {
        enabled: boolean;
        feedbackCount: number;
        learnedAdjustmentsCount: number;
        contextPerformanceCount: number;
    };
    /**
     * Get all context performance data
     */
    getAllPerformance(): Map<string, ContextPerformance>;
    /**
     * Reset learned adjustments
     */
    resetLearning(): void;
}
/**
 * Default singleton instance
 */
export declare const adaptiveThresholds: AdaptiveThresholdService;
export default AdaptiveThresholdService;
//# sourceMappingURL=AdaptiveThresholdService.d.ts.map