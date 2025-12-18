"use strict";
/**
 * VULPES CELARE - Privacy Module
 *
 * Advanced privacy features including differential privacy for
 * privacy-preserving analytics and statistics.
 *
 * @module privacy
 *
 * @example
 * ```typescript
 * import {
 *   DifferentialPrivacy,
 *   PrivacyAccountant,
 *   createDifferentialPrivacy
 * } from 'vulpes-celare/privacy';
 *
 * // Create with preset
 * const dp = createDifferentialPrivacy('balanced');
 *
 * // Add noise to statistics
 * const noisyCount = dp.addLaplaceNoise(1000, 1);
 * console.log(`Noisy count: ${noisyCount.noisy}`);
 *
 * // Track privacy budget
 * const accountant = new PrivacyAccountant(10);
 * accountant.recordQuery(1.0);
 * console.log(`Budget remaining: ${accountant.getRemainingBudget()}`);
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDifferentialPrivacy = exports.PrivacyAccountant = exports.DPHistogram = exports.PRIVACY_PRESETS = exports.DifferentialPrivacy = void 0;
var DifferentialPrivacy_1 = require("./DifferentialPrivacy");
Object.defineProperty(exports, "DifferentialPrivacy", { enumerable: true, get: function () { return DifferentialPrivacy_1.DifferentialPrivacy; } });
Object.defineProperty(exports, "PRIVACY_PRESETS", { enumerable: true, get: function () { return DifferentialPrivacy_1.PRIVACY_PRESETS; } });
Object.defineProperty(exports, "DPHistogram", { enumerable: true, get: function () { return DifferentialPrivacy_1.DPHistogram; } });
Object.defineProperty(exports, "PrivacyAccountant", { enumerable: true, get: function () { return DifferentialPrivacy_1.PrivacyAccountant; } });
Object.defineProperty(exports, "createDifferentialPrivacy", { enumerable: true, get: function () { return DifferentialPrivacy_1.createDifferentialPrivacy; } });
//# sourceMappingURL=index.js.map