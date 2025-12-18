"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Box = void 0;
const chalk_theme_1 = require("../chalk-theme");
const icons_1 = require("../icons");
const typography_1 = require("../typography");
const spacing_1 = require("../spacing");
// ============================================================================
// BOX CHARACTER SETS
// ============================================================================
const BOX_STYLES = {
    rounded: icons_1.boxRounded,
    sharp: icons_1.boxSharp,
    double: icons_1.boxDouble,
    heavy: icons_1.boxHeavy,
};
const MINIMAL_CHARS = {
    topLeft: " ",
    topRight: " ",
    bottomLeft: " ",
    bottomRight: " ",
    horizontal: " ",
    vertical: " ",
};
// ============================================================================
// BOX CLASS
// ============================================================================
class Box {
    /**
     * Create a box around content
     */
    static create(content, options = {}) {
        const { style = "rounded", padding = 1, paddingX = padding, paddingY = Math.max(0, padding - 1), title, titleAlign = "left", align = "left", width, maxWidth = (0, spacing_1.getTerminalWidth)() - 4, borderColor = chalk_theme_1.theme.muted, titleColor = chalk_theme_1.theme.primary, dimContent = false, } = options;
        // Get box characters
        const chars = style === "minimal" ? MINIMAL_CHARS : BOX_STYLES[style];
        // Normalize content to lines
        const lines = Array.isArray(content) ? content : content.split("\n");
        // Calculate content width
        const contentWidths = lines.map((line) => (0, typography_1.stripAnsi)(line).length);
        const maxContentWidth = Math.max(...contentWidths, 0);
        const titleWidth = title ? (0, typography_1.stripAnsi)(title).length + 4 : 0; // +4 for " title "
        // Calculate box width
        let boxWidth = width ?? Math.min(maxWidth, Math.max(maxContentWidth, titleWidth) + paddingX * 2 + 2);
        const innerWidth = boxWidth - 2; // -2 for borders
        // Build the box
        const result = [];
        // Top border with optional title
        if (title) {
            const titleStr = ` ${title} `;
            const titleLen = (0, typography_1.stripAnsi)(titleStr).length;
            const remainingWidth = innerWidth - titleLen;
            let topBorder;
            if (titleAlign === "center") {
                const leftPad = Math.floor(remainingWidth / 2);
                const rightPad = remainingWidth - leftPad;
                topBorder =
                    chars.topLeft +
                        chars.horizontal.repeat(leftPad) +
                        titleColor(titleStr) +
                        chars.horizontal.repeat(rightPad) +
                        chars.topRight;
            }
            else if (titleAlign === "right") {
                topBorder =
                    chars.topLeft +
                        chars.horizontal.repeat(remainingWidth - 1) +
                        titleColor(titleStr) +
                        chars.horizontal +
                        chars.topRight;
            }
            else {
                topBorder =
                    chars.topLeft +
                        chars.horizontal +
                        titleColor(titleStr) +
                        chars.horizontal.repeat(remainingWidth - 1) +
                        chars.topRight;
            }
            result.push(borderColor(topBorder));
        }
        else {
            result.push(borderColor(chars.topLeft + chars.horizontal.repeat(innerWidth) + chars.topRight));
        }
        // Top padding
        for (let i = 0; i < paddingY; i++) {
            result.push(borderColor(chars.vertical) + " ".repeat(innerWidth) + borderColor(chars.vertical));
        }
        // Content lines
        for (const line of lines) {
            const lineWidth = (0, typography_1.stripAnsi)(line).length;
            const availableWidth = innerWidth - paddingX * 2;
            const padChar = " ";
            let paddedLine;
            if (align === "center") {
                const leftPad = Math.floor((availableWidth - lineWidth) / 2);
                const rightPad = availableWidth - lineWidth - leftPad;
                paddedLine =
                    padChar.repeat(paddingX + leftPad) + line + padChar.repeat(rightPad + paddingX);
            }
            else if (align === "right") {
                paddedLine =
                    padChar.repeat(paddingX + availableWidth - lineWidth) + line + padChar.repeat(paddingX);
            }
            else {
                paddedLine =
                    padChar.repeat(paddingX) + line + padChar.repeat(availableWidth - lineWidth + paddingX);
            }
            const displayLine = dimContent ? chalk_theme_1.theme.dim(paddedLine) : paddedLine;
            result.push(borderColor(chars.vertical) + displayLine + borderColor(chars.vertical));
        }
        // Bottom padding
        for (let i = 0; i < paddingY; i++) {
            result.push(borderColor(chars.vertical) + " ".repeat(innerWidth) + borderColor(chars.vertical));
        }
        // Bottom border
        result.push(borderColor(chars.bottomLeft + chars.horizontal.repeat(innerWidth) + chars.bottomRight));
        return result.join("\n");
    }
    /**
     * Create a success box (green border)
     */
    static success(content, options = {}) {
        return this.create(content, {
            ...options,
            borderColor: chalk_theme_1.theme.success,
            title: options.title ?? "Success",
            titleColor: chalk_theme_1.theme.success,
        });
    }
    /**
     * Create an error box (red border)
     */
    static error(content, options = {}) {
        return this.create(content, {
            ...options,
            borderColor: chalk_theme_1.theme.error,
            title: options.title ?? "Error",
            titleColor: chalk_theme_1.theme.error,
        });
    }
    /**
     * Create a warning box (yellow border)
     */
    static warning(content, options = {}) {
        return this.create(content, {
            ...options,
            borderColor: chalk_theme_1.theme.warning,
            title: options.title ?? "Warning",
            titleColor: chalk_theme_1.theme.warning,
        });
    }
    /**
     * Create an info box (blue border)
     */
    static info(content, options = {}) {
        return this.create(content, {
            ...options,
            borderColor: chalk_theme_1.theme.info,
            title: options.title ?? "Info",
            titleColor: chalk_theme_1.theme.info,
        });
    }
    /**
     * Create a branded Vulpes box (orange border)
     */
    static vulpes(content, options = {}) {
        return this.create(content, {
            ...options,
            borderColor: chalk_theme_1.theme.primary,
            titleColor: chalk_theme_1.theme.primary,
            style: "rounded",
        });
    }
    /**
     * Create a simple inline box (minimal style)
     */
    static inline(content) {
        return `[ ${content} ]`;
    }
    /**
     * Create a highlight box for important content
     */
    static highlight(content, options = {}) {
        return this.create(content, {
            ...options,
            borderColor: chalk_theme_1.theme.accent,
            style: "double",
        });
    }
}
exports.Box = Box;
exports.default = Box;
//# sourceMappingURL=Box.js.map