// Fix the ~/.codex/config.toml to use Cortex server
const fs = require('fs');
const path = require('path');
const os = require('os');

const codexDir = path.join(os.homedir(), '.codex');
const configPath = path.join(codexDir, 'config.toml');
const projectDir = process.cwd();

// Read existing config
let config = '';
if (fs.existsSync(configPath)) {
    config = fs.readFileSync(configPath, 'utf-8');
}

// Remove any existing vulpes MCP config (might be broken)
const lines = config.split('\n');
let newLines = [];
let inVulpesSection = false;

for (const line of lines) {
    if (line.includes('[mcp_servers.vulpes]')) {
        inVulpesSection = true;
        continue;
    }
    if (inVulpesSection && (line.startsWith('[') || line.trim() === '')) {
        if (line.startsWith('[') && !line.includes('mcp_servers.vulpes')) {
            inVulpesSection = false;
            newLines.push(line);
        }
        continue;
    }
    if (!inVulpesSection) {
        newLines.push(line);
    }
}

config = newLines.join('\n').trim();

// Add new Cortex MCP config
const vulpesConfig = `

# ============================================================================
# VULPES CELARE MCP SERVER (CORTEX)
# ============================================================================
# Provides HIPAA-compliant PHI redaction + learning/analysis tools

[mcp_servers.vulpes]
command = "node"
args = ["${path.join(projectDir, 'tests', 'master-suite', 'cortex', 'mcp', 'server.js').replace(/\\/g, '/')}", "--daemon"]
cwd = "${projectDir.replace(/\\/g, '/')}"
env = { VULPES_MODE = "dev", VULPES_PROJECT_DIR = "${projectDir.replace(/\\/g, '/')}" }
startup_timeout_sec = 30
tool_timeout_sec = 120
`;

config += vulpesConfig;
fs.writeFileSync(configPath, config);
console.log('Updated Codex config:', configPath);
console.log('MCP server now points to Cortex at:', path.join(projectDir, 'tests', 'master-suite', 'cortex', 'mcp', 'server.js'));
