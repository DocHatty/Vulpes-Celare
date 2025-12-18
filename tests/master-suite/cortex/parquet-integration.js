/**
 * VULPES CORTEX - PARQUET ANALYSIS INTEGRATION
 *
 * Integrates external dataset analysis into the Cortex intelligence loop
 *
 * WHEN TO TRIGGER:
 * - After regular test runs (check if we should validate against external data)
 * - When sensitivity drops (investigate with larger dataset)
 * - When new filters added (validate on external data)
 * - Periodically (weekly validation runs)
 *
 * WHAT IT DOES:
 * 1. Decides when parquet analysis should run
 * 2. Runs analysis when appropriate
 * 3. Interprets results
 * 4. Generates actionable recommendations
 * 5. Tracks improvements over time
 */

const { ParquetAnalyzer } = require('./parquet-analyzer');
const fs = require('fs');
const path = require('path');

class ParquetIntegration {
    constructor(cortex) {
        this.cortex = cortex;
        this.lastRunPath = path.join(__dirname, '.cache', 'last-parquet-run.json');
        this.resultsPath = path.join(__dirname, '.cache', 'parquet-results.json');
    }

    /**
     * Decide if parquet analysis should run based on current context
     *
     * @param {Object} testResults - Results from regular Vulpes tests
     * @returns {Object} Decision with reasoning
     */
    shouldRunParquetAnalysis(testResults) {
        const decision = {
            should_run: false,
            reasoning: [],
            priority: 'LOW',
            estimated_time: '2-3 minutes',
            dataset_recommendation: 'validation' // Start with 5k docs
        };

        // Check last run time
        const lastRun = this.getLastRun();
        const daysSinceLastRun = lastRun
            ? (Date.now() - new Date(lastRun.timestamp).getTime()) / (1000 * 60 * 60 * 24)
            : 999;

        // TRIGGER 1: Never run before
        if (!lastRun) {
            decision.should_run = true;
            decision.priority = 'HIGH';
            decision.reasoning.push('🆕 Initial validation - never tested against external dataset');
            decision.reasoning.push('   Quick test (100 docs) recommended to verify integration');
            decision.dataset_recommendation = 'validation';
            decision.estimated_time = '2-3 minutes';
        }

        // TRIGGER 2: Sensitivity dropped
        if (testResults && testResults.sensitivity < 99.0) {
            decision.should_run = true;
            decision.priority = 'CRITICAL';
            decision.reasoning.push(`⚠️  Sensitivity dropped to ${testResults.sensitivity.toFixed(2)}%`);
            decision.reasoning.push('   External validation needed to find missed patterns');
        }

        // TRIGGER 3: New filters added recently
        if (this.cortex && this.cortex.interventionTracker) {
            const recentFilters = this.cortex.interventionTracker.getRecentByType(
                'FILTER_MODIFICATION',
                7 // Last 7 days
            );
            if (recentFilters && recentFilters.length > 0) {
                decision.should_run = true;
                decision.priority = 'MEDIUM';
                decision.reasoning.push(`🔧 ${recentFilters.length} filter(s) modified recently`);
                decision.reasoning.push('   Validate improvements on external dataset');
            }
        }

        // TRIGGER 4: Weekly validation (if last run > 7 days ago)
        if (daysSinceLastRun > 7) {
            decision.should_run = true;
            decision.priority = 'MEDIUM';
            decision.reasoning.push(`📅 ${Math.floor(daysSinceLastRun)} days since last external validation`);
            decision.reasoning.push('   Weekly validation recommended');
        }

        // TRIGGER 5: User explicitly requested improvement recommendations
        if (testResults && testResults.requestedRecommendations) {
            decision.should_run = true;
            decision.priority = 'HIGH';
            decision.reasoning.push('👤 Improvement recommendations requested');
            decision.reasoning.push('   External dataset analysis will identify enhancement opportunities');
        }

        return decision;
    }

    /**
     * Run parquet analysis and return results
     *
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    async runAnalysis(options = {}) {
        const {
            split = 'validation',
            limit = null,
            parquetDir = 'C:\\Users\\docto\\Downloads\\Here'
        } = options;

        console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║   CORTEX: Triggering External Dataset Analysis                      ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

        try {
            // Check if parquet files exist
            if (!fs.existsSync(parquetDir)) {
                console.log('⚠️  Parquet directory not found. Skipping external validation.');
                console.log(`   Expected: ${parquetDir}\n`);
                return null;
            }

            const analyzer = new ParquetAnalyzer(parquetDir);
            const report = await analyzer.analyze({ split, limit });

            if (report) {
                // Save results
                this.saveResults(report);

                // Record this run
                this.recordRun({
                    split,
                    limit,
                    timestamp: new Date().toISOString(),
                    metrics: report.summary
                });

                // Generate Cortex-style recommendations
                const recommendations = this.interpretResults(report);

                return {
                    report,
                    recommendations
                };
            }

            return null;

        } catch (error) {
            console.error(`\nParquet analysis error: ${error.message}`);
            console.log('Continuing with normal Vulpes tests...\n');
            return null;
        }
    }

    /**
     * Interpret parquet analysis results and generate Cortex recommendations
     *
     * @param {Object} report - Parquet analysis report
     * @returns {Array} Cortex-compatible recommendations
     */
    interpretResults(report) {
        const recommendations = [];

        // RECOMMENDATION 1: Missing Patterns
        if (report.missedPatterns && report.missedPatterns.total > 0) {
            const topMissed = report.missedPatterns.topMissed.slice(0, 5);

            recommendations.push({
                type: 'EXTERNAL_VALIDATION',
                priority: topMissed.length > 50 ? 'CRITICAL' : 'HIGH',
                title: `${report.missedPatterns.total} patterns missed on external dataset`,
                action: 'Add missing patterns to filters',
                details: topMissed.map(m => ({
                    pattern: m.pattern,
                    occurrences: m.count,
                    example: m.examples[0]?.entity
                })),
                estimatedImpact: 'HIGH',
                implementationSteps: [
                    `Review top ${Math.min(5, topMissed.length)} missed patterns`,
                    'Identify which filters should catch these',
                    'Add patterns/dictionary entries to appropriate filters',
                    'Re-run analysis to verify improvement'
                ]
            });
        }

        // RECOMMENDATION 2: Dictionary Expansion
        if (report.dictionaryExpansion && report.dictionaryExpansion.totalNewEntries > 1000) {
            recommendations.push({
                type: 'DICTIONARY_EXPANSION',
                priority: 'MEDIUM',
                title: `${report.dictionaryExpansion.totalNewEntries.toLocaleString()} new dictionary entries available`,
                action: 'Expand dictionaries with extracted entities',
                details: report.dictionaryExpansion.byCategory,
                estimatedImpact: 'MEDIUM',
                implementationSteps: [
                    'Review extracted names and locations for quality',
                    'Import high-confidence entries into dictionaries',
                    'Run tests to verify no false positives introduced',
                    'Measure sensitivity improvement'
                ]
            });
        }

        // RECOMMENDATION 3: Performance Comparison
        const currentSensitivity = report.summary.sensitivity;
        if (currentSensitivity < 99.0) {
            recommendations.push({
                type: 'PERFORMANCE_GAP',
                priority: 'CRITICAL',
                title: `External validation shows ${currentSensitivity.toFixed(2)}% sensitivity`,
                action: 'Investigate performance gap',
                details: {
                    expected: '99.6% (on synthetic data)',
                    actual: `${currentSensitivity.toFixed(2)}% (on external data)`,
                    gap: `${(99.6 - currentSensitivity).toFixed(2)}%`
                },
                estimatedImpact: 'CRITICAL',
                implementationSteps: [
                    'Analyze top missed patterns',
                    'Identify systematic gaps in current filters',
                    'Prioritize fixes by frequency of occurrence',
                    'Validate fixes on external dataset'
                ]
            });
        } else if (currentSensitivity >= 99.0 && currentSensitivity < 99.6) {
            recommendations.push({
                type: 'PERFORMANCE_VALIDATION',
                priority: 'LOW',
                title: `External validation confirms ${currentSensitivity.toFixed(2)}% sensitivity`,
                action: 'Minor optimizations possible',
                details: {
                    status: 'GOOD - Within acceptable range',
                    improvement_potential: `${(99.6 - currentSensitivity).toFixed(2)}%`
                },
                estimatedImpact: 'LOW'
            });
        }

        // RECOMMENDATION 4: Adversarial Testing
        if (report.adversarialCases && report.adversarialCases.total > 0) {
            recommendations.push({
                type: 'ADVERSARIAL_TESTING',
                priority: 'MEDIUM',
                title: `${report.adversarialCases.total} edge cases identified`,
                action: 'Add adversarial cases to test suite',
                details: {
                    high_density: report.adversarialCases.cases.filter(c => c.type === 'high_density').length,
                    rare_patterns: report.adversarialCases.cases.filter(c => c.type === 'rare_pattern').length
                },
                estimatedImpact: 'MEDIUM',
                implementationSteps: [
                    'Review adversarial cases',
                    'Add to synthetic test corpus',
                    'Ensure continuous coverage of edge cases'
                ]
            });
        }

        return recommendations;
    }

    /**
     * Get last parquet run info
     */
    getLastRun() {
        try {
            if (fs.existsSync(this.lastRunPath)) {
                return JSON.parse(fs.readFileSync(this.lastRunPath, 'utf-8'));
            }
        } catch (error) {
            // Ignore
        }
        return null;
    }

    /**
     * Record parquet run
     */
    recordRun(runInfo) {
        try {
            const cacheDir = path.dirname(this.lastRunPath);
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }
            fs.writeFileSync(this.lastRunPath, JSON.stringify(runInfo, null, 2));
        } catch (error) {
            console.warn('Could not record parquet run:', error.message);
        }
    }

    /**
     * Save parquet results
     */
    saveResults(report) {
        try {
            const cacheDir = path.dirname(this.resultsPath);
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            // Load previous results
            let history = [];
            if (fs.existsSync(this.resultsPath)) {
                history = JSON.parse(fs.readFileSync(this.resultsPath, 'utf-8'));
            }

            // Add new result
            history.push({
                timestamp: new Date().toISOString(),
                sensitivity: report.summary.sensitivity,
                precision: report.summary.precision,
                f1: report.summary.f1,
                missedPatterns: report.missedPatterns.total,
                newDictionaryEntries: report.dictionaryExpansion.totalNewEntries
            });

            // Keep last 10 runs
            if (history.length > 10) {
                history = history.slice(-10);
            }

            fs.writeFileSync(this.resultsPath, JSON.stringify(history, null, 2));
        } catch (error) {
            console.warn('Could not save parquet results:', error.message);
        }
    }

    /**
     * Get historical trend
     */
    getTrend() {
        try {
            if (fs.existsSync(this.resultsPath)) {
                const history = JSON.parse(fs.readFileSync(this.resultsPath, 'utf-8'));

                if (history.length >= 2) {
                    const latest = history[history.length - 1];
                    const previous = history[history.length - 2];

                    return {
                        sensitivity_change: latest.sensitivity - previous.sensitivity,
                        precision_change: latest.precision - previous.precision,
                        direction: latest.sensitivity > previous.sensitivity ? 'IMPROVING' :
                                  latest.sensitivity < previous.sensitivity ? 'DEGRADING' : 'STABLE'
                    };
                }
            }
        } catch (error) {
            // Ignore
        }
        return null;
    }
}

module.exports = { ParquetIntegration };
