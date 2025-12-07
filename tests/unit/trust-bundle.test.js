/**
 * Unit Tests for TrustBundleExporter
 * 
 * Tests the Trust Bundle generation, export, and verification
 */

const { TrustBundleExporter } = require('../../dist/provenance/TrustBundleExporter');
const { VulpesCelare } = require('../../dist/VulpesCelare');
const fs = require('fs');
const path = require('path');

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

function assertArrayIncludes(array, item, message) {
  if (!array.includes(item)) {
    throw new Error(message || `Expected array to include ${item}`);
  }
}

// Tests
const runner = new TestRunner('TrustBundleExporter Tests');

// Sample clinical note for testing
const sampleClinicalNote = `
Clinical Note

Patient: John Smith
MRN: 123456
DOB: 01/15/1980
SSN: 123-45-6789
Phone: (555) 123-4567

Chief Complaint: Chest pain

History: Patient is a 44-year-old male presenting with acute chest pain.

Assessment: Possible angina, rule out MI.

Plan: EKG, cardiac enzymes, cardiology consult.

Dr. Sarah Johnson
NPI: 1234567890
`;

// Bundle Generation Tests
runner.test('Should generate Trust Bundle', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  assertExists(bundle, 'Bundle should be generated');
  assertExists(bundle.manifest, 'Bundle should have manifest');
  assertExists(bundle.certificate, 'Bundle should have certificate');
  assertExists(bundle.redactedDocument, 'Bundle should have redacted document');
  assertExists(bundle.policy, 'Bundle should have policy');
  assertExists(bundle.auditorInstructions, 'Bundle should have auditor instructions');
});

runner.test('Should generate bundle with custom options', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result,
    {
      jobId: 'test-job-123',
      policyName: 'maximum',
      organizationName: 'Test Hospital',
      departmentName: 'Health Information Management',
      actorId: 'user-001',
      documentId: 'doc-001'
    }
  );
  
  assertEquals(bundle.manifest.jobId, 'test-job-123', 'Should use custom job ID');
  assertEquals(bundle.manifest.documentId, 'doc-001', 'Should use custom document ID');
  assertEquals(bundle.certificate.issuer.organization, 'Test Hospital', 'Should use custom org name');
  assertEquals(bundle.certificate.issuer.department, 'Health Information Management', 'Should use custom dept');
});

// Manifest Tests
runner.test('Manifest should have required fields', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const manifest = bundle.manifest;
  
  assertEquals(manifest.version, '1.0.0', 'Should have version');
  assertEquals(manifest.format, 'RED', 'Should have RED format');
  assertExists(manifest.jobId, 'Should have job ID');
  assertExists(manifest.timestamp, 'Should have timestamp');
  assertExists(manifest.statistics, 'Should have statistics');
  assertExists(manifest.integrity, 'Should have integrity data');
  assertExists(manifest.compliance, 'Should have compliance data');
  assertExists(manifest.bundle, 'Should have bundle metadata');
});

runner.test('Manifest statistics should be accurate', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const stats = bundle.manifest.statistics;
  
  assertEquals(stats.originalLength, sampleClinicalNote.length, 'Original length should match');
  assertEquals(stats.redactedLength, result.text.length, 'Redacted length should match');
  assertEquals(stats.phiElementsRemoved, result.redactionCount, 'PHI count should match');
});

runner.test('Manifest should contain cryptographic hashes', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const integrity = bundle.manifest.integrity;
  
  assertEquals(integrity.hashAlgorithm, 'SHA-256', 'Should use SHA-256');
  assertExists(integrity.hashOriginal, 'Should have original hash');
  assertExists(integrity.hashRedacted, 'Should have redacted hash');
  assertExists(integrity.hashManifest, 'Should have manifest hash');
  
  // Hashes should be hex strings of appropriate length (64 chars for SHA-256)
  assertEquals(integrity.hashOriginal.length, 64, 'Hash should be 64 characters');
  assertEquals(integrity.hashRedacted.length, 64, 'Hash should be 64 characters');
});

// Certificate Tests
runner.test('Certificate should have required fields', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const cert = bundle.certificate;
  
  assertExists(cert.version, 'Should have version');
  assertExists(cert.certificateId, 'Should have certificate ID');
  assertExists(cert.issuedAt, 'Should have issue timestamp');
  assertExists(cert.subject, 'Should have subject');
  assertExists(cert.issuer, 'Should have issuer');
  assertExists(cert.cryptographicProofs, 'Should have proofs');
  assertExists(cert.attestations, 'Should have attestations');
});

runner.test('Certificate should have valid attestations', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const attestations = bundle.certificate.attestations;
  
  assertEquals(attestations.redactionPerformed, true, 'Should attest redaction performed');
  assertExists(attestations.policyCompliance, 'Should have policy compliance statement');
  assertEquals(attestations.integrityVerified, true, 'Should attest integrity verified');
  assertExists(attestations.chainOfCustody, 'Should have chain of custody statement');
});

// Policy Tests
runner.test('Policy should have required structure', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result,
    { policyName: 'test-policy' }
  );
  
  const policy = bundle.policy;
  
  assertEquals(policy.name, 'test-policy', 'Should have policy name');
  assertEquals(policy.version, '1.0.0', 'Should have version');
  assertExists(policy.filters, 'Should have filters object');
  assertExists(policy.compliance, 'Should have compliance data');
  assertEquals(policy.compliance.standard, 'HIPAA Safe Harbor', 'Should reference HIPAA');
});

// Export Tests
runner.test('Should export bundle to file', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const outputPath = '/tmp/test-bundle-export.red';
  
  try {
    const filePath = await TrustBundleExporter.export(bundle, outputPath);
    
    assertExists(filePath, 'Should return file path');
    assert(fs.existsSync(filePath), 'File should exist');
    
    // Cleanup
    fs.unlinkSync(filePath);
  } catch (error) {
    throw error;
  }
});

runner.test('Should add .red extension if missing', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const outputPath = '/tmp/test-bundle-no-ext';
  
  try {
    const filePath = await TrustBundleExporter.export(bundle, outputPath);
    
    assert(filePath.endsWith('.red'), 'Should add .red extension');
    
    // Cleanup
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    throw error;
  }
});

// Verification Tests
runner.test('Should verify valid bundle', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const outputPath = '/tmp/test-bundle-verify.red';
  
  try {
    await TrustBundleExporter.export(bundle, outputPath);
    
    const verification = await TrustBundleExporter.verify(outputPath);
    
    assertExists(verification, 'Should return verification result');
    assertEquals(verification.valid, true, 'Bundle should be valid');
    assertEquals(verification.errors.length, 0, 'Should have no errors');
    
    // Check all verification checks
    assertEquals(verification.checks.manifestExists, true, 'Manifest should exist');
    assertEquals(verification.checks.certificateExists, true, 'Certificate should exist');
    assertEquals(verification.checks.redactedDocumentExists, true, 'Document should exist');
    assertEquals(verification.checks.bundleStructure, true, 'Structure should be valid');
    assertEquals(verification.checks.hashIntegrity, true, 'Hash should be valid');
    
    // Cleanup
    fs.unlinkSync(outputPath);
  } catch (error) {
    throw error;
  }
});

runner.test('Should detect missing bundle file', async () => {
  const verification = await TrustBundleExporter.verify('/tmp/nonexistent-bundle.red');
  
  assertEquals(verification.valid, false, 'Should be invalid');
  assert(verification.errors.length > 0, 'Should have errors');
  assert(verification.errors[0].includes('not found'), 'Error should mention file not found');
});

runner.test('Should detect invalid JSON in bundle', async () => {
  const invalidPath = '/tmp/test-invalid-bundle.red';
  
  try {
    fs.writeFileSync(invalidPath, 'invalid json content');
    
    const verification = await TrustBundleExporter.verify(invalidPath);
    
    assertEquals(verification.valid, false, 'Should be invalid');
    assert(verification.errors.length > 0, 'Should have errors');
    
    // Cleanup
    fs.unlinkSync(invalidPath);
  } catch (error) {
    throw error;
  }
});

runner.test('Verification should include manifest and certificate', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const outputPath = '/tmp/test-bundle-verify-data.red';
  
  try {
    await TrustBundleExporter.export(bundle, outputPath);
    
    const verification = await TrustBundleExporter.verify(outputPath);
    
    assertExists(verification.manifest, 'Verification should include manifest');
    assertExists(verification.certificate, 'Verification should include certificate');
    
    // Cleanup
    fs.unlinkSync(outputPath);
  } catch (error) {
    throw error;
  }
});

// Auditor Instructions Tests
runner.test('Auditor instructions should be generated', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  const instructions = bundle.auditorInstructions;
  
  assertExists(instructions, 'Instructions should exist');
  assert(instructions.includes('Trust Bundle Verification'), 'Should have title');
  assert(instructions.includes('Quick Verification'), 'Should have quick verification section');
  assert(instructions.includes('Technical Verification'), 'Should have technical section');
  assert(instructions.includes('HIPAA'), 'Should mention HIPAA');
});

// Integration Tests
runner.test('Should create and verify complete workflow', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  // Generate bundle
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result,
    {
      policyName: 'maximum',
      organizationName: 'Integration Test Hospital'
    }
  );
  
  // Export bundle
  const outputPath = '/tmp/test-complete-workflow.red';
  await TrustBundleExporter.export(bundle, outputPath);
  
  // Verify bundle
  const verification = await TrustBundleExporter.verify(outputPath);
  
  assertEquals(verification.valid, true, 'Complete workflow should produce valid bundle');
  
  // Cleanup
  fs.unlinkSync(outputPath);
});

runner.test('Should maintain hash integrity', async () => {
  const engine = new VulpesCelare();
  const result = await engine.process(sampleClinicalNote);
  
  const bundle = await TrustBundleExporter.generate(
    sampleClinicalNote,
    result.text,
    result
  );
  
  // Hash in manifest should match hash in certificate
  assertEquals(
    bundle.manifest.integrity.hashRedacted,
    bundle.certificate.cryptographicProofs.hashChain.redactedHash,
    'Hashes should match between manifest and certificate'
  );
});

// Run all tests
runner.run().then(success => {
  process.exit(success ? 0 : 1);
});
