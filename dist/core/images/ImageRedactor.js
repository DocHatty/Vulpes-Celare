"use strict";
/**
 * ImageRedactor - Policy-Driven Visual Redaction Engine
 *
 * This is the orchestrator for image-based PHI redaction. It coordinates:
 * - OCR text extraction (via OCRService)
 * - Visual PHI detection (via VisualDetector)
 * - Text-based PHI matching (via VulpesCelare core)
 * - Pixel-level redaction (via Sharp)
 *
 * Key Feature: Multi-Modal Verification
 * - Cross-references detected text with metadata
 * - Automated redaction for high-confidence matches
 * - Flags ambiguous cases for human review
 *
 * @module core/images/ImageRedactor
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageRedactor = void 0;
const sharp_1 = __importDefault(require("sharp"));
const OCRService_1 = require("./OCRService");
const VisualDetector_1 = require("./VisualDetector");
const logger_1 = require("./logger");
const DEFAULT_POLICY = {
    redactFaces: true,
    faceConfidenceThreshold: 0.7,
    redactTextPHI: true,
    textConfidenceThreshold: 0.5,
    enableMultiModalVerification: true,
    redactionStyle: 'BLACK_BOX',
    redactionPadding: 5,
};
/**
 * ImageRedactor - Coordinates visual PHI detection and redaction
 *
 * @example
 * ```typescript
 * const redactor = new ImageRedactor();
 * await redactor.initialize();
 *
 * const imageBuffer = fs.readFileSync('medical-scan.png');
 * const result = await redactor.redact(imageBuffer, {
 *     knownIdentifiers: ['John Smith', 'MRN-12345']
 * });
 *
 * fs.writeFileSync('safe-scan.png', result.buffer);
 * console.log(`Redacted ${result.redactions.length} regions in ${result.processingTimeMs}ms`);
 * ```
 */
class ImageRedactor {
    constructor(policy = {}) {
        this.initialized = false;
        this.initializing = false;
        this.initError = null;
        this.logger = (0, logger_1.getLogger)();
        // Reference to the text redaction engine (injected or lazy-loaded)
        this.textRedactor = null;
        this.policy = { ...DEFAULT_POLICY, ...policy };
        this.ocrService = new OCRService_1.OCRService({
            confidenceThreshold: this.policy.textConfidenceThreshold,
        });
        this.visualDetector = new VisualDetector_1.VisualDetector({
            confidenceThreshold: this.policy.faceConfidenceThreshold,
        });
        this.logger.debug('ImageRedactor', 'constructor', 'Created with policy', { policy: this.policy });
    }
    /**
     * Initialize all sub-services
     */
    async initialize() {
        if (this.initialized)
            return;
        // Prevent race conditions
        if (this.initializing) {
            while (this.initializing) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            if (this.initError)
                throw this.initError;
            return;
        }
        this.initializing = true;
        const complete = this.logger.startOperation('ImageRedactor', 'initialize');
        try {
            await Promise.all([
                this.ocrService.initialize(),
                this.visualDetector.initialize(),
            ]);
            this.initialized = true;
            complete(true);
            this.logger.info('ImageRedactor', 'initialize', 'Initialized successfully');
        }
        catch (error) {
            this.initError = error instanceof Error ? error : new Error(String(error));
            complete(false, this.initError.message);
            this.logger.error('ImageRedactor', 'initialize', 'Initialization failed', this.initError);
            throw this.initError;
        }
        finally {
            this.initializing = false;
        }
    }
    /**
     * Set the text redaction function (usually VulpesCelare.redact)
     */
    setTextRedactor(redactor) {
        this.textRedactor = redactor;
    }
    /**
     * Redact PHI from an image
     *
     * @param imageBuffer - Input image data
     * @param policyOverrides - Optional policy overrides
     * @returns Redacted image and metadata
     */
    async redact(imageBuffer, policyOverrides) {
        const startTime = Date.now();
        const policy = { ...this.policy, ...policyOverrides };
        if (!this.initialized) {
            await this.initialize();
        }
        // Get image metadata
        const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        // Run detection in parallel
        const [ocrResults, visualDetections] = await Promise.all([
            policy.redactTextPHI
                ? this.ocrService.extractText(imageBuffer, width, height)
                : Promise.resolve([]),
            policy.redactFaces
                ? this.visualDetector.detect(imageBuffer, width, height)
                : Promise.resolve([]),
        ]);
        // Build redaction regions
        const redactions = [];
        const flaggedForReview = [];
        const extractedText = [];
        // Process visual detections (faces, etc.)
        for (const detection of visualDetections) {
            if (detection.type === 'FACE' && policy.redactFaces) {
                redactions.push({
                    box: detection.box,
                    reason: 'FACE',
                    confidence: detection.confidence,
                    autoRedacted: detection.confidence >= policy.faceConfidenceThreshold,
                });
            }
        }
        // Process OCR text
        for (const ocrResult of ocrResults) {
            extractedText.push(ocrResult.text);
            // Check if text matches PHI patterns
            const isPHI = await this.checkIfTextIsPHI(ocrResult.text, policy.knownIdentifiers);
            if (isPHI.match) {
                const region = {
                    box: ocrResult.box,
                    reason: 'TEXT_PHI',
                    matchedContent: ocrResult.text,
                    confidence: Math.min(ocrResult.confidence, isPHI.confidence),
                    autoRedacted: isPHI.confidence >= 0.8,
                };
                if (region.autoRedacted) {
                    redactions.push(region);
                }
                else {
                    flaggedForReview.push(region);
                }
            }
        }
        // Apply redactions to image
        const redactedBuffer = await this.applyRedactions(imageBuffer, redactions, policy);
        return {
            buffer: redactedBuffer,
            dimensions: { width, height },
            redactions,
            flaggedForReview,
            extractedText,
            processingTimeMs: Date.now() - startTime,
        };
    }
    /**
     * Check if extracted text contains PHI
     */
    async checkIfTextIsPHI(text, knownIdentifiers) {
        // Check against known identifiers first (highest confidence)
        if (knownIdentifiers) {
            for (const identifier of knownIdentifiers) {
                if (text.toLowerCase().includes(identifier.toLowerCase())) {
                    return { match: true, confidence: 1.0 };
                }
            }
        }
        // Use the text redaction engine if available
        if (this.textRedactor) {
            try {
                const result = await this.textRedactor(text);
                if (result.matches.length > 0) {
                    return { match: true, confidence: 0.9 };
                }
            }
            catch (error) {
                console.warn('[ImageRedactor] Text redactor error:', error);
            }
        }
        // Basic heuristics for common PHI patterns
        const phiPatterns = [
            /\b\d{3}-\d{2}-\d{4}\b/, // SSN
            /\b[A-Z]{1,2}\d{6,8}\b/i, // MRN-like
            /\b\d{10}\b/, // Phone
            /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/, // Name pattern
        ];
        for (const pattern of phiPatterns) {
            if (pattern.test(text)) {
                return { match: true, confidence: 0.6 };
            }
        }
        return { match: false, confidence: 0 };
    }
    /**
     * Apply redaction boxes to the image
     */
    async applyRedactions(imageBuffer, redactions, policy) {
        if (redactions.length === 0) {
            return imageBuffer;
        }
        let image = (0, sharp_1.default)(imageBuffer);
        const metadata = await image.metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        // Create overlay SVG for black boxes
        if (policy.redactionStyle === 'BLACK_BOX') {
            const rects = redactions.map(r => {
                const pad = policy.redactionPadding;
                const x = Math.max(0, r.box.x - pad);
                const y = Math.max(0, r.box.y - pad);
                const w = Math.min(width - x, r.box.width + pad * 2);
                const h = Math.min(height - y, r.box.height + pad * 2);
                return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="black"/>`;
            }).join('');
            const svg = `<svg width="${width}" height="${height}">${rects}</svg>`;
            image = image.composite([{
                    input: Buffer.from(svg),
                    top: 0,
                    left: 0,
                }]);
        }
        // BLUR and PIXELATE would require different approaches
        // (extracting regions, blurring, compositing back)
        return image.png().toBuffer();
    }
    /**
     * Check if services are ready
     */
    isReady() {
        return this.initialized;
    }
    /**
     * Release resources
     */
    async dispose() {
        await Promise.all([
            this.ocrService.dispose(),
            this.visualDetector.dispose(),
        ]);
        this.initialized = false;
    }
}
exports.ImageRedactor = ImageRedactor;
exports.default = ImageRedactor;
//# sourceMappingURL=ImageRedactor.js.map