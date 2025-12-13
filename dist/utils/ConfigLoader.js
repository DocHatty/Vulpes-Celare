"use strict";
/**
 * ConfigLoader - Configuration utility
 * Standalone version for Vulpes Celare
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigLoader = void 0;
class ConfigLoader {
    static config = {};
    static load(configPath) {
        return { redaction: { enabled: true, defaultReplacement: "[REDACTED]" } };
    }
    static get(key, defaultValue) {
        return this.config[key] ?? defaultValue;
    }
    static getInt(section, key, defaultValue = 0) {
        // Supports both getInt("key", default) and getInt("section", "key", default)
        if (typeof key === "number" || key === undefined) {
            return typeof key === "number" ? key : defaultValue;
        }
        return defaultValue;
    }
    static set(key, value) {
        this.config[key] = value;
    }
}
exports.ConfigLoader = ConfigLoader;
//# sourceMappingURL=ConfigLoader.js.map