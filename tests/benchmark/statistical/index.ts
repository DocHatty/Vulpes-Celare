/**
 * ============================================================================
 * STATISTICAL ENGINE
 * ============================================================================
 *
 * Unified exports for statistical testing components.
 *
 * @module benchmark/statistical
 */

export {
  StatisticalTests,
  createStatisticalTests,
} from './StatisticalTests';
export type {
  TestResult,
  McNemarTable,
} from './StatisticalTests';

export {
  BootstrapCI,
  createBootstrapCI,
} from './BootstrapCI';
export type {
  ConfidenceInterval,
  MetricCIs,
  BootstrapSample,
} from './BootstrapCI';
