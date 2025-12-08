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
import { VoteSignal } from "./EnsembleVoter";
import { DocumentProfile } from "../context/DocumentStructureAnalyzer";
import { ChaosAnalysis } from "../utils/OcrChaosDetector";
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
    recommendation: "REDACT" | "SKIP" | "UNCERTAIN";
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
export declare class EnhancedPHIDetector {
    private static instance;
    private voter;
    private firstNameMatcher;
    private surnameMatcher;
    private initialized;
    private documentCache;
    private constructor();
    static getInstance(): EnhancedPHIDetector;
    /**
     * Initialize fuzzy dictionaries
     */
    init(): void;
    /**
     * Analyze a document once and cache results
     */
    analyzeDocument(text: string): {
        profile: DocumentProfile;
        chaos: ChaosAnalysis;
    };
    /**
     * MAIN METHOD: Evaluate a detection candidate with all signals
     */
    evaluate(candidate: DetectionCandidate, context: DetectionContext): EnhancedDetectionResult;
    /**
     * Batch evaluate multiple candidates (more efficient)
     */
    evaluateBatch(candidates: DetectionCandidate[], fullText: string): EnhancedDetectionResult[];
    /**
     * Quick filter: Should this candidate be redacted?
     */
    shouldRedact(candidate: DetectionCandidate, fullText: string, threshold?: number): boolean;
    private getDictionarySignal;
    private getLabelRelevance;
    private getChaosAdjustment;
    private getContextSignal;
    /**
     * Clear document cache
     */
    clearCache(): void;
}
export declare const enhancedDetector: EnhancedPHIDetector;
//# sourceMappingURL=EnhancedPHIDetector.d.ts.map