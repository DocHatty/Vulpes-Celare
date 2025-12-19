"use strict";
/**
 * Vulpes Celare - Ink Bridge
 *
 * Provides Ink-compatible component patterns for our existing output system.
 * This bridges the gap between our current chalk-based output and Ink's
 * React-like component model without requiring the full Ink dependency.
 *
 * Why this approach:
 * 1. Ink is a heavy dependency (React for terminal)
 * 2. Our existing theme system is already excellent
 * 3. We want the PATTERN without the weight
 * 4. Easy migration path if we ever want full Ink
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = exports.Spinner = exports.ProgressBar = exports.Spacer = exports.Newline = exports.Static = exports.Text = exports.Box = exports.InkComponents = void 0;
exports.render = render;
exports.renderToOutput = renderToOutput;
exports.h = h;
const VulpesEnvironment_1 = require("../utils/VulpesEnvironment");
const Box_1 = require("../theme/output/Box");
// ============================================================================
// Ink-style Component Factory
// ============================================================================
/**
 * Create Ink-style components that render to our existing output system.
 * This provides familiar React-like patterns without the dependency.
 */
exports.InkComponents = {
    /**
     * Box component - renders content in a bordered box
     */
    Box: (props) => ({
        render() {
            const content = renderChildren(props.children);
            const style = mapBorderStyle(props.borderStyle ?? "single");
            if (!VulpesEnvironment_1.vulpesEnvironment.shouldUseColor()) {
                return `[${props.title ?? ""}]\n${content}`;
            }
            // Use our existing Box component from theme
            const lines = content.split("\n");
            return Box_1.Box.create(lines, { title: props.title, style });
        },
    }),
    /**
     * Text component - styled text
     */
    Text: (props) => ({
        render() {
            const content = renderChildren(props.children);
            return applyTextStyles(content, props);
        },
    }),
    /**
     * Static component - renders children without animation
     */
    Static: (props) => ({
        render() {
            return renderChildren(props.children);
        },
    }),
    /**
     * Newline component
     */
    Newline: () => ({
        render() {
            return "\n";
        },
    }),
    /**
     * Spacer component - fills available space
     */
    Spacer: () => ({
        render() {
            return "  "; // Simple spacing
        },
    }),
    /**
     * Progress bar component
     */
    ProgressBar: (props) => ({
        render() {
            const width = props.width ?? 40;
            const filled = Math.round((props.value / 100) * width);
            const empty = width - filled;
            const bar = "█".repeat(filled) + "░".repeat(empty);
            const percentage = props.showPercentage !== false
                ? ` ${props.value.toFixed(0)}%`
                : "";
            return `[${bar}]${percentage}`;
        },
    }),
    /**
     * Spinner component (static representation for non-interactive mode)
     */
    Spinner: (props) => ({
        render() {
            if (!VulpesEnvironment_1.vulpesEnvironment.isInteractive) {
                return props.label ?? "Loading...";
            }
            const frames = {
                dots: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
                line: ["-", "\\", "|", "/"],
                arc: ["◜", "◠", "◝", "◞", "◡", "◟"],
                circle: ["◐", "◓", "◑", "◒"],
            };
            // For static render, just show first frame
            const frame = frames[props.type ?? "dots"][0];
            return `${frame} ${props.label ?? ""}`;
        },
    }),
    /**
     * Table component
     */
    Table: (data) => ({
        render() {
            if (data.length === 0)
                return "";
            const headers = Object.keys(data[0]);
            const widths = headers.map((h) => Math.max(h.length, ...data.map((row) => String(row[h] ?? "").length)));
            const divider = "─".repeat(widths.reduce((a, b) => a + b + 3, 1));
            const lines = [];
            // Header
            lines.push("┌" + divider + "┐");
            lines.push("│ " +
                headers.map((h, i) => h.padEnd(widths[i])).join(" │ ") +
                " │");
            lines.push("├" + divider + "┤");
            // Rows
            for (const row of data) {
                lines.push("│ " +
                    headers
                        .map((h, i) => String(row[h] ?? "").padEnd(widths[i]))
                        .join(" │ ") +
                    " │");
            }
            lines.push("└" + divider + "┘");
            return lines.join("\n");
        },
    }),
};
// ============================================================================
// Render Helpers
// ============================================================================
function renderChildren(children) {
    if (children === null || children === undefined) {
        return "";
    }
    if (Array.isArray(children)) {
        return children.map((c) => renderChild(c)).join("");
    }
    return renderChild(children);
}
function renderChild(child) {
    if (child === null || child === undefined) {
        return "";
    }
    if (typeof child === "string" || typeof child === "number") {
        return String(child);
    }
    if ("render" in child) {
        return child.render();
    }
    return "";
}
function mapBorderStyle(style) {
    switch (style) {
        case "round":
            return "rounded";
        case "double":
            return "double";
        case "bold":
            return "heavy";
        default:
            return "sharp";
    }
}
function applyTextStyles(text, props) {
    if (!VulpesEnvironment_1.vulpesEnvironment.shouldUseColor()) {
        return text;
    }
    let result = text;
    if (props.bold) {
        result = `\x1b[1m${result}\x1b[0m`;
    }
    if (props.italic) {
        result = `\x1b[3m${result}\x1b[0m`;
    }
    if (props.underline) {
        result = `\x1b[4m${result}\x1b[0m`;
    }
    if (props.dimColor) {
        result = `\x1b[2m${result}\x1b[0m`;
    }
    if (props.color) {
        result = applyColor(result, props.color);
    }
    return result;
}
function applyColor(text, color) {
    const colors = {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        gray: "\x1b[90m",
    };
    const colorCode = colors[color.toLowerCase()] ?? "";
    return colorCode ? `${colorCode}${text}\x1b[0m` : text;
}
// ============================================================================
// Render Function
// ============================================================================
/**
 * Render a component tree to string.
 * This is our lightweight alternative to Ink's render().
 */
function render(component) {
    return component.render();
}
/**
 * Render and print a component to output.
 */
function renderToOutput(component) {
    const result = render(component);
    process.stdout.write(result);
}
// ============================================================================
// JSX-like Builder (without JSX)
// ============================================================================
/**
 * Create a component tree using function calls instead of JSX.
 *
 * @example
 * const app = h(InkComponents.Box, { title: 'Hello' },
 *   h(InkComponents.Text, { bold: true }, 'World')
 * );
 * renderToOutput(app);
 */
function h(component, props, ...children) {
    return component({ ...props, children });
}
// ============================================================================
// Exports
// ============================================================================
exports.Box = exports.InkComponents.Box, exports.Text = exports.InkComponents.Text, exports.Static = exports.InkComponents.Static, exports.Newline = exports.InkComponents.Newline, exports.Spacer = exports.InkComponents.Spacer, exports.ProgressBar = exports.InkComponents.ProgressBar, exports.Spinner = exports.InkComponents.Spinner, exports.Table = exports.InkComponents.Table;
//# sourceMappingURL=InkBridge.js.map