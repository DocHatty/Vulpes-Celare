"use strict";
/**
 * Vulpes Celare - Plugin Manager (V2)
 *
 * Gold Standard plugin architecture based on:
 * - Bifrost LLM Gateway (priority-based middleware, short-circuit)
 * - VSCode Extension Host (isolation, typed APIs)
 * - Anthropic MCP (standardized tool interface)
 *
 * Features:
 * - Plugin discovery and loading
 * - Priority-based execution order
 * - Typed hook interfaces (V2)
 * - Timeout protection via PluginSandbox
 * - Short-circuit capability for fast-path optimization
 * - Per-plugin metrics and observability
 * - Backward compatibility with legacy plugins
 *
 * @module plugins/PluginManager
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginPriority = exports.pluginManager = exports.PluginManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const VulpesLogger_1 = require("../utils/VulpesLogger");
const events_1 = require("events");
const ServiceContainer_1 = require("../core/ServiceContainer");
const PluginSandbox_1 = require("./PluginSandbox");
const types_1 = require("./types");
// ============================================================================
// Plugin Manager
// ============================================================================
/**
 * Plugin Manager with priority-based execution, timeout protection, and typed hooks.
 *
 * Gold Standard Features:
 * 1. Priority-based execution (Bifrost pattern)
 * 2. Timeout protection (VSCode Extension Host pattern)
 * 3. Short-circuit capability (fast-path optimization)
 * 4. Typed hook interfaces (V2 API)
 * 5. Per-plugin metrics and observability
 * 6. Backward compatibility with legacy plugins
 */
class PluginManager extends events_1.EventEmitter {
    static instance = null;
    plugins = new Map();
    filters = new Map();
    formatters = new Map();
    channels = new Map();
    /** Sorted hook entries by priority */
    hookEntries = [];
    /** Legacy hooks array for backward compatibility */
    hooks = [];
    pluginDirs;
    autoEnable;
    pluginConfig;
    defaultTimeoutMs;
    enabled;
    sandbox;
    constructor(config = {}) {
        super();
        this.pluginDirs = config.pluginDirs ?? [
            path.join(process.cwd(), "plugins"),
            path.join(process.cwd(), "node_modules", "@vulpes-celare"),
        ];
        this.autoEnable = config.autoEnable ?? false;
        this.pluginConfig = config.pluginConfig ?? {};
        this.defaultTimeoutMs = config.defaultTimeoutMs ?? 5000;
        this.enabled = config.enabled ?? process.env.VULPES_PLUGINS_ENABLED !== "0";
        this.sandbox = (0, PluginSandbox_1.getPluginSandbox)({ defaultTimeoutMs: this.defaultTimeoutMs });
    }
    static getInstance(config) {
        const fromContainer = ServiceContainer_1.container.tryResolve(ServiceContainer_1.ServiceIds.PluginManager);
        if (fromContainer) {
            return fromContainer;
        }
        if (!PluginManager.instance) {
            PluginManager.instance = new PluginManager(config);
            ServiceContainer_1.container.registerInstance(ServiceContainer_1.ServiceIds.PluginManager, PluginManager.instance);
        }
        return PluginManager.instance;
    }
    static resetInstance() {
        if (PluginManager.instance) {
            PluginManager.instance.unloadAll();
        }
        PluginManager.instance = null;
    }
    /**
     * Check if plugin system is enabled.
     */
    isEnabled() {
        return this.enabled;
    }
    /**
     * Check if any plugins are registered.
     */
    hasPlugins() {
        return this.hookEntries.length > 0 || this.hooks.length > 0;
    }
    // ============================================================================
    // Discovery
    // ============================================================================
    async discover() {
        const discovered = [];
        for (const dir of this.pluginDirs) {
            if (!fs.existsSync(dir))
                continue;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const pluginPath = path.join(dir, entry.name);
                const manifestPath = path.join(pluginPath, "vulpes-plugin.json");
                if (!fs.existsSync(manifestPath))
                    continue;
                try {
                    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
                    const manifest = JSON.parse(manifestContent);
                    const plugin = {
                        manifest,
                        state: "discovered",
                        path: pluginPath,
                        resolvedPriority: manifest.priority ?? types_1.PluginPriority.STANDARD,
                    };
                    this.plugins.set(manifest.name, plugin);
                    discovered.push(plugin);
                    VulpesLogger_1.vulpesLogger.debug("Discovered plugin", {
                        component: "PluginManager",
                        plugin: manifest.name,
                        version: manifest.version,
                        type: manifest.type,
                        priority: plugin.resolvedPriority,
                    });
                }
                catch (error) {
                    VulpesLogger_1.vulpesLogger.warn("Failed to read plugin manifest", {
                        component: "PluginManager",
                        path: manifestPath,
                        error: error.message,
                    });
                }
            }
        }
        this.emit("discovered", discovered);
        return discovered;
    }
    // ============================================================================
    // Loading
    // ============================================================================
    async load(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            VulpesLogger_1.vulpesLogger.warn("Plugin not found", {
                component: "PluginManager",
                plugin: pluginName,
            });
            return null;
        }
        if (plugin.state === "loaded" || plugin.state === "enabled") {
            return plugin;
        }
        try {
            const mainPath = path.join(plugin.path, plugin.manifest.main);
            if (!fs.existsSync(mainPath)) {
                throw new Error(`Main file not found: ${mainPath}`);
            }
            const module = await Promise.resolve(`${mainPath}`).then(s => __importStar(require(s)));
            const instance = module.default ?? module;
            plugin.instance = instance;
            plugin.state = "loaded";
            plugin.loadedAt = new Date().toISOString();
            // Resolve priority from instance if V2 plugin
            if ((0, types_1.isPluginV2)(instance) && instance.priority !== undefined) {
                plugin.resolvedPriority = instance.priority;
            }
            // Call onLoad hook
            if (instance.onLoad) {
                const context = this.createPluginContext(plugin);
                await instance.onLoad(context);
            }
            VulpesLogger_1.vulpesLogger.info("Loaded plugin", {
                component: "PluginManager",
                plugin: pluginName,
                version: plugin.manifest.version,
                priority: plugin.resolvedPriority,
                isV2: (0, types_1.isPluginV2)(instance),
            });
            this.emit("loaded", plugin);
            if (this.autoEnable) {
                await this.enable(pluginName);
            }
            return plugin;
        }
        catch (error) {
            plugin.state = "error";
            plugin.error = error.message;
            VulpesLogger_1.vulpesLogger.error("Failed to load plugin", {
                component: "PluginManager",
                plugin: pluginName,
                error: error.message,
            });
            this.emit("error", { plugin, error });
            return null;
        }
    }
    async loadAll() {
        const loaded = [];
        // Load in dependency order (if dependencies specified)
        const sortedNames = this.topologicalSort();
        for (const name of sortedNames) {
            const plugin = await this.load(name);
            if (plugin) {
                loaded.push(plugin);
            }
        }
        return loaded;
    }
    /**
     * Topological sort of plugins based on dependencies.
     */
    topologicalSort() {
        const names = Array.from(this.plugins.keys());
        const visited = new Set();
        const result = [];
        const visit = (name, ancestors) => {
            if (ancestors.has(name)) {
                VulpesLogger_1.vulpesLogger.warn("Circular dependency detected", {
                    component: "PluginManager",
                    plugin: name,
                });
                return;
            }
            if (visited.has(name))
                return;
            const plugin = this.plugins.get(name);
            if (!plugin)
                return;
            ancestors.add(name);
            const deps = Object.keys(plugin.manifest.dependencies ?? {});
            for (const dep of deps) {
                if (this.plugins.has(dep)) {
                    visit(dep, new Set(ancestors));
                }
            }
            ancestors.delete(name);
            visited.add(name);
            result.push(name);
        };
        for (const name of names) {
            visit(name, new Set());
        }
        return result;
    }
    // ============================================================================
    // Enable/Disable
    // ============================================================================
    async enable(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin || plugin.state !== "loaded") {
            return false;
        }
        try {
            const instance = plugin.instance;
            if (!instance)
                return false;
            if (instance.onEnable) {
                await instance.onEnable();
            }
            // Register plugin capabilities
            if ("filter" in instance && instance.filter) {
                this.filters.set(pluginName, instance.filter);
            }
            if ("formatter" in instance && instance.formatter) {
                this.formatters.set(instance.formatter.format, instance.formatter);
            }
            if ("channel" in instance && instance.channel) {
                this.channels.set(pluginName, instance.channel);
            }
            // Register hooks (V2 or legacy)
            if ((0, types_1.isPluginV2)(instance)) {
                const entry = {
                    pluginName,
                    priority: plugin.resolvedPriority,
                    timeoutMs: instance.timeoutMs ?? plugin.manifest.timeoutMs ?? this.defaultTimeoutMs,
                    isV2: true,
                    v2Hooks: instance.hooks,
                };
                this.hookEntries.push(entry);
                this.sortHookEntries();
            }
            else if ("hooks" in instance && instance.hooks) {
                const entry = {
                    pluginName,
                    priority: plugin.resolvedPriority,
                    timeoutMs: plugin.manifest.timeoutMs ?? this.defaultTimeoutMs,
                    isV2: false,
                    legacyHooks: instance.hooks,
                };
                this.hookEntries.push(entry);
                this.sortHookEntries();
                // Also add to legacy array for backward compat
                this.hooks.push(instance.hooks);
            }
            plugin.state = "enabled";
            VulpesLogger_1.vulpesLogger.info("Enabled plugin", {
                component: "PluginManager",
                plugin: pluginName,
                priority: plugin.resolvedPriority,
            });
            this.emit("enabled", plugin);
            return true;
        }
        catch (error) {
            plugin.state = "error";
            plugin.error = error.message;
            VulpesLogger_1.vulpesLogger.error("Failed to enable plugin", {
                component: "PluginManager",
                plugin: pluginName,
                error: error.message,
            });
            return false;
        }
    }
    /**
     * Sort hook entries by priority (lower = earlier).
     */
    sortHookEntries() {
        this.hookEntries.sort((a, b) => a.priority - b.priority);
    }
    /**
     * Type guard to check if hooks object is a legacy HookPlugin (not VulpesPluginHooks)
     */
    isLegacyHookPlugin(hooks) {
        // Legacy HookPlugin has onPreProcess/onPostProcess methods
        // VulpesPluginHooks has preProcess/postDetection/preRedaction/postRedaction
        return "onPreProcess" in hooks || "onPostProcess" in hooks;
    }
    async disable(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin || plugin.state !== "enabled") {
            return false;
        }
        try {
            const instance = plugin.instance;
            if (instance?.onDisable) {
                await instance.onDisable();
            }
            // Unregister capabilities
            this.filters.delete(pluginName);
            if (instance && "formatter" in instance && instance.formatter) {
                this.formatters.delete(instance.formatter.format);
            }
            this.channels.delete(pluginName);
            // Remove from hook entries
            this.hookEntries = this.hookEntries.filter((e) => e.pluginName !== pluginName);
            // Remove from legacy hooks array (only if it's a legacy HookPlugin, not VulpesPluginHooks)
            if (instance && "hooks" in instance && instance.hooks && this.isLegacyHookPlugin(instance.hooks)) {
                const idx = this.hooks.indexOf(instance.hooks);
                if (idx >= 0) {
                    this.hooks.splice(idx, 1);
                }
            }
            plugin.state = "loaded";
            VulpesLogger_1.vulpesLogger.info("Disabled plugin", {
                component: "PluginManager",
                plugin: pluginName,
            });
            this.emit("disabled", plugin);
            return true;
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.error("Failed to disable plugin", {
                component: "PluginManager",
                plugin: pluginName,
                error: error.message,
            });
            return false;
        }
    }
    // ============================================================================
    // Unloading
    // ============================================================================
    async unload(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            return false;
        }
        if (plugin.state === "enabled") {
            await this.disable(pluginName);
        }
        try {
            if (plugin.instance?.onUnload) {
                await plugin.instance.onUnload();
            }
            plugin.instance = undefined;
            plugin.state = "discovered";
            VulpesLogger_1.vulpesLogger.info("Unloaded plugin", {
                component: "PluginManager",
                plugin: pluginName,
            });
            this.emit("unloaded", plugin);
            return true;
        }
        catch (error) {
            VulpesLogger_1.vulpesLogger.error("Failed to unload plugin", {
                component: "PluginManager",
                plugin: pluginName,
                error: error.message,
            });
            return false;
        }
    }
    async unloadAll() {
        for (const [name] of this.plugins) {
            await this.unload(name);
        }
    }
    // ============================================================================
    // Plugin Access
    // ============================================================================
    getPlugins() {
        return Array.from(this.plugins.values());
    }
    getPlugin(name) {
        return this.plugins.get(name);
    }
    getFilters() {
        return Array.from(this.filters.values());
    }
    getFormatter(format) {
        return this.formatters.get(format);
    }
    getChannels() {
        return Array.from(this.channels.values());
    }
    /**
     * @deprecated Use getHookEntries() for V2 hooks.
     */
    getHooks() {
        return [...this.hooks];
    }
    /**
     * Get all hook entries (V2 API).
     */
    getHookEntries() {
        return [...this.hookEntries];
    }
    // ============================================================================
    // V2 Hook Execution (Pipeline Integration)
    // ============================================================================
    /**
     * Execute preProcess hooks on document.
     * Called at the very start of the pipeline.
     */
    async executePreProcess(doc) {
        if (!this.enabled || this.hookEntries.length === 0) {
            return doc;
        }
        let result = doc;
        for (const entry of this.hookEntries) {
            if (entry.isV2 && entry.v2Hooks?.preProcess) {
                const sandboxResult = await this.sandbox.execute(entry.pluginName, "preProcess", () => entry.v2Hooks.preProcess(result), { timeoutMs: entry.timeoutMs });
                if (sandboxResult.success && sandboxResult.value) {
                    result = sandboxResult.value;
                }
            }
        }
        return result;
    }
    /**
     * Execute canShortCircuit hooks.
     * Returns the first non-null result (short-circuit).
     */
    async executeShortCircuit(doc) {
        if (!this.enabled || this.hookEntries.length === 0) {
            return null;
        }
        for (const entry of this.hookEntries) {
            if (entry.isV2 && entry.v2Hooks?.canShortCircuit) {
                const sandboxResult = await this.sandbox.execute(entry.pluginName, "canShortCircuit", () => entry.v2Hooks.canShortCircuit(doc), { timeoutMs: entry.timeoutMs });
                if (sandboxResult.success && sandboxResult.value !== null && sandboxResult.value !== undefined) {
                    this.sandbox.recordShortCircuit(entry.pluginName);
                    VulpesLogger_1.vulpesLogger.info("Plugin short-circuited pipeline", {
                        component: "PluginManager",
                        plugin: entry.pluginName,
                        reason: sandboxResult.value.reason,
                    });
                    return {
                        result: sandboxResult.value,
                        pluginName: entry.pluginName,
                    };
                }
            }
        }
        return null;
    }
    /**
     * Execute postDetection hooks.
     * Called after filters detect spans, before disambiguation.
     */
    async executePostDetection(spans, doc) {
        if (!this.enabled || this.hookEntries.length === 0) {
            return spans;
        }
        let result = spans;
        for (const entry of this.hookEntries) {
            if (entry.isV2 && entry.v2Hooks?.postDetection) {
                const sandboxResult = await this.sandbox.execute(entry.pluginName, "postDetection", () => entry.v2Hooks.postDetection(result, doc), { timeoutMs: entry.timeoutMs });
                if (sandboxResult.success && sandboxResult.value) {
                    result = sandboxResult.value;
                }
            }
            else if (!entry.isV2 && entry.legacyHooks?.afterFilter) {
                // Legacy hook compat
                const sandboxResult = await this.sandbox.execute(entry.pluginName, "afterFilter", () => entry.legacyHooks.afterFilter(result), { timeoutMs: entry.timeoutMs });
                if (sandboxResult.success && sandboxResult.value) {
                    result = sandboxResult.value;
                }
            }
        }
        return result;
    }
    /**
     * Execute preRedaction hooks.
     * Called after all filtering, before token application.
     */
    async executePreRedaction(spans, doc) {
        if (!this.enabled || this.hookEntries.length === 0) {
            return spans;
        }
        let result = spans;
        for (const entry of this.hookEntries) {
            if (entry.isV2 && entry.v2Hooks?.preRedaction) {
                const sandboxResult = await this.sandbox.execute(entry.pluginName, "preRedaction", () => entry.v2Hooks.preRedaction(result, doc), { timeoutMs: entry.timeoutMs });
                if (sandboxResult.success && sandboxResult.value) {
                    result = sandboxResult.value;
                }
            }
        }
        return result;
    }
    /**
     * Execute postRedaction hooks.
     * Called after redaction is complete.
     */
    async executePostRedaction(result) {
        if (!this.enabled || this.hookEntries.length === 0) {
            return result;
        }
        let output = result;
        // Execute in reverse priority order (highest priority last for post-processing)
        const reversed = [...this.hookEntries].reverse();
        for (const entry of reversed) {
            if (entry.isV2 && entry.v2Hooks?.postRedaction) {
                const sandboxResult = await this.sandbox.execute(entry.pluginName, "postRedaction", () => entry.v2Hooks.postRedaction(output), { timeoutMs: entry.timeoutMs });
                if (sandboxResult.success && sandboxResult.value) {
                    output = sandboxResult.value;
                }
            }
            else if (!entry.isV2 && entry.legacyHooks?.afterRedaction) {
                // Legacy hook compat
                const sandboxResult = await this.sandbox.execute(entry.pluginName, "afterRedaction", () => entry.legacyHooks.afterRedaction(output), { timeoutMs: entry.timeoutMs });
                if (sandboxResult.success && sandboxResult.value) {
                    output = sandboxResult.value;
                }
            }
        }
        return output;
    }
    // ============================================================================
    // Legacy Hook Execution (Backward Compatibility)
    // ============================================================================
    /**
     * @deprecated Use executePreProcess instead.
     */
    async executeBeforeRedaction(text) {
        let result = text;
        for (const hook of this.hooks) {
            if (hook.beforeRedaction) {
                result = await hook.beforeRedaction(result);
            }
        }
        return result;
    }
    /**
     * @deprecated Use executePostRedaction instead.
     */
    async executeAfterRedaction(result) {
        let output = result;
        for (const hook of this.hooks) {
            if (hook.afterRedaction) {
                output = await hook.afterRedaction(output);
            }
        }
        return output;
    }
    // ============================================================================
    // Metrics
    // ============================================================================
    /**
     * Get metrics for all plugins.
     */
    getSystemMetrics() {
        const pluginMetrics = this.sandbox.getAllMetrics();
        const enabledCount = this.hookEntries.length;
        let totalInvocations = 0;
        let totalErrors = 0;
        let totalTimeouts = 0;
        for (const metrics of Object.values(pluginMetrics)) {
            totalInvocations += metrics.invocations;
            totalErrors += metrics.errors;
            totalTimeouts += metrics.timeouts;
        }
        return {
            totalPlugins: this.plugins.size,
            enabledPlugins: enabledCount,
            totalInvocations,
            totalErrors,
            totalTimeouts,
            plugins: pluginMetrics,
        };
    }
    /**
     * Get metrics for a specific plugin.
     */
    getPluginMetrics(pluginName) {
        return this.sandbox.getMetrics(pluginName);
    }
    // ============================================================================
    // Programmatic Plugin Registration (for testing/embedded plugins)
    // ============================================================================
    /**
     * Register a V2 plugin programmatically.
     * Useful for testing or embedding plugins directly.
     */
    registerPlugin(plugin) {
        const manifest = {
            name: plugin.name,
            version: plugin.version,
            description: plugin.description ?? "",
            type: "hook",
            main: "",
            priority: plugin.priority ?? types_1.PluginPriority.STANDARD,
            timeoutMs: plugin.timeoutMs,
        };
        const entry = {
            manifest,
            state: "loaded",
            instance: plugin,
            path: "",
            resolvedPriority: plugin.priority ?? types_1.PluginPriority.STANDARD,
            loadedAt: new Date().toISOString(),
        };
        this.plugins.set(plugin.name, entry);
        // Auto-enable
        const hookEntry = {
            pluginName: plugin.name,
            priority: entry.resolvedPriority,
            timeoutMs: plugin.timeoutMs ?? this.defaultTimeoutMs,
            isV2: true,
            v2Hooks: plugin.hooks,
        };
        this.hookEntries.push(hookEntry);
        this.sortHookEntries();
        entry.state = "enabled";
        VulpesLogger_1.vulpesLogger.info("Registered plugin programmatically", {
            component: "PluginManager",
            plugin: plugin.name,
            priority: entry.resolvedPriority,
        });
    }
    /**
     * Unregister a programmatically registered plugin.
     */
    unregisterPlugin(pluginName) {
        this.hookEntries = this.hookEntries.filter((e) => e.pluginName !== pluginName);
        this.plugins.delete(pluginName);
    }
    // ============================================================================
    // Private Helpers
    // ============================================================================
    createPluginContext(plugin) {
        const config = this.pluginConfig[plugin.manifest.name] ?? {};
        return {
            config,
            logger: VulpesLogger_1.vulpesLogger,
            vulpesVersion: this.getVulpesVersion(),
            registerFilter: (filter) => {
                this.filters.set(plugin.manifest.name, filter);
            },
            registerFormatter: (formatter) => {
                this.formatters.set(formatter.format, formatter);
            },
            registerChannel: (channel) => {
                this.channels.set(plugin.manifest.name, channel);
            },
            registerHooks: (hooks) => {
                this.hooks.push(hooks);
            },
            getService: (serviceId) => {
                return ServiceContainer_1.container.tryResolve(serviceId);
            },
        };
    }
    getVulpesVersion() {
        try {
            return require("../../package.json").version;
        }
        catch {
            return "0.0.0";
        }
    }
}
exports.PluginManager = PluginManager;
// ============================================================================
// Singleton Export
// ============================================================================
exports.pluginManager = PluginManager.getInstance();
var types_2 = require("./types");
Object.defineProperty(exports, "PluginPriority", { enumerable: true, get: function () { return types_2.PluginPriority; } });
//# sourceMappingURL=PluginManager.js.map