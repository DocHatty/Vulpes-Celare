#!/usr/bin/env node
/**
 * Setup Vulpes MCP for Codex/Claude Code
 * Creates the config files in the right locations
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const serverPath = path
  .join(__dirname, "..", "dist", "mcp", "server.js")
  .replace(/\\/g, "/");

// Codex config
const codexConfig = `# Vulpes Celare MCP Server
[mcp_servers.vulpes]
command = "node"
args = ["${serverPath}"]
startup_timeout_sec = 120
tool_timeout_sec = 60
`;

// Claude Code config (settings.json format)
const claudeConfig = {
  mcpServers: {
    vulpes: {
      command: "node",
      args: [serverPath],
    },
  },
};

// Create Codex config
const codexDir = path.join(os.homedir(), ".codex");
if (!fs.existsSync(codexDir)) {
  fs.mkdirSync(codexDir, { recursive: true });
}
const codexConfigPath = path.join(codexDir, "config.toml");
// Preserve non-vulpes sections, overwrite vulpes config
let existingCodex = "";
if (fs.existsSync(codexConfigPath)) {
  existingCodex = fs.readFileSync(codexConfigPath, "utf8");
  // Remove old vulpes config
  existingCodex = existingCodex
    .replace(/\[mcp_servers\.vulpes\][\s\S]*?(?=\n\[|$)/g, "")
    .trim();
}
const finalConfig = existingCodex
  ? existingCodex + "\n\n" + codexConfig
  : codexConfig;
fs.writeFileSync(codexConfigPath, finalConfig);
console.log("Codex: Updated", codexConfigPath);

// Create Claude Code config
const claudeDir = path.join(process.cwd(), ".claude");
if (!fs.existsSync(claudeDir)) {
  fs.mkdirSync(claudeDir, { recursive: true });
}
const claudeSettingsPath = path.join(claudeDir, "settings.json");
let claudeSettings = {};
if (fs.existsSync(claudeSettingsPath)) {
  try {
    claudeSettings = JSON.parse(fs.readFileSync(claudeSettingsPath, "utf8"));
  } catch (e) {}
}
claudeSettings.mcpServers = claudeSettings.mcpServers || {};
claudeSettings.mcpServers.vulpes = claudeConfig.mcpServers.vulpes;
fs.writeFileSync(claudeSettingsPath, JSON.stringify(claudeSettings, null, 2));
console.log("Claude Code: Updated", claudeSettingsPath);

console.log("\nMCP server path:", serverPath);
console.log(
  '\nTest with: echo \'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}\' | node "' +
    serverPath +
    '"',
);
