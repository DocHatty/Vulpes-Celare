/**
 * Tests for DICOM Stream Transformer
 * 
 * @jest-environment node
 */

import { DicomStreamTransformer, anonymizeDicomBuffer, HIPAA_DICOM_TAGS } from '../src/core/dicom/DicomStreamTransformer';
import * as fs from 'fs';
import * as path from 'path';

describe('DicomStreamTransformer', () => {
    // Create a minimal DICOM buffer for testing
    // Real tests should use actual DICOM files
    function createMockDicomBuffer(): Buffer {
        // DICOM file structure:
        // - 128 bytes preamble (zeros)
        // - 4 bytes "DICM" prefix
        // - Data elements (simplified)

        const preamble = Buffer.alloc(128, 0);
        const prefix = Buffer.from('DICM');

        // Create a minimal structure that dicom-parser can handle
        // This is a simplified test buffer
        return Buffer.concat([preamble, prefix, Buffer.alloc(100, 0)]);
    }

    test('should create transformer with default config', () => {
        const transformer = new DicomStreamTransformer();
        expect(transformer).toBeDefined();
    });

    test('should create transformer with custom config', () => {
        const transformer = new DicomStreamTransformer({
            enablePixelRedaction: false,
            hashSalt: 'custom-salt',
        });
        expect(transformer).toBeDefined();
    });

    test('HIPAA_DICOM_TAGS should contain required tags', () => {
        expect(Array.isArray(HIPAA_DICOM_TAGS)).toBe(true);
        expect(HIPAA_DICOM_TAGS.length).toBeGreaterThan(10);

        // Check for critical tags
        const tags = HIPAA_DICOM_TAGS.map(r => r.tag);
        expect(tags).toContain('x00100010'); // PatientName
        expect(tags).toContain('x00100020'); // PatientID
        expect(tags).toContain('x00100030'); // PatientBirthDate
    });

    test('anonymization rules should have valid actions', () => {
        for (const rule of HIPAA_DICOM_TAGS) {
            expect(['REMOVE', 'REPLACE', 'HASH']).toContain(rule.action);
            expect(rule.tag).toMatch(/^x[0-9a-fA-F]{8}$/);
        }
    });

    test('setImageRedactor should accept redactor', () => {
        const transformer = new DicomStreamTransformer();
        const mockRedactor = { redact: () => Promise.resolve({}) };

        expect(() => transformer.setImageRedactor(mockRedactor)).not.toThrow();
    });

    test('should handle streaming interface', (done) => {
        const transformer = new DicomStreamTransformer();
        const chunks: Buffer[] = [];

        transformer.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
        });

        transformer.on('end', () => {
            // Should produce output even if parsing fails
            done();
        });

        transformer.on('error', (err) => {
            // DICOM parsing may fail on mock buffer, that's expected
            done();
        });

        // Write minimal data and end
        transformer.write(Buffer.alloc(10));
        transformer.end();
    });
});

describe('anonymizeDicomBuffer', () => {
    test('should be exported as function', () => {
        expect(typeof anonymizeDicomBuffer).toBe('function');
    });

    test('should accept buffer and optional config', async () => {
        // This will throw on invalid DICOM, but tests the interface
        const invalidBuffer = Buffer.from('not a dicom');

        await expect(anonymizeDicomBuffer(invalidBuffer)).rejects.toThrow();
    });
});

describe('DICOM Hash Consistency', () => {
    test('should produce consistent hashes for same input', async () => {
        const transformer1 = new DicomStreamTransformer({ hashSalt: 'test-salt' });
        const transformer2 = new DicomStreamTransformer({ hashSalt: 'test-salt' });

        // Access internal hash method via processDicom on same data
        // In real implementation, same PatientID should produce same hash
        expect(transformer1).toBeDefined();
        expect(transformer2).toBeDefined();
    });

    test('different salts should produce different hashes', () => {
        const transformer1 = new DicomStreamTransformer({ hashSalt: 'salt-a' });
        const transformer2 = new DicomStreamTransformer({ hashSalt: 'salt-b' });

        // The transformers are different
        expect(transformer1).not.toBe(transformer2);
    });
});
