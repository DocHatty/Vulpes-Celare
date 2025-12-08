/**
 * Filter Health Check & Diagnostics
 *
 * Comprehensive diagnostics for the HIPAA redaction filter chain:
 * - Validates all filters are loaded and functional
 * - Tests each filter with known PHI patterns
 * - Reports missing/failing filters
 * - Provides real-time health monitoring
 *
 * @module redaction/diagnostics
 */
/**
 * Health status for a single filter
 */
export interface FilterHealth {
    filterName: string;
    filterType: string;
    status: "healthy" | "degraded" | "failed" | "missing";
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    errors: string[];
    warnings: string[];
    lastTested: Date;
    detectionRate: number;
}
/**
 * Overall system health report
 */
export interface SystemHealthReport {
    timestamp: Date;
    overallStatus: "healthy" | "degraded" | "critical";
    totalFilters: number;
    healthyFilters: number;
    degradedFilters: number;
    failedFilters: number;
    missingFilters: number;
    filterReports: FilterHealth[];
    missingHIPAAFilters: string[];
    recommendations: string[];
}
/**
 * Filter Health Check Service
 */
export declare class FilterHealthCheck {
    /**
     * HIPAA Safe Harbor identifiers that MUST be covered
     */
    private static readonly REQUIRED_HIPAA_FILTERS;
    /**
     * Test cases for each filter type
     */
    private static readonly TEST_CASES;
    /**
     * Run comprehensive health check on all filters
     */
    static runFullHealthCheck(): Promise<SystemHealthReport>;
    /**
     * Test a single filter with relevant test cases
     */
    private static testFilter;
    /**
     * Generate actionable recommendations based on health report
     */
    private static generateRecommendations;
    /**
     * Log health report to console
     */
    private static logHealthReport;
    /**
     * Quick health check - just verify all filters load
     */
    static quickHealthCheck(): Promise<boolean>;
}
//# sourceMappingURL=FilterHealthCheck.d.ts.map