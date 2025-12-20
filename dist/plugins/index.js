"use strict";
/**
 * Vulpes Celare - Plugin System
 *
 * Gold Standard plugin architecture with:
 * - Priority-based execution
 * - Typed hook interfaces (V2 API)
 * - Timeout protection via PluginSandbox
 * - Short-circuit capability
 * - Per-plugin metrics
 * - Backward compatibility with legacy plugins
 *
 * @module plugins
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLegacyPlugin = exports.isPluginV2 = exports.PluginExecutionError = exports.PluginTimeoutError = exports.resetPluginSandbox = exports.getPluginSandbox = exports.PluginSandbox = exports.PluginPriority = exports.pluginManager = exports.PluginManager = void 0;
// ============================================================================
// Core Plugin Manager
// ============================================================================
var PluginManager_1 = require("./PluginManager");
Object.defineProperty(exports, "PluginManager", { enumerable: true, get: function () { return PluginManager_1.PluginManager; } });
Object.defineProperty(exports, "pluginManager", { enumerable: true, get: function () { return PluginManager_1.pluginManager; } });
Object.defineProperty(exports, "PluginPriority", { enumerable: true, get: function () { return PluginManager_1.PluginPriority; } });
// ============================================================================
// Plugin Sandbox (Timeout Protection)
// ============================================================================
var PluginSandbox_1 = require("./PluginSandbox");
Object.defineProperty(exports, "PluginSandbox", { enumerable: true, get: function () { return PluginSandbox_1.PluginSandbox; } });
Object.defineProperty(exports, "getPluginSandbox", { enumerable: true, get: function () { return PluginSandbox_1.getPluginSandbox; } });
Object.defineProperty(exports, "resetPluginSandbox", { enumerable: true, get: function () { return PluginSandbox_1.resetPluginSandbox; } });
Object.defineProperty(exports, "PluginTimeoutError", { enumerable: true, get: function () { return PluginSandbox_1.PluginTimeoutError; } });
Object.defineProperty(exports, "PluginExecutionError", { enumerable: true, get: function () { return PluginSandbox_1.PluginExecutionError; } });
// ============================================================================
// V2 Types (Direct Export)
// ============================================================================
var types_1 = require("./types");
Object.defineProperty(exports, "isPluginV2", { enumerable: true, get: function () { return types_1.isPluginV2; } });
Object.defineProperty(exports, "isLegacyPlugin", { enumerable: true, get: function () { return types_1.isLegacyPlugin; } });
//# sourceMappingURL=index.js.map