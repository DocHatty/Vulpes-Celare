/**
 * Confidence Modifier Service
 *
 * Adjusts span confidence based on surrounding context.
 * Based on Phileas's ConfidenceModifier architecture.
 *
 * MATHEMATICAL FOUNDATION:
 * 1. Sigmoid Smoothing - Prevents confidence from hitting hard boundaries
 *    Formula: smoothed = sigmoid(logit(c) + delta)
 *    This ensures smooth transitions and prevents 0/1 saturation
 *
 * 2. Multiplicative vs Additive Adjustments
 *    - MULTIPLY: c' = c * factor (preserves relative differences)
 *    - DELTA: c' = c + delta (absolute shift)
 *    - OVERRIDE: c' = value (hard set)
 *
 * 3. Confidence Bounds with Soft Clamping
 *    Formula: c_bounded = epsilon + (1 - 2*epsilon) * c
 *    Keeps confidence in (epsilon, 1-epsilon) to maintain uncertainty
 *
 * PERFORMANCE OPTIMIZATIONS (2024):
 * 1. Pre-computed Keyword Presence Map - O(1) lookup instead of O(k) per modifier
 * 2. Early Exit on Confidence Saturation - Skip modifiers when confidence is extreme
 * 3. Bloom Filter for fast keyword membership testing - 16-22x faster lookups
 * 4. Static regex compilation - Patterns compiled once at class load
 *
 * @module redaction/services
 */
import { Span, FilterType } from "../models/Span";
export declare enum ModifierConditionType {
    /** Check character sequence before span */
    CHARACTER_SEQUENCE_BEFORE = "CHARACTER_SEQUENCE_BEFORE",
    /** Check character sequence after span */
    CHARACTER_SEQUENCE_AFTER = "CHARACTER_SEQUENCE_AFTER",
    /** Check character sequence surrounding span (both before and after) */
    CHARACTER_SEQUENCE_SURROUNDING = "CHARACTER_SEQUENCE_SURROUNDING",
    /** Check regex pattern in surrounding context */
    CHARACTER_REGEX_SURROUNDING = "CHARACTER_REGEX_SURROUNDING",
    /** Check if window contains keywords */
    WINDOW_CONTAINS_KEYWORD = "WINDOW_CONTAINS_KEYWORD",
    /** Check if window matches pattern */
    WINDOW_MATCHES_PATTERN = "WINDOW_MATCHES_PATTERN"
}
export declare enum ModifierAction {
    /** Override confidence with fixed value */
    OVERRIDE = "OVERRIDE",
    /** Add delta to confidence (can be negative) */
    DELTA = "DELTA",
    /** Multiply confidence by factor */
    MULTIPLY = "MULTIPLY"
}
export interface ConfidenceModifier {
    /** Filter types this modifier applies to (empty = all) */
    filterTypes: FilterType[];
    /** Condition type */
    conditionType: ModifierConditionType;
    /** Condition value (string, regex, or keyword list) */
    conditionValue: string | RegExp | string[];
    /** Action to take if condition matches */
    action: ModifierAction;
    /** Value for the action (0.0-1.0 for OVERRIDE, ±delta for DELTA, multiplier for MULTIPLY) */
    value: number;
    /** Description of this modifier */
    description?: string;
}
/**
 * Pre-computed keyword presence for a span
 * Maps span ID -> Set of keywords present in window
 */
type KeywordPresenceMap = Map<string, Set<string>>;
/**
 * Confidence Modifier Service
 * Applies context-based confidence adjustments to spans
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Bloom filter for O(1) keyword membership testing
 * - Pre-computed keyword presence map per span batch
 * - Early exit when confidence reaches saturation thresholds
 * - Static regex patterns compiled once
 */
export declare class ConfidenceModifierService {
    private modifiers;
    private static readonly EPSILON;
    private static readonly LOGIT_CLAMP;
    private static readonly CONFIDENCE_CEILING;
    private static readonly CONFIDENCE_FLOOR;
    private keywordBloomFilter;
    private allKeywordsSet;
    constructor(modifiers?: ConfidenceModifier[]);
    /**
     * OPTIMIZATION: Build bloom filter and keyword set from all modifiers
     * Called once at construction and when modifiers change
     */
    private buildKeywordIndex;
    /**
     * Sigmoid function for smooth confidence transitions
     * Formula: sigmoid(x) = 1 / (1 + exp(-x))
     */
    private static sigmoid;
    /**
     * Logit function (inverse sigmoid)
     * Formula: logit(p) = ln(p / (1 - p))
     */
    private static logit;
    /**
     * Soft clamp confidence to avoid hard 0/1 boundaries
     * Keeps confidence in (epsilon, 1-epsilon) range
     * Formula: c_bounded = epsilon + (1 - 2*epsilon) * c
     */
    private static softClamp;
    /**
     * Apply sigmoid-smoothed delta adjustment
     * Instead of raw addition, applies delta in log-odds space for smoother transitions
     * Formula: result = sigmoid(logit(confidence) + scaledDelta)
     */
    private static sigmoidDelta;
    /**
     * Register default confidence modifiers for common patterns
     */
    private registerDefaultModifiers;
    /**
     * Add a custom confidence modifier
     */
    addModifier(modifier: ConfidenceModifier): void;
    /**
     * OPTIMIZATION: Generate unique span key for keyword presence map
     */
    private getSpanKey;
    /**
     * OPTIMIZATION: Pre-compute which keywords are present in each span's window
     * Uses bloom filter for fast pre-filtering, then exact match for candidates
     *
     * @param spans - Spans to analyze
     * @returns Map of span key -> Set of keywords present
     */
    private precomputeKeywordPresence;
    /**
     * Apply all confidence modifiers to a span
     * OPTIMIZED: Includes early exit on confidence saturation
     *
     * @param text - Full document text
     * @param span - Span to modify
     * @param keywordPresence - Pre-computed keyword presence (optional, for batch mode)
     * @returns Modified confidence value
     */
    applyModifiers(text: string, span: Span, keywordPresence?: KeywordPresenceMap): number;
    /**
     * Apply confidence modifiers to all spans
     * OPTIMIZED: Pre-computes keyword presence map for O(1) lookups
     *
     * @param text - Full document text
     * @param spans - Spans to modify
     */
    applyModifiersToAll(text: string, spans: Span[]): void;
    /**
     * OPTIMIZED: Evaluate condition using pre-computed keyword presence
     */
    private evaluateConditionOptimized;
    /**
     * OPTIMIZED: Check window keywords using pre-computed presence map
     * O(k) where k = keywords in modifier, instead of O(w * k) where w = window size
     */
    private checkWindowKeywordsOptimized;
    /**
     * Evaluate if a modifier's condition matches
     */
    private evaluateCondition;
    /**
     * Check characters before the span
     */
    private checkCharactersBefore;
    /**
     * Check characters after the span
     */
    private checkCharactersAfter;
    /**
     * Check characters surrounding the span
     */
    private checkCharactersSurrounding;
    /**
     * Check regex pattern in surrounding text
     */
    private checkRegexSurrounding;
    /**
     * Check if window contains keywords
     */
    private checkWindowKeywords;
    /**
     * Check if window matches pattern
     */
    private checkWindowPattern;
    /**
     * Apply action to confidence value with smooth transitions
     *
     * Mathematical approach:
     * - OVERRIDE: Direct set with soft clamping to avoid hard boundaries
     * - DELTA: Sigmoid-smoothed addition in log-odds space
     * - MULTIPLY: Standard multiplication with soft clamping
     */
    private applyAction;
    /**
     * Get all registered modifiers
     */
    getModifiers(): ConfidenceModifier[];
    /**
     * Clear all modifiers
     */
    clearModifiers(): void;
}
export {};
//# sourceMappingURL=ConfidenceModifierService.d.ts.map