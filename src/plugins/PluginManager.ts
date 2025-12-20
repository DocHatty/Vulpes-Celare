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

import * as fs from "fs";
import * as path from "path";
import { vulpesLogger as log } from "../utils/VulpesLogger";
import { EventEmitter } from "events";
import { container, ServiceIds } from "../core/ServiceContainer";
import {
  getPluginSandbox,
  PluginSandbox,
} from "./PluginSandbox";
import {
  type VulpesPluginV2,
  type VulpesPluginHooks,
  type DocumentContext,
  type SpanLike,
  type RedactionResultLike,
  type ShortCircuitResult,
  type PluginMetrics,
  type PluginSystemMetrics,
  type PluginContextV2,
  PluginPriority,
  isPluginV2,
} from "./types";

// ============================================================================
// Types (Legacy + V2 Compatible)
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
  /** Execution priority (0-99). Lower = earlier. Default: 50 */
  priority?: number;
  /** Hook timeout in milliseconds. Default: 5000 */
  timeoutMs?: number;
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
  instance?: PluginInstance | VulpesPluginV2;
  loadedAt?: string;
  error?: string;
  path: string;
  /** Resolved priority for execution order */
  resolvedPriority: number;
}

/**
 * Legacy plugin instance interface.
 * @deprecated Use VulpesPluginV2 for new plugins.
 */
export interface PluginInstance {
  onLoad?(context: PluginContext): Promise<void> | void;
  onUnload?(): Promise<void> | void;
  onEnable?(): Promise<void> | void;
  onDisable?(): Promise<void> | void;
  filter?: FilterPlugin;
  formatter?: FormatterPlugin;
  channel?: ChannelPlugin;
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
  format: string;
  formatOutput(result: unknown): string;
}

export interface ChannelPlugin {
  name: string;
  send(alert: unknown): Promise<void>;
}

/**
 * @deprecated Use VulpesPluginHooks from ./types instead.
 */
export interface HookPlugin {
  beforeRedaction?(text: string): string | Promise<string>;
  afterRedaction?(result: unknown): unknown | Promise<unknown>;
  beforeFilter?(spans: unknown[]): unknown[] | Promise<unknown[]>;
  afterFilter?(spans: unknown[]): unknown[] | Promise<unknown[]>;
}

/**
 * @deprecated Use PluginContextV2 from ./types instead.
 */
export interface PluginContext {
  config: Record<string, unknown>;
  logger: typeof log;
  vulpesVersion: string;
  registerFilter(filter: FilterPlugin): void;
  registerFormatter(formatter: FormatterPlugin): void;
  registerChannel(channel: ChannelPlugin): void;
  registerHooks(hooks: HookPlugin): void;
}

export interface PluginManagerConfig {
  pluginDirs?: string[];
  autoEnable?: boolean;
  pluginConfig?: Record<string, Record<string, unknown>>;
  /** Default timeout for plugin hooks (ms) */
  defaultTimeoutMs?: number;
  /** Whether to enable plugin system. Default: true if VULPES_PLUGINS_ENABLED !== '0' */
  enabled?: boolean;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Unified hook entry that works with both V2 and legacy plugins.
 */
interface HookEntry {
  pluginName: string;
  priority: number;
  timeoutMs: number;
  isV2: boolean;
  v2Hooks?: VulpesPluginHooks;
  legacyHooks?: HookPlugin;
}

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
export class PluginManager extends EventEmitter {
  private static instance: PluginManager | null = null;

  private plugins: Map<string, Plugin> = new Map();
  private filters: Map<string, FilterPlugin> = new Map();
  private formatters: Map<string, FormatterPlugin> = new Map();
  private channels: Map<string, ChannelPlugin> = new Map();

  /** Sorted hook entries by priority */
  private hookEntries: HookEntry[] = [];

  /** Legacy hooks array for backward compatibility */
  private hooks: HookPlugin[] = [];

  private pluginDirs: string[];
  private autoEnable: boolean;
  private pluginConfig: Record<string, Record<string, unknown>>;
  private defaultTimeoutMs: number;
  private enabled: boolean;
  private sandbox: PluginSandbox;

  private constructor(config: PluginManagerConfig = {}) {
    super();

    this.pluginDirs = config.pluginDirs ?? [
      path.join(process.cwd(), "plugins"),
      path.join(process.cwd(), "node_modules", "@vulpes-celare"),
    ];
    this.autoEnable = config.autoEnable ?? false;
    this.pluginConfig = config.pluginConfig ?? {};
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 5000;
    this.enabled = config.enabled ?? process.env.VULPES_PLUGINS_ENABLED !== "0";
    this.sandbox = getPluginSandbox({ defaultTimeoutMs: this.defaultTimeoutMs });
  }

  static getInstance(config?: PluginManagerConfig): PluginManager {
    const fromContainer = container.tryResolve<PluginManager>(ServiceIds.PluginManager);
    if (fromContainer) {
      return fromContainer;
    }
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

  /**
   * Check if plugin system is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if any plugins are registered.
   */
  hasPlugins(): boolean {
    return this.hookEntries.length > 0 || this.hooks.length > 0;
  }

  // ============================================================================
  // Discovery
  // ============================================================================

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
            resolvedPriority: manifest.priority ?? PluginPriority.STANDARD,
          };

          this.plugins.set(manifest.name, plugin);
          discovered.push(plugin);

          log.debug("Discovered plugin", {
            component: "PluginManager",
            plugin: manifest.name,
            version: manifest.version,
            type: manifest.type,
            priority: plugin.resolvedPriority,
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

      const module = await import(mainPath);
      const instance = module.default ?? module;

      plugin.instance = instance;
      plugin.state = "loaded";
      plugin.loadedAt = new Date().toISOString();

      // Resolve priority from instance if V2 plugin
      if (isPluginV2(instance) && instance.priority !== undefined) {
        plugin.resolvedPriority = instance.priority;
      }

      // Call onLoad hook
      if (instance.onLoad) {
        const context = this.createPluginContext(plugin);
        await instance.onLoad(context);
      }

      log.info("Loaded plugin", {
        component: "PluginManager",
        plugin: pluginName,
        version: plugin.manifest.version,
        priority: plugin.resolvedPriority,
        isV2: isPluginV2(instance),
      });

      this.emit("loaded", plugin);

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

  async loadAll(): Promise<Plugin[]> {
    const loaded: Plugin[] = [];

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
  private topologicalSort(): string[] {
    const names = Array.from(this.plugins.keys());
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string, ancestors: Set<string>) => {
      if (ancestors.has(name)) {
        log.warn("Circular dependency detected", {
          component: "PluginManager",
          plugin: name,
        });
        return;
      }
      if (visited.has(name)) return;

      const plugin = this.plugins.get(name);
      if (!plugin) return;

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

  async enable(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || plugin.state !== "loaded") {
      return false;
    }

    try {
      const instance = plugin.instance;
      if (!instance) return false;

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
      if (isPluginV2(instance)) {
        const entry: HookEntry = {
          pluginName,
          priority: plugin.resolvedPriority,
          timeoutMs: instance.timeoutMs ?? plugin.manifest.timeoutMs ?? this.defaultTimeoutMs,
          isV2: true,
          v2Hooks: instance.hooks,
        };
        this.hookEntries.push(entry);
        this.sortHookEntries();
      } else if ("hooks" in instance && instance.hooks) {
        const entry: HookEntry = {
          pluginName,
          priority: plugin.resolvedPriority,
          timeoutMs: plugin.manifest.timeoutMs ?? this.defaultTimeoutMs,
          isV2: false,
          legacyHooks: instance.hooks,
        };
        this.hookEntries.push(entry);
        this.sortHookEntries();
        // Also add to legacy array for backward compat
        this.hooks.push(instance.hooks as HookPlugin);
      }

      plugin.state = "enabled";

      log.info("Enabled plugin", {
        component: "PluginManager",
        plugin: pluginName,
        priority: plugin.resolvedPriority,
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
   * Sort hook entries by priority (lower = earlier).
   */
  private sortHookEntries(): void {
    this.hookEntries.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Type guard to check if hooks object is a legacy HookPlugin (not VulpesPluginHooks)
   */
  private isLegacyHookPlugin(hooks: VulpesPluginHooks | HookPlugin): hooks is HookPlugin {
    // Legacy HookPlugin has onPreProcess/onPostProcess methods
    // VulpesPluginHooks has preProcess/postDetection/preRedaction/postRedaction
    return "onPreProcess" in hooks || "onPostProcess" in hooks;
  }

  async disable(pluginName: string): Promise<boolean> {
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

  async unload(pluginName: string): Promise<boolean> {
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

  async unloadAll(): Promise<void> {
    for (const [name] of this.plugins) {
      await this.unload(name);
    }
  }

  // ============================================================================
  // Plugin Access
  // ============================================================================

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  getFilters(): FilterPlugin[] {
    return Array.from(this.filters.values());
  }

  getFormatter(format: string): FormatterPlugin | undefined {
    return this.formatters.get(format);
  }

  getChannels(): ChannelPlugin[] {
    return Array.from(this.channels.values());
  }

  /**
   * @deprecated Use getHookEntries() for V2 hooks.
   */
  getHooks(): HookPlugin[] {
    return [...this.hooks];
  }

  /**
   * Get all hook entries (V2 API).
   */
  getHookEntries(): HookEntry[] {
    return [...this.hookEntries];
  }

  // ============================================================================
  // V2 Hook Execution (Pipeline Integration)
  // ============================================================================

  /**
   * Execute preProcess hooks on document.
   * Called at the very start of the pipeline.
   */
  async executePreProcess(doc: DocumentContext): Promise<DocumentContext> {
    if (!this.enabled || this.hookEntries.length === 0) {
      return doc;
    }

    let result = doc;

    for (const entry of this.hookEntries) {
      if (entry.isV2 && entry.v2Hooks?.preProcess) {
        const sandboxResult = await this.sandbox.execute(
          entry.pluginName,
          "preProcess",
          () => entry.v2Hooks!.preProcess!(result),
          { timeoutMs: entry.timeoutMs }
        );

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
  async executeShortCircuit(
    doc: DocumentContext
  ): Promise<{ result: ShortCircuitResult; pluginName: string } | null> {
    if (!this.enabled || this.hookEntries.length === 0) {
      return null;
    }

    for (const entry of this.hookEntries) {
      if (entry.isV2 && entry.v2Hooks?.canShortCircuit) {
        const sandboxResult = await this.sandbox.execute(
          entry.pluginName,
          "canShortCircuit",
          () => entry.v2Hooks!.canShortCircuit!(doc),
          { timeoutMs: entry.timeoutMs }
        );

        if (sandboxResult.success && sandboxResult.value !== null && sandboxResult.value !== undefined) {
          this.sandbox.recordShortCircuit(entry.pluginName);
          log.info("Plugin short-circuited pipeline", {
            component: "PluginManager",
            plugin: entry.pluginName,
            reason: sandboxResult.value.reason,
          });
          return {
            result: sandboxResult.value as ShortCircuitResult,
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
  async executePostDetection(
    spans: SpanLike[],
    doc: DocumentContext
  ): Promise<SpanLike[]> {
    if (!this.enabled || this.hookEntries.length === 0) {
      return spans;
    }

    let result = spans;

    for (const entry of this.hookEntries) {
      if (entry.isV2 && entry.v2Hooks?.postDetection) {
        const sandboxResult = await this.sandbox.execute(
          entry.pluginName,
          "postDetection",
          () => entry.v2Hooks!.postDetection!(result, doc),
          { timeoutMs: entry.timeoutMs }
        );

        if (sandboxResult.success && sandboxResult.value) {
          result = sandboxResult.value;
        }
      } else if (!entry.isV2 && entry.legacyHooks?.afterFilter) {
        // Legacy hook compat
        const sandboxResult = await this.sandbox.execute(
          entry.pluginName,
          "afterFilter",
          () => entry.legacyHooks!.afterFilter!(result),
          { timeoutMs: entry.timeoutMs }
        );

        if (sandboxResult.success && sandboxResult.value) {
          result = sandboxResult.value as SpanLike[];
        }
      }
    }

    return result;
  }

  /**
   * Execute preRedaction hooks.
   * Called after all filtering, before token application.
   */
  async executePreRedaction(
    spans: SpanLike[],
    doc: DocumentContext
  ): Promise<SpanLike[]> {
    if (!this.enabled || this.hookEntries.length === 0) {
      return spans;
    }

    let result = spans;

    for (const entry of this.hookEntries) {
      if (entry.isV2 && entry.v2Hooks?.preRedaction) {
        const sandboxResult = await this.sandbox.execute(
          entry.pluginName,
          "preRedaction",
          () => entry.v2Hooks!.preRedaction!(result, doc),
          { timeoutMs: entry.timeoutMs }
        );

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
  async executePostRedaction(
    result: RedactionResultLike
  ): Promise<RedactionResultLike> {
    if (!this.enabled || this.hookEntries.length === 0) {
      return result;
    }

    let output = result;

    // Execute in reverse priority order (highest priority last for post-processing)
    const reversed = [...this.hookEntries].reverse();

    for (const entry of reversed) {
      if (entry.isV2 && entry.v2Hooks?.postRedaction) {
        const sandboxResult = await this.sandbox.execute(
          entry.pluginName,
          "postRedaction",
          () => entry.v2Hooks!.postRedaction!(output),
          { timeoutMs: entry.timeoutMs }
        );

        if (sandboxResult.success && sandboxResult.value) {
          output = sandboxResult.value;
        }
      } else if (!entry.isV2 && entry.legacyHooks?.afterRedaction) {
        // Legacy hook compat
        const sandboxResult = await this.sandbox.execute(
          entry.pluginName,
          "afterRedaction",
          () => entry.legacyHooks!.afterRedaction!(output),
          { timeoutMs: entry.timeoutMs }
        );

        if (sandboxResult.success && sandboxResult.value) {
          output = sandboxResult.value as RedactionResultLike;
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
   * @deprecated Use executePostRedaction instead.
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
  // Metrics
  // ============================================================================

  /**
   * Get metrics for all plugins.
   */
  getSystemMetrics(): PluginSystemMetrics {
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
  getPluginMetrics(pluginName: string): PluginMetrics | undefined {
    return this.sandbox.getMetrics(pluginName);
  }

  // ============================================================================
  // Programmatic Plugin Registration (for testing/embedded plugins)
  // ============================================================================

  /**
   * Register a V2 plugin programmatically.
   * Useful for testing or embedding plugins directly.
   */
  registerPlugin(plugin: VulpesPluginV2): void {
    const manifest: PluginManifest = {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description ?? "",
      type: "hook",
      main: "",
      priority: plugin.priority ?? PluginPriority.STANDARD,
      timeoutMs: plugin.timeoutMs,
    };

    const entry: Plugin = {
      manifest,
      state: "loaded",
      instance: plugin,
      path: "",
      resolvedPriority: plugin.priority ?? PluginPriority.STANDARD,
      loadedAt: new Date().toISOString(),
    };

    this.plugins.set(plugin.name, entry);

    // Auto-enable
    const hookEntry: HookEntry = {
      pluginName: plugin.name,
      priority: entry.resolvedPriority,
      timeoutMs: plugin.timeoutMs ?? this.defaultTimeoutMs,
      isV2: true,
      v2Hooks: plugin.hooks,
    };

    this.hookEntries.push(hookEntry);
    this.sortHookEntries();
    entry.state = "enabled";

    log.info("Registered plugin programmatically", {
      component: "PluginManager",
      plugin: plugin.name,
      priority: entry.resolvedPriority,
    });
  }

  /**
   * Unregister a programmatically registered plugin.
   */
  unregisterPlugin(pluginName: string): void {
    this.hookEntries = this.hookEntries.filter((e) => e.pluginName !== pluginName);
    this.plugins.delete(pluginName);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private createPluginContext(plugin: Plugin): PluginContext & PluginContextV2 {
    const config = this.pluginConfig[plugin.manifest.name] ?? {};

    return {
      config,
      logger: log,
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
      getService: <T>(serviceId: symbol): T | undefined => {
        return container.tryResolve<T>(serviceId);
      },
    };
  }

  private getVulpesVersion(): string {
    try {
      return require("../../package.json").version;
    } catch {
      return "0.0.0";
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const pluginManager = PluginManager.getInstance();

// Re-export types for convenience
export type {
  VulpesPluginV2,
  VulpesPluginHooks,
  DocumentContext,
  SpanLike,
  RedactionResultLike,
  ShortCircuitResult,
  PluginMetrics,
  PluginSystemMetrics,
  PluginContextV2,
} from "./types";

export { PluginPriority } from "./types";
