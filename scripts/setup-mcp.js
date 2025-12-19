#!/usr/bin/env node
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
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║   MCP SETUP - Elite Auto-Registration for LLM Clients                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This script properly registers the Vulpes MCP server with LLM clients.
 *
 * IMPORTANT: Configuration file locations per client:
 * - Claude Code: .mcp.json (project) or ~/.claude.json (global)
 *   NOT .claude/settings.json - that file is IGNORED for MCP!
 * - Codex: ~/.codex/config.toml
 * - Cursor: .cursor/mcp.json
 *
 * Usage:
 *   node scripts/setup-mcp.js              # Auto-detect and setup all
 *   node scripts/setup-mcp.js --claude     # Claude Code only
 *   node scripts/setup-mcp.js --codex      # Codex only
 *   node scripts/setup-mcp.js --cursor     # Cursor only
 *   node scripts/setup-mcp.js --global     # Global config (~/.claude.json)
 *   node scripts/setup-mcp.js --check      # Verify setup without modifying
 *   node scripts/setup-mcp.js --test       # Test MCP server starts correctly
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

// ============================================================================
// CONFIGURATION
// ============================================================================

const PROJECT_ROOT = path.resolve(__dirname, "..");
const HOME_DIR = os.homedir();

// Server paths - use Cortex for full learning capabilities
const CORTEX_SERVER = path.join(
  PROJECT_ROOT,
  "tests",
  "master-suite",
  "cortex",
  "mcp",
  "server.js"
);
const PRODUCTION_SERVER = path.join(PROJECT_ROOT, "dist", "mcp", "server.js");

// Use Cortex if available, otherwise production
const MCP_SERVER = fs.existsSync(CORTEX_SERVER)
  ? CORTEX_SERVER
  : PRODUCTION_SERVER;

// Client configuration locations
const CLIENTS = {
  claude: {
    name: "Claude Code",
    projectConfig: path.join(PROJECT_ROOT, ".mcp.json"),
    globalConfig: path.join(HOME_DIR, ".claude.json"),
    format: "json",
    mcpKey: "mcpServers",
  },
  codex: {
    name: "OpenAI Codex",
    globalConfig: path.join(HOME_DIR, ".codex", "config.toml"),
    format: "toml",
  },
  cursor: {
    name: "Cursor",
    projectConfig: path.join(PROJECT_ROOT, ".cursor", "mcp.json"),
    format: "json",
    mcpKey: "mcpServers",
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(msg, color = "") {
  console.log(`${color}${msg}${colors.reset}`);
}

function success(msg) {
  log(`  ✓ ${msg}`, colors.green);
}

function warn(msg) {
  log(`  ⚠ ${msg}`, colors.yellow);
}

function error(msg) {
  log(`  ✗ ${msg}`, colors.red);
}

function info(msg) {
  log(`  ℹ ${msg}`, colors.cyan);
}

function header(msg) {
  log(`\n${msg}`, colors.bold + colors.blue);
}

// ============================================================================
// JSON CONFIG HANDLERS
// ============================================================================

function readJsonConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    warn(`Failed to parse ${filePath}: ${e.message}`);
    return null;
  }
}

function writeJsonConfig(filePath, config) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
}

// ============================================================================
// TOML CONFIG HANDLERS (for Codex)
// ============================================================================

function readTomlConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf-8");
}

function writeTomlConfig(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
}

// ============================================================================
// MCP SERVER TEST
// ============================================================================

async function testMcpServer() {
  return new Promise((resolve) => {
    header("Testing MCP Server...");

    if (!fs.existsSync(MCP_SERVER)) {
      error(`MCP server not found: ${MCP_SERVER}`);
      resolve(false);
      return;
    }

    info(`Server path: ${MCP_SERVER}`);

    const initRequest = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "vulpes-setup-test", version: "1.0.0" },
      },
    });

    const child = spawn("node", [MCP_SERVER], {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    });

    let stdout = "";
    let stderr = "";
    let responded = false;

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      // Check for valid MCP response
      if (stdout.includes('"result"') && stdout.includes("protocolVersion")) {
        responded = true;
        child.kill();
      }
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (responded) {
        success("MCP server responds correctly to initialize");
        resolve(true);
      } else {
        error(`MCP server test failed (exit code: ${code})`);
        if (stderr) {
          info(`stderr: ${stderr.slice(0, 200)}`);
        }
        resolve(false);
      }
    });

    child.on("error", (err) => {
      error(`Failed to start MCP server: ${err.message}`);
      resolve(false);
    });

    // Send the initialize request with Content-Length framing
    const payload = `Content-Length: ${Buffer.byteLength(initRequest)}\r\n\r\n${initRequest}`;
    child.stdin.write(payload);
    child.stdin.end();

    // Timeout
    setTimeout(() => {
      if (!responded) {
        child.kill();
        error("MCP server test timed out");
        resolve(false);
      }
    }, 5000);
  });
}

// ============================================================================
// SETUP FUNCTIONS
// ============================================================================

function setupClaudeCode(global = false) {
  header(`Setting up Claude Code (${global ? "global" : "project"})...`);

  const configPath = global
    ? CLIENTS.claude.globalConfig
    : CLIENTS.claude.projectConfig;

  let config = readJsonConfig(configPath) || {};
  config.mcpServers = config.mcpServers || {};

  // Check if already configured
  if (config.mcpServers.vulpes) {
    const existingPath = config.mcpServers.vulpes.args?.[0];
    if (existingPath === MCP_SERVER) {
      info(`Already configured correctly in ${path.basename(configPath)}`);
      return true;
    }
    warn(`Updating existing vulpes config in ${path.basename(configPath)}`);
  }

  config.mcpServers.vulpes = {
    command: "node",
    args: [MCP_SERVER],
  };

  writeJsonConfig(configPath, config);
  success(`Wrote config to ${configPath}`);

  // Show the tools that will be available
  info("Available tools: run_tests, analyze_test_results, get_recommendation,");
  info("                 consult_history, create_experiment, diagnose, etc.");

  return true;
}

function setupCodex() {
  header("Setting up OpenAI Codex...");

  const configPath = CLIENTS.codex.globalConfig;
  let config = readTomlConfig(configPath);

  if (config.includes("[mcp_servers.vulpes]")) {
    info("Already configured in config.toml");
    return true;
  }

  const vulpesConfig = `
# ============================================================================
# VULPES CELARE MCP SERVER
# ============================================================================
# Provides HIPAA-compliant PHI redaction tools

[mcp_servers.vulpes]
command = "node"
args = ["${MCP_SERVER.replace(/\\/g, "/")}"]
startup_timeout_sec = 120
tool_timeout_sec = 60
`;

  config += vulpesConfig;
  writeTomlConfig(configPath, config);
  success(`Wrote config to ${configPath}`);

  return true;
}

function setupCursor() {
  header("Setting up Cursor...");

  const configPath = CLIENTS.cursor.projectConfig;
  let config = readJsonConfig(configPath) || {};
  config.mcpServers = config.mcpServers || {};

  if (config.mcpServers.vulpes) {
    info("Already configured in .cursor/mcp.json");
    return true;
  }

  config.mcpServers.vulpes = {
    command: "node",
    args: [MCP_SERVER],
  };

  writeJsonConfig(configPath, config);
  success(`Wrote config to ${configPath}`);

  return true;
}

// ============================================================================
// CHECK FUNCTION
// ============================================================================

function checkSetup() {
  header("Checking MCP Setup...");

  let allGood = true;

  // Check Claude Code project config
  const claudeProject = readJsonConfig(CLIENTS.claude.projectConfig);
  if (claudeProject?.mcpServers?.vulpes) {
    success(`Claude Code (project): .mcp.json configured`);
    info(`  Server: ${claudeProject.mcpServers.vulpes.args?.[0]}`);
  } else {
    warn("Claude Code (project): .mcp.json not configured");
    allGood = false;
  }

  // Check Claude Code global config
  const claudeGlobal = readJsonConfig(CLIENTS.claude.globalConfig);
  if (claudeGlobal?.mcpServers?.vulpes) {
    success(`Claude Code (global): ~/.claude.json configured`);
  } else {
    info("Claude Code (global): ~/.claude.json not configured (optional)");
  }

  // Check Codex
  const codexConfig = readTomlConfig(CLIENTS.codex.globalConfig);
  if (codexConfig.includes("[mcp_servers.vulpes]")) {
    success(`Codex: config.toml configured`);
  } else {
    info("Codex: config.toml not configured");
  }

  // Check Cursor
  const cursorConfig = readJsonConfig(CLIENTS.cursor.projectConfig);
  if (cursorConfig?.mcpServers?.vulpes) {
    success(`Cursor: .cursor/mcp.json configured`);
  } else {
    info("Cursor: .cursor/mcp.json not configured");
  }

  // Check MCP server exists
  if (fs.existsSync(MCP_SERVER)) {
    success(`MCP Server exists: ${path.basename(MCP_SERVER)}`);
  } else {
    error(`MCP Server not found: ${MCP_SERVER}`);
    allGood = false;
  }

  return allGood;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  log(
    `
╔═══════════════════════════════════════════════════════════════════════════════╗
║                     VULPES CELARE MCP SETUP                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Registers Vulpes Cortex MCP server with LLM clients                          ║
║  Server: ${MCP_SERVER.length > 55 ? "..." + MCP_SERVER.slice(-55) : MCP_SERVER.padEnd(58)}║
╚═══════════════════════════════════════════════════════════════════════════════╝`,
    colors.cyan
  );

  if (args.includes("--check")) {
    const ok = checkSetup();
    process.exit(ok ? 0 : 1);
  }

  if (args.includes("--test")) {
    const ok = await testMcpServer();
    process.exit(ok ? 0 : 1);
  }

  // Determine which clients to setup
  const setupAll =
    args.length === 0 ||
    args.includes("--all") ||
    !args.some((a) => ["--claude", "--codex", "--cursor", "--global"].includes(a));
  const useGlobal = args.includes("--global");

  let success_count = 0;

  if (setupAll || args.includes("--claude")) {
    if (setupClaudeCode(useGlobal)) success_count++;
  }

  if (setupAll || args.includes("--codex")) {
    if (setupCodex()) success_count++;
  }

  if (setupAll || args.includes("--cursor")) {
    if (setupCursor()) success_count++;
  }

  // Run server test
  header("Verifying MCP Server...");
  const serverOk = await testMcpServer();

  // Summary
  header("Summary");
  if (serverOk && success_count > 0) {
    success(`Setup complete! ${success_count} client(s) configured.`);
    log("");
    info("Next steps:");
    log("  1. Restart Claude Code (or your LLM client)");
    log("  2. Run /mcp in Claude Code to verify the vulpes server is connected");
    log("  3. Try using mcp__vulpes__run_tests or other Cortex tools");
    log("");
  } else {
    error("Setup incomplete. Check errors above.");
    process.exit(1);
  }
}

main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});
