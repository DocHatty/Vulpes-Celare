"use strict";
/**
 * ============================================================================
 * STATISTICAL ENGINE
 * ============================================================================
 *
 * Unified exports for statistical testing components.
 *
 * @module benchmark/statistical
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBootstrapCI = exports.BootstrapCI = exports.createStatisticalTests = exports.StatisticalTests = void 0;
var StatisticalTests_1 = require("./StatisticalTests");
Object.defineProperty(exports, "StatisticalTests", { enumerable: true, get: function () { return StatisticalTests_1.StatisticalTests; } });
Object.defineProperty(exports, "createStatisticalTests", { enumerable: true, get: function () { return StatisticalTests_1.createStatisticalTests; } });
var BootstrapCI_1 = require("./BootstrapCI");
Object.defineProperty(exports, "BootstrapCI", { enumerable: true, get: function () { return BootstrapCI_1.BootstrapCI; } });
Object.defineProperty(exports, "createBootstrapCI", { enumerable: true, get: function () { return BootstrapCI_1.createBootstrapCI; } });
//# sourceMappingURL=index.js.map