/**
 * Statistics Tracker
 *
 * Tracks redaction statistics:
 * - Count of redactions by type
 * - Aggregated statistics
 *
 * @module redaction/stats
 */
/**
 * Statistics Tracker - counts redaction events by type
 */
export declare class StatisticsTracker {
    private stats;
    /**
     * Increment counter for a redaction type
     */
    increment(type: string): void;
    /**
     * Get all statistics as a plain object
     */
    getStats(): {
        [key: string]: number;
    };
    /**
     * Get count for a specific type
     */
    getCount(type: string): number;
    /**
     * Reset all statistics
     */
    reset(): void;
    /**
     * Get total count across all types
     */
    getTotalCount(): number;
}
//# sourceMappingURL=StatisticsTracker.d.ts.map