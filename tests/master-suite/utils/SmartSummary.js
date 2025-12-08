/**
 * Smart Summary Generator - LLM-Friendly Test Output
 *
 * Provides:
 * - Concise TL;DR at the top
 * - Comparison with previous run
 * - Prioritized action items
 * - Clean markdown format for LLMs
 * - Visual indicators (emojis, colors)
 */

const fs = require('fs');
const path = require('path');

class SmartSummary {
  constructor(resultsDir = null) {
    this.resultsDir = resultsDir || path.join(__dirname, '..', '..', 'results');
    this.historyFile = path.join(this.resultsDir, 'history.json');
  }

  /**
   * Generate smart summary from test results
   */
  generate(currentResults, options = {}) {
    const {
      compact = false,
      llmMode = false,
      showComparison = true,
      showRecommendations = true
    } = options;

    const previous = showComparison ? this.getPreviousRun() : null;
    const summary = [];

    // TL;DR Section
    summary.push(this.generateTLDR(currentResults, previous));

    // Key Metrics with Deltas
    if (!compact) {
      summary.push(this.generateMetrics(currentResults, previous));
    }

    // Top Issues (Prioritized)
    if (showRecommendations) {
      summary.push(this.generateTopIssues(currentResults));
    }

    // Comparison Details
    if (previous && showComparison) {
      summary.push(this.generateComparison(currentResults, previous));
    }

    // Next Actions
    if (showRecommendations) {
      summary.push(this.generateActionItems(currentResults));
    }

    // Save to history
    this.saveToHistory(currentResults);

    return summary.join('\n\n');
  }

  /**
   * Generate TL;DR - The most important info first
   */
  generateTLDR(current, previous) {
    const sens = current.metrics.sensitivity;
    const prev = previous ? previous.metrics.sensitivity : null;

    let status, emoji, trend = '';

    if (sens >= 99) {
      status = 'EXCELLENT';
      emoji = '🎉';
    } else if (sens >= 98) {
      status = 'GOOD';
      emoji = '✅';
    } else if (sens >= 97) {
      status = 'ACCEPTABLE';
      emoji = '⚠️';
    } else if (sens >= 95) {
      status = 'NEEDS IMPROVEMENT';
      emoji = '🔴';
    } else {
      status = 'CRITICAL';
      emoji = '🚨';
    }

    if (prev) {
      const delta = sens - prev;
      if (delta > 0.5) {
        trend = ` (↗ +${delta.toFixed(2)}% from last run)`;
      } else if (delta < -0.5) {
        trend = ` (↘ ${delta.toFixed(2)}% from last run)`;
      } else {
        trend = ` (→ stable)`;
      }
    }

    const totalFailures = this.countTotalFailures(current);
    const criticalFailures = this.countCriticalFailures(current);

    return `
╔═══════════════════════════════════════════════════════════════╗
║  ${emoji} VULPES TEST SUMMARY - ${status}
╚═══════════════════════════════════════════════════════════════╝

📊 Sensitivity: ${sens.toFixed(2)}%${trend}
📄 Documents: ${current.documents || 50}
❌ Failures: ${totalFailures} total (${criticalFailures} critical)
⏱️  Time: ${current.processingTime || 'N/A'}

${this.getQuickVerdict(sens, totalFailures)}
`.trim();
  }

  /**
   * Get quick verdict
   */
  getQuickVerdict(sensitivity, failures) {
    if (sensitivity >= 99 && failures < 10) {
      return '✅ **Ready for production** - Minor optimizations possible';
    } else if (sensitivity >= 98) {
      return '⚠️  **Acceptable for development** - Address top issues before production';
    } else if (sensitivity >= 97) {
      return '🔴 **Needs improvement** - Focus on critical failures';
    } else {
      return '🚨 **Not production-ready** - Significant work needed';
    }
  }

  /**
   * Generate metrics section with comparison
   */
  generateMetrics(current, previous) {
    const cm = current.metrics.confusionMatrix;
    const metrics = current.metrics;

    let output = `
📈 KEY METRICS
${'─'.repeat(60)}
Sensitivity (Recall):  ${metrics.sensitivity.toFixed(2)}%${this.getDelta(metrics.sensitivity, previous?.metrics.sensitivity)}
Specificity:           ${metrics.specificity.toFixed(2)}%${this.getDelta(metrics.specificity, previous?.metrics.specificity)}
Precision:             ${metrics.precision.toFixed(2)}%
F2 Score:              ${metrics.f2Score.toFixed(4)} (HIPAA standard)

CONFUSION MATRIX
True Positives:   ${cm.truePositives} ✅ (PHI correctly caught)
False Negatives:  ${cm.falseNegatives} ❌ (PHI missed - CRITICAL)
False Positives:  ${cm.falsePositives} ⚠️  (over-redactions)
True Negatives:   ${cm.trueNegatives} ✅ (correctly preserved)
`.trim();

    return output;
  }

  /**
   * Generate top issues (prioritized by impact)
   */
  generateTopIssues(current) {
    const failures = this.extractFailures(current);
    const prioritized = this.prioritizeFailures(failures);

    // Check if we have detailed failure data
    const hasDetailedData = Object.keys(current.metrics.byPHIType || {}).length > 0;
    const totalFailures = current.metrics.confusionMatrix?.falseNegatives || 0;

    // If no detailed data but we have failures from confusion matrix
    if (prioritized.length === 0 && totalFailures > 0) {
      return `\n⚠️  **${totalFailures} PHI items missed** (detailed breakdown not available in aggregate mode)\n\nNote: Run individual tests to see failure breakdown by PHI type.`;
    }

    if (prioritized.length === 0) {
      return '🎉 **No failures detected!** All PHI types handled correctly.';
    }

    let output = `
🎯 TOP ISSUES (Prioritized by Impact)
${'─'.repeat(60)}`;

    prioritized.slice(0, 5).forEach((issue, i) => {
      const emoji = issue.priority === 'CRITICAL' ? '🔴' :
                    issue.priority === 'HIGH' ? '🟡' : '🔵';
      output += `\n${i + 1}. ${emoji} ${issue.type}: ${issue.count} failures`;

      if (issue.samples && issue.samples.length > 0) {
        output += `\n   Examples: ${issue.samples.slice(0, 2).map(s => `"${s}"`).join(', ')}`;
      }

      if (issue.suggestion) {
        output += `\n   💡 Suggestion: ${issue.suggestion}`;
      }
    });

    return output;
  }

  /**
   * Generate comparison with previous run
   */
  generateComparison(current, previous) {
    const improvements = [];
    const regressions = [];

    // Compare by PHI type
    const currentTypes = current.metrics.byPHIType || {};
    const previousTypes = previous.metrics.byPHIType || {};

    Object.keys(currentTypes).forEach(type => {
      const curr = currentTypes[type];
      const prev = previousTypes[type];

      if (prev) {
        const currRate = (curr.tp / curr.total) * 100;
        const prevRate = (prev.tp / prev.total) * 100;
        const delta = currRate - prevRate;

        if (delta > 1) {
          improvements.push(`${type}: ${prevRate.toFixed(1)}% → ${currRate.toFixed(1)}% (+${delta.toFixed(1)}%)`);
        } else if (delta < -1) {
          regressions.push(`${type}: ${prevRate.toFixed(1)}% → ${currRate.toFixed(1)}% (${delta.toFixed(1)}%)`);
        }
      }
    });

    if (improvements.length === 0 && regressions.length === 0) {
      return '📊 **Performance stable** - No significant changes from last run';
    }

    let output = `
📊 COMPARISON WITH PREVIOUS RUN
${'─'.repeat(60)}`;

    if (improvements.length > 0) {
      output += '\n\n✅ **Improvements:**';
      improvements.forEach(imp => output += `\n  • ${imp}`);
    }

    if (regressions.length > 0) {
      output += '\n\n⚠️  **Regressions:**';
      regressions.forEach(reg => output += `\n  • ${reg}`);
    }

    return output;
  }

  /**
   * Generate actionable next steps
   */
  generateActionItems(current) {
    const actions = this.generateActions(current);

    if (actions.length === 0) {
      return '✅ **No actions needed** - System performing optimally';
    }

    let output = `
🎯 RECOMMENDED ACTIONS (Priority Order)
${'─'.repeat(60)}`;

    actions.forEach((action, i) => {
      const emoji = action.priority === 'CRITICAL' ? '🔴' :
                    action.priority === 'HIGH' ? '🟡' : '🔵';
      output += `\n\n${i + 1}. ${emoji} **${action.title}**`;
      output += `\n   Impact: ${action.impact}`;
      output += `\n   Effort: ${action.effort}`;

      if (action.command) {
        output += `\n   Command: \`${action.command}\``;
      }

      if (action.file) {
        output += `\n   File: ${action.file}`;
      }
    });

    return output;
  }

  /**
   * Helper: Get delta indicator
   */
  getDelta(current, previous) {
    if (!previous) return '';
    const delta = current - previous;
    if (Math.abs(delta) < 0.1) return ' →';
    if (delta > 0) return ` ↗ (+${delta.toFixed(2)}%)`;
    return ` ↘ (${delta.toFixed(2)}%)`;
  }

  /**
   * Helper: Count total failures
   */
  countTotalFailures(results) {
    const cm = results.metrics.confusionMatrix;
    return cm.falseNegatives + cm.falsePositives;
  }

  /**
   * Helper: Count critical failures (false negatives only)
   */
  countCriticalFailures(results) {
    return results.metrics.confusionMatrix.falseNegatives;
  }

  /**
   * Extract failures from results
   */
  extractFailures(results) {
    const byType = results.metrics.byPHIType || {};
    const failures = [];

    Object.entries(byType).forEach(([type, data]) => {
      if (data.fn > 0) {
        failures.push({
          type,
          count: data.fn,
          total: data.total,
          rate: ((data.total - data.fn) / data.total) * 100,
          samples: data.samples || []
        });
      }
    });

    return failures;
  }

  /**
   * Prioritize failures by impact
   */
  prioritizeFailures(failures) {
    return failures
      .map(f => ({
        ...f,
        priority: f.count > 10 ? 'CRITICAL' : f.count > 5 ? 'HIGH' : 'MEDIUM',
        suggestion: this.getSuggestion(f.type, f.count)
      }))
      .sort((a, b) => {
        // Sort by count (more failures = higher priority)
        return b.count - a.count;
      });
  }

  /**
   * Get suggestion for specific failure type
   */
  getSuggestion(type, count) {
    const suggestions = {
      'NAME': 'Review SmartNameFilterSpan.ts - Add missing patterns or dictionary entries',
      'DATE': 'Check DateFilterSpan.ts - Add OCR-tolerant date patterns',
      'SSN': 'Review SSNFilterSpan.ts - Check for format variations',
      'MRN': 'Update MRNFilterSpan.ts - Add hospital-specific patterns',
      'DEA': 'Check DEAFilterSpan.ts - Validate DEA number regex'
    };

    return suggestions[type] || `Review ${type} filter patterns`;
  }

  /**
   * Generate specific actions
   */
  generateActions(results) {
    const failures = this.extractFailures(results);
    const actions = [];

    // Action 1: Fix top failing type
    if (failures.length > 0) {
      const top = failures[0];
      actions.push({
        priority: 'CRITICAL',
        title: `Fix ${top.type} detection (${top.count} failures)`,
        impact: `Will improve sensitivity by ~${((top.count / results.metrics.confusionMatrix.totalPHI) * 100).toFixed(1)}%`,
        effort: 'Medium (1-2 hours)',
        file: `src/filters/${top.type}FilterSpan.ts`,
        command: `npm run test:aggregate:200  # Re-test after fix`
      });
    }

    // Action 2: Run external validation
    if (results.metrics.sensitivity < 99) {
      actions.push({
        priority: 'HIGH',
        title: 'Run external dataset validation',
        impact: 'Find real-world patterns we\'re missing',
        effort: 'Low (2-3 minutes)',
        command: 'npm run test:parquet'
      });
    }

    // Action 3: Improve dictionary coverage
    if (failures.some(f => f.type === 'NAME')) {
      actions.push({
        priority: 'MEDIUM',
        title: 'Expand name dictionaries',
        impact: 'Catch more name variations',
        effort: 'Low (10-15 minutes)',
        file: 'src/dictionaries/first-names.txt, surnames.txt'
      });
    }

    return actions;
  }

  /**
   * Get previous run from history
   */
  getPreviousRun() {
    try {
      if (!fs.existsSync(this.historyFile)) return null;
      const history = JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
      return history.length > 0 ? history[history.length - 1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save current run to history
   */
  saveToHistory(results) {
    try {
      let history = [];
      if (fs.existsSync(this.historyFile)) {
        history = JSON.parse(fs.readFileSync(this.historyFile, 'utf-8'));
      }

      history.push({
        timestamp: new Date().toISOString(),
        metrics: results.metrics,
        documents: results.documents || 50
      });

      // Keep last 20 runs
      if (history.length > 20) {
        history = history.slice(-20);
      }

      fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      // Ignore save errors
    }
  }

  /**
   * Generate markdown format for LLMs
   */
  generateMarkdown(results) {
    return `
# Vulpes Test Results

## Summary
- **Sensitivity:** ${results.metrics.sensitivity.toFixed(2)}%
- **Documents:** ${results.documents || 50}
- **Failures:** ${results.metrics.confusionMatrix.falseNegatives}

## Top Issues
${this.extractFailures(results).slice(0, 3).map(f => `- ${f.type}: ${f.count} failures`).join('\n')}

## Recommended Actions
${this.generateActions(results).map((a, i) => `${i + 1}. ${a.title} (${a.impact})`).join('\n')}
`.trim();
  }
}

module.exports = { SmartSummary };
