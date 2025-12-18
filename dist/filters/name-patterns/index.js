"use strict";
/**
 * Name Patterns Module - Centralized name detection patterns and coordination
 *
 * This module consolidates all name detection patterns and eliminates duplication
 * across the 4 name filters (FormattedNameFilterSpan, SmartNameFilterSpan,
 * TitledNameFilterSpan, FamilyNameFilterSpan).
 *
 * @module filters/name-patterns
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChaosLastFirstPatternDefs = exports.getOcrLastFirstPatternDefs = void 0;
// Pattern library - centralized pattern definitions (primary NamePatternDef)
__exportStar(require("./NamePatternLibrary"), exports);
// Detection coordinator - eliminates duplicate Rust calls
__exportStar(require("./NameDetectionCoordinator"), exports);
// OCR tolerance patterns - explicitly re-export to avoid NamePatternDef conflict
var OcrTolerancePatterns_1 = require("./OcrTolerancePatterns");
Object.defineProperty(exports, "getOcrLastFirstPatternDefs", { enumerable: true, get: function () { return OcrTolerancePatterns_1.getOcrLastFirstPatternDefs; } });
Object.defineProperty(exports, "getChaosLastFirstPatternDefs", { enumerable: true, get: function () { return OcrTolerancePatterns_1.getChaosLastFirstPatternDefs; } });
// Titled name patterns
__exportStar(require("./TitledNamePatterns"), exports);
//# sourceMappingURL=index.js.map