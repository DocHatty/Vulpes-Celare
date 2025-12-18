/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   VULPES CELARE - ELITE LLM GUIDANCE SYSTEM                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   Precision-calibrated AI guidance for maximum analysis potential             ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module provides elite-tier LLM guidance that:
 *
 * 1. INJECTS actionable prompts directly into test output
 * 2. CALIBRATES for each LLM model's strengths
 * 3. PROVIDES imperative "DO THIS NOW" action blocks
 * 4. SURFACES historical context (what worked/failed before)
 * 5. CLOSES the feedback loop (learns from outcomes)
 *
 * USAGE:
 * ```javascript
 * const { injectGuidance, formatTestResults } = require('./llm-guidance');
 *
 * // After running tests:
 * const guidedOutput = injectGuidance(testResults);
 * console.log(guidedOutput);
 * ```
 *
 * ENVIRONMENT VARIABLES:
 * - VULPES_LLM_GUIDANCE=0  : Disable guidance injection
 * - VULPES_LLM_MODEL=xxx   : Override model detection
 * - VULPES_LLM_VERBOSITY=1-4 : Set verbosity level
 */

const { PromptInjector, INJECTOR_CONFIG } = require("./PromptInjector");
const { ActionBlockFormatter, ACTION_CONFIG } = require("./ActionBlockFormatter");
const { ModelCalibrator, MODEL_CONFIGS } = require("./ModelCalibrator");
const { HistoryContextBuilder, HISTORY_CONFIG } = require("./HistoryContextBuilder");

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Inject LLM guidance into test results
 * This is the primary entry point for the guidance system
 *
 * @param {Object} testResults - Raw test results from assessment
 * @param {Object} options - Options for injection
 * @returns {string} Formatted output with embedded LLM guidance
 */
function injectGuidance(testResults, options = {}) {
  const injector = new PromptInjector(options);
  return injector.inject(testResults, options);
}

/**
 * Format test results with full LLM guidance
 * Alias for injectGuidance for backward compatibility
 */
function formatTestResults(testResults, options = {}) {
  return injectGuidance(testResults, options);
}

/**
 * Get model calibration information
 * Useful for debugging which model is detected
 */
function getModelInfo() {
  const calibrator = new ModelCalibrator();
  return calibrator.export();
}

/**
 * Get historical context for a failure pattern
 * Useful for standalone history queries
 */
function getHistoryContext(failure) {
  const builder = new HistoryContextBuilder();
  return builder.build({ topFailure: failure });
}

/**
 * Generate action blocks for a specific root cause
 * Useful for custom integrations
 */
function generateActionBlocks(rootCause, options = {}) {
  const formatter = new ActionBlockFormatter(options);
  return formatter.generateActionSteps({ rootCause }, rootCause, {});
}

/**
 * Check if guidance injection is enabled
 */
function isGuidanceEnabled() {
  return INJECTOR_CONFIG.enabled;
}

// ============================================================================
// EXPRESS MIDDLEWARE (for API integration)
// ============================================================================

/**
 * Express middleware to inject guidance into test API responses
 */
function guidanceMiddleware(options = {}) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (data) => {
      // Only inject guidance if this looks like test results
      if (data && (data.metrics || data.failures || data.sensitivity)) {
        try {
          const guided = injectGuidance(data, options);
          // Add both raw and guided versions
          data._llmGuidance = guided;
          data._modelInfo = getModelInfo();
        } catch (e) {
          // Don't break the response if guidance fails
          console.error("[LLM Guidance] Injection failed:", e.message);
        }
      }
      return originalJson(data);
    };

    next();
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Main API
  injectGuidance,
  formatTestResults,
  getModelInfo,
  getHistoryContext,
  generateActionBlocks,
  isGuidanceEnabled,

  // Middleware
  guidanceMiddleware,

  // Classes (for advanced usage)
  PromptInjector,
  ActionBlockFormatter,
  ModelCalibrator,
  HistoryContextBuilder,

  // Configs (for customization)
  INJECTOR_CONFIG,
  ACTION_CONFIG,
  MODEL_CONFIGS,
  HISTORY_CONFIG,
};
