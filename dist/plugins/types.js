"use strict";
/**
 * Vulpes Celare - Plugin Type Definitions
 *
 * Gold Standard: Strongly typed plugin interfaces based on:
 * - Bifrost LLM Gateway middleware patterns
 * - Anthropic MCP tool/resource types
 * - VSCode Extension Host isolation model
 *
 * @module plugins/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginPriority = void 0;
exports.isPluginV2 = isPluginV2;
exports.isLegacyPlugin = isLegacyPlugin;
// ============================================================================
// PRIORITY GROUPS
// ============================================================================
/**
 * Priority groups for plugin execution order.
 * Lower numbers execute first.
 *
 * @example
 * ```typescript
 * export const myPlugin: VulpesPluginV2 = {
 *   name: 'my-security-plugin',
 *   priority: PluginPriority.SECURITY, // Runs early
 *   hooks: { ... }
 * };
 * ```
 */
exports.PluginPriority = {
    /** Security-critical plugins (0-19) - run first */
    SECURITY: 10,
    /** Core functionality plugins (20-39) */
    CORE: 30,
    /** Standard plugins (40-59) - default */
    STANDARD: 50,
    /** Enhancement plugins (60-79) */
    ENHANCEMENT: 70,
    /** Logging/observability plugins (80-99) - run last */
    LOGGING: 90,
};
/**
 * Type guard to check if a plugin uses V2 interface.
 */
function isPluginV2(plugin) {
    return (typeof plugin === "object" &&
        plugin !== null &&
        "hooks" in plugin &&
        typeof plugin.hooks === "object");
}
/**
 * Type guard to check if a plugin uses legacy interface.
 */
function isLegacyPlugin(plugin) {
    return (typeof plugin === "object" &&
        plugin !== null &&
        "hooks" in plugin &&
        typeof plugin.hooks === "object" &&
        !isPluginV2(plugin));
}
//# sourceMappingURL=types.js.map