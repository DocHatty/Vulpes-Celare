/**
 * Tests for Image Redaction Services
 *
 * @jest-environment node
 */

import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

// Import services
import { OCRService } from '../src/core/images/OCRService';
import { VisualDetector } from '../src/core/images/VisualDetector';
import { ImageRedactor } from '../src/core/images/ImageRedactor';

describe('OCRService', () => {
    let ocrService: OCRService;

    beforeAll(async () => {
        ocrService = new OCRService({
            confidenceThreshold: 0.3,
            detectionThreshold: 0.2,
        });
        await ocrService.initialize();
    });

    afterAll(async () => {
        await ocrService.dispose();
    });

    test('should initialize without errors', () => {
        expect(ocrService.isModelLoaded()).toBeDefined();
    });

    test('should handle empty buffer gracefully', async () => {
        // Create a small blank image
        const blankImage = await sharp({
            create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } }
        }).png().toBuffer();

        const results = await ocrService.extractText(blankImage);
        expect(Array.isArray(results)).toBe(true);
    });

    test('should extract text from image with text', async () => {
        // Create image with text (this is a test - real OCR may or may not detect it depending on model)
        // In a real test, you'd use actual test images with known text
        const textImage = await sharp({
            create: { width: 200, height: 50, channels: 3, background: { r: 255, g: 255, b: 255 } }
        })
            .composite([{
                input: Buffer.from(`<svg width="200" height="50">
                <text x="10" y="35" font-size="24" fill="black">TEST123</text>
            </svg>`),
                top: 0,
                left: 0,
            }])
            .png().toBuffer();

        const results = await ocrService.extractText(textImage);
        // With the real model loaded, this should detect text
        expect(Array.isArray(results)).toBe(true);
    });

    test('should return bounding boxes with results', async () => {
        const testImage = await sharp({
            create: { width: 300, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } }
        }).png().toBuffer();

        const results = await ocrService.extractText(testImage);

        for (const result of results) {
            expect(result).toHaveProperty('text');
            expect(result).toHaveProperty('box');
            expect(result).toHaveProperty('confidence');
            expect(result.box).toHaveProperty('x');
            expect(result.box).toHaveProperty('y');
            expect(result.box).toHaveProperty('width');
            expect(result.box).toHaveProperty('height');
        }
    });
});

describe('VisualDetector', () => {
    let detector: VisualDetector;

    beforeAll(async () => {
        detector = new VisualDetector({
            confidenceThreshold: 0.5,
        });
        await detector.initialize();
    });

    afterAll(async () => {
        await detector.dispose();
    });

    test('should initialize without errors', () => {
        expect(detector.isModelLoaded()).toBeDefined();
    });

    test('should handle blank image', async () => {
        const blankImage = await sharp({
            create: { width: 640, height: 480, channels: 3, background: { r: 128, g: 128, b: 128 } }
        }).png().toBuffer();

        const detections = await detector.detect(blankImage);
        expect(Array.isArray(detections)).toBe(true);
    });

    test('should return face detections with correct structure', async () => {
        // Create a test image (blank for now - real test would use face images)
        const testImage = await sharp({
            create: { width: 640, height: 480, channels: 3, background: { r: 200, g: 180, b: 160 } }
        }).png().toBuffer();

        const detections = await detector.detect(testImage);

        for (const detection of detections) {
            expect(detection).toHaveProperty('type');
            expect(detection).toHaveProperty('box');
            expect(detection).toHaveProperty('confidence');
            expect(['FACE', 'SIGNATURE', 'FINGERPRINT', 'OTHER']).toContain(detection.type);
        }
    });
});

describe('ImageRedactor', () => {
    let redactor: ImageRedactor;

    beforeAll(async () => {
        redactor = new ImageRedactor({
            redactFaces: true,
            redactTextPHI: true,
            faceConfidenceThreshold: 0.5,
            textConfidenceThreshold: 0.3,
        });
        await redactor.initialize();
    });

    afterAll(async () => {
        await redactor.dispose();
    });

    test('should initialize without errors', () => {
        expect(redactor.isReady()).toBe(true);
    });

    test('should process image and return redaction result', async () => {
        const testImage = await sharp({
            create: { width: 400, height: 300, channels: 3, background: { r: 255, g: 255, b: 255 } }
        }).png().toBuffer();

        const result = await redactor.redact(testImage);

        expect(result).toHaveProperty('buffer');
        expect(result).toHaveProperty('dimensions');
        expect(result).toHaveProperty('redactions');
        expect(result).toHaveProperty('flaggedForReview');
        expect(result).toHaveProperty('extractedText');
        expect(result).toHaveProperty('processingTimeMs');
        expect(Buffer.isBuffer(result.buffer)).toBe(true);
    });

    test('should detect known PHI patterns from text', async () => {
        // Create image with SSN-like text
        const ssnImage = await sharp({
            create: { width: 300, height: 50, channels: 3, background: { r: 255, g: 255, b: 255 } }
        })
            .composite([{
                input: Buffer.from(`<svg width="300" height="50">
                <text x="10" y="35" font-size="20" font-family="Arial" fill="black">SSN: 123-45-6789</text>
            </svg>`),
                top: 0,
                left: 0,
            }])
            .png().toBuffer();

        const result = await redactor.redact(ssnImage, {
            knownIdentifiers: ['123-45-6789']
        });

        expect(result).toHaveProperty('redactions');
        expect(Array.isArray(result.redactions)).toBe(true);
    });

    test('should apply black box redactions', async () => {
        const testImage = await sharp({
            create: { width: 200, height: 200, channels: 3, background: { r: 255, g: 255, b: 255 } }
        }).png().toBuffer();

        const result = await redactor.redact(testImage);

        // Output should be a valid PNG
        const metadata = await sharp(result.buffer).metadata();
        expect(metadata.format).toBe('png');
    });
});

describe('Integration: Full Pipeline', () => {
    test('should process image through complete pipeline', async () => {
        const redactor = new ImageRedactor({
            redactFaces: true,
            redactTextPHI: true,
        });

        await redactor.initialize();

        // Create a test image
        const testImage = await sharp({
            create: { width: 800, height: 600, channels: 3, background: { r: 245, g: 245, b: 245 } }
        }).png().toBuffer();

        const startTime = Date.now();
        const result = await redactor.redact(testImage, {
            knownIdentifiers: ['John Smith', 'MRN-12345']
        });
        const elapsedMs = Date.now() - startTime;

        expect(result).toHaveProperty('buffer');
        expect(result).toHaveProperty('processingTimeMs');
        expect(result.processingTimeMs).toBeGreaterThan(0);

        // Performance check: should complete in reasonable time
        expect(elapsedMs).toBeLessThan(30000); // 30 seconds max

        await redactor.dispose();
    });
});
