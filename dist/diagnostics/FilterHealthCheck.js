"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterHealthCheck = void 0;
const FilterRegistry_1 = require("../filters/FilterRegistry");
const RedactionContext_1 = require("../context/RedactionContext");
const RadiologyLogger_1 = require("../utils/RadiologyLogger");
/**
 * Filter Health Check Service
 */
class FilterHealthCheck {
    /**
     * Run comprehensive health check on all filters
     */
    static async runFullHealthCheck() {
        RadiologyLogger_1.RadiologyLogger.loading("DIAGNOSTICS", "Running filter health check...");
        // Initialize filters if not already done
        await FilterRegistry_1.FilterRegistry.initialize();
        const filters = FilterRegistry_1.FilterRegistry.getAllSpanFilters();
        const filterReports = [];
        // Test each filter
        for (const filter of filters) {
            const health = await this.testFilter(filter);
            filterReports.push(health);
        }
        // Check for missing HIPAA-required filters
        const registeredTypes = filters.map((f) => f.getType());
        const missingFilters = this.REQUIRED_HIPAA_FILTERS.filter((required) => !registeredTypes.includes(required));
        // Calculate overall status
        const healthyCount = filterReports.filter((r) => r.status === "healthy").length;
        const degradedCount = filterReports.filter((r) => r.status === "degraded").length;
        const failedCount = filterReports.filter((r) => r.status === "failed").length;
        let overallStatus;
        if (failedCount > 0 || missingFilters.length > 0) {
            overallStatus = "critical";
        }
        else if (degradedCount > 2) {
            overallStatus = "degraded";
        }
        else {
            overallStatus = "healthy";
        }
        // Generate recommendations
        const recommendations = this.generateRecommendations(filterReports, missingFilters);
        const report = {
            timestamp: new Date(),
            overallStatus,
            totalFilters: filters.length,
            healthyFilters: healthyCount,
            degradedFilters: degradedCount,
            failedFilters: failedCount,
            missingFilters: missingFilters.length,
            filterReports,
            missingHIPAAFilters: missingFilters,
            recommendations,
        };
        this.logHealthReport(report);
        return report;
    }
    /**
     * Test a single filter with relevant test cases
     */
    static async testFilter(filter) {
        const filterType = filter.getType();
        const filterName = filter.constructor.name;
        const health = {
            filterName,
            filterType,
            status: "healthy",
            testsRun: 0,
            testsPassed: 0,
            testsFailed: 0,
            errors: [],
            warnings: [],
            lastTested: new Date(),
            detectionRate: 0,
        };
        // Get test cases for this filter type
        const relevantTests = this.TEST_CASES.filter((tc) => tc.expectedType === filterType);
        if (relevantTests.length === 0) {
            health.warnings.push(`No test cases defined for ${filterType}`);
            health.status = "degraded";
            return health;
        }
        // Run each test case
        for (const testCase of relevantTests) {
            health.testsRun++;
            try {
                const context = new RedactionContext_1.RedactionContext();
                const spans = await Promise.resolve(filter.detect(testCase.input, {}, context));
                const detected = spans.length > 0;
                if (testCase.shouldDetect && detected) {
                    health.testsPassed++;
                }
                else if (!testCase.shouldDetect && !detected) {
                    health.testsPassed++;
                }
                else {
                    health.testsFailed++;
                    health.errors.push(`Failed: ${testCase.name} - Expected ${testCase.shouldDetect ? "detection" : "no detection"}, got ${detected ? "detection" : "no detection"}`);
                }
            }
            catch (error) {
                health.testsFailed++;
                health.errors.push(`Error in ${testCase.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        // Calculate detection rate
        health.detectionRate =
            health.testsRun > 0 ? (health.testsPassed / health.testsRun) * 100 : 0;
        // Determine status
        if (health.testsFailed > 0) {
            health.status =
                health.testsFailed >= health.testsRun / 2 ? "failed" : "degraded";
        }
        return health;
    }
    /**
     * Generate actionable recommendations based on health report
     */
    static generateRecommendations(filterReports, missingFilters) {
        const recommendations = [];
        // Missing filters
        if (missingFilters.length > 0) {
            recommendations.push(`[!] CRITICAL: ${missingFilters.length} HIPAA-required filters are missing: ${missingFilters.join(", ")}`);
            recommendations.push(`Action: Implement Span-based versions of missing filters and register in FilterRegistry.ts`);
        }
        // Failed filters
        const failedFilters = filterReports.filter((r) => r.status === "failed");
        if (failedFilters.length > 0) {
            recommendations.push(`[!] ${failedFilters.length} filters are failing tests:`);
            for (const filter of failedFilters) {
                recommendations.push(`  - ${filter.filterName} (${filter.testsFailed}/${filter.testsRun} tests failed)`);
            }
        }
        // Degraded filters
        const degradedFilters = filterReports.filter((r) => r.status === "degraded");
        if (degradedFilters.length > 0) {
            recommendations.push(`[!] ${degradedFilters.length} filters have warnings or partial failures`);
        }
        // Low detection rates
        const lowDetectionFilters = filterReports.filter((r) => r.detectionRate < 80 && r.testsRun > 0);
        if (lowDetectionFilters.length > 0) {
            recommendations.push(`[!] ${lowDetectionFilters.length} filters have detection rate < 80%`);
        }
        if (recommendations.length === 0) {
            recommendations.push("[OK] All filters are healthy and functioning correctly");
        }
        return recommendations;
    }
    /**
     * Log health report to console
     */
    static logHealthReport(report) {
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "=".repeat(60));
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "FILTER HEALTH CHECK REPORT");
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "=".repeat(60));
        const statusIcon = report.overallStatus === "healthy"
            ? "[OK]"
            : report.overallStatus === "degraded"
                ? "[!]"
                : "[X]";
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", `${statusIcon} Overall Status: ${report.overallStatus.toUpperCase()}`);
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "");
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", `Total Filters: ${report.totalFilters}`);
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", `[OK] Healthy: ${report.healthyFilters}`);
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", `[!] Degraded: ${report.degradedFilters}`);
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", `[X] Failed: ${report.failedFilters}`);
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", `[?] Missing: ${report.missingFilters}`);
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "");
        // Show missing HIPAA filters
        if (report.missingHIPAAFilters.length > 0) {
            RadiologyLogger_1.RadiologyLogger.error("DIAGNOSTICS", `[X] Missing HIPAA Safe Harbor Filters: ${report.missingHIPAAFilters.join(", ")}`);
            RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "");
        }
        // Show individual filter status
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "Individual Filter Status:");
        for (const filter of report.filterReports) {
            const icon = filter.status === "healthy"
                ? "[OK]"
                : filter.status === "degraded"
                    ? "[!]"
                    : "[X]";
            RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", `  ${icon} ${filter.filterName} (${filter.filterType}): ${filter.testsPassed}/${filter.testsRun} passed (${filter.detectionRate.toFixed(1)}%)`);
            // Show errors if any
            if (filter.errors.length > 0) {
                for (const error of filter.errors) {
                    RadiologyLogger_1.RadiologyLogger.error("DIAGNOSTICS", `      ${error}`);
                }
            }
            // Show warnings if any
            if (filter.warnings.length > 0) {
                for (const warning of filter.warnings) {
                    RadiologyLogger_1.RadiologyLogger.warn("DIAGNOSTICS", `      ${warning}`);
                }
            }
        }
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "");
        // Show recommendations
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "Recommendations:");
        for (const rec of report.recommendations) {
            RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", `  ${rec}`);
        }
        RadiologyLogger_1.RadiologyLogger.info("DIAGNOSTICS", "=".repeat(60));
    }
    /**
     * Quick health check - just verify all filters load
     */
    static async quickHealthCheck() {
        try {
            await FilterRegistry_1.FilterRegistry.initialize();
            const filters = FilterRegistry_1.FilterRegistry.getAllSpanFilters();
            RadiologyLogger_1.RadiologyLogger.success("DIAGNOSTICS", `Quick health check passed: ${filters.length} filters loaded`);
            return true;
        }
        catch (error) {
            RadiologyLogger_1.RadiologyLogger.error("DIAGNOSTICS", "Quick health check FAILED", error);
            return false;
        }
    }
}
exports.FilterHealthCheck = FilterHealthCheck;
/**
 * HIPAA Safe Harbor identifiers that MUST be covered
 */
FilterHealthCheck.REQUIRED_HIPAA_FILTERS = [
    "NAME",
    "EMAIL",
    "SSN",
    "PHONE",
    "FAX",
    "DATE",
    "ADDRESS",
    "ZIPCODE",
    "MRN",
    "HEALTHPLAN",
    "ACCOUNT",
    "CREDITCARD",
    "LICENSE",
    "VEHICLE",
    "DEVICE",
    "URL",
    "IP",
    "NPI",
    "BIOMETRIC",
];
/**
 * Test cases for each filter type
 */
FilterHealthCheck.TEST_CASES = [
    // NAME tests
    {
        name: "Titled Name",
        input: "Dr. Smith",
        expectedType: "NAME",
        shouldDetect: true,
        description: "Doctor title with last name",
    },
    {
        name: "Family Name",
        input: "Smith, John",
        expectedType: "NAME",
        shouldDetect: true,
        description: "Last, First format",
    },
    {
        name: "Formatted Name",
        input: "John Smith",
        expectedType: "NAME",
        shouldDetect: true,
        description: "First Last format",
    },
    {
        name: "Family Relationship Name",
        input: "Wife: Mary Johnson",
        expectedType: "NAME",
        shouldDetect: true,
        description: "Family relationship with name",
    },
    {
        name: "Emergency Contact Name",
        input: "Emergency Contact: Robert Smith",
        expectedType: "NAME",
        shouldDetect: true,
        description: "Emergency contact with name",
    },
    {
        name: "Child with Age",
        input: "Daughter: Emma (age 7)",
        expectedType: "NAME",
        shouldDetect: true,
        description: "Child name with age",
    },
    // EMAIL tests
    {
        name: "Standard Email",
        input: "john.doe@example.com",
        expectedType: "EMAIL",
        shouldDetect: true,
        description: "Standard email format",
    },
    // PHONE tests
    {
        name: "Phone with dashes",
        input: "555-123-4567",
        expectedType: "PHONE",
        shouldDetect: true,
        description: "US phone with dashes",
    },
    {
        name: "Phone with parens",
        input: "(555) 123-4567",
        expectedType: "PHONE",
        shouldDetect: true,
        description: "US phone with parentheses",
    },
    // SSN tests
    {
        name: "SSN with dashes",
        input: "123-45-6789",
        expectedType: "SSN",
        shouldDetect: true,
        description: "SSN in standard format",
    },
    {
        name: "SSN no dashes",
        input: "123456789",
        expectedType: "SSN",
        shouldDetect: true,
        description: "SSN without separators",
    },
    // DATE tests
    {
        name: "Date MM/DD/YYYY",
        input: "12/25/2023",
        expectedType: "DATE",
        shouldDetect: true,
        description: "US date format",
    },
    {
        name: "Date short year",
        input: "1/15/60",
        expectedType: "DATE",
        shouldDetect: true,
        description: "Short year format",
    },
    // ADDRESS tests
    {
        name: "Street address",
        input: "123 Main Street",
        expectedType: "ADDRESS",
        shouldDetect: true,
        description: "Standard street address",
    },
    // ZIPCODE tests
    {
        name: "ZIP 5-digit",
        input: "12345",
        expectedType: "ZIPCODE",
        shouldDetect: true,
        description: "5-digit ZIP",
    },
    {
        name: "ZIP+4",
        input: "12345-6789",
        expectedType: "ZIPCODE",
        shouldDetect: true,
        description: "ZIP+4 format",
    },
    // MRN tests
    {
        name: "MRN labeled",
        input: "MRN: 123456",
        expectedType: "MRN",
        shouldDetect: true,
        description: "Labeled medical record number",
    },
    // CREDITCARD tests
    {
        name: "Credit card",
        input: "4532-1234-5678-9010",
        expectedType: "CREDITCARD",
        shouldDetect: true,
        description: "Credit card with dashes",
    },
    // URL tests
    {
        name: "HTTPS URL",
        input: "https://example.com",
        expectedType: "URL",
        shouldDetect: true,
        description: "Standard HTTPS URL",
    },
    // IP tests
    {
        name: "IPv4 address",
        input: "192.168.1.1",
        expectedType: "IP",
        shouldDetect: true,
        description: "IPv4 address",
    },
    // ACCOUNT tests
    {
        name: "Account number",
        input: "Account: 123456789",
        expectedType: "ACCOUNT",
        shouldDetect: true,
        description: "Labeled account number",
    },
    // NPI tests
    {
        name: "NPI labeled",
        input: "NPI: 1234567890",
        expectedType: "NPI",
        shouldDetect: true,
        description: "National Provider Identifier",
    },
    // HEALTHPLAN tests
    {
        name: "Policy number",
        input: "Policy: ABC123456",
        expectedType: "HEALTHPLAN",
        shouldDetect: true,
        description: "Health plan policy number",
    },
    // LICENSE tests
    {
        name: "License number",
        input: "License: DL12345",
        expectedType: "LICENSE",
        shouldDetect: true,
        description: "Driver's license",
    },
    // FAX tests
    {
        name: "Labeled fax number",
        input: "Fax: (555) 123-4567",
        expectedType: "FAX",
        shouldDetect: true,
        description: "Fax number with label",
    },
    {
        name: "Fax number compact",
        input: "FAX #: 555-123-4567",
        expectedType: "FAX",
        shouldDetect: true,
        description: "Fax with # symbol",
    },
    // VEHICLE tests
    {
        name: "VIN labeled",
        input: "VIN: 1HGBH41JXMN109186",
        expectedType: "VEHICLE",
        shouldDetect: true,
        description: "Vehicle identification number",
    },
    {
        name: "License plate",
        input: "License Plate: ABC-1234",
        expectedType: "VEHICLE",
        shouldDetect: true,
        description: "Vehicle license plate",
    },
    {
        name: "GPS coordinates",
        input: "Location: 40.7128, -74.0060",
        expectedType: "VEHICLE",
        shouldDetect: true,
        description: "GPS decimal degrees",
    },
    // DEVICE tests
    {
        name: "Pacemaker ID",
        input: "Pacemaker Serial: PM-123456789",
        expectedType: "DEVICE",
        shouldDetect: true,
        description: "Medical device identifier",
    },
    {
        name: "Implant device",
        input: "Implant Device ID: ICD-9876543",
        expectedType: "DEVICE",
        shouldDetect: true,
        description: "Implanted device serial number",
    },
    // BIOMETRIC tests
    {
        name: "Fingerprint reference",
        input: "Fingerprint on file for identification",
        expectedType: "BIOMETRIC",
        shouldDetect: true,
        description: "Biometric fingerprint reference",
    },
    {
        name: "Facial photo reference",
        input: "Full face photographs were taken",
        expectedType: "BIOMETRIC",
        shouldDetect: true,
        description: "Biometric facial photo",
    },
    {
        name: "Identifying mark",
        input: "Distinguishing scar on left forearm",
        expectedType: "BIOMETRIC",
        shouldDetect: true,
        description: "Physical identifying characteristic",
    },
];
//# sourceMappingURL=FilterHealthCheck.js.map