#!/usr/bin/env node
/**
 * Shadow Diff Test Script
 *
 * Runs the test suite with all Rust shadow flags enabled to compare
 * Rust vs TypeScript implementations for parity.
 */

const { spawn } = require('child_process');
const path = require('path');

// Set all shadow diff flags
process.env.VULPES_SHADOW_RUST_NAME = '1';
process.env.VULPES_SHADOW_RUST_NAME_FULL = '1';
process.env.VULPES_SHADOW_RUST_NAME_SMART = '1';
process.env.VULPES_SHADOW_POSTFILTER = '1';
process.env.VULPES_SHADOW_APPLY_SPANS = '1';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           RUST SHADOW DIFF TEST                              ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log('║  Shadow flags enabled:                                       ║');
console.log('║    - VULPES_SHADOW_RUST_NAME=1                               ║');
console.log('║    - VULPES_SHADOW_RUST_NAME_FULL=1                          ║');
console.log('║    - VULPES_SHADOW_RUST_NAME_SMART=1                         ║');
console.log('║    - VULPES_SHADOW_POSTFILTER=1                              ║');
console.log('║    - VULPES_SHADOW_APPLY_SPANS=1                             ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');

const testProcess = spawn('node', [
  'tests/master-suite/run.js',
  '--profile', 'HIPAA_STRICT',
  '--seed', '1337',
  '--show-shadow-diffs'
], {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
});

testProcess.on('close', (code) => {
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Shadow diff test completed with exit code: ${code}`);
  console.log('══════════════════════════════════════════════════════════════');
  process.exit(code);
});
