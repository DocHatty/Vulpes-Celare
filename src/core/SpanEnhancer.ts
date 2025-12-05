/**
 * SpanEnhancer - Post-Processing Enhancement for Detected Spans
 *
 * This module applies the ensemble voting system to already-detected spans,
 * re-scoring them based on multiple signals:
 * - Original pattern confidence
 * - Dictionary match quality
 * - Document structure context
 * - Label proximity
 * - OCR chaos level
 *
 * This allows existing filters to continue working while getting
 * the benefit of multi-signal scoring.
 *
 * @module redaction/core
 */

import { Span, FilterType } from "../models/Span";
import { 
  EnhancedPHIDetector, 
  DetectionCandidate, 
  EnhancedDetectionResult,
  enhancedDetector 
} from "./EnhancedPHIDetector";

export interface EnhancementResult {
  span: Span;
  originalConfidence: number;
  enhancedConfidence: number;
  recommendation: 'REDACT' | 'SKIP' | 'UNCERTAIN';
  signals: string[];
  wasFiltered: boolean;
}

export interface EnhancementConfig {
  /** Minimum confidence to keep a span */
  minConfidence: number;
  /** PHI types to enhance (empty = all) */
  phiTypes: string[];
  /** Whether to modify original spans or just return recommendations */
  modifySpans: boolean;
}

const DEFAULT_CONFIG: EnhancementConfig = {
  minConfidence: 0.55,
  phiTypes: [], // All types
  modifySpans: true,
};

export class SpanEnhancer {
  private detector: EnhancedPHIDetector;
  private config: EnhancementConfig;

  constructor(config: Partial<EnhancementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.detector = enhancedDetector;
    this.detector.init();
  }

  /**
   * Enhance a single span with multi-signal scoring
   */
  enhanceSpan(span: Span, fullText: string): EnhancementResult {
    // Convert Span to DetectionCandidate
    const candidate: DetectionCandidate = {
      text: span.text,
      start: span.characterStart,
      end: span.characterEnd,
      phiType: span.filterType,
      patternName: span.pattern || 'unknown',
      baseConfidence: span.confidence,
    };

    // Get enhanced evaluation
    const result = this.detector.evaluate(candidate, { fullText });

    // Prepare result
    const enhancementResult: EnhancementResult = {
      span,
      originalConfidence: span.confidence,
      enhancedConfidence: result.finalConfidence,
      recommendation: result.recommendation,
      signals: result.signals.map(s => s.reason),
      wasFiltered: result.recommendation === 'SKIP',
    };

    // Update span if configured to do so
    if (this.config.modifySpans) {
      span.confidence = result.finalConfidence;
      
      // Add ensemble info to pattern description
      if (span.pattern) {
        span.pattern = `${span.pattern} [ensemble: ${result.recommendation}]`;
      }
    }

    return enhancementResult;
  }

  /**
   * Enhance multiple spans at once (more efficient - analyzes document once)
   */
  enhanceSpans(spans: Span[], fullText: string): EnhancementResult[] {
    if (spans.length === 0) return [];

    // Filter to applicable PHI types if specified
    const applicableSpans = this.config.phiTypes.length > 0
      ? spans.filter(s => this.config.phiTypes.includes(s.filterType))
      : spans;

    // Convert to candidates
    const candidates: DetectionCandidate[] = applicableSpans.map(span => ({
      text: span.text,
      start: span.characterStart,
      end: span.characterEnd,
      phiType: span.filterType,
      patternName: span.pattern || 'unknown',
      baseConfidence: span.confidence,
    }));

    // Batch evaluate
    const evaluations = this.detector.evaluateBatch(candidates, fullText);

    // Map back to results
    const results: EnhancementResult[] = [];
    
    for (let i = 0; i < applicableSpans.length; i++) {
      const span = applicableSpans[i];
      const evaluation = evaluations[i];

      const result: EnhancementResult = {
        span,
        originalConfidence: span.confidence,
        enhancedConfidence: evaluation.finalConfidence,
        recommendation: evaluation.recommendation,
        signals: evaluation.signals.map(s => s.reason),
        wasFiltered: evaluation.recommendation === 'SKIP',
      };

      if (this.config.modifySpans) {
        span.confidence = evaluation.finalConfidence;
        if (span.pattern) {
          span.pattern = `${span.pattern} [ensemble: ${evaluation.recommendation}]`;
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Filter spans based on enhanced confidence
   * Returns only spans that meet the confidence threshold
   */
  filterSpans(spans: Span[], fullText: string): Span[] {
    const enhancements = this.enhanceSpans(spans, fullText);
    
    return enhancements
      .filter(e => !e.wasFiltered && e.enhancedConfidence >= this.config.minConfidence)
      .map(e => e.span);
  }

  /**
   * Get detailed analysis of span quality
   */
  analyzeSpans(spans: Span[], fullText: string): {
    total: number;
    kept: number;
    filtered: number;
    uncertain: number;
    averageConfidenceChange: number;
    byType: { [type: string]: { kept: number; filtered: number } };
  } {
    const enhancements = this.enhanceSpans(spans, fullText);
    
    const byType: { [type: string]: { kept: number; filtered: number } } = {};
    let kept = 0;
    let filtered = 0;
    let uncertain = 0;
    let totalConfidenceChange = 0;

    for (const e of enhancements) {
      const type = e.span.filterType;
      if (!byType[type]) {
        byType[type] = { kept: 0, filtered: 0 };
      }

      if (e.recommendation === 'REDACT') {
        kept++;
        byType[type].kept++;
      } else if (e.recommendation === 'SKIP') {
        filtered++;
        byType[type].filtered++;
      } else {
        uncertain++;
        // Count uncertain as kept (conservative)
        byType[type].kept++;
      }

      totalConfidenceChange += e.enhancedConfidence - e.originalConfidence;
    }

    return {
      total: enhancements.length,
      kept,
      filtered,
      uncertain,
      averageConfidenceChange: enhancements.length > 0 
        ? totalConfidenceChange / enhancements.length 
        : 0,
      byType,
    };
  }
}

// Export singleton for convenience
export const spanEnhancer = new SpanEnhancer();
