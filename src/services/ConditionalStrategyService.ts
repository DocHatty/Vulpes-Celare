/**
 * Conditional Strategy Service - Policy-driven conditional execution
 *
 * Enables complex rules like:
 * - "Only redact if confidence > 0.8"
 * - "If context contains 'SSN', use encryption"
 * - "If token is birth date, shift by 10 years"
 *
 * Based on Phileas's conditional strategy system with simplified expression parsing.
 *
 * @module redaction/services
 */

import { Parser } from "../utils/stubs/expr-eval";
import { Span, FilterType } from "../models/Span";

export interface StrategyCondition {
  condition: string; // Expression to evaluate
  action: StrategyAction; // Action to take if condition is true
}

export enum StrategyActionType {
  REDACT = "REDACT",
  ENCRYPT = "ENCRYPT",
  MASK = "MASK",
  TRUNCATE = "TRUNCATE",
  HASH = "HASH",
  SKIP = "SKIP",
  ABBREVIATE = "ABBREVIATE",
  SHIFT_DATE = "SHIFT_DATE",
  RELATIVE_DATE = "RELATIVE_DATE",
}

export interface StrategyAction {
  type: StrategyActionType;
  parameters?: Record<string, any>;
}

/**
 * Conditional Strategy Service
 */
export class ConditionalStrategyService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  /**
   * Evaluate a condition expression
   *
   * Supported variables:
   * - confidence: span confidence (0.0 to 1.0)
   * - context: span context string
   * - token: span text
   * - filterType: span filter type
   * - length: span text length
   *
   * Supported operators:
   * - Comparison: ==, !=, <, <=, >, >=
   * - Logical: and, or, not
   * - String: contains(str, substr), startswith(str, prefix), endswith(str, suffix)
   */
  evaluateCondition(
    condition: string,
    span: Span,
    additionalContext?: Record<string, any>,
  ): boolean {
    try {
      // Build evaluation context
      const context: Record<string, any> = {
        confidence: span.confidence,
        context: span.context,
        token: span.text,
        filterType: span.filterType,
        length: span.text.length,

        // Helper functions
        contains: (str: string, substr: string) =>
          str.toLowerCase().includes(substr.toLowerCase()),
        startswith: (str: string, prefix: string) =>
          str.toLowerCase().startsWith(prefix.toLowerCase()),
        endswith: (str: string, suffix: string) =>
          str.toLowerCase().endsWith(suffix.toLowerCase()),

        // Additional context
        ...additionalContext,
      };

      // Parse and evaluate expression
      const expr = this.parser.parse(condition);
      const result = expr.evaluate(context);

      return Boolean(result);
    } catch (error) {
      console.error(
        `[ConditionalStrategy] Failed to evaluate condition "${condition}":`,
        error,
      );
      return false; // Fail closed - don't apply action if condition can't be evaluated
    }
  }

  /**
   * Evaluate all conditions and return the first matching action
   */
  evaluateConditions(
    conditions: StrategyCondition[],
    span: Span,
    additionalContext?: Record<string, any>,
  ): StrategyAction | null {
    for (const strategyCondition of conditions) {
      const matches = this.evaluateCondition(
        strategyCondition.condition,
        span,
        additionalContext,
      );

      if (matches) {
        console.log(
          `[ConditionalStrategy] Condition matched: "${strategyCondition.condition}" ` +
            `-> ${strategyCondition.action.type}`,
        );
        return strategyCondition.action;
      }
    }

    return null; // No conditions matched
  }

  /**
   * Create a simple condition (common patterns)
   */
  static createCondition(
    type: "confidence" | "context_contains" | "filter_type" | "length",
    value: any,
    operator?: string,
  ): string {
    switch (type) {
      case "confidence":
        return `confidence ${operator || ">"} ${value}`;

      case "context_contains":
        return `contains(context, "${value}")`;

      case "filter_type":
        return `filterType == "${value}"`;

      case "length":
        return `length ${operator || ">"} ${value}`;

      default:
        throw new Error(`Unknown condition type: ${type}`);
    }
  }

  /**
   * Create a strategy action
   */
  static createAction(
    type: StrategyActionType,
    parameters?: Record<string, any>,
  ): StrategyAction {
    return { type, parameters };
  }

  /**
   * Validate condition syntax
   */
  validateCondition(condition: string): { valid: boolean; error?: string } {
    try {
      this.parser.parse(condition);
      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || "Invalid condition syntax",
      };
    }
  }
}

/**
 * Pre-built condition templates
 */
export class ConditionTemplates {
  /**
   * High confidence only (>= 0.8)
   */
  static highConfidenceOnly(): string {
    return ConditionalStrategyService.createCondition("confidence", 0.8, ">=");
  }

  /**
   * Low confidence (< 0.5)
   */
  static lowConfidence(): string {
    return ConditionalStrategyService.createCondition("confidence", 0.5, "<");
  }

  /**
   * Context contains keyword
   */
  static contextContains(keyword: string): string {
    return ConditionalStrategyService.createCondition(
      "context_contains",
      keyword,
    );
  }

  /**
   * Specific filter type
   */
  static filterType(type: FilterType): string {
    return ConditionalStrategyService.createCondition("filter_type", type);
  }

  /**
   * SSN context
   */
  static ssnContext(): string {
    return `contains(context, "ssn") or contains(context, "social security")`;
  }

  /**
   * Phone context
   */
  static phoneContext(): string {
    return `contains(context, "phone") or contains(context, "call")`;
  }

  /**
   * Birth date context
   */
  static birthDateContext(): string {
    return `contains(context, "dob") or contains(context, "birth") or contains(context, "born")`;
  }

  /**
   * Medical record context
   */
  static medicalRecordContext(): string {
    return `contains(context, "mrn") or contains(context, "medical record")`;
  }

  /**
   * Short text (< 5 characters)
   */
  static shortText(): string {
    return ConditionalStrategyService.createCondition("length", 5, "<");
  }

  /**
   * Long text (>= 20 characters)
   */
  static longText(): string {
    return ConditionalStrategyService.createCondition("length", 20, ">=");
  }

  /**
   * Combine conditions with AND
   */
  static and(conditions: string[]): string {
    return `(${conditions.join(") and (")})`;
  }

  /**
   * Combine conditions with OR
   */
  static or(conditions: string[]): string {
    return `(${conditions.join(") or (")})`;
  }

  /**
   * Negate condition
   */
  static not(condition: string): string {
    return `not (${condition})`;
  }
}

/**
 * Strategy examples for common use cases
 */
export class StrategyExamples {
  /**
   * Encrypt high-confidence SSNs
   */
  static encryptHighConfidenceSSN(): StrategyCondition {
    return {
      condition: ConditionTemplates.and([
        ConditionTemplates.filterType(FilterType.SSN),
        ConditionTemplates.highConfidenceOnly(),
      ]),
      action: ConditionalStrategyService.createAction(
        StrategyActionType.ENCRYPT,
      ),
    };
  }

  /**
   * Skip low-confidence detections
   */
  static skipLowConfidence(): StrategyCondition {
    return {
      condition: ConditionTemplates.lowConfidence(),
      action: ConditionalStrategyService.createAction(StrategyActionType.SKIP),
    };
  }

  /**
   * Abbreviate names
   */
  static abbreviateNames(): StrategyCondition {
    return {
      condition: ConditionTemplates.filterType(FilterType.NAME),
      action: ConditionalStrategyService.createAction(
        StrategyActionType.ABBREVIATE,
      ),
    };
  }

  /**
   * Shift birth dates
   */
  static shiftBirthDates(): StrategyCondition {
    return {
      condition: ConditionTemplates.birthDateContext(),
      action: ConditionalStrategyService.createAction(
        StrategyActionType.SHIFT_DATE,
        {
          years: 10,
        },
      ),
    };
  }

  /**
   * Mask credit cards (keep last 4)
   */
  static maskCreditCards(): StrategyCondition {
    return {
      condition: ConditionTemplates.filterType(FilterType.CREDIT_CARD),
      action: ConditionalStrategyService.createAction(StrategyActionType.MASK, {
        keepLast: 4,
      }),
    };
  }
}
