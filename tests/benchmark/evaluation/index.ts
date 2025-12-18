/**
 * ============================================================================
 * EVALUATION ENGINE
 * ============================================================================
 *
 * Unified exports for evaluation components.
 *
 * @module benchmark/evaluation
 */

export {
  NervaluateAligner,
  createAligner,
  DEFAULT_TYPE_MAPPING,
} from './NervaluateAligner';
export type {
  SpanAlignment,
  ModeResults,
  NervaluateResults,
  PerTypeResults,
} from './NervaluateAligner';

export {
  MetricsCalculator,
  createMetricsCalculator,
} from './MetricsCalculator';
export type {
  ClassificationMetrics,
  PerformanceMetrics,
  ModeMetrics,
  AllModeMetrics,
  PerTypeMetrics,
  HIPAAAssessment,
} from './MetricsCalculator';

export {
  BenchmarkGrader,
  createBenchmarkGrader,
} from './BenchmarkGrader';
export type {
  BenchmarkGradeResult,
  SmartGraderResult,
  BenchmarkSummary,
  BenchmarkComparison,
} from './BenchmarkGrader';
