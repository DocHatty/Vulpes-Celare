/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║      █████╗ ███╗   ██╗ █████╗ ██╗  ██╗   ██╗███████╗██╗███████╗               ║
 * ║     ██╔══██╗████╗  ██║██╔══██╗██║  ╚██╗ ██╔╝██╔════╝██║██╔════╝               ║
 * ║     ███████║██╔██╗ ██║███████║██║   ╚████╔╝ ███████╗██║███████╗               ║
 * ║     ██╔══██║██║╚██╗██║██╔══██║██║    ╚██╔╝  ╚════██║██║╚════██║               ║
 * ║     ██║  ██║██║ ╚████║██║  ██║███████╗██║   ███████║██║███████║               ║
 * ║     ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝╚══════╝               ║
 * ║                                                                               ║
 * ║      ███╗   ███╗ ██████╗ ██████╗ ██╗   ██╗██╗     ███████╗                    ║
 * ║      ████╗ ████║██╔═══██╗██╔══██╗██║   ██║██║     ██╔════╝                    ║
 * ║      ██╔████╔██║██║   ██║██║  ██║██║   ██║██║     █████╗                      ║
 * ║      ██║╚██╔╝██║██║   ██║██║  ██║██║   ██║██║     ██╔══╝                      ║
 * ║      ██║ ╚═╝ ██║╚██████╔╝██████╔╝╚██████╔╝███████╗███████╗                    ║
 * ║      ╚═╝     ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝ ╚══════╝╚══════╝                    ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   VULPES CORTEX - ANALYSIS MODULE                                             ║
 * ║   Deep Analysis, Self-Correction, and Checkpoint Systems                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module provides comprehensive analysis and self-correction capabilities:
 *
 * COMPONENTS:
 * ─────────────────────────────────────────────────────────────────────────────────
 * DeepAnalysisEngine       - Triggers after 500+ docs for comprehensive analysis
 * CheckpointSystem         - Automatic checkpoints and state persistence
 * SelfCorrectionOrchestrator - Automatic error detection, fixing, and validation
 *
 * USAGE:
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 * // Deep Analysis (after 500+ documents)
 * const { DeepAnalysisEngine } = require('./analysis');
 * const engine = new DeepAnalysisEngine();
 * const threshold = await engine.checkThreshold();
 * if (threshold.meetsMinimum) {
 *   const analysis = await engine.runDeepAnalysis();
 * }
 *
 * // Self-Correction (wrap any test function)
 * const { SelfCorrectionOrchestrator } = require('./analysis');
 * const orchestrator = new SelfCorrectionOrchestrator();
 * const result = await orchestrator.runWithSelfCorrection(async () => {
 *   // Your test code here
 * });
 *
 * // Checkpoints (manual usage)
 * const { CheckpointSystem } = require('./analysis');
 * const checkpoints = new CheckpointSystem();
 * checkpoints.startSession();
 * await checkpoints.createCheckpoint('PHASE_COMPLETE', { phase: 'BUILD' });
 * checkpoints.endSession();
 *
 * CLI COMMANDS:
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 * vulpes deep-analyze              # Run deep analysis (requires 500+ docs)
 * vulpes deep-analyze --force      # Force analysis even below threshold
 * vulpes deep-analyze --json       # Output as JSON
 * vulpes test --self-correct       # Run tests with automatic error fixing
 * vulpes test --checkpoints        # Run tests with checkpoint saving
 *
 * LLM INTEGRATION:
 * ─────────────────────────────────────────────────────────────────────────────────
 *
 * Claude Opus 4.5:
 *   - Extended thinking for root cause analysis
 *   - Triggered automatically on complex errors
 *   - Generates detailed fix recommendations
 *
 * Codex 5.2 High Max:
 *   - Deep research mode for code-level fixes
 *   - Triggered on build errors and pattern fixes
 *   - Generates exact code snippets
 */

// ============================================================================
// EXPORTS
// ============================================================================

const { DeepAnalysisEngine, DEEP_ANALYSIS_CONFIG } = require('./deep-analysis-engine');
const { CheckpointSystem, CHECKPOINT_CONFIG, CHECKPOINT_TYPES } = require('./checkpoint-system');
const { SelfCorrectionOrchestrator, ORCHESTRATOR_CONFIG, ERROR_PATTERNS } = require('./self-correction-orchestrator');

module.exports = {
  // Deep Analysis
  DeepAnalysisEngine,
  DEEP_ANALYSIS_CONFIG,

  // Checkpoint System
  CheckpointSystem,
  CHECKPOINT_CONFIG,
  CHECKPOINT_TYPES,

  // Self-Correction
  SelfCorrectionOrchestrator,
  ORCHESTRATOR_CONFIG,
  ERROR_PATTERNS,

  // Convenience function to run analysis
  async runDeepAnalysis(options = {}) {
    const engine = new DeepAnalysisEngine(options);
    return engine.runDeepAnalysis(options);
  },

  // Convenience function to check threshold
  async checkAnalysisThreshold() {
    const engine = new DeepAnalysisEngine();
    return engine.checkThreshold();
  },

  // Convenience function to run with self-correction
  async runWithSelfCorrection(testFn, options = {}) {
    const orchestrator = new SelfCorrectionOrchestrator(options);
    return orchestrator.runWithSelfCorrection(testFn, options);
  },
};
