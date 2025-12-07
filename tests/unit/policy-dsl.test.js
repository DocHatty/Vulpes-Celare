/**
 * Unit Tests for PolicyDSL
 * 
 * Tests the declarative policy language compiler and templates
 */

const { PolicyCompiler, PolicyTemplates } = require('../../dist/PolicyDSL');

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

function assertArrayIncludes(array, item, message) {
  if (!array.includes(item)) {
    throw new Error(message || `Expected array to include ${item}`);
  }
}

// Tests
const runner = new TestRunner('PolicyDSL Compiler Tests');

// Template Tests
runner.test('Should have HIPAA_STRICT template', () => {
  assertExists(PolicyTemplates.HIPAA_STRICT, 'HIPAA_STRICT template should exist');
  assert(PolicyTemplates.HIPAA_STRICT.includes('policy HIPAA_STRICT'), 'Should be valid DSL');
});

runner.test('Should have RESEARCH_RELAXED template', () => {
  assertExists(PolicyTemplates.RESEARCH_RELAXED, 'RESEARCH_RELAXED template should exist');
  assert(PolicyTemplates.RESEARCH_RELAXED.includes('policy RESEARCH_RELAXED'), 'Should be valid DSL');
});

runner.test('Should have RADIOLOGY_DEPT template', () => {
  assertExists(PolicyTemplates.RADIOLOGY_DEPT, 'RADIOLOGY_DEPT template should exist');
  assert(PolicyTemplates.RADIOLOGY_DEPT.includes('policy RADIOLOGY_DEPT'), 'Should be valid DSL');
});

runner.test('Should have TRAINING template', () => {
  assertExists(PolicyTemplates.TRAINING, 'TRAINING template should exist');
  assert(PolicyTemplates.TRAINING.includes('policy TRAINING'), 'Should be valid DSL');
});

// Compilation Tests
runner.test('Should compile HIPAA_STRICT template', () => {
  const policy = PolicyCompiler.compile(PolicyTemplates.HIPAA_STRICT);
  
  assertExists(policy, 'Compiled policy should exist');
  assertEquals(policy.name, 'HIPAA_STRICT', 'Policy name should be HIPAA_STRICT');
  assertExists(policy.filters, 'Policy should have filters');
  assert(Object.keys(policy.filters).length > 0, 'Policy should have filter rules');
});

runner.test('Should compile RESEARCH_RELAXED template', () => {
  const policy = PolicyCompiler.compile(PolicyTemplates.RESEARCH_RELAXED);
  
  assertEquals(policy.name, 'RESEARCH_RELAXED', 'Policy name should be RESEARCH_RELAXED');
  assertExists(policy.description, 'Policy should have description');
});

runner.test('Should compile simple custom policy', () => {
  const dsl = `
policy TEST_POLICY {
  description "Test policy"
  
  redact names
  redact ssn
  keep dates
  
  threshold 0.5
}
`;

  const policy = PolicyCompiler.compile(dsl);
  
  assertEquals(policy.name, 'TEST_POLICY', 'Policy name should match');
  assertEquals(policy.description, 'Test policy', 'Description should match');
  assertEquals(policy.globalThreshold, 0.5, 'Threshold should be 0.5');
  
  assertExists(policy.filters.names, 'Names filter should exist');
  assertEquals(policy.filters.names.enabled, true, 'Names should be enabled');
  
  assertExists(policy.filters.ssn, 'SSN filter should exist');
  assertEquals(policy.filters.ssn.enabled, true, 'SSN should be enabled');
  
  assertExists(policy.filters.dates, 'Dates filter should exist');
  assertEquals(policy.filters.dates.enabled, false, 'Dates should be disabled (kept)');
});

runner.test('Should support policy inheritance', () => {
  const dsl = `
policy CUSTOM extends HIPAA_STRICT {
  description "Custom policy based on HIPAA"
  
  keep dates
}
`;

  const policy = PolicyCompiler.compile(dsl);
  
  assertEquals(policy.name, 'CUSTOM', 'Policy name should be CUSTOM');
  assertExists(policy.description, 'Should have description');
});

runner.test('Should handle redact rules', () => {
  const dsl = `
policy REDACT_TEST {
  redact names
  redact phones
  redact emails
}
`;

  const policy = PolicyCompiler.compile(dsl);
  
  assert(policy.filters.names.enabled, 'Names should be redacted');
  assert(policy.filters.phones.enabled, 'Phones should be redacted');
  assert(policy.filters.emails.enabled, 'Emails should be redacted');
});

runner.test('Should handle keep rules', () => {
  const dsl = `
policy KEEP_TEST {
  redact names
  keep dates
  keep ages
}
`;

  const policy = PolicyCompiler.compile(dsl);
  
  assert(policy.filters.names.enabled, 'Names should be redacted');
  assertEquals(policy.filters.dates.enabled, false, 'Dates should be kept');
  assertEquals(policy.filters.ages.enabled, false, 'Ages should be kept');
});

runner.test('Should validate policy structure', () => {
  const dsl = `
policy VALID_POLICY {
  description "A valid policy"
  redact names
  threshold 0.4
}
`;

  const policy = PolicyCompiler.compile(dsl);
  const validation = PolicyCompiler.validate(policy);
  
  assert(validation.valid, 'Policy should be valid');
  assertEquals(validation.errors.length, 0, 'Should have no errors');
});

runner.test('Should detect invalid policy (no name)', () => {
  try {
    PolicyCompiler.compile('{}');
    throw new Error('Should have thrown error for invalid policy');
  } catch (error) {
    assert(error.message.includes('policy declaration'), 'Error should mention policy declaration');
  }
});

runner.test('Should handle threshold setting', () => {
  const dsl = `
policy THRESHOLD_TEST {
  redact names
  threshold 0.7
}
`;

  const policy = PolicyCompiler.compile(dsl);
  assertEquals(policy.globalThreshold, 0.7, 'Threshold should be set');
});

runner.test('Should normalize identifiers (singular/plural)', () => {
  const dsl = `
policy NORMALIZE_TEST {
  redact name
  redact phones
  redact email
}
`;

  const policy = PolicyCompiler.compile(dsl);
  
  // Both singular and plural should work
  assertExists(policy.filters.names || policy.filters.name, 'Name filter should exist');
  assertExists(policy.filters.phones || policy.filters.phone, 'Phone filter should exist');
  assertExists(policy.filters.emails || policy.filters.email, 'Email filter should exist');
});

runner.test('Should convert policy to JSON', () => {
  const dsl = `
policy JSON_TEST {
  description "Test JSON export"
  redact names
  redact ssn
}
`;

  const policy = PolicyCompiler.compile(dsl);
  const json = PolicyCompiler.toJSON(policy);
  
  assertExists(json, 'JSON should be generated');
  assert(json.includes('"name"'), 'JSON should contain policy name');
  assert(json.includes('"filters"'), 'JSON should contain filters');
  
  // Should be valid JSON
  const parsed = JSON.parse(json);
  assertEquals(parsed.name, 'JSON_TEST', 'Parsed JSON should match');
});

runner.test('Should handle comments in DSL', () => {
  const dsl = `
// This is a comment
policy COMMENT_TEST {
  // Another comment
  description "Test policy with comments"
  redact names
  redact ssn
}
`;

  const policy = PolicyCompiler.compile(dsl);
  assertEquals(policy.name, 'COMMENT_TEST', 'Should parse despite comments');
});

runner.test('Should handle multiple redact rules', () => {
  const dsl = `
policy MULTI_REDACT {
  redact names
  redact ssn
  redact phones
  redact emails
  redact addresses
  redact dates
  redact mrn
}
`;

  const policy = PolicyCompiler.compile(dsl);
  
  const enabledFilters = Object.values(policy.filters).filter(f => f.enabled);
  assert(enabledFilters.length >= 7, 'Should have multiple filters enabled');
});

runner.test('Should handle mixed redact and keep rules', () => {
  const dsl = `
policy MIXED_RULES {
  redact names
  redact ssn
  keep dates
  redact phones
  keep ages
}
`;

  const policy = PolicyCompiler.compile(dsl);
  
  assertEquals(policy.filters.names.enabled, true, 'Names should be redacted');
  assertEquals(policy.filters.ssn.enabled, true, 'SSN should be redacted');
  assertEquals(policy.filters.dates.enabled, false, 'Dates should be kept');
  assertEquals(policy.filters.phones.enabled, true, 'Phones should be redacted');
  assertEquals(policy.filters.ages.enabled, false, 'Ages should be kept');
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
