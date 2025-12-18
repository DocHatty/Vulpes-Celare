#!/usr/bin/env node
/**
 * Cross-platform global installation script for Vulpes CLI
 *
 * This script installs the `vulpes` command globally without requiring
 * admin privileges by adding to the user's PATH.
 *
 * Usage: node scripts/install-global.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(__dirname, '..');

console.log('\n🦊 Vulpes Celare - Global Installation\n');

// Create a bin directory in user's home
const userBinDir = path.join(os.homedir(), '.vulpes-bin');

if (!fs.existsSync(userBinDir)) {
  fs.mkdirSync(userBinDir, { recursive: true });
  console.log(`✓ Created ${userBinDir}`);
}

if (isWindows) {
  // Create Windows batch file
  const cmdContent = `@echo off\nnode "${path.join(projectRoot, 'dist', 'cli', 'launcher.js')}" %*\n`;
  const cmdPath = path.join(userBinDir, 'vulpes.cmd');
  fs.writeFileSync(cmdPath, cmdContent);
  console.log(`✓ Created ${cmdPath}`);

  // Also create vulpes-cli.cmd for full CLI
  const cliCmdContent = `@echo off\nnode "${path.join(projectRoot, 'dist', 'cli', 'index.js')}" %*\n`;
  const cliCmdPath = path.join(userBinDir, 'vulpes-cli.cmd');
  fs.writeFileSync(cliCmdPath, cliCmdContent);
  console.log(`✓ Created ${cliCmdPath}`);

  // Check if already in PATH
  const currentPath = process.env.PATH || '';
  if (currentPath.toLowerCase().includes(userBinDir.toLowerCase())) {
    console.log(`✓ ${userBinDir} is already in PATH`);
  } else {
    console.log(`\n⚠️  Add this folder to your PATH to use 'vulpes' globally:\n`);
    console.log(`   ${userBinDir}\n`);
    console.log(`   To add permanently, run this in PowerShell (as yourself, not admin):\n`);
    console.log(`   [Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";${userBinDir}", "User")\n`);
    console.log(`   Then restart your terminal.\n`);
  }

} else {
  // Create Unix shell script
  const shContent = `#!/bin/sh\nnode "${path.join(projectRoot, 'dist', 'cli', 'launcher.js')}" "$@"\n`;
  const shPath = path.join(userBinDir, 'vulpes');
  fs.writeFileSync(shPath, shContent, { mode: 0o755 });
  console.log(`✓ Created ${shPath}`);

  // Also create vulpes-cli for full CLI
  const cliShContent = `#!/bin/sh\nnode "${path.join(projectRoot, 'dist', 'cli', 'index.js')}" "$@"\n`;
  const cliShPath = path.join(userBinDir, 'vulpes-cli');
  fs.writeFileSync(cliShPath, cliShContent, { mode: 0o755 });
  console.log(`✓ Created ${cliShPath}`);

  // Check shell config
  const shell = process.env.SHELL || '/bin/bash';
  const rcFile = shell.includes('zsh') ? '~/.zshrc' : '~/.bashrc';

  console.log(`\n⚠️  Add this to your ${rcFile}:\n`);
  console.log(`   export PATH="$PATH:${userBinDir}"\n`);
  console.log(`   Then run: source ${rcFile}\n`);
}

console.log('─'.repeat(50));
console.log('\n📖 Usage after PATH is set:\n');
console.log('   vulpes          Interactive menu');
console.log('   vulpes cc       Claude CLI (no API key)');
console.log('   vulpes chat     Native API chat');
console.log('   vulpes --help   Show all options\n');
