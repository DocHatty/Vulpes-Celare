/**
 * Confidence Modifier Service
 *
 * Adjusts span confidence based on surrounding context.
 * Based on Phileas's ConfidenceModifier architecture.
 *
 * @module redaction/services
 */

import { Span, FilterType } from "../models/Span";
import { WindowService } from "./WindowService";

export enum ModifierConditionType {
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
  WINDOW_MATCHES_PATTERN = "WINDOW_MATCHES_PATTERN",
}

export enum ModifierAction {
  /** Override confidence with fixed value */
  OVERRIDE = "OVERRIDE",

  /** Add delta to confidence (can be negative) */
  DELTA = "DELTA",

  /** Multiply confidence by factor */
  MULTIPLY = "MULTIPLY",
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
 * Confidence Modifier Service
 * Applies context-based confidence adjustments to spans
 */
export class ConfidenceModifierService {
  private modifiers: ConfidenceModifier[] = [];

  constructor(modifiers: ConfidenceModifier[] = []) {
    this.modifiers = modifiers;
    this.registerDefaultModifiers();
  }

  /**
   * Register default confidence modifiers for common patterns
   */
  private registerDefaultModifiers(): void {
    // SSN context boosting
    this.addModifier({
      filterTypes: [FilterType.SSN],
      conditionType: ModifierConditionType.WINDOW_CONTAINS_KEYWORD,
      conditionValue: ["ssn", "social", "security"],
      action: ModifierAction.MULTIPLY,
      value: 1.2,
      description: "Boost SSN confidence when 'SSN' keyword in context",
    });

    // Phone context boosting
    this.addModifier({
      filterTypes: [FilterType.PHONE],
      conditionType: ModifierConditionType.WINDOW_CONTAINS_KEYWORD,
      conditionValue: ["phone", "tel", "telephone", "mobile", "cell"],
      action: ModifierAction.MULTIPLY,
      value: 1.15,
      description: "Boost phone confidence when phone-related keywords present",
    });

    // Email context boosting
    this.addModifier({
      filterTypes: [FilterType.EMAIL],
      conditionType: ModifierConditionType.WINDOW_CONTAINS_KEYWORD,
      conditionValue: ["email", "e-mail", "contact"],
      action: ModifierAction.MULTIPLY,
      value: 1.1,
      description: "Boost email confidence when email keywords present",
    });

    // MRN context boosting
    this.addModifier({
      filterTypes: [FilterType.MRN],
      conditionType: ModifierConditionType.WINDOW_CONTAINS_KEYWORD,
      conditionValue: ["mrn", "medical", "record", "patient"],
      action: ModifierAction.MULTIPLY,
      value: 1.25,
      description: "Boost MRN confidence in medical context",
    });

    // Date context: "DOB" or "birthday" suggests birthdate
    this.addModifier({
      filterTypes: [FilterType.DATE],
      conditionType: ModifierConditionType.WINDOW_CONTAINS_KEYWORD,
      conditionValue: ["dob", "birthday", "birth", "born"],
      action: ModifierAction.MULTIPLY,
      value: 1.3,
      description: "Boost date confidence for birthdates",
    });

    // Address context boosting
    this.addModifier({
      filterTypes: [FilterType.ADDRESS],
      conditionType: ModifierConditionType.WINDOW_CONTAINS_KEYWORD,
      conditionValue: ["address", "street", "ave", "road", "blvd"],
      action: ModifierAction.MULTIPLY,
      value: 1.2,
      description: "Boost address confidence with street keywords",
    });

    // Name preceded by title: "Dr. John" or "Mr. Smith"
    this.addModifier({
      filterTypes: [FilterType.NAME],
      conditionType: ModifierConditionType.CHARACTER_SEQUENCE_BEFORE,
      conditionValue: /\b(Dr|Mr|Mrs|Ms|Miss|Prof|Professor)\.\s*$/i,
      action: ModifierAction.MULTIPLY,
      value: 1.4,
      description: "Boost name confidence when preceded by title",
    });

    // Name in patient context
    this.addModifier({
      filterTypes: [FilterType.NAME],
      conditionType: ModifierConditionType.WINDOW_CONTAINS_KEYWORD,
      conditionValue: ["patient", "doctor", "dr", "nurse", "physician"],
      action: ModifierAction.MULTIPLY,
      value: 1.15,
      description: "Boost name confidence in medical personnel context",
    });

    // Credit card context
    this.addModifier({
      filterTypes: [FilterType.CREDIT_CARD],
      conditionType: ModifierConditionType.WINDOW_CONTAINS_KEYWORD,
      conditionValue: ["card", "credit", "visa", "mastercard", "amex"],
      action: ModifierAction.MULTIPLY,
      value: 1.25,
      description: "Boost credit card confidence with card keywords",
    });

    // Penalize short names without clear context
    this.addModifier({
      filterTypes: [FilterType.NAME],
      conditionType: ModifierConditionType.CHARACTER_SEQUENCE_SURROUNDING,
      conditionValue: /^[A-Z][a-z]{1,3}$/,
      action: ModifierAction.MULTIPLY,
      value: 0.7,
      description: "Reduce confidence for very short names (likely false positive)",
    });
  }

  /**
   * Add a custom confidence modifier
   */
  addModifier(modifier: ConfidenceModifier): void {
    this.modifiers.push(modifier);
  }

  /**
   * Apply all confidence modifiers to a span
   *
   * @param text - Full document text
   * @param span - Span to modify
   * @returns Modified confidence value
   */
  applyModifiers(text: string, span: Span): number {
    let confidence = span.confidence;

    for (const modifier of this.modifiers) {
      // Check if modifier applies to this filter type
      if (
        modifier.filterTypes.length > 0 &&
        !modifier.filterTypes.includes(span.filterType)
      ) {
        continue;
      }

      // Evaluate condition
      if (this.evaluateCondition(text, span, modifier)) {
        // Apply action
        confidence = this.applyAction(confidence, modifier);
      }
    }

    // Clamp confidence to [0.0, 1.0]
    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Apply confidence modifiers to all spans
   *
   * @param text - Full document text
   * @param spans - Spans to modify
   */
  applyModifiersToAll(text: string, spans: Span[]): void {
    for (const span of spans) {
      span.confidence = this.applyModifiers(text, span);
    }
  }

  /**
   * Evaluate if a modifier's condition matches
   */
  private evaluateCondition(
    text: string,
    span: Span,
    modifier: ConfidenceModifier,
  ): boolean {
    switch (modifier.conditionType) {
      case ModifierConditionType.CHARACTER_SEQUENCE_BEFORE:
        return this.checkCharactersBefore(text, span, modifier.conditionValue);

      case ModifierConditionType.CHARACTER_SEQUENCE_AFTER:
        return this.checkCharactersAfter(text, span, modifier.conditionValue);

      case ModifierConditionType.CHARACTER_SEQUENCE_SURROUNDING:
        return this.checkCharactersSurrounding(
          text,
          span,
          modifier.conditionValue,
        );

      case ModifierConditionType.CHARACTER_REGEX_SURROUNDING:
        return this.checkRegexSurrounding(text, span, modifier.conditionValue);

      case ModifierConditionType.WINDOW_CONTAINS_KEYWORD:
        return this.checkWindowKeywords(span, modifier.conditionValue);

      case ModifierConditionType.WINDOW_MATCHES_PATTERN:
        return this.checkWindowPattern(span, modifier.conditionValue);

      default:
        return false;
    }
  }

  /**
   * Check characters before the span
   */
  private checkCharactersBefore(
    text: string,
    span: Span,
    value: string | RegExp | string[],
  ): boolean {
    const beforeText = text.substring(
      Math.max(0, span.characterStart - 50),
      span.characterStart,
    );

    if (value instanceof RegExp) {
      return value.test(beforeText);
    }

    if (typeof value === "string") {
      return beforeText.endsWith(value);
    }

    return false;
  }

  /**
   * Check characters after the span
   */
  private checkCharactersAfter(
    text: string,
    span: Span,
    value: string | RegExp | string[],
  ): boolean {
    const afterText = text.substring(
      span.characterEnd,
      Math.min(text.length, span.characterEnd + 50),
    );

    if (value instanceof RegExp) {
      return value.test(afterText);
    }

    if (typeof value === "string") {
      return afterText.startsWith(value);
    }

    return false;
  }

  /**
   * Check characters surrounding the span
   */
  private checkCharactersSurrounding(
    text: string,
    span: Span,
    value: string | RegExp | string[],
  ): boolean {
    const surroundingText =
      text.substring(
        Math.max(0, span.characterStart - 50),
        span.characterStart,
      ) +
      span.text +
      text.substring(
        span.characterEnd,
        Math.min(text.length, span.characterEnd + 50),
      );

    if (value instanceof RegExp) {
      return value.test(surroundingText);
    }

    if (typeof value === "string") {
      return surroundingText.includes(value);
    }

    return false;
  }

  /**
   * Check regex pattern in surrounding text
   */
  private checkRegexSurrounding(
    text: string,
    span: Span,
    value: string | RegExp | string[],
  ): boolean {
    if (!(value instanceof RegExp)) {
      return false;
    }

    const surroundingText =
      text.substring(
        Math.max(0, span.characterStart - 100),
        span.characterStart,
      ) +
      span.text +
      text.substring(
        span.characterEnd,
        Math.min(text.length, span.characterEnd + 100),
      );

    return value.test(surroundingText);
  }

  /**
   * Check if window contains keywords
   */
  private checkWindowKeywords(
    span: Span,
    value: string | RegExp | string[],
  ): boolean {
    if (!Array.isArray(value)) {
      return false;
    }

    return WindowService.containsKeyword(span.window, value);
  }

  /**
   * Check if window matches pattern
   */
  private checkWindowPattern(
    span: Span,
    value: string | RegExp | string[],
  ): boolean {
    if (!(value instanceof RegExp)) {
      return false;
    }

    const windowText = span.window.join(" ");
    return value.test(windowText);
  }

  /**
   * Apply action to confidence value
   */
  private applyAction(
    confidence: number,
    modifier: ConfidenceModifier,
  ): number {
    switch (modifier.action) {
      case ModifierAction.OVERRIDE:
        return modifier.value;

      case ModifierAction.DELTA:
        return confidence + modifier.value;

      case ModifierAction.MULTIPLY:
        return confidence * modifier.value;

      default:
        return confidence;
    }
  }

  /**
   * Get all registered modifiers
   */
  getModifiers(): ConfidenceModifier[] {
    return [...this.modifiers];
  }

  /**
   * Clear all modifiers
   */
  clearModifiers(): void {
    this.modifiers = [];
  }
}
