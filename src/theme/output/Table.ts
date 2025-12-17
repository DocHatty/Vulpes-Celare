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
import { theme } from "../chalk-theme";
import { boxRounded, boxSharp, boxDouble, boxHeavy } from "../icons";
import { getTerminalWidth } from "../spacing";

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// BORDER CHARACTER SETS
// ============================================================================

function getTableChars(style: TableStyle, colorFn: (s: string) => string): object {
  if (style === "borderless") {
    return {
      top: "", "top-mid": "", "top-left": "", "top-right": "",
      bottom: "", "bottom-mid": "", "bottom-left": "", "bottom-right": "",
      left: "", "left-mid": "", mid: "", "mid-mid": "",
      right: "", "right-mid": "", middle: "  ",
    };
  }

  if (style === "minimal") {
    return {
      top: "", "top-mid": "", "top-left": "", "top-right": "",
      bottom: "", "bottom-mid": "", "bottom-left": "", "bottom-right": "",
      left: "", "left-mid": "",
      mid: colorFn("\u2500"), "mid-mid": colorFn("\u2500"),
      right: "", "right-mid": "",
      middle: colorFn(" \u2502 "),
    };
  }

  const chars = style === "double" ? boxDouble
    : style === "heavy" ? boxHeavy
    : style === "sharp" ? boxSharp
    : boxRounded;

  return {
    top: colorFn(chars.horizontal),
    "top-mid": colorFn(chars.teeDown),
    "top-left": colorFn(chars.topLeft),
    "top-right": colorFn(chars.topRight),
    bottom: colorFn(chars.horizontal),
    "bottom-mid": colorFn(chars.teeUp),
    "bottom-left": colorFn(chars.bottomLeft),
    "bottom-right": colorFn(chars.bottomRight),
    left: colorFn(chars.vertical),
    "left-mid": colorFn(chars.teeRight),
    mid: colorFn(chars.horizontal),
    "mid-mid": colorFn(chars.cross),
    right: colorFn(chars.vertical),
    "right-mid": colorFn(chars.teeLeft),
    middle: colorFn(chars.vertical),
  };
}

// ============================================================================
// TABLE CLASS
// ============================================================================

export class Table {
  /**
   * Create a new table instance
   */
  static create(headOrOptions?: string[] | TableOptions, options: TableOptions = {}): CliTable3.Table {
    // Handle overloaded arguments
    let head: string[] | undefined;
    let opts: TableOptions;

    if (Array.isArray(headOrOptions)) {
      head = headOrOptions;
      opts = options;
    } else {
      opts = headOrOptions || {};
      head = opts.head;
    }

    const {
      style = "rounded",
      colWidths,
      colAligns,
      wordWrap = true,
      // maxWidth reserved for future auto-sizing features
      maxWidth: _maxWidth = getTerminalWidth() - 4,
      headerColor = theme.primary.bold,
      borderColor = theme.muted,
      compact = false,
    } = opts;
    void _maxWidth; // Reserved for future use

    // Style the headers
    const styledHead = head?.map(h => headerColor(h));

    // Build table options
    const tableOptions: CliTable3.TableConstructorOptions = {
      head: styledHead,
      chars: getTableChars(style, borderColor),
      style: {
        head: [],
        border: [],
        "padding-left": compact ? 0 : 1,
        "padding-right": compact ? 0 : 1,
      },
      wordWrap,
    };

    if (colWidths) {
      tableOptions.colWidths = colWidths;
    }

    if (colAligns) {
      tableOptions.colAligns = colAligns;
    }

    return new CliTable3(tableOptions);
  }

  /**
   * Create a simple key-value table
   */
  static keyValue(
    data: Record<string, string | number>,
    options: TableOptions = {}
  ): string {
    const table = this.create({
      ...options,
      style: options.style ?? "minimal",
    });

    const labelColor = options.headerColor ?? theme.muted;

    for (const [key, value] of Object.entries(data)) {
      table.push([labelColor(key), String(value)]);
    }

    return table.toString();
  }

  /**
   * Create a data table from array of objects
   */
  static fromObjects<T extends Record<string, unknown>>(
    data: T[],
    columns?: (keyof T)[],
    options: TableOptions = {}
  ): string {
    if (data.length === 0) return "";

    const cols = columns ?? (Object.keys(data[0]) as (keyof T)[]);
    const headers = cols.map(c => String(c));

    const table = this.create(headers, options);

    for (const row of data) {
      table.push(cols.map(col => String(row[col] ?? "")));
    }

    return table.toString();
  }

  /**
   * Create a comparison table (side by side)
   */
  static comparison(
    left: { title: string; rows: string[] },
    right: { title: string; rows: string[] },
    options: TableOptions = {}
  ): string {
    const table = this.create([left.title, right.title], {
      ...options,
      colAligns: ["left", "left"],
    });

    const maxRows = Math.max(left.rows.length, right.rows.length);

    for (let i = 0; i < maxRows; i++) {
      table.push([
        left.rows[i] ?? "",
        right.rows[i] ?? "",
      ]);
    }

    return table.toString();
  }

  /**
   * Create a stats table (commonly used for metrics)
   */
  static stats(
    data: Array<{ label: string; value: string | number; status?: "success" | "warning" | "error" }>,
    options: TableOptions = {}
  ): string {
    const table = this.create({
      ...options,
      style: options.style ?? "rounded",
    });

    for (const { label, value, status } of data) {
      let displayValue = String(value);

      if (status === "success") {
        displayValue = theme.success(displayValue);
      } else if (status === "warning") {
        displayValue = theme.warning(displayValue);
      } else if (status === "error") {
        displayValue = theme.error(displayValue);
      }

      table.push([theme.muted(label), displayValue]);
    }

    return table.toString();
  }

  /**
   * Create a branded Vulpes table
   */
  static vulpes(head: string[], options: TableOptions = {}): CliTable3.Table {
    return this.create(head, {
      ...options,
      style: "rounded",
      headerColor: theme.primary.bold,
      borderColor: theme.primary,
    });
  }
}

export default Table;
