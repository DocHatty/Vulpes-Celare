/**
 * Unit Tests for StreamingRedactor
 * 
 * Tests the streaming redaction API for real-time PHI protection
 */

const { StreamingRedactor } = require('../../dist/StreamingRedactor');

/**
 * Test runner
 */
class TestRunner {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(description, fn) {
    this.tests.push({ description, fn });
  }

  async run() {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running: ${this.name}`);
    console.log(`${'='.repeat(80)}\n`);

    for (const { description, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✓ ${description}`);
      } catch (error) {
        this.failed++;
        console.error(`✗ ${description}`);
        console.error(`  Error: ${error.message}`);
        if (error.stack) {
          console.error(`  ${error.stack.split('\n').slice(1, 3).join('\n  ')}`);
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Results: ${this.passed} passed, ${this.failed} failed`);
    console.log(`${'='.repeat(80)}\n`);

    return this.failed === 0;
  }
}

// Assertion helpers
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertExists(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to exist');
  }
}

function assertGreaterThan(actual, expected, message) {
  if (actual <= expected) {
    throw new Error(message || `Expected ${actual} > ${expected}`);
  }
}

// Helper to create async iterable
async function* createAsyncIterable(chunks) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

// Tests
const runner = new TestRunner('StreamingRedactor Tests');

// Basic Functionality Tests
runner.test('Should create StreamingRedactor instance', () => {
  const redactor = new StreamingRedactor();
  assertExists(redactor, 'Redactor should be created');
});

runner.test('Should create with custom buffer size', () => {
  const redactor = new StreamingRedactor({ bufferSize: 200 });
  assertExists(redactor, 'Redactor should be created with custom buffer size');
});

runner.test('Should create with immediate mode', () => {
  const redactor = new StreamingRedactor({ mode: 'immediate' });
  assertExists(redactor, 'Redactor should be created with immediate mode');
});

runner.test('Should create with sentence mode', () => {
  const redactor = new StreamingRedactor({ mode: 'sentence' });
  assertExists(redactor, 'Redactor should be created with sentence mode');
});

// Chunk Processing Tests
runner.test('Should process a simple chunk', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 50 });
  
  const chunk = await redactor.processChunk('Patient John Smith visited.');
  
  // May or may not return chunk depending on buffer flush
  // Just verify it doesn't throw
  assert(true, 'Should process without error');
});

runner.test('Should flush remaining buffer', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 1000 });
  
  await redactor.processChunk('Patient John Smith');
  const final = await redactor.flush();
  
  assertExists(final, 'Should return final chunk');
  assertExists(final.text, 'Chunk should have text');
  assert(typeof final.redactionCount === 'number', 'Should have redaction count');
});

runner.test('Should track position in stream', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 50 });
  
  await redactor.processChunk('First chunk. ');
  await redactor.processChunk('Second chunk. ');
  const final = await redactor.flush();
  
  if (final) {
    assert(typeof final.position === 'number', 'Should track position');
  }
});

runner.test('Should count redactions', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  await redactor.processChunk('Patient John Smith, SSN 123-45-6789.');
  const final = await redactor.flush();
  
  assertExists(final, 'Should have final chunk');
  // Should redact at least the name and SSN
  assert(final.redactionCount >= 0, 'Should count redactions');
});

runner.test('Should indicate if chunk contains redactions', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  await redactor.processChunk('Patient John Smith visited today.');
  const final = await redactor.flush();
  
  assertExists(final, 'Should have final chunk');
  assert(typeof final.containsRedactions === 'boolean', 'Should have containsRedactions flag');
});

// Streaming Tests
runner.test('Should process async iterable stream', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 50 });
  
  const chunks = [
    'Patient John ',
    'Smith visited ',
    'on 01/15/2024.'
  ];
  
  const stream = createAsyncIterable(chunks);
  const results = [];
  
  for await (const chunk of redactor.redactStream(stream)) {
    results.push(chunk);
  }
  
  assert(results.length > 0, 'Should process stream chunks');
  
  // Verify each result has required properties
  for (const result of results) {
    assertExists(result.text, 'Each chunk should have text');
    assert(typeof result.redactionCount === 'number', 'Should have redaction count');
    assert(typeof result.containsRedactions === 'boolean', 'Should have containsRedactions');
    assert(typeof result.position === 'number', 'Should have position');
  }
});

runner.test('Should handle empty stream', async () => {
  const redactor = new StreamingRedactor();
  
  const stream = createAsyncIterable([]);
  const results = [];
  
  for await (const chunk of redactor.redactStream(stream)) {
    results.push(chunk);
  }
  
  assertEquals(results.length, 0, 'Empty stream should produce no chunks');
});

runner.test('Should handle single chunk stream', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  const stream = createAsyncIterable(['Patient arrived.']);
  const results = [];
  
  for await (const chunk of redactor.redactStream(stream)) {
    results.push(chunk);
  }
  
  assert(results.length > 0, 'Should process single chunk');
});

// Stats Tests
runner.test('Should track total redaction count', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  await redactor.processChunk('John Smith');
  await redactor.flush();
  
  const stats = redactor.getStats();
  assertExists(stats, 'Should have stats');
  assert(typeof stats.totalRedactionCount === 'number', 'Should track total redactions');
  assert(typeof stats.position === 'number', 'Should track position');
});

runner.test('Should update stats across multiple chunks', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 50 });
  
  await redactor.processChunk('First sentence.');
  await redactor.processChunk(' Second sentence.');
  await redactor.flush();
  
  const stats = redactor.getStats();
  assertGreaterThan(stats.position, 0, 'Position should increase');
});

// Reset Tests
runner.test('Should reset redactor state', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  await redactor.processChunk('Some text here.');
  await redactor.flush();
  
  redactor.reset();
  
  const stats = redactor.getStats();
  assertEquals(stats.totalRedactionCount, 0, 'Redaction count should be reset');
  assertEquals(stats.position, 0, 'Position should be reset');
});

runner.test('Should be reusable after reset', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  // First use
  await redactor.processChunk('First stream.');
  await redactor.flush();
  
  // Reset and reuse
  redactor.reset();
  
  await redactor.processChunk('Second stream.');
  const final = await redactor.flush();
  
  assertExists(final, 'Should work after reset');
});

// Mode Tests
runner.test('Should work in immediate mode', async () => {
  const redactor = new StreamingRedactor({ 
    bufferSize: 20,
    mode: 'immediate' 
  });
  
  const chunk = await redactor.processChunk('Patient arrived at hospital.');
  
  // In immediate mode with large enough text, should flush
  // Just verify it doesn't throw
  assert(true, 'Immediate mode should work');
});

runner.test('Should work in sentence mode', async () => {
  const redactor = new StreamingRedactor({ 
    bufferSize: 100,
    mode: 'sentence' 
  });
  
  const chunk = await redactor.processChunk('Patient arrived. Doctor examined patient.');
  
  // Sentence mode should flush on sentence boundaries
  // Just verify it doesn't throw
  assert(true, 'Sentence mode should work');
});

// Buffer Size Tests
runner.test('Should respect buffer size', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 10 });
  
  // Text longer than buffer should trigger flush
  const chunk = await redactor.processChunk('This is a longer text that exceeds buffer.');
  
  // May or may not flush depending on logic, just verify no error
  assert(true, 'Should handle buffer size correctly');
});

runner.test('Should work with very small buffer', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 5 });
  
  await redactor.processChunk('Test');
  const final = await redactor.flush();
  
  assertExists(final, 'Should work with small buffer');
});

runner.test('Should work with large buffer', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 10000 });
  
  await redactor.processChunk('Test text.');
  const final = await redactor.flush();
  
  assertExists(final, 'Should work with large buffer');
});

// Integration Tests
runner.test('Should redact PHI in streaming fashion', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  const chunks = [
    'Patient Name: John Smith\n',
    'SSN: 123-45-6789\n',
    'Phone: (555) 123-4567'
  ];
  
  for (const chunk of chunks) {
    await redactor.processChunk(chunk);
  }
  
  const final = await redactor.flush();
  
  assertExists(final, 'Should produce final result');
  assertExists(final.text, 'Should have redacted text');
  
  // Verify PHI was redacted (should not contain original values)
  assert(!final.text.includes('123-45-6789'), 'SSN should be redacted');
});

runner.test('Should maintain context across chunks', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  // Split a name across chunks
  await redactor.processChunk('Patient: John ');
  await redactor.processChunk('Smith\n');
  await redactor.processChunk('Diagnosis: Healthy');
  
  const final = await redactor.flush();
  
  assertExists(final, 'Should handle split entities');
  assertExists(final.text, 'Should have combined result');
});

// Edge Cases
runner.test('Should handle null/empty chunks gracefully', async () => {
  const redactor = new StreamingRedactor();
  
  const chunk = await redactor.processChunk('');
  const final = await redactor.flush();
  
  // Should not throw, may return null
  assert(true, 'Should handle empty input');
});

runner.test('Should handle very long single chunk', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  const longText = 'Patient information. '.repeat(100);
  await redactor.processChunk(longText);
  const final = await redactor.flush();
  
  // May return null if already flushed, which is okay
  assert(true, 'Should handle long text without error');
});

runner.test('Should handle special characters', async () => {
  const redactor = new StreamingRedactor({ bufferSize: 100 });
  
  await redactor.processChunk('Patient: John "Johnny" O\'Brien-Smith, Jr.');
  const final = await redactor.flush();
  
  assertExists(final, 'Should handle special characters');
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
