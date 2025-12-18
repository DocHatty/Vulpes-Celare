/**
 * ============================================================================
 * HYBRID BACKEND
 * ============================================================================
 *
 * Detection backend combining rules with GLiNER ML model.
 * Best of both worlds: deterministic patterns + ML flexibility.
 *
 * Environment: VULPES_NAME_DETECTION_MODE=hybrid
 *
 * @module benchmark/backends/HybridBackend
 */

import { BaseBackend } from './BaseBackend';
import type { BackendCapabilities } from './DetectionBackend';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Hybrid detection backend (Rules + GLiNER)
 *
 * Combines:
 * 1. All 28 rule-based filters (high precision)
 * 2. GLiNER zero-shot NER (high recall for names)
 *
 * GLiNER runs in parallel with rules, and results are merged
 * with priority-based overlap resolution.
 */
export class HybridBackend extends BaseBackend {
  readonly id = 'vulpes-hybrid-v1';
  readonly name = 'Vulpes Celare (Hybrid: Rules + GLiNER)';
  readonly type = 'hybrid' as const;

  private glinerModelPath: string | null = null;
  private glinerAvailable = false;

  protected getDetectionMode(): 'hybrid' {
    return 'hybrid';
  }

  protected async doInitialize(): Promise<void> {
    // Verify GLiNER is enabled
    if (process.env.VULPES_USE_GLINER !== '1') {
      console.warn(
        `[${this.id}] Warning: VULPES_USE_GLINER should be enabled for hybrid mode`
      );
    }

    // Check GLiNER model availability
    this.glinerModelPath = process.env.VULPES_GLINER_MODEL_PATH ||
      path.join(process.cwd(), 'models', 'gliner', 'model.onnx');

    if (fs.existsSync(this.glinerModelPath)) {
      this.glinerAvailable = true;
    } else {
      console.warn(
        `[${this.id}] Warning: GLiNER model not found at ${this.glinerModelPath}`
      );
      console.warn(
        `[${this.id}] Run: npm run models:download:gliner to download the model`
      );
      this.glinerAvailable = false;
    }

    // Pre-initialize filter registry
    try {
      const registryPath = require.resolve('../../../dist/filters/FilterRegistry.js');
      delete require.cache[registryPath];
      const { FilterRegistry } = require(registryPath);
      await FilterRegistry.initialize();
    } catch (error) {
      // FilterRegistry initialization handled by VulpesCelare
    }
  }

  getCapabilities(): BackendCapabilities {
    return {
      batchProcessing: true,
      streaming: false, // GLiNER doesn't support streaming
      gpuAcceleration: this.isGPUAvailable(),
      supportedPHITypes: [
        'name', 'ssn', 'phone', 'email', 'address', 'date', 'mrn',
        'ip', 'url', 'credit_card', 'account', 'health_plan', 'license',
        'passport', 'vehicle', 'device', 'biometric', 'zip', 'fax', 'age',
      ],
      maxDocumentLength: 500_000, // Lower due to ML model context window
      estimatedThroughput: 20, // ~20 docs/sec (GLiNER adds latency)
    };
  }

  /**
   * Check if GPU acceleration is available
   */
  private isGPUAvailable(): boolean {
    const gpuProvider = process.env.VULPES_GPU_PROVIDER?.toLowerCase();
    return gpuProvider === 'cuda' ||
           gpuProvider === 'directml' ||
           gpuProvider === 'coreml';
  }

  /**
   * Check if GLiNER model is available
   */
  isGlinerAvailable(): boolean {
    return this.glinerAvailable;
  }

  /**
   * Get GLiNER model path
   */
  getGlinerModelPath(): string | null {
    return this.glinerModelPath;
  }
}

/**
 * Factory function
 */
export function createHybridBackend(): HybridBackend {
  return new HybridBackend();
}
