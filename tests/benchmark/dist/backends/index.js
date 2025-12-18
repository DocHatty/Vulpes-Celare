"use strict";
/**
 * ============================================================================
 * BENCHMARK BACKENDS
 * ============================================================================
 *
 * Unified exports for all detection backends.
 *
 * @module benchmark/backends
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_BACKENDS = exports.detectWithIsolation = exports.createIsolatedBackend = exports.getBackendFactory = exports.createGlinerOnlyBackend = exports.GlinerOnlyBackend = exports.createHybridBackend = exports.HybridBackend = exports.createRulesOnlyBackend = exports.RulesOnlyBackend = exports.BaseBackend = exports.SUPPORTED_PHI_TYPES = void 0;
var DetectionBackend_1 = require("./DetectionBackend");
Object.defineProperty(exports, "SUPPORTED_PHI_TYPES", { enumerable: true, get: function () { return DetectionBackend_1.SUPPORTED_PHI_TYPES; } });
// Base class
var BaseBackend_1 = require("./BaseBackend");
Object.defineProperty(exports, "BaseBackend", { enumerable: true, get: function () { return BaseBackend_1.BaseBackend; } });
// Backend implementations
var RulesOnlyBackend_1 = require("./RulesOnlyBackend");
Object.defineProperty(exports, "RulesOnlyBackend", { enumerable: true, get: function () { return RulesOnlyBackend_1.RulesOnlyBackend; } });
Object.defineProperty(exports, "createRulesOnlyBackend", { enumerable: true, get: function () { return RulesOnlyBackend_1.createRulesOnlyBackend; } });
var HybridBackend_1 = require("./HybridBackend");
Object.defineProperty(exports, "HybridBackend", { enumerable: true, get: function () { return HybridBackend_1.HybridBackend; } });
Object.defineProperty(exports, "createHybridBackend", { enumerable: true, get: function () { return HybridBackend_1.createHybridBackend; } });
var GlinerOnlyBackend_1 = require("./GlinerOnlyBackend");
Object.defineProperty(exports, "GlinerOnlyBackend", { enumerable: true, get: function () { return GlinerOnlyBackend_1.GlinerOnlyBackend; } });
Object.defineProperty(exports, "createGlinerOnlyBackend", { enumerable: true, get: function () { return GlinerOnlyBackend_1.createGlinerOnlyBackend; } });
// Factory
var BackendFactory_1 = require("./BackendFactory");
Object.defineProperty(exports, "getBackendFactory", { enumerable: true, get: function () { return BackendFactory_1.getBackendFactory; } });
Object.defineProperty(exports, "createIsolatedBackend", { enumerable: true, get: function () { return BackendFactory_1.createIsolatedBackend; } });
Object.defineProperty(exports, "detectWithIsolation", { enumerable: true, get: function () { return BackendFactory_1.detectWithIsolation; } });
Object.defineProperty(exports, "AVAILABLE_BACKENDS", { enumerable: true, get: function () { return BackendFactory_1.AVAILABLE_BACKENDS; } });
//# sourceMappingURL=index.js.map