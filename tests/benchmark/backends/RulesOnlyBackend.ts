/**
 * ============================================================================
 * RULES-ONLY BACKEND
 * ============================================================================
 *
 * Detection backend using only regex/dictionary-based rules.
 * No ML models involved - pure pattern matching.
 *
 * Environment: VULPES_NAME_DETECTION_MODE=rules
 *
 * @module benchmark/backends/RulesOnlyBackend
 */

import { BaseBackend } from './BaseBackend';
import type { BackendCapabilities } from './DetectionBackend';

/**
 * Rules-only detection backend
 *
 * Uses Vulpes Celare's 28 span-based filters without any ML enhancement:
 * - SmartNameFilterSpan
 * - SSNFilterSpan
 * - DateFilterSpan
 * - EmailFilterSpan
 * - PhoneFilterSpan
 * - etc.
 *
 * This represents the baseline, deterministic detection approach.
 */
export class RulesOnlyBackend extends BaseBackend {
  readonly id = 'vulpes-rules-v1';
  readonly name = 'Vulpes Celare (Rules Only)';
  readonly type = 'rules' as const;

  protected getDetectionMode(): 'rules' {
    return 'rules';
  }

  protected async doInitialize(): Promise<void> {
    // Verify GLiNER is disabled
    if (process.env.VULPES_USE_GLINER === '1') {
      console.warn(
        `[${this.id}] Warning: VULPES_USE_GLINER is enabled but should be disabled for rules-only mode`
      );
    }

    // Verify ML features are disabled
    if (process.env.VULPES_USE_ML_CONFIDENCE === '1') {
      console.warn(
        `[${this.id}] Warning: VULPES_USE_ML_CONFIDENCE is enabled but should be disabled for rules-only mode`
      );
    }

    // Pre-warm the filter registry
    try {
      const registryPath = require.resolve('../../../dist/filters/FilterRegistry.js');
      delete require.cache[registryPath];
      const { FilterRegistry } = require(registryPath);
      await FilterRegistry.initialize();
    } catch (error) {
      // FilterRegistry may not be directly accessible, that's okay
      // VulpesCelare will initialize it internally
    }
  }

  getCapabilities(): BackendCapabilities {
    return {
      batchProcessing: true,
      streaming: true, // Rules support streaming
      gpuAcceleration: false, // No GPU for rules
      supportedPHITypes: [
        'name', 'ssn', 'phone', 'email', 'address', 'date', 'mrn',
        'ip', 'url', 'credit_card', 'account', 'health_plan', 'license',
        'passport', 'vehicle', 'device', 'biometric', 'zip', 'fax', 'age',
      ],
      maxDocumentLength: 1_000_000,
      estimatedThroughput: 50, // ~50 docs/sec with Rust acceleration
    };
  }
}

/**
 * Factory function
 */
export function createRulesOnlyBackend(): RulesOnlyBackend {
  return new RulesOnlyBackend();
}
