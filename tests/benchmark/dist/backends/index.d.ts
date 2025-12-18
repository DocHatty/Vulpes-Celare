/**
 * ============================================================================
 * BENCHMARK BACKENDS
 * ============================================================================
 *
 * Unified exports for all detection backends.
 *
 * @module benchmark/backends
 */
export type { DetectionBackend, DetectedSpan, StandardizedDocument, GroundTruthSpan, BackendConfiguration, DetectionResult, BackendHealth, BackendCapabilities, BackendRegistry, BackendFactory, } from './DetectionBackend';
export { SUPPORTED_PHI_TYPES } from './DetectionBackend';
export type { PHIType } from './DetectionBackend';
export { BaseBackend } from './BaseBackend';
export { RulesOnlyBackend, createRulesOnlyBackend } from './RulesOnlyBackend';
export { HybridBackend, createHybridBackend } from './HybridBackend';
export { GlinerOnlyBackend, createGlinerOnlyBackend } from './GlinerOnlyBackend';
export { getBackendFactory, createIsolatedBackend, detectWithIsolation, AVAILABLE_BACKENDS, } from './BackendFactory';
export type { BackendType, BackendMetadata } from './BackendFactory';
