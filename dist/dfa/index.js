"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanWithDFA = exports.isRustAccelerationAvailable = exports.isDFAScanningEnabled = exports.getMultiPatternScanner = exports.ZigDFAScanner = exports.RustDFAScanner = exports.MultiPatternScanner = exports.getPatternStats = exports.DEA_PATTERNS = exports.NPI_PATTERNS = exports.ZIPCODE_PATTERNS = exports.IP_PATTERNS = exports.CREDIT_CARD_PATTERNS = exports.MRN_PATTERNS = exports.DATE_PATTERNS = exports.EMAIL_PATTERNS = exports.PHONE_PATTERNS = exports.SSN_PATTERNS = exports.ALL_PATTERNS = void 0;
var patterns_1 = require("./patterns");
Object.defineProperty(exports, "ALL_PATTERNS", { enumerable: true, get: function () { return patterns_1.ALL_PATTERNS; } });
Object.defineProperty(exports, "SSN_PATTERNS", { enumerable: true, get: function () { return patterns_1.SSN_PATTERNS; } });
Object.defineProperty(exports, "PHONE_PATTERNS", { enumerable: true, get: function () { return patterns_1.PHONE_PATTERNS; } });
Object.defineProperty(exports, "EMAIL_PATTERNS", { enumerable: true, get: function () { return patterns_1.EMAIL_PATTERNS; } });
Object.defineProperty(exports, "DATE_PATTERNS", { enumerable: true, get: function () { return patterns_1.DATE_PATTERNS; } });
Object.defineProperty(exports, "MRN_PATTERNS", { enumerable: true, get: function () { return patterns_1.MRN_PATTERNS; } });
Object.defineProperty(exports, "CREDIT_CARD_PATTERNS", { enumerable: true, get: function () { return patterns_1.CREDIT_CARD_PATTERNS; } });
Object.defineProperty(exports, "IP_PATTERNS", { enumerable: true, get: function () { return patterns_1.IP_PATTERNS; } });
Object.defineProperty(exports, "ZIPCODE_PATTERNS", { enumerable: true, get: function () { return patterns_1.ZIPCODE_PATTERNS; } });
Object.defineProperty(exports, "NPI_PATTERNS", { enumerable: true, get: function () { return patterns_1.NPI_PATTERNS; } });
Object.defineProperty(exports, "DEA_PATTERNS", { enumerable: true, get: function () { return patterns_1.DEA_PATTERNS; } });
Object.defineProperty(exports, "getPatternStats", { enumerable: true, get: function () { return patterns_1.getPatternStats; } });
var MultiPatternScanner_1 = require("./MultiPatternScanner");
Object.defineProperty(exports, "MultiPatternScanner", { enumerable: true, get: function () { return MultiPatternScanner_1.MultiPatternScanner; } });
Object.defineProperty(exports, "RustDFAScanner", { enumerable: true, get: function () { return MultiPatternScanner_1.RustDFAScanner; } });
Object.defineProperty(exports, "ZigDFAScanner", { enumerable: true, get: function () { return MultiPatternScanner_1.ZigDFAScanner; } });
Object.defineProperty(exports, "getMultiPatternScanner", { enumerable: true, get: function () { return MultiPatternScanner_1.getMultiPatternScanner; } });
Object.defineProperty(exports, "isDFAScanningEnabled", { enumerable: true, get: function () { return MultiPatternScanner_1.isDFAScanningEnabled; } });
Object.defineProperty(exports, "isRustAccelerationAvailable", { enumerable: true, get: function () { return MultiPatternScanner_1.isRustAccelerationAvailable; } });
Object.defineProperty(exports, "scanWithDFA", { enumerable: true, get: function () { return MultiPatternScanner_1.scanWithDFA; } });
//# sourceMappingURL=index.js.map