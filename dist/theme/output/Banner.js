"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Banner = void 0;
const chalk_theme_1 = require("../chalk-theme");
// Box drawing imported for potential future enhancements
const spacing_1 = require("../spacing");
const Box_1 = require("./Box");
// ============================================================================
// ASCII ART
// ============================================================================
/**
 * Compact fox logo (fits in ~30 columns)
 */
const FOX_COMPACT = [
    "  /\\   /\\  ",
    " /  \\_/  \\ ",
    " \\  ' '  / ",
    "  \\ === /  ",
    "   \\   /   ",
];
/**
 * Medium fox logo (~40 columns)
 */
const FOX_MEDIUM = [
    "    /\\      /\\    ",
    "   /  \\    /  \\   ",
    "  /    \\__/    \\  ",
    " |    '    '    | ",
    "  \\    ====    /  ",
    "   \\          /   ",
    "    \\________/    ",
];
/**
 * Large fox logo (~50 columns)
 */
const FOX_LARGE = [
    "      /\\          /\\      ",
    "     /  \\        /  \\     ",
    "    /    \\      /    \\    ",
    "   /      \\____/      \\   ",
    "  |                    |  ",
    "  |     '        '     |  ",
    "   \\                  /   ",
    "    \\     ======     /    ",
    "     \\              /     ",
    "      \\____________/      ",
];
/**
 * Text-only logo
 */
const LOGO_TEXT = "VULPES CELARE";
const TAGLINE = "HIPAA-Compliant PHI Redaction";
class Banner {
    /**
     * Get the fox ASCII art based on terminal width
     */
    static fox(size = "auto") {
        let art;
        if (size === "auto") {
            const width = (0, spacing_1.getTerminalWidth)();
            if (width < 40) {
                art = FOX_COMPACT;
            }
            else if (width < 60) {
                art = FOX_MEDIUM;
            }
            else {
                art = FOX_LARGE;
            }
        }
        else {
            art = size === "compact" ? FOX_COMPACT
                : size === "medium" ? FOX_MEDIUM
                    : FOX_LARGE;
        }
        return art.map(line => chalk_theme_1.theme.primary(line)).join("\n");
    }
    /**
     * Get the text logo
     */
    static logo(options = {}) {
        const { colored = true } = options;
        return colored ? chalk_theme_1.theme.primary.bold(LOGO_TEXT) : LOGO_TEXT;
    }
    /**
     * Get the tagline
     */
    static tagline(options = {}) {
        const { colored = true } = options;
        return colored ? chalk_theme_1.theme.muted(TAGLINE) : TAGLINE;
    }
    /**
     * Create a minimal banner (text only)
     */
    static minimal(options = {}) {
        const { version, showTagline = false } = options;
        const parts = [this.logo()];
        if (version) {
            parts[0] += chalk_theme_1.theme.muted(` v${version}`);
        }
        if (showTagline) {
            parts.push(this.tagline());
        }
        return parts.join("\n");
    }
    /**
     * Create a standard banner with optional art
     */
    static standard(options = {}) {
        const { version, showArt = true, artSize = "auto", showTagline = true, centered = true, } = options;
        const lines = [];
        if (showArt) {
            lines.push(this.fox(artSize));
            lines.push("");
        }
        let logoLine = this.logo();
        if (version) {
            logoLine += chalk_theme_1.theme.muted(` v${version}`);
        }
        lines.push(logoLine);
        if (showTagline) {
            lines.push(this.tagline());
        }
        if (centered) {
            const termWidth = (0, spacing_1.getTerminalWidth)();
            return lines.map(line => {
                if (!line)
                    return line;
                const lineLines = line.split("\n");
                return lineLines.map(l => {
                    const stripped = l.replace(/\x1b\[[0-9;]*m/g, "");
                    const padding = Math.max(0, Math.floor((termWidth - stripped.length) / 2));
                    return " ".repeat(padding) + l;
                }).join("\n");
            }).join("\n");
        }
        return lines.join("\n");
    }
    /**
     * Create a full banner in a box
     */
    static full(options = {}) {
        const { version, showArt = true, artSize = "compact", showTagline = true, subtitle, } = options;
        const content = [];
        if (showArt) {
            // Use compact art for boxed version
            const art = artSize === "compact" ? FOX_COMPACT
                : artSize === "medium" ? FOX_MEDIUM
                    : FOX_COMPACT;
            content.push(...art.map(l => chalk_theme_1.theme.primary(l)));
            content.push("");
        }
        let logoLine = chalk_theme_1.theme.primary.bold(LOGO_TEXT);
        if (version) {
            logoLine += chalk_theme_1.theme.muted(` v${version}`);
        }
        content.push(logoLine);
        if (showTagline) {
            content.push(chalk_theme_1.theme.muted(TAGLINE));
        }
        if (subtitle) {
            content.push("");
            content.push(chalk_theme_1.theme.info(subtitle));
        }
        return Box_1.Box.vulpes(content, {
            align: "center",
            padding: 2,
        });
    }
    /**
     * Create a compact inline banner
     */
    static inline(version) {
        const v = version ? chalk_theme_1.theme.muted(` v${version}`) : "";
        return `${chalk_theme_1.theme.primary("\u25C8")} ${chalk_theme_1.theme.primary.bold("Vulpes Celare")}${v}`;
    }
    /**
     * Create a startup banner (shown when CLI starts)
     */
    static startup(options = {}) {
        const width = (0, spacing_1.getTerminalWidth)();
        // Use minimal banner for narrow terminals
        if (width < 50) {
            return this.minimal(options);
        }
        // Use standard banner for medium terminals
        if (width < 80) {
            return this.standard({
                ...options,
                artSize: "compact",
            });
        }
        // Use full banner for wide terminals
        return this.standard({
            ...options,
            artSize: "medium",
        });
    }
    /**
     * Create a completion banner
     */
    static completion(stats) {
        const lines = [
            chalk_theme_1.theme.success.bold("Redaction Complete"),
        ];
        if (stats) {
            if (stats.duration) {
                lines.push(chalk_theme_1.theme.muted(`Duration: ${stats.duration}`));
            }
            if (stats.itemsProcessed !== undefined) {
                lines.push(chalk_theme_1.theme.muted(`Items processed: ${stats.itemsProcessed}`));
            }
            if (stats.redactionsFound !== undefined) {
                lines.push(chalk_theme_1.theme.muted(`Redactions: ${stats.redactionsFound}`));
            }
        }
        return Box_1.Box.success(lines, { style: "rounded" });
    }
    /**
     * Create an error banner
     */
    static error(message, details) {
        const lines = [message];
        if (details) {
            lines.push("");
            lines.push(chalk_theme_1.theme.muted(details));
        }
        return Box_1.Box.error(lines, { style: "rounded" });
    }
}
exports.Banner = Banner;
exports.default = Banner;
//# sourceMappingURL=Banner.js.map