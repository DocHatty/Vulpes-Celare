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

import * as fs from "fs";
import * as path from "path";
import { vulpesLogger as log } from "../utils/VulpesLogger";
import { EventEmitter } from "events";
import { container, ServiceIds } from "../core/ServiceContainer";

// ============================================================================
// Types
// ============================================================================

export type PluginType = "filter" | "formatter" | "channel" | "hook";

export type PluginState = "discovered" | "loaded" | "enabled" | "disabled" | "error";

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  type: PluginType;
  main: string;
  dependencies?: Record<string, string>;
  vulpesVersion?: string;
  config?: Record<string, PluginConfigItem>;
}

export interface PluginConfigItem {
  type: "string" | "number" | "boolean" | "array" | "object";
  default?: unknown;
  required?: boolean;
  description?: string;
}

export interface Plugin {
  manifest: PluginManifest;
  state: PluginState;
  instance?: PluginInstance;
  loadedAt?: string;
  error?: string;
  path: string;
}

export interface PluginInstance {
  /** Called when plugin is loaded */
  onLoad?(context: PluginContext): Promise<void> | void;

  /** Called when plugin is unloaded */
  onUnload?(): Promise<void> | void;

  /** Called when plugin is enabled */
  onEnable?(): Promise<void> | void;

  /** Called when plugin is disabled */
  onDisable?(): Promise<void> | void;

  /** For filter plugins: the filter implementation */
  filter?: FilterPlugin;

  /** For formatter plugins: the formatter implementation */
  formatter?: FormatterPlugin;

  /** For channel plugins: the channel implementation */
  channel?: ChannelPlugin;

  /** For hook plugins: the hooks */
  hooks?: HookPlugin;
}

export interface FilterPlugin {
  name: string;
  phiTypes: string[];
  detect(text: string): FilterMatch[];
}

export interface FilterMatch {
  start: number;
  end: number;
  text: string;
  type: string;
  confidence: number;
}

export interface FormatterPlugin {
  name: string;
  format: string; // e.g., "xml", "csv", "custom"
  formatOutput(result: unknown): string;
}

export interface ChannelPlugin {
  name: string;
  send(alert: unknown): Promise<void>;
}

export interface HookPlugin {
  beforeRedaction?(text: string): string | Promise<string>;
  afterRedaction?(result: unknown): unknown | Promise<unknown>;
  beforeFilter?(spans: unknown[]): unknown[] | Promise<unknown[]>;
  afterFilter?(spans: unknown[]): unknown[] | Promise<unknown[]>;
}

export interface PluginContext {
  /** Plugin configuration */
  config: Record<string, unknown>;

  /** Logger instance for the plugin */
  logger: typeof log;

  /** Vulpes version */
  vulpesVersion: string;

  /** Register a filter with the engine */
  registerFilter(filter: FilterPlugin): void;

  /** Register a formatter */
  registerFormatter(formatter: FormatterPlugin): void;

  /** Register an alert channel */
  registerChannel(channel: ChannelPlugin): void;

  /** Register hooks */
  registerHooks(hooks: HookPlugin): void;
}

export interface PluginManagerConfig {
  /** Directories to search for plugins */
  pluginDirs?: string[];

  /** Auto-enable discovered plugins */
  autoEnable?: boolean;

  /** Plugin configuration */
  pluginConfig?: Record<string, Record<string, unknown>>;
}

// ============================================================================
// Plugin Manager
// ============================================================================

export class PluginManager extends EventEmitter {
  private static instance: PluginManager | null = null;

  private plugins: Map<string, Plugin> = new Map();
  private filters: Map<string, FilterPlugin> = new Map();
  private formatters: Map<string, FormatterPlugin> = new Map();
  private channels: Map<string, ChannelPlugin> = new Map();
  private hooks: HookPlugin[] = [];

  private pluginDirs: string[];
  private autoEnable: boolean;
  private pluginConfig: Record<string, Record<string, unknown>>;

  private constructor(config: PluginManagerConfig = {}) {
    super();

    this.pluginDirs = config.pluginDirs ?? [
      path.join(process.cwd(), "plugins"),
      path.join(process.cwd(), "node_modules", "@vulpes-celare"),
    ];
    this.autoEnable = config.autoEnable ?? false;
    this.pluginConfig = config.pluginConfig ?? {};
  }

  static getInstance(config?: PluginManagerConfig): PluginManager {
    // Check DI container first (enables testing/replacement)
    const fromContainer = container.tryResolve<PluginManager>(ServiceIds.PluginManager);
    if (fromContainer) {
      return fromContainer;
    }
    // Fall back to static instance
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager(config);
      container.registerInstance(ServiceIds.PluginManager, PluginManager.instance);
    }
    return PluginManager.instance;
  }

  static resetInstance(): void {
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
  async discover(): Promise<Plugin[]> {
    const discovered: Plugin[] = [];

    for (const dir of this.pluginDirs) {
      if (!fs.existsSync(dir)) continue;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pluginPath = path.join(dir, entry.name);
        const manifestPath = path.join(pluginPath, "vulpes-plugin.json");

        if (!fs.existsSync(manifestPath)) continue;

        try {
          const manifestContent = fs.readFileSync(manifestPath, "utf-8");
          const manifest: PluginManifest = JSON.parse(manifestContent);

          const plugin: Plugin = {
            manifest,
            state: "discovered",
            path: pluginPath,
          };

          this.plugins.set(manifest.name, plugin);
          discovered.push(plugin);

          log.debug("Discovered plugin", {
            component: "PluginManager",
            plugin: manifest.name,
            version: manifest.version,
            type: manifest.type,
          });
        } catch (error) {
          log.warn("Failed to read plugin manifest", {
            component: "PluginManager",
            path: manifestPath,
            error: (error as Error).message,
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
  async load(pluginName: string): Promise<Plugin | null> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      log.warn("Plugin not found", {
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
      const module = await import(mainPath);
      const instance: PluginInstance = module.default ?? module;

      plugin.instance = instance;
      plugin.state = "loaded";
      plugin.loadedAt = new Date().toISOString();

      // Call onLoad hook
      if (instance.onLoad) {
        const context = this.createPluginContext(plugin);
        await instance.onLoad(context);
      }

      log.info("Loaded plugin", {
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
    } catch (error) {
      plugin.state = "error";
      plugin.error = (error as Error).message;

      log.error("Failed to load plugin", {
        component: "PluginManager",
        plugin: pluginName,
        error: (error as Error).message,
      });

      this.emit("error", { plugin, error });
      return null;
    }
  }

  /**
   * Load all discovered plugins
   */
  async loadAll(): Promise<Plugin[]> {
    const loaded: Plugin[] = [];

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
  async enable(pluginName: string): Promise<boolean> {
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

      log.info("Enabled plugin", {
        component: "PluginManager",
        plugin: pluginName,
      });

      this.emit("enabled", plugin);
      return true;
    } catch (error) {
      plugin.state = "error";
      plugin.error = (error as Error).message;

      log.error("Failed to enable plugin", {
        component: "PluginManager",
        plugin: pluginName,
        error: (error as Error).message,
      });

      return false;
    }
  }

  /**
   * Disable an enabled plugin
   */
  async disable(pluginName: string): Promise<boolean> {
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

      log.info("Disabled plugin", {
        component: "PluginManager",
        plugin: pluginName,
      });

      this.emit("disabled", plugin);
      return true;
    } catch (error) {
      log.error("Failed to disable plugin", {
        component: "PluginManager",
        plugin: pluginName,
        error: (error as Error).message,
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
  async unload(pluginName: string): Promise<boolean> {
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

      log.info("Unloaded plugin", {
        component: "PluginManager",
        plugin: pluginName,
      });

      this.emit("unloaded", plugin);
      return true;
    } catch (error) {
      log.error("Failed to unload plugin", {
        component: "PluginManager",
        plugin: pluginName,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Unload all plugins
   */
  async unloadAll(): Promise<void> {
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
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered filters
   */
  getFilters(): FilterPlugin[] {
    return Array.from(this.filters.values());
  }

  /**
   * Get a formatter by format name
   */
  getFormatter(format: string): FormatterPlugin | undefined {
    return this.formatters.get(format);
  }

  /**
   * Get all registered channels
   */
  getChannels(): ChannelPlugin[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get all registered hooks
   */
  getHooks(): HookPlugin[] {
    return [...this.hooks];
  }

  // ============================================================================
  // Hook Execution
  // ============================================================================

  /**
   * Execute beforeRedaction hooks
   */
  async executeBeforeRedaction(text: string): Promise<string> {
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
  async executeAfterRedaction(result: unknown): Promise<unknown> {
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

  private createPluginContext(plugin: Plugin): PluginContext {
    const config = this.pluginConfig[plugin.manifest.name] ?? {};

    return {
      config,
      logger: log,
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

// ============================================================================
// Singleton Export
// ============================================================================

export const pluginManager = PluginManager.getInstance();
