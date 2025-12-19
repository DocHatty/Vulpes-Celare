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
import { vulpesLogger as log } from "../utils/VulpesLogger";
import { EventEmitter } from "events";
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
    format: string;
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
export declare class PluginManager extends EventEmitter {
    private static instance;
    private plugins;
    private filters;
    private formatters;
    private channels;
    private hooks;
    private pluginDirs;
    private autoEnable;
    private pluginConfig;
    private constructor();
    static getInstance(config?: PluginManagerConfig): PluginManager;
    static resetInstance(): void;
    /**
     * Discover plugins in configured directories
     */
    discover(): Promise<Plugin[]>;
    /**
     * Load a discovered plugin
     */
    load(pluginName: string): Promise<Plugin | null>;
    /**
     * Load all discovered plugins
     */
    loadAll(): Promise<Plugin[]>;
    /**
     * Enable a loaded plugin
     */
    enable(pluginName: string): Promise<boolean>;
    /**
     * Disable an enabled plugin
     */
    disable(pluginName: string): Promise<boolean>;
    /**
     * Unload a plugin
     */
    unload(pluginName: string): Promise<boolean>;
    /**
     * Unload all plugins
     */
    unloadAll(): Promise<void>;
    /**
     * Get all plugins
     */
    getPlugins(): Plugin[];
    /**
     * Get a specific plugin
     */
    getPlugin(name: string): Plugin | undefined;
    /**
     * Get all registered filters
     */
    getFilters(): FilterPlugin[];
    /**
     * Get a formatter by format name
     */
    getFormatter(format: string): FormatterPlugin | undefined;
    /**
     * Get all registered channels
     */
    getChannels(): ChannelPlugin[];
    /**
     * Get all registered hooks
     */
    getHooks(): HookPlugin[];
    /**
     * Execute beforeRedaction hooks
     */
    executeBeforeRedaction(text: string): Promise<string>;
    /**
     * Execute afterRedaction hooks
     */
    executeAfterRedaction(result: unknown): Promise<unknown>;
    private createPluginContext;
}
export declare const pluginManager: PluginManager;
//# sourceMappingURL=PluginManager.d.ts.map