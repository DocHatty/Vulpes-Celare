// Debug script to isolate parallel processing issue
const { VulpesCelare } = require('./dist/index.js');

const engine = new VulpesCelare();

const texts = [
  "PATIENT: John Smith\nDOB: 01/01/1980",
  "PATIENT: Jane Doe\nDOB: 02/02/1985",  
  "PATIENT: Bob Jones\nDOB: 03/03/1990",
];

console.log('=== TEST 1: Sequential processing ===');
async function testSequential() {
  for (let i = 0; i < texts.length; i++) {
    console.log(`Processing doc ${i+1}...`);
    const result = await engine.process(texts[i]);
    console.log(`Doc ${i+1} done: ${result.text.substring(0, 50)}`);
  }
  console.log('Sequential test PASSED');
}

console.log('\n=== TEST 2: Parallel processing with Promise.all ===');
async function testParallel() {
  const promises = texts.map(async (text, i) => {
    console.log(`Starting doc ${i+1}...`);
    const result = await engine.process(text);
    console.log(`Doc ${i+1} done: ${result.text.substring(0, 50)}`);
    return result;
  });
  
  const results = await Promise.all(promises);
  console.log(`Parallel test PASSED: ${results.length} documents`);
}

console.log('\n=== TEST 3: Batched parallel (like assessment) ===');
async function testBatched() {
  const BATCH_SIZE = 2;
  const results = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch starting at ${i}...`);
    
    const batchPromises = batch.map(async (text, idx) => {
      const docNum = i + idx + 1;
      console.log(`  Starting doc ${docNum} in batch...`);
      const result = await engine.process(text);
      console.log(`  Doc ${docNum} done`);
      return result;
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    console.log(`Batch complete: ${batchResults.length} docs`);
  }
  console.log(`Batched test PASSED: ${results.length} documents`);
}

async function main() {
  try {
    await testSequential();
    console.log('\n---\n');
    await testParallel();
    console.log('\n---\n');
    await testBatched();
    console.log('\n✅ ALL TESTS PASSED');
    process.exit(0);
  } catch (e) {
    console.error('\n❌ TEST FAILED:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

setTimeout(() => {
  console.error('\n⏱️  TIMEOUT after 60s');
  process.exit(99);
}, 60000);

main();
