/**
 * ============================================================================
 * VULPES CELARE - LIVE METRICS DASHBOARD COMPONENTS
 * ============================================================================
 *
 * Real-time visualization components for terminal dashboards:
 * - Sparklines (mini line charts)
 * - Gauges (percentage meters with thresholds)
 * - Live counters with rate calculation
 * - PHI type breakdown bars
 * - Health indicators
 *
 * Inspired by:
 * - Grafana dashboards
 * - htop/btop system monitors
 * - Charm's Harmonica physics animations
 * - Modern CLI tools like pnpm, Vite
 */

import { theme } from "../index";
import { status as statusIcons } from "../icons";

// ============================================================================
// SPARKLINE - Mini line charts in terminal
// ============================================================================

const SPARK_CHARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

export interface SparklineOptions {
  /** Width in characters */
  width?: number;
  /** Minimum value (auto if not set) */
  min?: number;
  /** Maximum value (auto if not set) */
  max?: number;
  /** Color function */
  color?: (value: number, index: number, values: number[]) => string;
  /** Show min/max labels */
  showRange?: boolean;
}

/**
 * Create a sparkline from numeric data
 * 
 * @example
 * sparkline([1, 5, 2, 8, 3, 6]) // "▁▅▂█▃▆"
 */
export function sparkline(values: number[], options: SparklineOptions = {}): string {
  if (values.length === 0) return "";

  const { width, showRange = false } = options;
  
  // Resample if width specified and different from values length
  let data = values;
  if (width && width !== values.length) {
    data = resample(values, width);
  }

  const min = options.min ?? Math.min(...data);
  const max = options.max ?? Math.max(...data);
  const range = max - min || 1;

  const chars = data.map((v, i) => {
    const normalized = (v - min) / range;
    const charIndex = Math.min(Math.floor(normalized * SPARK_CHARS.length), SPARK_CHARS.length - 1);
    const char = SPARK_CHARS[Math.max(0, charIndex)];
    
    if (options.color) {
      return options.color(v, i, data);
    }
    return char;
  });

  const line = chars.join("");
  
  if (showRange) {
    return `${theme.muted(min.toFixed(1))} ${line} ${theme.muted(max.toFixed(1))}`;
  }
  
  return line;
}

/**
 * Resample array to target length using linear interpolation
 */
function resample(data: number[], targetLength: number): number[] {
  if (data.length === targetLength) return data;
  if (data.length === 0) return new Array(targetLength).fill(0);
  
  const result: number[] = [];
  const ratio = (data.length - 1) / (targetLength - 1);
  
  for (let i = 0; i < targetLength; i++) {
    const pos = i * ratio;
    const low = Math.floor(pos);
    const high = Math.ceil(pos);
    const weight = pos - low;
    
    if (high >= data.length) {
      result.push(data[data.length - 1]);
    } else {
      result.push(data[low] * (1 - weight) + data[high] * weight);
    }
  }
  
  return result;
}

// ============================================================================
// GAUGE - Percentage meter with thresholds
// ============================================================================

export interface GaugeOptions {
  /** Width in characters */
  width?: number;
  /** Label to show */
  label?: string;
  /** Show percentage value */
  showValue?: boolean;
  /** Threshold for warning (yellow) */
  warnThreshold?: number;
  /** Threshold for danger (red) */
  dangerThreshold?: number;
  /** Invert colors (low = bad) */
  invertColors?: boolean;
  /** Custom fill character */
  fillChar?: string;
  /** Custom empty character */
  emptyChar?: string;
  /** Style: bar, blocks, dots */
  style?: "bar" | "blocks" | "dots" | "gradient";
}

const BLOCK_CHARS = [" ", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];
const DOT_CHARS = ["○", "◔", "◑", "◕", "●"];

/**
 * Create a gauge/progress meter
 * 
 * @example
 * gauge(0.75, { width: 20, label: "CPU" })
 * // "CPU ████████████████░░░░ 75%"
 */
export function gauge(value: number, options: GaugeOptions = {}): string {
  const {
    width = 20,
    label,
    showValue = true,
    warnThreshold = 0.7,
    dangerThreshold = 0.9,
    invertColors = false,
    style = "bar",
  } = options;

  const clamped = Math.max(0, Math.min(1, value));
  const parts: string[] = [];

  // Label
  if (label) {
    parts.push(theme.muted(label.padEnd(12)));
  }

  // Determine color based on thresholds
  let colorFn: (s: string) => string;
  if (invertColors) {
    // Low is bad (e.g., disk space remaining)
    if (clamped <= dangerThreshold) colorFn = theme.error;
    else if (clamped <= warnThreshold) colorFn = theme.warning;
    else colorFn = theme.success;
  } else {
    // High is bad (e.g., CPU usage)
    if (clamped >= dangerThreshold) colorFn = theme.error;
    else if (clamped >= warnThreshold) colorFn = theme.warning;
    else colorFn = theme.success;
  }

  // Build the bar based on style
  let bar: string;
  switch (style) {
    case "blocks":
      bar = renderBlockGauge(clamped, width, colorFn);
      break;
    case "dots":
      bar = renderDotGauge(clamped, width, colorFn);
      break;
    case "gradient":
      bar = renderGradientGauge(clamped, width);
      break;
    case "bar":
    default:
      bar = renderBarGauge(clamped, width, colorFn);
  }

  parts.push(bar);

  // Value
  if (showValue) {
    const pct = `${Math.round(clamped * 100)}%`.padStart(4);
    parts.push(colorFn(pct));
  }

  return parts.join(" ");
}

function renderBarGauge(value: number, width: number, colorFn: (s: string) => string): string {
  const filled = Math.round(value * width);
  const empty = width - filled;
  return colorFn("█".repeat(filled)) + theme.muted("░".repeat(empty));
}

function renderBlockGauge(value: number, width: number, colorFn: (s: string) => string): string {
  const totalEighths = value * width * 8;
  const fullBlocks = Math.floor(totalEighths / 8);
  const remainder = Math.floor(totalEighths % 8);
  const emptyBlocks = width - fullBlocks - (remainder > 0 ? 1 : 0);
  
  let result = colorFn(BLOCK_CHARS[8].repeat(fullBlocks));
  if (remainder > 0) {
    result += colorFn(BLOCK_CHARS[remainder]);
  }
  result += theme.muted(" ".repeat(Math.max(0, emptyBlocks)));
  
  return result;
}

function renderDotGauge(value: number, width: number, colorFn: (s: string) => string): string {
  const chars: string[] = [];
  for (let i = 0; i < width; i++) {
    const pos = (i + 0.5) / width;
    if (pos <= value) {
      chars.push(colorFn(DOT_CHARS[DOT_CHARS.length - 1]));
    } else if (pos - 1/width <= value) {
      // Partial
      const partial = (value - (pos - 1/width)) * width;
      const idx = Math.floor(partial * DOT_CHARS.length);
      chars.push(colorFn(DOT_CHARS[Math.min(idx, DOT_CHARS.length - 1)]));
    } else {
      chars.push(theme.muted(DOT_CHARS[0]));
    }
  }
  return chars.join("");
}

function renderGradientGauge(value: number, width: number): string {
  const filled = Math.round(value * width);
  const chars: string[] = [];
  
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      // Gradient from green to yellow to red
      const pos = i / width;
      if (pos < 0.5) {
        chars.push(theme.success("█"));
      } else if (pos < 0.75) {
        chars.push(theme.warning("█"));
      } else {
        chars.push(theme.error("█"));
      }
    } else {
      chars.push(theme.muted("░"));
    }
  }
  
  return chars.join("");
}

// ============================================================================
// LIVE COUNTER - With rate calculation
// ============================================================================

export class LiveCounter {
  private value: number = 0;
  private startTime: number = Date.now();
  private history: Array<{ time: number; value: number }> = [];
  private maxHistory: number;

  constructor(initialValue: number = 0, maxHistory: number = 60) {
    this.value = initialValue;
    this.maxHistory = maxHistory;
    this.history.push({ time: Date.now(), value: initialValue });
  }

  increment(by: number = 1): void {
    this.value += by;
    this.recordHistory();
  }

  set(value: number): void {
    this.value = value;
    this.recordHistory();
  }

  get(): number {
    return this.value;
  }

  private recordHistory(): void {
    const now = Date.now();
    this.history.push({ time: now, value: this.value });
    
    // Trim old history
    const cutoff = now - this.maxHistory * 1000;
    this.history = this.history.filter(h => h.time >= cutoff);
  }

  /**
   * Get rate per second over the last N seconds
   */
  getRate(windowSeconds: number = 5): number {
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;
    const relevant = this.history.filter(h => h.time >= cutoff);
    
    if (relevant.length < 2) return 0;
    
    const first = relevant[0];
    const last = relevant[relevant.length - 1];
    const timeDiff = (last.time - first.time) / 1000;
    
    if (timeDiff === 0) return 0;
    return (last.value - first.value) / timeDiff;
  }

  /**
   * Get sparkline data from history
   */
  getSparklineData(points: number = 20): number[] {
    if (this.history.length === 0) return [];
    
    // Get rates at regular intervals
    const rates: number[] = [];
    for (let i = 1; i < this.history.length; i++) {
      const prev = this.history[i - 1];
      const curr = this.history[i];
      const timeDiff = (curr.time - prev.time) / 1000;
      if (timeDiff > 0) {
        rates.push((curr.value - prev.value) / timeDiff);
      }
    }
    
    return resample(rates.length > 0 ? rates : [0], points);
  }

  /**
   * Get elapsed time since start
   */
  getElapsed(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Render counter with rate
   */
  render(label: string, options: { showRate?: boolean; showSparkline?: boolean } = {}): string {
    const { showRate = true, showSparkline = false } = options;
    const parts: string[] = [];

    parts.push(theme.muted(label + ":"));
    parts.push(theme.primary.bold(this.value.toLocaleString()));

    if (showRate) {
      const rate = this.getRate();
      const rateStr = rate >= 0 ? `+${rate.toFixed(1)}` : rate.toFixed(1);
      parts.push(theme.muted(`(${rateStr}/s)`));
    }

    if (showSparkline) {
      const data = this.getSparklineData(10);
      parts.push(theme.secondary(sparkline(data)));
    }

    return parts.join(" ");
  }
}

// ============================================================================
// PHI BREAKDOWN BAR - Shows distribution of PHI types
// ============================================================================

export interface PHIBreakdown {
  [phiType: string]: number;
}

const PHI_COLORS: Record<string, (s: string) => string> = {
  NAME: theme.warning,
  SSN: theme.error,
  DATE: theme.info,
  PHONE: theme.secondary,
  EMAIL: theme.primary,
  ADDRESS: theme.muted,
  MRN: theme.accent,
  AGE: theme.success,
  DEFAULT: theme.muted,
};

/**
 * Render a stacked bar showing PHI type distribution
 */
export function phiBreakdownBar(breakdown: PHIBreakdown, width: number = 40): string {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  if (total === 0) return theme.muted("░".repeat(width));

  const segments: string[] = [];
  let usedWidth = 0;

  // Sort by count descending
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

  for (const [phiType, count] of sorted) {
    const proportion = count / total;
    const segmentWidth = Math.round(proportion * width);
    if (segmentWidth === 0) continue;

    const colorFn = PHI_COLORS[phiType] || PHI_COLORS.DEFAULT;
    segments.push(colorFn("█".repeat(segmentWidth)));
    usedWidth += segmentWidth;
  }

  // Fill remainder
  if (usedWidth < width) {
    segments.push(theme.muted("░".repeat(width - usedWidth)));
  }

  return segments.join("");
}

/**
 * Render PHI breakdown with legend
 */
export function phiBreakdownWithLegend(breakdown: PHIBreakdown, options: { width?: number; showCounts?: boolean } = {}): string {
  const { width = 40, showCounts = true } = options;
  const lines: string[] = [];

  // Bar
  lines.push(phiBreakdownBar(breakdown, width));

  // Legend
  const legendParts: string[] = [];
  const sorted = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [phiType, count] of sorted) {
    const colorFn = PHI_COLORS[phiType] || PHI_COLORS.DEFAULT;
    const label = showCounts ? `${phiType}:${count}` : phiType;
    legendParts.push(colorFn("■") + " " + theme.muted(label));
  }

  lines.push(legendParts.join("  "));

  return lines.join("\n");
}

// ============================================================================
// HEALTH INDICATOR - Traffic light style
// ============================================================================

export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface HealthIndicatorOptions {
  /** Show label */
  label?: string;
  /** Show status text */
  showStatus?: boolean;
  /** Style: dot, bar, emoji */
  style?: "dot" | "bar" | "emoji";
}

const HEALTH_ICONS: Record<HealthStatus, Record<string, string>> = {
  healthy: { dot: "●", bar: "███", emoji: "✅" },
  degraded: { dot: "●", bar: "██░", emoji: "⚠️" },
  unhealthy: { dot: "●", bar: "█░░", emoji: "❌" },
  unknown: { dot: "○", bar: "░░░", emoji: "❓" },
};

const HEALTH_COLORS: Record<HealthStatus, (s: string) => string> = {
  healthy: theme.success,
  degraded: theme.warning,
  unhealthy: theme.error,
  unknown: theme.muted,
};

/**
 * Render a health indicator
 */
export function healthIndicator(status: HealthStatus, options: HealthIndicatorOptions = {}): string {
  const { label, showStatus = false, style = "dot" } = options;
  const parts: string[] = [];

  if (label) {
    parts.push(theme.muted(label + ":"));
  }

  const icon = HEALTH_ICONS[status][style];
  const colorFn = HEALTH_COLORS[status];
  parts.push(colorFn(icon));

  if (showStatus) {
    parts.push(colorFn(status.toUpperCase()));
  }

  return parts.join(" ");
}

// ============================================================================
// METRICS DASHBOARD - Combines multiple metrics
// ============================================================================

export interface DashboardMetrics {
  sensitivity?: number;
  specificity?: number;
  documentsProcessed?: number;
  documentsTotal?: number;
  phiDetected?: number;
  phiBreakdown?: PHIBreakdown;
  elapsed?: number;
  health?: HealthStatus;
}

/**
 * Render a complete metrics dashboard
 */
export function metricsDashboard(metrics: DashboardMetrics): string {
  const lines: string[] = [];
  const width = 30;

  // Header
  lines.push(theme.primary.bold("═".repeat(50)));
  lines.push(theme.primary.bold("  VULPES CELARE METRICS"));
  lines.push(theme.primary.bold("═".repeat(50)));
  lines.push("");

  // Sensitivity/Specificity gauges
  if (metrics.sensitivity !== undefined) {
    lines.push(gauge(metrics.sensitivity, {
      width,
      label: "Sensitivity",
      dangerThreshold: 0.95,
      warnThreshold: 0.99,
      invertColors: true, // Low is bad
    }));
  }

  if (metrics.specificity !== undefined) {
    lines.push(gauge(metrics.specificity, {
      width,
      label: "Specificity",
      dangerThreshold: 0.90,
      warnThreshold: 0.96,
      invertColors: true,
    }));
  }

  // Progress
  if (metrics.documentsProcessed !== undefined && metrics.documentsTotal !== undefined) {
    const progress = metrics.documentsTotal > 0 ? metrics.documentsProcessed / metrics.documentsTotal : 0;
    lines.push("");
    lines.push(gauge(progress, {
      width,
      label: "Progress",
      style: "gradient",
    }) + ` ${metrics.documentsProcessed}/${metrics.documentsTotal}`);
  }

  // PHI stats
  if (metrics.phiDetected !== undefined) {
    lines.push("");
    lines.push(theme.muted("PHI Detected: ") + theme.accent.bold(metrics.phiDetected.toLocaleString()));
  }

  if (metrics.phiBreakdown && Object.keys(metrics.phiBreakdown).length > 0) {
    lines.push("");
    lines.push(phiBreakdownWithLegend(metrics.phiBreakdown, { width }));
  }

  // Health
  if (metrics.health) {
    lines.push("");
    lines.push(healthIndicator(metrics.health, { label: "System Health", showStatus: true }));
  }

  // Elapsed time
  if (metrics.elapsed !== undefined) {
    const elapsed = formatElapsed(metrics.elapsed);
    lines.push("");
    lines.push(theme.muted("Elapsed: ") + theme.secondary(elapsed));
  }

  lines.push("");
  lines.push(theme.primary.bold("═".repeat(50)));

  return lines.join("\n");
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// ============================================================================
// ANIMATED PROGRESS - For batch operations
// ============================================================================

export interface AnimatedProgressOptions {
  total: number;
  width?: number;
  showETA?: boolean;
  showRate?: boolean;
  format?: string;
}

export class AnimatedProgress {
  private current: number = 0;
  private total: number;
  private startTime: number;
  private width: number;
  private showETA: boolean;
  private showRate: boolean;
  private lastRender: string = "";

  constructor(options: AnimatedProgressOptions) {
    this.total = options.total;
    this.width = options.width ?? 30;
    this.showETA = options.showETA ?? true;
    this.showRate = options.showRate ?? true;
    this.startTime = Date.now();
  }

  update(current: number): void {
    this.current = current;
  }

  increment(by: number = 1): void {
    this.current += by;
  }

  render(): string {
    const progress = this.total > 0 ? this.current / this.total : 0;
    const elapsed = Date.now() - this.startTime;
    const parts: string[] = [];

    // Progress bar with percentage
    const filled = Math.round(progress * this.width);
    const empty = this.width - filled;
    const bar = theme.success("█".repeat(filled)) + theme.muted("░".repeat(empty));
    const pct = `${Math.round(progress * 100)}%`.padStart(4);
    parts.push(`${bar} ${theme.primary(pct)}`);

    // Count
    parts.push(theme.muted(`${this.current}/${this.total}`));

    // Rate
    if (this.showRate && elapsed > 0) {
      const rate = (this.current / elapsed) * 1000;
      parts.push(theme.muted(`${rate.toFixed(1)}/s`));
    }

    // ETA
    if (this.showETA && this.current > 0) {
      const rate = this.current / elapsed;
      const remaining = this.total - this.current;
      const eta = remaining / rate;
      parts.push(theme.muted(`ETA: ${formatElapsed(eta)}`));
    }

    this.lastRender = parts.join(" ");
    return this.lastRender;
  }

  /**
   * Clear and write new progress (for in-place updates)
   */
  write(): void {
    const output = this.render();
    process.stdout.write(`\r${output}${" ".repeat(10)}`);
  }

  /**
   * Finish and move to new line
   */
  finish(message?: string): void {
    const finalMessage = message ?? `${statusIcons.success} Complete`;
    process.stdout.write(`\r${finalMessage}${" ".repeat(50)}\n`);
  }
}
