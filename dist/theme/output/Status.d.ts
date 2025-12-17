/**
 * ============================================================================
 * VULPES CELARE - STATUS OUTPUT COMPONENT
 * ============================================================================
 *
 * Status message formatting with icons and semantic coloring.
 * Provides consistent status display across the CLI.
 *
 * Usage:
 *   import { Status } from '../theme/output';
 *
 *   console.log(Status.success('Operation complete'));
 *   console.log(Status.error('Failed to process'));
 */
export type StatusType = "success" | "error" | "warning" | "info" | "debug" | "pending";
export interface StatusOptions {
    /** Include icon */
    icon?: boolean;
    /** Custom icon */
    customIcon?: string;
    /** Bold text */
    bold?: boolean;
    /** Prefix text */
    prefix?: string;
    /** Suffix text */
    suffix?: string;
    /** Indent level */
    indent?: number;
}
export declare class Status {
    /**
     * Create a success status message
     */
    static success(message: string, options?: StatusOptions): string;
    /**
     * Create an error status message
     */
    static error(message: string, options?: StatusOptions): string;
    /**
     * Create a warning status message
     */
    static warning(message: string, options?: StatusOptions): string;
    /**
     * Create an info status message
     */
    static info(message: string, options?: StatusOptions): string;
    /**
     * Create a debug status message
     */
    static debug(message: string, options?: StatusOptions): string;
    /**
     * Create a pending status message
     */
    static pending(message: string, options?: StatusOptions): string;
    /**
     * Generic status formatter
     */
    static format(type: StatusType, message: string, options?: StatusOptions): string;
    /**
     * Get icon for status type
     */
    private static getIcon;
    /**
     * Get color function for status type
     */
    private static getColor;
    /**
     * Create a "done" message
     */
    static done(message?: string): string;
    /**
     * Create a "failed" message
     */
    static failed(message?: string): string;
    /**
     * Create a "skipped" message
     */
    static skipped(message: string): string;
    /**
     * Create a "processing" message
     */
    static processing(message: string): string;
    /**
     * Create a "waiting" message
     */
    static waiting(message: string): string;
    /**
     * Create a bullet point item
     */
    static bullet(message: string, options?: {
        indent?: number;
        color?: (text: string) => string;
    }): string;
    /**
     * Create an arrow item (for sub-items)
     */
    static arrow(message: string, options?: {
        indent?: number;
    }): string;
    /**
     * Create a numbered item
     */
    static numbered(index: number, message: string, options?: {
        indent?: number;
        color?: (text: string) => string;
    }): string;
    /**
     * Create a PHI-related status (uses shield icon)
     */
    static phi(message: string, type?: StatusType): string;
    /**
     * Create a security-related status
     */
    static security(message: string, type?: StatusType): string;
    /**
     * Create a redaction status
     */
    static redaction(original: string, replacement: string): string;
    /**
     * Create a diff-style status (showing change)
     */
    static diff(before: string, after: string): string;
    /**
     * Create a status list from multiple items
     */
    static list(items: Array<{
        type: StatusType;
        message: string;
    }>): string;
    /**
     * Create a summary of status counts
     */
    static summary(counts: {
        success?: number;
        error?: number;
        warning?: number;
        skipped?: number;
    }): string;
}
export default Status;
//# sourceMappingURL=Status.d.ts.map