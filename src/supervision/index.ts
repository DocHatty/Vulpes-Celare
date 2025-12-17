/**
 * Elixir-Style Supervision Module
 *
 * Implements OTP-style supervision patterns in TypeScript:
 * - Supervisor: Process supervision with restart strategies
 * - CircuitBreaker: Fault isolation with automatic recovery
 * - BackpressureQueue: Flow control for streaming workloads
 *
 * @module supervision
 */

export {
  Supervisor,
  type SupervisorConfig,
  type ChildSpec,
  type ChildProcess,
  type RestartStrategy,
  type RestartType,
} from "./Supervisor";

export {
  CircuitBreaker,
  CircuitOpenError,
  type CircuitBreakerConfig,
  type CircuitState,
} from "./CircuitBreaker";

export {
  BackpressureQueue,
  type BackpressureQueueConfig,
  type QueueStats,
} from "./BackpressureQueue";
