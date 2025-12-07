#!/usr/bin/env node

/**
 * Unit Test Runner
 * 
 * Runs all unit tests for Vulpes Celare new features
 */

const { spawn } = require('child_process');
const path = require('path');

const tests = [
  'policy-dsl.test.js',
  'streaming-redactor.test.js',
  'trust-bundle.test.js'
];

let totalPassed = 0;
let totalFailed = 0;

async function runTest(testFile) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Starting: ${testFile}`);
    console.log(`${'='.repeat(80)}\n`);

    const testPath = path.join(__dirname, testFile);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✓ ${testFile} completed successfully\n`);
        resolve(true);
      } else {
        console.error(`\n✗ ${testFile} failed with code ${code}\n`);
        resolve(false);
      }
    });

    child.on('error', (error) => {
      console.error(`\n✗ ${testFile} error: ${error.message}\n`);
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('\n');
  console.log('╔' + '='.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'VULPES CELARE UNIT TESTS' + ' '.repeat(34) + '║');
  console.log('╚' + '='.repeat(78) + '╝');
  console.log('\n');

  const results = [];

  for (const test of tests) {
    const success = await runTest(test);
    results.push({ test, success });
  }

  console.log('\n');
  console.log('╔' + '='.repeat(78) + '╗');
  console.log('║' + ' '.repeat(25) + 'TEST SUMMARY' + ' '.repeat(41) + '║');
  console.log('╠' + '='.repeat(78) + '╣');

  for (const { test, success } of results) {
    const status = success ? '✓ PASS' : '✗ FAIL';
    const statusColor = success ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    console.log(`║  ${statusColor}${status}${reset}  ${test.padEnd(68)} ║`);
  }

  const passCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => r.success === false).length;

  console.log('╠' + '='.repeat(78) + '╣');
  console.log(`║  Total: ${results.length}  |  Passed: ${passCount}  |  Failed: ${failCount}` + ' '.repeat(78 - 40) + '║');
  console.log('╚' + '='.repeat(78) + '╝');
  console.log('\n');

  const allPassed = results.every(r => r.success);
  
  if (allPassed) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
