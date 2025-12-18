"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Divider = void 0;
const chalk_theme_1 = require("../chalk-theme");
const icons_1 = require("../icons");
const spacing_1 = require("../spacing");
const typography_1 = require("../typography");
// ============================================================================
// DIVIDER CLASS
// ============================================================================
class Divider {
    /**
     * Create a simple horizontal line
     */
    static line(options = {}) {
        const { style = "light", width = (0, spacing_1.getTerminalWidth)() - 2, color = chalk_theme_1.theme.muted, paddingTop = 0, paddingBottom = 0, } = options;
        const char = style === "space" ? " " : icons_1.dividers[style];
        const line = color(char.repeat(width));
        const parts = [];
        if (paddingTop > 0) {
            parts.push("\n".repeat(paddingTop));
        }
        parts.push(line);
        if (paddingBottom > 0) {
            parts.push("\n".repeat(paddingBottom));
        }
        return parts.join("");
    }
    /**
     * Create a divider with a title
     */
    static titled(title, options = {}) {
        const { style = "light", width = (0, spacing_1.getTerminalWidth)() - 2, color = chalk_theme_1.theme.muted, align = "center", titleColor = chalk_theme_1.theme.primary, titlePadding = 2, paddingTop = 0, paddingBottom = 0, } = options;
        const char = style === "space" ? " " : icons_1.dividers[style];
        const titleStr = ` ${title} `;
        const titleLen = (0, typography_1.stripAnsi)(titleStr).length;
        const lineSpace = width - titleLen - (titlePadding * 2);
        if (lineSpace < 4) {
            // Not enough space for line, just return centered title
            return titleColor(title);
        }
        let line;
        if (align === "left") {
            const leftLen = titlePadding;
            const rightLen = lineSpace + titlePadding;
            line = color(char.repeat(leftLen)) + titleColor(titleStr) + color(char.repeat(rightLen));
        }
        else if (align === "right") {
            const leftLen = lineSpace + titlePadding;
            const rightLen = titlePadding;
            line = color(char.repeat(leftLen)) + titleColor(titleStr) + color(char.repeat(rightLen));
        }
        else {
            const leftLen = Math.floor(lineSpace / 2) + titlePadding;
            const rightLen = Math.ceil(lineSpace / 2) + titlePadding;
            line = color(char.repeat(leftLen)) + titleColor(titleStr) + color(char.repeat(rightLen));
        }
        const parts = [];
        if (paddingTop > 0) {
            parts.push("\n".repeat(paddingTop));
        }
        parts.push(line);
        if (paddingBottom > 0) {
            parts.push("\n".repeat(paddingBottom));
        }
        return parts.join("");
    }
    /**
     * Create a section divider (heavier, more prominent)
     */
    static section(title, options = {}) {
        const opts = {
            ...options,
            style: options.style ?? "heavy",
            titleColor: options.titleColor ?? chalk_theme_1.theme.primary.bold,
            paddingTop: options.paddingTop ?? 1,
            paddingBottom: options.paddingBottom ?? 1,
        };
        return title ? this.titled(title, opts) : this.line(opts);
    }
    /**
     * Create a subtle divider (lighter, less prominent)
     */
    static subtle(options = {}) {
        return this.line({
            ...options,
            style: options.style ?? "dotted",
            color: options.color ?? chalk_theme_1.theme.faint,
        });
    }
    /**
     * Create blank space (empty lines)
     */
    static space(lines = 1) {
        return "\n".repeat(lines);
    }
    /**
     * Create a branded Vulpes divider
     */
    static vulpes(title, options = {}) {
        const opts = {
            ...options,
            color: chalk_theme_1.theme.primary,
            titleColor: chalk_theme_1.theme.primary.bold,
        };
        return title ? this.titled(title, opts) : this.line(opts);
    }
    /**
     * Convenience presets
     */
    static get light() { return this.line({ style: "light" }); }
    static get heavy() { return this.line({ style: "heavy" }); }
    static get double() { return this.line({ style: "double" }); }
    static get dotted() { return this.line({ style: "dotted" }); }
    static get dashed() { return this.line({ style: "dashed" }); }
}
exports.Divider = Divider;
exports.default = Divider;
//# sourceMappingURL=Divider.js.map