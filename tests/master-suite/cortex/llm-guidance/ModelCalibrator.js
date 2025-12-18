/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   MODEL CALIBRATOR                                                            ║
 * ║   Detects and calibrates guidance for specific LLM models                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * Different LLMs have different strengths. This calibrator adjusts guidance:
 *
 * - Claude Opus: Extended thinking, deep analysis, architectural suggestions
 * - Claude Sonnet: Focused actions, efficient execution
 * - Codex: Code snippets, regex patterns, implementation details
 * - GPT-4o: Multiple options, quick iterations
 * - Gemini: Structured output, comprehensive context
 */

// ============================================================================
// MODEL CONFIGURATIONS
// ============================================================================

const MODEL_CONFIGS = {
  "claude-opus": {
    name: "Claude Opus 4.5",
    family: "claude",
    tier: "opus",
    recommendedMode: "Extended Thinking Recommended",
    strengths: [
      "Deep root cause analysis",
      "Architectural recommendations",
      "Complex multi-step reasoning",
      "Thorough investigation",
    ],
    calibration: {
      verbosity: "comprehensive",
      includeArchitecturalContext: true,
      suggestDeepAnalysis: true,
      maxActionSteps: 7,
      includeAlternatives: true,
      includeRiskAssessment: true,
    },
  },

  "claude-sonnet": {
    name: "Claude Sonnet",
    family: "claude",
    tier: "sonnet",
    recommendedMode: "Focused Execution",
    strengths: [
      "Efficient task completion",
      "Clear action items",
      "Quick iterations",
      "Practical fixes",
    ],
    calibration: {
      verbosity: "standard",
      includeArchitecturalContext: false,
      suggestDeepAnalysis: false,
      maxActionSteps: 5,
      includeAlternatives: false,
      includeRiskAssessment: false,
    },
  },

  codex: {
    name: "Codex 5.2",
    family: "codex",
    tier: "high-max",
    recommendedMode: "Code Generation Focus",
    strengths: [
      "Regex pattern generation",
      "Code snippets",
      "Pattern matching",
      "Implementation details",
    ],
    calibration: {
      verbosity: "minimal",
      includeCodeSnippets: true,
      includeRegexSuggestions: true,
      maxActionSteps: 4,
      includeAlternatives: false,
      focusOnCode: true,
    },
  },

  "gpt-4o": {
    name: "GPT-4o",
    family: "gpt",
    tier: "4o",
    recommendedMode: "Quick Iteration",
    strengths: [
      "Fast responses",
      "Multiple options",
      "Broad knowledge",
      "Iterative refinement",
    ],
    calibration: {
      verbosity: "standard",
      includeMultipleOptions: true,
      maxActionSteps: 5,
      includeAlternatives: true,
      includeRiskAssessment: false,
    },
  },

  gemini: {
    name: "Gemini Pro",
    family: "gemini",
    tier: "pro",
    recommendedMode: "Structured Analysis",
    strengths: [
      "Structured output",
      "Long context handling",
      "Detailed analysis",
      "Comprehensive coverage",
    ],
    calibration: {
      verbosity: "comprehensive",
      includeStructuredOutput: true,
      maxActionSteps: 6,
      includeFullContext: true,
      includeRiskAssessment: true,
    },
  },

  generic: {
    name: "Generic LLM",
    family: "unknown",
    tier: "unknown",
    recommendedMode: "Standard Analysis",
    strengths: ["General purpose"],
    calibration: {
      verbosity: "standard",
      maxActionSteps: 5,
      includeAlternatives: false,
      includeRiskAssessment: false,
    },
  },
};

// ============================================================================
// MODEL CALIBRATOR CLASS
// ============================================================================

class ModelCalibrator {
  constructor(options = {}) {
    this.configs = { ...MODEL_CONFIGS, ...options.customConfigs };
    this.detectedModel = null;
    this.overrideModel = options.model || null;
  }

  /**
   * Detect the current LLM model from environment
   */
  detectModel() {
    if (this.overrideModel) {
      return this.configs[this.overrideModel] || this.configs.generic;
    }

    // Try to detect from environment variables
    const modelEnv =
      process.env.VULPES_LLM_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      process.env.OPENAI_MODEL ||
      process.env.LLM_MODEL ||
      "";

    const modelLower = modelEnv.toLowerCase();

    // Claude Opus detection
    if (
      modelLower.includes("opus") ||
      modelLower.includes("claude-opus") ||
      modelLower.includes("claude-3-opus") ||
      modelLower.includes("claude-opus-4")
    ) {
      this.detectedModel = "claude-opus";
      return this.configs["claude-opus"];
    }

    // Claude Sonnet detection
    if (
      modelLower.includes("sonnet") ||
      modelLower.includes("claude-sonnet") ||
      modelLower.includes("claude-3-sonnet") ||
      modelLower.includes("claude-3.5-sonnet")
    ) {
      this.detectedModel = "claude-sonnet";
      return this.configs["claude-sonnet"];
    }

    // Claude (generic - default to Opus behavior for best analysis)
    if (modelLower.includes("claude")) {
      this.detectedModel = "claude-opus";
      return this.configs["claude-opus"];
    }

    // Codex detection
    if (modelLower.includes("codex") || modelLower.includes("code-davinci")) {
      this.detectedModel = "codex";
      return this.configs["codex"];
    }

    // GPT-4o detection
    if (modelLower.includes("gpt-4o") || modelLower.includes("gpt4o")) {
      this.detectedModel = "gpt-4o";
      return this.configs["gpt-4o"];
    }

    // GPT-4 (treat like GPT-4o)
    if (modelLower.includes("gpt-4") || modelLower.includes("gpt4")) {
      this.detectedModel = "gpt-4o";
      return this.configs["gpt-4o"];
    }

    // Gemini detection
    if (
      modelLower.includes("gemini") ||
      modelLower.includes("palm") ||
      modelLower.includes("bard")
    ) {
      this.detectedModel = "gemini";
      return this.configs["gemini"];
    }

    // Try to detect from user agent or other signals
    if (this.detectFromContext()) {
      return this.configs[this.detectedModel];
    }

    // Default to Claude Opus for best analysis capabilities
    this.detectedModel = "claude-opus";
    return this.configs["claude-opus"];
  }

  /**
   * Try to detect model from context clues
   */
  detectFromContext() {
    // Check if running in Claude Code
    if (process.env.CLAUDE_CODE || process.env.CLAUDE_DESKTOP) {
      this.detectedModel = "claude-opus";
      return true;
    }

    // Check for GitHub Copilot / Codex indicators
    if (process.env.GITHUB_COPILOT || process.env.CODEX_API) {
      this.detectedModel = "codex";
      return true;
    }

    return false;
  }

  /**
   * Get calibration settings for a specific model
   */
  getCalibration(model) {
    if (typeof model === "string") {
      return this.configs[model]?.calibration || this.configs.generic.calibration;
    }
    return model?.calibration || this.configs.generic.calibration;
  }

  /**
   * Get model info
   */
  getModelInfo(modelKey = null) {
    const key = modelKey || this.detectedModel || "generic";
    return this.configs[key] || this.configs.generic;
  }

  /**
   * Check if current model supports extended thinking
   */
  supportsExtendedThinking() {
    const model = this.detectedModel || "generic";
    return ["claude-opus"].includes(model);
  }

  /**
   * Check if current model prefers code snippets
   */
  prefersCodeSnippets() {
    const model = this.detectedModel || "generic";
    return ["codex"].includes(model);
  }

  /**
   * Get recommended action count for current model
   */
  getRecommendedActionCount() {
    const model = this.detectModel();
    return model.calibration?.maxActionSteps || 5;
  }

  /**
   * Get verbosity level for current model
   */
  getVerbosityLevel() {
    const model = this.detectModel();
    return model.calibration?.verbosity || "standard";
  }

  /**
   * Should include alternatives?
   */
  shouldIncludeAlternatives() {
    const model = this.detectModel();
    return model.calibration?.includeAlternatives || false;
  }

  /**
   * Should include risk assessment?
   */
  shouldIncludeRiskAssessment() {
    const model = this.detectModel();
    return model.calibration?.includeRiskAssessment || false;
  }

  /**
   * Export model info for logging
   */
  export() {
    const model = this.detectModel();
    return {
      detected: this.detectedModel,
      name: model.name,
      family: model.family,
      tier: model.tier,
      recommendedMode: model.recommendedMode,
      calibration: model.calibration,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ModelCalibrator,
  MODEL_CONFIGS,
};
