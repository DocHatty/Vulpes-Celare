"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = void 0;
const cli_table3_1 = __importDefault(require("cli-table3"));
const chalk_theme_1 = require("../chalk-theme");
const icons_1 = require("../icons");
const spacing_1 = require("../spacing");
// ============================================================================
// BORDER CHARACTER SETS
// ============================================================================
function getTableChars(style, colorFn) {
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
    const chars = style === "double" ? icons_1.boxDouble
        : style === "heavy" ? icons_1.boxHeavy
            : style === "sharp" ? icons_1.boxSharp
                : icons_1.boxRounded;
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
class Table {
    /**
     * Create a new table instance
     */
    static create(headOrOptions, options = {}) {
        // Handle overloaded arguments
        let head;
        let opts;
        if (Array.isArray(headOrOptions)) {
            head = headOrOptions;
            opts = options;
        }
        else {
            opts = headOrOptions || {};
            head = opts.head;
        }
        const { style = "rounded", colWidths, colAligns, wordWrap = true, 
        // maxWidth reserved for future auto-sizing features
        maxWidth: _maxWidth = (0, spacing_1.getTerminalWidth)() - 4, headerColor = chalk_theme_1.theme.primary.bold, borderColor = chalk_theme_1.theme.muted, compact = false, } = opts;
        void _maxWidth; // Reserved for future use
        // Style the headers
        const styledHead = head?.map(h => headerColor(h));
        // Build table options
        const tableOptions = {
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
        return new cli_table3_1.default(tableOptions);
    }
    /**
     * Create a simple key-value table
     */
    static keyValue(data, options = {}) {
        const table = this.create({
            ...options,
            style: options.style ?? "minimal",
        });
        const labelColor = options.headerColor ?? chalk_theme_1.theme.muted;
        for (const [key, value] of Object.entries(data)) {
            table.push([labelColor(key), String(value)]);
        }
        return table.toString();
    }
    /**
     * Create a data table from array of objects
     */
    static fromObjects(data, columns, options = {}) {
        if (data.length === 0)
            return "";
        const cols = columns ?? Object.keys(data[0]);
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
    static comparison(left, right, options = {}) {
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
    static stats(data, options = {}) {
        const table = this.create({
            ...options,
            style: options.style ?? "rounded",
        });
        for (const { label, value, status } of data) {
            let displayValue = String(value);
            if (status === "success") {
                displayValue = chalk_theme_1.theme.success(displayValue);
            }
            else if (status === "warning") {
                displayValue = chalk_theme_1.theme.warning(displayValue);
            }
            else if (status === "error") {
                displayValue = chalk_theme_1.theme.error(displayValue);
            }
            table.push([chalk_theme_1.theme.muted(label), displayValue]);
        }
        return table.toString();
    }
    /**
     * Create a branded Vulpes table
     */
    static vulpes(head, options = {}) {
        return this.create(head, {
            ...options,
            style: "rounded",
            headerColor: chalk_theme_1.theme.primary.bold,
            borderColor: chalk_theme_1.theme.primary,
        });
    }
}
exports.Table = Table;
exports.default = Table;
//# sourceMappingURL=Table.js.map