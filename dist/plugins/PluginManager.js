"use strict";
/**
 * Vulpes Celare - Plugin Manager
 *
 * Lightweight plugin architecture for extending Vulpes Celare.
 *
 * Features:
 * - Plugin discovery and loading
 * - Lifecycle hooks (load, unload, enable, disable)
 * - Filter plugins for custom PHI detection
 * - Output plugins for custom formatters
 * - Hook system for pipeline extension
 *
 * Plugin types:
 * - Filter: Add custom PHI detection patterns
 * - Formatter: Add custom output formats
 * - Channel: Add custom alert channels
 * - Hook: Intercept pipeline stages
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
exports.pluginManager = exports.PluginManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const VulpesLogger_1 = require("../utils/VulpesLogger");
const events_1 = require("events");
const ServiceContainer_1 = require("../core/ServiceContainer");
// ============================================================================
// Plugin Manager
// ============================================================================
class PluginManager extends events_1.EventEmitter {
    static instance = null;
    plugins = new Map();
    filters = new Map();
    formatters = new Map();
    channels = new Map();
    hooks = [];
    pluginDirs;
    autoEnable;
    pluginConfig;
    constructor(config = {}) {
        super();
        this.pluginDirs = config.pluginDirs ?? [
            path.join(process.cwd(), "plugins"),
            path.join(process.cwd(), "node_modules", "@vulpes-celare"),
        ];
        this.autoEnable = config.autoEnable ?? false;
        this.pluginConfig = config.pluginConfig ?? {};
    }
    static getInstance(config) {
        // Check DI container first (enables testing/replacement)
        const fromContainer = ServiceContainer_1.container.tryResolve(ServiceContainer_1.ServiceIds.PluginManager);
        if (fromContainer) {
            return fromContainer;
        }
        // Fall back to static instance
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
    // ============================================================================
    // Discovery
    // ============================================================================
    /**
     * Discover plugins in configured directories
     */
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
                    };
                    this.plugins.set(manifest.name, plugin);
                    discovered.push(plugin);
                    VulpesLogger_1.vulpesLogger.debug("Discovered plugin", {
                        component: "PluginManager",
                        plugin: manifest.name,
                        version: manifest.version,
                        type: manifest.type,
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
    /**
     * Load a discovered plugin
     */
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
            // Dynamic import
            const module = await Promise.resolve(`${mainPath}`).then(s => __importStar(require(s)));
            const instance = module.default ?? module;
            plugin.instance = instance;
            plugin.state = "loaded";
            plugin.loadedAt = new Date().toISOString();
            // Call onLoad hook
            if (instance.onLoad) {
                const context = this.createPluginContext(plugin);
                await instance.onLoad(context);
            }
            VulpesLogger_1.vulpesLogger.info("Loaded plugin", {
                component: "PluginManager",
                plugin: pluginName,
                version: plugin.manifest.version,
            });
            this.emit("loaded", plugin);
            // Auto-enable if configured
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
    /**
     * Load all discovered plugins
     */
    async loadAll() {
        const loaded = [];
        for (const [name] of this.plugins) {
            const plugin = await this.load(name);
            if (plugin) {
                loaded.push(plugin);
            }
        }
        return loaded;
    }
    // ============================================================================
    // Enable/Disable
    // ============================================================================
    /**
     * Enable a loaded plugin
     */
    async enable(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin || plugin.state !== "loaded") {
            return false;
        }
        try {
            if (plugin.instance?.onEnable) {
                await plugin.instance.onEnable();
            }
            // Register plugin capabilities
            if (plugin.instance?.filter) {
                this.filters.set(pluginName, plugin.instance.filter);
            }
            if (plugin.instance?.formatter) {
                this.formatters.set(plugin.instance.formatter.format, plugin.instance.formatter);
            }
            if (plugin.instance?.channel) {
                this.channels.set(pluginName, plugin.instance.channel);
            }
            if (plugin.instance?.hooks) {
                this.hooks.push(plugin.instance.hooks);
            }
            plugin.state = "enabled";
            VulpesLogger_1.vulpesLogger.info("Enabled plugin", {
                component: "PluginManager",
                plugin: pluginName,
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
     * Disable an enabled plugin
     */
    async disable(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin || plugin.state !== "enabled") {
            return false;
        }
        try {
            if (plugin.instance?.onDisable) {
                await plugin.instance.onDisable();
            }
            // Unregister plugin capabilities
            this.filters.delete(pluginName);
            if (plugin.instance?.formatter) {
                this.formatters.delete(plugin.instance.formatter.format);
            }
            this.channels.delete(pluginName);
            // Remove hooks
            if (plugin.instance?.hooks) {
                const idx = this.hooks.indexOf(plugin.instance.hooks);
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
    /**
     * Unload a plugin
     */
    async unload(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            return false;
        }
        // Disable first if enabled
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
    /**
     * Unload all plugins
     */
    async unloadAll() {
        for (const [name] of this.plugins) {
            await this.unload(name);
        }
    }
    // ============================================================================
    // Plugin Access
    // ============================================================================
    /**
     * Get all plugins
     */
    getPlugins() {
        return Array.from(this.plugins.values());
    }
    /**
     * Get a specific plugin
     */
    getPlugin(name) {
        return this.plugins.get(name);
    }
    /**
     * Get all registered filters
     */
    getFilters() {
        return Array.from(this.filters.values());
    }
    /**
     * Get a formatter by format name
     */
    getFormatter(format) {
        return this.formatters.get(format);
    }
    /**
     * Get all registered channels
     */
    getChannels() {
        return Array.from(this.channels.values());
    }
    /**
     * Get all registered hooks
     */
    getHooks() {
        return [...this.hooks];
    }
    // ============================================================================
    // Hook Execution
    // ============================================================================
    /**
     * Execute beforeRedaction hooks
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
     * Execute afterRedaction hooks
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
    // Private Helpers
    // ============================================================================
    createPluginContext(plugin) {
        const config = this.pluginConfig[plugin.manifest.name] ?? {};
        return {
            config,
            logger: VulpesLogger_1.vulpesLogger,
            vulpesVersion: require("../../package.json").version,
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
        };
    }
}
exports.PluginManager = PluginManager;
// ============================================================================
// Singleton Export
// ============================================================================
exports.pluginManager = PluginManager.getInstance();
//# sourceMappingURL=PluginManager.js.map