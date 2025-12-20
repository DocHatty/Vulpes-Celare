/**
 * Validation Module
 *
 * Provides automated validation capabilities:
 * - LLM-as-Judge for PHI detection validation
 * - False positive identification
 * - Confidence calibration
 *
 * @module validation
 */

export {
  LLMJudge,
  llmJudge,
  type PHIDetection,
  type JudgeVerdict,
  type BatchResult,
  type LLMJudgeConfig,
} from './LLMJudge';
