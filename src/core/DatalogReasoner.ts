/**
 * DatalogReasoner - Declarative Datalog-Style Constraint Solver
 *
 * Replaces the imperative CrossTypeReasoner with ~25 declarative rules.
 * Rules are self-documenting and provide full provenance for debugging.
 *
 * BENEFITS:
 * - Declarative: Rules describe WHAT, not HOW
 * - Provenance: Know exactly WHY each decision was made
 * - Extensible: Add new rules without code changes
 * - Testable: Test individual rules in isolation
 *
 * DATALOG SEMANTICS:
 * - Facts: Base assertions from detection (Detected, Nearby, SameText)
 * - Rules: Implications that derive new facts (Adjusted, Conflict)
 * - Negation as Failure: Only positive derivation supported
 *
 * FUTURE: This TypeScript implementation can be swapped for Rust Crepe
 * for 10-50x performance improvement on large documents.
 *
 * @module redaction/core
 */

import { Span, FilterType } from "../models/Span";
import { CrossTypeReasoner, ReasoningResult } from "./CrossTypeReasoner";

// ═══════════════════════════════════════════════════════════════════════════
// DATALOG FACTS (Input Relations)
// ═══════════════════════════════════════════════════════════════════════════

interface DetectedFact {
  spanId: number;
  filterType: FilterType;
  confidence: number;
  start: number;
  end: number;
  text: string;
}

interface NearbyFact {
  spanId1: number;
  spanId2: number;
  distance: number;
}

interface SameTextFact {
  spanId1: number;
  spanId2: number;
  normalizedText: string;
}

interface ContextFact {
  spanId: number;
  contextBefore: string;
  contextAfter: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATALOG RULES (Declarative Constraint Definitions)
// ═══════════════════════════════════════════════════════════════════════════

type RuleRelationship = "EXCLUSIVE" | "SUPPORTIVE";

interface Rule {
  name: string;
  type1: FilterType;
  type2: FilterType;
  relationship: RuleRelationship;
  strength: number;
  contextPattern?: RegExp;
  description: string;
}

interface Adjustment {
  spanId: number;
  delta: number;
  reason: string;
  ruleName: string;
}

interface Provenance {
  spanId: number;
  rules: string[];
  adjustments: Adjustment[];
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE DEFINITIONS (The "Datalog" part - declarative rules)
// ═══════════════════════════════════════════════════════════════════════════

const EXCLUSIVE_RULES: Rule[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // MUTUALLY EXCLUSIVE TYPES
  // If both detected nearby, penalize the lower-confidence one
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "SSN_PHONE_EXCLUSIVE",
    type1: FilterType.SSN,
    type2: FilterType.PHONE,
    relationship: "EXCLUSIVE",
    strength: 0.95,
    description: "SSN and phone are mutually exclusive digit patterns",
  },
  {
    name: "DATE_AGE_EXCLUSIVE",
    type1: FilterType.DATE,
    type2: FilterType.AGE,
    relationship: "EXCLUSIVE",
    strength: 0.90,
    description: "Date and age are mutually exclusive interpretations",
  },
  {
    name: "MRN_ZIPCODE_EXCLUSIVE",
    type1: FilterType.MRN,
    type2: FilterType.ZIPCODE,
    relationship: "EXCLUSIVE",
    strength: 0.80,
    description: "MRN and zipcode share 5-digit format",
  },
  {
    name: "PHONE_FAX_EXCLUSIVE",
    type1: FilterType.PHONE,
    type2: FilterType.FAX,
    relationship: "EXCLUSIVE",
    strength: 0.70,
    description: "Phone and fax share format",
  },
  {
    name: "DATE_MRN_EXCLUSIVE",
    type1: FilterType.DATE,
    type2: FilterType.MRN,
    relationship: "EXCLUSIVE",
    strength: 0.75,
    description: "Date and MRN format overlap",
  },
  {
    name: "NAME_ADDRESS_EXCLUSIVE",
    type1: FilterType.NAME,
    type2: FilterType.ADDRESS,
    relationship: "EXCLUSIVE",
    strength: 0.70,
    contextPattern: /\b(street|st|ave|avenue|road|rd|drive|dr|lane|ln|blvd|way)\b/i,
    description: "Name vs street address context",
  },
  {
    name: "ACCOUNT_CREDITCARD_EXCLUSIVE",
    type1: FilterType.ACCOUNT,
    type2: FilterType.CREDIT_CARD,
    relationship: "EXCLUSIVE",
    strength: 0.85,
    description: "Account and credit card format overlap",
  },
  {
    name: "IP_PHONE_EXCLUSIVE",
    type1: FilterType.IP,
    type2: FilterType.PHONE,
    relationship: "EXCLUSIVE",
    strength: 0.90,
    description: "IP address and phone format distinction",
  },
  {
    name: "NAME_MEDICATION_EXCLUSIVE",
    type1: FilterType.NAME,
    type2: FilterType.CUSTOM,
    relationship: "EXCLUSIVE",
    strength: 0.85,
    contextPattern: /\b(mg|mcg|tablet|daily|prn|prescribed)\b/i,
    description: "Name vs medication context conflict",
  },
  {
    name: "SSN_MRN_EXCLUSIVE",
    type1: FilterType.SSN,
    type2: FilterType.MRN,
    relationship: "EXCLUSIVE",
    strength: 0.85,
    description: "SSN and MRN are both identifier patterns",
  },
];

const SUPPORTIVE_RULES: Rule[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // MUTUALLY SUPPORTIVE TYPES
  // If both detected nearby, boost confidence of both
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: "NAME_DATE_DOB",
    type1: FilterType.NAME,
    type2: FilterType.DATE,
    relationship: "SUPPORTIVE",
    strength: 0.30,
    contextPattern: /\b(dob|date of birth|born|birthday)\b/i,
    description: "Name near DOB reinforces both",
  },
  {
    name: "NAME_MRN_PATIENT",
    type1: FilterType.NAME,
    type2: FilterType.MRN,
    relationship: "SUPPORTIVE",
    strength: 0.35,
    contextPattern: /\b(patient|mrn|medical record|chart)\b/i,
    description: "Name near MRN reinforces patient identity",
  },
  {
    name: "ADDRESS_ZIPCODE",
    type1: FilterType.ADDRESS,
    type2: FilterType.ZIPCODE,
    relationship: "SUPPORTIVE",
    strength: 0.40,
    description: "Address and zipcode typically co-occur",
  },
  {
    name: "PHONE_NAME_CONTACT",
    type1: FilterType.PHONE,
    type2: FilterType.NAME,
    relationship: "SUPPORTIVE",
    strength: 0.25,
    contextPattern: /\b(contact|call|phone|reach)\b/i,
    description: "Phone near name in contact context",
  },
  {
    name: "EMAIL_NAME",
    type1: FilterType.EMAIL,
    type2: FilterType.NAME,
    relationship: "SUPPORTIVE",
    strength: 0.30,
    description: "Email and name typically co-occur",
  },
  {
    name: "SSN_NAME_IDENTITY",
    type1: FilterType.SSN,
    type2: FilterType.NAME,
    relationship: "SUPPORTIVE",
    strength: 0.40,
    description: "SSN near name strongly indicates identity section",
  },
  {
    name: "PROVIDER_NPI",
    type1: FilterType.PROVIDER_NAME,
    type2: FilterType.NPI,
    relationship: "SUPPORTIVE",
    strength: 0.50,
    description: "Provider name and NPI reinforce healthcare provider identity",
  },
];

// Combine all rules
const ALL_RULES: Rule[] = [...EXCLUSIVE_RULES, ...SUPPORTIVE_RULES];

// ═══════════════════════════════════════════════════════════════════════════
// DATALOG ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export interface DatalogReasoningResult {
  spanId: number;
  adjustedConfidence: number;
  reason: string;
  provenance: Provenance;
}

export class DatalogReasoner {
  private static readonly PROXIMITY_WINDOW = 200;
  private static readonly CONSISTENCY_BOOST = 0.10;
  private static readonly CONFLICT_PENALTY = 0.25;

  // Fallback to imperative reasoner if needed
  private fallback: CrossTypeReasoner;
  private rules: Rule[];

  constructor() {
    this.fallback = new CrossTypeReasoner();
    this.rules = ALL_RULES;
  }

  /**
   * Add a custom rule at runtime
   */
  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  /**
   * Get all defined rules
   */
  getRules(): Rule[] {
    return [...this.rules];
  }

  /**
   * Main reasoning entry point
   */
  reason(spans: Span[], fullText: string): ReasoningResult[] {
    // Use Datalog engine if enabled, otherwise fallback
    if (!this.isDatalogEnabled()) {
      return this.fallback.reason(spans, fullText);
    }

    try {
      return this.runDatalogEngine(spans, fullText);
    } catch (e) {
      console.warn("[DatalogReasoner] Falling back to imperative:", e);
      return this.fallback.reason(spans, fullText);
    }
  }

  private isDatalogEnabled(): boolean {
    // Opt-in for now until fully validated
    return process.env.VULPES_USE_DATALOG === "1";
  }

  /**
   * Run the Datalog-style reasoning engine
   */
  private runDatalogEngine(spans: Span[], fullText: string): ReasoningResult[] {
    // Phase 1: Build input facts
    const detected = this.buildDetectedFacts(spans);
    const nearby = this.buildNearbyFacts(spans);
    const sameText = this.buildSameTextFacts(spans);
    const contexts = this.buildContextFacts(spans, fullText);

    // Phase 2: Derive adjustments by applying rules
    const adjustments = this.deriveAdjustments(
      detected,
      nearby,
      sameText,
      contexts
    );

    // Phase 3: Apply document-level consistency
    const consistencyAdjustments = this.deriveConsistencyAdjustments(
      detected,
      sameText
    );

    // Combine all adjustments
    const allAdjustments = [...adjustments, ...consistencyAdjustments];

    // Phase 4: Build provenance and apply to spans
    const provenanceMap = this.buildProvenanceMap(allAdjustments);
    const results = this.applyAdjustments(spans, provenanceMap);

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FACT BUILDERS
  // ─────────────────────────────────────────────────────────────────────────

  private buildDetectedFacts(spans: Span[]): DetectedFact[] {
    return spans.map((span, idx) => ({
      spanId: idx,
      filterType: span.filterType,
      confidence: span.confidence,
      start: span.characterStart,
      end: span.characterEnd,
      text: span.text,
    }));
  }

  private buildNearbyFacts(spans: Span[]): NearbyFact[] {
    const facts: NearbyFact[] = [];

    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        const s1 = spans[i];
        const s2 = spans[j];

        const distance = Math.min(
          Math.abs(s1.characterEnd - s2.characterStart),
          Math.abs(s2.characterEnd - s1.characterStart)
        );

        if (distance <= DatalogReasoner.PROXIMITY_WINDOW) {
          facts.push({ spanId1: i, spanId2: j, distance });
          facts.push({ spanId1: j, spanId2: i, distance }); // Symmetric
        }
      }
    }

    return facts;
  }

  private buildSameTextFacts(spans: Span[]): SameTextFact[] {
    const facts: SameTextFact[] = [];
    const textToSpans = new Map<string, number[]>();

    for (let i = 0; i < spans.length; i++) {
      const normalized = this.normalizeText(spans[i].text);
      if (!textToSpans.has(normalized)) {
        textToSpans.set(normalized, []);
      }
      textToSpans.get(normalized)!.push(i);
    }

    for (const [normalizedText, spanIds] of textToSpans.entries()) {
      if (spanIds.length > 1) {
        for (let i = 0; i < spanIds.length; i++) {
          for (let j = i + 1; j < spanIds.length; j++) {
            facts.push({
              spanId1: spanIds[i],
              spanId2: spanIds[j],
              normalizedText,
            });
          }
        }
      }
    }

    return facts;
  }

  private buildContextFacts(spans: Span[], fullText: string): ContextFact[] {
    return spans.map((span, idx) => {
      const beforeStart = Math.max(0, span.characterStart - 100);
      const afterEnd = Math.min(fullText.length, span.characterEnd + 100);

      return {
        spanId: idx,
        contextBefore: fullText.substring(beforeStart, span.characterStart),
        contextAfter: fullText.substring(span.characterEnd, afterEnd),
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE EVALUATION (The "inference" step)
  // ─────────────────────────────────────────────────────────────────────────

  private deriveAdjustments(
    detected: DetectedFact[],
    nearby: NearbyFact[],
    _sameText: SameTextFact[],
    contexts: ContextFact[]
  ): Adjustment[] {
    const adjustments: Adjustment[] = [];

    // Build lookup maps for efficient rule evaluation
    const detectedById = new Map(detected.map((d) => [d.spanId, d]));
    const contextById = new Map(contexts.map((c) => [c.spanId, c]));

    // For each rule, find matching fact combinations
    for (const rule of this.rules) {
      for (const nearbyFact of nearby) {
        const span1 = detectedById.get(nearbyFact.spanId1);
        const span2 = detectedById.get(nearbyFact.spanId2);

        if (!span1 || !span2) continue;

        // Check if this rule applies to this pair
        const matchesType1 =
          span1.filterType === rule.type1 && span2.filterType === rule.type2;
        const matchesType2 =
          span1.filterType === rule.type2 && span2.filterType === rule.type1;

        if (!matchesType1 && !matchesType2) continue;

        // Check context pattern if required
        if (rule.contextPattern) {
          const ctx1 = contextById.get(nearbyFact.spanId1);
          const ctx2 = contextById.get(nearbyFact.spanId2);
          const fullContext = `${ctx1?.contextBefore || ""} ${ctx1?.contextAfter || ""} ${ctx2?.contextBefore || ""} ${ctx2?.contextAfter || ""}`;

          if (!rule.contextPattern.test(fullContext)) continue;
        }

        // Apply the rule
        if (rule.relationship === "EXCLUSIVE") {
          // Penalize the lower-confidence span
          const lowerConfSpan =
            span1.confidence < span2.confidence ? span1 : span2;
          const penalty = rule.strength * DatalogReasoner.CONFLICT_PENALTY;

          adjustments.push({
            spanId: lowerConfSpan.spanId,
            delta: -penalty,
            reason: rule.description,
            ruleName: rule.name,
          });
        } else if (rule.relationship === "SUPPORTIVE") {
          // Boost both spans
          const boost = rule.strength * DatalogReasoner.CONSISTENCY_BOOST;

          adjustments.push({
            spanId: span1.spanId,
            delta: boost,
            reason: rule.description,
            ruleName: rule.name,
          });
          adjustments.push({
            spanId: span2.spanId,
            delta: boost,
            reason: rule.description,
            ruleName: rule.name,
          });
        }
      }
    }

    return adjustments;
  }

  private deriveConsistencyAdjustments(
    detected: DetectedFact[],
    sameText: SameTextFact[]
  ): Adjustment[] {
    const adjustments: Adjustment[] = [];
    const detectedById = new Map(detected.map((d) => [d.spanId, d]));

    // Group by normalized text
    const textGroups = new Map<string, number[]>();
    for (const fact of sameText) {
      if (!textGroups.has(fact.normalizedText)) {
        textGroups.set(fact.normalizedText, []);
      }
      const group = textGroups.get(fact.normalizedText)!;
      if (!group.includes(fact.spanId1)) group.push(fact.spanId1);
      if (!group.includes(fact.spanId2)) group.push(fact.spanId2);
    }

    // For each group, find dominant type and adjust
    for (const [normalizedText, spanIds] of textGroups.entries()) {
      if (spanIds.length < 2) continue;

      // Count types
      const typeCounts = new Map<FilterType, number>();
      for (const spanId of spanIds) {
        const span = detectedById.get(spanId);
        if (!span) continue;
        typeCounts.set(span.filterType, (typeCounts.get(span.filterType) || 0) + 1);
      }

      // Find dominant type
      let dominantType: FilterType | null = null;
      let maxCount = 0;
      for (const [type, count] of typeCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          dominantType = type;
        }
      }

      if (!dominantType || maxCount < 2) continue;

      // Boost spans matching dominant type, penalize others
      for (const spanId of spanIds) {
        const span = detectedById.get(spanId);
        if (!span) continue;

        if (span.filterType === dominantType) {
          adjustments.push({
            spanId,
            delta: DatalogReasoner.CONSISTENCY_BOOST,
            reason: `Consistent typing as ${dominantType} for "${normalizedText}"`,
            ruleName: "DOCUMENT_CONSISTENCY",
          });
        } else {
          adjustments.push({
            spanId,
            delta: -DatalogReasoner.CONFLICT_PENALTY * 0.5,
            reason: `Inconsistent typing vs dominant ${dominantType} for "${normalizedText}"`,
            ruleName: "DOCUMENT_CONSISTENCY",
          });
        }
      }
    }

    return adjustments;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROVENANCE AND OUTPUT
  // ─────────────────────────────────────────────────────────────────────────

  private buildProvenanceMap(adjustments: Adjustment[]): Map<number, Provenance> {
    const map = new Map<number, Provenance>();

    for (const adj of adjustments) {
      if (!map.has(adj.spanId)) {
        map.set(adj.spanId, {
          spanId: adj.spanId,
          rules: [],
          adjustments: [],
        });
      }

      const prov = map.get(adj.spanId)!;
      if (!prov.rules.includes(adj.ruleName)) {
        prov.rules.push(adj.ruleName);
      }
      prov.adjustments.push(adj);
    }

    return map;
  }

  private applyAdjustments(
    spans: Span[],
    provenanceMap: Map<number, Provenance>
  ): ReasoningResult[] {
    const results: ReasoningResult[] = [];

    for (let i = 0; i < spans.length; i++) {
      const span = spans[i];
      const provenance = provenanceMap.get(i);

      let totalDelta = 0;
      const reasoning: string[] = [];
      const constraintsApplied: string[] = [];

      if (provenance) {
        for (const adj of provenance.adjustments) {
          totalDelta += adj.delta;
          reasoning.push(adj.reason);
          if (!constraintsApplied.includes(adj.ruleName)) {
            constraintsApplied.push(adj.ruleName);
          }
        }
      }

      const adjustedConfidence = Math.max(0, Math.min(1, span.confidence + totalDelta));
      span.confidence = adjustedConfidence;

      results.push({
        span,
        originalType: span.filterType,
        resolvedType: span.filterType,
        originalConfidence: span.confidence - totalDelta,
        adjustedConfidence,
        reasoning,
        constraintsApplied,
      });
    }

    return results;
  }

  private normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, " ");
  }

  /**
   * Get statistics about the Datalog engine
   */
  getStatistics(): {
    totalRules: number;
    exclusiveRules: number;
    supportiveRules: number;
    isDatalogEnabled: boolean;
  } {
    return {
      totalRules: this.rules.length,
      exclusiveRules: this.rules.filter((r) => r.relationship === "EXCLUSIVE").length,
      supportiveRules: this.rules.filter((r) => r.relationship === "SUPPORTIVE").length,
      isDatalogEnabled: this.isDatalogEnabled(),
    };
  }
}

// Export singleton
export const datalogReasoner = new DatalogReasoner();
