/**
 * Validation Script for MCP Layer Audit
 * Verifies:
 * 1. Reaffirmational Response Protocol (Envelopes)
 * 2. Workflow Guards (Contracts)
 * 3. Session State Management
 */

const { executeTool } = require('./mcp/tools');
const { handshakeManager } = require('./mcp/handshake');
const assert = require('assert');

// Mock modules for testing
const mockModules = {
    temporalIndex: { getLatestMetrics: () => ({ sensitivity: 99.5 }) },
    patternRecognizer: { getStats: () => ({ totalFailurePatterns: 15 }) },
    historyConsultant: {
        consult: async () => ({ relatedFailures: [], suggestedApproach: "Fix filter" })
    },
    interventionTracker: {
        recordIntervention: async () => ({ id: "int-123" })
    }
};

async function runValidation() {
    console.log("🦊 STARTING MCP LAYER VALIDATION\n");

    // TEST 1: Workflow Guard - Block operation without prerequisite
    console.log("TEST 1: Testing Workflow Guard (Blocking)...");

    // Try to record intervention WITHOUT consulting history
    // Note: Since we are running in a fresh process, history is empty
    const blockedResponse = await executeTool(
        'record_intervention',
        { type: 'FILTER_MODIFICATION', description: 'Test' },
        mockModules
    );

    console.log("Response:", JSON.stringify(blockedResponse, null, 2));

    try {
        assert.strictEqual(blockedResponse.result.success, false);
        assert.ok(blockedResponse.result.error.includes("MUST consult history"));
        console.log("✅ PASSED: Operation blocked as expected\n");
    } catch (e) {
        console.error("❌ FAILED: Operation was not blocked correctly", e);
        process.exit(1);
    }

    // TEST 2: Reaffirmational Response & Session State
    console.log("TEST 2: Testing Reaffirmational Response...");

    // Fulfill the prerequisite
    const historyResponse = await executeTool(
        'consult_history',
        { query: "How to fix NAME filter" },
        mockModules
    );

    console.log("History Response:", JSON.stringify(historyResponse.reaffirmation, null, 2));

    try {
        assert.ok(historyResponse.reaffirmation.understood);
        assert.ok(historyResponse.reaffirmation.nextSteps);
        assert.ok(historyResponse.reaffirmation.state.sessionId);
        console.log("✅ PASSED: Response envelope contains reaffirmation data\n");
    } catch (e) {
        console.error("❌ FAILED: Response envelope malformed", e);
        process.exit(1);
    }

    // TEST 3: Workflow Guard - Allow operation after prerequisite
    console.log("TEST 3: Testing Workflow Guard (Allowing)...");

    // Try again - should succeed now
    const allowedResponse = await executeTool(
        'record_intervention',
        { type: 'FILTER_MODIFICATION', description: 'Test' },
        mockModules
    );

    try {
        // Note: The actual tool execution might fail because we're mocking, 
        // but the workflow guard should pass, so we shouldn't get the "MUST consult history" error.
        if (allowedResponse.result && allowedResponse.result.error && allowedResponse.result.error.includes("MUST consult history")) {
            throw new Error("Still blocked by workflow guard!");
        }

        // Check if reaffirmation is present
        assert.ok(allowedResponse.reaffirmation);
        console.log("✅ PASSED: Operation allowed after prerequisite met\n");
    } catch (e) {
        console.error("❌ FAILED: Operation blocked or failed unexpectedly", e);
        process.exit(1);
    }

    console.log("🎉 ALL TESTS PASSED: System Audit Implementation Verified");
}

runValidation().catch(console.error);
