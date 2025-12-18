/**
 * ============================================================================
 * GLINER-ONLY BACKEND
 * ============================================================================
 *
 * Detection backend using only GLiNER ML model (no rules).
 * Pure ML-based zero-shot named entity recognition.
 *
 * Environment: VULPES_NAME_DETECTION_MODE=gliner
 *
 * @module benchmark/backends/GlinerOnlyBackend
 */

import { BaseBackend } from './BaseBackend';
import type { BackendCapabilities } from './DetectionBackend';
import * as fs from 'fs';
import * as path from 'path';

/**
 * GLiNER-only detection backend
 *
 * Uses GLiNER zero-shot NER for all PHI detection.
 * This tests pure ML performance without rule assistance.
 *
 * GLiNER entity labels:
 * - patient_name
 * - provider_name
 * - person_name
 * - family_member
 * - location
 * - date
 * - phone_number
 * - email
 * - ssn
 * - medical_record_number
 */
export class GlinerOnlyBackend extends BaseBackend {
  readonly id = 'vulpes-gliner-v1';
  readonly name = 'Vulpes Celare (GLiNER Only)';
  readonly type = 'ml' as const;

  private glinerModelPath: string | null = null;
  private glinerAvailable = false;

  protected getDetectionMode(): 'gliner' {
    return 'gliner';
  }

  protected async doInitialize(): Promise<void> {
    // Verify GLiNER is enabled
    if (process.env.VULPES_USE_GLINER !== '1') {
      console.warn(
        `[${this.id}] Warning: VULPES_USE_GLINER should be enabled for gliner mode`
      );
    }

    // Check GLiNER model availability
    this.glinerModelPath = process.env.VULPES_GLINER_MODEL_PATH ||
      path.join(process.cwd(), 'models', 'gliner', 'model.onnx');

    if (fs.existsSync(this.glinerModelPath)) {
      this.glinerAvailable = true;
    } else {
      throw new Error(
        `GLiNER model not found at ${this.glinerModelPath}. ` +
        `Run: npm run models:download:gliner to download the model.`
      );
    }

    // Verify ONNX runtime is available
    try {
      require('onnxruntime-node');
    } catch (error) {
      throw new Error(
        'onnxruntime-node not available. ' +
        'GLiNER backend requires ONNX runtime for inference.'
      );
    }
  }

  getCapabilities(): BackendCapabilities {
    return {
      batchProcessing: true,
      streaming: false, // ML models don't support streaming well
      gpuAcceleration: this.isGPUAvailable(),
      supportedPHITypes: [
        // GLiNER primarily handles names and some identifiers
        // Other types fall back to minimal rule support
        'name',
        'date',
        'phone',
        'email',
        'ssn',
        'mrn',
        'address',
      ],
      maxDocumentLength: 500_000, // Limited by model context
      estimatedThroughput: 10, // ~10 docs/sec (ML-heavy)
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

  /**
   * Get GPU execution provider being used
   */
  getExecutionProvider(): string {
    const gpuProvider = process.env.VULPES_GPU_PROVIDER?.toLowerCase();
    if (gpuProvider === 'cuda') return 'CUDAExecutionProvider';
    if (gpuProvider === 'directml') return 'DmlExecutionProvider';
    if (gpuProvider === 'coreml') return 'CoreMLExecutionProvider';
    return 'CPUExecutionProvider';
  }
}

/**
 * Factory function
 */
export function createGlinerOnlyBackend(): GlinerOnlyBackend {
  return new GlinerOnlyBackend();
}
