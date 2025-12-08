"use strict";
/**
 * WeightedPHIScorer - Advanced Ensemble Scoring for PHI Detection
 *
 * Inspired by Vulpes-NeuralNetwork's sophisticated scoring system.
 * Provides weighted combination of multiple detection signals with:
 * - Detector-specific weights (regex patterns vs neural NER)
 * - Context bonuses (titles, family context, clinical roles)
 * - Whitelist penalties (medical terms, disease eponyms)
 * - Type-specific confidence thresholds
 *
 * PERFORMANCE: Designed for high-throughput batch scoring
 *
 * @module redaction/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.weightedScorer = exports.WeightedPHIScorer = void 0;
const Span_1 = require("../models/Span");
/**
 * Default scoring weights (calibrated from Vulpes-NeuralNetwork)
 */
const DEFAULT_WEIGHTS = {
    // Regex pattern weights
    lastFirstFormat: 0.95,
    titledName: 0.92,
    patientLabel: 0.90,
    labeledName: 0.91,
    familyRelation: 0.90,
    generalFullName: 0.70,
    highPrecisionPattern: 0.95,
    // Neural detection weights
    nerBaseWeight: 0.60,
    nerConfidenceMultiplier: 0.35,
    nerHighConfidenceBonus: 0.15,
    // Context bonuses
    titleContextBonus: 0.25,
    familyContextBonus: 0.30,
    phiLabelBonus: 0.20,
    clinicalRoleBonus: 0.25,
    // Whitelist penalties (negative to reduce score)
    diseaseEponymPenalty: -0.85,
    diseaseNamePenalty: -0.80,
    medicationPenalty: -0.75,
    procedurePenalty: -0.70,
    anatomicalPenalty: -0.65,
    sectionHeaderPenalty: -0.90,
    organizationPenalty: -0.60,
};
/**
 * PHI types that use high-precision pattern matching
 */
const HIGH_PRECISION_TYPES = new Set([
    Span_1.FilterType.SSN,
    Span_1.FilterType.EMAIL,
    Span_1.FilterType.PHONE,
    Span_1.FilterType.FAX,
    Span_1.FilterType.MRN,
    Span_1.FilterType.NPI,
    Span_1.FilterType.CREDIT_CARD,
    Span_1.FilterType.ACCOUNT,
    Span_1.FilterType.IP,
    Span_1.FilterType.URL,
]);
/**
 * Build comprehensive medical whitelists
 */
function buildMedicalWhitelists() {
    return {
        diseaseEponyms: new Set([
            "parkinson", "parkinson's", "parkinsons",
            "alzheimer", "alzheimer's", "alzheimers",
            "hodgkin", "hodgkin's", "hodgkins",
            "crohn", "crohn's", "crohns",
            "addison", "addison's", "addisons",
            "cushing", "cushing's", "cushings",
            "graves", "graves'",
            "hashimoto", "hashimoto's", "hashimotos",
            "bell", "bell's", "bells palsy",
            "raynaud", "raynaud's", "raynauds",
            "meniere", "meniere's", "menieres",
            "tourette", "tourette's", "tourettes",
            "wilson", "wilson's", "wilsons disease",
            "huntington", "huntington's", "huntingtons",
            "marfan", "marfan's", "marfans",
            "sjogren", "sjogren's", "sjogrens",
            "guillain", "guillain-barre", "guillain barre",
            "kaposi", "kaposi's", "kaposis",
            "kawasaki",
            "paget", "paget's", "pagets",
        ].map(s => s.toLowerCase())),
        diseaseNames: new Set([
            "diabetes", "hypertension", "cancer", "leukemia", "lymphoma",
            "pneumonia", "bronchitis", "asthma", "copd", "emphysema",
            "arthritis", "osteoporosis", "fibromyalgia",
            "depression", "anxiety", "schizophrenia", "bipolar",
            "hepatitis", "cirrhosis", "pancreatitis",
            "stroke", "aneurysm", "thrombosis", "embolism",
            "carcinoma", "melanoma", "sarcoma", "tumor",
            "infection", "sepsis", "abscess",
            "fracture", "dislocation", "sprain",
            "anemia", "thrombocytopenia", "neutropenia",
            "dementia", "neuropathy", "myopathy",
            "colitis", "gastritis", "esophagitis",
            "nephritis", "cystitis", "pyelonephritis",
            "dermatitis", "eczema", "psoriasis",
            "sinusitis", "otitis", "conjunctivitis",
        ].map(s => s.toLowerCase())),
        medications: new Set([
            "lisinopril", "metformin", "amlodipine", "metoprolol", "omeprazole",
            "simvastatin", "losartan", "gabapentin", "hydrochlorothiazide",
            "atorvastatin", "levothyroxine", "prednisone", "amoxicillin",
            "azithromycin", "alprazolam", "tramadol", "furosemide",
            "pantoprazole", "escitalopram", "sertraline", "fluoxetine",
            "trazodone", "clopidogrel", "warfarin", "aspirin", "ibuprofen",
            "acetaminophen", "naproxen", "oxycodone", "morphine", "fentanyl",
            "insulin", "methotrexate", "prolia", "humira", "enbrel",
            "xarelto", "eliquis", "pradaxa", "coumadin",
            "lipitor", "crestor", "zocor", "pravachol",
            "norvasc", "cardizem", "procardia",
            "lasix", "bumex", "aldactone",
            "zoloft", "prozac", "lexapro", "celexa", "paxil",
            "xanax", "ativan", "valium", "klonopin",
            "ambien", "lunesta", "sonata",
        ].map(s => s.toLowerCase())),
        procedures: new Set([
            "ct scan", "ct", "mri", "x-ray", "xray", "ultrasound",
            "echocardiogram", "ekg", "ecg", "eeg",
            "colonoscopy", "endoscopy", "bronchoscopy", "laparoscopy",
            "biopsy", "surgery", "operation", "procedure",
            "catheterization", "angiogram", "angioplasty",
            "dialysis", "chemotherapy", "radiation", "immunotherapy",
            "physical therapy", "occupational therapy", "speech therapy",
            "mammogram", "pap smear", "bone scan", "pet scan",
            "injection", "infusion", "transfusion",
        ].map(s => s.toLowerCase())),
        anatomical: new Set([
            "abdomen", "pelvis", "thorax", "chest", "head", "neck",
            "liver", "kidney", "spleen", "pancreas", "gallbladder",
            "heart", "lung", "brain", "spine", "colon",
            "stomach", "intestine", "bladder", "prostate",
            "uterus", "ovary", "breast", "thyroid",
            "artery", "vein", "nerve", "muscle", "bone", "joint",
            "skin", "tissue", "membrane", "cartilage",
        ].map(s => s.toLowerCase())),
        sectionHeaders: new Set([
            "assessment", "plan", "diagnosis", "history", "examination",
            "medications", "allergies", "vitals", "labs", "imaging",
            "chief complaint", "hpi", "ros", "physical exam",
            "impression", "recommendations", "follow-up",
            "subjective", "objective", "problem list",
        ].map(s => s.toLowerCase())),
        organizations: new Set([
            "hospital", "clinic", "medical center", "health center",
            "healthcare", "health system", "medical group",
            "pharmacy", "laboratory", "urgent care",
            "emergency room", "emergency department",
            "nursing home", "rehabilitation", "hospice",
        ].map(s => s.toLowerCase())),
    };
}
const CONTEXT_PATTERNS = {
    titles: /\b(mr|mrs|ms|miss|dr|prof|professor|rev|hon)\b\.?\s*$/i,
    familyTerms: /\b(husband|wife|spouse|son|daughter|mother|father|parent|child|sibling|brother|sister|guardian)\b/i,
    phiLabels: /\b(name|patient|dob|ssn|mrn|address|phone|email|contact)\s*[:=]/i,
    clinicalRoles: /\b(performed by|verified by|signed by|reviewed by|attending|provider|physician|nurse|technician)\s*[:=]?\s*$/i,
};
/**
 * WeightedPHIScorer - Main scoring class
 */
class WeightedPHIScorer {
    constructor(weights = {}, decisionThreshold = 0.50) {
        this.weights = { ...DEFAULT_WEIGHTS, ...weights };
        this.whitelists = buildMedicalWhitelists();
        this.decisionThreshold = decisionThreshold;
    }
    /**
     * Score a single span
     */
    score(span, context) {
        const breakdown = [];
        let baseScore = 0;
        let contextBonus = 0;
        let whitelistPenalty = 0;
        // 1. Calculate base score from pattern type
        baseScore = this.calculateBaseScore(span, breakdown);
        // 2. Apply context bonuses
        contextBonus = this.calculateContextBonus(span, context, breakdown);
        // 3. Apply whitelist penalties
        whitelistPenalty = this.calculateWhitelistPenalty(span, breakdown);
        // 4. Combine scores
        const finalScore = Math.max(0, Math.min(1, baseScore + contextBonus + whitelistPenalty));
        // 5. Make recommendation
        let recommendation;
        if (finalScore >= this.decisionThreshold + 0.15) {
            recommendation = 'PHI';
        }
        else if (finalScore < this.decisionThreshold - 0.15) {
            recommendation = 'NOT_PHI';
        }
        else {
            recommendation = 'UNCERTAIN';
        }
        return {
            finalScore,
            baseScore,
            contextBonus,
            whitelistPenalty,
            recommendation,
            breakdown,
        };
    }
    /**
     * Score multiple spans (batch mode)
     */
    scoreBatch(spans, fullText) {
        const results = new Map();
        for (const span of spans) {
            // Extract context around span
            const contextStart = Math.max(0, span.characterStart - 100);
            const contextEnd = Math.min(fullText.length, span.characterEnd + 100);
            const context = fullText.substring(contextStart, contextEnd);
            results.set(span, this.score(span, context));
        }
        return results;
    }
    /**
     * Calculate base score from detection pattern
     */
    calculateBaseScore(span, breakdown) {
        // High-precision patterns (SSN, Phone, Email, etc.)
        if (HIGH_PRECISION_TYPES.has(span.filterType)) {
            breakdown.push({
                source: 'pattern',
                value: this.weights.highPrecisionPattern,
                reason: `High-precision ${span.filterType} pattern`,
            });
            return this.weights.highPrecisionPattern;
        }
        // Name patterns - check for specific pattern types
        if (span.filterType === Span_1.FilterType.NAME) {
            const pattern = span.pattern?.toLowerCase() || '';
            if (pattern.includes('last') && pattern.includes('first')) {
                breakdown.push({
                    source: 'pattern',
                    value: this.weights.lastFirstFormat,
                    reason: 'Last, First name format',
                });
                return this.weights.lastFirstFormat;
            }
            if (pattern.includes('title') || pattern.includes('dr') || pattern.includes('mr')) {
                breakdown.push({
                    source: 'pattern',
                    value: this.weights.titledName,
                    reason: 'Titled name pattern',
                });
                return this.weights.titledName;
            }
            if (pattern.includes('patient')) {
                breakdown.push({
                    source: 'pattern',
                    value: this.weights.patientLabel,
                    reason: 'Patient label pattern',
                });
                return this.weights.patientLabel;
            }
            if (pattern.includes('family') || pattern.includes('relation')) {
                breakdown.push({
                    source: 'pattern',
                    value: this.weights.familyRelation,
                    reason: 'Family relation pattern',
                });
                return this.weights.familyRelation;
            }
            // Default full name
            breakdown.push({
                source: 'pattern',
                value: this.weights.generalFullName,
                reason: 'General full name pattern',
            });
            return this.weights.generalFullName;
        }
        // Default to span's existing confidence
        breakdown.push({
            source: 'confidence',
            value: span.confidence,
            reason: 'Original detection confidence',
        });
        return span.confidence;
    }
    /**
     * Calculate context bonuses
     */
    calculateContextBonus(span, context, breakdown) {
        let bonus = 0;
        // Check for title context
        if (CONTEXT_PATTERNS.titles.test(context)) {
            bonus += this.weights.titleContextBonus;
            breakdown.push({
                source: 'context',
                value: this.weights.titleContextBonus,
                reason: 'Title prefix detected (Mr/Mrs/Dr)',
            });
        }
        // Check for family terms
        if (CONTEXT_PATTERNS.familyTerms.test(context)) {
            bonus += this.weights.familyContextBonus;
            breakdown.push({
                source: 'context',
                value: this.weights.familyContextBonus,
                reason: 'Family relationship context',
            });
        }
        // Check for PHI labels
        if (CONTEXT_PATTERNS.phiLabels.test(context)) {
            bonus += this.weights.phiLabelBonus;
            breakdown.push({
                source: 'context',
                value: this.weights.phiLabelBonus,
                reason: 'PHI label context (Name:, Patient:)',
            });
        }
        // Check for clinical roles
        if (CONTEXT_PATTERNS.clinicalRoles.test(context)) {
            bonus += this.weights.clinicalRoleBonus;
            breakdown.push({
                source: 'context',
                value: this.weights.clinicalRoleBonus,
                reason: 'Clinical role context (Performed by:)',
            });
        }
        return bonus;
    }
    /**
     * Calculate whitelist penalties for medical terms
     */
    calculateWhitelistPenalty(span, breakdown) {
        // Only apply to NAME type (most common false positive source)
        if (span.filterType !== Span_1.FilterType.NAME) {
            return 0;
        }
        const lowerText = span.text.toLowerCase();
        let penalty = 0;
        // Check disease eponyms
        if (this.whitelists.diseaseEponyms.has(lowerText)) {
            penalty += this.weights.diseaseEponymPenalty;
            breakdown.push({
                source: 'whitelist',
                value: this.weights.diseaseEponymPenalty,
                reason: `Disease eponym: ${span.text}`,
            });
            return penalty; // Early exit - definitive match
        }
        // Check disease names
        for (const disease of this.whitelists.diseaseNames) {
            if (lowerText.includes(disease)) {
                penalty += this.weights.diseaseNamePenalty;
                breakdown.push({
                    source: 'whitelist',
                    value: this.weights.diseaseNamePenalty,
                    reason: `Disease name: ${disease}`,
                });
                return penalty;
            }
        }
        // Check medications
        for (const med of this.whitelists.medications) {
            if (lowerText.includes(med)) {
                penalty += this.weights.medicationPenalty;
                breakdown.push({
                    source: 'whitelist',
                    value: this.weights.medicationPenalty,
                    reason: `Medication: ${med}`,
                });
                return penalty;
            }
        }
        // Check procedures
        for (const proc of this.whitelists.procedures) {
            if (lowerText.includes(proc)) {
                penalty += this.weights.procedurePenalty;
                breakdown.push({
                    source: 'whitelist',
                    value: this.weights.procedurePenalty,
                    reason: `Procedure: ${proc}`,
                });
                return penalty;
            }
        }
        // Check anatomical terms
        for (const anat of this.whitelists.anatomical) {
            if (lowerText === anat) {
                penalty += this.weights.anatomicalPenalty;
                breakdown.push({
                    source: 'whitelist',
                    value: this.weights.anatomicalPenalty,
                    reason: `Anatomical term: ${anat}`,
                });
                return penalty;
            }
        }
        // Check section headers
        for (const header of this.whitelists.sectionHeaders) {
            if (lowerText.includes(header)) {
                penalty += this.weights.sectionHeaderPenalty;
                breakdown.push({
                    source: 'whitelist',
                    value: this.weights.sectionHeaderPenalty,
                    reason: `Section header: ${header}`,
                });
                return penalty;
            }
        }
        // Check organization terms
        for (const org of this.whitelists.organizations) {
            if (lowerText.includes(org)) {
                penalty += this.weights.organizationPenalty;
                breakdown.push({
                    source: 'whitelist',
                    value: this.weights.organizationPenalty,
                    reason: `Organization term: ${org}`,
                });
                return penalty;
            }
        }
        return penalty;
    }
    /**
     * Update weights
     */
    setWeights(weights) {
        this.weights = { ...this.weights, ...weights };
    }
    /**
     * Update decision threshold
     */
    setThreshold(threshold) {
        this.decisionThreshold = threshold;
    }
    /**
     * Get current weights
     */
    getWeights() {
        return { ...this.weights };
    }
}
exports.WeightedPHIScorer = WeightedPHIScorer;
// Export singleton for convenience
exports.weightedScorer = new WeightedPHIScorer();
//# sourceMappingURL=WeightedPHIScorer.js.map