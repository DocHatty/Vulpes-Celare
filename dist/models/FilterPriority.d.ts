/**
 * Shared priority/specificity rankings for filters and spans.
 *
 * - `FilterPriority` is used by `SpanBasedFilter.getPriority()` implementations
 *   for overlap resolution (higher wins).
 * - `TYPE_SPECIFICITY` is used by span disambiguation/scoring (higher wins).
 *
 * Keeping these rankings in one module prevents drift between subsystems.
 */
/**
 * Priority levels for common filter types (SpanBasedFilter.getType()).
 * Higher priority wins when spans overlap.
 */
export declare const FilterPriority: Readonly<Record<string, number>>;
/**
 * Type specificity ranking for span disambiguation.
 * Higher values = more specific/trustworthy.
 */
export declare const TYPE_SPECIFICITY: Readonly<Record<string, number>>;
//# sourceMappingURL=FilterPriority.d.ts.map