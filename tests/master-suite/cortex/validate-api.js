/**
 * Quick validation test for Cortex API Integration
 */
const http = require('http');

const tests = [
    { name: 'MCP Health', url: 'http://localhost:3100/health' },
    { name: 'REST Health', url: 'http://localhost:3101/health' },
    { name: 'Patterns', url: 'http://localhost:3101/api/patterns?limit=3' },
    { name: 'Queue Stats', url: 'http://localhost:3101/api/queue/stats' },
    { name: 'Experiments', url: 'http://localhost:3101/api/experiments' },
    { name: 'Knowledge Summary', url: 'http://localhost:3101/api/knowledge/summary' },
];

async function runTest(test) {
    return new Promise((resolve) => {
        http.get(test.url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    JSON.parse(data);
                    console.log(`✓ ${test.name}: PASS`);
                    resolve(true);
                } catch {
                    console.log(`✗ ${test.name}: FAIL (invalid JSON)`);
                    resolve(false);
                }
            });
        }).on('error', (e) => {
            console.log(`✗ ${test.name}: FAIL (${e.message})`);
            resolve(false);
        });
    });
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  VULPES CORTEX API INTEGRATION - VALIDATION              ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    let passed = 0;
    for (const test of tests) {
        if (await runTest(test)) passed++;
    }

    console.log(`\n══════════════════════════════════════════════════════════`);
    console.log(`Results: ${passed}/${tests.length} tests passed`);
    console.log(`══════════════════════════════════════════════════════════\n`);

    process.exit(passed === tests.length ? 0 : 1);
}

main();
