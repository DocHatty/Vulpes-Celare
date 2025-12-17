import { describe, it, expect } from "vitest";

import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { TrustBundleExporter } from "../../src/provenance/TrustBundleExporter";
import { VulpesCelare } from "../../src/VulpesCelare";

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-${crypto.randomUUID()}-`));
}

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
`;

describe("TrustBundleExporter", () => {
  it("generates a Trust Bundle", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);

    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    expect(bundle).toBeTruthy();
    expect(bundle.manifest).toBeTruthy();
    expect(bundle.certificate).toBeTruthy();
    expect(bundle.redactedDocument).toBeTruthy();
    expect(bundle.policy).toBeTruthy();
    expect(bundle.auditorInstructions).toBeTruthy();
  });

  it("generates a bundle with custom options", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);

    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
      {
        jobId: "test-job-123",
        policyName: "maximum",
        organizationName: "Test Hospital",
        departmentName: "Health Information Management",
        actorId: "user-001",
        documentId: "doc-001",
      },
    );

    expect(bundle.manifest.jobId).toBe("test-job-123");
    expect(bundle.manifest.documentId).toBe("doc-001");
    expect(bundle.certificate.issuer.organization).toBe("Test Hospital");
    expect(bundle.certificate.issuer.department).toBe(
      "Health Information Management",
    );
  });

  it("manifest has required fields", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);

    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const manifest = bundle.manifest;
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.format).toBe("RED");
    expect(manifest.jobId).toBeTruthy();
    expect(manifest.timestamp).toBeTruthy();
    expect(manifest.statistics).toBeTruthy();
    expect(manifest.integrity).toBeTruthy();
    expect(manifest.compliance).toBeTruthy();
    expect(manifest.bundle).toBeTruthy();
  });

  it("manifest statistics are accurate", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);

    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const stats = bundle.manifest.statistics;
    expect(stats.originalLength).toBe(sampleClinicalNote.length);
    expect(stats.redactedLength).toBe(result.text.length);
    expect(stats.phiElementsRemoved).toBe(result.redactionCount);
  });

  it("manifest contains cryptographic hashes", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);

    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const integrity = bundle.manifest.integrity;
    expect(integrity.hashAlgorithm).toBe("SHA-256");
    expect(integrity.hashOriginal).toHaveLength(64);
    expect(integrity.hashRedacted).toHaveLength(64);
    expect(integrity.hashManifest).toBeTruthy();
  });

  it("certificate has required fields", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);

    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const cert = bundle.certificate;
    expect(cert.version).toBeTruthy();
    expect(cert.certificateId).toBeTruthy();
    expect(cert.issuedAt).toBeTruthy();
    expect(cert.subject).toBeTruthy();
    expect(cert.issuer).toBeTruthy();
    expect(cert.cryptographicProofs).toBeTruthy();
    expect(cert.attestations).toBeTruthy();
  });

  it("certificate attestations are valid", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);

    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const attestations = bundle.certificate.attestations;
    expect(attestations.redactionPerformed).toBe(true);
    expect(attestations.policyCompliance).toBeTruthy();
    expect(attestations.integrityVerified).toBe(true);
    expect(attestations.chainOfCustody).toBeTruthy();
  });

  it("policy has required structure", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);

    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
      { policyName: "test-policy" },
    );

    const policy = bundle.policy;
    expect(policy.name).toBe("test-policy");
    expect(policy.version).toBe("1.0.0");
    expect(policy.filters).toBeTruthy();
    expect(policy.compliance).toBeTruthy();
    expect(policy.compliance!.standard).toBe("HIPAA Safe Harbor");
  });

  it("exports bundle to a file", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);
    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const dir = makeTempDir("vulpes-bundle-export");
    try {
      const outputPath = path.join(dir, "test-bundle-export.red");
      const filePath = await TrustBundleExporter.export(bundle, outputPath);
      expect(filePath).toBeTruthy();
      expect(fs.existsSync(filePath)).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("adds .red extension if missing", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);
    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const dir = makeTempDir("vulpes-bundle-no-ext");
    try {
      const outputPath = path.join(dir, "test-bundle-no-ext");
      const filePath = await TrustBundleExporter.export(bundle, outputPath);
      expect(filePath.endsWith(".red")).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("verifies a valid bundle", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);
    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const dir = makeTempDir("vulpes-bundle-verify");
    try {
      const outputPath = path.join(dir, "test-bundle-verify.red");
      await TrustBundleExporter.export(bundle, outputPath);
      const verification = await TrustBundleExporter.verify(outputPath);
      expect(verification).toBeTruthy();
      expect(verification.valid).toBe(true);
      expect(verification.errors.length).toBe(0);

      expect(verification.checks.manifestExists).toBe(true);
      expect(verification.checks.certificateExists).toBe(true);
      expect(verification.checks.redactedDocumentExists).toBe(true);
      expect(verification.checks.bundleStructure).toBe(true);
      expect(verification.checks.hashIntegrity).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("detects missing bundle file", async () => {
    const missingPath = path.join(
      os.tmpdir(),
      `nonexistent-${crypto.randomUUID()}.red`,
    );

    const verification = await TrustBundleExporter.verify(missingPath);
    expect(verification.valid).toBe(false);
    expect(verification.errors.length).toBeGreaterThan(0);
    expect(verification.errors.join(" ").toLowerCase()).toContain("not found");
  });

  it("detects invalid JSON in bundle", async () => {
    const dir = makeTempDir("vulpes-bundle-invalid-json");
    const invalidPath = path.join(dir, "test-invalid-bundle.red");
    try {
      fs.writeFileSync(invalidPath, "invalid json content");
      const verification = await TrustBundleExporter.verify(invalidPath);
      expect(verification.valid).toBe(false);
      expect(verification.errors.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("verification includes manifest and certificate", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);
    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const dir = makeTempDir("vulpes-bundle-verify-data");
    try {
      const outputPath = path.join(dir, "test-bundle-verify-data.red");
      await TrustBundleExporter.export(bundle, outputPath);
      const verification = await TrustBundleExporter.verify(outputPath);
      expect(verification.manifest).toBeTruthy();
      expect(verification.certificate).toBeTruthy();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("generates auditor instructions", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);
    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    const instructions = bundle.auditorInstructions;
    expect(instructions).toBeTruthy();
    expect(instructions).toContain("Trust Bundle Verification");
    expect(instructions).toContain("Quick Verification");
    expect(instructions).toContain("Technical Verification");
    expect(instructions).toContain("HIPAA");
  });

  it("creates and verifies complete workflow", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);

    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
      { policyName: "maximum", organizationName: "Integration Test Hospital" },
    );

    const dir = makeTempDir("vulpes-bundle-workflow");
    try {
      const outputPath = path.join(dir, "test-complete-workflow.red");
      await TrustBundleExporter.export(bundle, outputPath);
      const verification = await TrustBundleExporter.verify(outputPath);
      expect(verification.valid).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("maintains hash integrity", async () => {
    const engine = new VulpesCelare();
    const result = await engine.process(sampleClinicalNote);
    const bundle = await TrustBundleExporter.generate(
      sampleClinicalNote,
      result.text,
      result,
    );

    expect(bundle.manifest.integrity.hashRedacted).toBe(
      bundle.certificate.cryptographicProofs.hashChain.redactedHash,
    );
  });
});
