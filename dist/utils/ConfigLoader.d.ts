/**
 * ConfigLoader - Configuration utility
 * Standalone version for Vulpes Celare
 */
export declare class ConfigLoader {
    private static config;
    static load(_configPath?: string): Record<string, any>;
    static get(key: string, defaultValue?: any): any;
    static getInt(_section: string, key?: string, defaultValue?: number): number;
    static set(key: string, value: any): void;
}
//# sourceMappingURL=ConfigLoader.d.ts.map