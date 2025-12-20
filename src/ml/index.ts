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

// Core infrastructure
export { ModelManager } from "./ModelManager";
export type { ModelType, ModelConfig, LoadedModel, GPUProvider } from "./ModelManager";

export { ONNXInference, SimpleWordPieceTokenizer } from "./ONNXInference";
export type { TokenizerOutput, Tokenizer } from "./ONNXInference";

// GLiNER name detection
export { GlinerInference } from "./GlinerInference";
export type { GlinerEntity } from "./GlinerInference";

// TinyBERT confidence re-ranking
export {
  TinyBertConfidenceRanker,
  getConfidenceRanker,
} from "./TinyBertConfidenceRanker";

// False positive classifier
export {
  FalsePositiveClassifier,
  applyMLFalsePositiveFilter,
} from "./FalsePositiveClassifier";

// Ensemble embeddings for semantic disambiguation
export {
  EnsembleEmbeddingService,
  getEnsembleEmbeddingService,
  resetEnsembleEmbeddingService,
} from "./EnsembleEmbeddingService";

/**
 * Check if ML features are available
 */
export function getMLStatus(): {
  gliner: { enabled: boolean; available: boolean };
  tinybert: { enabled: boolean; available: boolean };
  fpClassifier: { enabled: boolean; available: boolean };
  ensembleEmbeddings: { enabled: boolean; available: boolean };
} {
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
    ensembleEmbeddings: {
      enabled: FeatureToggles.isEnsembleEmbeddingsEnabled(),
      available: MM.modelAvailable("minilm-l6"), // Required model
    },
  };
}

/**
 * Print ML feature status to console
 */
export function printMLStatus(): void {
  const { out } = require("../utils/VulpesOutput");
  const status = getMLStatus();

  out.print("╔════════════════════════════════════════════════════════════════╗");
  out.print("║           VULPES CELARE - ML Feature Status                    ║");
  out.print("╚════════════════════════════════════════════════════════════════╝");
  out.blank();

  const formatStatus = (feature: { enabled: boolean; available: boolean }) => {
    if (!feature.available) return "[NOT INSTALLED]";
    return feature.enabled ? "[ON] " : "[OFF]";
  };

  out.print(`  GLiNER Name Detection:     ${formatStatus(status.gliner)}`);
  out.print(`  TinyBERT Confidence:       ${formatStatus(status.tinybert)}`);
  out.print(`  ML False Positive Filter:  ${formatStatus(status.fpClassifier)}`);
  out.print(`  Ensemble Embeddings:       ${formatStatus(status.ensembleEmbeddings)}`);
  out.blank();

  const anyMissing =
    !status.gliner.available ||
    !status.tinybert.available ||
    !status.fpClassifier.available ||
    !status.ensembleEmbeddings.available;

  if (anyMissing) {
    out.print("Run 'npm run models:download' to install missing models.");
    out.blank();
  }

  out.print("Environment variables to enable ML features:");
  out.print("  VULPES_USE_GLINER=1              # Enable GLiNER");
  out.print("  VULPES_USE_ML_CONFIDENCE=1       # Enable TinyBERT");
  out.print("  VULPES_USE_ML_FP_FILTER=1        # Enable FP classifier");
  out.print("  VULPES_USE_ENSEMBLE_EMBEDDINGS=1 # Enable ensemble embeddings");
  out.print("  VULPES_ML_DEVICE=cuda            # Use GPU (optional)");
  out.blank();
}
