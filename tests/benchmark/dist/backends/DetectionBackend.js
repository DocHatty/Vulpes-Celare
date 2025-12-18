"use strict";
/**
 * ============================================================================
 * DETECTION BACKEND INTERFACE
 * ============================================================================
 *
 * Unified interface for all PHI detection backends (Rules, Hybrid, GLiNER).
 * This abstraction enables model-agnostic benchmarking and fair comparison.
 *
 * Design follows existing VulpesCelare.redactWithPolicy() signature while
 * adding benchmark-specific metadata and lifecycle management.
 *
 * @module benchmark/backends/DetectionBackend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_PHI_TYPES = void 0;
/**
 * Default PHI types supported by Vulpes Celare
 */
exports.SUPPORTED_PHI_TYPES = [
    'name',
    'ssn',
    'phone',
    'email',
    'address',
    'date',
    'mrn',
    'ip',
    'url',
    'credit_card',
    'account',
    'health_plan',
    'license',
    'passport',
    'vehicle',
    'device',
    'biometric',
    'zip',
    'fax',
    'age',
];
//# sourceMappingURL=DetectionBackend.js.map