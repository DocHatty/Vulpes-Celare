"use strict";
/**
 * ============================================================================
 * NERVALUATE ALIGNER
 * ============================================================================
 *
 * Implements SemEval'13 5-mode span alignment for NER evaluation.
 * This is the gold standard for comparing detected spans to ground truth.
 *
 * Based on: nervaluate library (https://github.com/MantisAI/nervaluate)
 * Reference: SemEval-2013 Task 9
 *
 * 5 Evaluation Modes:
 * 1. strict  - Exact boundary AND exact entity type match
 * 2. exact   - Exact boundary match (ignores entity type)
 * 3. partial - Any overlap is considered a match
 * 4. type    - Entity type match (ignores boundaries)
 * 5. ent_type - Entity type match with some boundary overlap
 *
 * @module benchmark/evaluation/NervaluateAligner
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TYPE_MAPPING = exports.NervaluateAligner = void 0;
exports.createAligner = createAligner;
/**
 * NervaluateAligner - SemEval'13 5-mode span alignment
 */
class NervaluateAligner {
    overlapThreshold;
    typeMapping;
    constructor(options = {}) {
        this.overlapThreshold = options.overlapThreshold ?? 0.5;
        this.typeMapping = new Map(Object.entries(options.typeMapping ?? {}));
    }
    /**
     * Align predictions with ground truth and compute all 5 modes
     */
    align(predictions, groundTruth) {
        // Sort both lists by start position
        const sortedPreds = [...predictions].sort((a, b) => a.start - b.start);
        const sortedGT = [...groundTruth].sort((a, b) => a.start - b.start);
        // Track which have been matched
        const matchedPreds = new Set();
        const matchedGT = new Set();
        // Collect all alignments
        const alignments = [];
        // Initialize mode counters
        const strict = { tp: 0, fp: 0, fn: 0, partial: 0 };
        const exact = { tp: 0, fp: 0, fn: 0, partial: 0 };
        const partial = { tp: 0, fp: 0, fn: 0, partial: 0 };
        const type = { tp: 0, fp: 0, fn: 0, partial: 0 };
        const ent_type = { tp: 0, fp: 0, fn: 0, partial: 0 };
        // First pass: find all overlapping pairs
        for (let i = 0; i < sortedPreds.length; i++) {
            const pred = sortedPreds[i];
            let bestMatch = null;
            for (let j = 0; j < sortedGT.length; j++) {
                if (matchedGT.has(j))
                    continue;
                const gt = sortedGT[j];
                const overlap = this.computeOverlap(pred, gt);
                if (overlap.overlapChars > 0) {
                    if (!bestMatch || overlap.ratio > bestMatch.ratio) {
                        bestMatch = { gtIdx: j, overlap: overlap.overlapChars, ratio: overlap.ratio };
                    }
                }
            }
            if (bestMatch) {
                matchedPreds.add(i);
                matchedGT.add(bestMatch.gtIdx);
                const gt = sortedGT[bestMatch.gtIdx];
                const isExactBoundary = this.isExactBoundary(pred, gt);
                const typeMatches = this.typesMatch(pred.type, gt.type);
                const alignment = {
                    prediction: pred,
                    groundTruth: gt,
                    matchType: isExactBoundary
                        ? typeMatches
                            ? 'exact'
                            : 'type_mismatch'
                        : 'partial',
                    overlapChars: bestMatch.overlap,
                    overlapRatio: bestMatch.ratio,
                    typeMatches,
                };
                alignments.push(alignment);
                // Update mode counters
                this.updateModeCounters({ strict, exact, partial, type, ent_type }, alignment);
            }
        }
        // Collect spurious predictions (not matched)
        for (let i = 0; i < sortedPreds.length; i++) {
            if (!matchedPreds.has(i)) {
                alignments.push({
                    prediction: sortedPreds[i],
                    groundTruth: null,
                    matchType: 'spurious',
                    overlapChars: 0,
                    overlapRatio: 0,
                    typeMatches: false,
                });
                // All modes get FP for spurious
                strict.fp++;
                exact.fp++;
                partial.fp++;
                type.fp++;
                ent_type.fp++;
            }
        }
        // Collect missing ground truth (not matched)
        for (let j = 0; j < sortedGT.length; j++) {
            if (!matchedGT.has(j)) {
                alignments.push({
                    prediction: null,
                    groundTruth: sortedGT[j],
                    matchType: 'missing',
                    overlapChars: 0,
                    overlapRatio: 0,
                    typeMatches: false,
                });
                // All modes get FN for missing
                strict.fn++;
                exact.fn++;
                partial.fn++;
                type.fn++;
                ent_type.fn++;
            }
        }
        return {
            strict,
            exact,
            partial,
            type,
            ent_type,
            alignments,
        };
    }
    /**
     * Align predictions grouped by entity type
     */
    alignByType(predictions, groundTruth) {
        const results = {};
        // Get all unique types
        const allTypes = new Set([
            ...predictions.map(p => this.normalizeType(p.type)),
            ...groundTruth.map(g => this.normalizeType(g.type)),
        ]);
        for (const entityType of allTypes) {
            const typePreds = predictions.filter(p => this.normalizeType(p.type) === entityType);
            const typeGT = groundTruth.filter(g => this.normalizeType(g.type) === entityType);
            results[entityType] = this.align(typePreds, typeGT);
        }
        return results;
    }
    /**
     * Aggregate multiple document results
     */
    aggregate(documentResults) {
        const aggregated = {
            strict: { tp: 0, fp: 0, fn: 0, partial: 0 },
            exact: { tp: 0, fp: 0, fn: 0, partial: 0 },
            partial: { tp: 0, fp: 0, fn: 0, partial: 0 },
            type: { tp: 0, fp: 0, fn: 0, partial: 0 },
            ent_type: { tp: 0, fp: 0, fn: 0, partial: 0 },
            alignments: [],
        };
        for (const result of documentResults) {
            for (const mode of ['strict', 'exact', 'partial', 'type', 'ent_type']) {
                aggregated[mode].tp += result[mode].tp;
                aggregated[mode].fp += result[mode].fp;
                aggregated[mode].fn += result[mode].fn;
                aggregated[mode].partial += result[mode].partial;
            }
            aggregated.alignments.push(...result.alignments);
        }
        return aggregated;
    }
    /**
     * Compute overlap between prediction and ground truth
     */
    computeOverlap(pred, gt) {
        const predStart = pred.start;
        const predEnd = pred.end;
        const gtStart = gt.start;
        const gtEnd = gt.end;
        // Compute intersection
        const intersectionStart = Math.max(predStart, gtStart);
        const intersectionEnd = Math.min(predEnd, gtEnd);
        const overlapChars = Math.max(0, intersectionEnd - intersectionStart);
        // Compute union
        const unionStart = Math.min(predStart, gtStart);
        const unionEnd = Math.max(predEnd, gtEnd);
        const unionChars = unionEnd - unionStart;
        // IoU-style ratio
        const ratio = unionChars > 0 ? overlapChars / unionChars : 0;
        return { overlapChars, ratio };
    }
    /**
     * Check if boundaries match exactly
     */
    isExactBoundary(pred, gt) {
        return pred.start === gt.start && pred.end === gt.end;
    }
    /**
     * Check if PHI types match (with optional mapping)
     */
    typesMatch(predType, gtType) {
        const normalizedPred = this.normalizeType(predType);
        const normalizedGT = this.normalizeType(gtType);
        return normalizedPred === normalizedGT;
    }
    /**
     * Normalize PHI type (apply mapping if configured)
     */
    normalizeType(phiType) {
        const normalized = phiType.toUpperCase();
        return this.typeMapping.get(normalized) ?? normalized;
    }
    /**
     * Update mode counters based on alignment
     */
    updateModeCounters(modes, alignment) {
        const { matchType, typeMatches, overlapRatio } = alignment;
        // Strict: exact boundary + exact type
        if (matchType === 'exact') {
            modes.strict.tp++;
        }
        else {
            modes.strict.fn++;
            modes.strict.fp++;
        }
        // Exact: exact boundary only
        if (matchType === 'exact' || matchType === 'type_mismatch') {
            modes.exact.tp++;
        }
        else if (matchType === 'partial') {
            modes.exact.partial++;
        }
        // Partial: any overlap
        if (overlapRatio >= this.overlapThreshold) {
            modes.partial.tp++;
        }
        else if (overlapRatio > 0) {
            modes.partial.partial++;
        }
        // Type: type match only
        if (typeMatches) {
            modes.type.tp++;
        }
        else {
            modes.type.fn++;
            modes.type.fp++;
        }
        // Ent_type: type match with overlap
        if (typeMatches && overlapRatio > 0) {
            modes.ent_type.tp++;
        }
        else if (typeMatches) {
            modes.ent_type.partial++;
        }
        else {
            modes.ent_type.fn++;
            modes.ent_type.fp++;
        }
    }
    /**
     * Generate a human-readable summary
     */
    static summarize(results) {
        const lines = [];
        lines.push('┌─────────────┬───────┬───────┬───────┬─────────┐');
        lines.push('│ Mode        │ TP    │ FP    │ FN    │ Partial │');
        lines.push('├─────────────┼───────┼───────┼───────┼─────────┤');
        for (const mode of ['strict', 'exact', 'partial', 'type', 'ent_type']) {
            const m = results[mode];
            const name = mode.padEnd(11);
            const tp = m.tp.toString().padStart(5);
            const fp = m.fp.toString().padStart(5);
            const fn = m.fn.toString().padStart(5);
            const partial = m.partial.toString().padStart(7);
            lines.push(`│ ${name} │${tp} │${fp} │${fn} │${partial} │`);
        }
        lines.push('└─────────────┴───────┴───────┴───────┴─────────┘');
        return lines.join('\n');
    }
}
exports.NervaluateAligner = NervaluateAligner;
/**
 * Create a default aligner
 */
function createAligner(options) {
    return new NervaluateAligner(options);
}
/**
 * Default type mapping for common PHI aliases
 */
exports.DEFAULT_TYPE_MAPPING = {
    'PATIENT_NAME': 'NAME',
    'PROVIDER_NAME': 'NAME',
    'FAMILY_NAME': 'NAME',
    'DOB': 'DATE',
    'DATE_OF_BIRTH': 'DATE',
    'SSN': 'ID',
    'MRN': 'ID',
    'ACCOUNT': 'ID',
    'LICENSE': 'ID',
    'TELEPHONE': 'PHONE',
    'FAX': 'PHONE',
    'STREET_ADDRESS': 'ADDRESS',
    'LOCATION': 'ADDRESS',
};
//# sourceMappingURL=NervaluateAligner.js.map