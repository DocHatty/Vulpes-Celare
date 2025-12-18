/**
 * ============================================================================
 * BENCHMARK HARNESS
 * ============================================================================
 *
 * Unified exports for benchmark harness components.
 *
 * @module benchmark/harness
 */

export {
  HermeticEnvironment,
  getHermeticEnvironment,
  runInIsolation,
} from './HermeticEnvironment';
export type { EnvironmentSnapshot } from './HermeticEnvironment';

export {
  BenchmarkOrchestrator,
  createOrchestrator,
} from './BenchmarkOrchestrator';
export type {
  BenchmarkConfig,
  BackendBenchmarkResult,
  BenchmarkResults,
} from './BenchmarkOrchestrator';
