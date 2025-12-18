/**
 * ============================================================================
 * VULPES CELARE - BANNER OUTPUT COMPONENT
 * ============================================================================
 *
 * Unified banner system for consistent application branding.
 * Includes ASCII art, version display, and responsive layouts.
 *
 * Usage:
 *   import { Banner } from '../theme/output';
 *
 *   console.log(Banner.logo());
 *   console.log(Banner.full({ version: '1.0.0' }));
 */
export interface BannerOptions {
    /** Application version */
    version?: string;
    /** Show the fox ASCII art */
    showArt?: boolean;
    /** Art size preference */
    artSize?: "compact" | "medium" | "large" | "auto";
    /** Show tagline */
    showTagline?: boolean;
    /** Show border around banner */
    bordered?: boolean;
    /** Centered output */
    centered?: boolean;
    /** Custom subtitle */
    subtitle?: string;
}
export declare class Banner {
    /**
     * Get the fox ASCII art based on terminal width
     */
    static fox(size?: "compact" | "medium" | "large" | "auto"): string;
    /**
     * Get the text logo
     */
    static logo(options?: {
        colored?: boolean;
    }): string;
    /**
     * Get the tagline
     */
    static tagline(options?: {
        colored?: boolean;
    }): string;
    /**
     * Create a minimal banner (text only)
     */
    static minimal(options?: BannerOptions): string;
    /**
     * Create a standard banner with optional art
     */
    static standard(options?: BannerOptions): string;
    /**
     * Create a full banner in a box
     */
    static full(options?: BannerOptions): string;
    /**
     * Create a compact inline banner
     */
    static inline(version?: string): string;
    /**
     * Create a startup banner (shown when CLI starts)
     */
    static startup(options?: BannerOptions): string;
    /**
     * Create a completion banner
     */
    static completion(stats?: {
        duration?: string;
        itemsProcessed?: number;
        redactionsFound?: number;
    }): string;
    /**
     * Create an error banner
     */
    static error(message: string, details?: string): string;
}
export default Banner;
//# sourceMappingURL=Banner.d.ts.map