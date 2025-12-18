/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   API AUTO-START MODULE                                                       ║
 * ║   Ensures the Cortex REST API server is always running                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This module provides automatic API server management:
 * - Health checking
 * - Auto-spawning if not running
 * - Wait for readiness with exponential backoff
 * - Graceful shutdown handling
 *
 * USAGE:
 *   const { ensureApiRunning } = require('./core/api-autostart');
 *   await ensureApiRunning(); // Guarantees API is available
 */

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_PORT = process.env.CORTEX_API_PORT || 3101;
const API_HOST = "localhost";
const HEALTH_ENDPOINT = "/health";
const MAX_RETRIES = 10;
const INITIAL_RETRY_DELAY = 500; // ms
const MAX_RETRY_DELAY = 5000; // ms

// Track spawned process globally so we can clean up
let apiProcess = null;
let isShuttingDown = false;

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if the API server is running and healthy
 * @returns {Promise<{running: boolean, status?: object, error?: string}>}
 */
function checkApiHealth() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: API_HOST,
        port: API_PORT,
        path: HEALTH_ENDPOINT,
        timeout: 3000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const status = JSON.parse(data);
            resolve({ running: true, status });
          } catch (e) {
            resolve({ running: true, status: { raw: data } });
          }
        });
      }
    );

    req.on("error", (err) => {
      resolve({ running: false, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ running: false, error: "timeout" });
    });
  });
}

// ============================================================================
// AUTO-START
// ============================================================================

/**
 * Spawn the API server as a background process
 * @returns {Promise<boolean>} true if spawned successfully
 */
function spawnApiServer() {
  return new Promise((resolve) => {
    const serverPath = path.join(__dirname, "..", "api", "server.js");

    // Verify server file exists
    if (!fs.existsSync(serverPath)) {
      console.error(`[API AutoStart] ERROR: Server file not found: ${serverPath}`);
      resolve(false);
      return;
    }

    console.error(`[API AutoStart] Spawning API server on port ${API_PORT}...`);

    // Spawn detached so it survives parent exit
    apiProcess = spawn("node", [serverPath], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        CORTEX_API_PORT: String(API_PORT),
      },
      cwd: path.join(__dirname, ".."),
    });

    // Capture startup output for debugging
    let startupOutput = "";
    let startupError = "";

    apiProcess.stdout.on("data", (data) => {
      startupOutput += data.toString();
    });

    apiProcess.stderr.on("data", (data) => {
      const msg = data.toString();
      startupError += msg;
      // Echo important startup messages
      if (msg.includes("RUNNING") || msg.includes("ERROR") || msg.includes("PORT")) {
        console.error(`[API Server] ${msg.trim()}`);
      }
    });

    apiProcess.on("error", (err) => {
      console.error(`[API AutoStart] Failed to spawn: ${err.message}`);
      resolve(false);
    });

    apiProcess.on("exit", (code, signal) => {
      if (!isShuttingDown) {
        console.error(`[API AutoStart] Server exited unexpectedly (code: ${code}, signal: ${signal})`);
        if (startupError) {
          console.error(`[API AutoStart] Last error output: ${startupError.slice(-500)}`);
        }
      }
      apiProcess = null;
    });

    // Unref so parent can exit independently
    apiProcess.unref();

    // Give it a moment to start
    setTimeout(() => resolve(true), 1000);
  });
}

/**
 * Wait for the API server to become healthy with exponential backoff
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<boolean>} true if healthy, false if timeout
 */
async function waitForHealthy(maxRetries = MAX_RETRIES) {
  let delay = INITIAL_RETRY_DELAY;

  for (let i = 0; i < maxRetries; i++) {
    const health = await checkApiHealth();
    if (health.running) {
      console.error(`[API AutoStart] ✓ API server is healthy (attempt ${i + 1})`);
      return true;
    }

    console.error(`[API AutoStart] Waiting for API... (attempt ${i + 1}/${maxRetries})`);
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, MAX_RETRY_DELAY);
  }

  return false;
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Ensure the API server is running - the main function to call
 * This will:
 * 1. Check if API is already running
 * 2. If not, spawn it
 * 3. Wait for it to become healthy
 * 4. Return status
 *
 * @returns {Promise<{success: boolean, message: string, status?: object}>}
 */
async function ensureApiRunning() {
  // First, check if already running
  const initialHealth = await checkApiHealth();
  if (initialHealth.running) {
    console.error(`[API AutoStart] ✓ API server already running on port ${API_PORT}`);
    return {
      success: true,
      message: "API server already running",
      status: initialHealth.status,
      wasAlreadyRunning: true,
    };
  }

  console.error(`[API AutoStart] API server not running, starting it...`);

  // Spawn the server
  const spawned = await spawnApiServer();
  if (!spawned) {
    return {
      success: false,
      message: "Failed to spawn API server",
    };
  }

  // Wait for it to become healthy
  const healthy = await waitForHealthy();
  if (!healthy) {
    return {
      success: false,
      message: `API server failed to become healthy after ${MAX_RETRIES} attempts`,
    };
  }

  // Get final status
  const finalHealth = await checkApiHealth();
  return {
    success: true,
    message: "API server started successfully",
    status: finalHealth.status,
    wasAlreadyRunning: false,
  };
}

/**
 * Gracefully stop the API server if we spawned it
 */
async function stopApiServer() {
  isShuttingDown = true;
  if (apiProcess) {
    console.error("[API AutoStart] Stopping API server...");
    apiProcess.kill("SIGTERM");
    apiProcess = null;
  }
}

// ============================================================================
// CLEANUP HANDLERS
// ============================================================================

// Note: We DON'T auto-stop on exit because the API should persist
// Only stop if explicitly requested via stopApiServer()

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ensureApiRunning,
  checkApiHealth,
  stopApiServer,
  API_PORT,
  API_HOST,
};
