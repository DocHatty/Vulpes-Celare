/**
 * ============================================================================
 * VULPES CELARE - DIVIDER OUTPUT COMPONENT
 * ============================================================================
 *
 * Elegant horizontal dividers for CLI output.
 * Provides visual separation between sections.
 *
 * Usage:
 *   import { Divider } from '../theme/output';
 *
 *   console.log(Divider.line());
 *   console.log(Divider.titled('Section'));
 */
export type DividerStyle = "light" | "heavy" | "double" | "dotted" | "dashed" | "space";
export type DividerAlign = "left" | "center" | "right";
export interface DividerOptions {
    /** Divider line style */
    style?: DividerStyle;
    /** Width of the divider */
    width?: number;
    /** Color function */
    color?: (text: string) => string;
    /** Padding (blank lines) above */
    paddingTop?: number;
    /** Padding (blank lines) below */
    paddingBottom?: number;
}
export interface TitledDividerOptions extends DividerOptions {
    /** Title alignment */
    align?: DividerAlign;
    /** Title color function */
    titleColor?: (text: string) => string;
    /** Spacing around title */
    titlePadding?: number;
}
export declare class Divider {
    /**
     * Create a simple horizontal line
     */
    static line(options?: DividerOptions): string;
    /**
     * Create a divider with a title
     */
    static titled(title: string, options?: TitledDividerOptions): string;
    /**
     * Create a section divider (heavier, more prominent)
     */
    static section(title?: string, options?: TitledDividerOptions): string;
    /**
     * Create a subtle divider (lighter, less prominent)
     */
    static subtle(options?: DividerOptions): string;
    /**
     * Create blank space (empty lines)
     */
    static space(lines?: number): string;
    /**
     * Create a branded Vulpes divider
     */
    static vulpes(title?: string, options?: TitledDividerOptions): string;
    /**
     * Convenience presets
     */
    static get light(): string;
    static get heavy(): string;
    static get double(): string;
    static get dotted(): string;
    static get dashed(): string;
}
export default Divider;
//# sourceMappingURL=Divider.d.ts.map