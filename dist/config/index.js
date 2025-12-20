"use strict";
/**
 * Configuration Module
 *
 * Centralized exports for all configuration-related modules.
 *
 * @module config
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
// Environment configuration (feature toggles via env vars)
__exportStar(require("./EnvironmentConfig"), exports);
__exportStar(require("./FeatureToggles"), exports);
__exportStar(require("./RustAccelConfig"), exports);
// Centralized thresholds (confidence, context windows, etc.)
__exportStar(require("./Thresholds"), exports);
// Centralized word lists for false positive filtering
__exportStar(require("./WordLists"), exports);
// Centralized OCR patterns and character substitutions
__exportStar(require("./OcrPatterns"), exports);
// Hot-reload configuration (Phase 5: Atomic Config)
__exportStar(require("./AtomicConfig"), exports);
__exportStar(require("./schemas"), exports);
__exportStar(require("./HotReloadManager"), exports);
//# sourceMappingURL=index.js.map