"use strict";
/**
 * CrossTypeReasoner - Comprehensive Cross-PHI-Type Reasoning Engine
 *
 * Implements constraint solving and mutual exclusion logic across all PHI types.
 * When one PHI type is detected, it can inform or contradict other types.
 *
 * RESEARCH BASIS:
 * - Constraint Propagation (Waltz, 1975)
 * - Belief Revision (Alchourrón, Gärdenfors, Makinson, 1985)
 * - Mutual Information for feature correlation
 *
 * REASONING RULES:
 * 1. Mutual Exclusion: Some types cannot coexist at same position
 * 2. Mutual Support: Some types reinforce each other
 * 3. Context Propagation: Detecting one type informs nearby spans
 * 4. Document-Level Consistency: Same entity should have same type throughout
 *
 * @module redaction/core
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.crossTypeReasoner = exports.CrossTypeReasoner = void 0;
const Span_1 = require("../models/Span");
/**
 * CrossTypeReasoner - Main reasoning class
 */
class CrossTypeReasoner {
    constraints = [];
    entityTracker = new Map();
    // Reasoning parameters
    static CONSISTENCY_BOOST = 0.15;
    static CONFLICT_PENALTY = 0.25;
    static MIN_CONFIDENCE_THRESHOLD = 0.3;
    static PROXIMITY_WINDOW = 200; // characters
    constructor() {
        this.initializeConstraints();
    }
    /**
     * Initialize built-in type constraints
     */
    initializeConstraints() {
        // ═══════════════════════════════════════════════════════════════════════
        // MUTUAL EXCLUSION CONSTRAINTS
        // These types cannot both be true for the same text
        // ═══════════════════════════════════════════════════════════════════════
        // DATE vs AGE - "42" could be age or part of date
        this.constraints.push({
            type1: Span_1.FilterType.DATE,
            type2: Span_1.FilterType.AGE,
            relationship: "EXCLUSIVE",
            strength: 0.9,
            reason: "Date and age are mutually exclusive interpretations",
        });
        // NAME vs MEDICATION - "Wilson" could be name or Wilson's disease
        this.constraints.push({
            type1: Span_1.FilterType.NAME,
            type2: Span_1.FilterType.CUSTOM, // Used for MEDICATION
            relationship: "EXCLUSIVE",
            strength: 0.85,
            contextRequired: /\b(mg|mcg|tablet|daily|prn|prescribed)\b/i,
            reason: "Name vs medication context conflict",
        });
        // SSN vs PHONE - Both are digit sequences
        this.constraints.push({
            type1: Span_1.FilterType.SSN,
            type2: Span_1.FilterType.PHONE,
            relationship: "EXCLUSIVE",
            strength: 0.95,
            reason: "SSN and phone are mutually exclusive formats",
        });
        // MRN vs ZIPCODE - Both can be 5-digit numbers
        this.constraints.push({
            type1: Span_1.FilterType.MRN,
            type2: Span_1.FilterType.ZIPCODE,
            relationship: "EXCLUSIVE",
            strength: 0.8,
            reason: "MRN and zipcode format overlap",
        });
        // PHONE vs FAX - Often same format
        this.constraints.push({
            type1: Span_1.FilterType.PHONE,
            type2: Span_1.FilterType.FAX,
            relationship: "EXCLUSIVE",
            strength: 0.7,
            reason: "Phone and fax share format",
        });
        // DATE vs MRN - Dates can look like MRN numbers
        this.constraints.push({
            type1: Span_1.FilterType.DATE,
            type2: Span_1.FilterType.MRN,
            relationship: "EXCLUSIVE",
            strength: 0.75,
            reason: "Date and MRN format overlap",
        });
        // NAME vs ADDRESS - Street names can look like person names
        this.constraints.push({
            type1: Span_1.FilterType.NAME,
            type2: Span_1.FilterType.ADDRESS,
            relationship: "EXCLUSIVE",
            strength: 0.7,
            contextRequired: /\b(street|st|ave|avenue|road|rd|drive|dr|lane|ln|blvd|way)\b/i,
            reason: "Name vs street address context",
        });
        // ACCOUNT vs CREDIT_CARD - Both are long digit sequences
        this.constraints.push({
            type1: Span_1.FilterType.ACCOUNT,
            type2: Span_1.FilterType.CREDIT_CARD,
            relationship: "EXCLUSIVE",
            strength: 0.85,
            reason: "Account and credit card format overlap",
        });
        // IP vs PHONE - Both can have similar digit patterns
        this.constraints.push({
            type1: Span_1.FilterType.IP,
            type2: Span_1.FilterType.PHONE,
            relationship: "EXCLUSIVE",
            strength: 0.9,
            reason: "IP address and phone format distinction",
        });
        // ═══════════════════════════════════════════════════════════════════════
        // MUTUAL SUPPORT CONSTRAINTS
        // These types reinforce each other when found together
        // ═══════════════════════════════════════════════════════════════════════
        // NAME + DATE (DOB context)
        this.constraints.push({
            type1: Span_1.FilterType.NAME,
            type2: Span_1.FilterType.DATE,
            relationship: "SUPPORTIVE",
            strength: 0.3,
            contextRequired: /\b(dob|date of birth|born|birthday)\b/i,
            reason: "Name near DOB reinforces both",
        });
        // NAME + MRN (patient context)
        this.constraints.push({
            type1: Span_1.FilterType.NAME,
            type2: Span_1.FilterType.MRN,
            relationship: "SUPPORTIVE",
            strength: 0.35,
            contextRequired: /\b(patient|mrn|medical record|chart)\b/i,
            reason: "Name near MRN reinforces patient identity",
        });
        // ADDRESS + ZIPCODE
        this.constraints.push({
            type1: Span_1.FilterType.ADDRESS,
            type2: Span_1.FilterType.ZIPCODE,
            relationship: "SUPPORTIVE",
            strength: 0.4,
            reason: "Address and zipcode typically co-occur",
        });
        // PHONE + NAME (contact context)
        this.constraints.push({
            type1: Span_1.FilterType.PHONE,
            type2: Span_1.FilterType.NAME,
            relationship: "SUPPORTIVE",
            strength: 0.25,
            contextRequired: /\b(contact|call|phone|reach)\b/i,
            reason: "Phone near name in contact context",
        });
        // EMAIL + NAME
        this.constraints.push({
            type1: Span_1.FilterType.EMAIL,
            type2: Span_1.FilterType.NAME,
            relationship: "SUPPORTIVE",
            strength: 0.3,
            reason: "Email and name typically co-occur",
        });
        // SSN + NAME + DATE (identity triple)
        this.constraints.push({
            type1: Span_1.FilterType.SSN,
            type2: Span_1.FilterType.NAME,
            relationship: "SUPPORTIVE",
            strength: 0.4,
            reason: "SSN near name strongly indicates identity section",
        });
    }
    /**
     * Add custom constraint
     */
    addConstraint(constraint) {
        this.constraints.push(constraint);
    }
    /**
     * Apply cross-type reasoning to a set of spans
     */
    reason(spans, fullText) {
        const results = [];
        // MEMORY LEAK FIX: Always clear entity tracker at start AND use try/finally
        // to ensure cleanup even if an error occurs during processing
        this.entityTracker.clear();
        try {
            // Phase 1: Build entity occurrence map
            this.buildEntityMap(spans);
            // Phase 2: Apply document-level consistency
            this.applyDocumentConsistency(spans);
            // Phase 3: Apply pairwise constraints
            for (const span of spans) {
                const result = this.applyConstraints(span, spans, fullText);
                results.push(result);
            }
            // Phase 4: Resolve remaining conflicts
            this.resolveConflicts(results, fullText);
            return results;
        }
        finally {
            // MEMORY LEAK FIX: Always clear after processing to prevent
            // accumulation in long-running processes
            this.entityTracker.clear();
        }
    }
    /**
     * Clear entity tracker - call this between documents in batch processing
     * or when done with a processing session
     */
    clearEntityTracker() {
        this.entityTracker.clear();
    }
    /**
     * Build map of entity occurrences across document
     */
    buildEntityMap(spans) {
        for (const span of spans) {
            const normalized = this.normalizeText(span.text);
            if (!this.entityTracker.has(normalized)) {
                this.entityTracker.set(normalized, {
                    text: span.text,
                    normalizedText: normalized,
                    types: new Map(),
                    positions: [],
                    dominantType: null,
                });
            }
            const entity = this.entityTracker.get(normalized);
            const currentCount = entity.types.get(span.filterType) || 0;
            entity.types.set(span.filterType, currentCount + 1);
            entity.positions.push(span.characterStart);
        }
        // Determine dominant type for each entity
        for (const entity of this.entityTracker.values()) {
            let maxCount = 0;
            let dominantType = null;
            for (const [type, count] of entity.types.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantType = type;
                }
            }
            entity.dominantType = dominantType;
        }
    }
    /**
     * Apply document-level consistency (same text = same type)
     */
    applyDocumentConsistency(spans) {
        for (const span of spans) {
            const normalized = this.normalizeText(span.text);
            const entity = this.entityTracker.get(normalized);
            if (!entity || !entity.dominantType)
                continue;
            // If this span's type differs from dominant type, adjust confidence
            if (span.filterType !== entity.dominantType) {
                const dominantCount = entity.types.get(entity.dominantType) || 0;
                const thisCount = entity.types.get(span.filterType) || 0;
                // If dominant type is much more common, penalize this span
                if (dominantCount > thisCount * 2) {
                    span.confidence *= 1 - CrossTypeReasoner.CONFLICT_PENALTY;
                }
            }
            else {
                // Boost confidence for consistent typing
                const occurrences = entity.positions.length;
                if (occurrences > 1) {
                    const boost = Math.min(CrossTypeReasoner.CONSISTENCY_BOOST, occurrences * 0.05);
                    span.confidence = Math.min(1.0, span.confidence + boost);
                }
            }
        }
    }
    /**
     * Apply pairwise constraints to a single span
     */
    applyConstraints(span, allSpans, fullText) {
        const result = {
            span,
            originalType: span.filterType,
            resolvedType: span.filterType,
            originalConfidence: span.confidence,
            adjustedConfidence: span.confidence,
            reasoning: [],
            constraintsApplied: [],
        };
        // Find nearby spans
        const nearbySpans = allSpans.filter((other) => {
            if (other === span)
                return false;
            const distance = Math.min(Math.abs(other.characterStart - span.characterEnd), Math.abs(span.characterStart - other.characterEnd));
            return distance <= CrossTypeReasoner.PROXIMITY_WINDOW;
        });
        // Apply each constraint
        for (const constraint of this.constraints) {
            // Check if this constraint applies to this span
            const isType1 = span.filterType === constraint.type1;
            const isType2 = span.filterType === constraint.type2;
            if (!isType1 && !isType2)
                continue;
            const otherType = isType1 ? constraint.type2 : constraint.type1;
            // Find matching nearby spans
            const matchingNearby = nearbySpans.filter((s) => s.filterType === otherType);
            if (matchingNearby.length === 0)
                continue;
            // Check context requirement if specified
            if (constraint.contextRequired) {
                const contextStart = Math.max(0, span.characterStart - 100);
                const contextEnd = Math.min(fullText.length, span.characterEnd + 100);
                const context = fullText.substring(contextStart, contextEnd);
                if (!constraint.contextRequired.test(context))
                    continue;
            }
            // Apply constraint
            if (constraint.relationship === "EXCLUSIVE") {
                // Mutual exclusion: lower confidence of both
                const penalty = constraint.strength * CrossTypeReasoner.CONFLICT_PENALTY;
                result.adjustedConfidence -= penalty;
                result.constraintsApplied.push(`EXCLUSIVE(${constraint.type1}/${constraint.type2})`);
                result.reasoning.push(constraint.reason);
            }
            else if (constraint.relationship === "SUPPORTIVE") {
                // Mutual support: boost confidence
                const boost = constraint.strength * CrossTypeReasoner.CONSISTENCY_BOOST;
                result.adjustedConfidence += boost;
                result.constraintsApplied.push(`SUPPORTIVE(${constraint.type1}/${constraint.type2})`);
                result.reasoning.push(constraint.reason);
            }
        }
        // Clamp confidence
        result.adjustedConfidence = Math.max(0, Math.min(1, result.adjustedConfidence));
        // Apply adjusted confidence to span
        span.confidence = result.adjustedConfidence;
        return result;
    }
    /**
     * Resolve remaining conflicts using context analysis
     */
    resolveConflicts(results, fullText) {
        // Group results by overlapping positions
        const positionGroups = new Map();
        for (const result of results) {
            const key = `${result.span.characterStart}-${result.span.characterEnd}`;
            // Find overlapping groups
            let foundGroup = false;
            for (const [groupKey, group] of positionGroups.entries()) {
                const [groupStart, groupEnd] = groupKey.split("-").map(Number);
                if (this.overlaps(result.span.characterStart, result.span.characterEnd, groupStart, groupEnd)) {
                    group.push(result);
                    foundGroup = true;
                    break;
                }
            }
            if (!foundGroup) {
                positionGroups.set(key, [result]);
            }
        }
        // Resolve each conflict group
        for (const group of positionGroups.values()) {
            if (group.length <= 1)
                continue;
            // Sort by adjusted confidence
            group.sort((a, b) => b.adjustedConfidence - a.adjustedConfidence);
            // Winner takes all
            const winner = group[0];
            for (let i = 1; i < group.length; i++) {
                const loser = group[i];
                // Significantly reduce loser's confidence
                loser.adjustedConfidence *= 0.5;
                loser.span.confidence = loser.adjustedConfidence;
                loser.reasoning.push(`Lost conflict to ${winner.resolvedType} (higher confidence)`);
            }
        }
    }
    /**
     * Check if two ranges overlap
     */
    overlaps(start1, end1, start2, end2) {
        return !(end1 <= start2 || start1 >= end2);
    }
    /**
     * Normalize text for entity matching
     */
    normalizeText(text) {
        return text.toLowerCase().trim().replace(/\s+/g, " ");
    }
    /**
     * Get applicable constraints for a type pair
     */
    getConstraints(type1, type2) {
        return this.constraints.filter((c) => (c.type1 === type1 && c.type2 === type2) ||
            (c.type1 === type2 && c.type2 === type1));
    }
    /**
     * Resolve ambiguous spans based on context
     * Enhanced version of InterPHIDisambiguator
     */
    resolveAmbiguousSpans(spans, fullText) {
        const resolved = [];
        // Group identical-position spans
        const groups = Span_1.SpanUtils.getIdenticalSpanGroups(spans);
        for (const group of groups) {
            if (group.length === 1) {
                resolved.push(group[0]);
                continue;
            }
            // Score each span in the group
            const scored = group.map((span) => {
                let score = span.confidence;
                // Apply type-specific context scoring
                const contextStart = Math.max(0, span.characterStart - 150);
                const contextEnd = Math.min(fullText.length, span.characterEnd + 150);
                const context = fullText
                    .substring(contextStart, contextEnd)
                    .toLowerCase();
                // DATE scoring
                if (span.filterType === Span_1.FilterType.DATE) {
                    if (/\b(dob|date|born|on|dated|effective|expires?)\b/.test(context)) {
                        score += 0.15;
                    }
                    if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(context)) {
                        score += 0.2;
                    }
                }
                // AGE scoring
                if (span.filterType === Span_1.FilterType.AGE) {
                    if (/\b(year[- ]?old|yo|y\.?o\.?|aged?)\b/.test(context)) {
                        score += 0.25;
                    }
                    if (/\b(patient is|she is|he is|who is)\s+\d/.test(context)) {
                        score += 0.2;
                    }
                }
                // NAME scoring
                if (span.filterType === Span_1.FilterType.NAME) {
                    if (/\b(mr\.?|mrs\.?|ms\.?|dr\.?|patient|name)\b/.test(context)) {
                        score += 0.2;
                    }
                    if (/\b(signed by|performed by|verified by)\b/.test(context)) {
                        score += 0.15;
                    }
                }
                // MRN scoring
                if (span.filterType === Span_1.FilterType.MRN) {
                    if (/\b(mrn|medical record|chart|file)\b/.test(context)) {
                        score += 0.3;
                    }
                }
                // ZIPCODE scoring
                if (span.filterType === Span_1.FilterType.ZIPCODE) {
                    if (/\b(zip|postal|address|city|state)\b/.test(context)) {
                        score += 0.25;
                    }
                }
                // PHONE scoring
                if (span.filterType === Span_1.FilterType.PHONE) {
                    if (/\b(phone|call|tel|mobile|cell|contact)\b/.test(context)) {
                        score += 0.25;
                    }
                }
                // SSN scoring
                if (span.filterType === Span_1.FilterType.SSN) {
                    if (/\b(ssn|social security|ss#|soc\s*sec)\b/.test(context)) {
                        score += 0.35;
                    }
                }
                return { span, score };
            });
            // Sort by score descending
            scored.sort((a, b) => b.score - a.score);
            // Keep best span
            const best = scored[0];
            best.span.confidence = Math.min(1.0, best.score);
            best.span.disambiguationScore = best.score;
            resolved.push(best.span);
        }
        return resolved;
    }
    /**
     * Check if a type change is valid based on constraints
     */
    isTypeChangeValid(span, newType, nearbySpans) {
        // Check exclusive constraints
        for (const constraint of this.constraints) {
            if (constraint.relationship !== "EXCLUSIVE")
                continue;
            if ((constraint.type1 === newType || constraint.type2 === newType) &&
                nearbySpans.some((s) => s.filterType === constraint.type1 ||
                    s.filterType === constraint.type2)) {
                const conflictingType = constraint.type1 === newType ? constraint.type2 : constraint.type1;
                if (nearbySpans.some((s) => s.filterType === conflictingType)) {
                    return {
                        valid: false,
                        reason: `Type ${newType} conflicts with nearby ${conflictingType}: ${constraint.reason}`,
                    };
                }
            }
        }
        return { valid: true, reason: "No constraint violations" };
    }
    /**
     * Get reasoning statistics
     */
    getStatistics() {
        return {
            totalConstraints: this.constraints.length,
            exclusiveConstraints: this.constraints.filter((c) => c.relationship === "EXCLUSIVE").length,
            supportiveConstraints: this.constraints.filter((c) => c.relationship === "SUPPORTIVE").length,
            trackedEntities: this.entityTracker.size,
        };
    }
}
exports.CrossTypeReasoner = CrossTypeReasoner;
// Export singleton for convenience
exports.crossTypeReasoner = new CrossTypeReasoner();
//# sourceMappingURL=CrossTypeReasoner.js.map