/**
 * ============================================================================
 * BACKEND FACTORY
 * ============================================================================
 *
 * Factory for creating and managing detection backends.
 * Provides unified access to all backend implementations.
 *
 * @module benchmark/backends/BackendFactory
 */

import type { DetectionBackend, BackendRegistry, BackendFactory as BackendFactoryType } from './DetectionBackend';
import { RulesOnlyBackend, createRulesOnlyBackend } from './RulesOnlyBackend';
import { HybridBackend, createHybridBackend } from './HybridBackend';
import { GlinerOnlyBackend, createGlinerOnlyBackend } from './GlinerOnlyBackend';
import { HermeticEnvironment } from '../harness/HermeticEnvironment';

/**
 * Backend type identifiers
 */
export type BackendType = 'rules' | 'hybrid' | 'gliner';

/**
 * Backend metadata
 */
export interface BackendMetadata {
  id: string;
  name: string;
  type: BackendType;
  description: string;
  requiresGliner: boolean;
  requiresGPU: boolean;
}

/**
 * All available backends
 */
export const AVAILABLE_BACKENDS: BackendMetadata[] = [
  {
    id: 'vulpes-rules-v1',
    name: 'Rules Only',
    type: 'rules',
    description: 'Regex/dictionary-based detection using 28 span filters',
    requiresGliner: false,
    requiresGPU: false,
  },
  {
    id: 'vulpes-hybrid-v1',
    name: 'Hybrid (Rules + GLiNER)',
    type: 'hybrid',
    description: 'Combined rules and GLiNER ML for best coverage',
    requiresGliner: true,
    requiresGPU: false,
  },
  {
    id: 'vulpes-gliner-v1',
    name: 'GLiNER Only',
    type: 'gliner',
    description: 'Pure ML-based zero-shot NER detection',
    requiresGliner: true,
    requiresGPU: false,
  },
];

/**
 * Backend factory implementation
 */
class BackendFactoryImpl implements BackendRegistry {
  private factories = new Map<string, BackendFactoryType>();
  private instances = new Map<string, DetectionBackend>();

  constructor() {
    // Register built-in backends
    this.register('vulpes-rules-v1', createRulesOnlyBackend);
    this.register('vulpes-hybrid-v1', createHybridBackend);
    this.register('vulpes-gliner-v1', createGlinerOnlyBackend);
  }

  /**
   * Register a backend factory
   */
  register(id: string, factory: BackendFactoryType): void {
    this.factories.set(id, factory);
  }

  /**
   * Get a backend instance by ID
   * Returns cached instance if available
   */
  get(id: string): DetectionBackend | undefined {
    // Return cached instance if exists
    if (this.instances.has(id)) {
      return this.instances.get(id);
    }

    // Create new instance
    const factory = this.factories.get(id);
    if (!factory) {
      return undefined;
    }

    const instance = factory();
    this.instances.set(id, instance);
    return instance;
  }

  /**
   * Get all registered backend IDs
   */
  list(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Create all backends (fresh instances)
   */
  createAll(): DetectionBackend[] {
    return Array.from(this.factories.values()).map(factory => factory());
  }

  /**
   * Create a backend by type
   */
  createByType(type: BackendType): DetectionBackend {
    switch (type) {
      case 'rules':
        return createRulesOnlyBackend();
      case 'hybrid':
        return createHybridBackend();
      case 'gliner':
        return createGlinerOnlyBackend();
      default:
        throw new Error(`Unknown backend type: ${type}`);
    }
  }

  /**
   * Get backend metadata
   */
  getMetadata(id: string): BackendMetadata | undefined {
    return AVAILABLE_BACKENDS.find(b => b.id === id);
  }

  /**
   * Get all backend metadata
   */
  getAllMetadata(): BackendMetadata[] {
    return [...AVAILABLE_BACKENDS];
  }

  /**
   * Clear cached instances
   */
  clearCache(): void {
    for (const instance of this.instances.values()) {
      instance.shutdown().catch(() => {});
    }
    this.instances.clear();
  }

  /**
   * Check if a backend is available (dependencies met)
   */
  async isAvailable(id: string): Promise<boolean> {
    const metadata = this.getMetadata(id);
    if (!metadata) return false;

    // Rules backend is always available
    if (metadata.type === 'rules') return true;

    // Check GLiNER availability for ML backends
    if (metadata.requiresGliner) {
      const fs = require('fs');
      const path = require('path');
      const modelPath = process.env.VULPES_GLINER_MODEL_PATH ||
        path.join(process.cwd(), 'models', 'gliner', 'model.onnx');
      return fs.existsSync(modelPath);
    }

    return true;
  }
}

/**
 * Singleton factory instance
 */
const factoryInstance = new BackendFactoryImpl();

/**
 * Get the backend factory
 */
export function getBackendFactory(): BackendFactoryImpl {
  return factoryInstance;
}

/**
 * Create a backend with hermetic isolation
 */
export async function createIsolatedBackend(
  type: BackendType,
  hermeticEnv?: HermeticEnvironment
): Promise<DetectionBackend> {
  const env = hermeticEnv || new HermeticEnvironment();
  const config = HermeticEnvironment.getEnvironmentForMode(type);

  // Enter isolation
  await env.enterIsolation(config);

  try {
    // Create backend in isolated environment
    const backend = factoryInstance.createByType(type);
    await backend.initialize();
    return backend;
  } catch (error) {
    // Exit isolation on error
    await env.exitIsolation();
    throw error;
  }
}

/**
 * Run detection with hermetic isolation
 */
export async function detectWithIsolation<T>(
  type: BackendType,
  fn: (backend: DetectionBackend) => Promise<T>
): Promise<T> {
  const env = new HermeticEnvironment();
  const config = HermeticEnvironment.getEnvironmentForMode(type);

  return env.runIsolated(config, async () => {
    const backend = factoryInstance.createByType(type);
    await backend.initialize();
    try {
      return await fn(backend);
    } finally {
      await backend.shutdown();
    }
  });
}

// Re-export backend classes
export { RulesOnlyBackend, HybridBackend, GlinerOnlyBackend };
