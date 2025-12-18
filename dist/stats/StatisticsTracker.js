"use strict";
/**
 * Statistics Tracker
 *
 * Tracks redaction statistics:
 * - Count of redactions by type
 * - Aggregated statistics
 *
 * @module redaction/stats
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsTracker = void 0;
/**
 * Statistics Tracker - counts redaction events by type
 */
class StatisticsTracker {
    stats = new Map();
    /**
     * Increment counter for a redaction type
     */
    increment(type) {
        if (!this.stats.has(type)) {
            this.stats.set(type, 0);
        }
        this.stats.set(type, (this.stats.get(type) || 0) + 1);
    }
    /**
     * Get all statistics as a plain object
     */
    getStats() {
        const result = {};
        for (const [key, value] of this.stats) {
            result[key] = value;
        }
        return result;
    }
    /**
     * Get count for a specific type
     */
    getCount(type) {
        return this.stats.get(type) || 0;
    }
    /**
     * Reset all statistics
     */
    reset() {
        this.stats.clear();
    }
    /**
     * Get total count across all types
     */
    getTotalCount() {
        let total = 0;
        for (const count of this.stats.values()) {
            total += count;
        }
        return total;
    }
}
exports.StatisticsTracker = StatisticsTracker;
//# sourceMappingURL=StatisticsTracker.js.map