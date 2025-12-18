#!/usr/bin/env node

/**
 * Memory Check Utility
 * Checks Node.js memory usage and system resources
 */

console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
console.log('║   MEMORY & PERFORMANCE CHECK                                         ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

// Check Node.js memory
const used = process.memoryUsage();
console.log('NODE.JS MEMORY USAGE');
console.log('─'.repeat(70));
console.log(`  Heap Used:      ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`);
console.log(`  Heap Total:     ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`);
console.log(`  RSS:            ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`);
console.log(`  External:       ${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`);
console.log(`  Array Buffers:  ${Math.round((used.arrayBuffers || 0) / 1024 / 1024 * 100) / 100} MB`);

// Check system info
console.log('\nSYSTEM INFO');
console.log('─'.repeat(70));
console.log(`  Node Version:   ${process.version}`);
console.log(`  Platform:       ${process.platform} (${process.arch})`);
console.log(`  CPU Cores:      ${require('os').cpus().length}`);
console.log(`  Total Memory:   ${Math.round(require('os').totalmem() / 1024 / 1024 / 1024 * 100) / 100} GB`);
console.log(`  Free Memory:    ${Math.round(require('os').freemem() / 1024 / 1024 / 1024 * 100) / 100} GB`);

// Check uptime
console.log('\nPROCESS INFO');
console.log('─'.repeat(70));
console.log(`  Uptime:         ${Math.round(process.uptime())} seconds`);
console.log(`  PID:            ${process.pid}`);

console.log('');
