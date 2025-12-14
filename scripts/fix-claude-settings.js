// Fix the .claude/settings.json file
const fs = require('fs');
const path = require('path');

const settings = {
    mcpServers: {
        vulpes: {
            command: 'node',
            args: ['tests/master-suite/cortex/mcp/server.js', '--daemon'],
            cwd: '.'
        }
    },
    hooks: {
        SessionStart: [
            {
                hooks: [
                    {
                        type: 'command',
                        command: 'node -e "console.log(JSON.stringify({additionalContext:\'[Vulpes Cortex Active] Full learning system ready.\'}))"',
                        timeout: 2
                    }
                ]
            }
        ]
    },
    allowedTools: [
        'mcp__vulpes__redact_text',
        'mcp__vulpes__analyze_redaction',
        'mcp__vulpes__run_tests',
        'mcp__vulpes__get_system_info',
        'mcp__vulpes__analyze_metrics',
        'mcp__vulpes__diagnose_failure',
        'mcp__vulpes__record_intervention',
        'mcp__vulpes__generate_hypothesis',
        'mcp__vulpes__consult_history'
    ]
};

const settingsPath = path.join(process.cwd(), '.claude', 'settings.json');
fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('Switched to Cortex server:', settingsPath);
