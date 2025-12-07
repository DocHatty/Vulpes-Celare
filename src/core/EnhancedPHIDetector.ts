/**
 * EnhancedPHIDetector - Unified Multi-Signal PHI Detection Pipeline
 *
 * RESEARCH BASIS: Integrates multiple SOTA techniques:
 * 1. Ensemble voting (2016 N-GRID winner approach)
 * 2. Document structure awareness (i2b2 research)
 * 3. Fuzzy dictionary matching (proven +5-10% for names)
 * 4. OCR chaos detection (adaptive thresholds)
 *
 * This orchestrator combines all signals for maximum accuracy.
 *
 * @module redaction/core
 */

import { Span, FilterType } from "../models/Span";
import { EnsembleVoter, VoteSignal } from "./EnsembleVoter";
import { DocumentStructureAnalyzer, DocumentProfile, StructuralPosition } from "../context/DocumentStructureAnalyzer";
import { FuzzyDictionaryMatcher } from "../dictionaries/FuzzyDictionaryMatcher";
import { OcrChaosDetector, ChaosAnalysis } from "../utils/OcrChaosDetector";
import { NameDictionary } from "../dictionaries/NameDictionary";
import * as fs from "fs";
import * as path from "path";

export interface DetectionCandidate {
  text: string;
  start: number;
  end: number;
  phiType: string;
  patternName: string;
  baseConfidence: number;
}

export interface EnhancedDetectionResult {
  candidate: DetectionCandidate;
  signals: VoteSignal[];
  finalConfidence: number;
  recommendation: 'REDACT' | 'SKIP' | 'UNCERTAIN';
  explanation: string;
}

export interface DetectionContext {
  fullText: string;
  documentProfile?: DocumentProfile;
  chaosAnalysis?: ChaosAnalysis;
}

/**
 * Singleton orchestrator that combines all detection signals
 */
export class EnhancedPHIDetector {
  private static instance: EnhancedPHIDetector;
  
  private voter: EnsembleVoter;
  private firstNameMatcher: FuzzyDictionaryMatcher | null = null;
  private surnameMatcher: FuzzyDictionaryMatcher | null = null;
  private initialized = false;
  
  // Cache for document analysis (avoid re-analyzing same doc)
  private documentCache: Map<string, { profile: DocumentProfile; chaos: ChaosAnalysis }> = new Map();
  private readonly MAX_CACHE_SIZE = 50;

  private constructor() {
    this.voter = new EnsembleVoter();
  }

  static getInstance(): EnhancedPHIDetector {
    if (!EnhancedPHIDetector.instance) {
      EnhancedPHIDetector.instance = new EnhancedPHIDetector();
    }
    return EnhancedPHIDetector.instance;
  }

  /**
   * Initialize fuzzy dictionaries
   */
  init(): void {
    if (this.initialized) return;

    try {
      // Load first names for fuzzy matching
      const firstNamesPath = path.join(__dirname, "../dictionaries/first-names.txt");
      if (fs.existsSync(firstNamesPath)) {
        const names = fs.readFileSync(firstNamesPath, "utf-8")
          .split("\n")
          .map(n => n.trim())
          .filter(n => n.length > 0);
        this.firstNameMatcher = FuzzyDictionaryMatcher.forFirstNames(names);
      }

      // Load surnames for fuzzy matching
      const surnamesPath = path.join(__dirname, "../dictionaries/surnames.txt");
      if (fs.existsSync(surnamesPath)) {
        const names = fs.readFileSync(surnamesPath, "utf-8")
          .split("\n")
          .map(n => n.trim())
          .filter(n => n.length > 0);
        this.surnameMatcher = FuzzyDictionaryMatcher.forSurnames(names);
      }

      this.initialized = true;
    } catch (error) {
      console.error("EnhancedPHIDetector init error:", error);
      this.initialized = true; // Mark as initialized to avoid retry loops
    }
  }

  /**
   * Analyze a document once and cache results
   */
  analyzeDocument(text: string): { profile: DocumentProfile; chaos: ChaosAnalysis } {
    // Use first 500 chars as cache key
    const cacheKey = text.substring(0, 500);
    
    if (this.documentCache.has(cacheKey)) {
      return this.documentCache.get(cacheKey)!;
    }

    const profile = DocumentStructureAnalyzer.analyzeDocument(text);
    const chaos = OcrChaosDetector.analyze(text);

    const result = { profile, chaos };

    // Manage cache size
    if (this.documentCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.documentCache.keys().next().value;
      if (firstKey) this.documentCache.delete(firstKey);
    }
    this.documentCache.set(cacheKey, result);

    return result;
  }

  /**
   * MAIN METHOD: Evaluate a detection candidate with all signals
   */
  evaluate(
    candidate: DetectionCandidate,
    context: DetectionContext
  ): EnhancedDetectionResult {
    if (!this.initialized) this.init();

    const signals: VoteSignal[] = [];

    // Get or compute document analysis
    const docAnalysis = context.documentProfile && context.chaosAnalysis
      ? { profile: context.documentProfile, chaos: context.chaosAnalysis }
      : this.analyzeDocument(context.fullText);

    // 1. PATTERN SIGNAL - from the original detector
    signals.push(EnsembleVoter.patternSignal(
      candidate.baseConfidence,
      candidate.patternName
    ));

    // 2. DICTIONARY SIGNAL - fuzzy name matching
    if (candidate.phiType === 'NAME') {
      const dictSignal = this.getDictionarySignal(candidate.text);
      if (dictSignal) {
        signals.push(dictSignal);
      }
    }

    // 3. STRUCTURE SIGNAL - document position context
    console.error(`[DEBUG evaluate] Getting position context for "${candidate.text.substring(0, 20)}"...`);
    const position = DocumentStructureAnalyzer.getPositionContext(
      context.fullText,
      candidate.start,
      docAnalysis.profile
    );
    console.error(`[DEBUG evaluate] Position context done`);
    const structureBoost = DocumentStructureAnalyzer.getContextBoost(position, candidate.phiType);
    
    if (Math.abs(structureBoost) > 0.05) {
      signals.push(EnsembleVoter.structureSignal(
        0.5 + structureBoost, // Convert boost to confidence
        `${position.sectionType}/${position.fieldContext}`
      ));
    }

    // 4. LABEL SIGNAL - nearby label context
    if (position.nearestLabel && position.labelDistance < 50) {
      const labelRelevance = this.getLabelRelevance(position.nearestLabel, candidate.phiType);
      if (labelRelevance > 0.3) {
        signals.push(EnsembleVoter.labelSignal(
          labelRelevance,
          position.nearestLabel
        ));
      }
    }

    // 5. CHAOS SIGNAL - adjust for document quality
    const chaosAdjustment = this.getChaosAdjustment(
      candidate.text,
      docAnalysis.chaos,
      candidate.phiType
    );
    if (Math.abs(chaosAdjustment - 0.5) > 0.1) {
      signals.push(EnsembleVoter.chaosSignal(
        chaosAdjustment,
        docAnalysis.chaos.quality
      ));
    }

    // 6. CONTEXT SIGNAL - surrounding text patterns
    const contextSignal = this.getContextSignal(
      candidate,
      context.fullText
    );
    if (contextSignal) {
      signals.push(contextSignal);
    }

    // Vote!
    const vote = this.voter.vote(signals);

    return {
      candidate,
      signals,
      finalConfidence: vote.combinedScore,
      recommendation: vote.recommendation,
      explanation: vote.explanation,
    };
  }

  /**
   * Batch evaluate multiple candidates (more efficient)
   */
  evaluateBatch(
    candidates: DetectionCandidate[],
    fullText: string
  ): EnhancedDetectionResult[] {
    // Analyze document once
    console.error(`[DEBUG evaluateBatch] Processing ${candidates.length} candidates...`);
    const docAnalysis = this.analyzeDocument(fullText);
    console.error(`[DEBUG evaluateBatch] Document analyzed, now mapping evaluate...`);
    const context: DetectionContext = {
      fullText,
      documentProfile: docAnalysis.profile,
      chaosAnalysis: docAnalysis.chaos,
    };

    const results = candidates.map((candidate, idx) => {
      if (idx % 50 === 0) console.error(`[DEBUG evaluateBatch] Evaluating candidate ${idx}/${candidates.length}...`);
      return this.evaluate(candidate, context);
    });
    console.error(`[DEBUG evaluateBatch] All candidates evaluated, returning`);
    return results;
  }

  /**
   * Quick filter: Should this candidate be redacted?
   */
  shouldRedact(
    candidate: DetectionCandidate,
    fullText: string,
    threshold: number = 0.65
  ): boolean {
    const result = this.evaluate(candidate, { fullText });
    return result.finalConfidence >= threshold;
  }

  // ============ Private Signal Generators ============

  private getDictionarySignal(nameText: string): VoteSignal | null {
    if (!this.firstNameMatcher || !this.surnameMatcher) {
      // Fall back to basic NameDictionary
      const confidence = NameDictionary.getNameConfidence(nameText);
      if (confidence > 0) {
        return EnsembleVoter.dictionarySignal(confidence, 'basic-dict', false);
      }
      return null;
    }

    const words = nameText.trim().split(/\s+/);
    if (words.length < 1) return null;

    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    // Check first name with fuzzy matching
    const firstMatch = this.firstNameMatcher.lookup(firstWord);
    const lastMatch = this.surnameMatcher.lookup(lastWord);

    // Calculate combined confidence
    let confidence = 0;
    let isFuzzy = false;

    if (firstMatch.matched && lastMatch.matched) {
      // Both matched
      confidence = (firstMatch.confidence + lastMatch.confidence) / 2;
      isFuzzy = firstMatch.matchType !== 'EXACT' || lastMatch.matchType !== 'EXACT';
    } else if (firstMatch.matched) {
      // Only first name matched
      confidence = firstMatch.confidence * 0.7;
      isFuzzy = firstMatch.matchType !== 'EXACT';
    } else if (lastMatch.matched) {
      // Only last name matched
      confidence = lastMatch.confidence * 0.5;
      isFuzzy = lastMatch.matchType !== 'EXACT';
    }

    if (confidence > 0.3) {
      const matchTypes = [
        firstMatch.matched ? firstMatch.matchType : null,
        lastMatch.matched ? lastMatch.matchType : null,
      ].filter(Boolean).join('+');
      
      return EnsembleVoter.dictionarySignal(
        confidence,
        `fuzzy-dict (${matchTypes})`,
        isFuzzy
      );
    }

    return null;
  }

  private getLabelRelevance(label: string, phiType: string): number {
    const lowerLabel = label.toLowerCase();

    const labelPatterns: { [key: string]: RegExp[] } = {
      'NAME': [
        /\b(name|patient|member|client|contact|guardian|parent|spouse|emergency)\b/,
        /\b(first|last|middle|full|legal)\s*name\b/,
      ],
      'DATE': [
        /\b(date|dob|birth|born|admission|discharge|visit|service)\b/,
        /\b(effective|expires?|issued)\b/,
      ],
      'SSN': [
        /\b(ssn|social|security|ss#)\b/,
      ],
      'PHONE': [
        /\b(phone|tel|telephone|cell|mobile|contact|fax)\b/,
      ],
      'ADDRESS': [
        /\b(address|street|city|state|zip|residence|location)\b/,
      ],
      'MRN': [
        /\b(mrn|medical\s*record|patient\s*id|chart|account)\b/,
      ],
      'EMAIL': [
        /\b(email|e-mail|electronic\s*mail)\b/,
      ],
    };

    const patterns = labelPatterns[phiType] || [];
    for (const pattern of patterns) {
      if (pattern.test(lowerLabel)) {
        return 0.85; // High relevance
      }
    }

    // Generic label nearby is still somewhat relevant
    if (/\b(name|date|id|number|#)\b/.test(lowerLabel)) {
      return 0.5;
    }

    return 0.3; // Some label exists but not obviously relevant
  }

  private getChaosAdjustment(
    text: string,
    chaos: ChaosAnalysis,
    phiType: string
  ): number {
    // In chaotic documents, be more lenient with detection
    // In clean documents, be stricter
    
    const weights = OcrChaosDetector.getConfidenceWeights(chaos.score);
    const casePattern = OcrChaosDetector.classifyCasePattern(text);
    
    let adjustment = weights[casePattern.toLowerCase() as keyof typeof weights] || 0.7;
    
    // PHI types that are more resilient to OCR errors
    const ocrResilientTypes = ['SSN', 'PHONE', 'MRN', 'EMAIL']; // Structured patterns
    if (ocrResilientTypes.includes(phiType)) {
      // Don't penalize as much for chaos
      adjustment = Math.max(0.6, adjustment);
    }
    
    return adjustment;
  }

  private getContextSignal(
    candidate: DetectionCandidate,
    fullText: string
  ): VoteSignal | null {
    const { start, end, phiType, text } = candidate;
    
    // Get surrounding context (100 chars before and after)
    const contextStart = Math.max(0, start - 100);
    const contextEnd = Math.min(fullText.length, end + 100);
    const surroundingText = fullText.substring(contextStart, contextEnd).toLowerCase();

    // PHI-specific context patterns
    const contextPatterns: { [key: string]: { positive: RegExp[]; negative: RegExp[] } } = {
      'NAME': {
        positive: [
          /\b(patient|member|client|contact|mr\.?|mrs\.?|ms\.?)\b/,
          /\b(signed|witnessed|certified|authorized)\s+by\b/,
          /\b(guardian|spouse|parent|child|sibling|relative)\b/,
        ],
        negative: [
          /\b(hospital|clinic|center|institute|university|college)\b/,
          /\b(medication|drug|diagnosis|procedure|treatment)\b/,
          /\b(dr\.?|doctor|physician|nurse|provider)\s+/i, // Provider context
        ],
      },
      'DATE': {
        positive: [
          /\b(born|birth|dob|admission|discharge|visit|service)\b/,
          /\b(effective|expires?|issued|signed|dated)\b/,
        ],
        negative: [
          /\b(version|revision|updated|page|form)\b/,
          /\b(copyright|published)\b/,
        ],
      },
      'SSN': {
        positive: [
          /\b(social|security|ssn|ss#)\b/,
          /\b(identification|identity|verify)\b/,
        ],
        negative: [
          /\b(phone|fax|tel|ext)\b/,
          /\b(mrn|medical\s*record|account)\b/,
        ],
      },
    };

    const patterns = contextPatterns[phiType];
    if (!patterns) return null;

    let positiveScore = 0;
    let negativeScore = 0;

    for (const pattern of patterns.positive) {
      if (pattern.test(surroundingText)) positiveScore += 0.15;
    }

    for (const pattern of patterns.negative) {
      if (pattern.test(surroundingText)) negativeScore += 0.15;
    }

    const netScore = positiveScore - negativeScore;
    
    if (Math.abs(netScore) > 0.1) {
      return EnsembleVoter.contextSignal(
        0.5 + netScore, // Center around 0.5, adjust by net score
        netScore > 0 ? 'positive-context' : 'negative-context'
      );
    }

    return null;
  }

  /**
   * Clear document cache
   */
  clearCache(): void {
    this.documentCache.clear();
  }
}

// Export singleton accessor
export const enhancedDetector = EnhancedPHIDetector.getInstance();
