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
import { RulesOnlyBackend } from './RulesOnlyBackend';
import { HybridBackend } from './HybridBackend';
import { GlinerOnlyBackend } from './GlinerOnlyBackend';
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
export declare const AVAILABLE_BACKENDS: BackendMetadata[];
/**
 * Backend factory implementation
 */
declare class BackendFactoryImpl implements BackendRegistry {
    private factories;
    private instances;
    constructor();
    /**
     * Register a backend factory
     */
    register(id: string, factory: BackendFactoryType): void;
    /**
     * Get a backend instance by ID
     * Returns cached instance if available
     */
    get(id: string): DetectionBackend | undefined;
    /**
     * Get all registered backend IDs
     */
    list(): string[];
    /**
     * Create all backends (fresh instances)
     */
    createAll(): DetectionBackend[];
    /**
     * Create a backend by type
     */
    createByType(type: BackendType): DetectionBackend;
    /**
     * Get backend metadata
     */
    getMetadata(id: string): BackendMetadata | undefined;
    /**
     * Get all backend metadata
     */
    getAllMetadata(): BackendMetadata[];
    /**
     * Clear cached instances
     */
    clearCache(): void;
    /**
     * Check if a backend is available (dependencies met)
     */
    isAvailable(id: string): Promise<boolean>;
}
/**
 * Get the backend factory
 */
export declare function getBackendFactory(): BackendFactoryImpl;
/**
 * Create a backend with hermetic isolation
 */
export declare function createIsolatedBackend(type: BackendType, hermeticEnv?: HermeticEnvironment): Promise<DetectionBackend>;
/**
 * Run detection with hermetic isolation
 */
export declare function detectWithIsolation<T>(type: BackendType, fn: (backend: DetectionBackend) => Promise<T>): Promise<T>;
export { RulesOnlyBackend, HybridBackend, GlinerOnlyBackend };
