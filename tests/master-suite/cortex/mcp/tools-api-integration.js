// ============================================================================
// ASYNC TEST EXECUTION VIA API SERVER
// This replaces the synchronous executeTestSuite function
// ============================================================================

const http = require('http');
// Import shared result processing from core
const { ResultProcessor } = require('../core/result-processor');
// Import API auto-start for automatic server management
const { ensureApiRunning, checkApiHealth, API_PORT } = require('../core/api-autostart');

const API_BASE_URL = `http://localhost:${API_PORT}`;
const API_POLL_INTERVAL = 2000; // Poll every 2 seconds
const API_MAX_WAIT_TIME = 300000; // 5 minutes max

/**
 * Execute tests asynchronously via the API server
 * This queues the test and polls for completion
 * 
 * IMPORTANT: This function automatically starts the API server if not running!
 */
async function runTestsViaAPI(args, modules) {
  const {
    profile = "HIPAA_STRICT",
    documentCount = 200,
    quick = false,
    focusPhiType = null,
  } = args || {};

  const count = quick ? 50 : documentCount;

  console.error(`[Cortex MCP] Preparing test: ${count} docs, profile=${profile}`);

  try {
    // Step 1: ENSURE API is running (auto-starts if needed!)
    console.error(`[Cortex MCP] Checking API server...`);
    const apiStatus = await ensureApiRunning();
    
    if (!apiStatus.success) {
      return {
        success: false,
        error: `Failed to start API server: ${apiStatus.message}`,
        action: "Check the cortex/api/server.js file and logs for errors",
        details: apiStatus
      };
    }

    if (!apiStatus.wasAlreadyRunning) {
      console.error(`[Cortex MCP] ✓ API server started automatically`);
    } else {
      console.error(`[Cortex MCP] ✓ API server already running`);
    }

    // Step 2: Queue the test
    console.error(`[Cortex MCP] Queueing test...`);
    const queueResult = await queueTest({ profile, documentCount: count, quick });
    
    if (!queueResult.success) {
      return {
        success: false,
        error: `Failed to queue test: ${queueResult.error}`,
        action: "Check API server logs for details"
      };
    }

    const testId = queueResult.testId;
    console.error(`[Cortex MCP] Test queued with ID: ${testId}`);
    console.error(`[Cortex MCP] Waiting for test to complete (polling every ${API_POLL_INTERVAL/1000}s)...`);

    // Step 3: Poll for completion
    const result = await pollForTestCompletion(testId);

    if (!result.success) {
      return result;
    }

    console.error(`[Cortex MCP] Test complete. Processing results...`);

    // Step 4: Process and enrich results
    // Use shared ResultProcessor from core
    const processor = new ResultProcessor(modules);
    return await processor.processTestResults(result.test.result, { focusPhiType, testId: result.test.id }, modules);

  } catch (error) {
    console.error(`[Cortex MCP] Error running tests via API: ${error.message}`);
    return {
      success: false,
      error: `API communication error: ${error.message}`,
      action: "Check if API server is running and accessible",
      stack: error.stack
    };
  }
}

/**
 * Queue a test via API
 */
function queueTest(config) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(config);
    
    const options = {
      hostname: 'localhost',
      port: API_PORT,
      path: '/api/tests/run',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Queue request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Poll for test completion
 */
async function pollForTestCompletion(testId) {
  const startTime = Date.now();
  let lastProgress = -1;

  while (true) {
    // Check timeout
    if (Date.now() - startTime > API_MAX_WAIT_TIME) {
      return {
        success: false,
        error: `Test timeout after ${API_MAX_WAIT_TIME/1000} seconds`,
        action: `Test may still be running. Check /api/tests/${testId} manually`
      };
    }

    // Get test status
    const status = await getTestStatus(testId);
    
    if (!status) {
      return {
        success: false,
        error: `Failed to get status for test ${testId}`,
        action: "Check API server logs"
      };
    }

    // Log progress updates
    if (status.progress !== lastProgress && status.progress) {
      console.error(`[Cortex MCP] Progress: ${status.progress}%`);
      lastProgress = status.progress;
    }

    // Check completion
    if (status.status === 'completed') {
      return { success: true, test: status };
    }

    if (status.status === 'failed') {
      return {
        success: false,
        error: status.error || 'Test failed',
        action: "Review test output in API server logs"
      };
    }

    // Wait before next poll
    await sleep(API_POLL_INTERVAL);
  }
}

/**
 * Get test status from API
 */
function getTestStatus(testId) {
  return new Promise((resolve) => {
    http.get(`${API_BASE_URL}/api/tests/${testId}`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.success ? response.test : null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  runTestsViaAPI,
};
