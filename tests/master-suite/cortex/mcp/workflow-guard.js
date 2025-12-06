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
 * ║   WORKFLOW GUARD SYSTEM                                                       ║
 * ║   Enforcing Operational Contracts & Safety Protocols                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module enforces mandatory workflow sequences to ensure safe operation.
 * It strictly prevents "doing" without "thinking" or "checking".
 */

// ============================================================================
// WORKFLOW CONTRACTS
// ============================================================================

const WORKFLOW_CONTRACTS = {
    // Before recording an intervention, MUST consult history
    // Why: Prevents repeating failed approaches
    record_intervention: {
        requires: ['consult_history'],
        lookbackMsg: 'You MUST consult history before recording an intervention to avoid repeating past mistakes.',
        strict: true
    },

    // Before rolling back, MUST have a backup
    // Why: Prevents data loss if rollback fails
    rollback: {
        requires: ['create_backup'],
        lookbackMsg: 'You MUST create a backup before attempting a rollback.',
        strict: true
    },

    // Before creating an experiment, MUST consult history
    // Why: Experiments should be novel, not repeats
    create_experiment: {
        requires: ['consult_history'],
        lookbackMsg: 'You MUST consult history before designing a new experiment.',
        strict: true
    },

    // Before making a code change decision, SHOULD analyze results
    // Why: Decisions should be data-driven
    get_recommendation: {
        requires: ['analyze_test_results', 'run_tests'],
        lookbackMsg: 'It is recommended to have fresh test results before asking for a recommendation.',
        strict: false // Warning only
    }
};

// ============================================================================
// GUARD IMPLEMENTATION
// ============================================================================

class WorkflowGuard {
    constructor(sessionState) {
        this.sessionState = sessionState;
        this.violations = [];
    }

    /**
     * Validate if a tool can be executed based on current session history
     * @param {string} toolName - Name of the tool being called
     * @returns {Object} { allowed: boolean, error: string|null, warning: string|null }
     */
    validate(toolName) {
        const contract = WORKFLOW_CONTRACTS[toolName];

        // If no contract exists, operation is allowed
        if (!contract) {
            return { allowed: true, error: null, warning: null };
        }

        // Check prerequisites
        const missingPrereqs = this.checkPrerequisites(contract.requires);

        if (missingPrereqs.length > 0) {
            const msg = `WORKFLOW VIOLATION: ${contract.lookbackMsg} Missing: ${missingPrereqs.join(', ')}`;

            if (contract.strict) {
                this.violations.push({ tool: toolName, type: 'ERROR', msg, time: new Date() });
                return {
                    allowed: false,
                    error: msg,
                    required: contract.requires
                };
            } else {
                this.violations.push({ tool: toolName, type: 'WARNING', msg, time: new Date() });
                return {
                    allowed: true,
                    warning: msg,
                    required: contract.requires
                };
            }
        }

        return { allowed: true, error: null };
    }

    /**
     * Check if required tools have been called recently in the session
     * @param {string[]} requiredTools 
     * @returns {string[]} List of missing tools
     */
    checkPrerequisites(requiredTools) {
        if (!this.sessionState || !this.sessionState.operations) {
            return requiredTools; // No history means nothing has been done
        }

        const missing = [];
        const ops = this.sessionState.operations;

        // Look back through operations (limit lookback to reasonable session window if needed)
        // For now, we check if it happened at all in the current session context
        for (const tool of requiredTools) {
            const found = ops.some(op => op.tool === tool);
            if (!found) {
                missing.push(tool);
            }
        }

        return missing;
    }

    getViolations() {
        return this.violations;
    }
}

module.exports = {
    WorkflowGuard,
    WORKFLOW_CONTRACTS
};
