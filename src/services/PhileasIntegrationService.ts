/**
 * Phileas Integration Service
 *
 * Bridges the existing token-based redaction system with Phileas advanced features:
 * - Span disambiguation
 * - Context analysis
 * - Post-filtering
 * - Conditional strategies
 *
 * This service processes the results from existing filters and enhances them
 * without breaking the current pipeline.
 *
 * @module redaction/services
 */

import { Span, FilterType, SpanUtils } from "../models/Span";
import { SpanDisambiguationService } from "./SpanDisambiguationService";
import { ContextWindowService } from "./ContextWindowService";
import { PostFilterPipeline } from "./PostFilterPipeline";
import {
  ConditionalStrategyService,
  StrategyCondition,
} from "./ConditionalStrategyService";
import { RedactionContext } from "../RedactionEngine";

/**
 * Configuration for Phileas processing
 */
export interface PhileasConfig {
  enableDisambiguation: boolean;
  enableContextAnalysis: boolean;
  enablePostFiltering: boolean;
  enableConditionalStrategies: boolean;
  conditionalRules?: StrategyCondition[];
}

/**
 * Phileas Integration Service
 * Enhances existing redaction with advanced Phileas features
 */
export class PhileasIntegrationService {
  private disambiguator: SpanDisambiguationService;
  private contextService: ContextWindowService;
  private postFilterPipeline: PostFilterPipeline;
  private strategyService: ConditionalStrategyService;
  private config: PhileasConfig;

  constructor(config?: Partial<PhileasConfig>) {
    this.config = {
      enableDisambiguation: config?.enableDisambiguation ?? true,
      enableContextAnalysis: config?.enableContextAnalysis ?? true,
      enablePostFiltering: config?.enablePostFiltering ?? true,
      enableConditionalStrategies: config?.enableConditionalStrategies ?? false,
      conditionalRules: config?.conditionalRules ?? [],
    };

    this.disambiguator = new SpanDisambiguationService();
    this.contextService = new ContextWindowService(5); // 5 tokens of context
    this.postFilterPipeline = new PostFilterPipeline();
    this.strategyService = new ConditionalStrategyService();
  }

  /**
   * Extract spans from tokenized text
   * Converts existing token-based redactions into Span objects
   */
  extractSpansFromTokenizedText(
    originalText: string,
    tokenizedText: string,
    context: RedactionContext,
  ): Span[] {
    const spans: Span[] = [];
    const tokenPattern = /\{\{([A-Z]+)_([^}]+)\}\}/g;
    let match;

    while ((match = tokenPattern.exec(tokenizedText)) !== null) {
      const token = match[0];
      const filterType = match[1] as FilterType;
      const tokenStart = match.index;
      const tokenEnd = tokenStart + token.length;

      // Get original value from context
      const originalValue = context.getOriginalValue(token);
      if (!originalValue) continue;

      // Find position in original text
      const positionInOriginal = this.findOriginalPosition(
        originalText,
        tokenizedText,
        tokenStart,
        originalValue,
      );

      if (positionInOriginal === -1) continue;

      // Extract context window
      const window = this.contextService.getWindow(
        originalText,
        positionInOriginal,
        positionInOriginal + originalValue.length,
      );

      // Create span
      const span = new Span({
        text: originalValue,
        originalValue: originalValue,
        characterStart: positionInOriginal,
        characterEnd: positionInOriginal + originalValue.length,
        filterType: filterType,
        confidence: 0.9, // High confidence from regex match
        priority: this.getFilterPriority(filterType),
        context: window.text,
        window: window.full,
        replacement: token,
        salt: null,
        pattern: null,
        applied: true,
        ignored: false,
        ambiguousWith: [],
        disambiguationScore: null,
      });

      spans.push(span);
    }

    return spans;
  }

  /**
   * Process spans through Phileas pipeline
   * Applies disambiguation, context analysis, post-filtering, and conditional strategies
   */
  processSpans(originalText: string, spans: Span[]): Span[] {
    let processedSpans = [...spans];

    // Step 1: Post-filtering (remove invalid spans, clean up)
    if (this.config.enablePostFiltering) {
      processedSpans = this.postFilterPipeline.processAll(
        originalText,
        processedSpans,
      );
      console.log(
        `[Phileas] Post-filtering: ${spans.length} -> ${processedSpans.length} spans`,
      );
    }

    // Step 2: Context analysis (enhance confidence scores)
    if (this.config.enableContextAnalysis) {
      for (const span of processedSpans) {
        const contextScore = this.analyzeContext(span);
        span.confidence = Math.min(1.0, span.confidence * contextScore);
      }
    }

    // Step 3: Disambiguation (resolve overlaps and ambiguities)
    if (this.config.enableDisambiguation) {
      processedSpans = this.resolveAmbiguities(processedSpans);
    }

    // Step 4: Conditional strategies (apply policy-driven decisions)
    if (
      this.config.enableConditionalStrategies &&
      this.config.conditionalRules &&
      this.config.conditionalRules.length > 0
    ) {
      processedSpans = this.applyConditionalStrategies(processedSpans);
    }

    return processedSpans;
  }

  /**
   * Analyze context to adjust confidence score
   */
  private analyzeContext(span: Span): number {
    let score = 1.0;

    // Boost confidence for spans with strong context indicators
    switch (span.filterType) {
      case FilterType.SSN:
        if (this.contextService.isSSNContext({ full: span.window } as any)) {
          score *= 1.2;
        }
        break;

      case FilterType.DATE:
        if (
          this.contextService.isBirthDateContext({ full: span.window } as any)
        ) {
          score *= 1.1;
        }
        break;

      case FilterType.PHONE:
        if (this.contextService.isPhoneContext({ full: span.window } as any)) {
          score *= 1.15;
        }
        break;

      case FilterType.NAME:
        // Lower confidence if context suggests it's not a person name
        const contextText = span.context.toLowerCase();
        if (
          contextText.includes("hospital") ||
          contextText.includes("clinic") ||
          contextText.includes("medical")
        ) {
          score *= 0.8;
        }
        break;
    }

    return score;
  }

  /**
   * Resolve ambiguities using disambiguation service
   */
  private resolveAmbiguities(spans: Span[]): Span[] {
    // Group identical spans (same position)
    const groups = SpanUtils.getIdenticalSpanGroups(spans);
    const resolvedSpans: Span[] = [];

    for (const group of groups) {
      if (group.length === 1) {
        // No ambiguity
        resolvedSpans.push(group[0]);
      } else {
        // Multiple spans at same position - disambiguate
        const winner = this.disambiguator.disambiguate(group);
        if (winner) {
          resolvedSpans.push(winner);
        }
      }
    }

    // Remove overlaps
    return SpanUtils.dropOverlappingSpans(resolvedSpans);
  }

  /**
   * Apply conditional strategies to determine which spans to keep
   */
  private applyConditionalStrategies(spans: Span[]): Span[] {
    const filtered: Span[] = [];

    for (const span of spans) {
      const action = this.strategyService.evaluateConditions(
        this.config.conditionalRules!,
        span,
      );

      if (action?.type === "SKIP") {
        console.log(`[Phileas] Skipping span based on strategy: ${span.text}`);
        continue;
      }

      filtered.push(span);
    }

    return filtered;
  }

  /**
   * Find original position of a value in text
   */
  private findOriginalPosition(
    originalText: string,
    tokenizedText: string,
    tokenStart: number,
    originalValue: string,
  ): number {
    // Simple heuristic: search near the token position
    const searchStart = Math.max(0, tokenStart - 100);
    const searchEnd = Math.min(originalText.length, tokenStart + 100);
    const searchRegion = originalText.substring(searchStart, searchEnd);

    const pos = searchRegion.indexOf(originalValue);
    if (pos !== -1) {
      return searchStart + pos;
    }

    // Fallback: search entire text
    return originalText.indexOf(originalValue);
  }

  /**
   * Get priority for filter type
   */
  private getFilterPriority(filterType: FilterType): number {
    const priorities: Record<string, number> = {
      SSN: 10,
      CREDITCARD: 10,
      DATE: 8,
      PHONE: 7,
      EMAIL: 7,
      NAME: 6,
      ADDRESS: 5,
      ZIPCODE: 4,
    };

    return priorities[filterType] || 5;
  }

  /**
   * Get configuration
   */
  getConfig(): PhileasConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PhileasConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
