/**
 * DFA Module - High-Performance Multi-Pattern Matching
 *
 * This module provides a unified interface for PHI pattern detection
 * using DFA-based multi-pattern matching.
 *
 * COMPONENTS:
 * - patterns.ts: All PHI detection patterns with validators
 * - MultiPatternScanner.ts: TypeScript scanner implementation
 * - (Future) ZigDFAScanner: Zig comptime DFA implementation
 *
 * USAGE:
 *   import { scanWithDFA, getMultiPatternScanner } from "./dfa";
 *
 *   const result = scanWithDFA(text);
 *   console.log(result.matches);
 *
 * @module redaction/dfa
 */

export {
  PatternDef,
  ALL_PATTERNS,
  SSN_PATTERNS,
  PHONE_PATTERNS,
  EMAIL_PATTERNS,
  DATE_PATTERNS,
  MRN_PATTERNS,
  CREDIT_CARD_PATTERNS,
  IP_PATTERNS,
  ZIPCODE_PATTERNS,
  NPI_PATTERNS,
  DEA_PATTERNS,
  getPatternStats,
} from "./patterns";

export {
  ScanMatch,
  ScanResult,
  MultiPatternScanner,
  ZigDFAScanner,
  ZigDFAScannerInterface,
  getMultiPatternScanner,
  isDFAScanningEnabled,
  scanWithDFA,
} from "./MultiPatternScanner";
