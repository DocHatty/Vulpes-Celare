/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   API AUTO-STARTER                                                            ║
 * ║   Ensures API server is running before test execution                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * This module:
 * 1. Checks if API server is running
 * 2. If not, starts it automatically as a detached child process
 * 3. Waits for it to be ready
 * 4. Returns control to caller
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const API_PORT = 3101;
const API_STARTUP_TIMEOUT = 30000; // 30 seconds
const API_HEALTH_CHECK_INTERVAL = 500; // Check every 500ms

let apiServerProcess = null;

/**
 * Ensure API server is running, start it if needed
 */
async function ensureAPIServerRunning() {
  // Check if already running
  if (await isAPIServerRunning()) {
    console.error('[API Auto-Start] API server is already running');
    return { success: true, alreadyRunning: true };
  }

  console.error('[API Auto-Start] API server not detected, starting automatically...');

  try {
    await startAPIServer();
    await waitForAPIReady();
    console.error('[API Auto-Start] ✓ API server started successfully');
    return { success: true, started: true };
  } catch (error) {
    console.error(`[API Auto-Start] ✗ Failed to start API server: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      manual: 'Please start API server manually: node api/server.js'
    };
  }
}

/**
 * Check if API server is running
 */
function isAPIServerRunning() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: API_PORT,
      path: '/health',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Start the API server as a detached background process
 */
function startAPIServer() {
  return new Promise((resolve, reject) => {
    const apiPath = path.join(__dirname, '..', 'api', 'server.js');
    
    // Check if API server file exists
    if (!fs.existsSync(apiPath)) {
      return reject(new Error(`API server not found at: ${apiPath}`));
    }

    // Spawn detached process
    apiServerProcess = spawn('node', [apiPath], {
      detached: true,
      stdio: 'ignore', // Don't pipe output to parent
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        CORTEX_API_PORT: API_PORT.toString(),
        NODE_ENV: 'production'
      }
    });

    // Detach the process so it continues after parent exits
    apiServerProcess.unref();

    // Give it a moment to start
    setTimeout(() => resolve(), 1000);

    apiServerProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn API server: ${err.message}`));
    });
  });
}

/**
 * Wait for API server to be ready
 */
async function waitForAPIReady() {
  const startTime = Date.now();
  
  while (Date.now() - startTime < API_STARTUP_TIMEOUT) {
    if (await isAPIServerRunning()) {
      return true;
    }
    
    await sleep(API_HEALTH_CHECK_INTERVAL);
  }

  throw new Error(`API server did not become ready within ${API_STARTUP_TIMEOUT/1000} seconds`);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get API server status
 */
async function getAPIServerStatus() {
  const running = await isAPIServerRunning();
  
  if (!running) {
    return {
      running: false,
      message: 'API server is not running'
    };
  }

  // Get health info
  return new Promise((resolve) => {
    http.get(`http://localhost:${API_PORT}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          resolve({
            running: true,
            health,
            port: API_PORT
          });
        } catch (e) {
          resolve({
            running: true,
            error: 'Health check returned invalid JSON',
            port: API_PORT
          });
        }
      });
    }).on('error', () => {
      resolve({
        running: false,
        message: 'Failed to get health status'
      });
    });
  });
}

module.exports = {
  ensureAPIServerRunning,
  isAPIServerRunning,
  getAPIServerStatus,
  API_PORT
};
