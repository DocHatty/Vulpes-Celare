"use strict";
/**
 * Monitoring Module
 *
 * Provides production monitoring capabilities:
 * - Drift detection for PHI detection quality
 * - Distribution tracking
 * - Alerting for anomalies
 *
 * @module monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.driftDetector = exports.DriftDetector = void 0;
var DriftDetector_1 = require("./DriftDetector");
Object.defineProperty(exports, "DriftDetector", { enumerable: true, get: function () { return DriftDetector_1.DriftDetector; } });
Object.defineProperty(exports, "driftDetector", { enumerable: true, get: function () { return DriftDetector_1.driftDetector; } });
//# sourceMappingURL=index.js.map