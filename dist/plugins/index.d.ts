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
export { PluginManager, pluginManager, type Plugin, type PluginManifest, type PluginInstance, type PluginType, type PluginState, type PluginContext, type PluginManagerConfig, type PluginConfigItem, type FilterPlugin, type FilterMatch, type FormatterPlugin, type ChannelPlugin, type HookPlugin, type VulpesPluginV2, type VulpesPluginHooks, type DocumentContext, type SpanLike, type RedactionResultLike, type ShortCircuitResult, type PluginMetrics, type PluginSystemMetrics, type PluginContextV2, PluginPriority, } from "./PluginManager";
export { PluginSandbox, getPluginSandbox, resetPluginSandbox, PluginTimeoutError, PluginExecutionError, type SandboxConfig, type SandboxResult, } from "./PluginSandbox";
export { type LegacyHookPlugin, isPluginV2, isLegacyPlugin, } from "./types";
//# sourceMappingURL=index.d.ts.map