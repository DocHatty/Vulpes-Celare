/**
 * DriftDetector Test Suite
 *
 * Tests the drift detection module for:
 * 1. Window management
 * 2. Hellinger distance calculation
 * 3. Alert generation
 * 4. Baseline management
 *
 * @module tests/unit/DriftDetector
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DriftDetector } from '../../src/monitoring/DriftDetector';

describe('DriftDetector', () => {
  let detector: DriftDetector;

  beforeEach(() => {
    DriftDetector.resetInstance();
    detector = DriftDetector.getInstance({
      windowSize: 1000, // 1 second for testing
      windowHistory: 5,
      minSamples: 10,
    });
    detector.setEnabled(true);
  });

  afterEach(() => {
    DriftDetector.resetInstance();
  });

  describe('Basic Recording', () => {
    it('should record detections', () => {
      detector.recordDetection('NAME', 0.9);
      detector.recordDetection('DATE', 0.85);
      detector.recordDetection('SSN', 0.95);

      const window = detector.getCurrentWindow();
      expect(window.detectionCount).toBe(3);
      expect(window.phiTypeCounts.get('NAME')).toBe(1);
      expect(window.phiTypeCounts.get('DATE')).toBe(1);
      expect(window.phiTypeCounts.get('SSN')).toBe(1);
    });

    it('should record documents', () => {
      detector.recordDocument();
      detector.recordDocument();
      detector.recordDocument();

      const window = detector.getCurrentWindow();
      expect(window.documentCount).toBe(3);
    });

    it('should track confidence buckets', () => {
      detector.recordDetection('NAME', 0.1);  // bucket 0 (0-0.2)
      detector.recordDetection('NAME', 0.3);  // bucket 1 (0.2-0.4)
      detector.recordDetection('NAME', 0.5);  // bucket 2 (0.4-0.6)
      detector.recordDetection('NAME', 0.7);  // bucket 3 (0.6-0.8)
      detector.recordDetection('NAME', 0.9);  // bucket 4 (0.8-1.0)

      const window = detector.getCurrentWindow();
      expect(window.confidenceBuckets[0]).toBe(1);
      expect(window.confidenceBuckets[1]).toBe(1);
      expect(window.confidenceBuckets[2]).toBe(1);
      expect(window.confidenceBuckets[3]).toBe(1);
      expect(window.confidenceBuckets[4]).toBe(1);
    });

    it('should not record when disabled', () => {
      detector.setEnabled(false);
      detector.recordDetection('NAME', 0.9);
      detector.recordDocument();

      const window = detector.getCurrentWindow();
      expect(window.detectionCount).toBe(0);
      expect(window.documentCount).toBe(0);
    });
  });

  describe('Baseline Management', () => {
    it('should set baseline from current window when enough samples', () => {
      // Record enough samples
      for (let i = 0; i < 15; i++) {
        detector.recordDocument();
        detector.recordDetection('NAME', 0.9);
      }

      detector.setBaseline();
      const baseline = detector.getBaseline();

      expect(baseline).not.toBeNull();
      expect(baseline!.documentCount).toBe(15);
    });

    it('should not set baseline with insufficient samples', () => {
      detector.recordDocument();
      detector.recordDetection('NAME', 0.9);

      detector.setBaseline();
      const baseline = detector.getBaseline();

      expect(baseline).toBeNull();
    });
  });

  describe('Drift Detection', () => {
    it('should detect distribution shift', () => {
      // Set up baseline with mostly NAME detections
      for (let i = 0; i < 20; i++) {
        detector.recordDocument();
        detector.recordDetection('NAME', 0.9);
      }
      detector.setBaseline();

      // Clear and simulate different distribution
      DriftDetector.resetInstance();
      detector = DriftDetector.getInstance({ windowSize: 1000, minSamples: 5 });
      detector.setEnabled(true);

      // Record baseline again
      for (let i = 0; i < 20; i++) {
        detector.recordDocument();
        detector.recordDetection('NAME', 0.9);
      }
      detector.setBaseline();

      // Now simulate a shift to mostly DATE detections
      for (let i = 0; i < 20; i++) {
        detector.recordDocument();
        detector.recordDetection('DATE', 0.85);
      }

      const metrics = detector.getMetrics();
      // Should detect some distribution shift
      expect(metrics.hellingerDistance).toBeGreaterThan(0);
    });

    it('should return zero metrics when disabled', () => {
      detector.setEnabled(false);
      const metrics = detector.getMetrics();

      expect(metrics.hellingerDistance).toBe(0);
      expect(metrics.isDrifting).toBe(false);
      expect(metrics.alerts.length).toBe(0);
    });

    it('should return zero metrics without baseline', () => {
      detector.recordDetection('NAME', 0.9);
      const metrics = detector.getMetrics();

      expect(metrics.hellingerDistance).toBe(0);
      expect(metrics.isDrifting).toBe(false);
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics in expected format', () => {
      detector.recordDocument();
      detector.recordDetection('NAME', 0.9);

      const exported = detector.exportMetrics();

      expect(exported).toHaveProperty('drift_hellinger_distance');
      expect(exported).toHaveProperty('drift_volume_change');
      expect(exported).toHaveProperty('drift_is_drifting');
      expect(exported).toHaveProperty('window_document_count');
      expect(exported).toHaveProperty('window_detection_count');
      expect(exported.phi_type_name_count).toBe(1);
    });
  });

  describe('PHI Types', () => {
    it('should expose known PHI types', () => {
      expect(DriftDetector.PHI_TYPES).toContain('NAME');
      expect(DriftDetector.PHI_TYPES).toContain('DATE');
      expect(DriftDetector.PHI_TYPES).toContain('SSN');
      expect(DriftDetector.PHI_TYPES.length).toBeGreaterThan(10);
    });
  });

  describe('History Management', () => {
    it('should return empty history initially', () => {
      const history = detector.getHistory();
      expect(history.length).toBe(0);
    });
  });
});
