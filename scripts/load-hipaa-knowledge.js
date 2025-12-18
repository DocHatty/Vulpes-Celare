#!/usr/bin/env node
/**
 * Load HIPAA Knowledge Base from training dataset
 *
 * Usage: node scripts/load-hipaa-knowledge.js [path-to-jsonl]
 *
 * Default path: C:/Users/docto/Downloads/da/train.jsonl
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Default dataset path
const DEFAULT_PATH = 'C:/Users/docto/Downloads/da/train.jsonl';

async function loadHipaaData(dataPath) {
  console.log('Loading HIPAA knowledge base...');
  console.log(`Source: ${dataPath}`);

  if (!fs.existsSync(dataPath)) {
    console.error(`Error: File not found: ${dataPath}`);
    process.exit(1);
  }

  // Import the VulpesStore module
  let store;
  try {
    store = require('../dist/cli/VulpesStore.js');
  } catch (e) {
    console.error('Error: Build required. Run `npm run build` first.');
    console.error(e.message);
    process.exit(1);
  }

  // Read and parse JSONL file
  const fileStream = fs.createReadStream(dataPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const entries = [];
  let lineNum = 0;
  let skipped = 0;

  for await (const line of rl) {
    lineNum++;
    try {
      const data = JSON.parse(line);
      const messages = data.messages || [];
      const metadata = data.metadata || {};

      // Extract Q&A
      let question = null;
      let answer = null;

      for (const msg of messages) {
        if (msg.role === 'user') question = msg.content;
        if (msg.role === 'assistant') answer = msg.content;
      }

      if (!question || !answer) {
        skipped++;
        continue;
      }

      // Skip low-quality entries
      if (answer.length < 100) {
        skipped++;
        continue;
      }
      if (answer.includes('<unknown>')) {
        skipped++;
        continue;
      }
      if (answer.substring(0, 200).includes('DEPARTMENT OF HEALTH AND HUMAN SERVICES')) {
        skipped++;
        continue;
      }

      // Clean up answer
      answer = answer.replace(/^According to [^:]+:\s*/, '').trim();
      answer = answer.replace(/\s+/g, ' ');

      // Extract CFR references
      const cfrRefs = answer.match(/§\d+\.\d+(?:\([a-z]\))?(?:\(\d+\))?(?:\([ivx]+\))?/g) || [];

      // Truncate very long answers
      if (answer.length > 1500) {
        answer = answer.substring(0, 1500) + '...';
      }

      entries.push({
        question: question.trim(),
        answer: answer,
        type: metadata.type || 'unknown',
        source: metadata.source || null,
        cfr_refs: cfrRefs.length > 0 ? cfrRefs : null
      });

    } catch (e) {
      console.error(`Error parsing line ${lineNum}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`\nParsed ${lineNum} lines`);
  console.log(`Valid entries: ${entries.length}`);
  console.log(`Skipped: ${skipped}`);

  // Group by type
  const byType = {};
  for (const entry of entries) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }
  console.log('\nBy type:');
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Count unique CFR sections
  const uniqueCfr = new Set();
  for (const entry of entries) {
    if (entry.cfr_refs) {
      for (const ref of entry.cfr_refs) {
        uniqueCfr.add(ref);
      }
    }
  }
  console.log(`\nUnique CFR sections: ${uniqueCfr.size}`);

  // Bulk insert into database
  console.log('\nInserting into database...');
  try {
    const count = store.bulkAddHipaaKnowledge(entries);
    console.log(`Inserted ${count} entries`);

    // Show stats
    const stats = store.getHipaaStats();
    console.log('\nDatabase stats:');
    console.log(`  Total entries: ${stats.total}`);
    console.log(`  Unique CFR sections: ${stats.uniqueCfrSections}`);
    console.log('  By type:', stats.byType);

  } catch (e) {
    console.error('Error inserting data:', e.message);
    process.exit(1);
  }

  console.log('\nDone!');
}

// Main
const dataPath = process.argv[2] || DEFAULT_PATH;
loadHipaaData(dataPath).catch(console.error);
