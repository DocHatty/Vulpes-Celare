/**
 * MCP Server Diagnostic Tool
 * Run this to identify why the MCP server isn't connecting properly
 * 
 * Usage: node diagnose-mcp.js
 */

const path = require('path');
const fs = require('fs');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VULPES CORTEX - MCP DIAGNOSTIC TOOL');
console.log('═══════════════════════════════════════════════════════════════\n');

// Track all issues found
const issues = [];
const warnings = [];

// 1. Check Node version
console.log('1. Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
console.log(`   Node.js: ${nodeVersion}`);
if (majorVersion < 18) {
    issues.push(`Node.js version ${nodeVersion} is too old. Requires Node 18+`);
} else {
    console.log('   ✓ Node version OK\n');
}

// 2. Check working directory
console.log('2. Checking working directory...');
console.log(`   CWD: ${process.cwd()}`);
console.log(`   Script: ${__filename}\n`);

// 3. Check for stale status file
console.log('3. Checking for stale status file...');
const statusFile = path.join(__dirname, 'storage', '.cortex-status.json');
if (fs.existsSync(statusFile)) {
    try {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
        console.log(`   Found status file: PID ${status.pid}, Port ${status.port}`);
        console.log(`   Started: ${status.startedAt}`);
        
        // Check if this process is actually running
        const isRunning = checkPid(status.pid);
        if (!isRunning) {
            warnings.push(`Stale status file found (PID ${status.pid} not running). Will clean up.`);
            console.log(`   ⚠ Process ${status.pid} is NOT running - cleaning up stale file`);
            fs.unlinkSync(statusFile);
            console.log('   ✓ Cleaned up stale status file\n');
        } else {
            console.log(`   Process ${status.pid} IS running\n`);
        }
    } catch (e) {
        console.log(`   Error reading status file: ${e.message}\n`);
    }
} else {
    console.log('   No status file found (OK for stdio mode)\n');
}

// 4. Check SQLite native module
console.log('4. Checking better-sqlite3 native module...');
try {
    const Database = require('better-sqlite3');
    const testDbPath = path.join(__dirname, 'storage', 'test-diagnostic.db');
    
    // Try to create a test database
    const db = new Database(testDbPath);
    db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)');
    db.exec('INSERT INTO test (id) VALUES (1)');
    const result = db.prepare('SELECT * FROM test').all();
    db.close();
    
    // Clean up test db
    fs.unlinkSync(testDbPath);
    
    console.log('   ✓ better-sqlite3 works correctly\n');
} catch (e) {
    issues.push(`better-sqlite3 native module error: ${e.message}`);
    console.log(`   ✗ better-sqlite3 FAILED: ${e.message}`);
    console.log('   → Try running: npm rebuild better-sqlite3\n');
}

// 5. Check MCP SDK
console.log('5. Checking MCP SDK...');
try {
    const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
    const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
    console.log('   ✓ MCP SDK loaded correctly\n');
} catch (e) {
    issues.push(`MCP SDK error: ${e.message}`);
    console.log(`   ✗ MCP SDK FAILED: ${e.message}`);
    console.log('   → Try running: npm install\n');
}

// 6. Check core modules load
console.log('6. Checking Cortex core modules...');
const coreModules = [
    './core/config',
    './core/knowledge-base',
    './core/metrics-engine',
    './db/database',
];

for (const mod of coreModules) {
    try {
        require(mod);
        console.log(`   ✓ ${mod}`);
    } catch (e) {
        issues.push(`Module ${mod} failed: ${e.message}`);
        console.log(`   ✗ ${mod}: ${e.message}`);
    }
}
console.log('');

// 7. Check if RigorousAssessment loads (needed for run_tests)
console.log('7. Checking RigorousAssessment module...');
try {
    const assessmentPath = path.join(__dirname, '..', 'assessment', 'assessment.js');
    if (fs.existsSync(assessmentPath)) {
        const { RigorousAssessment } = require(assessmentPath);
        console.log('   ✓ RigorousAssessment loads correctly\n');
    } else {
        warnings.push('RigorousAssessment not found at expected path');
        console.log(`   ⚠ Not found at: ${assessmentPath}\n`);
    }
} catch (e) {
    issues.push(`RigorousAssessment error: ${e.message}`);
    console.log(`   ✗ RigorousAssessment FAILED: ${e.message}\n`);
}

// 8. Check VulpesCelare engine is built
console.log('8. Checking VulpesCelare engine build...');
const enginePath = path.join(__dirname, '..', '..', '..', 'dist', 'VulpesCelare.js');
if (fs.existsSync(enginePath)) {
    console.log('   ✓ dist/VulpesCelare.js exists\n');
} else {
    issues.push('VulpesCelare engine not built - dist/VulpesCelare.js missing');
    console.log(`   ✗ Not found: ${enginePath}`);
    console.log('   → Run: npm run build (from project root)\n');
}

// 9. Test stdio simulation
console.log('9. Testing stdio protocol simulation...');
try {
    // Simple test: can we JSON-RPC format correctly?
    const testRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {}
    };
    const serialized = JSON.stringify(testRequest);
    const parsed = JSON.parse(serialized);
    
    if (parsed.jsonrpc === '2.0') {
        console.log('   ✓ JSON-RPC serialization OK\n');
    }
} catch (e) {
    issues.push(`JSON-RPC test failed: ${e.message}`);
}

// 10. Full server startup test
console.log('10. Testing full MCP server initialization...');
try {
    // Import but don't start the server
    const { VulpesCortexServer } = require('./mcp/server');
    const server = new VulpesCortexServer();
    
    console.log('    Testing module initialization (this may take a moment)...');
    
    // Use a promise with timeout
    const initPromise = server.initialize();
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initialization timed out after 30s')), 30000)
    );
    
    Promise.race([initPromise, timeoutPromise])
        .then(() => {
            console.log('    ✓ Server initialization successful');
            console.log(`    Modules loaded: ${Object.keys(server.modules).length}`);
            finishDiagnostic();
        })
        .catch(e => {
            issues.push(`Server initialization failed: ${e.message}`);
            console.log(`    ✗ Server initialization FAILED: ${e.message}`);
            finishDiagnostic();
        });
} catch (e) {
    issues.push(`Server import failed: ${e.message}`);
    console.log(`   ✗ Could not import server: ${e.message}`);
    finishDiagnostic();
}

function finishDiagnostic() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  DIAGNOSTIC SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (warnings.length > 0) {
        console.log('WARNINGS:');
        warnings.forEach((w, i) => console.log(`  ${i + 1}. ⚠ ${w}`));
        console.log('');
    }
    
    if (issues.length === 0) {
        console.log('✓ ALL CHECKS PASSED\n');
        console.log('The MCP server components are healthy.');
        console.log('If tools still fail, the issue may be:\n');
        console.log('  1. Claude Desktop needs restart after config changes');
        console.log('  2. The MCP client may have a timeout issue');
        console.log('  3. A specific tool is failing (check run_tests specifically)\n');
        console.log('NEXT STEPS:');
        console.log('  1. Restart Claude Desktop completely');
        console.log('  2. Try the diagnose tool from Claude: vulpes-cortex:diagnose');
        console.log('  3. Check %APPDATA%\\Claude\\logs for MCP errors\n');
    } else {
        console.log(`✗ FOUND ${issues.length} ISSUE(S):\n`);
        issues.forEach((issue, i) => {
            console.log(`  ${i + 1}. ${issue}`);
        });
        console.log('\nRECOMMENDED FIXES:');
        
        if (issues.some(i => i.includes('better-sqlite3'))) {
            console.log('  • Run: cd tests/master-suite/cortex && npm rebuild better-sqlite3');
        }
        if (issues.some(i => i.includes('MCP SDK'))) {
            console.log('  • Run: cd tests/master-suite/cortex && npm install');
        }
        if (issues.some(i => i.includes('VulpesCelare'))) {
            console.log('  • Run: npm run build (from project root)');
        }
        if (issues.some(i => i.includes('timed out'))) {
            console.log('  • Check for blocking operations in module initialization');
            console.log('  • Try running with VULPES_DEBUG=1 for verbose logging');
        }
        console.log('');
    }
}

// Helper to check if a PID is running
function checkPid(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return false;
    }
}
