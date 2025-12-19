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

import { vulpesEnvironment } from "../utils/VulpesEnvironment";
import { Box as ThemeBox } from "../theme/output/Box";

// ============================================================================
// Types - Ink-compatible interfaces
// ============================================================================

export interface ComponentProps {
  children?: ComponentChild | ComponentChild[];
}

export type ComponentChild = string | number | Component | null | undefined;

export interface Component {
  render(): string;
}

export interface BoxProps extends ComponentProps {
  borderStyle?: "single" | "double" | "round" | "bold" | "none";
  padding?: number;
  margin?: number;
  width?: number | string;
  title?: string;
  borderColor?: string;
}

export interface TextProps extends ComponentProps {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dimColor?: boolean;
}

export interface SpinnerProps {
  type?: "dots" | "line" | "arc" | "circle";
  label?: string;
}

export interface SelectProps<T> {
  items: Array<{ label: string; value: T }>;
  onSelect: (value: T) => void;
}

export interface ProgressBarProps {
  value: number; // 0-100
  width?: number;
  showPercentage?: boolean;
  color?: string;
}

// ============================================================================
// Ink-style Component Factory
// ============================================================================

/**
 * Create Ink-style components that render to our existing output system.
 * This provides familiar React-like patterns without the dependency.
 */
export const InkComponents = {
  /**
   * Box component - renders content in a bordered box
   */
  Box: (props: BoxProps): Component => ({
    render() {
      const content = renderChildren(props.children);
      const style = mapBorderStyle(props.borderStyle ?? "single");

      if (!vulpesEnvironment.shouldUseColor()) {
        return `[${props.title ?? ""}]\n${content}`;
      }

      // Use our existing Box component from theme
      const lines = content.split("\n");
      return ThemeBox.create(lines, { title: props.title, style });
    },
  }),

  /**
   * Text component - styled text
   */
  Text: (props: TextProps): Component => ({
    render() {
      const content = renderChildren(props.children);
      return applyTextStyles(content, props);
    },
  }),

  /**
   * Static component - renders children without animation
   */
  Static: (props: ComponentProps): Component => ({
    render() {
      return renderChildren(props.children);
    },
  }),

  /**
   * Newline component
   */
  Newline: (): Component => ({
    render() {
      return "\n";
    },
  }),

  /**
   * Spacer component - fills available space
   */
  Spacer: (): Component => ({
    render() {
      return "  "; // Simple spacing
    },
  }),

  /**
   * Progress bar component
   */
  ProgressBar: (props: ProgressBarProps): Component => ({
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
  Spinner: (props: SpinnerProps): Component => ({
    render() {
      if (!vulpesEnvironment.isInteractive) {
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
  Table: <T extends Record<string, unknown>>(data: T[]): Component => ({
    render() {
      if (data.length === 0) return "";

      const headers = Object.keys(data[0]);
      const widths = headers.map((h) =>
        Math.max(
          h.length,
          ...data.map((row) => String(row[h] ?? "").length)
        )
      );

      const divider = "─".repeat(widths.reduce((a, b) => a + b + 3, 1));
      const lines: string[] = [];

      // Header
      lines.push("┌" + divider + "┐");
      lines.push(
        "│ " +
        headers.map((h, i) => h.padEnd(widths[i])).join(" │ ") +
        " │"
      );
      lines.push("├" + divider + "┤");

      // Rows
      for (const row of data) {
        lines.push(
          "│ " +
          headers
            .map((h, i) => String(row[h] ?? "").padEnd(widths[i]))
            .join(" │ ") +
          " │"
        );
      }

      lines.push("└" + divider + "┘");
      return lines.join("\n");
    },
  }),
};

// ============================================================================
// Render Helpers
// ============================================================================

function renderChildren(children: ComponentChild | ComponentChild[] | undefined): string {
  if (children === null || children === undefined) {
    return "";
  }

  if (Array.isArray(children)) {
    return children.map((c) => renderChild(c)).join("");
  }

  return renderChild(children);
}

function renderChild(child: ComponentChild): string {
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

function mapBorderStyle(style: string): "rounded" | "sharp" | "double" | "heavy" {
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

function applyTextStyles(text: string, props: TextProps): string {
  if (!vulpesEnvironment.shouldUseColor()) {
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

function applyColor(text: string, color: string): string {
  const colors: Record<string, string> = {
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
export function render(component: Component): string {
  return component.render();
}

/**
 * Render and print a component to output.
 */
export function renderToOutput(component: Component): void {
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
export function h<P extends ComponentProps>(
  component: (props: P) => Component,
  props: Omit<P, "children">,
  ...children: ComponentChild[]
): Component {
  return component({ ...props, children } as P);
}

// ============================================================================
// Exports
// ============================================================================

export const { Box, Text, Static, Newline, Spacer, ProgressBar, Spinner, Table } =
  InkComponents;
