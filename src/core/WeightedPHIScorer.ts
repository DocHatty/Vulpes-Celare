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

import { Span, FilterType } from '../models/Span';

/**
 * Scoring weights for different detection sources
 */
export interface ScoringWeights {
  // Regex pattern weights
  lastFirstFormat: number;      // "Martinez, Elena"
  titledName: number;           // "Dr. Sarah Thompson"
  patientLabel: number;         // "Patient: John"
  labeledName: number;          // "Performed by: Maria"
  familyRelation: number;       // "Wife: Jane"
  generalFullName: number;      // Standalone full name
  highPrecisionPattern: number; // SSN, Email, Phone

  // Neural detection weights
  nerBaseWeight: number;        // Base weight for NER detection
  nerConfidenceMultiplier: number; // Additional per-confidence point
  nerHighConfidenceBonus: number;  // Bonus when NER confidence > 0.9

  // Context bonuses
  titleContextBonus: number;    // Mr./Mrs./Dr.
  familyContextBonus: number;   // "husband", "wife"
  phiLabelBonus: number;        // "Name:", "Patient:"
  clinicalRoleBonus: number;    // "Performed by:", "Verified by:"

  // Whitelist penalties
  diseaseEponymPenalty: number; // Parkinson's, Alzheimer's
  diseaseNamePenalty: number;   // Diabetes, Hypertension
  medicationPenalty: number;    // Lisinopril, Metformin
  procedurePenalty: number;     // CT Scan, MRI
  anatomicalPenalty: number;    // abdomen, pelvis
  sectionHeaderPenalty: number; // ASSESSMENT, PLAN
  organizationPenalty: number;  // hospital, clinic
}

/**
 * Default scoring weights (calibrated from Vulpes-NeuralNetwork)
 */
const DEFAULT_WEIGHTS: ScoringWeights = {
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
const HIGH_PRECISION_TYPES: Set<FilterType> = new Set([
  FilterType.SSN,
  FilterType.EMAIL,
  FilterType.PHONE,
  FilterType.FAX,
  FilterType.MRN,
  FilterType.NPI,
  FilterType.CREDIT_CARD,
  FilterType.ACCOUNT,
  FilterType.IP,
  FilterType.URL,
]);

/**
 * Medical whitelist categories with terms
 */
interface MedicalWhitelist {
  diseaseEponyms: Set<string>;
  diseaseNames: Set<string>;
  medications: Set<string>;
  procedures: Set<string>;
  anatomical: Set<string>;
  sectionHeaders: Set<string>;
  organizations: Set<string>;
}

/**
 * Build comprehensive medical whitelists
 */
function buildMedicalWhitelists(): MedicalWhitelist {
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

/**
 * Context patterns for bonus scoring
 */
interface ContextPatterns {
  titles: RegExp;
  familyTerms: RegExp;
  phiLabels: RegExp;
  clinicalRoles: RegExp;
}

const CONTEXT_PATTERNS: ContextPatterns = {
  titles: /\b(mr|mrs|ms|miss|dr|prof|professor|rev|hon)\b\.?\s*$/i,
  familyTerms: /\b(husband|wife|spouse|son|daughter|mother|father|parent|child|sibling|brother|sister|guardian)\b/i,
  phiLabels: /\b(name|patient|dob|ssn|mrn|address|phone|email|contact)\s*[:=]/i,
  clinicalRoles: /\b(performed by|verified by|signed by|reviewed by|attending|provider|physician|nurse|technician)\s*[:=]?\s*$/i,
};

/**
 * Scoring result with breakdown
 */
export interface ScoringResult {
  finalScore: number;
  baseScore: number;
  contextBonus: number;
  whitelistPenalty: number;
  recommendation: 'PHI' | 'NOT_PHI' | 'UNCERTAIN';
  breakdown: {
    source: string;
    value: number;
    reason: string;
  }[];
}

/**
 * WeightedPHIScorer - Main scoring class
 */
export class WeightedPHIScorer {
  private weights: ScoringWeights;
  private whitelists: MedicalWhitelist;
  private decisionThreshold: number;

  constructor(
    weights: Partial<ScoringWeights> = {},
    decisionThreshold: number = 0.50
  ) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.whitelists = buildMedicalWhitelists();
    this.decisionThreshold = decisionThreshold;
  }

  /**
   * Score a single span
   */
  score(span: Span, context: string): ScoringResult {
    const breakdown: ScoringResult['breakdown'] = [];
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
    let recommendation: ScoringResult['recommendation'];
    if (finalScore >= this.decisionThreshold + 0.15) {
      recommendation = 'PHI';
    } else if (finalScore < this.decisionThreshold - 0.15) {
      recommendation = 'NOT_PHI';
    } else {
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
  scoreBatch(spans: Span[], fullText: string): Map<Span, ScoringResult> {
    const results = new Map<Span, ScoringResult>();

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
  private calculateBaseScore(
    span: Span,
    breakdown: ScoringResult['breakdown']
  ): number {
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
    if (span.filterType === FilterType.NAME) {
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
  private calculateContextBonus(
    span: Span,
    context: string,
    breakdown: ScoringResult['breakdown']
  ): number {
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
  private calculateWhitelistPenalty(
    span: Span,
    breakdown: ScoringResult['breakdown']
  ): number {
    // Only apply to NAME type (most common false positive source)
    if (span.filterType !== FilterType.NAME) {
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
  setWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Update decision threshold
   */
  setThreshold(threshold: number): void {
    this.decisionThreshold = threshold;
  }

  /**
   * Get current weights
   */
  getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  /**
   * Export weights to JSON
   */
  exportWeights(): string {
    return JSON.stringify(this.weights, null, 2);
  }

  /**
   * Load weights from JSON file (static factory)
   */
  static loadFromFile(filePath: string): WeightedPHIScorer {
    try {
      const fs = require('fs');
      const data = fs.readFileSync(filePath, 'utf-8');
      const weights = JSON.parse(data) as Partial<ScoringWeights>;
      return new WeightedPHIScorer(weights);
    } catch (error) {
      console.warn(`[WeightedPHIScorer] Failed to load weights from ${filePath}, using defaults`);
      return new WeightedPHIScorer();
    }
  }

  /**
   * Auto-load optimized weights if available
   * Looks for weights file at: data/calibration/weights.json
   */
  static autoLoad(): WeightedPHIScorer {
    const path = require('path');
    const weightsPath = path.join(__dirname, '../../data/calibration/weights.json');
    return WeightedPHIScorer.loadFromFile(weightsPath);
  }
}

// Export singleton for convenience (auto-loads optimized weights if available)
export const weightedScorer = WeightedPHIScorer.autoLoad();
