"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackpressureQueue = exports.CircuitOpenError = exports.CircuitBreaker = exports.Supervisor = void 0;
var Supervisor_1 = require("./Supervisor");
Object.defineProperty(exports, "Supervisor", { enumerable: true, get: function () { return Supervisor_1.Supervisor; } });
var CircuitBreaker_1 = require("./CircuitBreaker");
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return CircuitBreaker_1.CircuitBreaker; } });
Object.defineProperty(exports, "CircuitOpenError", { enumerable: true, get: function () { return CircuitBreaker_1.CircuitOpenError; } });
var BackpressureQueue_1 = require("./BackpressureQueue");
Object.defineProperty(exports, "BackpressureQueue", { enumerable: true, get: function () { return BackpressureQueue_1.BackpressureQueue; } });
//# sourceMappingURL=index.js.map