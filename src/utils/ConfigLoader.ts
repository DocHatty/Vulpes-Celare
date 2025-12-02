/**
 * ConfigLoader - Configuration utility
 * Standalone version for Vulpes Celare
 */

export class ConfigLoader {
  private static config: Record<string, any> = {};
  
  static load(configPath?: string): Record<string, any> {
    return { redaction: { enabled: true, defaultReplacement: "[REDACTED]" } };
  }
  
  static get(key: string, defaultValue?: any): any {
    return this.config[key] ?? defaultValue;
  }
  
  static getInt(section: string, key?: string, defaultValue: number = 0): number {
    // Supports both getInt("key", default) and getInt("section", "key", default)
    if (typeof key === "number" || key === undefined) {
      return typeof key === "number" ? key : defaultValue;
    }
    return defaultValue;
  }
  
  static set(key: string, value: any): void {
    this.config[key] = value;
  }
}
