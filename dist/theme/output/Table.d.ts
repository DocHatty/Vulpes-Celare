/**
 * ============================================================================
 * VULPES CELARE - TABLE OUTPUT COMPONENT
 * ============================================================================
 *
 * Sleek table rendering for CLI output with theme integration.
 * Wraps cli-table3 with sensible defaults and elegant styling.
 *
 * Usage:
 *   import { Table } from '../theme/output';
 *
 *   const table = Table.create(['Name', 'Value']);
 *   table.push(['Items', '42']);
 *   console.log(table.toString());
 */
import CliTable3 from "cli-table3";
export type TableStyle = "rounded" | "sharp" | "double" | "heavy" | "minimal" | "borderless";
export type TableAlign = "left" | "center" | "right";
export interface TableOptions {
    /** Table border style */
    style?: TableStyle;
    /** Column headers */
    head?: string[];
    /** Column widths (auto-calculated if not set) */
    colWidths?: number[];
    /** Column alignments */
    colAligns?: TableAlign[];
    /** Word wrap content */
    wordWrap?: boolean;
    /** Maximum table width */
    maxWidth?: number;
    /** Header color function */
    headerColor?: (text: string) => string;
    /** Border color function */
    borderColor?: (text: string) => string;
    /** Compact mode (no padding) */
    compact?: boolean;
}
export declare class Table {
    /**
     * Create a new table instance
     */
    static create(headOrOptions?: string[] | TableOptions, options?: TableOptions): CliTable3.Table;
    /**
     * Create a simple key-value table
     */
    static keyValue(data: Record<string, string | number>, options?: TableOptions): string;
    /**
     * Create a data table from array of objects
     */
    static fromObjects<T extends Record<string, unknown>>(data: T[], columns?: (keyof T)[], options?: TableOptions): string;
    /**
     * Create a comparison table (side by side)
     */
    static comparison(left: {
        title: string;
        rows: string[];
    }, right: {
        title: string;
        rows: string[];
    }, options?: TableOptions): string;
    /**
     * Create a stats table (commonly used for metrics)
     */
    static stats(data: Array<{
        label: string;
        value: string | number;
        status?: "success" | "warning" | "error";
    }>, options?: TableOptions): string;
    /**
     * Create a branded Vulpes table
     */
    static vulpes(head: string[], options?: TableOptions): CliTable3.Table;
}
export default Table;
//# sourceMappingURL=Table.d.ts.map