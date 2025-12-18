/**
 * VULPES CELARE - Privacy Module
 *
 * Advanced privacy features including differential privacy for
 * privacy-preserving analytics and statistics.
 *
 * @module privacy
 *
 * @example
 * ```typescript
 * import {
 *   DifferentialPrivacy,
 *   PrivacyAccountant,
 *   createDifferentialPrivacy
 * } from 'vulpes-celare/privacy';
 *
 * // Create with preset
 * const dp = createDifferentialPrivacy('balanced');
 *
 * // Add noise to statistics
 * const noisyCount = dp.addLaplaceNoise(1000, 1);
 * console.log(`Noisy count: ${noisyCount.noisy}`);
 *
 * // Track privacy budget
 * const accountant = new PrivacyAccountant(10);
 * accountant.recordQuery(1.0);
 * console.log(`Budget remaining: ${accountant.getRemainingBudget()}`);
 * ```
 */

export {
  DifferentialPrivacy,
  DifferentialPrivacyConfig,
  NoisyStatistic,
  DPRedactionStats,
  PrivacyPreset,
  PRIVACY_PRESETS,
  DPHistogram,
  PrivacyAccountant,
  createDifferentialPrivacy,
} from "./DifferentialPrivacy";
