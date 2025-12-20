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
import { vulpesLogger as log } from "../utils/VulpesLogger";
import { EventEmitter } from "events";
import { type VulpesPluginV2, type VulpesPluginHooks, type DocumentContext, type SpanLike, type RedactionResultLike, type ShortCircuitResult, type PluginMetrics, type PluginSystemMetrics } from "./types";
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
export declare class PluginManager extends EventEmitter {
    private static instance;
    private plugins;
    private filters;
    private formatters;
    private channels;
    /** Sorted hook entries by priority */
    private hookEntries;
    /** Legacy hooks array for backward compatibility */
    private hooks;
    private pluginDirs;
    private autoEnable;
    private pluginConfig;
    private defaultTimeoutMs;
    private enabled;
    private sandbox;
    private constructor();
    static getInstance(config?: PluginManagerConfig): PluginManager;
    static resetInstance(): void;
    /**
     * Check if plugin system is enabled.
     */
    isEnabled(): boolean;
    /**
     * Check if any plugins are registered.
     */
    hasPlugins(): boolean;
    discover(): Promise<Plugin[]>;
    load(pluginName: string): Promise<Plugin | null>;
    loadAll(): Promise<Plugin[]>;
    /**
     * Topological sort of plugins based on dependencies.
     */
    private topologicalSort;
    enable(pluginName: string): Promise<boolean>;
    /**
     * Sort hook entries by priority (lower = earlier).
     */
    private sortHookEntries;
    /**
     * Type guard to check if hooks object is a legacy HookPlugin (not VulpesPluginHooks)
     */
    private isLegacyHookPlugin;
    disable(pluginName: string): Promise<boolean>;
    unload(pluginName: string): Promise<boolean>;
    unloadAll(): Promise<void>;
    getPlugins(): Plugin[];
    getPlugin(name: string): Plugin | undefined;
    getFilters(): FilterPlugin[];
    getFormatter(format: string): FormatterPlugin | undefined;
    getChannels(): ChannelPlugin[];
    /**
     * @deprecated Use getHookEntries() for V2 hooks.
     */
    getHooks(): HookPlugin[];
    /**
     * Get all hook entries (V2 API).
     */
    getHookEntries(): HookEntry[];
    /**
     * Execute preProcess hooks on document.
     * Called at the very start of the pipeline.
     */
    executePreProcess(doc: DocumentContext): Promise<DocumentContext>;
    /**
     * Execute canShortCircuit hooks.
     * Returns the first non-null result (short-circuit).
     */
    executeShortCircuit(doc: DocumentContext): Promise<{
        result: ShortCircuitResult;
        pluginName: string;
    } | null>;
    /**
     * Execute postDetection hooks.
     * Called after filters detect spans, before disambiguation.
     */
    executePostDetection(spans: SpanLike[], doc: DocumentContext): Promise<SpanLike[]>;
    /**
     * Execute preRedaction hooks.
     * Called after all filtering, before token application.
     */
    executePreRedaction(spans: SpanLike[], doc: DocumentContext): Promise<SpanLike[]>;
    /**
     * Execute postRedaction hooks.
     * Called after redaction is complete.
     */
    executePostRedaction(result: RedactionResultLike): Promise<RedactionResultLike>;
    /**
     * @deprecated Use executePreProcess instead.
     */
    executeBeforeRedaction(text: string): Promise<string>;
    /**
     * @deprecated Use executePostRedaction instead.
     */
    executeAfterRedaction(result: unknown): Promise<unknown>;
    /**
     * Get metrics for all plugins.
     */
    getSystemMetrics(): PluginSystemMetrics;
    /**
     * Get metrics for a specific plugin.
     */
    getPluginMetrics(pluginName: string): PluginMetrics | undefined;
    /**
     * Register a V2 plugin programmatically.
     * Useful for testing or embedding plugins directly.
     */
    registerPlugin(plugin: VulpesPluginV2): void;
    /**
     * Unregister a programmatically registered plugin.
     */
    unregisterPlugin(pluginName: string): void;
    private createPluginContext;
    private getVulpesVersion;
}
export declare const pluginManager: PluginManager;
export type { VulpesPluginV2, VulpesPluginHooks, DocumentContext, SpanLike, RedactionResultLike, ShortCircuitResult, PluginMetrics, PluginSystemMetrics, PluginContextV2, } from "./types";
export { PluginPriority } from "./types";
//# sourceMappingURL=PluginManager.d.ts.map