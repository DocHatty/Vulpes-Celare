/**
 * ============================================================================
 * VULPES CELARE - BOX OUTPUT COMPONENT
 * ============================================================================
 *
 * Elegant box drawing for CLI output. Creates beautiful bordered boxes
 * with optional titles, various styles, and color support.
 *
 * Usage:
 *   import { Box } from '../theme/output';
 *
 *   console.log(Box.create('Hello World'));
 *   console.log(Box.create('Content', { title: 'Info', style: 'rounded' }));
 *   console.log(Box.success('Operation complete!'));
 */
export type BoxStyle = "rounded" | "sharp" | "double" | "heavy" | "minimal";
export type BoxAlign = "left" | "center" | "right";
export interface BoxOptions {
    /** Border style */
    style?: BoxStyle;
    /** Padding inside the box (characters) */
    padding?: number;
    /** Horizontal padding (overrides padding) */
    paddingX?: number;
    /** Vertical padding (overrides padding) */
    paddingY?: number;
    /** Box title (displayed in top border) */
    title?: string;
    /** Title alignment */
    titleAlign?: BoxAlign;
    /** Content alignment */
    align?: BoxAlign;
    /** Fixed width (auto-calculated if not set) */
    width?: number;
    /** Maximum width */
    maxWidth?: number;
    /** Border color function */
    borderColor?: (text: string) => string;
    /** Title color function */
    titleColor?: (text: string) => string;
    /** Background dimming */
    dimContent?: boolean;
}
export declare class Box {
    /**
     * Create a box around content
     */
    static create(content: string | string[], options?: BoxOptions): string;
    /**
     * Create a success box (green border)
     */
    static success(content: string | string[], options?: BoxOptions): string;
    /**
     * Create an error box (red border)
     */
    static error(content: string | string[], options?: BoxOptions): string;
    /**
     * Create a warning box (yellow border)
     */
    static warning(content: string | string[], options?: BoxOptions): string;
    /**
     * Create an info box (blue border)
     */
    static info(content: string | string[], options?: BoxOptions): string;
    /**
     * Create a branded Vulpes box (orange border)
     */
    static vulpes(content: string | string[], options?: BoxOptions): string;
    /**
     * Create a simple inline box (minimal style)
     */
    static inline(content: string): string;
    /**
     * Create a highlight box for important content
     */
    static highlight(content: string | string[], options?: BoxOptions): string;
}
export default Box;
//# sourceMappingURL=Box.d.ts.map