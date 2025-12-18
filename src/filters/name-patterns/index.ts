/**
 * Name Patterns Module - Centralized name detection patterns and coordination
 *
 * This module consolidates all name detection patterns and eliminates duplication
 * across the 4 name filters (FormattedNameFilterSpan, SmartNameFilterSpan,
 * TitledNameFilterSpan, FamilyNameFilterSpan).
 *
 * @module filters/name-patterns
 */

// Pattern library - centralized pattern definitions (primary NamePatternDef)
export * from "./NamePatternLibrary";

// Detection coordinator - eliminates duplicate Rust calls
export * from "./NameDetectionCoordinator";

// OCR tolerance patterns - explicitly re-export to avoid NamePatternDef conflict
export {
  getOcrLastFirstPatternDefs,
  getChaosLastFirstPatternDefs,
  type NamePatternDef as OcrNamePatternDef, // Alias to avoid conflict
} from "./OcrTolerancePatterns";

// Titled name patterns
export * from "./TitledNamePatterns";
