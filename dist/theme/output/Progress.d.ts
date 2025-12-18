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
export declare class Progress {
    /**
     * Create a progress bar
     * @param percent - Progress from 0 to 1 (or 0 to 100)
     */
    static bar(percent: number, options?: ProgressBarOptions): string;
    /**
     * Create a minimal inline progress indicator
     */
    static inline(percent: number, width?: number): string;
    /**
     * Create a stages/steps indicator
     */
    static stages(stages: string[], currentIndex: number, options?: StageOptions): string;
    /**
     * Create a vertical stages list
     */
    static stagesList(stages: string[], currentIndex: number, options?: StageOptions): string;
    /**
     * Create a percentage display
     */
    static percent(value: number, options?: {
        color?: (text: string) => string;
    }): string;
    /**
     * Create a ratio display (e.g., 42/100)
     */
    static ratio(current: number, total: number, options?: {
        color?: (text: string) => string;
    }): string;
    /**
     * Create a completion indicator with checkmark or X
     */
    static complete(isComplete: boolean, label?: string): string;
    /**
     * Create a multi-metric progress display
     */
    static metrics(metrics: Array<{
        label: string;
        value: number;
        target?: number;
    }>, options?: {
        width?: number;
    }): string;
    /**
     * Create a health indicator (good/warning/critical)
     */
    static health(value: number, thresholds?: {
        good: number;
        warning: number;
    }): string;
}
export default Progress;
//# sourceMappingURL=Progress.d.ts.map