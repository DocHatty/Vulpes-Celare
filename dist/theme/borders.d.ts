/**
 * ============================================================================
 * VULPES CELARE - BORDER SYSTEM
 * ============================================================================
 *
 * Consistent border styles for boxes, tables, and dividers.
 * Provides multiple styles from minimal to decorative.
 */
export type BorderStyle = "rounded" | "sharp" | "double" | "heavy" | "none";
export interface BoxChars {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
    teeRight: string;
    teeLeft: string;
    teeDown: string;
    teeUp: string;
    cross: string;
}
export declare const boxStyles: Record<Exclude<BorderStyle, "none">, BoxChars>;
/**
 * Get box characters for a given style
 */
export declare function getBoxChars(style: BorderStyle): BoxChars | null;
export type DividerStyle = "light" | "heavy" | "double" | "dotted" | "dashed";
export declare const dividerStyles: Record<DividerStyle, string>;
/**
 * Create a divider line of specified width
 */
export declare function createDivider(width: number, style?: DividerStyle): string;
export interface TableChars {
    top: string;
    topMid: string;
    topLeft: string;
    topRight: string;
    bottom: string;
    bottomMid: string;
    bottomLeft: string;
    bottomRight: string;
    left: string;
    leftMid: string;
    mid: string;
    midMid: string;
    right: string;
    rightMid: string;
    middle: string;
}
/**
 * Get table characters for cli-table3 compatibility
 */
export declare function getTableChars(style?: BorderStyle): TableChars;
/**
 * Minimal table (no borders, just separators)
 */
export declare const minimalTableChars: TableChars;
export interface BoxOptions {
    style?: BorderStyle;
    width?: number;
    padding?: number;
    title?: string;
}
/**
 * Draw a box around content
 */
export declare function drawBox(content: string[], options?: BoxOptions): string[];
export declare const borders: {
    readonly boxStyles: Record<"rounded" | "sharp" | "double" | "heavy", BoxChars>;
    readonly dividerStyles: Record<DividerStyle, string>;
    readonly getBoxChars: typeof getBoxChars;
    readonly getTableChars: typeof getTableChars;
    readonly minimalTableChars: TableChars;
    readonly createDivider: typeof createDivider;
    readonly drawBox: typeof drawBox;
};
//# sourceMappingURL=borders.d.ts.map