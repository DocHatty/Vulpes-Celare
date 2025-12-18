/**
 * Name Patterns Module - Centralized name detection patterns and coordination
 *
 * This module consolidates all name detection patterns and eliminates duplication
 * across the 4 name filters (FormattedNameFilterSpan, SmartNameFilterSpan,
 * TitledNameFilterSpan, FamilyNameFilterSpan).
 *
 * @module filters/name-patterns
 */
export * from "./NamePatternLibrary";
export * from "./NameDetectionCoordinator";
export { getOcrLastFirstPatternDefs, getChaosLastFirstPatternDefs, type NamePatternDef as OcrNamePatternDef, } from "./OcrTolerancePatterns";
export * from "./TitledNamePatterns";
//# sourceMappingURL=index.d.ts.map