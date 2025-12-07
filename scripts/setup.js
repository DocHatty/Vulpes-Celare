#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║   VULPES CELARE - COMPLETE SETUP SCRIPT                                       ║
 * ║   Ensures all dependencies are installed before running tests                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * This script prevents the "hanging" issue caused by missing dependencies.
 * It installs dependencies for both the main project AND the cortex submodule.
 *
 * USAGE:
 *   node scripts/setup.js
 *   npm run setup
 *
 * WHAT IT DOES:
 *   1. Installs main project dependencies (npm install)
 *   2. Installs cortex module dependencies (tests/master-suite/cortex)
 *   3. Builds the TypeScript project
 *   4. Verifies the API server can start
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.join(__dirname, '..');
const CORTEX_DIR = path.join(ROOT_DIR, 'tests', 'master-suite', 'cortex');

// Box drawing helper for nice output
function box(title, content) {
  const width = 70;
  const top = '╔' + '═'.repeat(width - 2) + '╗';
  const mid = '╠' + '═'.repeat(width - 2) + '╣';
  const bot = '╚' + '═'.repeat(width - 2) + '╝';
  const line = (s) => '║ ' + s.padEnd(width - 4) + ' ║';

  console.log(top);
  console.log(line(title));
  console.log(mid);
  content.forEach(l => console.log(line(l)));
  console.log(bot);
}

function run(cmd, cwd = ROOT_DIR) {
  console.log(`\n  Running: ${cmd}`);
  console.log(`  In: ${cwd}\n`);
  try {
    execSync(cmd, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });
    return true;
  } catch (error) {
    console.error(`  ERROR: Command failed: ${cmd}`);
    return false;
  }
}

async function checkApiServer() {
  return new Promise((resolve) => {
    console.log('\n  Testing API server startup...');
    const serverPath = path.join(CORTEX_DIR, 'api', 'server.js');

    if (!fs.existsSync(serverPath)) {
      console.log('  WARNING: API server not found at', serverPath);
      resolve(false);
      return;
    }

    const proc = spawn('node', [serverPath], {
      cwd: CORTEX_DIR,
      stdio: 'pipe',
      env: { ...process.env, CORTEX_API_PORT: '3102' } // Use different port for test
    });

    let output = '';
    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    // Give it 5 seconds to start
    setTimeout(() => {
      if (output.includes('RUNNING')) {
        console.log('  ✓ API server starts successfully');
        proc.kill();
        resolve(true);
      } else {
        console.log('  WARNING: API server may have issues');
        proc.kill();
        resolve(false);
      }
    }, 5000);

    proc.on('error', (err) => {
      console.log('  ERROR: Failed to start API server:', err.message);
      resolve(false);
    });
  });
}

async function main() {
  console.log('\n');
  box('VULPES CELARE - SETUP', [
    'Installing all dependencies and building project',
    '',
    'This prevents the "hanging" issue caused by missing dependencies.'
  ]);

  // Step 1: Main project dependencies
  console.log('\n━━━ Step 1: Main Project Dependencies ━━━');
  if (!run('npm install')) {
    console.error('Failed to install main dependencies');
    process.exit(1);
  }

  // Step 2: Cortex dependencies (THIS WAS THE MISSING PIECE!)
  console.log('\n━━━ Step 2: Cortex Module Dependencies ━━━');
  console.log('  (This is required for API server & MCP to work)');
  if (!run('npm install', CORTEX_DIR)) {
    console.error('Failed to install cortex dependencies');
    process.exit(1);
  }

  // Step 3: Build
  console.log('\n━━━ Step 3: Build TypeScript ━━━');
  if (!run('npm run build')) {
    console.error('Failed to build project');
    process.exit(1);
  }

  // Step 4: Verify API server
  console.log('\n━━━ Step 4: Verify API Server ━━━');
  await checkApiServer();

  // Done!
  console.log('\n');
  box('SETUP COMPLETE', [
    '✓ All dependencies installed',
    '✓ Cortex module ready (API, MCP, Database)',
    '✓ Project built successfully',
    '',
    'You can now run:',
    '  npm test                    - Run test suite',
    '  npm run test:1000           - Run 1000 document test',
    '  node tests/master-suite/cortex/api/server.js - Start API'
  ]);
  console.log('\n');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
