/**
 * Monitoring Module
 *
 * Provides production monitoring capabilities:
 * - Drift detection for PHI detection quality
 * - Distribution tracking
 * - Alerting for anomalies
 *
 * @module monitoring
 */

export {
  DriftDetector,
  driftDetector,
  type DriftWindow,
  type DriftAlert,
  type DriftMetrics,
  type DriftConfig,
} from './DriftDetector';
