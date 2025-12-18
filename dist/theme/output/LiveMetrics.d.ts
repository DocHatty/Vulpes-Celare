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
export declare function sparkline(values: number[], options?: SparklineOptions): string;
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
/**
 * Create a gauge/progress meter
 *
 * @example
 * gauge(0.75, { width: 20, label: "CPU" })
 * // "CPU ████████████████░░░░ 75%"
 */
export declare function gauge(value: number, options?: GaugeOptions): string;
export declare class LiveCounter {
    private value;
    private startTime;
    private history;
    private maxHistory;
    constructor(initialValue?: number, maxHistory?: number);
    increment(by?: number): void;
    set(value: number): void;
    get(): number;
    private recordHistory;
    /**
     * Get rate per second over the last N seconds
     */
    getRate(windowSeconds?: number): number;
    /**
     * Get sparkline data from history
     */
    getSparklineData(points?: number): number[];
    /**
     * Get elapsed time since start
     */
    getElapsed(): number;
    /**
     * Render counter with rate
     */
    render(label: string, options?: {
        showRate?: boolean;
        showSparkline?: boolean;
    }): string;
}
export interface PHIBreakdown {
    [phiType: string]: number;
}
/**
 * Render a stacked bar showing PHI type distribution
 */
export declare function phiBreakdownBar(breakdown: PHIBreakdown, width?: number): string;
/**
 * Render PHI breakdown with legend
 */
export declare function phiBreakdownWithLegend(breakdown: PHIBreakdown, options?: {
    width?: number;
    showCounts?: boolean;
}): string;
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";
export interface HealthIndicatorOptions {
    /** Show label */
    label?: string;
    /** Show status text */
    showStatus?: boolean;
    /** Style: dot, bar, emoji */
    style?: "dot" | "bar" | "emoji";
}
/**
 * Render a health indicator
 */
export declare function healthIndicator(status: HealthStatus, options?: HealthIndicatorOptions): string;
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
export declare function metricsDashboard(metrics: DashboardMetrics): string;
export interface AnimatedProgressOptions {
    total: number;
    width?: number;
    showETA?: boolean;
    showRate?: boolean;
    format?: string;
}
export declare class AnimatedProgress {
    private current;
    private total;
    private startTime;
    private width;
    private showETA;
    private showRate;
    private lastRender;
    constructor(options: AnimatedProgressOptions);
    update(current: number): void;
    increment(by?: number): void;
    render(): string;
    /**
     * Clear and write new progress (for in-place updates)
     */
    write(): void;
    /**
     * Finish and move to new line
     */
    finish(message?: string): void;
}
//# sourceMappingURL=LiveMetrics.d.ts.map