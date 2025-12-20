"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptiveThresholds = exports.AdaptiveThresholdService = exports.PurposeOfUse = exports.MedicalSpecialty = void 0;
const events_1 = require("events");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const StructureExtractor_1 = require("../cache/StructureExtractor");
const Thresholds_1 = require("../config/Thresholds");
const VulpesLogger_1 = require("../utils/VulpesLogger");
const logger = VulpesLogger_1.vulpesLogger.forComponent("AdaptiveThresholdService");
// =============================================================================
// TYPES
// =============================================================================
/**
 * Medical specialty classifications
 */
var MedicalSpecialty;
(function (MedicalSpecialty) {
    MedicalSpecialty["CARDIOLOGY"] = "CARDIOLOGY";
    MedicalSpecialty["ONCOLOGY"] = "ONCOLOGY";
    MedicalSpecialty["RADIOLOGY"] = "RADIOLOGY";
    MedicalSpecialty["NEUROLOGY"] = "NEUROLOGY";
    MedicalSpecialty["ORTHOPEDICS"] = "ORTHOPEDICS";
    MedicalSpecialty["PEDIATRICS"] = "PEDIATRICS";
    MedicalSpecialty["PSYCHIATRY"] = "PSYCHIATRY";
    MedicalSpecialty["SURGERY"] = "SURGERY";
    MedicalSpecialty["EMERGENCY"] = "EMERGENCY";
    MedicalSpecialty["PRIMARY_CARE"] = "PRIMARY_CARE";
    MedicalSpecialty["PATHOLOGY"] = "PATHOLOGY";
    MedicalSpecialty["UNKNOWN"] = "UNKNOWN";
})(MedicalSpecialty || (exports.MedicalSpecialty = MedicalSpecialty = {}));
/**
 * Purpose of use classifications (HIPAA categories)
 */
var PurposeOfUse;
(function (PurposeOfUse) {
    PurposeOfUse["TREATMENT"] = "TREATMENT";
    PurposeOfUse["PAYMENT"] = "PAYMENT";
    PurposeOfUse["OPERATIONS"] = "OPERATIONS";
    PurposeOfUse["RESEARCH"] = "RESEARCH";
    PurposeOfUse["PUBLIC_HEALTH"] = "PUBLIC_HEALTH";
    PurposeOfUse["MARKETING"] = "MARKETING";
})(PurposeOfUse || (exports.PurposeOfUse = PurposeOfUse = {}));
// =============================================================================
// DEFAULT MODIFIERS
// =============================================================================
/**
 * Document type threshold modifiers
 * Values < 1.0 = lower thresholds (more aggressive detection)
 * Values > 1.0 = higher thresholds (more conservative)
 */
const DOCUMENT_TYPE_MODIFIERS = {
    [StructureExtractor_1.DocumentType.ADMISSION_NOTE]: 0.95, // Highly structured, lower thresholds
    [StructureExtractor_1.DocumentType.DISCHARGE_SUMMARY]: 0.95, // Highly structured
    [StructureExtractor_1.DocumentType.PROGRESS_NOTE]: 0.97, // Moderately structured
    [StructureExtractor_1.DocumentType.RADIOLOGY_REPORT]: 0.98, // Technical, many eponyms
    [StructureExtractor_1.DocumentType.LAB_REPORT]: 0.96, // Structured, fewer names
    [StructureExtractor_1.DocumentType.PRESCRIPTION]: 0.94, // Very structured
    [StructureExtractor_1.DocumentType.REFERRAL]: 0.97, // Multiple provider names
    [StructureExtractor_1.DocumentType.CLINICAL_NOTE]: 1.0, // Standard baseline
    [StructureExtractor_1.DocumentType.UNKNOWN]: 1.02, // Slightly higher for unknown
};
/**
 * Context strength threshold modifiers
 */
const CONTEXT_STRENGTH_MODIFIERS = {
    STRONG: 0.92, // Strong clinical context = lower thresholds
    MODERATE: 0.96, // Moderate context = slightly lower
    WEAK: 1.0, // Weak context = baseline
    NONE: 1.05, // No context = higher thresholds
};
/**
 * Specialty-specific threshold modifiers
 */
const SPECIALTY_MODIFIERS = {
    [MedicalSpecialty.CARDIOLOGY]: 1.0, // Standard
    [MedicalSpecialty.ONCOLOGY]: 1.03, // More eponymous names (Hodgkin's, etc.)
    [MedicalSpecialty.RADIOLOGY]: 1.02, // Technical terms
    [MedicalSpecialty.NEUROLOGY]: 1.02, // Eponymous syndromes
    [MedicalSpecialty.ORTHOPEDICS]: 1.0, // Standard
    [MedicalSpecialty.PEDIATRICS]: 0.98, // Extra caution for minors
    [MedicalSpecialty.PSYCHIATRY]: 0.96, // Sensitive content
    [MedicalSpecialty.SURGERY]: 0.98, // Critical documentation
    [MedicalSpecialty.EMERGENCY]: 0.95, // Fast-paced, high volume
    [MedicalSpecialty.PRIMARY_CARE]: 1.0, // Baseline
    [MedicalSpecialty.PATHOLOGY]: 1.02, // Technical
    [MedicalSpecialty.UNKNOWN]: 1.0, // Baseline
};
/**
 * Purpose of use threshold modifiers
 * Research requires stricter de-identification
 */
const PURPOSE_MODIFIERS = {
    [PurposeOfUse.TREATMENT]: 1.0, // Standard
    [PurposeOfUse.PAYMENT]: 1.0, // Standard
    [PurposeOfUse.OPERATIONS]: 1.0, // Standard
    [PurposeOfUse.RESEARCH]: 0.90, // Much stricter for research
    [PurposeOfUse.PUBLIC_HEALTH]: 0.95, // Stricter for public data
    [PurposeOfUse.MARKETING]: 0.85, // Strictest for marketing
};
/**
 * PHI type-specific threshold modifiers
 * Some PHI types need lower thresholds (more sensitive)
 */
const PHI_TYPE_MODIFIERS = {
    NAME: 1.0, // Baseline
    SSN: 0.90, // Very sensitive, catch more
    DATE: 1.05, // Many false positives, be more conservative
    AGE: 1.08, // Many false positives with numbers
    MRN: 0.95, // Sensitive identifier
    PHONE: 1.02, // Some false positives
    EMAIL: 0.98, // Fairly distinct pattern
    ADDRESS: 1.05, // Many false positives with place names
    ZIP: 1.10, // Many numeric false positives
    IP_ADDRESS: 1.0, // Distinct pattern
    URL: 1.0, // Distinct pattern
    ACCOUNT: 0.98, // Sensitive
    LICENSE: 0.95, // Sensitive
    VEHICLE_ID: 0.98, // Distinct format
    DEVICE_ID: 1.0, // Standard
    BIOMETRIC: 0.92, // Very sensitive
    HEALTH_PLAN: 0.98, // Sensitive
};
// =============================================================================
// SPECIALTY DETECTION PATTERNS
// =============================================================================
/**
 * Patterns for detecting medical specialty from document content
 */
const SPECIALTY_PATTERNS = [
    // Cardiology
    { pattern: /\b(?:cardio|cardiac|heart|coronary|EKG|ECG|echo|arrhythmia|angina)\b/gi, specialty: MedicalSpecialty.CARDIOLOGY, weight: 1.0 },
    { pattern: /\b(?:STEMI|NSTEMI|CHF|AFib|A-?fib|MI|myocardial)\b/gi, specialty: MedicalSpecialty.CARDIOLOGY, weight: 1.2 },
    // Oncology
    { pattern: /\b(?:oncol|cancer|tumor|tumour|malignant|metastas|chemo|radiation\s+therapy)\b/gi, specialty: MedicalSpecialty.ONCOLOGY, weight: 1.0 },
    { pattern: /\b(?:carcinoma|lymphoma|leukemia|sarcoma|melanoma)\b/gi, specialty: MedicalSpecialty.ONCOLOGY, weight: 1.2 },
    // Radiology
    { pattern: /\b(?:radiolog|X-?ray|CT\s+scan|MRI|ultrasound|imaging|contrast)\b/gi, specialty: MedicalSpecialty.RADIOLOGY, weight: 1.0 },
    { pattern: /\b(?:impression|findings|technique|comparison)\s*:/gi, specialty: MedicalSpecialty.RADIOLOGY, weight: 0.8 },
    // Neurology
    { pattern: /\b(?:neurol|brain|neuro|seizure|stroke|TIA|multiple\s+sclerosis|MS|Parkinson)\b/gi, specialty: MedicalSpecialty.NEUROLOGY, weight: 1.0 },
    { pattern: /\b(?:EEG|EMG|lumber\s+puncture|cranial|cerebr)\b/gi, specialty: MedicalSpecialty.NEUROLOGY, weight: 1.0 },
    // Orthopedics
    { pattern: /\b(?:ortho|fracture|joint|arthro|bone|spine|spinal|knee|hip|shoulder)\b/gi, specialty: MedicalSpecialty.ORTHOPEDICS, weight: 1.0 },
    { pattern: /\b(?:arthroplasty|ORIF|cast|splint|ROM)\b/gi, specialty: MedicalSpecialty.ORTHOPEDICS, weight: 1.2 },
    // Pediatrics
    { pattern: /\b(?:pediatr|child|infant|neonat|newborn|toddler)\b/gi, specialty: MedicalSpecialty.PEDIATRICS, weight: 1.0 },
    { pattern: /\b(?:NICU|PICU|well[-\s]?child|vaccination)\b/gi, specialty: MedicalSpecialty.PEDIATRICS, weight: 1.2 },
    // Psychiatry
    { pattern: /\b(?:psychiatr|mental\s+health|psych|depression|anxiety|bipolar|schizophren)\b/gi, specialty: MedicalSpecialty.PSYCHIATRY, weight: 1.0 },
    { pattern: /\b(?:suicid|self[-\s]?harm|psychosis|PTSD|OCD)\b/gi, specialty: MedicalSpecialty.PSYCHIATRY, weight: 1.2 },
    // Surgery
    { pattern: /\b(?:surgery|surgical|operat(?:ion|ive)|incision|anesthesia)\b/gi, specialty: MedicalSpecialty.SURGERY, weight: 1.0 },
    { pattern: /\b(?:pre[-\s]?op|post[-\s]?op|intra[-\s]?op|laparoscop)\b/gi, specialty: MedicalSpecialty.SURGERY, weight: 1.2 },
    // Emergency
    { pattern: /\b(?:emergency|ER|ED|trauma|urgent|acute|triage)\b/gi, specialty: MedicalSpecialty.EMERGENCY, weight: 1.0 },
    { pattern: /\b(?:code\s+blue|resuscitat|CPR|intubat)\b/gi, specialty: MedicalSpecialty.EMERGENCY, weight: 1.2 },
    // Primary Care
    { pattern: /\b(?:primary\s+care|family\s+medicine|general\s+practice|annual\s+exam|wellness)\b/gi, specialty: MedicalSpecialty.PRIMARY_CARE, weight: 1.0 },
    { pattern: /\b(?:preventive|screening|routine\s+visit)\b/gi, specialty: MedicalSpecialty.PRIMARY_CARE, weight: 0.8 },
    // Pathology
    { pattern: /\b(?:patholog|biopsy|histolog|cytolog|specimen)\b/gi, specialty: MedicalSpecialty.PATHOLOGY, weight: 1.0 },
    { pattern: /\b(?:gross\s+description|microscopic|immunohisto)\b/gi, specialty: MedicalSpecialty.PATHOLOGY, weight: 1.2 },
];
// =============================================================================
// ADAPTIVE THRESHOLD SERVICE
// =============================================================================
/**
 * AdaptiveThresholdService - Provides context-aware confidence thresholds
 */
class AdaptiveThresholdService extends events_1.EventEmitter {
    config;
    feedbackHistory = [];
    contextPerformance = new Map();
    learnedAdjustments = new Map();
    constructor(config = {}) {
        super();
        this.config = {
            enabled: config.enabled ?? true,
            enableFeedbackLearning: config.enableFeedbackLearning ?? true,
            minFeedbackSamples: config.minFeedbackSamples ?? 50,
            maxFeedbackAdjustment: config.maxFeedbackAdjustment ?? 0.15,
            persistencePath: config.persistencePath ?? "",
            targetSensitivity: config.targetSensitivity ?? 0.98,
            targetSpecificity: config.targetSpecificity ?? 0.95,
        };
        // Load persisted adjustments if available
        if (this.config.persistencePath) {
            this.loadPersistedAdjustments();
        }
    }
    // ===========================================================================
    // MAIN API
    // ===========================================================================
    /**
     * Get adaptive thresholds for a given context
     */
    getThresholds(context = {}) {
        if (!this.config.enabled) {
            return this.getBaseThresholds(context);
        }
        const adjustments = [];
        let combinedModifier = 1.0;
        // Apply document type modifier
        if (context.documentType && context.documentType !== StructureExtractor_1.DocumentType.UNKNOWN) {
            const modifier = DOCUMENT_TYPE_MODIFIERS[context.documentType];
            combinedModifier *= modifier;
            adjustments.push({
                factor: `documentType:${context.documentType}`,
                type: "documentType",
                reason: `Document type ${context.documentType} adjustment`,
                modifier,
            });
        }
        // Apply context strength modifier
        if (context.contextStrength) {
            const modifier = CONTEXT_STRENGTH_MODIFIERS[context.contextStrength];
            combinedModifier *= modifier;
            adjustments.push({
                factor: `contextStrength:${context.contextStrength}`,
                type: "contextStrength",
                reason: `Clinical context ${context.contextStrength} adjustment`,
                modifier,
            });
        }
        // Apply specialty modifier
        if (context.specialty && context.specialty !== MedicalSpecialty.UNKNOWN) {
            const modifier = SPECIALTY_MODIFIERS[context.specialty];
            combinedModifier *= modifier;
            adjustments.push({
                factor: `specialty:${context.specialty}`,
                type: "specialty",
                reason: `Specialty ${context.specialty} adjustment`,
                modifier,
            });
        }
        // Apply purpose of use modifier
        if (context.purposeOfUse) {
            const modifier = PURPOSE_MODIFIERS[context.purposeOfUse];
            combinedModifier *= modifier;
            adjustments.push({
                factor: `purposeOfUse:${context.purposeOfUse}`,
                type: "purposeOfUse",
                reason: `Purpose ${context.purposeOfUse} adjustment`,
                modifier,
            });
        }
        // Apply PHI type modifier
        if (context.phiType) {
            const modifier = PHI_TYPE_MODIFIERS[context.phiType] ?? 1.0;
            combinedModifier *= modifier;
            if (modifier !== 1.0) {
                adjustments.push({
                    factor: `phiType:${context.phiType}`,
                    type: "phiType",
                    reason: `PHI type ${context.phiType} adjustment`,
                    modifier,
                });
            }
        }
        // Apply OCR modifier
        if (context.isOCR) {
            const modifier = 0.95; // Lower thresholds for OCR text
            combinedModifier *= modifier;
            adjustments.push({
                factor: "isOCR:true",
                type: "ocr",
                reason: "OCR text requires lower thresholds for tolerance",
                modifier,
            });
        }
        // Apply feedback-learned adjustments
        if (this.config.enableFeedbackLearning) {
            const feedbackModifier = this.getFeedbackModifier(context);
            if (feedbackModifier !== 1.0) {
                combinedModifier *= feedbackModifier;
                adjustments.push({
                    factor: "feedback",
                    type: "feedback",
                    reason: "Learned adjustment from historical feedback",
                    modifier: feedbackModifier,
                });
            }
        }
        // Apply combined modifier to base thresholds
        return {
            minimum: this.clamp(Thresholds_1.Thresholds.confidence.MINIMUM * combinedModifier),
            low: this.clamp(Thresholds_1.Thresholds.confidence.LOW * combinedModifier),
            medium: this.clamp(Thresholds_1.Thresholds.confidence.MEDIUM * combinedModifier),
            high: this.clamp(Thresholds_1.Thresholds.confidence.HIGH * combinedModifier),
            veryHigh: this.clamp(Thresholds_1.Thresholds.confidence.VERY_HIGH * combinedModifier),
            drop: this.clamp(Thresholds_1.Thresholds.confidence.DROP * combinedModifier),
            context,
            adjustments,
        };
    }
    /**
     * Get the minimum threshold for a specific context
     * This is the most commonly used method
     */
    getMinimumThreshold(context = {}) {
        return this.getThresholds(context).minimum;
    }
    /**
     * Get type-specific decision threshold
     */
    getTypeThreshold(phiType, context = {}) {
        const thresholds = this.getThresholds({ ...context, phiType });
        return thresholds.minimum;
    }
    // ===========================================================================
    // SPECIALTY DETECTION
    // ===========================================================================
    /**
     * Detect medical specialty from document text
     */
    detectSpecialty(text) {
        const scores = new Map();
        // Initialize scores
        for (const specialty of Object.values(MedicalSpecialty)) {
            scores.set(specialty, 0);
        }
        // Score each specialty based on pattern matches
        for (const { pattern, specialty, weight } of SPECIALTY_PATTERNS) {
            pattern.lastIndex = 0;
            const matches = text.match(pattern);
            if (matches) {
                const currentScore = scores.get(specialty) || 0;
                scores.set(specialty, currentScore + matches.length * weight);
            }
        }
        // Find highest scoring specialty
        let bestSpecialty = MedicalSpecialty.UNKNOWN;
        let bestScore = 0;
        for (const [specialty, score] of scores) {
            if (score > bestScore && specialty !== MedicalSpecialty.UNKNOWN) {
                bestScore = score;
                bestSpecialty = specialty;
            }
        }
        // Calculate confidence based on score and margin
        const totalScore = Array.from(scores.values()).reduce((a, b) => a + b, 0);
        const confidence = totalScore > 0 ? bestScore / totalScore : 0;
        return {
            specialty: bestScore >= 2 ? bestSpecialty : MedicalSpecialty.UNKNOWN,
            confidence: Math.min(confidence, 1.0),
        };
    }
    /**
     * Build full adaptive context from document analysis
     */
    analyzeDocument(text, documentType, contextStrength, purposeOfUse) {
        const { specialty } = this.detectSpecialty(text);
        return {
            documentType: documentType ?? StructureExtractor_1.DocumentType.UNKNOWN,
            contextStrength: contextStrength ?? "NONE",
            specialty,
            purposeOfUse: purposeOfUse ?? PurposeOfUse.TREATMENT,
            documentLength: text.length,
            isOCR: this.detectOCR(text),
        };
    }
    /**
     * Detect if text appears to be from OCR
     */
    detectOCR(text) {
        // OCR indicators: unusual character substitutions, spacing issues
        const ocrIndicators = [
            /[0O][1Il][0O]/g, // Common OCR confusion patterns
            /\s{3,}/g, // Multiple spaces
            /[^\x00-\x7F]/g, // Non-ASCII characters
            /(?:[A-Z]{2,}\s+){3,}/g, // Multiple uppercase word runs
        ];
        let indicatorCount = 0;
        for (const pattern of ocrIndicators) {
            if (pattern.test(text)) {
                indicatorCount++;
            }
        }
        return indicatorCount >= 2;
    }
    // ===========================================================================
    // FEEDBACK LEARNING
    // ===========================================================================
    /**
     * Record feedback for learning
     */
    recordFeedback(feedback) {
        if (!this.config.enableFeedbackLearning)
            return;
        this.feedbackHistory.push(feedback);
        // Update context performance
        const key = this.contextKey(feedback.context);
        const perf = this.contextPerformance.get(key) || {
            totalCount: 0,
            falsePositives: 0,
            falseNegatives: 0,
            truePositives: 0,
            trueNegatives: 0,
            adjustmentFactor: 1.0,
            lastUpdated: new Date(),
        };
        perf.totalCount++;
        if (feedback.wasFalsePositive) {
            perf.falsePositives++;
        }
        else if (feedback.wasFalseNegative) {
            perf.falseNegatives++;
        }
        else if (feedback.confidence >= feedback.appliedThreshold) {
            perf.truePositives++;
        }
        else {
            perf.trueNegatives++;
        }
        perf.lastUpdated = new Date();
        // Recalculate adjustment if we have enough samples
        if (perf.totalCount >= this.config.minFeedbackSamples) {
            perf.adjustmentFactor = this.calculateAdjustmentFactor(perf);
            this.learnedAdjustments.set(key, perf.adjustmentFactor);
        }
        this.contextPerformance.set(key, perf);
        // Emit event
        this.emit("feedbackRecorded", { feedback, performance: perf });
        // Persist if configured
        if (this.config.persistencePath) {
            this.persistAdjustments();
        }
    }
    /**
     * Get feedback-based modifier for a context
     */
    getFeedbackModifier(context) {
        const key = this.contextKey(context);
        return this.learnedAdjustments.get(key) ?? 1.0;
    }
    /**
     * Calculate adjustment factor based on performance
     */
    calculateAdjustmentFactor(perf) {
        const total = perf.truePositives + perf.trueNegatives + perf.falsePositives + perf.falseNegatives;
        if (total === 0)
            return 1.0;
        // Calculate current sensitivity and specificity
        const sensitivity = perf.truePositives / (perf.truePositives + perf.falseNegatives) || 1.0;
        const specificity = perf.trueNegatives / (perf.trueNegatives + perf.falsePositives) || 1.0;
        // Calculate adjustment needed
        let adjustment = 1.0;
        // If sensitivity is too low, lower thresholds
        if (sensitivity < this.config.targetSensitivity) {
            const gap = this.config.targetSensitivity - sensitivity;
            adjustment *= 1.0 - Math.min(gap, this.config.maxFeedbackAdjustment);
        }
        // If specificity is too low, raise thresholds
        if (specificity < this.config.targetSpecificity) {
            const gap = this.config.targetSpecificity - specificity;
            adjustment *= 1.0 + Math.min(gap, this.config.maxFeedbackAdjustment);
        }
        // Clamp to reasonable range
        return Math.max(0.8, Math.min(1.2, adjustment));
    }
    /**
     * Create a key for context-based lookup
     */
    contextKey(context) {
        return [
            context.documentType ?? "UNKNOWN",
            context.specialty ?? "UNKNOWN",
            context.contextStrength ?? "NONE",
            context.phiType ?? "ANY",
        ].join(":");
    }
    // ===========================================================================
    // PERSISTENCE
    // ===========================================================================
    /**
     * Load persisted adjustments
     */
    loadPersistedAdjustments() {
        try {
            const filePath = path.join(this.config.persistencePath, "adaptive-thresholds.json");
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                this.learnedAdjustments = new Map(Object.entries(data.adjustments || {}));
                logger.info(`Loaded ${this.learnedAdjustments.size} persisted adjustments`);
            }
        }
        catch (error) {
            logger.warn(`Failed to load persisted adjustments: ${error}`);
        }
    }
    /**
     * Persist learned adjustments
     */
    persistAdjustments() {
        try {
            const filePath = path.join(this.config.persistencePath, "adaptive-thresholds.json");
            const data = {
                adjustments: Object.fromEntries(this.learnedAdjustments),
                updatedAt: new Date().toISOString(),
                feedbackCount: this.feedbackHistory.length,
            };
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
        catch (error) {
            logger.warn(`Failed to persist adjustments: ${error}`);
        }
    }
    // ===========================================================================
    // UTILITIES
    // ===========================================================================
    /**
     * Get base thresholds without adaptation
     */
    getBaseThresholds(context) {
        return {
            minimum: Thresholds_1.Thresholds.confidence.MINIMUM,
            low: Thresholds_1.Thresholds.confidence.LOW,
            medium: Thresholds_1.Thresholds.confidence.MEDIUM,
            high: Thresholds_1.Thresholds.confidence.HIGH,
            veryHigh: Thresholds_1.Thresholds.confidence.VERY_HIGH,
            drop: Thresholds_1.Thresholds.confidence.DROP,
            context,
            adjustments: [],
        };
    }
    /**
     * Clamp threshold to valid range
     */
    clamp(value) {
        return Math.max(0.3, Math.min(0.99, value));
    }
    /**
     * Get statistics about learned adjustments
     */
    getStatistics() {
        return {
            enabled: this.config.enabled,
            feedbackCount: this.feedbackHistory.length,
            learnedAdjustmentsCount: this.learnedAdjustments.size,
            contextPerformanceCount: this.contextPerformance.size,
        };
    }
    /**
     * Get all context performance data
     */
    getAllPerformance() {
        return new Map(this.contextPerformance);
    }
    /**
     * Reset learned adjustments
     */
    resetLearning() {
        this.feedbackHistory = [];
        this.contextPerformance.clear();
        this.learnedAdjustments.clear();
        logger.info("Reset all learned adjustments");
    }
}
exports.AdaptiveThresholdService = AdaptiveThresholdService;
// =============================================================================
// SINGLETON EXPORT
// =============================================================================
/**
 * Default singleton instance
 */
exports.adaptiveThresholds = new AdaptiveThresholdService();
exports.default = AdaptiveThresholdService;
//# sourceMappingURL=AdaptiveThresholdService.js.map