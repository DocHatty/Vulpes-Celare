/**
 * VULPES CORTEX - AUTOMATED IMPROVEMENT WORKFLOW
 *
 * Orchestrates the complete improvement cycle:
 * 1. Run parquet analysis when appropriate
 * 2. Extract actionable recommendations
 * 3. Apply safe improvements automatically (with approval)
 * 4. Track improvements over time
 * 5. Generate comprehensive reports
 *
 * USAGE:
 *   node tests/master-suite/cortex/improvement-workflow.js
 *   node tests/master-suite/cortex/improvement-workflow.js --dry-run
 *   node tests/master-suite/cortex/improvement-workflow.js --auto-approve-safe
 */

const { ParquetIntegration } = require('./parquet-integration');
const { ParquetAnalyzer } = require('./parquet-analyzer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class ImprovementWorkflow {
    constructor(options = {}) {
        this.options = {
            dryRun: options.dryRun || false,
            autoApproveSafe: options.autoApproveSafe || false,
            parquetDir: options.parquetDir || 'C:\\Users\\docto\\Downloads\\Here',
            ...options
        };

        this.integration = new ParquetIntegration(null);
        this.workflowPath = path.join(__dirname, '.cache', 'workflow-history.json');
    }

    /**
     * Main workflow execution
     */
    async run() {
        console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║   VULPES CORTEX - AUTOMATED IMPROVEMENT WORKFLOW                     ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

        if (this.options.dryRun) {
            console.log('🔍 DRY RUN MODE - No changes will be made\n');
        }

        // STEP 1: Check if parquet analysis should run
        console.log('STEP 1: Checking if external validation is needed...\n');
        const decision = this.integration.shouldRunParquetAnalysis({});

        if (!decision.should_run) {
            console.log('✓ External validation not needed at this time');
            console.log('  All triggers are satisfied\n');
            return;
        }

        console.log(`Priority: ${decision.priority}`);
        decision.reasoning.forEach(reason => console.log(reason));
        console.log('');

        // STEP 2: Get user approval if needed
        if (!this.options.autoApproveSafe && !this.options.dryRun) {
            const approved = await this._promptUser(
                `\nRun external dataset analysis? (${decision.estimated_time}) [Y/n]: `
            );
            if (!approved) {
                console.log('Analysis cancelled by user\n');
                return;
            }
        }

        // STEP 3: Run parquet analysis
        console.log('\nSTEP 2: Running external dataset analysis...\n');
        const analysisResult = await this.integration.runAnalysis({
            split: decision.dataset_recommendation,
            parquetDir: this.options.parquetDir
        });

        if (!analysisResult) {
            console.log('⚠️  Analysis could not be completed\n');
            return;
        }

        const { report, recommendations } = analysisResult;

        // STEP 4: Display recommendations
        console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║   STEP 3: RECOMMENDATIONS                                            ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

        if (recommendations.length === 0) {
            console.log('✓ No improvements needed - system performing optimally\n');
            return;
        }

        recommendations.forEach((rec, i) => {
            this._displayRecommendation(rec, i + 1);
        });

        // STEP 5: Process improvements
        if (!this.options.dryRun) {
            console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
            console.log('║   STEP 4: APPLY IMPROVEMENTS                                         ║');
            console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

            const improvements = await this._processRecommendations(recommendations);

            // STEP 6: Record workflow execution
            this._recordWorkflow({
                timestamp: new Date().toISOString(),
                analysis: {
                    split: decision.dataset_recommendation,
                    sensitivity: report.summary.sensitivity,
                    precision: report.summary.precision,
                    docsAnalyzed: report.summary.docsAnalyzed
                },
                recommendations: recommendations.length,
                improvements: improvements
            });

            // STEP 7: Generate summary
            console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
            console.log('║   WORKFLOW COMPLETE                                                  ║');
            console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

            console.log(`Improvements applied: ${improvements.applied}`);
            console.log(`Improvements deferred: ${improvements.deferred}`);
            console.log(`Next steps: ${improvements.nextSteps.length}\n`);

            if (improvements.nextSteps.length > 0) {
                console.log('Next steps:');
                improvements.nextSteps.forEach(step => console.log(`  ${step}`));
                console.log('');
            }
        } else {
            console.log('\n(Dry run - no changes made)\n');
        }
    }

    /**
     * Display a recommendation in formatted style
     */
    _displayRecommendation(rec, index) {
        const prioritySymbol = {
            'CRITICAL': '🚨',
            'HIGH': '⚠️ ',
            'MEDIUM': '📊',
            'LOW': 'ℹ️ '
        }[rec.priority] || '•';

        console.log(`${index}. ${prioritySymbol} ${rec.title}`);
        console.log(`   Priority: ${rec.priority}`);
        console.log(`   Type: ${rec.type}`);
        console.log(`   Action: ${rec.action}\n`);

        if (rec.details) {
            if (Array.isArray(rec.details)) {
                console.log('   Top patterns:');
                rec.details.slice(0, 3).forEach(d => {
                    console.log(`     - ${d.pattern || d} (${d.occurrences || 'N/A'} occurrences)`);
                });
                if (rec.details.length > 3) {
                    console.log(`     ... and ${rec.details.length - 3} more`);
                }
            } else {
                Object.entries(rec.details).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
            }
            console.log('');
        }

        if (rec.implementationSteps) {
            console.log('   Implementation steps:');
            rec.implementationSteps.forEach(step => console.log(`     • ${step}`));
            console.log('');
        }
    }

    /**
     * Process recommendations and apply safe improvements
     */
    async _processRecommendations(recommendations) {
        const result = {
            applied: 0,
            deferred: 0,
            nextSteps: []
        };

        for (const rec of recommendations) {
            // Determine if this is a "safe" improvement that can be auto-applied
            const isSafe = this._isSafeImprovement(rec);

            if (isSafe && this.options.autoApproveSafe) {
                console.log(`\n✓ Auto-applying safe improvement: ${rec.title}`);
                const success = await this._applyImprovement(rec);
                if (success) {
                    result.applied++;
                } else {
                    result.deferred++;
                    result.nextSteps.push(`Manually apply: ${rec.title}`);
                }
            } else {
                // Ask user
                const approved = await this._promptUser(
                    `\nApply: ${rec.title}? [y/N]: `
                );

                if (approved) {
                    const success = await this._applyImprovement(rec);
                    if (success) {
                        result.applied++;
                    } else {
                        result.deferred++;
                        result.nextSteps.push(`Failed to apply: ${rec.title}`);
                    }
                } else {
                    result.deferred++;
                    result.nextSteps.push(`Review: ${rec.title}`);
                }
            }
        }

        return result;
    }

    /**
     * Determine if an improvement is safe to auto-apply
     */
    _isSafeImprovement(rec) {
        // Only dictionary expansions are considered "safe" for auto-apply
        // All other improvements require human review
        return rec.type === 'DICTIONARY_EXPANSION' && rec.priority !== 'CRITICAL';
    }

    /**
     * Apply a specific improvement
     */
    async _applyImprovement(rec) {
        try {
            switch (rec.type) {
                case 'DICTIONARY_EXPANSION':
                    return await this._applyDictionaryExpansion(rec);

                case 'EXTERNAL_VALIDATION':
                case 'PERFORMANCE_GAP':
                case 'ADVERSARIAL_TESTING':
                    // These require manual review and filter modifications
                    console.log('   ⚠️  This improvement requires manual review');
                    console.log('   See implementation steps above');
                    return false;

                default:
                    console.log('   ℹ️  Unknown improvement type - manual review required');
                    return false;
            }
        } catch (error) {
            console.error(`   ✗ Error applying improvement: ${error.message}`);
            return false;
        }
    }

    /**
     * Apply dictionary expansion improvements
     */
    async _applyDictionaryExpansion(rec) {
        console.log('   Dictionary expansion requires manual review of extracted entities');
        console.log('   Recommendation: Review quality before importing');
        console.log('   Location: See parquet analysis report for extracted entities');
        return false; // Always require manual review for now
    }

    /**
     * Prompt user for input
     */
    async _promptUser(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => {
            rl.question(question, answer => {
                rl.close();
                const normalized = answer.trim().toLowerCase();
                resolve(normalized === 'y' || normalized === 'yes');
            });
        });
    }

    /**
     * Record workflow execution in history
     */
    _recordWorkflow(execution) {
        try {
            const cacheDir = path.dirname(this.workflowPath);
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            let history = [];
            if (fs.existsSync(this.workflowPath)) {
                history = JSON.parse(fs.readFileSync(this.workflowPath, 'utf-8'));
            }

            history.push(execution);

            // Keep last 20 executions
            if (history.length > 20) {
                history = history.slice(-20);
            }

            fs.writeFileSync(this.workflowPath, JSON.stringify(history, null, 2));
        } catch (error) {
            console.warn('Could not record workflow execution:', error.message);
        }
    }

    /**
     * Get workflow execution history
     */
    getHistory() {
        try {
            if (fs.existsSync(this.workflowPath)) {
                return JSON.parse(fs.readFileSync(this.workflowPath, 'utf-8'));
            }
        } catch (error) {
            // Ignore
        }
        return [];
    }
}

// CLI execution
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run'),
        autoApproveSafe: args.includes('--auto-approve-safe'),
        parquetDir: args.includes('--dir')
            ? args[args.indexOf('--dir') + 1]
            : 'C:\\Users\\docto\\Downloads\\Here'
    };

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
VULPES CORTEX - AUTOMATED IMPROVEMENT WORKFLOW

Orchestrates the complete improvement cycle for Vulpes Celare.

USAGE:
  node improvement-workflow.js [OPTIONS]

OPTIONS:
  --dry-run              Show what would happen without making changes
  --auto-approve-safe    Automatically apply safe improvements (dictionary expansions)
  --dir <path>           Parquet directory (default: C:\\Users\\docto\\Downloads\\Here)
  -h, --help             Show this help message

EXAMPLES:
  # Interactive mode (recommended first time)
  node improvement-workflow.js

  # Dry run to see recommendations
  node improvement-workflow.js --dry-run

  # Auto-apply safe improvements
  node improvement-workflow.js --auto-approve-safe

WORKFLOW STEPS:
  1. Check if external validation is needed
  2. Run parquet analysis if appropriate
  3. Generate recommendations
  4. Apply improvements (with approval)
  5. Track progress over time
  6. Generate summary report

SAFE IMPROVEMENTS:
  - Dictionary expansions (with review)

MANUAL REVIEW REQUIRED:
  - Filter pattern modifications
  - Adversarial test case additions
  - Performance gap investigations
`);
        process.exit(0);
    }

    const workflow = new ImprovementWorkflow(options);
    workflow.run().catch(error => {
        console.error(`\nWorkflow error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { ImprovementWorkflow };
