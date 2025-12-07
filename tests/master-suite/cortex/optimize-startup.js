/**
 * MCP Server Startup Optimizer
 * Cleans up stale files and archives large JSON to prevent timeouts
 * 
 * Run: node optimize-startup.js
 */

const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.join(__dirname, 'storage');
const KNOWLEDGE_PATH = path.join(STORAGE_PATH, 'knowledge');
const ARCHIVE_PATH = path.join(STORAGE_PATH, 'archive');

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VULPES CORTEX - STARTUP OPTIMIZER');
console.log('═══════════════════════════════════════════════════════════════\n');

// Ensure archive directory exists
if (!fs.existsSync(ARCHIVE_PATH)) {
    fs.mkdirSync(ARCHIVE_PATH, { recursive: true });
    console.log('Created archive directory');
}

// 1. Remove stale status file
const statusFile = path.join(STORAGE_PATH, '.cortex-status.json');
if (fs.existsSync(statusFile)) {
    try {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
        console.log(`Found status file: PID ${status.pid}, Port ${status.port}`);
        
        // Check if process is running
        try {
            process.kill(status.pid, 0);
            console.log(`  Process ${status.pid} is still running`);
        } catch (e) {
            console.log(`  Process ${status.pid} is NOT running - removing stale file`);
            fs.unlinkSync(statusFile);
        }
    } catch (e) {
        console.log(`  Removing invalid status file`);
        fs.unlinkSync(statusFile);
    }
}

// 2. Check and archive large JSON files
console.log('\nChecking knowledge files...');

const SIZE_THRESHOLD = 100 * 1024; // 100KB threshold

const files = fs.readdirSync(KNOWLEDGE_PATH);
let archivedCount = 0;

for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    const filePath = path.join(KNOWLEDGE_PATH, file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    
    if (stats.size > SIZE_THRESHOLD) {
        console.log(`  ⚠ ${file}: ${sizeKB}KB (LARGE)`);
        
        // Archive it
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveName = `${file.replace('.json', '')}-${timestamp}.json`;
        const archivePath = path.join(ARCHIVE_PATH, archiveName);
        
        // Read, truncate, and archive
        try {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            
            // Archive full file
            fs.writeFileSync(archivePath, JSON.stringify(content, null, 2));
            console.log(`    → Archived to ${archiveName}`);
            
            // Truncate to recent items only
            let truncated;
            if (Array.isArray(content)) {
                // Keep last 100 items
                truncated = content.slice(-100);
                console.log(`    → Truncated from ${content.length} to ${truncated.length} items`);
            } else if (typeof content === 'object') {
                // For objects, keep recent entries
                const keys = Object.keys(content);
                if (keys.length > 100) {
                    truncated = {};
                    const recentKeys = keys.slice(-100);
                    for (const key of recentKeys) {
                        truncated[key] = content[key];
                    }
                    console.log(`    → Truncated from ${keys.length} to ${Object.keys(truncated).length} keys`);
                } else {
                    truncated = content;
                }
            } else {
                truncated = content;
            }
            
            fs.writeFileSync(filePath, JSON.stringify(truncated, null, 2));
            archivedCount++;
        } catch (e) {
            console.log(`    ✗ Error processing ${file}: ${e.message}`);
        }
    } else {
        console.log(`  ✓ ${file}: ${sizeKB}KB (OK)`);
    }
}

// 3. Clean up WAL files if they exist (SQLite cleanup)
const dbWal = path.join(STORAGE_PATH, 'cortex.db-wal');
const dbShm = path.join(STORAGE_PATH, 'cortex.db-shm');

if (fs.existsSync(dbWal)) {
    const walSize = (fs.statSync(dbWal).size / 1024 / 1024).toFixed(2);
    console.log(`\nSQLite WAL file: ${walSize}MB`);
    
    if (parseFloat(walSize) > 10) {
        console.log('  → WAL file is large. Consider running PRAGMA wal_checkpoint(TRUNCATE)');
    }
}

// 4. Summary
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  OPTIMIZATION COMPLETE');
console.log('═══════════════════════════════════════════════════════════════');

if (archivedCount > 0) {
    console.log(`\n✓ Archived and truncated ${archivedCount} large file(s)`);
    console.log('  Original data preserved in storage/archive/');
}

console.log('\nNEXT STEPS:');
console.log('  1. Restart Claude Desktop to apply changes');
console.log('  2. Try the MCP tools again');
console.log('  3. If still failing, run: node diagnose-mcp.js');
console.log('');
