"use strict";
/**
 * ML Module - Machine Learning Integration for Vulpes Celare
 *
 * This module provides ML-based PHI detection and processing:
 * - GLiNER: Zero-shot name detection
 * - TinyBERT: Confidence re-ranking for borderline detections
 * - FP Classifier: ML-based false positive filtering
 *
 * All ML features are opt-in and gracefully degrade when models are unavailable.
 *
 * @module ml
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMLFalsePositiveFilter = exports.FalsePositiveClassifier = exports.getConfidenceRanker = exports.TinyBertConfidenceRanker = exports.GlinerInference = exports.SimpleWordPieceTokenizer = exports.ONNXInference = exports.ModelManager = void 0;
exports.getMLStatus = getMLStatus;
exports.printMLStatus = printMLStatus;
// Core infrastructure
var ModelManager_1 = require("./ModelManager");
Object.defineProperty(exports, "ModelManager", { enumerable: true, get: function () { return ModelManager_1.ModelManager; } });
var ONNXInference_1 = require("./ONNXInference");
Object.defineProperty(exports, "ONNXInference", { enumerable: true, get: function () { return ONNXInference_1.ONNXInference; } });
Object.defineProperty(exports, "SimpleWordPieceTokenizer", { enumerable: true, get: function () { return ONNXInference_1.SimpleWordPieceTokenizer; } });
// GLiNER name detection
var GlinerInference_1 = require("./GlinerInference");
Object.defineProperty(exports, "GlinerInference", { enumerable: true, get: function () { return GlinerInference_1.GlinerInference; } });
// TinyBERT confidence re-ranking
var TinyBertConfidenceRanker_1 = require("./TinyBertConfidenceRanker");
Object.defineProperty(exports, "TinyBertConfidenceRanker", { enumerable: true, get: function () { return TinyBertConfidenceRanker_1.TinyBertConfidenceRanker; } });
Object.defineProperty(exports, "getConfidenceRanker", { enumerable: true, get: function () { return TinyBertConfidenceRanker_1.getConfidenceRanker; } });
// False positive classifier
var FalsePositiveClassifier_1 = require("./FalsePositiveClassifier");
Object.defineProperty(exports, "FalsePositiveClassifier", { enumerable: true, get: function () { return FalsePositiveClassifier_1.FalsePositiveClassifier; } });
Object.defineProperty(exports, "applyMLFalsePositiveFilter", { enumerable: true, get: function () { return FalsePositiveClassifier_1.applyMLFalsePositiveFilter; } });
/**
 * Check if ML features are available
 */
function getMLStatus() {
    // Import here to avoid circular dependencies
    const { FeatureToggles } = require("../config/FeatureToggles");
    const { ModelManager: MM } = require("./ModelManager");
    return {
        gliner: {
            enabled: FeatureToggles.isGlinerEnabled(),
            available: MM.modelAvailable("gliner"),
        },
        tinybert: {
            enabled: FeatureToggles.isMLConfidenceEnabled(),
            available: MM.modelAvailable("tinybert"),
        },
        fpClassifier: {
            enabled: FeatureToggles.isMLFPFilterEnabled(),
            available: MM.modelAvailable("fp_classifier"),
        },
    };
}
/**
 * Print ML feature status to console
 */
function printMLStatus() {
    const { out } = require("../utils/VulpesOutput");
    const status = getMLStatus();
    out.print("╔════════════════════════════════════════════════════════════════╗");
    out.print("║           VULPES CELARE - ML Feature Status                    ║");
    out.print("╚════════════════════════════════════════════════════════════════╝");
    out.blank();
    const formatStatus = (feature) => {
        if (!feature.available)
            return "[NOT INSTALLED]";
        return feature.enabled ? "[ON] " : "[OFF]";
    };
    out.print(`  GLiNER Name Detection:     ${formatStatus(status.gliner)}`);
    out.print(`  TinyBERT Confidence:       ${formatStatus(status.tinybert)}`);
    out.print(`  ML False Positive Filter:  ${formatStatus(status.fpClassifier)}`);
    out.blank();
    const anyMissing = !status.gliner.available ||
        !status.tinybert.available ||
        !status.fpClassifier.available;
    if (anyMissing) {
        out.print("Run 'npm run models:download' to install missing models.");
        out.blank();
    }
    out.print("Environment variables to enable ML features:");
    out.print("  VULPES_USE_GLINER=1          # Enable GLiNER");
    out.print("  VULPES_USE_ML_CONFIDENCE=1   # Enable TinyBERT");
    out.print("  VULPES_USE_ML_FP_FILTER=1    # Enable FP classifier");
    out.print("  VULPES_ML_DEVICE=cuda        # Use GPU (optional)");
    out.blank();
}
//# sourceMappingURL=index.js.map