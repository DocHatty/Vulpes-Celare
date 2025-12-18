/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║     ██╗   ██╗██╗   ██╗██╗     ██████╗ ███████╗███████╗                        ║
 * ║     ██║   ██║██║   ██║██║     ██╔══██╗██╔════╝██╔════╝                        ║
 * ║     ██║   ██║██║   ██║██║     ██████╔╝█████╗  ███████╗                        ║
 * ║     ╚██╗ ██╔╝██║   ██║██║     ██╔═══╝ ██╔══╝  ╚════██║                        ║
 * ║      ╚████╔╝ ╚██████╔╝███████╗██║     ███████╗███████║                        ║
 * ║       ╚═══╝   ╚═════╝ ╚══════╝╚═╝     ╚══════╝╚══════╝                        ║
 * ║                                                                               ║
 * ║      ██████╗ ██████╗ ██████╗ ████████╗███████╗██╗  ██╗                        ║
 * ║     ██╔════╝██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝╚██╗██╔╝                        ║
 * ║     ██║     ██║   ██║██████╔╝   ██║   █████╗   ╚███╔╝                         ║
 * ║     ██║     ██║   ██║██╔══██╗   ██║   ██╔══╝   ██╔██╗                         ║
 * ║     ╚██████╗╚██████╔╝██║  ██║   ██║   ███████╗██╔╝ ██╗                        ║
 * ║      ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝                        ║
 * ║                                                                               ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   MCP RESPONSE PROTOCOL                                                       ║
 * ║   Reaffirmational Instruction & Standardized Response Envelopes               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module defines the standard protocol for all MCP tool responses.
 * Every response is wrapped in a "ResponseEnvelope" that provides:
 * 
 * 1. The Result (Data)
 * 2. Reaffirmational Instruction (What you should understand)
 * 3. Next Steps (What you must do next)
 * 4. Mandatory Constraints (What you must NOT do)
 * 5. Session State (Sync verification)
 */

const crypto = require('crypto');

// ============================================================================
// PROTOCOL DEFINITIONS
// ============================================================================

class ResponseEnvelope {
    /**
     * Create a standardized response envelope
     * @param {Object} data - The actual tool result data
     * @param {Object} context - Context for generating the envelope
     * @param {string} context.toolName - Name of the tool executed
     * @param {Object} context.sessionState - Current session state object
     * @param {Object} context.modules - Access to Cortex modules
     * @param {Object} context.workflow - Workflow guard information
     */
    constructor(data, context = {}) {
        this.result = data;
        this.context = context;
        this.timestamp = new Date().toISOString();

        // Generate the reaffirmation section
        this.reaffirmation = this.generateReaffirmation();
    }

    /**
     * Generate the reaffirmational instruction section
     */
    generateReaffirmation() {
        const { toolName, sessionState, modules, workflow } = this.context;

        return {
            // 1. UNDERSTOOD: What the LLM should now effectively "know"
            understood: this.generateUnderstoodPoints(),

            // 2. NEXT STEPS: Explicit prioritized next actions
            nextSteps: this.generateNextSteps(),

            // 3. MANDATORY BEFORE: Workflow constraints for next actions
            mandatoryBefore: this.generateMandatoryConstraints(),

            // 4. STATE: Current system snapshot
            state: this.generateStateSnapshot(),

            // 5. SYNC: Context hash for verification
            contextHash: sessionState ? sessionState.contextHash : null
        };
    }

    generateUnderstoodPoints() {
        const { toolName, modules, result } = this.context;
        const points = [];

        // General understanding based on tool type
        if (toolName === 'run_tests') {
            const sensitivity = result?.metrics?.sensitivity || 0;
            points.push(`Current sensitivity is verified at ${sensitivity}%`);

            if (result?.topFailure) {
                points.push(`Top failure category is ${result.topFailure.type} (${result.topFailure.count} failures)`);
                points.push(`Primary issue identified in file: ${result.topFailure.fileToEdit || 'Unknown'}`);
            }
        }

        if (toolName === 'consult_history') {
            points.push(`Historical data has been retrieved for this context`);
            if (result?.relatedFailures?.length > 0) {
                points.push(`${result.relatedFailures.length} previous failed attempts found - avoid these approaches`);
            }
        }

        // Add module-specific understanding
        if (modules?.patternRecognizer) {
            const stats = modules.patternRecognizer.getStats();
            points.push(`${stats.totalFailurePatterns || 0} active failure patterns tracked in database`);
        }

        return points;
    }

    generateNextSteps() {
        const { toolName, result } = this.context;
        const steps = [];

        if (toolName === 'run_tests') {
            if (result?.action) steps.push(result.action);
            steps.push("Consult history before applying fix");
            steps.push("Record intervention after fixing");
        }

        if (toolName === 'consult_history') {
            steps.push("Formulate hypothesis based on history");
            steps.push("Record intervention plan");
        }

        if (toolName === 'record_intervention') {
            steps.push("Apply code changes");
            steps.push("Run tests to verify improvement");
        }

        return steps;
    }

    generateMandatoryConstraints() {
        // These are global constraints that always apply
        return {
            "record_intervention": ["consult_history"],
            "rollback": ["create_backup"],
            "create_experiment": ["consult_history"]
        };
    }

    generateStateSnapshot() {
        const { modules, sessionState } = this.context;

        return {
            sessionId: sessionState?.sessionId || 'no-session',
            timestamp: this.timestamp,
            // Add key metrics if available
            metrics: modules?.temporalIndex?.getLatestMetrics() || null
        };
    }

    /**
     * Convert to standard JSON response
     */
    toJSON() {
        return {
            result: this.result,
            reaffirmation: this.reaffirmation
        };
    }
}

// ============================================================================
// CONTEXT HASHING
// ============================================================================

/**
 * Generate a hash of the current context state to verify sync
 */
function generateContextHash(state) {
    const content = JSON.stringify({
        ops: state.operations.length,
        lastOp: state.operations[state.operations.length - 1] || null,
        data: state.dataShared.length
    });

    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    ResponseEnvelope,
    generateContextHash
};
