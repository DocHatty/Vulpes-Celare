/**
 * ============================================================================
 * VULPES CELARE - PROGRESS OUTPUT COMPONENT
 * ============================================================================
 *
 * Elegant progress bars and indicators for CLI output.
 * Supports various styles and semantic coloring.
 *
 * Usage:
 *   import { Progress } from '../theme/output';
 *
 *   console.log(Progress.bar(0.75));
 *   console.log(Progress.stages(['Scan', 'Process', 'Output'], 1));
 */

import { theme } from "../chalk-theme";
import { progress as progressChars, status, arrows, bullets } from "../icons";
import { getTerminalWidth } from "../spacing";

// ============================================================================
// TYPES
// ============================================================================

export type ProgressStyle = "bar" | "blocks" | "dots" | "minimal";

export interface ProgressBarOptions {
  /** Progress bar style */
  style?: ProgressStyle;
  /** Total width in characters */
  width?: number;
  /** Show percentage label */
  showPercent?: boolean;
  /** Show numeric value (e.g., 75/100) */
  showValue?: boolean;
  /** Total value (for showValue) */
  total?: number;
  /** Color for filled portion */
  fillColor?: (text: string) => string;
  /** Color for empty portion */
  emptyColor?: (text: string) => string;
  /** Label to show before the bar */
  label?: string;
}

export interface StageOptions {
  /** Style for completed stages */
  completedColor?: (text: string) => string;
  /** Style for current stage */
  currentColor?: (text: string) => string;
  /** Style for pending stages */
  pendingColor?: (text: string) => string;
  /** Connector between stages */
  connector?: string;
  /** Show stage numbers */
  showNumbers?: boolean;
}

// ============================================================================
// PROGRESS CLASS
// ============================================================================

export class Progress {
  /**
   * Create a progress bar
   * @param percent - Progress from 0 to 1 (or 0 to 100)
   */
  static bar(percent: number, options: ProgressBarOptions = {}): string {
    const {
      style = "bar",
      width = 30,
      showPercent = true,
      showValue = false,
      total,
      fillColor = theme.primary,
      emptyColor = theme.muted,
      label,
    } = options;

    // Normalize percent to 0-1 range
    const normalizedPercent = percent > 1 ? percent / 100 : percent;
    const clampedPercent = Math.max(0, Math.min(1, normalizedPercent));

    // Calculate filled width
    const filledWidth = Math.round(clampedPercent * width);
    const emptyWidth = width - filledWidth;

    // Get characters based on style
    let filledChar: string;
    let emptyChar: string;

    switch (style) {
      case "blocks":
        filledChar = progressChars.filled;
        emptyChar = " ";
        break;
      case "dots":
        filledChar = bullets.dot;
        emptyChar = bullets.circle;
        break;
      case "minimal":
        filledChar = "=";
        emptyChar = "-";
        break;
      default:
        filledChar = progressChars.filled;
        emptyChar = progressChars.empty;
    }

    // Build the bar
    const filled = fillColor(filledChar.repeat(filledWidth));
    const empty = emptyColor(emptyChar.repeat(emptyWidth));
    const bar = `${filled}${empty}`;

    // Build the full string
    const parts: string[] = [];

    if (label) {
      parts.push(theme.muted(label));
    }

    parts.push(bar);

    if (showPercent) {
      parts.push(theme.muted(`${Math.round(clampedPercent * 100)}%`));
    }

    if (showValue && total !== undefined) {
      const current = Math.round(clampedPercent * total);
      parts.push(theme.muted(`(${current}/${total})`));
    }

    return parts.join(" ");
  }

  /**
   * Create a minimal inline progress indicator
   */
  static inline(percent: number, width = 10): string {
    const normalizedPercent = percent > 1 ? percent / 100 : percent;
    const clampedPercent = Math.max(0, Math.min(1, normalizedPercent));
    const filled = Math.round(clampedPercent * width);

    return theme.muted("[") +
      theme.primary(progressChars.filled.repeat(filled)) +
      theme.muted(progressChars.empty.repeat(width - filled)) +
      theme.muted("]");
  }

  /**
   * Create a stages/steps indicator
   */
  static stages(
    stages: string[],
    currentIndex: number,
    options: StageOptions = {}
  ): string {
    const {
      completedColor = theme.success,
      currentColor = theme.primary.bold,
      pendingColor = theme.muted,
      connector = ` ${arrows.right} `,
      showNumbers = true,
    } = options;

    return stages.map((stage, i) => {
      let icon: string;
      let colorFn: (text: string) => string;
      let label = stage;

      if (showNumbers) {
        label = `${i + 1}. ${stage}`;
      }

      if (i < currentIndex) {
        icon = status.success;
        colorFn = completedColor;
      } else if (i === currentIndex) {
        icon = status.progress;
        colorFn = currentColor;
      } else {
        icon = status.pending;
        colorFn = pendingColor;
      }

      return colorFn(`${icon} ${label}`);
    }).join(connector);
  }

  /**
   * Create a vertical stages list
   */
  static stagesList(
    stages: string[],
    currentIndex: number,
    options: StageOptions = {}
  ): string {
    const {
      completedColor = theme.success,
      currentColor = theme.primary.bold,
      pendingColor = theme.muted,
      showNumbers = true,
    } = options;

    return stages.map((stage, i) => {
      let icon: string;
      let colorFn: (text: string) => string;
      let prefix = showNumbers ? `${i + 1}. ` : "";

      if (i < currentIndex) {
        icon = status.success;
        colorFn = completedColor;
      } else if (i === currentIndex) {
        icon = arrows.play;
        colorFn = currentColor;
      } else {
        icon = status.pending;
        colorFn = pendingColor;
      }

      return `  ${colorFn(icon)} ${colorFn(prefix + stage)}`;
    }).join("\n");
  }

  /**
   * Create a percentage display
   */
  static percent(value: number, options: { color?: (text: string) => string } = {}): string {
    const normalizedValue = value > 1 ? value : value * 100;
    const colorFn = options.color ?? (
      normalizedValue >= 90 ? theme.success :
      normalizedValue >= 70 ? theme.warning :
      theme.error
    );

    return colorFn(`${normalizedValue.toFixed(1)}%`);
  }

  /**
   * Create a ratio display (e.g., 42/100)
   */
  static ratio(current: number, total: number, options: { color?: (text: string) => string } = {}): string {
    const colorFn = options.color ?? theme.muted;
    return colorFn(`${current}/${total}`);
  }

  /**
   * Create a completion indicator with checkmark or X
   */
  static complete(isComplete: boolean, label?: string): string {
    const icon = isComplete ? status.success : status.pending;
    const colorFn = isComplete ? theme.success : theme.muted;
    const text = label ? `${icon} ${label}` : icon;
    return colorFn(text);
  }

  /**
   * Create a multi-metric progress display
   */
  static metrics(
    metrics: Array<{ label: string; value: number; target?: number }>,
    options: { width?: number } = {}
  ): string {
    const { width = 20 } = options;
    const maxLabelLen = Math.max(...metrics.map(m => m.label.length));

    return metrics.map(({ label, value, target }) => {
      const paddedLabel = label.padEnd(maxLabelLen);
      const bar = this.bar(value / 100, {
        width,
        showPercent: true,
        fillColor: target !== undefined
          ? (value >= target ? theme.success : theme.warning)
          : theme.primary,
      });

      return `${theme.muted(paddedLabel)}  ${bar}`;
    }).join("\n");
  }

  /**
   * Create a health indicator (good/warning/critical)
   */
  static health(
    value: number,
    thresholds: { good: number; warning: number } = { good: 90, warning: 70 }
  ): string {
    const normalizedValue = value > 1 ? value : value * 100;

    if (normalizedValue >= thresholds.good) {
      return theme.success(`${status.success} ${normalizedValue.toFixed(1)}%`);
    } else if (normalizedValue >= thresholds.warning) {
      return theme.warning(`${status.warning} ${normalizedValue.toFixed(1)}%`);
    } else {
      return theme.error(`${status.error} ${normalizedValue.toFixed(1)}%`);
    }
  }
}

export default Progress;
