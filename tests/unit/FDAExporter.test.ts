/**
 * FDAExporter Test Suite
 *
 * Tests the FDA TPLC documentation generator for:
 * 1. Report generation
 * 2. Export formats
 * 3. Content completeness
 *
 * @module tests/unit/FDAExporter
 */

import { describe, it, expect } from 'vitest';
import { FDAExporter } from '../../src/compliance/FDAExporter';

describe('FDAExporter', () => {
  const exporter = FDAExporter.getInstance();

  describe('Report Generation', () => {
    it('should generate a complete TPLC report', () => {
      const report = exporter.generateTPLCReport({
        softwareVersion: '1.0.0',
      });

      expect(report.version).toBe('1.0');
      expect(report.softwareVersion).toBe('1.0.0');
      expect(report.productName).toContain('Vulpes Celare');
      expect(report.deviceClass).toBe('II');
      expect(report.cyberRiskLevel).toBe('ENHANCED');
    });

    it('should include intended use statement', () => {
      const report = exporter.generateTPLCReport();

      expect(report.intendedUse).toContain('HIPAA');
      expect(report.intendedUse).toContain('Protected Health Information');
      expect(report.intendedUse).toContain('INTENDED USERS');
      expect(report.intendedUse).toContain('LIMITATIONS');
    });

    it('should include SBOM when requested', () => {
      const report = exporter.generateTPLCReport({
        includeSBOM: true,
      });

      expect(report.sbom.length).toBeGreaterThan(0);
      expect(report.sbom[0]).toHaveProperty('name');
      expect(report.sbom[0]).toHaveProperty('version');
      expect(report.sbom[0]).toHaveProperty('license');
    });

    it('should exclude SBOM when not requested', () => {
      const report = exporter.generateTPLCReport({
        includeSBOM: false,
      });

      expect(report.sbom.length).toBe(0);
    });

    it('should include risk assessment', () => {
      const report = exporter.generateTPLCReport({
        includeRiskAssessment: true,
      });

      expect(report.riskAssessment.length).toBeGreaterThan(0);
      expect(report.riskAssessment[0]).toHaveProperty('id');
      expect(report.riskAssessment[0]).toHaveProperty('category');
      expect(report.riskAssessment[0]).toHaveProperty('severity');
      expect(report.riskAssessment[0]).toHaveProperty('mitigation');
    });

    it('should include validation results', () => {
      const report = exporter.generateTPLCReport({
        includeValidation: true,
      });

      expect(report.validation.length).toBeGreaterThan(0);
      expect(report.validation[0]).toHaveProperty('category');
      expect(report.validation[0]).toHaveProperty('passRate');
      expect(report.validation[0]).toHaveProperty('findings');
    });

    it('should include PCCP sections', () => {
      const report = exporter.generateTPLCReport();

      expect(report.pccp.threatModel).toBeDefined();
      expect(report.pccp.vulnerabilityManagement).toBeDefined();
      expect(report.pccp.softwareUpdatePlan).toBeDefined();
      expect(report.pccp.incidentResponse).toBeDefined();
    });
  });

  describe('Export Formats', () => {
    it('should export to JSON format', () => {
      const report = exporter.generateTPLCReport();
      const json = exporter.export(report, 'json');

      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.productName).toContain('Vulpes');
    });

    it('should export to Markdown format', () => {
      const report = exporter.generateTPLCReport();
      const md = exporter.export(report, 'markdown');

      expect(md).toContain('# FDA TPLC Documentation');
      expect(md).toContain('## 1. Intended Use');
      expect(md).toContain('## 2. Software Bill of Materials');
      expect(md).toContain('## 3. Risk Assessment');
      expect(md).toContain('## 4. Validation Summary');
      expect(md).toContain('## 5. Pre-market Cyber Controls Plan');
    });

    it('should include SBOM table in markdown', () => {
      const report = exporter.generateTPLCReport({ includeSBOM: true });
      const md = exporter.export(report, 'markdown');

      expect(md).toContain('| Package | Version |');
      expect(md).toContain('typescript');
    });

    it('should include risk table in markdown', () => {
      const report = exporter.generateTPLCReport({ includeRiskAssessment: true });
      const md = exporter.export(report, 'markdown');

      expect(md).toContain('| ID | Category |');
      expect(md).toContain('RISK-001');
    });
  });

  describe('Risk Assessment Content', () => {
    it('should cover key risk categories', () => {
      const report = exporter.generateTPLCReport();
      const categories = new Set(report.riskAssessment.map(r => r.category));

      expect(categories.has('SECURITY')).toBe(true);
      expect(categories.has('ACCURACY')).toBe(true);
      expect(categories.has('PRIVACY')).toBe(true);
    });

    it('should calculate risk scores correctly', () => {
      const report = exporter.generateTPLCReport();

      for (const risk of report.riskAssessment) {
        expect(risk.riskScore).toBe(risk.severity * risk.likelihood);
      }
    });

    it('should include adversarial attack risk', () => {
      const report = exporter.generateTPLCReport();
      const adversarialRisk = report.riskAssessment.find(
        r => r.description.toLowerCase().includes('adversarial')
      );

      expect(adversarialRisk).toBeDefined();
      expect(adversarialRisk!.mitigation).toContain('Unicode');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = FDAExporter.getInstance();
      const instance2 = FDAExporter.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
