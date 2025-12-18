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
export class StatisticsTracker {
    private stats: Map<string, number> = new Map();

    /**
     * Increment counter for a redaction type
     */
    increment(type: string): void {
        if (!this.stats.has(type)) {
            this.stats.set(type, 0);
        }
        this.stats.set(type, (this.stats.get(type) || 0) + 1);
    }

    /**
     * Get all statistics as a plain object
     */
    getStats(): { [key: string]: number } {
        const result: { [key: string]: number } = {};
        for (const [key, value] of this.stats) {
            result[key] = value;
        }
        return result;
    }

    /**
     * Get count for a specific type
     */
    getCount(type: string): number {
        return this.stats.get(type) || 0;
    }

    /**
     * Reset all statistics
     */
    reset(): void {
        this.stats.clear();
    }

    /**
     * Get total count across all types
     */
    getTotalCount(): number {
        let total = 0;
        for (const count of this.stats.values()) {
            total += count;
        }
        return total;
    }
}
