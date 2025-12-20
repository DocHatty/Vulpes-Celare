/**
 * RelativeDateFilterSpan - Context-Aware Relative Temporal Expression Detection
 *
 * WIN-WIN STRATEGY:
 * - INCREASES SENSITIVITY: Detects relative dates that narrow down specific
 *   timeframes and are PHI under HIPAA ("yesterday", "last Tuesday", "2 weeks ago")
 * - INCREASES SPECIFICITY: Only matches in clinical context, preventing
 *   false positives on casual temporal references in non-clinical text
 *
 * HIPAA Note: Relative dates can narrow down specific dates when combined with
 * document dates, making them identifiers. For example, "admitted yesterday"
 * in a document dated 2024-03-15 = admitted 2024-03-14.
 *
 * Based on:
 * - i2b2 2014 temporal expression guidelines
 * - HIPAA Safe Harbor date requirements
 * - 2024-2025 clinical NLP best practices
 *
 * @module filters
 */

import { Span, FilterType } from "../models/Span";
import { SpanFactory } from "../core/SpanFactory";
import { SpanBasedFilter, FilterPriority } from "../core/SpanBasedFilter";
import { RedactionContext } from "../context/RedactionContext";
import {
  ClinicalContextDetector,
  RELATIVE_DATE_PATTERNS,
} from "../context/ClinicalContextDetector";
import { RustScanKernel } from "../utils/RustScanKernel";

/**
 * Additional relative date patterns not in ClinicalContextDetector
 */
const EXTENDED_RELATIVE_PATTERNS: {
  pattern: RegExp;
  baseConfidence: number;
  requiresContext: boolean;
  description: string;
}[] = [
  // Day of week references (narrow to specific date)
  {
    pattern:
      /\b(?:last|this|next)\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
    baseConfidence: 0.8,
    requiresContext: true,
    description: "Day of week reference",
  },
  {
    pattern:
      /\bon\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi,
    baseConfidence: 0.7,
    requiresContext: true,
    description: "Day reference",
  },

  // Specific relative day patterns
  {
    pattern: /\b(?:the\s+)?night\s+before\b/gi,
    baseConfidence: 0.75,
    requiresContext: true,
    description: "Night before reference",
  },
  {
    pattern: /\b(?:the\s+)?morning\s+of\b/gi,
    baseConfidence: 0.75,
    requiresContext: true,
    description: "Morning of reference",
  },
  {
    pattern: /\b(?:the\s+)?evening\s+of\b/gi,
    baseConfidence: 0.75,
    requiresContext: true,
    description: "Evening of reference",
  },

  // Admission/discharge relative
  {
    pattern: /\b(?:on|at)\s+(?:admission|discharge|presentation)\b/gi,
    baseConfidence: 0.85,
    requiresContext: false, // Already clinical
    description: "Admission/discharge reference",
  },
  {
    pattern:
      /\b(?:since|prior\s+to|before|after)\s+(?:admission|discharge|surgery|procedure)\b/gi,
    baseConfidence: 0.85,
    requiresContext: false,
    description: "Clinical event reference",
  },

  // Hospital day references
  {
    pattern: /\bhospital\s+day\s+\d+\b/gi,
    baseConfidence: 0.9,
    requiresContext: false,
    description: "Hospital day",
  },
  {
    pattern: /\bHD\s*#?\s*\d+\b/g,
    baseConfidence: 0.9,
    requiresContext: false,
    description: "Hospital day abbreviation",
  },

  // Illness day references
  {
    pattern: /\b(?:illness|symptom|sick)\s+day\s+\d+\b/gi,
    baseConfidence: 0.85,
    requiresContext: false,
    description: "Illness day",
  },

  // Time-bound phrases
  {
    pattern:
      /\b(?:within|over)\s+the\s+(?:past|last|next)\s+\d+\s+(?:hours?|days?|weeks?|months?)\b/gi,
    baseConfidence: 0.8,
    requiresContext: true,
    description: "Time-bound phrase",
  },
  {
    pattern:
      /\bfor\s+the\s+(?:past|last)\s+\d+\s+(?:hours?|days?|weeks?|months?)\b/gi,
    baseConfidence: 0.8,
    requiresContext: true,
    description: "Duration phrase",
  },

  // Recently/newly qualifiers with clinical actions
  {
    pattern:
      /\b(?:recently|newly)\s+(?:diagnosed|started|began|developed|admitted|discharged)\b/gi,
    baseConfidence: 0.8,
    requiresContext: false,
    description: "Recent clinical action",
  },

  // Appointment references
  {
    pattern:
      /\b(?:last|previous|prior|next|upcoming)\s+(?:visit|appointment|follow[- ]?up)\b/gi,
    baseConfidence: 0.8,
    requiresContext: true,
    description: "Appointment reference",
  },

  // Treatment course references
  {
    pattern: /\b(?:cycle|round|dose)\s+\d+\s+(?:of|day)\b/gi,
    baseConfidence: 0.85,
    requiresContext: false,
    description: "Treatment course",
  },

  // Trimester/gestational references (obstetric)
  {
    pattern: /\b(?:first|second|third)\s+trimester\b/gi,
    baseConfidence: 0.8,
    requiresContext: true,
    description: "Trimester reference",
  },
  {
    pattern: /\b\d+\s+weeks?\s+(?:gestation|gestational|pregnant|GA)\b/gi,
    baseConfidence: 0.9,
    requiresContext: false,
    description: "Gestational age",
  },
  {
    pattern: /\bGA\s+\d+[+]?\d*\s*(?:weeks?|wks?)?\b/gi,
    baseConfidence: 0.9,
    requiresContext: false,
    description: "Gestational age abbreviation",
  },

  // Age-narrowing expressions
  {
    pattern: /\b(?:at|around)\s+age\s+\d+\b/gi,
    baseConfidence: 0.75,
    requiresContext: true,
    description: "Age reference",
  },
  {
    pattern: /\bborn\s+in\s+\d{4}\b/gi,
    baseConfidence: 0.9,
    requiresContext: false, // Birth year is always PHI
    description: "Birth year",
  },

  // Academic/school year references (for pediatric)
  {
    pattern: /\b(?:fall|spring)\s+(?:semester|term)\s+\d{4}\b/gi,
    baseConfidence: 0.8,
    requiresContext: true,
    description: "Academic term",
  },

  // Life event markers
  {
    pattern:
      /\b(?:since|after|before)\s+(?:retirement|graduation|marriage|divorce)\b/gi,
    baseConfidence: 0.7,
    requiresContext: true,
    description: "Life event marker",
  },

  // Medication timing
  {
    pattern:
      /\b(?:started|stopped|discontinued)\s+\d+\s+(?:days?|weeks?|months?)\s+ago\b/gi,
    baseConfidence: 0.85,
    requiresContext: false,
    description: "Medication timing",
  },
];

export class RelativeDateFilterSpan extends SpanBasedFilter {
  /**
   * All patterns combined for efficient iteration
   */
  private static readonly ALL_PATTERNS = [
    ...RELATIVE_DATE_PATTERNS.map((p) => ({
      ...p,
      description: "Relative date",
    })),
    ...EXTENDED_RELATIVE_PATTERNS,
  ];

  getType(): string {
    return "DATE";
  }

  getPriority(): number {
    // Run after main date filter
    return FilterPriority.DATE + 10;
  }

  detect(text: string, _config: any, context: RedactionContext): Span[] {
    // Try Rust acceleration first
    const accelerated = RustScanKernel.getDetections(
      context,
      text,
      "RELATIVE_DATE",
    );
    if (accelerated && accelerated.length > 0) {
      return accelerated.map((d) => {
        return SpanFactory.fromPosition(text, d.characterStart, d.characterEnd, FilterType.DATE, {
          confidence: d.confidence,
          priority: this.getPriority(),
          pattern: d.pattern,
        });
      });
    }

    // TypeScript fallback
    const spans: Span[] = [];
    const seen = new Set<string>();

    for (const patternDef of RelativeDateFilterSpan.ALL_PATTERNS) {
      const pattern = patternDef.pattern;
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        const matchText = match[0];
        const start = match.index;
        const end = start + matchText.length;

        // Deduplication
        const key = `${start}-${end}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Context check if required
        if (patternDef.requiresContext) {
          const contextResult = ClinicalContextDetector.analyzeContext(
            text,
            start,
            matchText.length,
          );

          // Skip if no clinical context
          if (
            contextResult.strength === "NONE" ||
            contextResult.strength === "WEAK"
          ) {
            continue;
          }
        }

        // Calculate confidence with context boost
        let confidence = patternDef.baseConfidence;
        if (!patternDef.requiresContext) {
          // Already clinical, still apply small boost for strong context
          confidence +=
            ClinicalContextDetector.getContextConfidenceBoost(
              text,
              start,
              matchText.length,
            ) * 0.5;
        } else {
          confidence += ClinicalContextDetector.getContextConfidenceBoost(
            text,
            start,
            matchText.length,
          );
        }
        confidence = Math.min(0.95, confidence);

        const span = SpanFactory.fromPosition(text, start, end, FilterType.DATE, {
          confidence,
          priority: this.getPriority(),
          pattern: `Relative date: ${patternDef.description}`,
        });

        spans.push(span);
      }
    }

    return spans;
  }
}
